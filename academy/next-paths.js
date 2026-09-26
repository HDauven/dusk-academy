// The other paths, offered where each path ends.
import {SAMPLE, WICK} from './contract.js';
import {drawCreature} from './creature.js';

const PATHS = [
  {key: 'journey', href: 'journey.html', dna: WICK, kicker: 'No code', title: 'Keeper\'s journey', text: 'Learn how Dusk works, one question per chapter.'},
  {key: 'hatchery', href: 'hatchery.html', dna: SAMPLE[1], kicker: 'Contracts', title: 'The Hatchery', text: 'Write the Rust contract that hatches Dusklings.'},
  {key: 'almanac', href: 'almanac.html', dna: SAMPLE[2], kicker: 'dApps', title: 'The Almanac', text: 'Read every Duskling from a browser with Dusk Connect.'},
  {key: 'stats', href: 'secret-stats.html', dna: '1335947248835871', kicker: 'Circuits', title: 'Secret stats', text: 'Prove your Duskling\'s power without revealing its stats.'},
];

// Tiles for every path except `current`, then a link home.
export const nextPathsHtml = current => `<div class="paths-grid">${PATHS.filter(p => p.key !== current).map(p =>
  `<a class="path-tile" href="${p.href}"><canvas data-dna="${p.dna}" width="64" height="64" class="pixel" aria-hidden="true"></canvas><span class="kicker">${p.kicker}</span><strong>${p.title}</strong><span class="muted">${p.text}</span></a>`).join('')}</div>
<a class="ghost home-link" href="./">Back to all paths</a>`;

// The closing panel of a code path: what the learner built, and where to go next.
export const courseEndHtml = (current, {kicker, text}) => `<section class="panel course-end" aria-labelledby="course-end-title">
  <p class="kicker">${kicker}</p><h2 id="course-end-title">What's next</h2><p>${text}</p>
  ${nextPathsHtml(current)}</section>`;

export const drawTiles = root => root.querySelectorAll('.path-tile canvas[data-dna]').forEach(c => drawCreature(c, c.dataset.dna, {scale: 2}));
