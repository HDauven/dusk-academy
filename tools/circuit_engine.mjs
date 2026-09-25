// Builds the PLONK engine (engines/circuit) with a chosen circuit.rs, and runs an engine in Node.
//
//   node tools/circuit_engine.mjs      # rebuild academy/vendor/circuit-engine.wasm from src/gates.rs
//
// check_rust.mjs also uses buildEngine() to compile learners' real circuits for comparison.
import {mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const crate = resolve(import.meta.dirname, '../engines/circuit');
const toolchain = process.env.RUST_TOOLCHAIN ? [`+${process.env.RUST_TOOLCHAIN}`] : [];

// Compiles the engine with `circuit` as src/circuit.rs. Returns {wasm} or {error}.
export function buildEngine(circuit, {target} = {}) {
  const work = mkdtempSync(join(tmpdir(), 'dusk-circuit-'));
  try {
    for (const name of ['Cargo.toml', 'Cargo.lock', 'src']) cpSync(join(crate, name), join(work, name), {recursive: true});
    writeFileSync(join(work, 'src/circuit.rs'), circuit);
    const run = spawnSync('cargo', [...toolchain, 'build', '--release', '--locked', '--target', 'wasm32-unknown-unknown', '--message-format', 'short'], {
      cwd: work, encoding: 'utf8',
      env: {...process.env, CARGO_TARGET_DIR: target ?? join(work, 'target'), RUSTFLAGS: '-C link-arg=--max-memory=67108864 -C link-arg=-zstack-size=262144'},
    });
    if (run.error) throw run.error;
    if (run.status !== 0) return {error: run.stderr.split('\n').filter(l => /error/.test(l)).slice(0, 8).join('\n')};
    return {wasm: readFileSync(join(target ?? join(work, 'target'), 'wasm32-unknown-unknown/release/dusklings_circuit.wasm'))};
  } finally {
    rmSync(work, {recursive: true, force: true});
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const gates = readFileSync(join(crate, 'src/gates.rs'), 'utf8');
  const {wasm, error} = buildEngine(gates);
  if (error) { console.error(error); process.exit(1); }
  const out = resolve(import.meta.dirname, '../academy/vendor');
  writeFileSync(join(out, 'circuit-engine.wasm'), wasm);
  const sha = data => createHash('sha256').update(data).digest('hex');
  const rustc = spawnSync('rustc', [...toolchain, '--version'], {encoding: 'utf8'}).stdout.trim();
  writeFileSync(join(out, 'circuit-engine.json'), JSON.stringify({
    rustc, plonk: '0.22.1', crate: 'engines/circuit',
    sourceSha256: sha(['Cargo.toml', 'Cargo.lock', 'src/lib.rs', 'src/gates.rs'].map(f => readFileSync(join(crate, f), 'utf8')).join('\0')),
    wasm: {bytes: wasm.length, sha256: sha(wasm)},
  }, null, 2) + '\n');
  console.log(`Built academy/vendor/circuit-engine.wasm (${wasm.length} bytes).`);
}
