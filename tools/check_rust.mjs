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
console.log(failed ? `${failed} build(s) failed.` : 'Every chapter answer compiles as a contract and as a data-driver.');
process.exit(failed ? 1 : 0);
