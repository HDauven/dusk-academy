// Runs Hatchery contracts in the Rust-subset interpreter with simulated Dusk host functions.
import {createRuntime, Rejection} from '../academy/rust-runtime.js';

export const WICK = '0001010104060000';
export const SAMPLE = ['8356281049284737', '1568560902483828', '2788147323984481'];
export const MIX = 0x9E3779B97F4A7C15n, MODULUS = 10n ** 16n, U64 = (1n << 64n) - 1n;
export const dnaFor = seed => ((BigInt(seed) * MIX) & U64) % MODULUS;
export const pad16 = n => String(n).padStart(16, '0');

// Simulated keepers. A key is opaque: contracts can store and compare it, nothing more.
export const KEEPERS = {
  you: {name: 'You', tone: 'you'},
  rival: {name: 'Rook', tone: 'rival'},
  friend: {name: 'Fen', tone: 'friend'},
};
export const key = id => ({kind: 'key', id});

// The Moth Nest: a separate contract at ContractId [7; 32] with a fixed set of moths.
export const MOTH_NEST = '07'.repeat(32);
export const MOTHS = [4417300918265521n, 1290847365512087n, 8850023141736402n, 6023597714405839n, 2771040968153346n, 5506328879120114n];

export class Hint extends Error {}
export const fail = message => { throw new Hint(message); };
export const need = (cond, message) => { if (!cond) fail(message); };
// The source text of one method, from `fn name(` to its closing brace (comments removed).
export function fnSource(source, name) {
  const text = stripComments(source), at = text.search(new RegExp(`fn\\s+${name}\\s*\\(`));
  if (at < 0) return '';
  let depth = 0, i = text.indexOf('{', at);
  for (let j = i; j < text.length; j++) { if (text[j] === '{') depth++; if (text[j] === '}' && --depth === 0) return text.slice(at, j + 1); }
  return text.slice(at);
}
export const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

export function deploy(source, {sender = 'you', height = 1000} = {}) {
  const events = [], calls = [], ctx = {sender, height};
  const functions = new Map([
    ['abi::emit', args => {
      if (args.length !== 2 || typeof args[0] !== 'string') throw Error('abi::emit expects a topic string and a payload.');
      events.push({topic: args[0], data: args[1]?.kind === 'tuple' ? args[1].items : [args[1]]});
    }],
    ['abi::public_sender', args => {
      if (args.length) throw Error('abi::public_sender takes no arguments.');
      return ctx.sender ? {kind: 'some', value: key(ctx.sender)} : null;
    }],
    ['abi::block_height', args => {
      if (args.length) throw Error('abi::block_height takes no arguments.');
      return BigInt(ctx.height);
    }],
    ['abi::call', (args, generic) => {
      if (args.length !== 3) throw Error('abi::call expects a contract, a function name and an argument.');
      const [target, method, input] = args;
      if (target?.kind !== 'id' || target.hex !== MOTH_NEST) throw Error('This lesson only has the Moth Nest contract to call.');
      if (method !== 'moth_dna') throw Error(`The Moth Nest has no function called "${method}".`);
      if (generic.join(',') !== '_,u64' || typeof input !== 'bigint') throw Error('moth_dna takes a u64 moth id and returns a u64: abi::call::<_, u64>(…).');
      calls.push({method, input});
      return input < BigInt(MOTHS.length) ? {kind: 'ok', value: MOTHS[Number(input)]} : {kind: 'err', value: 'Panic: no such moth'};
    }],
  ]);
  const rt = createRuntime(source, {module: 'hatchery', contract: 'Hatchery', functions});
  let state = rt.create();
  const plain = v => typeof v === 'bigint' ? v : v?.kind === 'key' ? v.id : v?.kind === 'some' ? plain(v.value) : v === null ? null : v;
  return {
    rt, events, calls, ctx,
    get state() { return state; },
    method: name => rt.program.methods.get('Hatchery::' + name),
    as(sender) { ctx.sender = sender; return this; },
    at(height) { ctx.height = height; return this; },
    call(name, ...args) {
      const before = structuredClone(state), mark = events.length;
      const values = args.map(a => typeof a === 'number' || typeof a === 'string' && /^\d+$/.test(a) ? BigInt(a) : typeof a === 'string' ? key(a) : a);
      try { return rt.invoke(state, name, values, true); }
      catch (e) { state = before; events.length = mark; throw e; }
    },
    // Expect a call to panic; returns the panic message. Anything else is a Hint for the learner.
    panics(name, ...args) {
      try { this.call(name, ...args); } catch (e) { if (e instanceof Rejection) return e.message; throw e; }
      return fail(`${name}(${args.join(', ')}) should have failed, but it succeeded.`);
    },
    dusklings: () => (state.fields.dusklings?.items ?? []).map(d => Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, plain(v)]))),
  };
}

export function needMethod(c, name, {pub, mut, params, output}) {
  const m = c.method(name);
  need(m, `Couldn't find a method named \`${name}\` in \`impl Hatchery\`.`);
  if (pub !== undefined) need(m.exported === pub, pub ? `\`${name}\` should be public: start it with \`pub fn\`.` : `\`${name}\` is still public. Remove \`pub\` so only the contract can call it.`);
  if (mut !== undefined) need(m.receiver && m.mutable === mut, mut ? `\`${name}\` changes state, so its first parameter should be \`&mut self\`.` : `\`${name}\` only reads, so take \`&self\` (without \`mut\`).`);
  if (params) need(m.params.length === params.length && m.params.every((p, i) => p.name === params[i][0] && p.type === params[i][1]),
    `\`${name}\` should take ${params.map(([n, t]) => `\`${n}: ${t}\``).join(' and ')}.`);
  if (output) need(m.output === output, output === '()' ? `\`${name}\` shouldn't return anything.` : `\`${name}\` should return \`${output}\`: add \`-> ${output}\` after the parameters.`);
  return m;
}

// FNV-1a (64-bit) of the name's UTF-8 bytes: how the page turns a name into a seed.
export function seedFromName(name) {
  let h = 0xcbf29ce484222325n;
  for (const b of new TextEncoder().encode(name)) { h ^= BigInt(b); h = (h * 0x100000001b3n) & U64; }
  return h;
}

export function friendly(error) {
  const text = String(error?.message ?? error);
  if (error instanceof Hint) return {text};
  if (error instanceof Rejection) return {text: /overflow/.test(text)
    ? 'Overflow! The result doesn\'t fit in a `u64`, so the call panicked. Forge contracts are built with overflow checks on.'
    : /index out of bounds/.test(text) ? 'The call panicked: that index is past the end of the vector.'
    : `The call panicked: ${text}.`};
  if (/Supply exactly the declared fields/.test(text)) return {text: 'When you build a struct, give every field a value, and no extra ones. Check the fields of `Duskling`.'};
  const at = text.match(/at line (\d+), column (\d+)\. (.*)$/s);
  if (at) {
    let msg = at[3];
    if (/Implement a declared lesson struct/.test(msg)) msg = 'This `impl` block refers to a struct that isn\'t declared above it.';
    if (/Type (\w+) is outside the lesson subset/.test(msg)) msg = `Unknown type \`${msg.match(/Type (\w+)/)[1]}\`. Is it declared or imported above this line, and spelled the same way?`;
    if (/Only the supplied lesson imports/.test(msg)) msg = 'That `use` line isn\'t one this lesson knows. Check it against the explanation.';
    return {text: `Line ${at[1]}: ${msg}`, line: Number(at[1])};
  }
  if (/This method must return no value/.test(text)) return {text: 'A method returned a value where none was expected. Is there an extra line without a semicolon at the end?'};
  if (/Expected a u64 value/.test(text)) return {text: 'A method that should return a number returned nothing. Did the last line end with a semicolon? Remove it to return the value.'};
  if (/Expected a BlsPublicKey/.test(text)) return {text: 'Something that should be a keeper\'s key (`BlsPublicKey`) isn\'t one. Check what you pass as the owner.'};
  if (/Assignment requires a mutable binding/.test(text)) return {text: 'That value can\'t be changed. Borrow it with `&mut`, or check that the method takes `&mut self`.'};
  const missing = text.match(/Missing method (\w+)/);
  if (missing) return {text: `Couldn't find a method named \`${missing[1]}\`.`};
  const binding = text.match(/Unknown binding (\w+)/);
  if (binding) return {text: `\`${binding[1]}\` isn't defined here. Check the spelling, or whether it needs \`self.\` in front.`};
  const field = text.match(/Unknown field (\w+)/);
  if (field) return {text: `There's no field called \`${field[1]}\` here. Check the struct's field names.`};
  if (/Arguments do not match (\w+)/.test(text)) return {text: `The call to \`${text.match(/Arguments do not match (\w+)/)[1]}\` has the wrong number or kind of arguments.`};
  if (/Keep the supplied lesson structs and methods/.test(text)) return {text: 'The contract needs at least one struct and one method.'};
  return {text: text.replace(/^Not supported by this lesson runtime\.\s*/, '')};
}
