// Builds the Dusklings trailer: 1920×1080 at 30 fps with a synthesized soundtrack, all from the
// game's own code. It screenshots three chapters of the real app after their checks pass, renders
// every frame with the game's scenes on a virtual clock in headless Chromium, and encodes with x264.
//
//   npm run build:trailer                       out/dusklings-trailer.mp4 and a silent copy
//   npm run build:trailer -- --preview 4.4,12.4 only those moments, as PNGs in out/preview/
//
// It needs Playwright and an ffmpeg with libx264: NODE_PATH and CHROMIUM_PATH work as for
// test:e2e, and ffmpeg comes from FFMPEG, the PATH, or the ffmpeg-static package.
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {join, extname, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {seedFromName, dnaFor, pad16} from '../../academy/contract.js';
import * as timeline from './timeline.mjs';
import {music} from './music.mjs';

const require = createRequire(import.meta.url); // honours NODE_PATH, unlike import
const {chromium} = require('playwright');
const root = resolve(import.meta.dirname, '../..'), out = join(import.meta.dirname, 'out');
const {FPS, DURATION} = timeline, FRAMES = Math.round(FPS * DURATION);
const ORIGIN = 'http://dusklings.test';
const TYPES = {'.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.wasm': 'application/wasm', '.json': 'application/json', '.html': 'text/html'};

function ffmpeg() {
  const found = [process.env.FFMPEG, 'ffmpeg'].find(bin => bin && spawnSync(bin, ['-hide_banner', '-encoders'], {encoding: 'utf8'}).stdout?.includes('libx264'));
  if (found) return found;
  try { return require('ffmpeg-static'); } catch {}
  throw Error('No ffmpeg with libx264: set FFMPEG, put one on the PATH, or install ffmpeg-static.');
}

// The app after these chapters' checks pass, with a keeper named Moonpaw.
const SHOTS = {hatchery: ['hatchery.html', 'hatch'], almanac: ['almanac.html', 'gallery'], stats: ['secret-stats.html', 'range']};
const MOONPAW = pad16(dnaFor(seedFromName('Moonpaw')));

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>
  @font-face { font-family: Silkscreen; src: url('/assets/silkscreen.woff2') format('woff2'); }
  @font-face { font-family: Manrope; src: url('/assets/manrope.woff2') format('woff2'); }
  html, body { margin: 0; background: #000; }
</style>
<script>
  // A virtual clock: the scenes read performance.now() and requestAnimationFrame from here.
  let T = 0; const queue = [];
  performance.now = () => T;
  window.requestAnimationFrame = cb => (queue.push(cb), queue.length);
  window.cancelAnimationFrame = () => {};
  window.advance = ms => { T += ms; for (const cb of queue.splice(0)) cb(T); };
</script></head><body><canvas width="1920" height="1080"></canvas>
<script type="module">
  import {createScene} from '/academy/scene.js';
  import {WICK, SAMPLE} from '/academy/contract.js';
  const TL = ${JSON.stringify(timeline)};

  const out = document.querySelector('canvas'), ctx = out.getContext('2d');
  const MOONPAW = ${JSON.stringify(MOONPAW)}, STATS = '1335947248835871';
  const ALMANAC = [SAMPLE[0], SAMPLE[1], SAMPLE[2], STATS, '4829105736152840'];
  const make = kind => { const c = document.createElement('canvas'); return {c, s: createScene(c, {kind})}; };
  const harbor = make('harbor'), hatchery = make('hatchery'), almanac = make('hatchery'), stats = make('hatchery');
  harbor.s.show({keeper: WICK, lanterns: 5, lit: [false, false, false, false, false], animate: false});
  hatchery.s.show({keeper: WICK, nests: 3, creatures: [], animate: false});
  almanac.s.show({keeper: WICK, nests: 5, creatures: [], animate: false});
  stats.s.show({keeper: WICK, animate: false});
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const ui = {hatchery: await load('/__ui/hatchery.png'), almanac: await load('/__ui/almanac.png'), stats: await load('/__ui/stats.png')};
  await Promise.all(['150px Silkscreen', '40px Manrope'].map(f => document.fonts.load(f)));

  // What happens in the scenes, and when.
  const lit = n => Array.from({length: 5}, (_, i) => i < n);
  const EVENTS = [
    [TL.COMPANION_AT, () => harbor.s.show({companion: MOONPAW})],
    ...TL.LANTERNS.map((at, k) => [at, () => harbor.s.show({lit: lit(k + 1)})]),
    ...TL.HATCHERY.map((at, k) => [at, () => hatchery.s.show({creatures: SAMPLE.slice(0, k + 1)})]),
    ...TL.ALMANAC.map((at, k) => [at, () => almanac.s.show({creatures: ALMANAC.slice(0, k + 1)})]),
    [TL.STATS_AT, () => stats.s.show({solo: STATS})],
  ].sort((a, b) => a[0] - b[0]);

  const clamp = x => Math.max(0, Math.min(1, x)), ease = x => x * x * (3 - 2 * x);
  const FADE = 0.35;
  // Shots, in drawing order: each fades in over the one before it.
  const SHOTS = [
    {from: 0, to: 8.2, fadeIn: 0.8, draw: () => scene(harbor)},
    {from: 7.85, to: 11.2, draw: () => scene(hatchery)},
    {from: 10.85, to: 13.6, draw: t => shot(ui.hatchery, 10.85, 13.6, t, [1150, 760])},
    {from: 13.25, to: 16.2, draw: () => scene(almanac)},
    {from: 15.85, to: 18.8, draw: t => shot(ui.almanac, 15.85, 18.8, t, [1050, 820])},
    {from: 18.45, to: 21.2, draw: () => scene(stats)},
    {from: 20.85, to: 23.8, draw: t => shot(ui.stats, 20.85, 23.8, t, [1030, 860])},
    {from: 23.45, to: 99, draw: () => { scene(harbor); ctx.fillStyle = 'rgba(7, 8, 26, .58)'; ctx.fillRect(0, 0, 1920, 1080); }},
  ];

  function scene({c}) { ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, 1920, 1080); }
  // A slow push-in that keeps the focal point where it is on screen, lifted clear of the captions.
  function shot(img, a, b, t, [fx, fy]) {
    const z = 1 + 0.07 * ease(clamp((t - a) / (b - a))), lift = 120;
    ctx.fillStyle = '#0b0c1c'; ctx.fillRect(0, 0, 1920, 1080);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, fx - fx / z, fy - fy / z, 1920 / z, 1080 / z, 0, -lift, 1920, 1080);
  }
  function text(str, x, y, {size, color = '#ece9f7', spacing = 4, shadow = 5, font = 'Silkscreen', alpha = 1}) {
    ctx.save();
    ctx.globalAlpha = alpha; ctx.font = size + 'px ' + font; ctx.letterSpacing = spacing + 'px';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#07081a'; ctx.fillText(str, x + shadow, y + shadow);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
    ctx.restore();
  }
  // DUSKLINGS, one letter at a time.
  function title(t, start, y, alpha) {
    const word = 'DUSKLINGS', size = 150, spacing = 16;
    const measure = s => { ctx.save(); ctx.font = size + 'px Silkscreen'; ctx.letterSpacing = spacing + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; };
    let x = 960 - measure(word) / 2;
    for (let k = 0; k < word.length; k++) {
      const w = measure(word[k]), p = ease(clamp((t - start - k * TL.LETTER_GAP) / 0.18));
      if (p > 0) text(word[k], x + w / 2 - spacing / 2, y - (1 - p) * 26, {size, color: '#ffc86b', spacing: 0, shadow: 9, alpha: p * alpha});
      x += w;
    }
  }
  function band(alpha) {
    const g = ctx.createLinearGradient(0, 850, 0, 1080);
    g.addColorStop(0, 'rgba(7, 8, 26, 0)'); g.addColorStop(.45, 'rgba(7, 8, 26, .85)'); g.addColorStop(1, 'rgba(7, 8, 26, .95)');
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(0, 850, 1920, 230); ctx.restore();
  }

  function compose(t) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
    for (const s of SHOTS) {
      if (t < s.from || t > s.to) continue;
      ctx.save(); ctx.globalAlpha = clamp((t - s.from) / (s.fadeIn ?? FADE)); s.draw(t); ctx.restore();
    }
    const opening = clamp((2.8 - t) / 0.3);
    if (t < 2.8) {
      title(t, TL.TITLE_AT, 330, opening);
      text('LEARN TO BUILD ON DUSK', 960, 450, {size: 38, spacing: 6, shadow: 4, alpha: ease(clamp((t - 1.2) / 0.4)) * opening});
    }
    for (const [a, b, str] of TL.CAPTIONS) {
      if (t < a || t > b) continue;
      const alpha = Math.min(ease(clamp((t - a) / 0.25)), ease(clamp((b - t) / 0.25)));
      band(alpha);
      text(str, 960, 965 + (1 - ease(clamp((t - a) / 0.3))) * 14, {size: 60, alpha});
    }
    if (t > TL.END_TITLE_AT) {
      title(t, TL.END_TITLE_AT, 250, 1);
      text('LEARN TO BUILD ON DUSK', 960, 360, {size: 38, spacing: 6, shadow: 4, alpha: ease(clamp((t - TL.END_TITLE_AT - 0.7) / 0.4))});
      text('dusklings.com', 960, 470, {size: 64, spacing: 6, shadow: 6, alpha: ease(clamp((t - TL.URL_AT) / 0.4))});
    }
  }

  let fired = 0;
  window.renderFrame = (i, capture) => {
    const target = i * 1000 / TL.FPS;
    while (performance.now() < target - 0.001) {
      while (fired < EVENTS.length && EVENTS[fired][0] * 1000 <= performance.now()) EVENTS[fired++][1]();
      advance(1000 / 60);
    }
    compose(target / 1000);
    return capture ? out.toDataURL('image/png').split(',')[1] : null;
  };
  window.ready = true;
</script></body></html>`;

const preview = process.argv.includes('--preview') ? process.argv[process.argv.indexOf('--preview') + 1].split(',').map(Number) : null;
const encoder = preview ? null : ffmpeg();
const frames = join(out, preview ? 'preview' : 'frames');
for (const dir of [frames, join(out, 'ui')]) { rmSync(dir, {recursive: true, force: true}); mkdirSync(dir, {recursive: true}); }

const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox']});
try {
  const serve = async context => context.route(`${ORIGIN}/**`, r => {
    const path = new URL(r.request().url()).pathname;
    if (path === '/__trailer') return r.fulfill({contentType: 'text/html', body: page});
    const file = path.startsWith('/__ui/') ? join(out, 'ui', path.slice(6)) : join(root, path === '/' ? 'index.html' : path);
    try { r.fulfill({contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: readFileSync(file)}); } catch { r.fulfill({status: 404}); }
  });

  const app = await browser.newContext({viewport: {width: 1920, height: 1080}});
  await app.addInitScript(k => localStorage.setItem('dusklings:keeper:v1', JSON.stringify(k)), {name: 'Moonpaw', dna: MOONPAW, gear: ['cloak', 'badge']});
  await serve(app);
  const p = await app.newPage();
  for (const [name, [file, chapter]] of Object.entries(SHOTS)) {
    await p.goto(`${ORIGIN}/${file}#${chapter}`); await p.waitForTimeout(600);
    await p.click('#answer-button'); await p.click('#use-answer'); await p.click('#check-button');
    await p.waitForSelector('#console .win', {timeout: 120000});
    await p.waitForTimeout(2200);
    await p.screenshot({path: join(out, 'ui', `${name}.png`)});
    console.log(`captured ${file}#${chapter}`);
  }
  await app.close();

  const film = await browser.newContext({viewport: {width: 1920, height: 1080}});
  await serve(film);
  const f = await film.newPage();
  f.on('pageerror', e => { throw e; });
  await f.goto(`${ORIGIN}/__trailer`);
  await f.waitForFunction(() => window.ready, null, {timeout: 60000});
  const wanted = preview && new Set(preview.map(s => Math.round(s * FPS)));
  const last = preview ? Math.max(...wanted) : FRAMES - 1;
  for (let i = 0; i <= last; i++) {
    const png = await f.evaluate(([i, c]) => window.renderFrame(i, c), [i, !wanted || wanted.has(i)]);
    if (png) writeFileSync(join(frames, preview ? `t${(i / FPS).toFixed(2)}.png` : `${String(i).padStart(5, '0')}.png`), Buffer.from(png, 'base64'));
    if (!preview && i % 150 === 0) console.log(`frame ${i} / ${FRAMES}`);
  }
} finally {
  await browser.close();
}

if (!preview) {
  const run = args => { const r = spawnSync(encoder, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {encoding: 'utf8'}); if (r.status !== 0) throw Error(r.stderr); };
  writeFileSync(join(out, 'music.wav'), music());
  const silent = join(out, 'dusklings-trailer-silent.mp4'), final = join(out, 'dusklings-trailer.mp4');
  run(['-framerate', String(FPS), '-i', join(frames, '%05d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', silent]);
  run(['-i', silent, '-i', join(out, 'music.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', final]);
  rmSync(frames, {recursive: true, force: true});
  console.log(`wrote ${final} and ${silent}`);
}
