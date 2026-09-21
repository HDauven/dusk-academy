// Optional Pages check: existing Playwright + axe tooling, no compiler or server.
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;

(async()=>{
  const {chapters,storageKey,starter}=await import('../academy/lesson.js');
  const {courses,courseKey}=await import('../academy/courses.js');
  const base='https://hdauven.github.io/dusk-academy/', root=path.resolve(__dirname,'..');
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  const errors=[], unexpected=[]; let layouts=0, axeChecks=0;
  try {
    const context=await browser.newContext({viewport:{width:1440,height:950}});
    await context.route('**/*',async route=>{
      const url=route.request().url();
      if(!url.startsWith(base)||route.request().method()!=='GET'||/\/(?:api|on)\/|-worker\.js|\/vendor\/dusk-connect\.js/.test(url)) {
        unexpected.push(url); return route.abort();
      }
      if(process.env.PAGES_LIVE==='1') return route.continue();
      const relative=new URL(url).pathname.slice(new URL(base).pathname.length)||'index.html';
      const file=path.resolve(root,decodeURIComponent(relative));
      if(!file.startsWith(root+path.sep)) { unexpected.push(url); return route.abort(); }
      try {
        const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'};
        await route.fulfill({body:await readFile(file),contentType:types[path.extname(file)]||'text/plain'});
      } catch(error) { errors.push(`${relative}: ${error.message}`); await route.abort(); }
    });
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('worker',worker=>unexpected.push(worker.url()));
    page.on('response',response=>{if(response.status()>=400) errors.push(`${response.status()} ${response.url()}`);});
    const saved=key=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    const waitStep=step=>page.waitForFunction(step=>document.querySelector('#lesson').dataset.step===String(step),step);
    const layout=async label=>{
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label); layouts++;
    };
    const axe=async label=>{
      const result=await new AxeBuilder({page}).analyze();
      assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],label); axeChecks++;
    };
    await page.goto(base); await page.locator('#hosting-note').waitFor(); await page.evaluate(()=>document.fonts.ready);
    assert.match(await page.locator('#hosting-note').innerText(),/Static preview.*Reading does not earn coding skills/);
    assert.equal(await page.locator('#hosting-note a').first().getAttribute('href'),'https://github.com/HDauven/dusk-academy#run-locally');
    assert.deepEqual(await page.locator('#dusk-size, #contracts-size, #dapps-size, #circuits-size').allTextContents(),['1 lesson · 15 chapters','7 lessons · 83 chapters','2 lessons · 23 chapters','1 lesson · 12 chapters']);
    assert.equal(await saved(storageKey),null,'entrance does not write a save');
    await page.evaluate(()=>localStorage.setItem('unrelated-progress','keep'));
    for(const width of [320,1440]) {
      await page.setViewportSize({width,height:950}); await layout('overview'); await axe('overview');
      await page.screenshot({path:`/tmp/dusk-pages-${width}.png`,fullPage:true});
    }
    for(const [id,list,key,source,url] of [
      ['contracts',chapters,storageKey,starter,base+'#begin'],
      ['dapps',courses.dapps.chapters,courseKey('dapps'),courses.dapps.starter,base+'course.html?path=dapps#begin'],
      ['circuits',courses.circuits.chapters,courseKey('circuits'),courses.circuits.starter,base+'course.html?path=circuits#begin'],
    ]) {
      await page.goto(url); await waitStep(0);
      assert.equal(await page.locator('#chapter-menu option:disabled').count(),0,'all coding chapters are browsable');
      await page.locator('#chapter-menu').selectOption('1'); await waitStep(1);
      assert.equal((await saved(key)).started,true,'jumping into a preview enables resume');
      await page.locator('#chapter-menu').selectOption('0'); await waitStep(0);
      let draft=source, edited=false;
      for(const [i,c] of list.entries()) {
        await waitStep(i);
        assert.equal(await page.locator('#code').inputValue(),draft,`${id}/${c.id}: same draft`);
        if(!['intro','earned'].includes(c.kind)) {
          if(!edited) { draft=source+'\n// Saved preview notes.'; await page.locator('#code').fill(draft); edited=true; }
          assert.equal(await page.locator('#run').isDisabled(),true);
          await page.locator('#code').press('Control+Enter');
          await page.locator('#code').press('Meta+Enter');
          // Disabled controls must also be guarded inside their handlers.
          await page.locator('#run').dispatchEvent('click');
          assert.match(await page.locator('#test-empty').innerText(),/No code runs in this preview/);
          assert.equal(await page.locator('#feedback').isVisible(),false);
        }
        if(['practice','quiz'].includes(c.kind)) {
          await page.locator(`#choices input[value="${c.answer}"]`).check();
          await page.locator('#quiz button').click();
          assert.equal(await page.locator('#quiz-feedback').getAttribute('data-tone'),'good');
        }
        if(c.wallet) {
          assert.equal(await page.locator('#wallet-demo').isVisible(),false);
          await page.locator('#find-wallet').dispatchEvent('click');
          await page.locator('#connect-wallet').dispatchEvent('click');
          assert.equal(await page.locator('#wallet-status').innerText(),'');
        }
        if(c.kind==='earned') {
          assert.equal(await page.locator('#earned').isVisible(),false,'no unearned skill claims');
          assert.match(await page.locator('#chapter-label').innerText(),/recap.*preview/i);
          assert.match(await page.locator('#story-copy summary').innerText(),/Expected results/);
        }
        assert.ok(Object.values((await saved(key)).checks).every(check=>!check),'reading and quizzes never award coding checks');
        for(const width of [320,1440]) {
          await page.setViewportSize({width,height:950}); await layout(`${id}/${c.id}/${width}`);
          if(i===0||c.kind==='earned') await axe(`${id}/${c.id}/${width}`);
        }
        if(i<list.length-1) {
          assert.equal(await page.locator('#next').isDisabled(),false,'preview can pass an unrun coding exercise');
          await page.locator('#next').click();
        }
      }
      const before=await saved(key);
      await page.reload(); await waitStep(list.length-1);
      assert.deepEqual(await saved(key),before,'preview bookmark and draft survive reload');
      await page.locator('#all-paths').click(); await page.locator('#paths').waitFor();
      assert.equal(await page.locator(`#${id}-size`).isVisible(),true);
      assert.match(await page.locator(`#open-${id}`).getAttribute('href'),new RegExp('#'+list.at(-1).id+'$'));
    }
    const contractSave=await saved(storageKey);
    await page.locator('#open-dusk').click(); await waitStep(0);
    await page.locator('#character-name-input').fill('Mira');
    assert.deepEqual(await saved(storageKey),{...contractSave,name:'Mira'},'shared name preserves the preview bookmark and draft');
    for(const [i,c] of courses.dusk.chapters.entries()) {
      await waitStep(i);
      if(c.kind==='quiz') assert.equal(await page.locator('#next').isDisabled(),true,'knowledge gates are not bypassed');
      if(['quiz','practice'].includes(c.kind)) {
        await page.locator(`#choices input[value="${c.answer}"]`).check(); await page.locator('#quiz button').click();
      }
      for(const width of [320,1440]) {
        await page.setViewportSize({width,height:950}); await layout(`dusk/${c.id}/${width}`);
        if(c.kind==='earned') await axe(`dusk/${width}`);
      }
      if(i<courses.dusk.chapters.length-1) await page.locator('#next').click();
    }
    assert.equal(await page.locator('#earned').isVisible(),true,'completed knowledge checks can earn their own skill');
    assert.equal(Object.keys((await saved(courseKey('dusk'))).checks).length,3);
    assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-progress')),'keep');
    assert.deepEqual(unexpected,[],'no backend calls, worker execution or wallet SDK loading');
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${process.env.PAGES_LIVE==='1'?'live':'mocked'} Pages project path, all 133 chapters, preview bookmarks/drafts, no coding awards or backend/worker calls, real knowledge gates, ${layouts} layouts and ${axeChecks} axe checks.`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
