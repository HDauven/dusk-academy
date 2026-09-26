// The Almanac's simulated node. It answers Dusk Connect's requests from almanac-fixture.json, bytes
// produced by rkyv from the Hatchery's real return types. Reads only: nothing is signed or sent.
export const NODE = 'https://node.almanac.invalid';
export const OFFLINE_NODE = 'https://offline.almanac.invalid';
export const DRIVER_PATH = '/drivers/hatchery.wasm';

const toHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const fromHex = hex => Uint8Array.from(hex.match(/../g) ?? [], h => parseInt(h, 16));

// Returns a fetch() that serves the driver and contract queries, and records each query.
export function fixtureFetch({fixture, driver, log = []}) {
  return async (input, options) => {
    const request = new Request(input, options), url = new URL(request.url);
    if (url.origin === OFFLINE_NODE) return new Response('This node is unavailable.', {status: 503});
    if (url.origin !== NODE) throw new TypeError(`The Almanac can only reach its practice node, not ${url.origin}.`);
    if (url.pathname === DRIVER_PATH && request.method === 'GET') return new Response(driver, {headers: {'Content-Type': 'application/wasm'}});
    const match = /^\/on\/contracts:([0-9a-f]{64})\/(\w+)$/.exec(url.pathname);
    if (!match || request.method !== 'POST') return new Response('Unknown endpoint', {status: 404});
    const [, contract, fn] = match, args = toHex(new Uint8Array(await request.arrayBuffer()));
    log.push({fn, args});
    if (contract !== fixture.contract) return new Response('No contract with that ID', {status: 404});
    const answers = fixture.calls[fn];
    if (!answers) return new Response(`The Hatchery has no public function called ${fn}.`, {status: 400});
    const hex = answers[args] ?? fixture.otherwise[fn];
    if (hex === undefined) return new Response('Invalid arguments', {status: 400});
    return new Response(fromHex(hex), {headers: {'Content-Type': 'application/octet-stream'}});
  };
}
