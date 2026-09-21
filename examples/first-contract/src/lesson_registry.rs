// Read-only teaching snapshot, compiled separately from the counter reference.
// Owners are contract IDs, not authenticated wallet users. No personal data.
#![no_std]
#![cfg(target_family = "wasm")]

#[dusk_forge::contract]
mod registry {
    use dusk_core::abi::ContractId;

    struct Registration { id: u64, seats: u64, owner: ContractId, confirmed: bool }
    pub struct Registry { records: [Registration; 3] }

    impl Registry {
        pub const fn new() -> Self {
            Self { records: [
                Registration { id: 0, seats: 2, owner: ContractId::from_bytes([0x22; 32]), confirmed: false },
                Registration { id: 2, seats: 3, owner: ContractId::from_bytes([0x33; 32]), confirmed: true },
                Registration { id: 9_007_199_254_740_993, seats: 5, owner: ContractId::from_bytes([0x22; 32]), confirmed: false },
            ] }
        }

        pub fn get_registration(&self, id: u64) -> Option<u64> {
            self.records.iter().find(|record| record.id == id).map(|record| record.seats)
        }

        pub fn owner_of(&self, id: u64) -> Option<ContractId> {
            self.records.iter().find(|record| record.id == id).map(|record| record.owner)
        }

        pub fn is_confirmed(&self, id: u64) -> Option<bool> {
            self.records.iter().find(|record| record.id == id).map(|record| record.confirmed)
        }
    }
}
