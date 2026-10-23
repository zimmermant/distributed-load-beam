import { BEAM_L } from './physics.js';

export const MINUS = '−';

// A number and its unit are never separated by a line break: the space between them is a no-break space.
export const NBSP = '\u00a0';

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

// Signed force (+ up) in words: "200 N up", "10 N down", "0 N".
// Whole numbers print with no decimals, anything else with two.
export function forceWords(F) {
  const mag = Math.abs(F);
  const dp = Number.isInteger(mag) ? 0 : 2;
  const text = fmt(mag, dp);
  if (text === '0' || text === '—') return `${text}${NBSP}N`;
  return `${text}${NBSP}N ${F < 0 ? 'down' : 'up'}`;
}

// A moment in N·m, counterclockwise positive: { text, dir }. text is the signed value with its unit, an explicit +
// for counterclockwise ("+333.33 N·m", "−200 N·m"); dir is 'counterclockwise', 'clockwise', or '' for a moment that
// prints as 0. Whole numbers print with no decimals, anything else with two (as forceWords).
export function momentParts(M) {
  const mag = Math.abs(M);
  const text = fmt(mag, Number.isInteger(mag) ? 0 : 2);
  if (text === '0' || text === '—') return { text: `${text}${NBSP}N·m`, dir: '' };
  return M > 0
    ? { text: `+${text}${NBSP}N·m`, dir: 'counterclockwise' }
    : { text: `${MINUS}${text}${NBSP}N·m`, dir: 'clockwise' };
}

// A moment in words: "−333.33 N·m (clockwise)", "+60 N·m (counterclockwise)", "0 N·m".
export function momentWords(M) {
  const { text, dir } = momentParts(M);
  return dir ? `${text} (${dir})` : text;
}

// Location in words; '' when there is none (x null). Off the beam the distance is printed the same way:
// the figure's edge marker (layout.js offBeamMarker) says which side.
export function locWords(x) {
  if (x === null || x === undefined) return '';
  return `at x = ${fmtFixed(x)}${NBSP}m from A`;
}

// 'left' (left of A), 'right' (beyond C) or null (on the beam, or no location). Judged on the printed
// value, so a location that prints 0.00 or 4.00 is never called off the beam.
export function offSide(x) {
  if (x === null || x === undefined) return null;
  const shown = Number(fmtFixed(x).replace(MINUS, '-'));
  if (shown < 0) return 'left';
  return shown > BEAM_L ? 'right' : null;
}
