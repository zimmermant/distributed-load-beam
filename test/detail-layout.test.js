import test from 'node:test';
import assert from 'node:assert/strict';
import * as detailLayoutModule from '../src/detail-layout.js';
import { DETAIL, detailX, detailHeights, detailEdgeY, detailOutline, detailArrows, detailLabels } from '../src/detail-layout.js';
import { BEAM_H, layoutArrow } from '../src/layout.js';
import { BEAM_L, LOADED_L, loadAt } from '../src/physics.js';
import { fmt, NBSP } from '../src/format.js';

const EPS = 1e-9;
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < EPS, `${msg || ''} ${a} vs ${b}`);
const MID = DETAIL.beamY + BEAM_H / 2;
const XB = DETAIL.x0 + LOADED_L * DETAIL.px;
const DEFAULT = { r: -100, t: -100, peak: 'B' };   // both loads 100 N/m down (+ up)

// the slider grid used by the property tests: r, t from -200 to 200 step 5, both peaks
const GRID = [];
for (let r = -200; r <= 200; r += 5) {
  for (let t = -200; t <= 200; t += 5) {
    for (const peak of ['A', 'B']) GRID.push({ r, t, peak });
  }
}

const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
// approximate label box: 12 units per character of 'w_A = <value>', 24 high, centred on the label y
function boxOf(lab, letter) {
  const chars = `w_${letter} = ${lab.value}`.length;
  const wd = 12 * chars;
  const x0 = lab.anchor === 'end' ? lab.x - wd : lab.x;
  return { x0, x1: x0 + wd, y0: lab.y - 12, y1: lab.y + 12 };
}

test('the placeholder export is gone and the constants are the brief\'s', () => {
  assert.equal('DETAIL_LAYOUT_READY' in detailLayoutModule, false);
  assert.deepEqual(DETAIL, {
    vb: { w: 960, h: 356 }, x0: 250, px: 130, beamY: 150, unit: 0.3, band: 120,
    labelClear: 40, labelADx: 44, labelBDx: 34, leaderGap: 4, dimY: 318, captionY: 346, arrows: 8, minArrow: 8
  });
  assert.equal(MID, 162);
});

test('detailX maps metres from A to viewBox x', () => {
  assert.equal(detailX(0), 250);
  assert.equal(detailX(2), 510);
  assert.equal(detailX(BEAM_L), 250 + 4 * 130);
});

test('detailHeights is loadAt at A and at B, and never -0', () => {
  assert.deepEqual(detailHeights(DEFAULT), { wA: -100, wB: -200 });
  assert.deepEqual(detailHeights({ r: 100, t: 100, peak: 'A' }), { wA: 200, wB: 100 });
  assert.deepEqual(detailHeights({ r: 50, t: 0, peak: 'A' }), { wA: 50, wB: 50 });
  let n = 0;
  for (const s of GRID) {
    const h = detailHeights(s);
    assert.equal(h.wA, loadAt(s, 0) + 0);
    assert.equal(h.wB, loadAt(s, LOADED_L) + 0);
    assert.equal(Object.is(h.wA, -0), false, JSON.stringify(s));
    assert.equal(Object.is(h.wB, -0), false, JSON.stringify(s));
    n++;
  }
  assert.equal(n, 81 * 81 * 2);
  assert.equal(Object.is(detailHeights({ r: -0, t: -0, peak: 'B' }).wA, -0), false);
  assert.equal(Object.is(detailHeights({ r: 0, t: -100, peak: 'B' }).wA, -0), false);
  // the same at B: with the peak at A the triangle is 0 at B, and a negative t times 0 is a -0 that r = -0 would keep
  assert.equal(Object.is(detailHeights({ r: -0, t: -100, peak: 'A' }).wB, -0), false);
  assert.equal(Object.is(detailHeights({ r: -0, t: -100, peak: 'B' }).wA, -0), false);
});

test('detailEdgeY: up for a negative (downward) height, below the beam for a positive (upward) one, top face at 0', () => {
  close(detailEdgeY(-100), 120);
  close(detailEdgeY(-200), 90);
  close(detailEdgeY(100), 204);
  close(detailEdgeY(200), 234);
  assert.equal(detailEdgeY(0), DETAIL.beamY);
  assert.equal(detailEdgeY(-0), DETAIL.beamY);
});

test('default state: heights −100 and −200, edges 120 and 90, labels on the edges, anchored left and right', () => {
  assert.deepEqual(detailHeights(DEFAULT), { wA: -100, wB: -200 });
  const { a, b } = detailLabels(DEFAULT);
  close(a.edge.y, 120); close(b.edge.y, 90);
  close(a.y, 120); close(b.y, 90);
  assert.equal(a.x, 206);
  assert.equal(b.x, 510 + 34);
  assert.equal(a.anchor, 'end');
  assert.equal(b.anchor, 'start');
  assert.equal(a.name, 'w'); assert.equal(a.sub, 'A');
  assert.equal(b.name, 'w'); assert.equal(b.sub, 'B');
  assert.equal(a.value, `−100${NBSP}N/m`);
  assert.equal(b.value, `−200${NBSP}N/m`);
  assert.deepEqual(a.edge, { x: 250, y: a.edge.y });
  assert.equal(b.edge.x, 510);
  // leaders: a runs from just right of its text to the corner; b from the corner to just left of its text
  assert.equal(a.leader.x1, 206 + 4); close(a.leader.y1, 120);
  assert.equal(a.leader.x2, 250); close(a.leader.y2, 120);
  assert.equal(b.leader.x1, 510 + DETAIL.leaderGap); close(b.leader.y1, 90);
  assert.equal(b.leader.x2, b.x - 4); close(b.leader.y2, 90);
});

test('a label whose edge is near the beam is held at mid -/+ labelClear; its leader then slopes', () => {
  // r = -50, peak A, t = 0: both heights -50 (down), edge y 135, |135 - 162| < 40 -> label at 122
  const { a, b } = detailLabels({ r: -50, t: 0, peak: 'A' });
  close(a.edge.y, 135); close(a.y, 122);
  close(b.edge.y, 135); close(b.y, 122);
  close(a.leader.y1, 122); close(a.leader.y2, 135);
  close(b.leader.y1, 135); close(b.leader.y2, 122);
  // a small positive (upward) height: edge below mid, so the label goes below
  const dn = detailLabels({ r: 5, t: 0, peak: 'A' });
  assert.ok(dn.a.edge.y > MID);
  close(dn.a.y, MID + DETAIL.labelClear);
  // r = 100 (up): edge y 204, |204 - 162| = 42 >= 40 -> follows the edge
  const neg = detailLabels({ r: 100, t: 0, peak: 'A' });
  close(neg.a.edge.y, 204); close(neg.a.y, 204);
  close(neg.b.y, 204);
  assert.equal(neg.a.value, `100${NBSP}N/m`);
});

test('r = t = 0: no outline, no arrows, labels at height 0 clamped above the beam', () => {
  const s = { r: 0, t: 0, peak: 'B' };
  assert.deepEqual(detailOutline(s), []);
  assert.deepEqual(detailArrows(s), []);
  const { a, b } = detailLabels(s);
  assert.equal(a.value, `0${NBSP}N/m`);
  assert.equal(b.value, `0${NBSP}N/m`);
  close(a.edge.y, DETAIL.beamY); close(a.y, MID - DETAIL.labelClear);
  close(b.edge.y, DETAIL.beamY); close(b.y, MID - DETAIL.labelClear);
});

test('a zero height anchors its label on the face the outline uses', () => {
  // wA = 0, wB = 100 (up): the outline triangle sits on the bottom face, so the corner is at 174 and the label below the middle
  const dn = detailLabels({ r: 0, t: 100, peak: 'B' });
  close(dn.a.edge.y, DETAIL.beamY + BEAM_H); close(dn.a.edge.y, 174);
  close(dn.a.y, MID + DETAIL.labelClear); close(dn.a.y, 202);
  close(dn.b.edge.y, 204);
  close(dn.a.leader.y2, 174);
  // wB = 0, wA = -100 (down): top face, label above the middle
  const up = detailLabels({ r: 0, t: -100, peak: 'A' });
  close(up.b.edge.y, DETAIL.beamY); close(up.b.edge.y, 150);
  close(up.b.y, MID - DETAIL.labelClear); close(up.b.y, 122);
  close(up.a.edge.y, 120);
  // wA = 0, wB = -100 (top) and wB = 0, wA = 100 (bottom)
  close(detailLabels({ r: 0, t: -100, peak: 'B' }).a.edge.y, 150);
  close(detailLabels({ r: 0, t: 100, peak: 'A' }).b.edge.y, 174);
  // both zero: both on the top face, both labels above
  const z = detailLabels({ r: 0, t: 0, peak: 'A' });
  close(z.a.edge.y, 150); close(z.b.edge.y, 150);
  close(z.a.y, 122); close(z.b.y, 122);
  // detailEdgeY itself is the function of one height and stays on the top face at 0
  assert.equal(detailEdgeY(0), DETAIL.beamY);
});

test('opposite signs: two triangles that meet at the zero crossing, one above and one below the beam', () => {
  const s = { r: -100, t: 200, peak: 'B' };   // wA = -100 (down), wB = 100 (up)
  assert.deepEqual(detailHeights(s), { wA: -100, wB: 100 });
  const polys = detailOutline(s);
  assert.equal(polys.length, 2);
  const [pos, neg] = polys;
  const xc = 250 + 260 * 100 / 200;
  assert.equal(xc, 380);
  assert.equal(pos.length, 3);
  assert.equal(neg.length, 3);
  // downward triangle: wall edge up to the edge height, back down to the crossing, all on or above the top face
  assert.deepEqual(pos.map(p => p[0]), [250, 250, xc]);
  close(pos[0][1], DETAIL.beamY); close(pos[1][1], 120); close(pos[2][1], DETAIL.beamY);
  assert.ok(pos.every(p => p[1] <= DETAIL.beamY));
  // upward triangle: from the crossing on the bottom face out to B
  const bot = DETAIL.beamY + BEAM_H;
  assert.deepEqual(neg.map(p => p[0]), [xc, XB, XB]);
  close(neg[0][1], bot); close(neg[1][1], bot + 30); close(neg[2][1], bot);
  assert.ok(neg.every(p => p[1] >= bot));
  // mirrored signs: up at A, down at B
  const m = detailOutline({ r: 100, t: -200, peak: 'B' });   // wA = 100, wB = -100
  assert.equal(m.length, 2);
  assert.ok(m[0].every(p => p[1] >= bot));
  assert.ok(m[1].every(p => p[1] <= DETAIL.beamY));
  close(m[0][1][1], bot + 30);
  close(m[1][1][1], 120);
});

test('opposite signs with unequal heights: the split is where the load crosses zero (w_A / (w_A - w_B) of the way), not at the middle', () => {
  const s = { r: -100, t: 150, peak: 'B' };   // wA = -100, wB = 50: zero two thirds of the way along AB
  assert.deepEqual(detailHeights(s), { wA: -100, wB: 50 });
  const [pos, neg] = detailOutline(s);
  const xc = 250 + 260 * 2 / 3;
  close(pos[2][0], xc, 'positive triangle ends at the crossing');
  close(neg[0][0], xc, 'negative triangle starts at the crossing');
  assert.notEqual(Math.round(xc), 380, 'not the middle of AB');
  // and the mirror: up at A, so the crossing is one third of the way along
  const [neg2, pos2] = detailOutline({ r: 100, t: -150, peak: 'B' });   // wA = 100, wB = -50
  close(neg2[2][0], 250 + 260 * 2 / 3);
  close(pos2[0][0], 250 + 260 * 2 / 3);
});

test('same signs: a trapezoid on the top face for a downward (negative) load, on the bottom face for an upward one', () => {
  const top = detailOutline(DEFAULT);
  assert.equal(top.length, 1);
  assert.equal(top[0].length, 4);
  assert.deepEqual(top[0].map(p => p[0]), [250, 250, 510, 510]);
  close(top[0][0][1], DETAIL.beamY); close(top[0][1][1], 120); close(top[0][2][1], 90); close(top[0][3][1], DETAIL.beamY);
  const bot = DETAIL.beamY + BEAM_H;
  const down = detailOutline({ r: 100, t: 100, peak: 'B' });   // wA = 100, wB = 200 (up): hangs below
  assert.equal(down.length, 1);
  assert.equal(down[0].length, 4);
  close(down[0][0][1], bot); close(down[0][1][1], bot + 30); close(down[0][2][1], bot + 60); close(down[0][3][1], bot);
});

test('a zero end gives a triangle on the face the load sits on, with no repeated point', () => {
  const bot = DETAIL.beamY + BEAM_H;
  const a0 = detailOutline({ r: 0, t: -100, peak: 'B' });   // wA = 0, wB = -100 (down)
  assert.equal(a0.length, 1);
  assert.equal(a0[0].length, 3);
  assert.deepEqual(a0[0].map(p => p[0]), [250, 510, 510]);
  close(a0[0][0][1], DETAIL.beamY); close(a0[0][1][1], 120); close(a0[0][2][1], DETAIL.beamY);
  const b0 = detailOutline({ r: 0, t: 100, peak: 'A' });  // wA = 100 (up), wB = 0
  assert.equal(b0[0].length, 3);
  assert.deepEqual(b0[0].map(p => p[0]), [250, 250, 510]);
  close(b0[0][0][1], bot); close(b0[0][1][1], bot + 30); close(b0[0][2][1], bot);
  // wA = 0, wB > 0 (up): the triangle must sit on the bottom face, not the top
  const c0 = detailOutline({ r: 0, t: 100, peak: 'B' });
  assert.equal(c0[0].length, 3);
  assert.ok(c0[0].every(p => p[1] >= bot));
});

test('peak A mirrors peak B for the outline when r = 0', () => {
  for (const t of [-200, -100, -50, 50, 100, 200]) {
    const pa = detailOutline({ r: 0, t, peak: 'A' });
    const pb = detailOutline({ r: 0, t, peak: 'B' });
    assert.equal(pa.length, 1);
    assert.equal(pb.length, 1);
    const mirror = pb[0].map(([x, y]) => [2 * DETAIL.x0 + (XB - DETAIL.x0) - x, y]);
    const key = p => `${p[0]},${p[1]}`;
    assert.deepEqual(pa[0].map(key).sort(), mirror.map(key).sort(), `t=${t}`);
  }
});

test('arrows: the default state gives the 8-arrow rule (count, positions, lengths)', () => {
  const arrows = detailArrows(DEFAULT);
  assert.equal(arrows.length, 8);
  arrows.forEach((ar, i) => {
    const m = (i + 0.5) * LOADED_L / 8;
    const w = loadAt(DEFAULT, m);
    assert.equal(ar.x, detailX(m));
    close(ar.yHead, DETAIL.beamY);
    close(ar.yHead - ar.yTail, -w * DETAIL.unit, `arrow ${i}`);
  });
  // an upward load: heads on the bottom face, tails below
  const neg = detailArrows({ r: 100, t: 0, peak: 'A' });
  assert.equal(neg.length, 8);
  for (const ar of neg) {
    close(ar.yHead, DETAIL.beamY + BEAM_H);
    close(ar.yTail - ar.yHead, 30);
  }
  // the arrow rule is layoutArrow's
  assert.deepEqual(arrows[0], layoutArrow(detailX(0.125), loadAt(DEFAULT, 0.125), -loadAt(DEFAULT, 0.125) * DETAIL.unit, DETAIL.beamY));
});

test('arrows shorter than minArrow are left out; a sign change leaves out the middle ones', () => {
  // r = -20, t = 0: length 6 < 8 -> none
  assert.deepEqual(detailArrows({ r: -20, t: 0, peak: 'A' }), []);
  // r = -30: length 9 >= 8 -> all 8
  assert.equal(detailArrows({ r: -30, t: 0, peak: 'A' }).length, 8);
  // wA = 200, wB = -200 (peak A, r = 0, t = 200 gives 200 -> 0; use r = 200, t = -400 not allowed; use r=-200,t=400): not on slider,
  // so use wA = -100, wB = 100 through r = -100, t = 200 peak B: w at midpoints is +-87.5, +-62.5, +-37.5, +-12.5 (lengths 26.25, 18.75, 11.25, 3.75)
  const arrows = detailArrows({ r: -100, t: 200, peak: 'B' });
  assert.equal(arrows.length, 6);          // the two arrows next to the crossing are under 8 units
  assert.ok(arrows.slice(0, 3).every(a => a.yTail < a.yHead));
  assert.ok(arrows.slice(3).every(a => a.yTail > a.yHead));
});

test('arrows: one per eighth of AB, as long as |w| times the scale, left out when shorter than minArrow (a sample of the grid)', () => {
  let n = 0, drawn = 0;
  for (const s of GRID.filter((_, i) => i % 97 === 0)) {
    const det = detailArrows(s);
    const wanted = [];
    for (let i = 0; i < DETAIL.arrows; i++) {
      const m = (i + 0.5) * LOADED_L / DETAIL.arrows;
      const len = Math.abs(loadAt(s, m)) * DETAIL.unit;
      if (len >= DETAIL.minArrow) wanted.push({ x: detailX(m), len });
    }
    assert.equal(det.length, wanted.length, JSON.stringify(s));
    det.forEach((a, k) => {
      assert.equal(a.x, wanted[k].x, JSON.stringify(s));
      close(Math.abs(a.yTail - a.yHead), wanted[k].len, JSON.stringify(s));
      assert.ok(Math.abs(a.yTail - a.yHead) >= DETAIL.minArrow - EPS);
    });
    assert.ok(det.length <= DETAIL.arrows);
    drawn += det.length;
    n++;
  }
  assert.ok(n > 100 && drawn > 400, `${n} states, ${drawn} arrows`);
});

test('grid: every outline and arrow point is inside the figure', () => {
  let n = 0;
  let points = 0;
  for (const s of GRID) {
    const pts = [];
    for (const poly of detailOutline(s)) pts.push(...poly);
    for (const ar of detailArrows(s)) pts.push([ar.x, ar.yTail], [ar.x, ar.yHead]);
    for (const [x, y] of pts) {
      assert.ok(x >= 0 && x <= DETAIL.vb.w && y >= 0 && y <= DETAIL.vb.h, `${JSON.stringify(s)} point ${x},${y}`);
      points++;
    }
    n++;
  }
  assert.equal(n, 81 * 81 * 2);
  assert.ok(points > 50000);
});

test('grid: label y stays 20 units inside the figure and above the dimension line, and equals the edge when clear of the beam', () => {
  let n = 0;
  let clear = 0;
  let clamped = 0;
  for (const s of GRID) {
    const { a, b } = detailLabels(s);
    for (const lab of [a, b]) {
      assert.ok(lab.y >= 20 && lab.y <= DETAIL.dimY - 20, `${JSON.stringify(s)} y=${lab.y}`);
      if (Math.abs(lab.edge.y - MID) >= DETAIL.labelClear) {
        assert.equal(lab.y, lab.edge.y, JSON.stringify(s));
        clear++;
      } else {
        close(Math.abs(lab.y - MID), DETAIL.labelClear);
        clamped++;
      }
      n++;
    }
  }
  assert.equal(n, 81 * 81 * 2 * 2);
  assert.ok(clear > 0 && clamped > 0);
  assert.equal(clear + clamped, n);
});

test('monotonic: sorted by downward load (−w), the label y never increases as the downward load increases (A, then B)', () => {
  for (const [key, which] of [['wA', 'a'], ['wB', 'b']]) {
    const rows = GRID.map(s => ({ w: detailHeights(s)[key], y: detailLabels(s)[which].y }));
    assert.equal(rows.length, 81 * 81 * 2);
    rows.sort((p, q) => q.w - p.w);
    // heights tie (a zero height's label depends on the other end), so compare group by group:
    // every label in a higher group is at or above (y at most) every label in the lower group
    const groups = [];
    for (const r of rows) {
      const g = groups[groups.length - 1];
      if (g && g.w === r.w) { g.min = Math.min(g.min, r.y); g.max = Math.max(g.max, r.y); }
      else groups.push({ w: r.w, min: r.y, max: r.y });
    }
    let steps = 0;
    for (let i = 1; i < groups.length; i++) {
      assert.ok(groups[i].max <= groups[i - 1].min + EPS, `${key}: w ${groups[i - 1].w} -> ${groups[i].w} gave y ${groups[i - 1].min} -> ${groups[i].max}`);
      steps++;
    }
    assert.equal(steps, groups.length - 1);
    assert.ok(groups.length > 80);
    // and the label actually moves: it takes more than the two clamp values and the extremes differ
    assert.ok(new Set(rows.map(r => r.y)).size > 20);
    assert.ok(rows[0].y > rows[rows.length - 1].y);
  }
});

// Guards the labels' x placement and the figure's bounds (the boxes are approximate); the y clamp is the |y - mid| grid test above.
test('grid: label boxes never meet the beam, the wall, its hatching or each other, and stay in the figure', () => {
  const beam = { x0: DETAIL.x0, x1: DETAIL.x0 + BEAM_L * DETAIL.px, y0: DETAIL.beamY, y1: DETAIL.beamY + BEAM_H };
  const wall = { x0: DETAIL.x0 - 14, x1: DETAIL.x0, y0: DETAIL.beamY - 18, y1: DETAIL.beamY + BEAM_H + 18 };
  const hatch = { x0: DETAIL.x0 - 28, x1: DETAIL.x0, y0: wall.y0, y1: wall.y1 };
  let n = 0;
  for (const s of GRID) {
    const { a, b } = detailLabels(s);
    const ba = boxOf(a, 'A');
    const bb = boxOf(b, 'B');
    for (const [name, box] of [['a', ba], ['b', bb]]) {
      for (const [what, obj] of [['beam', beam], ['wall', wall], ['hatching', hatch]]) {
        assert.equal(overlap(box, obj), false, `${JSON.stringify(s)}: ${name} box meets ${what}`);
      }
      assert.ok(box.x0 >= 0 && box.x1 <= DETAIL.vb.w && box.y0 >= 0 && box.y1 <= DETAIL.vb.h, `${JSON.stringify(s)} ${name} box outside`);
    }
    assert.equal(overlap(ba, bb), false, `${JSON.stringify(s)}: a and b boxes meet`);
    n++;
  }
  assert.equal(n, 81 * 81 * 2);
});

test('grid: each label\'s edge point is a vertex of the drawn outline (the dot is always on it)', () => {
  let n = 0;
  let onOutline = 0;
  for (const s of GRID) {
    const { a, b } = detailLabels(s);
    const polys = detailOutline(s);
    for (const lab of [a, b]) {
      if (polys.length === 0) {
        // both heights zero: nothing is drawn; the corner sits on the top face
        assert.equal(lab.edge.y, DETAIL.beamY);
      } else {
        const hit = polys.some(poly => poly.some(([x, y]) => Math.abs(x - lab.edge.x) < EPS && Math.abs(y - lab.edge.y) < EPS));
        assert.ok(hit, `${JSON.stringify(s)}: edge ${lab.edge.x},${lab.edge.y} is not on the outline`);
        onOutline++;
      }
      n++;
    }
  }
  assert.equal(n, 81 * 81 * 2 * 2);
  assert.ok(onOutline > n - 100);
});
