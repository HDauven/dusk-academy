// Pixel scenes at dusk, 192×108. The hatchery draws contract state; the harbor draws tour progress.
import {sprite, genes, SIZE} from './creature.js';

export const W = 192, H = 108, GROUND = 92, PIER = 80;
const SKY = ['#121232', '#1a1942', '#241f52', '#342662', '#4b2d6c', '#6a3571', '#8f406f', '#b9516b', '#dd6c69', '#f09168'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

function canvas2d() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  return {c, g, px, rect};
}

// Banded sky with a checker dither at each band edge, stars and a crescent moon.
function paintSky({px}, horizon) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const band = y / horizon * SKY.length, i = Math.min(SKY.length - 1, Math.floor(band));
    px(x, y, band - i > 0.75 && (x + y) % 2 === 0 ? SKY[Math.min(SKY.length - 1, i + 1)] : SKY[i]);
  }
  const r = rng(7);
  for (let k = 0; k < 46; k++) { const x = Math.floor(r() * W), y = Math.floor(r() * horizon * 0.6); px(x, y, r() > 0.8 ? '#fff6d8' : '#a9a6d8'); }
  const mx = 156, my = 17;
  for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
    const d = x * x + y * y, cut = (x - 4) ** 2 + (y + 2) ** 2;
    if (d <= 64 && cut > 44) px(mx + x, my + y, d > 42 ? '#e9dcb8' : '#fbf1d4');
    else if (d > 64 && d <= 100 && cut > 60 && (x + y) % 2 === 0) px(mx + x, my + y, '#5b4a86');
  }
}

function paintHatchery() {
  const k = canvas2d(), {px, rect} = k, r = rng(11);
  paintSky(k, 74);
  for (let x = 0; x < W; x++) {
    const far = 66 + Math.round(Math.sin(x / 17) * 3 + Math.sin(x / 7 + 1) * 1.5);
    for (let y = far; y < H; y++) px(x, y, '#2a2150');
    const near = 78 + Math.round(Math.sin(x / 23 + 2) * 3 + Math.sin(x / 9) * 1);
    for (let y = near; y < H; y++) px(x, y, '#1d1839');
  }
  for (let n = 0; n < 22; n++) { const x = 60 + Math.floor(r() * 130), y = 69 + Math.floor(r() * 7); px(x, y, r() > 0.5 ? '#ffcf6e' : '#f0a060'); }
  for (let x = 0; x < W; x++) {
    for (let y = GROUND - 2; y < H; y++) px(x, y, y < GROUND ? '#1a1533' : (x * 7 + y * 3) % 23 === 0 ? '#1f1a3c' : '#15122b');
    if ((x * 13) % 7 < 2) px(x, GROUND - 3, '#231d46');
  }
  // The hatchery hut with a round lit window, and a lantern post.
  rect(8, 62, 34, 28, '#2a2450'); rect(8, 62, 34, 2, '#3a3168'); rect(8, 88, 34, 2, '#141129');
  for (let n = 0; n < 12; n++) rect(5 + n, 62 - n, 40 - n * 2, 1, n < 1 ? '#110e22' : '#1a1535');
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17) px(25 + x, 72 + y, x * x + y * y <= 8 ? '#ffe3a0' : '#ffbf5e');
  rect(24, 67, 2, 11, '#6a4b2a'); rect(20, 71, 11, 2, '#6a4b2a');
  rect(13, 78, 7, 12, '#16122c'); rect(18, 84, 1, 1, '#ffcf6e');
  rect(48, 66, 2, 26, '#3b2e4f'); rect(45, 64, 8, 2, '#3b2e4f');
  rect(46, 66, 6, 6, '#ffcf6e'); rect(47, 67, 4, 4, '#fff1c4');
  return k.c;
}

// Harbor: far town, lighthouse, water, pier, lantern poles. Lanterns and boats are drawn per frame.
export const LANTERN_X = (i, n) => Math.round(50 + i * (128 / Math.max(1, n - 1)));
export const ropeY = x => Math.round(40 + 9 * (1 - ((x - 112) / 76) ** 2));
function paintHarbor() {
  const k = canvas2d(), {px, rect} = k, r = rng(23);
  paintSky(k, 70);
  // Far shore and town.
  for (let x = 0; x < W; x++) {
    const shore = 64 + Math.round(Math.sin(x / 19 + 1) * 2 + Math.sin(x / 6) * 1);
    for (let y = shore; y < 72; y++) px(x, y, '#2a2150');
  }
  for (let x = 40; x < 184; x += 5 + Math.floor(r() * 4)) {
    const h = 4 + Math.floor(r() * 7), w = 3 + Math.floor(r() * 3);
    rect(x, 64 - h, w, h + 2, '#241c48');
    if (r() > 0.3) px(x + 1, 64 - h + 2, r() > 0.5 ? '#ffcf6e' : '#f0a060');
  }
  // Water with soft bands.
  for (let y = 72; y < H; y++) for (let x = 0; x < W; x++) {
    const band = (y - 72) % 7;
    px(x, y, band === 0 && (x + y) % 3 === 0 ? '#232a5c' : y < 76 ? '#1f2553' : '#171c45');
  }
  // Lighthouse on its rock.
  for (let y = 68; y < 82; y++) for (let x = 2; x < 34; x++) if (((x - 18) / 16) ** 2 + ((y - 80) / 12) ** 2 <= 1) px(x, y, (x + y) % 5 ? '#1d1839' : '#231d44');
  for (let y = 34; y < 74; y++) {
    const half = Math.round(3.5 + (y - 34) / 40 * 2.5), stripe = Math.floor((y - 34) / 7) % 2;
    rect(18 - half - 1, y, half * 2 + 2, 1, '#0b0c18');
    rect(18 - half, y, half * 2, 1, stripe ? '#b84a5c' : '#dcd4ea');
    rect(18 + half - 2, y, 2, 1, stripe ? '#8a3346' : '#aaa2c4');
  }
  rect(11, 32, 14, 2, '#0b0c18'); rect(12, 32, 12, 1, '#3a3168');
  rect(13, 24, 10, 8, '#0b0c18'); rect(14, 25, 8, 6, '#ffe3a0'); rect(17, 25, 2, 6, '#fff6d8');
  for (let n = 0; n < 5; n++) rect(13 + n, 23 - n, 10 - n * 2, 1, '#8a3346');
  rect(35, 57, 2, 23, '#3b2e4f');
  // Pier on posts.
  for (let x = 30; x < 116; x++) { px(x, PIER, '#8b6a44'); px(x, PIER + 1, '#6a4b2a'); px(x, PIER + 2, '#4a321c'); if (x % 6 === 0) px(x, PIER, '#5a3e24'); }
  for (let x = 32; x < 116; x += 12) rect(x, PIER + 3, 2, 10, '#2e2130');
  // Right pole standing in the water.
  rect(187, 38, 2, 60, '#3b2e4f'); rect(186, 96, 4, 2, '#2e2130');
  rect(35, 38, 2, 20, '#3b2e4f');
  // Rope.
  for (let x = 36; x <= 188; x++) px(x, ropeY(x), '#4a3c66');
  return k.c;
}

export function eggSprite(dna) {
  const c = document.createElement('canvas'); c.width = 14; c.height = 16;
  const g = c.getContext('2d'), glow = ['#ffcf6e', '#eef3ff', '#6ff3ff', '#ff78e0', '#c8ff6e', '#ff8a5c'][genes(dna).glow];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 14; x++) {
    const dx = (x + 0.5 - 7) / 6, dy = (y + 0.5 - 9) / (y < 9 ? 8.5 : 6.5);
    const d = dx * dx + dy * dy;
    if (d > 1) continue;
    g.fillStyle = d > 0.78 ? '#0b0c18' : dx + dy > 0.55 ? '#c7b99a' : dx + dy < -0.7 ? '#fffaf0' : '#efe4c8';
    g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = glow; [[5, 5], [8, 8], [4, 10], [9, 4]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  return c;
}

const dnaOf = x => typeof x === 'string' ? x : x.dna;

export function createScene(canvas, {kind = 'hatchery'} = {}) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const backdrop = kind === 'harbor' ? paintHarbor() : paintHatchery();
  const r = rng(99), twinkles = Array.from({length: 10}, () => [Math.floor(r() * W), Math.floor(r() * 36), r() * 6]);
  let state = {creatures: [], nests: 0, bare: false, moths: 0, solo: null, keeper: null, companion: null, egg: false, gear: [], lanterns: 0, lit: [], flash: null, wobbleAt: -Infinity};
  let born = new Map(), sparks = [], running = false;
  const burst = (x, y, n = 10) => { for (let k = 0; k < n; k++) sparks.push({x, y, vx: Math.cos(k * 2.4) * 0.9, vy: -Math.abs(Math.sin(k * 2.4)) * 1.2 - 0.3, life: 30}); };

  const slots = n => {
    if (!n) return [];
    const left = 62, right = 184, gap = Math.min(30, (right - left) / Math.max(1, n));
    const start = (left + right) / 2 - gap * (n - 1) / 2;
    return Array.from({length: n}, (_, i) => Math.round(start + i * gap));
  };

  // A woven bowl: rim, body and a dark hollow, with a one-pixel outline.
  function drawNest(x) {
    const rows = [[14, '#a07a44'], [18, '#6a4b2a'], [16, '#4e3620'], [12, '#3a2716']];
    rows.forEach(([w], i) => { ctx.fillStyle = '#0b0c18'; ctx.fillRect(x - w / 2 - 1, GROUND - 5 + i, w + 2, 2); });
    rows.forEach(([w, c], i) => { ctx.fillStyle = c; ctx.fillRect(x - w / 2, GROUND - 5 + i, w, 1); });
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(x - 5, GROUND - 5, 10, 1);
    ctx.fillStyle = '#b8905a'; for (let k = -8; k < 8; k += 3) ctx.fillRect(x + k, GROUND - 4, 1, 1);
  }

  function drawCreature(dna, x, t, i, {scale = 1, ground = GROUND, gear = []} = {}) {
    const img = sprite(dna, false, gear), blinkPhase = (t / 1000 + i * 1.7) % 4.2;
    const face = !reduced && blinkPhase < 0.14 ? sprite(dna, true, gear) : img;
    const bob = reduced ? 0 : img.floating ? Math.round(Math.sin(t / 450 + i) * 1.5) - 2 : ((t / 520 + i) % 2 < 1 ? 0 : -1);
    const bornAt = born.get(i + ':' + dna), age = bornAt === undefined ? Infinity : t - bornAt;
    const hatchAt = reduced ? 0 : 1100;
    const w = SIZE * scale, top = ground - (img.foot + 1) * scale + bob * scale;
    ctx.fillStyle = 'rgba(8,6,20,.7)';
    const sw = img.floating ? 10 : 14;
    ctx.fillRect(x - sw / 2 * scale, ground - 1, sw * scale, 2);
    if (age < hatchAt) {
      const egg = eggSprite(dna), wob = age > 300 ? Math.round(Math.sin(age / 40) * (age / 600)) : 0;
      ctx.drawImage(egg, x - 7 * scale + wob, ground - 16 * scale, 14 * scale, 16 * scale);
      if (age > 700) { ctx.fillStyle = '#0b0c18'; ctx.fillRect(x - 3 + wob, ground - 11 * scale, 2, 1); ctx.fillRect(x - 1 + wob, ground - 10 * scale, 2, 1); ctx.fillRect(x + 1 + wob, ground - 11 * scale, 2, 1); }
      return;
    }
    if (age < hatchAt + 60 && !sparks.some(s => s.from === i)) burst(x, ground - 10 * scale);
    const jump = age < hatchAt + 320 ? Math.round(Math.sin((age - hatchAt) / 320 * Math.PI) * 6) : 0;
    ctx.drawImage(face, x - w / 2, top - jump * scale, w, w);
  }

  // A small pale moth drifting over the hatchery: V-shaped wings around a dark body.
  const MOTH = [['W.....W', 'WW.B.WW', '.WWBWW.', '...B...'], ['.......', 'WW.B.WW', 'WWWBWWW', '.W.B.W.']];
  function drawMoth(t, k) {
    const x = Math.round(118 + Math.sin(t / 1700 + k * 2.1) * 52), y = Math.round(30 + Math.sin(t / 650 + k * 1.3) * 8 + k * 7);
    const frame = MOTH[!reduced && Math.floor(t / 150 + k) % 2 ? 1 : 0];
    frame.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '.') return; ctx.fillStyle = ch === 'W' ? '#e9e1f6' : '#3b2e4f'; ctx.fillRect(x - 3 + c, y - 2 + r, 1, 1); }));
  }

  function drawLantern(x, y, lit, t, i) {
    ctx.fillStyle = '#4a3c66'; ctx.fillRect(x, y, 1, 2);
    if (lit) {
      const flick = reduced ? 0 : Math.sin(t / 180 + i * 1.3) > 0.85 ? 1 : 0;
      ctx.fillStyle = 'rgba(255, 200, 110, .22)'; ctx.fillRect(x - 3, y + 1, 7, 8); ctx.fillRect(x - 2, y, 5, 10);
      ctx.fillStyle = '#0b0c18'; ctx.fillRect(x - 2, y + 2, 5, 6);
      ctx.fillStyle = flick ? '#ffe3a0' : '#ffbf5e'; ctx.fillRect(x - 1, y + 3, 3, 4);
      ctx.fillStyle = '#fff6d8'; ctx.fillRect(x, y + 4, 1, 2);
      ctx.fillStyle = 'rgba(255, 200, 110, .35)'; ctx.fillRect(x - 1, 100 + (i % 3), 3, 1);
    } else {
      ctx.fillStyle = '#2b2450'; ctx.fillRect(x - 1, y + 2, 3, 1); ctx.fillRect(x - 1, y + 7, 3, 1);
      ctx.fillStyle = '#3d3468'; ctx.fillRect(x - 1, y + 3, 3, 4);
    }
  }

  function drawBoat(x, t, phase, shielded) {
    const bob = reduced ? 0 : (Math.sin(t / 700 + phase) > 0 ? 1 : 0), y = 92 + bob;
    ctx.fillStyle = '#0b0c18'; ctx.fillRect(x - 12, y - 1, 24, 6);
    ctx.fillStyle = shielded ? '#2c2748' : '#6b4a2e'; ctx.fillRect(x - 11, y, 22, 4);
    ctx.fillStyle = shielded ? '#3a3462' : '#8b6a44'; ctx.fillRect(x - 11, y, 22, 1);
    ctx.fillStyle = '#0b0c18'; ctx.fillRect(x - 1, y - 20, 2, 20);
    const sail = shielded ? '#3a3366' : '#e8e0cf';
    for (let k = 0; k < 14; k++) { ctx.fillStyle = sail; ctx.fillRect(x + 1, y - 19 + k, Math.round(k * 0.6) + 1, 1); }
    if (shielded) {
      ctx.fillStyle = '#0b0c18'; ctx.fillRect(x - 9, y - 5, 8, 5);
      ctx.fillStyle = '#473f73'; ctx.fillRect(x - 8, y - 4, 6, 4); ctx.fillRect(x - 7, y - 5, 4, 1);
      ctx.fillStyle = '#ff8a5c'; ctx.fillRect(x + 4, y - 11, 2, 2);
    } else {
      ctx.fillStyle = '#0b0c18'; ctx.fillRect(x - 10, y - 5, 9, 5);
      ctx.fillStyle = '#c9a36a'; ctx.fillRect(x - 9, y - 4, 3, 4); ctx.fillRect(x - 5, y - 4, 3, 4);
      ctx.fillStyle = '#fbf1d4'; ctx.fillRect(x + 4, y - 12, 2, 2);
    }
  }

  function renderHarbor(t) {
    // Rotating lighthouse beam.
    if (!reduced) {
      const a = t / 1800, dir = Math.cos(a);
      ctx.fillStyle = `rgba(255, 236, 180, ${0.08 + 0.1 * Math.abs(dir)})`;
      // One column per pixel, so the beam never shows gaps.
      const end = Math.round(dir * 70), step = Math.sign(end) || 1;
      for (let dx = step; Math.abs(dx) <= Math.abs(end); dx += step) { const w = Math.round(Math.abs(dx / dir) / 9) + 1; ctx.fillRect(18 + dx, 28 - w, 1, w * 2); }
      if (Math.abs(dir) < 0.15) { ctx.fillStyle = 'rgba(255,246,216,.6)'; ctx.fillRect(12, 23, 12, 10); }
    }
    drawBoat(136, t, 0, false);
    drawBoat(166, t, 2, true);
    for (let i = 0; i < state.lanterns; i++) { const x = LANTERN_X(i, state.lanterns); drawLantern(x, ropeY(x) + 1, state.lit[i], t, i); }
    if (state.flash && t - state.flash.at < 60) { const x = LANTERN_X(state.flash.i, state.lanterns); burst(x, ropeY(x) + 5, 14); state.flash.at = -Infinity; }
    if (state.keeper) drawCreature(state.keeper, 62, t, 90, {ground: PIER});
    if (state.companion) drawCreature(state.companion, 98, t, 91, {ground: PIER, gear: state.gear});
    else if (state.egg) {
      const age = t - state.wobbleAt, wob = !reduced && age < 700 ? Math.round(Math.sin(age / 45) * 2) : 0;
      ctx.fillStyle = 'rgba(8,6,20,.7)'; ctx.fillRect(92, PIER - 1, 12, 2);
      ctx.drawImage(eggSprite('0000000000000000'), 91 + wob, PIER - 16);
    }
    // Water shimmer under the moon.
    if (!reduced) for (let k = 0; k < 3; k++) { const y = 75 + k * 4, w = 4 - k, x = 154 + Math.round(Math.sin(t / 600 + k) * 1.5); ctx.fillStyle = 'rgba(251, 241, 212, .18)'; ctx.fillRect(x, y, w, 1); }
  }

  function renderHatchery(t) {
    if (state.keeper) drawCreature(state.keeper, 34, t, 99);
    if (state.solo) { drawNest(118); drawCreature(state.solo, 118, t, 0, {scale: 2, gear: state.gear}); return; }
    const count = Math.max(state.nests, state.creatures.length), xs = slots(Math.min(count, 5));
    const shown = state.creatures.slice(-5);
    xs.forEach((x, i) => { if (!state.bare) drawNest(x); if (shown[i]) drawCreature(dnaOf(shown[i]), x, t, i + Math.max(0, state.creatures.length - 5)); });
    for (let k = 0; k < state.moths; k++) drawMoth(t, k);
  }

  function render(t) {
    ctx.drawImage(backdrop, 0, 0);
    for (const [x, y, p] of twinkles) if (!reduced && Math.sin(t / 700 + p) > 0.6) { ctx.fillStyle = '#fff6d8'; ctx.fillRect(x, y, 1, 1); }
    (kind === 'harbor' ? renderHarbor : renderHatchery)(t);
    sparks = sparks.filter(s => s.life-- > 0);
    for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.05; ctx.fillStyle = s.life % 6 < 3 ? '#fff1c4' : '#ffcf6e'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); }
  }

  function loop(t) { if (!running) return; render(t); requestAnimationFrame(loop); }
  function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
  document.addEventListener('visibilitychange', () => { running = false; if (!document.hidden) start(); });
  start();

  return {
    show(next = {}) {
      const now = performance.now(), {animate = true} = next;
      const merged = {...state, ...next};
      const creatures = (merged.creatures ?? []).map(dnaOf), map = new Map(), old = state.creatures.map(dnaOf);
      creatures.forEach((dna, i) => {
        const key = i + ':' + dna;
        if (born.has(key)) map.set(key, born.get(key));
        else if (animate && old[i] !== dna) map.set(key, now);
      });
      if (merged.solo) {
        const key = '0:' + merged.solo;
        if (animate && merged.solo !== state.solo) map.set(key, now); else if (born.has(key)) map.set(key, born.get(key));
      }
      if (merged.companion) {
        const key = '91:' + merged.companion;
        if (animate && merged.companion !== state.companion) map.set(key, now); else if (born.has(key)) map.set(key, born.get(key));
      }
      born = map;
      if (animate && next.lit) { const i = next.lit.findIndex((on, k) => on && !state.lit[k]); if (i >= 0) { merged.flash = {i, at: now}; merged.wobbleAt = now; } }
      state = merged;
      if (reduced) render(now);
    },
    // Where the visible hatchery creatures stand, as percentages of the canvas, for HTML labels.
    layout() {
      if (kind !== 'hatchery' || state.solo) return [];
      const shown = state.creatures.slice(-5), xs = slots(Math.min(Math.max(state.nests, state.creatures.length), 5));
      return shown.map((c, i) => ({creature: c, index: i + Math.max(0, state.creatures.length - 5), x: xs[i] / W * 100, y: (GROUND - 34) / H * 100}));
    },
  };
}
