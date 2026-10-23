import { BEAM_H, layoutArrow } from './layout.js';
import { LOADED_L, loadAt } from './physics.js';
import { fmt, NBSP } from './format.js';

// Geometry of the detail page's figure (the net load on AB), all in viewBox units with y growing downward.
// Pure: no DOM. Sign convention as the main page: a negative (down) load sits ABOVE the beam, a positive (up) one BELOW.
// `band` is the room above and below the beam; labelClear is how close to the beam's middle a label may come;
// labelADx / labelBDx are the label text's distances left of the wall (a) and right of B (b).
export const DETAIL = {
  vb: { w: 960, h: 356 }, x0: 250, px: 130, beamY: 150, unit: 0.3, band: 120,
  labelClear: 40, labelADx: 44, labelBDx: 34, leaderGap: 4, dimY: 318, captionY: 346, arrows: 8, minArrow: 8
};

// metres from A -> viewBox x
export function detailX(m) {
  return DETAIL.x0 + m * DETAIL.px;
}

// The load's signed heights at A and at B, w_A and w_B in N/m. `+ 0` turns a -0 into 0.
export function detailHeights(s) {
  return { wA: loadAt(s, 0) + 0, wB: loadAt(s, LOADED_L) + 0 };
}

// y of the outer edge of a load of height w: above the top face for w < 0 (down), below the bottom face for w > 0 (up).
// w = 0 sits on the top face.
export function detailEdgeY(w) {
  if (w < 0) return DETAIL.beamY + w * DETAIL.unit;
  if (w > 0) return DETAIL.beamY + BEAM_H + w * DETAIL.unit;
  return DETAIL.beamY;
}

// The net load as polygons ([x, y] corners): one for same-sign heights (a zero end gives a triangle on the face
// the load sits on), two triangles split at the zero crossing for opposite signs, none when both are zero.
export function detailOutline(s) {
  const { wA, wB } = detailHeights(s);
  if (wA === 0 && wB === 0) return [];
  const xA = detailX(0);
  const xB = detailX(LOADED_L);
  const top = DETAIL.beamY;
  const bot = DETAIL.beamY + BEAM_H;
  if (wA * wB < 0) {
    const xc = xA + (xB - xA) * wA / (wA - wB);
    const faceA = wA < 0 ? top : bot;
    const faceB = wB < 0 ? top : bot;
    const first = [[xA, faceA], [xA, detailEdgeY(wA)], [xc, faceA]];
    const second = [[xc, faceB], [xB, detailEdgeY(wB)], [xB, faceB]];
    return [first, second];
  }
  const face = wA + wB < 0 ? top : bot;
  const edge = w => (w === 0 ? face : detailEdgeY(w));
  const poly = [];
  for (const p of [[xA, face], [xA, edge(wA)], [xB, edge(wB)], [xB, face]]) {
    const last = poly[poly.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) poly.push(p);
  }
  return [poly];
}

// The net-intensity arrows, as on the main page's top figure: one at the middle of each eighth of AB,
// length |w| times the scale, left out when shorter than minArrow.
export function detailArrows(s) {
  const out = [];
  for (let i = 0; i < DETAIL.arrows; i++) {
    const m = (i + 0.5) * LOADED_L / DETAIL.arrows;
    const w = loadAt(s, m);
    const len = Math.abs(w) * DETAIL.unit;
    if (len < DETAIL.minArrow) continue;
    out.push(layoutArrow(detailX(m), w, len, DETAIL.beamY));
  }
  return out;
}

// The label's y: the edge y, unless the edge is within labelClear of the beam's middle, then labelClear above
// the middle (edge at or above it) or below it (edge below). Never decreases as the height decreases.
function detailLabelY(edgeY) {
  const mid = DETAIL.beamY + BEAM_H / 2;
  if (Math.abs(edgeY - mid) >= DETAIL.labelClear) return edgeY;
  return edgeY <= mid ? mid - DETAIL.labelClear : mid + DETAIL.labelClear;
}

// The two height labels with their dotted leaders: a to the left of the wall (text right-aligned),
// b to the right of B (text left-aligned). `edge` is the outline corner the leader ends at: always a vertex of
// detailOutline(s) (or on the top face when both heights are 0 and nothing is drawn).
export function detailLabels(s) {
  const { wA, wB } = detailHeights(s);
  const xA = detailX(0);
  const xB = detailX(LOADED_L);
  // a zero height's corner is on the face the outline uses (bottom when the load is below the beam, else top)
  const zeroY = wA + wB > 0 ? DETAIL.beamY + BEAM_H : DETAIL.beamY;
  const eA = wA === 0 ? zeroY : detailEdgeY(wA);
  const eB = wB === 0 ? zeroY : detailEdgeY(wB);
  const yA = detailLabelY(eA);
  const yB = detailLabelY(eB);
  const ax = xA - DETAIL.labelADx;
  const bx = xB + DETAIL.labelBDx;
  return {
    a: {
      name: 'w', sub: 'A', value: `${fmt(wA)}${NBSP}N/m`, x: ax, y: yA, anchor: 'end',
      edge: { x: xA, y: eA }, leader: { x1: ax + 4, y1: yA, x2: xA, y2: eA }
    },
    b: {
      name: 'w', sub: 'B', value: `${fmt(wB)}${NBSP}N/m`, x: bx, y: yB, anchor: 'start',
      edge: { x: xB, y: eB }, leader: { x1: xB + DETAIL.leaderGap, y1: eB, x2: bx - 4, y2: yB }
    }
  };
}
