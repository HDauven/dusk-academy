# Locally bundled Dusk Connect

`dusk-connect.js` is the browser root entrypoint from the official
https://github.com/dusk-network/connect repository, pinned to commit
`67b37ab0969bd42bf2b8d95f7b610cb654e49be8` (package metadata: 0.2.0).
This identifies the exact source, not a claim that the checkout is a published release.
The root entrypoint has no runtime dependencies; optional typed-data/BLS entrypoints are not bundled.
See `dusk-connect.LICENSE` (MIT).

Reproduce from that checkout:

```sh
npx --yes --package=esbuild@0.25.12 esbuild /path/to/connect/src/index.ts \
  --bundle --format=esm --platform=browser --target=es2022 --minify \
  --legal-comments=eof --outfile=academy/vendor/dusk-connect.js
```

No CDN, package registry or build tool is contacted by learners' browsers.

## Browser WASM artifacts

These are prebuilt trusted components, not compiled learner submissions:

- `counter-driver.wasm`: generated from `examples/first-contract/src/lib.rs`.
- `explorer-driver.wasm`: generated from `examples/first-contract/src/lesson_registry.rs`.
- `registry-methods.wasm`: generated from the full worked registry assembled by `tools/build_browser.py::lesson_sources`, using the same staged edits as native conformance tests. The browser checks compatible parsed signatures before using it; this is not an edited-source build.
- `circuit-program.wasm`: `examples/first-circuit/src/browser.rs` in the existing `src/lib.rs` harness. Interpreted gate instructions configure actual dusk-plonk 0.22.1 proving/verification. Incorrect gates do not select a pre-recorded proof.

After the documented native setup, run `npm run build:browser`. It uses prepared libraries and pinned rustc in the existing sandbox, without Cargo installs/downloads. `browser-runtime.json` records source hashes, exact artifact sizes/hashes and toolchain/library versions. Rebuilds on the pinned toolchain are checked for identical output. These assets total about 1.1 MiB and load only as needed; notice documents are not loaded by exercises.

Original Rust/engine source remains MPL-2.0. Dependencies retain their own licenses, not the academy MIT license. [WASM dependency notices](browser-wasm-NOTICES.txt) list the locked normal/build dependency closure (including build-time macros and conservatively included dead-code dependencies), authors, exact source locations and deduplicated license texts. [Rust standard-library notices](rust-standard-library-NOTICES.html) are copied unchanged from the pinned 1.98.0 toolchain. For MPL-covered source and modifications, the Rust examples are included here; each registry dependency's exact source archive is linked by name/version in the notices, and git Dusk core is pinned to `ae1a38a2079c681126a96f94c17d282ea2639946`.

The inventory was checked with `cargo metadata --locked --format-version 1 --filter-platform wasm32-unknown-unknown` for both example manifests, adding `--features data-driver-js` for contracts and excluding dev-only dependency edges. Update this inventory and upstream notices whenever either lockfile, feature selection or toolchain changes. Upstream crates that omit license files are identified by their declared license/authors and pinned source; missing MIT/Apache texts were obtained from the corresponding upstream VCS revision where available. The published seahash source has no copyright file; its declared authors and MIT terms are retained without inventing a copyright year.
