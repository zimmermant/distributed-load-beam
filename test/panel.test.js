import test from 'node:test';
import assert from 'node:assert/strict';
import { calcLines, createPanel } from '../src/panel.js';
import { locWords, momentParts, fmtFixed } from '../src/format.js';
import { equivalents } from '../src/physics.js';

const XBAR = 'x̄';
const plain = (html) => html.replace(/<[^>]*>/g, '');
const byKey = (lines, key) => lines.filter(l => l.key === key);
const text = (s, key) => plain(byKey(calcLines(s), key)[0].html);
const all = (s) => calcLines(s).map(l => plain(l.html)).join('\n');

test('calcLines default values (both loads down, + up) contain −200 N, −100 N, −300 N, x = 1.11 m and the net moment', () => {
  const D = { r: -100, t: -100, peak: 'B' };
  const lines = calcLines(D);
  assert.deepEqual(lines.map(l => l.key), ['rect', 'tri', 'comb', 'moment']);
  assert.ok(text(D, 'rect').includes('F = w × L = (−100\u00a0N/m) × 2\u00a0m = −200\u00a0N, acting at the middle of AB: x = 1.00\u00a0m'));
  assert.ok(text(D, 'tri').includes('F = ½ × peak × L = ½ × (−100\u00a0N/m) × 2\u00a0m = −100\u00a0N, acting one third of the way in from the larger end (the peak is at B): x = 1.33\u00a0m'));
  assert.ok(text(D, 'comb').includes(`F = (−200\u00a0N) + (−100\u00a0N) = −300\u00a0N, at ${XBAR} = ((−200\u00a0N) × 1.00\u00a0m + (−100\u00a0N) × 1.33\u00a0m) / (−300\u00a0N) = 1.11\u00a0m`));
  assert.equal(text(D, 'moment'), 'Net moment about A (counterclockwise +): M = 1.00\u00a0m × (−200\u00a0N) + 1.33\u00a0m × (−100\u00a0N) = −333.33\u00a0N·m (clockwise) (worked from the unrounded locations)');
});

test("peak A says 'the peak is at A' and x = 0.67 m", () => {
  const t = text({ r: 100, t: 100, peak: 'A' }, 'tri');
  assert.ok(t.includes('the peak is at A'), t);
  assert.ok(t.includes('x = 0.67\u00a0m'), t);
  // (200 N × 1.00 m + 100 N × 0.67 m) / 300 N = 0.89 m
  assert.ok(text({ r: 100, t: 100, peak: 'A' }, 'comb').includes('= 0.89\u00a0m'));
});

test('r=100,t=-200 says the parts cancel and adds a couple note', () => {
  const lines = calcLines({ r: 100, t: -200, peak: 'B' });
  const comb = plain(byKey(lines, 'comb')[0].html);
  assert.ok(comb.includes('cancel'), comb);
  assert.ok(comb.includes('F = 200\u00a0N + (−200\u00a0N) = 0\u00a0N'), comb);
  assert.ok(/no single force/.test(comb), comb);
  assert.ok(!comb.includes(XBAR), 'no location when the force is zero');
  const note = byKey(lines, 'note');
  assert.equal(note.length, 1);
  assert.equal(plain(note[0].html), 'The forces cancel but their moments do not: a couple, which no single force can replace.');
  // other states carry no note
  assert.equal(byKey(calcLines({ r: 100, t: 100, peak: 'B' }), 'note').length, 0);
  assert.equal(byKey(calcLines({ r: 0, t: 0, peak: 'B' }), 'note').length, 0);
});

test('r=100,t=-190 prints x̄ = −5.33 m', () => {
  const s = { r: 100, t: -190, peak: 'B' };
  const comb = text(s, 'comb');
  assert.ok(comb.includes('F = 200\u00a0N + (−190\u00a0N) = 10\u00a0N'), comb);
  assert.ok(comb.includes(`${XBAR} = `), comb);
  assert.ok(comb.includes('= −5.33\u00a0m'), comb);
  assert.ok(comb.includes('(−190\u00a0N)'), 'a negative number inside the sum is in parentheses: ' + comb);
  assert.ok(/off the beam/.test(comb), comb);
  assert.ok(text(s, 'tri').includes('½ × (−190\u00a0N/m) × 2\u00a0m = −190\u00a0N'), text(s, 'tri'));
  assert.ok(text({ r: -100, t: 100, peak: 'B' }, 'rect').includes('w × L = (−100\u00a0N/m) × 2\u00a0m = −200\u00a0N'));
});

test('the arithmetic shown reproduces the result, or says it used unrounded locations', () => {
  // (200 N × 1.00 m + (−190 N) × 1.33 m) / 10 N would print −5.27 but the true answer is −5.33
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
  assert.ok(text(s, 'tri').includes('= 100\u00a0N'));
  const comb = text(s, 'comb');
  assert.ok(comb.includes('= 100\u00a0N') && comb.includes('1.33\u00a0m'), comb);
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
        assert.ok(lines.length >= 4 && lines.length <= 5, `${r},${t},${peak}`);   // rect, tri, comb, moment, and a couple's note
        for (const l of lines) {
          const p = plain(l.html);
          assert.ok(!bad.test(p), `${r},${t},${peak},${l.key}: ${p}`);
          assert.ok(p.length > 10);
          n++;
        }
      }
    }
  }
  assert.ok(n > 81 * 81 * 2 * 4 - 1);
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
  assert.ok(html.includes('200\u00a0N') && html.includes('300\u00a0N'));
  panel.render({ r: 100, t: 100, peak: 'B' });
  assert.equal(writes, 1, 'same state, no write');
  panel.render({ r: 100, t: 105, peak: 'B' });
  assert.equal(writes, 2);
});

test('a negative leading term in the combined sum is parenthesised: r=-200,t=100', () => {
  const s = { r: -200, t: 100, peak: 'B' };
  const comb = text(s, 'comb');
  assert.ok(comb.includes('F = (−400\u00a0N) + (100\u00a0N) = −300\u00a0N'), comb);
  assert.ok(comb.includes('/ (−300\u00a0N)'), comb);
  assert.ok(text(s, 'rect').includes('F = w × L = (−200\u00a0N/m) × 2\u00a0m = −400\u00a0N'));
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

test('each line sits in a div carrying its key as a class', () => {
  let html = '';
  const el = { get innerHTML() { return html; }, set innerHTML(v) { html = v; } };
  createPanel(el).render({ r: 100, t: -200, peak: 'B' });
  for (const key of ['rect', 'tri', 'comb', 'moment', 'note']) assert.ok(html.includes(`<div class="cl ${key}">`), `${key}: ${html}`);
  createPanel(el).render({ r: 100, t: 100, peak: 'B' });
  assert.ok(!html.includes('class="cl note"'));
});

test('a combined force beyond C is flagged, and one left of the wall is flagged differently', () => {
  assert.ok(text({ r: 100, t: -190, peak: 'A' }, 'comb').includes('7.33\u00a0m (off the beam, beyond C)'));
  const left = text({ r: 100, t: -190, peak: 'B' }, 'comb');
  assert.ok(left.includes('(off the beam, left of the wall)') && !left.includes('beyond C'), left);
  const on = text({ r: 100, t: 100, peak: 'B' }, 'comb');
  assert.ok(!/off the beam/.test(on), on);
});

test('off the beam is judged on the printed location: -0.001 and 4.003 print 0.00 and 4.00 and are on the beam', () => {
  // off-grid loads, so the combined location lands inside the rounding margin of a beam end
  const nearA = text({ r: -66.65, t: 100, peak: 'B' }, 'comb');
  assert.ok(nearA.includes('= 0.00\u00a0m') && !/off the beam/.test(nearA), nearA);
  const nearC = text({ r: -44.45, t: 100, peak: 'B' }, 'comb');
  assert.ok(nearC.includes('= 4.00\u00a0m') && !/off the beam/.test(nearC), nearC);
});

test('no wall note in the calculation: near-wall locations are plain (r=-130, t=190, peak B gives x = 0.10 m)', () => {
  const near = text({ r: -130, t: 190, peak: 'B' }, 'comb');
  assert.ok(near.includes('= 0.10\u00a0m'), near);
  assert.ok(!/wall|no arrow|off the beam/.test(near), near);
  const at = text({ r: 100, t: -150, peak: 'B' }, 'comb');
  assert.ok(at.includes('= 0.00\u00a0m'), at);
  assert.ok(!/wall|no arrow|off the beam/.test(at), at);
  const away = text({ r: 100, t: 100, peak: 'B' }, 'comb');
  assert.ok(!/the wall/.test(away), away);
  // the figure's text for the same state agrees
  assert.equal(locWords(equivalents({ r: -130, t: 190, peak: 'B' }).comb.x), 'at x = 0.10\u00a0m from A');
});

// ---- the net moment about A ------------------------------------------------------------------------
test('net moment: counterclockwise with a +, clockwise with a minus, the value in bold, and the couple keeps its moment', () => {
  assert.equal(text({ r: 100, t: 100, peak: 'B' }, 'moment'),
    'Net moment about A (counterclockwise +): M = 1.00\u00a0m × 200\u00a0N + 1.33\u00a0m × 100\u00a0N = +333.33\u00a0N·m (counterclockwise) (worked from the unrounded locations)');
  // exact: printed terms reproduce the printed value, so no note
  assert.equal(text({ r: -100, t: 0, peak: 'B' }, 'moment'),
    'Net moment about A (counterclockwise +): M = 1.00\u00a0m × (−200\u00a0N) + 1.33\u00a0m × 0\u00a0N = −200\u00a0N·m (clockwise)');
  // a couple: F = 0 but M is not
  assert.equal(text({ r: -100, t: 200, peak: 'B' }, 'moment'),
    'Net moment about A (counterclockwise +): M = 1.00\u00a0m × (−200\u00a0N) + 1.33\u00a0m × 200\u00a0N = +66.67\u00a0N·m (counterclockwise) (worked from the unrounded locations)');
  // peak A uses 0.67 m
  assert.ok(text({ r: 0, t: 90, peak: 'A' }, 'moment').includes('0.67\u00a0m × 90\u00a0N = +60\u00a0N·m (counterclockwise)'));
  // no load
  assert.equal(text({ r: 0, t: 0, peak: 'A' }, 'moment'), 'Net moment about A: there is no load, so M = 0\u00a0N·m.');
  const html = byKey(calcLines({ r: -100, t: -100, peak: 'B' }), 'moment')[0].html;
  assert.ok(html.includes('<b>−333.33\u00a0N·m</b> (clockwise)'), html);
  assert.ok(html.startsWith('<span class="c-comb"><b>Net moment about A</b></span>'), html);
  assert.ok(html.endsWith(' <span class="rnd">(worked from the unrounded locations)</span>'), 'the moment note is a span of class rnd: ' + html);
});

test('net moment over the slider grid: the printed value is momentParts(M); without the note the printed terms reproduce it', () => {
  let noted = 0, plainN = 0;
  for (const peak of ['A', 'B']) for (let r = -200; r <= 200; r += 5) for (let t = -200; t <= 200; t += 5) {
    const s = { r, t, peak };
    const e = equivalents(s);
    const m = text(s, 'moment');
    if (e.rect.F === 0 && e.tri.F === 0) { assert.ok(m.includes('there is no load'), m); continue; }
    const p = momentParts(e.M);
    assert.ok(m.includes(`= ${p.text}${p.dir ? ` (${p.dir})` : ''}`), `${r},${t},${peak}: ${m}`);
    const xTri = Number(fmtFixed(peak === 'B' ? 4 / 3 : 2 / 3));
    const again = momentParts(e.rect.F * 1 + e.tri.F * xTri).text;
    if (/unrounded/.test(m)) { noted++; assert.notEqual(again, p.text, `${r},${t},${peak}`); }
    else { plainN++; assert.equal(again, p.text, `${r},${t},${peak}`); }
  }
  assert.ok(noted > 0 && plainN > 0, `${noted} with the note, ${plainN} without`);
});
