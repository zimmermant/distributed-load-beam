import test from 'node:test';
import assert from 'node:assert/strict';
import { calcLines, createPanel } from '../src/panel.js';

const XBAR = 'x̄';
const plain = (html) => html.replace(/<[^>]*>/g, '');
const byKey = (lines, key) => lines.filter(l => l.key === key);
const text = (s, key) => plain(byKey(calcLines(s), key)[0].html);
const all = (s) => calcLines(s).map(l => plain(l.html)).join('\n');

test('calcLines default values contain 200 N, 100 N, 300 N and x = 1.11 m', () => {
  const lines = calcLines({ r: 100, t: 100, peak: 'B' });
  assert.deepEqual(lines.map(l => l.key), ['rect', 'tri', 'comb']);
  assert.ok(text({ r: 100, t: 100, peak: 'B' }, 'rect').includes('F = w × L = 100 × 2 = 200 N, acting at the middle of AB: x = 1.00 m'));
  assert.ok(text({ r: 100, t: 100, peak: 'B' }, 'tri').includes('F = ½ × peak × L = ½ × 100 × 2 = 100 N, acting one third of the way in from the larger end (the peak is at B): x = 1.33 m'));
  assert.ok(text({ r: 100, t: 100, peak: 'B' }, 'comb').includes(`F = 200 + (100) = 300 N, at ${XBAR} = (200 × 1.00 + 100 × 1.33) / 300 = 1.11 m`));
});

test("peak A says 'the peak is at A' and x = 0.67 m", () => {
  const t = text({ r: 100, t: 100, peak: 'A' }, 'tri');
  assert.ok(t.includes('the peak is at A'), t);
  assert.ok(t.includes('x = 0.67 m'), t);
  // (200 × 1.00 + 100 × 0.67) / 300 = 0.89
  assert.ok(text({ r: 100, t: 100, peak: 'A' }, 'comb').includes('= 0.89 m'));
});

test('r=100,t=-200 says the parts cancel and adds a couple note', () => {
  const lines = calcLines({ r: 100, t: -200, peak: 'B' });
  const comb = plain(byKey(lines, 'comb')[0].html);
  assert.ok(comb.includes('cancel'), comb);
  assert.ok(comb.includes('F = 200 + (−200) = 0 N'), comb);
  assert.ok(/no single force/.test(comb), comb);
  assert.ok(!comb.includes(XBAR), 'no location when the force is zero');
  const note = byKey(lines, 'note');
  assert.equal(note.length, 1);
  assert.ok(/couple/.test(plain(note[0].html)), note[0].html);
  // other states carry no note
  assert.equal(byKey(calcLines({ r: 100, t: 100, peak: 'B' }), 'note').length, 0);
  assert.equal(byKey(calcLines({ r: 0, t: 0, peak: 'B' }), 'note').length, 0);
});

test('r=100,t=-190 prints x̄ = −5.33 m', () => {
  const s = { r: 100, t: -190, peak: 'B' };
  const comb = text(s, 'comb');
  assert.ok(comb.includes('F = 200 + (−190) = 10 N'), comb);
  assert.ok(comb.includes(`${XBAR} = `), comb);
  assert.ok(comb.includes('= −5.33 m'), comb);
  assert.ok(comb.includes('(−190)'), 'a negative number inside the sum is in parentheses: ' + comb);
  assert.ok(/off the beam/.test(comb), comb);
  assert.ok(text(s, 'tri').includes('½ × (−190) × 2 = −190 N'), text(s, 'tri'));
  assert.ok(text({ r: -100, t: 100, peak: 'B' }, 'rect').includes('w × L = (−100) × 2 = −200 N'));
});

test('the arithmetic shown reproduces the result, or says it used unrounded locations', () => {
  // (200 × 1.00 + (−190) × 1.33) / 10 would print −5.27 but the true answer is −5.33
  const comb = text({ r: 100, t: -190, peak: 'B' }, 'comb');
  assert.ok(/unrounded/.test(comb), comb);
  assert.ok(!/unrounded/.test(text({ r: 100, t: 100, peak: 'B' }, 'comb')));
});

test('r=0 says there is no rectangular load', () => {
  const s = { r: 0, t: 100, peak: 'B' };
  const rect = text(s, 'rect');
  assert.ok(/no rectangular load/.test(rect), rect);
  assert.ok(!/F = w/.test(rect), rect);
  // the other lines are unaffected
  assert.ok(text(s, 'tri').includes('= 100 N'));
  const comb = text(s, 'comb');
  assert.ok(comb.includes('= 100 N') && comb.includes('1.33 m'), comb);
  assert.ok(/only the triangle acts/.test(comb), comb);
  const t0 = text({ r: 100, t: 0, peak: 'A' }, 'tri');
  assert.ok(/no triangular load/.test(t0), t0);
  assert.ok(/only the rectangle acts/.test(text({ r: 100, t: 0, peak: 'A' }, 'comb')));
  const none = text({ r: 0, t: 0, peak: 'B' }, 'comb');
  assert.ok(/no load/.test(none), none);
});

test('no line ever contains -0, NaN, Infinity or a hyphen-minus before a digit', () => {
  const bad = /-0|NaN|Infinity|-\d|undefined|null|—/;
  let n = 0;
  for (let r = -200; r <= 200; r += 5) {
    for (let t = -200; t <= 200; t += 5) {
      for (const peak of ['A', 'B']) {
        const lines = calcLines({ r, t, peak });
        assert.ok(lines.length >= 3 && lines.length <= 4, `${r},${t},${peak}`);
        for (const l of lines) {
          const p = plain(l.html);
          assert.ok(!bad.test(p), `${r},${t},${peak},${l.key}: ${p}`);
          assert.ok(p.length > 10);
          n++;
        }
      }
    }
  }
  assert.ok(n > 81 * 81 * 2 * 3 - 1);
});

test('calcLines is pure: the same state gives equal output and the input is untouched', () => {
  const s = { r: 55, t: -35, peak: 'A' };
  const copy = { ...s };
  assert.deepEqual(calcLines(s), calcLines(s));
  assert.deepEqual(s, copy);
});

test('createPanel writes the lines and touches the DOM only when the text changed', () => {
  let writes = 0;
  let html = '';
  const el = { get innerHTML() { return html; }, set innerHTML(v) { writes++; html = v; } };
  const panel = createPanel(el);
  panel.render({ r: 100, t: 100, peak: 'B' });
  assert.equal(writes, 1);
  assert.ok(html.includes('200 N') && html.includes('300 N'));
  panel.render({ r: 100, t: 100, peak: 'B' });
  assert.equal(writes, 1, 'same state, no write');
  panel.render({ r: 100, t: 105, peak: 'B' });
  assert.equal(writes, 2);
});

test('a negative leading term in the combined sum is parenthesised: r=-200,t=100', () => {
  const s = { r: -200, t: 100, peak: 'B' };
  const comb = text(s, 'comb');
  assert.ok(comb.includes('F = (−400) + (100) = −300 N'), comb);
  assert.ok(comb.includes('/ (−300)'), comb);
  assert.ok(text(s, 'rect').includes('F = w × L = (−200) × 2 = −400 N'));
  // no bare "−digit" sits after an operator or at the start of a term in any combined sum
  for (const r of [-200, -15, 15, 200]) for (const t of [-200, -15, 15, 200]) {
    const p = text({ r, t, peak: 'A' }, 'comb');
    assert.ok(!/([+×/]\s|F = )−\d/.test(p), `${r},${t}: ${p}`);
  }
});

test('a bad peak value never reaches the HTML raw', () => {
  const html = calcLines({ r: 100, t: 100, peak: '<img src=x>' }).map(l => l.html).join('');
  assert.ok(!html.includes('<img'), html);
  assert.ok(text({ r: 100, t: 100, peak: '<img src=x>' }, 'tri').includes('the peak is at B'));
});
