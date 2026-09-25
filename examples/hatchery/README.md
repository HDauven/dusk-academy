# The Hatchery, natively

`src/lib.rs` is the contract you build in the five Hatchery lessons of Dusk Academy: hatching, keepers, the moth hunt, night battles and trading. Here it's a real [Dusk Forge](https://github.com/dusk-network/forge) crate that you can compile yourself.

You need Rust with the `wasm32-unknown-unknown` target. `rust-toolchain.toml` pins 1.98.0, and rustup installs it on first use.

```sh
cd examples/hatchery

# The contract, as DuskVM runs it
cargo build --release --target wasm32-unknown-unknown --features contract

# The data-driver, which encodes calls and decodes results and events as JSON for apps
cargo build --release --target wasm32-unknown-unknown --features data-driver-js
```

The contract WASM ends up in `target/wasm32-unknown-unknown/release/dusk_hatchery.wasm`.

## Not included

- **The Moth Nest.** The lesson's other contract is only simulated in the browser. `MOTH_NEST` is a placeholder ID (`[7; 32]`), so a real deployment needs the real contract's ID.
- **Tests and deployment.** There are no VM tests or deploy scripts here. For those, start from the `contract-template` directory in the [Forge repository](https://github.com/dusk-network/forge), which includes a Makefile and a test setup.

The academy's `npm run test:rust` compiles every chapter's reference answer in a copy of this crate. That's how the lessons stay real Rust.

## License

The crate scaffold (`Cargo.toml`, `build.rs`) follows the [Dusk Forge v0.3.0 contract template](https://github.com/dusk-network/forge/tree/v0.3.0), so this crate is provided under MPL-2.0 (see `LICENSE`).
