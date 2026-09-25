// Lesson 5: Trading. Transfers, events with keys, approvals with Option, &mut borrows, stale approvals.
import {file, evolve, HATCHED, HUNTED, TRANSFERRED} from './hatchery-file.js';
import {PARTS as L4} from './lesson4.js';
import {deploy, need, needMethod, fnSource, pad16, seedFromName} from './contract.js';

const P = {};
P.transfer = evolve(L4, {methods: {transfer: `pub fn transfer(&mut self, id: u64, to: BlsPublicKey) {
    self.only_keeper(id);
    self.dusklings[id as usize].owner = to;
}`}});
// Transferred arrives with its id field and topic; the learner adds the key, registers and emits it.
P.transferred0 = evolve(P.transfer, {events: [HATCHED, HUNTED, {...TRANSFERRED, fields: ['pub id: u64,', '// Add the new keeper here.'], keys: true}]});
P.transferred = evolve(P.transfer, {events: [HATCHED, HUNTED, TRANSFERRED], registered: ['Hatched', 'Hunted', 'Transferred'], methods: {transfer: `pub fn transfer(&mut self, id: u64, to: BlsPublicKey) {
    self.only_keeper(id);
    self.dusklings[id as usize].owner = to;
    abi::emit("transferred", crate::Transferred { id, to });
}`}});
P.approvedField = evolve(P.transferred, {fields: [...L4.fields, 'approved: Option<BlsPublicKey>,'], methods: {create_duskling: `fn create_duskling(&mut self, dna: u64, owner: BlsPublicKey) {
    let id = self.dusklings.len() as u64;
    self.dusklings.push(Duskling { dna, level: 1, owner, ready_at: 0, wins: 0, losses: 0, approved: None });
    abi::emit("hatched", crate::Hatched { id, dna });
}`}});
P.approve = evolve(P.approvedField, {methods: {approve: `pub fn approve(&mut self, id: u64, to: BlsPublicKey) {
    self.only_keeper(id);
    self.dusklings[id as usize].approved = Some(to);
}`}});
P.take = evolve(P.approve, {methods: {take: `pub fn take(&mut self, id: u64) {
    let taker = abi::public_sender().expect("Use a public Moonlight account");
    let duskling = &mut self.dusklings[id as usize];
    assert!(duskling.approved == Some(taker), "You're not approved to take this Duskling");
    duskling.owner = taker;
    duskling.approved = None;
}`}});
P.stale = evolve(P.take, {methods: {transfer: `pub fn transfer(&mut self, id: u64, to: BlsPublicKey) {
    self.only_keeper(id);
    self.dusklings[id as usize].owner = to;
    self.dusklings[id as usize].approved = None;
    abi::emit("transferred", crate::Transferred { id, to });
}`}});
export const PARTS = P.stale;
const S = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, file(v)]));
const start = file(L4);

const sceneOf = c => ({nests: 5, creatures: c.dusklings().map(d => ({dna: pad16(d.dna), owner: d.owner, approved: d.approved}))});
const two = source => { const c = deploy(source); c.as('you').call('hatch', 1); c.as('rival').call('hatch', 2); return c; };

export const lesson = {
  id: 'trading', n: 5, title: 'Trading', reference: S.stale,
  chapters: [
    {
      id: 'trading', kind: 'intro', title: 'Trading day',
      wick: `Fen has had an eye on your Duskling all week. Let's make trading possible, and safe.`,
      body: `<p>Ownership only matters if it can change hands. In this lesson you'll add transfers, events for them, and <strong>approvals</strong>, which let someone else collect a Duskling you've agreed to hand over. You'll also close a classic loophole.</p>`,
      learn: ['Changing a field through an index', 'Events that carry keys', '<code>Option</code> fields and <code>Some</code>/<code>None</code>', '<code>&amp;mut</code> borrows', 'Comparing <code>Option</code>s', 'Stale approvals'],
      scene: {nests: 5, creatures: [{dna: '8356281049284737', owner: 'you'}, {dna: '1305780178061356', owner: 'friend'}]},
    },
    {
      id: 'transfer', kind: 'code', title: 'Handing it over',
      body: `<p>A transfer is just a new owner, as long as the right keeper asks. <code>only_keeper</code> already does the checking. Its return value isn't needed here, so call it and ignore the result.</p>`,
      tasks: ['Add <code>pub fn transfer(&amp;mut self, id: u64, to: BlsPublicKey)</code>.', 'Call <code>self.only_keeper(id);</code>, then set the Duskling\'s <code>owner</code> to <code>to</code>.'],
      hint: `<pre><code>self.only_keeper(id);
self.dusklings[id as usize].owner = to;</code></pre>`,
      start, answer: S.transfer,
      check(source) {
        const c = two(source);
        needMethod(c, 'transfer', {pub: true, mut: true, params: [['id', 'u64'], ['to', 'BlsPublicKey']], output: '()'});
        c.as('you').call('transfer', 0, 'friend');
        need(c.dusklings()[0].owner === 'friend', 'After transfer(0, Fen), Fen should own Duskling 0.');
        const msg = c.as('rival').panics('transfer', 0, 'rival');
        return {log: ['transfer(0, Fen) as you  →  owner: Fen', `transfer(0, Rook) as Rook  →  panic: “${msg}”`], win: 'Fen has a new friend.', scene: sceneOf(c)};
      },
    },
    {
      id: 'transferred', kind: 'code', title: 'A receipt',
      body: `<p>Wallets and explorers show ownership changes by listening for events. A key can go in an event just like a number.</p>
<p>A <code>Transferred</code> event type is waiting at the top of the file. The key type is imported up there too: the module's imports don't reach outside the module.</p>`,
      tasks: ['Give <code>Transferred</code> a second field for the new keeper: <code>pub to: BlsPublicKey,</code>.', 'Register it: add <code>crate::Transferred</code> to the events list.', 'At the end of <code>transfer</code>, emit <code>crate::Transferred { id, to }</code> with the topic <code>"transferred"</code>.'],
      hint: `<pre><code>pub to: BlsPublicKey,

#[dusk_forge::contract(events = [crate::Hatched, crate::Hunted, crate::Transferred])]

abi::emit("transferred", crate::Transferred { id, to });</code></pre>`,
      start: S.transferred0, answer: S.transferred,
      check(source) {
        const c = two(source), mark = c.events.length;
        c.as('you').call('transfer', 0, 'friend');
        const ev = c.events.slice(mark);
        need(c.rt.program.structs.get('Transferred')?.get('to') === 'BlsPublicKey', '`Transferred` needs a field `pub to: BlsPublicKey`.');
        need(ev.length === 1 && ev[0].topic === 'transferred', 'A transfer should emit one "transferred" event.');
        need(ev[0].type === 'Transferred', 'Emit the event type, `crate::Transferred { id, to }`: apps can only decode registered event types.');
        need(ev[0].fields.id === 0n && ev[0].fields.to?.id === 'friend', 'The event should carry the Duskling\'s id and the new keeper: here 0 and Fen.');
        return {log: ['event "transferred"  Transferred { id: 0, to: Fen }'], win: 'Every handover leaves a receipt.', scene: sceneOf(c)};
      },
    },
    {
      id: 'approved-field', kind: 'code', title: 'Room for an approval',
      body: `<p>Sometimes the new keeper should collect the Duskling themselves, for example after paying for it. For that, the current keeper <strong>approves</strong> someone in advance.</p>
<p>A Duskling may or may not have an approval, which is a job for <code>Option</code>: <code>Some(key)</code> or <code>None</code>.</p>`,
      tasks: ['Add <code>approved: Option&lt;BlsPublicKey&gt;</code> to <code>Duskling</code>, after <code>losses</code>.', 'Start it as <code>None</code> in <code>create_duskling</code>.'],
      hint: `<code>Duskling { dna, level: 1, owner, ready_at: 0, wins: 0, losses: 0, approved: None }</code>`,
      start: S.transferred, answer: S.approvedField,
      check(source) {
        const c = deploy(source);
        need(c.rt.program.structs.get('Duskling')?.get('approved') === 'Option<BlsPublicKey>', '`Duskling` needs a field `approved: Option<BlsPublicKey>`.');
        c.as('you').call('hatch', 1);
        need(c.dusklings()[0].approved === null, 'A new Duskling should have no approval: `approved: None`.');
        return {log: ['hatch  →  approved: None'], win: 'Nobody is approved yet.', scene: sceneOf(c)};
      },
    },
    {
      id: 'approve', kind: 'code', title: 'Approving a keeper',
      body: `<p>Only the current keeper may approve someone. Store the approval wrapped in <code>Some</code>.</p>`,
      tasks: ['Add <code>pub fn approve(&amp;mut self, id: u64, to: BlsPublicKey)</code>.', 'Check the caller with <code>self.only_keeper(id);</code>, then set <code>approved</code> to <code>Some(to)</code>.'],
      hint: `<code>self.dusklings[id as usize].approved = Some(to);</code>`,
      start: S.approvedField, answer: S.approve,
      check(source) {
        const c = two(source);
        needMethod(c, 'approve', {pub: true, mut: true, params: [['id', 'u64'], ['to', 'BlsPublicKey']], output: '()'});
        c.as('you').call('approve', 0, 'friend');
        need(c.dusklings()[0].approved === 'friend', 'After approve(0, Fen), Duskling 0 should be approved for Fen.');
        const msg = c.as('rival').panics('approve', 0, 'rival');
        return {log: ['approve(0, Fen) as you  →  approved: Some(Fen)', `approve(0, Rook) as Rook  →  panic: “${msg}”`], win: 'Fen may collect your Duskling.', scene: sceneOf(c)};
      },
    },
    {
      id: 'take', kind: 'code', title: 'Collecting it',
      body: `<p>The approved keeper can now take the Duskling. Borrow it mutably, so you can change several fields through one name:</p>
<pre><code>let egg = &amp;mut self.eggs[id as usize];
egg.warm = true;</code></pre>
<p>Indexing past the end of a vector panics, so a missing Duskling fails the call on its own. Options compare directly: <code>egg.approved == Some(taker)</code>. After the handover, clear the approval so it can't be used twice.</p>`,
      tasks: ['Add <code>pub fn take(&amp;mut self, id: u64)</code>.', 'Get the sender as <code>taker</code> (<code>"Use a public Moonlight account"</code>).', 'Borrow <code>let duskling = &amp;mut self.dusklings[id as usize];</code> and assert <code>duskling.approved == Some(taker)</code> (<code>"You\'re not approved to take this Duskling"</code>).', 'Set <code>owner</code> to <code>taker</code> and <code>approved</code> back to <code>None</code>.'],
      hint: `<pre><code>let taker = abi::public_sender().expect("Use a public Moonlight account");
let duskling = &amp;mut self.dusklings[id as usize];
assert!(duskling.approved == Some(taker), "You're not approved to take this Duskling");
duskling.owner = taker;
duskling.approved = None;</code></pre>`,
      start: S.approve, answer: S.take,
      check(source) {
        const c = two(source);
        needMethod(c, 'take', {pub: true, mut: true, params: [['id', 'u64']], output: '()'});
        c.as('you').call('approve', 0, 'friend');
        const early = c.as('rival').panics('take', 0);
        c.as('friend').call('take', 0);
        const d = c.dusklings()[0];
        need(d.owner === 'friend' && d.approved === null, 'After take, Fen should own the Duskling and the approval should be cleared.');
        const twice = c.as('friend').panics('take', 0);
        return {log: [`take(0) as Rook  →  panic: “${early}”`, 'take(0) as Fen  →  owner: Fen, approved: None', `take(0) as Fen again  →  panic: “${twice}”`], win: 'Collected, and the approval can\'t be used again.', scene: sceneOf(c)};
      },
    },
    {
      id: 'stale', kind: 'code', title: 'The stale approval',
      wick: `Careful! You approved Fen, then gave the Duskling to Rook. Can Fen still walk off with it?`,
      body: `<p>Right now, yes. <code>transfer</code> changes the owner but leaves the old approval in place, so Fen can take the Duskling from its new keeper. An approval should end when the Duskling changes hands.</p>`,
      tasks: ['In <code>transfer</code>, after changing the owner, reset <code>approved</code> to <code>None</code>.'],
      hint: `<code>self.dusklings[id as usize].approved = None;</code>`,
      start: S.take, answer: S.stale,
      check(source) {
        const c = two(source);
        c.as('you').call('approve', 0, 'friend');
        c.as('you').call('transfer', 0, 'rival');
        const msg = c.as('friend').panics('take', 0);
        need(c.dusklings()[0].owner === 'rival', 'Rook should still own the Duskling.');
        need(/approved\s*=\s*None/.test(fnSource(source, 'transfer')), '`transfer` should clear the approval.');
        return {log: ['approve(0, Fen), then transfer(0, Rook)', `take(0) as Fen  →  panic: “${msg}”`, 'owner  →  Rook'], win: 'Loophole closed. That\'s the whole Hatchery!', scene: sceneOf(c)};
      },
    },
    {
      id: 'trade-day', kind: 'finale', title: 'Trade day',
      wick: `A full Hatchery: hatching, keepers, hunts, battles and trades, all enforced by your own contract. Let's trade.`,
      body: `<p>Your finished contract is running. Approve Fen, let Fen collect, and try the loophole you just closed.</p>`,
      playground: {
        setup: (c, k) => { c.as('you').call('hatch', seedFromName(k.name || 'you')); c.as('rival').call('hatch', seedFromName('Rook')); },
        actions: [
          {label: 'Approve Fen for your Duskling', run: c => { c.as('you').call('approve', 0, 'friend'); return 'Fen is approved to collect Duskling #0.'; }},
          {label: 'Fen collects it', run: c => { c.as('friend').call('take', 0); return 'Fen took Duskling #0.'; }},
          {label: 'Fen gives it back', run: c => { c.as('friend').call('transfer', 0, 'you'); return 'Duskling #0 is yours again.'; }},
          {label: 'Rook tries to take it', run: c => { c.as('rival').call('take', 0); return 'Rook took it?'; }},
        ],
      },
    },
  ],
};
