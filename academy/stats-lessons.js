// Circuits path: Secret stats. Two lessons on one dusk-plonk circuit, checked with real PLONK proofs.
import {circuitProgram, hexOf} from './circuit.js';
import {Hint, need, fail} from './contract.js';

// A Duskling's secret stats come from its DNA, so every keeper's Duskling has its own.
export function statsOf(dna) {
  const digits = String(dna).padStart(16, '0');
  const strength = 10n + BigInt(digits.slice(0, 4)) % 45n, agility = 10n + BigInt(digits.slice(4, 8)) % 45n;
  return {strength, agility, power: strength + agility};
}

export const CAST = {
  fen: {name: 'Fen', dna: '2788147323984481', tone: 'friend'},
  wick: {name: 'Wick', dna: '0001010104060000', tone: 'you'},
  rook: {name: 'Rook', dna: '1335947248835871', tone: 'rival'},
};
// Samples are [strength, agility, power]; the engine needs the all-zero default first.
export const SUM_CASES = [
  {who: 'fen', stats: [30n, 25n, 55n], honest: true},
  {who: 'wick', stats: [26n, 24n, 50n], honest: true},
  {who: 'rook', stats: [14n, 9n, 30n], honest: false, note: 'claims 14 + 9 = 30'},
];
export const ARENA_CASES = [
  {who: 'fen', stats: [30n, 25n, 55n], honest: true},
  {who: 'wick', stats: [26n, 24n, 50n], honest: true, note: 'exactly 50'},
  {who: 'rook', stats: [14n, 9n, 23n], honest: false, note: 'power 23, below 50'},
  {who: 'rook', stats: [14n, 9n, 50n], honest: false, note: 'claims 14 + 9 = 50'},
];
export const samplesOf = cases => [[0n, 0n, 0n], ...cases.map(c => c.stats)];

const HEAD = `use dusk_plonk::prelude::*;

// Your Duskling's stats. strength and agility stay secret.
#[derive(Default)]
pub struct SecretStats {
    pub strength: BlsScalar,
    pub agility: BlsScalar,
    pub power: BlsScalar,
}

impl Circuit for SecretStats {
    fn circuit(&self, composer: &mut Composer) -> Result<(), Error> {
`;
const TAIL = `        Ok(())
    }
}`;
const file = lines => HEAD + lines.map(l => `        ${l}\n`).join('') + TAIL;
const L = {
  strength: 'let strength = composer.append_witness(self.strength);',
  agility: 'let agility = composer.append_witness(self.agility);',
  sum: 'let sum = composer.gate_add(Constraint::new().left(1).right(1).a(strength).b(agility));',
  power: 'let power = composer.append_witness(self.power);',
  powerPublic: 'let power = composer.append_public(self.power);',
  bind: 'composer.assert_equal(sum, power);',
  slack: 'let slack = composer.append_witness(self.power - BlsScalar::from(50u64));',
  floor: 'let floor = composer.gate_add(Constraint::new().left(1).constant(50).a(slack));',
  floorBind: 'composer.assert_equal(floor, power);',
  range: 'composer.component_range::<8>(slack);',
};
const S = {
  start: file(['// Build the constraints here.']),
  witnesses: file([L.strength, L.agility]),
  sum: file([L.strength, L.agility, L.sum]),
  claim: file([L.strength, L.agility, L.sum, L.power]),
  bind: file([L.strength, L.agility, L.sum, L.power, L.bind]),
  public: file([L.strength, L.agility, L.sum, L.powerPublic, L.bind]),
  hide: file([L.strength, L.agility, L.sum, L.power, L.bind]),
  slack: file([L.strength, L.agility, L.sum, L.power, L.bind, L.slack]),
  floor: file([L.strength, L.agility, L.sum, L.power, L.bind, L.slack, L.floor, L.floorBind]),
  range: file([L.strength, L.agility, L.sum, L.power, L.bind, L.slack, L.floor, L.floorBind, L.range]),
};

// ---- Checking helpers -------------------------------------------------------------------------
const programs = (source, cases) => circuitProgram(source, samplesOf(cases));
const ops = (source, cases) => programs(source, cases)[1];
const describe = (c, r) => {
  const who = CAST[c.who].name, what = c.note ? `${who} (${c.note})` : `${who}: ${c.stats[0]} + ${c.stats[1]} = ${c.stats[2]}`;
  return r.verified ? `${what}  →  ✓ proof verified (${r.proof.length / 2} bytes)` : `${what}  →  ✗ no valid proof`;
};
const sceneOf = (cases, cs) => ({creatures: cases.map((c, i) => ({dna: CAST[c.who].dna, owner: c.who === 'fen' ? 'friend' : c.who === 'rook' ? 'rival' : 'you', label: `${CAST[c.who].name} ${cs ? (cs[i].verified ? '✓' : '✗') : '?'}`}))});
async function proveAll(prove, cases) {
  const result = await prove(samplesOf(cases));
  return result.cases;
}

export const lessons = [
  {
    id: 'secret-stats', n: 1, title: 'Secret stats', reference: S.public,
    chapters: [
      {
        id: 'stats-intro', kind: 'intro', title: 'Show nothing, prove everything',
        wick: `Every Duskling has hidden stats: strength and agility. Together they make its power. The arena wants proof of that power, but a smart keeper doesn't show anyone the stats behind it.`,
        body: `<p>In this path you'll write a <strong>circuit</strong>: a set of mathematical rules that a zero-knowledge proof shows were followed.</p>
<p>The <strong>prover</strong> knows the secret values. The <strong>verifier</strong> checks the proof against the circuit and a few <strong>public inputs</strong>, and learns nothing else.</p>
<p>You'll use <strong>dusk-plonk</strong>, Dusk's PLONK library. Your browser will generate and check real proofs.</p>`,
        learn: ['Witnesses: the prover\'s secrets', 'Addition gates and <code>Constraint</code>', 'Why an unconstrained value lets anyone cheat', '<code>assert_equal</code> vs. a Rust <code>assert!</code>', 'Public inputs and what the verifier sees'],
        scene: sceneOf(SUM_CASES),
      },
      {
        id: 'witnesses', kind: 'code', title: 'Private inputs',
        body: `<p>A circuit's secret inputs are called <strong>witnesses</strong>. <code>composer.append_witness(value)</code> adds one and returns a <strong>handle</strong> that later gates can refer to.</p>
<p>Circuit values are <code>BlsScalar</code>s: numbers in the finite field that dusk-plonk works in.</p>
<pre><code>let luck = composer.append_witness(self.luck);</code></pre>`,
        tasks: ['Replace the comment with two witnesses: <code>strength</code> from <code>self.strength</code>, then <code>agility</code> from <code>self.agility</code>.'],
        hint: `<pre><code>${L.strength}\n${L.agility}</code></pre>`,
        start: S.start, answer: S.witnesses,
        check(source) {
          const o = ops(source, SUM_CASES);
          need(o.length >= 2 && o[0][0] === 'witness' && o[1][0] === 'witness', 'Allocate two witnesses with `composer.append_witness(...)`.');
          need(o[0][1] === hexOf(30n) && o[1][1] === hexOf(25n), 'The first witness should be `self.strength` and the second `self.agility`.');
          return {log: ['witness  ←  strength (secret)', 'witness  ←  agility (secret)'], win: 'strength and agility are now witnesses: private inputs to the circuit.', scene: sceneOf(SUM_CASES)};
        },
      },
      {
        id: 'add-gate', kind: 'code', title: 'An addition gate',
        body: `<p>A <strong>gate</strong> is a rule relating witnesses. <code>gate_add</code> takes a <code>Constraint</code> describing a weighted sum, and returns a handle to the result:</p>
<pre><code>let total = composer.gate_add(
    Constraint::new().left(1).right(1).a(x).b(y)
);</code></pre>
<p><code>left</code> and <code>right</code> are the weights for <code>a</code> and <code>b</code>, so this computes 1·x + 1·y.</p>`,
        tasks: ['Add <code>let sum = …</code>: an addition gate over <code>strength</code> and <code>agility</code>, both with weight 1.'],
        hint: `<code>${L.sum}</code>`,
        start: S.witnesses, answer: S.sum,
        check(source) {
          const add = ops(source, SUM_CASES).find(op => op[0] === 'add');
          need(add, 'Add a `composer.gate_add(...)` gate.');
          need(add[1] === hexOf(1n) && add[2] === hexOf(1n) && add[3] === hexOf(0n), 'Use weight 1 for both inputs: `.left(1).right(1)`.');
          need(add[4] === 0 && add[5] === 1, 'Wire the gate to your witnesses: `.a(strength).b(agility)`.');
          return {log: ['gate  sum = 1·strength + 1·agility'], win: 'The circuit can add now.', scene: sceneOf(SUM_CASES)};
        },
      },
      {
        id: 'claim', kind: 'code', title: 'The claimed power',
        body: `<p>Next, the value the arena cares about: power. Allocate it as another witness.</p>
<p>When you check this chapter, your browser really proves the circuit for three keepers. Watch closely what happens to Rook's claim.</p>`,
        tasks: ['After the gate, add <code>let power = composer.append_witness(self.power);</code>'],
        hint: `<code>${L.power}</code>`,
        start: S.sum, answer: S.claim,
        async check(source, prove) {
          const o = ops(source, SUM_CASES);
          need(o.filter(op => op[0] === 'witness').length === 3 && o.at(-1)?.[1] === hexOf(55n), 'Add a third witness for `self.power`, after the gate.');
          const cs = await proveAll(prove, SUM_CASES);
          need(cs[0].verified, 'Fen\'s honest proof should verify.');
          return {log: SUM_CASES.map((c, i) => describe(c, cs[i])), win: cs[2].verified ? 'Wait… Rook\'s claim 14 + 9 = 30 got a valid proof too! Nothing connects sum to power yet.' : 'Power is in the circuit.', scene: sceneOf(SUM_CASES, cs)};
        },
      },
      {
        id: 'bind', kind: 'code', title: 'Tie it together',
        wick: `Rook's already bragging about a power-30 proof for a Duskling with 23. Let's close that gap.`,
        body: `<p>Allocating <code>power</code> didn't connect it to anything, so it can be any number. <code>assert_equal</code> adds an <strong>equality constraint</strong>: the proof is only valid if both handles hold the same value.</p>
<pre><code>composer.assert_equal(a, b);</code></pre>
<p class="aside">A Rust <code>assert!</code> wouldn't do this. It only runs on the prover's machine while the circuit is built, so a cheating prover could just delete it. A constraint is part of what the verifier checks.</p>`,
        tasks: ['Constrain <code>sum</code> and <code>power</code> to be equal.'],
        hint: `<code>${L.bind}</code>`,
        start: S.claim, answer: S.bind,
        async check(source, prove) {
          need(ops(source, SUM_CASES).some(op => op[0] === 'equal' && [op[1], op[2]].sort().join() === '2,3'), 'Add `composer.assert_equal(sum, power);` after allocating power.');
          const cs = await proveAll(prove, SUM_CASES);
          need(cs[0].verified && cs[1].verified, 'Honest keepers\' proofs should still verify.');
          need(!cs[2].verified, 'Rook\'s false claim still produced a valid proof.');
          return {log: SUM_CASES.map((c, i) => describe(c, cs[i])), win: 'Rook\'s claim of 14 + 9 = 30 can no longer be proven.', scene: sceneOf(SUM_CASES, cs)};
        },
      },
      {
        id: 'public', kind: 'code', title: 'Show the verifier the power',
        body: `<p>The arena needs to know which power a proof is about. So far power is a secret witness too, and the proof doesn't say which power it covers.</p>
<p><code>append_public</code> makes a value a <strong>public input</strong>: the verifier supplies it when checking, and the proof only verifies for that exact value. Keep strength and agility as witnesses.</p>
<p class="aside">Rust's <code>pub</code> on a struct field controls which code can access it. It has nothing to do with what a proof reveals.</p>`,
        tasks: ['Change power\'s allocation to <code>composer.append_public(self.power)</code>. Keep the equality constraint.'],
        hint: `<code>${L.powerPublic}</code>`,
        start: S.bind, answer: S.public,
        async check(source, prove) {
          const o = ops(source, SUM_CASES);
          need(o.filter(op => op[0] === 'public').length === 1 && o.filter(op => op[0] === 'witness').length === 2, 'Make power public with `append_public`, and keep strength and agility as witnesses.');
          const cs = await proveAll(prove, SUM_CASES);
          need(cs[0].verified && cs[1].verified && !cs[2].verified, 'Keep the equality constraint: honest proofs verify, Rook\'s doesn\'t.');
          need(cs[0].publics.length === 1 && cs[0].publics[0] === hexOf(55n), 'Fen\'s proof should have one public input: power 55.');
          need(!cs[0].tamperedVerified, 'Changing the public power should break verification.');
          return {log: [...SUM_CASES.map((c, i) => describe(c, cs[i])), 'Fen\'s proof with public power 56 instead of 55  →  ✗ rejected'], win: 'The verifier sees power, and nothing else.', scene: sceneOf(SUM_CASES, cs)};
        },
      },
      {
        id: 'stats-proof', kind: 'finale', title: 'Prove your Duskling\'s power',
        wick: `Your turn. Prove your own Duskling's power without showing its strength or agility.`,
        body: `<p>Your circuit from this lesson is ready. Generate a real PLONK proof for your own Duskling, then try to cheat with it.</p>
<p class="aside">This proof says the prover knows <em>some</em> strength and agility that add up to power. Nothing ties them to a particular Duskling yet: Rook could simply claim 30 + 20. A real game would keep stats off-chain and commit to them, for example with a hash stored in the Hatchery, then prove the stats match it. Here, your stats are worked out from your Duskling's DNA just so you have numbers to play with, and DNA is public.</p>`,
        lab: 'sum',
      },
    ],
  },
  {
    id: 'arena-pass', n: 2, title: 'The arena pass', reference: S.range,
    chapters: [
      {
        id: 'pass-intro', kind: 'intro', title: 'Fifty or more',
        wick: `The Night Arena has a new rule: power 50 or more. You'd rather not tell them your power, only that it's enough.`,
        body: `<p>Proving a <strong>threshold</strong> without revealing the number is a classic zero-knowledge job. It's the same idea as proving you're old enough without showing your birthday.</p>
<p>You'll hide power again, add a helper witness, and learn why numbers in a circuit can wrap around, and how a <strong>range check</strong> stops that.</p>`,
        learn: ['Proofs with no public inputs', 'Helper witnesses', 'Constants in gates', 'Field arithmetic wraps around', '<code>component_range</code>'],
        scene: sceneOf(ARENA_CASES),
      },
      {
        id: 'hide-power', kind: 'code', title: 'Power goes private',
        body: `<p>For the arena pass, the proof shouldn't reveal power at all. It should only show that the rules hold. Turn power back into a witness.</p>
<p>The circuit itself is public, so the arena knows exactly which rules a valid proof satisfied.</p>`,
        tasks: ['Change power back to <code>composer.append_witness(self.power)</code>.'],
        hint: `<code>${L.power}</code>`,
        start: S.public, answer: S.hide,
        async check(source, prove) {
          need(!ops(source, ARENA_CASES).some(op => op[0] === 'public'), 'Allocate power with `append_witness`, so the proof has no public inputs.');
          const cs = await proveAll(prove, ARENA_CASES);
          need(cs[0].verified && cs[0].publics.length === 0, 'Fen\'s proof should verify, with no public inputs.');
          return {log: ARENA_CASES.map((c, i) => describe(c, cs[i])), win: 'Nothing public: the proof just says “the rules hold”. Now let\'s add the rule.', scene: sceneOf(ARENA_CASES, cs)};
        },
      },
      {
        id: 'slack', kind: 'code', title: 'A helper witness',
        body: `<p>To show power ≥ 50, the prover supplies the difference as another witness: <code>slack = power − 50</code>.</p>
<p><code>BlsScalar</code> supports subtraction, and <code>BlsScalar::from(50u64)</code> turns a number into a field value.</p>
<pre><code>let bonus = composer.append_witness(self.luck - BlsScalar::from(7u64));</code></pre>`,
        tasks: ['At the end of the circuit, allocate <code>slack</code> as a witness holding <code>self.power - BlsScalar::from(50u64)</code>.'],
        hint: `<code>${L.slack}</code>`,
        start: S.hide, answer: S.slack,
        check(source) {
          const o = ops(source, ARENA_CASES), w = o.filter(op => op[0] === 'witness');
          need(w.length === 4 && w[3][1] === hexOf(5n), 'Add a fourth witness: `self.power - BlsScalar::from(50u64)`. For Fen, that\'s 55 − 50 = 5.');
          return {log: ['witness  ←  slack = power − 50 (Fen: 5)'], win: 'The prover has a helper. The circuit doesn\'t trust it yet.', scene: sceneOf(ARENA_CASES)};
        },
      },
      {
        id: 'floor', kind: 'code', title: 'Check the helper',
        body: `<p>A cheating prover can put any value in <code>slack</code>, so the circuit must check it. Rebuild power from it: <code>slack + 50</code>, using a <strong>constant</strong> term, and require it to equal power.</p>
<pre><code>let plus_seven = composer.gate_add(Constraint::new().left(1).constant(7).a(bonus));</code></pre>`,
        tasks: ['Add <code>let floor = …</code>: a gate computing <code>slack + 50</code> (weight 1 on <code>slack</code>, constant 50).', 'Constrain <code>floor</code> and <code>power</code> to be equal.'],
        hint: `<pre><code>${L.floor}\n${L.floorBind}</code></pre>`,
        start: S.slack, answer: S.floor,
        async check(source, prove) {
          const o = ops(source, ARENA_CASES), floor = o.filter(op => op[0] === 'add')[1];
          need(floor && floor[1] === hexOf(1n) && floor[3] === hexOf(50n), 'Add a second `gate_add` with `.left(1).constant(50).a(slack)`.');
          need(o.some(op => op[0] === 'equal' && [op[1], op[2]].sort().join() === '3,5'), 'Constrain `floor` and `power` with `composer.assert_equal(floor, power);`.');
          const cs = await proveAll(prove, ARENA_CASES);
          need(cs[0].verified && cs[1].verified && !cs[3].verified, 'Honest proofs should verify, and Rook\'s false sum shouldn\'t.');
          return {log: ARENA_CASES.map((c, i) => describe(c, cs[i])), win: cs[2].verified ? 'Rook\'s power-23 Duskling got a pass too! Its slack is 23 − 50, and in a finite field that wraps around to a huge number. Nothing says slack has to be small.' : 'The helper is checked.', scene: sceneOf(ARENA_CASES, cs)};
        },
      },
      {
        id: 'range', kind: 'code', title: 'Keep slack small',
        body: `<p>Numbers in a circuit live in a <strong>finite field</strong>, where there's no going below zero: <code>23 − 50</code> wraps around to a 77-digit number. So “slack exists” proves nothing until you also prove it's small.</p>
<p><code>component_range::&lt;8&gt;(w)</code> constrains <code>w</code> to 8 bit pairs, that is 16 bits: 0 to 65,535. A wrapped-around slack is far bigger, so no valid proof can be made.</p>`,
        tasks: ['Add <code>composer.component_range::&lt;8&gt;(slack);</code> at the end of the circuit.'],
        hint: `<code>composer.component_range::&lt;8&gt;(slack);</code>`,
        start: S.floor, answer: S.range,
        async check(source, prove) {
          need(ops(source, ARENA_CASES).some(op => op[0] === 'range' && op[1] === 8 && op[2] === 4), 'Range-check `slack` with `composer.component_range::<8>(slack);`.');
          const cs = await proveAll(prove, ARENA_CASES);
          need(cs[0].verified && cs[1].verified, 'Fen (55) and Wick (exactly 50) should still get passes.');
          need(!cs[2].verified && !cs[3].verified, 'Neither of Rook\'s claims should get a pass.');
          return {log: ARENA_CASES.map((c, i) => describe(c, cs[i])), win: 'Only power 50 and up gets a pass, and nobody learns the power.', scene: sceneOf(ARENA_CASES, cs)};
        },
      },
      {
        id: 'pass-proof', kind: 'finale', title: 'Your arena pass',
        wick: `Let's see if your Duskling makes the cut. If it doesn't, no proof exists, and that's the circuit doing its job.`,
        body: `<p>Generate an arena pass for your own Duskling with the circuit you just finished.</p>
<p class="aside">This pass isn't tied to you or to tonight, so anyone who copied it could reuse it. A real pass would add a public input, such as a session number or a commitment to the keeper, so each proof only works where it's meant to. That's the same idea as “Valid isn't forever” in the keeper's journey.</p>`,
        lab: 'arena',
      },
    ],
  },
];
export const chapters = lessons.flatMap((lesson, l) => lesson.chapters.map(c => ({...c, lesson: l})));
export {Hint, fail};
