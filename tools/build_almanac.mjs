// Builds the Almanac's vendored assets:
//   academy/vendor/hatchery-driver.wasm   the Hatchery's real data-driver (examples/hatchery)
//   academy/vendor/almanac-fixture.json   node responses produced by engines/almanac-fixture
//   academy/vendor/almanac.json           versions and hashes
//
//   RUST_TOOLCHAIN=stable node tools/build_almanac.mjs
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..'), out = join(root, 'academy/vendor');
const toolchain = process.env.RUST_TOOLCHAIN ? [`+${process.env.RUST_TOOLCHAIN}`] : [];

// Builds both artifacts in a scratch target directory and returns them.
export function buildAlmanac() {
  const target = mkdtempSync(join(tmpdir(), 'dusk-almanac-'));
  const cargo = (cwd, args) => {
    const run = spawnSync('cargo', [...toolchain, ...args], {cwd, encoding: 'utf8', maxBuffer: 1 << 26, env: {...process.env, CARGO_TARGET_DIR: target}});
    if (run.status !== 0) throw Error(run.stderr);
    return run.stdout;
  };
  try {
    const fixture = cargo(join(root, 'engines/almanac-fixture'), ['run', '--release', '--locked', '--quiet']);
    cargo(join(root, 'examples/hatchery'), ['build', '--release', '--locked', '--target', 'wasm32-unknown-unknown', '--features', 'data-driver-js']);
    return {fixture, driver: readFileSync(join(target, 'wasm32-unknown-unknown/release/dusk_hatchery.wasm'))};
  } finally {
    rmSync(target, {recursive: true, force: true});
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {fixture, driver} = buildAlmanac();
  writeFileSync(join(out, 'almanac-fixture.json'), fixture);
  writeFileSync(join(out, 'hatchery-driver.wasm'), driver);
  const sha = data => createHash('sha256').update(data).digest('hex');
  writeFileSync(join(out, 'almanac.json'), JSON.stringify({
    rustc: spawnSync('rustc', [...toolchain, '--version'], {encoding: 'utf8'}).stdout.trim(),
    forge: '0.3.0', duskCore: '1.6.0',
    contractSourceSha256: sha(readFileSync(join(root, 'examples/hatchery/src/lib.rs'))),
    'hatchery-driver.wasm': {bytes: driver.length, sha256: sha(driver)},
    'almanac-fixture.json': {sha256: sha(fixture)},
    'dusk-connect.js': {sha256: sha(readFileSync(join(out, 'dusk-connect.js'))), source: 'https://github.com/dusk-network/connect @ 67b37ab0969bd42bf2b8d95f7b610cb654e49be8'},
  }, null, 2) + '\n');
  console.log(`Built hatchery-driver.wasm (${driver.length} bytes) and almanac-fixture.json.`);
}
