import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createContract, simulateContract, inspectInterface} from './contract-simulator.js';
import {circuitProgram} from './circuit-program.js';
import {execute} from './circuit-worker.js';
import {fixtureResponse} from './offline-transport.js';
import {chapters,assess,codeSteps,restore,serialize,markChecked,unlocked} from './lesson.js';
import {courses,exerciseSteps,restoreCourse,serializeCourse,courseLimit,assessCourse} from './courses.js';
const root=new URL('../',import.meta.url);
const sources=JSON.parse(execFileSync('python3',['-B','-c','import json; from build_browser import lesson_sources; print(json.dumps(lesson_sources()))'],{cwd:root,env:{...process.env,PYTHONPATH:'tools'},encoding:'utf8'}));

test('every contract checkpoint evaluates its code; rollback, callers, events and interface are observed',async()=>{
  for(const i of codeSteps){const c=chapters[i],source=sources[c.check==='initial'?'initial':c.scenario];const result=simulateContract(source,c.scenario);
    if(c.scenario==='build-driver')continue;
    assert.equal(assess(i,result),null,c.id);
  }
  const final=sources['build-driver'],trace=simulateContract(final,'tests-atomic');
  const failure=trace.calls.find(c=>c.call==='confirm_pair(3, 6)'&&c.status==='rejected');
  assert.equal(failure.booked,'5');assert.ok(failure.events.length>0,'attempted events are not committed state');
  const vm=createContract(sources.capacity);vm.call('register',[3n]);assert.equal(vm.call('register',[8n]).rejected,true);assert.equal(vm.read(),3n);vm.call('register',[7n]);assert.equal(vm.read(),10n);
  assert.throws(()=>simulateContract(sources.state.replace('pub fn register','fn register'),'state'),/public register/);
  const variants=[
    ['capacity',sources.arguments],['records-cancel',sources['records-cancel'].replace('self.count -= removed.seats;','self.count -= 1;')],
    ['permissions-owner',sources['permissions-owner'].replace('.filter(|caller| *caller != TRANSFER_CONTRACT)','')],
    ['events-changes',sources['events-changes'].replace('(id, seats));','(id, self.count));')],
    ['calls-quote',sources['calls-quote'].replace('abi::call::<_, u64>(VENUE, "quote", &seats).expect("Venue unavailable")','seats * 3')],
    ['calls-confirm',sources['calls-confirm'].replace('.expect("Venue unavailable");',';')],
    ['tests-invariant',sources['tests-invariant'].replace('.map(|record| record.seats).sum()','.map(|record| record.id).sum()')],
    ['tests-atomic',final.replace('self.confirm(second);','')],
  ];
  for(const [scenario,source]of variants){const result=simulateContract(source,scenario);assert.notEqual(assess(chapters.findIndex(c=>c.kind==='code'&&c.scenario===scenario),result),null,scenario);}
  assert.throws(()=>simulateContract(sources.capacity.replace('assert!(amount > 0);','if amount == 0 { loop {} }'),'capacity'),/instruction limit/);
  assert.throws(()=>simulateContract(sources.state.replace('self.count += 1;','let oversized = [[[0; 128]; 128]; 128]; self.count += 1;'),'state'),/32 KiB/);
  assert.throws(()=>simulateContract(final.replace('self.confirm(first);','self.confirm_pair(first, second);'),'tests-atomic'),/call-depth limit/);
  const originalFetch=fetch;globalThis.fetch=async url=>String(url).startsWith('file:')?new Response(readFileSync(url)):originalFetch(url);
  try {const build=await inspectInterface(final);assert.equal(build.runtime,'simulator');assert.equal(build.contract.bytes,new TextEncoder().encode(final).length);assert.equal(build.encodedResize,'02000000000000000400000000000000');assert.equal(build.decodedMax,'18446744073709551615');
    await assert.rejects(inspectInterface(final.replace('impl Registry {','impl Registry { pub fn extra() -> u64 { 0 }')),/Extra public methods/);
  }
  finally{globalThis.fetch=originalFetch;}
});

test('browser gate programs configure real PLONK proofs, not solution-selected WASM files',async()=>{
  const file=readFileSync(new URL('./vendor/circuit-program.wasm',import.meta.url));const bytes=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
  const starter=courses.circuits.starter,equality=starter.replace('// Bind sum to total.','composer.assert_equal(sum, total);'),publicCode=equality.replace('append_witness(self.total)','append_public(self.total)');
  let previous;
  for(const [source,scenario,pass]of [[starter,'constraint',false],[equality,'constraint',true],[publicCode,'public',true],[publicCode.replace('assert_equal(sum, total)','assert_equal(total, sum)'),'public',true],[publicCode.replace('.right(1)','.right(2)'),'public',false]]) {
    let result;
    try{result=await execute(bytes,circuitProgram(source));}catch(error){if(pass)throw error;assert.match(error.message,/generation failed/);continue;}
    assert.equal(assessCourse('circuits',scenario,result)===null,pass);
    if(pass){assert.equal(result.cases[0].proofBytes,1008);assert.equal(result.cases[2].proverRejected,true);if(previous)assert.notEqual(result.proof,previous,'fresh entropy');previous=result.proof;}
  }
  assert.throws(()=>circuitProgram(publicCode.replace('// impossible','').replace('Ok(())','assert!(self.a + self.b == self.total); Ok(())')),/Rust-style guard/);
  assert.throws(()=>circuitProgram(publicCode.replace('composer.assert_equal(sum, total);','if self.a == self.total { composer.assert_equal(sum, total); }')),/structure depends/);
  assert.throws(()=>circuitProgram(publicCode.replace('gate_add','unsupported_gate')),/Not supported/);
  assert.throws(()=>circuitProgram(publicCode.replace('    pub b: BlsScalar,','')),/declared fields/);
  for(const [name,metadata]of Object.entries(JSON.parse(readFileSync(new URL('./vendor/browser-runtime.json',import.meta.url))).artifacts)) {
    const artifact=readFileSync(new URL('./vendor/'+name,import.meta.url));assert.equal(artifact.length,metadata.bytes);assert.equal(createHash('sha256').update(artifact).digest('hex'),metadata.sha256);
  }
});

test('simulated histories are bounded, separate and survive every path and native review',()=>{
  const state=restore(null);state.started=true;
  for(const step of codeSteps){state.active=step;state.source=sources[chapters[step].check==='initial'?'initial':chapters[step].scenario];markChecked(state,step,true);}
  state.step=chapters.length-1;
  const browser=restore(serialize(state),true),native=restore(serialize(state));
  assert.deepEqual(browser.simulated,state.simulated);assert.equal(browser.active,codeSteps.at(-1));assert.equal(unlocked(native),codeSteps[0]);assert.ok(Object.values(native.checks).every(v=>v===null));
  for(const id of ['dapps','circuits']){
    const course=courses[id],s=restoreCourse(id,null);s.started=true;s.source='// current draft';s.simulated={};
    for(const i of exerciseSteps(course))s.simulated[i]=course.chapters[i].kind==='quiz'?course.chapters[i].answer:'// historical '+i;
    s.step=course.chapters.length-1;s.active=exerciseSteps(course).filter(i=>course.chapters[i].kind==='code').at(-1);
    const encoded=serializeCourse(course,s);assert.deepEqual(restoreCourse(id,encoded,true),s);assert.deepEqual(restoreCourse(id,encoded).simulated,s.simulated);
    assert.equal(courseLimit(course,restoreCourse(id,encoded)),exerciseSteps(course)[0]);
    const raw=JSON.parse(encoded);raw.simulated[course.chapters[exerciseSteps(course)[0]].id]='x'.repeat(8001);
    assert.equal(restoreCourse(id,JSON.stringify(raw),true).simulated,undefined);
  }
});

test('read-only simulated transport encodes exact pinned types and distinguishes absence from failure',async()=>{
  for(const id of [0n,1n,2n,9007199254740993n,9007199254740992n,18446744073709551615n]){
    const input=new Uint8Array(8);new DataView(input.buffer).setBigUint64(0,id,true);
    for(const method of ['get_registration','owner_of','is_confirmed']){
      const r=fixtureResponse('/on/contracts:'+'55'.repeat(32)+'/'+method,input);assert.equal(r.status,200);
      const bytes=new Uint8Array(await r.arrayBuffer());assert.equal(bytes[0],[0n,2n,9007199254740993n].includes(id)?1:0);
      if(method==='get_registration'&&bytes[0])assert.equal(new DataView(bytes.buffer).getBigUint64(8,true),id===0n?2n:id===2n?3n:5n);
    }
  }
  assert.equal(fixtureResponse('/on/contracts:'+'66'.repeat(32)+'/get_registration',new Uint8Array(8)).status,503);
  assert.equal(fixtureResponse('/on/contracts:'+'55'.repeat(32)+'/register',new Uint8Array(8)).status,404);
});
