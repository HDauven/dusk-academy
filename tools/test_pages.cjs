// Static-host integration: all coding paths, real workers/proofs, no execution server.
const assert=require('node:assert/strict');
const {readFile,mkdtemp,symlink,rm}=require('node:fs/promises');
const {execFileSync,spawn}=require('node:child_process');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
(async()=>{
  const {chapters,partSteps,storageKey,starter}=await import('../academy/lesson.js');
  const {courses,courseKey,exerciseSteps}=await import('../academy/courses.js');
  const {explorerSources}=await import('./dapp-sources.mjs');
  const root=path.resolve(__dirname,'..'),pages='https://hdauven.github.io/dusk-academy/';
  const widths=[320,360,390,440,600,768,900,901,1100,1280,1440];
  const sources=JSON.parse(execFileSync('python3',['-B','-c','import json; from build_browser import lesson_sources; print(json.dumps(lesson_sources()))'],{cwd:root,env:{...process.env,PYTHONPATH:path.join(root,'tools')},encoding:'utf8'}));
  const web=await mkdtemp(path.join(tmpdir(),'academy-static-'));
  await symlink(root,path.join(web,'dusk-academy'));
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1','--directory',web],{stdio:['ignore','pipe','ignore']});
  let browser,layouts=0,audits=0,workerCount=0;const unexpected=[],errors=[];
  try {
    const port=await new Promise((resolve,reject)=>{
      server.stdout.once('data',data=>{const match=String(data).match(/port (\d+)/);match?resolve(match[1]):reject(Error(String(data)));});
      server.once('error',reject);server.once('exit',code=>reject(Error('Static server exited: '+code)));
    });
    const base=`http://127.0.0.1:${port}/dusk-academy/`,loopback=`http://localhost:${port}/dusk-academy/`;
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:1440,height:950}});
    await context.route('**/*',async route=>{
      const url=route.request().url();if(url.startsWith('blob:'))return route.continue();
      const prefix=[base,loopback,pages].find(p=>url.startsWith(p));
      if(!prefix||route.request().method()!=='GET'||/\/(api|on)\//.test(url)){unexpected.push(url);return route.abort();}
      const relative=new URL(url).pathname.slice(new URL(prefix).pathname.length)||'index.html',file=path.resolve(root,decodeURIComponent(relative));
      if(!file.startsWith(root+path.sep)){unexpected.push(url);return route.abort();}
      // A cached pre-browser helper ignores the new simulated flag and writes native credit.
      // New entrypoints must request a different module URL, not reuse that old writer.
      if(relative==='academy/lesson.js'&&new URL(url).search!=='?v=static-1'){return route.fulfill({contentType:'text/javascript',body:`import {chapters} from './lesson.js?v=static-1'; export * from './lesson.js?v=static-1'; export function markChecked(state,step){state.checks[chapters[step].check]=state.source;}`});}
      if(prefix!==pages)return route.continue(); // All main-path assets come from real static HTTP.
      try{const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.webp':'image/webp','.woff2':'font/woff2'};await route.fulfill({body:await readFile(file),contentType:types[path.extname(file)]||'text/plain'});}
      catch(error){errors.push(relative+': '+error.message);await route.abort();}
    });
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('worker',()=>workerCount++);
    const saved=key=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    const waitStep=i=>page.waitForFunction(i=>document.querySelector('#lesson').dataset.step===String(i),i);
    const choose=async i=>{await page.locator('#chapter-menu').selectOption(String(i));await waitStep(i);};
    const run=async tone=>{await page.locator('#run').click();await page.locator('#feedback').waitFor({timeout:30000});await page.waitForFunction(()=>document.querySelector('#code').getAttribute('aria-busy')==='false');assert.equal(await page.locator('#feedback').getAttribute('data-tone'),tone,await page.locator('#feedback').innerText());};
    const layout=async label=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label);layouts++;};
    const axe=async label=>{const result=await new AxeBuilder({page}).analyze();assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],label);audits++;};
    await page.goto(base);await page.locator('#hosting-note').waitFor();assert.match(await page.locator('#hosting-note').innerText(),/Every coding path runs here without a backend/);
    assert.equal(await saved(storageKey),null);await page.evaluate(()=>localStorage.setItem('unrelated-progress','keep'));
    assert.deepEqual(await page.locator('#dusk-size, #contracts-size, #dapps-size, #circuits-size').allTextContents(),['1 lesson · 15 chapters','7 lessons · 83 chapters','2 lessons · 23 chapters','1 lesson · 12 chapters']);
    assert.equal(await page.locator('#resume-path').isVisible(),false);assert.equal(await page.locator('#open-contracts').innerText(),'Open path →');
    await page.locator('.skip-link').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'paths-title');
    for(const width of [320,1440]){await page.setViewportSize({width,height:950});await layout('overview');await axe('overview');}
    // A legacy preview bookmark may browse ahead, but must not move the active ABI.
    await page.goto(base+'#build-driver');await waitStep(chapters.findIndex(c=>c.id==='build-driver'));
    assert.equal(await page.locator('#code').inputValue(),starter);assert.match(await page.locator('#code-context').innerText(),/Initial state/);
    await choose(0);let draft=starter;
    await page.locator('#character-name-input').fill('<b>Mira</b>');assert.equal(await page.locator('.scene-caption strong').innerText(),'<b>Mira</b>');assert.equal(await page.locator('.scene-caption b').count(),0);
    await page.locator('#character-name-input').fill('Mira');
    assert.equal(await page.evaluate(()=>!dispatchEvent(new Event('beforeunload',{cancelable:true}))),false,'successful saves are silent');
    for(const [i,c]of chapters.entries()){
      await waitStep(i);assert.equal(await page.locator('#code').inputValue(),draft,c.id+' keeps the draft');
      assert.equal(await page.locator('#chapters button').count(),partSteps(i).length);
      assert.equal(await page.locator('#editor').isVisible(),!['intro','earned'].includes(c.kind));
      assert.equal(await page.locator('#reading-panel').isVisible(),c.kind==='guide');
      if(c.kind==='code'){
        const before=(await saved(storageKey)).simulated;
        const answer=sources[c.check==='initial'?'initial':c.scenario];assert.ok(answer,c.id);
        await page.locator('#code').fill(answer.replace('count: 0','count: 7'));await run('bad');
        assert.deepEqual((await saved(storageKey)).simulated,before,'wrong initialization cannot award '+c.id);
        if(c.check==='change'){
          for(const bad of ['self.count += 2;','self.count += "one";','loop {}']){await page.locator('#code').fill(answer.replace('self.count += 1;',bad));await run('bad');assert.equal(await page.locator('#next').isDisabled(),true);}
          await page.locator('#code').fill(answer.replace('self.count += 1;','self.count = self.count + 1;'));await run('good');
        }
        draft=answer;await page.locator('#code').fill(draft);
        if(c.check==='change'){await page.locator('#code').press('Control+Enter');await page.locator('#feedback[data-tone=good]').waitFor();}else await run('good');
        const state=await saved(storageKey);assert.ok(Object.values(state.checks).every(v=>!v),'cached native helpers must not award native credit');assert.equal(state.simulated?.[c.check],draft);
        if(['record-cancel','permission-resize','test-atomic','build-driver'].includes(c.id))await axe(c.id+' results');
        if(c.id==='build-driver'){
          assert.match(await page.locator('#build-detail').textContent(),/Interpreted source \(not WASM\).*Prebuilt reference data-driver/s);
          assert.match(await page.locator('#feedback').innerText(),/without Rust compilation/);
          assert.doesNotMatch(await page.locator('#story-copy').innerText(),/compile both targets|newly built driver/);
        }
      }
      if(c.choices){const before=(await saved(storageKey)).simulated;
        await page.locator(`input[value="${c.choices.find(([v])=>v!==c.answer)[0]}"]`).check();await page.locator('#quiz button').click();assert.equal(await page.locator('#quiz-feedback').getAttribute('data-tone'),'bad');assert.equal(await page.locator('#next').isDisabled(),false);
        await page.locator(`input[value="${c.answer}"]`).check();await page.locator('#quiz button').click();assert.deepEqual((await saved(storageKey)).simulated,before,'practice never awards code');}
      if(['contract-trace','argument-interface','rule-rollback','record-lifetime','permission-guard','call-coordination','build-artifacts'].includes(c.id)){
        const before=await saved(storageKey);await run('good');assert.deepEqual((await saved(storageKey)).simulated,before.simulated,'guides run the active checkpoint without new credit');
      }
      if(c.kind==='earned'){assert.equal(await page.locator('#earned').isVisible(),true);assert.match(await page.locator('#earned-label').innerText(),/simulator/i);}
      for(const width of widths){await page.setViewportSize({width,height:950});await layout('contracts/'+c.id);if([390,1440].includes(width))await axe('contracts/'+c.id);}
      if(i<chapters.length-1){assert.equal(await page.locator('#next').isDisabled(),false,c.id);await page.locator('#next').click();}
    }
    let contractSave=await saved(storageKey);assert.equal(Object.keys(contractSave.simulated).length,22);
    await page.locator('#chapter-menu').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await waitStep(chapters.length-2);assert.equal(await page.evaluate(()=>document.activeElement.id),'chapter-menu');await choose(chapters.length-1);
    for(const button of ['skills-button','about-button']){await page.locator('#'+button).click();await axe('contracts/'+button);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),button);}
    await page.reload();await waitStep(chapters.length-1);assert.deepEqual(await saved(storageKey),contractSave);
    await choose(chapters.findIndex(c=>c.id==='contract-getter'));assert.equal(await page.locator('#code').inputValue(),draft);assert.match(await page.locator('#code-context').innerText(),/Build and verify/);await run('good');
    assert.equal((await saved(storageKey)).simulated.initial,contractSave.simulated.initial,'review preserves the initial historical source');
    await page.locator('.brand').click();await page.locator('#paths').waitFor();assert.match(await page.locator('#contracts-progress').innerText(),/7 of 7.*simulated/);contractSave=await saved(storageKey);
    const finalSources={};
    for(const [id,course]of Object.entries(courses)){
      await page.goto(base+`course.html?path=${id}#begin`);await waitStep(0);let source=course.starter||'',explorer;
      if(id==='dusk'){await page.locator('#character-name-input').fill('Mira');assert.deepEqual(await saved(storageKey),{...contractSave,name:'Mira'});}
      if(id==='dapps'){
        await choose(course.chapters.findIndex(c=>c.id==='wallet'));await page.locator('input[value="approval"]').check();await page.locator('#quiz button').click();
        assert.match(await page.locator('#character-skill').innerText(),/^Learning /,'answering an early wallet quiz does not earn a coding skill');
        await choose(course.chapters.findIndex(c=>c.id==='learned'));assert.equal(await page.locator('#earned').isVisible(),false);
        await page.reload();await choose(0);
      }
      for(const [i,c]of course.chapters.entries()){
        await waitStep(i);if(course.language)assert.equal(await page.locator('#code').inputValue(),source,id+'/'+c.id+' keeps source');
        if(c.kind==='code'){
          await run('bad');
          if(id==='dapps'){
            if(c.id==='read')source=source.replace('return 0;','return dusk.readContract({contract:"registry",functionName:"get_count"});');
            else if(c.id==='prepare')source=source.replace('return null;','return dusk.prepareContractCall({contract:"registry",functionName:"register",args:amount,privacy:"public",amount:"0",deposit:"0"});');
            else{explorer??=explorerSources(source);source=explorer[c.id];}
          }else source=c.id==='constraint'?source.replace('// Bind sum to total.','composer.assert_equal(total, sum);'):source.replace('append_witness(self.total)','append_public(self.total)');
          await page.locator('#code').fill(source);await run('good');
          const state=await saved(courseKey(id));assert.equal(state.simulated[c.id],source);assert.deepEqual(state.checks,{});
          if(c.id==='prepare'){
            const future=course.chapters.findIndex(c=>c.id==='explorer-read');await choose(future);await page.reload();await waitStep(future);
            assert.match(await page.locator('#code-context').innerText(),/Prepare a call/,'an unchecked wallet quiz must not become the active code task');await choose(i);
          }
          if(c.id==='explorer-recovery'){
            assert.deepEqual(await page.locator('#trace-results tbody tr td:nth-child(2)').allTextContents(),['found','found','missing','found','missing','missing','unavailable','found']);
            await page.locator('#trace-results details summary').first().click();assert.equal(await page.locator('#trace-results details pre').first().innerText(),'22'.repeat(32));
            for(const bad of [source.replace('JSON.rawJSON(id)','Number(id)'),source.replace('if (seats === null) return null;','if (seats === null) return {id,seats:0};'),source.replace('return { id, seats, owner, confirmed };','return { id, seats, owner, confirmed: confirmed || null };'),source.replace('return { status: "unavailable" };','return { status: "missing" };')]){
              await page.locator('#code').fill(bad);await run('bad');assert.equal(await page.locator('#next').isDisabled(),true);
            }
            await page.locator('#code').fill(source.replace('return dusk.readContract','return await dusk.readContract'));await run('good');await page.locator('#code').fill(source);await run('good');
          }
          if(c.id==='public'){assert.match(await page.locator('#proof-bytes').textContent(),/^[a-f0-9]{2016}$/);assert.match(await page.locator('#results-runtime').innerText(),/real PLONK/);}
          await axe(id+'/'+c.id+' results');
        }
        if(c.choices){
          const before=await saved(courseKey(id));if(c.kind==='quiz')assert.equal(await page.locator('#next').isDisabled(),true);
          await page.locator(`input[value="${c.choices.find(([v])=>v!==c.answer)[0]}"]`).check();await page.locator('#quiz button').click();assert.equal(await page.locator('#quiz-feedback').getAttribute('data-tone'),'bad');
          await page.locator(`input[value="${c.answer}"]`).check();await page.locator('#quiz button').click();
          if(c.kind==='practice'){assert.deepEqual((await saved(courseKey(id))).checks,before.checks);assert.deepEqual((await saved(courseKey(id))).simulated,before.simulated);}
          assert.equal(await page.locator('#wallet-demo, #find-wallet, #connect-wallet').count(),0,'wallet controls are not shipped');
        }
        if(c.kind==='earned'){assert.equal(await page.locator('#earned').isVisible(),true);if(course.language)assert.match(await page.locator('#chapter-label').innerText(),/checked in the browser runtime/i);}
        for(const width of widths){await page.setViewportSize({width,height:950});await layout(id+'/'+c.id);if([390,1440].includes(width))await axe(id+'/'+c.id);}
        if(i<course.chapters.length-1){assert.equal(await page.locator('#next').isDisabled(),false,id+'/'+c.id);await page.locator('#next').click();}
      }
      finalSources[id]=source;const state=await saved(courseKey(id));await page.reload();await waitStep(course.chapters.length-1);assert.deepEqual(await saved(courseKey(id)),state);
      await page.locator('#chapter-menu').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await waitStep(course.chapters.length-2);assert.equal(await page.evaluate(()=>document.activeElement.id),'chapter-menu');
      await choose(course.chapters.length-1);assert.equal(await page.locator('#next').isVisible(),false);assert.equal(await page.locator('#previous').isVisible(),true);
      for(const button of ['skills-button','about-button']){await page.locator('#'+button).click();await axe(id+'/'+button);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),button);}
      if(course.language){await choose(course.chapters.findIndex(c=>c.kind==='guide'));await run('good');assert.deepEqual((await saved(courseKey(id))).simulated,state.simulated);await choose(course.chapters.length-1);}
      assert.equal(Object.keys(course.language?state.simulated:state.checks).length,exerciseSteps(course).length);
      await page.locator('#all-paths').click();await page.waitForFunction(()=>document.querySelector('#open-dapps')?.href.includes('#'));
      assert.match(await page.locator('#open-'+id).innerText(),/Review/);
    }
    // Execute probes inside the actual learner sandbox, not a mocked CSP header.
    await page.goto(base+'course.html?path=dapps#explorer-recovery');await waitStep(courses.dapps.chapters.findIndex(c=>c.id==='explorer-recovery'));
    const beforeSandbox=await saved(courseKey('dapps'));
    const probe=`
if(typeof document!=="undefined"||typeof localStorage!=="undefined"||typeof Worker!=="undefined"||typeof SharedWorker!=="undefined"||globalThis.location.origin!=="null")throw Error("Isolation failure");
let storageDenied=false;try{indexedDB.open("not-allowed");}catch{storageDenied=true;}if(!storageDenied)throw Error("Persistent storage available");
let blocked=false;try{await WorkerGlobalScope.prototype.fetch.call(globalThis,"https://example.invalid/exfiltration");}catch{blocked=true;}if(!blocked)throw Error("Native fetch escaped CSP");
let codeBlocked=false;try{Function("return 1")();}catch{codeBlocked=true;}if(!codeBlocked)throw Error("eval escaped CSP");
`;
    await page.locator('#code').fill(probe+finalSources.dapps);await run('good');assert.equal(await page.locator('iframe').count(),0,'frames and workers are disposed after results');
    await page.locator('#code').fill('while(true) {}\n'+finalSources.dapps);await page.locator('#run').click();await page.waitForTimeout(400);await page.locator('#run').click();assert.match(await page.locator('#test-empty').innerText(),/cancelled/i);assert.equal(await page.locator('iframe').count(),0);
    for(let i=0;i<100&&page.workers().length;i++)await page.waitForTimeout(20);
    assert.equal(page.workers().length,0,'removing the opaque frame must terminate its spinning worker');
    assert.equal((await saved(courseKey('dapps'))).simulated.read,beforeSandbox.simulated.read);
    await page.locator('#code').fill(finalSources.dapps);await run('good');
    // Knowledge and unrelated storage remain real and independent.
    assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-progress')),'keep');assert.equal(Object.keys((await saved(courseKey('dusk'))).checks).length,3);
    // Plain localhost and a Pages subpath use the same runtime, without a query switch.
    await page.goto(loopback+'#entrypoint');await waitStep(chapters.findIndex(c=>c.id==='entrypoint'));
    // Browsing ahead retains the initial task until it has been checked.
    await page.locator('#code').fill(sources.state);await run('good');await choose(chapters.findIndex(c=>c.id==='entrypoint'));await run('good');
    const localSave=await saved(storageKey);await page.goto(loopback+'course.html?path=dusk#begin');await waitStep(0);await page.locator('#character-name-input').fill('Nora');assert.deepEqual(await saved(storageKey),{...localSave,name:'Nora'});
    await page.goto(loopback+'?runtime=native#state');await waitStep(chapters.findIndex(c=>c.id==='state'));assert.match(await page.locator('#run').innerText(),/Simulate contract/);assert.equal(await page.locator('#next').isDisabled(),false,'obsolete query values cannot switch runtimes');
    const nativeSave={...localSave,simulated:undefined,checks:{...localSave.checks,...localSave.simulated}};
    await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:nativeSave});
    await page.goto(loopback+'#learned');await waitStep(chapters.findIndex(c=>c.id==='learned'));assert.match(await page.locator('#chapter-label').innerText(),/local DuskVM/i);
    await choose(chapters.findIndex(c=>c.id==='entrypoint'));await page.locator('#code').fill(sources.state+'\n// browser recheck');await run('good');assert.deepEqual((await saved(storageKey)).checks,nativeSave.checks);
    await page.goto(pages+'#state');await waitStep(chapters.findIndex(c=>c.id==='state'));await page.locator('#code').fill(sources.state);await run('good');assert.equal((await saved(storageKey)).checks.initial,null);
    // Delayed assets must not award stale code after editing or leaving the page.
    await page.goto(base+'course.html?path=circuits#public');await waitStep(7);
    const beforeCircuit=await saved(courseKey('circuits'));
    await page.route('**/circuit-program.wasm',async route=>{await new Promise(resolve=>setTimeout(resolve,300));await route.continue().catch(()=>{});});
    let loading=page.waitForRequest(r=>r.url().endsWith('/circuit-program.wasm'));
    await page.locator('#run').click();await loading;await page.locator('#code').fill(finalSources.circuits+'\n// changed while loading');await page.waitForTimeout(500);
    assert.equal(await page.locator('#feedback').isVisible(),false);assert.equal(await page.locator('#next').isDisabled(),true);assert.deepEqual((await saved(courseKey('circuits'))).simulated,beforeCircuit.simulated);
    loading=page.waitForRequest(r=>r.url().endsWith('/circuit-program.wasm'));await page.locator('#run').click();await loading;await page.locator('.brand').click();await page.locator('#paths').waitFor();await page.waitForTimeout(500);
    assert.deepEqual((await saved(courseKey('circuits'))).simulated,beforeCircuit.simulated);await page.unroute('**/circuit-program.wasm');
    await page.goto(base+'course.html?path=circuits#public');await page.locator('#code').fill('not Rust');await run('bad');assert.match(await page.locator('#feedback').innerText(),/Not supported/);
    await page.locator('#code').fill(finalSources.circuits);
    await page.route('**/circuit-worker.js',route=>route.fulfill({status:404,body:''}));await run('bad');assert.match(await page.locator('#feedback').innerText(),/worker is unavailable/);await page.unroute('**/circuit-worker.js');await run('good');
    await page.goto(base+'course.html?path=dapps#explorer-recovery');await waitStep(21);
    await page.route('**/dapp-worker.js',route=>route.fulfill({status:404,body:''}));await run('bad');assert.match(await page.locator('#feedback').innerText(),/runtime is unavailable/);await page.unroute('**/dapp-worker.js');await run('good');

    // Literal historical saves retain drafts, bookmarks and native provenance.
    const legacyChecks=through=>Object.fromEntries(chapters.filter(c=>c.kind==='code'&&c.lesson<=through).map(c=>[c.check,sources[c.check==='initial'?'initial':c.scenario]]));
    for(const [version,oldStep,oldActive,through,chapter,active] of [[1,3,2,0,'learned','entrypoint'],[2,10,9,2,'validation-learned','capacity'],[2,18,17,3,'records-learned','record-cancel'],[2,36,35,6,'building-learned','build-driver']]){
      const old={version,step:oldStep,active:oldActive,started:true,name:'Nór',source:'// unfinished native draft',checks:legacyChecks(through)};
      const migration=await browser.newContext();const m=await migration.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(base);
      await m.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:old});await m.reload();await m.waitForFunction(chapter=>document.querySelector('#open-contracts').getAttribute('href')==='#'+chapter,chapter);
      assert.deepEqual(await m.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey),old,'overview does not rewrite old saves');
      await m.locator('#open-contracts').click();await m.locator('#contract-path').waitFor();await m.reload();await m.locator('#earned').waitFor();
      const migrated=await m.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
      assert.equal(migrated.version,3);assert.equal(migrated.step,chapter);assert.equal(migrated.active,active);assert.equal(migrated.source,old.source);assert.equal(migrated.name,old.name);assert.equal(migrated.simulated,undefined);
      for(const [key,value]of Object.entries(old.checks))assert.equal(migrated.checks[key],value);assert.match(await m.locator('#chapter-label').innerText(),/local DuskVM/i);await migration.close();
    }
    const oldIds={dusk:['begin','transactions','disclosure','policy','learned'],dapps:['begin','read','prepare','wallet','learned'],circuits:['begin','constraint','public','learned']};
    for(const [id,ids]of Object.entries(oldIds)){
      const course=courses[id],key=courseKey(id),old={version:1,step:ids.length-1,active:id==='dusk'?-1:2,started:true,source:finalSources[id],checks:{},answers:{}};
      ids.forEach((name,i)=>{const c=course.chapters.find(c=>c.id===name);if(c.kind==='code')old.checks[i]=old.source;if(c.kind==='quiz'){old.checks[i]=c.answer;old.answers[i]=c.answer;}});
      const migration=await browser.newContext(),m=await migration.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(base);await m.evaluate(({key,old})=>localStorage.setItem(key,JSON.stringify(old)),{key,old});await m.reload();
      await m.waitForFunction(id=>document.querySelector('#open-'+id).href.endsWith('#learned'),id);assert.deepEqual(await m.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),old);
      await m.locator('#open-'+id).click();await m.locator('#earned').waitFor();await m.reload();await m.locator('#earned').waitFor();
      const migrated=await m.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(migrated.version,2);assert.equal(migrated.step,'learned');assert.equal(migrated.source,old.source);assert.equal(migrated.simulated,undefined);assert.deepEqual(Object.keys(migrated.checks),ids.slice(1,-1));
      if(course.language){assert.match(await m.locator('#chapter-label').innerText(),/previously checked with native execution/i);
        await m.locator('#chapter-menu').selectOption(String(course.chapters.findIndex(c=>c.id===ids[1])));assert.equal(await m.locator('#code').inputValue(),old.source);
        await m.locator('#run').click();await m.locator('#feedback[data-tone=good]').waitFor();assert.deepEqual((await m.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).checks,migrated.checks);
      }
      await migration.close();
    }

    // Failed storage protects work; recovery must also retry a failed shared-name save.
    const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));
    const b=await blocked.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto(base+'#state');await b.locator('#save-error').waitFor();await b.locator('#code').fill(sources.initial);await b.locator('#run').click();await b.locator('#feedback[data-tone=good]').waitFor();
    await b.locator('.brand').click();await b.locator('#paths').waitFor();assert.equal(await b.locator('#save-error').isVisible(),true);await b.locator('#resume-path').click();assert.equal(await b.locator('#code').inputValue(),sources.initial);
    assert.equal(await b.evaluate(()=>!dispatchEvent(new Event('beforeunload',{cancelable:true}))),true);await blocked.close();
    const partial=await browser.newContext();await partial.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='dusk-academy-forge-lesson-v1'&&!window.allowNameSave)throw Error('quota');return set.call(this,key,value);};});
    const n=await partial.newPage();n.on('pageerror',e=>errors.push(e.message));await n.goto(base+'course.html?path=dusk');await n.locator('#character-name-input').fill('Nór');await n.locator('#save-error').waitFor();
    await n.locator('#next').click();assert.equal(await n.locator('#save-error').isVisible(),true);assert.equal(await n.evaluate(()=>!dispatchEvent(new Event('beforeunload',{cancelable:true}))),true);
    await n.evaluate(()=>window.allowNameSave=true);await n.locator('#chapter-menu').selectOption('7');await n.locator('input[value=explicit]').check();assert.equal(await n.locator('#save-error').isVisible(),false);assert.equal(await n.evaluate(()=>JSON.parse(localStorage.getItem('dusk-academy-forge-lesson-v1')).name),'Nór');await partial.close();
    const malformed=await browser.newContext();await malformed.addInitScript(()=>{localStorage.setItem('dusk-academy-forge-lesson-v1','{');localStorage.setItem('dusk-academy-dapps-v1','{');});
    const m=await malformed.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(base);await m.locator('#paths').waitFor();assert.equal(await m.locator('#resume-path').isVisible(),false);assert.equal(await m.evaluate(()=>localStorage.getItem('dusk-academy-forge-lesson-v1')),'{');
    await m.goto(base+'course.html?path=dapps#learned');await m.locator('#lesson').waitFor();assert.equal(await m.locator('#earned').isVisible(),false);assert.match(await m.locator('#chapter-label').innerText(),/not yet checked/i);await malformed.close();
    await page.goto(base+'course.html?path=__proto__');await page.locator('#paths').waitFor();
    for(const endpoint of ['api/forge','api/circuit','api/registry-driver','api/explorer-driver','on/contracts:'+'02'.repeat(32)+'/get_count']){
      assert.equal((await context.request.get(base+endpoint)).status(),404,'no native endpoint: '+endpoint);
      assert.equal((await context.request.post(base+endpoint,{data:'{}'})).status(),501,'plain static server rejects POST: '+endpoint);
    }
    assert.ok(workerCount>10,'actual isolated SDK and PLONK workers ran');assert.deepEqual(unexpected,[],'no backend, external network or RPC requests');assert.deepEqual(errors,[]);
    console.log(`PASS: all 133 chapters, 22 contract checks / 8 dApp checks / 2 real circuit-proof checks, independent knowledge gates, exact IDs, CSP/opaque-origin isolation, stale-run cancellation, legacy migrations/provenance, storage failures, keyboard focus, ${layouts} layouts and ${audits} axe checks. Plain static HTTP and mocked Pages; no execution endpoints or RPC.`);
  } finally {await browser?.close();server.kill();await rm(web,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
