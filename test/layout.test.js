import test from 'node:test';
import assert from 'node:assert/strict';
import { VB, BEAM_H, TOP, COLS, topX, colX, loadShapes, forceArrow } from '../src/layout.js';
import { BEAM_L, LOADED_L, WALL_CLEAR_M, loadAt, equivalents } from '../src/physics.js';

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

test('forceArrow is null for F 0, x null, x below WALL_CLEAR_M and x above BEAM_L; drawn at WALL_CLEAR_M and at 4', () => {
  assert.equal(BEAM_L, 4);
  assert.equal(WALL_CLEAR_M, 0.12);
  assert.equal(forceArrow(0, 0, 1), null);
  assert.equal(forceArrow(1, 100, null), null);
  assert.equal(forceArrow(2, 100, -0.001), null);
  assert.equal(forceArrow(2, 100, 0), null);
  assert.equal(forceArrow(2, 100, 0.1199), null);
  assert.equal(forceArrow(2, 100, BEAM_L + 0.001), null);
  const a0 = forceArrow(0, 100, WALL_CLEAR_M);
  const a4 = forceArrow(0, 100, 4);
  assert.notEqual(a0, null);
  assert.notEqual(a4, null);
  assert.equal(a0.x, colX(0, WALL_CLEAR_M));
  assert.equal(a4.x, colX(0, 4));
});

test('the wall clearance is wider than the arrow head half-width (stroke 3.4 * 1.6 + 1) in units', () => {
  assert.ok(WALL_CLEAR_M * COLS.px > 3.4 * 1.6 + 1);
});

test('r=100, t=-150, peak B: the combined force acts at x = 0 and gets no arrow (it would sit on the wall)', () => {
  for (const s of [{ r: 100, t: -150, peak: 'B' }, { r: -100, t: 150, peak: 'B' }]) {
    const e = equivalents(s);
    assert.equal(e.comb.x + 0, 0);                  // + 0: the second state's x is -0, which is still the wall
    assert.notEqual(e.comb.F, 0);
    assert.equal(forceArrow(2, e.comb.F, e.comb.x), null);
  }
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
