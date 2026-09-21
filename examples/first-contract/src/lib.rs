// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

#![no_std]
#![cfg(target_family = "wasm")]

extern crate alloc;

#[dusk_forge::contract]
mod registry {
    pub struct Registry {
        count: u64,
    }

    impl Registry {
        pub const fn new() -> Self {
            Self { count: 0 }
        }

        pub fn get_count(&self) -> u64 {
            self.count
        }

        pub fn register(&mut self, amount: u64) {
            assert!(amount > 0, "Use a positive amount");
            self.count += amount;
            // Deliberately checked after the write to demonstrate VM rollback.
            assert!(self.count <= 10, "Registry is full");
        }
    }
}
