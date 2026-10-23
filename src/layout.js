import { BEAM_L, LOADED_L, loadAt } from './physics.js';
import { offSide } from './format.js';

// Figure geometry, all in viewBox units with y growing downward. Pure: no DOM.
// Sign convention (+ up): a negative (down) load or force sits ABOVE the beam and its
// arrow head touches the beam's top face; a positive (up) one sits BELOW and the head
// touches the beam's bottom face.
export const VB = { w: 960, h: 548 };
export const BEAM_H = 24;
// top figure (the actual load); `band` is the room above and below the beam
export const TOP = { x0: 90, px: 150, beamY: 90, unit: 0.2, band: 80, dimY: 206, dimTextY: 228, textX: 730 };
// three columns (the equivalent forces); fs is the FIXED force scale, units per newton
// `card` is the framed, tinted card around each column: dx from COLS.x[k] to its left edge, w its width, y its top, bottom its
// lower edge (its stroke must stay inside VB.h), rx the corner radius, headH the height of the heading band that holds the three
// text lines (three, five on the Combined card, whose rows 4 and 5 give the net moment; it must end above COLS.beamY - COLS.band), stroke the frame width. textPad is the left padding of those lines.
export const COLS = {
  x: [20, 330, 640], offset: 30, px: 60, beamY: 436, fs: 0.14, band: 84, textY: [262, 282, 302, 322, 342], textPad: 8,
  card: { dx: -4, w: 300, y: 240, bottom: 546, rx: 8, headH: 110, stroke: 1.5 }
};

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

// The card of column k (0 rect, 1 tri, 2 comb): { x, y, w, h, rx, headH } in viewBox units.
export function columnCard(k) {
  const c = COLS.card;
  return { x: COLS.x[k] + c.dx, y: c.y, w: c.w, h: c.bottom - c.y, rx: c.rx, headH: c.headH };
}

// One arrow of length len pointing at the beam from the side the sign says.
export function layoutArrow(x, signed, len, beamY) {
  const yHead = signed < 0 ? beamY : beamY + BEAM_H;
  const yTail = signed < 0 ? yHead - len : yHead + len;
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
    rect = { x: x0, y: s.r < 0 ? beamTop - rh : beamBot, w: x2 - x0, h: rh };
  }

  let tri = null;
  if (s.t !== 0) {
    const up = s.t < 0;                                  // triangle above the beam (a downward load)
    const stacked = s.r !== 0 && (s.r < 0) === up;       // same side as the rectangle
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

// Equivalent force F (signed, + up) at x metres from A in column k, or null
// when there is nothing to draw (no force, no location, or a location off the beam). At x = 0
// the head partly overlaps the wall rectangle: accepted, not a defect.
export function forceArrow(k, F, x) {
  if (F === 0 || x === null || x === undefined || x < 0 || x > BEAM_L) return null;
  return layoutArrow(colX(k, x), F, COLS.fs * Math.abs(F), COLS.beamY);
}

// The off-the-beam marker: a horizontal arrow `len` long whose head sits `textPad` inside the card edge (left) or
// the same distance inside the right edge, `gap` from the beam face on the force's side, and two label lines
// `lineGap` apart beyond it (further from the beam). The numbers keep it clear of the heading band, the wall
// and the dotted outline for every off-beam slider state (test/layout.test.js checks all 614).
export const OFF = { gap: 34, len: 60, lineGap: 20, textBelow: 22, textAbove: 15 };

// Column k's force F at x metres from A, when x is off the beam: { side, lines, arrow: { y, xTail, xHead },
// text: { x, anchor, y: [y0, y1] } }; null when there is no force, no location, or the location is on the beam.
export function offBeamMarker(k, F, x) {
  const side = offSide(x);
  if (F === 0 || side === null) return null;
  const c = columnCard(k);
  const inset = COLS.x[k] + COLS.textPad - c.x;
  const xHead = side === 'left' ? c.x + inset : c.x + c.w - inset;
  const xTail = side === 'left' ? xHead + OFF.len : xHead - OFF.len;
  const down = F < 0;
  const y = down ? COLS.beamY - OFF.gap : COLS.beamY + BEAM_H + OFF.gap;
  const y1 = down ? y - OFF.textAbove : y + OFF.textBelow + OFF.lineGap;
  return {
    side,
    lines: ['off the beam', `to the ${side}`],
    arrow: { y, xTail, xHead },
    text: { x: xHead, anchor: side === 'left' ? 'start' : 'end', y: [y1 - OFF.lineGap, y1] }
  };
}

// One piece of a load outline in column k: the load runs from xa to xb metres with signed
// intensity wa at xa and wb at xb (same sign, either may be 0). The base lies on the beam face the
// load pushes from (top for − (down), bottom for + (up)); the height is the intensity at the top figure's scale.
// A zero end contributes no point, so a piece with one zero end is a triangle, never a degenerate shape.
function layoutPiece(k, xa, xb, wa, wb) {
  const base = wa + wb < 0 ? COLS.beamY : COLS.beamY + BEAM_H;
  const poly = [[colX(k, xa), base]];
  if (wa !== 0) poly.push([colX(k, xa), base + wa * TOP.unit]);
  if (wb !== 0) poly.push([colX(k, xb), base + wb * TOP.unit]);
  poly.push([colX(k, xb), base]);
  return poly;
}

// The net load w(x) = r + t f(x) on AB: its two end values, split at the zero crossing if the sign changes.
function layoutNet(s) {
  const w0 = loadAt(s, 0);
  const wL = loadAt(s, LOADED_L);
  if (w0 === 0 && wL === 0) return [];
  if (w0 * wL < 0) {
    const xc = LOADED_L * w0 / (w0 - wL);
    return [layoutPiece(2, 0, xc, w0, 0), layoutPiece(2, xc, LOADED_L, 0, wL)];
  }
  return [layoutPiece(2, 0, LOADED_L, w0, wL)];
}

// Dotted outline of the load that column k's force replaces: 0 the rectangle, 1 the triangle,
// 2 the net (combined) load. s = { r, t, peak } -> array of polygons (arrays of [x, y], closed
// implicitly), empty when that load is zero.
export function columnOutline(k, s) {
  if (k === 0) return s.r === 0 ? [] : [layoutPiece(0, 0, LOADED_L, s.r, s.r)];
  if (k === 1) {
    if (s.t === 0) return [];
    return [s.peak === 'B' ? layoutPiece(1, 0, LOADED_L, 0, s.t) : layoutPiece(1, 0, LOADED_L, s.t, 0)];
  }
  return layoutNet(s);
}
