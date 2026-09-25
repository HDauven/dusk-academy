// Lesson 4: Night battles. Block height as a clock, cooldowns, a keeper helper, predictable rolls.
import {file, evolve} from './hatchery-file.js';
import {PARTS as L3} from './lesson3.js';
import {deploy, need, needMethod, fnSource, pad16, MIX, U64, seedFromName} from './contract.js';

const rollOf = (id, target, height) => (((((BigInt(id) * MIX) & U64) + BigInt(target) + BigInt(height)) & U64) * MIX & U64) % 100n;
const COOL = 360;
const P = {};
const create = extra => `fn create_duskling(&mut self, dna: u64, owner: BlsPublicKey) {
    let id = self.dusklings.len() as u64;
    self.dusklings.push(Duskling { dna, level: 1, owner${extra} });
    abi::emit("hatched", (id, dna));
}`;
P.readyAt = evolve(L3, {fields: [...L3.fields, 'ready_at: u64,'], methods: {create_duskling: create(', ready_at: 0')}});
P.rest = evolve(P.readyAt, {consts: [...L3.consts, 'const COOLDOWN: u64 = 360;'], methods: {hunt: `pub fn hunt(&mut self, id: u64, moth_id: u64) {
    let keeper = abi::public_sender().expect("Hunt from a public Moonlight account");
    let hunter = self.dusklings.get(id as usize).expect("No such Duskling");
    assert!(hunter.owner == keeper, "Only its keeper can send a Duskling hunting");
    let dna = self.blend(hunter.dna, self.moth_dna(moth_id));
    self.create_duskling(dna, keeper);
    abi::emit("hunted", (id, moth_id));
    self.dusklings[id as usize].ready_at = abi::block_height() + COOLDOWN;
}`}});
P.ready = evolve(P.rest, {methods: {
  hunt: `pub fn hunt(&mut self, id: u64, moth_id: u64) {
    let keeper = abi::public_sender().expect("Hunt from a public Moonlight account");
    let hunter = self.dusklings.get(id as usize).expect("No such Duskling");
    assert!(hunter.owner == keeper, "Only its keeper can send a Duskling hunting");
    assert!(self.is_ready(id), "Your Duskling is still resting");
    let dna = self.blend(hunter.dna, self.moth_dna(moth_id));
    self.create_duskling(dna, keeper);
    abi::emit("hunted", (id, moth_id));
    self.dusklings[id as usize].ready_at = abi::block_height() + COOLDOWN;
}`,
  is_ready: `fn is_ready(&self, id: u64) -> bool {
    abi::block_height() >= self.dusklings[id as usize].ready_at
}`,
}});
P.onlyKeeper = evolve(P.ready, {methods: {
  hunt: `pub fn hunt(&mut self, id: u64, moth_id: u64) {
    let keeper = self.only_keeper(id);
    assert!(self.is_ready(id), "Your Duskling is still resting");
    let hunter = &self.dusklings[id as usize];
    let dna = self.blend(hunter.dna, self.moth_dna(moth_id));
    self.create_duskling(dna, keeper);
    abi::emit("hunted", (id, moth_id));
    self.dusklings[id as usize].ready_at = abi::block_height() + COOLDOWN;
}`,
  only_keeper: `fn only_keeper(&self, id: u64) -> BlsPublicKey {
    let keeper = abi::public_sender().expect("Use a public Moonlight account");
    let duskling = self.dusklings.get(id as usize).expect("No such Duskling");
    assert!(duskling.owner == keeper, "Only its keeper can do that");
    keeper
}`,
}});
P.record = evolve(P.onlyKeeper, {fields: [...P.readyAt.fields, 'wins: u32,', 'losses: u32,'], methods: {create_duskling: create(', ready_at: 0, wins: 0, losses: 0')}});
P.roll = evolve(P.record, {methods: {roll: `fn roll(&self, id: u64, target: u64) -> u64 {
    id.wrapping_mul(MIX)
        .wrapping_add(target)
        .wrapping_add(abi::block_height())
        .wrapping_mul(MIX)
        % 100
}`}});
const battleHead = `pub fn battle(&mut self, id: u64, target: u64) {
    self.only_keeper(id);
    assert!(self.is_ready(id), "Your Duskling is still resting");
    assert!(id != target && (target as usize) < self.dusklings.len(), "Pick another Duskling to battle");
    let roll = self.roll(id, target);`;
P.battle = evolve(P.roll, {methods: {battle: `${battleHead}
}`}});
P.outcome = evolve(P.battle, {methods: {battle: `${battleHead}
    if roll < 70 {
        self.dusklings[id as usize].wins += 1;
        self.dusklings[id as usize].level += 1;
        self.dusklings[target as usize].losses += 1;
    } else {
        self.dusklings[id as usize].losses += 1;
        self.dusklings[target as usize].wins += 1;
    }
    self.dusklings[id as usize].ready_at = abi::block_height() + COOLDOWN;
}`}});
export const PARTS = P.outcome;
const S = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, file(v)]));
const start = file(L3);

const tag = d => ({dna: pad16(d.dna), owner: d.owner, level: d.level, wins: d.wins, losses: d.losses});
const sceneOf = c => ({nests: 5, creatures: c.dusklings().map(tag)});
const two = source => { const c = deploy(source); c.as('you').call('hatch', 1); c.as('rival').call('hatch', 2); return c; };
const heightWhere = (want, from = 1000) => { for (let h = from; ; h++) if (want(rollOf(0, 1, h))) return h; };

export const lesson = {
  id: 'night-battles', n: 4, title: 'Night battles', reference: S.outcome,
  chapters: [
    {
      id: 'arena', kind: 'intro', title: 'The Night Arena',
      wick: `Hunting is tiring work, and tonight the Night Arena opens. Dusklings will need rest between fights, and a record of how they did.`,
      body: `<p>This lesson adds <strong>time</strong> and <strong>battles</strong>. You'll use the block height as a clock for cooldowns, wrap your ownership check in a reusable helper, and let Dusklings battle. Along the way you'll see why on-chain randomness is harder than it looks.</p>`,
      learn: ['<code>abi::block_height()</code> as a clock', 'Cooldowns with <code>bool</code> helpers', 'One helper for access checks', 'Wins, losses and levels', 'Why a contract can\'t roll fair dice', '<code>if</code> / <code>else</code>'],
      scene: {nests: 5, creatures: [{dna: '8356281049284737', owner: 'you', level: 1n, wins: 0n, losses: 0n}, {dna: '2788147323984481', owner: 'rival', level: 1n, wins: 0n, losses: 0n}]},
    },
    {
      id: 'ready-at', kind: 'code', title: 'A place to rest',
      body: `<p>After a hunt, a Duskling needs rest. A new field records when it's ready again.</p>
<p>Every place that builds a <code>Duskling</code> has to set the new field too, so update <code>create_duskling</code>. A newly hatched Duskling is ready straight away.</p>`,
      tasks: ['Add a field <code>ready_at: u64</code> to <code>Duskling</code>.', 'In <code>create_duskling</code>, set <code>ready_at: 0</code>.'],
      hint: `<code>Duskling { dna, level: 1, owner, ready_at: 0 }</code>`,
      start, answer: S.readyAt,
      check(source) {
        const c = deploy(source);
        need(c.rt.program.structs.get('Duskling')?.get('ready_at') === 'u64', '`Duskling` needs a field `ready_at: u64`.');
        c.as('you').call('hatch', 1);
        need(c.dusklings()[0].ready_at === 0n, 'A new Duskling should start with `ready_at: 0`.');
        return {log: ['hatch  →  ready_at: 0'], win: 'Room for a rest.', scene: sceneOf(c)};
      },
    },
    {
      id: 'block-height', kind: 'code', title: 'The chain\'s clock',
      body: `<p>Contracts can't read a wall clock, because every node has to agree on the answer. What they can read is the <strong>block height</strong>, the number of the current block, with <code>abi::block_height()</code>. New blocks keep coming, so the height works as a clock that every node agrees on.</p>
<pre><code>const COOLDOWN: u64 = 360;</code></pre>`,
      tasks: ['Below <code>MOTH_NEST</code>, add the constant <code>COOLDOWN: u64 = 360</code>.', 'At the end of <code>hunt</code>, set the hunter\'s <code>ready_at</code> to <code>abi::block_height() + COOLDOWN</code>. Index the vector directly: <code>self.dusklings[id as usize].ready_at = …;</code>'],
      hint: `<code>self.dusklings[id as usize].ready_at = abi::block_height() + COOLDOWN;</code>`,
      start: S.readyAt, answer: S.rest,
      check(source) {
        const c = two(source);
        need(c.rt.globals.get('COOLDOWN') === 360n, 'Add `const COOLDOWN: u64 = 360;`.');
        c.at(1000).as('you').call('hunt', 0, 1);
        const r = c.dusklings()[0].ready_at;
        need(r === 1360n, `A hunt at block 1000 should set ready_at to 1360, not ${r}.`);
        return {log: ['block 1000: hunt(0, 1)', 'ready_at  →  1360'], win: 'Your Duskling knows when it can hunt again.', scene: sceneOf(c)};
      },
    },
    {
      id: 'is-ready', kind: 'code', title: 'Resting',
      body: `<p>A small helper makes the rule easy to read:</p>
<pre><code>fn is_ready(&amp;self, id: u64) -> bool</code></pre>
<p>It compares the current block height with the Duskling's <code>ready_at</code>. Then <code>hunt</code> can refuse to send out a tired Duskling.</p>`,
      tasks: ['Add a private <code>is_ready(&amp;self, id: u64) -> bool</code> that returns whether <code>abi::block_height()</code> is at least the Duskling\'s <code>ready_at</code>.', 'In <code>hunt</code>, right after the owner check, assert <code>self.is_ready(id)</code> with the message <code>"Your Duskling is still resting"</code>.'],
      hint: `<code>abi::block_height() >= self.dusklings[id as usize].ready_at</code>`,
      start: S.rest, answer: S.ready,
      check(source) {
        const c = two(source);
        needMethod(c, 'is_ready', {pub: false, mut: false, params: [['id', 'u64']], output: 'bool'});
        c.at(1000).as('you').call('hunt', 0, 1);
        const msg = c.at(1200).as('you').panics('hunt', 0, 2);
        c.at(1360).as('you').call('hunt', 0, 2);
        return {log: ['block 1000: hunt  →  ok', `block 1200: hunt  →  panic: “${msg}”`, 'block 1360: hunt  →  ok'], win: 'Rest is enforced, block by block.', scene: sceneOf(c)};
      },
    },
    {
      id: 'only-keeper', kind: 'code', title: 'Don\'t repeat yourself',
      body: `<p>Hunting, battling and trading all start by checking the sender. A check like that belongs in one helper, so there's exactly one place to get it right. This one checks ownership and returns the keeper:</p>
<pre><code>fn only_keeper(&amp;self, id: u64) -> BlsPublicKey {
    let keeper = abi::public_sender().expect("Use a public Moonlight account");
    let duskling = self.dusklings.get(id as usize).expect("No such Duskling");
    assert!(duskling.owner == keeper, "Only its keeper can do that");
    keeper
}</code></pre>`,
      tasks: ['Add the <code>only_keeper</code> helper above.', 'In <code>hunt</code>, replace the first three lines with <code>let keeper = self.only_keeper(id);</code>', 'After the rest check, look up the hunter with <code>let hunter = &amp;self.dusklings[id as usize];</code>'],
      hint: `<code>hunt</code> now starts: <code>let keeper = self.only_keeper(id);</code>, then the <code>is_ready</code> assert, then <code>let hunter = &amp;self.dusklings[id as usize];</code>`,
      start: S.ready, answer: S.onlyKeeper,
      check(source) {
        const c = two(source);
        needMethod(c, 'only_keeper', {pub: false, mut: false, params: [['id', 'u64']], output: 'BlsPublicKey'});
        const hunt = fnSource(source, 'hunt');
        need(/self\.only_keeper\(id\)/.test(hunt) && !/public_sender/.test(hunt), '`hunt` should start with `let keeper = self.only_keeper(id);` instead of its own sender check.');
        const msg = c.as('rival').panics('hunt', 0, 1);
        c.at(1000).as('you').call('hunt', 0, 1);
        need(c.dusklings().length === 3, 'Hunting should still work for the keeper.');
        return {log: [`hunt(0, 1) as Rook  →  panic: “${msg}”`, 'hunt(0, 1) as you  →  ok'], win: 'One helper guards every door.', scene: sceneOf(c)};
      },
    },
    {
      id: 'record', kind: 'code', title: 'Wins and losses',
      body: `<p>Battles need a record. <code>u32</code> is plenty: four billion wins would take a while.</p>`,
      tasks: ['Add <code>wins: u32</code> and <code>losses: u32</code> to <code>Duskling</code>, after <code>ready_at</code>.', 'Start both at <code>0</code> in <code>create_duskling</code>.'],
      hint: `<code>Duskling { dna, level: 1, owner, ready_at: 0, wins: 0, losses: 0 }</code>`,
      start: S.onlyKeeper, answer: S.record,
      check(source) {
        const c = deploy(source), s = c.rt.program.structs.get('Duskling');
        need(s?.get('wins') === 'u32' && s?.get('losses') === 'u32', '`Duskling` needs `wins: u32` and `losses: u32`.');
        c.as('you').call('hatch', 1);
        const d = c.dusklings()[0];
        need(d.wins === 0n && d.losses === 0n, 'A new Duskling starts with 0 wins and 0 losses.');
        return {log: ['hatch  →  wins: 0, losses: 0'], win: 'A clean record.', scene: sceneOf(c)};
      },
    },
    {
      id: 'roll', kind: 'code', title: 'Rolling the dice (sort of)',
      body: `<p>Battles need some chance, but a contract has no dice. Every node must compute the same result, so any “random” number is really a function of data everyone can see:</p>
<pre><code>fn roll(&amp;self, id: u64, target: u64) -> u64 {
    id.wrapping_mul(MIX)
        .wrapping_add(target)
        .wrapping_add(abi::block_height())
        .wrapping_mul(MIX)
        % 100
}</code></pre>
<p>That gives a number from 0 to 99. But anyone can work it out in advance and only battle when the numbers favor them. That's fine for a tutorial game. For anything valuable, use a design where nobody can see the outcome before committing to it, such as a commit–reveal scheme.</p>`,
      tasks: ['Add the private <code>roll</code> method above.'],
      hint: `Copy the method from the explanation into <code>impl Hatchery</code>.`,
      start: S.record, answer: S.roll,
      check(source) {
        const c = two(source);
        needMethod(c, 'roll', {pub: false, mut: false, params: [['id', 'u64'], ['target', 'u64']], output: 'u64'});
        const log = [];
        for (const h of [1000, 1001, 1002]) {
          const got = c.at(h).call('roll', 0, 1), want = rollOf(0, 1, h);
          need(got === want, `roll(0, 1) at block ${h} returned ${got}, expected ${want}.`);
          log.push(`block ${h}: roll(0, 1)  →  ${got}`);
        }
        return {log, win: 'Different every block, and predictable by anyone. Remember both halves.', scene: sceneOf(c)};
      },
    },
    {
      id: 'battle', kind: 'code', title: 'Into the arena',
      body: `<p>The battle entry point checks three things before anything happens: you keep the attacker, it's rested, and the target is a different Duskling that exists.</p>
<p><code>&amp;&amp;</code> means “and”, and <code>!=</code> means “not equal”. <code>only_keeper</code> returns the keeper, but we don't need it here, so its result is ignored.</p>
<p class="aside">Rust will warn that <code>roll</code> is unused until the next chapter.</p>`,
      tasks: ['Add <code>pub fn battle(&amp;mut self, id: u64, target: u64)</code>.', 'Call <code>self.only_keeper(id);</code> and assert <code>self.is_ready(id)</code> (<code>"Your Duskling is still resting"</code>).', 'Assert <code>id != target &amp;&amp; (target as usize) &lt; self.dusklings.len()</code> (<code>"Pick another Duskling to battle"</code>).', 'Finally, store <code>let roll = self.roll(id, target);</code>'],
      hint: `<pre><code>self.only_keeper(id);
assert!(self.is_ready(id), "Your Duskling is still resting");
assert!(id != target &amp;&amp; (target as usize) &lt; self.dusklings.len(), "Pick another Duskling to battle");
let roll = self.roll(id, target);</code></pre>`,
      start: S.roll, answer: S.battle,
      check(source) {
        const c = two(source);
        needMethod(c, 'battle', {pub: true, mut: true, params: [['id', 'u64'], ['target', 'u64']], output: '()'});
        const a = c.as('rival').panics('battle', 0, 1), b = c.as('you').panics('battle', 0, 0), d = c.as('you').panics('battle', 0, 9);
        c.as('you').call('battle', 0, 1);
        return {log: [`battle(0, 1) as Rook  →  panic: “${a}”`, `battle(0, 0)  →  panic: “${b}”`, `battle(0, 9)  →  panic: “${d}”`, 'battle(0, 1) as you  →  ok'], win: 'The arena gates are guarded.', scene: sceneOf(c)};
      },
    },
    {
      id: 'outcome', kind: 'code', title: 'Win or lose',
      body: `<p>If the roll is below 70, the attacker wins: its wins and level go up, and the target takes a loss. Otherwise it's the other way around. Either way, the attacker rests afterwards.</p>
<pre><code>if roll &lt; 70 {
    // the attacker wins
} else {
    // the target wins
}</code></pre>`,
      tasks: ['If <code>roll &lt; 70</code>: add 1 to the attacker\'s <code>wins</code> and <code>level</code>, and 1 to the target\'s <code>losses</code>.', 'Otherwise: add 1 to the attacker\'s <code>losses</code> and the target\'s <code>wins</code>.', 'After the <code>if</code>, set the attacker\'s <code>ready_at</code> to <code>abi::block_height() + COOLDOWN</code>.'],
      hint: `<pre><code>if roll &lt; 70 {
    self.dusklings[id as usize].wins += 1;
    self.dusklings[id as usize].level += 1;
    self.dusklings[target as usize].losses += 1;
} else {
    self.dusklings[id as usize].losses += 1;
    self.dusklings[target as usize].wins += 1;
}
self.dusklings[id as usize].ready_at = abi::block_height() + COOLDOWN;</code></pre>`,
      start: S.battle, answer: S.outcome,
      check(source) {
        const win = heightWhere(r => r < 70), lose = heightWhere(r => r >= 70, win + COOL);
        const c = two(source);
        c.at(win).as('you').call('battle', 0, 1);
        let [a, b] = c.dusklings();
        need(a.wins === 1n && a.level === 2n && b.losses === 1n, `At block ${win} the roll is ${rollOf(0, 1, win)}: the attacker should win (wins 1, level 2) and the target should lose.`);
        need(a.ready_at === BigInt(win + COOL), 'After a battle, the attacker should rest for COOLDOWN blocks.');
        const tired = c.at(win).as('you').panics('battle', 0, 1);
        c.at(lose).as('you').call('battle', 0, 1);
        [a, b] = c.dusklings();
        need(a.losses === 1n && b.wins === 1n && a.level === 2n, `At block ${lose} the roll is ${rollOf(0, 1, lose)}: the attacker should lose this time.`);
        return {log: [`block ${win}: roll ${rollOf(0, 1, win)}  →  your Duskling wins, level 2`, `block ${win}: battle again  →  panic: “${tired}”`, `block ${lose}: roll ${rollOf(0, 1, lose)}  →  Rook's Duskling wins`], win: 'Tonight\'s results are on the chain.', scene: sceneOf(c)};
      },
    },
    {
      id: 'arena-night', kind: 'finale', title: 'Arena night',
      wick: `Your Duskling against Rook's. Remember: anyone can peek at the next roll. Try it, and you'll see why real games need better randomness.`,
      body: `<p>Your contract from this lesson is running. Battle, wait out the cooldown, and peek at the roll before you fight.</p>`,
      playground: {
        setup: (c, k) => { c.at(1000); c.as('you').call('hatch', seedFromName(k.name || 'you')); c.as('rival').call('hatch', seedFromName('Rook')); },
        actions: [
          {label: 'Peek at the next roll', run: c => { const r = c.call('roll', 0, 1); return `At block ${c.ctx.height} the roll would be ${r}: ${r < 70n ? 'you would win' : 'you would lose'}.`; }},
          {label: 'Battle Rook\'s Duskling', run: c => { const before = c.dusklings()[0].wins; c.as('you').call('battle', 0, 1); return c.dusklings()[0].wins > before ? 'Your Duskling won!' : 'Rook\'s Duskling won this one.'; }},
          {label: 'Wait 1 block', run: c => { c.at(c.ctx.height + 1); return `Block ${c.ctx.height}.`; }},
          {label: 'Wait 360 blocks', run: c => { c.at(c.ctx.height + 360); return `Block ${c.ctx.height}. Everyone is rested.`; }},
        ],
      },
    },
  ],
};
