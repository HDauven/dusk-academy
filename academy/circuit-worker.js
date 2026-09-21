// Learner WASM gets only entropy and a bounded result channel. No DOM or network.
export async function execute(bytes) {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > 2 * 1024 * 1024) throw Error('Invalid circuit artifact.');
  const module = await WebAssembly.compile(bytes);
  if (WebAssembly.Module.imports(module).some(i => i.module !== 'lesson' || !['random','report'].includes(i.name) || i.kind !== 'function')) throw Error('The circuit requested an unsupported host function.');
  let instance, result;
  instance = await WebAssembly.instantiate(module, {lesson:{
    random(ptr, len) {
      if (len !== 32) throw Error('Invalid entropy request.');
      crypto.getRandomValues(new Uint8Array(instance.exports.memory.buffer, ptr, len));
    },
    report(ptr, len) {
      if (result !== undefined || len < 1 || len > 16384) throw Error('Invalid circuit result.');
      result = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(new Uint8Array(instance.exports.memory.buffer, ptr, len)));
    },
  }});
  try { instance.exports.run_lesson(); }
  catch (error) { throw Error(result?.error || error.message || 'The circuit stopped.'); }
  if (result?.error) throw Error(String(result.error).slice(0,3000));
  if (!result) throw Error('The circuit produced no result.');
  return result;
}

if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
  onmessage = async ({data}) => {
    try { postMessage({result:await execute(data)}); }
    catch (error) { postMessage({error:String(error.message || error).slice(0,3000)}); }
  };
}
