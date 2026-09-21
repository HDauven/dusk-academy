import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courses,courseKey,restoreCourse,serializeCourse,courseLimit,courseComplete,courseLesson,lessonComplete,explorerScenarios,explorerIds,invalidRecordIds,exerciseSteps,partSteps,assessCourse} from './courses.js';
import {storageKey} from './lesson.js';

const originals={dusk:['begin','transactions','disclosure','policy','learned'],dapps:['begin','read','prepare','wallet','learned'],circuits:['begin','constraint','public','learned']};

test('longer lessons: small parts, worked examples, optional practice and unchanged checkpoint chain',()=>{
  assert.deepEqual(Object.values(courses).map(c=>c.chapters.length),[15,23,12]);
  assert.doesNotMatch(JSON.stringify(courses),/\u2014/,'keep lesson copy free of em dashes');
  assert.equal(courses.circuits.starter,readFileSync(new URL('../examples/first-circuit/src/circuit.rs',import.meta.url),'utf8'));
  assert.equal(new Set([storageKey,...Object.keys(courses).map(courseKey)]).size,4);
  for(const [id,course] of Object.entries(courses)) {
    assert.equal(new Set(course.chapters.map(c=>c.id)).size,course.chapters.length);
    const checkpointIds=[...originals[id].slice(1,-1),...(id==='dapps'?explorerScenarios:[])];
    assert.deepEqual(exerciseSteps(course).map(i=>course.chapters[i].id),checkpointIds);
    for(const lesson of course.lessons) {
      const first=course.chapters.findIndex(c=>c.id===lesson.start), last=course.chapters.findIndex(c=>c.id===lesson.end);
      assert.equal(course.chapters[first].kind,'intro');assert.equal(course.chapters[last].kind,'earned');
      assert.equal(courseLesson(course,first),lesson);assert.equal(courseLesson(course,last),lesson);
    }
    for(const [i,c] of course.chapters.entries()) {
      assert.ok(['intro','guide','practice','quiz','code','earned'].includes(c.kind));
      assert.ok(c.body.trim());assert.ok(course.parts[c.part]);
      const part=partSteps(course,i);assert.ok(part.length>=4&&part.length<=5);
      if(c.kind==='guide') assert.ok(c.panel&&c.panelTitle);
      if(c.choices) {
        assert.equal(new Set(c.choices.map(([key])=>key)).size,c.choices.length);
        assert.equal(c.choices.filter(([key])=>key===c.answer).length,1);assert.ok(c.success&&c.error&&c.question);
      }
    }
    let state=restoreCourse(id,null);
    assert.equal(courseLimit(course,state),0);assert.equal(courseComplete(course,state),false);
    for(const bad of ['{','null','[]','{"version":5}','x'.repeat(160001)]) assert.deepEqual(restoreCourse(id,bad),state);
    state.started=true;
    // Practice selections persist, but do not become graded skill checkpoints.
    for(const [i,c] of course.chapters.entries()) if(c.kind==='practice') state.answers[i]=c.answer;
    for(const i of exerciseSteps(course)) {
      assert.equal(courseLimit(course,state),i);
      const chapter=course.chapters[i];state.step=i;
      if(chapter.kind==='code') {state.active=i;state.source+='\n// retained edit';state.checks[i]=state.source;}
      else {state.answers[i]=chapter.answer;state.checks[i]=chapter.answer;}
      assert.deepEqual(restoreCourse(id,serializeCourse(course,state)),state);
    }
    assert.equal(courseLimit(course,state),course.chapters.length-1);assert.equal(courseComplete(course,state),true);
    const raw=JSON.parse(serializeCourse(course,state));
    assert.equal(raw.version,2);assert.equal(raw.step,course.chapters[state.step].id);
    assert.deepEqual(Object.keys(raw.checks),checkpointIds);
    state.step=0;
    const restored=restoreCourse(id,serializeCourse(course,state));assert.equal(restored.source,state.source);assert.equal(restored.active,state.active);
    const broken=restoreCourse(id,serializeCourse(course,{...state,checks:{[exerciseSteps(course).at(-1)]:state.checks[exerciseSteps(course).at(-1)]}}));
    assert.equal(courseLimit(course,broken),exerciseSteps(course)[0]);assert.equal(courseComplete(course,broken),false);
    const checks={}; for(const [i,c] of course.chapters.entries()) if(c.kind==='practice') checks[c.id]=c.answer;
    assert.equal(courseComplete(course,restoreCourse(id,JSON.stringify({...raw,checks}))),false,'practice cannot fabricate completion');
  }
  const start=courses.dusk.chapters;
  for(const topic of ['why-dusk','shared-state','wallets','transaction-flow','contracts']) assert.ok(start.findIndex(c=>c.id===topic)<start.findIndex(c=>c.id==='transactions'));
  assert.doesNotMatch(start[0].body,/Moonlight|Phoenix|Citadel|XSC|PLONK/,'define basic concepts before introducing protocol names');
  assert.equal(start.find(c=>c.id==='transactions').note,undefined,'remove the Phoenix availability note');
});

test('v1 migration retains every old checkpoint, chapter, draft and earned skill',()=>{
  for(const [id,ids] of Object.entries(originals)) {
    const course=courses[id], firstCode=ids.findIndex(name=>course.chapters.find(c=>c.id===name)?.kind==='code');
    const old={version:1,step:0,active:firstCode,started:false,source:course.starter||'',checks:{},answers:{}};
    for(let step=0;step<ids.length;step++) {
      old.step=step;
      if(step>0) old.started=true;
      const chapter=course.chapters.find(c=>c.id===ids[step]);
      if(chapter.kind==='code') {old.active=step;old.source+='\n// original notes';}
      // Unchecked current tasks must also reopen at the original logical chapter.
      let migrated=restoreCourse(id,JSON.stringify(old));
      assert.equal(course.chapters[migrated.step].id,ids[step]);assert.equal(migrated.source,old.source);
      if(firstCode>=0) assert.equal(course.chapters[migrated.active].id,ids[old.active]);
      if(chapter.kind==='code') old.checks[step]=old.source;
      if(chapter.kind==='quiz') {old.answers[step]=chapter.answer;old.checks[step]=chapter.answer;}
      migrated=restoreCourse(id,JSON.stringify(old));
      assert.deepEqual(restoreCourse(id,serializeCourse(course,migrated)),migrated);
    }
    const completed=restoreCourse(id,JSON.stringify(old));
    assert.equal(lessonComplete(course,completed,course.lessons[0]),true,'do not revoke the original skill');
    assert.equal(courseComplete(course,completed),id!=='dapps','new skills require their own checks');
    if(id==='dapps') {
      assert.equal(lessonComplete(course,completed,course.lessons[1]),false);
      assert.equal(courseLimit(course,completed),16);
    }
    assert.equal(Object.keys(completed.checks).length,ids.length-2);
    old.step=1;const earlier=restoreCourse(id,JSON.stringify(old));
    assert.equal(course.chapters[earlier.step].id,ids[1]);assert.equal(earlier.source,old.source);
    if(firstCode>=0) assert.equal(course.chapters[earlier.active].id,ids[old.active]);
  }
});

test('v2 chapter identity survives inserted material; bounded and malformed saves stay defensive',()=>{
  const course=courses.dapps, state=restoreCourse('dapps',null);
  state.started=true;state.source+='\n// saved draft';state.step=course.chapters.findIndex(c=>c.id==='read');
  const raw=serializeCourse(course,state);
  course.chapters.splice(1,0,{id:'additional-guide',part:0,kind:'guide'});
  try {
    const moved=restoreCourse('dapps',raw);
    assert.equal(course.chapters[moved.step].id,'read');assert.equal(course.chapters[moved.active].id,'read');
    assert.equal(moved.source,state.source);
  } finally {course.chapters.splice(1,1);}
  const invalid=restoreCourse('dapps',JSON.stringify({version:2,step:'learned',active:'prepare',started:true,source:'x'.repeat(8001),checks:{prepare:'draft'},answers:{await:'missing'}}));
  assert.equal(invalid.step,0);assert.equal(invalid.source,course.starter);assert.deepEqual(invalid.checks,{});assert.deepEqual(invalid.answers,{});
  const v1=restoreCourse('dusk',JSON.stringify({version:1,answers:{'-1':'same'}}));assert.deepEqual(v1.answers,{});
  const escaped=course.starter+'\n// '+'\u0001'.repeat(6000);
  const full={...state,source:escaped,checks:Object.fromEntries(exerciseSteps(course).map(i=>[i,course.chapters[i].kind==='code'?escaped:course.chapters[i].answer]))};
  full.active=exerciseSteps(course).filter(i=>course.chapters[i].kind==='code').at(-1);
  assert.deepEqual(restoreCourse('dapps',serializeCourse(course,full)),full);
});

test('dApp results require both reads, typed arguments and zero attached tokens',()=>{
  const result={counts:['2','7'],calls:[2,7].map(n=>`/on/contracts:${n.toString(16).padStart(2,'0').repeat(32)}/get_count`),writes:[2,7].map(n=>({contractId:'0x'+n.toString(16).padStart(2,'0').repeat(32),functionName:'register',amount:n,privacy:'public',value:'0',deposit:'0',encoded:[n,0,0,0,0,0,0,0]}))};
  assert.equal(assessCourse('dapps','read',result),null);assert.equal(assessCourse('dapps','prepare',result),null);
  assert.match(assessCourse('dapps','read',{...result,counts:[0,0]}),/Read each/);
  assert.match(assessCourse('dapps','read',{...result,calls:[]}),/local contract reads/);
  const wrong=structuredClone(result);wrong.writes[0].value='10';assert.match(assessCourse('dapps','prepare',wrong),/Attach no tokens/);
  wrong.writes[0]=null;assert.match(assessCourse('dapps','prepare',wrong),/Prepare register/);
  assert.throws(()=>assessCourse('dapps','unknown',result),/invalid result/);
  assert.throws(()=>assessCourse('dapps','read',null),/invalid result/);
});

test('registry reads require exact IDs, actual field requests, absence, validation and recovery',()=>{
  const result={counts:['2','7'],calls:[2,7].map(n=>`/on/contracts:${n.toString(16).padStart(2,'0').repeat(32)}/get_count`),writes:[2,7].map(n=>({contractId:'0x'+n.toString(16).padStart(2,'0').repeat(32),functionName:'register',amount:n,privacy:'public',value:'0',deposit:'0',encoded:[n,0,0,0,0,0,0,0]}))};
  for(const [phase,scenario] of explorerScenarios.entries()) {
    const sample=(id,offline=false)=>{
      const seats=({'0':2,'2':3,'9007199254740993':5})[id]??null;
      const record=seats===null?null:{id,seats,...(phase>=2?{owner:(id==='2'?'33':'22').repeat(32)}:{}),...(phase>=3?{confirmed:id==='2'}:{})};
      const methods=['get_registration',...(seats!==null&&phase>=2&&!offline?['owner_of']:[]),...(seats!==null&&phase>=3&&!offline?['is_confirmed']:[])];
      return {id,offline,record:phase===5?(offline?{status:'unavailable'}:record?{status:'found',record}:{status:'missing'}):record,
        requests:methods.map(method=>({path:`/on/contracts:${(offline?'66':'55').repeat(32)}/${method}`,input:BigInt(id).toString(16).padStart(16,'0').match(/../g).reverse().join(''),status:offline?503:200}))};
    };
    const good={...result,records:explorerIds(phase).map(id=>sample(id)),invalidIds:invalidRecordIds.map(id=>({id,rejected:true,requests:[]}))};
    if(phase===5) good.records.push(sample('0',true),sample('0'));
    assert.equal(assessCourse('dapps',scenario,good),null);
    const changed=fn=>{const bad=structuredClone(good);fn(bad);return assessCourse('dapps',scenario,bad);};
    assert.match(changed(b=>b.records[0].requests=[]),/exact encoded argument/);
    assert.match(changed(b=>b.records[0].requests[0].input='0200000000000000'),/exact encoded argument/);
    const first=b=>phase===5?b.records[0].record.record:b.records[0].record;
    assert.match(changed(b=>first(b).id=0),/ID string/);
    assert.match(changed(b=>first(b).seats=0),/seat count/);
    if(phase>=2) assert.match(changed(b=>first(b).owner='wallet'),/owner_of/);
    if(phase>=3) assert.match(changed(b=>first(b).confirmed=null),/Boolean false/);
    if(phase>=4) assert.match(changed(b=>b.invalidIds[0].rejected=false),/Reject invalid/);
    if(phase===5) {
      assert.match(changed(b=>b.records.at(-2).record={status:'missing'}),/report unavailable/);
      assert.match(changed(b=>b.records.at(-1).record={status:'unavailable'}),/report found/);
      assert.match(changed(b=>b.records.at(-2).record.record={id:'0',seats:0}),/fabricated or stale/);
    }
    assert.throws(()=>changed(b=>b.records[0].requests[0].status='200'),/invalid result/);
    assert.throws(()=>assessCourse('dapps',scenario,{...good,records:[]}),/invalid result/);
  }
});

test('v2 opening-lesson graduates keep snapshots and continue into the explorer',()=>{
  const course=courses.dapps;
  const old={version:2,step:'learned',active:'prepare',started:true,source:course.starter+'\n// unfinished draft',checks:{read:'// earned read',prepare:'// earned preparation',wallet:'approval'},answers:{wallet:'approval'}};
  const restored=restoreCourse('dapps',JSON.stringify(old));
  assert.equal(restored.step,14);assert.equal(restored.active,8);assert.equal(courseLimit(course,restored),16);
  assert.deepEqual(JSON.parse(serializeCourse(course,restored)),old);
  restored.step=16;restored.active=16;
  assert.equal(restoreCourse('dapps',serializeCourse(course,restored)).source,old.source);
  assert.equal(lessonComplete(course,restored,course.lessons[0]),true);
  assert.equal(lessonComplete(course,restored,course.lessons[1]),false);
});

test('circuit results distinguish constraints, public inputs and prover rejection',()=>{
  const result={proof:'a'.repeat(2016),cases:[[4,5,9],[2,3,5],[4,5,8]].map(([a,b,total],i)=>({a,b,total,verified:i<2,proverRejected:i===2,proofBytes:i<2?1008:0,...(i<2?{publicCount:1,publicMatches:true,changedTotalVerified:false}:{})}))};
  assert.equal(assessCourse('circuits','public',result),null);
  const privateTotal=structuredClone(result);privateTotal.cases[0].publicCount=0;privateTotal.cases[0].publicMatches=false;
  assert.equal(assessCourse('circuits','constraint',privateTotal),null);assert.match(assessCourse('circuits','public',privateTotal),/Expose total/);
  const wrong=structuredClone(result);wrong.cases[2].verified=true;assert.match(assessCourse('circuits','constraint',wrong),/accepted 4/);
  wrong.cases[2].verified=false;wrong.cases[0].changedTotalVerified=true;assert.match(assessCourse('circuits','public',wrong),/different public total/);
  assert.throws(()=>assessCourse('circuits','unknown',result),/invalid result/);
  assert.throws(()=>assessCourse('circuits','public',{...result,proof:''}),/invalid result/);
});
