// The Rust-subset interpreter and the simulated Dusk hosts: limits, rejections and rollback.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime, Rejection, RuntimeLimit} from './rust-runtime.js';
import {deploy, MOTHS} from './contract.js';
import {lessons} from './course.js';

const contract = body => `#![no_std]
#[dusk_forge::contract]
mod hatchery {
    use dusk_core::abi;
    pub struct Hatchery { n: u64 }
    impl Hatchery {
        pub const fn new() -> Self { Self { n: 0 } }
${body}
    }
}`;
const run = (body, method, ...args) => { const rt = createRuntime(contract(body), {module: 'hatchery', contract: 'Hatchery'}); return rt.invoke(rt.create(), method, args, true); };

test('source is bounded and outside syntax is refused, not ignored', () => {
  const make = src => createRuntime(src, {module: 'hatchery', contract: 'Hatchery'});
  assert.throws(() => make('// ' + 'x'.repeat(12000)), /12,000/);
  assert.throws(() => make(contract('pub fn f(&self) -> u64 { unsafe { 1 } }')), /`unsafe` isn't supported in these lessons/);
  assert.throws(() => make(contract('pub fn f(&self) -> u64 { match 1 { _ => 1 } }')), /`match` isn't supported in these lessons/);
  assert.throws(() => make(contract('pub fn f(&self) { println!("hi"); }')), /Macro println! is unavailable/);
  assert.throws(() => make(contract('pub fn f(&self) {}').replace('use dusk_core::abi;', 'use std::fs;')), /Only the supplied lesson imports/);
  assert.throws(() => make(contract('pub fn f(&self) {}').replace('mod hatchery', 'mod registry')), /Expected hatchery/);
  assert.doesNotThrow(() => make(contract('pub fn f(&self) -> u64 { self.n }')));
});

test('runaway programs hit the instruction limit instead of hanging, and that is not a rejection', () => {
  assert.throws(() => run('pub fn f(&self) { loop {} }', 'f'), e => e instanceof RuntimeLimit && !(e instanceof Rejection));
  assert.throws(() => run('pub fn f(&self) -> u64 { self.f() }', 'f'), RuntimeLimit);
});

test('u64 arithmetic is exact: overflow panics, wrapping_mul wraps, pow is checked', () => {
  assert.throws(() => run('pub fn f(&self) -> u64 { u64::MAX + 1 }', 'f'), Rejection);
  assert.throws(() => run('pub fn f(&self) -> u64 { 10u64.pow(20) }', 'f'), Rejection);
  assert.equal(run('pub fn f(&self) -> u64 { 10u64.pow(19) }', 'f'), 10n ** 19n);
  assert.equal(run('pub fn f(&self) -> u64 { u64::MAX.wrapping_mul(2) }', 'f'), (1n << 64n) - 2n);
  assert.throws(() => run('pub fn f(&self) -> u64 { 0 - 1 }', 'f'), Rejection);
});

test('a panicking call rolls back every change, events included', () => {
  const c = deploy(lessons[1].reference);
  c.as('you').call('hatch', 1);
  const before = JSON.stringify(c.dusklings(), (_, v) => typeof v === 'bigint' ? String(v) : v), events = c.events.length;
  assert.throws(() => c.as('you').call('hatch', 2), Rejection);
  assert.equal(JSON.stringify(c.dusklings(), (_, v) => typeof v === 'bigint' ? String(v) : v), before);
  assert.equal(c.events.length, events);
});

test('simulated hosts: shielded senders have no public sender, block height is a clock, the Moth Nest is the only contract', () => {
  const c = deploy(lessons[4].reference);
  assert.throws(() => c.as(null).call('hatch', 1), /public Moonlight account/);
  c.as('you').call('hatch', 1);
  c.at(5000).as('you').call('hunt', 0, 1);
  assert.equal(c.dusklings()[0].ready_at, 5360n);
  assert.equal(c.dusklings()[1].dna % 100n, 99n);
  assert.equal(c.calls.length, 1);
  assert.ok(MOTHS.length > 2);
  const other = createRuntime(contract(`pub fn f(&self) -> u64 {
            abi::call::<_, u64>(dusk_core::abi::ContractId::from_bytes([1; 32]), "x", &1).expect("no")
        }`), {module: 'hatchery', contract: 'Hatchery'});
  assert.throws(() => other.invoke(other.create(), 'f', [], true));
});

test("Forge's event rules: registered types with derives and topics, emitted by the registered path", () => {
  const make = src => createRuntime(src, {module: 'hatchery', contract: 'Hatchery'});
  const good = lessons[0].reference;
  assert.doesNotThrow(() => make(good));
  assert.throws(() => make(good.replace('crate::Hatched { id, dna }', 'Hatched { id, dna }')), /event type `Hatched` is emitted but not registered/);
  assert.throws(() => make(good.replace('events = [crate::Hatched]', 'events = [Hatched]')), /event type `crate::Hatched` is emitted but not registered/);
  assert.throws(() => make(good.replace(/impl ContractEvent for Hatched \{[^}]*\}/, '')), /needs `impl ContractEvent for Hatched`/);
  assert.throws(() => make(good.replace('#[archive_attr(derive(CheckBytes))]\n', '')), /Keep the three attribute lines above `Hatched`/);
  assert.throws(() => make(good.replace('self.dusklings.push(Duskling { dna, level: 1 });', 'self.dusklings.push(crate::Duskling { dna, level: 1 });')), /`Duskling` is declared inside `mod hatchery`/);
  // Rust's messages for a failed Result and an index past the end.
  const c = deploy(lessons[2].reference);
  c.as('you').call('hatch', 1);
  assert.throws(() => c.as('you').call('hunt', 0, 40), {message: 'The Moth Nest has no such moth: Panic("index out of bounds: the len is 6 but the index is 40")'});
  assert.throws(() => run('pub fn f(&self) -> u64 { let v: Vec<u64> = Vec::new(); v[2] }', 'f'), {message: 'index out of bounds: the len is 0 but the index is 2'});
});

test('struct fields reject placeholder types, and heavy work hits a time limit instead of freezing the page', () => {
  const make = src => createRuntime(src, {module: 'hatchery', contract: 'Hatchery'});
  assert.throws(() => make(contract('').replace('pub struct Hatchery { n: u64 }', 'pub struct Hatchery { n: _ }')), /A struct field can't have type _/);
  assert.throws(() => make(contract('').replace('pub struct Hatchery { n: u64 }', 'pub struct Hatchery { n: Vec<Error> }')), /can't have type/);
  const rows = Array.from({length: 16}, () => `vec![${Array(128).fill('1').join(',')}]`).join(',');
  const heavy = contract('pub fn f(&self) { loop { let x = A == A; } }').replace('    pub struct Hatchery', `    const A: Vec<Vec<u64>> = vec![${rows}];\n    pub struct Hatchery`).replace('use dusk_core::abi;', 'use alloc::vec::Vec;');
  const start = Date.now();
  assert.throws(() => { const rt = make(heavy); rt.invoke(rt.create(), 'f', [], true); }, e => e instanceof RuntimeLimit);
  assert.ok(Date.now() - start < 5000, `stopped after ${Date.now() - start} ms`);
});
