// Disposable worker. CSP permits only local fixture reads and their drivers.
// No DOM, localStorage or injected wallet; checks are not tamper-proof certification.
import {createDuskApp} from './vendor/dusk-connect.js';
import {explorerScenarios, explorerIds, invalidRecordIds} from './courses.js';
const originalFetch = fetch;
const reads = [];
globalThis.fetch = async (...args) => {
  const request = new Request(...args);
  const url = new URL(request.url);
  const input = url.pathname.startsWith('/on/contracts:') ? new Uint8Array(await request.clone().arrayBuffer()) : null;
  const response = await originalFetch(request);
  if (input) reads.push({path:url.pathname,input:Array.from(input,b=>b.toString(16).padStart(2,'0')).join(''),status:response.status});
  return response;
};

onmessage = async ({data:{source, scenario}}) => {
  let url;
  const clients = [];
  try {
    const phase = explorerScenarios.indexOf(scenario);
    if (typeof source !== 'string' || new TextEncoder().encode(source).length > 8000 || (!['read','prepare'].includes(scenario)&&phase<0)) throw Error('Invalid dApp exercise.');
    if (phase>=4 && typeof JSON.rawJSON!=='function') throw Error('This lesson needs JSON.rawJSON. Update your browser. Do not round record IDs through Number.');
    url = URL.createObjectURL(new Blob([source], {type:'text/javascript'}));
    const learner = await import(url);
    async function client(value, driverPath) {
      const dusk = learner.createApp(location.origin, '0x'+value.toString(16).padStart(2,'0').repeat(32), driverPath);
      if (!dusk?.readContract || !dusk?.prepareContractCall) throw Error('Return createDuskApp(...) from createApp.');
      clients.push(dusk); await dusk.ready(); return dusk;
    }
    const counts = [], prepared = [];
    for (const value of [2,7]) {
      const dusk = await client(value);
      counts.push(await learner.readCount(dusk));
      if (scenario === 'prepare' || phase>=0) prepared.push(await learner.prepareRegistration(dusk, value));
    }
    // Independently decode prepared arguments with the genuine method driver.
    const decoder = createDuskApp({pinnedNodeUrl:location.origin, wallet:{waitForProvider:false, rememberLastUsedProvider:false}, autoConnect:false});
    clients.push(decoder);
    const driver = await decoder.driver('/api/registry-driver');
    const writes = prepared.map(p => {
      if (!p) return null;
      const bytes = typeof p.fnArgs === 'string' ? Uint8Array.from(p.fnArgs.replace(/^0x/,'').match(/.{2}/g) || [], h=>parseInt(h,16)) : p.fnArgs;
      return {contractId:p.contractId, functionName:p.fnName, amount:driver.decodeInputFn('register', bytes), privacy:p.privacy, value:p.amount, deposit:p.deposit, encoded:Array.from(bytes)};
    });
    const records=[], invalidIds=[];
    if (phase>=0) {
      if (typeof learner.readRegistration!=='function') throw Error('Append export async function readRegistration(dusk, id) to your existing file.');
      if (phase===5 && typeof learner.loadRegistration!=='function') throw Error('Append export async function loadRegistration(dusk, id) to handle failed reads.');
      const dusk = await client(0x55, '/api/explorer-driver');
      const lookup = phase===5 ? learner.loadRegistration : learner.readRegistration;
      async function sample(app,id,offline=false) {
        const start=reads.length;
        const record=await lookup(app,id);
        records.push({id,offline,record,requests:reads.slice(start)});
      }
      for (const id of explorerIds(phase)) await sample(dusk,id);
      if (phase===5) {
        const unavailable = await client(0x66, '/api/explorer-driver');
        await sample(unavailable,'0',true);
        await sample(dusk,'0'); // Explicit retry on the working endpoint, not a write.
      }
      if (phase>=4) for (const id of invalidRecordIds) {
        const start=reads.length; let rejected=false;
        try { await learner.readRegistration(dusk,id); } catch { rejected=true; }
        invalidIds.push({id,rejected,requests:reads.slice(start)});
      }
    }
    postMessage({result:{counts,writes,calls:reads.filter(r=>r.status===200).map(r=>r.path),records,invalidIds}});
  } catch (error) { postMessage({error:String(error.message || error).slice(0,3000)}); }
  finally { clients.forEach(c=>c.wallet.destroy()); if (url) URL.revokeObjectURL(url); }
};
