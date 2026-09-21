// Execute learner ASTs against fixed call plans. Expected answers live only in lesson.js.
import {createRuntime, Rejection, RuntimeLimit, U64_MAX, contractId} from './rust-runtime.js';
import {contractIds} from './lesson.js?v=browser-1';
const advanced=['permissions-caller','permissions-owner','permissions-cancel','permissions-resize','events-register','events-changes','calls-quote','calls-confirm','tests-invariant','tests-atomic','build-driver'];
const decimal=v=>{if(typeof v!=='bigint')throw Error('Lesson runtime expected a u64 return value.');return String(v);};
const unwrap=v=>v===null?null:v?.kind==='some'?v.value:(()=>{throw Error('Lesson runtime expected Option.');})();
const event=(source,topic,args)=>{
  if(typeof topic!=='string'||topic.length>64||args?.kind!=='tuple'||args.items.length!==2||args.items.some(n=>typeof n!=='bigint'))throw Error('The event subset supports a topic and a pair of u64 values.');
  const bytes=new Uint8Array(16),view=new DataView(bytes.buffer);args.items.forEach((v,i)=>view.setBigUint64(i*8,v,true));
  return {source,topic,data:Array.from(bytes)};
};
export function createContract(source) {
  let actor='Query', events=[];
  let venue={booked:0n,rate:3n,limit:10n,offline:false};
  const emit=(source,topic,args)=>{if(events.length>=16)throw new RuntimeLimit('Lesson receipt limit reached.');events.push(event(source,topic,args));};
  const functions=new Map([
    ['abi::caller',args=>{if(args.length)throw Error('caller takes no arguments.');return contractIds[actor]?{kind:'some',value:contractId(contractIds[actor])}:null;}],
    ['abi::emit',args=>{if(args.length!==2)throw Error('emit expects a topic and payload.');emit(contractIds.Registry,...args);}],
    ['abi::call',(args,generic)=>{
      if(args.length!==3)throw Error('call expects a target, method and argument.');
      const [target,method,input]=args;
      if(target?.kind!=='id'||target.hex!==contractIds.Venue||!['quote','book'].includes(method))throw Error('Only the supplied venue quote/book host calls are supported.');
      const before=structuredClone(venue);
      try {
        if(method==='quote') {
          if(generic.join(',')!=='_,u64'||typeof input!=='bigint')throw Error('quote expects a u64 input and output.');
          if(venue.offline)throw new Rejection('Venue offline');
          const value=input*venue.rate;if(value>U64_MAX)throw new Rejection('u64 overflow');return {kind:'ok',value};
        }
        if(generic.join(',')!=='_,()'||input?.kind!=='tuple'||input.items.length!==2)throw Error('book expects (id, seats) and a unit result.');
        const [,seats]=input.items;if(typeof seats!=='bigint')throw Error('book expects u64 seats.');
        venue.booked+=seats;
        if(venue.booked>U64_MAX||venue.offline||venue.booked>venue.limit)throw new Rejection('Venue unavailable');
        emit(contractIds.Venue,'venue_booked',input);return {kind:'ok',value:undefined};
      } catch(error){venue=before;if(!(error instanceof Rejection))throw error;return {kind:'err',value:error.message};}
    }],
  ]);
  const runtime=createRuntime(source,{functions});let state=runtime.create();
  const boundedState=()=>{if(JSON.stringify(state,(_,v)=>typeof v==='bigint'?String(v):v).length>32768)throw new RuntimeLimit('The simulated state exceeds the 32 KiB teaching limit.');};
  boundedState();
  function call(method,args=[],caller='Query') {
    if(!runtime.program.methods.get('Registry::'+method)?.exported)throw Error('The contract needs a public '+method+' method. Private helpers are not entrypoints.');
    const saved=structuredClone(state),oldVenue=structuredClone(venue);actor=caller;events=[];
    try {const value=runtime.invoke(state,method,args);boundedState();return {value,events};}
    catch(error){state=saved;venue=oldVenue;if(!(error instanceof Rejection))throw error;return {rejected:true,events:caller==='Query'?[]:events,error:error.message};}
  }
  const read=(method='get_count',args=[])=>{
    const before=JSON.stringify(state,(_,v)=>typeof v==='bigint'?String(v):v),a=call(method,args),b=call(method,args);
    if(a.rejected||b.rejected)throw Error(method+' could not complete in the simulator: '+(a.error||b.error));
    if(JSON.stringify(a.value,(_,v)=>typeof v==='bigint'?String(v):v)!==JSON.stringify(b.value,(_,v)=>typeof v==='bigint'?String(v):v)||before!==JSON.stringify(state,(_,v)=>typeof v==='bigint'?String(v):v))throw Error(method+' changed state between reads.');
    return a.value;
  };
  return {call,read,program:runtime.program,venue:()=>venue,configure(method,value){if(method==='set_rate')venue.rate=value;else if(method==='set_limit')venue.limit=value;else if(method==='set_offline')venue.offline=value;else throw Error('Unknown venue fixture operation.');}};
}

export function simulateContract(source,scenario='state') {
  if(!['state','arguments','validation','capacity','records-empty','records-ids','records-save','records-read','records-missing','records-cancel',...advanced].includes(scenario))throw Error('Unknown contract lesson scenario.');
  const vm=createContract(source),fresh=createContract(source),initial=decimal(vm.read()),reset=decimal(fresh.read());
  if(scenario==='state'){
    const after=[];for(let i=0;i<3;i++){const r=vm.call('register');if(r.rejected)throw Error('Simulator execution stopped: '+r.error+'. The call was rolled back.');after.push(decimal(vm.read()));}
    return {ok:true,initial,after,fresh:reset};
  }
  const result={ok:true,initial,fresh:reset,scenario,calls:[]},phase=advanced.indexOf(scenario);
  const push=(machine,method,args=[],isFresh=false,actor='Query')=>{
    const before=decimal(machine.read());
    const fixture=actor==='Fixture';
    const r=fixture?(machine.configure(method,args[0]),{value:undefined,events:[]}):machine.call(method,args,actor);
    const label=method+'('+args.map((n,i)=>n===U64_MAX&&i===0?'u64::MAX':String(n)).join(', ')+')';
    const row={call:label,status:r.rejected?'rejected':'accepted',before,after:decimal(machine.read()),fresh:isFresh};
    if(scenario.startsWith('records-')||phase>=0) {
      const v=r.value;
      row.value=r.rejected?null:v===undefined?'()':v===null?'None':v?.kind==='some'?(phase>=0?v.value.hex:`Some(${decimal(v.value)})`):decimal(v);
      row.size=decimal(machine.read('registration_count'));row.next=scenario==='records-empty'?null:decimal(machine.read('next_id'));
    }
    if(phase>=0) {
      row.actor=actor;row.events=r.events;row.booked=String(machine.venue().booked);row.accounted=phase>=8?decimal(machine.read('accounted_seats')):null;
      row.records=phase<1?[]:[0n,1n,2n,3n,4n,5n,6n,7n,4294967296n,U64_MAX].map(id=>{
        const seats=unwrap(machine.read('get_registration',[id])),owner=unwrap(machine.read('owner_of',[id]));
        return {id:String(id),seats:seats===null?null:decimal(seats),owner:owner===null?null:owner.hex,confirmed:phase>=7?unwrap(machine.read('is_confirmed',[id])):null};
      });
    }
    result.calls.push(row);
  };
  if(phase>=0) {
    const action=(actor,method,...args)=>push(vm,method,args.map(n=>typeof n==='number'?BigInt(n):n),false,actor);
    for(const actor of ['Query','A','B','Transfer'])action(actor,'current_caller');
    if(phase>=1)for(const [actor,n]of [['Query',2],['Transfer',2],['A',2],['B',3],['A',0],['A',6],['A',5],['A',U64_MAX]])action(actor,'register',n);
    if(phase>=2)for(const args of [['B','cancel',0],['Query','cancel',0],['Transfer','cancel',0],['A','cancel',1],['A','cancel',0],['A','cancel',0],['B','cancel',1],['A','register',2]])action(...args);
    if(phase>=3)for(const [actor,id,n]of [['B',2,4],['A',2,0],['A',2,9],['A',2,U64_MAX],['A',2,4],['A',3,6],['A',3,2],['A',99,1],['Query',2,1]])action(actor,'resize',id,n);
    if(phase>=6)for(const args of [['Query','quote',2],['Query','quote',7],['Fixture','set_rate',4],['Query','quote',5],['Fixture','set_offline',true],['Query','quote',1],['Fixture','set_offline',false],['Query','quote',1]])action(...args);
    if(phase>=7) {
      for(const args of [['B','confirm',2],['Fixture','set_offline',true],['A','confirm',2],['Fixture','set_offline',false],['A','confirm',2],['A','confirm',2],['A','resize',2,1],['A','cancel',2],['A','confirm',99],['Query','confirm',3]])action(...args);
    }
    if(phase>=8)for(const args of [['A','register',3],['B','cancel',4],['A','resize',4,4],['A','cancel',4],['A','register',1],['A','confirm',5],['A','cancel',5]])action(...args);
    if(phase>=9)for(const args of [['A','register',1],['B','register',1],['A','confirm_pair',3,7],['A','confirm_pair',3,3],['A','confirm_pair',3,99],['B','confirm_pair',3,7],['Fixture','set_limit',7],['A','confirm_pair',3,6],['Fixture','set_limit',10],['A','confirm_pair',3,6],['A','confirm_pair',3,6],['B','confirm',7]])action(...args);
    result.advanced=true;
  } else if(scenario.startsWith('records-')) {
    const level=['empty','ids','save','read','missing','cancel'].indexOf(scenario.slice(8));
    if(level===0){push(vm,'registration_count');push(fresh,'registration_count',[],true);}
    else {
      push(vm,'next_id');for(const amount of [2n,0n,3n,6n,5n,U64_MAX])push(vm,'register',[amount]);
      if(level>=3)for(const id of [0n,1n,2n])push(vm,'get_registration',[id]);
      if(level>=4)for(const id of [4294967296n,U64_MAX])push(vm,'get_registration',[id]);
      if(level===5){for(const [method,n]of [['cancel',1],['get_registration',2],['get_registration',1],['cancel',1],['register',3],['cancel',U64_MAX],['cancel',0],['get_registration',3],['cancel',2],['cancel',3],['register',10],['get_registration',4]])push(vm,method,[BigInt(n)]);push(fresh,'register',[8n],true);push(fresh,'get_registration',[0n]);}
      else push(fresh,level===4?'get_registration':'next_id',level===4?[0n]:[],true);
    }
  } else {
    for(const n of scenario==='arguments'?[2n,3n,1n]:scenario==='validation'?[2n,3n,1n,0n,1n]:[3n,8n,7n,1n,0n,U64_MAX])push(vm,'register',[n]);
    if(scenario==='capacity'){push(fresh,'register',[8n],true);push(fresh,'register',[2n]);}
  }
  return result;
}

// Parsed interface, not a claim that the edited source produced this reference WASM.
export async function inspectInterface(source, signal) {
  const {program}=createContract(source);
  const {createDuskApp}=await import('./vendor/dusk-connect.js');
  signal?.throwIfAborted();
  const response=await fetch(new URL('./vendor/registry-methods.wasm',import.meta.url),{signal});
  if(!response.ok)throw Error('The bundled reference driver is unavailable. Reload the page.');
  const bytes=new Uint8Array(await response.arrayBuffer());
  const client=createDuskApp({pinnedNodeUrl:'https://lesson.invalid',autoConnect:false,wallet:{waitForProvider:false,rememberLastUsedProvider:false}});
  const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  try {
    const driver=await client.driver('data:application/wasm;base64,'+btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')));
    const functions=driver.getSchema().functions;
    const declared=[...program.methods.values()].filter(m=>m.owner==='Registry'&&m.exported&&m.id!=='new');
    for(const f of functions){const m=declared.find(m=>m.id===f.name);const input=m?.params.length===0?'()':m?.params.length===1?m.params[0].type:'('+m?.params.map(p=>p.type).join(',')+')';
      if(!m||input.replaceAll(' ','')!==f.input.replaceAll(' ','')||m.output.replaceAll(' ','')!==f.output.replaceAll(' ',''))throw Error('The interpreted method interface does not match the reference driver: '+f.name);}
    if(declared.length!==functions.length)throw Error('Extra public methods need a separately built native driver. They are outside this lesson interface.');
    const text=new TextEncoder().encode(source),artifact=async data=>({bytes:data.length,sha256:hex(new Uint8Array(await crypto.subtle.digest('SHA-256',data)))});
    return {runtime:'simulator',functions,encodedRegister:hex(driver.encodeInputFn('register','2')),encodedResize:hex(driver.encodeInputFn('resize','[2,4]')),decodedMax:driver.decodeOutputFn('accounted_seats',new Uint8Array(8).fill(255)),contract:await artifact(text),driver:await artifact(bytes)};
  } finally {client.wallet.destroy();}
}
