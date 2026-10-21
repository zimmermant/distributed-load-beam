import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { VB, BEAM_H, TOP, COLS, topX, colX, loadShapes, forceArrow, columnOutline } from '../src/layout.js';
import { BEAM_L, LOADED_L, loadAt, equivalents } from '../src/physics.js';

const EPS = 1e-9;
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < EPS, `${msg || ''} ${a} vs ${b}`);
const VALUES = [-200, -100, 0, 100, 200];
const sortPts = pts => pts.map(p => p.map(v => Math.round(v * 1e6) / 1e6)).sort((p, q) => p[0] - q[0] || p[1] - q[1]);

test('topX and colX map metres to viewBox x', () => {
  assert.equal(topX(0), TOP.x0);
  assert.equal(topX(2), TOP.x0 + 2 * TOP.px);
  assert.equal(colX(0, 0), COLS.x[0] + COLS.offset);
  assert.equal(colX(2, 4), COLS.x[2] + COLS.offset + 4 * COLS.px);
});

test('forceArrow length is fs·|F| for every F in -600..600 step 10', () => {
  let n = 0;
  for (let k = 0; k < 3; k++) {
    for (let F = -600; F <= 600; F += 10) {
      if (F === 0) continue;
      const a = forceArrow(k, F, 1.5);
      assert.notEqual(a, null, `k=${k} F=${F}`);
      close(Math.abs(a.yTail - a.yHead), COLS.fs * Math.abs(F), `k=${k} F=${F}`);
      assert.equal(a.x, colX(k, 1.5));
      n++;
    }
  }
  assert.equal(n, 3 * 120);
});

test('forceArrow is null for F 0, x null/undefined, x below 0 and x above BEAM_L; drawn at 0, near the wall and at 4', () => {
  assert.equal(BEAM_L, 4);
  assert.equal(forceArrow(0, 0, 1), null);
  assert.equal(forceArrow(1, 100, null), null);
  assert.equal(forceArrow(1, 100, undefined), null);
  assert.equal(forceArrow(2, 100, -0.001), null);
  assert.equal(forceArrow(2, 100, BEAM_L + 0.001), null);
  for (const x of [0, -0, 0.05, 0.1199, 0.12, 4]) {
    const a = forceArrow(0, 100, x);
    assert.notEqual(a, null, `x=${x}`);
    assert.equal(a.x, colX(0, x), `x=${x}`);
    close(Math.abs(a.yTail - a.yHead), COLS.fs * 100, `x=${x}`);   // the same fixed scale at the wall
  }
});

test('a force at or near the wall has its head on the correct beam face', () => {
  for (const x of [0, 0.05, 0.1199]) {
    for (const k of [0, 1, 2]) {
      const down = forceArrow(k, 100, x);
      const up = forceArrow(k, -100, x);
      assert.equal(down.yHead, COLS.beamY, `down k=${k} x=${x}`);
      assert.ok(down.yTail < down.yHead);
      assert.equal(up.yHead, COLS.beamY + BEAM_H, `up k=${k} x=${x}`);
      assert.ok(up.yTail > up.yHead);
    }
  }
});

test('r=100, t=-150, peak B: the combined force acts at x = 0 and its arrow is drawn there, head on the beam top', () => {
  for (const s of [{ r: 100, t: -150, peak: 'B' }, { r: -100, t: 150, peak: 'B' }]) {
    const e = equivalents(s);
    assert.equal(e.comb.x + 0, 0);                  // + 0: the second state's x is -0, which is still the wall
    assert.notEqual(e.comb.F, 0);
    const a = forceArrow(2, e.comb.F, e.comb.x);
    assert.notEqual(a, null);
    assert.equal(a.x, colX(2, 0));
    assert.equal(a.yHead, e.comb.F > 0 ? COLS.beamY : COLS.beamY + BEAM_H);
  }
  const a = forceArrow(2, equivalents({ r: 100, t: -150, peak: 'B' }).comb.F, 0);
  assert.equal(a.yHead, COLS.beamY);                // 50 N down: head on the top face
});

test('a down force ends on the beam top and an up force on the beam bottom', () => {
  for (let k = 0; k < 3; k++) {
    const down = forceArrow(k, 100, 1);
    const up = forceArrow(k, -100, 1);
    assert.equal(down.yHead, COLS.beamY);
    assert.ok(down.yTail < down.yHead);
    assert.equal(up.yHead, COLS.beamY + BEAM_H);
    assert.ok(up.yTail > up.yHead);
  }
});

test('the largest possible force (600 N) fits inside its band: tail inside [beamY − band, beamY + BEAM_H + band]', () => {
  for (const F of [600, -600]) {
    const a = forceArrow(2, F, 1);
    assert.notEqual(a, null);
    assert.ok(a.yTail >= COLS.beamY - COLS.band - EPS, `tail ${a.yTail}`);
    assert.ok(a.yTail <= COLS.beamY + BEAM_H + COLS.band + EPS, `tail ${a.yTail}`);
  }
});

test('loadShapes: every shape and arrow stays inside the figure\'s bands for every r,t in {-200,-100,0,100,200} and both peaks', () => {
  const lo = TOP.beamY - TOP.band - EPS;
  const hi = TOP.beamY + BEAM_H + TOP.band + EPS;
  let combos = 0, shapes = 0;
  for (const peak of ['A', 'B']) for (const r of VALUES) for (const t of VALUES) {
    combos++;
    const L = loadShapes({ r, t, peak });
    if (L.rect) {
      shapes++;
      assert.ok(L.rect.y >= lo && L.rect.y + L.rect.h <= hi, `rect ${r},${t},${peak}`);
    }
    if (L.tri) {
      shapes++;
      assert.equal(L.tri.pts.length, 3);
      for (const [, y] of L.tri.pts) assert.ok(y >= lo && y <= hi, `tri ${r},${t},${peak} y=${y}`);
    }
    for (const a of L.arrows) {
      assert.ok(a.yTail >= lo && a.yTail <= hi && a.yHead >= lo && a.yHead <= hi, `arrow ${r},${t},${peak}`);
    }
  }
  assert.equal(combos, 50);
  assert.ok(shapes > 0);
});

test('loadShapes: 8 arrows, none at x=0 or x=2, none where |w|·unit < 8', () => {
  const full = loadShapes({ r: 100, t: 0, peak: 'B' });
  assert.equal(full.arrows.length, 8);
  for (let i = 0; i < 8; i++) {
    const x = (i + 0.5) * LOADED_L / 8;
    assert.equal(full.arrows[i].x, topX(x));
    assert.ok(full.arrows[i].x > topX(0) && full.arrows[i].x < topX(LOADED_L));
    close(full.arrows[i].yHead - full.arrows[i].yTail, 100 * TOP.unit);
    assert.equal(full.arrows[i].yHead, TOP.beamY);
  }
  // r = -100, t = 100 peak B: w goes -100 -> 0, so the small-|w| arrows near B are omitted
  const s = { r: -100, t: 100, peak: 'B' };
  const L = loadShapes(s);
  const expected = [];
  for (let i = 0; i < 8; i++) {
    const x = (i + 0.5) * LOADED_L / 8;
    const w = loadAt(s, x);
    if (Math.abs(w) * TOP.unit >= 8) expected.push({ x: topX(x), w });
  }
  assert.ok(expected.length > 0 && expected.length < 8, `kept ${expected.length}`);
  assert.equal(L.arrows.length, expected.length);
  L.arrows.forEach((a, i) => {
    assert.equal(a.x, expected[i].x);
    close(Math.abs(a.yTail - a.yHead), Math.abs(expected[i].w) * TOP.unit);
    assert.equal(a.yHead, expected[i].w > 0 ? TOP.beamY : TOP.beamY + BEAM_H);
  });
  // everything below the threshold: r = 0, t = 0 has no arrows at all
  assert.equal(loadShapes({ r: 0, t: 0, peak: 'A' }).arrows.length, 0);
  assert.equal(loadShapes({ r: 0, t: 0, peak: 'A' }).rect, null);
  assert.equal(loadShapes({ r: 0, t: 0, peak: 'A' }).tri, null);
});

test('loadShapes: same-sign r and t stack (triangle base = rectangle outer edge); opposite signs sit on opposite sides', () => {
  const x0 = topX(0), x2 = topX(LOADED_L);
  // both down: rect above the beam, triangle stacked on its top
  let L = loadShapes({ r: 100, t: 100, peak: 'B' });
  assert.deepEqual(L.rect, { x: x0, y: TOP.beamY - 100 * TOP.unit, w: x2 - x0, h: 100 * TOP.unit });
  const base = L.rect.y;
  assert.equal(L.tri.pts.filter(p => p[1] === base).length, 2);
  assert.deepEqual(L.tri.pts.find(p => p[1] !== base), [x2, base - 100 * TOP.unit]);
  // both up: rect below the beam, triangle stacked below it
  L = loadShapes({ r: -100, t: -200, peak: 'A' });
  assert.deepEqual(L.rect, { x: x0, y: TOP.beamY + BEAM_H, w: x2 - x0, h: 100 * TOP.unit });
  const base2 = L.rect.y + L.rect.h;
  assert.equal(L.tri.pts.filter(p => p[1] === base2).length, 2);
  assert.deepEqual(L.tri.pts.find(p => p[1] !== base2), [x0, base2 + 200 * TOP.unit]);
  // opposite: rect up (r<0, below), triangle down (t>0, above), hanging from the beam top
  L = loadShapes({ r: -100, t: 100, peak: 'B' });
  assert.equal(L.rect.y, TOP.beamY + BEAM_H);
  assert.equal(L.tri.pts.filter(p => p[1] === TOP.beamY).length, 2);
  assert.deepEqual(L.tri.pts.find(p => p[1] !== TOP.beamY), [x2, TOP.beamY - 100 * TOP.unit]);
  // opposite the other way: r>0 above, t<0 hangs from the beam bottom
  L = loadShapes({ r: 100, t: -100, peak: 'A' });
  assert.equal(L.rect.y, TOP.beamY - 100 * TOP.unit);
  const bot = TOP.beamY + BEAM_H;
  assert.equal(L.tri.pts.filter(p => p[1] === bot).length, 2);
  assert.deepEqual(L.tri.pts.find(p => p[1] !== bot), [x0, bot + 100 * TOP.unit]);
  // r = 0: triangle rests on the beam face of its own side
  L = loadShapes({ r: 0, t: 100, peak: 'B' });
  assert.equal(L.rect, null);
  assert.equal(L.tri.pts.filter(p => p[1] === TOP.beamY).length, 2);
  L = loadShapes({ r: 0, t: -100, peak: 'B' });
  assert.equal(L.tri.pts.filter(p => p[1] === bot).length, 2);
  // t = 0: no triangle
  assert.equal(loadShapes({ r: 100, t: 0, peak: 'B' }).tri, null);
});

test('peak A and peak B mirror each other in x', () => {
  const x0 = topX(0), x2 = topX(LOADED_L);
  let n = 0;
  for (const r of VALUES) for (const t of VALUES) {
    const A = loadShapes({ r, t, peak: 'A' });
    const B = loadShapes({ r, t, peak: 'B' });
    assert.deepEqual(A.rect, B.rect);
    if (t === 0) { assert.equal(A.tri, null); assert.equal(B.tri, null); continue; }
    const mirrored = A.tri.pts.map(([x, y]) => [x0 + x2 - x, y]);
    assert.deepEqual(sortPts(mirrored), sortPts(B.tri.pts), `r=${r} t=${t}`);
    // the apex is where w is largest: x0 for peak A, x2 for peak B
    const apexOf = pts => pts.find(p => pts.filter(q => q[1] === p[1]).length === 1);
    assert.equal(apexOf(A.tri.pts)[0], x0);
    assert.equal(apexOf(B.tri.pts)[0], x2);
    n++;
  }
  assert.equal(n, 20);
});

test('everything fits the viewBox: TOP.dimTextY + 4 < COLS.textY[0] − 12 and COLS.beamY + BEAM_H + COLS.band ≤ VB.h', () => {
  assert.ok(TOP.dimTextY + 4 < COLS.textY[0] - 12);
  assert.ok(COLS.beamY + BEAM_H + COLS.band <= VB.h);
  assert.ok(TOP.beamY - TOP.band >= 0);
  assert.ok(TOP.beamY + BEAM_H + TOP.band < TOP.dimY);
});

test('the column text lines clear the highest possible arrow: COLS.textY[2] + 6 ≤ COLS.beamY − COLS.band', () => {
  assert.ok(COLS.textY[2] + 6 <= COLS.beamY - COLS.band);
  assert.ok(COLS.fs * 600 <= COLS.band + EPS);
});

test('loadShapes: every arrow follows the sign of w at its own position, not of r or t alone', () => {
  const s = { r: 100, t: -200, peak: 'B' };           // w runs +100 at A to -100 at B
  const L = loadShapes(s);
  assert.ok(L.arrows.length >= 4);
  const downs = L.arrows.filter(a => a.yHead === TOP.beamY);
  const ups = L.arrows.filter(a => a.yHead === TOP.beamY + BEAM_H);
  assert.equal(downs.length + ups.length, L.arrows.length);
  assert.ok(downs.length > 0 && ups.length > 0, 'both directions appear');
  for (const a of L.arrows) {
    const w = loadAt(s, (a.x - topX(0)) / TOP.px);
    assert.equal(a.yHead, w > 0 ? TOP.beamY : TOP.beamY + BEAM_H);
    if (w > 0) assert.ok(a.yTail < a.yHead); else assert.ok(a.yTail > a.yHead);
  }
});

test('forceArrow: a missing location, null or undefined, draws nothing', () => {
  assert.equal(forceArrow(1, 100, undefined), null);
  assert.equal(forceArrow(1, 100, null), null);
});

// ---- columnOutline: the dotted outline of the load in each equivalent-force column ---------------
const TOPF = COLS.beamY;                 // the beam's top face in the columns
const BOTF = COLS.beamY + BEAM_H;        // its bottom face
const pts = (polys) => polys.map(poly => poly.map(p => p.map(v => Math.round(v * 1e6) / 1e6)));
const U = TOP.unit;

test('columnOutline rectangle (column 0): r=100 sits above the beam, r=-100 hangs below, r=0 is empty', () => {
  const x0 = colX(0, 0), x2 = colX(0, LOADED_L);
  assert.deepEqual(pts(columnOutline(0, { r: 100, t: 0, peak: 'B' })), [[[x0, TOPF], [x0, TOPF - 100 * U], [x2, TOPF - 100 * U], [x2, TOPF]]]);
  assert.deepEqual(pts(columnOutline(0, { r: -100, t: 0, peak: 'B' })), [[[x0, BOTF], [x0, BOTF + 100 * U], [x2, BOTF + 100 * U], [x2, BOTF]]]);
  assert.equal(TOPF - 100 * U, TOPF - 20);          // the brief's height of 20 units for 100 N/m
  assert.deepEqual(columnOutline(0, { r: 0, t: 150, peak: 'A' }), []);
  // the triangle never leaks into the rectangle's column
  assert.deepEqual(columnOutline(0, { r: 100, t: 150, peak: 'A' }), columnOutline(0, { r: 100, t: -50, peak: 'B' }));
});

test('columnOutline triangle (column 1): base on the face, apex at the peak end, t<0 hangs below, t=0 is empty', () => {
  const x0 = colX(1, 0), x2 = colX(1, LOADED_L);
  assert.deepEqual(pts(columnOutline(1, { r: 100, t: 100, peak: 'B' })), [[[x0, TOPF], [x2, TOPF - 20], [x2, TOPF]]]);
  assert.deepEqual(pts(columnOutline(1, { r: 100, t: 100, peak: 'A' })), [[[x0, TOPF], [x0, TOPF - 20], [x2, TOPF]]]);
  assert.deepEqual(pts(columnOutline(1, { r: 0, t: -100, peak: 'B' })), [[[x0, BOTF], [x2, BOTF + 20], [x2, BOTF]]]);
  assert.deepEqual(pts(columnOutline(1, { r: 0, t: -100, peak: 'A' })), [[[x0, BOTF], [x0, BOTF + 20], [x2, BOTF]]]);
  assert.deepEqual(columnOutline(1, { r: 100, t: 0, peak: 'B' }), []);
  assert.deepEqual(columnOutline(1, { r: -100, t: 0, peak: 'A' }), []);
  // the rectangle never leaks into the triangle's column
  assert.deepEqual(columnOutline(1, { r: 100, t: 100, peak: 'B' }), columnOutline(1, { r: -200, t: 100, peak: 'B' }));
});

test('columnOutline combined (column 2): trapezoid for the net load, two triangles at a sign change, one triangle when an end is 0', () => {
  const x0 = colX(2, 0), x2 = colX(2, LOADED_L);
  // r=100, t=100, peak B: w = 100 at A, 200 at B -> heights 20 and 40
  assert.deepEqual(pts(columnOutline(2, { r: 100, t: 100, peak: 'B' })), [[[x0, TOPF], [x0, TOPF - 20], [x2, TOPF - 40], [x2, TOPF]]]);
  // peak A mirrors it
  assert.deepEqual(pts(columnOutline(2, { r: 100, t: 100, peak: 'A' })), [[[x0, TOPF], [x0, TOPF - 40], [x2, TOPF - 20], [x2, TOPF]]]);
  // r=100, t=-200, peak B: +100 at A, -100 at B, zero at xc = 1 m
  const xc = colX(2, 1);
  const two = columnOutline(2, { r: 100, t: -200, peak: 'B' });
  assert.equal(two.length, 2);
  assert.deepEqual(pts(two), [[[x0, TOPF], [x0, TOPF - 20], [xc, TOPF]], [[xc, BOTF], [x2, BOTF + 20], [x2, BOTF]]]);
  // w(0) = 0: one triangle only (r=0, t=100, peak B), same shape as the column-1 outline of that load
  const one = columnOutline(2, { r: 0, t: 100, peak: 'B' });
  assert.equal(one.length, 1);
  assert.deepEqual(pts(one), [[[x0, TOPF], [x2, TOPF - 20], [x2, TOPF]]]);
  // w(L) = 0 (r=100, t=-100, peak B): w goes 100 -> 0, one triangle apex at A
  assert.deepEqual(pts(columnOutline(2, { r: 100, t: -100, peak: 'B' })), [[[x0, TOPF], [x0, TOPF - 20], [x2, TOPF]]]);
  // all-negative net: hangs below
  assert.deepEqual(pts(columnOutline(2, { r: -100, t: -100, peak: 'B' })), [[[x0, BOTF], [x0, BOTF + 20], [x2, BOTF + 40], [x2, BOTF]]]);
  // nothing: no load, and a net load that is identically zero
  assert.deepEqual(columnOutline(2, { r: 0, t: 0, peak: 'A' }), []);
  assert.deepEqual(columnOutline(2, { r: 0, t: 0, peak: 'B' }), []);
});

test('columnOutline crossing: the zero crossing sits at xc = L*w(0)/(w(0)-w(L)), from the end values (r=100, t=-300 crosses at 2/3 m)', () => {
  const two = columnOutline(2, { r: 100, t: -300, peak: 'B' });       // w: +100 at A, -200 at B
  assert.equal(two.length, 2);
  const xc = colX(2, LOADED_L * 100 / 300);
  close(two[0][2][0], xc, 'first piece ends at the crossing');
  close(two[1][0][0], xc, 'second piece starts at the crossing');
  close(two[0][1][1], TOPF - 100 * U);
  close(two[1][1][1], BOTF + 200 * U);
  // peak A: w(0) = r + t = -100 at A, w(L) = r = 100 at B -> crossing at L/2
  const a = columnOutline(2, { r: 100, t: -200, peak: 'A' });
  assert.equal(a.length, 2);
  close(a[0][2][0], colX(2, 1));
  assert.ok(a[0].every(p => p[1] >= BOTF - 1e-9), 'the negative piece (near A) hangs below');
  assert.ok(a[1].every(p => p[1] <= TOPF + 1e-9), 'the positive piece (near B) sits above');
});

test('columnOutline over the slider grid: inside the column band and the AB span, never degenerate, on the right face', () => {
  const eps = 1e-9, lo = COLS.beamY - COLS.band, hi = COLS.beamY + BEAM_H + COLS.band;
  let states = 0, polys = 0, expectedPolys = 0;
  for (const peak of ['A', 'B']) for (let r = -200; r <= 200; r += 5) for (let t = -200; t <= 200; t += 5) {
    const s = { r, t, peak };
    const w0 = loadAt(s, 0), wL = loadAt(s, LOADED_L);
    const want = [r !== 0 ? 1 : 0, t !== 0 ? 1 : 0, w0 * wL < 0 ? 2 : (w0 !== 0 || wL !== 0 ? 1 : 0)];
    for (let k = 0; k < 3; k++) {
      const out = columnOutline(k, s);
      assert.equal(out.length, want[k], `k=${k} ${JSON.stringify(s)}`);
      expectedPolys += want[k];
      states++;
      for (const poly of out) {
        polys++;
        assert.ok(poly.length === 3 || poly.length === 4, 'triangle or four-sided');
        let area = 0;
        poly.forEach((p, i) => {
          const q = poly[(i + 1) % poly.length];
          area += p[0] * q[1] - q[0] * p[1];
          assert.ok(p[1] >= lo - eps && p[1] <= hi + eps, `y ${p[1]} in band, k=${k} ${JSON.stringify(s)}`);
          assert.ok(p[0] >= colX(k, 0) - eps && p[0] <= colX(k, LOADED_L) + eps, `x ${p[0]} in AB span, k=${k}`);
          assert.ok(p[0] !== q[0] || p[1] !== q[1], 'no repeated point');
        });
        assert.ok(Math.abs(area) / 2 > 1e-6, `non-zero area, k=${k} ${JSON.stringify(s)}`);
        const above = poly.every(p => p[1] <= TOPF + eps);
        const below = poly.every(p => p[1] >= BOTF - eps);
        assert.ok(above !== below, `entirely above the top face or below the bottom face, k=${k} ${JSON.stringify(s)}`);
      }
      if (k === 0 && out.length) assert.equal(out[0].every(p => p[1] <= TOPF + eps), r > 0);
      if (k === 1 && out.length) assert.equal(out[0].every(p => p[1] <= TOPF + eps), t > 0);
      if (k === 2 && out.length === 1) assert.equal(out[0].every(p => p[1] <= TOPF + eps), w0 + wL > 0);
      if (k === 2 && out.length === 2) {
        assert.equal(out[0].every(p => p[1] <= TOPF + eps), w0 > 0);
        assert.equal(out[1].every(p => p[1] <= TOPF + eps), wL > 0);
      }
    }
  }
  assert.equal(states, 2 * 81 * 81 * 3);
  assert.equal(expectedPolys, polys);
  assert.ok(polys > 20000, `a non-vacuous count of polygons (${polys})`);
});

test('the browser harness hard-codes the same column geometry as layout.js (check 7 would drift silently otherwise)', () => {
  const src = readFileSync(new URL('../tools/browser-harness.js', import.meta.url), 'utf8');
  const line = src.match(/const COLS_X = (\[[^\]]*\]), COLS_OFFSET = (\d+), COLS_PX = (\d+), COLS_BEAM_Y = (\d+), COLS_BAND = (\d+), BEAM_H = (\d+), LOADED_L = (\d+);/);
  assert.ok(line, 'the constants line is present');
  assert.deepEqual(JSON.parse(line[1]), COLS.x);
  assert.deepEqual(line.slice(2).map(Number), [COLS.offset, COLS.px, COLS.beamY, COLS.band, BEAM_H, LOADED_L]);
});
