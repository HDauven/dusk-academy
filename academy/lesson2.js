// Lesson 2: Keepers. Getters, Option, public senders, owners, iterators and a one-hatch rule.
import {file, evolve, LESSON1} from './hatchery-file.js';
import {deploy, need, needMethod, pad16, dnaFor, seedFromName} from './contract.js';

const BLS = 'use dusk_core::signatures::bls::PublicKey as BlsPublicKey;';
const P = {};
P.getters = evolve(LESSON1, {methods: {duskling_count: `pub fn duskling_count(&self) -> u64 {
    self.dusklings.len() as u64
}`}});
P.dnaOf = evolve(P.getters, {methods: {dna_of: `pub fn dna_of(&self, id: u64) -> Option<u64> {
    self.dusklings.get(id as usize).map(|d| d.dna)
}`}});
P.sender = evolve(P.dnaOf, {methods: {hatch: `pub fn hatch(&mut self, seed: u64) {
    let keeper = abi::public_sender().expect("Hatch from a public Moonlight account");
    let dna = self.generate_dna(seed);
    self.create_duskling(dna);
}`}});
P.owner = evolve(P.sender, {
  imports: [...LESSON1.imports, BLS],
  fields: [...LESSON1.fields, 'owner: BlsPublicKey,'],
  methods: {
    create_duskling: `fn create_duskling(&mut self, dna: u64, owner: BlsPublicKey) {
    let id = self.dusklings.len() as u64;
    self.dusklings.push(Duskling { dna, level: 1, owner });
    abi::emit("hatched", crate::Hatched { id, dna });
}`,
    hatch: `pub fn hatch(&mut self, seed: u64) {
    let keeper = abi::public_sender().expect("Hatch from a public Moonlight account");
    let dna = self.generate_dna(seed);
    self.create_duskling(dna, keeper);
}`,
  },
});
P.ownerOf = evolve(P.owner, {methods: {owner_of: `pub fn owner_of(&self, id: u64) -> Option<BlsPublicKey> {
    self.dusklings.get(id as usize).map(|d| d.owner)
}`}});
P.countOf = evolve(P.ownerOf, {methods: {dusklings_of: `pub fn dusklings_of(&self, keeper: BlsPublicKey) -> u64 {
    self.dusklings.iter().filter(|d| d.owner == keeper).count() as u64
}`}});
P.oneFree = evolve(P.countOf, {methods: {hatch: `pub fn hatch(&mut self, seed: u64) {
    let keeper = abi::public_sender().expect("Hatch from a public Moonlight account");
    assert!(self.dusklings_of(keeper) == 0, "Every keeper hatches one Duskling");
    let dna = self.generate_dna(seed);
    self.create_duskling(dna, keeper);
}`}});
export const PARTS = P.oneFree;
const S = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, file(v)]));
const start = file(LESSON1);

export const sceneOf = c => ({nests: 5, creatures: c.dusklings().map(d => ({dna: pad16(d.dna), owner: d.owner}))});

export const lesson = {
  id: 'keepers', n: 2, title: 'Keepers', reference: S.oneFree,
  chapters: [
    {
      id: 'keepers', kind: 'intro', title: 'Every Duskling needs a keeper',
      wick: `Your Hatchery works, but anyone can hatch as many Dusklings as they like, and nobody owns any of them. Time to fix that.`,
      body: `<p>In this lesson, every Duskling gets a <strong>keeper</strong>: the account that hatched it. You'll add read-only getters for apps, meet Dusk's <code>abi::public_sender()</code>, store owners, count Dusklings per keeper, and limit everyone to one hatch each.</p>
<p>You keep working on the same file you finished in Lesson 1.</p>`,
      learn: ['Getters and <code>usize</code>', '<code>Option</code>, <code>get</code> and closures', '<code>abi::public_sender()</code> and shielded senders', 'Storing a <code>BlsPublicKey</code>', 'Iterators: <code>filter</code> and <code>count</code>', '<code>assert!</code> and rollback'],
      scene: {nests: 5, creatures: ['8356281049284737', '1568560902483828', '2788147323984481']},
    },
    {
      id: 'getters', kind: 'code', title: 'Reading state',
      body: `<p>Apps read a contract through its public methods. A method that takes <code>&amp;self</code> only reads, so calling it changes nothing. Methods like this are often called <strong>getters</strong>.</p>
<pre><code>pub fn egg_count(&amp;self) -> u64 {
    self.eggs.len() as u64
}</code></pre>
<p><code>len()</code> returns a <code>usize</code>, Rust's type for sizes and positions. <code>as u64</code> converts it.</p>`,
      tasks: ['After <code>hatch</code>, add a public getter <code>duskling_count</code> that returns how many Dusklings the Hatchery holds, as a <code>u64</code>.'],
      hint: `<pre><code>pub fn duskling_count(&amp;self) -> u64 {
    self.dusklings.len() as u64
}</code></pre>`,
      start, answer: S.getters,
      check(source) {
        const c = deploy(source);
        needMethod(c, 'duskling_count', {pub: true, mut: false, params: [], output: 'u64'});
        need(c.call('duskling_count') === 0n, 'A new Hatchery should report 0 Dusklings.');
        for (const s of [1, 2, 3]) c.call('hatch', s);
        const n = c.call('duskling_count');
        need(n === 3n, `After three hatches, duskling_count() returned ${n}, not 3.`);
        return {log: ['duskling_count()  →  0', 'hatch × 3', 'duskling_count()  →  3'], win: 'Apps can count your Dusklings now.', scene: sceneOf(c)};
      },
    },
    {
      id: 'dna-of', kind: 'code', title: 'Maybe there, maybe not',
      body: `<p>What should <code>dna_of(7)</code> return when there are only three Dusklings? Rust has no <code>null</code>. It has <code>Option</code>: either <code>Some(value)</code> or <code>None</code>.</p>
<p>A vector's <code>get(i)</code> returns an <code>Option</code>, and <code>map</code> transforms the value inside it, if there is one:</p>
<pre><code>self.eggs.get(i).map(|e| e.size)</code></pre>
<p><code>|e| e.size</code> is a <strong>closure</strong>: a small unnamed function. This one takes an egg and returns its size.</p>`,
      tasks: ['Add a public getter <code>dna_of(&amp;self, id: u64) -> Option&lt;u64&gt;</code> that returns the DNA of Duskling <code>id</code>, or <code>None</code> if it doesn\'t exist. Vectors are indexed with <code>usize</code>, so use <code>id as usize</code>.'],
      hint: `<code>self.dusklings.get(id as usize).map(|d| d.dna)</code>`,
      start: S.getters, answer: S.dnaOf,
      check(source) {
        const c = deploy(source);
        needMethod(c, 'dna_of', {pub: true, mut: false, params: [['id', 'u64']], output: 'Option<u64>'});
        c.call('hatch', 1); c.call('hatch', 2);
        const a = c.call('dna_of', 1), b = c.call('dna_of', 7);
        need(a?.kind === 'some' && a.value === dnaFor(2), `dna_of(1) should be Some(${dnaFor(2)}).`);
        need(b === null, 'dna_of(7) should be None: there is no Duskling 7.');
        return {log: [`dna_of(1)  →  Some(${pad16(a.value)})`, 'dna_of(7)  →  None'], win: 'dna_of returns the DNA, or None for an id that doesn\'t exist.', scene: sceneOf(c)};
      },
    },
    {
      id: 'sender', kind: 'code', title: 'Who\'s calling?',
      body: `<p>To know who hatched a Duskling, the contract needs to know who sent the transaction. <code>abi::public_sender()</code> returns the sender's public key for a <strong>Moonlight</strong> (public) transaction, and <code>None</code> for a shielded <strong>Phoenix</strong> one.</p>
<p>That's a real design choice. We'll require a public sender for hatching, so a shielded hatch fails:</p>
<pre><code>let keeper = abi::public_sender().expect("message");</code></pre>
<p><code>expect</code> unwraps <code>Some(value)</code>, or panics with your message on <code>None</code>. A panic undoes the whole call.</p>
<p class="aside">Rust will warn that <code>keeper</code> is unused. The next chapter puts it to work.</p>`,
      tasks: ['At the start of <code>hatch</code>, store the sender in <code>keeper</code>, panicking with <code>"Hatch from a public Moonlight account"</code> when there isn\'t one.'],
      hint: `<code>let keeper = abi::public_sender().expect("Hatch from a public Moonlight account");</code>`,
      start: S.dnaOf, answer: S.sender,
      check(source) {
        const c = deploy(source);
        c.as('you').call('hatch', 1);
        const msg = c.as(null).panics('hatch', 2);
        need(c.call('duskling_count') === 1n, 'The failed shielded hatch should leave the Hatchery unchanged.');
        return {log: ['hatch(1) from a Moonlight account  →  Duskling #0', `hatch(2) from a shielded account  →  panic: “${msg}”`, 'duskling_count()  →  1 (the failed call changed nothing)'], win: 'A hatch without a public sender now panics and changes nothing.', scene: sceneOf(c)};
      },
    },
    {
      id: 'owner', kind: 'code', title: 'Recording the keeper',
      body: `<p>A public key has a type too: <code>BlsPublicKey</code>, from Dusk's signature library. Import it under a shorter name:</p>
<pre><code>${BLS}</code></pre>
<p>Keys can be stored in structs and compared with <code>==</code>, just like numbers. Now each Duskling can remember its keeper.</p>`,
      tasks: ['Add the import above, below the other <code>use</code> lines.', 'Give <code>Duskling</code> a field <code>owner: BlsPublicKey</code>.', 'Make <code>create_duskling</code> take a second parameter, <code>owner: BlsPublicKey</code>, and store it in the new Duskling.', 'In <code>hatch</code>, pass <code>keeper</code> to <code>create_duskling</code>.'],
      hint: `<code>fn create_duskling(&amp;mut self, dna: u64, owner: BlsPublicKey)</code> pushes <code>Duskling { dna, level: 1, owner }</code>, and <code>hatch</code> ends with <code>self.create_duskling(dna, keeper);</code>`,
      start: S.sender, answer: S.owner,
      check(source) {
        const c = deploy(source);
        need(c.rt.program.structs.get('Duskling')?.get('owner') === 'BlsPublicKey', '`Duskling` needs a field `owner: BlsPublicKey`.');
        needMethod(c, 'create_duskling', {params: [['dna', 'u64'], ['owner', 'BlsPublicKey']]});
        c.as('you').call('hatch', 1); c.as('rival').call('hatch', 2);
        const [a, b] = c.dusklings();
        need(a.owner === 'you' && b.owner === 'rival', 'Each Duskling\'s owner should be the key that hatched it.');
        return {log: ['hatch(1) as you  →  owner: you', 'hatch(2) as Rook  →  owner: Rook'], win: 'Every Duskling has a keeper now.', scene: sceneOf(c)};
      },
    },
    {
      id: 'owner-of', kind: 'code', title: 'Whose is it?',
      body: `<p>Apps will want to show who owns each Duskling, so add a getter. It's the same pattern as <code>dna_of</code>, returning the owner instead.</p>
<p class="aside">Remember that ordinary contract state is public: anyone can read which key owns each Duskling, getter or no getter. The getter just makes it convenient.</p>`,
      tasks: ['Add a public getter <code>owner_of(&amp;self, id: u64) -> Option&lt;BlsPublicKey&gt;</code>.'],
      hint: `<code>self.dusklings.get(id as usize).map(|d| d.owner)</code>`,
      start: S.owner, answer: S.ownerOf,
      check(source) {
        const c = deploy(source);
        needMethod(c, 'owner_of', {pub: true, mut: false, params: [['id', 'u64']], output: 'Option<BlsPublicKey>'});
        c.as('you').call('hatch', 1); c.as('rival').call('hatch', 2);
        const a = c.call('owner_of', 0), b = c.call('owner_of', 1), z = c.call('owner_of', 9);
        need(a?.value?.id === 'you' && b?.value?.id === 'rival', 'owner_of should return Some(owner) for existing Dusklings.');
        need(z === null, 'owner_of(9) should be None.');
        return {log: ['owner_of(0)  →  Some(you)', 'owner_of(1)  →  Some(Rook)', 'owner_of(9)  →  None'], win: 'Apps can ask who owns what.', scene: sceneOf(c)};
      },
    },
    {
      id: 'count-of', kind: 'code', title: 'Counting with iterators',
      body: `<p>How many Dusklings does one keeper have? Walk the vector with an <strong>iterator</strong>:</p>
<pre><code>self.eggs.iter().filter(|e| e.warm).count()</code></pre>
<ul><li><code>iter()</code> visits each item in turn.</li><li><code>filter</code> keeps the items where the closure returns <code>true</code>.</li><li><code>count()</code> counts what's left, as a <code>usize</code>.</li></ul>`,
      tasks: ['Add a public getter <code>dusklings_of(&amp;self, keeper: BlsPublicKey) -> u64</code> that counts the Dusklings owned by <code>keeper</code>.'],
      hint: `<code>self.dusklings.iter().filter(|d| d.owner == keeper).count() as u64</code>`,
      start: S.ownerOf, answer: S.countOf,
      check(source) {
        const c = deploy(source);
        needMethod(c, 'dusklings_of', {pub: true, mut: false, params: [['keeper', 'BlsPublicKey']], output: 'u64'});
        c.as('you').call('hatch', 1); c.as('you').call('hatch', 2); c.as('rival').call('hatch', 3);
        const you = c.call('dusklings_of', 'you'), rival = c.call('dusklings_of', 'rival'), friend = c.call('dusklings_of', 'friend');
        need(you === 2n && rival === 1n && friend === 0n, `Expected 2 for you, 1 for Rook and 0 for Fen, got ${you}, ${rival} and ${friend}.`);
        return {log: ['dusklings_of(you)  →  2', 'dusklings_of(Rook)  →  1', 'dusklings_of(Fen)  →  0'], win: 'dusklings_of counts with filter and count, without a loop.', scene: sceneOf(c)};
      },
    },
    {
      id: 'one-free', kind: 'code', title: 'One hatch per keeper',
      wick: `Rook has hatched forty-two Dusklings since breakfast. We need a rule.`,
      body: `<p><code>assert!(condition, "message")</code> panics when the condition is false. Because a panic undoes the whole call, an assert at the top of a method is a clean way to enforce a rule.</p>
<pre><code>assert!(self.egg_count() &lt; 12, "The nest is full");</code></pre>
<p>Methods can call other methods, including public getters like <code>dusklings_of</code>.</p>`,
      tasks: ['In <code>hatch</code>, right after getting <code>keeper</code>, assert that the keeper has no Dusklings yet, with the message <code>"Every keeper hatches one Duskling"</code>.'],
      hint: `<code>assert!(self.dusklings_of(keeper) == 0, "Every keeper hatches one Duskling");</code>`,
      start: S.countOf, answer: S.oneFree,
      check(source) {
        const c = deploy(source);
        c.as('you').call('hatch', 1);
        const msg = c.as('you').panics('hatch', 2);
        need(c.call('dusklings_of', 'you') === 1n, 'The second hatch should be rolled back.');
        c.as('rival').call('hatch', 3); c.as('friend').call('hatch', 4);
        need(c.call('duskling_count') === 3n, 'Rook and Fen should each still be able to hatch once.');
        return {log: ['hatch as you  →  ok', `hatch as you again  →  panic: “${msg}”`, 'hatch as Rook  →  ok', 'hatch as Fen  →  ok'], win: 'A keeper\'s second hatch now panics.', scene: sceneOf(c)};
      },
    },
    {
      id: 'keepers-play', kind: 'finale', title: 'Keepers of the harbor',
      wick: `Let's see your rules in action. You, Rook and Fen are all at the Hatchery.`,
      body: `<p>This is your own contract from this lesson, running in the harbor. Try each action and watch who owns what. Then try to break the rules.</p>`,
      playground: {
        actions: [
          {label: 'Hatch as you', run: (c, k) => { c.as('you').call('hatch', seedFromName(k.name || 'you')); return 'You hatched a Duskling.'; }},
          {label: 'Hatch again as you', run: c => { c.as('you').call('hatch', 7); return 'That worked, so the one-hatch rule is missing!'; }},
          {label: 'Hatch as Rook', run: c => { c.as('rival').call('hatch', seedFromName('Rook')); return 'Rook hatched a Duskling.'; }},
          {label: 'Hatch from a shielded account', run: c => { c.as(null).call('hatch', 99); return 'A shielded hatch went through?'; }},
          {label: 'How many does Rook have?', run: c => `dusklings_of(Rook)  →  ${c.call('dusklings_of', 'rival')}`},
        ],
      },
    },
  ],
};
