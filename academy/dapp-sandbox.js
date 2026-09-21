// Pages cannot set worker CSP headers. An opaque sandboxed frame supplies a
// restrictive inherited policy; learner JS runs only in its disposable worker.
let assets;
async function files(signal) {
  return assets??=Promise.all(['vendor/dusk-connect.js','courses.js','dapp-worker.js','offline-transport.js','vendor/counter-driver.wasm','vendor/explorer-driver.wasm'].map(async name=>{
    const r=await fetch(new URL(name,import.meta.url),{signal,cache:'reload'});if(!r.ok)throw Error('The bundled browser runtime is unavailable. Reload the page.');
    return name.endsWith('.wasm')?new Uint8Array(await r.arrayBuffer()):r.text();
  })).catch(error=>{assets=null;throw error;});
}
// Trusted bootstrap only. No learner source is interpolated into HTML.
const frame=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob: 'wasm-unsafe-eval'; worker-src blob:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"><script>
onmessage=({ports,source})=>{
  const port=ports[0]; if(source!==parent||!port)return; onmessage=null;
  port.onmessage=({data})=>{
    const worker=new Worker(URL.createObjectURL(new Blob([data.bootstrap],{type:'text/javascript'})));
    worker.onmessage=({data})=>port.postMessage(data);
    worker.onerror=e=>port.postMessage({error:e.message||'The isolated worker stopped.'});
    worker.postMessage(data.payload);
  };
  port.postMessage({ready:true});
};
</script>`;
const bootstrap=`
const blob=text=>URL.createObjectURL(new Blob([text],{type:'text/javascript'}));
onmessage=async({data})=>{
  onmessage=null;
  try {
    const [sdk,metadata,harness,transport,counter,explorer]=data.files;
    const sdkUrl=blob(sdk),metadataUrl=blob(metadata);
    const {installTransport}=await import(blob(transport));
    installTransport({'/api/registry-driver':counter,'/api/explorer-driver':explorer});
    // No child workers, shared workers, or persistent storage capabilities.
    Object.defineProperty(globalThis,'Worker',{value:undefined,writable:false,configurable:false});
    Object.defineProperty(globalThis,'SharedWorker',{value:undefined,writable:false,configurable:false});
    const scoped='const location={origin:"https://lesson.invalid"};\\n';
    const runner=harness.replace("'./vendor/dusk-connect.js'",JSON.stringify(sdkUrl)).replace("'./courses.js'",JSON.stringify(metadataUrl));
    await import(blob(scoped+runner));
    // Resolve the supplied SDK import locally, leaving all learner functions intact.
    // Other module imports remain subject to blob-only CSP, not a network fallback.
    const source=data.source.replace(/new\\s+URL\\(\\s*(["'])\\/academy\\/vendor\\/dusk-connect\\.js\\1\\s*,\\s*location\\.origin\\s*\\)\\.href/g,JSON.stringify(sdkUrl));
    await onmessage({data:{source,scenario:data.scenario}});
  } catch(error){postMessage({error:String(error.message||error).slice(0,3000)});}
};`;
export async function executeDapp(payload,signal) {
  const loaded=await files(signal);signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const iframe=document.createElement('iframe');iframe.hidden=true;iframe.title='Isolated dApp lesson';iframe.setAttribute('sandbox','allow-scripts');iframe.srcdoc=frame;
    const channel=new MessageChannel();let done=false,started=false;
    const abort=()=>finish(new DOMException('Run cancelled.','AbortError'));
    const timer=setTimeout(()=>finish(Error('The browser exercise took too long. Check for a loop.')),15000);
    function finish(error,result){if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);channel.port1.close();iframe.remove();error?reject(error):resolve(result);}
    channel.port1.onmessage=({data})=>{
      if(data?.ready&&!started){started=true;channel.port1.postMessage({bootstrap,payload:{...payload,files:loaded}});}
      else finish(data?.error?Error(String(data.error).slice(0,3000)):null,data?.result);
    };
    iframe.onload=()=>iframe.contentWindow.postMessage(null,'*',[channel.port2]);
    signal.addEventListener('abort',abort,{once:true});document.body.append(iframe);
  });
}
