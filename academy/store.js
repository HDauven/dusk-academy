// Progress lives in this browser only. Every read and write tolerates blocked storage.
// Storage is shared with every other page on this origin (all of a user's GitHub Pages sites),
// so whatever is read back is treated as untrusted input.
import {GEAR_INFO} from './creature.js';

export const KEYS = {hatchery: 'dusklings:hatchery:v1', journey: 'dusklings:journey:v1', keeper: 'dusklings:keeper:v1', stats: 'dusklings:secret-stats:v1', almanac: 'dusklings:almanac:v1'};

// Progress saved before the rename to Dusklings moves to the new keys, once.
try {
  for (const key of Object.values(KEYS)) {
    const old = key.replace('dusklings:', 'dusk-academy:'), value = localStorage.getItem(old);
    if (value === null) continue;
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    localStorage.removeItem(old);
  }
} catch {}

// A stored value replaces a default only when it has the same shape: a non-negative integer for a
// number, a plain object for an object, and so on.
const fits = (v, d) => d === null ? true
  : Array.isArray(d) ? Array.isArray(v)
  : typeof d === 'object' ? v !== null && typeof v === 'object' && !Array.isArray(v)
  : typeof d === 'number' ? Number.isInteger(v) && v >= 0
  : typeof v === typeof d;

export function load(path, defaults) {
  const value = structuredClone(defaults);
  try {
    const raw = localStorage.getItem(KEYS[path]);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object')
      for (const [k, v] of Object.entries(parsed))
        if (!['__proto__', 'constructor', 'prototype'].includes(k) && (!Object.hasOwn(defaults, k) || fits(v, defaults[k]))) value[k] = v;
  } catch {}
  return value;
}

export function store(path, value) {
  try { localStorage.setItem(KEYS[path], JSON.stringify(value)); return true; } catch { return false; }
}

// One Duskling per keeper, shared by every path. Gear is earned in the journey.
const validName = name => typeof name === 'string' ? name.trim().slice(0, 24) : '';
const validDna = dna => typeof dna === 'string' && /^\d{16}$/.test(dna) ? dna : '';
export function loadKeeper() {
  const stored = load('keeper', {name: '', dna: '', gear: []});
  const keeper = {name: validName(stored.name), dna: validDna(stored.dna),
    gear: Array.isArray(stored.gear) ? stored.gear.filter(g => Object.hasOwn(GEAR_INFO, g)) : []};
  if (!keeper.dna) {
    const legacy = load('hatchery', {duskling: null}).duskling;
    if (validDna(legacy?.dna)) Object.assign(keeper, {name: validName(legacy.name), dna: legacy.dna});
  }
  // Learners from the classic academy keep their character name as a suggestion. That site
  // stored it under its own key.
  if (!keeper.name) try {
    const name = JSON.parse(localStorage.getItem('dusk-academy-forge-lesson-v1'))?.name;
    if (typeof name === 'string') keeper.name = name.trim().slice(0, 24);
  } catch {}
  return keeper;
}
export const saveKeeper = keeper => store('keeper', keeper);

// Uses a Duskling sprite as the tab icon.
export function favicon(canvas) {
  const link = document.querySelector('link[rel=icon]') ?? document.head.appendChild(Object.assign(document.createElement('link'), {rel: 'icon'}));
  link.href = canvas.toDataURL('image/png');
}
