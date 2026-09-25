// Dusklings: 16 digits of DNA become a 32×32 pixel creature. Each digit pair selects one trait.
export const SIZE = 32;
export const GENE_COLORS = ['#ff9a62', '#ffc86b', '#c8ff6e', '#7ef0d0', '#7fd6ff', '#a99bff', '#ff8fd8', '#ff8095'];

export const TRAITS = [
  {key: 'body', label: 'Body', names: ['Round', 'Tall', 'Wide', 'Pear', 'Boxy', 'Ghost', 'Wisp', 'Owl']},
  {key: 'eyes', label: 'Eyes', names: ['Bright', 'Lantern', 'Sleepy', 'Cyclops', 'Cat', 'Triple', 'Grumpy', 'Starry']},
  {key: 'crown', label: 'Crown', names: ['Cat ears', 'Antennae', 'Horns', 'Long ears', 'Unicorn', 'Sprout', 'Tufts', 'Flame']},
  {key: 'wings', label: 'Wings', names: ['Bat', 'Moth', 'Stubby arms', 'Fins', 'Feathers', 'None', 'Tentacles', 'Tiny wings']},
  {key: 'marks', label: 'Markings', names: ['Plain', 'Belly', 'Spots', 'Stripes', 'Stars', 'Mask']},
  {key: 'color', label: 'Color', names: ['Indigo', 'Violet', 'Plum', 'Rose', 'Ember', 'Teal', 'Moonstone', 'Moss']},
  {key: 'glow', label: 'Glow', names: ['Lantern', 'Moonlight', 'Aurora', 'Orchid', 'Firefly', 'Ember']},
  {key: 'mouth', label: 'Mouth', names: ['Smile', 'Fangs', 'Surprised', 'Flat', 'Tongue', 'Kitty']},
];

const BODY = [
  ['#2b2f6b', '#434aa3', '#6a73d6', '#a9b0f2'],
  ['#3a2263', '#5f389e', '#8a5fd1', '#c6a8f4'],
  ['#4a1d4c', '#7b3276', '#ad58a6', '#e3a0da'],
  ['#561c36', '#973859', '#cf627d', '#f6a9b8'],
  ['#57290f', '#98501d', '#d68a38', '#f8cc82'],
  ['#0f3a40', '#1d6b70', '#34a19d', '#86e0d3'],
  ['#2a3246', '#4a5876', '#7a8aa8', '#bccadf'],
  ['#1c3624', '#346139', '#5c9850', '#a8d88d'],
];
const GLOW = ['#ffcf6e', '#eef3ff', '#6ff3ff', '#ff78e0', '#c8ff6e', '#ff8a5c'];
const GEAR = {cloak: ['#1a1733', '#2e2a5c'], gold: ['#c8962f', '#ffcf6e'], leather: ['#5a3e24', '#8b6a44'], frame: '#3b2e4f'};
export const GEAR_INFO = {cloak: 'Shadow cloak', badge: 'Guild badge', satchel: 'Merchant\'s satchel', lantern: 'Lighthouse lantern'};
const INK = '#0b0c18', WHITE = '#f4f1ff', BONE = ['#b3a585', '#eadfc6'], LEAF = ['#3f8a45', '#8fdc6e'], TONGUE = '#ff7fa8';

export function genes(dna) {
  const digits = String(dna).replace(/\D/g, '').padStart(16, '0').slice(-16);
  const pair = i => Number(digits.slice(i * 2, i * 2 + 2));
  const g = {digits};
  TRAITS.forEach((t, i) => { g[t.key] = pair(i) % t.names.length; });
  // Moth-born: DNA ending in 99 always hatches with moth wings and antennae.
  if (digits.endsWith('99')) Object.assign(g, {mothborn: true, wings: 1, crown: 1});
  return g;
}

export const traitNames = dna => {
  const g = genes(dna);
  const list = TRAITS.map(t => ({label: t.label, value: t.names[g[t.key]]}));
  return g.mothborn ? [...list, {label: 'Rare', value: 'Moth-born ✦'}] : list;
};

// Body silhouettes, evaluated at pixel centres. dx is measured from the vertical axis.
const SHAPES = [
  (dx, y) => (dx / 9) ** 2 + ((y - 20) / 8.5) ** 2 <= 1,
  (dx, y) => (dx / 7) ** 2 + ((y - 19.5) / 10) ** 2 <= 1,
  (dx, y) => (dx / 11) ** 2 + ((y - 21.5) / 7) ** 2 <= 1,
  (dx, y) => { const t = (y - 11) / 18, rx = 5.5 + 4.5 * t; return t >= 0 && (dx / rx) ** 2 + ((y - 20) / 9) ** 2 <= 1; },
  (dx, y) => (Math.abs(dx) / 8.5) ** 4 + (Math.abs(y - 20.5) / 8) ** 4 <= 1,
  (dx, y, x) => y <= 19 ? (dx / 8.5) ** 2 + ((y - 19) / 8.5) ** 2 <= 1 : Math.abs(dx) <= 8.5 && y <= 27 - ((x >> 1) % 2),
  (dx, y) => { const d = y - 21; if (d >= 0) return (dx / 8.5) ** 2 + (d / 7.5) ** 2 <= 1; const k = -d / 11; return k <= 1 && Math.abs(dx) <= 8.5 * (1 - k ** 1.6); },
  (dx, y) => (dx / 6.5) ** 2 + ((y - 15.5) / 6) ** 2 <= 1 || (dx / 9.5) ** 2 + ((y - 23) / 6) ** 2 <= 1,
];
const FLOATING = new Set([5, 6]);

// Sprites are drawn for the left side and mirrored. Codes: B base, D dark, L light, H highlight,
// G glow, W white, P ink, K/k bone, E/e leaf, T tongue.
const EYES = [
  ['WWW', 'WPP', 'WPP'],
  ['WGG', 'GGG', 'GGG'],
  ['PPP', 'WPW'],
  ['.WWW.', 'WWWWW', 'WWPGW', 'WWPPW', '.WWW.'],
  ['GPG', 'GPG', 'GPG'],
  ['WP', 'PP'],
  ['PP.', 'WPP', 'WWP'],
  ['.G.', 'GWG', '.G.'],
];
const CROWNS = [
  {at: 5, sprite: ['B....', 'BB...', 'BGB..', 'BGGB.', 'BBBBB']},
  {at: 2, sprite: ['GG...', 'G.D..', '...D.', '...D.', '....D']},
  {at: 4, sprite: ['K...', 'Kk..', '.Kk.', '.KKk', '..KK']},
  {at: 4, sprite: ['.B.', 'BGB', 'BGB', 'BGB', 'BGB', 'BGB', '.BB', '..B']},
  {at: 0, center: true, sprite: ['.K.', '.K.', '.Kk', 'KKk', 'KKK']},
  {at: 0, center: true, sprite: ['EE.ee', 'EEeee', '..e..', '..e..']},
  {at: 5, sprite: ['DD..', '.DB.', '.BBB', '..BB']},
  {at: 0, center: true, sprite: ['.G..', '.GG.', 'GGWG', 'GWWG', '.GG.']},
];
const WINGS = [
  {dy: -3, sprite: ['D.......', 'DD......', 'BDD.....', 'BBDD....', 'BBBDD..D', 'BBBBDDDB', 'B.BB.BBB', '....B.BB']},
  {dy: -5, sprite: ['..LLL....', '.LBBBL...', 'LBBGGBL..', 'LBGWGBBBB', 'LBBGGBBBB', '.LBBBBBBB', '..LBBBBBB', '.LBBBBBB.', 'LBBBB....', '.LL......']},
  {dy: 3, sprite: ['.BB', 'BBB', 'BB.']},
  {dy: 0, sprite: ['....B', '...BB', '..BBB', '.BBBB', 'DDDBB']},
  {dy: -3, sprite: ['LL......', 'BLL.....', 'BBLL....', '.BBLLL..', '..BBBBLL', '...BBBBB', '..LBB.BB', '.LB.....']},
  null,
  null,
  {dy: -5, sprite: ['L..', 'BL.', 'BBL', '.BB']},
];
const MOUTHS = [
  ['P..P', '.PP.'],
  ['PPPP', 'W..W'],
  ['.P.', 'P.P', '.P.'],
  ['PPP'],
  ['PPPP', '.TT.'],
  ['P.P.P', '.P.P.'],
];

function hash32(n) {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

export function paint(dna, {blink = false, gear = []} = {}) {
  const g = genes(dna);
  const [dark, base, light, high] = BODY[g.color], glow = GLOW[g.glow];
  const colors = {B: base, D: dark, L: light, H: high, G: glow, W: WHITE, P: INK, K: BONE[1], k: BONE[0], E: LEAF[1], e: LEAF[0], T: TONGUE};
  const px = new Array(SIZE * SIZE).fill(null);
  const shape = SHAPES[g.body];
  const inside = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && shape(x + 0.5 - 16, y + 0.5, x);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < SIZE && y < SIZE && c) px[y * SIZE + x] = c; };
  const stamp = (sprite, x0, y0, mirror) => sprite.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch !== '.') set(mirror ? x0 + row.length - 1 - c : x0 + c, y0 + r, colors[ch]);
  }));
  const stampPair = (sprite, cxLeft, y0) => {
    const w = sprite[0].length;
    stamp(sprite, cxLeft - w + 1, y0, false);
    stamp(sprite, 31 - cxLeft, y0, true);
  };

  let top = SIZE, bottom = 0;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (inside(x, y)) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  const columnTop = x => { for (let y = 0; y < SIZE; y++) if (inside(x, y)) return y; return bottom; };
  const leftEdge = y => { for (let x = 0; x < 16; x++) if (inside(x, y)) return x; return 16; };
  const eyeY = top + Math.round((bottom - top) * (g.body === 7 ? 0.3 : 0.36));
  const half = 16 - leftEdge(eyeY);
  const spread = Math.max(3, Math.min(5, Math.round(half * 0.48)));

  // Wings sit behind the body.
  const wing = WINGS[g.wings];
  if (wing) {
    const w = wing.sprite[0].length, y0 = eyeY + wing.dy, edge = leftEdge(Math.min(bottom, Math.max(top, y0 + 3)));
    stampPair(wing.sprite, edge + 1, y0);
  }

  // A shadow cloak hangs behind the body; only its flared edges show.
  if (gear.includes('cloak')) for (let y = eyeY + 1; y <= bottom + 2; y++) {
    const edge = leftEdge(Math.min(bottom, y)), flare = 1 + Math.round((y - eyeY - 1) * 0.5);
    const l = edge - 1 - flare, r = 31 - edge + 1 + flare;
    for (let x = l; x <= r; x++) set(x, y, x === l || x === r ? GEAR.cloak[1] : GEAR.cloak[0]);
  }

  // Body with a light source at the top left.
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (!inside(x, y)) continue;
    let c = base;
    if (!inside(x + 1, y + 1) || !inside(x, y + 1)) c = dark;
    else if (!inside(x - 1, y - 1) || !inside(x, y - 1)) c = light;
    set(x, y, c);
  }
  const shineX = 16 - Math.round(half * 0.55), shineY = top + 2;
  [[0, 0], [1, 0], [0, 1]].forEach(([a, b]) => { if (inside(shineX + a, shineY + b)) set(shineX + a, shineY + b, high); });

  // Markings only land on body pixels.
  const mark = (x, y, c) => { if (inside(x, y)) set(x, y, c); };
  const seed = Number(g.digits.slice(8, 16)) >>> 0;
  if (g.marks === 1) {
    const cy = bottom - 4, rx = Math.max(3, half * 0.55);
    for (let y = cy - 4; y <= bottom; y++) for (let x = 0; x < SIZE; x++) if (((x + 0.5 - 16) / rx) ** 2 + ((y - cy) / 4.5) ** 2 <= 1 && inside(x, y + 1)) mark(x, y, light);
  } else if (g.marks === 2) {
    for (let i = 0; i < 4; i++) {
      const h = hash32(seed + i * 7919), x = 16 - half + 2 + (h % Math.max(1, half * 2 - 4)), y = eyeY + 3 + ((h >>> 8) % Math.max(1, bottom - eyeY - 4));
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => mark(x + a, y + b, dark));
    }
  } else if (g.marks === 3) {
    [14, 16, 18].forEach(x => { for (let y = columnTop(x); y < columnTop(x) + 3; y++) mark(x, y, dark); });
    for (let y = eyeY + 3; y < bottom - 1; y += 3) for (const s of [-1, 1]) { const e = s < 0 ? leftEdge(y) : 31 - leftEdge(y); for (let k = 0; k < 3; k++) mark(e - s * k, y, dark); }
  } else if (g.marks === 4) {
    for (let i = 0; i < 7; i++) {
      const h = hash32(seed + i * 104729), x = 16 - half + 1 + (h % Math.max(1, half * 2 - 2)), y = top + 1 + ((h >>> 8) % Math.max(1, bottom - top - 2));
      if (Math.abs(y - eyeY) > 2) mark(x, y, glow);
    }
  } else if (g.marks === 5) {
    for (let y = eyeY - 2; y <= eyeY + 2; y++) for (let x = 0; x < SIZE; x++) mark(x, y, dark);
  }

  // Crown on top of the head.
  const crown = CROWNS[g.crown];
  if (crown.center) stamp(crown.sprite, 16 - (crown.sprite[0].length >> 1), columnTop(16) - crown.sprite.length + 1, false);
  else {
    const x = 16 - crown.at - 1, w = crown.sprite[0].length;
    stampPair(crown.sprite, x + (w >> 1), columnTop(x) - crown.sprite.length + 1);
  }

  // Tentacles or feet below the body.
  if (g.wings === 6) {
    const tentacle = ['.BB', '.BD', 'BD.', 'D..'];
    stamp(tentacle, 8, bottom, false); stamp(tentacle, 12, bottom, false);
    stamp(tentacle, 17, bottom, true); stamp(tentacle, 21, bottom, true);
  } else if (!FLOATING.has(g.body)) {
    [11, 18].forEach(x => { for (let k = 0; k < 3; k++) set(x + k, bottom + 1, dark); });
  }

  // Face.
  const eye = EYES[g.eyes], w = eye[0].length;
  const places = g.eyes === 3 ? [[14, eyeY - 1, false]]
    : g.eyes === 5 ? [[16 - spread - 1, eyeY, false], [16 + spread - 1, eyeY, true], [15, eyeY - 3, false]]
    : [[16 - spread - w + 1, eyeY - 1, false], [15 + spread, eyeY - 1, true]];
  for (const [x, y, mirror] of places) {
    if (blink) for (let k = 0; k < w; k++) set(x + k, y + (eye.length >> 1), INK);
    else stamp(eye, x, y, mirror);
  }
  const mouth = MOUTHS[g.mouth], mouthY = eyeY + (g.eyes === 3 ? 4 : 3);
  stamp(mouth, 16 - (mouth[0].length >> 1), mouthY, false);

  // Gear worn in front of the body.
  const use = (sprite, x0, y0, map) => sprite.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') set(x0 + c, y0 + r, map[ch]); }));
  if (gear.includes('cloak')) { const y = eyeY + 3, e = leftEdge(y); set(e, y, GEAR.gold[1]); set(31 - e, y, GEAR.gold[1]); }
  if (gear.includes('satchel')) {
    const x0 = 16 - half + 2, y0 = eyeY + 2, x1 = 16 + half - 3, y1 = bottom - 3, n = Math.max(x1 - x0, y1 - y0, 1);
    for (let i = 0; i <= n; i++) set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), GEAR.leather[0]);
    use(['LLLLL', 'DDGDD', 'LLLLL', 'LLLLL'], x1 - 1, y1 - 1, {L: GEAR.leather[1], D: GEAR.leather[0], G: GEAR.gold[1]});
  }
  if (gear.includes('badge')) {
    let by = mouthY + 2; const bx = 16 + spread - 2;
    while (by > eyeY + 1 && !(inside(bx, by + 2) && inside(bx + 2, by + 2))) by--;
    use(['GGG', 'GWG', '.G.'], bx, by, {G: GEAR.gold[1], W: WHITE});
  }
  if (gear.includes('lantern')) {
    const y = eyeY + 5, e = leftEdge(Math.min(bottom, y));
    for (let k = 1; k <= 3; k++) set(e - k, y, GEAR.frame);
    use(['.F.', 'FGF', 'GWG', 'FGF', '.F.'], e - 5, y + 1, {F: GEAR.frame, G: '#ffcf6e', W: '#fff1c4'});
  }

  // One-pixel outline around everything except glow tips.
  const out = px.slice();
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (px[y * SIZE + x]) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < SIZE && Y < SIZE && px[Y * SIZE + X]; });
    if (near) out[y * SIZE + x] = INK;
  }
  return {pixels: out, glow, genes: g, bottom};
}

const cache = new Map();
export function sprite(dna, blink = false, gear = []) {
  const key = genes(dna).digits + (blink ? 'b' : '') + gear.join(',');
  if (cache.has(key)) return cache.get(key);
  const {pixels} = paint(dna, {blink, gear});
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  pixels.forEach((c, i) => { if (c) { ctx.fillStyle = c; ctx.fillRect(i % SIZE, (i / SIZE) | 0, 1, 1); } });
  canvas.foot = Math.max(...pixels.map((c, i) => c ? (i / SIZE) | 0 : 0));
  canvas.floating = FLOATING.has(genes(dna).body) && genes(dna).wings !== 6;
  if (cache.size > 200) cache.clear();
  cache.set(key, canvas);
  return canvas;
}

export function drawCreature(canvas, dna, {scale, gear = []} = {}) {
  const ctx = canvas.getContext('2d');
  const s = scale ?? Math.floor(Math.min(canvas.width, canvas.height) / SIZE);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sprite(dna, false, gear), (canvas.width - SIZE * s) / 2, (canvas.height - SIZE * s) / 2, SIZE * s, SIZE * s);
}
