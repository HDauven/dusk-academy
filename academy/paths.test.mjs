// The Circuits and dApps paths: every chapter against the real PLONK engine and the real Dusk
// Connect SDK with the Hatchery's data-driver, plus the rules that keep those checks honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chapters as stats, lessons as statsLessons, samplesOf, SUM_CASES} from './stats-lessons.js';
import {chapters as almanac, lessons as almanacLessons} from './almanac-lessons.js';
import {circuitProgram, runEngine} from './circuit.js';
import {runPlan, SDK_EXPRESSION} from './almanac-harness.js';
import {fixtureFetch, NODE, OFFLINE_NODE} from './almanac-transport.js';

const vendor = name => readFileSync(new URL(`./vendor/${name}`, import.meta.url));
const engine = vendor('circuit-engine.wasm');
const prover = source => samples => runEngine(engine, samples, circuitProgram(source, samples));
const fixture = JSON.parse(vendor('almanac-fixture.json')), driver = vendor('hatchery-driver.wasm');
const sdk = pathToFileURL(new URL('./vendor/dusk-connect.js', import.meta.url).pathname).href;
const dir = mkdtempSync(join(tmpdir(), 'almanac-test-'));
let modules = 0;
async function runJs(source, plan) {
  const requests = [];
  globalThis.fetch = fixtureFetch({fixture, driver, log: requests});
  const file = join(dir, `learner-${modules++}.mjs`);
  writeFileSync(file, source.replace(SDK_EXPRESSION, JSON.stringify(sdk)));
  return runPlan(await import(pathToFileURL(file).href), plan, fixture, requests);
}
test.after(() => rmSync(dir, {recursive: true, force: true}));

test('every Secret stats chapter: the answer proves as expected, the start does not pass', async () => {
  for (const c of stats.filter(c => c.kind === 'code')) {
    await assert.doesNotReject(async () => c.check(c.answer, prover(c.answer)), `${c.id}: answer`);
    await assert.rejects(async () => c.check(c.start, prover(c.start)), `${c.id}: start`);
  }
  assert.equal(stats.find(c => c.id === 'hide-power').start, statsLessons[0].reference);
});

test('circuits must be constraints: no secret-dependent structure, no Rust asserts, no unknown gates', () => {
  const circuit = body => statsLessons[0].reference.replace('        composer.assert_equal(sum, power);\n', body);
  assert.throws(() => circuitProgram(circuit('        if self.power == BlsScalar::from(55u64) { composer.assert_equal(sum, power); }\n'), samplesOf(SUM_CASES)), /structure changes/);
  assert.throws(() => circuitProgram(circuit('        assert!(self.strength + self.agility == self.power);\n'), samplesOf(SUM_CASES)), /Rust check/);
  assert.throws(() => circuitProgram(circuit('        composer.component_range::<7>(sum);\n'), samplesOf(SUM_CASES)), /component_range/);
  assert.throws(() => circuitProgram(circuit('        composer.append_constant(sum);\n'), samplesOf(SUM_CASES)), /isn't part of the composer subset/);
});

test('every Almanac chapter: the answer passes with real Dusk Connect, the start does not', async () => {
  for (const c of almanac.filter(c => c.kind === 'code')) {
    const pass = await runJs(c.answer, c.plan);
    assert.doesNotThrow(() => c.check(pass, fixture), `${c.id}: answer`);
    const start = await runJs(c.start, c.plan);
    assert.throws(() => c.check(start, fixture), `${c.id}: start`);
  }
  assert.equal(almanac.find(c => c.id === 'prepare-hatch').start.startsWith(almanacLessons[0].reference), true);
});

test('the SDK facts the Almanac teaches hold for the real driver', async () => {
  const probe = `${almanacLessons[0].reference}
export async function raw(dusk, fn, args) { return await dusk.readContract({ contract: "hatchery", functionName: fn, args }); }`;
  const [count, dna3, bigArg, stringArg] = await runJs(probe, [
    {fn: 'raw', args: ['duskling_count']}, {fn: 'raw', args: ['dna_of', 3]}, {fn: 'raw', args: ['dna_of', 3n]}, {fn: 'raw', args: ['dna_of', '3']},
  ]);
  assert.equal(count.value, '6', 'a top-level u64 arrives as an exact string');
  assert.equal(dna3.value, 9437186547890124, 'an Option<u64> above 2^53 arrives rounded');
  assert.equal(fixture.dusklings[3].dna, '9437186547890123');
  assert.match(bigArg.error, /expected u64/, 'a BigInt argument is sent as a JSON string and refused');
  assert.match(stringArg.error, /expected u64/);
});

test('the practice node answers only itself, and a down node fails instead of looking empty', async () => {
  const f = fixtureFetch({fixture, driver});
  await assert.rejects(f('https://example.com/on/contracts:00/duskling_count', {method: 'POST'}), /practice node/);
  assert.equal((await f(`${OFFLINE_NODE}/on/contracts:${fixture.contract}/duskling_count`, {method: 'POST'})).status, 503);
  assert.equal((await f(`${NODE}/on/contracts:${'00'.repeat(32)}/duskling_count`, {method: 'POST'})).status, 404);
});

test('every page has a strict Content Security Policy, and the Almanac allows exactly its sandbox script', async () => {
  const {FRAME_SCRIPT} = await import('./almanac-sandbox.js');
  const hash = createHash('sha256').update(FRAME_SCRIPT, 'utf8').digest('base64');
  for (const page of ['index', 'journey', 'hatchery', 'secret-stats', 'almanac', 'creatures']) {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
    const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
    assert.ok(policy, `${page}.html has a policy`);
    const scripts = policy.match(/script-src ([^;]+)/)[1];
    assert.ok(!/'unsafe-inline'|'unsafe-eval'/.test(scripts), `${page}.html allows no inline or eval scripts`);
    assert.match(policy, /object-src 'none'.*base-uri 'none'/, `${page}.html blocks plugins and base changes`);
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html), `${page}.html has no inline scripts`);
  }
  assert.ok(readFileSync(new URL('../almanac.html', import.meta.url), 'utf8').includes(`'sha256-${hash}'`),
    'almanac.html must allow the current sandbox script: update its hash after changing FRAME_SCRIPT');
});
