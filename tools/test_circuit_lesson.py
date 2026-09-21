"""Actual compiler + browser-compatible PLONK WASM; Node supplies the WASM host."""
import json
from pathlib import Path
import subprocess
import tempfile
from circuit_lesson import compile_circuit, PROJECT

ROOT = Path(__file__).resolve().parent.parent
source = (PROJECT / 'src/circuit.rs').read_text()
sum_source = source.replace('// Bind sum to total.', 'composer.assert_equal(sum, total);')
public_source = sum_source.replace('append_witness(self.total)', 'append_public(self.total)')
# A Rust guard is not a proof constraint, even if its samples look right.
guard = source.replace('// Bind sum to total.', 'if self.a + self.b != self.total { return Err(Error::PolynomialDegreeTooLarge); }')
with tempfile.TemporaryDirectory(prefix='dusk-circuit-check-') as tmp:
    artifacts = []
    for name, code in [('starter', source), ('sum', sum_source), ('public', public_source), ('equivalent', public_source.replace('assert_equal(sum, total)', 'assert_equal(total, sum)')), ('guard', guard)]:
        wasm, error = compile_circuit(code)
        assert wasm, error
        path = Path(tmp) / (name + '.wasm')
        path.write_bytes(wasm)
        artifacts.append([name, str(path)])
    subprocess.run(['node', '--input-type=module', '-e', '''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execute} from './academy/circuit-worker.js';
import {assessCourse} from './academy/courses.js';
let first;
for(const [name,path] of JSON.parse(process.argv[1])) {
  const bytes=()=>Uint8Array.from(readFileSync(path)).buffer;
  if(name==='guard') { await assert.rejects(execute(bytes()),/Circuit construction failed/); continue; }
  const result=await execute(bytes());
  if(name==='starter') assert.match(assessCourse('circuits','constraint',result),/accepted 4/);
  else if(name==='sum') { assert.equal(assessCourse('circuits','constraint',result),null); assert.match(assessCourse('circuits','public',result),/Expose total/); }
  else { assert.equal(assessCourse('circuits','public',result),null); assert.equal(result.cases[2].proverRejected,true); }
  if(name==='public') { first=result.proof; const again=await execute(bytes()); assert.notEqual(again.proof,first); assert.equal(assessCourse('circuits','public',again),null); }
}
''', json.dumps(artifacts)], cwd=ROOT, timeout=30, check=True)
    wasm, error = compile_circuit('not Rust')
    assert wasm is None and error
for invalid in [None, '', 'x' * 8001]:
    try:
        compile_circuit(invalid)
        raise AssertionError('Invalid source accepted')
    except ValueError:
        pass
print('PASS: real PLONK proofs, invalid witnesses, public-input binding, equivalent constraints, fresh entropy, Rust guards and compiler input bounds.')
