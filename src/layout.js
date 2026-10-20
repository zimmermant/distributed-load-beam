import { BEAM_L, LOADED_L, WALL_CLEAR_M, loadAt } from './physics.js';

// Figure geometry, all in viewBox units with y growing downward. Pure: no DOM.
// Sign convention: a positive (down) load or force sits ABOVE the beam and its
// arrow head touches the beam's top face; a negative one sits BELOW and the head
// touches the beam's bottom face.
export const VB = { w: 960, h: 560 };
export const BEAM_H = 24;
// top figure (the actual load); `band` is the room above and below the beam
export const TOP = { x0: 90, px: 150, beamY: 90, unit: 0.2, band: 80, dimY: 206, dimTextY: 228, textX: 730 };
// three columns (the equivalent forces); fs is the FIXED force scale, units per newton
export const COLS = { x: [20, 330, 640], offset: 30, px: 60, beamY: 424, fs: 0.18, band: 108, textY: [262, 284, 306] };

const LAYOUT_MIN_ARROW = 8;   // net-load arrows shorter than this are not drawn
const LAYOUT_ARROWS = 8;

// metres from A -> viewBox x in the top figure
export function topX(x) {
  return TOP.x0 + x * TOP.px;
}

// column k (0 rect, 1 tri, 2 comb), metres from A -> viewBox x
export function colX(k, x) {
  return COLS.x[k] + COLS.offset + x * COLS.px;
}

// One arrow of length len pointing at the beam from the side the sign says.
function layoutArrow(x, signed, len, beamY) {
  const yHead = signed > 0 ? beamY : beamY + BEAM_H;
  const yTail = signed > 0 ? yHead - len : yHead + len;
  return { x, yTail, yHead };
}

// s = { r, t, peak } -> { rect, tri, arrows }
export function loadShapes(s) {
  const x0 = topX(0);
  const x2 = topX(LOADED_L);
  const beamTop = TOP.beamY;
  const beamBot = TOP.beamY + BEAM_H;
  const rh = Math.abs(s.r) * TOP.unit;
  const th = Math.abs(s.t) * TOP.unit;

  let rect = null;
  if (s.r !== 0) {
    rect = { x: x0, y: s.r > 0 ? beamTop - rh : beamBot, w: x2 - x0, h: rh };
  }

  let tri = null;
  if (s.t !== 0) {
    const up = s.t > 0;                                  // triangle above the beam
    const stacked = s.r !== 0 && (s.r > 0) === up;       // same side as the rectangle
    const face = up ? beamTop : beamBot;
    const base = stacked ? (up ? beamTop - rh : beamBot + rh) : face;
    const apexY = up ? base - th : base + th;
    const apexX = s.peak === 'A' ? x0 : x2;
    tri = { pts: [[x0, base], [x2, base], [apexX, apexY]] };
  }

  const arrows = [];
  for (let i = 0; i < LAYOUT_ARROWS; i++) {
    const m = (i + 0.5) * LOADED_L / LAYOUT_ARROWS;
    const w = loadAt(s, m);
    const len = Math.abs(w) * TOP.unit;
    if (len < LAYOUT_MIN_ARROW) continue;
    arrows.push(layoutArrow(topX(m), w, len, beamTop));
  }
  return { rect, tri, arrows };
}

// Equivalent force F (signed, + down) at x metres from A in column k, or null
// when there is nothing to draw (no force, no location, off the beam, or closer to the wall than
// WALL_CLEAR_M: the head would overlap the wall, so the text carries that location instead).
export function forceArrow(k, F, x) {
  if (F === 0 || x === null || x === undefined || x < WALL_CLEAR_M || x > BEAM_L) return null;
  return layoutArrow(colX(k, x), F, COLS.fs * Math.abs(F), COLS.beamY);
}
