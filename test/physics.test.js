import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BEAM_L, LOADED_L, W_MAX, W_STEP, W_SNAP,
  snapW, nextW, loadAt, equivalents
} from '../src/physics.js';

const near = (a, b) => Math.abs(a - b) < 1e-12;

test('constants', () => {
  assert.equal(BEAM_L, 4);
  assert.equal(LOADED_L, 2);
  assert.equal(W_MAX, 200);
  assert.equal(W_STEP, 5);
  assert.equal(W_SNAP, 10);
});

test('equivalents: r=100, t=100, peak B', () => {
  const e = equivalents({ r: 100, t: 100, peak: 'B' });
  assert.deepEqual(e.rect, { F: 200, x: 1 });
  assert.equal(e.tri.F, 100); assert.ok(Math.abs(e.tri.x - 4 / 3) < 1e-12);
  assert.equal(e.comb.F, 300); assert.ok(Math.abs(e.comb.x - 10 / 9) < 1e-12);
  assert.equal(e.couple, false);
});

test('equivalents: peak A moves the triangle to L/3', () => {
  const e = equivalents({ r: 100, t: 100, peak: 'A' });
  assert.ok(near(e.tri.x, 2 / 3));
  assert.equal(e.tri.F, 100);
  assert.equal(e.comb.F, 300);
  assert.ok(near(e.comb.x, 8 / 9));
  assert.equal(e.couple, false);
});

test('equivalents: r=100, t=-190, B puts a tiny force far to the left', () => {
  const e = equivalents({ r: 100, t: -190, peak: 'B' });
  assert.equal(e.comb.F, 10);
  assert.ok(near(e.comb.x, -16 / 3));
  assert.equal(e.couple, false);
});

test('equivalents: r=100, t=-195, B gives 5 N at x = -12', () => {
  const e = equivalents({ r: 100, t: -195, peak: 'B' });
  assert.equal(e.comb.F, 5);
  assert.equal(e.comb.x, -12);
});

test('equivalents: r=100, t=-200 cancels: comb.x null, couple true', () => {
  const e = equivalents({ r: 100, t: -200, peak: 'B' });
  assert.equal(e.rect.F, 200);
  assert.equal(e.tri.F, -200);
  assert.ok(Object.is(e.comb.F, 0));
  assert.equal(e.comb.x, null);
  assert.equal(e.couple, true);
});

test('equivalents: r=0, t=0 has no loads, no couple, and Object.is(F, 0) everywhere', () => {
  const e = equivalents({ r: 0, t: 0, peak: 'B' });
  for (const k of ['rect', 'tri', 'comb']) {
    assert.ok(Object.is(e[k].F, 0), k + '.F is +0');
    assert.equal(e[k].x, null, k + '.x is null');
  }
  assert.equal(e.couple, false);
});

test('equivalents: negative zero inputs never leak -0', () => {
  const e = equivalents({ r: -0, t: -0, peak: 'A' });
  for (const k of ['rect', 'tri', 'comb']) assert.ok(Object.is(e[k].F, 0), k);
});

test('equivalents: r=100, t=0 is one upward 200 N force at x = 1 (+ up)', () => {
  const e = equivalents({ r: 100, t: 0, peak: 'B' });
  assert.deepEqual(e.rect, { F: 200, x: 1 });
  assert.deepEqual(e.tri, { F: 0, x: null });
  assert.deepEqual(e.comb, { F: 200, x: 1 });
  assert.equal(e.couple, false);
});

test('equivalents: a lone triangle makes comb equal to tri, with no rect location', () => {
  const e = equivalents({ r: 0, t: 60, peak: 'A' });
  assert.deepEqual(e.rect, { F: 0, x: null });
  assert.equal(e.comb.F, e.tri.F);
  assert.ok(near(e.comb.x, e.tri.x));
});

test('loadAt: r=100, t=100 is 100/150/200 at x=0/1/2 for peak B and 200/150/100 for peak A', () => {
  const B = { r: 100, t: 100, peak: 'B' };
  assert.equal(loadAt(B, 0), 100);
  assert.equal(loadAt(B, 1), 150);
  assert.equal(loadAt(B, 2), 200);
  const A = { r: 100, t: 100, peak: 'A' };
  assert.equal(loadAt(A, 0), 200);
  assert.equal(loadAt(A, 1), 150);
  assert.equal(loadAt(A, 2), 100);
});

test('snapW table', () => {
  const table = [[0, 0], [10, 0], [-10, 0], [12, 0], [13, 15], [15, 15], [-15, -15],
    [201, 200], [-999, -200], [NaN, 0]];
  for (const [input, want] of table) assert.equal(snapW(input), want, `snapW(${input})`);
  assert.ok(Object.is(snapW(-3), 0));
  assert.ok(Object.is(snapW(-10), 0));
  assert.equal(snapW(Infinity), 0);
  assert.equal(snapW(-Infinity), 0);
});

test('nextW: a pointer drag inside the zone lands on 0; a keyboard nudge from 0 reaches ±15 and back', () => {
  assert.equal(nextW(0, 5, false), 0);
  assert.equal(nextW(0, 5, true), 15);
  assert.equal(nextW(0, -5, true), -15);
  assert.equal(nextW(15, 10, true), 0);
  assert.equal(nextW(-15, -10, true), 0);
  assert.equal(nextW(0, 100, true), 100);
  assert.ok(Object.is(nextW(0, -0, true), 0));
});

test('nextW: a non-finite raw value never jumps, even from the keyboard', () => {
  assert.equal(nextW(0, NaN, true), 0);
  assert.equal(nextW(0, Infinity, true), 0);
  assert.equal(nextW(0, -Infinity, true), 0);
  assert.equal(nextW(0, NaN, false), 0);
});

// ---- the net moment about A (counterclockwise positive; with F + up and x to the right of A, M = x · F) ----
test('equivalents: the net moment M about A is r_rect·F_rect + r_tri·F_tri, counterclockwise positive', () => {
  // the default picture, both loads 100 N/m down: −200 N at 1 m and −100 N at 4/3 m, clockwise
  const d = equivalents({ r: -100, t: -100, peak: 'B' });
  assert.ok(near(d.M, -200 - 400 / 3), String(d.M));
  // upward loads turn the beam counterclockwise
  assert.ok(near(equivalents({ r: 100, t: 100, peak: 'B' }).M, 200 + 400 / 3));
  // peak A puts the triangle at L/3
  assert.ok(near(equivalents({ r: 0, t: 90, peak: 'A' }).M, 90 * 2 / 3));
  // exact where the arithmetic allows: t = −150 at B is −150 N at 4/3 m = −200 N·m
  assert.equal(equivalents({ r: 0, t: -150, peak: 'B' }).M, -200);
  assert.equal(equivalents({ r: -100, t: 0, peak: 'A' }).M, -200);
});

test('equivalents: a couple keeps its moment; no load has M = +0', () => {
  const c = equivalents({ r: -100, t: 200, peak: 'B' });   // −200 N at 1 m and +200 N at 4/3 m
  assert.equal(c.couple, true);
  assert.ok(near(c.M, -200 + 800 / 3));
  assert.ok(Object.is(equivalents({ r: 0, t: 0, peak: 'A' }).M, 0));
  assert.ok(Object.is(equivalents({ r: -0, t: -0, peak: 'B' }).M, 0));
});

test('equivalents over the slider grid: M equals the sum of the parts\' moments and equals F_equiv · x_equiv', () => {
  let n = 0;
  for (const peak of ['A', 'B']) for (let r = -200; r <= 200; r += 5) for (let t = -200; t <= 200; t += 5) {
    const e = equivalents({ r, t, peak });
    const xTri = peak === 'B' ? 4 / 3 : 2 / 3;
    assert.ok(Math.abs(e.M - (e.rect.F * 1 + e.tri.F * xTri)) < 1e-9, `${r},${t},${peak}`);
    if (e.comb.x !== null) assert.ok(Math.abs(e.M - e.comb.F * e.comb.x) < 1e-9, `${r},${t},${peak}`);
    assert.ok(!Object.is(e.M, -0));
    n++;
  }
  assert.equal(n, 2 * 81 * 81);
});
