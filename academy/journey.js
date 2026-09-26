// Start with Dusk: the keeper's journey. Five levels, one question per chapter, no code.
// Levels 1–3 follow the vetted "Start with Dusk" lesson of the classic academy (git tag classic-academy). Network facts in
// level 5 were checked against rusk (Succinct Attestation, sortition, stake and slashing).

export const levels = [
  {
    id: 'first-egg', title: 'First egg', topic: 'Blockchain basics', reward: null,
    chapters: [
      {
        id: 'egg', kind: 'intro', title: 'An egg with your name on it', visual: 'level',
        wick: `Every keeper starts with an egg, and yours is waiting on the pier. Before it hatches, you need to know how the harbor keeps track of things.`,
        body: `<p>Dusk is a blockchain network built for finance. Level 1 covers the basics every Dusk user needs: the shared ledger, wallets and keys, and what really happens when you send a transaction.</p>
<p>No code, no wallet and no crypto needed. Each chapter asks one question, and each right answer lights a lantern. Light them all and your egg hatches.</p>`,
      },
      {
        id: 'ledger', kind: 'quiz', title: 'The shared ledger', visual: 'nodes',
        body: `<p>The harbor keeps one ledger of every Duskling. On a blockchain, that ledger isn't stored by one company. Many independent computers called <strong>nodes</strong> each keep a copy and check every update against the same rules.</p>
<p>Updates are grouped into <strong>blocks</strong>, and the nodes use <strong>consensus</strong> to agree on a single history. A block is <strong>final</strong> once the network treats it as settled and it can no longer be replaced.</p>
<p class="aside">One business can often just use a database. A blockchain is worth it when independent parties need a common record and rules they can all check.</p>`,
        question: 'Why keep the Duskling ledger on a blockchain instead of in the hatchery\'s own database?',
        choices: [
          {id: 'trust', right: true, text: 'So independent keepers can check the same record and rules without trusting the hatchery alone.', why: 'Right. Nobody has to take the hatchery\'s word for it: every node checks the same rules.'},
          {id: 'fast', text: 'Because a blockchain is always faster than a database.', why: 'That\'s not the reason. Coordinating many nodes usually costs speed. The benefit is a record nobody controls alone.'},
          {id: 'rules', text: 'So the ledger doesn\'t need any rules.', why: 'It\'s the opposite: every node checks each update against the same rules.'},
        ],
      },
      {
        id: 'displays', kind: 'quiz', title: 'Records and displays', visual: 'apps',
        body: `<p><strong>State</strong> is what the network currently stores, like the Hatchery's list of Dusklings. Apps <em>read</em> that state and display it however they like.</p>
<p>Changing a website's text doesn't change the ledger. A second app can read the same contract on its own. Apps can show stale data, so compare fresh reads of the same finalized state.</p>`,
        question: 'The Hatchery holds 5 Dusklings. The Almanac website and a keeper\'s phone app both make a fresh read of the same finalized state. What do they get?',
        choices: [
          {id: 'separate', text: 'Each app keeps its own count, so they may disagree.', why: 'The count belongs to the contract, not the apps. Fresh reads of the same finalized state agree.'},
          {id: 'same', right: true, text: 'Both get 5, even if they display it differently.', why: 'Exactly: one record, many displays.'},
          {id: 'typed', text: 'Whatever number was last typed into either website.', why: 'Editing a website changes the page, not the ledger.'},
        ],
      },
      {
        id: 'keys', kind: 'quiz', title: 'Keys and signatures',
        body: `<p>A <strong>wallet</strong> manages your keys. Your <strong>private key</strong> makes <strong>signatures</strong>: proof that the key's owner approved one specific action. The network can check a signature without ever seeing the key.</p>
<p>A signature proves you control a key. It doesn't prove who you are in real life, and it doesn't prove the action was a good idea.</p>`,
        question: 'Your wallet signs a request to call hatch(). What does the signature prove?',
        choices: [
          {id: 'identity', text: 'Your legal name and address.', why: 'A key isn\'t an identity document. Level 3 covers how to prove things about yourself.'},
          {id: 'safe', text: 'That the request is safe to approve.', why: 'A signature shows you approved it, not that approving it was wise. Read what you sign.'},
          {id: 'control', right: true, text: 'That whoever holds your key approved this exact request.', why: 'Right. Nothing more and nothing less.'},
        ],
      },
      {
        id: 'phrase', kind: 'quiz', title: 'The recovery phrase', visual: 'wallet',
        body: `<p>When you create a wallet, it shows you a <strong>recovery phrase</strong>: a list of words that can rebuild your keys on any device. Whoever has the phrase controls the wallet.</p>
<p>Apps never need it. They ask the wallet to approve an action, and you approve or reject it inside the wallet itself.</p>`,
        question: 'A website says: “Paste your recovery phrase so we can verify your Duskling.” What do you do?',
        choices: [
          {id: 'paste', text: 'Paste it. They need it for verification.', why: 'Never. Anyone with your recovery phrase can take everything the wallet controls.'},
          {id: 'refuse', right: true, text: 'Refuse. Apps ask the wallet for approval and never need the phrase.', why: 'Right. Anything that asks for your phrase is trying to take your keys.'},
          {id: 'half', text: 'Paste only half, to be safe.', why: 'Half a phrase gives a thief a big head start. Share none of it.'},
        ],
      },
      {
        id: 'transactions', kind: 'quiz', title: 'Sending a transaction', visual: 'lifecycle',
        body: `<p>A <strong>transaction</strong> is a request for the network to do something, such as calling <code>hatch</code>. You approve it in your wallet and it goes to a node. The network may then include it in a block and execute it.</p>
<p>Submitted, executed and final are three different moments. An app should check each one before it tells you something worked.</p>`,
        question: 'You submitted hatch() and got a transaction hash back. Is your Duskling safely hatched?',
        choices: [
          {id: 'yes', text: 'Yes. A hash means it worked.', why: 'A hash only identifies the request. Execution can still fail.'},
          {id: 'balance', text: 'Yes, as long as the wallet still shows a balance.', why: 'Your balance says nothing about whether this particular call succeeded.'},
          {id: 'check', right: true, text: 'Not yet. First check that execution succeeded and that its block is final.', why: 'Right. Submitted, executed and final are separate steps.'},
        ],
      },
      {
        id: 'gas', kind: 'quiz', title: 'Gas and fees',
        body: `<p>Every transaction makes the network do work: checking signatures, running contract code and storing state. That work is measured in <strong>gas</strong> and paid for as a fee in <strong>DUSK</strong>, the network's token.</p>
<p>The fee pays for the work, not for a good outcome. If a contract call fails, its changes are rolled back, but you still pay. On Dusk, a failed call uses up its whole gas limit.</p>`,
        question: 'Your hatch() call fails halfway through. What happens?',
        choices: [
          {id: 'rolled', right: true, text: 'Its changes are rolled back, but you still pay the fee.', why: 'Right. A failed call uses up its whole gas limit, which is why good apps check things before sending.'},
          {id: 'refund', text: 'Everything is undone, including the fee.', why: 'The state changes are undone, but the fee isn\'t. A failed call still pays, in fact for its whole gas limit.'},
          {id: 'half', text: 'Half a Duskling hatches.', why: 'A failed call rolls back all of its changes, so there are no half-hatched Dusklings.'},
        ],
      },
      {
        id: 'contracts', kind: 'quiz', title: 'Contracts make the rules',
        body: `<p>A <strong>smart contract</strong> is a program whose rules govern its own on-chain state. The Hatchery decides how DNA is made, and nobody can skip that step.</p>
<p>A website can check things early for a smoother experience, but the contract must enforce the rules, because anyone can call a contract directly.</p>
<p class="aside"><strong>DuskVM</strong> runs native Dusk contracts. They're written in Rust and compiled to WebAssembly, using <strong>Dusk Forge</strong> as the tooling. <strong>DuskEVM</strong> is a separate, Ethereum-compatible environment.</p>`,
        question: 'The Almanac website rejects Duskling names longer than 20 letters. Is that enough to enforce the rule?',
        choices: [
          {id: 'enough', text: 'Yes. Users can only reach the contract through the website.', why: 'Contracts are public, and anyone can call them with their own tools.'},
          {id: 'contract', right: true, text: 'No. The contract has to enforce it, because anyone can call the contract directly.', why: 'Right. The rule has to live in the one place every call passes through.'},
          {id: 'https', text: 'Yes, as long as the website uses HTTPS.', why: 'HTTPS protects the connection to the website, not the contract.'},
        ],
      },
      {
        id: 'hatch', kind: 'finale', title: 'Your Duskling hatches', visual: 'hatch',
        wick: `The egg is shaking. Quick, it needs a name!`,
        body: `<p>Name your Duskling. Wick runs the <strong>Hatchery</strong> contract: your name becomes a seed, the contract mixes the seed into 16 digits of DNA, and the DNA decides every trait.</p>
<p>In the Contracts path you'll write this same contract yourself, and the same name will hatch the same Duskling.</p>`,
      },
    ],
  },
  {
    id: 'out-of-sight', title: 'Out of sight', topic: 'Privacy', reward: 'cloak',
    chapters: [
      {
        id: 'seen', kind: 'intro', title: 'Everyone wants a look', visual: 'level',
        wick: `Now that you have a Duskling, everyone on the pier wants a look. Let's talk about what they can see, and what they can't.`,
        body: `<p>Level 2 is about privacy on Dusk: what's public on a blockchain, how Moonlight and Phoenix move DUSK, and how zero-knowledge proofs show that something is true without showing the details, in Dusk's own transfers and in apps you build.</p>`,
      },
      {
        id: 'public', kind: 'quiz', title: 'Public means public',
        body: `<p><strong>On-chain</strong> data is recorded by the blockchain. <strong>Off-chain</strong> data lives somewhere else, such as your device or a company's server.</p>
<p>Put something in ordinary contract state and copies exist on nodes around the world. Hiding it on a website doesn't remove those copies. Marking a field private in Rust doesn't encrypt it either; it only controls which code can call or read it.</p>`,
        question: 'A keeper\'s real name was stored in public contract state. Now the website hides it. What changed?',
        choices: [
          {id: 'display', right: true, text: 'Only the website. The name is still on-chain for anyone to read.', why: 'Right. Decide what goes on-chain before you publish it, because you can\'t take it back.'},
          {id: 'secret', text: 'The name is now confidential on-chain.', why: 'The chain still holds it, and anyone can read it without the website.'},
          {id: 'deleted', text: 'The chain deleted the old value and every copy.', why: 'Blockchains keep their history, and nodes still hold copies.'},
        ],
      },
      {
        id: 'metadata', kind: 'quiz', title: 'Patterns give you away',
        body: `<p>Hiding names and amounts isn't the whole story. Observers also learn from <strong>metadata</strong>: when you act, how often, which accounts you deal with, and patterns that link your accounts together.</p>
<p>Privacy means thinking about everything an observer can see, not just the obvious fields.</p>`,
        question: 'You never publish your name, but every evening at nine your public account pays the Hatchery exactly 5 DUSK. What might an observer learn?',
        choices: [
          {id: 'nothing', text: 'Nothing. Your name isn\'t on-chain.', why: 'A name isn\'t the only clue. Regular patterns can identify you or link your accounts.'},
          {id: 'encrypted', text: 'Only the amounts, because times are encrypted.', why: 'On a public account, both times and amounts are visible.'},
          {id: 'pattern', right: true, text: 'Your habits, and possibly who you are, from the pattern.', why: 'Right. Timing, amounts and counterparties are all information.'},
        ],
      },
      {
        id: 'moonlight', kind: 'quiz', title: 'Moonlight: public accounts', visual: 'transfer',
        body: `<p><strong>Moonlight</strong> is Dusk's public account model. Each account has a visible balance, and each transfer shows who sent how much to whom, like a bank statement anyone can read.</p>
<p>That's useful when transparency is the point, such as a public treasury that anyone should be able to audit.</p>`,
        question: 'You pay the Hatchery 25 DUSK from a Moonlight account. Who can see the amount?',
        choices: [
          {id: 'you', text: 'Only you and the Hatchery.', why: 'That\'s what shielded transfers are for. Moonlight transfers are public.'},
          {id: 'anyone', right: true, text: 'Anyone reading the chain.', why: 'Right. Moonlight is public by design.'},
          {id: 'nodes', text: 'Only provisioner nodes.', why: 'Moonlight transfers are visible to everyone who reads the chain, not just nodes.'},
        ],
      },
      {
        id: 'proofs', kind: 'quiz', title: 'Proving without showing', visual: 'proof',
        body: `<p>A <strong>zero-knowledge proof</strong> shows that a statement is true without revealing the private inputs behind it.</p>
<p>Say your Duskling has a secret <strong>strength</strong>, a secret <strong>agility</strong> and a public <strong>power</strong> of 9. You can prove that strength + agility = 9 without revealing either number.</p>
<p class="aside">A proof only covers its own statement. It doesn't show that the numbers came from somewhere trustworthy; Level 3 deals with that.</p>`,
        question: 'The arena verifies your proof that strength + agility = 9. What does it learn?',
        choices: [
          {id: 'numbers', text: 'Your exact strength and agility.', why: 'Those stay private. That\'s the whole point of the proof.'},
          {id: 'statement', right: true, text: 'That your hidden scores add up to 9, and nothing more about them.', why: 'Right. The statement is shown to be true while the inputs stay secret.'},
          {id: 'fair', text: 'That the scores were earned fairly.', why: 'The proof only covers the sum. Where the numbers came from is a separate question.'},
        ],
      },
      {
        id: 'phoenix', kind: 'quiz', title: 'Phoenix: shielded notes', visual: 'transfer-phoenix',
        body: `<p><strong>Phoenix</strong> is Dusk's shielded model. Instead of a public balance, you hold <strong>notes</strong>: pieces of value that only you can spend. A Phoenix transfer hides who paid whom and how much.</p>
<p>So each transfer carries a zero-knowledge proof. Without revealing which notes you spend or how much they hold, it shows that:</p>
<ul><li>every note you spend exists: it's in the tree of all notes on the chain,</li>
<li>you own it: you hold its secret key,</li>
<li>each spent note's <strong>nullifier</strong> is worked out correctly (more on that next),</li>
<li>the new notes are made correctly, and</li>
<li>the amounts add up: what goes in equals what comes out, plus the fee and anything paid into a contract.</li></ul>`,
        question: 'If a Phoenix transfer hides the amounts, how does the network know you aren\'t spending DUSK you don\'t have?',
        choices: [
          {id: 'trust', text: 'It trusts your wallet.', why: 'No wallet is trusted blindly. The rules are checked mathematically.'},
          {id: 'later', text: 'It checks the amounts later, in secret.', why: 'Nothing is checked later in secret. The proof is verified before the transfer is accepted.'},
          {id: 'proof', right: true, text: 'The transfer carries a zero-knowledge proof that it follows the rules.', why: 'Right. The network checks the proof instead of the private details.'},
        ],
      },
      {
        id: 'spent-once', kind: 'quiz', title: 'Spent once',
        body: `<p>Nobody can see which note you spend, so the chain can't simply mark it as spent. Instead, spending a note reveals its <strong>nullifier</strong>: a tag worked out from the note's secret key and its place in the tree of notes.</p>
<p>Only the note's owner can compute it, and nobody else can tell which note it belongs to. The proof shows it was worked out correctly, so each note has exactly one. The transfer contract keeps every nullifier it has seen and rejects any transaction that repeats one.</p>`,
        question: 'Nobody can see which note you spent. What stops you from spending it again?',
        choices: [
          {id: 'mark', text: 'The chain marks that note as spent.', why: 'That would reveal which note you spent. Phoenix never points at the note.'},
          {id: 'nullifier', right: true, text: 'Its nullifier: the transfer contract rejects any nullifier it has already seen.', why: 'Right. The same note always gives the same nullifier, and nobody can link that nullifier back to the note.'},
          {id: 'wallet', text: 'Your wallet remembers it and refuses.', why: 'A wallet can be changed or bypassed. The chain enforces the rule.'},
        ],
      },
      {
        id: 'sender', kind: 'quiz', title: 'Who called?',
        body: `<p>Contracts can see how they were called. <code>abi::public_sender()</code> returns the sender's public account for a Moonlight transaction, and nothing at all for a shielded Phoenix one.</p>
<p>So a contract that needs to know who called it has to decide, on purpose, what to do when the caller is private.</p>`,
        question: 'A contract calls abi::public_sender() during a shielded Phoenix transaction. What does it get?',
        choices: [
          {id: 'none', right: true, text: 'Nothing, because there\'s no public sender to show.', why: 'Right. The contract has to handle that case deliberately, and a private caller can still prove who they are, as the next question shows.'},
          {id: 'real', text: 'The sender\'s account, decrypted.', why: 'Contracts can\'t unshield a Phoenix transaction.'},
          {id: 'error', text: 'The transaction is always rejected.', why: 'It isn\'t rejected. The contract simply gets no public sender, and its own logic decides what happens next.'},
        ],
      },
      {
        id: 'signed', kind: 'quiz', title: 'Signed, not seen',
        body: `<p>A shielded caller can still prove who they are. Instead of asking for the sender, the contract takes a <strong>signature</strong> as part of the call and checks it with a host function: <code>abi::verify_bls</code> for account keys, or <code>abi::verify_schnorr</code> for the one-time key of a Phoenix address.</p>
<p>Dusk's own genesis contracts work this way. The stake contract never asks who sent a stake: every stake carries signatures from the stake's keys. And before the transfer contract pays out to a Phoenix address, it checks a Schnorr signature from that address's one-time key.</p>
<p class="aside">Sign something that only works once, or anyone could replay an old signature. The transfer contract's signed message includes the transaction's nullifiers, or the Moonlight nonce.</p>`,
        question: 'The Hatchery wants keepers on shielded transactions to prove they own their Duskling before it battles. How?',
        choices: [
          {id: 'reveal', text: 'Ask the network to reveal the shielded sender.', why: 'Nobody can unshield a Phoenix transaction, not even the network.'},
          {id: 'sign', right: true, text: 'Take a signature from the keeper\'s key in the call, and check it with abi::verify_bls.', why: 'Right. That\'s how Dusk\'s stake and transfer contracts handle callers they can\'t see. The keeper proves they hold the key, and the rest of the transaction stays shielded.'},
          {id: 'never', text: 'Nothing. Shielded callers can never be identified.', why: 'They can choose to prove who they are. A signature shows they hold the right key.'},
        ],
      },
      {
        id: 'zk-apps', kind: 'quiz', title: 'Build your own private apps', visual: 'zk',
        body: `<p>Zero-knowledge proofs aren't only for Dusk's own transfers. Developers can use them too, which is what makes privacy-preserving dApps possible on Dusk.</p>
<ul><li>You write a <strong>circuit</strong> with <code>dusk-plonk</code> describing what must be true.</li>
<li>The user's device creates a <strong>proof</strong> from their private data.</li>
<li>Your contract checks it with the <code>abi::verify_plonk</code> host function. Poseidon, the hash behind <code>abi::poseidon_hash</code>, is designed to be cheap inside circuits, so contracts and circuits can agree on the same hashes.</li></ul>
<p>That covers things like private voting, sealed bids, eligibility checks and secret game moves: the contract enforces the rule, and the private data never goes on-chain.</p>`,
        question: 'A game wants keepers to prove their Duskling\'s power is at least 50 without revealing its stats. How can that work on Dusk?',
        choices: [
          {id: 'send', text: 'The keeper sends the stats to the contract, which keeps them secret.', why: 'Contract state isn\'t secret. Remember: public means public.'},
          {id: 'verify', right: true, text: 'The keeper\'s device creates a PLONK proof, and the contract verifies it with abi::verify_plonk.', why: 'Right. The contract checks the rule without ever seeing the stats.'},
          {id: 'phoenix', text: 'It can\'t. Only Phoenix transfers can use zero-knowledge proofs.', why: 'Any contract can verify PLONK proofs. That\'s what makes private dApps possible.'},
        ],
      },
      {
        id: 'design', kind: 'quiz', title: 'Privacy is designed',
        body: `<p>Moonlight and Phoenix are about moving DUSK. Neither one makes a contract's own data private.</p>
<p>Each contract decides for itself what's public, what stays private and how it's checked. Privacy is something you design in, not a default you get for free.</p>`,
        question: 'Which statement should the Hatchery\'s developer rely on?',
        choices: [
          {id: 'auto', text: 'Every Dusk transaction and contract field is private by default.', why: 'Moonlight transfers are public, and contract state is only as private as its design.'},
          {id: 'evm', text: 'Only EVM contracts can use privacy on Dusk.', why: 'Privacy on Dusk isn\'t tied to the EVM.'},
          {id: 'explicit', right: true, text: 'Moonlight is public and Phoenix shields transfers. Contract privacy needs its own design.', why: 'Exactly.'},
        ],
      },
      {
        id: 'cloak', kind: 'finale', title: 'A cloak for the shadows', visual: 'reward',
        wick: `Here, a shadow cloak for your Duskling. Wear it as a reminder: privacy is designed, not assumed.`,
        body: `<p>You can now tell public from shielded, spot the metadata that gives people away, explain what a zero-knowledge proof does and doesn't show, and describe how contracts verify proofs to build private apps.</p>`,
      },
    ],
  },
  {
    id: 'papers', title: 'Papers, please', topic: 'Identity and credentials', reward: 'badge',
    chapters: [
      {
        id: 'arena', kind: 'intro', title: 'The Night Arena', visual: 'level',
        wick: `The Night Arena opens tonight, and only licensed keepers get in. Let's get your papers in order without handing over your life story.`,
        body: `<p>Level 3 covers identity and compliance: credentials, Dusk's Citadel protocol, selective disclosure, and why a valid proof still needs rules around it.</p>`,
      },
      {
        id: 'claims', kind: 'quiz', title: 'Who vouches for you?',
        body: `<p>Typing “I'm licensed” at the arena gate is only a claim. A <strong>credential</strong> ties that claim to an <strong>issuer</strong> the arena is prepared to trust, here the Keepers' Guild.</p>
<p>A credential is only as good as its issuer. The arena decides which issuers it accepts.</p>`,
        question: 'A keeper at the arena gate says “Trust me, I\'m licensed.” What turns that claim into something the arena can check?',
        choices: [
          {id: 'credential', right: true, text: 'A credential from an issuer the arena trusts, which the keeper can prove they hold.', why: 'Right. The Guild vouches for it, and the keeper proves it.'},
          {id: 'wallet', text: 'Connecting a wallet.', why: 'A wallet shows you control a key. It doesn\'t show that the Guild licensed you.'},
          {id: 'signed', text: 'Signing the claim with their own key.', why: 'A signature shows which key made the claim, not that anyone trustworthy agrees with it.'},
        ],
      },
      {
        id: 'citadel', kind: 'quiz', title: 'How Citadel works', visual: 'citadel',
        body: `<p><strong>Citadel 2</strong> is Dusk's private credential protocol. It involves three parties: the keeper, a license provider (the Guild) and a service (the arena).</p>
<p>The Guild checks the keeper off-chain, signs the relevant attributes and registers a license. The keeper then proves to the arena that they hold a valid license. The arena never sees the documents the Guild checked.</p>`,
        question: 'In a Citadel flow, who looks at the keeper\'s identity documents?',
        choices: [
          {id: 'arena', text: 'The arena, at the gate.', why: 'The arena gets a proof of a valid license, not the documents.'},
          {id: 'guild', right: true, text: 'The license provider, off-chain, before it issues the license.', why: 'Right. The arena only ever sees a proof.'},
          {id: 'chain', text: 'Everyone, because the documents are stored on-chain.', why: 'Identity documents never go on-chain in this flow.'},
        ],
      },
      {
        id: 'documents', kind: 'quiz', title: 'Keep documents off-chain',
        body: `<p>Sensitive attributes belong <strong>off-chain</strong>. Where the protocol supports it, verify the required claim and disclose only what the service needs.</p>
<p>Off-chain storage still needs access controls and a retention policy. Make this decision before publishing: privacy can't be added later to data that's already public.</p>`,
        question: 'Which design avoids publishing a keeper\'s identity document?',
        choices: [
          {id: 'hide', text: 'Store the document in a contract and hide it on the website.', why: 'Hiding it on the website doesn\'t remove it from the chain.'},
          {id: 'later', text: 'Publish it now and add privacy to the contract later.', why: 'Once it\'s public, it stays public. Privacy can\'t be added afterwards.'},
          {id: 'proof', right: true, text: 'Keep it off-chain and verify the required claim with a credential proof.', why: 'Right. Prove the claim, keep the document.'},
        ],
      },
      {
        id: 'disclosure', kind: 'quiz', title: 'Show only what\'s needed', visual: 'license',
        body: `<p><strong>Selective disclosure</strong> means revealing only the fact a service needs, or proving a condition, instead of handing over a whole record.</p>
<p>The arena's rule is “holds a valid Guild license.” It doesn't need your name, birthday or address, so it shouldn't ask for them.</p>`,
        question: 'What should the arena ask keepers to show?',
        choices: [
          {id: 'everything', text: 'Every attribute, because more data means more safety.', why: 'More data means more to leak and more to protect, and the rule doesn\'t need it.'},
          {id: 'minimum', right: true, text: 'Proof of what its rule requires, a valid Guild license, and nothing else.', why: 'Right. Ask for the evidence the rule needs, not the whole identity.'},
          {id: 'nothing', text: 'Nothing. Connecting a wallet proves eligibility.', why: 'A wallet connection says nothing about a Guild license.'},
        ],
      },
      {
        id: 'unlinkable', kind: 'quiz', title: 'Hard to follow',
        body: `<p>A Citadel proof shows that you hold a valid license without revealing <em>which</em> license. If every visit revealed the same license ID, services could compare notes and follow you around.</p>
<p>A proof can still expose public inputs or metadata, so apps have to think about those too.</p>`,
        question: 'Why does it help that the arena can\'t tell which license you used?',
        choices: [
          {id: 'forgery', text: 'It makes licenses impossible to forge.', why: 'Forgery is prevented by the Guild\'s signature and the proof, not by hiding the license ID.'},
          {id: 'faster', text: 'It makes the gate faster.', why: 'Speed isn\'t the point. Hiding the license ID is about privacy.'},
          {id: 'tracking', right: true, text: 'Your visits can\'t be linked together through a shared license ID.', why: 'Right. Less linkable data means less tracking.'},
        ],
      },
      {
        id: 'expiry', kind: 'quiz', title: 'Valid isn\'t forever',
        body: `<p>A proof doesn't decide how long access lasts, or whether the same proof can be used twice. The service needs real rules for <strong>expiry</strong>, <strong>revocation</strong> and <strong>replay</strong>.</p>
<p>Evidence meant for a different service, or a one-time session that was already used, shouldn't quietly grant fresh access. Writing a policy down isn't the same as enforcing it.</p>`,
        question: 'A keeper\'s session is cryptographically valid, but the arena\'s policy says it expired yesterday. Let them in?',
        choices: [
          {id: 'reject', right: true, text: 'No. The session must also satisfy the arena\'s current policy.', why: 'Right. A valid proof is necessary, but not sufficient.'},
          {id: 'grant', text: 'Yes. Cryptographic validity overrides the policy.', why: 'The math says the proof is genuine. The policy decides whether it\'s still acceptable.'},
          {id: 'publish', text: 'Only if they publish their full identity.', why: 'That throws away the privacy the proof gave them.'},
        ],
      },
      {
        id: 'checks', kind: 'quiz', title: 'The gate\'s checklist',
        body: `<p>Put it all together: a signature, a public state change and a private credential proof are different things, and none of them is a universal “compliant” stamp.</p>
<p>The service still decides which issuers it trusts, which claims it needs, and how it handles expiry, revocation and replay.</p>`,
        question: 'A keeper\'s license proof verifies. What must the arena still check before opening the gate?',
        choices: [
          {id: 'accept', text: 'Nothing. A valid proof is enough.', why: 'A valid proof is necessary, but it isn\'t enough on its own.'},
          {id: 'policy', right: true, text: 'That the issuer is trusted, the license isn\'t expired or revoked, and the proof hasn\'t already been used here.', why: 'Right. Privacy and rules work together.'},
          {id: 'collect', text: 'The keeper\'s full identity, published on-chain.', why: 'That undoes everything the credential was for.'},
        ],
      },
      {
        id: 'badge', kind: 'finale', title: 'Welcome to the Guild', visual: 'reward',
        wick: `The Guild's badge, for your Duskling. It shows you belong without telling anyone who you are.`,
        body: `<p>You know the difference between a claim and a credential, how Citadel keeps documents off-chain, and why a valid proof still needs rules around it.</p>`,
      },
    ],
  },
  {
    id: 'market', title: 'The market', topic: 'Regulated assets', reward: 'satchel',
    chapters: [
      {
        id: 'stalls', kind: 'intro', title: 'The harbor market', visual: 'level',
        wick: `The harbor market is where real value changes hands: shares, bonds and funds. Markets like these come with strict rules, and Dusk was built with them in mind.`,
        body: `<p>Level 4 covers regulated assets: what a token is and isn't, how rules and eligibility travel with an asset, why markets need confidentiality (and auditors), and how trades settle.</p>`,
      },
      {
        id: 'tokens', kind: 'quiz', title: 'What a token is',
        body: `<p>A <strong>token</strong> is an entry in a contract that records who holds how much of something. It can represent a real asset, such as a share or a bond.</p>
<p>The software alone doesn't create the legal rights. Those come from legal agreements and a properly authorised issuer. The token records ownership and enforces the rules the issuer sets.</p>`,
        question: 'A contract mints a token called Harbor Bond. What makes it an actual bond?',
        choices: [
          {id: 'name', text: 'Its name.', why: 'Calling a token a bond doesn\'t make it one.'},
          {id: 'legal', right: true, text: 'The legal agreement and the authorised issuer behind it.', why: 'Right. The token tracks ownership, and the law defines the rights.'},
          {id: 'price', text: 'Being traded at a price.', why: 'Anything can have a price. Legal rights come from the agreement behind it.'},
        ],
      },
      {
        id: 'rules', kind: 'quiz', title: 'Rules travel with the asset',
        body: `<p>Securities come with rules: who may hold them, how many holders there can be, when they can be transferred.</p>
<p>On Dusk, those rules can live in the asset's contract, so every transfer is checked, whichever app sent it. Remember Level 1: a website can be skipped, but a contract can't.</p>`,
        question: 'A bond may only be held by approved investors. Where should that rule be enforced?',
        choices: [
          {id: 'website', text: 'In the trading website.', why: 'Other apps can call the contract directly and skip your website.'},
          {id: 'manual', text: 'By emailing buyers a reminder.', why: 'A reminder isn\'t enforcement.'},
          {id: 'contract', right: true, text: 'In the bond\'s contract, on every transfer.', why: 'Right. The contract is the one place every transfer passes through.'},
        ],
      },
      {
        id: 'eligible', kind: 'quiz', title: 'Proving you may buy',
        body: `<p>How does the contract know a buyer is approved without putting their identity on-chain? Level 3 comes back here.</p>
<p>The buyer proves they hold a valid credential from an issuer the asset trusts. The contract checks the proof, not the person's documents.</p>`,
        question: 'How can a buyer show they\'re an approved investor without publishing their identity?',
        choices: [
          {id: 'credential', right: true, text: 'Prove they hold a valid credential from a trusted issuer.', why: 'Right. Eligibility is proven while identity stays private.'},
          {id: 'passport', text: 'Upload their passport to the contract.', why: 'That publishes exactly what we wanted to keep private.'},
          {id: 'wallet', text: 'Connect a wallet with a large balance.', why: 'A balance says nothing about whether someone is approved.'},
        ],
      },
      {
        id: 'confidential', kind: 'quiz', title: 'Why markets need privacy',
        body: `<p>On a fully public chain, everyone sees every position and every trade as it happens. For a fund, that's a problem: others can read its strategy and trade ahead of it, and its clients' holdings are exposed.</p>
<p>Regulated markets need confidentiality for participants while the rules are still enforced.</p>`,
        question: 'A fund\'s trades are all public in real time. What\'s the risk?',
        choices: [
          {id: 'none', text: 'None. Transparency is always good.', why: 'It\'s good for the rules to be transparent, but exposing every participant\'s positions isn\'t.'},
          {id: 'frontrun', right: true, text: 'Others can see its moves and trade ahead of them, and its clients\' holdings are exposed.', why: 'Right. That\'s why confidentiality matters in markets.'},
          {id: 'slower', text: 'Its trades settle more slowly.', why: 'Visibility doesn\'t change how fast trades settle. It changes who knows what.'},
        ],
      },
      {
        id: 'auditor', kind: 'quiz', title: 'Showing the auditor',
        body: `<p>Confidential doesn't have to mean hidden from everyone. Regulated firms have auditors who need to check what they hold.</p>
<p>Phoenix has <strong>view keys</strong> for this. A view key can find the notes that belong to an account and read what they're worth, but it can't spend them; spending needs the secret key. A fund can give its auditor a view key while the rest of the world still sees nothing.</p>`,
        question: 'An auditor needs to check a fund\'s shielded holdings. What can the fund safely share?',
        choices: [
          {id: 'secret', text: 'Its secret key, so the auditor can look at everything.', why: 'A secret key can spend the funds. Never hand it over for an audit.'},
          {id: 'public', text: 'Nothing. It has to move everything to a public account first.', why: 'It doesn\'t need to give up privacy for everyone just to show one auditor.'},
          {id: 'view', right: true, text: 'A view key, which lets the auditor see its notes and their values but not spend them.', why: 'Right. Read access for the auditor, and privacy for everyone else.'},
        ],
      },
      {
        id: 'atomic', kind: 'quiz', title: 'Both sides or neither', visual: 'dvp',
        body: `<p>A trade has two sides: the asset goes to the buyer and the payment goes to the seller. If both happen in one contract call, and a failure on either side fails the whole call, they succeed or fail together.</p>
<p>This is called <strong>delivery versus payment</strong>. It removes the risk of one side delivering while the other doesn't.</p>
<p class="aside">The contract has to treat a failed payment as fatal, for example with <code>expect</code>. If it ignored the error from another contract, the bond could still move.</p>`,
        question: 'A single contract call moves the bond to the buyer and DUSK to the seller. The payment fails. What happens to the bond?',
        choices: [
          {id: 'moved', text: 'The buyer keeps it.', why: 'Then the seller would lose the bond without being paid.'},
          {id: 'rollback', right: true, text: 'Its transfer is rolled back too, because the failed payment fails the whole call.', why: 'Right. Either both sides move or neither does.'},
          {id: 'split', text: 'It\'s split between them.', why: 'Nothing gets split. A call that fails rolls back all of its changes.'},
        ],
      },
      {
        id: 'settled', kind: 'quiz', title: 'When a trade is done',
        body: `<p>For a market, a trade only counts once it can't be undone. On Dusk, a block becomes <strong>final</strong> through consensus, which you'll see in Level 5. After that, it can't be replaced.</p>
<p>Final settlement lets both sides rely on the trade right away, instead of waiting for separate systems to reconcile.</p>`,
        question: 'Why does a market care whether a block is final?',
        choices: [
          {id: 'fees', text: 'Final blocks have lower fees.', why: 'Finality is about certainty, not cost.'},
          {id: 'private', text: 'Final blocks are private.', why: 'Finality says nothing about privacy.'},
          {id: 'final', right: true, text: 'A final trade can\'t be replaced, so both sides can rely on it.', why: 'Right.'},
        ],
      },
      {
        id: 'satchel', kind: 'finale', title: 'Open for business', visual: 'reward',
        wick: `A merchant's satchel for your Duskling. You know what's inside a trade now, and what has to stay inside.`,
        body: `<p>You can explain what a token does and doesn't prove, where an asset's rules belong, why markets need confidentiality and how auditors still get to look, and why settlement has to be all-or-nothing and final.</p>`,
      },
    ],
  },
  {
    id: 'lighthouse', title: 'The lighthouse', topic: 'The network', reward: 'lantern',
    chapters: [
      {
        id: 'keepers-of-light', kind: 'intro', title: 'Who keeps the light on?', visual: 'level',
        wick: `Last stop: the lighthouse. It never goes dark, and neither does the network that keeps the ledger. Let's see who keeps it running.`,
        body: `<p>Level 5 covers the network itself: nodes, how messages spread, provisioners and staking, and how Succinct Attestation turns votes into final blocks.</p>`,
      },
      {
        id: 'nodes', kind: 'quiz', title: 'What a node does',
        body: `<p>Dusk nodes run <strong>Rusk</strong>, Dusk's node software. Each node keeps a copy of the chain, checks new transactions and blocks against the rules, runs contracts, and passes messages to other nodes.</p>
<p>Because every node checks for itself, nobody has to take a single server's word for the state of the chain.</p>`,
        question: 'What does a Dusk node do?',
        choices: [
          {id: 'copy', right: true, text: 'Keeps a copy of the chain, checks blocks against the rules and relays messages.', why: 'Right.'},
          {id: 'wallet', text: 'Stores everyone\'s private keys.', why: 'Your keys stay in your wallet. Nodes never need them.'},
          {id: 'website', text: 'Hosts dApp websites.', why: 'Websites live elsewhere. Nodes keep and check the ledger.'},
        ],
      },
      {
        id: 'kadcast', kind: 'quiz', title: 'Spreading the word',
        body: `<p>New transactions and blocks have to reach every node quickly. Dusk uses <strong>Kadcast</strong>, a structured broadcast protocol.</p>
<p>Nodes are organised into a routing structure, and each message is passed along it. It spreads quickly without every node sending it to every other node.</p>`,
        question: 'Why use a structured broadcast like Kadcast?',
        choices: [
          {id: 'secret', text: 'It keeps transactions secret.', why: 'Kadcast is about delivery, not privacy. Privacy comes from Phoenix and proofs.'},
          {id: 'efficient', right: true, text: 'Messages reach every node quickly, with far less duplicate traffic than flooding.', why: 'Right.'},
          {id: 'central', text: 'It routes everything through one central server.', why: 'There\'s no central server. That\'s the point of a network.'},
        ],
      },
      {
        id: 'provisioners', kind: 'quiz', title: 'Provisioners',
        body: `<p><strong>Provisioners</strong> are the nodes that take part in consensus. To become one, a node stakes DUSK, at least 1,000 DUSK by default.</p>
<p>Staked DUSK is a commitment: provisioners earn rewards for doing their job and risk penalties for failing it.</p>`,
        question: 'What makes a node a provisioner?',
        choices: [
          {id: 'fast', text: 'It has the fastest internet connection.', why: 'Speed helps, but taking part requires stake.'},
          {id: 'approved', text: 'A central authority approves it.', why: 'No approval is needed. The stake is the ticket in.'},
          {id: 'stake', right: true, text: 'It stakes DUSK to take part in consensus.', why: 'Right.'},
        ],
      },
      {
        id: 'sortition', kind: 'quiz', title: 'Drawing the committee', visual: 'sortition',
        body: `<p>For each step of consensus, a committee of provisioners is chosen by <strong>deterministic sortition</strong>: a lottery weighted by stake, seeded so that every node computes the same result.</p>
<p>More stake means more chances. Nobody picks the committee by hand.</p>`,
        question: 'How are committee members chosen?',
        choices: [
          {id: 'lottery', right: true, text: 'By a stake-weighted lottery that every node can recompute.', why: 'Right. Because it\'s deterministic, every node agrees on the result.'},
          {id: 'richest', text: 'The provisioners with the most stake, every time.', why: 'More stake gives more chances, not a guaranteed seat.'},
          {id: 'vote', text: 'By a public vote of DUSK holders each round.', why: 'There\'s no vote each round. Sortition decides.'},
        ],
      },
      {
        id: 'attestation', kind: 'quiz', title: 'Succinct Attestation', visual: 'steps',
        body: `<p><strong>Succinct Attestation</strong> is Dusk's consensus protocol. Each attempt to add a block, called an <strong>iteration</strong>, has three steps: one chosen provisioner <strong>proposes</strong> a block, a committee <strong>validates</strong> it, and another committee <strong>ratifies</strong> the result. If an attempt fails, a new one starts with fresh committees.</p>
<p>Votes are signed with BLS signatures and combined into one compact attestation. A block that gets enough stake-weighted votes on the first attempt is attested. As more blocks are built on top of it, it becomes confirmed and then <strong>final</strong>.</p>`,
        question: 'What happens after a block is proposed in Succinct Attestation?',
        choices: [
          {id: 'final', text: 'It\'s final immediately.', why: 'A proposal is only a candidate until the committees vote on it.'},
          {id: 'steps', right: true, text: 'One committee validates it, another ratifies it, and enough votes attest it.', why: 'Right: proposal, validation, ratification.'},
          {id: 'miners', text: 'Miners race to solve a puzzle.', why: 'That\'s proof of work. Dusk uses proof of stake with committees.'},
        ],
      },
      {
        id: 'faults', kind: 'quiz', title: 'Missing a turn',
        body: `<p>Provisioners are rewarded for doing their job and penalised for failing it. If a provisioner chosen to propose a block produces nothing, that's a <strong>fault</strong>. The first one is only a warning. After that, the provisioner is suspended for a while and part of its stake is <strong>locked</strong>.</p>
<p>Dusk treats every fault this way, as a <strong>soft</strong> fault: a provisioner that fails its job is sidelined for a while and part of its stake is locked, not burned.</p>`,
        question: 'A provisioner is chosen to propose a block several times and never does. What happens?',
        choices: [
          {id: 'nothing', text: 'Nothing. Missing a turn is free.', why: 'A missed turn costs the network time, so it\'s penalised.'},
          {id: 'soft', right: true, text: 'After a warning, it\'s suspended for a while and part of its stake is locked.', why: 'Right. Dusk treats every fault as a soft fault: a suspension and locked stake, not burned stake.'},
          {id: 'banned', text: 'It\'s banned forever and loses all its stake.', why: 'Faults lead to a suspension and locked stake, not a ban. Dusk doesn\'t burn provisioners\' stake.'},
        ],
      },
      {
        id: 'dusk-token', kind: 'quiz', title: 'What DUSK is for',
        body: `<p><strong>DUSK</strong> is the network's native token. It pays for gas, so every transaction and contract call is paid for in DUSK. It's also what provisioners stake to secure the network and earn rewards.</p>
<p>Moonlight and Phoenix are two ways of holding and moving the same DUSK.</p>`,
        question: 'What is DUSK used for on the network?',
        choices: [
          {id: 'vote', text: 'Only for voting on proposals.', why: 'DUSK pays for gas and secures consensus through staking.'},
          {id: 'fees-stake', right: true, text: 'Paying transaction fees, and staking by provisioners.', why: 'Right.'},
          {id: 'nothing', text: 'Nothing. It\'s just a collectible.', why: 'Every transaction pays its fee in DUSK.'},
        ],
      },
      {
        id: 'lantern', kind: 'finale', title: 'The light stays on', visual: 'reward',
        wick: `The lighthouse's own lantern, for your Duskling. You've walked the whole harbor, keeper. Where to next?`,
        body: `<p>You've finished the keeper's journey: the ledger, privacy, credentials, markets and the network that runs them all.</p>
<p>Next, try building. The paths are independent, so start wherever you like.</p>`,
      },
    ],
  },
];

export const chapters = levels.flatMap((level, l) => level.chapters.map(c => ({...c, level: l})));
export const levelQuizzes = l => chapters.filter(c => c.level === l && c.kind === 'quiz');
