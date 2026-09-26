// Learner JavaScript runs in a disposable worker inside an opaque, sandboxed iframe. The frame's CSP
// blocks every network connection; Dusk Connect talks only to the in-memory practice node.
let assets;
function files(signal) {
  return assets ??= Promise.all(['vendor/dusk-connect.js', 'almanac-transport.js', 'almanac-harness.js', 'vendor/almanac-fixture.json', 'vendor/hatchery-driver.wasm'].map(async name => {
    const r = await fetch(new URL(name, import.meta.url), {signal});
    if (!r.ok) throw Error('The Almanac\'s files are unavailable. Reload the page.');
    return name.endsWith('.wasm') ? new Uint8Array(await r.arrayBuffer()) : r.text();
  })).catch(error => { assets = null; throw error; });
}

// Trusted bootstrap only. Learner source never becomes HTML: it arrives over a private MessagePort.
// The frame inherits almanac.html's CSP too, which allows this script by its SHA-256 hash;
// academy/paths.test.mjs checks that the hash still matches.
export const FRAME_SCRIPT = `
onmessage = ({ports, source}) => {
  const port = ports[0]; if (source !== parent || !port) return; onmessage = null;
  port.onmessage = ({data}) => {
    const worker = new Worker(URL.createObjectURL(new Blob([data.bootstrap], {type: 'text/javascript'})));
    worker.onmessage = ({data}) => port.postMessage(data);
    worker.onerror = e => port.postMessage({error: e.message || 'The isolated worker stopped.'});
    worker.postMessage(data.payload);
  };
  port.postMessage({ready: true});
};
`;
const frame = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob: 'wasm-unsafe-eval'; worker-src blob:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"><script>${FRAME_SCRIPT}</script>`;
const bootstrap = `
const blob = text => URL.createObjectURL(new Blob([text], {type: 'text/javascript'}));
onmessage = async ({data}) => {
  onmessage = null;
  try {
    const [sdk, transport, harness, fixtureText, driver] = data.files;
    const transportUrl = blob(transport), fixture = JSON.parse(fixtureText), requests = [];
    const {fixtureFetch} = await import(transportUrl);
    globalThis.fetch = fixtureFetch({fixture, driver, log: requests});
    // No child workers: the learner gets this one disposable worker and nothing else.
    Object.defineProperty(globalThis, 'Worker', {value: undefined, writable: false, configurable: false});
    Object.defineProperty(globalThis, 'SharedWorker', {value: undefined, writable: false, configurable: false});
    const {runPlan, SDK_EXPRESSION} = await import(blob(harness.replace("'./almanac-transport.js'", JSON.stringify(transportUrl))));
    const learner = await import(blob(data.source.replace(SDK_EXPRESSION, JSON.stringify(blob(sdk)))));
    postMessage({result: await runPlan(learner, data.plan, fixture, requests)});
  } catch (error) { postMessage({error: String(error && error.message || error).slice(0, 3000)}); }
};`;

export async function runInSandbox(payload, signal) {
  const loaded = await files(signal);
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.hidden = true; iframe.title = 'Isolated dApp exercise'; iframe.setAttribute('sandbox', 'allow-scripts'); iframe.srcdoc = frame;
    const channel = new MessageChannel();
    let done = false, started = false;
    const abort = () => finish(new DOMException('Run cancelled.', 'AbortError'));
    const timer = setTimeout(() => finish(Error('Your code took too long. Check for a loop that never ends.')), 20000);
    function finish(error, result) {
      if (done) return; done = true;
      clearTimeout(timer); signal?.removeEventListener('abort', abort); channel.port1.close(); iframe.remove();
      error ? reject(error) : resolve(result);
    }
    channel.port1.onmessage = ({data}) => {
      if (data?.ready && !started) { started = true; channel.port1.postMessage({bootstrap, payload: {...payload, files: loaded}}); }
      else finish(data?.error ? Error(String(data.error)) : null, data?.result);
    };
    iframe.onload = () => iframe.contentWindow.postMessage(null, '*', [channel.port2]);
    signal?.addEventListener('abort', abort, {once: true});
    document.body.append(iframe);
  });
}
