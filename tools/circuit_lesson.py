"""Prepare trusted PLONK dependencies; compile learner circuits only to browser WASM."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from forge_lesson import sandbox, diagnostics, TOOLCHAIN

PROJECT = Path(__file__).resolve().parent.parent / 'examples/first-circuit'
CACHE = Path.home() / '.cache/dusk-academy/circuit-lesson'
FILES = ['Cargo.toml', 'Cargo.lock', 'src/lib.rs', 'src/circuit.rs']
LIBRARIES = ['dusk_plonk', 'dusk_bytes', 'rand_chacha', 'rand_core', 'serde_json']


def signature():
    return hashlib.sha256(b''.join((PROJECT / name).read_bytes() for name in FILES)).hexdigest()


def prepare():
    CACHE.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        target = CACHE / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(PROJECT / name, target)
    env = {k: v for k, v in os.environ.items() if k not in ('RUSTFLAGS', 'CARGO_ENCODED_RUSTFLAGS', 'CARGO_TARGET_DIR')}
    env['CARGO_BUILD_JOBS'] = '2'
    subprocess.run(['cargo', '+' + TOOLCHAIN, 'build', '--release', '--locked', '--target', 'wasm32-unknown-unknown'], cwd=CACHE, env=env, check=True)
    deps = CACHE / 'target/wasm32-unknown-unknown/release/deps'
    libraries = {name: str(max(deps.glob(f'lib{name}-*.rlib'), key=lambda p: p.stat().st_mtime).relative_to(CACHE / 'target')) for name in LIBRARIES}
    (CACHE / 'ready.json').write_text(json.dumps({'signature': signature(), 'libraries': libraries}))
    print('PLONK lesson prepared.')


def compile_circuit(source):
    if not isinstance(source, str) or not source.strip() or len(source.encode('utf-8')) > 8000:
        raise ValueError('Keep the circuit between 1 and 8,000 UTF-8 bytes.')
    try:
        ready = json.loads((CACHE / 'ready.json').read_text())
        required = [CACHE / 'src/lib.rs', *(CACHE / 'target' / library for library in ready['libraries'].values())]
        if ready['signature'] != signature() or not all(path.is_file() for path in required):
            raise OSError('Incomplete or stale circuit setup')
        toolchain = Path(subprocess.check_output(['rustup', 'run', TOOLCHAIN, 'rustc', '--print', 'sysroot'], text=True, timeout=10).strip())
    except (OSError, ValueError, KeyError, TypeError, AttributeError, subprocess.SubprocessError) as error:
        raise OSError('Run npm run setup:circuits, then retry the developer command.') from error
    with tempfile.TemporaryDirectory(prefix='dusk-circuit-') as tmp:
        work = Path(tmp)
        (work / 'circuit.rs').write_text(source, encoding='utf-8')
        shutil.copyfile(CACHE / 'src/lib.rs', work / 'lib.rs')
        output, errors = work / 'output', work / 'errors'
        args = ['/toolchain/bin/rustc', 'lib.rs', '--crate-type', 'cdylib', '--crate-name', 'circuit', '--edition=2024',
                '--target', 'wasm32-unknown-unknown', '--error-format=json',
                '-L', 'dependency=/deps/wasm32-unknown-unknown/release/deps', '-L', 'dependency=/deps/release/deps',
                '-C', 'opt-level=3', '-C', 'panic=abort', '-C', 'overflow-checks=on', '-C', 'strip=symbols',
                '-C', 'link-arg=--max-memory=67108864', '-C', 'link-arg=-zstack-size=262144', '-o', 'circuit.wasm']
        for name, library in ready['libraries'].items():
            args += ['--extern', f'{name}=/deps/{library}']
        if sandbox(work, [(toolchain, '/toolchain'), (CACHE / 'target', '/deps')], args, output, errors):
            return None, diagnostics(errors)
        artifact = work / 'circuit.wasm'
        if not artifact.is_file() or artifact.stat().st_size > 2 * 1024**2:
            raise ValueError('The compiled circuit is too large for this lesson.')
        return artifact.read_bytes(), None


if __name__ == '__main__':
    prepare()
