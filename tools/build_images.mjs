// Renders the site's icons and link-preview images with the game's own sprite and scene code, in
// headless Chromium: favicon.ico, assets/icons/*.png, and a 1200×630 card per page in assets/og/.
//
//   npm run build:images
//   NODE_PATH=/path/to/node_modules npm run build:images    # Playwright from elsewhere, as for test:e2e
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, resolve, extname} from 'node:path';
import {WICK, SAMPLE} from '../academy/contract.js';

// require() honours NODE_PATH; import doesn't.
const {chromium} = createRequire(import.meta.url)('playwright');
const root = resolve(import.meta.dirname, '..');
const ORIGIN = 'http://dusklings.test';
const TYPES = {'.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2'};
const STATS_DNA = '1335947248835871';

// One card per page: the path's own scene, its name and one line about it.
const CARDS = {
  home: {kicker: 'Learn to build on Dusk', title: 'Raise Dusklings.<br>Learn Dusk.', line: 'How Dusk works, then contracts, circuits and dApps.',
    scene: 'harbor', show: {keeper: WICK, companion: SAMPLE[0], lanterns: 5, lit: [true, true, true, true, true]}},
  journey: {kicker: 'No code', title: 'Keeper\'s journey', line: 'How Dusk works, in five levels.',
    scene: 'harbor', show: {keeper: WICK, egg: true, lanterns: 5, lit: [true, true, false, false, false]}},
  hatchery: {kicker: 'Smart contracts in Rust', title: 'The Hatchery', line: 'Write a Dusk Forge contract in five lessons.',
    scene: 'hatchery', show: {keeper: WICK, creatures: SAMPLE, nests: 1}},
  almanac: {kicker: 'dApps in JavaScript', title: 'The Almanac', line: 'Read a Dusk contract with Dusk Connect.',
    scene: 'hatchery', show: {keeper: WICK, creatures: [...SAMPLE, STATS_DNA, '4829105736152840']}},
  'secret-stats': {kicker: 'Zero-knowledge circuits', title: 'Secret stats', line: 'Prove a Duskling\'s power with <span>dusk-plonk</span>.',
    scene: 'hatchery', show: {keeper: WICK, solo: STATS_DNA}},
};

const card = ({kicker, title, line, scene, show}) => `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="/academy/style.css">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  .og-card { position: relative; box-sizing: border-box; width: 1200px; height: 630px; padding: 0 64px; display: grid; grid-template-columns: 1fr 576px; gap: 44px; align-items: center;
    background: radial-gradient(ellipse at 78% 45%, #1d1f4d 0%, transparent 62%), var(--bg); }
  .brand { position: absolute; left: 64px; top: 52px; font-size: 24px; }
  .site { position: absolute; left: 64px; bottom: 48px; margin: 0; font-family: var(--pixel); font-size: 18px; letter-spacing: .08em; color: var(--muted); }
  .kicker { font-size: 17px; }
  h1 { margin: 16px 0 18px; font-family: var(--pixel); font-weight: 400; font-size: 56px; line-height: 1.1; color: var(--text); }
  .line { margin: 0; font-size: 27px; line-height: 1.35; color: #d6d3ee; text-wrap: balance; }
  .line span { white-space: nowrap; }
  .scene { border: 2px solid var(--line-2); box-shadow: 0 8px 0 #07081a; line-height: 0; }
  .scene canvas { width: 576px; height: 324px; image-rendering: pixelated; }
</style></head>
<body><div class="og-card">
  <span class="brand">DUSKLINGS</span>
  <div><p class="kicker">${kicker}</p><h1>${title}</h1><p class="line">${line}</p></div>
  <div class="scene"><canvas></canvas></div>
  <p class="site">dusklings.com</p>
</div>
<script type="module">
  import {createScene} from '/academy/scene.js';
  createScene(document.querySelector('canvas'), {kind: ${JSON.stringify(scene)}}).show({...${JSON.stringify(show)}, animate: false});
  await document.fonts.ready;
  document.body.dataset.ready = '1';
</script></body></html>`;

// Wick, the narrator, at whole-number scales so every pixel stays square.
const ICONS = [
  {file: 'favicon-32.png', size: 32, scale: 1},
  {file: 'icon-192.png', size: 192, scale: 6},
  {file: 'apple-touch-icon.png', size: 180, scale: 5, background: '#0c0d1d'},
  {file: 'icon-512.png', size: 512, scale: 14, background: '#0c0d1d'},
];
const icons = `<!doctype html><script type="module">
  import {sprite, SIZE} from '/academy/creature.js';
  window.icons = ${JSON.stringify(ICONS)}.map(({size, scale, background}) => {
    const c = document.createElement('canvas'), ctx = c.getContext('2d'), s = SIZE * scale;
    c.width = c.height = size;
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, size, size); }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite(${JSON.stringify(WICK)}), (size - s) / 2, (size - s) / 2, s, s);
    return c.toDataURL('image/png').split(',')[1];
  });
</script>`;

// An .ico file holding PNG images, which every current browser reads.
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({png, size}, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size % 256, at); header.writeUInt8(size % 256, at + 1);
    header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(png.length, at + 8); header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs.map(p => p.png)]);
}

const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox']});
try {
  const page = await browser.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1});
  let html = '';
  await page.route(`${ORIGIN}/**`, route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({contentType: 'text/html', body: html});
    route.fulfill({contentType: TYPES[extname(path)] ?? 'application/octet-stream', body: readFileSync(join(root, path))});
  });

  mkdirSync(join(root, 'assets/icons'), {recursive: true});
  html = icons;
  await page.goto(`${ORIGIN}/`);
  const data = await page.waitForFunction(() => window.icons).then(h => h.jsonValue());
  ICONS.forEach(({file}, i) => { writeFileSync(join(root, 'assets/icons', file), Buffer.from(data[i], 'base64')); console.log(`wrote assets/icons/${file}`); });
  writeFileSync(join(root, 'favicon.ico'), ico([{png: Buffer.from(data[0], 'base64'), size: 32}]));
  console.log('wrote favicon.ico');

  mkdirSync(join(root, 'assets/og'), {recursive: true});
  for (const [name, spec] of Object.entries(CARDS)) {
    html = card(spec);
    await page.goto(`${ORIGIN}/`);
    await page.waitForSelector('body[data-ready]');
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({path: join(root, 'assets/og', `${name}.png`)});
    console.log(`wrote assets/og/${name}.png`);
  }
} finally {
  await browser.close();
}
