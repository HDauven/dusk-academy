"""Check current HTTP routes and request boundaries without invoking a compiler."""
from contextlib import closing
from functools import partial
from http.client import HTTPConnection
from http.server import HTTPServer
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from unittest.mock import patch
import forge_lesson
from serve import Handler, ROOT, DEMO_READS, REGISTRY_READS

server = HTTPServer(('127.0.0.1', 0), partial(Handler, directory=ROOT))
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()


def request(path, body=None, headers=None):
    with closing(HTTPConnection('127.0.0.1', server.server_port, timeout=5)) as connection:
        connection.request('GET' if body is None else 'POST', path, body, headers or {})
        response = connection.getresponse()
        return response.status, response.headers, response.read()


try:
    for path in ['/', '/course.html', '/academy/app.js', '/academy/course-app.js',
                 '/academy/editor.js', '/academy/vendor/dusk-connect.js',
                 '/academy/assets/workshop-pixel.webp', '/academy/assets/portrait-pixel.webp',
                 '/assets/manrope.woff2', '/assets/silkscreen.woff2']:
        status, _, body = request(path)
        assert status == 200 and body, path
    for path in ['/city.html', '/curriculum.html', '/dusklings.html', '/puzzles/', '/concepts/', '/learn/']:
        assert request(path)[0] == 404, path
    assert request('/api/compile', b'{}', {'Content-Type': 'application/json'})[0] == 404
    for name in ['dapp', 'circuit']:
        status, headers, _ = request(f'/academy/{name}-worker.js')
        assert status == 200
        csp = headers['Content-Security-Policy']
        assert csp.startswith("default-src 'none'; script-src 'self' blob: 'wasm-unsafe-eval'; worker-src 'none'; connect-src ")
        assert (f'http://localhost:{server.server_port}/on/' if name == 'dapp' else "connect-src 'none'") in csp
    for path in ['/api/forge', '/api/circuit']:
        json_headers = {'Content-Type': 'application/json'}
        for body in [b'', b'{', b'[]', b'{}', b'{"source":"\\ud800"}',
                     json.dumps({'source': 'x' * 8001}).encode(),
                     json.dumps({'source': 'not Rust'}).encode() + b' ' * 16000]:
            assert request(path, body, json_headers)[0] == 400, (path, len(body))
        assert request(path, b'{}', {'Content-Type': 'text/plain'})[0] == 400
        assert request(path, b'{}', {**json_headers, 'Origin': 'https://unrelated.invalid'})[0] == 403
        assert request(path, b'{}', {**json_headers, 'Host': f'unrelated.invalid:{server.server_port}'})[0] == 403
    for path in DEMO_READS:
        assert request(path, b'x', {'Content-Type': 'application/octet-stream'})[0] == 400
    with patch('serve.data_driver', return_value=b'prepared-driver') as driver:
        assert request('/api/explorer-driver')[0] == 200
        driver.assert_called_once_with(True)
    with patch('serve.read_registration', return_value=b'raw-vm-result') as read:
        for path, (alias, method) in REGISTRY_READS.items():
            headers = {'Content-Type': 'application/octet-stream'}
            for body in [b'', b'x', bytes(7), bytes(9), bytes(16001)]:
                assert request(path, body, headers)[0] == 400
            assert request(path, bytes(8), {'Content-Type': 'application/json'})[0] == 400
            assert request(path, bytes(8), {**headers, 'Origin': 'https://unrelated.invalid'})[0] == 403
            assert request(path, bytes(8), {**headers, 'Host': f'unrelated.invalid:{server.server_port}'})[0] == 403
            status, _, body = request(path, bytes([255])*8, headers)
            assert status == (200 if alias == 0x55 else 503)
            if alias == 0x55:
                assert body == b'raw-vm-result'
                read.assert_called_with(method, bytes([255])*8)
        assert read.call_count == 3, 'the unavailable fixture must not execute a VM call'
    for method in ['register', 'cancel', 'resize', 'confirm', 'get_count', 'unknown']:
        assert request('/on/contracts:' + '55'*32 + '/' + method, bytes(8))[0] == 404
    assert request('/on/contracts:unknown/get_count', b'')[0] == 404
    # A matching ready.json is not sufficient when compiled cache files disappear.
    # Use temporary stub files, never the developer's prepared cache or a compiler.
    with TemporaryDirectory(prefix='dusk-setup-check-') as tmp:
        cache = Path(tmp)
        ready = {'signature': 'current', 'contract': {'dusk_core': 'deps/core.rlib'},
                 'data-driver': {'dusk_data_driver': 'deps/driver.rlib'}}
        files = [cache / name for name in ('actor.wasm', 'explorer.wasm', 'explorer-driver.wasm',
                 'target/release/examples/lesson_runner', 'target/contract/deps/core.rlib',
                 'target/data-driver/deps/driver.rlib',
                 'target/contract/wasm32-unknown-unknown/release/dusk_registry.wasm',
                 'target/data-driver/wasm32-unknown-unknown/release/dusk_registry.wasm')]
        for file in files:
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(b'trusted setup stub')
        metadata = cache / 'ready.json'
        metadata.write_text(json.dumps(ready))
        with patch('forge_lesson.CACHE', cache), patch('forge_lesson.signature', return_value='current'), \
                patch('forge_lesson.compile_wasm', side_effect=AssertionError('Incomplete setup must not compile')) as compiler:
            assert forge_lesson.prepared() == ready
            for file in files:
                file.unlink()
                status, _, body = request('/api/forge', b'{"source":"valid-sized draft"}', json_headers)
                assert status == 503 and b'setup:forge' in body, file
                file.write_bytes(b'trusted setup stub')
            for bad in [None, {}, {**ready, 'signature': 'old'}, {**ready, 'contract': None}]:
                metadata.write_text(json.dumps(bad))
                assert request('/api/forge', b'{"source":"draft"}', json_headers)[0] == 503
            metadata.write_text(json.dumps(ready))
            files[0].unlink()
            for path in ('/api/registry-driver', '/api/explorer-driver'):
                assert request(path)[0] == 503
            assert request(next(iter(DEMO_READS)), b'', {'Content-Type': 'application/octet-stream'})[0] == 503
            assert request(next(iter(REGISTRY_READS)), bytes(8), {'Content-Type': 'application/octet-stream'})[0] == 503
            compiler.assert_not_called()
        circuit = {'signature': 'current', 'libraries': {'dusk_plonk': 'deps/plonk.rlib'}}
        metadata.write_text(json.dumps(circuit))
        files = [cache / 'src/lib.rs', cache / 'target/deps/plonk.rlib']
        for file in files:
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(b'trusted setup stub')
        with patch('circuit_lesson.CACHE', cache), patch('circuit_lesson.signature', return_value='current'), \
                patch('circuit_lesson.subprocess.check_output', side_effect=AssertionError('Incomplete setup must not invoke rustup')) as tool:
            for file in files:
                file.unlink()
                status, _, body = request('/api/circuit', b'{"source":"draft"}', json_headers)
                assert status == 503 and b'setup:circuits' in body, file
                file.write_bytes(b'trusted setup stub')
            for bad in [None, {}, {**circuit, 'signature': 'old'}, {**circuit, 'libraries': None}]:
                metadata.write_text(json.dumps(bad))
                assert request('/api/circuit', b'{"source":"draft"}', json_headers)[0] == 503
            tool.assert_not_called()
    print('PASS: current assets and worker CSP, removed routes, request boundaries and incomplete-cache setup recovery.')
finally:
    server.shutdown()
    thread.join()
    server.server_close()
