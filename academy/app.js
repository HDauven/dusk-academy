import {chapters, lessons, codeSteps, stepsFor, partSteps, storageKey, restore, serialize, assess, unlocked, markChecked, contractIds, cleanName} from './lesson.js';
import {courses, courseKey, lastPathKey, restoreCourse, courseComplete, lessonComplete} from './courses.js';
import {highlight, syncScroll} from './editor.js';
import {browserRuntime, previewRecap} from './hosting.js';
import {simulateContract, inspectInterface} from './contract-simulator.js';

const $ = selector => document.querySelector(selector);
let state;
try { state = restore(localStorage.getItem(storageKey), browserRuntime); }
catch { state = restore(null, browserRuntime); }
const limit = () => unlocked(state, browserRuntime);
const checked = check => state.checks[check] || (browserRuntime && state.simulated?.[check]);
const simulatedCredit = check => browserRuntime && !state.checks[check] && state.simulated?.[check];
const availableTask = () => codeSteps.find(i => !checked(chapters[i].check)) ?? codeSteps.at(-1);
if (browserRuntime) state.active = Math.min(state.active, availableTask());
let controller = null, ticket = 0, busy = false;
const activeChapter = () => chapters[state.active];

function save() {
  try { localStorage.setItem(storageKey, serialize(state)); localStorage.setItem(lastPathKey, 'contracts'); $('#save-error').hidden = true; }
  catch { $('#save-error').hidden = false; }
}

function character() {
  document.querySelectorAll('.character-name').forEach(node => { node.textContent = state.name.trim() || 'Apprentice'; });
  const current = lessons[chapters[state.step].lesson];
  $('#character-skill').textContent = checked(current.check) ? `${current.skill}${simulatedCredit(current.check) ? ' · simulator' : ' learned'}` : `Learning ${current.skill.toLowerCase()}`;
  $('#lesson-skills').replaceChildren(...lessons.map((lesson, i) => {
    const steps = stepsFor(i), complete = Boolean(checked(lesson.check));
    const button = document.createElement('button'); button.type = 'button'; button.className = 'skill-button'; button.dataset.lesson = i;
    if (i === 0) button.id = 'return-to-lesson';
    button.disabled = steps[0] > limit();
    const icon = document.createElement('span'); icon.textContent = complete ? '✓' : '◇'; icon.setAttribute('aria-hidden', 'true');
    const status = document.createElement('small');
    status.textContent = complete ? (simulatedCredit(lesson.check) ? 'Simulator check passed' : 'Learned') : button.disabled ? `After ${lessons[i-1].skill.toLowerCase()}` : chapters[state.step].lesson === i ? 'Current lesson' : 'Available';
    if (i === 0) { icon.id = 'skill-state'; status.id = 'skill-status'; }
    button.append(icon, document.createTextNode(lesson.skill), status);
    button.addEventListener('click', () => {
      $('#skills').close();
      go(complete ? steps.at(-1) : steps.includes(state.active) && state.active <= limit() ? state.active : steps[0]);
    });
    return button;
  }));
}

function showPaths(focus = true) {
  cancel();
  $('#skills').close(); $('#about').close();
  $('#paths').hidden = false; $('#contract-path').hidden = true;
  $('#course').hidden = true; $('#lesson-controls').hidden = true; $('#path-profile').hidden = false;
  $('.skip-link').href = '#paths-title'; $('.skip-link').textContent = 'Skip to learning paths';
  const completed = lessons.filter(lesson => checked(lesson.check)).length;
  const target = '#' + chapters[state.step].id;
  $('#open-contracts').href = target;
  $('#open-contracts').textContent = (completed === lessons.length ? 'Review lessons' : state.started ? 'Continue lesson' : 'Open path') + ' →';
  $('#resume-path').href = target; $('#resume-path').hidden = !state.started;
  $('#resume-label').textContent = completed === lessons.length ? 'Review contracts' : 'Continue contracts';
  $('#resume-chapter').textContent = chapters[state.step].title;
  $('#contracts-first-count').textContent = stepsFor(0).length;
  $('#contracts-size').textContent = `${lessons.length} lessons · ${chapters.length} chapters`;
  $('#contracts-progress').textContent = `${completed} of ${lessons.length} lessons completed${lessons.some(lesson => simulatedCredit(lesson.check)) ? ' · includes simulated checks' : ''}`;
  $('#contracts-progress').hidden = !state.started;
  let last = 'contracts';
  try { last = localStorage.getItem(lastPathKey) || last; } catch { /* Storage is optional. */ }
  const available = [];
  for (const [id, course] of Object.entries(courses)) {
    let progress;
    try { progress = restoreCourse(id, localStorage.getItem(courseKey(id)), browserRuntime); } catch { progress = restoreCourse(id, null, browserRuntime); }
    const browserChecked = browserRuntime && progress.simulated && Object.keys(progress.simulated).length;
    if (browserRuntime) progress = {...progress,checks:{...progress.checks,...progress.simulated}};
    const complete = courseComplete(course, progress), link = $(`#open-${id}`);
    link.href = `course.html?path=${id}${browserRuntime ? '&runtime=simulator' : ''}#${course.chapters[progress.step].id}`;
    link.textContent = (complete ? `Review lesson${course.lessons.length === 1 ? '' : 's'}` : progress.started ? 'Continue lesson' : 'Open path') + ' →';
    const learned=course.lessons.filter(lesson=>lessonComplete(course,progress,lesson)).length;
    $(`#${id}-size`).textContent = `${course.lessons.length} lesson${course.lessons.length === 1 ? '' : 's'} · ${course.chapters.length} chapters`;
    $(`#${id}-progress`).textContent = course.lessons.length > 1 ? `${learned} of ${course.lessons.length} lessons completed` : complete ? 'Opening lesson completed' : `Chapter ${progress.step + 1} of ${course.chapters.length}`;
    if (browserChecked) $(`#${id}-progress`).textContent += ' · browser checked';
    $(`#${id}-progress`).hidden = !progress.started;
    if (progress.started) available.push({id, course, progress, complete, href:link.href});
  }
  const resume = available.find(p => p.id === last) || (!state.started ? available[0] : null);
  if (resume) {
    $('#resume-path').hidden = false; $('#resume-path').href = resume.href;
    $('#resume-label').textContent = (resume.complete ? 'Review ' : 'Continue ') + ({dusk:'Dusk basics',dapps:'dApps',circuits:'circuits'}[resume.id]);
    $('#resume-chapter').textContent = resume.course.chapters[resume.progress.step].title;
  }
  character();
  history.replaceState(null, '', '#paths');
  document.title = 'Learning paths | Dusk Academy';
  if (focus) $('#paths-title').focus();
}

function navigation() {
  const chapter = chapters[state.step], lesson = lessons[chapter.lesson], lessonSteps = stepsFor(chapter.lesson), steps = partSteps(state.step);
  $('#part-title').textContent = `Part ${chapter.part + 1} of ${lesson.parts.length} · ${lesson.parts[chapter.part]}`;
  $('#chapter-menu').replaceChildren(...lessons.map((item, i) => {
    const group = document.createElement('optgroup'); group.label = `${i + 1}. ${item.title}`;
    group.append(...stepsFor(i).map((step, index) => {
      const option = document.createElement('option'); option.value = step; option.textContent = `${index + 1}. ${chapters[step].short}`;
      option.disabled = step > limit(); return option;
    }));
    return group;
  }));
  $('#chapter-menu').value = state.step; $('#chapter-menu').disabled = busy;
  $('#quiz fieldset').disabled = busy; $('#quiz button').disabled = busy;
  $('#chapters').style.setProperty('--chapters', steps.length);
  $('#chapters').replaceChildren(...steps.map(step => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.step = step;
    const number = document.createElement('span'); number.className = 'chapter-index'; number.textContent = String(lessonSteps.indexOf(step) + 1).padStart(2, '0');
    const label = document.createElement('span'); label.textContent = chapters[step].short;
    button.append(number, label); button.disabled = step > limit() || busy;
    if (step === state.step) button.setAttribute('aria-current', 'step');
    button.addEventListener('click', () => go(step)); return button;
  }));
  $('#previous').hidden = state.step === 0;
  $('#previous').disabled = busy;
  $('#page-count').textContent = `${lessonSteps.indexOf(state.step) + 1} / ${lessonSteps.length}`;
  $('#next').hidden = state.step === chapters.length - 1;
  $('#all-paths').hidden = !$('#next').hidden;
  $('#next').disabled = busy || (chapter.kind === 'code' && state.checks[activeChapter().check] !== state.source && (!browserRuntime || state.simulated?.[activeChapter().check] !== state.source));
  $('#next').textContent = chapter.kind === 'intro' ? 'Begin lesson →' : chapter.kind === 'earned' ? 'Next lesson →' : chapters[state.step + 1]?.kind === 'earned' ? 'Finish lesson →' : 'Continue →';
  $('#run').disabled = false;
  $('#run').textContent = busy ? 'Cancel run' : browserRuntime ? '▶ Simulate contract' : '▶  Run contract';
  $('#code').setAttribute('aria-busy', String(busy));
}

function cancel() {
  ticket++;
  controller?.abort(); controller = null; busy = false;
}

function clearResults(message = 'Run the contract to see the call results.') {
  $('#call-results').hidden = true; $('#trace-results').hidden = true;
  $('#trace-details').hidden = true; $('#trace-details').open = false;
  $('#build-results').hidden = true; $('#build-results').open = false; $('#build-detail').textContent = '';
  $('#test-empty').hidden = false; $('#test-empty').textContent = message;
  $('#feedback').hidden = true;
}

function render(focus) {
  $('#paths').hidden = true; $('#contract-path').hidden = false;
  $('#course').hidden = false; $('#lesson-controls').hidden = false; $('#path-profile').hidden = true;
  $('.skip-link').href = '#lesson-title'; $('.skip-link').textContent = 'Skip to lesson';
  const {step} = state, chapter = chapters[step], lesson = lessons[chapter.lesson];
  const coding = !['intro','earned'].includes(chapter.kind), earned = chapter.kind === 'earned';
  $('#lesson').dataset.step = step;
  $('#course-title').textContent = lesson.title;
  $('#chapter-label').textContent = earned ? `Lesson ${chapter.lesson + 1} complete` : chapter.kind === 'intro' ? `Lesson ${String(chapter.lesson + 1).padStart(2, '0')} · Dusk Forge` : `Chapter ${stepsFor(chapter.lesson).indexOf(step) + 1} · ${lesson.skill}`;
  $('#lesson-title').textContent = chapter.title;
  $('#story-copy').innerHTML = chapter.body;
  $('.task').hidden = !chapter.task;
  $('#task-label').textContent = chapter.kind === 'intro' ? 'The goal' : 'Your turn';
  $('#task-copy').textContent = chapter.task || '';
  if (browserRuntime && chapter.check === 'buildDriver') {
    $('#lesson-title').textContent = 'Check your interpreted contract interface';
    $('#story-copy').innerHTML = '<p>No new business method is needed. Run the full 66-operation simulation, then compare your parsed public signatures with the prebuilt reference data-driver.</p><p>The genuine Connect SDK checks the driver’s schema, encoded register/resize arguments and exact largest-u64 decoding. This does not compile your edited Rust or produce a deployable contract.</p><p>Results show your interpreted source hash and the prebuilt driver hash, not a new contract WASM artifact.</p>';
    $('#task-copy').textContent = 'Run the simulation and inspect the reference-driver checks. Use native mode for compilation and real build artifacts.';
  }
  $('#lesson-note').textContent = chapter.note || '';
  $('#lesson-note').hidden = !chapter.note;
  $('#simulator-note').hidden = !browserRuntime;
  $('#results-runtime').textContent = browserRuntime ? 'Browser simulator · not DuskVM' : 'Local DuskVM';
  $('#code-note').textContent = browserRuntime ? 'Ctrl / ⌘ + Enter to simulate' : 'Ctrl / ⌘ + Enter to run';
  $('#hint').hidden = !chapter.hint; $('#hint').open = false; $('#hint-copy').textContent = chapter.hint || '';
  $('#editor').hidden = !coding; $('#character-card').hidden = !coding; $('#scene').hidden = coding;
  $('#reading-panel').hidden = chapter.kind !== 'guide';
  $('#reading-title').textContent = chapter.panelTitle || ''; $('#reading-copy').innerHTML = chapter.panel || '';
  $('#quiz-panel').hidden = chapter.kind !== 'practice'; $('#quiz-feedback').hidden = true;
  if (chapter.kind === 'practice') {
    $('#question').textContent = chapter.question;
    $('#choices').replaceChildren(...chapter.choices.map(([value, text]) => {
      const label = document.createElement('label'), input = document.createElement('input'), copy = document.createElement('span');
      input.type = 'radio'; input.name = 'answer'; input.value = value; input.required = true;
      input.checked = state.answers[chapter.id] === value; copy.textContent = text;
      input.onchange = () => { state.answers[chapter.id] = value; $('#quiz-feedback').hidden = true; save(); };
      label.append(input, copy); return label;
    }));
  }
  $('#character-setup').hidden = step !== 0; $('#earned').hidden = coding || step === 0;
  $('#earned-label').textContent = earned ? (simulatedCredit(lesson.check) ? 'Simulator check passed' : 'Skill learned') : 'Next skill';
  $('#earned-title').textContent = lesson.skill; $('#earned-summary').textContent = lesson.summary;
  $('#earned .skill-emblem').textContent = earned ? '✓' : '◇';
  $('#earned').dataset.earned = String(earned && (!browserRuntime || checked(lesson.check)));
  if (browserRuntime && earned) {
    if (checked(lesson.check)) $('#chapter-label').textContent = simulatedCredit(lesson.check) ? 'Lesson checked in the browser simulator' : 'Lesson checked in local DuskVM';
    else previewRecap(lesson.skill);
  }
  $('#code-context').hidden = !coding || (!browserRuntime && chapter.kind === 'code' && state.active === step);
  $('#code-context').textContent = browserRuntime ? `Simulator checks: “${activeChapter().short}”. The file is interpreted, not compiled. Browsing ahead does not skip unchecked coding tasks.` : chapter.kind === 'code' ? `You’re reviewing an earlier chapter. Code and tests are still on “${activeChapter().short}”.` : `Code and tests: “${activeChapter().short}”. Keep the same file while reading and practising.`;
  $('#character-name-input').value = state.name;
  $('#code').value = state.source;
  $('#code').scrollTop = $('#code').scrollLeft = 0;
  highlight(); clearResults(); character(); navigation();
  document.title = `${chapter.short} | Dusk Academy`;
  if (focus) {
    $('#lesson-title').focus({preventScroll:true});
    (earned && matchMedia('(max-width:900px)').matches ? $('#scene') : $('#lesson-title')).scrollIntoView({block:'nearest'});
  }
}

function go(step, focus = true) {
  if (!Number.isInteger(step) || step < 0 || step > limit()) return;
  cancel(); state.step = step;
  if (browserRuntime && step > 0) state.started = true;
  if (chapters[step].kind === 'code' && (!browserRuntime || step <= availableTask())) state.active = Math.max(state.active, step);
  history.replaceState(null, '', '#' + chapters[step].id);
  render(focus); save();
}

function feedback(message, tone, diagnostic = '') {
  $('#feedback').hidden = false; $('#feedback').dataset.tone = tone; $('#feedback-text').textContent = message;
  $('#diagnostics').hidden = !diagnostic; $('#diagnostics').open = Boolean(diagnostic); $('#error-detail').textContent = diagnostic;
}

function showResults(result, step) {
  if (result.calls) {
    $('#test-empty').hidden = true; $('#trace-results').hidden = false;
    const records = result.scenario.startsWith('records-') || result.advanced;
    const principal = id => Object.keys(contractIds).find(name => contractIds[name] === id) || id;
    const table = $('#trace-results');
    if (result.advanced) {
      $('#trace-details').hidden = false; $('#trace-summary').textContent = `View ${result.calls.length} calls, state reads and receipt events`;
      $('#trace-details').append(table);
    } else $('#test-panel').insertBefore(table, $('#trace-details'));
    $('#trace-results thead th:last-child').textContent = records ? 'Seats before → after' : 'Before → after';
    $('#trace-results tbody').replaceChildren(...result.calls.map(call => {
      const row = document.createElement('tr'); row.dataset.status = call.status;
      const label = document.createElement('th'); label.scope = 'row';
      const code = document.createElement('code'); code.textContent = call.call;
      if (call.fresh || call.actor) {
        const note = document.createElement('small');
        note.textContent = call.fresh ? 'Fresh deployment' : call.actor === 'Query' ? 'Direct query' : call.actor === 'Fixture' ? 'Venue test setup' : `${call.actor} → Registry`;
        label.append(note);
      }
      label.append(code);
      const status = document.createElement('td'); status.textContent = call.status === 'accepted' ? 'Accepted' : 'Rejected';
      const count = document.createElement('td'); count.textContent = `${call.before} → ${call.after}`;
      if (records) {
        const value = document.createElement('small'); value.textContent = `Returned: ${call.value ?? 'no value'}`; label.append(value);
        const stored = document.createElement('small'); stored.textContent = `${call.size} record${call.size === '1' ? '' : 's'}${call.next === null ? '' : ` · next ID ${call.next}`}`; count.append(stored);
      }
      if (result.advanced) {
        const info = document.createElement('small');
        info.textContent = `Venue: ${call.booked} seats${call.accounted === null ? '' : ` · sum: ${call.accounted}`}`;
        count.append(info);
        const details = document.createElement('details'), summary = document.createElement('summary'), data = document.createElement('pre');
        summary.textContent = `Records / ${call.events.length} event${call.events.length === 1 ? '' : 's'}`;
        const stored = call.records.filter(r => r.seats !== null).map(r => `#${r.id}: ${r.seats} seats · owner ${principal(r.owner)}${r.confirmed === null ? '' : r.confirmed ? ' · confirmed' : ' · pending'}`);
        const emitted = call.events.map(e => {
          const bytes = Uint8Array.from(e.data), view = new DataView(bytes.buffer);
          const payload = bytes.length === 16 ? `${view.getBigUint64(0,true)}, ${view.getBigUint64(8,true)}` : bytes.join(', ');
          return `${principal(e.source)}: ${e.topic}(${payload})`;
        });
        data.textContent = [...stored,...emitted].join('\n') || 'No stored records or events.';
        details.append(summary,data); label.append(details);
      }
      row.append(label, status, count); return row;
    }));
    if (result.build) {
      $('#build-results').hidden = false;
      const {contract,driver,functions} = result.build;
      $('#build-detail').textContent = `${result.build.runtime === 'simulator' ? 'Interpreted source (not WASM)' : 'Contract WASM'}: ${contract.bytes} bytes\nSHA-256: ${contract.sha256}\n\n${result.build.runtime === 'simulator' ? 'Prebuilt reference data-driver WASM' : 'Data-driver WASM'}: ${driver.bytes} bytes\nSHA-256: ${driver.sha256}\n\nMethod schema:\n${functions.map(f => `${f.name}: ${f.input} → ${f.output}`).join('\n')}\n\nEncoded register(2): ${result.build.encodedRegister}\nEncoded resize(2, 4): ${result.build.encodedResize}\nDecoded u64::MAX: ${result.build.decodedMax}\n\n${result.build.runtime === 'simulator' ? 'Parsed interface matched a prebuilt driver. No Rust compilation.' : 'Local build check only.'} No network deployment or signature.`;
    }
    return;
  }
  const calls = chapters[step].check === 'initial' ? [['New contract', result.initial], ['Read again', result.initial]] : [
    ['New contract', result.initial], ['register() × 1', result.after[0]], ['register() × 2', result.after[1]], ['register() × 3', result.after[2]],
  ];
  $('#test-empty').hidden = true; $('#call-results').hidden = false;
  $('#call-results').replaceChildren(...calls.map(([name, value]) => {
    const item = document.createElement('li'), label = document.createElement('small'), number = document.createElement('strong');
    label.textContent = name; number.textContent = value; item.append(label, number); return item;
  }));
}

async function run() {
  if (busy) { cancel(); clearResults('Run cancelled.'); navigation(); return; }
  if (['intro','earned'].includes(chapters[state.step].kind)) return;
  cancel();
  const thisTicket = ticket, source = state.source, step = state.active, simulated = browserRuntime;
  const chapter = chapters[step];
  controller = new AbortController(); const active = controller;
  const timeout = setTimeout(() => active.abort(), 45000);
  busy = true; clearResults(simulated ? 'Interpreting your contract in the browser…' : 'Compiling and testing your contract…'); navigation();
  try {
    if (new TextEncoder().encode(source).length > 8000) throw Error('The source limit is 8,000 UTF-8 bytes. Shorten the file and run it again.');
    let result;
    if (simulated) {
      result = simulateContract(source, chapter.scenario);
      if (chapter.scenario === 'build-driver') result.build = await inspectInterface(source, active.signal);
      if (thisTicket !== ticket) return;
    }
    else {
      const response = await fetch('/api/forge', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({source, lesson:chapter.scenario}), signal:active.signal});
      if (thisTicket !== ticket) return;
      result = await response.json().catch(() => ({}));
      if (thisTicket !== ticket) return;
      if (!response.ok) throw Error(result.error || 'The local runner is unavailable. Run npm run setup:forge, then npm run dev.');
    }
    const error = assess(step, result);
    if (result.ok) showResults(result, step);
    else $('#test-empty').textContent = 'No call results.';
    if (error) feedback(error, 'bad', result.error || '');
    else {
      markChecked(state, step, simulated);
      feedback(simulated ? 'Simulator check passed. Your source passed this checkpoint without Rust compilation.' : chapter.success, 'good');
      character(); save();
    }
  } catch (error) {
    if (thisTicket === ticket) {
      $('#test-empty').textContent = 'No call results.';
      feedback(error.name === 'AbortError' ? 'The run timed out. Check the local server and try again.' : error.message, 'bad');
    }
  } finally {
    clearTimeout(timeout);
    if (thisTicket === ticket) {
      controller = null; busy = false; navigation(); save();
      if (chapter.scenario !== 'state' || matchMedia('(max-width:900px)').matches) $('#feedback').scrollIntoView({block:'nearest'});
    }
  }
}

$('#code').addEventListener('input', () => {
  cancel(); state.source = $('#code').value;
  highlight(); clearResults('Run again to check your changes.'); navigation(); save();
});
$('#code').addEventListener('scroll', syncScroll);
$('#code').addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); run(); }
});
$('#run').addEventListener('click', run);
$('#next').addEventListener('click', () => {
  if ($('#next').hidden || $('#next').disabled) return;
  if (state.step === 0) state.started = true;
  go(state.step + 1);
});
$('#previous').addEventListener('click', () => go(state.step - 1));
$('#chapter-menu').onchange = event => go(Number(event.target.value), false);
$('#quiz').onsubmit = event => {
  event.preventDefault();
  const chapter = chapters[state.step];
  if (chapter.kind !== 'practice' || busy) return;
  const correct = state.answers[chapter.id] === chapter.answer;
  $('#quiz-feedback').hidden = false; $('#quiz-feedback').dataset.tone = correct ? 'good' : 'bad';
  $('#quiz-feedback').textContent = correct ? chapter.success : chapter.error;
  save(); $('#quiz-feedback').scrollIntoView({block:'nearest'});
};
$('#character-name-input').addEventListener('input', event => {
  state.name = cleanName(event.target.value);
  event.target.value = state.name; character(); save();
});
$('#skills-button').addEventListener('click', () => $('#skills').showModal());
$('#about-button').addEventListener('click', () => $('#about').showModal());
$('.skip-link').addEventListener('click', event => { event.preventDefault(); $(event.currentTarget.getAttribute('href')).focus(); });
window.addEventListener('hashchange', () => {
  const step = chapters.findIndex(chapter => '#' + chapter.id === location.hash);
  if (step < 0) showPaths();
  else go(step <= limit() ? step : state.step);
});
window.addEventListener('pagehide', cancel);
window.addEventListener('beforeunload', event => {
  if (!$('#save-error').hidden) { event.preventDefault(); event.returnValue = ''; }
});
const initial = chapters.findIndex(chapter => '#' + chapter.id === location.hash);
if (initial < 0) showPaths(false);
else go(initial <= limit() ? initial : state.step, false);
