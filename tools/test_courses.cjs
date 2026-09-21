// Optional integration check: running local server, Playwright and axe required.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
(async()=>{
  const {courses,courseKey,exerciseSteps,partSteps,explorerScenarios}=await import('../academy/courses.js');
  const {restore,serialize,storageKey,chapters:contractChapters,codeSteps:contractSteps}=await import('../academy/lesson.js');
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  const errors=[];let layouts=0,audits=0;
  try {
    const context=await browser.newContext({viewport:{width:1440,height:950}}), page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    const base='http://localhost:5173/';
    await page.goto(base);
    const forge=restore(null);forge.source+='\n// Keep this Forge draft.';
    await page.evaluate(({key,raw})=>{
      localStorage.setItem(key,raw);localStorage.setItem('unrelated-progress','keep');
    },{key:storageKey,raw:serialize(forge)});
    const run=async(tone)=>{
      await page.locator('#run').click();await page.locator(`#feedback[data-tone=${tone}]`).waitFor({timeout:60000});
      await page.waitForFunction(()=>!document.querySelector('#code').getAttribute('aria-busy').includes('true'));
    };
    const solutions={}, openingSources={}; let registryStages, openingDappChecks;
    const {explorerSources}=await import('./dapp-sources.mjs');
    const jump=async(page,step)=>{
      await page.locator('#chapter-menu').selectOption(String(step));
      await page.waitForFunction(step=>document.querySelector('#lesson').dataset.step===String(step),step);
    };
    for(const [id,course] of Object.entries(courses)) {
      await page.goto(base);
      const size=`${course.lessons.length} lesson${course.lessons.length===1?'':'s'} · ${course.chapters.length} chapters`;
      assert.equal(await page.locator(`#${id}-size`).innerText(),size);assert.equal(await page.locator(`#${id}-progress`).isVisible(),false);
      await page.locator(`#open-${id}`).click();await page.locator('#lesson').waitFor();
      assert.equal(await page.locator('#lesson').getAttribute('data-step'),'0','independent path, no contract prerequisite');
      if(id==='dusk') await page.locator('#character-name-input').fill('Mira');
      assert.equal(await page.locator('.scene-caption .character-name').innerText(),'Mira');
      await page.locator('#next').click();
      const codeSteps=exerciseSteps(course).filter(i=>course.chapters[i].kind==='code');
      for(let i=1;i<course.chapters.length-1;i++) {
        const c=course.chapters[i];
        assert.equal(await page.locator('#lesson').getAttribute('data-step'),String(i));
        assert.equal(await page.locator('#editor').isVisible(),Boolean(course.language)&&!['intro','earned'].includes(c.kind),'keep the working file beside the coding-path explanations');
        assert.equal(await page.locator('#chapters button').count(),partSteps(course,i).length);
        assert.equal(await page.locator('#next').isDisabled(),['code','quiz'].includes(c.kind));
        if(['intro','earned'].includes(c.kind)) {
          assert.equal(id,'dapps');assert.equal(await page.locator('#next').isVisible(),true);
          assert.equal(await page.locator('#all-paths').isVisible(),false);
          const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),courseKey(id));
          assert.equal(saved.source,openingSources.dapps,'entering the new lesson must not replace existing source');
          if(c.kind==='earned') openingDappChecks=saved.checks;
          else assert.deepEqual(saved.checks,openingDappChecks);
          await page.locator('#next').click();continue;
        }
        if(c.kind==='guide') {
          assert.equal(await page.locator('#reading-panel').isVisible(),true);
          assert.equal(await page.locator('#reading-title').innerText(),c.panelTitle);
          const reveal=page.locator('#reading-panel details');
          if(await reveal.count()) {await reveal.locator('summary').click();assert.equal(await reveal.getAttribute('open'),'');}
          await page.locator('#next').click();continue;
        }
        if(c.choices) {
          const checksBefore=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).checks,courseKey(id));
          const wrong=c.choices.find(([key])=>key!==c.answer)[0];
          await page.locator(`input[value="${wrong}"]`).check();await page.locator('#quiz button').click();
          assert.equal(await page.locator('#quiz-feedback').getAttribute('data-tone'),'bad');assert.equal(await page.locator('#next').isDisabled(),c.kind==='quiz');
          await page.locator(`input[value="${c.answer}"]`).check();await page.locator('#quiz button').click();
          assert.equal(await page.locator('#quiz-feedback').getAttribute('data-tone'),'good');
          if(c.kind==='practice') assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).checks,courseKey(id)),checksBefore,'practice does not fabricate skill checkpoints');
          if(c.wallet) {
            await page.locator('#find-wallet').click();await page.waitForFunction(()=>document.querySelector('#wallet-status').textContent.includes('No Dusk wallet found'));
            assert.equal(await page.locator('#wallet-picker').isVisible(),false);
          }
        } else {
          await run('bad');
          let source=await page.locator('#code').inputValue();
          if(id==='dapps') {
            if(c.id==='read') source=source.replace('return 0;','return await dusk.readContract({contract:"registry",functionName:"get_count"});');
            else if(c.id==='prepare') {source=source.replace('return null;','return await dusk.prepareContractCall({contract:"registry",functionName:"register",args:amount,privacy:"public",amount:"0",deposit:"0"});');openingSources.dapps=source;}
            else {
              if(c.id==='explorer-read') registryStages=explorerSources(source);
              source=registryStages[c.id];assert.ok(source,c.id);
            }
          }
          else source=c.id==='constraint'?source.replace('// Bind sum to total.','composer.assert_equal(sum, total);'):source.replace('append_witness(self.total)','append_public(self.total)');
          await page.locator('#code').fill(source);await run('good');solutions[id]=source;
          assert.equal(await page.locator('#next').isDisabled(),false);
          const phase=explorerScenarios.indexOf(c.id);
          assert.equal(await page.locator('#trace-results tbody tr').count(),phase>=0?[2,3,3,3,6,8][phase]:id==='dapps'?2:3);
          if(phase>=0) {
            const checks=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).checks,courseKey(id));
            for(const [key,value] of Object.entries(openingDappChecks)) assert.equal(checks[key],value,'new ABI tasks preserve original earned snapshots');
            if(phase>=3) assert.match(await page.locator('#trace-results').innerText(),/Confirmed: false/);
            if(phase===5) assert.deepEqual(await page.locator('#trace-results tbody tr td:nth-child(2)').allTextContents(),['found','found','missing','found','missing','missing','unavailable','found']);
            for(const width of [320,390,900,901,1440]) {
              await page.setViewportSize({width,height:950});
              assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${c.id} results overflow ${width}`);layouts++;
            }
            if(phase===5) {
              assert.equal(await page.locator('#trace-results details').count(),4);
              await page.locator('#trace-results details summary').first().click();
              assert.equal(await page.locator('#trace-results details pre').first().innerText(),'22'.repeat(32));
              for(const width of [390,1440]) {
                await page.setViewportSize({width,height:950});
                assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'expanded owner ID wraps');
                assert.deepEqual((await new AxeBuilder({page}).analyze()).violations.map(v=>v.id),[]);audits++;
                await page.screenshot({path:`/tmp/academy-explorer-${width}-results.png`,fullPage:true});
              }
              // Regressions must fail on real SDK/VM outcomes, not source spelling.
              for(const bad of [
                source.replace('JSON.rawJSON(id)','Number(id)'),
                source.replace('if (seats === null) return null;','if (seats === null) return {id,seats:0};'),
                source.replace('return { id, seats, owner, confirmed };','return { id, seats, owner, confirmed: confirmed || null };'),
                source.replace('return { status: "unavailable" };','return { status: "missing" };'),
              ]) {await page.locator('#code').fill(bad);await run('bad');assert.equal(await page.locator('#next').isDisabled(),true);}
              // Equivalent async returns are accepted; retain the learner's version afterward.
              await page.locator('#code').fill(source.replace('return await dusk.readContract({contract:"registry",functionName:"get_count"});','return dusk.readContract({contract:"registry",functionName:"get_count"});'));
              await run('good');await page.locator('#code').fill(source);await run('good');
            }
          }
          if(id==='circuits') assert.equal(await page.locator('#trace-results tbody tr').nth(2).getAttribute('data-status'),'rejected');
          await page.reload();await page.locator('#editor').waitFor();assert.equal(await page.locator('#code').inputValue(),source);
          if(i===codeSteps.at(-1)) {
            await jump(page,codeSteps[0]);assert.equal(await page.locator('#code').inputValue(),source);
            assert.equal(await page.locator('#code-context').isVisible(),true);await run('good');
            const guideStep=course.chapters.findIndex(c=>c.kind==='guide');
            await jump(page,guideStep);assert.equal(await page.locator('#code').inputValue(),source);
            await run('good');
            assert.match(await page.locator('#feedback-text').innerText(),id==='circuits'?/Changing the public total/:/working retry recovered/,'worked-example pages keep running the active code task');
            assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),courseKey(id))).checks[course.chapters[guideStep].id],undefined);
            await jump(page,i);
          }
        }
        await page.locator('#next').click();
      }
      assert.equal(await page.locator('#earned').isVisible(),true);assert.equal(await page.locator('#next').isVisible(),false);
      await page.locator('#next').evaluate(b=>b.click());assert.equal(await page.locator('#lesson').getAttribute('data-step'),String(course.chapters.length-1));
      await page.locator('#chapter-menu').focus();await page.keyboard.press('ArrowUp');
      assert.equal(await page.locator('#lesson').getAttribute('data-step'),String(course.chapters.length-2));
      assert.equal(await page.evaluate(()=>document.activeElement.id),'chapter-menu','keyboard chapter selection keeps focus');
      await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#earned').isVisible(),true);
      await page.locator('#skills-button').click();assert.match(await page.locator('#skill-status').innerText(),/Learned/);await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'skills-button');
      await page.locator('#all-paths').click();await page.locator('#paths').waitFor();
      assert.match(await page.locator('#resume-label').innerText(),/^Review/);
      assert.equal(await page.locator(`#${id}-progress`).innerText(),id==='dapps'?'2 of 2 lessons completed':'Opening lesson completed');
      assert.equal(await page.locator(`#${id}-size`).innerText(),size);assert.equal(await page.locator(`#${id}-size`).isVisible(),true);
      assert.equal(await page.locator(`#open-${id}`).innerText(),id==='dapps'?'Review lessons →':'Review lesson →');
      const saved=await page.evaluate(key=>localStorage.getItem(key),courseKey(id));
      await page.reload();assert.equal(await page.evaluate(key=>localStorage.getItem(key),courseKey(id)),saved,'entrance is read-only');
      await page.locator('#resume-path').click();await page.locator('#lesson').waitFor();
      assert.equal(await page.locator('#lesson').getAttribute('data-step'),String(course.chapters.length-1));
      for(const width of [320,360,390,440,600,768,900,901,1100,1280,1440]) {
        await page.setViewportSize({width,height:844});
        for(let step=0;step<course.chapters.length;step++) {
          await jump(page,step);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${id}/${width}/${step}`);layouts++;
        }
      }
      for(const width of [390,1440]) {
        await page.setViewportSize({width,height:950});
        for(let step=0;step<course.chapters.length;step++) {
          await jump(page,step);
          assert.deepEqual((await new AxeBuilder({page}).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`axe ${id}/${width}/${step}`);audits++;
        }
        await page.locator('#about-button').click();assert.deepEqual((await new AxeBuilder({page}).analyze()).violations.map(v=>v.id),[]);audits++;await page.keyboard.press('Escape');
        await page.screenshot({path:`/tmp/dusk-${id}-${width}-earned.png`,fullPage:true});
      }
    }
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).source,storageKey),forge.source);
    assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-progress')),'keep');
    // Renaming from another path must retain the newly appended contract checkpoints too.
    const recordDraft={...forge,started:true,step:contractChapters.length-1,active:contractSteps.at(-1),source:forge.source+'\n// Unfinished build-check edits.',checks:Object.fromEntries(contractSteps.map(step=>[contractChapters[step].check,`// checked source ${step}`])),answers:{'contract-state':'value','test-events':'state'}};
    await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:storageKey,raw:serialize(recordDraft)});
    await page.goto(base+'course.html?path=dusk#begin');await page.locator('#character-name-input').fill('Mira Records');
    assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey),JSON.parse(serialize({...recordDraft,name:'Mira Records'})));
    await page.goto(base+'course.html?path=dapps#prepare');await page.locator('#editor').waitFor();
    // Cancel a worker without hanging the interface or awarding its source.
    await page.locator('#code').fill(solutions.dapps+'\nwhile(true){}');
    const running=page.waitForEvent('worker');await page.locator('#run').click();await running;await page.locator('#run').click();
    assert.match(await page.locator('#test-empty').innerText(),/cancelled/);assert.equal(await page.locator('#next').isDisabled(),true);
    await page.locator('#code').fill(solutions.dapps);await run('good');
    await page.goto(base+'course.html?path=circuits#public');await page.locator('#editor').waitFor();
    await page.route('**/api/circuit',async route=>{await new Promise(r=>setTimeout(r,300));await route.fulfill({contentType:'application/wasm',body:Buffer.from([])}).catch(()=>{});});
    await page.locator('#run').click();await page.locator('#code').fill(solutions.circuits+'\n// changed during compile');
    await page.waitForTimeout(500);assert.equal(await page.locator('#feedback').isVisible(),false);assert.equal(await page.locator('#next').isDisabled(),true);
    await page.locator('#run').click();await page.locator('.brand').click();await page.locator('#paths').waitFor();await page.waitForTimeout(500);
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),courseKey('circuits'));
    assert.notEqual(saved.checks.public,saved.source,'leaving invalidates grading');
    await page.unroute('**/api/circuit');
    await page.locator('#resume-path').click();await page.locator('#editor').waitFor();assert.equal(await page.locator('#code').inputValue(),saved.source);
    await page.locator('#code').fill('not Rust');await run('bad');assert.match(await page.locator('#feedback-text').innerText(),/lib.rs|circuit.rs/);
    // A static host without worker response CSP must not execute edited JavaScript.
    await page.goto(base+'course.html?path=dapps#read');await page.locator('#editor').waitFor();
    await page.route('**/academy/dapp-worker.js',route=>route.fulfill({contentType:'text/javascript',body:''}));await run('bad');assert.match(await page.locator('#feedback-text').innerText(),/isolated worker is unavailable/);await page.unroute('**/academy/dapp-worker.js');
    const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}}));
    const b=await blocked.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto(base+'course.html?path=dusk');await b.locator('#save-error').waitFor();
    const transactionStep=courses.dusk.chapters.findIndex(c=>c.id==='transactions');
    await b.locator('#next').click();await jump(b,transactionStep);await b.locator('input[value=explicit]').check();await b.locator('#quiz button').click();await b.locator('#next').click();assert.equal(await b.locator('#lesson').getAttribute('data-step'),String(transactionStep+1));await blocked.close();
    // A failed shared-name save must not be hidden by a smaller successful course save.
    const partial=await browser.newContext();await partial.addInitScript(()=>{
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(key==='dusk-academy-forge-lesson-v1'&&!window.allowNameSave)throw Error('quota');return original.call(this,key,value);};
    });
    const n=await partial.newPage();n.on('pageerror',e=>errors.push(e.message));await n.goto(base+'course.html?path=dusk');await n.locator('#character-name-input').fill('Nór');await n.locator('#save-error').waitFor();
    await n.locator('#next').click();assert.equal(await n.locator('#save-error').isVisible(),true);
    await n.evaluate(()=>window.allowNameSave=true);await jump(n,transactionStep);await n.locator('input[value=explicit]').check();
    assert.equal(await n.locator('#save-error').isVisible(),false);assert.equal(await n.evaluate(()=>JSON.parse(localStorage.getItem('dusk-academy-forge-lesson-v1')).name),'Nór');await partial.close();
    const malformed=await browser.newContext();await malformed.addInitScript(()=>localStorage.setItem('dusk-academy-dapps-v1','{'));
    const m=await malformed.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(base+'course.html?path=dapps#learned');await m.locator('#lesson').waitFor();assert.equal(await m.locator('#lesson').getAttribute('data-step'),'0');await malformed.close();
    // Completed v1 lessons remain completed; old hashes and source survive expansion.
    const legacyIds={dusk:['begin','transactions','disclosure','policy','learned'],dapps:['begin','read','prepare','wallet','learned'],circuits:['begin','constraint','public','learned']};
    for(const [id,ids] of Object.entries(legacyIds)) {
      const course=courses[id], key=courseKey(id), legacy={version:1,step:ids.length-1,active:id==='dusk'?-1:2,started:true,source:openingSources[id]||solutions[id]||'',checks:{},answers:{}};
      ids.forEach((name,i)=>{const c=course.chapters.find(c=>c.id===name);if(c.kind==='code')legacy.checks[i]=legacy.source;if(c.kind==='quiz'){legacy.checks[i]=c.answer;legacy.answers[i]=c.answer;}});
      const old=await browser.newContext();
      await old.addInitScript(({key,raw})=>{if(!localStorage.getItem(key))localStorage.setItem(key,raw);},{key,raw:JSON.stringify(legacy)});
      const p=await old.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.locator('#paths').waitFor();
      assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),JSON.stringify(legacy),'entrance must not silently rewrite v1');
      assert.equal(await p.locator(`#${id}-progress`).innerText(),id==='dapps'?'1 of 2 lessons completed':'Opening lesson completed');
      assert.equal(await p.locator(`#${id}-size`).innerText(),`${course.lessons.length} lesson${course.lessons.length===1?'':'s'} · ${course.chapters.length} chapters`);
      assert.equal(await p.locator(`#${id}-size`).isVisible(),true);
      await p.locator(`#open-${id}`).click();await p.locator('#earned').waitFor();
      const migrated=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
      assert.equal(migrated.version,2);assert.equal(migrated.step,'learned');assert.equal(migrated.source,legacy.source);
      assert.deepEqual(Object.keys(migrated.checks),ids.slice(1,-1));
      await p.reload();await p.locator('#earned').waitFor();
      if(id!=='dusk') {
        await jump(p,course.chapters.findIndex(c=>c.id===ids[1]));
        assert.equal(await p.locator('#code').inputValue(),legacy.source);assert.equal(await p.locator('#code-context').isVisible(),true);
        assert.equal((await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).active,ids[2]);
      }
      if(id==='dapps') {
        await jump(p,14);await p.locator('#next').click();assert.equal(await p.locator('#lesson').getAttribute('data-step'),'15');
        await p.locator('#next').click();assert.equal(await p.locator('#lesson').getAttribute('data-step'),'16');
        assert.equal(await p.locator('#code').inputValue(),legacy.source);
        await p.locator('#skills-button').click();assert.deepEqual(await p.locator('.skill-button').allTextContents(),['Dusk Connect client · Learned','Read-only registry client · Available']);
        await p.keyboard.press('Escape');
      }
      await old.close();
    }
    await page.goto(base+'course.html?path=__proto__');await page.locator('#paths').waitFor();
    for(const [url,data,status,headers] of [
      ['api/circuit',{source:'x'.repeat(8001)},400,{}],['api/circuit',{source:'x'},403,{Origin:'https://unrelated.invalid'}],
      ['on/contracts:unknown/get_count',null,404,{}],
    ]) assert.equal((await context.request.post(base+url,{data,headers})).status(),status);
    assert.deepEqual(errors,[]);
    console.log(`PASS: cumulative read-only registry lesson, actual SDK/VM field reads, exact large IDs, missing records and HTTP failure/recovery; preserved opening snapshots/v1/v2 saves, real PLONK proofs, cancellation, unavailable wallets, ${layouts} layouts and ${audits} axe checks.`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
