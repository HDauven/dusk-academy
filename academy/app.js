import {lessons, chapters, lessonCode} from './course.js';
import {deploy, friendly, seedFromName, pad16, WICK, KEEPERS} from './contract.js';
import {Rejection} from './rust-runtime.js';
import {createScene} from './scene.js';
import {createEditor, diffHtml} from './editor.js';
import {drawCreature, genes, traitNames, TRAITS, sprite, GENE_COLORS} from './creature.js';
import {load, store, favicon, loadKeeper, saveKeeper} from './store.js';

const $ = s => document.querySelector(s);
const DEFAULTS = {at: 0, passed: {}, drafts: {}, name: '', duskling: null};

let save = load('hatchery', DEFAULTS);
const persist = () => store('hatchery', save);
favicon(sprite(WICK));

const scene = createScene($('#scene'));
scene.show({keeper: WICK, animate: false});
drawCreature($('#wick-face'), WICK, {scale: 2});

let at = 0;
const chapter = () => chapters[at];
const lessonOf = c => lessons[c.lesson];
const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
const codeHtml = s => escapeHtml(s).replace(/`([^`]+)`/g, '<code>$1</code>');

// ---- Editor ---------------------------------------------------------------------------------
let draftTimer;
const editor = createEditor({language: 'rust', onRun: () => check(), onChange: value => {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => { save.drafts[chapter().id] = value; persist(); }, 300);
}});

// ---- Scene ----------------------------------------------------------------------------------
function paintScene(sc, animate) {
  scene.show({creatures: sc.creatures ?? [], nests: sc.nests ?? 0, moths: sc.moths ?? 0, solo: null, gear: [], animate});
  const n = sc.creatures?.length ?? 0;
  $('#scene-tag').textContent = n ? `Hatchery · ${n} Duskling${n === 1 ? '' : 's'}` : sc.nests ? 'Hatchery · nests ready' : '';
  renderTags();
}
// Small labels over each Duskling: keeper, level and record, pending approval.
function renderTags() {
  $('#scene-tags').innerHTML = scene.layout().filter(p => typeof p.creature === 'object' && p.creature.owner).map(({creature: d, x, y}, i) => {
    const who = KEEPERS[d.owner] ?? {name: d.owner, tone: 'rival'};
    const detail = d.wins !== undefined && d.wins !== null ? `Lv${d.level} ${d.wins}–${d.losses}` : d.approved ? `→ ${KEEPERS[d.approved]?.name ?? d.approved}` : '';
    return `<span class="tag ${who.tone}" style="left:${x}%;top:${y - (i % 2) * 7}%">${who.name}${detail ? `<small>${detail}</small>` : ''}</span>`;
  }).join('');
}

// ---- Chapter rendering ----------------------------------------------------------------------
const done = c => c.kind === 'code' ? !!save.passed[c.id] : c.kind === 'intro' ? true : c.playground ? !!save.played?.[c.id] : !!save.name;

function renderProgress() {
  const c = chapter(), list = chapters.filter(x => x.lesson === c.lesson), l = lessonOf(c);
  $('#pips').innerHTML = list.map(x => `<li class="${done(x) ? 'done' : ''} ${x === c ? 'here' : ''}"></li>`).join('');
  $('#count').textContent = `${list.indexOf(c) + 1} / ${list.length}`;
  $('#lesson-kicker').textContent = `Lesson ${l.n}`;
  $('#lesson-title').textContent = l.title;
  $('#menu-list').innerHTML = lessons.map((lesson, i) => {
    const code = lessonCode(i), passed = code.filter(x => save.passed[x.id]).length;
    return `<li class="menu-level ${passed === code.length ? 'done' : ''}"><strong>Lesson ${lesson.n} · ${lesson.title}</strong><span>${passed} / ${code.length} checks passed</span></li>`
      + chapters.map((x, k) => x.lesson !== i ? '' : `<li class="${x.kind === 'code' && done(x) ? 'done' : ''} ${k === at ? 'here' : ''}"><button data-go="${k}"><span class="n">${x.kind === 'code' ? '◆' : x.kind === 'intro' ? '▸' : '★'}</span>${x.title}<span class="s">${x.kind === 'code' ? (done(x) ? '✓ passed' : 'code') : x.kind === 'intro' ? 'story' : 'finale'}</span></button></li>`).join('');
  }).join('');
}

function setNext() {
  const c = chapter(), last = at === chapters.length - 1, ok = c.kind !== 'code' || !!save.passed[c.id];
  $('#next').hidden = last;
  $('#next').disabled = !ok;
  $('#next').classList.toggle('ready', ok && c.kind === 'code');
  $('#next').innerHTML = c.kind === 'finale' && !last ? `Lesson ${lessonOf(c).n + 1} <span aria-hidden="true">→</span>` : 'Next <span aria-hidden="true">→</span>';
  $('#prev').disabled = at === 0;
}

function show(i, {focus = true} = {}) {
  at = Math.max(0, Math.min(chapters.length - 1, i));
  save.at = at; persist();
  const c = chapter(), l = lessonOf(c), list = chapters.filter(x => x.lesson === c.lesson);
  history.replaceState(null, '', '#' + c.id);
  $('#chapter-kicker').textContent = `Lesson ${l.n} · chapter ${list.indexOf(c) + 1}`;
  $('#chapter-title').textContent = c.title;
  $('#wick').hidden = !c.wick;
  $('#wick-line').innerHTML = c.wick ?? '';
  $('#chapter-body').innerHTML = c.body;
  $('#tasks').hidden = !c.tasks;
  $('#task-list').innerHTML = (c.tasks ?? []).map(t => `<li>${t}</li>`).join('');
  $('#tasks .hint')?.remove();
  const pane = c.kind === 'code' ? 'code' : c.id === 'dusk-falls' ? 'lab' : c.kind === 'intro' ? 'overview' : c.playground ? 'play' : 'finale';
  for (const p of ['code', 'lab', 'overview', 'play', 'finale']) $(`#${p}-pane`).hidden = p !== pane;
  $('#toast').textContent = '';
  const passedScene = c.kind === 'code' && save.passed[c.id] ? safeScene(c, save.passed[c.id]) : null;
  if (pane !== 'finale' && pane !== 'play') paintScene(passedScene ?? c.scene ?? defaultScene(c), false);
  if (pane === 'code') {
    editor.set(save.drafts[c.id] ?? c.start);
    $('#console').innerHTML = save.passed[c.id]
      ? '<p class="ok">✓ You passed this chapter. Edit and check again any time.</p>'
      : '<p class="muted">Press <kbd>Check</kbd> (or <kbd>Ctrl</kbd>+<kbd>Enter</kbd>) to deploy and test your contract.</p>';
  }
  if (pane === 'lab') setDna($('#dna-input').value || '8356281049284737');
  if (pane === 'overview') {
    $('#overview-kicker').textContent = `Lesson ${l.n}`;
    $('#overview-title').textContent = l.title;
    $('#overview-learn').innerHTML = (c.learn ?? []).map(x => `<li>${x}</li>`).join('');
    const code = lessonCode(c.lesson), passed = code.filter(x => save.passed[x.id]).length;
    $('#overview-count').textContent = `${code.length} code chapters · ${passed} passed. Each one is a single small edit.`;
  }
  if (pane === 'play') preparePlayground(c);
  if (pane === 'finale') prepareFinale();
  renderProgress(); setNext();
  $('#chapter').scrollTop = 0;
  if (focus) $('#chapter').focus({preventScroll: true});
}

function defaultScene(c) {
  try { const d = deploy(c.start); return {nests: d.state.fields.dusklings ? 5 : 0, creatures: []}; } catch { return {nests: 0, creatures: []}; }
}
function safeScene(c, source) { try { return c.check(source).scene; } catch { return null; } }

// ---- Checking -------------------------------------------------------------------------------
function check() {
  const c = chapter(), source = editor.value, out = $('#console');
  out.innerHTML = '<p class="log">› deploying Hatchery…</p>';
  let result;
  try { result = c.check(source); }
  catch (error) {
    const f = friendly(error);
    out.innerHTML = `<p class="bad">✗ ${codeHtml(f.text)}</p><p class="muted">Stuck? Try the Hint, or Show answer to compare.</p>`;
    editor.markError(f.line);
    $('#toast').textContent = '';
    return;
  }
  out.innerHTML = result.log.map(l => `<p class="log"><span class="ok">✓</span> ${escapeHtml(l)}</p>`).join('') + `<p class="win">★ ${escapeHtml(result.win)}</p>`;
  save.passed[c.id] = source; save.drafts[c.id] = source; persist();
  paintScene(result.scene, true);
  $('#toast').textContent = 'Chapter complete!';
  renderProgress(); setNext();
  $('#next').focus({preventScroll: true});
}

$('#check-button').addEventListener('click', check);
$('#hint-button').addEventListener('click', () => {
  const c = chapter();
  if ($('#tasks .hint')) { $('#tasks .hint').remove(); return; }
  const p = document.createElement('div'); p.className = 'hint'; p.innerHTML = '<strong>Hint:</strong> ' + c.hint;
  $('#tasks').append(p); p.scrollIntoView({block: 'nearest', behavior: 'smooth'});
});

// ---- Show answer ----------------------------------------------------------------------------
$('#answer-button').addEventListener('click', () => {
  $('#diff').innerHTML = diffHtml(editor.value, chapter().answer);
  $('#answer-dialog').showModal();
});
$('#use-answer').addEventListener('click', () => {
  editor.replace(chapter().answer);
  $('#answer-dialog').close();
});

// ---- Navigation -----------------------------------------------------------------------------
$('#next').addEventListener('click', () => show(at + 1));
$('#prev').addEventListener('click', () => show(at - 1));
$('#overview-start').addEventListener('click', () => show(at + 1));
$('#to-next-lesson').addEventListener('click', () => show(at + 1));
$('#menu-button').addEventListener('click', () => { renderProgress(); $('#menu').showModal(); });
$('#menu-list').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { $('#menu').close(); show(Number(b.dataset.go)); } });
$('#reset').addEventListener('click', () => { save = structuredClone(DEFAULTS); persist(); $('#menu').close(); show(0); });
$('#runtime-info').addEventListener('mouseenter', () => { $('#runtime-note').hidden = false; });
$('#runtime-info').addEventListener('mouseleave', () => { $('#runtime-note').hidden = true; });
$('#runtime-info').addEventListener('click', () => { $('#runtime-note').hidden = !$('#runtime-note').hidden; });

// ---- DNA lab (lesson 1, chapter 1) ----------------------------------------------------------
function dnaHtml(digits) {
  return [...Array(8)].map((_, i) => `<b style="color:${GENE_COLORS[i]}">${digits.slice(i * 2, i * 2 + 2)}</b>`).join('');
}
function setDna(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  $('#dna-input').value = digits;
  const g = genes(digits.padEnd(16, '0'));
  drawCreature($('#lab-creature'), g.digits, {scale: 8});
  $('#genes').innerHTML = TRAITS.map((t, i) => `<li><b style="background:${GENE_COLORS[i]}">${g.digits.slice(i * 2, i * 2 + 2)}</b><span>${t.label}</span>${t.names[g[t.key]]}</li>`).join('');
}
$('#dna-input').addEventListener('input', e => setDna(e.target.value));
$('#shuffle').addEventListener('click', () => {
  const r = crypto.getRandomValues(new Uint8Array(16));
  setDna([...r].map(n => n % 10).join(''));
});

// ---- Lesson 1 finale: hatch your own Duskling ------------------------------------------------
function prepareFinale() {
  const own = save.passed.events;
  $('#hatch-source').textContent = own
    ? 'Hatching with the contract you wrote in chapter 13.'
    : 'You haven’t passed chapter 13 yet, so this uses the reference Hatchery.';
  const name = save.name || loadKeeper().name;
  $('#name-input').value = name;
  if (save.name) hatch(save.name, false);
  else { scene.show({creatures: [], nests: 1, solo: null, animate: false}); renderTags(); $('#card').hidden = true; $('#complete').hidden = true; }
}
function hatch(name, animate = true) {
  const seed = seedFromName(name);
  let dna;
  try {
    const c = deploy(save.passed.events ?? lessons[0].reference);
    c.call('hatch', seed);
    const e = c.events.at(-1);
    dna = pad16(e ? e.data[1] : c.dusklings().at(-1).dna);
  } catch (error) {
    $('#hatch-source').textContent = 'Your contract failed to hatch: ' + friendly(error).text;
    return;
  }
  const keeper = loadKeeper(), same = keeper.dna === dna;
  save.name = name; save.duskling = {name, dna}; persist();
  saveKeeper({...keeper, name, dna});
  scene.show({solo: dna, gear: keeper.gear, animate});
  renderTags();
  $('#scene-tag').textContent = 'Hatchery · 1 Duskling';
  const reveal = () => {
    drawCreature($('#card-creature'), dna, {scale: 7, gear: keeper.gear});
    $('#card-name').textContent = name;
    $('#card-dna').innerHTML = dnaHtml(dna);
    $('#card-traits').innerHTML = traitNames(dna).map(t => `<dt>${t.label}</dt><dd>${t.value}</dd>`).join('');
    $('#card-seed').textContent = `seed ${seed} → hatch(seed) → DNA ${dna}` + (same && animate && save.passed.events ? '. Same DNA Wick\'s Hatchery gave it: your contract follows the same rules.' : '');
    $('#card').hidden = false; $('#complete').hidden = false;
    $('#skills').innerHTML = ['Forge contracts', 'Constants', 'u64 math', 'Structs', 'Vectors', 'Methods', 'Private helpers', 'Return values', 'Wrapping arithmetic', 'Events'].map(s => `<li>${s}</li>`).join('');
    $('#toast').textContent = animate ? `${name} hatched!` : '';
  };
  if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) { $('#card').hidden = true; setTimeout(reveal, 1300); } else reveal();
}
$('#hatch-form').addEventListener('submit', e => { e.preventDefault(); const n = $('#name-input').value.trim(); if (n) hatch(n); });
$('#download').addEventListener('click', () => {
  const dna = genes($('#card-dna').textContent).digits, c = document.createElement('canvas');
  c.width = 640; c.height = 360;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage($('#scene'), 0, 0, 640, 360);
  g.fillStyle = 'rgba(10,9,26,.82)'; g.fillRect(24, 24, 250, 108);
  g.fillStyle = '#ffc86b'; g.font = '28px Silkscreen'; g.fillText($('#card-name').textContent, 40, 66);
  g.fillStyle = '#ece9f7'; g.font = '16px ui-monospace, monospace'; g.fillText(dna.replace(/(\d{4})(?=\d)/g, '$1 '), 40, 96);
  g.fillStyle = '#a2a4cf'; g.font = '13px Manrope, sans-serif'; g.fillText('Hatched on Dusk Academy', 40, 118);
  const a = document.createElement('a'); a.download = `${$('#card-name').textContent || 'duskling'}.png`; a.href = c.toDataURL('image/png'); a.click();
});

// ---- Lessons 2–5 finales: play with your own contract ---------------------------------------
let play = null;
function preparePlayground(c) {
  const lesson = lessonOf(c), code = lessonCode(c.lesson), last = code.at(-1), own = save.passed[last.id];
  const keeper = loadKeeper();
  $('#play-source').textContent = own ? `Running the contract you finished in “${last.title}”.` : `You haven’t passed “${last.title}” yet, so this runs the reference contract.`;
  $('#play-next').hidden = at === chapters.length - 1;
  $('#play-next').innerHTML = `Lesson ${lesson.n + 1} <span aria-hidden="true">→</span>`;
  const start = () => {
    const contract = deploy(own ?? lesson.reference);
    try { c.playground.setup?.(contract, keeper); } catch (error) { return log('bad', 'Setup failed: ' + friendly(error).text); }
    play = {c, contract, keeper};
    $('#play-log').innerHTML = '<p class="muted">Pick an action. Every call runs your contract. Panics roll back, just like on chain.</p>';
    repaint(false);
  };
  $('#play-actions').innerHTML = c.playground.actions.map((a, i) => `<button class="ghost" data-act="${i}">${a.label}</button>`).join('');
  start();
  $('#play-reset').onclick = start;
}
function log(kind, text) {
  $('#play-log').insertAdjacentHTML('beforeend', `<p class="${kind}">${kind === 'ok' ? '✓' : kind === 'refused' ? '↺' : '✗'} ${codeHtml(text)}</p>`);
  $('#play-log').scrollTop = $('#play-log').scrollHeight;
}
function repaint(animate) {
  const ds = play.contract.dusklings();
  paintScene({nests: 5, moths: play.c.playground.moths ?? (play.c.lesson === 2 ? 3 : 0), creatures: ds.map(d => ({dna: pad16(d.dna), owner: d.owner, level: d.level, wins: d.wins, losses: d.losses, approved: d.approved}))}, animate);
}
$('#play-actions').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || !play) return;
  const action = play.c.playground.actions[Number(b.dataset.act)];
  try { log('ok', action.run(play.contract, play.keeper)); }
  catch (error) {
    if (error instanceof Rejection) log('refused', `Refused: “${error.message}”. The call rolled back.`);
    else log('bad', friendly(error).text);
  }
  save.played = {...save.played, [play.c.id]: true}; persist();
  repaint(true); renderProgress();
});
$('#play-next').addEventListener('click', () => show(at + 1));

// ---- Start ----------------------------------------------------------------------------------
const fromHash = chapters.findIndex(c => '#' + c.id === location.hash);
show(fromHash >= 0 ? fromHash : save.at ?? 0, {focus: false});
window.addEventListener('hashchange', () => { const i = chapters.findIndex(c => '#' + c.id === location.hash); if (i >= 0 && i !== at) show(i); });
