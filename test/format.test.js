import test from 'node:test';
import assert from 'node:assert/strict';
import { MINUS, fmt, fmtFixed, forceWords, locWords } from '../src/format.js';
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

test('forceWords: down, up, zero', () => {
  assert.equal(forceWords(200), '200 N down');
  assert.equal(forceWords(-10), '10 N up');
  assert.equal(forceWords(0), '0 N');
  assert.equal(forceWords(-0), '0 N');
  assert.equal(forceWords(100 / 3), '33.33 N down');
  assert.equal(forceWords(-0.001), '0 N');
});

test('locWords: null, on the beam, off the beam', () => {
  assert.equal(locWords(null), '');
  assert.equal(locWords(1), 'at x = 1.00 m from A');
  assert.equal(locWords(1.1111), 'at x = 1.11 m from A');
  assert.equal(locWords(0), 'at x = 0.00 m from A (at the wall)');
  assert.equal(locWords(-0), 'at x = 0.00 m from A (at the wall)');
  assert.equal(locWords(0.05), 'at x = 0.05 m from A (at the wall)');
  assert.equal(locWords(0.12), 'at x = 0.12 m from A');
  assert.equal(locWords(-0.001), 'at x = 0.00 m from A');
  assert.equal(locWords(4), 'at x = 4.00 m from A');
  assert.ok(locWords(-16 / 3).endsWith('(off the beam)'));
  assert.equal(locWords(-16 / 3), 'at x = −5.33 m from A (off the beam)');
  assert.equal(locWords(4.5), 'at x = 4.50 m from A (off the beam)');
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

test('locWords: "at the wall" covers 0 <= x < 0.12 only; a tiny negative that prints 0.00 is neither at the wall nor off the beam', () => {
  assert.equal(locWords(0.1199), 'at x = 0.12 m from A (at the wall)');
  assert.equal(locWords(0.12), 'at x = 0.12 m from A');
  assert.equal(locWords(0.5), 'at x = 0.50 m from A');
  assert.equal(locWords(-0.001), 'at x = 0.00 m from A');
  assert.equal(locWords(-0.2), 'at x = −0.20 m from A (off the beam)');
  assert.equal(locWords(-0.0049), 'at x = 0.00 m from A');
});
