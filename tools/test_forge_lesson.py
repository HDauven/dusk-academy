"""Small real Forge/DuskVM check; run after npm run setup:forge."""
from pathlib import Path
import json
import os
import subprocess
import tempfile
import time
from forge_lesson import run_contract as native_run_contract, read_demo, read_registration, data_driver, REGISTRY_GETTERS, sandbox

ROOT = Path(__file__).resolve().parent.parent
SIMULATOR_CASES = []


def run_contract(source, lesson='state'):
    result = native_run_contract(source, lesson)
    if result.get('ok'):
        SIMULATOR_CASES.append({'source': source, 'scenario': lesson, 'result': result})
    return result


def record_sources(source):
    """Cumulative lesson edits, also used by the browser regression."""
    source = source.replace('#[dusk_forge::contract]', 'extern crate alloc;\n\n#[dusk_forge::contract]')
    source = source.replace('mod registry {', 'mod registry {\n    use alloc::vec::Vec;\n\n    struct Registration { id: u64, seats: u64 }')
    source = source.replace('count: u64,', 'count: u64,\n        records: Vec<Registration>,')
    source = source.replace('Self { count: 0 }', 'Self { count: 0, records: Vec::new() }')
    source = source.replace('        pub fn get_count', '        pub fn registration_count(&self) -> u64 { self.records.len() as u64 }\n\n        pub fn get_count')
    stages = {'records-empty': source}
    source = source.replace('records: Vec<Registration>,', 'records: Vec<Registration>,\n        next_id: u64,')
    source = source.replace('records: Vec::new() }', 'records: Vec::new(), next_id: 0 }')
    source = source.replace('        pub fn get_count', '        pub fn next_id(&self) -> u64 { self.next_id }\n\n        pub fn get_count')
    source = source.replace('register(&mut self, amount: u64) {', 'register(&mut self, amount: u64) -> u64 {')
    source = source.replace('assert!(self.count <= 10);', 'assert!(self.count <= 10);\n            let id = self.next_id;\n            self.next_id += 1;\n            id')
    stages['records-ids'] = source
    source = source.replace('self.next_id += 1;', 'self.next_id += 1;\n            self.records.push(Registration { id, seats: amount });')
    stages['records-save'] = source
    lookup = '''        // ponytail: at most ten active records; use an indexed map if capacity grows.
        pub fn get_registration(&self, id: u64) -> u64 {
            for record in &self.records {
                if record.id == id { return record.seats; }
            }
            panic!("Unknown registration");
        }

'''
    source = source.replace('        pub fn get_count', lookup + '        pub fn get_count')
    stages['records-read'] = source
    source = source.replace('get_registration(&self, id: u64) -> u64', 'get_registration(&self, id: u64) -> Option<u64>')
    source = source.replace('return record.seats;', 'return Some(record.seats);').replace('panic!("Unknown registration");', 'None')
    stages['records-missing'] = source
    cancel = '''        pub fn cancel(&mut self, id: u64) {
            let index = self.records.iter().position(|record| record.id == id)
                .expect("Unknown registration");
            let removed = self.records.remove(index);
            self.count -= removed.seats;
        }

'''
    stages['records-cancel'] = source.replace('        pub fn get_count', cancel + '        pub fn get_count')
    return stages


def advanced_sources(source):
    """Worked edits for the three new lessons; never applied to learner drafts."""
    def add(code, method):
        return code.replace('        pub fn get_count', method + '\n        pub fn get_count')
    source = source.replace('use alloc::vec::Vec;', 'use alloc::vec::Vec;\n    use dusk_core::abi::{self, ContractId};\n    use dusk_core::transfer::TRANSFER_CONTRACT;')
    source = add(source, '''        pub fn current_caller(&self) -> Option<ContractId> { abi::caller() }
''')
    stages = {'permissions-caller': source}
    source = source.replace('seats: u64 }', 'seats: u64, owner: ContractId }')
    source = source.replace('register(&mut self, amount: u64) -> u64 {', '''register(&mut self, amount: u64) -> u64 {
            let owner = abi::caller().filter(|caller| *caller != TRANSFER_CONTRACT)
                .expect("Contract caller required");''')
    source = source.replace('Registration { id, seats: amount }', 'Registration { id, seats: amount, owner }')
    source = add(source, '''        pub fn owner_of(&self, id: u64) -> Option<ContractId> {
            self.records.iter().find(|record| record.id == id).map(|record| record.owner)
        }
''')
    stages['permissions-owner'] = source
    source = source.replace('            let removed =', '''            assert!(Some(self.records[index].owner) == abi::caller(), "Not the record owner");
            let removed =''')
    stages['permissions-cancel'] = source
    guard = '''            let index = self.records.iter().position(|record| record.id == id)
                .expect("Unknown registration");
            assert!(Some(self.records[index].owner) == abi::caller(), "Not the record owner");'''
    assert guard in source
    source = source.replace(guard, '            let index = self.owned_index(id);')
    source = add(source, '        fn owned_index(&self, id: u64) -> usize {\n' + guard + '\n            index\n        }\n')
    source = add(source, '''        pub fn resize(&mut self, id: u64, seats: u64) {
            let index = self.owned_index(id);
            assert!(seats > 0);
            self.count = self.count - self.records[index].seats + seats;
            assert!(self.count <= 10);
            self.records[index].seats = seats;
        }
''')
    stages['permissions-resize'] = source
    source = source.replace('self.records.push(Registration { id, seats: amount, owner });', 'self.records.push(Registration { id, seats: amount, owner });\n            abi::emit("registered", (id, amount));')
    stages['events-register'] = source
    source = source.replace('self.count -= removed.seats;', 'self.count -= removed.seats;\n            abi::emit("cancelled", (id, removed.seats));')
    source = source.replace('self.records[index].seats = seats;', 'self.records[index].seats = seats;\n            abi::emit("resized", (id, seats));')
    stages['events-changes'] = source
    source = source.replace('use dusk_core::transfer::TRANSFER_CONTRACT;', 'use dusk_core::transfer::TRANSFER_CONTRACT;\n    const VENUE: ContractId = ContractId::from_bytes([0x44; 32]);')
    source = add(source, '''        pub fn quote(&self, seats: u64) -> u64 {
            abi::call::<_, u64>(VENUE, "quote", &seats).expect("Venue unavailable")
        }
''')
    stages['calls-quote'] = source
    source = source.replace('owner: ContractId }', 'owner: ContractId, confirmed: bool }')
    source = source.replace('seats: amount, owner }', 'seats: amount, owner, confirmed: false }')
    source = source.replace('"Not the record owner");', '"Not the record owner");\n            assert!(!self.records[index].confirmed, "Already confirmed");')
    source = add(source, '''        pub fn is_confirmed(&self, id: u64) -> Option<bool> {
            self.records.iter().find(|record| record.id == id).map(|record| record.confirmed)
        }

        pub fn confirm(&mut self, id: u64) {
            let index = self.owned_index(id);
            let seats = self.records[index].seats;
            self.records[index].confirmed = true;
            abi::call::<_, ()>(VENUE, "book", &(id, seats)).expect("Venue unavailable");
            abi::emit("confirmed", (id, seats));
        }
''')
    stages['calls-confirm'] = source
    source = add(source, '''        pub fn accounted_seats(&self) -> u64 {
            self.records.iter().map(|record| record.seats).sum()
        }
''')
    stages['tests-invariant'] = source
    source = add(source, '''        pub fn confirm_pair(&mut self, first: u64, second: u64) {
            self.confirm(first);
            self.confirm(second);
        }
''')
    stages['tests-atomic'] = source
    stages['build-driver'] = source
    return stages


def check():
    source = subprocess.check_output(['node', '--input-type=module', '-e',
        f'import {{starter}} from "{(ROOT / "academy/lesson.js").as_uri()}"; process.stdout.write(starter);'], text=True)
    initial = source.replace('count: 7', 'count: 0')
    answer = initial.replace('// Add one registration.', 'self.count += 1;')
    first = run_contract(initial)
    assert first == {'ok': True, 'initial': '0', 'after': ['0','0','0'], 'fresh': '0'}, first
    counter_cases = [{'source': initial, 'result': first}]
    for statement in ['self.count += 1;', 'self.count = self.count + 1;', 'let next = self.count.checked_add(1).unwrap(); self.count = next;']:
        result = run_contract(initial.replace('// Add one registration.', statement))
        assert result == {'ok': True, 'initial': '0', 'after': ['1','2','3'], 'fresh': '0'}, result
        if '.checked_add' not in statement:  # Method calls are outside the simulator subset.
            counter_cases.append({'source': initial.replace('// Add one registration.', statement), 'result': result})
    result = run_contract(answer.replace('count: 0', 'count: 7'))
    assert result['initial'] == '7' and result['after'] == ['8','9','10'], result
    bad = run_contract(answer.replace('self.count += 1;', 'self.count = 1;'))
    assert bad['after'] == ['1','1','1'], bad
    error = run_contract(answer.replace('self.count += 1;', 'self.count += "one";'))
    assert not error['ok'] and error['phase'] == 'compile' and 'lib.rs' in error['error'], error
    for code in [answer.replace('get_count','not_a_getter'), answer.replace('self.count += 1;', 'panic!("test failure");')]:
        result = run_contract(code)
        assert not result['ok'] and result['phase'] == 'execute', result
    began = time.monotonic()
    loop = run_contract(answer.replace('self.count += 1;', 'loop { self.count = self.count.wrapping_add(1); }'))
    assert not loop['ok'] and time.monotonic()-began < 22, loop
    assert run_contract(answer)['ok'], 'A bad run must not poison the next session'
    # Independent native oracle for the browser interpreter. No stored success traces.
    for code in [source, answer.replace('count: 0', 'count: 7'),
                 initial.replace('// Add one registration.', 'self.count = 1;'),
                 initial.replace('// Add one registration.', 'let next: u64 = self.count + (6 / 2 - 2); self.count = next;'),
                 initial.replace('// Add one registration.', 'let mut n = 8; n %= 3; self.count += n - 1;'),
                 answer.replace('self.count\n', 'return self.count;\n'),
                 answer.replace('count: 0', 'count: 9_007_199_254_740_993u64'),
                 initial.replace('count: 0', 'count: u64::MAX'),
                 answer.replace('count: 0', 'count: u64::MAX'),
                 initial.replace('// Add one registration.', 'self.count -= 1;')]:
        counter_cases.append({'source': code, 'result': run_contract(code)})
    subprocess.run(['node', '--input-type=module', '-e', '''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {simulateCounter}=await import(process.argv[1]);
const cases=JSON.parse(readFileSync(0,'utf8'));
for(const {source,result} of cases) {
  if(result.ok) assert.deepEqual(simulateCounter(source),result);
  else {
    assert.equal(result.phase,'execute');
    assert.throws(()=>simulateCounter(source),/overflow|underflow/);
  }
}
console.log(`PASS: browser counter compared against ${cases.length} freshly compiled native cases, including exact u64 values and arithmetic rejection.`);
''', (ROOT / 'academy/counter-simulator.js').as_uri()], input=json.dumps(counter_cases), text=True, check=True)

    arguments = answer.replace('register(&mut self)', 'register(&mut self, amount: u64)').replace('self.count += 1;', 'self.count += amount;')
    positive = arguments.replace('self.count += amount;', 'assert!(amount > 0); self.count += amount;')
    capacity = positive.replace('self.count += amount;', 'self.count += amount; assert!(self.count <= 10);')
    cases = []
    for mode, code, passes in [
        ('arguments', arguments, True),
        ('arguments', arguments.replace('self.count += amount;', 'self.count = self.count.checked_add(amount).unwrap();'), True),
        ('arguments', arguments.replace('self.count += amount;', 'self.count += 1;'), False),
        ('validation', positive, True),
        ('validation', arguments, False),
        ('validation', arguments.replace('self.count += amount;', 'if amount == 0 { return; } self.count += amount;'), False),
        ('validation', arguments.replace('self.count += amount;', 'if amount == 0 { loop {} } self.count += amount;'), False),
        ('capacity', capacity, True),
        ('capacity', arguments.replace('self.count += amount;', 'assert!(amount > 0 && amount <= 10 - self.count); self.count += amount;'), True),
        ('capacity', positive, False),
        ('capacity', capacity.replace('self.count <= 10', 'self.count < 10'), False),
        ('capacity', capacity.replace('self.count <= 10', 'amount <= 10'), False),
        ('capacity', capacity.replace('self.count += amount;', 'self.count = self.count.wrapping_add(amount);'), False),
    ]:
        result = run_contract(code, mode)
        cases.append({'scenario': mode, 'result': result, 'passes': passes})
        if code == capacity and passes:
            assert [(call['before'], call['after'], call['status']) for call in result['calls'][:4]] == [
                ('0', '3', 'accepted'), ('3', '3', 'rejected'), ('3', '10', 'accepted'), ('10', '10', 'rejected')], result
            assert result['calls'][6]['fresh'] and result['calls'][6]['after'] == '8', result
    records = record_sources(capacity)
    for mode, code in records.items():
        result = run_contract(code, mode)
        assert result['ok'], (mode, result)
        cases.append({'scenario': mode, 'result': result, 'passes': True})
    full = records['records-cancel']
    write = 'let id = self.next_id;\n            self.next_id += 1;\n            self.records.push(Registration { id, seats: amount });'
    early_writes = full.replace(write, '').replace('assert!(amount > 0);', write + '\n            assert!(amount > 0);')
    for mode, code, passes in [
        ('records-empty', records['records-empty'].replace('self.records.len() as u64', '1'), False),
        ('records-ids', records['records-ids'].replace('self.next_id += 1;', 'self.next_id += 2;'), False),
        ('records-save', records['records-ids'], False),
        ('records-read', records['records-read'].replace('return record.seats;', 'return self.count;'), False),
        ('records-missing', records['records-missing'].replace('\n            None', '\n            Some(0)'), False),
        ('records-cancel', full.replace('self.count -= removed.seats;', 'self.count -= 1;'), False),
        ('records-cancel', full.replace('self.count -= removed.seats;', 'self.count -= removed.seats; self.next_id -= 1;'), False),
        ('records-cancel', full.replace('.expect("Unknown registration");', '.unwrap_or(0);'), False),
        ('records-cancel', full.replace('record.id == id { return Some(record.seats);', 'record.id == (id as u32) as u64 { return Some(record.seats);'), False),
        ('records-cancel', full.replace('self.records.remove(index)', 'self.records.swap_remove(index)'), True),
        ('records-cancel', early_writes, True),
    ]:
        result = run_contract(code, mode)
        assert result['ok'], (mode, result)
        cases.append({'scenario': mode, 'result': result, 'passes': passes})
    assert records['records-read'] != records['records-missing'] != full
    advanced = advanced_sources(full)
    for mode, code in advanced.items():
        result = run_contract(code, mode)
        assert result['ok'], (mode, result)
        cases.append({'scenario': mode, 'result': result, 'passes': True})
        if mode == 'build-driver':
            assert len(result['calls']) == 66
            failed = [c for c in result['calls'] if c['call'] == 'confirm_pair(3, 6)' and c['status'] == 'rejected']
            assert any(c['booked'] == '5' and c['events'] for c in failed), 'Second-callee failure must restore earlier venue writes; receipt events are not a commit guarantee'
            assert all(c['booked'] in ('5', '8') for c in failed)
            assert len(result['build']['contract']['sha256']) == len(result['build']['driver']['sha256']) == 64
    final = advanced['build-driver']
    # Regression mutations of our own teaching contract; grade VM outcomes, not text.
    for mode, code, passes in [
        ('permissions-caller', advanced['permissions-caller'].replace('{ abi::caller() }', '{ None }'), False),
        ('permissions-owner', advanced['permissions-owner'].replace('seats: amount, owner }', 'seats: amount, owner: ContractId::from_bytes([0x22; 32]) }'), False),
        ('permissions-owner', advanced['permissions-owner'].replace('.filter(|caller| *caller != TRANSFER_CONTRACT)', ''), False),
        ('permissions-cancel', advanced['permissions-cancel'].replace('assert!(Some(self.records[index].owner) == abi::caller(), "Not the record owner");', ''), False),
        ('permissions-resize', advanced['permissions-resize'].replace('self.count = self.count - self.records[index].seats + seats;', ''), False),
        ('events-register', advanced['permissions-resize'], False),
        ('events-changes', advanced['events-changes'].replace('abi::emit("resized", (id, seats));', 'abi::emit("resized", (id, self.count));'), False),
        ('calls-quote', advanced['calls-quote'].replace('abi::call::<_, u64>(VENUE, "quote", &seats).expect("Venue unavailable")', 'seats * 3'), False),
        ('calls-confirm', advanced['calls-confirm'].replace('abi::call::<_, ()>(VENUE, "book", &(id, seats)).expect("Venue unavailable");', 'let _ = abi::call::<_, ()>(VENUE, "book", &(id, seats));'), False),
        ('tests-invariant', advanced['tests-invariant'].replace('self.records.iter().map(|record| record.seats).sum()', '0'), False),
        ('tests-atomic', final.replace('self.confirm(second);', ''), False),
        ('tests-atomic', final.replace('self.confirm(first);', 'self.owned_index(first); self.owned_index(second); assert!(first != second); self.confirm(first);'), True),
        ('build-driver', final.replace('self.records.remove(index)', 'self.records.swap_remove(index)'), True),
    ]:
        result = run_contract(code, mode)
        assert result['ok'], (mode, result)
        cases.append({'scenario': mode, 'result': result, 'passes': passes})
    driver_error = run_contract(final + '\n#[cfg(feature = "data-driver")]\ncompile_error!("Check the data-driver target too");', 'build-driver')
    assert not driver_error['ok'] and driver_error['phase'] == 'compile' and driver_error['target'] == 'data-driver', driver_error
    cases.append({'scenario':'build-driver', 'result':driver_error, 'passes':False})
    # Malformed build/event metadata cannot award a checkpoint.
    built = next(c['result'] for c in cases if c['scenario'] == 'build-driver' and c['passes'])
    malformed = json.loads(json.dumps(built)); malformed['build']['contract']['sha256'] = '<script>'
    malformed_event = json.loads(json.dumps(built)); malformed_event['calls'][6]['events'][0]['data'] = [256]
    # The records and advanced lessons do not change the counter reference or dApp fixtures.
    for count in (2, 7):
        assert read_demo(count) == count.to_bytes(8, 'little')
    # The independent explorer's outputs and exact inputs use the actual driver.
    with tempfile.TemporaryDirectory(prefix='dusk-registry-check-') as tmp:
        work = Path(tmp)
        (work / 'driver.wasm').write_bytes(data_driver(explorer=True))
        samples = [{'id': str(n), 'reads': {method: read_registration(method, n.to_bytes(8, 'little')).hex()
                    for method in REGISTRY_GETTERS}} for n in (0, 1, 2, 9_007_199_254_740_993, 9_007_199_254_740_992, 2**64-1)]
        (work / 'reads.json').write_text(json.dumps(samples))
        subprocess.run(['node', '--input-type=module', '-e', '''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {createDuskApp}=await import(process.argv[1]);
const {fixtureResponse}=await import(new URL('../offline-transport.js',process.argv[1]));
const app=createDuskApp({pinnedNodeUrl:'http://localhost',autoConnect:false,wallet:{waitForProvider:false,rememberLastUsedProvider:false}});
try {
  const driver=await app.driver('data:application/wasm;base64,'+readFileSync(process.argv[2]+'/driver.wasm').toString('base64'));
  assert.deepEqual(driver.getSchema().functions.map(f=>f.name),['get_registration','owner_of','is_confirmed']);
  for(const {id,reads} of JSON.parse(readFileSync(process.argv[2]+'/reads.json'))) {
    const seats=({'0':2,'2':3,'9007199254740993':5})[id]??null;
    const expected={get_registration:seats,owner_of:seats===null?null:(id==='2'?'33':'22').repeat(32),is_confirmed:seats===null?null:id==='2'};
    for(const [method,hex] of Object.entries(reads)) {
      const encoded=driver.encodeInputFn(method,JSON.stringify(JSON.rawJSON(id)));
      assert.equal(new DataView(encoded.buffer,encoded.byteOffset,8).getBigUint64(0,true),BigInt(id));
      assert.equal(driver.decodeOutputFn(method,Buffer.from(hex,'hex')),expected[method]);
      const simulated=fixtureResponse('/on/contracts:'+'55'.repeat(32)+'/'+method,encoded);
      assert.equal(Buffer.from(await simulated.arrayBuffer()).toString('hex'),hex,'simulated bytes match actual pinned VM output for '+method+' '+id);
    }
  }
  // The pin's generic u64 input rejects JSON strings: never teach otherwise.
  assert.throws(()=>driver.encodeInputFn('get_registration','"9007199254740993"'));
  assert.throws(()=>driver.encodeInputFn('get_registration','18446744073709551616'));
} finally {app.wallet.destroy();}
''', (ROOT / 'academy/vendor/dusk-connect.js').as_uri(), str(work)], check=True)
    for method, args in [('register', bytes(8)), ('get_registration', bytes(9)), ('owner_of', []), (None, bytes(8))]:
        try: read_registration(method, args)
        except ValueError: pass
        else: raise AssertionError('Invalid registry read accepted')
    # Feed actual VM traces to the same grader used by the browser.
    with tempfile.TemporaryDirectory(prefix='dusk-grading-check-') as tmp:
        file = Path(tmp) / 'cases.json'
        file.write_text(json.dumps({'cases': cases, 'malformed': [malformed, malformed_event]}))
        subprocess.run(['node', '--input-type=module', '-e', '''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {assess,chapters}=await import(process.argv[1]);
const step=scenario=>chapters.findIndex(c=>c.kind==='code'&&c.scenario===scenario);
const {cases,malformed}=JSON.parse(readFileSync(process.argv[2]));
for(const {scenario,result,passes} of cases) {
  assert.ok(step(scenario)>=0);
  assert.equal(assess(step(scenario),result)===null,passes,JSON.stringify({scenario,result,feedback:assess(step(scenario),result)}));
}
for(const result of malformed) assert.throws(()=>assess(step('build-driver'),result),/invalid result/);
''', (ROOT / 'academy/lesson.js').as_uri(), str(file)], check=True)
    for mode in [None, 1, [], 'unknown', 'records-unknown', 'permissions-unknown', 'build-driver --other']: 
        try: run_contract(answer, mode)
        except ValueError: pass
        else: raise AssertionError('Invalid scenario accepted')
    assert run_contract(capacity, 'capacity')['ok'], 'A failed guard must not poison the next session'
    # Ordinary validation of the local execution boundary, using a non-secret sentinel.
    os.environ['DUSK_LESSON_TEST'] = 'test-only-marker'
    try:
        invalid = run_contract(answer + '\nconst CHECK: &str = env!("DUSK_LESSON_TEST");')
        assert not invalid['ok'] and 'not defined' in invalid['error'], invalid
        invalid = run_contract(answer + f'\nconst CHECK: &str = include_str!("{ROOT / "README.md"}");')
        assert not invalid['ok'] and 'No such file' in invalid['error'], invalid
    finally:
        del os.environ['DUSK_LESSON_TEST']
    for invalid in [None,3,'','x'*8001,'\ud800']:
        try: run_contract(invalid)
        except (ValueError,UnicodeError): pass
        else: raise AssertionError('Invalid source accepted')
    with tempfile.TemporaryDirectory(prefix='dusk-deadline-check-') as tmp:
        work = Path(tmp)
        try: sandbox(work, [], ['/usr/bin/true'], work/'out', work/'err', deadline=time.monotonic()-1)
        except ValueError as error: assert 'too long' in str(error)
        else: raise AssertionError('Expired shared deadline was ignored')
    subprocess.run(['node', '--input-type=module', '-e', '''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {simulateContract}=await import(process.argv[1]);
const cases=JSON.parse(readFileSync(0,'utf8'));
assert.ok(cases.length>=50,'do not silently shrink conformance coverage');
for(const {source,scenario,result} of cases){
  const actual=simulateContract(source,scenario),{build,...native}=result;
  assert.deepEqual(actual,native,scenario+' must match actual native observations, including wrong programs');
}
console.log(`PASS: all seven contract lessons, ${cases.length} freshly compiled positive/negative/equivalent native programs match interpreted traces, state, callers, events and rollback.`);
''', (ROOT / 'academy/contract-simulator.js').as_uri()], input=json.dumps(SIMULATOR_CASES), text=True, check=True)
    print('PASS: seven real Forge lessons, VM caller/ownership checks, actual receipt events, typed cross-contract reads/writes, two-contract and outer rollback, equivalent guards/removal, 66-call workflow, matching data-driver build/SDK ABI, unchanged counter fixtures, real registry reads/matching driver/exact u64 inputs, migrations, limits and isolated compilation.')


if __name__ == '__main__':
    check()
