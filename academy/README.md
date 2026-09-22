# Academy lessons

The entrance offers four independent learning paths. Contracts has seven Forge lessons, dApps has two cumulative lessons, and Start with Dusk and Circuits each have one working opening lesson. There are 133 chapters across eleven lessons. None requires completing another path.

Contract lessons put explanations beside editable source and runtime-labelled results. **Your skills** shows only the lessons in this contract path and links back to **All learning paths**. The final completion screen offers **All paths** instead of looping into the editor.

The original contract shell and hashes remain intact. The other paths share `course.html` and `course-app.js`, the existing stylesheet, editor overlay, fonts and portrait. The entrance is read-only and resumes the most recently visited started path. Leaving a lesson cancels grading and disposes any active worker. There are no server execution jobs. A path's completed opening lesson is labelled Review, not represented as a finished specialization.

**The avatar represents the learner. Lessons award skills.** The workshop register is a teaching example, not verified membership, identity or legal compliance.

## Browser runtime

All 22 contract checkpoints, eight dApp coding checks and two circuit checks run from static files. The same browser runtime runs on every host, including localhost. `hosting.js` only presents its scope and unchecked recaps; there is no runtime selector or native learner endpoint. Same-site assets are needed; no execution service, RPC, CDN, wallet or API key is used. Offline reopening is not implemented.

### Contract interpreter

`rust-runtime.js` parses and evaluates source as data. `contract-simulator.js` supplies the fixed contract scenarios and controlled host functions. There is no learner `eval`, `Function`, JavaScript import or host-object access. `counter-simulator.js` retains the opening adapter. Equivalent and incorrect programs execute their own logic, not an answer recognizer or a prerecorded trace.

The supported teaching subset includes:

- Supplied Forge/module/import declarations and circuit prelude; named structs, fields, constants and impl methods, including private helper methods.
- Exact BigInt-backed u64 arithmetic, comparisons, Boolean expressions, unsigned casts, `checked_add` and `wrapping_add`. Decimal/hex literals, underscores, supported unsigned suffixes and `u64::MAX` are accepted.
- Local bindings, assignment, compound assignment, blocks, tails, returns, `if`/`else`, bounded `for`/`while`/`loop`, break/continue, comments, assertions and panics.
- Lesson vectors and indexing; len/push/get/remove/swap_remove/clear; iteration, closures, position/find/map/sum; Option/Result construction, filtering, mapping, unwrapping and Result propagation.
- Fixed `abi::caller`, tuple-u64 `abi::emit`, ContractId construction and venue quote/book calls. Both Registry and venue state roll back on propagated failure. Attempted events remain observations, not commit evidence.

This is **not rustc, a borrow checker or general DuskVM**. References/type inference are simplified, and arbitrary Rust modules, traits, macros, libraries, ABI methods and host calls are unsupported. A passed browser check is not evidence that arbitrary edited Rust compiles. Syntax diagnostics name a location; runtime/type limitations explain the supported boundary without calling valid Rust invalid. Use the separate native developer tooling for compiler/VM validation.

Bounds: 8,000 UTF-8 source bytes; 64 nested expressions/blocks and expression-tree levels; 32 type levels; 48 interpreted call frames; 200,000 instructions per interpreter instance; 128 collection elements; 32 KiB teaching bounds on materialized values/state; bounded fixed scenarios, events and payloads. These are teaching limits, not real Dusk gas or an aggregate browser-memory quota. Resource exhaustion is never graded as successful rejection. The bounded contract interpreter runs synchronously; circuit interpretation runs in a disposable worker.

The final checkpoint interprets all 66 operations, compares parsed public signatures with the **prebuilt reference method driver**, and exercises real SDK ABI encoding/decoding. It does not build a contract or driver from edited Rust. Results explicitly identify the interpreted-source hash and prebuilt-driver hash. Extra/incompatible public methods cannot silently use that reference driver.

### dApp isolation and transport

Actual learner JavaScript and the bundled Connect SDK run in a disposable classic worker that imports local Blob modules. An iframe with only `sandbox="allow-scripts"` gives it an opaque origin. A meta CSP inherited by the worker allows Blob scripts and WASM compilation but sets `connect-src 'none'`, blocks frames/forms, and omits JavaScript unsafe-eval. Learner source is sent through a private MessageChannel, never interpolated into HTML. Child/shared worker constructors are disabled before learner execution; DOM, page storage and injected wallets are unavailable. Removing the frame disposes the worker on result, cancellation or deadline.

`offline-transport.js` returns read-only simulated fixtures and a deliberate unavailable response. Genuine prebuilt drivers still encode inputs and decode outputs; native conformance checks compare the simulated ABI bytes to pinned VM reads. Only the supplied SDK URL expression is rewritten to its local Blob URL. Other network imports remain blocked. The harness supplies a synthetic `nodeUrl` for its fixtures, not a RPC endpoint. The worker itself retains its opaque origin. Exact IDs still require native `JSON.rawJSON`, without a Number fallback.

Browser integration tests execute origin/storage/eval probes and attempt **native fetch**, bypassing the transport shim, to check inherited CSP. This is bounded regression evidence in the tested Chromium, not an independent sandbox audit or a guarantee about every browser. Even a learner who forges local results cannot obtain a network, wallet or page-storage capability from the grading channel. Progress is not tamper-proof certification.

### Circuit execution

`circuit-program.js` interprets the edited `SumCircuit::circuit` method for the fixed zero/default and three lesson samples. Composer witness/public allocation, addition coefficients/handles and equality operations become at most 32 gate instructions. Gate structure, coefficients and public positions must agree between samples. Unsupported APIs, Rust guard rejection and witness-dependent circuit structure stop the run rather than earn credit.

The bundled `circuit-program.wasm`, built from `examples/first-circuit/src/browser.rs` and the existing harness, consumes those instructions with real dusk-plonk 0.22.1. It creates fresh demonstration parameters and real 1,008-byte proofs, verifies valid sums, checks invalid-witness rejection and tests changed-public-input binding. Incorrect gates are actually proved/checked, not mapped to a successful sample artifact. This does not compile edited Rust, establish universal circuit correctness, perform a production ceremony or deploy a verifier.

### Progress and conformance

Contract v3 and other-path v2 saves retain their versions and stable IDs, with an optional `simulated` history for browser checks. All snapshots remain limited to 8,000 UTF-8 bytes; raw bounds include both complete histories. Native credit is never inferred from browser checks or overwritten by them. Existing native skills retain their native label. In the circuit path, “browser checked” still means genuine proofs, but without native source compilation.

Browsing ahead preserves drafts/bookmarks without moving the active task past an unchecked exercise. Reviewing earlier chapters keeps the latest active ABI. Reading alone never awards coding skills; unearned recaps show expected results. Start with Dusk retains genuine knowledge gates. Name edits preserve both histories. Legacy native snapshots are read-only; new runs write only browser history. Progress helpers combine these histories for unlocking and completion, never for assigning native provenance. Storage is origin-specific; copy drafts manually between Pages and localhost. Entry scripts and shared save/runtime modules use a versioned URL so a cached pre-browser snapshot writer cannot record simulated work as native credit. Worker assets are refreshed before execution. Learner JavaScript always uses the opaque-frame CSP; it never depends on server response headers. Bump those URL versions together when changing this contract, and reload open lesson tabs after an update.

Node tests run every contract checkpoint, wrong/equivalent programs, resource bounds, real bundled proofs, artifact hashes and migrations. The native suite compares 69 freshly compiled programs across all seven contract lessons, including complete state/event/rollback traces. The opening comparison also covers thirteen counter cases, including exact large integers and arithmetic rejection. The opening native runner stops on failure, so those opening comparisons alone do not observe its post-failure state. This is finite conformance evidence, not proof of general language/VM equivalence.

## Contract path

Eighty-three chapters across seven lessons, with one working file:

| Lesson / skill | Chapters | Parts / focus | Coding checks |
|---|---:|---|---:|
| Contract state | 15 | Read the contract file / Change and read state / Understand the results | 2 |
| Call arguments | 8 | Supply an input / Follow the call interface | 1 |
| Input validation | 12 | Accept or reject / Enforce the total / Read a failed call | 2 |
| Registration records | 12 | Model a record / Store and find / Remove without corrupting | 6 |
| Contract permissions | 12 | Observe execution context / Bind and check ownership / Guard every mutation | 4 |
| Contract interaction | 12 | Describe an event / Call a separate contract / Coordinate state changes | 4 |
| Testing and building | 12 | Check state relationships / Test the failure boundary / Build the interface | 3 |

The first lesson introduces Rust/Forge/DuskVM roles, the file structure, fields and constructor values, getter syntax and mutable entrypoints before the two original edits. Worked traces then separate persisted state from a fresh deployment, distinguish syntax/runtime/behavior failures and state what the counter does not prove. There are 28 worked-example guides and 19 optional practice questions across Contracts. Only the existing 22 execution checks award progress.

Rust syntax is explained only where the contract needs it. Supplied code remains visible and editable. No automatic source rewriting occurs between lessons, including for equivalent learner solutions. A new edit needs a new successful check. Completing the first entrypoint task can also fill a missing initial-state check, without overwriting an existing initial-state source snapshot.

Reading earlier chapters does not rewind the file or call a now-obsolete signature. The saved `active` checkpoint identifies the latest coding task; the editor explicitly names it on guide/practice pages and earlier reviews. Run executes and grades that real task. Optional answers can be wrong or skipped without blocking navigation or fabricating a check. The chapter strip shows only the current four- or five-chapter part. A keyboard-accessible native selector groups all chapters by lesson, retaining focus on selection. The skills dialog links the seven earned/available lessons.

The existing `dusk-academy-forge-lesson-v1` storage key is retained. The **version-3 payload** uses stable chapter IDs for `step` and `active`, the original named checkpoint keys, and chapter-ID optional answers. Runtime positions remain numeric. `serialize()` writes IDs. `restore()` translates all 37 old numeric positions through a fixed v1/v2 map. Both lesson controllers reuse `cleanName()` when editing the shared learner name. Old hashes, names, unfinished drafts, historical snapshots and earned skills remain intact. New reading/practice pages do not revoke completion, require replay or grant new skills. Even an old records graduate or a reader at the build guide resumes the corresponding page and active ABI.

The entrance reads without rewriting saves. Entering a lesson saves the migrated form. Other paths merge name edits through this same serializer, preserving contract positions, answers and all 22 checks. Blank/dangling checks and unknown answers are discarded. Malformed/oversized saves do not prevent startup. The raw bound derives from 22 native snapshots, 22 optional browser snapshots and current source, each limited to 8,000 UTF-8 bytes, including worst-case JSON escaping. Unrelated storage is untouched.

The initial scaffold compiles but deliberately starts at seven and has an empty mutation method. Later checks exercise actual numeric inputs, zero rejection, exact capacity, a write that is rolled back, overflow, recovery and a new deployment. The runner checks repeated reads to catch a getter that changes state. These are focused finite educational checks, not a proof of correctness for every possible program or a credential.

These lessons omit wallet setup, deployment transactions, end-user account authorization and privacy implementation. Record IDs do not prove ownership. Cancellation is initially unrestricted. Lesson five restricts changes to the record's calling contract, using a VM-provided identity. A and B are open local test relays, not authenticated wallet adapters. Their code must never be deployed as production authorization. Only non-personal IDs, seat counts and contract-owner metadata are used. The dApp and circuit paths introduce client calls and proof construction. Signed transactions and contract verification remain future work. A skill award records completion locally, not on-chain or as a Dusk-issued credential.

## Native developer tooling

See the [optional developer setup](../README.md#native-developer-tooling). `npm run setup:forge` builds the official, pinned Forge dependencies and a fixed native runner from trusted source. Setup checks verify the source signature, recorded dependency libraries and required runner/fixture artifacts. Missing caches return setup instructions before compilation. Circuit compilation similarly checks its harness and recorded libraries. These checks do not hash every transitive dependency or rebuild files automatically. `tools/test_setup.py` checks missing/stale caches without touching real developer caches.

The native helpers are used only by artifact builds and conformance tests. There is no HTTP adapter. They invoke pinned `rustc` with prebuilt libraries, using the real `#[dusk_forge::contract]` macro, and execute WASM through `dusk-vm` in a fresh isolated process. Fixed scenarios cover the same cumulative ABI as the browser lessons. The following describes these native reference observations, not execution in a learner’s page.

The later trace distinguishes an accepted call from a contract `Panic` rejection. A loop that exhausts gas, an ABI error or a missing method cannot pass as a valid guard. A silent return is still an accepted call and fails the rejection task. Valid calls must continue working after a rejected request.

The capacity scenario starts at three, rejects eight more, accepts seven to reach exactly ten, rejects further input and overflow, then tests eight plus two in a fresh deployment. The native before/after observations are reads from DuskVM. The suggested post-update assertion deliberately exercises write rollback; equivalent pre-update validation also passes. Accordingly, the explanation about a temporary eleven is conditional on placing the assertion after the update. Failure does not imply refunding network fees or undoing earlier successful calls.

Record scenarios add fixed operations, not client-controlled call sequences. `records-empty` checks two empty deployments; `records-ids` checks returned IDs and rollback of allocation; `records-save` checks collection growth. `records-read` decodes a `u64` seat count for known IDs, then `records-missing` switches to `Option<u64>` and checks empty/large-ID reads. `records-cancel` runs 26 calls covering middle-record removal, survivor reads, duplicate/missing cancellation, non-reused IDs, capacity recovery and an independent deployment. The native trace contains return values, record counts, next ID and reserved seats. Compiler checks and VM behavior, not Rust spelling, determine conformance; `remove` and equivalent `swap_remove` solutions both pass. Tests also move all three writes before validation to confirm multi-field rollback.

The record struct is internal, not an ABI return type: it needs no serialization derives. `alloc::vec::Vec` persists in WASM memory. At most ten records can be active because each needs at least one of ten seats; a linear scan is sufficient for this lesson, not a general storage-performance recommendation. No state migration or production end-user authorization is provided. The pinned counter reference and its generated dApp driver remain unchanged; record solutions are exercised cumulatively by `tools/test_forge_lesson.py`.

Permissions, interactions and testing use eleven fixed scenarios with up to 66 reported operations. Each snapshot checks actual seat/owner reads, large missing IDs, collection size and next ID; later ones add confirmation flags, the independent seat sum and the venue's booked total. The runner deploys genuine calling contracts A/B and a Transfer-ID policy fixture, not wallet transactions or fabricated `public_sender` metadata. `caller` and deployment ownership are distinct. Moonlight routing/sender context and Phoenix signed-intent/replay policy are separate work.

Events are actual `abi::emit` receipt bytes. Checks bind source, topic and the two-u64 payload. Typed `abi::call` reads observe a changing venue rate and unavailability; nested writes check confirmation, rejection, recovery and rollback of both contracts. The shared private guard prevents modifying a confirmed record. Undoing confirmation is intentionally not implemented because it would need a coordinated venue operation.

Atomic-pair tests force the *second* callee to fail after the first succeeds. Both contracts' writes must roll back. The test relay preserves raw receipt events, including attempted inner work visible in this pinned VM. Events are not treated as committed success or finality. Equivalent prevalidation/removal implementations pass. The native final-workflow test compiles both WASM targets and uses the genuine vendored SDK in an isolated Node checker for schema, argument encoding and exact largest-u64 decoding. Artifact bytes/hashes and method signatures are checked in the developer tools. The browser instead labels its interpreted source and prebuilt reference driver. These raw tuple events are not registered Forge event types. A method schema does not supply an event schema.

The compiler and VM use the shared sandbox in `tools/forge_lesson.py`. Source, artifact, memory, gas and process limits remain enforced. Their values live with the implementation. The multi-contract VM alone uses a 32-GiB virtual address ceiling for Piecrust's per-instance reservations; compilation/driver checks remain at 12 GiB, and learner/fixture WASM remains capped at 16 MiB. A shared 40-second native invocation budget covers both builds, execution and SDK checking, in addition to per-process CPU/wall limits. These are local developer tools, not independently reviewed public sandboxes or aggregate resource quotas. There is no unsandboxed fallback.

## Other opening lessons

- **Start with Dusk (15 chapters):** what Dusk is for → shared state → wallets → transaction flow → contracts → public information → Moonlight/Phoenix → proof basics → off-chain sensitive data → credentials → selective disclosure → session rules → compliance policy → next-path choice, with an opening overview. Protocol names come after the basic concepts. Three original checkpoint questions remain; five added practice questions are optional. No credential API, real identity check or legal verdict is simulated.
- **dApps (15 chapters):** app/node/wallet roles, contract IDs, async/await, real reads, integer precision, the ABI/data-driver, arguments versus token values, prepared calls, request review, discovery, approval, outcomes and recovery. One JavaScript file uses the real Connect SDK. Reads use the simulated transport; the generated Forge driver encodes/decodes `register(u64)`. The two coding checkpoints and wallet question remain, with six optional practice questions. Prepared calls have zero attached tokens and are never submitted. Discovery/connection is explained only; no wallet controls are shipped.
- **Circuits (12 chapters):** prover/verifier roles, witnesses, an addition gate, equality constraints, negative tests, Rust versus circuit checks, public inputs, verification, ranges and trusted-input boundaries. Two real coding checkpoints remain, with four optional practice questions. One Rust file uses `dusk-plonk 0.22.1`. The browser interprets its gates for a prebuilt engine, which generates parameters and actual proofs, verifies valid sums and checks invalid witnesses and changed public inputs. Native compilation remains only in developer build/conformance tools. See the [circuit harness](../examples/first-circuit/README.md).

Each opening lesson has three parts of four or five chapters; the dApp explorer and contract arguments lesson each use two four-chapter parts. Other contract lessons use three four-chapter parts. The chapter strip shows the current part; a native selector reaches other unlocked chapters without creating a fifteen-button row. Keyboard selection keeps focus in the selector. Worked examples and optional questions add practice without imposing new skill gates or invalidating previously completed lessons.

The contract/dApp/circuit editor remains visible and editable beside guide and practice chapters. It keeps the current file and explicitly names the coding task used by Run. Running from an explanation still executes and grades that real task; answering an optional question never creates a coding checkpoint. The original code exercises, starters and grading behavior are retained. The dApp worker adds only the new read-only fixture, matching driver and fixed explorer checks. The original contract starter, all 37 existing chapter IDs in their relative order, and all 22 check/scenario identities remain intact; explanatory chapters are inserted between them. Earlier completion screens still continue into the next lesson. The artifact guide keeps the editor usable and runs the active checkpoint, not a pretend build.

Saves remain independent `dusk-academy-dusk-v1`, `dusk-academy-dapps-v1` and `dusk-academy-circuits-v1` records. The **version-2 payload** stores chapter/active positions, checkpoint keys and answer keys as stable chapter IDs; the runtime still uses numeric positions. `serializeCourse()` writes that form, and `restoreCourse()` translates bounded original v1 positions through a fixed legacy ID map. Adding explanatory material no longer shifts a learner’s saved chapter or checks. All original completed lessons stay completed; migration neither fabricates new skills nor requires retaking the old ones. Optional practice answers persist but do not award skills.

Restoration still validates source bounds, answer IDs and checkpoint order. Earlier explanations never rewind source or switch tests back to an obsolete task. The entrance only reads either save version; entering a course performs migration on its normal save. No path is a prerequisite for another.

The learner name remains in the existing Forge record. A name edit merges into a freshly restored record instead of overwriting the contract draft with an old copy. A failed name save is retried with subsequent saves; blocked storage keeps a warning visible and asks before leaving the page. This is local single-browser progress, not a multi-tab synchronization service.

The academy uses vanilla HTML/CSS/JavaScript and local artwork, fonts, SDK and WASM files. There are no analytics or browser keys. There is one learner runtime. dApps always use the opaque-frame policy above; circuits execute only the trusted interpreter/prebuilt engine. `npm run dev` uses Python’s standard static server, with no custom execution routes or required CSP response headers.

## Read-only registration explorer

The dApp path adds **eight chapters / one skill**, bringing it to two lessons and 23 chapters. The first 15 chapter IDs, original starter, counter driver and earned checkpoints remain intact. New code extends `createApp` with an optional driver path and appends functions; navigation never inserts/replaces source automatically.

| Chapter | Cumulative change |
|---|---|
| Registry explorer | Explain the independent, supplied read-only snapshot |
| Read a record | Select the virtual `/api/explorer-driver` fixture; add `readRegistration(dusk, id)` using actual `get_registration` reads |
| Missing records | Return null for a successful absent-record read |
| Contract owner | Read `owner_of` and return the public owning contract ID |
| Confirmation | Read `is_confirmed`, retaining false rather than treating it as absence |
| Large IDs | Validate decimal u64 strings and serialize without Number rounding |
| Failed reads | Add `loadRegistration`; distinguish found/missing/unavailable and recover on a later working read |
| Registry client | Earn the second skill; return to All paths |

`src/lesson_registry.rs` in the reference project is compiled separately as contract and driver. It supplies records 0, 2 and 9007199254740993, not source from the learner’s contract save. This snapshot has no mutation entrypoints and implies no historical transactions. A/B owner IDs are contract principals, not wallet identities. Confirmation is application state, not network finality. Public IDs, private Rust fields and a read-only interface are not confidentiality or authorization mechanisms.

The in-memory transport allowlists just three getters with exactly eight argument bytes. Alias `55…55` returns simulated ABI bytes; alias `66…66` deliberately returns a Response with status 503. The worker then explicitly retries the working alias. Virtual `/api/…` and `/on/…` paths never reach an HTTP server. Original counter reads/prepared arguments are checked on every explorer run. Evidence includes transport status and actual driver-encoded argument bytes for each lookup. Invalid IDs must be rejected before a request; constants without reads, rounded IDs, false-to-null conversion, fabricated missing records and swallowed failures fail the checks. These are finite learning checks, not tamper-proof certification.

Verified formats for this exact Forge/Connect pin:

- `get_registration(u64) -> Option<u64>` decodes to a small Number or null. The fixture’s seat counts are bounded to ten; generic nested u64 output is **not** universally lossless. The old standalone counter u64 still decodes to a string.
- `owner_of(u64) -> Option<ContractId>` decodes to 64 lowercase hex characters without `0x`, or null.
- `is_confirmed(u64) -> Option<bool>` decodes to true, false or null.
- Input encoding expects a JSON number, not a JSON string. Connect stringifies BigInts as strings, which this driver rejects. After canonical decimal/range validation, native `JSON.rawJSON(id)` preserves digits through Connect’s JSON serialization. This needs a current supporting browser; there is no unsafe Number fallback or new dependency.

Separate getters observe a coherent record here only because the fixture never changes. A live explorer needs an appropriate common-state query or combined getter. The final example intentionally uses a broad unavailable status; a deployed UI should distinguish invalid input, ABI problems and transient service failures. It does not automatically retry writes or claim transaction success.

Original v1/v2 graduates keep their first skill, draft, chapter hash and source snapshots. Six appended checks earn only the new skill; the raw-save allowance derives from all current code snapshots. Skills navigation and entrance counts show both lessons. Earlier review pages retain the latest active runner, and the first earned screen continues to the explorer instead of being mistaken for final course completion. There is no contract-path prerequisite, signed transaction, live deployment or registered event-decoding schema.

### Technical boundaries

The SDK source is pinned to commit `67b37ab0969bd42bf2b8d95f7b610cb654e49be8` (package metadata 0.2.0). The root entrypoint is bundled locally; see [vendor provenance](vendor/README.md). The offline read-only transport maps counter and registry aliases to fixed teaching data, not live network addresses; another alias deliberately fails for read-recovery practice. Developer conformance tests compare those bytes against fresh native VM deployments. `pinnedNodeUrl` prevents wallet metadata from changing this lesson's read endpoint. Prepared calls are unsigned parameters; connection, signing, submission, execution success and block finality are separate. A hash or node admission does not establish final success; an executed native transaction can fail and still consume its transaction inputs and pay gas. Outcome/recovery chapters explain those distinctions but do not implement a live watcher.

The circuit uses scalar-field arithmetic, not bounded integers. Witnesses are displayed test inputs, not private user records. The sum relation alone can be satisfied for any total and does not authenticate a balance, credential or real-world fact. Production applications need additional constraints, bindings, trust/context/replay policy and suitable setup parameters. The exercise does not export a production verifier or deploy one.

### Official references

The material uses official documentation and pinned source. Check current API and availability documentation before implementing further lessons:

- [Dusk overview](https://github.com/dusk-network/docs/blob/main/src/content/docs/learn/overview.mdx)
- [Native transaction lifecycle](https://github.com/dusk-network/docs/blob/main/src/content/docs/developer/integrations/tx-lifecycle.md): distinguishes mempool admission, execution errors and block finality.
- [DuskVM overview](https://github.com/dusk-network/docs/blob/main/src/content/docs/developer/duskvm/overview.md)
- [Privacy on Dusk](https://github.com/dusk-network/docs/blob/main/src/content/docs/learn/privacy-on-dusk.md)
- [Phoenix and Moonlight](https://github.com/dusk-network/docs/blob/main/src/content/docs/learn/deep-dive/duskds-tx-models.md)
- [Citadel 2](https://github.com/dusk-network/docs/blob/main/src/content/docs/developer/digital-identity/protocol.mdx): credential protocol and current implementation guidance.
- [Dusk Connect documentation](https://github.com/dusk-network/docs/blob/main/src/content/docs/developer/integrations/dusk-connect.md) and [pinned SDK source](https://github.com/dusk-network/connect/tree/67b37ab0969bd42bf2b8d95f7b610cb654e49be8)
- [dusk-plonk 0.22.1 API](https://docs.rs/dusk-plonk/0.22.1/dusk_plonk/)
- [Native contracts standards](https://github.com/dusk-network/contracts/tree/bc1b00ee0af059975e158b7b580b4d0c0f1bdf9f/standards/dusk-contract-standards/src): `core/context.rs`, `auth/mod.rs`, event types and the Moonlight call-router example informed the identity/routing boundaries. This lesson does not add a standards-crate dependency to the pinned Forge project.
- [DuskEVM infrastructure contracts](https://github.com/dusk-network/duskevm-contracts/tree/d6ba7462159f3c4bdb2f7c792798f82a79b55836): native Rust `core/src/contract_utils.rs` and `contracts/superchain-config/src/lib.rs` use Dusk ABI caller, events and calls. They are references, not a reason to substitute EVM `msg.sender` semantics.
- [Pinned Dusk core ABI](https://github.com/dusk-network/rusk/blob/ae1a38a2079c681126a96f94c17d282ea2639946/core/src/abi.rs), with Piecrust 0.30.0/uplink 0.20.0 from the lockfile. Real local calls verified the used APIs before lesson design; no wallet signature/approval end-to-end test is claimed.

`npm test`, `npm run test:forge`, `npm run test:circuits` and `npm run test:e2e` cover the implemented slice. The single learner suite, `tools/test_pages.cjs`, starts a plain static HTTP server at a project subpath, checks localhost and mocked HTTPS Pages, and stops its server afterward. It covers every chapter, optional practice without fake credit, keyboard navigation, active-task review, old migrations and native provenance, real SDK/proofs, wrong/equivalent programs, independent saves, malformed/blocked storage, cancellation and unavailable assets. Real wallet extension approval is neither offered nor claimed.

## Artwork

The current pixel-art adventurer and workshop were generated with the authenticated Codex image tool (`codex.image_gen`). The exact backend model version was not independently exposed. Character and environment form one opaque image, not a transparent sprite cutout.

- Source: `assets/workshop-pixel.png` (1536 × 1024).
- Runtime scene: `assets/workshop-pixel.webp` (768 × 512), lossless, nearest-neighbor downsample.
- Portrait/favicon: crop `(480,240,276,312)` from the source, reduced to 115 × 130 in `assets/portrait-pixel.webp`.

Only this source and its two runtime assets are retained. Superseded variants, generation logs and duplicate media caches are excluded. Manrope and Silkscreen are bundled under their OFL licenses in `../assets/`. Pixel lettering is limited to branding/character labels.

Recreate the prepared images with the optional offline Sharp tooling used elsewhere in this project:

```js
await sharp('academy/assets/workshop-pixel.png')
  .resize(768, 512, {kernel:'nearest'}).webp({lossless:true})
  .toFile('academy/assets/workshop-pixel.webp');
await sharp('academy/assets/workshop-pixel.png')
  .extract({left:480,top:240,width:276,height:312})
  .resize(115,130,{kernel:'nearest'}).webp({lossless:true})
  .toFile('academy/assets/portrait-pixel.webp');
```

No image provider is called by the browser.
