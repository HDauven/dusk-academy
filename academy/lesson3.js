// Lesson 3: Moth hunt. Contract IDs, cross-contract calls, Result, blending DNA and rollback.
import {file, evolve, HATCHED, HUNTED} from './hatchery-file.js';
import {PARTS as L2} from './lesson2.js';
import {deploy, need, needMethod, pad16, MOTHS, MOTH_NEST, seedFromName} from './contract.js';

const blendOf = (a, b) => { const m = (BigInt(a) + BigInt(b)) / 2n; return m - m % 100n + 99n; };
const P = {};
P.nest = evolve(L2, {
  imports: ['use alloc::vec::Vec;', 'use dusk_core::abi::{self, ContractId};', 'use dusk_core::signatures::bls::PublicKey as BlsPublicKey;'],
  consts: [...L2.consts, '// The Moth Nest: another team\'s contract on the same chain.', 'const MOTH_NEST: ContractId = ContractId::from_bytes([7; 32]);'],
});
P.call = evolve(P.nest, {methods: {moth_dna: `fn moth_dna(&self, moth_id: u64) -> u64 {
    abi::call::<_, u64>(MOTH_NEST, "moth_dna", &moth_id).expect("The Moth Nest has no such moth")
}`}});
P.blend = evolve(P.call, {methods: {blend: `fn blend(&self, dna: u64, moth: u64) -> u64 {
    (dna + moth) / 2
}`}});
P.mothborn = evolve(P.blend, {methods: {blend: `fn blend(&self, dna: u64, moth: u64) -> u64 {
    let mixed = (dna + moth) / 2;
    mixed - mixed % 100 + 99
}`}});
P.hunt = evolve(P.mothborn, {methods: {hunt: `pub fn hunt(&mut self, id: u64, moth_id: u64) {
    let keeper = abi::public_sender().expect("Hunt from a public Moonlight account");
    let hunter = self.dusklings.get(id as usize).expect("No such Duskling");
    assert!(hunter.owner == keeper, "Only its keeper can send a Duskling hunting");
}`}});
P.feed = evolve(P.hunt, {methods: {hunt: `pub fn hunt(&mut self, id: u64, moth_id: u64) {
    let keeper = abi::public_sender().expect("Hunt from a public Moonlight account");
    let hunter = self.dusklings.get(id as usize).expect("No such Duskling");
    assert!(hunter.owner == keeper, "Only its keeper can send a Duskling hunting");
    let dna = self.blend(hunter.dna, self.moth_dna(moth_id));
    self.create_duskling(dna, keeper);
}`}});
// The second event type arrives with its fields; the learner implements ContractEvent and registers it.
P.huntedType0 = evolve(P.feed, {events: [HATCHED, {...HUNTED, topics: null}]});
P.huntedType = evolve(P.feed, {events: [HATCHED, HUNTED], registered: ['Hatched', 'Hunted']});
P.hunted = evolve(P.huntedType, {methods: {hunt: `pub fn hunt(&mut self, id: u64, moth_id: u64) {
    let keeper = abi::public_sender().expect("Hunt from a public Moonlight account");
    let hunter = self.dusklings.get(id as usize).expect("No such Duskling");
    assert!(hunter.owner == keeper, "Only its keeper can send a Duskling hunting");
    let dna = self.blend(hunter.dna, self.moth_dna(moth_id));
    self.create_duskling(dna, keeper);
    abi::emit("hunted", crate::Hunted { id, moth_id });
}`}});
export const PARTS = P.hunted;
const S = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, file(v)]));
const start = file(L2);

const sceneOf = c => ({nests: 5, moths: 3, creatures: c.dusklings().map(d => ({dna: pad16(d.dna), owner: d.owner}))});
const two = source => { const c = deploy(source); c.as('you').call('hatch', 1); c.as('rival').call('hatch', 2); return c; };

export const lesson = {
  id: 'moth-hunt', n: 3, title: 'Moth hunt', reference: S.hunted,
  chapters: [
    {
      id: 'moths', kind: 'intro', title: 'Something to eat',
      wick: `Dusklings get hungry after dark. Across the harbor, the Moth Nest contract keeps a colony of moths, and each one has DNA of its own.`,
      body: `<p>In this lesson your Hatchery calls <strong>another contract</strong>. When a Duskling hunts a moth from the Moth Nest, a new moth-born Duskling hatches that mixes both DNAs.</p>
<p>You'll learn contract IDs, cross-contract calls with <code>abi::call</code>, <code>Result</code>, and why a failed call undoes everything.</p>`,
      learn: ['<code>ContractId</code> and byte arrays', 'Calling another contract with <code>abi::call</code>', '<code>Result</code> and <code>expect</code>', 'Arithmetic with <code>%</code>', 'Ownership checks', 'Rollback across contracts', 'Writing an event type of your own'],
      scene: {nests: 5, moths: 3, creatures: ['8356281049284737', '1568560902483828']},
    },
    {
      id: 'nest-id', kind: 'code', title: 'Contract addresses',
      body: `<p>Every deployed contract has a <code>ContractId</code>: 32 bytes that identify it on the chain. To call another contract, you need its ID.</p>
<pre><code>const LIGHTHOUSE: ContractId = ContractId::from_bytes([3; 32]);</code></pre>
<p><code>[3; 32]</code> is an array of 32 bytes, all set to 3. A real deployment would use the other contract's actual ID. <code>ContractId</code> lives in the same <code>abi</code> module, so change your import to bring in both:</p>
<pre><code>use dusk_core::abi::{self, ContractId};</code></pre>
<p class="aside">For the next few chapters, Rust will warn that <code>MOTH_NEST</code> and the helpers you add aren't used yet. <code>hunt</code> puts them to work. Warnings aren't errors.</p>`,
      tasks: ['Change <code>use dusk_core::abi;</code> to <code>use dusk_core::abi::{self, ContractId};</code>', 'Below <code>MIX</code>, add a constant <code>MOTH_NEST: ContractId</code> set to <code>ContractId::from_bytes([7; 32])</code>.'],
      hint: `<code>const MOTH_NEST: ContractId = ContractId::from_bytes([7; 32]);</code>`,
      start, answer: S.nest,
      check(source) {
        const c = deploy(source), k = c.rt.program.constants.get('MOTH_NEST');
        need(k, 'Add a constant named `MOTH_NEST`.');
        need(k.declared === 'ContractId', '`MOTH_NEST` should have the type `ContractId`.');
        need(c.rt.globals.get('MOTH_NEST')?.hex === MOTH_NEST, '`MOTH_NEST` should be `ContractId::from_bytes([7; 32])`.');
        return {log: ['MOTH_NEST  →  0707…0707 (32 bytes)'], win: 'The Hatchery knows where the moths live.', scene: {nests: 5, moths: 3, creatures: []}};
      },
    },
    {
      id: 'call', kind: 'code', title: 'Calling another contract',
      body: `<p><code>abi::call</code> runs a function on another contract and waits for the answer:</p>
<pre><code>abi::call::&lt;_, u64&gt;(LIGHTHOUSE, "brightness", &amp;level)</code></pre>
<ul><li><code>::&lt;_, u64&gt;</code> says what comes back: a <code>u64</code>. Rust works out the argument's type (<code>_</code>) by itself.</li>
<li>The arguments are the contract, the function's name, and a reference to the argument.</li></ul>
<p>The call returns a <code>Result</code>: <code>Ok(value)</code>, or <code>Err(error)</code> if the other contract failed. Like an <code>Option</code>, you can <code>expect</code> it.</p>`,
      tasks: ['Add a private method <code>moth_dna(&amp;self, moth_id: u64) -> u64</code>.', 'Inside, call the Moth Nest\'s <code>"moth_dna"</code> function with <code>&amp;moth_id</code>, and <code>expect</code> the result with <code>"The Moth Nest has no such moth"</code>.'],
      hint: `<code>abi::call::&lt;_, u64&gt;(MOTH_NEST, "moth_dna", &amp;moth_id).expect("The Moth Nest has no such moth")</code>`,
      start: S.nest, answer: S.call,
      check(source) {
        const c = deploy(source);
        needMethod(c, 'moth_dna', {pub: false, mut: false, params: [['moth_id', 'u64']], output: 'u64'});
        const dna = c.call('moth_dna', 2);
        need(dna === MOTHS[2], `moth_dna(2) returned ${dna}, but moth #2 has DNA ${MOTHS[2]}.`);
        need(c.calls.length === 1, 'moth_dna should make exactly one call to the Moth Nest.');
        const msg = c.panics('moth_dna', 40);
        return {log: [`moth_dna(2)  →  ${pad16(dna)} (asked the Moth Nest)`, `moth_dna(40)  →  panic: “${msg}”`], win: 'Your contract just talked to another contract.', scene: {nests: 5, moths: 3, creatures: []}};
      },
    },
    {
      id: 'blend', kind: 'code', title: 'Mixing DNA',
      body: `<p>When a Duskling eats a moth, the new Duskling's DNA sits halfway between the two: their average.</p>
<p>Your DNA is below 10¹⁶, and the Moth Nest promises the same for its moths, so the sum fits easily in a <code>u64</code>. If it ever sent something huge, overflow checks would make the hunt fail instead of wrapping around.</p>`,
      tasks: ['Add a private method <code>blend(&amp;self, dna: u64, moth: u64) -> u64</code> that returns <code>(dna + moth) / 2</code>.'],
      hint: `<pre><code>fn blend(&amp;self, dna: u64, moth: u64) -> u64 {
    (dna + moth) / 2
}</code></pre>`,
      start: S.call, answer: S.blend,
      check(source) {
        const c = deploy(source);
        needMethod(c, 'blend', {pub: false, mut: false, params: [['dna', 'u64'], ['moth', 'u64']], output: 'u64'});
        const a = 8356281049284737n, b = MOTHS[0], got = c.call('blend', a, b);
        need(got === (a + b) / 2n, `blend(${a}, ${b}) returned ${got}, expected ${(a + b) / 2n}.`);
        return {log: [`blend(${pad16(a)}, ${pad16(b)})  →  ${pad16(got)}`], win: 'Half Duskling, half moth.', scene: {nests: 5, moths: 3, creatures: [pad16(a), pad16(got)]}};
      },
    },
    {
      id: 'mothborn', kind: 'code', title: 'Moth-born',
      body: `<p>Moth-born Dusklings are special: their DNA always ends in <code>99</code>, and any Duskling whose DNA ends in 99 hatches with moth wings and antennae.</p>
<p>To force the last two digits, remove them with <code>% 100</code> and add 99:</p>
<pre><code>n - n % 100 + 99</code></pre>
<p>With <code>n = 1234</code>, that's <code>1234 - 34 + 99 = 1299</code>.</p>`,
      tasks: ['Change <code>blend</code> to store the average in <code>let mixed</code>, then return <code>mixed - mixed % 100 + 99</code>.'],
      hint: `<pre><code>let mixed = (dna + moth) / 2;
mixed - mixed % 100 + 99</code></pre>`,
      start: S.blend, answer: S.mothborn,
      check(source) {
        const c = deploy(source), a = 8356281049284737n, b = MOTHS[0], got = c.call('blend', a, b);
        need(got % 100n === 99n, `blend should return DNA ending in 99, but it returned ${pad16(got)}.`);
        need(got === blendOf(a, b), `blend(${a}, ${b}) should be ${blendOf(a, b)}.`);
        return {log: [`blend(…)  →  ${pad16(got)}  ✦ moth-born`], win: 'Look at those wings.', scene: {nests: 5, moths: 3, creatures: [pad16(a), pad16(got)]}};
      },
    },
    {
      id: 'hunt', kind: 'code', title: 'Only your own Duskling',
      body: `<p>Now the public entry point. Only a Duskling's keeper may send it hunting. Look up the hunter with <code>get</code>, then compare owners:</p>
<pre><code>let egg = self.eggs.get(id as usize).expect("No such egg");
assert!(egg.owner == keeper, "Not your egg");</code></pre>`,
      tasks: ['Add <code>pub fn hunt(&amp;mut self, id: u64, moth_id: u64)</code>.', 'Get the public sender as <code>keeper</code> (<code>"Hunt from a public Moonlight account"</code>).', 'Look up the <code>hunter</code> (<code>"No such Duskling"</code>) and assert its owner is <code>keeper</code> (<code>"Only its keeper can send a Duskling hunting"</code>).'],
      hint: `<pre><code>let keeper = abi::public_sender().expect("Hunt from a public Moonlight account");
let hunter = self.dusklings.get(id as usize).expect("No such Duskling");
assert!(hunter.owner == keeper, "Only its keeper can send a Duskling hunting");</code></pre>`,
      start: S.mothborn, answer: S.hunt,
      check(source) {
        const c = two(source);
        needMethod(c, 'hunt', {pub: true, mut: true, params: [['id', 'u64'], ['moth_id', 'u64']], output: '()'});
        c.as('you').call('hunt', 0, 1);
        const other = c.as('rival').panics('hunt', 0, 1), none = c.as('you').panics('hunt', 9, 1), shielded = c.as(null).panics('hunt', 0, 1);
        return {log: ['hunt(0, 1) as you  →  ok', `hunt(0, 1) as Rook  →  panic: “${other}”`, `hunt(9, 1)  →  panic: “${none}”`, `hunt from a shielded account  →  panic: “${shielded}”`], win: 'Hunting with someone else\'s Duskling now panics.', scene: sceneOf(c)};
      },
    },
    {
      id: 'feed', kind: 'code', title: 'The feast',
      body: `<p>Put it together: ask the Moth Nest for the moth's DNA, blend it with the hunter's, and hatch the result for the same keeper.</p>
<p>If the Moth Nest call fails, for example because the moth doesn't exist, <code>expect</code> panics and the <strong>whole</strong> hunt is undone. No half-fed Dusklings.</p>`,
      tasks: ['After the owner check in <code>hunt</code>, compute <code>let dna = self.blend(hunter.dna, self.moth_dna(moth_id));</code>', 'Create the new Duskling for the same keeper: <code>self.create_duskling(dna, keeper);</code>'],
      hint: `The two new lines go at the end of <code>hunt</code>, after the <code>assert!</code>.`,
      start: S.hunt, answer: S.feed,
      check(source) {
        const c = two(source);
        c.as('you').call('hunt', 0, 2);
        const all = c.dusklings(), baby = all[2];
        need(all.length === 3, `A successful hunt should hatch a third Duskling, but there are ${all.length}.`);
        need(baby.dna === blendOf(all[0].dna, MOTHS[2]) && baby.owner === 'you', 'The new Duskling should have the blended DNA and belong to the hunter\'s keeper.');
        const msg = c.as('you').panics('hunt', 0, 40);
        need(c.dusklings().length === 3, 'A failed hunt must not hatch anything.');
        return {log: [`hunt(0, 2)  →  Duskling #2, DNA ${pad16(baby.dna)}, moth-born`, `hunt(0, 40)  →  panic: “${msg}”`, 'Dusklings after the failed hunt  →  still 3'], win: 'A moth-born Duskling hatched, and the failed hunt left no trace.', scene: sceneOf(c)};
      },
    },
    {
      id: 'hunted-type', kind: 'code', title: 'A second event type',
      body: `<p>Apps want to hear about hunts too, so the Hatchery needs a second event type. <code>Hunted</code> is already at the top of the file, with the hunter's id and the moth's id.</p>
<p>This time, write its <code>ContractEvent</code> impl yourself, then register it next to <code>Hatched</code>. The events list takes as many types as you like:</p>
<pre><code>#[dusk_forge::contract(events = [crate::Warmed, crate::Cooled])]</code></pre>`,
      tasks: ['Below <code>Hunted</code>, implement <code>ContractEvent</code> with one topic, <code>"hunted"</code>. Follow the shape of <code>Hatched</code>\'s impl.', 'Register it: add <code>crate::Hunted</code> to the events list.'],
      hint: `<pre><code>impl ContractEvent for Hunted {
    const TOPICS: &amp;'static [&amp;'static str] = &amp;["hunted"];
}

#[dusk_forge::contract(events = [crate::Hatched, crate::Hunted])]</code></pre>`,
      start: S.huntedType0, answer: S.huntedType,
      check(source) {
        const c = deploy(source), {events, registered} = c.rt.program;
        need(events.has('Hunted'), 'Implement `ContractEvent` for `Hunted`, just below the struct.');
        need(events.get('Hunted').topics.join() === 'hunted', '`Hunted` should have one topic: `&["hunted"]`.');
        need(registered.includes('crate::Hunted') && registered.includes('crate::Hatched'), 'Register both event types: `events = [crate::Hatched, crate::Hunted]`.');
        return {log: ['event type   Hunted { id: u64, moth_id: u64 }', 'topics       ["hunted"]', 'registered   crate::Hatched, crate::Hunted'], win: 'Two event types, both in the contract\'s schema.', scene: sceneOf(two(source))};
      },
    },
    {
      id: 'hunted', kind: 'code', title: 'Telling the world',
      body: `<p>Now emit it once the new Duskling exists. <code>create_duskling</code> already emits a <code>Hatched</code> event, so a hunt produces two events: the hatch, then the hunt.</p>`,
      tasks: ['At the end of <code>hunt</code>, emit <code>crate::Hunted { id, moth_id }</code> with the topic <code>"hunted"</code>.'],
      hint: `<code>abi::emit("hunted", crate::Hunted { id, moth_id });</code>`,
      start: S.huntedType, answer: S.hunted,
      check(source) {
        const c = two(source), mark = c.events.length;
        c.as('you').call('hunt', 0, 3);
        const ev = c.events.slice(mark);
        need(ev.length === 2 && ev[0].topic === 'hatched' && ev[1].topic === 'hunted', 'A hunt should emit "hatched" and then "hunted".');
        need(ev[1].type === 'Hunted', 'Emit the event type, `crate::Hunted { id, moth_id }`: apps can only decode registered event types.');
        need(ev[1].fields.id === 0n && ev[1].fields.moth_id === 3n, 'The `Hunted` event should carry the hunter\'s id and the moth\'s id: here 0 and 3.');
        return {log: [`event "hatched"  Hatched { id: 2, dna: ${pad16(ev[0].fields.dna)} }`, 'event "hunted"   Hunted { id: 0, moth_id: 3 }'], win: 'A hunt now emits Hatched, then Hunted.', scene: sceneOf(c)};
      },
    },
    {
      id: 'moth-feast', kind: 'finale', title: 'The moth feast',
      wick: `The moths are out. Take your Duskling hunting, and try a few things you shouldn't be able to do.`,
      body: `<p>Your contract from this lesson is running, with the Moth Nest on the same chain. Every successful hunt hatches a moth-born Duskling for you.</p>`,
      playground: {
        setup: (c, k) => { c.as('you').call('hatch', seedFromName(k.name || 'you')); c.as('rival').call('hatch', seedFromName('Rook')); },
        actions: [
          {label: 'Hunt the next moth', run: c => { const n = c.dusklings().length % MOTHS.length; c.as('you').call('hunt', 0, n); return `Your Duskling ate moth #${n}. A moth-born Duskling hatched.`; }},
          {label: 'Hunt with Rook\'s Duskling', run: c => { c.as('you').call('hunt', 1, 0); return 'You hunted with Rook\'s Duskling?'; }},
          {label: 'Hunt moth #404', run: c => { c.as('you').call('hunt', 0, 404); return 'Moth #404 exists?'; }},
        ],
      },
    },
  ],
};
