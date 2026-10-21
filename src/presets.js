import { snapW } from './physics.js';
import { NBSP, fmt } from './format.js';

// Optional URL parameters that preset a problem:
//   r=N/m  rectangular load    t=N/m  triangular peak load    peak=A|B  where the triangle peaks
// Presets are configuration read once at load, held OUTSIDE the state. Every number goes through
// snapW (the same snapping as the sliders) and a change you could see is reported.

// No exponent, no hex, no empty. Written unambiguously (\d+(\.\d*)?, not \d+\.?\d*): the looser
// form backtracks quadratically on a long digit string with a bad last character.
const PRESET_NUMBER = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;
const PRESET_SHOWN_MAX = 40;                      // characters of a rejected value echoed back
const PRESET_NUMBER_HINT = 'use a number of N/m';
const PRESET_PEAK_HINT = 'use A or B';

function presetNumber(text) {
  // The page prints a real minus sign (U+2212), so a number pasted from the screen starts with one.
  const s = text.trim().replace(/^−/, '-');
  if (!PRESET_NUMBER.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;           // 400 digits overflow to Infinity
}

// A rejected value is echoed back, but a 2,000-character one would overflow the page.
function presetShown(raw) {
  const chars = Array.from(raw);
  return chars.length > PRESET_SHOWN_MAX ? chars.slice(0, PRESET_SHOWN_MAX).join('') + '…' : raw;
}

// Reads a load. Returns the snapped value, or undefined (and an ignored note) when it is not a number.
function presetLoad(name, raw, out) {
  const n = presetNumber(raw);
  if (n === null) {
    out.ignored.push(`${name}=${presetShown(raw)} (${PRESET_NUMBER_HINT})`);
    return undefined;
  }
  const s = snapW(n);                              // never -0
  // Compare what would be PRINTED: a snap too small to show (100.0001 to 100) is no news.
  if (fmt(n) !== fmt(s)) out.adjusted.push(`${name} ${fmt(n)}${NBSP}N/m → ${fmt(s)}${NBSP}N/m`);
  return s;
}

function presetPeak(raw, out) {
  const v = raw.trim().toUpperCase();
  if (v === 'A' || v === 'B') return v;
  out.ignored.push(`peak=${presetShown(raw)} (${PRESET_PEAK_HINT})`);
  return undefined;
}

export function parsePresets(search) {
  const q = new URLSearchParams(search || '');
  const out = { r: undefined, t: undefined, peak: undefined, adjusted: [], ignored: [] };
  // The first duplicate wins (get); a missing key is null. Notes follow the order r, t, peak.
  const r = q.get('r');
  if (r !== null) out.r = presetLoad('r', r, out);
  const t = q.get('t');
  if (t !== null) out.t = presetLoad('t', t, out);
  const peak = q.get('peak');
  if (peak !== null) out.peak = presetPeak(peak, out);
  return out;
}

export function describePresets(p) {
  const set = [];
  if (p.r !== undefined) set.push(`r = ${fmt(p.r)}${NBSP}N/m`);
  if (p.t !== undefined) set.push(`t = ${fmt(p.t)}${NBSP}N/m`);
  if (p.peak !== undefined) set.push(`peak at ${p.peak}`);
  const parts = [];
  if (set.length) parts.push(`From the link: ${set.join(', ')}.`);
  else if (p.adjusted.length || p.ignored.length) parts.push('From the link: nothing set.');
  if (p.adjusted.length) parts.push(`Adjusted: ${p.adjusted.join('; ')}.`);
  if (p.ignored.length) parts.push(`Ignored: ${p.ignored.join('; ')}.`);
  return parts.join(' ');
}
