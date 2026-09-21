use dusk_plonk::prelude::*;

#[derive(Default)]
pub struct SumCircuit {
    pub a: BlsScalar,
    pub b: BlsScalar,
    pub total: BlsScalar,
}

impl Circuit for SumCircuit {
    fn circuit(&self, composer: &mut Composer) -> Result<(), Error> {
        let a = composer.append_witness(self.a);
        let b = composer.append_witness(self.b);
        let total = composer.append_witness(self.total);
        let sum = composer.gate_add(
            Constraint::new().left(1).right(1).a(a).b(b)
        );
        // Bind sum to total.
        Ok(())
    }
}
