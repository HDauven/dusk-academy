// Progress lives in this browser only. Every read and write tolerates blocked storage.
export const KEYS = {hatchery: 'dusk-academy:hatchery:v1', journey: 'dusk-academy:journey:v1', keeper: 'dusk-academy:keeper:v1'};

export function load(path, defaults) {
  const value = structuredClone(defaults);
  try {
    const raw = localStorage.getItem(KEYS[path]);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') Object.assign(value, parsed);
  } catch {}
  return value;
}

export function store(path, value) {
  try { localStorage.setItem(KEYS[path], JSON.stringify(value)); return true; } catch { return false; }
}

// One Duskling per keeper, shared by every path. Gear is earned in the journey.
export function loadKeeper() {
  const keeper = load('keeper', {name: '', dna: '', gear: []});
  if (!keeper.dna) {
    const legacy = load('hatchery', {duskling: null}).duskling;
    if (legacy?.dna) Object.assign(keeper, {name: legacy.name, dna: legacy.dna});
  }
  // Learners from the classic academy keep their character name as a suggestion.
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
