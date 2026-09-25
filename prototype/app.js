import {chapters, deploy, friendly, seedFromName, reference, pad16, WICK} from './lesson1.js';
import {createScene} from './scene.js';
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

// ---- Editor ---------------------------------------------------------------------------------
const code = $('#code');
const escapeHtml = s => s.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
const TOKEN = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|(#!?\[[^\]\n]*\])|\b(pub|fn|impl|mod|struct|let|mut|self|Self|const|use|extern|crate|as|return|if|else|for|in|while|loop|match|true|false)\b|\b(u8|u16|u32|u64|u128|usize|bool|Vec|Option|Result|String)\b|\b(0x[\da-fA-F_]+(?:u\d+)?|\d[\d_]*(?:u\d+)?)\b|\b([a-z_]\w*)(?=!)|\b([a-z_]\w*)(?=\s*\()/g;
const CLASSES = [null, 't-com', 't-str', 't-attr', 't-kw', 't-ty', 't-num', 't-mac', 't-fn'];
export function highlight(source) {
  let html = '', end = 0;
  for (const m of source.matchAll(TOKEN)) {
    const cls = CLASSES[m.findIndex((g, i) => i > 0 && g !== undefined)];
    html += escapeHtml(source.slice(end, m.index)) + `<span class="${cls}">${escapeHtml(m[0])}</span>`;
    end = m.index + m[0].length;
  }
  return html + escapeHtml(source.slice(end));
}
function paintEditor() {
  $('#highlight').innerHTML = highlight(code.value) + '\n';
  $('#gutter').textContent = code.value.split('\n').map((_, i) => i + 1).join('\n');
  syncScroll();
}
function syncScroll() {
  $('#highlight').style.transform = `translate(${-code.scrollLeft}px, ${-code.scrollTop}px)`;
  $('#gutter').scrollTop = code.scrollTop;
  const err = $('#error-line');
  if (!err.hidden) err.style.top = `${14 + (Number(err.dataset.line) - 1) * 22 - code.scrollTop}px`;
}
function markError(line) {
  const err = $('#error-line');
  err.hidden = !line;
  if (line) { err.dataset.line = line; syncScroll(); }
}
let draftTimer;
code.addEventListener('input', () => {
  paintEditor(); markError(null);
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => { save.drafts[chapter().id] = code.value; persist(); }, 300);
});
code.addEventListener('scroll', syncScroll);
code.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); check(); return; }
  const {selectionStart: a, selectionEnd: b, value} = code;
  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); code.setRangeText('    ', a, b, 'end'); code.dispatchEvent(new Event('input')); }
  if (e.key === 'Enter' && !e.shiftKey) {
    const lineStart = value.lastIndexOf('\n', a - 1) + 1, line = value.slice(lineStart, a);
    const indent = line.match(/^\s*/)[0] + (/[{(]\s*$/.test(line) ? '    ' : '');
    e.preventDefault(); code.setRangeText('\n' + indent, a, b, 'end'); code.dispatchEvent(new Event('input'));
  }
});

// ---- Chapter rendering ----------------------------------------------------------------------
function renderProgress() {
  const done = c => c.kind === 'code' ? !!save.passed[c.id] : c.kind === 'intro' ? true : !!save.name;
  $('#pips').innerHTML = chapters.map((c, i) => `<li class="${done(c) ? 'done' : ''} ${i === at ? 'here' : ''}"></li>`).join('');
  $('#count').textContent = `${at + 1} / ${chapters.length}`;
  $('#menu-list').innerHTML = chapters.map((c, i) => {
    const done = c.kind === 'code' ? !!save.passed[c.id] : false;
    return `<li class="${done ? 'done' : ''} ${i === at ? 'here' : ''}"><button data-go="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span>${c.title}<span class="s">${c.kind === 'code' ? (done ? '✓ passed' : 'code') : c.kind === 'intro' ? 'story' : 'finale'}</span></button></li>`;
  }).join('');
}

function setNext() {
  const c = chapter(), last = at === chapters.length - 1, ok = c.kind !== 'code' || !!save.passed[c.id];
  $('#next').hidden = last;
  $('#next').disabled = !ok;
  $('#next').classList.toggle('ready', ok && c.kind === 'code');
  $('#prev').disabled = at === 0;
}

function sceneTag(creatures, nests) {
  $('#scene-tag').textContent = creatures ? `Hatchery · ${creatures} Duskling${creatures === 1 ? '' : 's'}` : nests ? 'Hatchery · nests ready' : '';
}

function show(i, {focus = true} = {}) {
  at = Math.max(0, Math.min(chapters.length - 1, i));
  save.at = at; persist();
  const c = chapter();
  history.replaceState(null, '', '#' + c.id);
  $('#chapter-kicker').textContent = `Chapter ${at + 1}`;
  $('#chapter-title').textContent = c.title;
  $('#wick').hidden = !c.wick;
  $('#wick-line').innerHTML = c.wick ?? '';
  $('#chapter-body').innerHTML = c.body;
  $('#tasks').hidden = !c.tasks;
  $('#task-list').innerHTML = (c.tasks ?? []).map(t => `<li>${t}</li>`).join('');
  $('#tasks .hint')?.remove();
  $('#code-pane').hidden = c.kind !== 'code';
  $('#lab-pane').hidden = c.kind !== 'intro';
  $('#finale-pane').hidden = c.kind !== 'finale';
  $('#toast').textContent = '';
  const passedScene = c.kind === 'code' && save.passed[c.id] ? safeScene(c, save.passed[c.id]) : null;
  const sc = passedScene ?? c.scene ?? defaultScene(c);
  scene.show({creatures: sc.creatures ?? [], nests: sc.nests ?? 0, solo: null, animate: false});
  sceneTag(sc.creatures?.length ?? 0, sc.nests);
  if (c.kind === 'code') {
    code.value = save.drafts[c.id] ?? c.start;
    paintEditor(); markError(null);
    code.scrollTop = 0;
    $('#console').innerHTML = save.passed[c.id]
      ? '<p class="ok">✓ You passed this chapter. Edit and check again any time.</p>'
      : '<p class="muted">Press <kbd>Check</kbd> (or <kbd>Ctrl</kbd>+<kbd>Enter</kbd>) to deploy and test your contract.</p>';
  }
  if (c.kind === 'intro') setDna($('#dna-input').value || '8356281049284737');
  if (c.kind === 'finale') prepareFinale();
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
  const c = chapter(), source = code.value, out = $('#console');
  out.innerHTML = '<p class="log">› deploying Hatchery…</p>';
  let result;
  try { result = c.check(source); }
  catch (error) {
    const f = friendly(error);
    out.innerHTML = `<p class="bad">✗ ${escapeHtml(f.text).replace(/`([^`]+)`/g, '<code>$1</code>')}</p><p class="muted">Stuck? Try the Hint, or Show answer to compare.</p>`;
    markError(f.line);
    $('#toast').textContent = '';
    return;
  }
  out.innerHTML = result.log.map(l => `<p class="log"><span class="ok">✓</span> ${escapeHtml(l)}</p>`).join('') + `<p class="win">★ ${escapeHtml(result.win)}</p>`;
  save.passed[c.id] = source; save.drafts[c.id] = source; persist();
  scene.show({creatures: result.scene.creatures ?? [], nests: result.scene.nests ?? 0, solo: null, animate: true});
  sceneTag(result.scene.creatures?.length ?? 0, result.scene.nests);
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

// ---- Show answer: a line diff between the editor and the reference -------------------------
function diff(a, b) {
  const x = a.split('\n'), y = b.split('\n'), n = x.length, m = y.length;
  const L = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i].trimEnd() === y[j].trimEnd() ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i].trimEnd() === y[j].trimEnd()) { out.push(['same', y[j]]); i++; j++; }
    else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) out.push(['add', y[j++]]);
    else out.push(['del', x[i++]]);
  }
  return out;
}
$('#answer-button').addEventListener('click', () => {
  $('#diff').innerHTML = diff(code.value, chapter().answer).map(([k, l]) => `<span class="${k}">${k === 'add' ? '+ ' : k === 'del' ? '- ' : '  '}${escapeHtml(l) || ' '}</span>`).join('');
  $('#answer-dialog').showModal();
});
$('#use-answer').addEventListener('click', () => {
  code.value = chapter().answer; code.dispatchEvent(new Event('input'));
  $('#answer-dialog').close();
  code.setSelectionRange(0, 0); code.focus({preventScroll: true}); code.scrollTop = 0; syncScroll();
});

// ---- Navigation -----------------------------------------------------------------------------
$('#next').addEventListener('click', () => show(at + 1));
$('#prev').addEventListener('click', () => show(at - 1));
$('#menu-button').addEventListener('click', () => { renderProgress(); $('#menu').showModal(); });
$('#menu-list').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { $('#menu').close(); show(Number(b.dataset.go)); } });
$('#reset').addEventListener('click', () => { save = structuredClone(DEFAULTS); persist(); $('#menu').close(); show(0); });
$('#runtime-info').addEventListener('mouseenter', () => { $('#runtime-note').hidden = false; });
$('#runtime-info').addEventListener('mouseleave', () => { $('#runtime-note').hidden = true; });
$('#runtime-info').addEventListener('click', () => { $('#runtime-note').hidden = !$('#runtime-note').hidden; });

// ---- DNA lab (chapter 1) --------------------------------------------------------------------
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

// ---- Finale ---------------------------------------------------------------------------------
function prepareFinale() {
  const own = save.passed.events;
  $('#hatch-source').textContent = own
    ? 'Hatching with the contract you wrote in chapter 13.'
    : 'You haven’t passed chapter 13 yet, so this uses the reference Hatchery.';
  const name = save.name || loadKeeper().name;
  $('#name-input').value = name;
  if (save.name) hatch(save.name, false);
  else { $('#card').hidden = true; $('#complete').hidden = true; }
}
function hatch(name, animate = true) {
  const seed = seedFromName(name);
  let dna;
  try {
    const c = deploy(save.passed.events ?? reference);
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
  sceneTag(1, 1);
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

// ---- Start ----------------------------------------------------------------------------------
const fromHash = chapters.findIndex(c => '#' + c.id === location.hash);
show(fromHash >= 0 ? fromHash : save.at ?? 0, {focus: false});
window.addEventListener('hashchange', () => { const i = chapters.findIndex(c => '#' + c.id === location.hash); if (i >= 0 && i !== at) show(i); });
