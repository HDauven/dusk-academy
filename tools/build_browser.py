"""Build distributable browser engines from the already-prepared, pinned toolchains.
No learner runs this script; no dependencies are fetched or installed here.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
from forge_lesson import prepared, compile_wasm, data_driver, diagnostics, TOOLCHAIN
from circuit_lesson import compile_circuit
from test_forge_lesson import record_sources, advanced_sources

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'academy/vendor'


def lesson_sources():
    source = subprocess.check_output(['node', '--input-type=module', '-e',
        f'import {{starter}} from "{(ROOT / "academy/lesson.js").as_uri()}"; process.stdout.write(starter);'], text=True)
    source = source.replace('count: 7', 'count: 0')
    stages = {'initial': source}
    source = source.replace('// Add one registration.', 'self.count += 1;'); stages['state'] = source
    source = source.replace('register(&mut self)', 'register(&mut self, amount: u64)').replace('self.count += 1;', 'self.count += amount;'); stages['arguments'] = source
    source = source.replace('self.count += amount;', 'assert!(amount > 0); self.count += amount;'); stages['validation'] = source
    source = source.replace('self.count += amount;', 'self.count += amount; assert!(self.count <= 10);'); stages['capacity'] = source
    stages.update(record_sources(source)); stages.update(advanced_sources(stages['records-cancel']))
    return stages


def build():
    ready = prepared()
    artifacts = {'counter-driver.wasm': data_driver(), 'explorer-driver.wasm': data_driver(explorer=True)}
    source = lesson_sources()['build-driver']
    with tempfile.TemporaryDirectory(prefix='academy-browser-driver-') as tmp:
        work = Path(tmp)
        if compile_wasm(work, source, ready, driver=True):
            raise RuntimeError(diagnostics(work / 'errors.txt'))
        artifacts['registry-methods.wasm'] = (work / 'driver.wasm').read_bytes()
    engine = (ROOT / 'examples/first-circuit/src/browser.rs').read_text()
    wasm, error = compile_circuit(engine)
    if error:
        raise RuntimeError(error)
    artifacts['circuit-program.wasm'] = wasm
    manifest = {'rust': TOOLCHAIN, 'forge': 'v0.3.0', 'duskCore': '1.6.0', 'plonk': '0.22.1',
                'registrySourceSha256': hashlib.sha256(source.encode()).hexdigest(),
                'circuitEngineSourceSha256': hashlib.sha256(engine.encode()).hexdigest(),
                'artifacts': {}}
    for name, data in artifacts.items():
        (OUT / name).write_bytes(data)
        manifest['artifacts'][name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    (OUT / 'browser-runtime.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Built four local browser artifacts. No edited learner Rust is compiled by these assets.')


if __name__ == '__main__':
    build()
