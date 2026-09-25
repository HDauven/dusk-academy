# Dusklings

Learn Dusk by raising Dusklings: pixel creatures made from 16 digits of DNA.

**[Open Dusklings](https://hdauven.github.io/dusklings/)** · [Source on GitHub](https://github.com/HDauven/dusklings)

| Path | Size | What you do |
|---|---|---|
| **Start with Dusk: Keeper's journey** | 5 levels, 36 questions, no code | Hatch your Duskling, then learn how Dusk works: the shared ledger, wallets and transactions; privacy with Moonlight, Phoenix and zero-knowledge proofs; credentials with Citadel; regulated markets; and the network (provisioners, Succinct Attestation). Each level earns gear for your Duskling. |
| **Contracts: the Hatchery** | 5 lessons, 42 code chapters | Write one Dusk Forge contract in Rust that hatches Dusklings, announces them with registered event types, gives them keepers, hunts moths from another contract, battles and trades. Every chapter is one small edit. Each lesson ends in a playground running your own contract. |
| **dApps: the Almanac** | 2 lessons, 11 code chapters | Build a web page in JavaScript that reads every Duskling from the Hatchery with the real Dusk Connect SDK and the contract's real data-driver, then prepare hatch and transfer calls for a wallet. It covers exact `u64` values, `JSON.rawJSON` and a down node. |
| **Circuits: Secret stats** | 2 lessons, 9 code chapters | Write a dusk-plonk circuit that proves your Duskling's power without revealing its stats, then an arena pass proving power ≥ 50 with a range check. Every check generates and verifies real PLONK proofs in the browser. |

Everything runs from static files in your browser: no server, wallet, RPC node or account. You get one Duskling, shared across paths, and progress is saved in your browser only.

## Run locally

```sh
git clone https://github.com/HDauven/dusklings.git
cd dusklings
npm run dev        # python3 -m http.server 5173 --bind 127.0.0.1
```

Then open **http://localhost:5173/**. Any static host works, including from a subdirectory; GitHub Pages serves the root of `main`.

## How the contract lessons are checked

In the browser, the Hatchery runs your edited contract in a **Rust-subset interpreter** (`academy/rust-runtime.js`). It evaluates the source as data: no `eval`, and no JavaScript or host access. It also enforces Forge's event rules: every emitted event type is registered in `#[dusk_forge::contract(events = [...])]`, with its derives and `ContractEvent` topics. Dusk's host functions are simulated: `abi::emit`, `abi::public_sender` (you, Rook, Fen or a shielded sender), `abi::block_height`, and `abi::call` to a Moth Nest contract. Checks grade what the contract *does*: calls, state, events, panics and rollback.

The interpreter isn't rustc or DuskVM. To keep the lessons honest, two checks run the real thing:

- `npm run test:rust`: **every chapter's reference answer compiles with real Dusk Forge 0.3 and dusk-core 1.6**, as a contract and as a data-driver.
- `npm run test:vm`: **every chapter's answer, and every lesson playground, runs in Dusk's VM** (dusk-vm 1.7, built on piecrust). It sits next to a real Moth Nest contract. Every call a lesson check or playground makes in the interpreter is replayed with the same sender and block height. The return values, panic messages, events and the whole contract state after every call must match. Each answer's own data-driver encodes and decodes the values.

The finished contract lives in [`examples/hatchery`](examples/hatchery), ready to build yourself.

**Secret stats** interprets your circuit into gates. A real dusk-plonk 0.22.1 engine, compiled to WebAssembly from [`engines/circuit`](engines/circuit), proves and verifies them in a worker, with fresh demonstration parameters. `npm run test:rust` also compiles every chapter's answer as real Rust inside that engine and checks that its proofs come out the same as in the browser.

**The Almanac** runs your JavaScript, unmodified except for the SDK import, in a disposable worker inside an opaque sandboxed iframe whose CSP blocks all network connections. It uses the real Dusk Connect and the Hatchery's real data-driver. The node is a practice node inside the page, answering with bytes that [`engines/almanac-fixture`](engines/almanac-fixture) produces from the real Rust types.

Dusk facts in the journey were checked against the Dusk sources: `dusk-core` host functions, Forge's contract rules, Phoenix view keys, and rusk's consensus, staking and slashing code.

## Checks

```sh
npm test            # interpreter limits and rollback; every chapter passes with its answer and fails from its start
npm run test:e2e    # the whole site over static HTTP in Chromium: every chapter, playgrounds, narrow screens, axe audits
npm run test:rust   # every contract and circuit answer, compiled for real; vendored artifacts rebuilt byte for byte
npm run test:vm     # every contract answer and playground, replayed call by call in Dusk's VM
```

- **`test:e2e`** needs Playwright (and optionally `@axe-core/playwright`). `CHROMIUM_PATH` picks a Chromium and `NODE_PATH` points at an external `node_modules`.
- **`test:rust`** and **`test:vm`** need Rust with the `wasm32-unknown-unknown` target. `RUST_TOOLCHAIN=stable` swaps the pinned 1.98.0 for an installed toolchain, and `CARGO_NET_OFFLINE=true` builds from cached crates only.

## Layout

- `index.html`, `journey.html`, `hatchery.html`, `almanac.html`, `secret-stats.html`: the pages. `creatures.html` is a developer sheet showing every trait and piece of gear.
- `academy/`:
  - Duskling generation and scenes: `creature.js`, `scene.js`
  - Journey content and screen: `journey.js`, `quiz.js`
  - Hatchery lessons: `lesson1.js` … `lesson5.js`, `course.js`, `hatchery-file.js`
  - Contract runner and simulated hosts: `contract.js`, `rust-runtime.js`
  - Hatchery screen: `app.js`; home: `home.js`; progress: `store.js`; styles: `style.css`
  - The dApps and Circuits screens: `path-app.js`, `editor.js`
  - Secret stats: `stats-lessons.js`, `stats-app.js`, `circuit.js`, `circuit-worker.js`
  - The Almanac: `almanac-lessons.js`, `almanac-app.js`, `almanac-sandbox.js`, `almanac-harness.js`, `almanac-transport.js`
  - `vendor/`: Dusk Connect, the circuit engine, the Hatchery data-driver and the practice-node fixture, with hashes in `circuit-engine.json` and `almanac.json`. Rebuild them with `npm run build:circuit` and `npm run build:almanac`.
- `examples/hatchery/`: the finished contract as a Forge crate.
- `engines/circuit/`: the browser's PLONK engine. `engines/almanac-fixture/` generates the practice node's answers. `engines/vm-runner/` replays calls in Dusk's VM for `test:vm`, with the Moth Nest contract in `moth_nest.rs`.
- `tools/`: builds for the vendored artifacts, the end-to-end test and the Rust checks.

The classic registration-counter academy was replaced by this one. It's preserved at the git tag `classic-academy`.

## License

Dusklings code and lesson text are available under the [MIT License](LICENSE). Separately licensed material keeps its own terms:

- [`examples/hatchery`](examples/hatchery) follows the Dusk Forge contract template, and [`engines/circuit`](engines/circuit) derives from the classic academy's dusk-plonk harness. Both are provided under MPL-2.0.
- Dusk Connect ([`academy/vendor/dusk-connect.js`](academy/vendor/dusk-connect.js)) is bundled from [dusk-network/connect](https://github.com/dusk-network/connect) at commit `67b37ab`, under the [MIT License](academy/vendor/dusk-connect.LICENSE).
- The WebAssembly artifacts in `academy/vendor` are built from the sources above and their pinned dependencies (`Cargo.lock`), which keep their own licenses.
- Manrope and Silkscreen fonts: [Manrope OFL](assets/Manrope-OFL.txt) and [Silkscreen OFL](assets/Silkscreen-OFL.txt).

Dusk names and trademarks remain with their respective owners. This is an independent learning project, not an official Dusk product.
