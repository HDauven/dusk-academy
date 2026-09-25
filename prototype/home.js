import {chapters as hatchery, WICK} from './lesson1.js';
import {levels, chapters as journey, levelQuizzes} from './journey.js';
import {createScene} from './scene.js';
import {drawCreature, sprite, traitNames, GENE_COLORS, GEAR_INFO} from './creature.js';
import {load, favicon, loadKeeper} from './store.js';

const $ = s => document.querySelector(s);
const trip = load('journey', {at: 0, answers: {}});
const code = load('hatchery', {at: 0, passed: {}});
const keeper = loadKeeper();
favicon(sprite(WICK));

// Keeper's journey: one tile per level with its reward.
const right = c => !!trip.answers[c.id]?.right;
const levelLit = l => levelQuizzes(l).filter(right).length;
const levelDone = l => levelLit(l) === levelQuizzes(l).length && (l > 0 || !!keeper.dna);
const current = levels.findIndex((_, l) => !levelDone(l));
const tripStarted = trip.at > 0 || Object.keys(trip.answers).length > 0, tripDone = current < 0;
$('#journey-map').innerHTML = levels.map((lv, l) => {
  const n = levelLit(l), total = levelQuizzes(l).length, first = journey.find(c => c.level === l);
  const status = levelDone(l) ? (lv.reward ? GEAR_INFO[lv.reward] : `${keeper.name} hatched`) : n ? `${n} / ${total} lit` : lv.topic;
  return `<li class="open ${levelDone(l) ? 'done' : ''} ${l === current ? 'next' : ''}"><a href="journey.html#${first.id}"><b>${l + 1}</b><strong>${lv.title}</strong><small>${status}</small></a></li>`;
}).join('');
const resume = journey[trip.at] ?? journey[0];
$('#journey-go').textContent = tripDone ? 'Review' : tripStarted ? 'Continue' : 'Start';
$('#journey-go').href = `journey.html#${resume.id}`;

// Contract path.
const codeChapters = hatchery.filter(c => c.kind === 'code'), passed = codeChapters.filter(c => code.passed[c.id]).length;
const codeDone = passed === codeChapters.length, codeStarted = passed > 0 || code.at > 0;
$('#contracts-go').textContent = codeDone ? 'Review' : codeStarted ? 'Continue' : 'Start';
$('#contracts-go').href = `hatchery.html#${hatchery[codeDone ? 0 : code.at]?.id ?? ''}`;
const lessons = [
  {n: 1, title: 'The Hatchery', status: codeDone ? 'done' : `${passed} / ${codeChapters.length} checks`, href: 'hatchery.html'},
  {n: 2, title: 'Keepers'}, {n: 3, title: 'Moth hunt'}, {n: 4, title: 'Night battles'}, {n: 5, title: 'Trading'},
];
$('#lesson-map').innerHTML = lessons.map(l => `<li class="${l.href ? 'open' : 'soon'} ${l.status === 'done' ? 'done' : ''}">${l.href ? `<a href="${l.href}">` : '<span>'}<b>${l.n}</b><strong>${l.title}</strong><small>${l.status ?? 'soon'}</small>${l.href ? '</a>' : '</span>'}</li>`).join('');

// Hero buttons follow the learner.
if (tripStarted && !tripDone) { $('#hero-primary').textContent = `Continue level ${current + 1}: ${levels[current].title}`; $('#hero-primary').href = $('#journey-go').href; }
else if (tripDone) { $('#hero-primary').textContent = codeDone ? 'Review the Hatchery' : codeStarted ? 'Continue the Hatchery' : 'Start the Hatchery'; $('#hero-primary').href = $('#contracts-go').href; $('#hero-secondary').textContent = 'Review the journey'; $('#hero-secondary').href = 'journey.html'; }

document.querySelectorAll('canvas[data-dna]').forEach(c => drawCreature(c, c.dataset.dna, {scale: 2}));

// Your Duskling, wearing whatever it has earned.
if (keeper.dna) {
  drawCreature($('#keeper-face'), keeper.dna, {scale: 1, gear: keeper.gear});
  $('#keeper-name').textContent = keeper.name;
  $('#yours').hidden = false;
  drawCreature($('#yours-creature'), keeper.dna, {scale: 6, gear: keeper.gear});
  $('#yours-name').textContent = keeper.name;
  $('#yours-dna').innerHTML = [...Array(8)].map((_, i) => `<b style="color:${GENE_COLORS[i]}">${keeper.dna.slice(i * 2, i * 2 + 2)}</b>`).join('');
  $('#yours-traits').innerHTML = traitNames(keeper.dna).map(t => `<dt>${t.label}</dt><dd>${t.value}</dd>`).join('')
    + `<dt>Gear</dt><dd>${keeper.gear.length ? keeper.gear.map(g => GEAR_INFO[g]).join(', ') : 'none yet'}</dd>`;
} else {
  drawCreature($('#keeper-face'), '0000000000000000', {scale: 1});
  $('#keeper-face').style.opacity = '.35';
}

const scene = createScene($('#scene'), {kind: 'harbor'});
const l = tripDone ? levels.length - 1 : Math.max(0, current);
scene.show({keeper: WICK, companion: keeper.dna || null, egg: !keeper.dna, gear: keeper.gear, lanterns: levelQuizzes(l).length, lit: levelQuizzes(l).map(right), animate: false});
