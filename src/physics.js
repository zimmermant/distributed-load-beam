export const BEAM_L = 4;            // m, the whole beam (A at the wall, B at the middle, C at the tip)
export const LOADED_L = 2;          // m, the loaded half AB
export const W_MAX = 200;           // N/m, slider range is -W_MAX..+W_MAX
export const W_STEP = 5;            // N/m
export const W_SNAP = 10;           // N/m, |w| <= W_SNAP snaps to 0
export const WALL_CLEAR_M = 0.12;   // m, a force arrow closer to the wall than this is not drawn (its head would overlap the wall)

// Slider value -> allowed value: clamp, round to W_STEP, snap the zero zone to 0.
// Non-finite input becomes 0, and the result is never -0.
export function snapW(v) {
  if (!Number.isFinite(v)) return 0;
  const clamped = Math.max(-W_MAX, Math.min(W_MAX, v));
  const stepped = Math.round(clamped / W_STEP) * W_STEP;
  return Math.abs(stepped) <= W_SNAP ? 0 : stepped + 0;
}

// Slider input handler. A pointer drag just snaps. A keyboard nudge that would
// land back in the zero zone while the slider already sits at 0 would never be
// able to leave 0 (one step is smaller than the zone), so it jumps straight
// past the zone to +-(W_SNAP + W_STEP) in the direction of the nudge.
export function nextW(prev, raw, viaKeyboard) {
  const snapped = snapW(raw);
  if (viaKeyboard && prev === 0 && snapped === 0 && raw !== 0 && Number.isFinite(raw)) {
    return raw > 0 ? W_SNAP + W_STEP : -(W_SNAP + W_STEP);
  }
  return snapped;
}

// Load intensity w(x) in N/m at x metres from A, 0 <= x <= LOADED_L.
// s = { r, t, peak }; the triangle is t at its peak end and 0 at the other.
export function loadAt(s, x) {
  const frac = s.peak === 'B' ? x / LOADED_L : 1 - x / LOADED_L;
  return s.r + s.t * frac;
}

// Equivalent forces: signed F (+ down) and x in m from A (null when F is 0).
// The combined location comes from summing moments about A. The triangle's
// moment is written as t*L*L/3 (peak B) or t*L*L/6 (peak A), which equals
// F_tri * x_tri but keeps round numbers exact (e.g. -12 rather than -11.999...).
export function equivalents(s) {
  const L = LOADED_L;
  const rectF = s.r * L + 0;
  const triF = 0.5 * s.t * L + 0;
  const triX = s.peak === 'B' ? 2 * L / 3 : L / 3;
  const rectM = rectF * (L / 2);
  const triM = s.peak === 'B' ? s.t * L * L / 3 : s.t * L * L / 6;
  const combF = rectF + triF + 0;
  const rect = { F: rectF, x: rectF === 0 ? null : L / 2 };
  const tri = { F: triF, x: triF === 0 ? null : triX };
  const comb = { F: combF, x: combF === 0 ? null : (rectM + triM) / combF };
  const couple = combF === 0 && (rectF !== 0 || triF !== 0);
  return { rect, tri, comb, couple };
}
