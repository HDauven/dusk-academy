// MPL-2.0. Fixed browser harness; only circuit.rs is learner-editable.
use dusk_bytes::Serializable;
use dusk_plonk::prelude::*;
use rand_chacha::ChaCha20Rng;
use rand_core::SeedableRng;
use serde_json::json;

mod student { include!("circuit.rs"); }

#[link(wasm_import_module = "lesson")]
unsafe extern "C" {
    fn random(ptr: *mut u8, len: usize);
    fn report(ptr: *const u8, len: usize);
}

fn send(value: serde_json::Value) {
    let text = value.to_string();
    unsafe { report(text.as_ptr(), text.len()); }
}

fn run() -> Result<serde_json::Value, String> {
    let mut seed = [0u8; 32];
    unsafe { random(seed.as_mut_ptr(), seed.len()); }
    let mut rng = ChaCha20Rng::from_seed(seed);
    // Fresh local parameters for learning, not a production setup ceremony.
    let parameters = PublicParameters::setup(128, &mut rng).map_err(|e| format!("{e:?}"))?;
    let (prover, verifier) = Compiler::compile::<student::SumCircuit>(&parameters, b"dusk-academy-sum-v1")
        .map_err(|e| format!("{e:?}"))?;
    let mut cases = Vec::new();
    let mut example_proof = String::new();
    for (a, b, total) in [(4u64, 5u64, 9u64), (2, 3, 5), (4, 5, 8)] {
        let circuit = student::SumCircuit { a: a.into(), b: b.into(), total: total.into() };
        // Reject ordinary Rust guards before calling the prover. The relation
        // must be expressed as constraints, including for an invalid witness.
        circuit.circuit(&mut Composer::initialized())
            .map_err(|e| format!("Circuit construction failed: {e:?}. Use constraints, not an early return."))?;
        let (proof, public) = match prover.prove(&mut rng, &circuit) {
            Ok(result) => result,
            // This pinned prover can reject an unsatisfied witness while
            // committing the quotient; do not invent a proof in that case.
            Err(Error::PolynomialDegreeTooLarge) if a + b != total => {
                cases.push(json!({"a": a, "b": b, "total": total, "verified": false,
                    "proverRejected": true, "proofBytes": 0}));
                continue;
            }
            Err(error) => return Err(format!("Proof generation failed: {error:?}")),
        };
        let bytes = proof.to_bytes();
        if example_proof.is_empty() {
            example_proof = bytes.iter().map(|b| format!("{b:02x}")).collect();
        }
        cases.push(json!({
            "a": a, "b": b, "total": total,
            "verified": verifier.verify(&proof, &public).is_ok(), "proverRejected": false,
            "publicCount": public.len(),
            "publicMatches": public == vec![BlsScalar::from(total)],
            "changedTotalVerified": verifier.verify(&proof, &[BlsScalar::from(total + 1)]).is_ok(),
            "proofBytes": bytes.len()
        }));
    }
    Ok(json!({"cases": cases, "proof": example_proof}))
}

#[unsafe(no_mangle)]
pub extern "C" fn run_lesson() {
    std::panic::set_hook(Box::new(|info| send(json!({"error": info.to_string()}))));
    match run() {
        Ok(result) => send(result),
        Err(error) => send(json!({"error": error})),
    }
}
