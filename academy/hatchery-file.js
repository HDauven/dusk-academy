// Builds the learner's lib.rs from named parts, so every chapter's reference file stays consistent.
const indent = (text, n) => text.split('\n').map(line => line ? ' '.repeat(n) + line : line).join('\n');

// Forge event types live at the top of the file, outside the contract module. The attribute lines
// let rkyv encode the event on chain and serde turn it into JSON for apps (in data-driver builds).
const EVENT_ATTRIBUTES = `#[derive(Archive, Serialize, Deserialize)]
#[archive_attr(derive(CheckBytes))]
#[cfg_attr(feature = "data-driver", derive(serde::Serialize, serde::Deserialize))]`;

// One event type. `topics: null` leaves out its ContractEvent impl; `keys: true` imports the key
// type at the top of the file even before a field uses it.
export function eventType({name, doc, fields, topics}) {
  const impl = topics ? `\n\nimpl ContractEvent for ${name} {\n    const TOPICS: &'static [&'static str] = &[${topics.map(t => JSON.stringify(t)).join(', ')}];\n}` : '';
  return `/// ${doc}\n${EVENT_ATTRIBUTES}\npub struct ${name} {\n${indent(fields.join('\n'), 4)}\n}${impl}`;
}

// The top of the file: imports and event types, then the contract attribute registering `registered`.
export function header(events = [], registered = []) {
  if (!events.length) return `#![no_std]\n\nextern crate alloc;\n\n#[dusk_forge::contract]`;
  const keys = events.some(e => e.keys || e.fields.some(f => /BlsPublicKey/.test(f)));
  const imports = ['use bytecheck::CheckBytes;', ...(keys ? ['use dusk_core::signatures::bls::PublicKey as BlsPublicKey;'] : []), 'use dusk_forge::ContractEvent;', 'use rkyv::{Archive, Deserialize, Serialize};'];
  const attribute = registered.length ? `#[dusk_forge::contract(events = [${registered.map(n => `crate::${n}`).join(', ')}])]` : '#[dusk_forge::contract]';
  return `#![no_std]\n\nextern crate alloc;\n\n${imports.join('\n')}\n\n${events.map(eventType).join('\n\n')}\n\n${attribute}`;
}

export const HATCHED = {name: 'Hatched', doc: 'A Duskling hatched.', fields: ['pub id: u64,', 'pub dna: u64,'], topics: ['hatched']};
export const HUNTED = {name: 'Hunted', doc: 'A Duskling came back from a hunt.', fields: ['pub id: u64,', 'pub moth_id: u64,'], topics: ['hunted']};
export const TRANSFERRED = {name: 'Transferred', doc: 'A Duskling changed hands.', fields: ['pub id: u64,', 'pub to: BlsPublicKey,'], topics: ['transferred']};

export function file({imports, consts, fields, methods, events, registered}) {
  return `${header(events, registered)}
mod hatchery {
${indent(imports.join('\n'), 4)}

${indent(consts.join('\n'), 4)}

    struct Duskling {
${indent(fields.join('\n'), 8)}
    }

    pub struct Hatchery {
        dusklings: Vec<Duskling>,
    }

    impl Hatchery {
        pub const fn new() -> Self {
            Self { dusklings: Vec::new() }
        }

${indent(methods.join('\n\n'), 8)}
    }
}`;
}

// The Hatchery exactly as Lesson 1 leaves it.
export const LESSON1 = {
  imports: ['use alloc::vec::Vec;', 'use dusk_core::abi;'],
  consts: [
    'const DNA_DIGITS: u32 = 16;',
    'const DNA_MODULUS: u64 = 10u64.pow(DNA_DIGITS);',
    '// 2^64 divided by the golden ratio: a classic mixing constant.',
    'const MIX: u64 = 0x9E37_79B9_7F4A_7C15;',
  ],
  fields: ['dna: u64,', 'level: u32,'],
  events: [HATCHED],
  registered: ['Hatched'],
  methods: [
    `fn create_duskling(&mut self, dna: u64) {
    let id = self.dusklings.len() as u64;
    self.dusklings.push(Duskling { dna, level: 1 });
    abi::emit("hatched", crate::Hatched { id, dna });
}`,
    `fn generate_dna(&self, seed: u64) -> u64 {
    seed.wrapping_mul(MIX) % DNA_MODULUS
}`,
    `pub fn hatch(&mut self, seed: u64) {
    let dna = self.generate_dna(seed);
    self.create_duskling(dna);
}`,
  ],
};

// Returns a copy of `parts` with some pieces replaced: {imports, consts, fields, events, registered}
// as arrays, methods as a {name: source} map where the name is the fn name (new names are appended).
export function evolve(parts, {imports, consts, fields, events, registered, methods = {}} = {}) {
  const name = src => src.match(/fn (\w+)/)[1];
  const next = parts.methods.map(src => methods[name(src)] ?? src);
  for (const [n, src] of Object.entries(methods)) if (!parts.methods.some(m => name(m) === n)) next.push(src);
  return {imports: imports ?? parts.imports, consts: consts ?? parts.consts, fields: fields ?? parts.fields,
    events: events ?? parts.events, registered: registered ?? parts.registered, methods: next};
}
