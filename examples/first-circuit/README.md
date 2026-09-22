# First PLONK circuit

## Native developer compilation

This is the developer build/conformance project for the academy's circuit lesson,
not a deployed verifier contract. Rust **1.98.0** and **dusk-plonk 0.22.1** are pinned.
`Cargo.lock` pins the remaining dependencies. The MPL-2.0 license is included.

- `src/circuit.rs` is the intentionally unfinished starter. It computes a sum but
  does not bind it to the claim. The browser shows the same source.
- `src/lib.rs` is a fixed host harness. Only the learner's circuit file is replaced
  in temporary developer compilation workspaces. No HTTP compilation endpoint exists.
- Add `composer.assert_equal(sum, total);`, then replace the total's
  `append_witness` with `append_public` to finish the two tasks. Equivalent
  constraints are checked by execution, not source-text matching.

From the repository root, after installing the toolchain and bubblewrap as
in the main README:

```sh
npm run setup:circuits
npm run test:circuits
```

The learner page at `http://localhost:5173/course.html?path=circuits` needs only
`npm run dev` (a static server), not either setup command.
The setup cache lives outside the project at `~/.cache/dusk-academy/circuit-lesson`.
No build artifacts or setup secrets are shipped in this directory.

## Static browser engine

The static academy needs no compiler service. `src/browser.rs` is compiled once
into `academy/vendor/circuit-program.wasm` by `npm run build:browser`. The browser
interprets supported edited circuit-building Rust into bounded gate instructions;
this engine applies those instructions to the real composer. A third trusted host
function supplies the gate programs. Gates and public positions must match across
all four fixed construction/test samples. No learner Rust is compiled by the browser.

Native conformance tests and the browser engine use the same real prover/verifier
harness and produce genuine proofs.
The starter's missing equality and incorrect alternative gates affect the actual
proof relation. See [browser runtime limits](../../academy/README.md#browser-runtime)
and [artifact sources/licenses](../../academy/vendor/README.md#browser-wasm-artifacts).

## What runs

The sandbox compiles to WASM with a 64 MiB linear-memory maximum and 256 KiB stack.
The native conformance host permits only two functions: 32 bytes of cryptographic
entropy and one bounded JSON result (16 KiB). The trusted browser engine additionally
receives interpreted gate programs through its third host function. The fixed harness seeds a ChaCha20 RNG
from `crypto.getRandomValues`, creates fresh demonstration parameters, compiles the
circuit, and proves `(4,5,9)`, `(2,3,5)` and `(4,5,8)`. The first two must verify.
The third must not. The public-input chapter additionally requires exactly the
claimed total as the public input and rejects changing it during verification.
Proofs are real 1,008-byte PLONK proofs, not a visualization or simulated hash.

For an unsatisfied witness, this pinned prover can return
`PolynomialDegreeTooLarge` before producing a proof. Only that specific negative
case is accepted as prover rejection. Other errors fail the run. Circuit
construction is checked separately so a normal Rust guard cannot substitute for
constraints. The UI distinguishes rejection by the prover from verification of
an existing proof. Tests cover this distinction, valid alternative equality
constraints and randomized proof output.

The sum is in a scalar field. It has no range, authenticated commitment, credential,
issuer, authorization or replay binding. Anyone can choose inputs for any total.
The samples display witnesses for teaching. They are not private user data.
Fresh single-party parameters are **not** a production setup ceremony. This slice
neither submits proofs to a contract nor supplies production verification keys.

The 15-second browser deadline and per-process compiler limits are not aggregate
resource quotas or a public sandbox review. Results and saved progress are local
learning aids, not tamper-proof credentials.
