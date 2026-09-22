// MPL-2.0. Prebuilt PLONK engine for the browser lesson's interpreted gate program.
// This file, not the learner's edited Rust, is compiled into the distributed WASM.
use dusk_plonk::prelude::*;
use dusk_bytes::Serializable;
use serde_json::Value;

#[derive(Default)]
pub struct SumCircuit { pub a: BlsScalar, pub b: BlsScalar, pub total: BlsScalar }

#[link(wasm_import_module = "lesson")]
unsafe extern "C" { fn program(ptr: *mut u8, len: usize, sample: usize) -> usize; }

fn scalar(value: &Value) -> BlsScalar {
    let hex = value.as_str().expect("Expected a scalar encoding");
    assert_eq!(hex.len(), 64, "Scalar encodings have 32 bytes");
    let mut bytes = [0u8; 32];
    for (i, byte) in bytes.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[i*2..i*2+2], 16).expect("Invalid scalar hex");
    }
    BlsScalar::from_bytes(&bytes).expect("Scalar is not canonical")
}

impl Circuit for SumCircuit {
    fn circuit(&self, composer: &mut Composer) -> Result<(), Error> {
        let sample = [(0u64,0u64,0u64),(4,5,9),(2,3,5),(4,5,8)].iter()
            .position(|&(a,b,total)| self.a == a.into() && self.b == b.into() && self.total == total.into())
            .expect("Only fixed teaching samples are supported");
        let len = unsafe { program(core::ptr::null_mut(), 0, sample) };
        assert!(len > 0 && len <= 16384, "Gate program exceeds lesson limits");
        let mut bytes = vec![0u8; len];
        assert_eq!(unsafe { program(bytes.as_mut_ptr(), len, sample) }, len);
        let instructions: Vec<Vec<Value>> = serde_json::from_slice(&bytes).expect("Invalid gate program");
        assert!(instructions.len() <= 32, "Too many lesson gates");
        let mut witnesses: Vec<Witness> = Vec::new();
        for op in instructions {
            let index = |value: &Value| -> Witness {
                let n = value.as_u64().expect("Expected a witness index");
                *witnesses.get(n as usize).expect("Unknown witness")
            };
            let witness = match op.first().and_then(Value::as_str) {
                Some("witness") if op.len() == 2 => Some(composer.append_witness(scalar(&op[1]))),
                Some("public") if op.len() == 2 => Some(composer.append_public(scalar(&op[1]))),
                Some("add") if op.len() == 5 => Some(composer.gate_add(Constraint::new()
                    .left(scalar(&op[1])).right(scalar(&op[2])).a(index(&op[3])).b(index(&op[4])))),
                Some("equal") if op.len() == 3 => { composer.assert_equal(index(&op[1]), index(&op[2])); None },
                _ => panic!("Unsupported gate instruction"),
            };
            if let Some(witness) = witness { witnesses.push(witness); }
        }
        Ok(())
    }
}
