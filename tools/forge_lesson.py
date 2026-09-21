"""Local-only, isolated Forge compilation and fixed DuskVM lesson scenarios."""
import hashlib
import json
import os
from pathlib import Path
import resource
import shutil
import signal
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT / 'examples/first-contract'
CACHE = Path.home() / '.cache/dusk-academy/forge-lesson'
TOOLCHAIN = '1.98.0'
FILES = ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'build.rs', 'src/lib.rs', 'src/lesson_actor.rs', 'src/lesson_registry.rs',
         'examples/lesson_runner.rs', 'examples/support/advanced.rs']
CHECKER = ROOT / 'tools/check_contract_driver.mjs'
SDK = ROOT / 'academy/vendor/dusk-connect.js'
ADVANCED = {'permissions-caller': 4, 'permissions-owner': 12, 'permissions-cancel': 20,
            'permissions-resize': 29, 'events-register': 29, 'events-changes': 29,
            'calls-quote': 37, 'calls-confirm': 47, 'tests-invariant': 54,
            'tests-atomic': 66, 'build-driver': 66}
TRACE_LENGTHS = {'arguments': 3, 'validation': 5, 'capacity': 8, 'records-empty': 2,
                 'records-ids': 8, 'records-save': 8, 'records-read': 11,
                 'records-missing': 13, 'records-cancel': 26, **ADVANCED}


def signature():
    return hashlib.sha256(b''.join(path.read_bytes() for path in [*(PROJECT / file for file in FILES), CHECKER, SDK])).hexdigest()


def prepare():
    """Explicit trusted setup only; HTTP requests never invoke Cargo or fetch deps."""
    forge = os.environ.get('DUSK_FORGE_BIN') or shutil.which('dusk-forge')
    if not forge:
        raise SystemExit('Install Dusk Forge v0.3.0 first. See academy/README.md.')
    CACHE.mkdir(parents=True, exist_ok=True)
    for file in FILES:
        target = CACHE / file
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(PROJECT / file, target)
    env = {key: value for key, value in os.environ.items() if key not in ('DUSK_FORGE_DEV', 'RUSTFLAGS', 'CARGO_ENCODED_RUSTFLAGS', 'CARGO_TARGET_DIR')}
    env['CARGO_BUILD_JOBS'] = '2'
    subprocess.run([forge, 'build', 'all', '--path', str(CACHE)], env=env, check=True)
    subprocess.run(['cargo', '+' + TOOLCHAIN, 'build', '--release', '--locked', '--example', 'lesson_runner'], cwd=CACHE, env=env, check=True)
    # Record only artifacts produced by this trusted, pinned preparation.
    ready = {'signature': signature()}
    for target, names in [('contract', ['dusk_core', 'dusk_forge']), ('data-driver', ['dusk_core', 'dusk_forge', 'dusk_data_driver'])]:
        deps = CACHE / f'target/{target}/wasm32-unknown-unknown/release/deps'
        ready[target] = {name: str(max(deps.glob(f'lib{name}-*.rlib'), key=lambda p: p.stat().st_mtime).relative_to(CACHE / f'target/{target}')) for name in names}
    with tempfile.TemporaryDirectory(prefix='dusk-actor-setup-') as tmp:
        work = Path(tmp)
        if compile_wasm(work, (PROJECT / 'src/lesson_actor.rs').read_text(), ready):
            raise SystemExit(diagnostics(work / 'errors.txt'))
        shutil.copyfile(work / 'lesson.wasm', CACHE / 'actor.wasm')
    with tempfile.TemporaryDirectory(prefix='dusk-registry-setup-') as tmp:
        work = Path(tmp)
        source = (PROJECT / 'src/lesson_registry.rs').read_text()
        for driver, artifact in [(False, 'explorer.wasm'), (True, 'explorer-driver.wasm')]:
            if compile_wasm(work, source, ready, driver=driver):
                raise SystemExit(diagnostics(work / 'errors.txt'))
            shutil.copyfile(work / ('driver.wasm' if driver else 'lesson.wasm'), CACHE / artifact)
    (CACHE / 'ready.json').write_text(json.dumps(ready))
    print('Forge lesson prepared. Start npm run dev.')


def limits(address_space=12 * 1024**3):
    resource.setrlimit(resource.RLIMIT_CPU, (12, 12))
    # Wasmtime reserves virtual address space; WASM linear memory is capped separately.
    resource.setrlimit(resource.RLIMIT_AS, (address_space, address_space))
    resource.setrlimit(resource.RLIMIT_FSIZE, (4 * 1024**2, 4 * 1024**2))
    resource.setrlimit(resource.RLIMIT_NOFILE, (256, 256))
    resource.setrlimit(resource.RLIMIT_NPROC, (1024, 1024))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def sandbox(work, mounts, command, output, errors, address_space=12 * 1024**3, deadline=None):
    args = ['bwrap', '--unshare-all', '--die-with-parent', '--new-session', '--cap-drop', 'ALL', '--clearenv']
    for path in ['/usr', '/lib', '/lib64']:
        args += ['--ro-bind', path, path]
    for source, target in mounts:
        args += ['--ro-bind', str(source), target]
    args += ['--bind', str(work), '/work', '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp',
             '--chdir', '/work', '--setenv', 'PATH', '/toolchain/bin:/usr/bin', '--setenv', 'LANG', 'C.UTF-8']
    timeout = min(20, deadline - time.monotonic()) if deadline is not None else 20
    if timeout <= 0:
        raise ValueError('This run took too long. Check for a loop or try a smaller contract.')
    with output.open('wb') as stdout, errors.open('wb') as stderr:
        process = subprocess.Popen(args + command, stdin=subprocess.DEVNULL, stdout=stdout, stderr=stderr,
                                   preexec_fn=lambda: limits(address_space), start_new_session=True, env={'PATH': '/usr/bin:/bin'})
        try:
            return process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            raise ValueError('This run took too long. Check for a loop or try a smaller contract.')


def diagnostics(errors):
    messages = []
    for line in errors.read_text(errors='replace').splitlines():
        try:
            item = json.loads(line)
            if item.get('level') == 'error' and not item.get('message', '').startswith('aborting due to'):
                messages.append(item.get('rendered', item.get('message', '')))
        except ValueError:
            pass
    return '\n'.join(messages)[:10000] or 'The isolated compiler could not finish. Check the local server setup.'


def prepared():
    try:
        ready = json.loads((CACHE / 'ready.json').read_text())
        required = [CACHE / name for name in ('actor.wasm', 'explorer.wasm', 'explorer-driver.wasm',
                                              'target/release/examples/lesson_runner')]
        for target in ('contract', 'data-driver'):
            root = CACHE / 'target' / target
            required.append(root / 'wasm32-unknown-unknown/release/dusk_registry.wasm')
            required.extend(root / library for library in ready[target].values())
        if ready['signature'] != signature() or not all(path.is_file() for path in required):
            raise OSError('Incomplete or stale Forge setup')
        return ready
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        raise OSError('Run npm run setup:forge, then restart npm run dev.') from error


def data_driver(explorer=False):
    prepared()
    return (CACHE / ('explorer-driver.wasm' if explorer else 'target/data-driver/wasm32-unknown-unknown/release/dusk_registry.wasm')).read_bytes()


REGISTRY_GETTERS = ('get_registration', 'owner_of', 'is_confirmed')


def read_registration(method, args):
    """Fixed read-only snapshot; requests choose only a getter and one u64 ID."""
    if method not in REGISTRY_GETTERS or not isinstance(args, bytes) or len(args) != 8:
        raise ValueError('Supply a registry getter and one encoded u64 record ID.')
    prepared()
    with tempfile.TemporaryDirectory(prefix='dusk-registry-read-') as tmp:
        work = Path(tmp)
        shutil.copyfile(CACHE / 'explorer.wasm', work / 'lesson.wasm')
        (work / 'args').write_bytes(args)
        output, errors = work / 'output', work / 'errors'
        if sandbox(work, [(CACHE / 'target/release/examples/lesson_runner', '/runner')],
                   ['/runner', 'explorer', method], output, errors):
            raise OSError('The local registry read failed.')
        result = output.read_bytes()
        if not 0 < len(result) <= 128:
            raise OSError('Invalid local registry response.')
        return result


def read_demo(count):
    """Two fixed local fixtures for Connect, not a full node or a wallet transaction."""
    if count not in (2, 7):
        raise ValueError('Unknown demo register.')
    prepared()
    with tempfile.TemporaryDirectory(prefix='dusk-read-demo-') as tmp:
        work = Path(tmp)
        shutil.copyfile(CACHE / 'target/contract/wasm32-unknown-unknown/release/dusk_registry.wasm', work / 'lesson.wasm')
        output, errors = work / 'output', work / 'errors'
        if sandbox(work, [(CACHE / 'target/release/examples/lesson_runner', '/runner')], ['/runner', f'read{count}'], output, errors):
            raise OSError('The local DuskVM read failed.')
        result = output.read_bytes()
        if len(result) != 8:
            raise OSError('Invalid local DuskVM response.')
        return result


def compile_wasm(work, source, ready, driver=False, deadline=None):
    """Two fixed targets; learner requests cannot supply compiler flags or manifests."""
    target = 'data-driver' if driver else 'contract'
    toolchain = Path(subprocess.check_output(['rustup', 'run', TOOLCHAIN, 'rustc', '--print', 'sysroot'], text=True, timeout=10).strip())
    (work / 'lib.rs').write_text(source)
    command = ['/toolchain/bin/rustc', 'lib.rs', '--crate-name', 'lesson', '--crate-type', 'cdylib',
               '--edition=2024', '--target', 'wasm32-unknown-unknown', '--cfg', f'feature="{target}"',
               '--error-format=json', '-L', 'dependency=/deps/wasm32-unknown-unknown/release/deps', '-L', 'dependency=/deps/release/deps',
               '-C', 'opt-level=1', '-C', 'overflow-checks=on', '-C', 'panic=abort', '-C', 'strip=symbols',
               '-C', 'link-arg=--import-undefined', '-C', 'link-arg=--max-memory=16777216',
               '-C', 'link-arg=-zstack-size=65536', '-o', 'driver.wasm' if driver else 'lesson.wasm']
    if driver:
        command += ['--cfg', 'feature="data-driver-js"']
    for name, library in ready[target].items():
        command += ['--extern', f'{name}=/deps/{library}']
    return sandbox(work, [(toolchain, '/toolchain'), (CACHE / f'target/{target}', '/deps')], command, work / 'output.txt', work / 'errors.txt', deadline=deadline)


def run_contract(source, lesson='state'):
    if not isinstance(lesson, str) or (lesson != 'state' and lesson not in TRACE_LENGTHS):
        raise ValueError('Choose a known lesson scenario.')
    if not isinstance(source, str) or not source.strip() or len(source.encode('utf-8')) > 8000:
        raise ValueError('Keep the contract between 1 and 8,000 UTF-8 bytes.')
    ready = prepared()
    deadline = time.monotonic() + 40  # Shared by both builds, VM calls and driver checks.
    with tempfile.TemporaryDirectory(prefix='dusk-forge-lesson-') as tmp:
        work = Path(tmp)
        stdout, errors = work / 'output.txt', work / 'errors.txt'
        status = compile_wasm(work, source, ready, deadline=deadline)
        if status:
            return {'ok': False, 'phase': 'compile', 'error': diagnostics(errors)}
        wasm = work / 'lesson.wasm'
        if not wasm.is_file() or wasm.stat().st_size > 1024**2:
            raise ValueError('The compiled contract is too large for this lesson.')
        if lesson in ADVANCED:
            shutil.copyfile(CACHE / 'actor.wasm', work / 'actor.wasm')
        # Piecrust reserves a 4-GiB address range per instance, even for bounded
        # 16-MiB WASM. Only the fixed multi-contract VM run needs extra virtual
        # space; compilation and the data-driver retain the 12-GiB ceiling.
        status = sandbox(work, [(CACHE / 'target/release/examples/lesson_runner', '/runner')], ['/runner', lesson], stdout, errors,
                         address_space=(32 if lesson in ADVANCED else 12) * 1024**3, deadline=deadline)
        if status:
            return {'ok': False, 'phase': 'execute', 'error': errors.read_text(errors='replace')[:10000] or 'DuskVM could not finish this run. Check for a loop or excessive memory use.'}
        try:
            result = json.loads(stdout.read_text())
            values = [result['initial'], result['fresh']]
            if lesson == 'state':
                if not isinstance(result['after'], list) or len(result['after']) != 3:
                    raise ValueError('Invalid state trace')
                values += result['after']
            else:
                expected = TRACE_LENGTHS[lesson]
                if result['scenario'] != lesson or not isinstance(result['calls'], list) or len(result['calls']) != expected:
                    raise ValueError('Invalid call trace')
                for call in result['calls']:
                    if not isinstance(call['call'], str) or len(call['call']) > 50 or call['status'] not in ('accepted', 'rejected') or not isinstance(call['fresh'], bool):
                        raise ValueError('Invalid call result')
                    values += [call['before'], call['after']]
                    if lesson.startswith('records-') or lesson in ADVANCED:
                        values.append(call['size'])
                        if call['next'] is not None:
                            values.append(call['next'])
                        if call['status'] == 'rejected':
                            if call['value'] is not None:
                                raise ValueError('Rejected call returned a value')
                        elif not isinstance(call['value'], str) or len(call['value']) > 80:
                            raise ValueError('Invalid record result')
                    if lesson in ADVANCED:
                        if result.get('advanced') is not True or call['actor'] not in ('Query', 'A', 'B', 'Transfer', 'Fixture'):
                            raise ValueError('Invalid actor trace')
                        values.append(call['booked'])
                        if call['accounted'] is not None:
                            values.append(call['accounted'])
                        if not isinstance(call['records'], list) or len(call['records']) not in (0, 10) or not isinstance(call['events'], list) or len(call['events']) > 16:
                            raise ValueError('Invalid record/event trace')
                        for record in call['records']:
                            values.append(record['id'])
                            if record['seats'] is not None:
                                values.append(record['seats'])
                            if record['owner'] is not None and (not isinstance(record['owner'], str) or len(record['owner']) != 64 or any(c not in '0123456789abcdef' for c in record['owner'])):
                                raise ValueError('Invalid owner')
                            if record['confirmed'] is not None and type(record['confirmed']) is not bool:
                                raise ValueError('Invalid confirmation')
                        for event in call['events']:
                            if not isinstance(event['source'], str) or len(event['source']) != 64 or any(c not in '0123456789abcdef' for c in event['source']) or not isinstance(event['topic'], str) or len(event['topic']) > 64 or not isinstance(event['data'], list) or len(event['data']) > 256 or any(type(n) is not int or not 0 <= n <= 255 for n in event['data']):
                                raise ValueError('Invalid event')
            if not all(isinstance(value, str) and value.isascii() and value.isdecimal() and len(value) <= 20 for value in values):
                raise ValueError('Invalid count')
        except (ValueError, KeyError, TypeError) as error:
            raise OSError('The isolated DuskVM runner returned an invalid result.') from error
        if lesson == 'build-driver':
            if compile_wasm(work, source, ready, driver=True, deadline=deadline):
                return {'ok': False, 'phase': 'compile', 'target': 'data-driver', 'error': diagnostics(errors)}
            driver = work / 'driver.wasm'
            if driver.stat().st_size > 1024**2:
                raise ValueError('The data-driver is too large for this lesson.')
            node = shutil.which('node')
            if not node:
                raise OSError('Node is required to check the data-driver.')
            status = sandbox(work, [(Path(node).resolve(), '/node'), (CHECKER, '/checker.mjs'), (SDK, '/sdk.mjs')],
                             ['/node', '--max-old-space-size=128', '--wasm-max-mem-pages=256', '/checker.mjs'], stdout, errors, deadline=deadline)
            if status:
                return {'ok': False, 'phase': 'execute', 'error': 'Data-driver check failed:\n' + errors.read_text(errors='replace')[:8000]}
            try:
                built = json.loads(stdout.read_text())
                if not isinstance(built['functions'], list) or len(built['functions']) > 40:
                    raise ValueError('Invalid schema')
            except (ValueError, KeyError, TypeError) as error:
                raise OSError('Invalid data-driver result') from error
            result['build'] = {**built, 'contract': {'bytes': wasm.stat().st_size, 'sha256': hashlib.sha256(wasm.read_bytes()).hexdigest()},
                               'driver': {'bytes': driver.stat().st_size, 'sha256': hashlib.sha256(driver.read_bytes()).hexdigest()}}
        return {'ok': True, **result}


if __name__ == '__main__':
    prepare()
