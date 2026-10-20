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

test('equivalents: r=-100, t=0 is one upward 200 N force at x = 1', () => {
  const e = equivalents({ r: -100, t: 0, peak: 'B' });
  assert.deepEqual(e.rect, { F: -200, x: 1 });
  assert.deepEqual(e.tri, { F: 0, x: null });
  assert.deepEqual(e.comb, { F: -200, x: 1 });
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
