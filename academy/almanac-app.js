// The dApps path: the Almanac. Learner JavaScript runs in a sandbox against the practice node.
import {startPath} from './path-app.js';
import {lessons, chapters, galleryScene, short} from './almanac-lessons.js';
import {runInSandbox} from './almanac-sandbox.js';
import {drawCreature} from './creature.js';
import {loadKeeper} from './store.js';

let fixture = null;
const getFixture = async () => fixture ??= await fetch(new URL('./vendor/almanac-fixture.json', import.meta.url)).then(r => r.json());
const run = async (source, plan, signal) => runInSandbox({source, plan}, signal);
const names = {you: 'You', rook: 'Rook', fen: 'Fen'};
const nameOf = key => names[Object.entries(fixture.keepers).find(([, v]) => v === key)?.[0]] ?? short(key);
// Values from the learner's code are data from an untrusted sandbox: escape them before they
// touch the page, and only draw a Duskling from DNA that is really digits.
const digitsOf = dna => /^\d{1,16}$/.test(String(dna)) ? String(dna).padStart(16, '0') : null;

function galleryLab(c, ctx) {
  ctx.pane.innerHTML = `<div class="panel">
      <p class="kicker">The Almanac</p><h2>Every Duskling in the Hatchery</h2>
      <p class="muted">${ctx.own ? `Built by your <code>loadAlmanac</code> from “${ctx.lastTitle}”.` : `You haven't passed “${ctx.lastTitle}” yet, so this runs the reference code.`}</p>
      <div class="play-actions"><button class="primary" data-node="up">Load the Almanac</button><button class="ghost" data-node="offline">Load from a node that's down</button></div>
    </div>
    <div class="almanac-grid" id="almanac-grid" aria-live="polite"></div>`;
  const grid = ctx.pane.querySelector('#almanac-grid');
  const load = async node => {
    grid.innerHTML = '<p class="muted">Reading the Hatchery…</p>';
    try {
      const [r] = await run(ctx.source, [{fn: 'loadAlmanac', node: node === 'offline' ? 'offline' : undefined}], ctx.signal);
      const page = r.ok ? r.value : {status: 'error', error: r.error};
      if (page?.status !== 'ok') { grid.innerHTML = `<p class="refused">The node is down, so the Almanac can't load. Try again later.</p>`; ctx.paintScene({tag: 'Node down', creatures: []}); return; }
      const esc = ctx.escapeHtml;
      grid.innerHTML = page.dusklings.map(d => {
        const digits = d.exact === false ? null : digitsOf(d.dna);
        return `<figure class="almanac-card ${digits ? '' : 'inexact'}">
          ${digits ? `<canvas width="96" height="96" data-dna="${digits}"></canvas>` : '<div class="mystery" aria-hidden="true">?</div>'}
          <figcaption><strong>Duskling #${esc(d.id)}</strong><br>Keeper: ${esc(nameOf(d.owner))}<br><code>${digits ?? `≈ ${esc(d.dna)}`}</code></figcaption></figure>`;
      }).join('');
      grid.querySelectorAll('canvas[data-dna]').forEach(cv => drawCreature(cv, cv.dataset.dna, {scale: 3}));
      ctx.paintScene({tag: `${page.dusklings.length} Dusklings`, ...galleryScene(fixture, page.dusklings)});
      ctx.played();
    } catch (error) { if (error.name !== 'AbortError') grid.innerHTML = `<p class="bad">✗ ${ctx.codeHtml(error.message)}</p>`; }
  };
  ctx.pane.querySelector('.play-actions').addEventListener('click', e => { const b = e.target.closest('[data-node]'); if (b) load(b.dataset.node); });
  load('up');
}

function hatchLab(c, ctx) {
  const keeper = loadKeeper(), name = keeper.name || 'Moonpaw';
  ctx.pane.innerHTML = `<div class="panel">
      <p class="kicker">Hatch request</p><h2>Hatching “${ctx.escapeHtml(name)}”</h2>
      <label class="dna-field"><span>Name</span><input id="hatch-name" maxlength="24" value="${ctx.escapeHtml(name)}" autocomplete="off"></label>
      <div class="play-actions"><button class="primary" id="prepare">Prepare the call</button></div>
      <p class="muted">${ctx.own ? `Using your code from “${ctx.lastTitle}”.` : `You haven't passed “${ctx.lastTitle}” yet, so this uses the reference code.`}</p>
    </div>
    <div class="console play-log" id="lab-log" tabindex="0" role="status" aria-live="polite"></div>`;
  const log = ctx.pane.querySelector('#lab-log');
  const prepare = async () => {
    const who = ctx.pane.querySelector('#hatch-name').value.trim() || 'Moonpaw';
    log.innerHTML = '<p class="log">› running your seedFromName and prepareHatch…</p>';
    try {
      const [s] = await run(ctx.source, [{fn: 'seedFromName', args: [who], pure: true}], ctx.signal);
      if (!s.ok) throw Error(s.error);
      const [p] = await run(ctx.source, [{fn: 'prepareHatch', args: [s.value]}], ctx.signal);
      if (!p.ok) throw Error(p.error);
      const call = p.value ?? {}, esc = ctx.escapeHtml;
      log.innerHTML = `<p class="ok">✓ seed for “${esc(who)}”: ${esc(s.value)}n</p>
        <p class="log">contractId: ${esc(String(call.contractId).slice(0, 18))}…</p><p class="log">fnName: "${esc(call.fnName)}"</p><p class="log">fnArgs: ${esc(call.fnArgs)}</p>
        <p class="log">privacy: "${esc(call.privacy)}", amount: "${esc(call.amount)}", deposit: "${esc(call.deposit)}"</p>
        <p class="refused">A wallet would now show this to the keeper, ask for approval, then sign and send it. This page stops here: nothing was sent.</p>`;
      ctx.played();
    } catch (error) { if (error.name !== 'AbortError') log.innerHTML = `<p class="bad">✗ ${ctx.codeHtml(error.message)}</p>`; }
  };
  ctx.pane.querySelector('#prepare').addEventListener('click', prepare);
  ctx.paintScene({tag: 'Hatch request', creatures: []});
}

startPath({
  key: 'almanac', lessons, chapters, language: 'js', pathName: 'The Almanac',
  async check(c, source, signal) {
    await getFixture();
    return c.check(await run(source, c.plan, signal), fixture);
  },
  async finale(c, ctx) {
    await getFixture();
    (c.lab === 'gallery' ? galleryLab : hatchLab)(c, ctx);
  },
});
