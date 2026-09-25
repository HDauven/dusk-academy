// Secret stats circuits: interpret the learner's Rust into gate programs, then prove them with the
// real PLONK engine (vendor/circuit-engine.wasm). The learner's Rust is never compiled in the browser.
import {createRuntime, scalar, Rejection} from './rust-runtime.js';

const RANGES = new Set([4, 8, 16]);

// One gate program per sample. Samples are [strength, agility, power]; the first must be [0, 0, 0].
export function circuitProgram(source, samples) {
  const programs = [];
  for (const sample of samples) {
    const instructions = [];
    let count = 0;
    const hex = n => {
      if (n?.kind !== 'scalar') throw Error('The circuit expects BlsScalar values here.');
      return n.value.toString(16).padStart(64, '0').match(/../g).reverse().join('');
    };
    const coefficient = n => hex(typeof n === 'bigint' ? scalar(n) : n);
    const index = v => {
      if (v === undefined) return -1;
      if (v?.kind !== 'host' || v.type !== 'Witness' || !Number.isInteger(v.index) || v.index < 0 || v.index >= count) throw Error('Pass a witness handle returned by the composer.');
      return v.index;
    };
    const emit = (op, witness = true) => {
      if (instructions.length >= 32) throw Error('These lessons support at most 32 gate instructions.');
      instructions.push(op);
      return witness ? {kind: 'host', type: 'Witness', index: count++} : undefined;
    };
    const functions = new Map([['Constraint::new', args => {
      if (args.length) throw Error('Constraint::new takes no arguments.');
      return {kind: 'host', type: 'Constraint', left: 0n, right: 0n, mult: 0n, constant: 0n};
    }]]);
    const runtime = createRuntime(source, {functions, contract: 'SecretStats', method: (object, method, args, generic) => {
      if (object.type === 'Composer') {
        if (['append_witness', 'append_public'].includes(method) && args.length === 1) return emit([method === 'append_public' ? 'public' : 'witness', hex(args[0])]);
        if (method === 'assert_equal' && args.length === 2) return emit(['equal', ...args.map(index)], false);
        if (method === 'gate_add' && args.length === 1 && args[0]?.type === 'Constraint') {
          const c = args[0];
          return emit(['add', coefficient(c.left), coefficient(c.right), coefficient(c.constant), index(c.a), index(c.b)]);
        }
        if (method === 'gate_mul' && args.length === 1 && args[0]?.type === 'Constraint') {
          const c = args[0];
          return emit(['mul', coefficient(c.mult), coefficient(c.constant), index(c.a), index(c.b)]);
        }
        if (method === 'component_range' && args.length === 1) {
          const pairs = Number(generic[0]);
          if (!RANGES.has(pairs)) throw Error('Use component_range::<4>, ::<8> or ::<16> in these lessons.');
          return emit(['range', pairs, index(args[0])], false);
        }
      } else if (object.type === 'Constraint' && ['left', 'right', 'mult', 'constant', 'a', 'b'].includes(method) && args.length === 1) {
        return {...object, [method]: args[0]};
      }
      throw Error(`\`${method}\` isn't part of the composer subset these lessons use.`);
    }});
    const self = {kind: 'struct', type: 'SecretStats', fields: {strength: scalar(sample[0]), agility: scalar(sample[1]), power: scalar(sample[2])}};
    runtime.validate(self, 'SecretStats', 'SecretStats');
    try {
      const result = runtime.invoke(self, 'circuit', [{kind: 'host', type: 'Composer'}]);
      if (result?.kind !== 'ok') throw Error('Return Ok(()) after building the constraints.');
    } catch (error) {
      if (error instanceof Rejection) throw Error('The circuit stopped at a Rust check (a panic or assert!). Circuits must express rules as constraints, which the verifier can check. A Rust assert! only runs on the prover\'s machine.');
      throw error;
    }
    programs.push(instructions);
  }
  // Gates and public positions may not depend on secret values: the verifier knows only one circuit.
  const shape = ops => JSON.stringify(ops.map(op => ['witness', 'public'].includes(op[0]) ? [op[0]] : op[0] === 'add' || op[0] === 'mul' ? [op[0], ...op.slice(1, -2), 'w', 'w'] : op));
  if (programs.some(p => shape(p) !== shape(programs[0]))) throw Error('The circuit\'s structure changes with the secret values. Keep the same gates, in the same order, for every input.');
  return programs;
}

// Runs an engine: the prebuilt browser engine (with gate programs) or a natively compiled learner circuit.
export async function runEngine(bytes, samples, programs = null) {
  const module = await WebAssembly.compile(bytes);
  const allowed = programs ? ['random', 'report', 'samples', 'program'] : ['random', 'report', 'samples'];
  if (WebAssembly.Module.imports(module).some(i => i.module !== 'lesson' || !allowed.includes(i.name) || i.kind !== 'function')) throw Error('The circuit engine asked for an unsupported host function.');
  const encode = value => new TextEncoder().encode(JSON.stringify(value));
  // Samples go over as exact JSON integers, so large u64 values don't lose precision.
  const sampleBytes = new TextEncoder().encode(`[${samples.map(s => `[${s.map(x => BigInt(x).toString()).join(',')}]`).join(',')}]`);
  const programBytes = programs?.map(encode);
  let instance, result;
  const copy = (data, ptr, len) => { if (len) new Uint8Array(instance.exports.memory.buffer, ptr, len).set(data); return data.length; };
  instance = await WebAssembly.instantiate(module, {lesson: {
    samples: (ptr, len) => copy(sampleBytes, ptr, len),
    program: (ptr, len, sample) => { const data = programBytes?.[sample]; if (!data) throw Error('Unknown gate program.'); return copy(data, ptr, len); },
    random: (ptr, len) => { crypto.getRandomValues(new Uint8Array(instance.exports.memory.buffer, ptr, len)); },
    report: (ptr, len) => { result = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(new Uint8Array(instance.exports.memory.buffer, ptr, len))); },
  }});
  try { instance.exports.run_lesson(); }
  catch (error) { throw Error(result?.error || error.message || 'The circuit stopped.'); }
  if (result?.error) throw Error(String(result.error).slice(0, 2000));
  if (!result) throw Error('The circuit produced no result.');
  return result;
}

export const hexOf = n => BigInt(n).toString(16).padStart(64, '0').match(/../g).reverse().join('');
