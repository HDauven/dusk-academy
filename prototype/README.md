# Dusklings prototype

A CryptoZombies-style redesign of Dusk Academy. It doesn't replace the academy at the repo root yet, and nothing outside this folder links to it.

```sh
npm run dev   # then open http://localhost:5173/prototype/
```

| Page | What it is |
|---|---|
| `index.html` | Home: harbor scene, the four paths with level maps and progress, and your Duskling wearing its gear |
| `journey.html` | **Start with Dusk, the keeper's journey** (no code): 5 levels and 35 questions. Right answers light lanterns. Level 1 hatches your Duskling, and each later level earns it gear. |
| `hatchery.html` | **Contracts, Lesson 1: The Hatchery**: 12 code chapters, each one small edit |
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
- `lesson1.js` + `app.js`: Hatchery chapters, reference files, checks, error messages, and the lesson screen.
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

## Proposed course map

1. **The Hatchery** (built): contracts, constants, u64 math, structs, vectors, methods, private helpers, return values, wrapping arithmetic, events.
2. **Keepers**: who owns a Duskling. `abi::public_sender()` returns the sender of a public (Moonlight) transaction and `None` for a shielded (Phoenix) one, so ownership raises a real Dusk choice between public keepers and private hatching. Also covers `assert!` and one free hatch per keeper.
3. **Moth hunt**: feeding on moths from another contract with `abi::call`, blending DNA, and a rare moth-born trait.
4. **Night battles**: levels, cooldowns with `abi::block_height()`, and the limits of on-chain randomness.
5. **Trading**: transfers, approvals and ownership events.
- **dApp path, The Almanac**: Dusk Connect reads Dusklings, listens for `hatched` events and prepares an unsigned `hatch` call.
- **Circuit path, Secret stats**: prove a Duskling's hidden strength plus agility equals its public power score without revealing either. This is the existing PLONK sum circuit and engine with a new skin.

## Not done yet

- The Lesson 1 Rust hasn't been compiled with Forge. It follows the rules in `dusk-forge-contract` 0.2 (exactly one `pub struct`, private record types) and the `dusk-core` 1.6 host functions, but native conformance cases still need adding.
- No migration from the classic academy's saves. The new paths use their own storage keys.
- The dApp and circuit paths, and contract lessons 2–5, appear on the home page as “soon”.
- Wick, the narrator, is a Duskling with fixed DNA, not bespoke art.
