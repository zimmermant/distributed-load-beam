import test from 'node:test';
import assert from 'node:assert/strict';
import { MINUS, fmt, fmtFixed, forceWords, locWords, offSide, momentParts, momentWords } from '../src/format.js';
import { equivalents } from '../src/physics.js';

test('MINUS is U+2212', () => {
  assert.equal(MINUS, '−');
});

test('fmt: negative zero, minus sign, non-finite', () => {
  assert.equal(fmt(-0.001), '0');
  assert.equal(fmt(-0), '0');
  assert.equal(fmt(-5.3333), '−5.33');
  assert.equal(fmt(NaN), '—');
  assert.equal(fmt(Infinity), '—');
  assert.equal(fmt(null), '—');
  assert.equal(fmt(undefined), '—');
  assert.equal(fmt(1.5, 0), '2');
  assert.equal(fmt(200), '200');
});

test('fmtFixed: always dp decimals, U+2212, never -0.00, non-finite is a dash', () => {
  assert.equal(fmtFixed(1), '1.00');
  assert.equal(fmtFixed(4), '4.00');
  assert.equal(fmtFixed(0), '0.00');
  assert.equal(fmtFixed(-0), '0.00');
  assert.equal(fmtFixed(-0.001), '0.00');
  assert.equal(fmtFixed(-0.004), '0.00');
  assert.equal(fmtFixed(-5.3333), '−5.33');
  assert.equal(fmtFixed(-12), '−12.00');
  assert.equal(fmtFixed(1.005 * 1, 1), '1.0');
  assert.equal(fmtFixed(4 / 3), '1.33');
  assert.equal(fmtFixed(2.5, 0), '3');
  assert.equal(fmtFixed(-0.4, 0), '0');
  assert.equal(fmtFixed(NaN), '—');
  assert.equal(fmtFixed(Infinity), '—');
  assert.equal(fmtFixed(-Infinity), '—');
  assert.equal(fmtFixed(null), '—');
  assert.equal(fmtFixed(undefined), '—');
});

test('forceWords: down, up, zero (+ up)', () => {
  assert.equal(forceWords(-200), '200\u00a0N down');
  assert.equal(forceWords(10), '10\u00a0N up');
  assert.equal(forceWords(0), '0\u00a0N');
  assert.equal(forceWords(-0), '0\u00a0N');
  assert.equal(forceWords(-100 / 3), '33.33\u00a0N down');
  assert.equal(forceWords(-0.001), '0\u00a0N');
});

test('locWords: null, on the beam, off the beam', () => {
  assert.equal(locWords(null), '');
  assert.equal(locWords(1), 'at x = 1.00\u00a0m from A');
  assert.equal(locWords(1.1111), 'at x = 1.11\u00a0m from A');
  assert.equal(locWords(0), 'at x = 0.00\u00a0m from A');
  assert.equal(locWords(-0), 'at x = 0.00\u00a0m from A');
  assert.equal(locWords(0.05), 'at x = 0.05\u00a0m from A');
  assert.equal(locWords(0.12), 'at x = 0.12\u00a0m from A');
  assert.equal(locWords(-0.001), 'at x = 0.00\u00a0m from A');
  assert.equal(locWords(4), 'at x = 4.00\u00a0m from A');
  // off the beam the distance is still printed; the figure's edge marker says which side
  assert.equal(locWords(-16 / 3), 'at x = −5.33\u00a0m from A');
  assert.equal(locWords(4.5), 'at x = 4.50\u00a0m from A');
});

test('no forceWords/locWords result contains -0, NaN or Infinity', () => {
  const bad = /-0|NaN|Infinity/;
  let n = 0;
  for (let r = -200; r <= 200; r += 5) {
    for (let t = -200; t <= 200; t += 5) {
      for (const peak of ['A', 'B']) {
        const e = equivalents({ r, t, peak });
        for (const k of ['rect', 'tri', 'comb']) {
          const f = forceWords(e[k].F);
          const l = locWords(e[k].x);
          assert.ok(!bad.test(f), `${r},${t},${peak},${k}: ${f}`);
          assert.ok(!bad.test(l), `${r},${t},${peak},${k}: ${l}`);
          n++;
        }
      }
    }
  }
  assert.equal(n, 81 * 81 * 2 * 3);
});

test('locWords: no wall wording anywhere near the wall, and no side wording off the beam', () => {
  assert.equal(locWords(0.1199), 'at x = 0.12\u00a0m from A');
  assert.equal(locWords(0.1), 'at x = 0.10\u00a0m from A');
  assert.equal(locWords(0.005), 'at x = 0.01\u00a0m from A');
  assert.equal(locWords(0.0049), 'at x = 0.00\u00a0m from A');
  assert.equal(locWords(0.5), 'at x = 0.50\u00a0m from A');
  assert.equal(locWords(-0.001), 'at x = 0.00\u00a0m from A');
  assert.equal(locWords(-0.0049), 'at x = 0.00\u00a0m from A');
  assert.equal(locWords(-0.2), 'at x = −0.20\u00a0m from A');
  assert.equal(locWords(-0.005), 'at x = −0.01\u00a0m from A');
  for (let x = -0.3; x <= 0.3; x += 0.001) assert.ok(!/wall/.test(locWords(x)), `${x}: ${locWords(x)}`);
});

test('offSide: left of A, beyond C, or on the beam (null), judged on the printed value', () => {
  assert.equal(offSide(null), null);
  assert.equal(offSide(undefined), null);
  assert.equal(offSide(0), null);
  assert.equal(offSide(-0), null);
  assert.equal(offSide(2), null);
  assert.equal(offSide(4), null);
  assert.equal(offSide(-0.0049), null, 'prints 0.00: on the beam');
  assert.equal(offSide(4.0049), null, 'prints 4.00: on the beam');
  assert.equal(offSide(-0.005), 'left', 'prints −0.01');
  assert.equal(offSide(-16 / 3), 'left');
  assert.equal(offSide(4.006), 'right', 'prints 4.01');
  assert.equal(offSide(22 / 3), 'right');
});

test('momentWords: counterclockwise positive with an explicit +, clockwise negative, zero with no direction', () => {
  assert.equal(momentWords(-200 - 400 / 3), '−333.33\u00a0N·m (clockwise)');
  assert.equal(momentWords(200 + 400 / 3), '+333.33\u00a0N·m (counterclockwise)');
  assert.equal(momentWords(-200), '−200\u00a0N·m (clockwise)', 'whole numbers print without decimals');
  assert.equal(momentWords(60), '+60\u00a0N·m (counterclockwise)');
  assert.equal(momentWords(0), '0\u00a0N·m');
  assert.equal(momentWords(-0), '0\u00a0N·m');
  assert.equal(momentWords(-0.001), '0\u00a0N·m', 'a value that prints as 0 has no sign and no direction');
  assert.equal(momentWords(0.004), '0\u00a0N·m');
  assert.equal(momentWords(0.5), '+0.5\u00a0N·m (counterclockwise)');
});

test('momentParts: the signed value with its unit, and the direction word apart', () => {
  assert.deepEqual(momentParts(-1000 / 3), { text: '−333.33\u00a0N·m', dir: 'clockwise' });
  assert.deepEqual(momentParts(800 / 3 - 200), { text: '+66.67\u00a0N·m', dir: 'counterclockwise' });
  assert.deepEqual(momentParts(0), { text: '0\u00a0N·m', dir: '' });
});
