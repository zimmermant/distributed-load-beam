import { nextW, equivalents } from './physics.js';

export const DEFAULTS = { r: 100, t: 100, peak: 'B' };

// Everything is derived from {r, t, peak}; nothing else is stored.
export function derive(s) {
  return equivalents(s);
}

// Pure store: no DOM. Subscribers are called with a copy of the new state, and
// only when a stored value actually changed.
export function createState() {
  let cur = { ...DEFAULTS };
  const subs = new Set();

  function commit(next) {
    if (next.r === cur.r && next.t === cur.t && next.peak === cur.peak) return;
    cur = next;
    const snapshot = { ...cur };
    for (const fn of [...subs]) fn(snapshot);
  }

  const isPeak = (p) => p === 'A' || p === 'B';

  return {
    getState: () => ({ ...cur }),
    setR: (raw, viaKeyboard) => commit({ ...cur, r: nextW(cur.r, raw, viaKeyboard) }),
    setT: (raw, viaKeyboard) => commit({ ...cur, t: nextW(cur.t, raw, viaKeyboard) }),
    setPeak: (p) => { if (isPeak(p)) commit({ ...cur, peak: p }); },
    // A batch (presets): each field is snapped, missing/invalid fields are kept, one notification.
    set: (p = {}) => commit({
      r: p.r === undefined ? cur.r : nextW(cur.r, p.r, false),
      t: p.t === undefined ? cur.t : nextW(cur.t, p.t, false),
      peak: isPeak(p.peak) ? p.peak : cur.peak
    }),
    subscribe: (fn) => { subs.add(fn); return () => { subs.delete(fn); }; },
    reset: () => commit({ ...DEFAULTS })
  };
}
