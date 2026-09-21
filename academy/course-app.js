import {courses, courseKey, lastPathKey, exerciseSteps, partSteps, courseLimit, courseLesson, lessonComplete, explorerScenarios, restoreCourse, serializeCourse, assessCourse} from './courses.js';
import {storageKey, restore as restoreCharacter, serialize as serializeCharacter, cleanName} from './lesson.js';
import {highlight, syncScroll} from './editor.js';
import {browserRuntime, previewRecap} from './hosting.js';
import {executeDapp} from './dapp-sandbox.js';

const $ = selector => document.querySelector(selector);
const id = new URLSearchParams(location.search).get('path');
if (!Object.hasOwn(courses, id)) location.replace('./'+(browserRuntime?'?runtime=simulator':'')+'#paths');
else start();

function start() {
  const course=courses[id], chapters=course.chapters, browse=browserRuntime&&Boolean(course.language);
  let state, person, busy=false, ticket=0, controller=null, stopWorker=null, wallet=null, unsaved=false, nameDirty=false;
  try { state=restoreCourse(id,localStorage.getItem(courseKey(id)),browserRuntime); } catch { state=restoreCourse(id,null,browserRuntime); }
  try { person=restoreCharacter(localStorage.getItem(storageKey),browserRuntime); } catch { person=restoreCharacter(null,browserRuntime); }
  const effective=()=>({...state,checks:{...state.checks,...(browse?state.simulated:{})}});
  const credit=i=>state.checks[i]||(browse&&state.simulated?.[i]);
  const codeTasks=exerciseSteps(course).filter(i=>chapters[i].kind==='code');
  const availableTask=()=>codeTasks.filter(i=>i<=Math.max(codeTasks[0],courseLimit(course,effective()))).at(-1);
  if(browse)state.active=Math.min(state.active,availableTask());
  const limit=()=>courseLimit(course,state,browserRuntime);
  const current=()=>chapters[state.step];
  const active=()=>chapters[state.active];
  const workspace=()=>Boolean(course.language)&&!['intro','earned'].includes(current().kind);
  function save() {
    try {
      if(nameDirty) {
        // Name edits preserve valid bookmarks from either runtime, not just this page's mode.
        const saved=restoreCharacter(localStorage.getItem(storageKey),true); saved.name=person.name;
        localStorage.setItem(storageKey,serializeCharacter(saved)); nameDirty=false;
      }
      localStorage.setItem(courseKey(id),serializeCourse(course,state)); localStorage.setItem(lastPathKey,id); unsaved=false;
    }
    catch { unsaved=true; }
    $('#save-error').hidden=!unsaved;
  }
  function character() {
    document.querySelectorAll('.character-name').forEach(n=>n.textContent=person.name.trim()||'Apprentice');
    const lesson=courseLesson(course,state.step);
    document.querySelectorAll('.skill-name').forEach(n=>n.textContent=lesson.skill);
    $('#character-skill').textContent=lessonComplete(course,effective(),lesson)?lesson.skill+(browse&&!lessonComplete(course,state,lesson)?' · browser checked':' learned'):'Learning '+lesson.skill.toLowerCase();
    $('#skill-status').replaceChildren(...course.lessons.map(item=>{
      const complete=lessonComplete(course,effective(),item), first=chapters.findIndex(c=>c.id===item.start);
      const button=document.createElement('button'); button.type='button'; button.className='skill-button';
      button.disabled=first>limit();
      button.textContent=item.skill+' · '+(complete?(browse&&!lessonComplete(course,state,item)?'Browser checked':'Learned'):button.disabled?'Not yet available':'Available');
      button.onclick=()=>{$('#skills').close();go(complete?chapters.findIndex(c=>c.id===item.end):first);};
      return button;
    }));
  }
  function cancel() {
    ticket++; controller?.abort(); controller=null; stopWorker?.(); stopWorker=null; busy=false;
  }
  function clearResults(message='Run the code to see results.') {
    $('#trace-results').hidden=true; $('#artifact').hidden=true; $('#feedback').hidden=true;
    $('#test-empty').hidden=false; $('#test-empty').textContent=message;
  }
  function navigation() {
    const steps=partSteps(course,state.step);
    $('#part-title').textContent=`Part ${current().part+1} of ${course.parts.length} · ${course.parts[current().part]}`;
    $('#chapter-menu').replaceChildren(...chapters.map((chapter,i)=>{
      const option=document.createElement('option'); option.value=i; option.textContent=`${i+1}. ${chapter.short}`;
      option.disabled=i>limit(); return option;
    }));
    $('#chapter-menu').value=state.step; $('#chapter-menu').disabled=busy;
    $('#chapters').style.setProperty('--chapters',steps.length);
    $('#chapters').replaceChildren(...steps.map(i=>{
      const chapter=chapters[i];
      const button=document.createElement('button'), number=document.createElement('span'), label=document.createElement('span');
      number.className='chapter-index'; number.textContent=String(i+1).padStart(2,'0'); label.textContent=chapter.short;
      button.type='button'; button.dataset.step=i; button.append(number,label);
      button.disabled=i>limit()||busy;
      if(i===state.step) button.setAttribute('aria-current','step');
      button.onclick=()=>go(i); return button;
    }));
    const checked=current().kind==='code'?(state.checks[state.active]===state.source||browse&&state.simulated?.[state.active]===state.source):credit(state.step)===current().answer&&state.answers[state.step]===current().answer;
    $('#previous').hidden=state.step===0; $('#previous').disabled=busy;
    $('#page-count').textContent=`${state.step+1} / ${chapters.length}`;
    $('#next').hidden=state.step===chapters.length-1; $('#all-paths').hidden=!$('#next').hidden;
    $('#next').disabled=busy||(['quiz','code'].includes(current().kind)&&!checked);
    $('#next').textContent=current().kind==='intro'?'Begin lesson →':current().kind==='earned'?'Next lesson →':chapters[state.step+1]?.kind==='earned'?'Finish lesson →':'Continue →';
    $('#run').disabled=false;
    $('#run').textContent=busy?'Cancel run':id==='circuits'?'▶ Prove and verify':browse?'▶ Run offline app':'▶ Run app';
    $('#code').setAttribute('aria-busy',String(busy));
  }
  function render(focus) {
    const c=current(), coding=c.kind==='code', quiz=['quiz','practice'].includes(c.kind), guide=c.kind==='guide', earned=c.kind==='earned';
    $('#lesson').hidden=false; $('#lesson').dataset.step=state.step;
    $('#course-name').textContent=course.title; $('#chapter-label').textContent=earned?'Lesson complete':`Chapter ${state.step+1} · ${courseLesson(course,state.step).title}`;
    $('#lesson-title').textContent=c.title; $('#story-copy').innerHTML=c.body;
    $('.task').hidden=!c.task; $('#task-copy').textContent=c.task||'';
    $('#lesson-note').hidden=!c.note; $('#lesson-note').textContent=c.note||'';
    $('#hint').hidden=!c.hint; $('#hint').open=false; $('#hint-copy').textContent=c.hint||'';
    $('#scene').hidden=coding||quiz||guide; $('#editor').hidden=!workspace(); $('#quiz-panel').hidden=!quiz;
    (workspace()?$('#study-panels'):$('#lesson')).append($('#reading-panel'),$('#quiz-panel'));
    $('#reading-panel').hidden=!guide; $('#reading-title').textContent=c.panelTitle||''; $('#reading-copy').innerHTML=c.panel||'';
    $('#practice-note').hidden=c.kind!=='practice';
    $('#character-card').hidden=!coding&&!quiz&&!guide; $('#character-setup').hidden=earned; $('#earned').hidden=!earned;
    if(browse&&earned) {
      if(!lessonComplete(course,effective(),courseLesson(course,state.step)))previewRecap(courseLesson(course,state.step).skill);
      else if(!lessonComplete(course,state,courseLesson(course,state.step)))$('#chapter-label').textContent='Lesson checked in the browser runtime';
    }
    $('#character-name-input').value=person.name;
    $('#code-context').hidden=!workspace()||(coding&&state.active===state.step);
    $('#code-context').textContent=coding?`You’re reviewing an earlier chapter. Code and tests are still on “${active()?.short||''}”.`:`Code and tests: “${active()?.short||''}”. Keep the same file as you work through the explanations.`;
    $('#code').value=state.source; $('#code').scrollTop=$('#code').scrollLeft=0; highlight(); clearResults();
    $('#quiz-feedback').hidden=true; $('#wallet-demo').hidden=browserRuntime||!c.wallet;
    if(quiz) {
      $('#question').textContent=c.question;
      $('#choices').replaceChildren(...c.choices.map(([value,text])=>{
        const label=document.createElement('label'), input=document.createElement('input'), copy=document.createElement('span');
        input.type='radio'; input.name='answer'; input.value=value; input.required=true; input.checked=state.answers[state.step]===value; copy.textContent=text;
        input.onchange=()=>{state.answers[state.step]=value; $('#quiz-feedback').hidden=true; navigation(); save();};
        label.append(input,copy); return label;
      }));
    }
    character(); navigation(); document.title=c.short+' | Dusk Academy';
    if(focus) { $('#lesson-title').focus({preventScroll:true}); $('#lesson-title').scrollIntoView({block:'nearest'}); }
  }
  function go(step,focus=true) {
    if(!Number.isInteger(step)||step<0||step>limit()) return;
    cancel(); state.step=step;
    if(browse&&step>0) state.started=true;
    if(current().kind==='code'&&(!browse||step<=availableTask())) state.active=Math.max(state.active,step);
    history.replaceState(null,'','#'+current().id); render(focus); save();
  }
  function feedback(message,tone) {
    $('#feedback').hidden=false; $('#feedback').dataset.tone=tone; $('#feedback-text').textContent=message;
  }
  function results(result) {
    const explorer=id==='dapps'&&explorerScenarios.includes(active().scenario);
    const headers=explorer?['Record ID','Read result','Decoded fields']:id==='circuits'?['Test witnesses','Proof result','Public inputs']:['Register','Stored count','Prepared argument'];
    const records=explorer?result.records.map(row=>active().scenario==='explorer-recovery'?row.record?.record:row.record):[];
    const rows=explorer?result.records.map((row,i)=>{
      const record=records[i], status=active().scenario==='explorer-recovery'?row.record?.status:record===null?'missing':'found';
      return [row.id+(row.offline?' · unavailable endpoint':''),status,record?`${record.seats} seats${record.confirmed!==undefined?' · Confirmed: '+record.confirmed:''}`:'No decoded data'];
    }):id==='circuits'?result.cases.map(c=>[`${c.a} + ${c.b} = ${c.total}`,c.proverRejected?'Prover rejected witness':c.verified?'Proof verified':'Verification failed',c.proverRejected?'No proof':String(c.publicCount)]):result.counts.map((count,i)=>[`Local register ${i+1}`,String(count),result.writes[i]?`register(${result.writes[i].amount}) · 8 bytes`:'Not prepared']);
    const head=document.createElement('tr');
    headers.forEach(text=>{const th=document.createElement('th'); th.scope='col'; th.textContent=text; head.append(th);});
    $('#trace-results').dataset.kind=explorer?'registry':id;
    $('#trace-results thead').replaceChildren(head);
    $('#trace-results tbody').replaceChildren(...rows.map((values,i)=>{
      const row=document.createElement('tr');
      if(id==='circuits') row.dataset.status=result.cases[i].verified?'accepted':'rejected';
      values.forEach((text,i)=>{const cell=document.createElement(i===0?'th':'td'); if(i===0) cell.scope='row'; cell.textContent=String(text).slice(0,150); row.append(cell);});
      if(typeof records[i]?.owner==='string') {
        const details=document.createElement('details'), summary=document.createElement('summary'), owner=document.createElement('pre');
        summary.textContent='Owner contract'; owner.textContent=records[i].owner.slice(0,150);
        details.append(summary,owner); row.lastChild.append(details);
      }
      return row;
    }));
    $('#test-empty').hidden=true; $('#trace-results').hidden=false;
    if(id==='circuits') { $('#artifact').hidden=false; $('#artifact').open=false; $('#proof-bytes').textContent=result.proof; }
  }
  async function execute(payload,signal) {
    if(browse&&id==='dapps')return executeDapp(payload,signal);
    const script=new URL(id==='circuits'?'./circuit-worker.js':'./dapp-worker.js',import.meta.url);
    const response=await fetch(script,{signal});
    if(!response.ok||!browse&&!response.headers.get('Content-Security-Policy')?.startsWith("default-src 'none'; script-src 'self' blob: 'wasm-unsafe-eval'; worker-src 'none'; connect-src ")) throw Error('The isolated worker is unavailable. Open this lesson through npm run dev.');
    signal.throwIfAborted();
    return new Promise((resolve,reject)=>{
      const worker=new Worker(script,{type:'module'}); let finished=false;
      const timeout=setTimeout(()=>finish(Error('The exercise took too long. Check for a loop and run again.')),15000);
      function finish(error,result) {
        if(finished) return; finished=true; clearTimeout(timeout); worker.terminate(); stopWorker=null;
        error?reject(error):resolve(result);
      }
      stopWorker=()=>finish(new DOMException('Run cancelled.','AbortError'));
      worker.onmessage=({data})=>finish(data?.error?Error(String(data.error).slice(0,3000)):null,data?.result);
      worker.onerror=event=>finish(Error(event.message||'The worker stopped. Check your code.'));
      worker.postMessage(payload,payload instanceof ArrayBuffer?[payload]:[]);
    });
  }
  async function run() {
    if(busy) { cancel(); clearResults('Run cancelled.'); navigation(); return; }
    if(!workspace()) return;
    cancel(); const runTicket=ticket, source=state.source, step=state.active, c=active();
    const abort=new AbortController(); controller=abort;
    const timeout=setTimeout(()=>{abort.abort();stopWorker?.();},45000);
    busy=true; clearResults(id==='circuits'?(browse?'Interpreting gates and producing real proofs…':'Compiling your circuit…'):'Running the Connect client…'); navigation();
    try {
      if(new TextEncoder().encode(source).length>8000) throw Error('The source limit is 8,000 UTF-8 bytes. Shorten the file and run again.');
      let payload={source,scenario:c.scenario};
      if(id==='circuits'&&browse) {
        const response=await fetch(new URL('./vendor/circuit-program.wasm',import.meta.url),{signal:abort.signal});
        if(!response.ok)throw Error('The bundled circuit engine is unavailable. Reload the page.');
        payload={source,bytes:await response.arrayBuffer()};
      } else if(id==='circuits') {
        const response=await fetch('/api/circuit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source}),signal:abort.signal});
        if(!response.ok) throw Error((await response.json().catch(()=>({}))).error||'The circuit compiler is unavailable. Run npm run setup:circuits, then npm run dev.');
        payload=await response.arrayBuffer();
        if(payload.byteLength>2*1024*1024) throw Error('The compiled circuit exceeds the lesson limit.');
      }
      if(runTicket!==ticket) return;
      const result=await execute(payload,abort.signal);
      if(runTicket!==ticket) return;
      const error=assessCourse(id,c.scenario,result); results(result);
      if(error) feedback(error,'bad');
      else {
        const checks=browse?(state.simulated??={}):state.checks;
        for(const i of exerciseSteps(course)) if(i<=step&&chapters[i].kind==='code'&&(!checks[i]||i===step)) checks[i]=source;
        feedback((browse?(id==='circuits'?'Real PLONK proofs from interpreted gates. ':'Offline fixture checks passed. '):'')+(id==='circuits'?(c.scenario==='public'?'Valid sums verified with one public input. Changing the public total failed verification.':'Valid sums verified. The wrong sum was rejected.'):explorerScenarios.includes(c.scenario)?(c.scenario==='explorer-recovery'?'Registry reads distinguish found, missing and unavailable. The working retry recovered. Original counter checks still pass.':c.scenario==='explorer-precision'?'Large record IDs stayed exact and invalid IDs were rejected before a request. Original counter checks still pass.':'Registry fields were read through the matching driver in local DuskVM. Original counter checks still pass.'):(c.scenario==='prepare'?'Both registration arguments were encoded correctly. Nothing was signed or sent.':'Both register counts were read from local DuskVM.')).replaceAll('local DuskVM',browse?'the simulated transport':'local DuskVM'),'good');
        character(); save();
      }
    } catch(error) {
      if(runTicket===ticket) { $('#test-empty').textContent='No results.'; feedback(error.name==='AbortError'?'The run timed out. Check the local server and try again.':error.message,'bad'); }
    } finally {
      clearTimeout(timeout);
      if(runTicket===ticket) { busy=false; controller=null; navigation(); $('#feedback').scrollIntoView({block:'nearest'}); }
    }
  }
  $('#quiz').onsubmit=event=>{
    event.preventDefault(); if(!['quiz','practice'].includes(current().kind)) return;
    const correct=state.answers[state.step]===current().answer;
    if(correct&&current().kind==='quiz') (browse?(state.simulated??={}):state.checks)[state.step]=current().answer;
    $('#quiz-feedback').hidden=false; $('#quiz-feedback').dataset.tone=correct?'good':'bad';
    $('#quiz-feedback').textContent=correct?(current().success||'Correct.'):current().error;
    character(); navigation(); save(); $('#quiz-feedback').scrollIntoView({block:'nearest'});
  };
  $('#code').oninput=()=>{cancel();state.source=$('#code').value;highlight();clearResults('Run again to check your changes.');navigation();save();};
  $('#code').onscroll=syncScroll;
  $('#code').onkeydown=event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();run();}};
  $('#run').onclick=run;
  $('#next').onclick=()=>{if($('#next').hidden||$('#next').disabled)return;state.started=true;go(state.step+1);};
  $('#previous').onclick=()=>go(state.step-1);
  $('#chapter-menu').onchange=event=>go(Number(event.target.value),false);
  $('#character-name-input').oninput=event=>{
    person.name=cleanName(event.target.value); event.target.value=person.name; character();
    nameDirty=true; save();
  };
  $('#skills-button').onclick=()=>$('#skills').showModal(); $('#about-button').onclick=()=>$('#about').showModal();
  $('.skip-link').onclick=event=>{event.preventDefault();$('#lesson-title').focus();};
  $('#find-wallet').onclick=async()=>{
    if(browserRuntime) return;
    $('#find-wallet').disabled=true; $('#wallet-picker').hidden=true; $('#wallet-status').textContent='Looking for installed Dusk wallets…';
    try {
      const {createDuskWallet}=await import('./vendor/dusk-connect.js');
      wallet?.destroy(); wallet=createDuskWallet({waitForProvider:false,rememberLastUsedProvider:false}); await wallet.ready();
      const providers=await wallet.discoverProviders();
      $('#wallet-provider').replaceChildren(...providers.map(p=>{const option=document.createElement('option');option.value=p.uuid;option.textContent=p.name;return option;}));
      $('#wallet-picker').hidden=providers.length===0;
      $('#wallet-status').textContent=providers.length?'Choose the wallet you installed. Wallet names are self-reported.':'No Dusk wallet found. Install or unlock Dusk Wallet, refresh this page, then try again. You can finish the lesson without it.';
    } catch(error) { $('#wallet-status').textContent=String(error.message||error); }
    finally { $('#find-wallet').disabled=false; }
  };
  $('#connect-wallet').onclick=async()=>{
    if(browserRuntime) return;
    $('#connect-wallet').disabled=true; $('#find-wallet').disabled=true;
    try {
      await wallet.selectProvider($('#wallet-provider').value);
      const profiles=await wallet.connect();
      $('#wallet-status').textContent=profiles.length?`Wallet approved ${profiles.length} profile${profiles.length===1?'':'s'}. No transaction was requested.`:'No profiles were approved. No transaction was requested.';
    } catch(error) { $('#wallet-status').textContent='Connection not completed. '+String(error.message||error); }
    finally { $('#connect-wallet').disabled=false; $('#find-wallet').disabled=false; }
  };
  $('#filename').textContent=id==='circuits'?'circuit.rs':'app.js'; $('#runtime').textContent=id==='circuits'?'dusk-plonk 0.22.1':'Dusk Connect';
  $('#results-runtime').textContent=id==='circuits'?(browse?'Interpreted gates · real PLONK':'PLONK · browser WASM'):(browse?'Real Connect · simulated reads':'Connect · local DuskVM');
  $('#skill-path').textContent=course.title;
  $('#about-copy').textContent=id==='dusk'?'These are knowledge checks, not credential verification or legal advice. See academy/README.md for the source references.':id==='dapps'?'The locally bundled Connect SDK reads fixed counter and registration fixtures through a read-only adapter. Matching Forge data-drivers translate their method ABIs. An additional endpoint deliberately returns HTTP 503 for recovery practice. Editable code runs in a disposable worker with restricted networking and no injected wallet. Optional wallet discovery runs separately and never sends a transaction.':'The local compiler uses pinned dusk-plonk dependencies and compiles only WASM in a sandbox. A disposable browser worker generates fresh demonstration parameters, proves test cases and verifies them. The pinned prover may reject an invalid witness before producing a proof. Ordinary Rust errors and timeouts do not pass. No proof is submitted to a contract.';
  if(browse) {
    $('#code-note').textContent=id==='circuits'?'Rust subset · no compilation':'Isolated JS · no external network';
    $('#about-copy').textContent=id==='circuits'?'The browser interprets the edited circuit builder into gate instructions. A prebuilt dusk-plonk engine creates fresh demonstration parameters, real proofs and verification results from those gates. No edited Rust is compiled; this is not a production ceremony or a deployed verifier.':'Your actual JavaScript and the bundled Connect SDK run in an opaque, CSP-restricted disposable worker. Generated data-drivers encode/decode real ABI bytes; reads come from simulated, read-only fixtures. No RPC, injected wallet, signing, network access or page storage is available to the learner program.';
  }
  window.addEventListener('hashchange',()=>{
    const step=chapters.findIndex(c=>'#'+c.id===location.hash); go(step>=0&&step<=limit()?step:state.step);
  });
  window.addEventListener('pagehide',()=>{cancel();wallet?.destroy();});
  window.addEventListener('beforeunload',event=>{if(unsaved){event.preventDefault();event.returnValue='';}});
  const initial=chapters.findIndex(c=>'#'+c.id===location.hash);
  go(initial>=0&&initial<=limit()?initial:state.step,false);
}
