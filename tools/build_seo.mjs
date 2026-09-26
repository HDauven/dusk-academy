// Writes what search engines, AI crawlers and link previews read, all from the lesson data:
// each page's title, description, canonical URL, preview tags and structured data, a syllabus
// on every path page, robots.txt, sitemap.xml, llms.txt and llms-full.txt.
//
//   npm run build:seo                   rewrite the generated parts
//   node tools/build_seo.mjs --check    exit 1 if any generated part is out of date
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {lessons as hatchery} from '../academy/course.js';
import {levels} from '../academy/journey.js';
import {lessons as almanac} from '../academy/almanac-lessons.js';
import {lessons as stats} from '../academy/stats-lessons.js';

export const SITE = 'https://dusklings.com';
const root = resolve(import.meta.dirname, '..');
const DUSK = {'@type': 'Thing', name: 'Dusk', url: 'https://dusk.network'};
const SOURCE = 'https://github.com/HDauven/dusklings';

const lessonUnits = lessons => lessons.map(l => ({label: `Lesson ${l.n}`, title: l.title, chapters: l.chapters, reference: l.reference}));

export const HOME = {
  file: 'index.html', path: '', image: 'home',
  title: 'Dusklings: learn to build on Dusk',
  description: 'Learn how the Dusk blockchain works, then write Rust smart contracts with Dusk Forge, zero-knowledge circuits and dApps, raising pixel Dusklings as you go.',
};

export const PATHS = [
  {
    file: 'journey.html', path: 'journey.html', image: 'journey', kicker: 'No code', name: 'Keeper\'s journey',
    title: 'Keeper\'s journey: how Dusk works | Dusklings',
    description: 'A no-code introduction to Dusk in five levels: blockchain basics, zero-knowledge privacy, identity and credentials, regulated assets and the network.',
    teaches: levels.map(l => l.topic),
    units: levels.map((l, i) => ({label: `Level ${i + 1}`, title: l.title, topic: l.topic, chapters: l.chapters})),
  },
  {
    file: 'hatchery.html', path: 'hatchery.html', image: 'hatchery', kicker: 'Smart contracts in Rust', name: 'The Hatchery', lang: 'rust',
    title: 'The Hatchery: Dusk smart contracts in Rust | Dusklings',
    description: 'Write a Dusk Forge smart contract in Rust over five lessons: state, events, calls between contracts, block height and approvals.',
    teaches: ['Rust', 'Dusk Forge smart contracts', 'Contract state and events', 'Calls between contracts', 'Block height', 'Approvals and transfers'],
    units: lessonUnits(hatchery),
  },
  {
    file: 'almanac.html', path: 'almanac.html', image: 'almanac', kicker: 'dApps in JavaScript', name: 'The Almanac', lang: 'js',
    title: 'The Almanac: Dusk dApps with Dusk Connect | Dusklings',
    description: 'Build a JavaScript dApp that reads a Dusk contract with Dusk Connect and its data-driver, then prepares hatch and transfer calls for a wallet to sign.',
    teaches: ['Dusk Connect', 'Contract data-drivers', 'Reading contract state from JavaScript', 'Preparing contract calls for a wallet'],
    units: lessonUnits(almanac),
  },
  {
    file: 'secret-stats.html', path: 'secret-stats.html', image: 'secret-stats', kicker: 'Zero-knowledge circuits', name: 'Secret stats', lang: 'rust',
    title: 'Secret stats: zero-knowledge circuits with PLONK | Dusklings',
    description: 'Write dusk-plonk circuits that prove a Duskling\'s power without revealing its stats, then that it\'s at least 50. Each check makes a real PLONK proof.',
    teaches: ['Zero-knowledge proofs', 'PLONK circuits with dusk-plonk', 'Proving a value is at least a threshold'],
    units: lessonUnits(stats),
  },
];

export const PAGES = [HOME, ...PATHS];
export const url = page => `${SITE}/${page.path}`;
const text = s => String(s).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
const attr = s => text(s).replace(/"/g, '&quot;');
const plain = html => String(html).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const provider = {'@type': 'Organization', '@id': `${SITE}/#org`, name: 'Dusklings', url: `${SITE}/`, logo: `${SITE}/assets/icons/icon-512.png`, sameAs: [SOURCE]};
function structuredData(page) {
  if (page === HOME) return {
    '@context': 'https://schema.org',
    '@graph': [
      {'@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Dusklings', description: page.description, inLanguage: 'en', publisher: {'@id': `${SITE}/#org`}, about: DUSK},
      provider,
      {'@type': 'ItemList', name: 'Dusklings paths', itemListElement: PATHS.map((p, i) => ({'@type': 'ListItem', position: i + 1, name: p.name, url: url(p)}))},
    ],
  };
  return {
    '@context': 'https://schema.org', '@type': 'Course', '@id': `${url(page)}#course`,
    name: page.name, description: page.description, url: url(page), inLanguage: 'en',
    isAccessibleForFree: true, educationalLevel: 'Beginner', teaches: page.teaches, about: DUSK,
    provider: {'@type': 'Organization', name: 'Dusklings', url: `${SITE}/`},
    hasCourseInstance: {'@type': 'CourseInstance', courseMode: 'Online'},
    offers: {'@type': 'Offer', category: 'Free', price: 0, priceCurrency: 'EUR'},
    syllabusSections: page.units.map(u => ({'@type': 'Syllabus', name: `${u.label}: ${u.title}`, description: u.chapters.map(c => plain(c.title)).join(', ')})),
  };
}

// Tags between <!-- seo:head --> and <!-- /seo:head -->.
function head(page) {
  const image = `${SITE}/assets/og/${page.image}.png`;
  // JSON-LD sits in a data block, which browsers never run, so the CSP stays script-src 'self'.
  const json = JSON.stringify(structuredData(page)).replace(/</g, '\\u003c');
  return [
    `<title>${text(page.title)}</title>`,
    `<meta name="description" content="${attr(page.description)}">`,
    `<link rel="canonical" href="${url(page)}">`,
    '<link rel="icon" href="favicon.ico" sizes="32x32">',
    '<link rel="icon" href="assets/icons/icon-192.png" type="image/png" sizes="192x192">',
    '<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Dusklings">',
    `<meta property="og:title" content="${attr(page.title)}">`,
    `<meta property="og:description" content="${attr(page.description)}">`,
    `<meta property="og:url" content="${url(page)}">`,
    `<meta property="og:image" content="${image}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${attr(page === HOME ? 'Dusklings: pixel creatures under a night sky' : `${page.name}, a Dusklings path: ${page.kicker}`)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<script type="application/ld+json">${json}</script>`,
  ].map(line => `  ${line}`).join('\n');
}

// A section below each path's app: what the path covers and a link to every chapter.
function syllabus(page) {
  const units = page.units.map(u => `      <section>
        <h3>${text(u.label)}: ${text(u.title)}</h3>${u.topic ? `\n        <p class="muted">${text(u.topic)}</p>` : ''}
        <ol>
${u.chapters.map(c => `          <li><a href="#${attr(c.id)}">${text(plain(c.title))}</a></li>`).join('\n')}
        </ol>
      </section>`).join('\n');
  return `  <section class="syllabus" aria-labelledby="syllabus-title">
    <p class="kicker">${text(page.kicker)}</p>
    <h2 id="syllabus-title">${text(page.name)}</h2>
    <p>${text(page.description)}</p>
    <div class="syllabus-units">
${units}
    </div>
    <p class="muted"><a href="./">All paths</a></p>
  </section>`;
}

function between(html, name, content, file) {
  const re = new RegExp(`<!-- seo:${name} -->[\\s\\S]*?<!-- /seo:${name} -->`);
  if (!re.test(html)) throw Error(`${file} has no <!-- seo:${name} --> markers`);
  return html.replace(re, () => `<!-- seo:${name} -->\n${content}\n  <!-- /seo:${name} -->`);
}

// Lesson HTML as Markdown, for llms-full.txt.
function markdown(html, lang = '') {
  const inline = s => s.replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**').replace(/<em>([\s\S]*?)<\/em>/g, '*$1*')
    .replace(/<code>([\s\S]*?)<\/code>/g, '`$1`').replace(/<sup>([\s\S]*?)<\/sup>/g, '^$1');
  const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const blocks = [];
  const re = /<pre>(?:<code>)?([\s\S]*?)(?:<\/code>)?<\/pre>|<p class="aside">([\s\S]*?)<\/p>|<p>([\s\S]*?)<\/p>|<ul>([\s\S]*?)<\/ul>/g;
  for (const m of String(html).matchAll(re)) {
    if (m[1] !== undefined) blocks.push('```' + lang + '\n' + decode(m[1]).replace(/\n$/, '') + '\n```');
    else if (m[2] !== undefined) blocks.push('> ' + decode(inline(m[2])).replace(/\n/g, '\n> '));
    else if (m[3] !== undefined) blocks.push(decode(inline(m[3])));
    else blocks.push([...m[4].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(li => '- ' + decode(inline(li[1]))).join('\n'));
  }
  return blocks.join('\n\n');
}

function llmsFull() {
  const out = ['# Dusklings: every lesson', '', `> ${HOME.description}`, '',
    `Each chapter's text as it appears on ${SITE}. Journey chapters end with their question, every answer and why it is right or wrong. Code chapters end with their task, and each code lesson ends with its finished code.`];
  for (const page of PATHS) {
    out.push('', `# ${page.name}`, '', page.description, '', `URL: ${url(page)}`);
    for (const unit of page.units) {
      out.push('', `## ${unit.label}: ${unit.title}${unit.topic ? ` (${unit.topic})` : ''}`);
      for (const c of unit.chapters) {
        out.push('', `### ${plain(c.title)}`, '', `URL: ${url(page)}#${c.id}`, '', markdown(c.body, page.lang));
        if (c.question) {
          out.push('', `**Question:** ${markdown(`<p>${c.question}</p>`)}`, '');
          for (const choice of c.choices) out.push(`- ${choice.right ? '[right]' : '[wrong]'} ${markdown(`<p>${choice.text}</p>`)}\n  ${markdown(`<p>${choice.why}</p>`)}`);
        }
        if (c.tasks?.length) out.push('', '**Task:**', '', ...c.tasks.map((t, i) => `${i + 1}. ${markdown(`<p>${t}</p>`)}`));
      }
      if (unit.reference) out.push('', `### The code at the end of ${unit.label.toLowerCase()}`, '', '```' + page.lang, unit.reference.replace(/\n$/, ''), '```');
    }
  }
  return out.join('\n') + '\n';
}

function llms() {
  return [
    '# Dusklings', '',
    `> ${HOME.description}`, '',
    'Dusklings is a set of browser lessons about the Dusk blockchain. Learners share one pixel creature, a Duskling, across four independent paths. Progress is saved in the browser. Contract checks run a Rust-subset interpreter in the page, and every reference answer is also compiled with Dusk Forge and replayed in Dusk\'s VM. Circuit checks make and verify real PLONK proofs.', '',
    '## Paths', '',
    ...PATHS.map(p => `- [${p.name}](${url(p)}): ${p.description}`), '',
    '## Full text', '',
    `- [Every lesson as Markdown](${SITE}/llms-full.txt): each chapter's explanation, questions with explained answers, tasks and finished code`, '',
    '## Optional', '',
    `- [Source code](${SOURCE}): the game, the lessons and the tools that check every answer against Dusk's VM`, '',
  ].join('\n');
}

const sitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(p => `  <url><loc>${url(p)}</loc></url>`).join('\n')}
</urlset>
`;
const robots = () => `User-agent: *\nAllow: /\nDisallow: /creatures.html\n\nSitemap: ${SITE}/sitemap.xml\n`;

export function build() {
  const files = {};
  for (const page of PAGES) {
    let html = readFileSync(join(root, page.file), 'utf8');
    html = between(html, 'head', head(page), page.file);
    if (page !== HOME) html = between(html, 'syllabus', syllabus(page), page.file);
    files[page.file] = html;
  }
  Object.assign(files, {'robots.txt': robots(), 'sitemap.xml': sitemap(), 'llms.txt': llms(), 'llms-full.txt': llmsFull()});
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check'), stale = [];
  for (const [file, content] of Object.entries(build())) {
    let current = null;
    try { current = readFileSync(join(root, file), 'utf8'); } catch {}
    if (current === content) continue;
    if (check) stale.push(file); else { writeFileSync(join(root, file), content); console.log(`wrote ${file}`); }
  }
  if (stale.length) { console.error(`Out of date: ${stale.join(', ')}. Run npm run build:seo.`); process.exit(1); }
}
