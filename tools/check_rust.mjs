// Compiles every Hatchery chapter's reference answer with the real Rust toolchain and Dusk Forge,
// as a contract and as a data-driver, in a temporary copy of examples/hatchery.
//
//   npm run test:rust
//   RUST_TOOLCHAIN=stable npm run test:rust     # use an installed toolchain instead of the pinned 1.98.0
//   CARGO_NET_OFFLINE=true npm run test:rust    # build only from crates that are already cached
import {mkdtempSync, cpSync, writeFileSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {chapters} from '../academy/course.js';
import {chapters as circuitChapters, samplesOf, SUM_CASES, ARENA_CASES} from '../academy/stats-lessons.js';
import {circuitProgram, runEngine} from '../academy/circuit.js';
import {buildEngine} from './circuit_engine.mjs';
import {buildAlmanac} from './build_almanac.mjs';
import {readFileSync} from 'node:fs';

const crate = resolve(import.meta.dirname, '../examples/hatchery');
const work = mkdtempSync(join(tmpdir(), 'dusk-hatchery-'));
for (const name of ['Cargo.toml', 'Cargo.lock', 'build.rs', 'rust-toolchain.toml']) cpSync(join(crate, name), join(work, name));
const toolchain = process.env.RUST_TOOLCHAIN ? [`+${process.env.RUST_TOOLCHAIN}`] : [];

let failed = 0;
for (const c of chapters.filter(c => c.kind === 'code')) {
  cpSync(join(crate, 'src'), join(work, 'src'), {recursive: true});
  writeFileSync(join(work, 'src/lib.rs'), c.answer);
  for (const feature of ['contract', 'data-driver-js']) {
    const run = spawnSync('cargo', [...toolchain, 'build', '--release', '--target', 'wasm32-unknown-unknown', '--features', feature, '--message-format', 'short'],
      {cwd: work, env: {...process.env, CARGO_TARGET_DIR: join(work, `target-${feature}`)}, encoding: 'utf8'});
    if (run.error) { console.error(`Couldn't run cargo: ${run.error.message}`); process.exit(2); }
    if (run.status !== 0) {
      failed++;
      console.log(`FAIL  L${c.lesson + 1} ${c.id} (${feature})\n  ${run.stderr.split('\n').filter(l => /error/.test(l)).slice(0, 6).join('\n  ')}`);
    } else if (feature === 'contract') console.log(`ok    L${c.lesson + 1} ${c.id}`);
  }
}
rmSync(work, {recursive: true, force: true});

// Circuits: compile each answer as real Rust inside the PLONK engine, prove the chapter's samples
// natively, and require the same outcome as the browser engine (which replays interpreted gates).
const browser = readFileSync(resolve(import.meta.dirname, '../academy/vendor/circuit-engine.wasm'));
const circuitTarget = mkdtempSync(join(tmpdir(), 'dusk-circuit-target-'));
for (const c of circuitChapters.filter(c => c.kind === 'code')) {
  const samples = samplesOf(c.lesson === 0 ? SUM_CASES : ARENA_CASES);
  const {wasm, error} = buildEngine(c.answer, {target: circuitTarget});
  if (error) { failed++; console.log(`FAIL  circuits ${c.id} (compile)\n  ${error}`); continue; }
  const [native, interpreted] = [await runEngine(wasm, samples), await runEngine(browser, samples, circuitProgram(c.answer, samples))];
  const outcome = r => JSON.stringify(r.cases.map(x => [x.verified, x.publics, x.tamperedVerified]));
  if (outcome(native) !== outcome(interpreted)) { failed++; console.log(`FAIL  circuits ${c.id}: native ${outcome(native)} vs browser ${outcome(interpreted)}`); }
  else console.log(`ok    circuits ${c.id} (native proofs match the browser engine)`);
}
// The vendored browser artifacts must be exactly what their sources build.
const same = (name, built) => {
  const ok = readFileSync(resolve(import.meta.dirname, '../academy/vendor', name)).equals(Buffer.from(built));
  if (!ok) failed++;
  console.log(`${ok ? 'ok   ' : 'FAIL '} vendor/${name} ${ok ? 'matches its source build' : 'differs from its source build: rebuild it'}`);
};
const engine = buildEngine(readFileSync(resolve(import.meta.dirname, '../engines/circuit/src/gates.rs'), 'utf8'), {target: circuitTarget});
if (engine.error) { failed++; console.log(`FAIL  circuit engine\n  ${engine.error}`); } else same('circuit-engine.wasm', engine.wasm);
const almanacBuild = buildAlmanac();
same('hatchery-driver.wasm', almanacBuild.driver);
same('almanac-fixture.json', almanacBuild.fixture);
rmSync(circuitTarget, {recursive: true, force: true});
console.log(failed ? `${failed} check(s) failed.` : 'Every contract answer compiles as a contract and a data-driver, and every circuit answer proves the same natively as in the browser.');
process.exit(failed ? 1 : 0);
