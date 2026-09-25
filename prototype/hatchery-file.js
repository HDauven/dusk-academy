// Builds the learner's lib.rs from named parts, so every chapter's reference file stays consistent.
const indent = (text, n) => text.split('\n').map(line => line ? ' '.repeat(n) + line : line).join('\n');

export function file({imports, consts, fields, methods}) {
  return `#![no_std]

extern crate alloc;

#[dusk_forge::contract]
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
  methods: [
    `fn create_duskling(&mut self, dna: u64) {
    let id = self.dusklings.len() as u64;
    self.dusklings.push(Duskling { dna, level: 1 });
    abi::emit("hatched", (id, dna));
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

// Returns a copy of `parts` with some pieces replaced: {imports, consts, fields} as arrays,
// methods as a {name: source} map where the name is the fn name (new names are appended).
export function evolve(parts, {imports, consts, fields, methods = {}} = {}) {
  const name = src => src.match(/fn (\w+)/)[1];
  const next = parts.methods.map(src => methods[name(src)] ?? src);
  for (const [n, src] of Object.entries(methods)) if (!parts.methods.some(m => name(m) === n)) next.push(src);
  return {imports: imports ?? parts.imports, consts: consts ?? parts.consts, fields: fields ?? parts.fields, methods: next};
}
