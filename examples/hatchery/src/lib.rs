#![no_std]

extern crate alloc;

use bytecheck::CheckBytes;
use dusk_core::signatures::bls::PublicKey as BlsPublicKey;
use dusk_forge::ContractEvent;
use rkyv::{Archive, Deserialize, Serialize};

/// A Duskling hatched.
#[derive(Archive, Serialize, Deserialize)]
#[archive_attr(derive(CheckBytes))]
#[cfg_attr(feature = "data-driver", derive(serde::Serialize, serde::Deserialize))]
pub struct Hatched {
    pub id: u64,
    pub dna: u64,
}

impl ContractEvent for Hatched {
    const TOPICS: &'static [&'static str] = &["hatched"];
}

/// A Duskling came back from a hunt.
#[derive(Archive, Serialize, Deserialize)]
#[archive_attr(derive(CheckBytes))]
#[cfg_attr(feature = "data-driver", derive(serde::Serialize, serde::Deserialize))]
pub struct Hunted {
    pub id: u64,
    pub moth_id: u64,
}

impl ContractEvent for Hunted {
    const TOPICS: &'static [&'static str] = &["hunted"];
}

/// A Duskling changed hands.
#[derive(Archive, Serialize, Deserialize)]
#[archive_attr(derive(CheckBytes))]
#[cfg_attr(feature = "data-driver", derive(serde::Serialize, serde::Deserialize))]
pub struct Transferred {
    pub id: u64,
    pub to: BlsPublicKey,
}

impl ContractEvent for Transferred {
    const TOPICS: &'static [&'static str] = &["transferred"];
}

#[dusk_forge::contract(events = [crate::Hatched, crate::Hunted, crate::Transferred])]
mod hatchery {
    use alloc::vec::Vec;
    use dusk_core::abi::{self, ContractId};
    use dusk_core::signatures::bls::PublicKey as BlsPublicKey;

    const DNA_DIGITS: u32 = 16;
    const DNA_MODULUS: u64 = 10u64.pow(DNA_DIGITS);
    // 2^64 divided by the golden ratio: a classic mixing constant.
    const MIX: u64 = 0x9E37_79B9_7F4A_7C15;
    // The Moth Nest: another team's contract on the same chain.
    const MOTH_NEST: ContractId = ContractId::from_bytes([7; 32]);
    const COOLDOWN: u64 = 360;

    struct Duskling {
        dna: u64,
        level: u32,
        owner: BlsPublicKey,
        ready_at: u64,
        wins: u32,
        losses: u32,
        approved: Option<BlsPublicKey>,
    }

    pub struct Hatchery {
        dusklings: Vec<Duskling>,
    }

    impl Hatchery {
        pub const fn new() -> Self {
            Self { dusklings: Vec::new() }
        }

        fn create_duskling(&mut self, dna: u64, owner: BlsPublicKey) {
            let id = self.dusklings.len() as u64;
            self.dusklings.push(Duskling { dna, level: 1, owner, ready_at: 0, wins: 0, losses: 0, approved: None });
            abi::emit("hatched", crate::Hatched { id, dna });
        }

        fn generate_dna(&self, seed: u64) -> u64 {
            seed.wrapping_mul(MIX) % DNA_MODULUS
        }

        pub fn hatch(&mut self, seed: u64) {
            let keeper = abi::public_sender().expect("Hatch from a public Moonlight account");
            assert!(self.dusklings_of(keeper) == 0, "Every keeper hatches one Duskling");
            let dna = self.generate_dna(seed);
            self.create_duskling(dna, keeper);
        }

        pub fn duskling_count(&self) -> u64 {
            self.dusklings.len() as u64
        }

        pub fn dna_of(&self, id: u64) -> Option<u64> {
            self.dusklings.get(id as usize).map(|d| d.dna)
        }

        pub fn owner_of(&self, id: u64) -> Option<BlsPublicKey> {
            self.dusklings.get(id as usize).map(|d| d.owner)
        }

        pub fn dusklings_of(&self, keeper: BlsPublicKey) -> u64 {
            self.dusklings.iter().filter(|d| d.owner == keeper).count() as u64
        }

        fn moth_dna(&self, moth_id: u64) -> u64 {
            abi::call::<_, u64>(MOTH_NEST, "moth_dna", &moth_id).expect("The Moth Nest has no such moth")
        }

        fn blend(&self, dna: u64, moth: u64) -> u64 {
            let mixed = (dna + moth) / 2;
            mixed - mixed % 100 + 99
        }

        pub fn hunt(&mut self, id: u64, moth_id: u64) {
            let keeper = self.only_keeper(id);
            assert!(self.is_ready(id), "Your Duskling is still resting");
            let hunter = &self.dusklings[id as usize];
            let dna = self.blend(hunter.dna, self.moth_dna(moth_id));
            self.create_duskling(dna, keeper);
            abi::emit("hunted", crate::Hunted { id, moth_id });
            self.dusklings[id as usize].ready_at = abi::block_height() + COOLDOWN;
        }

        fn is_ready(&self, id: u64) -> bool {
            abi::block_height() >= self.dusklings[id as usize].ready_at
        }

        fn only_keeper(&self, id: u64) -> BlsPublicKey {
            let keeper = abi::public_sender().expect("Use a public Moonlight account");
            let duskling = self.dusklings.get(id as usize).expect("No such Duskling");
            assert!(duskling.owner == keeper, "Only its keeper can do that");
            keeper
        }

        fn roll(&self, id: u64, target: u64) -> u64 {
            id.wrapping_mul(MIX)
                .wrapping_add(target)
                .wrapping_add(abi::block_height())
                .wrapping_mul(MIX)
                % 100
        }

        pub fn battle(&mut self, id: u64, target: u64) {
            self.only_keeper(id);
            assert!(self.is_ready(id), "Your Duskling is still resting");
            assert!(id != target && (target as usize) < self.dusklings.len(), "Pick another Duskling to battle");
            let roll = self.roll(id, target);
            if roll < 70 {
                self.dusklings[id as usize].wins += 1;
                self.dusklings[id as usize].level += 1;
                self.dusklings[target as usize].losses += 1;
            } else {
                self.dusklings[id as usize].losses += 1;
                self.dusklings[target as usize].wins += 1;
            }
            self.dusklings[id as usize].ready_at = abi::block_height() + COOLDOWN;
        }

        pub fn transfer(&mut self, id: u64, to: BlsPublicKey) {
            self.only_keeper(id);
            self.dusklings[id as usize].owner = to;
            self.dusklings[id as usize].approved = None;
            abi::emit("transferred", crate::Transferred { id, to });
        }

        pub fn approve(&mut self, id: u64, to: BlsPublicKey) {
            self.only_keeper(id);
            self.dusklings[id as usize].approved = Some(to);
        }

        pub fn take(&mut self, id: u64) {
            let taker = abi::public_sender().expect("Use a public Moonlight account");
            let duskling = &mut self.dusklings[id as usize];
            assert!(duskling.approved == Some(taker), "You're not approved to take this Duskling");
            duskling.owner = taker;
            duskling.approved = None;
        }
    }
}
