// The Moth Nest from the Hatchery lessons, as a real contract. tools/check_vm.mjs deploys it at
// ContractId [7; 32] next to each chapter's Hatchery. Its moths match MOTHS in academy/contract.js.
#![no_std]

extern crate alloc;

#[dusk_forge::contract]
mod moth_nest {
    pub struct MothNest {
        moths: [u64; 6],
    }

    impl MothNest {
        pub const fn new() -> Self {
            Self { moths: [4417300918265521, 1290847365512087, 8850023141736402, 6023597714405839, 2771040968153346, 5506328879120114] }
        }

        // An unknown moth panics, so the caller's `abi::call` gets an error back.
        pub fn moth_dna(&self, moth_id: u64) -> u64 {
            self.moths[moth_id as usize]
        }
    }
}
