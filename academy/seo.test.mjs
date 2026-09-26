// What search engines, AI crawlers and link previews read: generated from the lesson data by
// tools/build_seo.mjs and kept in the repository, so these checks catch drift and broken links.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {build, PAGES, PATHS, SITE, url} from '../tools/build_seo.mjs';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url));
const html = page => read(page.file).toString('utf8');
const meta = (doc, key) => [...doc.matchAll(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)">`, 'g'))].map(m => m[1]);
const pngSize = buf => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

test('the generated files are up to date: run npm run build:seo after changing lessons or tools/build_seo.mjs', () => {
  for (const [file, content] of Object.entries(build())) assert.equal(read(file).toString('utf8'), content, `${file} is out of date`);
});

test('every page has a title, description, canonical URL, link preview and structured data', () => {
  for (const page of PAGES) {
    const doc = html(page), where = page.file;
    const title = doc.match(/<title>([^<]+)<\/title>/g);
    assert.equal(title?.length, 1, `${where} has one <title>`);
    assert.ok(page.title.length <= 65, `${where}: keep the title within 65 characters for search results`);
    const [description] = meta(doc, 'description');
    assert.ok(description?.length >= 70 && description.length <= 160, `${where}: description of 70 to 160 characters, which search results show in full`);
    assert.deepEqual([...doc.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map(m => m[1]), [url(page)], `${where} has one canonical URL`);
    assert.deepEqual(meta(doc, 'og:url'), [url(page)]);
    assert.deepEqual(meta(doc, 'og:title'), [page.title]);
    assert.deepEqual(meta(doc, 'twitter:card'), ['summary_large_image']);
    const [image] = meta(doc, 'og:image');
    assert.ok(image.startsWith(`${SITE}/`), `${where}: absolute og:image`);
    assert.deepEqual(pngSize(read(image.slice(SITE.length + 1))), [1200, 630], `${where}: ${image} is 1200×630`);
    assert.ok(!/name="robots"/.test(doc), `${where} is indexable`);
    const blocks = [...doc.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
    assert.equal(blocks.length, 1, `${where} has one JSON-LD block`);
    const data = JSON.parse(blocks[0][1]);
    if (PATHS.includes(page)) {
      assert.equal(data['@type'], 'Course');
      assert.equal(data.url, url(page));
      assert.equal(data.syllabusSections.length, page.units.length);
    } else {
      assert.deepEqual(data['@graph'].find(n => n['@type'] === 'ItemList').itemListElement.map(i => i.url), PATHS.map(url));
    }
    for (const icon of [...doc.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)].map(m => m[1])) assert.ok(existsSync(new URL(`../${icon}`, import.meta.url)), `${where}: ${icon} exists`);
    assert.equal(doc.match(/<footer class="site-footer">/g)?.length, 1, `${where} has the site footer`);
    assert.match(doc, /Built by <a href="https:\/\/github\.com\/HDauven">Hein Dauven<\/a>/, `${where} credits its author`);
    const author = PATHS.includes(page) ? data.author : data['@graph'].find(n => n['@type'] === 'WebSite').author;
    assert.deepEqual(author, {'@type': 'Person', name: 'Hein Dauven', url: 'https://github.com/HDauven'}, `${where}: JSON-LD author`);
  }
});

test('the creature sheet stays out of search results', () => {
  assert.match(read('creatures.html').toString('utf8'), /<meta name="robots" content="noindex">/);
  assert.match(read('robots.txt').toString('utf8'), /^Disallow: \/creatures\.html$/m);
  assert.ok(!read('sitemap.xml').toString('utf8').includes('creatures'));
});

test('the sitemap lists every page, and robots.txt points to it', () => {
  const locs = [...read('sitemap.xml').toString('utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(locs, PAGES.map(url));
  assert.match(read('robots.txt').toString('utf8'), new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, 'm'));
});

test('llms.txt links only to pages and files that exist', () => {
  const llms = read('llms.txt').toString('utf8');
  assert.match(llms, /^# Dusklings\n\n> /);
  for (const [, href] of llms.matchAll(/\]\(([^)]+)\)/g)) {
    if (href.startsWith('https://github.com/HDauven/dusklings')) continue;
    assert.ok(href.startsWith(`${SITE}/`), `${href} is on ${SITE}`);
    assert.ok(existsSync(new URL(`../${href.slice(SITE.length + 1) || 'index.html'}`, import.meta.url)), `${href} exists`);
  }
  const full = read('llms-full.txt').toString('utf8');
  for (const page of PATHS) for (const unit of page.units) for (const c of unit.chapters) assert.ok(full.includes(`URL: ${url(page)}#${c.id}\n`), `llms-full.txt has ${page.file}#${c.id}`);
});

test('each syllabus links every chapter once, and no chapter id is also an element id on its page', () => {
  for (const page of PATHS) {
    const doc = html(page), syllabus = doc.slice(doc.indexOf('<section class="syllabus"'));
    const links = [...syllabus.matchAll(/<a href="#([^"]+)">/g)].map(m => m[1]);
    assert.deepEqual(links, page.units.flatMap(u => u.chapters.map(c => c.id)), `${page.file}: syllabus links`);
    const ids = new Set([...doc.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    for (const id of links) assert.ok(!ids.has(id), `${page.file}: chapter id "${id}" is also an element id, so its link would scroll there`);
  }
});
