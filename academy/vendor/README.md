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

After the documented native setup, run `npm run build:browser`. It uses prepared libraries and pinned rustc in the existing sandbox, without Cargo installs/downloads. `browser-runtime.json` records source hashes, exact artifact sizes/hashes and toolchain/library versions. Rebuilds on the pinned toolchain are checked for identical output. These assets total about 1.1 MiB and load only as needed.

### Upstream licensing

The generated dependency and Rust standard-library reports are not mirrored here. Refer to the pinned upstream sources:

- Rust 1.98.0: [copyright and licensing notice](https://github.com/rust-lang/rust/blob/1.98.0/COPYRIGHT), [MIT license](https://github.com/rust-lang/rust/blob/1.98.0/LICENSE-MIT) and [Apache license](https://github.com/rust-lang/rust/blob/1.98.0/LICENSE-APACHE). The detailed `COPYRIGHT-library.html` report accompanies the Rust toolchain distribution.
- Forge v0.3.0: [source and license declaration](https://github.com/dusk-network/forge/blob/d1e39a16ad5e2cd0675c7aafa6e2c459310bcb1a/Cargo.toml).
- Dusk core 1.6.0: [pinned source](https://github.com/dusk-network/rusk/tree/ae1a38a2079c681126a96f94c17d282ea2639946/core) and [license](https://github.com/dusk-network/rusk/blob/ae1a38a2079c681126a96f94c17d282ea2639946/LICENSE).
- dusk-plonk 0.22.1: [upstream license](https://github.com/dusk-network/plonk/blob/v0.22.1/LICENSE).
- Transitive Cargo dependencies: exact versions and sources are recorded in the [contract lockfile](../../examples/first-contract/Cargo.lock) and [circuit lockfile](../../examples/first-circuit/Cargo.lock). Registry source archives, including their published license/notice files, are available at `https://crates.io/api/v1/crates/NAME/VERSION/download` using those exact names and versions.

Original Rust/engine sources and modifications remain included under MPL-2.0 in `examples/`, with their license files. Dependencies retain their own terms, not the academy MIT license. These links identify upstream licensing; they do not establish that link-only attribution satisfies every binary-redistribution requirement. Check applicable copyright, license-copy, notice and source-availability obligations before redistribution.
