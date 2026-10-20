import { BEAM_L } from './physics.js';

export const MINUS = '−';

// The only way a number reaches the screen. Rounds here and nowhere else; a
// null or non-finite value prints as a dash; and negative zero can never
// appear, because String(-0) is "0" and Number("-0.00") is -0.
export function fmt(n, dp = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const s = String(Number(n.toFixed(dp)));
  return s.startsWith('-') ? MINUS + s.slice(1) : s;
}

// Always exactly dp decimals ("1.00", "4.00"): used for locations along the beam, where the
// trailing zeros are part of the reading. A tiny negative that rounds to zero prints "0.00"
// (toFixed keeps the sign: (-0.001).toFixed(2) is "-0.00"). Non-finite or missing prints a dash.
export function fmtFixed(n, dp = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  let s = n.toFixed(dp);
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
  return s.startsWith('-') ? MINUS + s.slice(1) : s;
}

// Signed force (+ down) in words: "200 N down", "10 N up", "0 N".
// Whole numbers print with no decimals, anything else with two.
export function forceWords(F) {
  const mag = Math.abs(F);
  const dp = Number.isInteger(mag) ? 0 : 2;
  const text = fmt(mag, dp);
  if (text === '0' || text === '—') return `${text} N`;
  return `${text} N ${F > 0 ? 'down' : 'up'}`;
}

// Location in words; '' when there is none (x null). Flags a point beyond the beam.
export function locWords(x) {
  if (x === null || x === undefined) return '';
  // Judge "off the beam" on the printed value, so "0.00 m ... (off the beam)" cannot happen.
  const shown = Number(fmtFixed(x).replace(MINUS, '-'));
  const off = shown < 0 || shown > BEAM_L ? ' (off the beam)' : '';
  return `at x = ${fmtFixed(x)} m from A${off}`;
}
