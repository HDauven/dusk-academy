# First Forge contract

## Reference checkpoint

A small **real DuskVM contract**, used to validate the opening tutorials. It counts accepted registration amounts, not verified people or credentials. It is public and intentionally has no application authorization yet. It is not the learner’s RPG character.

The contract in `src/lib.rs` is a trusted developer reference, **not a production registry**. Its dependencies also support the [seven browser lessons](../../academy/README.md): `examples/lesson_runner.rs` is a separate fixed native runner that loads compiled student WASM inside the server’s bubblewrap sandbox. The first lesson starts with parameterless `register()`. The next two add an amount parameter and validation, matching this reference. The fourth adds individual records. The final three add contract permissions, events/cross-contract calls and testing/building. This counter reference intentionally stays unchanged so the independent dApp fixtures and data-driver keep their original ABI.

The browser contract lessons use `/api/forge`. The contract endpoint allowlists `state`, `arguments`, `validation`, `capacity` and six record scenarios (`records-empty`, `records-ids`, `records-save`, `records-read`, `records-missing`, `records-cancel`). It also allowlists eleven permission, event, call, invariant/atomic and driver-build scenarios (the exact set is in `tools/forge_lesson.py`). It reports real call acceptance/rejection and state traces. Record scenarios also report returned IDs/seat counts, collection length and the next ID; reads evolve from `u64` to `Option<u64>`. `tools/test_forge_lesson.py` builds the cumulative record solutions and tests real VM calls, equivalent removal, stable IDs, missing reads, cancellation and multi-field rollback. Two additional fixed runner modes, `read2` and `read7`, serve the independent dApp lesson's read-only fixtures using this trusted reference WASM. They return actual raw ABI bytes; student source and arbitrary method names are not accepted by the read adapter. The runner does not by itself validate isolation; see the local-only execution boundaries in the root README.

`examples/support/advanced.rs` extends the fixed runner. `src/lesson_actor.rs` is compiled separately during trusted preparation, not included in the counter library. It supplies A/B calling contracts, a Transfer-ID policy fixture and a venue. They are **open test fixtures, never production authentication**. No `public_sender` or BLS wallet ownership is synthesized. The record owner is an actual immediate contract caller, excluding direct/Transfer creation.

The final workflow checks 66 operations, actual receipt bytes, ownership on every mutation, callee failure/recovery and two-contract rollback when a second nested call fails. Attempted events can remain in the local relay receipt despite registry rollback. Events alone do not prove committed success. `tools/check_contract_driver.mjs` separately loads the learner's generated data-driver through Dusk Connect in a sandbox and checks method schema, argument bytes and exact u64 decoding. The browser displays artifact sizes and SHA-256 hashes, not a deployment claim. The raw tuple events have no registered event-decoding schema.

The independent dApp explorer uses **`src/lesson_registry.rs`**, compiled separately during trusted setup as `explorer.wasm` and `explorer-driver.wasm`. It never replaces the counter reference or uses a learner’s saved contract. Its fixed constructor holds IDs 0, 2 and 9007199254740993 with small seat counts, contract-ID owners and confirmation flags. It exposes only `get_registration`, `owner_of` and `is_confirmed`. The fixed native `explorer` mode allowlists those getters, accepts exactly eight u64 argument bytes from `/work/args`, and returns actual raw VM receipt data. No mutation plan or arbitrary method is accepted.

The matching driver’s Option outputs are Number/null for these bounded seat counts, hex/null for owners and Boolean/null for confirmation. Its generic u64 input rejects JSON strings; the browser lesson validates decimal IDs then uses native `JSON.rawJSON` to pass exact integers through Connect. Driver behavior, large/absent IDs and schema are checked against actual VM output in `test:forge`; browser checks also exercise deliberate HTTP 503/recovery. This read-only snapshot is neither a deployed registry nor a production wallet authorization implementation.

The runner directly uses the already-locked `serde_json 1.0.151` for bounded receipt metadata. No resolved dependency version was changed. All learner compilations remain WASM-only; the fixed native runner/checker are never learner-editable.

## Reproduce

Use the Forge CLI from the official **v0.3.0 tag**. Its CLI package still identifies itself as `0.1.0`, so `dusk-forge --version` alone does not identify the tagged source. Do not use a development/debug CLI that silently overrides dependencies with a local Forge checkout.

To install the tagged CLI separately without replacing another installation:

```sh
rustup toolchain install 1.98.0 --profile minimal \
  --component rust-src --target wasm32-unknown-unknown
cargo +1.98.0 install --git https://github.com/dusk-network/forge \
  --tag v0.3.0 --root "$HOME/.local/dusk-forge-course" dusk-forge-cli
export PATH="$HOME/.local/dusk-forge-course/bin:$PATH"
unset DUSK_FORGE_DEV
```

From this directory:

```sh
dusk-forge check
dusk-forge test
dusk-forge build
dusk-forge schema --pretty
dusk-forge call register --input '2'
dusk-forge verify --skip-build
```

A C build toolchain and normal Cargo network access for dependencies are required on the first build. There is no node, wallet, account, funding or deployment transaction involved. Keep `Cargo.lock`; Forge uses locked builds.

## What was checked

The reference contract, its tests and lockfile were exercised in a temporary build workspace on 2026-09-18, then copied here without build outputs. `dusk-forge check` was also run at this final location.

- Rust **1.98.0** (`88d9e12ae`), pinned in `rust-toolchain.toml`.
- Forge CLI source: tag **v0.3.0**, commit `d1e39a16ad5e2cd0675c7aafa6e2c459310bcb1a`.
- `dusk-forge` **0.3.0**, `dusk-forge-contract` **0.2.0**, `dusk-data-driver` **0.3.1**; exact resolved dependencies in `Cargo.lock`.
- Dusk core/VM **1.6.0**, Rusk tag `dusk-core-1.6.0`, locked commit `ae1a38a2079c681126a96f94c17d282ea2639946`.
- A fresh DuskVM deployment reads zero. Repeated reads do not mutate state.
- `register(2)` followed by `register(1)` reads three.
- Zero, a capacity-violating amount, and arithmetic overflow fail without changing the last good count.
- The capacity failure happens **after a write**: attempting eight more temporarily writes eleven, then traps; a later read still returns three.
- A subsequent valid call succeeds; another fresh deployment starts at zero.
- Both WASM artifacts build and verify; schema contains `get_count: () → u64` and `register: u64 → ()`.
- The generated data driver encodes `register(2)` as `0x0200000000000000`.

The counter checks and generated dApp fixture ABI remain unchanged after the browser expansion. The cumulative browser source differs intentionally; its stage solutions live only in the shared test-edit helper, not in this reference's `src/lib.rs`.

The state checks execute the compiled artifact in DuskVM. They are not native calls to a substitute Rust struct, JavaScript simulations, or source-text checks. This reference checkpoint does not mean all proposed browser lessons are implemented.

## Host-import compatibility

With this SDK/toolchain combination, the stock scaffold initially failed to link `piecrust-uplink 0.20`’s host `panic` function. That ABI declares it without a WASM import annotation.

`build.rs` passes `--import-undefined` **only for WASM builds**, leaving such symbols as imports for the actual runtime to resolve. DuskVM supplies the contract host functions. The compiled module was instantiated and tested in that VM, and the data driver was loaded by Forge. This does not make arbitrary host functions available.

Do not put that flag in global `RUSTFLAGS`: it would also reach native test/build-script linkers. Do not apply this workaround to unrelated compilers or treat compilation alone as verification. Recheck whether the workaround is necessary when upgrading the pinned SDK.

## Scope and provenance

Scaffolded with Forge’s empty template, then adapted to the registration example. The state/ABI setup and VM test pattern follow the [official Forge v0.3.0 template](https://github.com/dusk-network/forge/tree/v0.3.0). Source is provided under MPL-2.0; see `LICENSE`. No Forge illustration is included.

The post-write capacity guard is deliberate teaching material for rollback. Input checks still belong inside the contract. Contract rollback does not imply a refund of transaction fees or reuse of a wallet transaction nonce. Permissions, records and private contract data are not implemented by this checkpoint.
