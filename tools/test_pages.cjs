// Static-host integration: all coding paths, real workers/proofs, no execution server.
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
(async()=>{
  const {chapters,storageKey,starter,codeSteps}=await import('../academy/lesson.js');
  const {courses,courseKey,exerciseSteps}=await import('../academy/courses.js');
  const {explorerSources}=await import('./dapp-sources.mjs');
  const root=path.resolve(__dirname,'..'),base='https://hdauven.github.io/dusk-academy/',loopback='http://localhost:8000/';
  const sources=JSON.parse(execFileSync('python3',['-B','-c','import json; from build_browser import lesson_sources; print(json.dumps(lesson_sources()))'],{cwd:root,env:{...process.env,PYTHONPATH:path.join(root,'tools')},encoding:'utf8'}));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  let layouts=0,audits=0,workerCount=0;const unexpected=[],errors=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:950}});
    await context.route('**/*',async route=>{
      const url=route.request().url();if(url.startsWith('blob:'))return route.continue();
      const prefix=[base,loopback].find(p=>url.startsWith(p));
      if(!prefix||route.request().method()!=='GET'||/\/(api|on)\//.test(url)){unexpected.push(url);return route.abort();}
      if(process.env.PAGES_LIVE==='1'&&prefix===base)return route.continue();
      const relative=new URL(url).pathname.slice(new URL(prefix).pathname.length)||'index.html',file=path.resolve(root,decodeURIComponent(relative));
      if(!file.startsWith(root+path.sep)){unexpected.push(url);return route.abort();}
      // A cached pre-browser helper ignores the new simulated flag and writes native credit.
      // New entrypoints must request a different module URL, not reuse that old writer.
      if(relative==='academy/lesson.js'&&!new URL(url).search){return route.fulfill({contentType:'text/javascript',body:`import {chapters} from './lesson.js?v=browser-1'; export * from './lesson.js?v=browser-1'; export function markChecked(state,step){state.checks[chapters[step].check]=state.source;}`});}
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
    for(const width of [320,1440]){await page.setViewportSize({width,height:950});await layout('overview');await axe('overview');}
    // A legacy preview bookmark may browse ahead, but must not move the active ABI.
    await page.goto(base+'#build-driver');await waitStep(chapters.findIndex(c=>c.id==='build-driver'));
    assert.equal(await page.locator('#code').inputValue(),starter);assert.match(await page.locator('#code-context').innerText(),/Initial state/);
    await choose(0);let draft=starter;
    for(const [i,c]of chapters.entries()){
      await waitStep(i);assert.equal(await page.locator('#code').inputValue(),draft,c.id+' keeps the draft');
      if(c.kind==='code'){
        const before=(await saved(storageKey)).simulated;
        const answer=sources[c.check==='initial'?'initial':c.scenario];assert.ok(answer,c.id);
        await page.locator('#code').fill(answer.replace('count: 0','count: 7'));await run('bad');
        assert.deepEqual((await saved(storageKey)).simulated,before,'wrong initialization cannot award '+c.id);
        draft=answer;await page.locator('#code').fill(draft);await run('good');
        const state=await saved(storageKey);assert.ok(Object.values(state.checks).every(v=>!v),'cached native helpers must not award native credit');assert.equal(state.simulated?.[c.check],draft);
        if(['record-cancel','permission-resize','test-atomic','build-driver'].includes(c.id))await axe(c.id+' results');
        if(c.id==='build-driver'){
          assert.match(await page.locator('#build-detail').textContent(),/Interpreted source \(not WASM\).*Prebuilt reference data-driver/s);
          assert.match(await page.locator('#feedback').innerText(),/without Rust compilation/);
          assert.doesNotMatch(await page.locator('#story-copy').innerText(),/compile both targets|newly built driver/);
        }
      }
      if(c.choices){const before=(await saved(storageKey)).simulated;await page.locator(`input[value="${c.answer}"]`).check();await page.locator('#quiz button').click();assert.deepEqual((await saved(storageKey)).simulated,before,'practice never awards code');}
      if(c.kind==='earned'){assert.equal(await page.locator('#earned').isVisible(),true);assert.match(await page.locator('#earned-label').innerText(),/simulator/i);}
      for(const width of [320,1440]){await page.setViewportSize({width,height:950});await layout('contracts/'+c.id);if(c.kind==='earned')await axe('contracts/'+c.id);}
      if(i<chapters.length-1){assert.equal(await page.locator('#next').isDisabled(),false,c.id);await page.locator('#next').click();}
    }
    let contractSave=await saved(storageKey);assert.equal(Object.keys(contractSave.simulated).length,22);
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
          if(c.id==='explorer-recovery')assert.deepEqual(await page.locator('#trace-results tbody tr td:nth-child(2)').allTextContents(),['found','found','missing','found','missing','missing','unavailable','found']);
          if(c.id==='public'){assert.match(await page.locator('#proof-bytes').textContent(),/^[a-f0-9]{2016}$/);assert.match(await page.locator('#results-runtime').innerText(),/real PLONK/);}
          await axe(id+'/'+c.id+' results');
        }
        if(c.choices){
          const before=await saved(courseKey(id));if(c.kind==='quiz')assert.equal(await page.locator('#next').isDisabled(),true);
          await page.locator(`input[value="${c.choices.find(([v])=>v!==c.answer)[0]}"]`).check();await page.locator('#quiz button').click();assert.equal(await page.locator('#quiz-feedback').getAttribute('data-tone'),'bad');
          await page.locator(`input[value="${c.answer}"]`).check();await page.locator('#quiz button').click();
          if(c.kind==='practice'){assert.deepEqual((await saved(courseKey(id))).checks,before.checks);assert.deepEqual((await saved(courseKey(id))).simulated,before.simulated);}
          if(c.wallet){assert.equal(await page.locator('#wallet-demo').isVisible(),false);await page.locator('#find-wallet').dispatchEvent('click');await page.locator('#connect-wallet').dispatchEvent('click');assert.equal(await page.locator('#wallet-status').innerText(),'');}
        }
        if(c.kind==='earned'){assert.equal(await page.locator('#earned').isVisible(),true);if(course.language)assert.match(await page.locator('#chapter-label').innerText(),/checked in the browser runtime/i);}
        for(const width of [320,1440]){await page.setViewportSize({width,height:950});await layout(id+'/'+c.id);if(c.kind==='earned')await axe(id+'/'+c.id);}
        if(i<course.chapters.length-1){assert.equal(await page.locator('#next').isDisabled(),false,id+'/'+c.id);await page.locator('#next').click();}
      }
      finalSources[id]=source;const state=await saved(courseKey(id));await page.reload();await waitStep(course.chapters.length-1);assert.deepEqual(await saved(courseKey(id)),state);
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
    // Explicit browser mode on static loopback needs neither compiler nor worker headers.
    await page.goto(loopback+'?runtime=simulator#entrypoint');await waitStep(chapters.findIndex(c=>c.id==='entrypoint'));
    // Browsing ahead retains the initial task until it has been checked.
    await page.locator('#code').fill(sources.state);await run('good');await choose(chapters.findIndex(c=>c.id==='entrypoint'));await run('good');
    const localSave=await saved(storageKey);await page.goto(loopback+'course.html?path=dusk#begin');await waitStep(0);await page.locator('#character-name-input').fill('Nora');assert.deepEqual(await saved(storageKey),{...localSave,name:'Nora'});
    await page.goto(loopback+'#state');await waitStep(chapters.findIndex(c=>c.id==='state'));assert.match(await page.locator('#run').innerText(),/Run contract/);assert.equal(await page.locator('#next').isDisabled(),true,'simulation never bypasses a native gate');
    const nativeSave={...localSave,simulated:undefined,checks:{...localSave.checks,...localSave.simulated}};
    await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:nativeSave});
    await page.goto(loopback+'?runtime=simulator#learned');await waitStep(chapters.findIndex(c=>c.id==='learned'));assert.match(await page.locator('#chapter-label').innerText(),/local DuskVM/i);
    assert.ok(workerCount>10,'actual isolated SDK and PLONK workers ran');assert.deepEqual(unexpected,[],'no backend, external network or RPC requests');assert.deepEqual(errors,[]);
    console.log(`PASS: all 133 chapters, 22 contract checks / 8 dApp checks / 2 real circuit-proof checks, independent knowledge gates, exact IDs, CSP/opaque-origin isolation, cancellation, separate native/browser saves, ${layouts} layouts and ${audits} axe checks. No execution server or RPC.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
