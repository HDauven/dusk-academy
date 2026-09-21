# Dusk Academy

A browser-based course in Dusk development.

**[Open Dusk Academy](https://hdauven.github.io/dusk-academy/)** · [Source on GitHub](https://github.com/HDauven/dusk-academy)

**Every coding path runs from static files:** all 22 contract checkpoints, both dApp lessons and both circuit checks. No execution server, public RPC, wallet, API key or learner installation is required. Browser checks are labelled and saved separately from native execution.

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

## Browser runtime

Choose any path and edit the supplied file. The contract and circuit interpreters evaluate the supported source, including incorrect logic, rather than recognize answers or select a successful precompiled solution. Unsupported features report a runtime limitation, not invalid Rust.

The contract model covers exact integers, records, immediate callers, events, nested venue calls, failed-call rollback and atomic pairs. Its final check compares the parsed public interface against a **prebuilt reference driver** and tests real ABI encoding. The displayed source hash is not a compiled contract hash. No gas, deployment, wallet authentication or finality is simulated.

Actual learner JavaScript runs in a disposable worker inside an opaque sandboxed iframe. Inherited CSP blocks external connections, including attempts to bypass the fixture transport. It cannot access the page's DOM, storage or injected wallet. Circuit Rust is interpreted as bounded gate instructions; the bundled dusk-plonk engine proves and verifies those instructions with fresh demonstration parameters. See [supported syntax, isolation and limits](academy/README.md#browser-runtime).

For local static development, run `python3 -m http.server 8000` and open `http://localhost:8000/?runtime=simulator#paths`. This mode is retained when navigating between paths. Only same-site static assets are fetched. There is no service worker or offline-reopening guarantee.

## Run locally

This optional mode compiles edited Rust and uses real DuskVM as the reference. It is not required for the static academy.

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

Open **http://localhost:5173/** after starting the server. Saves belong to the browser origin. Pages drafts and progress do not automatically transfer to localhost; copy any source you want to keep before switching.

Setup builds trusted dependencies, fixed VM fixtures and matching data-drivers outside this project, in `~/.cache/dusk-academy/{forge-lesson,circuit-lesson}`. Learner requests never run Cargo or install packages. The bundled Connect SDK, fonts and artwork load locally. No CDN, analytics, browser API keys or learner-side package installation is used.

A static server can run every lesson in browser mode. Native execution still needs the development server for compiler endpoints, fixed contract reads and worker CSP headers. The native runner never silently falls back to simulation if it fails.

### If execution is unavailable

- **Missing or stale setup:** rerun the matching setup command above, then restart `npm run dev`. Readiness checks include the recorded libraries and required artifacts, not just `ready.json`. Do not delete learner saves to repair a build cache.
- **Compiler error with source details:** correct the named line in the editor and Run again.
- **Missing worker headers:** open the lesson through `npm run dev`, not a generic static server.
- **Save warning:** keep the tab open and copy your source somewhere safe before closing it.

## What executes

- **Native contracts** compile with pinned Forge and run in local DuskVM 1.6.0. Each Run starts a fresh deployment. Calls within it share state. Fixed scenarios check acceptance, rejection, recovery, ownership, receipt events and two-contract rollback. The final check also builds the method data-driver and checks its schema and exact u64 encoding/decoding with Connect.
- **Native dApps** use the genuine Connect SDK and generated drivers. Reads reach fixed local VM fixtures. The explorer checks exact IDs, missing records, owner IDs, confirmation flags and recovery after an intentional HTTP 503. Calls are prepared but never signed or submitted.
- **Native circuits** compile against dusk-plonk 0.22.1. A browser worker generates fresh demonstration parameters, produces real PLONK proofs, rejects an invalid witness and checks public-input binding. No verifier is deployed.

Contract owners are immediate calling contracts, not authenticated wallet users. The A/B relays are open test fixtures and must not be used as production authorization. Raw receipt events can describe attempted work that later rolls back. They do not establish committed success or network finality.

The explorer's separate getters are coherent only because its fixture never changes. A public owner ID is not a credential, and confirmation is application state rather than finality. Circuit field arithmetic does not authenticate real-world facts or provide bounded-integer constraints.

No live deployment, signed write, credential issuance, legal assessment or registered event-decoding schema is implemented. Optional native-mode wallet profile access runs separately in the trusted page and never requests a transaction. Browser mode does not expose wallet controls. Saves and local checks are learning aids, not certification.

## Checks

```sh
npm test
npm run test:forge
npm run test:circuits
```

`npm test` covers the interpreters, all contract checkpoints, real bundled PLONK execution, artifact hashes, separate histories, migrations and local-server boundaries without Rust setup. Native suites require prepared caches. Forge tests compare 69 freshly compiled positive/negative/equivalent programs across all seven lessons with interpreted traces, including ownership, events and rollback; The opening comparison also covers 13 cases, including exact integers and arithmetic rejection. Simulated explorer bytes are compared against actual pinned VM output.

With the local server running, use Playwright and `@axe-core/playwright` as optional development tools:

```sh
node tools/test_academy.cjs
node tools/test_courses.cjs
node tools/test_pages.cjs
```

`CHROMIUM_PATH` selects an existing Chromium. The Pages check serves local files at a mocked project-site URL without worker-response CSP headers or a backend. It runs all coding checks, real SDK/driver/proof workers, isolation probes, cancellation, native/browser transitions and independent knowledge gates. It does not need the local server or Rust setup. Set `PAGES_LIVE=1` to check the published site instead of mocked files.

The two local-execution browser suites cover all chapters, 1,636 layouts and 290 axe checks, source/snapshot continuity, optional practice, keyboard navigation, blocked storage, cancellation, actual SDK reads and PLONK execution. The no-wallet test does not verify real extension approval.

## Release scope

**The public site serves static assets and a bounded browser teaching interpreter, not a hosted compiler or public VM service.** GitHub Pages publishes the root of `main`, with `.nojekyll` disabling Jekyll processing. There is no build step or hosted compiler. `academy/hosting.js` selects browser mode outside loopback hosts or with `?runtime=simulator`. This is presentation logic, not a security boundary.

The Python server binds to loopback by default. Keep it local.

Compilation and VM execution use bubblewrap with private namespaces, cleared environments, no network, read-only dependencies and fixed commands. Source, request, artifact, gas, memory and time limits remain in place. Browser cancellation discards stale results but does not stop an already-started server job.

Public server-side compilation and VM execution still need independent isolation review, aggregate per-job quotas and a bounded worker service. Per-process limits and worker deadlines are not aggregate resource quotas. Do not expose this server through a public bind address or proxy as a substitute for that work.

Before offering hosted execution:

- Complete the isolation and resource-control work above.
- Test optional profile approval with a real wallet extension and verify the supported browser/platform set. Wallet signatures and signed writes remain deferred.
- Repeat the checks above on the intended release revision. A successful Pages deployment verifies publication, not the compiler sandbox or wallet integration.

## License

Original academy code and lesson text are available under the [MIT License](LICENSE). Separately licensed material keeps its existing terms:

- Rust examples and tutorial snippets derived from them: MPL-2.0. See [contract license](examples/first-contract/LICENSE) and [circuit license](examples/first-circuit/LICENSE).
- Bundled Dusk Connect: [MIT](academy/vendor/dusk-connect.LICENSE), with [source provenance](academy/vendor/README.md).
- Bundled WASM engines/drivers: [sources, reproduction and third-party notices](academy/vendor/README.md#browser-wasm-artifacts). Their upstream licenses, including MPL-2.0, remain in effect.
- Manrope and Silkscreen fonts: [Manrope OFL](assets/Manrope-OFL.txt) and [Silkscreen OFL](assets/Silkscreen-OFL.txt).

The generated workshop and portrait artwork in `academy/assets/` are included under MIT to the extent the project owner holds rights. [Artwork provenance](academy/README.md#artwork) records the generation and processing details; this is not a claim of exclusive copyright in AI-generated output. Dusk names and trademarks remain with their respective owners. This is an independent learning project, not an official Dusk product.

## Implementation notes

- [Curriculum, save formats, execution limits, references and artwork provenance](academy/README.md)
- [Pinned Forge reference and native fixtures](examples/first-contract/README.md)
- [PLONK harness](examples/first-circuit/README.md)
- [Connect source pin, license and reproduction](academy/vendor/README.md)

The UI is vanilla HTML/CSS/JavaScript. Contract lessons use `index.html` and `academy/app.js`. The other paths share `course.html` and `academy/course-app.js`. Both reuse `academy/editor.js` and the stylesheet. `tools/serve.py` exposes the local routes, backed by `tools/forge_lesson.py` and `tools/circuit_lesson.py`.

Only the current academy is included. Save migrations remain to preserve learner work. Superseded prototypes, build caches and generation logs stay outside the project, and unrelated browser storage is never cleared.
