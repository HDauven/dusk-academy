// The lesson screen for the Circuits and dApps paths: editor, checks, lesson intros and a finale lab.
// Each path supplies its lessons, how to run a check, and what its finale lab shows.
import {createScene} from './scene.js';
import {createEditor, diffHtml} from './editor.js';
import {drawCreature, sprite} from './creature.js';
import {load, store, favicon} from './store.js';
import {friendly, WICK, KEEPERS} from './contract.js';

const $ = s => document.querySelector(s);
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const codeHtml = s => escapeHtml(s).replace(/`([^`]+)`/g, '<code>$1</code>');

export function startPath({key, lessons, chapters, language, pathName, check: runCheck, finale, sceneKind = 'hatchery'}) {
  const DEFAULTS = {at: 0, passed: {}, drafts: {}, labs: {}};
  let save = load(key, DEFAULTS);
  const persist = () => store(key, save);
  favicon(sprite(WICK));
  const scene = createScene($('#scene'), {kind: sceneKind});
  scene.show({keeper: WICK, animate: false});
  drawCreature($('#wick-face'), WICK, {scale: 2});
  let at = 0, running = null, draftTimer;
  const chapter = () => chapters[at];
  const lessonOf = c => lessons[c.lesson];
  const lessonCode = l => chapters.filter(c => c.lesson === l && c.kind === 'code');
  const editor = createEditor({language, onRun: () => check(), onChange: value => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => { save.drafts[chapter().id] = value; persist(); }, 300);
  }});

  function paintScene(sc = {}, animate = false) {
    scene.show({creatures: sc.creatures ?? [], nests: 0, bare: true, solo: null, gear: [], animate});
    const n = sc.creatures?.length ?? 0;
    $('#scene-tag').textContent = sc.tag ?? (n ? `${n} Duskling${n === 1 ? '' : 's'}` : pathName);
    $('#scene-tags').innerHTML = scene.layout().filter(p => typeof p.creature === 'object' && (p.creature.label || p.creature.owner)).map(({creature: d, x, y}, i) => {
      const who = KEEPERS[d.owner] ?? {name: d.owner ?? '', tone: 'you'};
      return `<span class="tag ${who.tone}" style="left:${x}%;top:${y - (i % 2) * 7}%">${escapeHtml(d.label ?? who.name)}</span>`;
    }).join('');
  }

  const done = c => c.kind === 'code' ? !!save.passed[c.id] : c.kind === 'intro' ? true : !!save.labs[c.id];
  function renderProgress() {
    const c = chapter(), list = chapters.filter(x => x.lesson === c.lesson), l = lessonOf(c);
    $('#pips').innerHTML = list.map(x => `<li class="${done(x) ? 'done' : ''} ${x === c ? 'here' : ''}"></li>`).join('');
    $('#count').textContent = `${list.indexOf(c) + 1} / ${list.length}`;
    $('#lesson-kicker').textContent = `Lesson ${l.n}`;
    $('#lesson-title').textContent = l.title;
    $('#menu-list').innerHTML = lessons.map((lesson, i) => {
      const code = lessonCode(i), passed = code.filter(x => save.passed[x.id]).length;
      return `<li class="menu-level ${passed === code.length ? 'done' : ''}"><strong>Lesson ${lesson.n}: ${lesson.title}</strong><span>${passed} / ${code.length} checks passed</span></li>`
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
    running?.abort(); running = null;
    at = Math.max(0, Math.min(chapters.length - 1, i));
    save.at = at; persist();
    const c = chapter(), l = lessonOf(c), list = chapters.filter(x => x.lesson === c.lesson);
    history.replaceState(null, '', '#' + c.id);
    $('#chapter-kicker').textContent = `Lesson ${l.n}, chapter ${list.indexOf(c) + 1}`;
    $('#chapter-title').textContent = c.title;
    $('#wick').hidden = !c.wick;
    $('#wick-line').innerHTML = c.wick ?? '';
    $('#chapter-body').innerHTML = c.body;
    $('#tasks').hidden = !c.tasks;
    $('#task-list').innerHTML = (c.tasks ?? []).map(t => `<li>${t}</li>`).join('');
    $('#tasks .hint')?.remove();
    const pane = c.kind === 'code' ? 'code' : c.kind === 'intro' ? 'overview' : 'lab';
    for (const p of ['code', 'overview', 'lab']) $(`#${p}-pane`).hidden = p !== pane;
    $('#toast').textContent = '';
    paintScene(c.scene ?? save.scenes?.[c.id] ?? {}, false);
    if (pane === 'code') {
      editor.set(save.drafts[c.id] ?? c.start);
      $('#console').innerHTML = save.passed[c.id]
        ? '<p class="ok">✓ You passed this chapter.</p>'
        : '<p class="muted">Press <kbd>Check</kbd> (or <kbd>Ctrl</kbd>+<kbd>Enter</kbd>) to run your code.</p>';
    }
    if (pane === 'overview') {
      $('#overview-kicker').textContent = `Lesson ${l.n}`;
      $('#overview-title').textContent = l.title;
      $('#overview-learn').innerHTML = (c.learn ?? []).map(x => `<li>${x}</li>`).join('');
      const code = lessonCode(c.lesson), passed = code.filter(x => save.passed[x.id]).length;
      $('#overview-count').textContent = `${passed} of ${code.length} code chapters passed.`;
    }
    if (pane === 'lab') {
      const last = lessonCode(c.lesson).at(-1);
      finale(c, {
        pane: $('#lab-pane'), paintScene, codeHtml, escapeHtml,
        source: save.passed[last.id] ?? l.reference, own: !!save.passed[last.id], lastTitle: last.title,
        played() { save.labs[c.id] = true; persist(); renderProgress(); },
        signal: (running = new AbortController()).signal,
      });
    }
    renderProgress(); setNext();
    $('#chapter').scrollTop = 0;
    if (focus) $('#chapter').focus({preventScroll: true});
  }

  async function check() {
    const c = chapter(), source = editor.value, out = $('#console');
    if (c.kind !== 'code') return;
    running?.abort();
    const control = running = new AbortController();
    out.innerHTML = '<p class="log">› running…</p>';
    $('#check-button').disabled = true;
    try {
      const result = await runCheck(c, source, control.signal);
      if (control.signal.aborted) return;
      out.innerHTML = result.log.map(l => `<p class="log"><span class="ok">✓</span> ${escapeHtml(l)}</p>`).join('') + `<p class="win">★ ${escapeHtml(result.win)}</p>`;
      save.passed[c.id] = source; save.drafts[c.id] = source;
      save.scenes = {...save.scenes, [c.id]: result.scene}; persist();
      paintScene(result.scene, false);
      $('#toast').textContent = 'Chapter complete!';
      renderProgress(); setNext();
      $('#next').focus({preventScroll: true});
    } catch (error) {
      if (control.signal.aborted) return;
      const f = friendly(error);
      out.innerHTML = `<p class="bad">✗ ${codeHtml(f.text)}</p><p class="muted">Stuck? Try the Hint, or Show answer to compare.</p>`;
      editor.markError(f.line);
      $('#toast').textContent = '';
    } finally {
      if (running === control) { running = null; $('#check-button').disabled = false; }
    }
  }

  $('#check-button').addEventListener('click', check);
  $('#hint-button').addEventListener('click', () => {
    if ($('#tasks .hint')) { $('#tasks .hint').remove(); return; }
    const p = document.createElement('div'); p.className = 'hint'; p.innerHTML = '<strong>Hint:</strong> ' + chapter().hint;
    $('#tasks').append(p); p.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  });
  $('#answer-button').addEventListener('click', () => { $('#diff').innerHTML = diffHtml(editor.value, chapter().answer); $('#answer-dialog').showModal(); });
  $('#use-answer').addEventListener('click', () => { editor.replace(chapter().answer); $('#answer-dialog').close(); });
  $('#next').addEventListener('click', () => show(at + 1));
  $('#prev').addEventListener('click', () => show(at - 1));
  $('#overview-start').addEventListener('click', () => show(at + 1));
  $('#menu-button').addEventListener('click', () => { renderProgress(); $('#menu').showModal(); });
  $('#menu-list').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { $('#menu').close(); show(Number(b.dataset.go)); } });
  $('#reset').addEventListener('click', () => { save = structuredClone(DEFAULTS); persist(); $('#menu').close(); show(0); });
  $('#runtime-info').addEventListener('mouseenter', () => { $('#runtime-note').hidden = false; });
  $('#runtime-info').addEventListener('mouseleave', () => { $('#runtime-note').hidden = true; });
  $('#runtime-info').addEventListener('click', () => { $('#runtime-note').hidden = !$('#runtime-note').hidden; });
  window.addEventListener('hashchange', () => { const i = chapters.findIndex(c => '#' + c.id === location.hash); if (i >= 0 && i !== at) show(i); });
  const fromHash = chapters.findIndex(c => '#' + c.id === location.hash);
  show(fromHash >= 0 ? fromHash : save.at ?? 0, {focus: false});
}
