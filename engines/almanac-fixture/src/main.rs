//! Writes the Almanac's simulated node: one Hatchery with six Dusklings and three keepers.
//!
//! Every response is `rkyv::to_bytes` of the value the Hatchery's getter returns, and every key is
//! `rkyv::to_bytes` of the argument the Hatchery data-driver encodes, so the real driver in the
//! browser decodes these bytes exactly as it would a node's.
use dusk_core::signatures::bls::{PublicKey, SecretKey};
use rand_chacha::ChaCha20Rng;
use rand_core::SeedableRng;
use serde_json::{Map, Value, json};

fn hex<T>(value: &T) -> String
where
    T: rkyv::Serialize<rkyv::ser::serializers::AllocSerializer<1024>>,
{
    rkyv::to_bytes::<_, 1024>(value).expect("serializable").iter().map(|b| format!("{b:02x}")).collect()
}

fn main() {
    // Deterministic demo keys: not anyone's real account.
    let keeper = |seed: u64| PublicKey::from(&SecretKey::random(&mut ChaCha20Rng::seed_from_u64(seed)));
    let keepers = [("you", keeper(1)), ("rook", keeper(2)), ("fen", keeper(3))];
    let key = |name: &str| keepers.iter().find(|(n, _)| *n == name).unwrap().1;

    // Duskling #3's DNA is above 2^53, so JavaScript numbers can't hold it exactly.
    let dusklings: [(u64, &str); 6] = [
        (8356281049284737, "you"),
        (1568560902483828, "rook"),
        (2788147323984481, "fen"),
        (9437186547890123, "rook"),
        (4782421232467499, "you"),
        (1305780178061356, "fen"),
    ];

    let mut dna_of = Map::new();
    let mut owner_of = Map::new();
    for (id, (dna, owner)) in dusklings.iter().enumerate() {
        dna_of.insert(hex(&(id as u64)), json!(hex(&Some(*dna))));
        owner_of.insert(hex(&(id as u64)), json!(hex(&Some(key(owner)))));
    }
    let mut dusklings_of = Map::new();
    for (name, pk) in &keepers {
        let count = dusklings.iter().filter(|(_, o)| o == name).count() as u64;
        dusklings_of.insert(hex(pk), json!(hex(&count)));
    }

    let out = json!({
        "contract": "4a".repeat(32),
        "keepers": keepers.iter().map(|(n, pk)| (n.to_string(), serde_json::to_value(pk).unwrap())).collect::<Map<String, Value>>(),
        // Each key as the driver encodes it in arguments.
        "keyBytes": keepers.iter().map(|(n, pk)| (n.to_string(), json!(hex(pk)))).collect::<Map<String, Value>>(),
        "dusklings": dusklings.iter().enumerate().map(|(id, (dna, owner))| json!({"id": id, "dna": dna.to_string(), "owner": owner})).collect::<Vec<_>>(),
        "calls": {
            "duskling_count": {"": hex(&(dusklings.len() as u64))},
            "dna_of": dna_of,
            "owner_of": owner_of,
            "dusklings_of": dusklings_of,
        },
        // What the getters return for anything else: no such Duskling, or no Dusklings for that key.
        "otherwise": {
            "dna_of": hex(&None::<u64>),
            "owner_of": hex(&None::<PublicKey>),
            "dusklings_of": hex(&0u64),
        },
    });
    println!("{}", serde_json::to_string_pretty(&out).unwrap());
}
