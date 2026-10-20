import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePresets, describePresets } from '../src/presets.js';

const EMPTY = { r: undefined, t: undefined, peak: undefined, adjusted: [], ignored: [] };
const parse = (...pairs) => parsePresets('?' + pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'));

// Mutation: the search string is used without the `|| ''` guard (null or undefined would throw).
test('no params gives no changes and an empty description', () => {
  for (const search of [undefined, null, '', '?']) {
    const p = parsePresets(search);
    assert.deepStrictEqual(p, EMPTY, String(search));
    assert.strictEqual(describePresets(p), '', String(search));
  }
});

test('all three params are read and described', () => {
  const p = parsePresets('?r=100&t=-190&peak=B');
  assert.deepStrictEqual(p, { ...EMPTY, r: 100, t: -190, peak: 'B' });
  assert.strictEqual(describePresets(p), 'From the link: r = 100 N/m, t = −190 N/m, peak at B.');
  assert.strictEqual(describePresets(parsePresets('?t=50')), 'From the link: t = 50 N/m.');
  assert.strictEqual(describePresets(parsePresets('?peak=a')), 'From the link: peak at A.');
});

// Mutation: the value is not snapped (7 stays 7), or the note is not written.
test('r=7 is adjusted to 0 and says so', () => {
  const p = parse(['r', '7']);
  assert.strictEqual(p.r, 0);
  assert.deepStrictEqual(p.adjusted, ['r 7 → 0']);
  assert.strictEqual(describePresets(p), 'From the link: r = 0 N/m. Adjusted: r 7 → 0.');
  assert.deepStrictEqual(parse(['t', '-47']).adjusted, ['t −47 → −45']);
});

// Mutation: the note compares the raw numbers instead of what would be printed.
test('r=100.0001 is NOT noted as adjusted (prints the same)', () => {
  const p = parse(['r', '100.0001']);
  assert.strictEqual(p.r, 100);
  assert.deepStrictEqual(p.adjusted, []);
  assert.deepStrictEqual(parse(['t', '-0.001']).adjusted, []);
  assert.deepStrictEqual(parse(['r', '100']).adjusted, []);
});

test('r=abc is ignored with a note and leaves r undefined', () => {
  const BAD = ['', 'abc', '1,2', 'Infinity', 'NaN', '1e3', '0x10', '--1', ' ', '9'.repeat(400)];
  for (const key of ['r', 't']) {
    for (const raw of BAD) {
      const p = parse([key, raw]);
      assert.strictEqual(p[key], undefined, `${key}=${JSON.stringify(raw)}`);
      const echo = raw.length > 40 ? raw.slice(0, 40) + '…' : raw;
      assert.deepStrictEqual(p.ignored, [`${key}=${echo} (use a number of N/m)`]);
      assert.deepStrictEqual(p.adjusted, []);
    }
  }
  assert.deepStrictEqual(parse(['r', 'abc']).ignored, ['r=abc (use a number of N/m)']);
  const mixed = parsePresets('?r=abc&t=50');
  assert.deepStrictEqual(mixed, { ...EMPTY, t: 50, ignored: ['r=abc (use a number of N/m)'] });
});

test('peak=c is ignored; peak=b is accepted as B', () => {
  const c = parse(['peak', 'c']);
  assert.strictEqual(c.peak, undefined);
  assert.deepStrictEqual(c.ignored, ['peak=c (use A or B)']);
  for (const bad of ['', 'AB', 'up', '1']) assert.strictEqual(parse(['peak', bad]).peak, undefined, bad);
  const b = parse(['peak', 'b']);
  assert.strictEqual(b.peak, 'B');
  assert.deepStrictEqual(b.ignored, []);
  assert.deepStrictEqual(b.adjusted, [], 'case folding is not an adjustment');
  assert.strictEqual(parse(['peak', 'a']).peak, 'A');
  // the description lists only what was set, then Adjusted, then Ignored
  assert.strictEqual(describePresets(parsePresets('?r=100&t=-190&peak=c')),
    'From the link: r = 100 N/m, t = −190 N/m. Ignored: peak=c (use A or B).');
  assert.strictEqual(describePresets(parsePresets('?peak=c')), 'From the link: nothing set. Ignored: peak=c (use A or B).');
  assert.strictEqual(describePresets(parsePresets('?r=abc&t=x')),
    'From the link: nothing set. Ignored: r=abc (use a number of N/m); t=x (use a number of N/m).');
  // Adjusted with nothing set cannot come from parsePresets (an adjusted value is a set value), so pin it directly
  assert.strictEqual(describePresets({ r: undefined, t: undefined, peak: undefined, adjusted: ['r 7 → 0'], ignored: [] }),
    'From the link: nothing set. Adjusted: r 7 → 0.');
  assert.strictEqual(describePresets({ r: undefined, t: undefined, peak: undefined, adjusted: ['r 7 → 0'], ignored: ['peak=c (use A or B)'] }),
    'From the link: nothing set. Adjusted: r 7 → 0. Ignored: peak=c (use A or B).');
  assert.strictEqual(describePresets(parsePresets('?r=7&t=-190&peak=B&q=c&peak=c')),
    'From the link: r = 0 N/m, t = −190 N/m, peak at B. Adjusted: r 7 → 0.');
  assert.strictEqual(describePresets({ r: 100, t: -190, peak: 'B', adjusted: ['r 7 → 0'], ignored: ['peak=c (use A or B)'] }),
    'From the link: r = 100 N/m, t = −190 N/m, peak at B. Adjusted: r 7 → 0. Ignored: peak=c (use A or B).');
});

// Mutation: the LAST duplicate wins.
test('first duplicate wins', () => {
  assert.strictEqual(parsePresets('?r=40&r=60').r, 40);
  const p = parsePresets('?r=abc&r=60');
  assert.strictEqual(p.r, undefined);
  assert.deepStrictEqual(p.ignored, ['r=abc (use a number of N/m)']);
  assert.strictEqual(parsePresets('?peak=A&peak=B').peak, 'A');
});

test('unknown params are ignored silently', () => {
  assert.deepStrictEqual(parsePresets('?unrelated=1&x=2&R=50&Peak=A'), EMPTY);
  assert.strictEqual(describePresets(parsePresets('?foo=bar')), '');
});

// Mutation: the leading U+2212 is not turned into a hyphen before the number test.
test('a pasted U+2212 minus is a minus (t=−190 → −190)', () => {
  assert.strictEqual(parse(['t', '−190']).t, -190);
  assert.strictEqual(parse(['r', '−50']).r, -50);
  assert.strictEqual(parse(['t', '−-1']).t, undefined, 'only one minus');
  assert.strictEqual(parse(['t', '1−1']).t, undefined, 'and only a leading one');
  assert.deepStrictEqual(parse(['t', '−190']).adjusted, []);
});

// Mutation: the sign of zero leaks (Object.is would see -0).
test('-0 becomes 0, not -0', () => {
  for (const key of ['r', 't']) {
    for (const raw of ['-0', '-0.0', '-3', '−0']) {
      const p = parse([key, raw]);
      assert.ok(Object.is(p[key], 0), `${key}=${raw}`);
    }
  }
  const text = describePresets(parse(['r', '-0']));
  assert.strictEqual(text, 'From the link: r = 0 N/m.');
});

// Mutation: the ambiguous pattern (\d+\.?\d*|\.\d+) backtracks quadratically.
test('a 20,000-digit value followed by x is refused in under 250 ms (r and t)', () => {
  for (const key of ['r', 't']) {
    const t0 = performance.now();
    const p = parse([key, '9'.repeat(20000) + 'x']);
    const ms = performance.now() - t0;
    assert.strictEqual(p[key], undefined);
    assert.strictEqual(p.ignored.length, 1);
    assert.ok(ms < 250, `${key} took ${ms.toFixed(0)} ms`);
  }
});

// Mutations: the raw text is echoed in full; the cut counts UTF-16 units, not characters.
test('a long ignored value is cut to 40 characters plus an ellipsis', () => {
  const long = parse(['r', 'a'.repeat(2000)]);
  assert.deepStrictEqual(long.ignored, [`r=${'a'.repeat(40)}… (use a number of N/m)`]);
  assert.ok(describePresets(long).length < 160);
  assert.deepStrictEqual(parse(['t', 'a'.repeat(40)]).ignored, [`t=${'a'.repeat(40)} (use a number of N/m)`]);
  assert.deepStrictEqual(parse(['peak', 'x'.repeat(41)]).ignored, [`peak=${'x'.repeat(40)}… (use A or B)`]);
});

test('41 emoji keep 40 whole ones', () => {
  const emoji = '\u{1F600}'.repeat(41);
  assert.deepStrictEqual(parse(['r', emoji]).ignored, [`r=${'\u{1F600}'.repeat(40)}… (use a number of N/m)`]);
});

test('limits: r=500 is adjusted to 200', () => {
  const p = parse(['r', '500']);
  assert.strictEqual(p.r, 200);
  assert.deepStrictEqual(p.adjusted, ['r 500 → 200']);
  const q = parse(['t', '-500']);
  assert.strictEqual(q.t, -200);
  assert.deepStrictEqual(q.adjusted, ['t −500 → −200']);
});

// The 20,000-digit case alone is too gentle: the ambiguous pattern needs ~180 ms for it on this
// machine (under the 250 ms limit), but ~1.6 s for 60,000 digits, so this one catches the mutant.
test('a 60,000-digit value followed by x is refused in under 250 ms (catches the ambiguous pattern)', () => {
  for (const key of ['r', 't']) {
    const t0 = performance.now();
    const p = parse([key, '9'.repeat(60000) + 'x']);
    const ms = performance.now() - t0;
    assert.strictEqual(p[key], undefined);
    assert.ok(ms < 250, `${key} took ${ms.toFixed(0)} ms`);
  }
});

// Pins the ACCEPTED number forms (the regex is written unambiguously; these forms must stay valid).
test('accepted number forms: 1.  .5  +5  -.5', () => {
  assert.strictEqual(parse(['r', '1.']).r, 0, '1. is the number 1, which snaps to 0');
  assert.deepStrictEqual(parse(['r', '1.']).ignored, []);
  assert.strictEqual(parse(['r', '.5']).r, 0);
  assert.deepStrictEqual(parse(['r', '.5']).ignored, []);
  assert.strictEqual(parse(['r', '+5']).r, 0);
  assert.deepStrictEqual(parse(['r', '+5']).ignored, []);
  assert.strictEqual(parse(['t', '-.5']).t, 0);
  assert.deepStrictEqual(parse(['t', '-.5']).ignored, []);
  // the same forms at values that survive snapping
  assert.strictEqual(parse(['r', '100.']).r, 100);
  assert.strictEqual(parse(['r', '+100']).r, 100);
  assert.strictEqual(parse(['t', '-100.']).t, -100);
  assert.strictEqual(parse(['r', '99.99999']).r, 100);
  assert.strictEqual(parse(['r', '+.5e']).r, undefined, 'a trailing letter is still refused');
  assert.strictEqual(parse(['r', '.']).r, undefined, 'a bare dot is not a number');
  assert.strictEqual(parse(['r', '+']).r, undefined, 'a bare sign is not a number');
});
