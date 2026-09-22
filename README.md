# Dusk Academy

A browser-based course in Dusk development.

**[Open Dusk Academy](https://hdauven.github.io/dusk-academy/)** · [Source on GitHub](https://github.com/HDauven/dusk-academy)

**Every coding path runs from static files:** all 22 contract checkpoints, both dApp lessons and both circuit checks. No execution server, public RPC, wallet, API key or learner installation is required. Localhost and Pages use the same runtime, with no runtime switch. Historical native checks remain separately labelled and saved; new browser checks never become native credit.

Contracts interpret a bounded Rust subset and simulate Dusk behavior. dApps execute actual JavaScript with genuine Connect/data-drivers against simulated reads. Circuits interpret edited gate-building code and generate **real PLONK proofs** in a prebuilt engine. Edited Rust is not compiled in the browser.

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

Only a static HTTP server is needed. With Python 3:

```sh
git clone https://github.com/HDauven/dusk-academy.git
cd dusk-academy
python3 -m http.server 5173 --bind 127.0.0.1
```

Open **http://localhost:5173/**. `npm run dev` and `npm start` run that same command; neither prepares Rust dependencies nor exposes execution endpoints. Any ordinary static host can serve the project, including from a subdirectory. Keep the development server on loopback.

The browser needs WebAssembly and, for exact-ID exercises, native `JSON.rawJSON`. Unsupported browsers receive an update message rather than rounded IDs. Only same-site static assets are fetched. No CDN, analytics, browser API keys or wallet controls are used. There is no service worker or offline-reopening guarantee.

Saves belong to the browser origin. Pages drafts and progress do not automatically transfer to localhost; copy any source you want to keep before switching. If saving fails, keep the tab open and copy your source somewhere safe.

## Browser runtime

Choose any path and edit the supplied file. The contract and circuit interpreters evaluate the supported source, including incorrect logic, rather than recognize answers or select a successful precompiled solution. Unsupported features report a runtime limitation, not invalid Rust.

The contract model covers exact integers, records, immediate callers, events, nested venue calls, failed-call rollback and atomic pairs. Its final check compares the parsed public interface against a **prebuilt reference driver** and tests real ABI encoding. The displayed source hash is not a compiled contract hash. No gas, deployment, wallet authentication or finality is simulated.

Actual learner JavaScript runs in a disposable worker inside an opaque sandboxed iframe. Inherited CSP blocks external connections, including attempts to bypass the fixture transport. It cannot access the page's DOM, storage or injected wallet. Virtual `/api/…` and `/on/…` addresses in exercises are handled entirely by the in-memory fixture transport, not HTTP services.

Circuit Rust is interpreted as bounded gate instructions; the bundled dusk-plonk engine proves and verifies those instructions with fresh demonstration parameters. See [supported syntax, isolation and limits](academy/README.md#browser-runtime).

Contract owners are immediate calling contracts, not authenticated wallet users. The A/B relays are open test fixtures and must not be used as production authorization. Raw receipt events can describe attempted work that later rolls back. They do not establish committed success or network finality.

The explorer's separate getters are coherent only because its fixture never changes. A public owner ID is not a credential, and confirmation is application state rather than finality. Circuit field arithmetic does not authenticate real-world facts or provide bounded-integer constraints.

No live deployment, signed write, credential issuance, legal assessment or registered event-decoding schema is implemented. Saves and local checks are learning aids, not certification.

## Checks

```sh
npm test
npm run test:e2e
```

`npm test` covers the interpreters, all contract checkpoints, real bundled PLONK execution, artifact hashes, separate histories, migrations and missing developer-cache guidance without Rust setup.

The optional E2E check needs existing Playwright and `@axe-core/playwright` development tools. `CHROMIUM_PATH` selects an existing Chromium; `NODE_PATH` can point to an external installation. It starts and stops a plain Python static server itself. No compiler setup or running academy server is required.

`tools/test_pages.cjs` is the single learner E2E suite: all 133 chapters and 32 coding checks over actual static HTTP at a project subpath, plus localhost and mocked HTTPS Pages checks. It covers real SDK/driver/proof workers, exact IDs, wrong/equivalent programs, isolation, cancellation, historical native credit, migrations, storage failures, keyboard focus, responsive layouts and accessibility. Browser validation is Chromium-only, not an independent sandbox audit or a Firefox/Safari guarantee.

## Native developer tooling

Native Rust remains the reference for artifact builds and conformance tests, **not an alternative learner runtime**. Preparation is optional and never invoked by the website or static server.

The host needs Linux, Python 3, Node, Rust/rustup, a C build toolchain and bubblewrap (`sudo apt install bubblewrap` on Debian/Ubuntu):

```sh
rustup toolchain install 1.98.0 --profile minimal \
  --component rust-src --target wasm32-unknown-unknown
cargo +1.98.0 install --git https://github.com/dusk-network/forge \
  --tag v0.3.0 --root "$HOME/.local/dusk-forge-course" dusk-forge-cli
DUSK_FORGE_BIN="$HOME/.local/dusk-forge-course/bin/dusk-forge" npm run setup:forge
npm run setup:circuits
npm run test:forge
npm run test:circuits
npm run build:browser
```

Setup builds trusted dependencies, fixed VM fixtures and matching data-drivers in `~/.cache/dusk-academy/{forge-lesson,circuit-lesson}`. Missing or stale caches give setup guidance; build/test helpers do not install dependencies or rebuild caches automatically. Do not delete learner saves to repair a build cache.

Forge tests compare 69 freshly compiled positive/negative/equivalent programs across all seven lessons with interpreted traces, including ownership, events and rollback. The opening comparison also covers 13 cases, including exact integers and arithmetic rejection; these sets overlap. Simulated explorer bytes are compared against actual pinned VM output. Native circuit tests compile real dusk-plonk source and check proofs, invalid witnesses and public-input binding. These finite comparisons are not a proof of general Rust/DuskVM equivalence.

Compilation and VM execution still use bubblewrap, fixed commands, private workspaces, no network and resource limits, with no unsandboxed fallback. They are local developer tools, not an independently reviewed public compilation service. [Artifact provenance and reproduction](academy/vendor/README.md#browser-wasm-artifacts) document the pinned browser bundles.

## Publication

GitHub Pages publishes the root of `main`, with `.nojekyll` disabling Jekyll processing. There is no hosted compiler or build service. Changes on a development branch are not live until separately merged and deployed. A successful Pages deployment verifies publication, not sandbox security or wallet integration.

## License

Original academy code and lesson text are available under the [MIT License](LICENSE). Separately licensed material keeps its existing terms:

- Rust examples and tutorial snippets derived from them: MPL-2.0. See [contract license](examples/first-contract/LICENSE) and [circuit license](examples/first-circuit/LICENSE).
- Bundled Dusk Connect: [MIT](academy/vendor/dusk-connect.LICENSE), with [source provenance](academy/vendor/README.md).
- Bundled WASM engines/drivers: [sources, reproduction and upstream licensing](academy/vendor/README.md#browser-wasm-artifacts). Their upstream licenses, including MPL-2.0, remain in effect.
- Manrope and Silkscreen fonts: [Manrope OFL](assets/Manrope-OFL.txt) and [Silkscreen OFL](assets/Silkscreen-OFL.txt).

The generated workshop and portrait artwork in `academy/assets/` are included under MIT to the extent the project owner holds rights. [Artwork provenance](academy/README.md#artwork) records the generation and processing details; this is not a claim of exclusive copyright in AI-generated output. Dusk names and trademarks remain with their respective owners. This is an independent learning project, not an official Dusk product.

## Implementation notes

- [Curriculum, save formats, execution limits, references and artwork provenance](academy/README.md)
- [Pinned Forge reference and native fixtures](examples/first-contract/README.md)
- [PLONK harness](examples/first-circuit/README.md)
- [Connect source pin, license and reproduction](academy/vendor/README.md)

The UI is vanilla HTML/CSS/JavaScript. Contract lessons use `index.html` and `academy/app.js`. The other paths share `course.html` and `academy/course-app.js`. Both reuse `academy/editor.js` and the stylesheet. `tools/forge_lesson.py` and `tools/circuit_lesson.py` are called only by developer setup, build and conformance tools, never by HTTP.

Only the current academy is included. Save migrations remain to preserve learner work. Superseded prototypes, build caches and generation logs stay outside the project, and unrelated browser storage is never cleared.
