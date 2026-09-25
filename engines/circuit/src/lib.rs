// MPL-2.0. Proves a `SecretStats` circuit for each sample the host supplies, and reports the results.
//
// `circuit.rs` is either `gates.rs` (the browser engine, which replays the gate program the academy
// interpreted from the learner's Rust) or a learner's real circuit (native comparison).
use dusk_bytes::Serializable;
use dusk_plonk::prelude::*;
use rand_chacha::ChaCha20Rng;
use rand_core::SeedableRng;
use serde_json::{Value, json};

mod student {
    include!("circuit.rs");
}

#[link(wasm_import_module = "lesson")]
unsafe extern "C" {
    fn random(ptr: *mut u8, len: usize);
    fn report(ptr: *const u8, len: usize);
    fn samples(ptr: *mut u8, len: usize) -> usize;
}

fn send(value: Value) {
    let text = value.to_string();
    unsafe { report(text.as_ptr(), text.len()) }
}

/// The samples: `[strength, agility, power]` triples. The first is the all-zero default.
pub(crate) fn sample_list() -> Vec<[u64; 3]> {
    let len = unsafe { samples(core::ptr::null_mut(), 0) };
    assert!(len > 0 && len <= 4096, "The sample list exceeds lesson limits");
    let mut bytes = vec![0u8; len];
    assert_eq!(unsafe { samples(bytes.as_mut_ptr(), len) }, len);
    serde_json::from_slice(&bytes).expect("Invalid sample list")
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn run() -> Result<Value, String> {
    let list = sample_list();
    if list.len() < 2 || list.len() > 8 || list[0] != [0, 0, 0] {
        return Err("Expected the default sample followed by one to seven cases.".into());
    }
    let mut seed = [0u8; 32];
    unsafe { random(seed.as_mut_ptr(), seed.len()) }
    let mut rng = ChaCha20Rng::from_seed(seed);
    // Fresh local parameters for learning, not a production setup ceremony.
    let parameters = PublicParameters::setup(1 << 9, &mut rng).map_err(|e| format!("{e:?}"))?;
    let (prover, verifier) = Compiler::compile::<student::SecretStats>(&parameters, b"dusklings-secret-stats")
        .map_err(|e| format!("Compiling the circuit failed: {e:?}"))?;
    let mut cases = Vec::new();
    for &[strength, agility, power] in &list[1..] {
        let circuit = student::SecretStats { strength: strength.into(), agility: agility.into(), power: power.into() };
        // Rust guards and early returns are not constraints: stop instead of treating them as proof rules.
        circuit
            .circuit(&mut Composer::initialized())
            .map_err(|e| format!("Circuit construction failed: {e:?}. Use constraints, not an early return."))?;
        match prover.prove(&mut rng, &circuit) {
            Ok((proof, public)) => {
                let mut tampered = public.clone();
                if let Some(first) = tampered.first_mut() {
                    *first = *first + BlsScalar::one();
                }
                cases.push(json!({
                    "verified": verifier.verify(&proof, &public).is_ok(),
                    "proverRejected": false,
                    "publics": public.iter().map(|p| hex(&p.to_bytes())).collect::<Vec<_>>(),
                    "tamperedVerified": !public.is_empty() && verifier.verify(&proof, &tampered).is_ok(),
                    "proof": hex(&proof.to_bytes()),
                }));
            }
            Err(error) => cases.push(json!({
                "verified": false, "proverRejected": true, "publics": [], "tamperedVerified": false,
                "error": format!("{error:?}"),
            })),
        }
    }
    Ok(json!({"cases": cases}))
}

#[unsafe(no_mangle)]
pub extern "C" fn run_lesson() {
    std::panic::set_hook(Box::new(|info| send(json!({"error": info.to_string()}))));
    match run() {
        Ok(result) => send(result),
        Err(error) => send(json!({"error": error})),
    }
}
