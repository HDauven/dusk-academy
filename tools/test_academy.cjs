// Optional browser regression: Playwright + @axe-core/playwright, no runtime deps.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;

(async()=>{
  const {chapters,lessons,stepsFor,partSteps,starter,storageKey}=await import('../academy/lesson.js');
  const index=id=>chapters.findIndex(c=>c.id===id);
  const widths=[320,360,390,440,600,768,900,901,1100,1280,1440];
  const initial=starter.replace('count: 7','count: 0');
  const answer=initial.replace('// Add one registration.','self.count += 1;');
  const argumentsCode=answer.replace('register(&mut self)','register(&mut self, amount: u64)').replace('self.count += 1;','self.count += amount;');
  const positiveCode=argumentsCode.replace('self.count += amount;','assert!(amount > 0);\n            self.count += amount;');
  const capacityCode=positiveCode.replace('self.count += amount;','self.count += amount;\n            assert!(self.count <= 10);');
  const recordsBase=capacityCode+'\n// Keep my notes through the records lesson.';
  const sources=(helper,source)=>JSON.parse(execFileSync('python3',['-B','-c',`import sys,json; sys.path.insert(0,"tools"); from test_forge_lesson import ${helper}; print(json.dumps(${helper}(sys.stdin.read())))`],{cwd:path.join(__dirname,'..'),input:source,encoding:'utf8'}));
  const recordSources=sources('record_sources',recordsBase),recordsCode=recordSources['records-cancel'];
  const advancedSources=sources('advanced_sources',recordsCode),finalCode=advancedSources['build-driver'];
  const solutions={initial,change:answer,arguments:argumentsCode,positive:positiveCode,capacity:capacityCode};
  for(const c of chapters.filter(c=>c.kind==='code'&&c.lesson>=3)) solutions[c.check]=({...recordSources,...advancedSources})[c.scenario];
  const traceCounts={'arguments':3,'validation':5,'capacity':8,'records-empty':2,'records-ids':8,'records-save':8,'records-read':11,'records-missing':13,'records-cancel':26,'permissions-caller':4,'permissions-owner':12,'permissions-cancel':20,'permissions-resize':29,'events-register':29,'events-changes':29,'calls-quote':37,'calls-confirm':47,'tests-invariant':54,'tests-atomic':66,'build-driver':66};
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  const errors=[];let layouts=0,axeChecks=0;
  try {
    const context=await browser.newContext({viewport:{width:1440,height:950}});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
    const assertSizes=async p=>{
      const sizes=p.locator('#dusk-size, #contracts-size, #dapps-size, #circuits-size');
      assert.deepEqual(await sizes.allTextContents(),['1 lesson · 15 chapters','7 lessons · 83 chapters','2 lessons · 23 chapters','1 lesson · 12 chapters']);
      for(const node of await sizes.all()) assert.equal(await node.isVisible(),true,'path totals stay visible alongside progress');
      assert.equal(await p.locator('#contracts-first-count').innerText(),'15');
    };
    const waitStep=id=>page.waitForFunction(step=>document.querySelector('#lesson').dataset.step===String(step),index(id));
    const go=async id=>{await page.evaluate(id=>{location.hash=id},id);await waitStep(id)};
    const run=async tone=>{
      await page.locator('#run').click();await page.locator(`#feedback[data-tone="${tone}"]`).waitFor();
      await page.waitForFunction(()=>document.querySelector('#run').textContent.includes('Run contract'));
    };
    const layout=async label=>{
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label);layouts++;
    };
    const axe=async label=>{
      const result=await new AxeBuilder({page}).analyze();
      assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],label);axeChecks++;
    };
    await page.goto('http://localhost:5173/');await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>localStorage.setItem('unrelated-progress','keep'));
    assert.equal(await page.locator('#paths').isVisible(),true);assert.equal(await page.locator('#contract-path').isVisible(),false);
    assert.equal(await page.locator('#resume-path').isVisible(),false);assert.equal(await saved(),null,'entrance does not create a save');
    assert.deepEqual(await page.locator('#paths h2, #paths h3').allTextContents(),['Start with Dusk','DuskVM development','Contract development','dApp development','Circuit development']);
    await assertSizes(page);
    assert.equal(await page.locator('#paths [id$="-progress"]:visible').count(),0,'fresh paths have totals, not fabricated saved progress');
    assert.equal(await page.locator('#open-contracts').innerText(),'Open path →');
    assert.equal(await page.locator('.starter-path a, .path-card a').count(),4);
    await page.locator('.skip-link').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'paths-title');
    for(const width of widths){await page.setViewportSize({width,height:844});await layout(`entrance ${width}`)}
    for(const width of [390,1440]){await page.setViewportSize({width,height:950});await axe(`entrance ${width}`)}
    await page.locator('#open-contracts').click();await page.locator('#contract-path').waitFor();
    assert.equal(await page.locator('#save-error').isVisible(),false);
    assert.equal(await page.evaluate(()=>!window.dispatchEvent(new Event('beforeunload',{cancelable:true}))),false,'silent saves do not trigger leave warnings');
    await page.locator('#character-name-input').fill('<b>Mira</b>');
    assert.equal(await page.locator('.scene-caption strong').innerText(),'<b>Mira</b>');assert.equal(await page.locator('.scene-caption b').count(),0);
    await page.locator('#character-name-input').fill('Mira');
    await page.evaluate(()=>{location.hash='entrypoint'});await page.waitForFunction(()=>location.hash==='#begin');
    assert.equal(await page.locator('#chapter-menu option').count(),83);assert.equal(await page.locator('#chapter-menu optgroup').count(),7);
    assert.equal(await page.locator(`#chapter-menu option[value="${index('entrypoint')}"]`).isDisabled(),true);

    // Starting a path used to hide its chapter total on the overview.
    await page.locator('#next').click();await waitStep('contract-pieces');
    const startedSave=await page.evaluate(key=>localStorage.getItem(key),storageKey);
    await page.locator('.brand').click();await page.locator('#paths').waitFor();await assertSizes(page);
    assert.equal(await page.locator('#contracts-progress').innerText(),'0 of 7 lessons completed');
    assert.equal(await page.locator('#open-contracts').innerText(),'Continue lesson →');
    await page.reload();await page.locator('#paths').waitFor();await assertSizes(page);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),storageKey),startedSave,'overview still leaves the save untouched');
    await page.locator('#open-contracts').click();await waitStep('contract-pieces');
    await page.locator('#previous').click();await waitStep('begin');

    // Walk every new chapter, retaining the same file through all reading and coding.
    let previous=starter,lastCode=chapters[index('state')];const expectedChecks={};
    const guideRuns=['contract-trace','argument-interface','rule-rollback','record-lifetime','permission-guard','call-coordination','build-artifacts'];
    for(const [step,c] of chapters.entries()) {
      await waitStep(c.id);
      assert.equal(await page.locator('#code').inputValue(),previous,`${c.id}: navigation never scaffolds over the draft`);
      assert.equal(await page.locator('#page-count').innerText(),`${stepsFor(c.lesson).indexOf(step)+1} / ${stepsFor(c.lesson).length}`);
      assert.equal(await page.locator('#chapters button').count(),partSteps(step).length);
      assert.match(await page.locator('#part-title').innerText(),new RegExp(`Part ${c.part+1} of ${lessons[c.lesson].parts.length}`));
      if(c.kind==='code') {
        lastCode=c;
        assert.equal(await page.locator('#next').isDisabled(),true,'new code checkpoints require a real run');
        if(c.check==='recordStorage'){await page.locator('#code').fill(recordsBase);previous=recordsBase}
        if(c.scenario!=='build-driver') await run('bad');
        if(c.check==='initial') assert.match(await page.locator('#feedback-text').innerText(),/starts at 7/);
        if(c.check==='arguments') assert.match(await page.locator('#feedback-text').innerText(),/supplied amount/);
        if(c.check==='positive') assert.match(await page.locator('#feedback-text').innerText(),/zero amount/);
        if(c.check==='capacity') {
          assert.match(await page.locator('#feedback-text').innerText(),/above ten/);
          await page.locator('#code').fill(capacityCode.replace('self.count <= 10','self.count < 10'));await run('bad');
          assert.match(await page.locator('#feedback-text').innerText(),/from 3 to 10/);
        }
        if(c.check==='change') {
          await page.locator('#code').fill(initial.replace('// Add one registration.','self.count += 2;'));await run('bad');
          assert.match(await page.locator('#feedback-text').innerText(),/2, 4, 6/);
          await page.locator('#code').fill(answer.replace('self.count += 1;','self.count += "one";'));await run('bad');
          assert.match(await page.locator('#error-detail').innerText(),/lib.rs/);assert.equal(await page.locator('#diagnostics').isVisible(),true);
          await page.locator('#code').fill(answer.replace('self.count += 1;','loop {}'));await run('bad');
          assert.equal(await page.locator('#next').isDisabled(),true);
          await page.locator('#code').fill(answer.replace('self.count += 1;','self.count = self.count + 1;'));await run('good');
          // Stale results, navigation cancellation, explicit cancellation and service failure.
          await page.route('**/api/forge',async route=>{
            await new Promise(resolve=>setTimeout(resolve,300));
            await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,initial:'0',after:['1','2','3'],fresh:'0'})}).catch(()=>{});
          });
          await page.locator('#run').click();await page.locator('#code').fill(answer+'\n// changed while compiling');
          await page.waitForTimeout(500);assert.equal(await page.locator('#next').isDisabled(),true);assert.equal(await page.locator('#feedback').isVisible(),false);
          const before=(await saved()).checks.change;
          await page.locator('#run').click();await page.locator('.brand').click();await page.locator('#paths').waitFor();await page.waitForTimeout(500);
          assert.equal((await saved()).checks.change,before);assert.equal(await page.locator('#resume-label').innerText(),'Continue contracts');
          await page.locator('#resume-path').click();await page.locator('#contract-path').waitFor();
          assert.equal(await page.locator('#code').inputValue(),answer+'\n// changed while compiling');
          await page.locator('#run').click();await page.locator('#run').click();await page.waitForTimeout(500);
          assert.match(await page.locator('#test-empty').innerText(),/cancelled/i);assert.equal(await page.locator('#feedback').isVisible(),false);
          await page.unroute('**/api/forge');
          await page.route('**/api/forge',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Run npm run setup:forge first.'})}));
          await run('bad');assert.match(await page.locator('#feedback-text').innerText(),/setup:forge/);await page.unroute('**/api/forge');
        }
        previous=solutions[c.check];await page.locator('#code').fill(previous);
        if(c.check==='change') {
          await page.locator('#code').press('Control+Enter');await page.locator('#feedback[data-tone=good]').waitFor();
          await page.waitForFunction(()=>!document.querySelector('#next').disabled);
        } else await run('good');
        expectedChecks[c.check]=previous;
        for(const [key,value] of Object.entries(expectedChecks)) assert.equal((await saved()).checks[key],value,'later runs preserve historical source snapshots');
        if(c.scenario==='state') assert.deepEqual(await page.locator('#call-results strong').allTextContents(),c.check==='initial'?['0','0']:['0','1','2','3']);
        else assert.equal(await page.locator('#trace-results tbody tr').count(),traceCounts[c.scenario],c.scenario);
        if(c.check==='arguments') assert.deepEqual(await page.locator('#trace-results tbody td:last-child').allTextContents(),['0 → 2','2 → 5','5 → 6']);
        if(c.check==='positive') assert.equal(await page.locator('#trace-results tbody tr').nth(3).getAttribute('data-status'),'rejected');
        if(c.check==='capacity') {
          assert.deepEqual(await page.locator('#trace-results tbody td:last-child').allTextContents(),['0 → 3','3 → 3','3 → 10','10 → 10','10 → 10','10 → 10','0 → 8','8 → 10']);
          assert.equal(await page.locator('#trace-results th small').innerText(),'Fresh deployment');
          await page.locator('#code').fill(capacityCode+'\n// extra learner note'.repeat(60));
          const scroll=await page.locator('#code').evaluate(code=>{
            code.style.height='800px';code.scrollTop=200;code.dispatchEvent(new Event('scroll'));
            return {textarea:code.clientHeight,surface:code.parentElement.clientHeight,overlayHeight:document.querySelector('#highlight').clientHeight,top:code.scrollTop,overlay:document.querySelector('#highlight').scrollTop,gutter:document.querySelector('#line-numbers').style.transform};
          });
          assert.equal(scroll.textarea,scroll.surface);assert.equal(scroll.textarea,scroll.overlayHeight);assert.equal(scroll.top,scroll.overlay);assert.equal(scroll.gutter,`translateY(${-scroll.top}px)`);
          await page.locator('#code').evaluate(code=>{code.style.height=''});
          await page.locator('#code').fill(capacityCode.replace('count: 0','count: u64::MAX'));await run('bad');await layout('large diagnostics');
          await page.locator('#code').fill(capacityCode);await run('good');
        }
        if(c.lesson===3) {
          assert.match(await page.locator('#trace-results tbody th small').first().innerText(),/Returned: 0/);
          assert.match(await page.locator('#trace-results tbody td small').first().innerText(),/0 records/);
          if(c.check==='recordCancel') assert.match(await page.locator('#trace-results tbody tr').nth(14).innerText(),/Returned: None/);
        }
        if(c.lesson>=4) {
          assert.equal(await page.locator('#trace-details').evaluate(el=>el.open),false);await page.locator('#trace-summary').click();
          if(c.check==='ownerBinding') {
            const row=page.locator('#trace-results tbody tr').nth(7);await row.locator('summary').click();
            assert.match(await row.locator('pre').innerText(),/#1: 3 seats · owner B/);
          }
          if(c.check==='testAtomic') {
            const pairs=page.locator('#trace-results tbody tr').filter({has:page.locator('code',{hasText:/^confirm_pair\(3, 6\)$/})});
            assert.deepEqual(await pairs.evaluateAll(rows=>rows.map(r=>r.dataset.status)),['rejected','accepted','rejected']);
            assert.match(await pairs.first().innerText(),/Venue: 5 seats/);await pairs.first().locator('summary').click();
            assert.match(await pairs.first().locator('pre').innerText(),/#3: 2 seats · owner A · pending/);
            assert.match(await pairs.first().locator('pre').innerText(),/Venue: venue_booked\(3, 2\)/);
          }
          if(c.check==='buildDriver') {
            await page.locator('#build-results summary').click();
            assert.match(await page.locator('#build-detail').innerText(),/Contract WASM: \d+ bytes/);
            assert.match(await page.locator('#build-detail').innerText(),/Data-driver WASM: \d+ bytes/);
            assert.match(await page.locator('#build-detail').innerText(),/18446744073709551615/);
          }
        }
        for(const width of [320,390,900,901,1440]){await page.setViewportSize({width,height:950});await layout(`${c.id} results ${width}`)}
        if(['ownerBinding','eventChanges','callConfirm','buildDriver'].includes(c.check)) {
          for(const width of [390,1440]){await page.setViewportSize({width,height:950});await axe(`${c.id} results ${width}`)}
        }
        await page.reload();await waitStep(c.id);assert.equal(await page.locator('#code').inputValue(),previous);assert.equal(await page.locator('#next').isDisabled(),false);
      } else if(c.kind==='practice') {
        const before=(await saved()).checks;
        assert.equal(await page.locator('#practice-note').isVisible(),true);assert.equal(await page.locator('#next').isDisabled(),false);
        const wrong=c.choices.find(([value])=>value!==c.answer)[0];
        await page.locator(`input[value="${wrong}"]`).check();await page.locator('#quiz button').click();
        assert.equal(await page.locator('#quiz-feedback').getAttribute('data-tone'),'bad');assert.equal(await page.locator('#next').isDisabled(),false);
        await page.locator(`input[value="${c.answer}"]`).check();await page.locator('#quiz button').click();
        assert.equal(await page.locator('#quiz-feedback').getAttribute('data-tone'),'good');assert.deepEqual((await saved()).checks,before);
        await page.reload();await waitStep(c.id);assert.equal(await page.locator(`input[value="${c.answer}"]`).isChecked(),true);
      } else if(c.kind==='guide') {
        assert.equal(await page.locator('#reading-panel').isVisible(),true);assert.equal(await page.locator('#reading-title').innerText(),c.panelTitle);
      } else if(c.kind==='earned') {
        assert.equal(await page.locator('#earned-title').innerText(),lessons[c.lesson].skill);
        await page.locator('#skills-button').click();
        assert.equal((await page.locator('.skill-button small').allTextContents()).filter(s=>s==='Learned').length,c.lesson+1);
        await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'skills-button');
      }
      if(['guide','practice'].includes(c.kind)) {
        assert.equal(await page.locator('#editor').isVisible(),true);assert.match(await page.locator('#code-context').innerText(),new RegExp(lastCode.short));
        if(guideRuns.includes(c.id)) {
          const before=(await saved()).checks,request=page.waitForRequest(r=>r.url().endsWith('/api/forge'));
          await run('good');assert.equal((await request).postDataJSON().lesson,lastCode.scenario);
          assert.deepEqual((await saved()).checks,before,'reading/practice runs grade the real active task, not a new skill');
        }
      }
      if(['contract-getter','contract-state','record-model','permission-guard','build-abi'].includes(c.id)) {
        for(const width of [390,1440]) {
          await page.setViewportSize({width,height:950});await layout(`${c.id} preview ${width}`);
          await page.screenshot({path:`/tmp/academy-contract-format-${c.id}-${width}.png`,fullPage:true});
        }
      }
      if(step<chapters.length-1) await page.locator('#next').click();
    }
    assert.equal(await page.locator('#next').isVisible(),false);assert.equal((await saved()).version,3);
    assert.equal((await saved()).step,'building-learned');assert.equal((await saved()).active,'build-driver');
    const finalSave=await saved();assert.deepEqual(finalSave.checks,expectedChecks);
    // Earlier hashes keep the latest ABI, current draft and original snapshots.
    for(const id of ['state','record-read']) {
      await go(id);assert.equal(await page.locator('#code').inputValue(),finalCode);assert.match(await page.locator('#code-context').innerText(),/Build and verify/);
      const request=page.waitForRequest(r=>r.url().endsWith('/api/forge'));await run('good');assert.equal((await request).postDataJSON().lesson,'build-driver');
      assert.deepEqual((await saved()).checks,finalSave.checks);
    }
    await page.setViewportSize({width:390,height:844});await run('good');
    assert.ok(await page.locator('#feedback').evaluate(el=>{const r=el.getBoundingClientRect(),nav=document.querySelector('.lesson-actions').getBoundingClientRect();return r.top>=0&&r.bottom<=nav.top+1}),'feedback clears sticky navigation');

    for(const width of widths) {
      await page.setViewportSize({width,height:844});
      for(const [step,c] of chapters.entries()) {
        await go(c.id);await layout(`${c.id} ${width}`);
        assert.equal(await page.locator('#next').isVisible(),step<chapters.length-1);
        assert.equal(await page.locator('.task').isVisible(),Boolean(c.task));assert.equal(await page.locator('#lesson-note').isVisible(),Boolean(c.note));
        assert.equal(await page.locator('#chapters button').count(),partSteps(step).length);
        assert.equal(await page.locator('#reading-panel').isVisible(),c.kind==='guide');assert.equal(await page.locator('#quiz-panel').isVisible(),c.kind==='practice');
        assert.equal(await page.locator('#editor').isVisible(),!['intro','earned'].includes(c.kind));
        if(['intro','earned'].includes(c.kind)) {
          await page.locator('.scene-art').evaluate(img=>img.decode());
          assert.ok(Math.abs(await page.locator('.scene-art').evaluate(img=>img.clientWidth/img.clientHeight)-1.5)<.01,'scene aspect ratio');
        }
      }
    }
    for(const width of [390,1440]) {
      await page.setViewportSize({width,height:950});
      for(const c of chapters){await go(c.id);await axe(`${c.id} ${width}`)}
      for(const [button,dialog] of [['skills-button','skills'],['about-button','about']]) {
        await page.locator('#'+button).click();await axe(`${dialog} ${width}`);await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(()=>document.activeElement.id),button);
      }
    }
    // Native keyboard selection retains focus rather than moving it to the heading.
    await page.locator('#chapter-menu').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await waitStep('build-driver');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'chapter-menu');
    await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await waitStep('building-learned');
    await page.locator('#next').evaluate(button=>button.click());await waitStep('building-learned');
    await page.reload();await waitStep('building-learned');assert.equal(await page.locator('#next').isVisible(),false);
    const beforePaths=await page.evaluate(key=>localStorage.getItem(key),storageKey);
    await page.locator('#all-paths').click();await page.locator('#paths').waitFor();
    assert.equal(await page.locator('#resume-label').innerText(),'Review contracts');assert.equal(await page.locator('#contracts-progress').innerText(),'7 of 7 lessons completed');
    await assertSizes(page);assert.equal(await page.locator('#open-contracts').innerText(),'Review lessons →');
    assert.equal(await page.locator('#path-profile .character-name').innerText(),'Mira');
    for(const width of widths){await page.setViewportSize({width,height:844});await layout(`resumed entrance ${width}`)}
    for(const width of [390,1440]){await page.setViewportSize({width,height:950});await axe(`resumed entrance ${width}`)}
    await page.reload();await page.locator('#paths').waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),storageKey),beforePaths);
    await page.locator('#resume-path').click();await waitStep('building-learned');
    await page.locator('#skills-button').click();await page.locator('#skills a[href="#paths"]').click();await page.locator('#paths').waitFor();
    assert.equal(await page.locator('#skills').isVisible(),false);
    await page.locator('#resume-path').click();await page.locator('#previous').click();await waitStep('build-driver');
    assert.equal(await page.locator('#code').inputValue(),finalCode);assert.equal(await page.locator('#next').isDisabled(),false);
    assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-progress')),'keep');

    // Literal old numeric saves, not new saves mislabeled as legacy fixtures.
    const legacyChecks=through=>Object.fromEntries(chapters.filter(c=>c.kind==='code'&&c.lesson<=through).map(c=>[c.check,solutions[c.check]]));
    const legacy=[
      [{version:1,step:3,started:true,name:'Nór',source:answer+'\n// original notes',checks:legacyChecks(0)},'learned','entrypoint',1,'arguments'],
      [{version:2,step:10,active:9,started:true,name:'Nór',source:capacityCode,checks:legacyChecks(2)},'validation-learned','capacity',3,'record-storage'],
      [{version:2,step:18,active:17,started:true,name:'Nór',source:recordsCode,checks:legacyChecks(3)},'records-learned','record-cancel',4,'permission-caller'],
      [{version:2,step:34,active:33,started:true,name:'Nór',source:finalCode+'\n// unfinished build notes',checks:Object.fromEntries(Object.entries(expectedChecks).filter(([key])=>key!=='buildDriver'))},'build-artifacts','test-atomic',6,'build-driver'],
      [{version:2,step:36,active:35,started:true,name:'Nór',source:finalCode+'\n// keep this draft',checks:expectedChecks},'building-learned','build-driver',7,null],
    ];
    for(const [old,id,active,skills,nextCode] of legacy) {
      const migration=await browser.newContext();
      await migration.addInitScript(({key,raw})=>{if(!localStorage.getItem(key)) localStorage.setItem(key,raw)},{key:storageKey,raw:JSON.stringify(old)});
      const m=await migration.newPage();m.on('pageerror',error=>errors.push(error.message));await m.goto('http://localhost:5173/');
      assert.equal(await m.locator('#resume-path').getAttribute('href'),'#'+id);assert.equal(await m.locator('#contracts-progress').innerText(),`${skills} of 7 lessons completed`);
      await assertSizes(m);assert.equal(await m.locator('#open-contracts').innerText(),skills===7?'Review lessons →':'Continue lesson →');
      assert.equal(await m.evaluate(key=>localStorage.getItem(key),storageKey),JSON.stringify(old),'entrance does not rewrite legacy data');
      await m.locator('#resume-path').click();await m.locator('#contract-path').waitFor();await m.reload();
      const migrated=await m.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
      assert.equal(migrated.version,3);assert.equal(migrated.step,id);assert.equal(migrated.active,active);
      assert.equal(migrated.name,old.name);assert.equal(migrated.source,old.source);assert.deepEqual(migrated.answers,{});
      for(const [key,value] of Object.entries(old.checks)) assert.equal(migrated.checks[key],value);
      if(nextCode) {
        assert.equal(migrated.checks[chapters[index(nextCode)].check],null);
        await m.locator('#chapter-menu').focus();await m.locator('#chapter-menu').selectOption(String(index(nextCode)));
        assert.equal(await m.locator('#code').inputValue(),old.source);assert.equal(await m.locator('#next').isDisabled(),true);
        assert.equal(await m.evaluate(()=>document.activeElement.id),'chapter-menu');
      }
      await migration.close();
    }
    const blocked=await browser.newContext({viewport:{width:390,height:844}});
    await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}}));
    const b=await blocked.newPage();b.on('pageerror',error=>errors.push(error.message));
    await b.goto('http://localhost:5173/');await b.locator('#open-contracts').click();await b.locator('#save-error').waitFor();
    await b.locator('#next').click();await b.locator('#code').fill(initial);await b.locator('#run').click();await b.locator('#feedback[data-tone=good]').waitFor();
    await b.locator('.brand').click();await b.locator('#paths').waitFor();assert.equal(await b.locator('#save-error').isVisible(),true);
    await b.locator('#resume-path').click();await b.locator('#contract-path').waitFor();assert.equal(await b.locator('#code').inputValue(),initial);
    assert.equal(await b.evaluate(()=>!window.dispatchEvent(new Event('beforeunload',{cancelable:true}))),true,'failed saves protect in-memory work on exit');
    await blocked.close();
    const malformed=await browser.newContext();await malformed.addInitScript(()=>localStorage.setItem('dusk-academy-forge-lesson-v1','{bad save'));
    const bad=await malformed.newPage();bad.on('pageerror',error=>errors.push(error.message));await bad.goto('http://localhost:5173/');await bad.locator('#paths').waitFor();
    assert.equal(await bad.locator('#resume-path').isVisible(),false);assert.equal(await bad.evaluate(()=>localStorage.getItem('dusk-academy-forge-lesson-v1')),'{bad save');
    await bad.locator('#open-contracts').click();await bad.locator('#contract-path').waitFor();assert.equal(await bad.locator('#lesson').getAttribute('data-step'),'0');await malformed.close();
    assert.equal((await context.request.post('http://localhost:5173/api/forge',{data:{source:answer},headers:{Origin:'https://unrelated.invalid'}})).status(),403);
    assert.equal((await context.request.post('http://localhost:5173/api/forge',{data:{source:'x'.repeat(8001)}})).status(),400);
    for(const lesson of ['unknown','records-unknown']) assert.equal((await context.request.post('http://localhost:5173/api/forge',{data:{source:answer,lesson}})).status(),400);
    assert.deepEqual(errors,[]);
    console.log(`PASS: seven paced Forge lessons / 83 chapters, 19 optional practices, unchanged 22 real VM checks, receipts/rollback/build artifacts, v1/v2→v3 continuity, historical snapshots, active-ABI guide/review runs, ${layouts} layouts, ${axeChecks} axe checks, keyboard focus, storage, cancellation and API boundaries.`);
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
