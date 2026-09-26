// End-to-end: the whole site over real static HTTP at a project subpath, like GitHub Pages.
// Walks every journey chapter and every Hatchery chapter, plays each playground, checks narrow
// layouts, and runs axe accessibility audits when @axe-core/playwright is installed.
//
//   CHROMIUM_PATH=/path/to/chrome NODE_PATH=/path/to/node_modules npm run test:e2e
const assert = require('node:assert/strict');
const {mkdtemp, symlink, rm} = require('node:fs/promises');
const {spawn} = require('node:child_process');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');
let AxeBuilder = null;
try { AxeBuilder = require('@axe-core/playwright').default; } catch {}

(async () => {
  const {chapters: code} = await import('../academy/course.js');
  const {chapters: journey} = await import('../academy/journey.js');
  const {chapters: stats} = await import('../academy/stats-lessons.js');
  const {chapters: almanac} = await import('../academy/almanac-lessons.js');
  const root = path.resolve(__dirname, '..');
  const web = await mkdtemp(path.join(tmpdir(), 'dusklings-static-'));
  await symlink(root, path.join(web, 'dusklings'));
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', web], {stdio: ['ignore', 'pipe', 'ignore']});
  let browser;
  const errors = [], outside = [];
  try {
    const port = await new Promise((resolve, reject) => {
      server.stdout.once('data', d => { const m = String(d).match(/port (\d+)/); m ? resolve(m[1]) : reject(Error(String(d))); });
      server.once('exit', c => reject(Error('Static server exited: ' + c)));
    });
    const base = `http://127.0.0.1:${port}/dusklings/`;
    browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox']});
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      outside.push(url); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    const go = async (file, hash = '') => { await page.goto(base + file + (hash ? '#' + hash : '')); await page.waitForTimeout(60); };
    let audits = 0;
    const audit = async label => {
      if (!AxeBuilder) return;
      const {violations} = await new AxeBuilder({page}).analyze();
      const serious = violations.filter(v => ['serious', 'critical'].includes(v.impact));
      assert.deepEqual(serious.map(v => `${v.id}: ${v.nodes.length}`), [], `${label}: accessibility violations`);
      audits++;
    };

    // Progress saved under the old name moves to the new keys.
    await go('');
    await page.evaluate(() => localStorage.setItem('dusk-academy:almanac:v1', '{"migrated":true}'));
    await go('');
    assert.deepEqual(await page.evaluate(() => [localStorage.getItem('dusklings:almanac:v1'), localStorage.getItem('dusk-academy:almanac:v1')]),
      ['{"migrated":true}', null], 'old progress moves to the dusklings keys');
    await page.evaluate(() => localStorage.clear());

    // The developer creature sheet renders every trait, under the page's CSP.
    await go('creatures.html');
    assert.ok(await page.locator('canvas').count() > 50, 'the creature sheet draws its Dusklings');

    // Home, fresh.
    await go('');
    assert.equal(await page.locator('.path').count(), 4);
    assert.equal(await page.locator('.path.soon').count(), 0, 'every path is available');
    assert.match(await page.textContent('#hero-primary'), /journey/i);
    await audit('home');

    // Keeper's journey: every chapter, one wrong answer, the hatch and all the gear.
    for (const c of journey) {
      await go('journey.html', c.id);
      if (c.kind === 'quiz') {
        const wrong = c.choices.find(x => !x.right), right = c.choices.find(x => x.right);
        if (c.id === 'ledger') {
          await page.click(`[data-choice="${wrong.id}"]`);
          assert.match(await page.getAttribute('#feedback', 'class'), /bad/);
          assert.ok(await page.isDisabled('#next'), 'Next waits for the right answer');
          await audit('journey question');
        }
        await page.click(`[data-choice="${right.id}"]`);
        assert.match(await page.getAttribute('#feedback', 'class'), /ok/, `${c.id}: the right answer is accepted`);
      }
      if (c.id === 'hatch') { await page.fill('#name-input', 'Moonpaw'); await page.click('[data-hatch] .primary'); await page.waitForTimeout(1500); }
    }
    const keeper = await page.evaluate(() => JSON.parse(localStorage.getItem('dusklings:keeper:v1')));
    assert.equal(keeper.name, 'Moonpaw');
    assert.deepEqual([...keeper.gear].sort(), ['badge', 'cloak', 'lantern', 'satchel']);

    // Hatchery: every code chapter fails from its start and passes with its answer; every playground plays.
    for (const c of code) {
      await go('hatchery.html', c.id);
      if (c.kind === 'code') {
        await page.click('#check-button');
        assert.equal(await page.locator('#console .bad').count(), 1, `${c.id}: the starting file should fail`);
        await page.click('#answer-button'); await page.click('#use-answer'); await page.click('#check-button');
        assert.equal(await page.locator('#console .win').count(), 1, `${c.id}: the answer should pass`);
        if (c.id === 'contract') await audit('hatchery code chapter');
      }
      if (c.playground) {
        for (let i = 0; i < c.playground.actions.length; i++) await page.click(`[data-act="${i}"]`);
        assert.equal(await page.locator('#play-log .bad').count(), 0, `${c.id}: playground actions only succeed or refuse`);
        assert.ok(await page.locator('#play-log .refused, #play-log .ok').count() >= c.playground.actions.length);
        if (c.id === 'trade-day') await audit('playground');
        if (c === code.at(-1)) assert.equal(await page.locator('.course-end .path-tile').count(), 3, 'the Hatchery ends with the other paths');
      }
    }

    // Secret stats and the Almanac: real proofs in a worker, real Dusk Connect in the sandbox.
    const settle = () => page.waitForFunction(() => document.querySelector('#console .win, #console .bad') && !document.querySelector('#check-button').disabled, null, {timeout: 120000});
    for (const [file, list] of [['secret-stats.html', stats], ['almanac.html', almanac]]) {
      for (const c of list) {
        await go(file, c.id);
        if (c.kind === 'code') {
          await page.click('#check-button'); await settle();
          assert.equal(await page.locator('#console .bad').count(), 1, `${file}#${c.id}: the starting file should fail`);
          await page.click('#answer-button'); await page.click('#use-answer'); await page.click('#check-button'); await settle();
          assert.equal(await page.locator('#console .win').count(), 1, `${file}#${c.id}: the answer should pass: ${await page.textContent('#console')}`);
          if (list.indexOf(c) === 1) await audit(`${file} code chapter`);
        }
        if (c.kind === 'finale' && file === 'secret-stats.html') {
          for (const b of await page.locator('[data-lab]').all()) {
            await b.click();
            await page.waitForFunction(() => { const last = [...document.querySelectorAll('#lab-log p')].at(-1); return last && !last.textContent.startsWith('›'); }, null, {timeout: 120000});
          }
          assert.equal(await page.locator('#lab-log .bad').count(), 0, `${c.id}: the proof lab ran cleanly`);
          assert.ok(await page.locator('#lab-log .ok, #lab-log .refused').count() >= 2);
        }
        if (c.id === 'almanac-lab') {
          await page.waitForSelector('.almanac-card', {timeout: 60000});
          assert.equal(await page.locator('.almanac-card').count(), 6);
          assert.equal(await page.locator('.almanac-card.inexact').count(), 1, 'Duskling #3 is shown as inexact');
          await audit('almanac gallery');
        }
        if (c.id === 'hatch-lab') {
          await page.click('#prepare');
          await page.waitForSelector('#lab-log .refused', {timeout: 60000});
          assert.match(await page.textContent('#lab-log'), /fnName: "hatch"/);
        }
        if (c === list.at(-1)) { await page.waitForSelector('.course-end', {timeout: 60000}); assert.equal(await page.locator('.course-end .path-tile').count(), 3, `${file} ends with the other paths`); }
      }
    }

    // Home again: both paths finished, and the Duskling shows up wearing its gear.
    await go('');
    assert.match(await page.textContent('#journey-go'), /Review/);
    assert.match(await page.textContent('#contracts-go'), /Review/);
    assert.ok(await page.isVisible('#yours'));
    assert.match(await page.textContent('#yours-traits'), /Lighthouse lantern/);

    // Hostile data stays text: a crafted name, and Almanac "learner code" that returns HTML.
    const noScriptRan = async where => { await page.waitForTimeout(150); assert.deepEqual(await page.evaluate(() => [window.__pwned, window.pw]), [undefined, undefined], `${where}: injected script ran`); };
    const hostileName = '"><img src onerror=pw=1>';
    await page.evaluate(name => localStorage.setItem('dusklings:keeper:v1', JSON.stringify({...JSON.parse(localStorage.getItem('dusklings:keeper:v1')), name})), hostileName);
    await go('');
    assert.ok((await page.textContent('#journey-map')).includes(`${hostileName} hatched`), 'the name is shown as text');
    await noScriptRan('home');
    const tag = '<img src=x onerror="__pwned=1">';
    const hostileCode = `export function createApp() { return {readContract() {}}; }
export async function loadAlmanac() { const x = ${JSON.stringify(tag)}; return {status: "ok", dusklings: [{id: x, dna: x, owner: x}]}; }
export function seedFromName() { return ${JSON.stringify(tag)}; }
export async function prepareHatch() { const x = ${JSON.stringify(tag)}; return {contractId: x, fnName: x, fnArgs: x, privacy: x, amount: x, deposit: x}; }`;
    await page.evaluate(src => { const s = JSON.parse(localStorage.getItem('dusklings:almanac:v1')); localStorage.setItem('dusklings:almanac:v1', JSON.stringify({...s, passed: {...s.passed, offline: src, 'prepare-transfer': src}})); }, hostileCode);
    await go('almanac.html', 'almanac-lab');
    await page.waitForSelector('.almanac-card', {timeout: 60000});
    assert.ok((await page.textContent('#almanac-grid')).includes(tag), 'the gallery shows returned values as text');
    await noScriptRan('almanac gallery');
    await go('almanac.html', 'hatch-lab');
    assert.equal(await page.inputValue('#hatch-name'), hostileName, 'the name stays inside the input');
    await page.click('#prepare');
    await page.waitForSelector('#lab-log .refused', {timeout: 60000});
    assert.ok((await page.textContent('#lab-log')).includes(tag), 'the hatch request shows returned values as text');
    await noScriptRan('hatch request');
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dusklings:almanac:v1')); delete s.passed.offline; delete s.passed['prepare-transfer']; localStorage.setItem('dusklings:almanac:v1', JSON.stringify(s)); });

    // Narrow screens: no sideways scrolling.
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({width, height: 800});
      for (const [file, hash] of [['', ''], ['journey.html', 'disclosure'], ['hatchery.html', 'events'], ['hatchery.html', 'trade-day'], ['secret-stats.html', 'range'], ['almanac.html', 'almanac-lab']]) {
        await go(file, hash);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(overflow <= 1, `${file || 'home'}#${hash} at ${width}px scrolls sideways by ${overflow}px`);
      }
    }

    assert.deepEqual(outside, [], 'no requests leave the site');
    assert.deepEqual(errors, [], 'no page errors, console errors or failed requests');
    console.log(`PASS: ${journey.length} journey, ${code.length} Hatchery, ${stats.length} Secret stats and ${almanac.length} Almanac chapters; ${audits} accessibility audits${AxeBuilder ? '' : ' (axe not installed)'}.`);
  } finally {
    await browser?.close();
    server.kill();
    await rm(web, {recursive: true, force: true});
  }
})().catch(error => { console.error(error); process.exit(1); });
