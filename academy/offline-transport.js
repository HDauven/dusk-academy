// Pinned, read-only teaching fixtures. These bytes model the pinned rkyv ABI,
// not RPC responses from a live chain. Native tests compare every field/absence.
export function fixtureResponse(path,bytes) {
  const match=/^\/on\/contracts:([0-9a-f]{64})\/(get_count|get_registration|owner_of|is_confirmed)$/.exec(path);
  if(!match)return new Response('Unknown teaching endpoint',{status:404});
  const [,id,method]=match;
  if(id==='66'.repeat(32))return new Response('This teaching endpoint is deliberately unavailable.',{status:503});
  if(method==='get_count') {
    if(bytes.length||!['02'.repeat(32),'07'.repeat(32)].includes(id))return new Response('Invalid counter query',{status:400});
    const out=new Uint8Array(8);new DataView(out.buffer).setBigUint64(0,id.startsWith('02')?2n:7n,true);return new Response(out);
  }
  if(id!=='55'.repeat(32)||bytes.length!==8)return new Response('Supply one encoded u64 ID',{status:400});
  const key=String(new DataView(bytes.buffer,bytes.byteOffset,8).getBigUint64(0,true));
  const record=new Map([['0',{seats:2n,owner:0x22,confirmed:false}],['2',{seats:3n,owner:0x33,confirmed:true}],['9007199254740993',{seats:5n,owner:0x22,confirmed:false}]]).get(key);
  const out=new Uint8Array(method==='get_registration'?16:method==='owner_of'?33:2);
  if(record){out[0]=1;if(method==='get_registration')new DataView(out.buffer).setBigUint64(8,record.seats,true);else if(method==='owner_of')out.fill(record.owner,1);else out[1]=Number(record.confirmed);}
  return new Response(out);
}
export function installTransport(drivers) {
  globalThis.fetch=async(input,options)=>{
    const request=new Request(input,options),url=new URL(request.url);
    if(url.origin!=='https://lesson.invalid')throw Error('The offline lesson allows only its teaching fixtures.');
    if(Object.hasOwn(drivers,url.pathname)&&request.method==='GET')return new Response(drivers[url.pathname],{headers:{'Content-Type':'application/wasm'}});
    if(request.method!=='POST'||request.headers.get('Content-Type')!=='application/octet-stream')return new Response('Invalid fixture request',{status:400});
    return fixtureResponse(url.pathname,new Uint8Array(await request.arrayBuffer()));
  };
}
