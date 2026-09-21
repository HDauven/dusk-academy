# Dusk Academy

A browser-based course in Dusk development.

**[Open the static preview](https://hdauven.github.io/dusk-academy/)** · [Source on GitHub](https://github.com/HDauven/dusk-academy)

GitHub Pages hosts the lessons and knowledge questions. Coding chapters are freely browsable, but **code checks and wallet access require the local version**. The preview does not compile contracts, read VM fixtures, generate proofs or award coding skills. There is no simulated execution.

| Learning path | Lessons | Chapters | What you build or study |
|---|---:|---:|---|
| Start with Dusk | 1 | 15 | Shared records, wallets, transactions, privacy, credentials and policy |
| DuskVM contract development | 7 | 83 | State, arguments, validation, records, contract permissions, events, calls and testing/building |
| DuskVM dApp development | 2 | 23 | Connect reads, unsigned call preparation and a read-only registration explorer |
| DuskVM circuit development | 1 | 12 | A PLONK sum circuit with constraints, proofs and public inputs |

These are **11 lessons / 133 chapters**, not four finished courses. Paths are independent. No contract-course completion is required for dApps or circuits.

The first contract lesson has 15 chapters. Lessons combine short explanations, worked examples and optional practice. Coding lessons keep the same editable file throughout. Run always checks the active coding task, including when reviewing an earlier page. The contract path has 22 execution checkpoints and 19 optional questions.

The entrance keeps curriculum totals visible beside saved progress, with Open, Continue or Review links. Each path saves its own source and checks. The character name is shared. Earlier chapter links, drafts, historical checkpoints and earned skills survive save migration. Normal saving is silent. A failed save shows a warning and asks before leaving the page.

## Run locally

The host needs Linux, Python 3, Node, Rust/rustup, a C build toolchain and bubblewrap. On Debian/Ubuntu, install bubblewrap with `sudo apt install bubblewrap`. The browser needs WebAssembly and, for exact-ID exercises, native `JSON.rawJSON`. Unsupported browsers receive an update message rather than rounded IDs.

```sh
git clone https://github.com/HDauven/dusk-academy.git
cd dusk-academy
rustup toolchain install 1.98.0 --profile minimal \
  --component rust-src --target wasm32-unknown-unknown
cargo +1.98.0 install --git https://github.com/dusk-network/forge \
  --tag v0.3.0 --root "$HOME/.local/dusk-forge-course" dusk-forge-cli
DUSK_FORGE_BIN="$HOME/.local/dusk-forge-course/bin/dusk-forge" npm run setup:forge
npm run setup:circuits
npm run dev
```

Open **http://localhost:5173/** after starting the server. Saves belong to the browser origin. Preview drafts and progress do not automatically transfer to localhost; copy any source you want to keep before switching.

Setup builds trusted dependencies, fixed VM fixtures and matching data-drivers outside this project, in `~/.cache/dusk-academy/{forge-lesson,circuit-lesson}`. Learner requests never run Cargo or install packages. The bundled Connect SDK, fonts and artwork load locally. No CDN, analytics, browser API keys or learner-side package installation is used.

A static server can display lessons but **cannot run coding exercises**. The local server supplies compiler endpoints, fixed contract reads and worker CSP headers. There is no simulated fallback.

### If execution is unavailable

- **Missing or stale setup:** rerun the matching setup command above, then restart `npm run dev`. Readiness checks include the recorded libraries and required artifacts, not just `ready.json`. Do not delete learner saves to repair a build cache.
- **Compiler error with source details:** correct the named line in the editor and Run again.
- **Missing worker headers:** open the lesson through `npm run dev`, not a generic static server.
- **Save warning:** keep the tab open and copy your source somewhere safe before closing it.

## What executes

- **Contracts** compile with pinned Forge and run in local DuskVM 1.6.0. Each Run starts a fresh deployment. Calls within it share state. Fixed scenarios check acceptance, rejection, recovery, ownership, receipt events and two-contract rollback. The final check also builds the method data-driver and checks its schema and exact u64 encoding/decoding with Connect.
- **dApps** use the genuine Connect SDK and generated drivers. Reads reach fixed local VM fixtures. The explorer checks exact IDs, missing records, owner IDs, confirmation flags and recovery after an intentional HTTP 503. Calls are prepared but never signed or submitted.
- **Circuits** compile against dusk-plonk 0.22.1. A browser worker generates fresh demonstration parameters, produces real PLONK proofs, rejects an invalid witness and checks public-input binding. No verifier is deployed.

Contract owners are immediate calling contracts, not authenticated wallet users. The A/B relays are open test fixtures and must not be used as production authorization. Raw receipt events can describe attempted work that later rolls back. They do not establish committed success or network finality.

The explorer's separate getters are coherent only because its fixture never changes. A public owner ID is not a credential, and confirmation is application state rather than finality. Circuit field arithmetic does not authenticate real-world facts or provide bounded-integer constraints.

No live deployment, signed write, credential issuance, legal assessment or registered event-decoding schema is implemented. Optional wallet profile access runs separately in the trusted page and never requests a transaction. Saves and local checks are learning aids, not certification.

## Checks

```sh
npm test
npm run test:forge
npm run test:circuits
```

`npm test` covers curriculum, save migration, local assets, request boundaries, worker headers and missing-cache recovery without requiring Rust setup. The other two commands require prepared caches and exercise real compilation, VM calls and proofs.

With the local server running, use Playwright and `@axe-core/playwright` as optional development tools:

```sh
node tools/test_academy.cjs
node tools/test_courses.cjs
node tools/test_pages.cjs
```

`CHROMIUM_PATH` selects an existing Chromium. The Pages check serves local files at a mocked project-site URL, with no backend, and checks preview navigation, saves, disabled execution and honest skill states. It does not need the local server or Rust setup. Set `PAGES_LIVE=1` to check the published site instead of mocked files.

The two local-execution browser suites cover all chapters, 1,636 layouts and 290 axe checks, source/snapshot continuity, optional practice, keyboard navigation, blocked storage, cancellation, actual SDK reads and PLONK execution. The no-wallet test does not verify real extension approval.

## Release scope

**The public site is a static preview, not a public execution service.** GitHub Pages publishes the root of `main`, with `.nojekyll` disabling Jekyll processing. There is no build step or hosted compiler. `academy/hosting.js` selects preview mode outside loopback hosts. This is presentation logic, not a security boundary.

The Python server binds to loopback by default. Keep it local.

Compilation and VM execution use bubblewrap with private namespaces, cleared environments, no network, read-only dependencies and fixed commands. Source, request, artifact, gas, memory and time limits remain in place. Browser cancellation discards stale results but does not stop an already-started server job.

Public code execution still needs independent isolation review, aggregate per-job quotas and a bounded worker service. Per-process limits and worker deadlines are not aggregate resource quotas. Do not expose this server through a public bind address or proxy as a substitute for that work.

Before offering hosted execution:

- Complete the isolation and resource-control work above.
- Test optional profile approval with a real wallet extension and verify the supported browser/platform set. Wallet signatures and signed writes remain deferred.
- Repeat the checks above on the intended release revision. A successful Pages deployment verifies publication, not the compiler sandbox or wallet integration.

## License

Original academy code and lesson text are available under the [MIT License](LICENSE). Separately licensed material keeps its existing terms:

- Rust examples and tutorial snippets derived from them: MPL-2.0. See [contract license](examples/first-contract/LICENSE) and [circuit license](examples/first-circuit/LICENSE).
- Bundled Dusk Connect: [MIT](academy/vendor/dusk-connect.LICENSE), with [source provenance](academy/vendor/README.md).
- Manrope and Silkscreen fonts: [Manrope OFL](assets/Manrope-OFL.txt) and [Silkscreen OFL](assets/Silkscreen-OFL.txt).

The generated workshop and portrait artwork in `academy/assets/` are included under MIT to the extent the project owner holds rights. [Artwork provenance](academy/README.md#artwork) records the generation and processing details; this is not a claim of exclusive copyright in AI-generated output. Dusk names and trademarks remain with their respective owners. This is an independent learning project, not an official Dusk product.

## Implementation notes

- [Curriculum, save formats, execution limits, references and artwork provenance](academy/README.md)
- [Pinned Forge reference and native fixtures](examples/first-contract/README.md)
- [PLONK harness](examples/first-circuit/README.md)
- [Connect source pin, license and reproduction](academy/vendor/README.md)

The UI is vanilla HTML/CSS/JavaScript. Contract lessons use `index.html` and `academy/app.js`. The other paths share `course.html` and `academy/course-app.js`. Both reuse `academy/editor.js` and the stylesheet. `tools/serve.py` exposes the local routes, backed by `tools/forge_lesson.py` and `tools/circuit_lesson.py`.

Only the current academy is included. Save migrations remain to preserve learner work. Superseded prototypes, build caches and generation logs stay outside the project, and unrelated browser storage is never cleared.
