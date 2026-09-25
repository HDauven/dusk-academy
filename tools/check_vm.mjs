// Runs every Hatchery chapter's answer, and every lesson playground, in Dusk's VM and compares it
// with the browser interpreter.
//
// Each chapter's check (and each playground) runs once in the interpreter while every call it
// makes is recorded. The contract is then compiled with Dusk Forge, deployed in dusk-vm next to a
// real Moth Nest, and the same calls are replayed with the same senders and block heights
// (engines/vm-runner). Return values, panic messages, events and the whole contract state after
// every call must match. Each contract's own Forge data-driver encodes and decodes the values.
//
//   npm run test:vm
//   RUST_TOOLCHAIN=stable npm run test:vm    # use an installed toolchain instead of the pinned 1.98.0
//   CARGO_NET_OFFLINE=true npm run test:vm   # build only from crates that are already cached
import {mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {chapters, lessons} from '../academy/course.js';
import {recorders, deploy, MOTH_NEST} from '../academy/contract.js';
import {Rejection} from '../academy/rust-runtime.js';

const root = resolve(import.meta.dirname, '..'), crate = join(root, 'examples/hatchery');
const toolchain = process.env.RUST_TOOLCHAIN ? [`+${process.env.RUST_TOOLCHAIN}`] : [];
const work = mkdtempSync(join(tmpdir(), 'dusk-vm-check-'));
process.on('exit', () => rmSync(work, {recursive: true, force: true}));
const cargo = (cwd, args, target) => {
  const run = spawnSync('cargo', [...toolchain, ...args], {cwd, encoding: 'utf8', maxBuffer: 1 << 26, env: {...process.env, CARGO_TARGET_DIR: join(work, target)}});
  if (run.error) { console.error(`Couldn't run cargo: ${run.error.message}`); process.exit(2); }
  if (run.status !== 0) throw Error(run.stderr.split('\n').filter(l => /^error|-->/.test(l)).slice(0, 12).join('\n') || run.stderr.slice(-2000));
  return run.stdout;
};
const hex = bytes => Buffer.from(bytes).toString('hex');
// JSON with exact integers and object keys in a fixed order.
const show = v => JSON.stringify(v, (k, x) => typeof x === 'bigint' ? x.toString() : x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x);

// 1. Record every call each chapter's check makes in the interpreter, and every call each lesson's
// playground makes when a keeper named Moonpaw presses every action in order, twice.
const record = (c, run) => {
  const records = [], recorder = r => records.push(r);
  recorders.add(recorder);
  let checkError = null;
  try { run(); } catch (error) { checkError = error.message; } finally { recorders.delete(recorder); }
  return {c, records, checkError};
};
const recorded = [
  ...chapters.filter(c => c.kind === 'code').map(c => record(c, () => c.check(c.answer))),
  ...chapters.filter(c => c.playground).map(c => ({...record(c, () => {
    const contract = deploy(lessons[c.lesson].reference), keeper = {name: 'Moonpaw'};
    c.playground.setup?.(contract, keeper);
    for (const action of [...c.playground.actions, ...c.playground.actions]) {
      try { action.run(contract, keeper); } catch (error) { if (!(error instanceof Rejection)) throw error; }
    }
  }), playground: true})),
];

// 2. Compile each answer as a contract and as a data-driver, with read-only probes added to
// `impl Hatchery` (the answer's own code is unchanged):
//   academy_state          returns every field, in declared order, as nested tuples
//   academy_private_<fn>   forwards to a private method that the check calls directly
const PLAIN = /^(u8|u16|u32|u64|bool|BlsPublicKey|Option<(u8|u16|u32|u64|bool|BlsPublicKey)>)$/;
function stateReader(rt) {
  const structs = rt.program.structs;
  let n = 0;
  const read = (type, expr, borrowed) => {
    const vec = type.match(/^Vec<(.+)>$/);
    if (vec) { const v = `item${n++}`; const inner = read(vec[1], v, true); return {type: `alloc::vec::Vec<${inner.type}>`, expr: `${expr}.iter().map(|${v}| ${inner.expr}).collect::<alloc::vec::Vec<_>>()`}; }
    if (structs.has(type)) {
      const parts = [...structs.get(type)].map(([field, t]) => read(t, `${expr}.${field}`, false));
      return parts.length === 1 ? parts[0] : {type: `(${parts.map(p => p.type).join(', ')})`, expr: `(${parts.map(p => p.expr).join(', ')})`};
    }
    if (PLAIN.test(type)) return {type, expr: borrowed ? `*${expr}` : expr};
    throw Error(`check_vm can't read a field of type ${type}.`);
  };
  const {type, expr} = read('Hatchery', 'self', false);
  return `pub fn academy_state(&self) -> ${type} { ${expr} }`;
}
function privateCaller(rt, name) {
  const m = rt.program.methods.get('Hatchery::' + name);
  if (!m?.receiver || ![...m.params.map(p => p.type), m.output].every(t => t === '()' || PLAIN.test(t))) return null;
  const params = m.params.map(p => `${p.name}: ${p.type}`).join(', '), output = m.output === '()' ? '' : ` -> ${m.output}`;
  return `pub fn academy_private_${name}(&${m.mutable ? 'mut ' : ''}self${params ? ', ' + params : ''})${output} { self.${name}(${m.params.map(p => p.name).join(', ')}) }`;
}
function withProbes(r) {
  const probes = [stateReader(r.rt)];
  r.privates = new Set();
  for (const s of r.steps) {
    if (s.exported || r.privates.has(s.fn)) continue;
    const caller = privateCaller(r.rt, s.fn);
    if (caller) { r.privates.add(s.fn); probes.push(caller); }
  }
  const at = r.source.search(/impl\s+Hatchery\s*\{/);
  if (at < 0) throw Error('No `impl Hatchery` block.');
  let depth = 0;
  for (let i = r.source.indexOf('{', at); i < r.source.length; i++) {
    if (r.source[i] === '{') depth++;
    if (r.source[i] === '}' && --depth === 0) return `${r.source.slice(0, i)}\n${probes.map(p => `        ${p}\n`).join('')}    ${r.source.slice(i)}`;
  }
  throw Error('Unbalanced braces in `impl Hatchery`.');
}

const manifest = readFileSync(join(crate, 'Cargo.toml'), 'utf8');
const profile = manifest.slice(manifest.indexOf('[profile.release]'));
const member = (name, lib) => {
  mkdirSync(join(work, name, 'src'), {recursive: true});
  writeFileSync(join(work, name, 'Cargo.toml'), manifest.replace('name = "dusk-hatchery"', `name = "${name}"`).replace(profile, ''));
  cpSync(join(crate, 'build.rs'), join(work, name, 'build.rs'));
  writeFileSync(join(work, name, 'src/lib.rs'), lib);
  return name;
};
const members = [member('moth-nest', readFileSync(join(root, 'engines/vm-runner/moth_nest.rs'), 'utf8'))];
for (const [i, {records}] of recorded.entries()) records.forEach((r, j) => { r.crate = member(`chapter-${i}-${j}`, withProbes(r)); members.push(r.crate); });
writeFileSync(join(work, 'Cargo.toml'), `[workspace]\nmembers = ${JSON.stringify(members)}\nresolver = "3"\n\n${profile}`);
for (const name of ['Cargo.lock', 'rust-toolchain.toml']) cpSync(join(crate, name), join(work, name));

let failed = 0;
const wasm = (feature, name) => join(work, `target-${feature}`, 'wasm32-unknown-unknown/release', `${name.replaceAll('-', '_')}.wasm`);
try {
  for (const feature of ['contract', 'data-driver-js']) cargo(work, ['build', '--release', '--target', 'wasm32-unknown-unknown', '--workspace', '--features', feature], `target-${feature}`);
  cargo(join(root, 'engines/vm-runner'), ['build', '--release', '--locked'], 'target-runner');
} catch (error) {
  console.log(`FAIL  build\n  ${error.message.replaceAll('\n', '\n  ')}`);
  process.exit(1);
}
const runner = join(work, 'target-runner/release/vm-runner');
const run = (args, input) => {
  const out = spawnSync(runner, args, {input, encoding: 'utf8', maxBuffer: 1 << 28});
  if (out.status !== 0) throw Error(`vm-runner failed: ${out.stderr.slice(-2000)}`);
  return JSON.parse(out.stdout);
};
const keys = run(['keys']);

// A data-driver in this process, through its exported C interface.
function loadDriver(path) {
  const e = new WebAssembly.Instance(new WebAssembly.Module(readFileSync(path))).exports;
  e.init();
  const put = data => { const p = e.alloc(data.length); new Uint8Array(e.memory.buffer, p, data.length).set(data); return [p, data.length]; };
  const text = s => new TextEncoder().encode(s);
  const call = (fn, ...inputs) => {
    const size = 1 << 16, out = e.alloc(size);
    const code = e[fn](...inputs.flatMap(put), out, size);
    const read = at => new Uint8Array(e.memory.buffer).slice(at + 4, at + 4 + new DataView(e.memory.buffer).getUint32(at, true));
    if (code !== 0) { e.get_last_error(out, size); throw Error(new TextDecoder().decode(read(out))); }
    return read(out);
  };
  // Driver JSON with every integer exact, and u64 strings as integers.
  const json = bytes => JSON.parse(new TextDecoder().decode(bytes), (k, v, ctx) => typeof v === 'number' ? BigInt(ctx.source) : typeof v === 'string' && /^\d+$/.test(v) ? BigInt(v) : v);
  return {
    encode: (fn, args) => call('encode_input_fn', text(fn), text(args)),
    output: (fn, bytes) => json(call('decode_output_fn', text(fn), bytes)),
    event: (topic, bytes) => json(call('decode_event', text(topic), bytes)),
  };
}

// The interpreter's values in the driver's JSON shapes.
function canon(value, rt) {
  const c = v => canon(v, rt);
  if (value === null || value === undefined || value.kind === 'unit') return null;
  if (typeof value === 'bigint' || typeof value === 'boolean') return value;
  if (value.kind === 'key') return keys[value.id] ?? `unknown keeper ${value.id}`;
  if (value.kind === 'some') return c(value.value);
  if (['vec', 'tuple', 'array'].includes(value.kind)) return value.items.map(c);
  if (value.kind === 'struct') {
    const parts = [...rt.program.structs.get(value.type)].map(([field]) => c(value.fields[field]));
    return parts.length === 1 ? parts[0] : parts.length ? parts : null;
  }
  throw Error(`check_vm can't compare a value of kind ${value.kind}.`);
}
const argument = (value, rt) => {
  const v = canon(value, rt);
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'string') return JSON.stringify(v);
  throw Error(`check_vm can't pass ${show(v)} as an argument.`);
};
const panicText = error => String(error).replace(/^Panic: /, '');
// Where two decoded values first differ, as a path like [1][0].
const firstDifference = (a, b, path = '') => {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path || 'the top'} (length ${a.length} vs ${b.length})`;
    for (let i = 0; i < a.length; i++) { const d = firstDifference(a[i], b[i], `${path}[${i}]`); if (d) return d; }
    return null;
  }
  return show(a) === show(b) ? null : `${path || 'the top'}: ${show(a)} vs ${show(b)}`;
};

// 3. Replay each chapter's calls in the VM and compare.
let calls = 0;
for (const [i, {c, records, checkError, playground}] of recorded.entries()) {
  // A failing check still replays the calls it made before failing.
  const problems = checkError ? [`${playground ? 'the playground' : 'the answer\'s check'} fails in the interpreter: ${checkError}`] : [];
  const contracts = [{id: MOTH_NEST, wasm: wasm('contract', 'moth-nest')}], steps = [], expect = [];
  records.forEach((r, j) => {
    const id = (0x40 + j).toString(16).repeat(32), driver = loadDriver(wasm('data-driver-js', r.crate));
    contracts.push({id, wasm: wasm('contract', r.crate)});
    const readState = (height, after, state) => {
      steps.push({contract: id, fn: 'academy_state', arg: hex(driver.encode('academy_state', 'null')), sender: 'you', height, query: true});
      expect.push({kind: 'state', after, driver, want: canon(state, r.rt)});
    };
    readState(1000, 'deploy', r.state);
    for (const s of r.steps) {
      const label = `${s.fn}(${s.args.map(a => show(canon(a, r.rt))).join(', ')})${s.sender === null ? ' shielded' : s.sender ? ` as ${s.sender}` : ''} at ${s.height}`;
      const fn = s.exported ? s.fn : `academy_private_${s.fn}`;
      if (!s.exported && !r.privates.has(s.fn)) { problems.push(`${label}: a private method with these types can't be called in the VM.`); break; }
      if (!s.ok && !s.panic) problems.push(`${label}: the interpreter stopped with an error, not a panic: ${s.error}`);
      const args = s.args.length === 0 ? 'null' : s.args.length === 1 ? argument(s.args[0], r.rt) : `[${s.args.map(a => argument(a, r.rt)).join(',')}]`;
      steps.push({contract: id, fn, arg: hex(driver.encode(fn, args)), sender: s.sender ?? null, height: Number(s.height)});
      expect.push({kind: 'call', label, id, driver, step: s, fn, record: r});
      readState(Number(s.height), label, s.state);
    }
  });
  const {results} = run([], JSON.stringify({contracts, steps}));
  results.forEach((got, k) => {
    const e = expect[k];
    if (e.kind === 'state') {
      if (!got.ok) return problems.push(`state after ${e.after}: couldn't be read: ${got.error}`);
      const diff = firstDifference(e.driver.output('academy_state', Buffer.from(got.data, 'hex')), e.want);
      if (diff) problems.push(`state after ${e.after} differs at ${diff} (VM vs interpreter)`);
      return;
    }
    calls++;
    const s = e.step;
    if (s.ok !== got.ok) return problems.push(`${e.label}: ${s.ok ? `the interpreter succeeded, the VM failed: ${got.error}` : `the interpreter panicked (${s.error}), the VM succeeded`}`);
    if (!s.ok) {
      if (panicText(got.error) !== s.error) problems.push(`${e.label}: panic messages differ:\n      VM          ${panicText(got.error)}\n      interpreter ${s.error}`);
      return;
    }
    const rt = e.record.rt, have = show(e.driver.output(e.fn, Buffer.from(got.data, 'hex'))), want = show(canon(s.value, rt));
    if (have !== want) problems.push(`${e.label}: returned ${have} in the VM, ${want} in the interpreter`);
    // Events decode with the contract's own data-driver, which knows its registered event types.
    const vmEvents = got.events.map(ev => {
      if (ev.source !== e.id) return {topic: ev.topic, from: ev.source};
      try { return {topic: ev.topic, data: e.driver.event(ev.topic, Buffer.from(ev.data, 'hex'))}; }
      catch (error) { return {topic: ev.topic, undecodable: `0x${ev.data}`, error: error.message}; }
    });
    const ours = s.events.map(ev => ({topic: ev.topic, data: ev.fields ? Object.fromEntries(Object.entries(ev.fields).map(([k, x]) => [k, canon(x, rt)])) : ev.data.map(x => canon(x, rt))}));
    if (show(vmEvents) !== show(ours)) problems.push(`${e.label}: events differ:\n      VM          ${show(vmEvents)}\n      interpreter ${show(ours)}`);
  });
  const replayed = expect.filter(e => e.kind === 'call').length;
  const name = `L${c.lesson + 1} ${c.id}${playground ? ' playground' : ''}`;
  if (problems.length) { failed++; console.log(`FAIL  ${name}\n  ${problems.join('\n  ')}`); }
  else console.log(`ok    ${name} (${replayed} call${replayed === 1 ? '' : 's'} match)`);
}

console.log(failed ? `${failed} chapter(s) differ between the interpreter and Dusk's VM.` : `Every Hatchery answer and playground behaves the same in Dusk's VM as in the browser interpreter: ${calls} calls, with their results, panics, events and state.`);
process.exit(failed ? 1 : 0);
