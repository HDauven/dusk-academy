# Dusklings prototype

A CryptoZombies-style redesign of Dusk Academy. It doesn't replace the academy at the repo root yet, and nothing outside this folder links to it.

```sh
npm run dev   # then open http://localhost:5173/prototype/
```

| Page | What it is |
|---|---|
| `index.html` | Home: harbor scene, the four paths with level maps and progress, and your Duskling wearing its gear |
| `journey.html` | **Start with Dusk, the keeper's journey** (no code): 5 levels and 36 questions. Right answers light lanterns. Level 1 hatches your Duskling, and each later level earns it gear. |
| `hatchery.html` | **Contracts: the Hatchery**, five lessons and 40 code chapters on one growing `lib.rs`, each chapter one small edit, with a playground finale per lesson |
| `creatures.html` | Developer sheet showing every creature trait and piece of gear |

## What changed from the current academy

| Current academy | Prototype |
|---|---|
| Counts registrations. The pixel art is decoration. | Your contract's state is drawn live: eggs hatch into Dusklings made from the DNA your code computes. |
| First edit in chapter 7; 22 of 83 chapters have code | First edit in chapter 2; 12 of 14 chapters are one small edit each |
| Same file all path long, no answers | Each chapter starts from the reference file; Hint and Show answer (diff and "Use this code") on every task |
| Runtime disclaimers repeated four times per screen | One "Runs in your browser" note in the editor tab bar |
| Page layout with scrolling and a chapter strip | Full-screen game layout: scene and story on the left, editor on the right, a bottom bar with progress |

Checks still run the real Rust-subset interpreter (`academy/rust-runtime.js`) and grade what the contract does, not the text.

## Files

- `creature.js`: 16 DNA digits become a 32×32 pixel Duskling. Each digit pair picks a trait.
- `scene.js`: 192×108 pixel scenes: the hatchery (nests and hatching eggs) and the harbor (lighthouse, lanterns, boats).
- `lesson1.js` … `lesson5.js`: Hatchery chapters with reference files and behavioural checks. `course.js` joins them, and `app.js` is the lesson screen, including the playgrounds.
- `hatchery-file.js`: builds each chapter's reference `lib.rs` from named parts, so the chapters stay consistent.
- `contract.js`: runs a contract in the Rust-subset interpreter with simulated Dusk hosts: `abi::emit`, `abi::public_sender` (you, Rook, Fen, or shielded), `abi::block_height`, and `abi::call` to a Moth Nest contract. It also holds the learner-facing error messages.
- `lessons.test.mjs`: part of `npm test`. Every answer passes, every start fails with a readable message, and each chapter chains onto the last.
- `journey.js` + `quiz.js`: journey content and the quiz screen with its small diagrams (Moonlight/Phoenix, proof cards, Citadel flow, license disclosure, delivery versus payment, stake-weighted sortition, and others).
- `home.js`: the home page.
- `store.js`: per-browser progress (`dusk-academy:journey:v1` and `dusk-academy:hatchery:v1`) and one shared Duskling (`dusk-academy:keeper:v1`: name, DNA, gear). Any read or write can fail without breaking the page.

## The keeper's journey

| Level | Topic | Reward |
|---|---|---|
| 1 · First egg | Ledger, state vs. display, keys, recovery phrase, transactions, gas, contracts | Your Duskling hatches (reference Hatchery contract, name → seed → DNA) |
| 2 · Out of sight | Public data, metadata, Moonlight, Phoenix notes, `public_sender()`, zero-knowledge proofs, building private dApps (`verify_plonk`) | Shadow cloak |
| 3 · Papers, please | Claims vs. credentials, Citadel 2, off-chain documents, selective disclosure, unlinkability, expiry and policy | Guild badge |
| 4 · The market | Tokens vs. legal rights, rules in contracts, eligibility proofs, confidentiality, view keys for auditors, delivery versus payment, finality | Merchant's satchel |
| 5 · The lighthouse | Nodes (Rusk), Kadcast, provisioners and the 1,000 DUSK minimum stake, deterministic sortition, Succinct Attestation, soft and hard faults, the DUSK token | Lighthouse lantern |

Levels 1–3 follow the vetted classic "Start with Dusk" lesson. The level 5 network facts were checked against the rusk source (consensus README, `core/src/stake.rs`, stake contract slashing, `node-data` fault and label types). The Hatchery finale hatches the same Duskling for the same name, so the two paths share one creature.

## The Hatchery lessons

| Lesson | Code chapters | Covers | Finale |
|---|---:|---|---|
| 1 · The Hatchery | 12 | `#[dusk_forge::contract]`, constants, u64 math and overflow checks, structs, `Vec`, methods, private helpers, return values, `wrapping_mul`, `abi::emit` | Name and hatch your Duskling |
| 2 · Keepers | 7 | Getters, `Option`/`get`/closures, `abi::public_sender()` and shielded senders, `BlsPublicKey` owners, iterators, `assert!` and rollback | Playground: hatch as you, Rook, or a shielded account |
| 3 · Moth hunt | 7 | `ContractId`, `abi::call::<_, u64>` to another contract, `Result`, blending DNA into moth-born Dusklings (DNA ending in 99), rollback across contracts | Playground: hunt moths |
| 4 · Night battles | 8 | `abi::block_height()` cooldowns, an `only_keeper` helper, win/loss records, why on-chain rolls are predictable, `if`/`else` | Playground: battle and peek at the next roll |
| 5 · Trading | 6 | Transfers, events carrying keys, `Option` approvals, `&mut` borrows, stale approvals | Playground: approve, collect, try the loophole |

Every chapter's reference answer compiles with real dusk-forge 0.3 / dusk-core 1.6, both as a contract and as a data-driver: `npm run test:prototype-rust` (this needs the crate prepared by `npm run setup:forge`). The in-browser checks run the same code in the Rust-subset interpreter.

## Still to build

- **dApp path, The Almanac**: Dusk Connect reads Dusklings, listens for `hatched` events and prepares an unsigned `hatch` call.
- **Circuit path, Secret stats**: prove a Duskling's hidden strength plus agility equals its public power score without revealing either. This is the existing PLONK sum circuit and engine with a new skin.

## Known gaps

- The Rust compiles natively, but native *execution* (running each chapter in DuskVM and comparing traces with the interpreter, as the classic academy does) isn't wired up yet. The Moth Nest also only exists as a simulated fixture.
- No migration from the classic academy's saves. The new paths use their own storage keys.
- The dApp and circuit paths still show as “soon” on the home page.
- Wick, the narrator, is a Duskling with fixed DNA, not bespoke art.
