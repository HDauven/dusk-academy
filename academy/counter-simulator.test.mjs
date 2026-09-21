import test from 'node:test';
import assert from 'node:assert/strict';
import {createCounter, simulateCounter} from './counter-simulator.js';
import {starter, chapters, assess} from './lesson.js';

const program=(statement='', initial='0')=>starter.replace('count: 7',`count: ${initial}`).replace('// Add one registration.',statement);
const stateStep=chapters.findIndex(c=>c.check==='initial'), changeStep=chapters.findIndex(c=>c.check==='change');

test('counter interpreter evaluates source, not a solution string or a recorded trace',()=>{
  assert.deepEqual(simulateCounter(starter),{ok:true,initial:'7',after:['7','7','7'],fresh:'7'});
  assert.deepEqual(simulateCounter(program()),{ok:true,initial:'0',after:['0','0','0'],fresh:'0'});
  for(const statement of ['self.count += 1;', 'self.count = 1 + self.count;', 'self.count = self.count + (6 / 2 - 2);',
    'let next: u64 = self.count + 1u64; self.count = next;',
    'let mut n = 0; n += 2; n -= 1; self.count += n;',
    'let n = 8; let n = n % 3; self.count += n - 1;',
    '/* ignored /* nested */ code */ self.count += 1; // self.count = 99;']) {
    const result=simulateCounter(program(statement));
    assert.deepEqual(result,{ok:true,initial:'0',after:['1','2','3'],fresh:'0'},statement);
    assert.equal(assess(changeStep,result),null);
  }
  assert.deepEqual(simulateCounter(program('self.count += 2;', '5')).after,['7','9','11']);
  assert.deepEqual(simulateCounter(program('self.count = 1;')).after,['1','1','1']);
  assert.deepEqual(simulateCounter(program('self.count *= 2;', '3')).after,['6','12','24']);
  assert.deepEqual(simulateCounter(program('self.count /= 2;', '19')).after,['9','4','2']);
  assert.deepEqual(simulateCounter(program('return; self.count += 1;')).after,['0','0','0']);
  assert.deepEqual(simulateCounter(program('self.count += 1;').replace('self.count\n', 'return self.count;\n')).after,['1','2','3']);
  assert.deepEqual(simulateCounter(program('self.count += 1;').replace('Self { count: 0 }', 'let n = 3; return Self { count: n - 3, };')).after,['1','2','3']);
  const wrong=simulateCounter(program('self.count += 1;').replace('self.count\n','0\n'));
  assert.equal(assess(stateStep,wrong),null,'same limited initialization check as the native lesson');
  assert.match(assess(changeStep,wrong),/exactly one/,'a fixed getter cannot pass the mutation check');
});

test('u64 precision, independent instances and transactional rollback are real model behavior',()=>{
  assert.deepEqual(simulateCounter(program('self.count += 1;', '9_007_199_254_740_993u64')),
    {ok:true,initial:'9007199254740993',after:['9007199254740994','9007199254740995','9007199254740996'],fresh:'9007199254740993'});
  assert.equal(simulateCounter(program('', 'u64::MAX')).initial,'18446744073709551615');
  for(const [statement,initial,error] of [
    ['self.count += 1;', 'u64::MAX', /overflow/],
    ['self.count = 0; self.count -= 1;', '7', /underflow/],
    ['self.count += 1; let n = 0; self.count /= n;', '7', /division by zero/],
    ['self.count += 1; self.count *= u64::MAX;', '2', /overflow/],
  ]) {
    const counter=createCounter(program(statement,initial)), before=counter.call('get_count');
    assert.throws(()=>counter.call('register'),error);
    assert.equal(counter.call('get_count'),before,'all writes in the rejected call roll back');
    assert.throws(()=>counter.call('register'),/rolled back/,'retries start from the restored state');
  }
  const almost=createCounter(program('self.count += 1;', '18446744073709551614'));
  almost.call('register');assert.throws(()=>almost.call('register'),/overflow/);
  assert.equal(almost.call('get_count'),18446744073709551615n,'an earlier successful call is retained');
  const a=createCounter(program('self.count += 1;')), b=createCounter(program('self.count += 1;'));
  a.call('register');assert.equal(a.call('get_count'),1n);assert.equal(b.call('get_count'),0n);
  assert.throws(()=>a.call('new'),/exposes only/);
  assert.deepEqual(simulateCounter(program('self.count += 1;')).after,['1','2','3'],'a failed run cannot poison later runs');
});

test('the bounded grammar rejects unsupported and ill-typed source instead of ignoring it',()=>{
  for(const source of [
    program('match self.count {}'), program('self.count += "one";'),
    program('self.count += 1;', '18446744073709551616'),
    program('let n = 1; n += 1;'), program('let n = unknown;'), program('let if = 1;'),
    program('let x: bool = 0;'), program('let x = self.count.not_a_method();'),
    program('self.count += 1'), program('self.count'),
    program().replace('count: u64,','count: u64, other: u64,'),
    program().replace('self.count\n','self.count = 1; self.count\n'),
    program().replace('self.count\n','self.count;\n'),
    program().replace('register(&mut self)','register(&mut self, amount: u64)'),
    program().replace('pub fn register','pub fn get_count'),
    program().replace('Self { count: 0 }','Self { count: self.count }'),
    program()+'\nuse std::fs;', program()+'\n/* open comment',
    program('self.count = '+'('.repeat(66)+'1'+')'.repeat(66)+';'),
    program('self.count = '+Array(67).fill('1').join('+')+';'),
  ]) assert.throws(()=>simulateCounter(source),/Not supported by this lesson runtime/,source);
  assert.throws(()=>simulateCounter(program().replace('pub fn get_count','pub fn count')),/public get_count/);
  assert.throws(()=>simulateCounter(program('loop {}')),/instruction limit/);
  assert.deepEqual(simulateCounter(program('if self.count < 2 { self.count += 1; } else { self.count = self.count + 1; }')).after,['1','2','3']);
  assert.deepEqual(simulateCounter(program('for n in 0..1 { self.count = self.count.checked_add(1).unwrap(); }')).after,['1','2','3']);
  for(const source of [null,42,'','x'.repeat(8001),'é'.repeat(4001)]) assert.throws(()=>simulateCounter(source),/8,000 UTF-8 bytes/);
});
