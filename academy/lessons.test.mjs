// Every Hatchery chapter: the reference answer passes its check, the starting file doesn't,
// and each chapter starts exactly where the previous one ended.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lessons, chapters} from './course.js';
import {file, LESSON1} from './hatchery-file.js';
import {friendly} from './contract.js';
import {levels, chapters as journey} from './journey.js';

test('the Lesson 1 template matches the Lesson 1 reference file', () => {
  assert.equal(file(LESSON1), lessons[0].reference);
});

test('examples/hatchery is the finished Lesson 5 contract', () => {
  assert.equal(readFileSync(new URL('../examples/hatchery/src/lib.rs', import.meta.url), 'utf8'), lessons[4].reference + '\n');
});

test('every code chapter passes with its answer and fails from its start', () => {
  for (const c of chapters.filter(c => c.kind === 'code')) {
    assert.doesNotThrow(() => c.check(c.answer), `${c.id}: the reference answer should pass`);
    assert.throws(() => c.check(c.start), `${c.id}: the starting file should not pass`);
    try { c.check(c.start); } catch (e) { assert.ok(friendly(e).text.length > 10, `${c.id}: the failure needs a readable message`); }
  }
});

test('chapters chain: each start is the previous answer, across lessons too', () => {
  const code = chapters.filter(c => c.kind === 'code');
  for (let i = 1; i < code.length; i++) {
    const [a, b] = [code[i - 1], code[i]];
    const sameLesson = a.lesson === b.lesson;
    // Chapters that supply new lines up front (lesson 1's vectors and mixing, and the event types that
    // arrive half-written) start from a prepared file.
    if (sameLesson && !['vectors', 'mixing', 'event-type', 'hunted-type', 'transferred'].includes(b.id)) assert.equal(b.start, a.answer, `${b.id} should start from ${a.id}'s answer`);
    if (!sameLesson) assert.equal(b.start, lessons[a.lesson].reference, `${b.id} should start from the end of lesson ${a.lesson + 1}`);
  }
  lessons.forEach((l, i) => assert.equal(l.reference, code.filter(c => c.lesson === i).at(-1).answer, `lesson ${i + 1} reference`));
});

test('chapter ids are unique', () => {
  const ids = chapters.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(journey.map(c => c.id)).size, journey.length);
});

test('every journey question has exactly one right answer and an explanation for each choice', () => {
  for (const c of journey.filter(c => c.kind === 'quiz')) {
    assert.equal(c.choices.filter(x => x.right).length, 1, c.id);
    for (const x of c.choices) assert.ok(x.why && x.text, `${c.id}/${x.id}`);
  }
  assert.equal(levels.length, 5);
  assert.ok(!/xsc/i.test(JSON.stringify(journey)), 'XSC is shelved and must not appear');
});

test('stored progress is untrusted: keeper data is validated and prototype keys are ignored', async () => {
  const data = new Map();
  globalThis.localStorage = {getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k)};
  try {
    const name = ' <svg onload=alert(1)> with a long tail ';
    data.set('dusklings:keeper:v1', JSON.stringify({name, dna: '<b>1234567890123456</b>', gear: ['cloak', 'crown', '__proto__'], extra: 1}));
    data.set('dusklings:journey:v1', '{"__proto__": {"polluted": true}, "at": 2}');
    const {loadKeeper, load} = await import('./store.js');
    assert.deepEqual(loadKeeper(), {name: name.trim().slice(0, 24), dna: '', gear: ['cloak']});
    const trip = load('journey', {at: 0, answers: {}});
    assert.equal(trip.at, 2);
    assert.equal(trip.polluted, undefined);
    assert.equal(Object.getPrototypeOf(trip), Object.prototype);
  } finally { delete globalThis.localStorage; }
});
