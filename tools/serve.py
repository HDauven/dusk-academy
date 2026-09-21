"""Local academy server: Forge/DuskVM exercises, Connect reads and PLONK compilation."""
import argparse
import json
import os
from pathlib import Path
import shutil
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit
from forge_lesson import run_contract, read_demo, read_registration, data_driver, REGISTRY_GETTERS
from circuit_lesson import compile_circuit

ROOT = Path(__file__).resolve().parent.parent
DEMO_READS = {f'/on/contracts:{bytes([n] * 32).hex()}/get_count': n for n in (2, 7)}
REGISTRY_READS = {f'/on/contracts:{bytes([n] * 32).hex()}/{method}': (n, method)
                  for n in (0x55, 0x66) for method in REGISTRY_GETTERS}


class Handler(SimpleHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def reply(self, status, data, content_type='application/json'):
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def end_headers(self):
        if self.path in ('/academy/dapp-worker.js', '/academy/circuit-worker.js'):
            origins = [f'http://{host}:{self.server.server_port}' for host in ('localhost', '127.0.0.1', '[::1]')]
            reads = ' '.join(origin + path for origin in origins for path in ('/on/', '/api/registry-driver', '/api/explorer-driver'))
            self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'self' blob: 'wasm-unsafe-eval'; worker-src 'none'; connect-src " + (reads if self.path.endswith('dapp-worker.js') else "'none'") + ';')
        super().end_headers()

    def do_GET(self):
        if self.path in ('/api/registry-driver', '/api/explorer-driver'):
            try:
                return self.reply(200, data_driver(self.path == '/api/explorer-driver'), 'application/wasm')
            except OSError:
                return self.reply(503, {'error': 'Run npm run setup:forge to prepare the contract data-driver.'})
        super().do_GET()

    def do_POST(self):
        if self.path not in ('/api/forge', '/api/circuit') and self.path not in DEMO_READS and self.path not in REGISTRY_READS:
            return self.reply(404, {'error': 'Not found.'})
        # Local dev only: deny cross-origin requests and DNS rebinding hosts.
        host = self.headers.get('Host', '')
        try:
            local = urlsplit('http://' + host)
            if local.hostname not in ('localhost', '127.0.0.1', '::1') or local.port != self.server.server_port:
                return self.reply(403, {'error': 'Open this lesson on localhost to use the compiler.'})
            if self.headers.get('Origin', 'http://' + host) != 'http://' + host:
                return self.reply(403, {'error': 'The compiler only accepts same-origin lesson requests.'})
            size = int(self.headers.get('Content-Length', '0'))
            if self.path in DEMO_READS:
                if size != 0 or self.headers.get('Content-Type', '').split(';')[0] != 'application/octet-stream':
                    raise ValueError('get_count takes no arguments.')
                return self.reply(200, read_demo(DEMO_READS[self.path]), 'application/octet-stream')
            if self.path in REGISTRY_READS:
                if size != 8 or self.headers.get('Content-Type', '').split(';')[0] != 'application/octet-stream':
                    raise ValueError('Supply one encoded u64 record ID (8 bytes).')
                args = self.rfile.read(size)
                if len(args) != 8:
                    raise ValueError('Incomplete record ID.')
                alias, method = REGISTRY_READS[self.path]
                if alias == 0x66:
                    return self.reply(503, {'error': 'This lesson endpoint is deliberately unavailable. Retry with the working fixture.'})
                return self.reply(200, read_registration(method, args), 'application/octet-stream')
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                raise ValueError('Send a JSON program.')
            if not 0 < size <= 16000:
                raise ValueError('The request is too large or empty.')
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('Send a JSON program.')
            if self.path == '/api/forge':
                return self.reply(200, run_contract(data.get('source'), data.get('lesson', 'state')))
            wasm, error = compile_circuit(data.get('source'))
            if error:
                return self.reply(422, {'error': error})
            self.reply(200, wasm, 'application/wasm')
        except (ValueError, UnicodeError) as error:
            self.reply(400, {'error': str(error)})
        except OSError:
            setup = 'setup:circuits' if self.path == '/api/circuit' else 'setup:forge'
            self.reply(503, {'error': f'The local runner is unavailable. Run npm run {setup} and restart npm run dev.'})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5173)
    parser.add_argument('--bind', default='127.0.0.1')
    args = parser.parse_args()
    if not shutil.which('bwrap'):
        parser.error('Install bubblewrap. Compilation never falls back to an unsandboxed process.')
    os.chdir(ROOT)
    # ponytail: one compiler at a time; use a bounded job queue before serving a public course.
    server = HTTPServer((args.bind, args.port), Handler)
    print(f'Dusk learning: http://localhost:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
