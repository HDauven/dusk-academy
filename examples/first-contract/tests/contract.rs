// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

use dusk_core::abi::ContractId;
use dusk_vm::{ContractData, Session, VM};

const WASM: &[u8] = include_bytes!(
    "../target/contract/wasm32-unknown-unknown/release/dusk_registry.wasm"
);
const ID: ContractId = ContractId::from_bytes([1; 32]);
const GAS: u64 = 100_000_000;

fn count(session: &mut Session) -> u64 {
    session.call::<_, u64>(ID, "get_count", &(), GAS).unwrap().data
}

#[test]
fn state_calls_boundaries_and_rollback_in_duskvm() {
    let vm = VM::ephemeral().unwrap();
    let mut session = vm.genesis_session(1);
    let deployment = || ContractData::builder().owner([0; 32]).contract_id(ID);
    assert_eq!(session.deploy(WASM, deployment(), GAS).unwrap(), ID);
    assert_eq!(count(&mut session), 0);
    assert_eq!(count(&mut session), 0, "reading must not mutate state");

    for amount in [2_u64, 1] {
        session.call::<_, ()>(ID, "register", &amount, GAS).unwrap();
    }
    assert_eq!(count(&mut session), 3, "calls share persisted state");

    for invalid in [0_u64, 8, u64::MAX] {
        // 8 writes 11 before the capacity check traps; that write must roll back.
        assert!(session.call::<_, ()>(ID, "register", &invalid, GAS).is_err());
        assert_eq!(count(&mut session), 3, "failure must preserve the last good state");
    }
    session.call::<_, ()>(ID, "register", &7_u64, GAS).unwrap();
    assert_eq!(count(&mut session), 10);
    assert!(session.call::<_, ()>(ID, "register", &1_u64, GAS).is_err());
    assert_eq!(count(&mut session), 10);

    let fresh_vm = VM::ephemeral().unwrap();
    let mut fresh = fresh_vm.genesis_session(1);
    fresh.deploy(WASM, deployment(), GAS).unwrap();
    assert_eq!(count(&mut fresh), 0, "a new deployment is not a state migration");
}
