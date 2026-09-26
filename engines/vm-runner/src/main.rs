//! Replays contract calls in Dusk's VM for tools/check_vm.mjs.
//!
//!   vm-runner keys          prints the demo keepers' public keys (base58, as data-drivers read them)
//!   vm-runner < script.json deploys the script's contracts, runs its steps and prints the results
//!
//! Each step runs the way a Moonlight transaction reaches a contract: in its own session at the
//! step's block height, with `PUBLIC_SENDER` set to the keeper's key (or to `None` for a shielded
//! sender). A failed call leaves no trace: the session is dropped, as the network reverts the call
//! and discards its events. Events from reverted inter-contract calls are dropped too, as rusk does.
use std::io::Read;

use dusk_core::abi::{ContractId, Metadata};
use dusk_core::signatures::bls::{PublicKey, SecretKey};
use dusk_vm::{ContractData, VM};
use rand_chacha::ChaCha20Rng;
use rand_core::SeedableRng;
use serde_json::{Value, json};

const CHAIN_ID: u8 = 1;
const GAS_LIMIT: u64 = 1_000_000_000;
// The interpreter's keepers, with the same demo keys as the Almanac's practice node.
const KEEPERS: [(&str, u64); 3] = [("you", 1), ("rival", 2), ("friend", 3)];

fn keeper(name: &str) -> PublicKey {
    let (_, seed) = KEEPERS.iter().find(|(n, _)| *n == name).unwrap_or_else(|| panic!("unknown keeper {name}"));
    PublicKey::from(&SecretKey::random(&mut ChaCha20Rng::seed_from_u64(*seed)))
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn unhex(text: &str) -> Vec<u8> {
    (0..text.len()).step_by(2).map(|i| u8::from_str_radix(&text[i..i + 2], 16).expect("hex")).collect()
}

fn contract_id(value: &Value) -> ContractId {
    ContractId::from_bytes(unhex(value.as_str().expect("contract id")).try_into().expect("32-byte contract id"))
}

fn main() {
    if std::env::args().nth(1).as_deref() == Some("keys") {
        let keys: serde_json::Map<String, Value> =
            KEEPERS.iter().map(|(name, _)| (name.to_string(), serde_json::to_value(keeper(name)).unwrap())).collect();
        println!("{}", Value::Object(keys));
        return;
    }

    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input).expect("script on stdin");
    let script: Value = serde_json::from_str(&input).expect("JSON script");

    let vm = VM::ephemeral().expect("ephemeral VM");
    let mut genesis = vm.genesis_session(CHAIN_ID);
    for contract in script["contracts"].as_array().expect("contracts") {
        let bytecode = std::fs::read(contract["wasm"].as_str().expect("wasm path")).expect("readable wasm");
        let data = ContractData::builder().owner([0u8; 32].to_vec()).contract_id(contract_id(&contract["id"]));
        genesis.deploy::<(), (), _>(&bytecode, data, GAS_LIMIT).expect("deployable contract");
    }
    let mut base = genesis.commit().expect("genesis commit");

    let mut results = Vec::new();
    for step in script["steps"].as_array().expect("steps") {
        let height = step["height"].as_u64().expect("height");
        let mut session = vm.session(base, CHAIN_ID, height).expect("session");
        let sender = step["sender"].as_str().map(keeper);
        session.set_meta(Metadata::PUBLIC_SENDER, sender).expect("sender metadata");
        let arg = unhex(step["arg"].as_str().expect("argument hex"));
        let function = step["fn"].as_str().expect("function name");
        match session.call_raw(contract_id(&step["contract"]), function, arg, GAS_LIMIT) {
            Ok(receipt) => {
                let events: Vec<Value> = receipt
                    .events
                    .iter()
                    .filter(|e| !e.reverted)
                    .map(|e| json!({"source": hex(e.source.as_bytes()), "topic": e.topic, "data": hex(&e.data)}))
                    .collect();
                results.push(json!({"ok": true, "data": hex(&receipt.data), "events": events, "gas": receipt.gas_spent}));
                if !step["query"].as_bool().unwrap_or(false) {
                    base = session.commit().expect("commit");
                }
            }
            Err(error) => results.push(json!({"ok": false, "error": error.to_string()})),
        }
    }
    println!("{}", json!({"results": results}));
}
