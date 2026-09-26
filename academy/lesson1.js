// Lesson 1: The Hatchery. Every code chapter is one small edit, checked by running the contract.
import {WICK, SAMPLE, MODULUS, dnaFor, pad16, deploy, need, needMethod, stripComments as code, seedFromName, friendly} from './contract.js';
import {header, HATCHED} from './hatchery-file.js';
export {WICK, SAMPLE, dnaFor, pad16, deploy, seedFromName, friendly};

// Reference file after each code chapter.
const HEAD = `#![no_std]

extern crate alloc;

#[dusk_forge::contract]
mod hatchery {
    use alloc::vec::Vec;
    use dusk_core::abi;
`;
const step = {
  contract0: `#![no_std]

#[dusk_forge::contract]
mod hatchery {
    use dusk_core::abi;

    // Declare the contract state here.

    impl Hatchery {
        pub const fn new() -> Self {
            Self {}
        }
    }
}`,
  contract: `#![no_std]

#[dusk_forge::contract]
mod hatchery {
    use dusk_core::abi;

    pub struct Hatchery {}

    impl Hatchery {
        pub const fn new() -> Self {
            Self {}
        }
    }
}`,
  constants: `#![no_std]

#[dusk_forge::contract]
mod hatchery {
    use dusk_core::abi;

    const DNA_DIGITS: u32 = 16;

    pub struct Hatchery {}

    impl Hatchery {
        pub const fn new() -> Self {
            Self {}
        }
    }
}`,
  math: `#![no_std]

#[dusk_forge::contract]
mod hatchery {
    use dusk_core::abi;

    const DNA_DIGITS: u32 = 16;
    const DNA_MODULUS: u64 = 10u64.pow(DNA_DIGITS);

    pub struct Hatchery {}

    impl Hatchery {
        pub const fn new() -> Self {
            Self {}
        }
    }
}`,
  structs: `#![no_std]

#[dusk_forge::contract]
mod hatchery {
    use dusk_core::abi;

    const DNA_DIGITS: u32 = 16;
    const DNA_MODULUS: u64 = 10u64.pow(DNA_DIGITS);

    struct Duskling {
        dna: u64,
        level: u32,
    }

    pub struct Hatchery {}

    impl Hatchery {
        pub const fn new() -> Self {
            Self {}
        }
    }
}`,
  vectors0: `${HEAD}
    const DNA_DIGITS: u32 = 16;
    const DNA_MODULUS: u64 = 10u64.pow(DNA_DIGITS);

    struct Duskling {
        dna: u64,
        level: u32,
    }

    pub struct Hatchery {}

    impl Hatchery {
        pub const fn new() -> Self {
            Self {}
        }
    }
}`,
};
const body = (consts, methods) => `${HEAD}
${consts}

    struct Duskling {
        dna: u64,
        level: u32,
    }

    pub struct Hatchery {
        dusklings: Vec<Duskling>,
    }

    impl Hatchery {
        pub const fn new() -> Self {
            Self { dusklings: Vec::new() }
        }
${methods}    }
}`;
const C2 = `    const DNA_DIGITS: u32 = 16;
    const DNA_MODULUS: u64 = 10u64.pow(DNA_DIGITS);`;
const C3 = `${C2}
    // 2^64 divided by the golden ratio: a classic mixing constant.
    const MIX: u64 = 0x9E37_79B9_7F4A_7C15;`;
step.vectors = body(C2, '');
step.functions = body(C2, `
        pub fn create_duskling(&mut self, dna: u64) {
        }
`);
step.first = body(C2, `
        pub fn create_duskling(&mut self, dna: u64) {
            self.dusklings.push(Duskling { dna, level: 1 });
        }
`);
step.private = body(C2, `
        fn create_duskling(&mut self, dna: u64) {
            self.dusklings.push(Duskling { dna, level: 1 });
        }
`);
step.returns = body(C2, `
        fn create_duskling(&mut self, dna: u64) {
            self.dusklings.push(Duskling { dna, level: 1 });
        }

        fn generate_dna(&self, seed: u64) -> u64 {
            seed % DNA_MODULUS
        }
`);
step.mixing0 = body(C3, `
        fn create_duskling(&mut self, dna: u64) {
            self.dusklings.push(Duskling { dna, level: 1 });
        }

        fn generate_dna(&self, seed: u64) -> u64 {
            seed % DNA_MODULUS
        }
`);
step.mixing = body(C3, `
        fn create_duskling(&mut self, dna: u64) {
            self.dusklings.push(Duskling { dna, level: 1 });
        }

        fn generate_dna(&self, seed: u64) -> u64 {
            seed.wrapping_mul(MIX) % DNA_MODULUS
        }
`);
step.hatch = body(C3, `
        fn create_duskling(&mut self, dna: u64) {
            self.dusklings.push(Duskling { dna, level: 1 });
        }

        fn generate_dna(&self, seed: u64) -> u64 {
            seed.wrapping_mul(MIX) % DNA_MODULUS
        }

        pub fn hatch(&mut self, seed: u64) {
            let dna = self.generate_dna(seed);
            self.create_duskling(dna);
        }
`);
step.events = body(C3, `
        fn create_duskling(&mut self, dna: u64) {
            let id = self.dusklings.len() as u64;
            self.dusklings.push(Duskling { dna, level: 1 });
            abi::emit("hatched", crate::Hatched { id, dna });
        }

        fn generate_dna(&self, seed: u64) -> u64 {
            seed.wrapping_mul(MIX) % DNA_MODULUS
        }

        pub fn hatch(&mut self, seed: u64) {
            let dna = self.generate_dna(seed);
            self.create_duskling(dna);
        }
`);
// The event chapters add the Hatched event type above the contract module.
const withEvents = (source, events, registered) => source.replace('#![no_std]\n\nextern crate alloc;\n\n#[dusk_forge::contract]', header(events, registered));
step.eventType0 = withEvents(step.hatch, [{...HATCHED, fields: ['// Add the fields here.']}], []);
step.eventType = withEvents(step.hatch, [HATCHED], ['Hatched']);
step.events = withEvents(step.events, [HATCHED], ['Hatched']);

const sceneOf = c => ({nests: 5, creatures: c.dusklings().map(d => pad16(d.dna))});

// ---- Chapters -------------------------------------------------------------------------------

export const chapters = [
  {
    id: 'dusk-falls', kind: 'intro', title: 'Dusk falls',
    wick: `Ah, a new keeper! Every evening at sundown, the eggs in my hatchery crack open. By nightfall, the harbor is full of <strong>Dusklings</strong>.`,
    body: `<p>In this lesson you'll write <strong>the Hatchery</strong>: a Dusk smart contract, in Rust, that hatches Dusklings and remembers every one of them.</p>
<p>Every Duskling is made from <strong>16 digits of DNA</strong>. Each pair of digits picks one trait: body, eyes, crown, wings, markings, color, glow and mouth.</p>
<p>Play with the DNA on the right. By the end of the lesson, <em>your</em> contract will generate DNA like this, and you'll hatch a Duskling of your own.</p>`,
    scene: {creatures: SAMPLE, nests: 3},
  },
  {
    id: 'contract', kind: 'code', title: 'Contracts',
    body: `<p>Dusk contracts are Rust, compiled to WebAssembly and run by <strong>DuskVM</strong>. <strong>Dusk Forge</strong> turns an ordinary Rust module into a contract: mark a <code>mod</code> with <code>#[dusk_forge::contract]</code> and Forge wires up the rest.</p>
<p>A contract module holds <strong>exactly one <code>pub struct</code></strong>. That struct <em>is</em> the contract's state: whatever it holds is stored on-chain between calls. <code>new()</code> describes the starting state. It's a <code>const fn</code>, so Rust works it out when the contract is compiled, and the contract starts life with that state.</p>
<pre><code>#[dusk_forge::contract]
mod lighthouse {
    pub struct Lighthouse {}

    impl Lighthouse {
        pub const fn new() -> Self {
            Self {}
        }
    }
}</code></pre>
<p class="aside"><code>#![no_std]</code> at the top means there's no Rust standard library, because there's no operating system inside the VM. The supplied <code>use dusk_core::abi;</code> brings in Dusk's contract interface, which you'll use later. Dusk's core library also supplies the memory allocator and panic handler that a <code>no_std</code> contract needs.</p>`,
    tasks: [`Inside <code>mod hatchery</code>, above the <code>impl</code> block, declare an empty public struct named <code>Hatchery</code>.`],
    hint: `One line: <code>pub struct Hatchery {}</code>. The <code>impl Hatchery</code> below is already waiting for it.`,
    start: step.contract0, answer: step.contract,
    check(source) {
      const c = deploy(source);
      need(/\bpub\s+struct\s+Hatchery\b/.test(code(source)), 'Forge needs the contract state to be public: `pub struct Hatchery {}`.');
      return {log: ['Hatchery::new()  →  Hatchery {}'], win: 'The Hatchery has its state. It has no public methods yet, so there\'s nothing to call.', scene: {nests: 0, creatures: []}};
    },
  },
  {
    id: 'constants', kind: 'code', title: 'Constants and integers',
    body: `<p>DNA is 16 digits long. Let's write that down once, as a <strong>constant</strong>. A <code>const</code> is fixed when the contract is compiled, so it's part of the code and takes no storage.</p>
<p>Rust makes you say what kind of number you mean. Unsigned integers can't go below zero:</p>
<ul><li><code>u8</code>: 0 to 255</li><li><code>u32</code>: up to about 4.3 billion</li><li><code>u64</code>: up to about 18.4 quintillion</li></ul>
<pre><code>const MAX_EGGS: u32 = 12;</code></pre>`,
    tasks: [`Declare a constant <code>DNA_DIGITS</code> of type <code>u32</code> equal to <code>16</code>, inside the module above <code>pub struct Hatchery</code>.`],
    hint: `<code>const DNA_DIGITS: u32 = 16;</code>. Don't forget the semicolon.`,
    start: step.contract, answer: step.constants,
    check(source) {
      const c = deploy(source), k = c.rt.program.constants.get('DNA_DIGITS');
      need(k, 'Add a constant named `DNA_DIGITS`.');
      need(k.declared === 'u32', '`DNA_DIGITS` should be a `u32`.');
      need(c.rt.globals.get('DNA_DIGITS') === 16n, '`DNA_DIGITS` should equal 16.');
      return {log: ['DNA_DIGITS  →  16'], win: 'Sixteen digits it is.', scene: {nests: 0, creatures: []}};
    },
  },
  {
    id: 'math', kind: 'code', title: 'Math',
    body: `<p>Rust has the usual operators: <code>+ - * /</code>, and <code>%</code> for the remainder. <code>%</code> is how we'll trim a big number to 16 digits: <code>123456 % 1000</code> is <code>456</code>. It keeps the last three digits.</p>
<p>To keep 16 digits we need 10 to the power of 16: <code>10u64.pow(DNA_DIGITS)</code>. The <code>u64</code> suffix tells Rust that this 10 is a u64.</p>
<p class="aside">The Dusk Forge contract template builds with <strong>overflow checks on</strong>, and Forge's docs say never to turn them off. Math that goes past a type's limit makes the call fail instead of quietly wrapping around. 10¹⁶ fits easily in a u64, whose limit is about 1.8 × 10¹⁹.</p>`,
    tasks: [`Below <code>DNA_DIGITS</code>, declare a <code>u64</code> constant <code>DNA_MODULUS</code> equal to <code>10u64.pow(DNA_DIGITS)</code>.`],
    hint: `<code>const DNA_MODULUS: u64 = 10u64.pow(DNA_DIGITS);</code>`,
    start: step.constants, answer: step.math,
    check(source) {
      const c = deploy(source), k = c.rt.program.constants.get('DNA_MODULUS');
      need(k, 'Add a constant named `DNA_MODULUS`.');
      need(k.declared === 'u64', '`DNA_MODULUS` should be a `u64`.');
      need(c.rt.globals.get('DNA_MODULUS') === MODULUS, `\`DNA_MODULUS\` is ${c.rt.globals.get('DNA_MODULUS')}, but it should be 10 to the power of 16.`);
      return {log: ['DNA_MODULUS  →  10000000000000000'], win: 'A one followed by sixteen zeros.', scene: {nests: 0, creatures: []}};
    },
  },
  {
    id: 'structs', kind: 'code', title: 'Structs',
    body: `<p>A Duskling needs more than one value, so we group its values in a <code>struct</code>:</p>
<pre><code>struct Egg {
    size: u32,
    warm: bool,
}</code></pre>
<p>Notice there's no <code>pub</code>. Remember the Forge rule: exactly one <code>pub struct</code> per contract, and it's the state. Helper types like <code>Duskling</code> stay private to the module.</p>`,
    tasks: [`Above <code>pub struct Hatchery</code>, declare a (non-public) struct <code>Duskling</code> with two fields: <code>dna</code> of type <code>u64</code> and <code>level</code> of type <code>u32</code>.`],
    hint: `<pre><code>struct Duskling {
    dna: u64,
    level: u32,
}</code></pre>`,
    start: step.math, answer: step.structs,
    check(source) {
      const c = deploy(source), s = c.rt.program.structs.get('Duskling');
      need(s, 'Declare a struct named `Duskling`.');
      need(!/\bpub\s+struct\s+Duskling\b/.test(code(source)), 'Forge allows only one `pub struct`: the contract state. Remove `pub` from `Duskling`.');
      need(s.get('dna') === 'u64' && s.get('level') === 'u32' && s.size === 2, '`Duskling` needs exactly two fields: `dna: u64` and `level: u32`.');
      return {log: ['struct Duskling { dna: u64, level: u32 }'], win: 'Now the contract knows what a Duskling is.', scene: {nests: 0, creatures: []}};
    },
  },
  {
    id: 'vectors', kind: 'code', title: 'Vectors',
    body: `<p>One Duskling doesn't make a hatchery. We need a list that can grow: a <strong>vector</strong>. <code>Vec&lt;Duskling&gt;</code> is a vector of Dusklings.</p>
<p>Without the standard library, <code>Vec</code> comes from Rust's <code>alloc</code> crate. The two new lines at the top (<code>extern crate alloc;</code> and <code>use alloc::vec::Vec;</code>) bring it in.</p>
<pre><code>pub struct Nest {
    eggs: Vec&lt;u64&gt;,
}
// in new():
Self { eggs: Vec::new() }</code></pre>
<p>Fields of the state struct are on-chain state, so the list survives between calls.</p>`,
    tasks: [`Give <code>Hatchery</code> a field <code>dusklings</code> of type <code>Vec&lt;Duskling&gt;</code>.`, `In <code>new()</code>, start it empty with <code>Vec::new()</code>.`],
    hint: `The struct becomes <code>pub struct Hatchery { dusklings: Vec&lt;Duskling&gt;, }</code> and <code>new()</code> returns <code>Self { dusklings: Vec::new() }</code>.`,
    start: step.vectors0, answer: step.vectors,
    check(source) {
      const c = deploy(source), s = c.rt.program.structs.get('Hatchery');
      need(s?.get('dusklings') === 'Vec<Duskling>', '`Hatchery` needs a field `dusklings: Vec<Duskling>`.');
      need(c.state.fields.dusklings?.kind === 'vec' && c.dusklings().length === 0, 'A freshly deployed Hatchery should start with an empty `dusklings` vector.');
      return {log: ['Hatchery::new()  →  dusklings: []'], win: 'Five warm, empty nests. The hatchery is ready.', scene: {nests: 5, creatures: []}};
    },
  },
  {
    id: 'functions', kind: 'code', title: 'Functions',
    body: `<p>Contract methods live in the <code>impl</code> block:</p>
<pre><code>pub fn warm(&amp;mut self, degrees: u32) {
}</code></pre>
<ul><li><code>pub</code> makes it callable from outside the contract.</li>
<li><code>&amp;mut self</code> means it may change the contract's state.</li>
<li>Each parameter is <code>name: Type</code>.</li></ul>`,
    tasks: [`After <code>new()</code>, add a public method <code>create_duskling</code> that takes <code>&amp;mut self</code> and <code>dna: u64</code>. Leave its body empty for now.`],
    hint: `<pre><code>pub fn create_duskling(&amp;mut self, dna: u64) {
}</code></pre>`,
    start: step.vectors, answer: step.functions,
    check(source) {
      const c = deploy(source);
      needMethod(c, 'create_duskling', {pub: true, mut: true, params: [['dna', 'u64']], output: '()'});
      c.call('create_duskling', 8356281049284737n);
      return {log: ['create_duskling(8356281049284737)  →  ok'], win: 'The method is callable. It doesn\'t do anything yet…', scene: {nests: 5, creatures: []}};
    },
  },
  {
    id: 'first-duskling', kind: 'code', title: 'Making a Duskling',
    body: `<p>Build a struct by naming each field. When a variable has the same name as the field, you can write <code>dna</code> instead of <code>dna: dna</code>:</p>
<pre><code>let egg = Egg { size, warm: true };</code></pre>
<p>Then add it to a vector with <code>push</code>:</p>
<pre><code>self.eggs.push(egg);</code></pre>`,
    tasks: [`In <code>create_duskling</code>, push a new <code>Duskling</code> with the given <code>dna</code> and <code>level: 1</code> onto <code>self.dusklings</code>.`],
    hint: `<code>self.dusklings.push(Duskling { dna, level: 1 });</code>`,
    start: step.functions, answer: step.first,
    check(source) {
      const c = deploy(source);
      needMethod(c, 'create_duskling', {params: [['dna', 'u64']]});
      c.call('create_duskling', SAMPLE[0]);
      const one = c.dusklings();
      need(one.length === 1, `After one call the Hatchery should hold 1 Duskling, but it holds ${one.length}.`);
      need(one[0].dna === BigInt(SAMPLE[0]), `The Duskling's DNA should be ${SAMPLE[0]}, not ${one[0].dna}.`);
      need(one[0].level === 1n, 'New Dusklings start at `level: 1`.');
      c.call('create_duskling', SAMPLE[1]);
      need(c.dusklings().length === 2, 'A second call should add a second Duskling.');
      return {log: [`create_duskling(${SAMPLE[0]})  →  Duskling #0`, `create_duskling(${SAMPLE[1]})  →  Duskling #1`], win: 'Your first Dusklings! Look at the nests.', scene: sceneOf(c)};
    },
  },
  {
    id: 'private', kind: 'code', title: 'Private functions',
    wick: `Hm. I just watched a stranger call <code>create_duskling</code> with DNA 9999999999999999 and hatch the rarest Duskling in the harbor. <em>Twice.</em>`,
    body: `<p>Every <code>pub fn</code> in a Forge contract is an <strong>entry point</strong>: anyone on the network can call it, with any arguments they like.</p>
<p>The DNA should come from the contract, not from the caller. Drop the <code>pub</code> and <code>create_duskling</code> becomes a <strong>private helper</strong>. Other methods can still call it with <code>self.create_duskling(…)</code>, but nobody outside the contract can.</p>`,
    tasks: [`Make <code>create_duskling</code> private by removing <code>pub</code>.`],
    hint: `Change <code>pub fn create_duskling</code> to <code>fn create_duskling</code>.`,
    start: step.first, answer: step.private,
    scene: {nests: 5, creatures: SAMPLE.slice(0, 2)},
    check(source) {
      const c = deploy(source);
      needMethod(c, 'create_duskling', {pub: false, mut: true});
      c.call('create_duskling', SAMPLE[0]);
      need(c.dusklings().length === 1, '`create_duskling` should still add a Duskling when the contract calls it.');
      return {log: ['public entry points: none', 'create_duskling  →  private helper'], win: 'Locked. Only the contract can create Dusklings now.', scene: sceneOf(c)};
    },
  },
  {
    id: 'returns', kind: 'code', title: 'Return values',
    body: `<p>Next, a helper that turns a <strong>seed</strong> number into DNA. Declare what a method returns with <code>-&gt;</code>. Use <code>&amp;self</code> without <code>mut</code> to promise the method only reads state.</p>
<pre><code>fn egg_size(&amp;self, n: u64) -> u64 {
    n % 100
}</code></pre>
<p>In Rust, the <strong>last expression</strong> of a function is its return value, as long as it has <strong>no semicolon</strong>.</p>`,
    tasks: [`Add a private method <code>generate_dna</code> that takes <code>&amp;self</code> and <code>seed: u64</code> and returns a <code>u64</code>: the seed modulo <code>DNA_MODULUS</code>.`],
    hint: `<pre><code>fn generate_dna(&amp;self, seed: u64) -> u64 {
    seed % DNA_MODULUS
}</code></pre>`,
    start: step.private, answer: step.returns,
    scene: {nests: 5, creatures: SAMPLE.slice(0, 1)},
    check(source) {
      const c = deploy(source);
      needMethod(c, 'generate_dna', {pub: false, mut: false, params: [['seed', 'u64']], output: 'u64'});
      const seed = 12345678901234567890n, want = seed % MODULUS, got = c.call('generate_dna', seed);
      need(got === want, `generate_dna(${seed}) returned ${got}, expected ${want}.`);
      const dna = c.call('generate_dna', 7n);
      c.call('create_duskling', dna);
      return {log: [`generate_dna(${seed})  →  ${pad16(got)}`, `generate_dna(7)  →  ${pad16(dna)}`], win: 'DNA from a seed! Although seed 7 makes a pretty plain Duskling…', scene: sceneOf(c)};
    },
  },
  {
    id: 'mixing', kind: 'code', title: 'Mixing the seed',
    body: `<p>Right now seed 7 becomes DNA <code>0000000000000007</code>, and seed 8 is almost identical. We want every digit to change when the seed changes.</p>
<p>A contract can't roll dice: every node that runs it must get exactly the same answer. So instead of randomness we <strong>mix</strong> the seed. We multiply it by a huge odd number and let the result overflow on purpose.</p>
<p>Normally overflow makes the call fail. <code>wrapping_mul</code> says the overflow is intended and wraps the result around instead. The <code>MIX</code> constant is already in the file.</p>
<p class="aside">Anyone can compute this in advance, so it isn't fair randomness. It even runs backwards: <code>MIX</code> is odd, so anyone can work out the seed that gives the DNA they want. A hash such as <code>abi::keccak256</code> can't be run backwards, but people can still try seeds until they like the result. We'll come back to fairness when Dusklings start battling.</p>`,
    tasks: [`Change <code>generate_dna</code> to return <code>seed.wrapping_mul(MIX) % DNA_MODULUS</code>.`],
    hint: `The whole body is one line: <code>seed.wrapping_mul(MIX) % DNA_MODULUS</code>`,
    start: step.mixing0, answer: step.mixing,
    scene: {nests: 5, creatures: ['0000000000000007']},
    check(source) {
      const c = deploy(source), log = [];
      needMethod(c, 'generate_dna', {output: 'u64'});
      for (const seed of [1n, 2n, 3n]) {
        const got = c.call('generate_dna', seed), want = dnaFor(seed);
        need(got === want, `generate_dna(${seed}) returned ${pad16(got)}, expected ${pad16(want)}.`);
        c.call('create_duskling', got); log.push(`generate_dna(${seed})  →  ${pad16(got)}`);
      }
      return {log, win: 'Seeds 1, 2 and 3, three completely different Dusklings.', scene: sceneOf(c)};
    },
  },
  {
    id: 'hatch', kind: 'code', title: 'Putting it together',
    body: `<p>All the pieces are ready. Keepers need one public method that goes from seed to Duskling: <code>hatch</code>.</p>
<p>Call one method from another through <code>self</code>, and store results with <code>let</code>:</p>
<pre><code>let size = self.egg_size(n);
self.store_egg(size);</code></pre>`,
    tasks: [`Add a public method <code>hatch(&amp;mut self, seed: u64)</code>.`, `Inside it, generate DNA from the seed, then pass that DNA to <code>create_duskling</code>.`],
    hint: `<pre><code>pub fn hatch(&amp;mut self, seed: u64) {
    let dna = self.generate_dna(seed);
    self.create_duskling(dna);
}</code></pre>`,
    start: step.mixing, answer: step.hatch,
    scene: {nests: 5, creatures: [1n, 2n, 3n].map(s => pad16(dnaFor(s)))},
    check(source) {
      const c = deploy(source), log = [];
      needMethod(c, 'hatch', {pub: true, mut: true, params: [['seed', 'u64']], output: '()'});
      needMethod(c, 'create_duskling', {pub: false}); needMethod(c, 'generate_dna', {pub: false});
      for (const seed of [11n, 12n, 13n, 14n]) {
        c.call('hatch', seed);
        const last = c.dusklings().at(-1);
        need(last && last.dna === dnaFor(seed), `hatch(${seed}) should create a Duskling with DNA ${pad16(dnaFor(seed))}.`);
        log.push(`hatch(${seed})  →  Duskling #${c.dusklings().length - 1}, DNA ${pad16(last.dna)}`);
      }
      return {log, win: 'A working hatchery. One public method, two private helpers.', scene: sceneOf(c)};
    },
  },
  {
    id: 'event-type', kind: 'code', title: 'Event types',
    body: `<p>When a Duskling hatches, the outside world should hear about it: wallets, explorers, and this very page. Contracts announce things with <strong>events</strong>, receipts attached to the transaction. Apps listen for them, but they aren't contract state.</p>
<p>In Forge, each kind of event is a <strong>type</strong>: a struct holding the event's data. Event types live at the top of the file, outside the contract module. A new <code>Hatched</code> type is waiting there for its fields.</p>
<ul><li>The three attribute lines let <strong>rkyv</strong> encode the event on chain, and <strong>serde</strong> turn it into JSON for apps. Every event type carries them.</li>
<li><code>impl ContractEvent</code> lists its <strong>topics</strong>: the names it's emitted under.</li></ul>
<p>Then <strong>register</strong> the type in the contract attribute. Forge adds it to the contract's schema, so apps can decode it:</p>
<pre><code>#[dusk_forge::contract(events = [crate::Warmed])]</code></pre>
<p class="aside"><code>crate::</code> is the path from the top of the file. Forge matches paths exactly as written, so you'll use the same path when you emit the event.</p>`,
    tasks: [`Give <code>Hatched</code> two public fields: <code>pub id: u64,</code> and <code>pub dna: u64,</code>.`, `Register it: change <code>#[dusk_forge::contract]</code> to <code>#[dusk_forge::contract(events = [crate::Hatched])]</code>.`],
    hint: `<pre><code>pub struct Hatched {
    pub id: u64,
    pub dna: u64,
}

#[dusk_forge::contract(events = [crate::Hatched])]</code></pre>`,
    start: step.eventType0, answer: step.eventType,
    scene: {nests: 5, creatures: [11n, 12n, 13n, 14n].map(s => pad16(dnaFor(s)))},
    check(source) {
      const c = deploy(source), fields = c.rt.program.structs.get('Hatched'), topics = c.rt.program.events.get('Hatched')?.topics;
      need(fields?.size === 2 && fields.get('id') === 'u64' && fields.get('dna') === 'u64', '`Hatched` needs two fields: `pub id: u64` and `pub dna: u64`.');
      need(topics?.length === 1 && topics[0] === 'hatched', 'Keep `Hatched`\'s topic: `const TOPICS: &\'static [&\'static str] = &["hatched"];`.');
      need(c.rt.program.registered.includes('crate::Hatched'), 'Register the event type: `#[dusk_forge::contract(events = [crate::Hatched])]`.');
      return {log: ['event type   Hatched { id: u64, dna: u64 }', 'topics       ["hatched"]', 'registered   crate::Hatched'], win: 'Forge knows about the event now. Nothing emits it yet.', scene: {nests: 5, creatures: [11n, 12n, 13n, 14n].map(s => pad16(dnaFor(s)))}};
    },
  },
  {
    id: 'events', kind: 'code', title: 'Emitting events',
    body: `<p>Time to announce every hatch. <code>abi::emit</code> takes a topic and an event, and attaches the event to the transaction:</p>
<pre><code>abi::emit("warmed", crate::Warmed { id, degrees });</code></pre>
<p>Use a topic from the type's <code>TOPICS</code>, so apps can decode it. <code>abi::emit</code> comes from the <code>abi</code> module you've had imported since chapter 2.</p>`,
    tasks: [`In <code>create_duskling</code>, before pushing, save the new id: <code>let id = self.dusklings.len() as u64;</code>`, `After pushing, emit <code>crate::Hatched { id, dna }</code> with the topic <code>"hatched"</code>.`],
    hint: `<pre><code>let id = self.dusklings.len() as u64;
self.dusklings.push(Duskling { dna, level: 1 });
abi::emit("hatched", crate::Hatched { id, dna });</code></pre>`,
    start: step.eventType, answer: step.events,
    scene: {nests: 5, creatures: [11n, 12n, 13n, 14n].map(s => pad16(dnaFor(s)))},
    check(source) {
      const c = deploy(source), log = [];
      for (const seed of [21n, 22n]) c.call('hatch', seed);
      need(c.events.length === 2, `Two hatches should emit two events, but ${c.events.length} were emitted.`);
      c.events.forEach((e, i) => {
        need(e.type === 'Hatched', 'Emit the event type, `crate::Hatched { id, dna }`: apps can only decode registered event types.');
        need(e.topic === 'hatched', `Use the topic "hatched", the one \`Hatched\` lists in TOPICS, not "${e.topic}".`);
        need(e.fields.id === BigInt(i) && e.fields.dna === dnaFor([21n, 22n][i]), `Event ${i} should carry id ${i} and DNA ${dnaFor([21n, 22n][i])}.`);
        log.push(`event "hatched"  Hatched { id: ${e.fields.id}, dna: ${pad16(e.fields.dna)} }`);
      });
      return {log, win: 'The page heard your events and hatched both eggs.', scene: {nests: 5, creatures: c.events.map(e => pad16(e.fields.dna))}, fromEvents: true};
    },
  },
  {
    id: 'finale', kind: 'finale', title: 'Hatch your Duskling',
    wick: `Well, keeper, the Hatchery is yours. Every Duskling in the harbor will know your contract made it. Now: a name.`,
    body: `<p>Give your first Duskling a name. The page turns the name into a seed number, then calls <strong>your contract's</strong> <code>hatch</code>. Your code decides its DNA.</p>
<p>Different name, different Duskling. Same name, same Duskling, every time, on every node.</p>`,
    scene: {nests: 1, creatures: []},
  },
];

export const reference = step.events;
