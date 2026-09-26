// An original chiptune for the trailer, synthesized sample by sample, with sound effects on the
// trailer's own events: a blip per title letter, a chime per lantern, a pop when an egg hatches.
// 120 BPM: an arpeggio under the harbor, then from bar 5 (the Hatchery, 8 s) lead, bass and drums
// over Am, F, C and G, landing on C for the end card at bar 13 (24 s).
import {DURATION, HATCH_DELAY, TITLE_AT, END_TITLE_AT, LETTER_GAP, URL_AT, COMPANION_AT, LANTERNS, HATCHERY, ALMANAC, STATS_AT} from './timeline.mjs';

const SR = 48000;

// The soundtrack as a 16-bit stereo WAV, peaking at -1 dBFS.
export function music() {
  const N = Math.round(SR * DURATION);
  const BEAT = 0.5, BAR = 4 * BEAT; // 120 BPM
  const track = () => new Float32Array(N);
  const lead = track(), arp = track(), bass = track(), drums = track(), sfx = track();

  const NAMES = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
  const hz = name => { const m = name.match(/^([A-G])(#?)(\d)$/); return 440 * 2 ** ((NAMES[m[1]] + (m[2] ? 1 : 0) + 12 * (+m[3] + 1) - 69) / 12); };
  let seed = 7;
  const noise = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 31) - 1;

  // Band-limited edges keep the square waves from buzzing.
  const blep = (t, dt) => t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0;
  function envelope(t, len, {a = 0.004, d = 0.09, s = 0.55, r = 0.06} = {}) {
    if (t < a) return t / a;
    if (t < a + d) return 1 - (1 - s) * (t - a) / d;
    if (t < len) return s;
    return t < len + r ? s * (1 - (t - len) / r) : 0;
  }
  function tone(out, time, len, freq, {wave = 'square', duty = 0.5, vol = 0.2, env = {}, vibrato = 0, slide = 0} = {}) {
    const start = Math.round(time * SR), n = Math.round((len + (env.r ?? 0.06)) * SR);
    let phase = 0;
    for (let i = 0; i < n && start + i < N; i++) {
      const t = i / SR;
      const f = freq * (1 + vibrato * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.25)) * 2 ** (slide * t);
      const dt = f / SR;
      phase = (phase + dt) % 1;
      let v;
      if (wave === 'square') { v = phase < duty ? 1 : -1; v += blep(phase, dt); v -= blep((phase - duty + 1) % 1, dt); }
      else if (wave === 'tri') v = 4 * Math.abs(phase - 0.5) - 1;
      else v = Math.sin(2 * Math.PI * phase);
      out[start + i] += v * vol * envelope(t, len, env);
    }
  }
  // A small bell: a sine with an inharmonic partial, ringing out.
  function bell(time, freq, vol = 0.12, ring = 0.9) {
    const start = Math.round(time * SR), n = Math.round(ring * SR);
    for (let i = 0; i < n && start + i < N; i++) {
      const t = i / SR, e = Math.exp(-t * 5) * Math.min(1, t / 0.002, (ring - t) / 0.05);
      sfx[start + i] += vol * e * (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-t * 9));
    }
  }
  function hit(out, time, len, fn) {
    const start = Math.round(time * SR), n = Math.round(len * SR);
    for (let i = 0; i < n && start + i < N; i++) out[start + i] += fn(i / SR);
  }
  const kick = t => hit(drums, t, 0.28, s => 0.55 * Math.exp(-s * 13) * Math.sin(2 * Math.PI * (45 * s + 110 / 22 * (1 - Math.exp(-s * 22)))));
  const snare = (t, v = 0.2) => hit(drums, t, 0.18, s => v * Math.exp(-s * 26) * (noise() + 0.4 * Math.sin(2 * Math.PI * 190 * s)));
  let last = 0;
  const hat = (t, v = 0.05) => hit(drums, t, 0.05, s => { const x = noise(), y = x - last; last = x; return v * Math.exp(-s * 90) * y; });
  const crash = t => hit(drums, t, 2.2, s => 0.09 * Math.exp(-s * 2.2) * noise());
  const pop = (t, base = 330) => tone(sfx, t, 0.06, base, {duty: 0.25, vol: 0.1, slide: 14, env: {a: 0.003, d: 0.03, s: 0.5, r: 0.05}});
  const sparkle = (t, notes) => notes.forEach((n, k) => bell(t + k * 0.035, hz(n), 0.05, 0.5));

  // Harmony: Am, F, C, G, one chord per bar.
  const CHORDS = [['A3', 'C4', 'E4', 'A4'], ['F3', 'A3', 'C4', 'F4'], ['C4', 'E4', 'G4', 'C5'], ['G3', 'B3', 'D4', 'G4']];
  const ROOTS = ['A2', 'F2', 'C2', 'G2'];
  const barStart = b => (b - 1) * BAR;

  // Bars 1–12: an arpeggio in eighths, soft and rounded in the intro, a thin pulse under the groove.
  for (let b = 1; b <= 12; b++) {
    const chord = CHORDS[(b - 1) % 4], intro = b <= 4;
    [0, 1, 2, 3, 2, 1, 2, 3].forEach((k, i) => {
      const swell = intro ? Math.min(1, 0.35 + (b - 1 + i / 8) * 0.25) : 1;
      tone(arp, barStart(b) + i * BEAT / 2, BEAT / 2 * 0.9, hz(chord[k]), intro
        ? {wave: 'tri', vol: 0.13 * swell, env: {a: 0.01, d: 0.12, s: 0.45, r: 0.12}}
        : {duty: 0.125, vol: 0.045, env: {a: 0.003, d: 0.08, s: 0.4, r: 0.05}});
    });
  }

  // Bars 5–12: bass bouncing between octaves.
  for (let b = 5; b <= 12; b++) {
    const root = hz(ROOTS[(b - 1) % 4]);
    for (let i = 0; i < 8; i++) tone(bass, barStart(b) + i * BEAT / 2, BEAT / 2 * 0.8, i % 2 ? root * 2 : root, {duty: 0.5, vol: 0.11, env: {a: 0.003, d: 0.06, s: 0.7, r: 0.03}});
  }

  // Bars 5–13: the melody, in C major pentatonic with a passing B over G.
  const MELODY = [
    [['A4', 1], ['C5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1]],
    [['A4', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 2]],
    [['E4', 0.5], ['G4', 0.5], ['C5', 1], ['E5', 1], ['D5', 0.5], ['C5', 0.5]],
    [['D5', 1.5], ['C5', 0.5], ['B4', 1], ['G4', 1]],
    [['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1]],
    [['F5', 0.5], ['E5', 0.5], ['C5', 1], ['A4', 2]],
    [['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1]],
    [['D5', 1], ['B4', 1], ['D5', 1], ['G5', 1]],
  ];
  MELODY.forEach((bar, k) => {
    let t = barStart(5 + k);
    for (const [n, beats] of bar) {
      tone(lead, t, beats * BEAT * 0.92, hz(n), {duty: 0.25, vol: 0.13, vibrato: beats >= 1.5 ? 0.006 : 0, env: {a: 0.004, d: 0.1, s: 0.6, r: 0.07}});
      t += beats * BEAT;
    }
  });

  // Bars 5–12: drums, with a fill into the end card.
  for (let b = 5; b <= 12; b++) {
    const t0 = barStart(b);
    kick(t0); kick(t0 + 2 * BEAT);
    if (b % 4 === 0) kick(t0 + 2.5 * BEAT);
    snare(t0 + BEAT); if (b !== 12) snare(t0 + 3 * BEAT);
    for (let i = 0; i < 8; i++) hat(t0 + i * BEAT / 2, i % 2 ? 0.06 : 0.035);
  }
  for (let i = 0; i < 4; i++) snare(barStart(12) + 3 * BEAT + i * BEAT / 4, 0.1 + i * 0.04);

  // Bar 13 on: the end card lands on C.
  crash(barStart(13));
  kick(barStart(13));
  tone(lead, barStart(13), 2.6, hz('C5'), {duty: 0.25, vol: 0.12, vibrato: 0.007, env: {a: 0.004, d: 0.2, s: 0.55, r: 0.8}});
  tone(bass, barStart(13), 2.6, hz('C2'), {vol: 0.1, env: {a: 0.003, d: 0.2, s: 0.6, r: 0.8}});
  ['C4', 'E4', 'G4', 'C5', 'E5', 'G5'].forEach((n, k) => tone(arp, barStart(13) + k * 0.09, 2.4 - k * 0.09, hz(n), {wave: 'tri', vol: 0.06, env: {a: 0.01, d: 0.3, s: 0.5, r: 0.8}}));

  // Sound on the trailer's events.
  const TITLE = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'];
  for (const start of [TITLE_AT, END_TITLE_AT]) TITLE.forEach((n, k) => tone(sfx, start + k * LETTER_GAP, 0.05, hz(n), {duty: 0.25, vol: 0.05, env: {a: 0.002, d: 0.03, s: 0.4, r: 0.04}}));
  const hatch = at => at + HATCH_DELAY;
  pop(hatch(COMPANION_AT), 280); sparkle(hatch(COMPANION_AT) + 0.02, ['C6', 'E6', 'G6', 'C7']);
  ['C6', 'D6', 'E6', 'G6', 'A6'].forEach((n, k) => bell(LANTERNS[k], hz(n), 0.1));
  HATCHERY.map(hatch).forEach((t, k) => { pop(t, 300 + k * 60); sparkle(t + 0.02, ['E6', 'G6']); });
  ALMANAC.map(hatch).forEach((t, k) => pop(t, 280 + k * 45));
  pop(hatch(STATS_AT), 220); sparkle(hatch(STATS_AT) + 0.02, ['G5', 'C6', 'E6', 'G6', 'C7']);
  sparkle(URL_AT, ['G6', 'E6', 'C6', 'G5']);

  // Mix: a dotted-eighth echo on the lead, a gentle low-pass on the pulses, soft limiting and a fade.
  const echo = (x, delay, feedback) => { const d = Math.round(delay * SR); for (let i = d; i < N; i++) x[i] += x[i - d] * feedback; return x; };
  const lowpass = (x, cutoff) => { const a = 1 - Math.exp(-2 * Math.PI * cutoff / SR); let y = 0; for (let i = 0; i < N; i++) x[i] = y += a * (x[i] - y); return x; };
  echo(lead, 0.75 * BEAT, 0.28); lowpass(lead, 5200); lowpass(arp, 4200); lowpass(bass, 2500); lowpass(sfx, 6500);
  const mix = new Float32Array(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, fade = Math.min(1, t / 0.15, (DURATION - t) / 1.2);
    mix[i] = Math.tanh(1.1 * (lead[i] + arp[i] + bass[i] + drums[i] + sfx[i])) * fade;
    peak = Math.max(peak, Math.abs(mix[i]));
  }
  const gain = 0.89 / peak;

  const wav = Buffer.alloc(44 + N * 4);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24);
  wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    const s = Math.round(mix[i] * gain * 32767);
    wav.writeInt16LE(s, 44 + i * 4); wav.writeInt16LE(s, 46 + i * 4);
  }
  return wav;
}
