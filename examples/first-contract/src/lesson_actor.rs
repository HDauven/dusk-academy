// Test-only contracts for the academy's fixed scenarios, never a public service.
// These open test relays model contract principals, NOT authenticated wallets.
// Production contract owners must authorize who can ask them to act.
#![no_std]
#![cfg(target_family = "wasm")]

#[dusk_forge::contract]
mod fixture {
    use dusk_core::abi::{self, ContractError, ContractId};
    const REGISTRY: ContractId = ContractId::from_bytes([1; 32]);

    pub struct Fixture { booked: u64, offline: bool, rate: u64, limit: u64 }

    impl Fixture {
        pub const fn new() -> Self { Self { booked: 0, offline: false, rate: 3, limit: 10 } }

        pub fn current(&self) -> Result<Option<ContractId>, ContractError> {
            abi::call(REGISTRY, "current_caller", &())
        }

        // Keep the callee's error kind: gas/ABI errors must not become panics.
        pub fn perform(&mut self, action: u8, a: u64, b: u64) -> Result<u64, ContractError> {
            match action {
                0 => abi::call(REGISTRY, "register", &a),
                1 => abi::call::<_, ()>(REGISTRY, "cancel", &a).map(|_| 0),
                2 => abi::call::<_, ()>(REGISTRY, "resize", &(a, b)).map(|_| 0),
                3 => abi::call::<_, ()>(REGISTRY, "confirm", &a).map(|_| 0),
                4 => abi::call::<_, ()>(REGISTRY, "confirm_pair", &(a, b)).map(|_| 0),
                _ => panic!("Unknown test action"),
            }
        }

        pub fn quote(&self, seats: u64) -> u64 {
            assert!(!self.offline, "Venue unavailable");
            seats * self.rate
        }

        pub fn book(&mut self, id: u64, seats: u64) {
            assert!(abi::caller() == Some(REGISTRY));
            // Deliberately write before failure, to exercise child-frame rollback.
            self.booked += seats;
            assert!(!self.offline, "Venue unavailable");
            assert!(self.booked <= self.limit, "Venue limit exceeded");
            abi::emit("venue_booked", (id, seats));
        }

        pub fn booked(&self) -> u64 { self.booked }
        pub fn set_offline(&mut self, offline: bool) { self.offline = offline; }
        pub fn set_rate(&mut self, rate: u64) { self.rate = rate; }
        pub fn set_limit(&mut self, limit: u64) { self.limit = limit; }
    }
}
