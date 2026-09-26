// MPL-2.0. The browser engine's circuit. It replays the gate program that the academy interpreted
// from the learner's Rust for this sample. The learner's Rust itself is not compiled in the browser.
use dusk_bytes::Serializable;
use dusk_plonk::prelude::*;
use serde_json::Value;

#[derive(Default)]
pub struct SecretStats {
    pub strength: BlsScalar,
    pub agility: BlsScalar,
    pub power: BlsScalar,
}

#[link(wasm_import_module = "lesson")]
unsafe extern "C" {
    fn program(ptr: *mut u8, len: usize, sample: usize) -> usize;
}

fn scalar(value: &Value) -> BlsScalar {
    let hex = value.as_str().expect("Expected a scalar encoding");
    assert_eq!(hex.len(), 64, "Scalar encodings have 32 bytes");
    let mut bytes = [0u8; 32];
    for (i, byte) in bytes.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).expect("Invalid scalar hex");
    }
    BlsScalar::from_bytes(&bytes).expect("Scalar is not canonical")
}

impl Circuit for SecretStats {
    fn circuit(&self, composer: &mut Composer) -> Result<(), Error> {
        let sample = crate::sample_list()
            .iter()
            .position(|&[s, a, p]| self.strength == s.into() && self.agility == a.into() && self.power == p.into())
            .expect("Only the host's samples are supported");
        let len = unsafe { program(core::ptr::null_mut(), 0, sample) };
        assert!(len > 0 && len <= 16384, "The gate program exceeds lesson limits");
        let mut bytes = vec![0u8; len];
        assert_eq!(unsafe { program(bytes.as_mut_ptr(), len, sample) }, len);
        let instructions: Vec<Vec<Value>> = serde_json::from_slice(&bytes).expect("Invalid gate program");
        assert!(instructions.len() <= 32, "Too many lesson gates");
        let mut witnesses: Vec<Witness> = Vec::new();
        for op in instructions {
            // -1 stands for the composer's constant zero witness.
            let w = |value: &Value| -> Witness {
                let n = value.as_i64().expect("Expected a witness index");
                if n < 0 { Composer::ZERO } else { *witnesses.get(n as usize).expect("Unknown witness") }
            };
            let witness = match (op.first().and_then(Value::as_str), op.len()) {
                (Some("witness"), 2) => Some(composer.append_witness(scalar(&op[1]))),
                (Some("public"), 2) => Some(composer.append_public(scalar(&op[1]))),
                (Some("add"), 6) => Some(composer.gate_add(
                    Constraint::new().left(scalar(&op[1])).right(scalar(&op[2])).constant(scalar(&op[3])).a(w(&op[4])).b(w(&op[5])),
                )),
                (Some("mul"), 5) => Some(composer.gate_mul(
                    Constraint::new().mult(scalar(&op[1])).constant(scalar(&op[2])).a(w(&op[3])).b(w(&op[4])),
                )),
                (Some("equal"), 3) => {
                    composer.assert_equal(w(&op[1]), w(&op[2]));
                    None
                }
                (Some("range"), 3) => {
                    let target = w(&op[2]);
                    match op[1].as_u64() {
                        Some(4) => composer.component_range::<4>(target),
                        Some(8) => composer.component_range::<8>(target),
                        Some(16) => composer.component_range::<16>(target),
                        _ => panic!("Unsupported range size"),
                    }
                    None
                }
                _ => panic!("Unsupported gate instruction"),
            };
            if let Some(witness) = witness {
                witnesses.push(witness);
            }
        }
        Ok(())
    }
}
