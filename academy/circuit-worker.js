// Proves in a worker so the page stays responsive. Loaded as a module worker by stats-app.js.
import {circuitProgram, runEngine} from './circuit.js';

let engine = null;
onmessage = async ({data: {source, samples}}) => {
  try {
    engine ??= await fetch(new URL('./vendor/circuit-engine.wasm', import.meta.url)).then(r => {
      if (!r.ok) throw Error('The proof engine is unavailable. Reload the page.');
      return r.arrayBuffer();
    });
    postMessage({result: await runEngine(engine, samples, circuitProgram(source, samples))});
  } catch (error) {
    postMessage({error: String(error?.message ?? error).slice(0, 2000)});
  }
};
