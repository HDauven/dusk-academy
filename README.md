# Dusk Academy

Learn Dusk by raising Dusklings: pixel creatures made from 16 digits of DNA.

**[Open Dusk Academy](https://hdauven.github.io/dusk-academy/)** · [Source on GitHub](https://github.com/HDauven/dusk-academy)

| Path | Size | What you do |
|---|---|---|
| **Start with Dusk: Keeper's journey** | 5 levels, 36 questions, no code | Hatch your Duskling, then learn how Dusk works: the shared ledger, wallets and transactions; privacy with Moonlight, Phoenix and zero-knowledge proofs; credentials with Citadel; regulated markets; and the network (provisioners, Succinct Attestation). Each level earns gear for your Duskling. |
| **Contracts: the Hatchery** | 5 lessons, 40 code chapters | Write one Dusk Forge contract in Rust that hatches Dusklings, gives them keepers, hunts moths from another contract, battles and trades. Every chapter is one small edit. Each lesson ends in a playground running your own contract. |
| dApps: the Almanac | coming | Read Dusklings from a browser with Dusk Connect. |
| Circuits: Secret stats | coming | Prove a Duskling's hidden stats with a real PLONK proof. |

Everything runs from static files in your browser: no server, wallet, RPC node or account. You get one Duskling, shared across paths, and progress is saved in your browser only.

## Run locally

```sh
git clone https://github.com/HDauven/dusk-academy.git
cd dusk-academy
npm run dev        # python3 -m http.server 5173 --bind 127.0.0.1
```

Then open **http://localhost:5173/**. Any static host works, including from a subdirectory; GitHub Pages serves the root of `main`.

## How the contract lessons are checked

In the browser, the Hatchery runs your edited contract in a **Rust-subset interpreter** (`academy/rust-runtime.js`). It evaluates the source as data: no `eval`, and no JavaScript or host access. Dusk's host functions are simulated: `abi::emit`, `abi::public_sender` (you, Rook, Fen or a shielded sender), `abi::block_height`, and `abi::call` to a Moth Nest contract. Checks grade what the contract *does*: calls, state, events, panics and rollback.

The interpreter isn't rustc or DuskVM. To keep the lessons honest, **every chapter's reference answer also compiles with real Dusk Forge 0.3 and dusk-core 1.6**, as a contract and as a data-driver (`npm run test:rust`). The finished contract lives in [`examples/hatchery`](examples/hatchery), ready to build yourself.

Dusk facts in the journey were checked against the Dusk sources: `dusk-core` host functions, Forge's contract rules, Phoenix view keys, and rusk's consensus, staking and slashing code.

## Checks

```sh
npm test            # interpreter limits and rollback; every chapter passes with its answer and fails from its start
npm run test:e2e    # the whole site over static HTTP in Chromium: every chapter, playgrounds, narrow screens, axe audits
npm run test:rust   # every chapter answer, compiled with the real Rust toolchain and Dusk Forge
```

- **`test:e2e`** needs Playwright (and optionally `@axe-core/playwright`). `CHROMIUM_PATH` picks a Chromium and `NODE_PATH` points at an external `node_modules`.
- **`test:rust`** needs Rust with the `wasm32-unknown-unknown` target. `RUST_TOOLCHAIN=stable` swaps the pinned 1.98.0 for an installed toolchain, and `CARGO_NET_OFFLINE=true` builds from cached crates only.

## Layout

- `index.html`, `journey.html`, `hatchery.html`: the three pages. `creatures.html` is a developer sheet showing every trait and piece of gear.
- `academy/`:
  - Duskling generation and scenes: `creature.js`, `scene.js`
  - Journey content and screen: `journey.js`, `quiz.js`
  - Hatchery lessons: `lesson1.js` … `lesson5.js`, `course.js`, `hatchery-file.js`
  - Contract runner and simulated hosts: `contract.js`, `rust-runtime.js`
  - Hatchery screen: `app.js`; home: `home.js`; progress: `store.js`; styles: `style.css`
- `examples/hatchery/`: the finished contract as a Forge crate.
- `tools/`: the end-to-end test and the Rust compile check.

The classic registration-counter academy was replaced by this one. It's preserved at the git tag `classic-academy`.

## License

Academy code and lesson text are available under the [MIT License](LICENSE). Separately licensed material keeps its own terms:

- [`examples/hatchery`](examples/hatchery) follows the Dusk Forge contract template and is provided under MPL-2.0.
- Manrope and Silkscreen fonts: [Manrope OFL](assets/Manrope-OFL.txt) and [Silkscreen OFL](assets/Silkscreen-OFL.txt).

Dusk names and trademarks remain with their respective owners. This is an independent learning project, not an official Dusk product.
