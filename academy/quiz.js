import {levels, chapters, levelQuizzes} from './journey.js';
import {createScene, eggSprite} from './scene.js';
import {drawCreature, sprite, traitNames, GENE_COLORS, GEAR_INFO} from './creature.js';
import {load, store, favicon, loadKeeper, saveKeeper} from './store.js';
import {WICK, SAMPLE, deploy, reference, seedFromName, pad16, friendly} from './lesson1.js';

const $ = s => document.querySelector(s);
const DEFAULTS = {at: 0, answers: {}};
let save = load('journey', DEFAULTS);
const persist = () => store('journey', save);
let keeper = loadKeeper();

const scene = createScene($('#scene'), {kind: 'harbor'});
favicon(sprite(WICK));
drawCreature($('#wick-face'), WICK, {scale: 2});

let at = 0;
const chapter = () => chapters[at];
const right = c => !!save.answers[c.id]?.right;
const lit = l => levelQuizzes(l).map(right);
const levelDone = l => lit(l).every(Boolean);
const done = c => c.kind === 'intro' ? true : c.kind === 'quiz' ? right(c) : levelDone(c.level) && (c.level > 0 || !!keeper.dna);
const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const firstOpen = l => levelQuizzes(l).find(c => !right(c));

function paintScene(animate) {
  const l = chapter().level, on = lit(l);
  scene.show({keeper: WICK, companion: keeper.dna || null, egg: !keeper.dna, gear: keeper.gear, lanterns: on.length, lit: on, animate});
  $('#scene-tag').textContent = `Level ${l + 1} · lanterns ${on.filter(Boolean).length} / ${on.length}`;
}

function renderProgress() {
  const l = chapter().level, list = chapters.filter(c => c.level === l);
  $('#pips').innerHTML = list.map(c => `<li class="${done(c) ? 'done' : ''} ${c === chapter() ? 'here' : ''}"></li>`).join('');
  $('#count').textContent = `${list.indexOf(chapter()) + 1} / ${list.length}`;
  $('#level-kicker').textContent = `Level ${l + 1}`;
  $('#level-title').textContent = levels[l].title;
  $('#menu-list').innerHTML = levels.map((lv, i) => {
    const n = lit(i).filter(Boolean).length, total = levelQuizzes(i).length;
    const head = `<li class="menu-level ${levelDone(i) ? 'done' : ''}"><strong>Level ${i + 1} · ${lv.title}</strong><span>${lv.topic} · ${n} / ${total} lit · ${lv.reward ? GEAR_INFO[lv.reward] : 'your Duskling'}</span></li>`;
    return head + chapters.map((ch, k) => ch.level !== i ? '' :
      `<li class="${ch.kind === 'quiz' && done(ch) ? 'done' : ''} ${k === at ? 'here' : ''}"><button data-go="${k}"><span class="n">${ch.kind === 'quiz' ? '◆' : ch.kind === 'intro' ? '▸' : '★'}</span>${ch.title}<span class="s">${ch.kind === 'quiz' ? (done(ch) ? '✓ lit' : '') : ch.kind === 'finale' ? (done(ch) ? '✓ reward' : 'reward') : ''}</span></button></li>`).join('');
  }).join('');
}

function setNext() {
  const c = chapter(), last = at === chapters.length - 1, ok = c.kind !== 'quiz' || done(c);
  $('#next').hidden = last;
  $('#next').disabled = !ok;
  $('#next').classList.toggle('ready', ok && c.kind === 'quiz');
  $('#next').innerHTML = c.kind === 'finale' ? `Level ${c.level + 2} <span aria-hidden="true">→</span>` : 'Next <span aria-hidden="true">→</span>';
  $('#prev').disabled = at === 0;
}

// ---- Visuals --------------------------------------------------------------------------------
const creature = (dna, size, gear = keeper.gear) => `<canvas data-dna="${dna}" data-gear="${gear.join(',')}" width="${size}" height="${size}" class="pixel" aria-hidden="true"></canvas>`;
const egg = size => `<canvas data-egg width="${size}" height="${size}" class="pixel" aria-hidden="true"></canvas>`;
const remaining = l => `<p class="muted">Light the remaining lanterns to earn it:</p><ul class="todo">${levelQuizzes(l).filter(c => !right(c)).map(c => `<li><button type="button" class="linkish" data-goto="${c.id}">${c.title}</button></li>`).join('')}</ul>`;

const VISUALS = {
  level: () => {
    const l = chapter().level, lv = levels[l], reward = lv.reward;
    const preview = keeper.dna ? creature(keeper.dna, 128, reward ? [...new Set([...keeper.gear, reward])] : keeper.gear) : egg(128);
    return `<div class="panel level-card">
      <div><p class="kicker">Level ${l + 1} · ${lv.topic}</p><h2>${lv.title}</h2>
      <ol class="stops">${levelQuizzes(l).map(q => `<li class="${right(q) ? 'on' : ''}"><span class="lamp" aria-hidden="true"></span>${q.title}</li>`).join('')}</ol></div>
      <figure class="reward-preview">${preview}<figcaption>Reward<br><strong>${reward ? GEAR_INFO[reward] : 'Your own Duskling'}</strong></figcaption></figure>
    </div>
    <button type="button" class="primary map-start" data-action="start">${lit(l).some(Boolean) ? 'Continue' : 'Start level'} <span aria-hidden="true">→</span></button>`;
  },
  nodes: () => `<div class="panel"><p class="kicker">Five nodes, one ledger</p><div class="nodes">${['Aster', 'Brine', 'Cove', 'Drift', 'Ember'].map((n, i) => `<div class="node"><strong>Node ${n}</strong><span>block 1,204</span><span>5 Dusklings</span><em class="${i === 2 ? 'busy' : ''}">${i === 2 ? 'checking…' : '✓ same rules'}</em></div>`).join('')}</div></div>`,
  apps: () => `<div class="panel"><p class="kicker">Two apps, one contract</p><div class="mocks">
    <div class="mock"><p class="mock-title">The Almanac</p><div class="mini-dusklings">${[SAMPLE[0], SAMPLE[1], SAMPLE[2], '0111777324930839', '2018107282932423'].map(d => creature(d, 64, [])).join('')}</div></div>
    <div class="mock"><p class="mock-title">Keeper app</p><p class="big-number">5</p><p class="muted">Dusklings hatched</p></div>
  </div><p class="reads">Both read <code>Hatchery · dusklings.len() = 5</code></p></div>`,
  wallet: () => `<div class="panel wallet-demo"><div class="wallet-popup">
    <p class="wallet-title">Keeper wallet</p>
    <p>The Hatchery wants to call <code>hatch(seed: 42)</code>.</p>
    <p class="muted">A network fee in DUSK applies.</p>
    <div class="row"><button type="button" class="ghost small" data-wallet="reject">Reject</button><button type="button" class="primary small" data-wallet="approve">Approve</button></div>
    <p class="wallet-note" id="wallet-note"></p>
  </div><p class="muted warn">A real wallet asks you to approve. It never asks you to type your recovery phrase into a website.</p></div>`,
  lifecycle: () => `<div class="panel"><p class="kicker">From request to final</p><ol class="lifecycle">
    <li><b>Signed</b><span>You approve it in your wallet.</span></li>
    <li><b>Submitted</b><span>A node accepts it and you get a hash.</span></li>
    <li><b>Executed</b><span>It runs in a block and either succeeds or fails. Gas is paid either way.</span></li>
    <li><b>Final</b><span>The block is settled and can't be replaced.</span></li>
  </ol></div>`,
  transfer: () => transferPanel('moonlight'),
  'transfer-phoenix': () => transferPanel('phoenix'),
  proof: () => `<div class="panel"><p class="kicker">Secret stats</p>
    <div class="cards"><div class="card-face" data-secret="4"><small>strength</small><b>?</b></div><span class="op">+</span><div class="card-face" data-secret="5"><small>agility</small><b>?</b></div><span class="op">=</span><div class="card-face public"><small>power</small><b>9</b></div></div>
    <p class="verdict">Verifier: <strong>✓ proof valid</strong>. It never sees the two cards.</p>
    <button type="button" class="ghost small" id="peek">Peek as the prover</button></div>`,
  license: () => `<div class="panel"><p class="kicker">Your Guild license: choose what to show</p>
    <ul class="license">${[['name', 'Name', 'Mira Vale'], ['born', 'Born', '12 April 2001'], ['home', 'Home', '3 Lantern Row'], ['valid', 'Guild license', 'valid ✓']].map(([k, l, v]) => `<li><label><input type="checkbox" data-attr="${k}" checked> <span>${l}</span> <b>${v}</b></label></li>`).join('')}</ul>
    <p class="gate" id="gate"></p></div>`,
  citadel: () => `<div class="panel"><p class="kicker">Three parties, one proof</p><ol class="flow">
    <li><b>Keeper</b><span>Shows documents to the Guild, off-chain.</span></li>
    <li><b>Keepers' Guild</b><span>Checks them, signs the attributes and registers a license.</span></li>
    <li><b>Keeper</b><span>Proves to the arena that they hold a valid license.</span></li>
    <li><b>Night Arena</b><span>Sees the proof, never the documents.</span></li></ol></div>`,
  zk: () => `<div class="panel"><p class="kicker">A private dApp on Dusk</p><ol class="flow three">
    <li><b>Circuit</b><span>Written with dusk-plonk: “power ≥ 50”.</span></li>
    <li><b>Keeper's device</b><span>Creates a proof from the secret stats.</span></li>
    <li><b>Contract</b><span><code>abi::verify_plonk</code> says yes or no. The stats never go on-chain.</span></li></ol></div>`,
  dvp: () => `<div class="panel"><p class="kicker">One call, two legs</p>
    <div class="toggle" role="radiogroup" aria-label="Payment outcome"><button type="button" role="radio" data-pay="ok">Payment succeeds</button><button type="button" role="radio" data-pay="fail">Payment fails</button></div>
    <ul class="legs"></ul></div>`,
  sortition: () => `<div class="panel"><p class="kicker">Stake-weighted draw</p><ul class="provisioners"></ul>
    <div class="row"><button type="button" class="ghost small" data-draw>Draw the next round</button><span class="muted round"></span></div></div>`,
  steps: () => `<div class="panel"><p class="kicker">One round of Succinct Attestation</p><ol class="lifecycle three">
    <li><b>Proposal</b><span>A chosen provisioner proposes a candidate block.</span></li>
    <li><b>Validation</b><span>A committee checks it and votes.</span></li>
    <li><b>Ratification</b><span>A second committee votes on the validation result.</span></li></ol>
    <p class="reads">Then: attested → confirmed → final</p></div>`,
  hatch: () => {
    const ready = levelDone(0);
    return `<div class="panel hatch-panel">
      ${keeper.dna ? '' : egg(128)}
      <form class="hatch-form" data-hatch>
        <label for="name-input">${keeper.dna ? 'Hatch again, or keep your Duskling' : 'Name your Duskling'}</label>
        <div class="row"><input id="name-input" maxlength="24" autocomplete="off" spellcheck="false" placeholder="Moonpaw" required value="${escapeHtml(keeper.name)}" ${ready ? '' : 'disabled'}><button class="primary" ${ready ? '' : 'disabled'}>Hatch <span aria-hidden="true">✦</span></button></div>
        <p class="muted hatch-note">${ready ? 'Same name, same Duskling. Every time, on every node.' : ''}</p>
      </form>
      ${ready ? '' : remaining(0)}
    </div>${keeper.dna ? keeperCard() : ''}`;
  },
  reward: () => {
    const l = chapter().level, gear = levels[l].reward, earned = levelDone(l);
    if (earned && !keeper.gear.includes(gear)) { keeper.gear = [...keeper.gear, gear]; saveKeeper(keeper); paintScene(false); }
    const last = l === levels.length - 1;
    return `<div class="panel reward-panel">${earned
      ? `${keeper.dna ? creature(keeper.dna, 192) : egg(128)}
         <div><p class="kicker">Level ${l + 1} complete</p><h2>${GEAR_INFO[gear]}</h2>
         <p>${keeper.dna ? `${escapeHtml(keeper.name)} is wearing it now, in every path.` : 'Hatch your Duskling at the end of Level 1 and it will wear this.'}</p>
         ${keeper.dna ? '' : '<button type="button" class="ghost small" data-goto="hatch">Go to the hatching</button>'}</div>`
      : `<div><p class="kicker">Reward: ${GEAR_INFO[gear]}</p>${remaining(l)}</div>`}</div>
      ${last ? pathTiles() : ''}`;
  },
};

function transferPanel(model) {
  return `<div class="panel" data-model-default="${model}"><p class="kicker">What an observer sees</p>
    <div class="toggle" role="radiogroup" aria-label="Transaction model"><button type="button" role="radio" data-model="moonlight">Moonlight</button><button type="button" role="radio" data-model="phoenix">Phoenix</button></div>
    <dl class="observer"></dl></div>`;
}
function keeperCard() {
  return `<div class="card small-card">${creature(keeper.dna, 128)}<div><p class="kicker">Your Duskling</p><h2>${escapeHtml(keeper.name)}</h2>
    <p class="dna">${[...Array(8)].map((_, i) => `<b style="color:${GENE_COLORS[i]}">${keeper.dna.slice(i * 2, i * 2 + 2)}</b>`).join('')}</p>
    <dl class="traits">${traitNames(keeper.dna).map(t => `<dt>${t.label}</dt><dd>${t.value}</dd>`).join('')}</dl></div></div>`;
}
function pathTiles() {
  return `<div class="paths-grid">
    <a class="path-tile" href="hatchery.html">${creature(SAMPLE[1], 64, [])}<span class="kicker">Contracts</span><strong>The Hatchery</strong><span class="muted">Write the Rust contract that hatched your Duskling.</span></a>
    <a class="path-tile" href="almanac.html">${creature(SAMPLE[2], 64, [])}<span class="kicker">dApps</span><strong>The Almanac</strong><span class="muted">Read every Duskling from a browser with Dusk Connect.</span></a>
    <a class="path-tile" href="secret-stats.html">${creature('1335947248835871', 64, [])}<span class="kicker">Circuits</span><strong>Secret stats</strong><span class="muted">Prove your Duskling's power without revealing its stats.</span></a>
  </div><a class="ghost home-link" href="./">Back to all paths</a>`;
}

function drawCanvases(box) {
  box.querySelectorAll('canvas[data-dna]').forEach(c => drawCreature(c, c.dataset.dna, {scale: Math.floor(c.width / 32), gear: c.dataset.gear ? c.dataset.gear.split(',') : []}));
  box.querySelectorAll('canvas[data-egg]').forEach(c => {
    const g = c.getContext('2d'), s = Math.floor(c.height / 16);
    g.imageSmoothingEnabled = false;
    g.drawImage(eggSprite('0000000000000000'), (c.width - 14 * s) / 2, (c.height - 16 * s) / 2, 14 * s, 16 * s);
  });
}

// Per-visual behaviour, wired to a fresh container each time.
const WIRE = {
  transfer: box => wireTransfer(box), 'transfer-phoenix': box => wireTransfer(box),
  proof: box => box.querySelector('#peek').addEventListener('click', e => {
    const open = e.target.getAttribute('aria-pressed') !== 'true';
    e.target.setAttribute('aria-pressed', String(open));
    e.target.textContent = open ? 'Hide the cards' : 'Peek as the prover';
    box.querySelectorAll('[data-secret] b').forEach(b => { b.textContent = open ? b.parentElement.dataset.secret : '?'; });
  }),
  license: box => {
    const judge = () => {
      const shown = [...box.querySelectorAll('[data-attr]:checked')].map(i => i.dataset.attr), extra = shown.filter(a => a !== 'valid');
      const gate = box.querySelector('#gate');
      gate.className = 'gate ' + (!shown.includes('valid') ? 'bad' : extra.length ? 'warn' : 'ok');
      gate.textContent = !shown.includes('valid') ? 'Gate: I can’t see a valid Guild license, so I can’t let you in.'
        : extra.length ? `Gate: welcome in, but I didn’t need your ${extra.map(a => ({name: 'name', born: 'birthday', home: 'address'})[a]).join(' or ')}.`
        : 'Gate: valid Guild license. Welcome to the arena! ✓';
    };
    box.addEventListener('change', judge); judge();
  },
  dvp: box => {
    const paint = pay => {
      box.querySelectorAll('[data-pay]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.pay === pay)));
      const ok = pay === 'ok';
      box.querySelector('.legs').innerHTML = [['Harbor Bond', 'seller → buyer'], ['25 DUSK', 'buyer → seller']].map(([a, d], i) =>
        `<li class="${ok ? 'ok' : 'undone'}"><b>${a}</b><span>${d}</span><em>${ok ? '✓ moved' : i === 1 ? '✗ failed' : '↺ rolled back'}</em></li>`).join('')
        + `<li class="result ${ok ? 'ok' : 'undone'}">${ok ? 'Both legs settled together.' : 'Nothing moved. Both sides are exactly where they started.'}</li>`;
    };
    box.addEventListener('click', e => { const b = e.target.closest('[data-pay]'); if (b) paint(b.dataset.pay); });
    paint('ok');
  },
  sortition: box => {
    const provs = [['Aster', 1000], ['Brine', 4000], ['Cove', 2500], ['Drift', 1200], ['Ember', 8000], ['Fern', 3000]], total = provs.reduce((a, [, s]) => a + s, 0);
    let round = 1204;
    const draw = () => {
      // The same round always draws the same committee; more stake means more seats on average.
      const seats = new Map();
      for (let k = 0; k < 8; k++) {
        let x = (Math.imul(round, 0x9e3779b1) ^ Math.imul(k + 1, 0x85ebca77)) >>> 0;
        x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0; x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0; x = (x ^ (x >>> 16)) >>> 0;
        let t = Math.floor(x / 4294967296 * total);
        const [name] = provs.find(([, s]) => (t -= s) < 0);
        seats.set(name, (seats.get(name) ?? 0) + 1);
      }
      box.querySelector('.provisioners').innerHTML = provs.map(([n, s]) => `<li class="${seats.has(n) ? 'picked' : ''}"><b>${n}</b><span class="stakebar"><i style="width:${s / 80}%"></i></span><span>${s.toLocaleString('en')} DUSK</span><em>${seats.has(n) ? `✓ ${seats.get(n)} seat${seats.get(n) > 1 ? 's' : ''}` : ''}</em></li>`).join('');
      box.querySelector('.round').textContent = `Round ${round.toLocaleString('en')}`;
    };
    box.querySelector('[data-draw]').addEventListener('click', () => { round++; draw(); });
    draw();
  },
  hatch: box => box.querySelector('[data-hatch]').addEventListener('submit', e => {
    e.preventDefault();
    const name = box.querySelector('#name-input').value.trim();
    if (!name) return;
    let dna;
    try {
      const c = deploy(reference);
      c.call('hatch', seedFromName(name));
      dna = pad16(c.events.at(-1).fields.dna);
    } catch (error) { box.querySelector('.hatch-note').textContent = 'The Hatchery failed: ' + friendly(error).text; return; }
    const first = !keeper.dna;
    keeper = {...keeper, name, dna}; saveKeeper(keeper);
    paintScene(true);
    $('#toast').textContent = `${name} hatched!`;
    setTimeout(() => { mountVisual('hatch'); renderProgress(); setNext(); }, first && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 1300 : 0);
  }),
};
function wireTransfer(box) {
  const views = {
    moonlight: [['From', 'keeper account 7f3a…c21'], ['To', 'hatchery account 0b9e…44d'], ['Amount', '25 DUSK'], ['Check', 'signature ✓']],
    phoenix: [['From', '▒▒▒▒ shielded'], ['To', '▒▒▒▒ shielded'], ['Amount', '▒▒▒▒ shielded'], ['Check', 'zero-knowledge proof ✓']],
  };
  const paint = model => {
    box.querySelectorAll('[data-model]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.model === model)));
    box.querySelector('.observer').innerHTML = views[model].map(([k, v]) => `<dt>${k}</dt><dd class="${v.includes('▒') ? 'hidden-val' : ''}">${v}</dd>`).join('');
  };
  box.addEventListener('click', e => { const b = e.target.closest('[data-model]'); if (b) paint(b.dataset.model); });
  paint(box.querySelector('[data-model-default]').dataset.modelDefault);
}

function mountVisual(kind) {
  // A fresh container per chapter, so listeners never pile up.
  const box = document.createElement('div');
  $('#visual').replaceChildren(box);
  $('#visual').hidden = !kind;
  box.innerHTML = kind ? VISUALS[kind]() : '';
  drawCanvases(box);
  box.addEventListener('click', e => {
    const go = e.target.closest('[data-goto]');
    if (go) show(chapters.findIndex(c => c.id === go.dataset.goto));
    if (e.target.closest('[data-action=start]')) {
      const l = chapter().level, open = firstOpen(l);
      show(chapters.indexOf(open ?? chapters.find(c => c.level === l && c.kind === 'finale')));
    }
    const w = e.target.closest('[data-wallet]');
    if (w) box.querySelector('#wallet-note').textContent = w.dataset.wallet === 'approve' ? 'Signed with your key. The key itself never left the wallet.' : 'Rejected. Nothing was signed and nothing was sent.';
  });
  WIRE[kind]?.(box);
}

// ---- Questions ------------------------------------------------------------------------------
function renderQuestion(c) {
  $('#question').hidden = c.kind !== 'quiz';
  if (c.kind !== 'quiz') return;
  const state = save.answers[c.id] ?? {tried: []};
  $('#question-text').textContent = c.question;
  $('#choices').innerHTML = c.choices.map((ch, i) => {
    const tried = state.tried?.includes(ch.id), mark = tried ? (ch.right ? 'right' : 'wrong') : '';
    return `<button type="button" class="choice ${mark}" data-choice="${ch.id}" ${state.right ? 'disabled' : ''}><span class="letter">${'ABC'[i]}</span><span>${escapeHtml(ch.text)}</span></button>`;
  }).join('');
  const last = state.tried?.at(-1), pick = c.choices.find(ch => ch.id === last);
  $('#feedback').className = 'feedback' + (pick ? (pick.right ? ' ok' : ' bad') : '');
  $('#feedback').textContent = pick ? pick.why : '';
}

$('#choices').addEventListener('click', e => {
  const b = e.target.closest('[data-choice]'), c = chapter();
  if (!b || b.disabled) return;
  const pick = c.choices.find(ch => ch.id === b.dataset.choice);
  const state = save.answers[c.id] ?? {tried: []};
  if (!state.tried.includes(pick.id)) state.tried.push(pick.id);
  if (pick.right) state.right = true;
  save.answers[c.id] = state; persist();
  renderQuestion(c);
  if (pick.right) {
    paintScene(true);
    $('#toast').textContent = levelDone(c.level) ? 'All lanterns lit!' : 'Lantern lit!';
    renderProgress(); setNext();
    $('#next').focus({preventScroll: true});
  } else {
    const again = $(`[data-choice="${pick.id}"]`);
    again.classList.add('shake'); again.focus({preventScroll: true});
    $('#toast').textContent = '';
  }
});

// ---- Navigation -----------------------------------------------------------------------------
function show(i, {focus = true} = {}) {
  at = Math.max(0, Math.min(chapters.length - 1, i));
  save.at = at; persist();
  const c = chapter(), l = c.level, quizzes = levelQuizzes(l);
  history.replaceState(null, '', '#' + c.id);
  $('#chapter-kicker').textContent = c.kind === 'quiz' ? `Level ${l + 1} · question ${quizzes.indexOf(c) + 1} of ${quizzes.length}` : c.kind === 'intro' ? `Level ${l + 1} · ${levels[l].topic}` : `Level ${l + 1} · reward`;
  $('#chapter-title').textContent = c.title;
  $('#wick').hidden = !c.wick;
  $('#wick-line').innerHTML = c.wick ?? '';
  $('#chapter-body').innerHTML = c.body;
  $('#toast').textContent = '';
  mountVisual(c.visual);
  renderQuestion(c);
  paintScene(false);
  renderProgress(); setNext();
  $('#chapter').scrollTop = 0; document.querySelector('.quiz-bench').scrollTop = 0;
  if (focus) $('#chapter').focus({preventScroll: true});
}

$('#next').addEventListener('click', () => show(at + 1));
$('#prev').addEventListener('click', () => show(at - 1));
$('#menu-button').addEventListener('click', () => { renderProgress(); $('#menu').showModal(); });
$('#menu-list').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { $('#menu').close(); show(Number(b.dataset.go)); } });
$('#reset').addEventListener('click', () => { save = structuredClone(DEFAULTS); persist(); keeper = {...keeper, gear: []}; saveKeeper(keeper); $('#menu').close(); show(0); });
window.addEventListener('hashchange', () => { const i = chapters.findIndex(c => '#' + c.id === location.hash); if (i >= 0 && i !== at) show(i); });

const fromHash = chapters.findIndex(c => '#' + c.id === location.hash);
show(fromHash >= 0 ? fromHash : save.at ?? 0, {focus: false});
