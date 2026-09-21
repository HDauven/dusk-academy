import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {storageKey, starter, chapters, lessons, codeSteps, stepsFor, partSteps, restore, serialize, assess, unlocked, markChecked, contractIds, cleanName} from './lesson.js';

const step=id=>chapters.findIndex(c=>c.id===id);
const grade=(id,result)=>assess(step(id),result);
// Frozen positions/check keys from the shipped numeric-save curriculum.
const oldIds=['begin','state','entrypoint','learned','groups','arguments','arguments-learned','rules','positive','capacity','validation-learned','records','record-storage','record-ids','record-save','record-read','record-missing','record-cancel','records-learned','permissions','permission-caller','permission-owner','permission-cancel','permission-resize','permissions-learned','interactions','event-register','event-changes','call-quote','call-confirm','interactions-learned','testing','test-invariant','test-atomic','build-artifacts','build-driver','building-learned'];
const oldChecks=[[1,'initial'],[2,'change'],[5,'arguments'],[8,'positive'],[9,'capacity'],[12,'recordStorage'],[13,'recordIds'],[14,'recordSave'],[15,'recordRead'],[16,'recordMissing'],[17,'recordCancel'],[20,'ownerCaller'],[21,'ownerBinding'],[22,'ownerCancel'],[23,'ownerResize'],[26,'eventRegister'],[27,'eventChanges'],[28,'callQuote'],[29,'callConfirm'],[32,'testInvariant'],[33,'testAtomic'],[35,'buildDriver']];
const stateResult={ok:true,initial:'0',after:['1','2','3'],fresh:'0'};
const trace=(scenario, values)=>({ok:true,initial:'0',fresh:'0',scenario,calls:values.map(([amount,status,before,after,fresh=false])=>({call:`register(${amount})`,status,before,after,fresh}))});
const argsResult=trace('arguments',[
  ['2','accepted','0','2'],['3','accepted','2','5'],['1','accepted','5','6'],
]);
const validationResult=trace('validation',[
  ['2','accepted','0','2'],['3','accepted','2','5'],['1','accepted','5','6'],['0','rejected','6','6'],['1','accepted','6','7'],
]);
const capacityResult=trace('capacity',[
  ['3','accepted','0','3'],['8','rejected','3','3'],['7','accepted','3','10'],['1','rejected','10','10'],
  ['0','rejected','10','10'],['u64::MAX','rejected','10','10'],['8','accepted','0','8',true],['2','accepted','8','10'],
]);

test('seven paced Forge lessons retain every original checkpoint and use compact parts',()=>{
  assert.equal(chapters.length,83);
  assert.deepEqual(lessons.map((_,i)=>stepsFor(i).length),[15,8,12,12,12,12,12]);
  assert.deepEqual(lessons.map(lesson=>lesson.skill),['Contract state','Call arguments','Input validation','Registration records','Contract permissions','Contract interaction','Testing and building']);
  assert.equal(new Set(chapters.map(c=>c.id)).size,chapters.length);
  assert.deepEqual(chapters.filter(c=>oldIds.includes(c.id)).map(c=>c.id),oldIds);
  assert.deepEqual(codeSteps.map(i=>[chapters[i].id,chapters[i].check]),oldChecks.map(([i,key])=>[oldIds[i],key]));
  assert.equal(chapters.filter(c=>c.kind==='practice').length,19);
  for(const [i,c] of chapters.entries()) {
    assert.ok(c.body.trim());assert.ok(['intro','guide','practice','code','earned'].includes(c.kind));
    assert.ok(lessons[c.lesson].parts[c.part]);assert.ok([4,5].includes(partSteps(i).length));
    assert.ok(partSteps(i).every(n=>chapters[n].lesson===c.lesson&&chapters[n].part===c.part));
    if(c.kind==='guide') assert.ok(c.panel&&c.panelTitle,c.id);
    if(c.kind==='practice') {
      assert.equal(c.choices.filter(([answer])=>answer===c.answer).length,1);
      assert.equal(new Set(c.choices.map(([answer])=>answer)).size,c.choices.length);
      assert.ok(c.question&&c.success&&c.error);
    }
  }
  for(const [i] of lessons.entries()) {
    assert.equal(chapters[stepsFor(i)[0]].kind,'intro');assert.equal(chapters[stepsFor(i).at(-1)].kind,'earned');
  }
  assert.match(chapters[step('permissions')].note,/not deploy these fixtures/);
  assert.match(chapters[step('permissions-learned')].body,/does <strong>not<\/strong> authenticate wallet/);
  assert.match(starter,/#\[dusk_forge::contract\]/);assert.equal(storageKey,'dusk-academy-forge-lesson-v1');
});

test('unchanged behavioral grading addresses chapters by identity, never old array offsets',()=>{
  assert.equal(grade('state',stateResult),null);assert.equal(grade('entrypoint',stateResult),null);
  assert.equal(grade('state',{...stateResult,after:['0','0','0']}),null);
  assert.match(grade('entrypoint',{...stateResult,after:['0','0','0']}),/exactly one/);
  assert.match(grade('entrypoint',{...stateResult,initial:'7'}),/starts at 7/);
  assert.match(grade('state',{ok:false,phase:'compile'}),/compile/);
  assert.equal(grade('arguments',argsResult),null);assert.equal(grade('positive',validationResult),null);assert.equal(grade('capacity',capacityResult),null);
  for(const [id,result,index,change,pattern] of [
    ['arguments',argsResult,0,{after:'1'},/supplied amount/],
    ['positive',validationResult,3,{status:'accepted'},/zero amount/],
    ['capacity',capacityResult,1,{status:'accepted',after:'11'},/above ten/],
    ['capacity',capacityResult,2,{status:'rejected',after:'3'},/from 3 to 10/],
    ['capacity',capacityResult,6,{status:'rejected',after:'0'},/fresh register/],
    ['capacity',capacityResult,1,{after:'11'},/changed to 11.*stay at 3/],
  ]) {
    const changed=structuredClone(result);Object.assign(changed.calls[index],change);assert.match(grade(id,changed),pattern);
  }
  for(const malformed of [{...stateResult,after:[]},{...stateResult,after:[1,2,3]},{...stateResult,initial:'<script>'}]) assert.throws(()=>grade('entrypoint',malformed),/invalid result/);
  for(const malformed of [{...argsResult,scenario:'state'},{...argsResult,calls:[]},{...argsResult,calls:[null,null,null]}]) assert.throws(()=>grade('arguments',malformed),/invalid result/);
  const malformedFresh=structuredClone(capacityResult);malformedFresh.calls[6].fresh=false;
  assert.throws(()=>grade('capacity',malformedFresh),/invalid result/);
  const emptyRecords={ok:true,initial:'0',fresh:'0',scenario:'records-empty',calls:[false,true].map(fresh=>({call:'registration_count()',status:'accepted',before:'0',after:'0',fresh,value:'0',size:'0',next:null}))};
  assert.equal(grade('record-storage',emptyRecords),null);
  const notEmpty=structuredClone(emptyRecords);notEmpty.calls[0].size='1';assert.match(grade('record-storage',notEmpty),/Expected 0/);
  for(const change of [{size:0},{value:0},{value:'<script>'},{next:'0'},{fresh:'false'}]) {
    const malformed=structuredClone(emptyRecords);Object.assign(malformed.calls[0],change);
    assert.throws(()=>grade('record-storage',malformed),/invalid result/);
  }
  const callerResult={ok:true,initial:'0',fresh:'0',advanced:true,scenario:'permissions-caller',calls:['Query','A','B','Transfer'].map(actor=>({actor,call:'current_caller()',status:'accepted',before:'0',after:'0',size:'0',next:'0',booked:'0',accounted:null,fresh:false,records:[],events:[],value:contractIds[actor]||'None'}))};
  assert.equal(grade('permission-caller',callerResult),null);
  const wrongCaller=structuredClone(callerResult);wrongCaller.calls[2].value=contractIds.A;assert.match(grade('permission-caller',wrongCaller),/VM caller/);
  for(const change of [{actor:'wallet'},{value:123},{records:null},{events:[{source:'<script>',topic:'x',data:[]}]},{events:[{source:contractIds.Registry,topic:'x',data:[256]}]},{booked:0}]) {
    const malformed=structuredClone(callerResult);Object.assign(malformed.calls[0],change);
    assert.throws(()=>grade('permission-caller',malformed),/invalid result/);
  }
  assert.match(grade('build-driver',{ok:false,phase:'compile',target:'data-driver'}),/data-driver didn’t compile/);
  for(const c of chapters.filter(c=>c.kind!=='code')) assert.throws(()=>grade(c.id,stateResult),/invalid result/,'reading and practice are not grading targets');
});

test('v3 stable chapter saves, optional answers, bounds and snapshot continuity',()=>{
  const fresh=restore(null);
  for(const raw of ['null','{}','[1]','not json','{"version":4}','x'.repeat((codeSteps.length+1)*48000+10001)]) assert.deepEqual(restore(raw),fresh);
  assert.equal(unlocked(fresh),0);
  const state=structuredClone(fresh);state.started=true;assert.equal(unlocked(state),step('state'));
  for(const c of chapters.filter(c=>c.kind==='practice')) {
    state.answers[c.id]=c.answer;
    const before=structuredClone(state.checks);markChecked(state,step(c.id));assert.deepEqual(state.checks,before);
  }
  for(const [index,i] of codeSteps.entries()) {
    state.source=`// draft at ${chapters[i].id}`;state.active=i;state.step=i;
    markChecked(state,i);assert.equal(unlocked(state),codeSteps[index+1]??chapters.length-1);
    assert.deepEqual(restore(serialize(state)),state);
  }
  assert.equal(state.checks.initial,'// draft at state');assert.equal(state.checks.change,'// draft at entrypoint');
  const raw=JSON.parse(serialize(state));assert.equal(raw.version,3);assert.equal(raw.step,'build-driver');assert.equal(raw.active,'build-driver');
  for(let i=0;i<chapters.length;i++) {
    state.step=i;
    const restored=restore(serialize(state));assert.deepEqual(restored,state,'every reading/practice/code/earned bookmark survives');
  }
  const escaped=starter+'\n// '+'\u0001'.repeat(7000);
  const largeSave={...state,source:escaped,checks:Object.fromEntries(Object.keys(state.checks).map(key=>[key,escaped]))};
  assert.deepEqual(restore(serialize(largeSave)),largeSave,'escaping must not discard valid-size snapshots');
  const incomplete=JSON.parse(serialize(fresh));incomplete.started=true;incomplete.step='building-learned';incomplete.active='build-driver';incomplete.checks.capacity=starter;
  assert.equal(restore(JSON.stringify(incomplete)).step,0);assert.equal(restore(JSON.stringify(incomplete)).active,step('state'));assert.equal(restore(JSON.stringify(incomplete)).checks.capacity,null);
  assert.equal(restore(JSON.stringify({...raw,step:2,active:2})).step,0,'v3 numbers are not interpreted as either curriculum');
  assert.equal(restore(JSON.stringify({...raw,source:'x'.repeat(8001)})).source,starter);
  assert.equal(restore(JSON.stringify({...raw,source:'é'.repeat(4001)})).source,starter,'source limits are UTF-8 bytes');
  assert.equal(restore(JSON.stringify({...raw,name:'<b>Mira</b>\u0000'})).name,'<b>Mira</b>');
  assert.equal(cleanName('M\u0000i\u2028r\u2029a'), 'Mira');
  assert.equal(cleanName('🧙'.repeat(21)), '🧙'.repeat(20));
  assert.equal(restore(JSON.stringify({...raw,name:'🧙'.repeat(21)})).name,cleanName('🧙'.repeat(21)));
  assert.deepEqual(restore(JSON.stringify({...raw,answers:{'contract-state':'invented','unknown':'value'}})).answers,{});
  const dangling=restore(JSON.stringify({...incomplete,checks:{'contract-state':starter},answers:{'contract-state':'value'}}));
  assert.equal(unlocked(dangling),step('state'));assert.equal(dangling.checks.initial,null,'practice never supplies a code snapshot');
});

test('all numeric v1/v2 bookmarks, drafts and earned checks migrate without replaying lessons',()=>{
  for(let oldStep=0;oldStep<oldIds.length;oldStep++) for(const checkedCurrent of [false,true]) {
    const done=oldChecks.filter(([i])=>checkedCurrent?i<=oldStep:i<oldStep);
    const old={version:2,step:oldStep,active:oldChecks.filter(([i])=>i<=oldStep).at(-1)?.[0]??1,started:oldStep>0,name:'Mira',source:`// unchanged draft ${oldStep}`,checks:Object.fromEntries(done.map(([i,key])=>[key,`// saved ${i}`]))};
    const restored=restore(JSON.stringify(old));
    assert.equal(chapters[restored.step].id,oldIds[oldStep]);assert.equal(chapters[restored.active].id,oldIds[old.active]);
    for(const key of ['started','name','source']) assert.equal(restored[key],old[key]);
    for(const [,key] of oldChecks) assert.equal(restored.checks[key],old.checks[key]??null);
    assert.deepEqual(restored.answers,{});assert.deepEqual(restore(serialize(restored)),restored);
    assert.equal(lessons.filter(l=>restored.checks[l.check]).length,lessons.filter(l=>old.checks[l.check]).length);
  }
  const legacy={version:1,step:3,started:true,name:'Mira',source:starter+'\n// keep my notes',checks:{initial:starter,change:starter}};
  const migrated=restore(JSON.stringify(legacy));
  assert.equal(migrated.version,3);assert.equal(chapters[migrated.step].id,'learned');assert.equal(chapters[migrated.active].id,'entrypoint');
  assert.equal(migrated.name,legacy.name);assert.equal(migrated.source,legacy.source);assert.equal(unlocked(migrated),step('arguments'));
  const inProgress=restore(JSON.stringify({...legacy,step:2,checks:{initial:starter,change:null}}));
  assert.equal(inProgress.active,step('entrypoint'));assert.equal(inProgress.step,step('entrypoint'));assert.equal(unlocked(inProgress),step('entrypoint'));
});

test('preview bookmarks survive without granting checks or weakening local progression',async()=>{
  const draft={...restore(null),started:true,step:chapters.length-1,active:codeSteps.at(-1),source:'// preview draft'};
  const raw=serialize(draft), preview=restore(raw,true), local=restore(raw);
  assert.deepEqual(preview,draft);assert.equal(unlocked(preview,true),chapters.length-1);
  assert.equal(local.step,0);assert.equal(local.active,codeSteps[0]);assert.equal(local.source,draft.source);
  assert.equal(unlocked(local),codeSteps[0]);assert.ok(Object.values(preview.checks).every(check=>check===null));
  const {courses,restoreCourse,serializeCourse,courseLimit,courseComplete}=await import('./courses.js');
  for(const id of ['dapps','circuits']) {
    const course=courses[id], fresh=restoreCourse(id,null);
    const draft={...fresh,started:true,step:course.chapters.length-1,active:course.chapters.findLastIndex(c=>c.kind==='code'),source:'// preview draft'};
    const raw=serializeCourse(course,draft), preview=restoreCourse(id,raw,true), local=restoreCourse(id,raw);
    assert.deepEqual(preview,draft);assert.equal(courseLimit(course,preview,true),draft.step);
    assert.equal(local.step,0);assert.equal(local.active,fresh.active);assert.equal(local.source,draft.source);
    assert.deepEqual(preview.checks,{});assert.equal(courseComplete(course,preview),false);
  }
  const dusk=restoreCourse('dusk',null);
  assert.equal(courseLimit(courses.dusk,dusk,true),0,'knowledge gates remain real on Pages');
  const knowledge=serializeCourse(courses.dusk,{...dusk,started:true,step:courses.dusk.chapters.length-1});
  assert.equal(restoreCourse('dusk',knowledge,true).step,0,'preview cannot skip knowledge checks');
});

test('simulator snapshots stay separate from native checks and survive shared-name restoration',()=>{
  const state=restore(null);state.started=true;
  const native=structuredClone(state.checks);
  markChecked(state,step('contract-state'),true);markChecked(state,step('groups'),true);
  assert.equal(state.simulated,undefined,'reading and practice may not record simulation');
  state.source='// simulator initialization';markChecked(state,step('state'),true);
  state.source='// simulator increment';markChecked(state,step('entrypoint'),true);
  assert.deepEqual(state.checks,native);assert.equal(unlocked(state),step('state'),'no native gate was passed');
  assert.deepEqual(state.simulated,{initial:'// simulator initialization',change:'// simulator increment'});
  const raw=JSON.parse(serialize(state));
  assert.deepEqual(restore(JSON.stringify(raw)),state);
  assert.deepEqual(restore(JSON.stringify(raw),true),{...state,active:step('entrypoint')});
  const merged=restore(JSON.stringify(raw));merged.name='Mira';
  assert.deepEqual(restore(serialize(merged)).simulated,state.simulated);
  assert.equal(restore(JSON.stringify({...raw,simulated:{change:'// dangling'}})).simulated,undefined);
  assert.deepEqual(restore(JSON.stringify({...raw,simulated:{initial:'// keep',change:'é'.repeat(4001),capacity:'// discard'}})).simulated,{initial:'// keep'});
  const escaped='// '+'\u0001'.repeat(7900);
  const full={...state,source:escaped,checks:Object.fromEntries(Object.keys(state.checks).map(k=>[k,escaped])),simulated:Object.fromEntries(Object.keys(state.checks).map(k=>[k,escaped]))};
  assert.deepEqual(restore(serialize(full)).simulated,full.simulated,'all bounded snapshots survive worst-case JSON escaping');
});

test('current shell reuses chapter/practice controls and retains opaque local artwork',()=>{
  const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const id of ['code','trace-results','chapter-menu','part-title','reading-panel','quiz','study-panels']) assert.ok(page.includes(`id="${id}"`));
  assert.match(page,/academy\/app.js/);assert.doesNotMatch(page,/Saved in this browser/);
  assert.doesNotMatch(page+'\n'+JSON.stringify(chapters),/\u2014/,'keep lesson copy free of em dashes');
  for(const [name,width,height] of [['workshop-pixel',768,512],['portrait-pixel',115,130]]) {
    assert.ok(page.includes(`academy/assets/${name}.webp`));
    const image=readFileSync(new URL(`./assets/${name}.webp`,import.meta.url));
    assert.equal(image.toString('ascii',8,16),'WEBPVP8L');
    const bits=image.readUInt32LE(21);
    assert.deepEqual([(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1],[width,height]);assert.equal((bits>>>28)&1,0);
  }
});
