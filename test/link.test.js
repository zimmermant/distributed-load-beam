import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAIN_PAGE, DETAIL_PAGE, presetQuery } from '../src/link.js';
import { parsePresets } from '../src/presets.js';
import { snapW } from '../src/physics.js';

test('the two page file names', () => {
  assert.strictEqual(MAIN_PAGE, 'distributed_load_beam.html');
  assert.strictEqual(DETAIL_PAGE, 'distributed_load_beam_detail.html');
});

// Mutation: the order of the parameters, or the peak letter, is changed.
test('presetQuery prints r, t and peak as a query string', () => {
  assert.strictEqual(presetQuery({ r: 100, t: 100, peak: 'B' }), '?r=100&t=100&peak=B');
});

// Mutation: the true minus sign (U+2212) is printed instead of an ASCII hyphen-minus.
test('negatives use an ASCII hyphen-minus', () => {
  const q = presetQuery({ r: -5, t: -200, peak: 'A' });
  assert.strictEqual(q, '?r=-5&t=-200&peak=A');
  assert.ok(!q.includes('−'));
});

// Mutation: a zero prints as -0.
test('zero never prints as -0', () => {
  assert.ok(!presetQuery({ r: 0, t: 0, peak: 'A' }).includes('-0'));
  assert.strictEqual(presetQuery({ r: 0, t: 0, peak: 'A' }), '?r=0&t=0&peak=A');
  assert.strictEqual(presetQuery({ r: -0, t: -0, peak: 'B' }), '?r=0&t=0&peak=B');
});

// Mutation: the query is built so that parsePresets does not read back the same state.
// The grid includes +-5 and +-10, which the sliders never hold (the zero zone snaps them to 0): a real
// slider state is the SNAPPED value, and that must come back untouched and unannounced; the raw grid
// value must come back snapped, announced exactly when snapping changed it.
test('round trip over every slider state', () => {
  const values = [];
  for (let v = -200; v <= 200; v += 5) values.push(v);
  assert.strictEqual(values.length, 81);
  let count = 0;
  for (const r of values) for (const t of values) for (const peak of ['A', 'B']) {
    const state = { r: snapW(r), t: snapW(t), peak };
    const p = parsePresets(presetQuery(state));
    assert.deepStrictEqual(p, { ...state, adjusted: [], ignored: [] }, `${r} ${t} ${peak}`);
    const raw = parsePresets(presetQuery({ r, t, peak }));
    assert.deepStrictEqual([raw.r, raw.t, raw.peak, raw.ignored], [state.r, state.t, peak, []], `raw ${r} ${t} ${peak}`);
    const changed = (r !== state.r) + (t !== state.t);
    assert.strictEqual(raw.adjusted.length, changed, `raw ${r} ${t} ${peak}`);
    count++;
  }
  assert.strictEqual(count, 81 * 81 * 2);
});

// Mutation: the state is not snapped on the way back (7 stays 7).
test('a snap-zone value round-trips to the snapped value', () => {
  const p = parsePresets(presetQuery({ r: 7, t: 100, peak: 'B' }));
  assert.strictEqual(p.r, 0);
  assert.strictEqual(p.t, 100);
  assert.strictEqual(p.peak, 'B');
});
