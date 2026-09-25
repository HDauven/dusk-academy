// Compiles every Hatchery chapter's reference answer with the real Rust toolchain, as a Forge
// contract and as a data-driver. Uses the dependencies already prepared by `npm run setup:forge`
// (the crate in ~/.cache/dusk-academy/forge-lesson) and builds offline in a temporary copy.
//
//   node tools/check_prototype_rust.mjs            # all lessons
//   RUST_TOOLCHAIN=stable node tools/…             # pick the toolchain (default: 1.98.0)
import {mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir, homedir} from 'node:os';
import {join} from 'node:path';
import {chapters} from '../prototype/course.js';

const cache = join(homedir(), '.cache/dusk-academy/forge-lesson');
if (!existsSync(join(cache, 'Cargo.toml'))) {
  console.error(`No Forge lesson crate at ${cache}. Run \`npm run setup:forge\` first.`);
  process.exit(2);
}
const toolchain = process.env.RUST_TOOLCHAIN ?? '1.98.0';
const work = mkdtempSync(join(tmpdir(), 'dusklings-rust-'));
for (const name of ['Cargo.toml', 'Cargo.lock', 'build.rs', 'src']) cpSync(join(cache, name), join(work, name), {recursive: true});
// Tests and examples need the VM; a contract build doesn't.
writeFileSync(join(work, 'Cargo.toml'), readFileSync(join(work, 'Cargo.toml'), 'utf8')
  .replace(/\[dev-dependencies\][^[]*/, '').replace(/\[\[example\]\][^[]*/g, ''));

let failed = 0;
for (const c of chapters.filter(c => c.kind === 'code')) {
  writeFileSync(join(work, 'src/lib.rs'), c.answer);
  for (const feature of ['contract', 'data-driver-js']) {
    const run = spawnSync('cargo', [`+${toolchain}`, 'build', '--release', '--offline', '--target', 'wasm32-unknown-unknown', '--features', feature, '--message-format', 'short'],
      {cwd: work, env: {...process.env, CARGO_TARGET_DIR: join(work, `target-${feature}`)}, encoding: 'utf8'});
    const errors = run.stderr.split('\n').filter(l => /error/.test(l));
    if (run.status !== 0) { failed++; console.log(`FAIL  L${c.lesson + 1} ${c.id} (${feature})\n  ${errors.slice(0, 6).join('\n  ')}`); }
    else if (feature === 'contract') console.log(`ok    L${c.lesson + 1} ${c.id}`);
  }
}
rmSync(work, {recursive: true, force: true});
console.log(failed ? `${failed} build(s) failed.` : 'Every chapter answer compiles as a contract and as a data-driver.');
process.exit(failed ? 1 : 0);
