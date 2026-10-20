import test from 'node:test';
import assert from 'node:assert/strict';
import { controlsView } from '../src/controls.js';

test("controlsView({r:-190,…}) rText is '−190'", () => {
  const v = controlsView({ r: -190, t: 100, peak: 'B' });
  assert.equal(v.rText, '−190');
  assert.equal(v.tText, '100');
  assert.equal(controlsView({ r: 100, t: -15, peak: 'A' }).tText, '−15');
});

test('rZero (and tZero) are true only at 0', () => {
  assert.equal(controlsView({ r: 0, t: 5, peak: 'B' }).rZero, true);
  assert.equal(controlsView({ r: 0, t: 5, peak: 'B' }).tZero, false);
  assert.equal(controlsView({ r: 15, t: 0, peak: 'B' }).rZero, false);
  assert.equal(controlsView({ r: 15, t: 0, peak: 'B' }).tZero, true);
  assert.equal(controlsView({ r: -15, t: -0, peak: 'B' }).rZero, false);
  assert.equal(controlsView({ r: 0, t: 0, peak: 'B' }).rText, '0');
  assert.equal(controlsView({ r: -0, t: 0, peak: 'B' }).rText, '0', 'never −0');
});

test('peak A/B reflected', () => {
  assert.equal(controlsView({ r: 1, t: 1, peak: 'A' }).peak, 'A');
  assert.equal(controlsView({ r: 1, t: 1, peak: 'B' }).peak, 'B');
});
