// The developer creature sheet: every trait value, every piece of gear, and random DNA.
import {drawCreature, TRAITS} from './creature.js';
const out = document.querySelector('#out');
const add = (title, list, gear = []) => {
  const h = document.createElement('h2'); h.textContent = title; out.append(h);
  const row = document.createElement('div'); row.className = 'row'; out.append(row);
  for (const [dna, label] of list) {
    const f = document.createElement('figure'), c = document.createElement('canvas');
    c.width = c.height = 128; drawCreature(c, dna, {scale: 4, gear});
    const cap = document.createElement('figcaption'); cap.textContent = label ?? dna;
    f.append(c, cap); row.append(f);
  }
};
const pad = n => String(n).padStart(2, '0');
const base = [0, 0, 0, 5, 0, 1, 0, 0];
TRAITS.forEach((t, ti) => add(t.label, t.names.map((name, v) => {
  const pairs = base.slice(); pairs[ti] = v; if (ti === 5) pairs[5] = v; return [pairs.map(pad).join(''), name];
})));
const kit = ['8356281049284737', '1568560902483828', '2788147323984481', '0111777324930839', '1305780178061356', '5063623449402160'];
for (const g of [['cloak'], ['badge'], ['satchel'], ['lantern'], ['cloak', 'badge', 'satchel', 'lantern']]) add('Gear: ' + g.join(' + '), kit.map(d => [d]), g);
let s = 12345;
const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
add('Random', Array.from({length: 40}, () => [Array.from({length: 16}, () => Math.floor(rnd() * 10)).join('')]));
