// Runs a check plan against the learner's module: each step calls one exported function and records
// its value or error. Used inside the sandboxed worker in the browser, and directly in Node tests.
import {NODE, OFFLINE_NODE} from './almanac-transport.js';

export const SDK_EXPRESSION = /new\s+URL\(\s*(["'])\/academy\/vendor\/dusk-connect\.js\1\s*,\s*location\.origin\s*\)\.href/g;

// plan: [{fn, args?, node?: 'offline', pure?: true}]
export async function runPlan(learner, plan, fixture, requests = []) {
  const results = [], apps = [];
  const app = node => {
    const dusk = learner.createApp?.(node === 'offline' ? OFFLINE_NODE : NODE, '0x' + fixture.contract);
    if (!dusk?.readContract) throw Error('`createApp` should return `createDuskApp(...)`.');
    apps.push(dusk);
    return dusk;
  };
  try {
    for (const step of plan) {
      if (typeof learner[step.fn] !== 'function') { results.push({ok: false, error: `Export an async function called \`${step.fn}\`.`, missing: true}); continue; }
      const start = requests.length;
      try {
        const args = (step.args ?? []).map(a => a?.key ? fixture.keepers[a.key] : a);
        const value = step.pure ? await learner[step.fn](...args) : await learner[step.fn](app(step.node), ...args);
        results.push({ok: true, value: plain(value), requests: requests.slice(start).map(r => r.fn)});
      } catch (error) {
        results.push({ok: false, error: String(error?.message ?? error).slice(0, 600), requests: requests.slice(start).map(r => r.fn)});
      }
    }
  } finally {
    for (const dusk of apps) dusk.wallet?.destroy?.();
  }
  return results;
}

// Results cross a message channel: keep BigInts and plain data, drop anything else. The page applies
// this again to whatever arrives, since learner code can post to the channel itself.
export function plain(value, depth = 0) {
  if (depth > 6) return undefined;
  if (typeof value === 'string') return value.slice(0, 10000);
  if (value === null || ['number', 'boolean', 'bigint', 'undefined'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.slice(0, 64).map(v => plain(v, depth + 1));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 32).map(([k, v]) => [k, plain(v, depth + 1)]));
  return String(value);
}
