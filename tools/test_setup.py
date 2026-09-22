"""Developer caches must fail with guidance, never install or rebuild implicitly."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch
import forge_lesson
import circuit_lesson

check = TestCase()
with TemporaryDirectory(prefix='dusk-setup-check-') as tmp:
    cache = Path(tmp)
    for module, ready, files, invoke, forbidden in [
        (forge_lesson,
         {'signature': 'current', 'contract': {'dusk_core': 'deps/core.rlib'}, 'data-driver': {'dusk_data_driver': 'deps/driver.rlib'}},
         ['actor.wasm', 'explorer.wasm', 'explorer-driver.wasm', 'target/release/examples/lesson_runner',
          'target/contract/deps/core.rlib', 'target/data-driver/deps/driver.rlib',
          'target/contract/wasm32-unknown-unknown/release/dusk_registry.wasm',
          'target/data-driver/wasm32-unknown-unknown/release/dusk_registry.wasm'],
         lambda: forge_lesson.run_contract('draft'), 'compile_wasm'),
        (circuit_lesson,
         {'signature': 'current', 'libraries': {'dusk_plonk': 'deps/plonk.rlib'}},
         ['src/lib.rs', 'target/deps/plonk.rlib'],
         lambda: circuit_lesson.compile_circuit('draft'), 'sandbox'),
    ]:
        for name in files:
            file = cache / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(b'trusted setup stub')
        metadata = cache / 'ready.json'
        metadata.write_text(json.dumps(ready))
        with patch.object(module, 'CACHE', cache), patch.object(module, 'signature', return_value='current'), \
                patch.object(module, forbidden, side_effect=AssertionError('Incomplete setup must not execute')) as execute, \
                patch.object(module, 'prepare', side_effect=AssertionError('No implicit preparation')) as prepare:
            if module is forge_lesson:
                assert forge_lesson.prepared() == ready
            for name in files:
                file = cache / name
                file.unlink()
                with check.assertRaisesRegex(OSError, 'Run npm run setup:'):
                    invoke()
                file.write_bytes(b'trusted setup stub')
            for bad in [None, {}, {**ready, 'signature': 'old'}, {**ready, 'contract': None, 'libraries': None}]:
                metadata.write_text(json.dumps(bad))
                with check.assertRaisesRegex(OSError, 'Run npm run setup:'):
                    invoke()
            execute.assert_not_called()
            prepare.assert_not_called()
print('PASS: incomplete developer caches give setup guidance without compilation or automatic preparation.')
