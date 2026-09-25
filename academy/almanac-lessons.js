// dApps path: the Almanac. Real JavaScript with Dusk Connect and the Hatchery's real data-driver,
// against a practice node. Each check runs a plan of calls, then grades what came back.
import {need, seedFromName} from './contract.js';

const HEADER = `const { createDuskApp } = await import(
  new URL("/academy/vendor/dusk-connect.js", location.origin).href
);

// Connects to a node and to the Hatchery contract through its data-driver.
export function createApp(nodeUrl, contractId) {
  return createDuskApp({
    pinnedNodeUrl: nodeUrl,
    autoConnect: false,
    wallet: { waitForProvider: false, rememberLastUsedProvider: false },
    contracts: {
      hatchery: {
        contractId,
        driverUrl: new URL("/drivers/hatchery.wasm", nodeUrl).href,
      },
    },
  });
}
`;
const fn = (name, params, body, {sync = false} = {}) => `\nexport ${sync ? '' : 'async '}function ${name}(${params}) {\n${body.split('\n').map(l => l ? '  ' + l : l).join('\n')}\n}\n`;
const read = (name, args) => `await dusk.readContract({ contract: "hatchery", functionName: "${name}"${args ? `, args: ${args}` : ''} })`;
const F = {
  count0: fn('countDusklings', 'dusk', 'return 0;'),
  count: fn('countDusklings', 'dusk', `return ${read('duskling_count')};`),
  countExact: fn('countDusklings', 'dusk', `const count = ${read('duskling_count')};\nreturn BigInt(count);`),
  dna0: fn('readDna', 'dusk, id', 'return null;'),
  dna: fn('readDna', 'dusk, id', `return ${read('dna_of', 'id')};`),
  owner0: fn('readOwner', 'dusk, id', 'return null;'),
  owner: fn('readOwner', 'dusk, id', `return ${read('owner_of', 'id')};`),
  list0: fn('listDusklings', 'dusk', 'return [];'),
  list: fn('listDusklings', 'dusk', `const count = await countDusklings(dusk);
const dusklings = [];
for (let id = 0; id < count; id++) {
  dusklings.push({ id, dna: await readDna(dusk, id), owner: await readOwner(dusk, id) });
}
return dusklings;`),
  listExact: fn('listDusklings', 'dusk', `const count = await countDusklings(dusk);
const dusklings = [];
for (let id = 0; id < count; id++) {
  const dna = await readDna(dusk, id);
  dusklings.push({ id, dna, owner: await readOwner(dusk, id), exact: Number.isSafeInteger(dna) });
}
return dusklings;`),
  load0: fn('loadAlmanac', 'dusk', 'return { status: "ok", dusklings: await listDusklings(dusk) };'),
  load: fn('loadAlmanac', 'dusk', `try {
  return { status: "ok", dusklings: await listDusklings(dusk) };
} catch (error) {
  return { status: "unavailable" };
}`),
  hatch0: fn('prepareHatch', 'dusk, seed', 'return null;'),
  hatch: fn('prepareHatch', 'dusk, seed', `return await dusk.prepareContractCall({
  contract: "hatchery",
  functionName: "hatch",
  args: seed,
  privacy: "public",
  amount: "0",
  deposit: "0",
});`),
  hatchExact: fn('prepareHatch', 'dusk, seed', `return await dusk.prepareContractCall({
  contract: "hatchery",
  functionName: "hatch",
  args: JSON.rawJSON(seed.toString()),
  privacy: "public",
  amount: "0",
  deposit: "0",
});`),
  seed0: fn('seedFromName', 'name', `let hash = 0xcbf29ce484222325n;
for (const byte of new TextEncoder().encode(name)) {
  // Mix each byte into the hash here.
}
return hash;`, {sync: true}),
  seed: fn('seedFromName', 'name', `let hash = 0xcbf29ce484222325n;
for (const byte of new TextEncoder().encode(name)) {
  hash ^= BigInt(byte);
  hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
}
return hash;`, {sync: true}),
  transfer0: fn('prepareTransfer', 'dusk, id, to', 'return null;'),
  transfer: fn('prepareTransfer', 'dusk, id, to', `return await dusk.prepareContractCall({
  contract: "hatchery",
  functionName: "transfer",
  args: [id, to],
  privacy: "public",
  amount: "0",
  deposit: "0",
});`),
};
const file = parts => HEADER + parts.join('');
const L1 = ['count', 'dna', 'owner', 'list', 'load'];
const S = {
  start: file([F.count0, F.dna0, F.owner0, F.list0, F.load0]),
  count: file([F.count, F.dna0, F.owner0, F.list0, F.load0]),
  exact: file([F.countExact, F.dna0, F.owner0, F.list0, F.load0]),
  dna: file([F.countExact, F.dna, F.owner0, F.list0, F.load0]),
  owner: file([F.countExact, F.dna, F.owner, F.list0, F.load0]),
  list: file([F.countExact, F.dna, F.owner, F.list, F.load0]),
  digits: file([F.countExact, F.dna, F.owner, F.listExact, F.load0]),
  load: file([F.countExact, F.dna, F.owner, F.listExact, F.load]),
};
S.l2start = S.load + F.hatch0 + F.seed0 + F.transfer0;
S.hatch = S.load + F.hatch + F.seed0 + F.transfer0;
S.seed = S.load + F.hatch + F.seed + F.transfer0;
S.hatchExact = S.load + F.hatchExact + F.seed + F.transfer0;
S.transfer = S.load + F.hatchExact + F.seed + F.transfer;

// ---- Checking helpers -------------------------------------------------------------------------
const ok = (r, what) => { need(r, `\`${what}\` didn't run.`); need(r.ok, r.missing ? r.error : `\`${what}\` threw: ${r.error}`); return r.value; };
const leHex = n => { let x = BigInt(n), out = ''; for (let i = 0; i < 8; i++) { out += (x & 0xffn).toString(16).padStart(2, '0'); x >>= 8n; } return out; };
export const short = key => typeof key === 'string' && key.length > 16 ? `${key.slice(0, 6)}…${key.slice(-4)}` : String(key);
const ownerName = (fixture, key) => Object.entries(fixture.keepers).find(([, v]) => v === key)?.[0];
export const galleryScene = (fixture, list) => ({creatures: list.map(d => ({
  dna: String(d.dna ?? 0).padStart(16, '0').slice(-16), owner: ownerName(fixture, d.owner) === 'you' ? 'you' : ownerName(fixture, d.owner) === 'rook' ? 'rival' : 'friend',
  label: `#${d.id} ${d.exact === false ? '≈ DNA rounded' : ({you: 'You', rook: 'Rook', fen: 'Fen'})[ownerName(fixture, d.owner)] ?? short(d.owner)}`,
}))});
const expectPrepared = (p, name, argsHex) => {
  need(p && typeof p === 'object', 'Return the prepared call from `prepareContractCall`.');
  need(p.fnName === name, `The prepared call should be for \`${name}\`, not \`${p.fnName}\`.`);
  need(p.privacy === 'public', 'Use `privacy: "public"`. The Hatchery needs a public sender.');
  need(p.amount === '0' && p.deposit === '0', 'Attach no DUSK: `amount: "0"` and `deposit: "0"`.');
  if (argsHex) need(p.fnArgs === argsHex, `The encoded arguments should be ${argsHex}, but they're ${p.fnArgs}.`);
};

export const lessons = [
  {
    id: 'almanac', n: 1, title: 'The Almanac', reference: S.load,
    chapters: [
      {
        id: 'almanac-intro', kind: 'intro', title: 'A book of every Duskling',
        wick: `Keepers keep asking me who's hatched what. Let's build them an Almanac: a web page that reads the Hatchery and shows every Duskling in it.`,
        body: `<p>A <strong>dApp</strong> is an app whose data lives in a contract. You'll write its data layer in JavaScript with <strong>Dusk Connect</strong>, Dusk's browser SDK, and the Hatchery's <strong>data-driver</strong>. The data-driver is a small WebAssembly module Forge builds from the contract, and it knows how to encode arguments and decode results.</p>
<p>Reading a contract is a <strong>query</strong> that a node runs for you: no wallet, no transaction and no fee.</p>`,
        learn: ['<code>readContract</code> queries', 'Why a <code>u64</code> arrives as a string', 'Arguments and <code>null</code> results', 'Keeper keys', 'Numbers JavaScript can\'t hold exactly', 'Handling an unavailable node'],
      },
      {
        id: 'count', kind: 'code', title: 'Your first read',
        body: `<p><code>createApp</code> is already written. It points Dusk Connect at a node and at the Hatchery, and gives the contract the short name <code>"hatchery"</code>.</p>
<p>To call a read-only function, name the contract and the function:</p>
<pre><code>await dusk.readContract({ contract: "hatchery", functionName: "…" })</code></pre>`,
        tasks: ['In <code>countDusklings</code>, return the result of reading <code>duskling_count</code>.'],
        hint: `<code>return await dusk.readContract({ contract: "hatchery", functionName: "duskling_count" });</code>`,
        start: S.start, answer: S.count,
        plan: [{fn: 'countDusklings'}],
        check([r]) {
          const v = ok(r, 'countDusklings');
          need(String(v) === '6', `The Hatchery holds 6 Dusklings, but \`countDusklings\` returned ${JSON.stringify(v)}.`);
          need(r.requests.includes('duskling_count'), 'Read the count from the contract with `readContract`.');
          return {log: [`countDusklings()  →  ${typeof v === 'string' ? `"${v}"` : v} (${typeof v})`], win: typeof v === 'string' ? 'Six Dusklings! Notice it\'s the string "6", not the number 6. Next chapter: why.' : 'Six Dusklings!'};
        },
      },
      {
        id: 'exact-count', kind: 'code', title: 'Why a string?',
        body: `<p>A Rust <code>u64</code> goes up to about 18 quintillion. A JavaScript number holds whole numbers exactly only up to 2<sup>53</sup>, about 9 quadrillion. Beyond that it rounds.</p>
<p>So the Hatchery's data-driver sends a returned <code>u64</code> as a <strong>string</strong> of digits, keeping every one. <code>BigInt</code> turns it into an exact whole number you can compare and do math with.</p>`,
        tasks: ['Store the result in <code>const count</code>, then return <code>BigInt(count)</code>.'],
        hint: `<pre><code>const count = ${read('duskling_count')};\nreturn BigInt(count);</code></pre>`,
        start: S.count, answer: S.exact,
        plan: [{fn: 'countDusklings'}],
        check([r]) {
          const v = ok(r, 'countDusklings');
          need(typeof v === 'bigint' && v === 6n, `Return a BigInt: \`BigInt(count)\`. You returned ${JSON.stringify(String(v))} (${typeof v}).`);
          return {log: ['countDusklings()  →  6n (bigint)'], win: 'Exact, whatever the size.'};
        },
      },
      {
        id: 'dna', kind: 'code', title: 'Asking about one Duskling',
        body: `<p>Functions with parameters take <code>args</code>. <code>dna_of(id)</code> returns an <code>Option&lt;u64&gt;</code>: the DNA, or <code>null</code> when there's no Duskling with that ID.</p>
<p>The Hatchery's driver reads <code>u64</code> arguments as JSON numbers. A small ID like 3 can simply be a number.</p>
<pre><code>await dusk.readContract({ contract: "hatchery", functionName: "…", args: id })</code></pre>`,
        tasks: ['In <code>readDna</code>, return the result of <code>dna_of</code> with <code>args: id</code>.'],
        hint: `<code>return ${read('dna_of', 'id')};</code>`,
        start: S.exact, answer: S.dna,
        plan: [{fn: 'readDna', args: [0]}, {fn: 'readDna', args: [99]}],
        check([a, b]) {
          const found = ok(a, 'readDna'), missing = ok(b, 'readDna');
          need(found === 8356281049284737, `readDna(0) should be 8356281049284737, not ${JSON.stringify(String(found))}.`);
          need(missing === null, 'readDna(99) should be null: there\'s no Duskling 99.');
          return {log: ['readDna(0)  →  8356281049284737', 'readDna(99)  →  null'], win: 'A Duskling, and a clean “nobody here”.'};
        },
      },
      {
        id: 'owner', kind: 'code', title: 'Whose is it?',
        body: `<p><code>owner_of(id)</code> returns the keeper's public key, or <code>null</code>. The driver writes a key as a long base58 string.</p>
<p class="aside">A public key identifies an account, not a person. It's also public: anyone can run this same query.</p>`,
        tasks: ['In <code>readOwner</code>, return the result of <code>owner_of</code> for <code>id</code>.'],
        hint: `<code>return ${read('owner_of', 'id')};</code>`,
        start: S.dna, answer: S.owner,
        plan: [{fn: 'readOwner', args: [0]}, {fn: 'readOwner', args: [99]}],
        check([a, b], fixture) {
          const found = ok(a, 'readOwner'), missing = ok(b, 'readOwner');
          need(found === fixture.keepers.you, `readOwner(0) should return your key (${short(fixture.keepers.you)}).`);
          need(missing === null, 'readOwner(99) should be null.');
          return {log: [`readOwner(0)  →  "${short(found)}" (you)`, 'readOwner(99)  →  null'], win: 'Keys, not names. The Almanac can label the ones it knows.'};
        },
      },
      {
        id: 'gallery', kind: 'code', title: 'Filling the Almanac',
        body: `<p>Now put the reads together. Loop over every ID below the count and collect each Duskling.</p>
<p><code>id &lt; count</code> compares a number with a BigInt, which JavaScript allows. IDs stay small, so plain numbers are fine as arguments.</p>`,
        tasks: ['In <code>listDusklings</code>, get the count, then for each <code>id</code> from 0 up to the count, push <code>{ id, dna, owner }</code> using your read functions. Return the list.'],
        hint: `<pre><code>const count = await countDusklings(dusk);
const dusklings = [];
for (let id = 0; id &lt; count; id++) {
  dusklings.push({ id, dna: await readDna(dusk, id), owner: await readOwner(dusk, id) });
}
return dusklings;</code></pre>`,
        start: S.owner, answer: S.list,
        plan: [{fn: 'listDusklings'}],
        check([r], fixture) {
          const list = ok(r, 'listDusklings');
          need(Array.isArray(list) && list.length === 6, `listDusklings should return all 6 Dusklings, not ${Array.isArray(list) ? list.length : 'a ' + typeof list}.`);
          list.forEach((d, i) => need(Number(d.id) === i && d.owner === fixture.keepers[fixture.dusklings[i].owner], `Duskling ${i} should have id ${i} and its owner's key.`));
          need(list.slice(0, 3).every((d, i) => String(d.dna) === fixture.dusklings[i].dna), 'Include each Duskling\'s DNA from `readDna`.');
          return {log: list.map(d => `#${d.id}  ${d.dna}  ${short(d.owner)}`), win: 'The Almanac is full. Look closely at Duskling #3, though.', scene: galleryScene(fixture, list)};
        },
      },
      {
        id: 'digits', kind: 'code', title: 'Every digit counts',
        wick: `Rook swears Duskling #3 has a kitty mouth, and the Almanac shows a smile. Rook's right.`,
        body: `<p>Duskling #3's real DNA is <code>9437186547890123</code>, but the Almanac shows <code>9437186547890124</code>. That's larger than 2<sup>53</sup>, and <code>dna_of</code> returns an <code>Option&lt;u64&gt;</code>. The driver only sends a <em>top-level</em> <code>u64</code> as a string. Anything nested, like this <code>Option</code>, arrives as a plain JSON number. Dusk Connect parses it into a JavaScript number, and those round anything above 2<sup>53</sup>.</p>
<p>The app can't get the digits back. It can refuse to trust them: <code>Number.isSafeInteger(n)</code> is <code>true</code> only for whole numbers small enough to be sure they're exact.</p>
<p class="aside">The real fix is on the contract side: return a plain <code>u64</code> for values apps must read exactly, and the driver sends every digit as a string.</p>`,
        tasks: ['In the loop, store the DNA in <code>const dna</code> and add <code>exact: Number.isSafeInteger(dna)</code> to each entry.'],
        hint: `<pre><code>const dna = await readDna(dusk, id);
dusklings.push({ id, dna, owner: await readOwner(dusk, id), exact: Number.isSafeInteger(dna) });</code></pre>`,
        start: S.list, answer: S.digits,
        plan: [{fn: 'listDusklings'}],
        check([r], fixture) {
          const list = ok(r, 'listDusklings');
          need(list?.length === 6, 'Keep returning all 6 Dusklings.');
          need(list.every(d => typeof d.exact === 'boolean'), 'Add `exact: Number.isSafeInteger(dna)` to every entry.');
          need(list[3].exact === false && list.filter(d => d.exact).length === 5, 'Only Duskling #3\'s DNA is too large to be exact.');
          return {log: list.map(d => `#${d.id}  ${d.dna}  ${d.exact ? 'exact' : '≈ rounded, not trusted'}`), win: 'The Almanac no longer draws a Duskling it can\'t read exactly.', scene: galleryScene(fixture, list)};
        },
      },
      {
        id: 'offline', kind: 'code', title: 'When the node is down',
        body: `<p>Nodes can be unreachable. A failed read throws, and that's different from a missing Duskling, which is a successful answer of <code>null</code>.</p>
<p>Catch the failure where the page loads, so the Almanac can say “try again” instead of crashing:</p>
<pre><code>try { … } catch (error) { … }</code></pre>`,
        tasks: ['In <code>loadAlmanac</code>, wrap the existing return in <code>try</code>, and in <code>catch</code> return <code>{ status: "unavailable" }</code>.'],
        hint: `<pre><code>try {
  return { status: "ok", dusklings: await listDusklings(dusk) };
} catch (error) {
  return { status: "unavailable" };
}</code></pre>`,
        start: S.digits, answer: S.load,
        plan: [{fn: 'loadAlmanac', node: 'offline'}, {fn: 'loadAlmanac'}],
        check([down, up], fixture) {
          const a = ok(down, 'loadAlmanac'), b = ok(up, 'loadAlmanac');
          need(a?.status === 'unavailable', 'With the node down, `loadAlmanac` should return `{ status: "unavailable" }`.');
          need(b?.status === 'ok' && b.dusklings?.length === 6, 'With the node up, it should still return the Dusklings.');
          return {log: ['loadAlmanac(node down)  →  { status: "unavailable" }', 'loadAlmanac(node up)  →  { status: "ok", 6 Dusklings }'], win: 'Down is not the same as empty.', scene: galleryScene(fixture, b.dusklings)};
        },
      },
      {
        id: 'almanac-lab', kind: 'finale', title: 'The finished Almanac',
        wick: `There it is: every Duskling in the Hatchery, straight from the contract. Keepers will love this.`,
        body: `<p>Your data layer is feeding a real page. Every card here comes from your own <code>loadAlmanac</code>, running Dusk Connect and the Hatchery's data-driver against the practice node.</p>`,
        lab: 'gallery',
      },
    ],
  },
  {
    id: 'hatch-web', n: 2, title: 'Hatching from the web', reference: S.transfer,
    chapters: [
      {
        id: 'web-intro', kind: 'intro', title: 'From reading to writing',
        wick: `Reading is free. Hatching changes the Hatchery, and that means a transaction the keeper signs.`,
        body: `<p>A dApp never signs anything itself. It <strong>prepares</strong> a contract call: which contract, which function, the encoded arguments and the options. Then it hands that to the keeper's <strong>wallet</strong>, which asks the keeper to approve, signs and sends it.</p>
<p>The academy has no wallet and sends nothing. You'll prepare calls and look at exactly what a wallet would be asked to sign.</p>`,
        learn: ['<code>prepareContractCall</code>', 'Public vs. shielded calls', 'BigInt hashing in JavaScript', 'Exact arguments with <code>JSON.rawJSON</code>', 'Calls with several arguments'],
      },
      {
        id: 'prepare-hatch', kind: 'code', title: 'Preparing a hatch',
        body: `<p><code>prepareContractCall</code> encodes the arguments with the data-driver and returns the call's parameters:</p>
<pre><code>await dusk.prepareContractCall({
  contract: "hatchery", functionName: "…", args: …,
  privacy: "public", amount: "0", deposit: "0",
});</code></pre>
<ul><li><code>privacy</code> is required. The Hatchery's <code>hatch</code> calls <code>abi::public_sender()</code>, so a shielded call would panic. It must be <code>"public"</code>.</li>
<li><code>amount</code> and <code>deposit</code> are DUSK values, counted in Lux, DUSK's smallest unit. <code>deposit</code> is what the called contract can collect. <code>hatch</code> doesn't take any DUSK, so both are <code>"0"</code>. The keeper still pays gas: fees are separate from these values.</li></ul>`,
        tasks: ['In <code>prepareHatch</code>, return a prepared call to <code>hatch</code> with <code>args: seed</code>, public privacy, and no DUSK attached.'],
        hint: `Use the call shown above with <code>functionName: "hatch"</code> and <code>args: seed</code>.`,
        start: S.l2start, answer: S.hatch,
        plan: [{fn: 'prepareHatch', args: [42]}],
        check([r]) {
          const p = ok(r, 'prepareHatch');
          expectPrepared(p, 'hatch', '0x' + leHex(42));
          return {log: [`fnName: "hatch"`, `fnArgs: ${p.fnArgs}  (42, encoded by the driver)`, 'privacy: "public" · amount: "0" · deposit: "0"'], win: 'Ready for a wallet to sign.'};
        },
      },
      {
        id: 'seed-name', kind: 'code', title: 'A seed from a name',
        body: `<p>The academy turns your Duskling's name into its seed with <strong>FNV-1a</strong>, a small, well-known hash. You can do the same in the app, so the page knows the seed before anyone hatches.</p>
<p>For each byte: XOR it into the hash (<code>^=</code>), multiply by the FNV prime, and keep 64 bits by masking (<code>&amp; 0xffffffffffffffffn</code>). The <code>n</code> suffix makes a BigInt, so nothing rounds.</p>`,
        tasks: ['Inside the loop in <code>seedFromName</code>, add <code>hash ^= BigInt(byte);</code>', 'Then <code>hash = (hash * 0x100000001b3n) &amp; 0xffffffffffffffffn;</code>'],
        hint: `<pre><code>hash ^= BigInt(byte);
hash = (hash * 0x100000001b3n) &amp; 0xffffffffffffffffn;</code></pre>`,
        start: S.hatch, answer: S.seed,
        plan: [{fn: 'seedFromName', args: ['Moonpaw'], pure: true}, {fn: 'seedFromName', args: ['Rook'], pure: true}],
        check([a, b]) {
          const m = ok(a, 'seedFromName'), r = ok(b, 'seedFromName');
          need(typeof m === 'bigint', 'Return a BigInt.');
          const [wantM, wantR] = [seedFromName('Moonpaw'), seedFromName('Rook')];
          need(m === wantM && r === wantR, `seedFromName("Moonpaw") should be ${wantM}n, not ${m}n.`);
          return {log: [`seedFromName("Moonpaw")  →  ${m}n`, `seedFromName("Rook")  →  ${r}n`], win: 'The same seed the Hatchery lessons use.'};
        },
      },
      {
        id: 'exact-seed', kind: 'code', title: 'Arguments that keep every digit',
        body: `<p>Try hatching with that seed: Dusk Connect turns a BigInt into a JSON <em>string</em>, and the driver wants a JSON <em>number</em>, so it refuses. A plain number would round a seed this big.</p>
<p><code>JSON.rawJSON("…")</code> gives Dusk Connect raw JSON number text, so every digit reaches the driver.</p>
<pre><code>args: JSON.rawJSON(seed.toString())</code></pre>`,
        tasks: ['In <code>prepareHatch</code>, change <code>args: seed</code> to <code>args: JSON.rawJSON(seed.toString())</code>.'],
        hint: `<code>args: JSON.rawJSON(seed.toString()),</code>`,
        start: S.seed, answer: S.hatchExact,
        plan: [{fn: 'prepareHatch', args: [6391907099944793724n]}, {fn: 'prepareHatch', args: [42]}],
        check([big, small]) {
          const p = ok(big, 'prepareHatch');
          expectPrepared(p, 'hatch', '0x' + leHex(6391907099944793724n));
          expectPrepared(ok(small, 'prepareHatch'), 'hatch', '0x' + leHex(42));
          return {log: [`prepareHatch(6391907099944793724n)  →  fnArgs ${p.fnArgs}`, 'prepareHatch(42)  →  still fine'], win: 'Every digit of the seed reaches the contract.'};
        },
      },
      {
        id: 'prepare-transfer', kind: 'code', title: 'Several arguments',
        body: `<p><code>transfer(id, to)</code> takes two parameters. Forge bundles several parameters into a tuple, so pass them as an array, in order: <code>args: [id, to]</code>.</p>
<p><code>to</code> is a keeper's key: the same base58 string <code>readOwner</code> returns.</p>`,
        tasks: ['In <code>prepareTransfer</code>, return a prepared call to <code>transfer</code> with <code>args: [id, to]</code>, public, with no DUSK attached.'],
        hint: `Same shape as <code>prepareHatch</code>, with <code>functionName: "transfer"</code> and <code>args: [id, to]</code>.`,
        start: S.hatchExact, answer: S.transfer,
        plan: [{fn: 'prepareTransfer', args: [0, {key: 'fen'}]}],
        check([r], fixture) {
          const p = ok(r, 'prepareTransfer');
          expectPrepared(p, 'transfer');
          need(p.fnArgs.startsWith('0x' + leHex(0)) && p.fnArgs.includes(fixture.keyBytes.fen.slice(0, 64)), 'Pass the Duskling ID first and Fen\'s key second: `args: [id, to]`.');
          return {log: ['fnName: "transfer"', `fnArgs: ${p.fnArgs.slice(0, 34)}… (id 0, then Fen's key)`], win: 'A handover, ready for Duskling #0\'s keeper to sign.'};
        },
      },
      {
        id: 'hatch-lab', kind: 'finale', title: 'Your hatch request',
        wick: `Here's what your Almanac would hand a wallet if you asked it to hatch your Duskling.`,
        body: `<p>This is your own <code>seedFromName</code> and <code>prepareHatch</code> at work. A wallet would show this request, ask you to approve it, then sign and send it. The academy stops here: nothing is sent.</p>
<p class="aside">In this practice Hatchery you already keep two Dusklings. A keeper who has one can't hatch another, so the contract would refuse this call.</p>`,
        lab: 'hatch',
      },
    ],
  },
];
export const chapters = lessons.flatMap((lesson, l) => lesson.chapters.map(c => ({...c, lesson: l})));
