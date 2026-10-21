import test from 'node:test';
import assert from 'node:assert/strict';
import * as detailMathModule from '../src/detail-math.js';
import { detailPlain, detailBlocks } from '../src/detail-math.js';
import { derive } from '../src/state.js';
import { panelNeedsExact } from '../src/panel.js';
import { NBSP } from '../src/format.js';
import { W_MAX, W_STEP, LOADED_L } from '../src/physics.js';
import { NUMBER, bareNumbers, plainSpaceNumbers } from './unit-rule.js';

const DEFAULT = { r: 100, t: 100, peak: 'B' };
// Write the contract with plain spaces; a number-unit gap becomes a no-break space here.
const U = (str) => str.replace(/(\d) (?=N\/m|N(?![A-Za-z/])|m(?![A-Za-z]))/g, `$1${NBSP}`);
const plainOf = (lines) => lines.map(detailPlain);
const blocksOf = (s) => Object.fromEntries(detailBlocks(s).map(b => [b.key, b]));

const GRID = [];
for (let v = -W_MAX; v <= W_MAX; v += W_STEP) GRID.push(v);
const STATES = [];
for (const r of GRID) for (const t of GRID) for (const peak of ['A', 'B']) STATES.push({ r, t, peak });

test('the placeholder export is gone and the module exports exactly detailPlain and detailBlocks', () => {
  assert.deepEqual(Object.keys(detailMathModule).sort(), ['detailBlocks', 'detailPlain']);
});

test('detailPlain strips tags and turns a subscript into _x, collapsing nothing else', () => {
  assert.equal(detailPlain('<i class="v">F</i><sub>rect</sub> = <i class="v">w</i><sub>A</sub>  ·  2'), 'F_rect = w_A  ·  2');
  assert.equal(detailPlain('a  <span class="rnd">(b)</span> c'), 'a  (b) c');
  assert.equal(detailPlain(`2${NBSP}m`), `2${NBSP}m`);
});

test('detailBlocks returns the three blocks in order with their headings and array fields', () => {
  const blocks = detailBlocks(DEFAULT);
  assert.deepEqual(blocks.map(b => b.key), ['rect', 'tri', 'comb']);
  assert.deepEqual(blocks.map(b => b.title), ['Calculating the rectangular loading', 'Calculating the triangular loading', 'Calculating the combined loading']);
  for (const b of blocks) {
    for (const f of ['setup', 'plug', 'notes']) assert.ok(Array.isArray(b[f]) && b[f].every(x => typeof x === 'string'), `${b.key}.${f}`);
    assert.ok(b.setup.length > 0 && b.plug.length > 0);
    assert.deepEqual(b.notes, [], 'no notes in the default state');
  }
  assert.ok(detailBlocks(DEFAULT)[0].setup[0].includes('<i class="v">w</i><sub>rect</sub>'));
});

test('default state: the exact contract, every line of the three blocks', () => {
  const b = blocksOf(DEFAULT);
  assert.deepEqual(plainOf(b.rect.setup), [
    "The triangle is zero at A, so the rectangle's height is the load's height at A: w_rect = w_A.",
    "The equivalent force is the area under the rectangle: F_rect = w_rect · L.",
    "It acts at the centre of the rectangle, measured from A: r_rect = ½ · L."
  ]);
  assert.deepEqual(plainOf(b.rect.plug), [
    U('w_rect = w_A = 100 N/m, L = 2 m'),
    U('F_rect = w_rect · L = 100 N/m · 2 m = 200 N'),
    U('r_rect = ½ · L = ½ · 2 m = 1.00 m')
  ]);
  assert.deepEqual(plainOf(b.tri.setup), [
    "The triangle's height is the rest of the load: w_tri = w_B − w_A.",
    "The equivalent force is the area under the triangle, half of base times height: F_tri = ½ · w_tri · L.",
    "It acts at the centroid, one third of L in from the tall end B, so measured from A: r_tri = L − ⅓ · L = ⅔ · L."
  ]);
  assert.deepEqual(plainOf(b.tri.plug), [
    U('w_A = 100 N/m, w_B = 200 N/m, L = 2 m'),
    U('w_tri = w_B − w_A = 200 N/m − 100 N/m = 100 N/m'),
    U('F_tri = ½ · w_tri · L = ½ · 100 N/m · 2 m = 100 N'),
    U('r_tri = ⅔ · L = ⅔ · 2 m = 1.33 m')
  ]);
  assert.deepEqual(plainOf(b.comb.setup), [
    'The single equivalent force replaces both loads, so it carries their total force: F_equiv = F_rect + F_tri.',
    'It must also give the same torque about A as the loads it replaces. A force F at a distance r from A gives a torque τ = r · F (downward forces positive).',
    'τ_equiv = τ_rect + τ_tri',
    'r_equiv · F_equiv = r_rect · F_rect + r_tri · F_tri',
    'Solving for the location: r_equiv = (r_rect · F_rect + r_tri · F_tri) / F_equiv.'
  ]);
  assert.deepEqual(plainOf(b.comb.plug), [
    U('F_rect = 200 N, F_tri = 100 N, r_rect = 1.00 m, r_tri = 1.33 m'),
    U('F_equiv = F_rect + F_tri = 200 N + 100 N = 300 N'),
    U('r_equiv = (r_rect · F_rect + r_tri · F_tri) / F_equiv = (1.00 m · 200 N + 1.33 m · 100 N) / 300 N = 1.11 m')
  ]);
  for (const k of ['rect', 'tri', 'comb']) assert.deepEqual(b[k].notes, []);
});

test('peak at A swaps the end names in the rectangle and triangle blocks and the plug lines', () => {
  const s = { r: 100, t: 100, peak: 'A' };            // w_A = 200, w_B = 100
  const b = blocksOf(s);
  assert.equal(detailPlain(b.rect.setup[0]), "The triangle is zero at B, so the rectangle's height is the load's height at B: w_rect = w_B.");
  assert.deepEqual(plainOf(b.rect.plug), [
    U('w_rect = w_B = 100 N/m, L = 2 m'),
    U('F_rect = w_rect · L = 100 N/m · 2 m = 200 N'),
    U('r_rect = ½ · L = ½ · 2 m = 1.00 m')
  ]);
  assert.equal(detailPlain(b.tri.setup[0]), "The triangle's height is the rest of the load: w_tri = w_A − w_B.");
  assert.equal(detailPlain(b.tri.setup[2]), 'It acts at the centroid, one third of L in from the tall end A, so measured from A: r_tri = ⅓ · L.');
  assert.deepEqual(plainOf(b.tri.plug), [
    U('w_A = 200 N/m, w_B = 100 N/m, L = 2 m'),
    U('w_tri = w_A − w_B = 200 N/m − 100 N/m = 100 N/m'),
    U('F_tri = ½ · w_tri · L = ½ · 100 N/m · 2 m = 100 N'),
    U('r_tri = ⅓ · L = ⅓ · 2 m = 0.67 m')
  ]);
  assert.deepEqual(plainOf(b.comb.plug), [
    U('F_rect = 200 N, F_tri = 100 N, r_rect = 1.00 m, r_tri = 0.67 m'),
    U('F_equiv = F_rect + F_tri = 200 N + 100 N = 300 N'),
    U('r_equiv = (r_rect · F_rect + r_tri · F_tri) / F_equiv = (1.00 m · 200 N + 0.67 m · 100 N) / 300 N = 0.89 m')
  ]);
});

test('a negative value is written in parentheses, unit inside, wherever it is an operand', () => {
  const b = blocksOf({ r: -100, t: 0, peak: 'B' });
  assert.deepEqual(plainOf(b.rect.plug), [
    U('w_rect = w_A = −100 N/m, L = 2 m'),
    U('F_rect = w_rect · L = (−100 N/m) · 2 m = −200 N'),
    U('r_rect = ½ · L = ½ · 2 m = 1.00 m')
  ]);
  const c = blocksOf({ r: 100, t: -100, peak: 'B' });  // w_A = 100, w_B = 0
  assert.deepEqual(plainOf(c.tri.plug), [
    U('w_A = 100 N/m, w_B = 0 N/m, L = 2 m'),
    U('w_tri = w_B − w_A = 0 N/m − 100 N/m = −100 N/m'),
    U('F_tri = ½ · w_tri · L = ½ · (−100 N/m) · 2 m = −100 N'),
    U('r_tri = ⅔ · L = ⅔ · 2 m = 1.33 m')
  ]);
  assert.equal(detailPlain(c.comb.plug[1]), U('F_equiv = F_rect + F_tri = 200 N + (−100 N) = 100 N'));
  const d = blocksOf({ r: -100, t: 200, peak: 'A' });  // w_A = 100, w_B = -100
  assert.equal(detailPlain(d.tri.plug[1]), U('w_tri = w_A − w_B = 100 N/m − (−100 N/m) = 200 N/m'));
  assert.equal(detailPlain(d.comb.plug[1]), U('F_equiv = F_rect + F_tri = (−200 N) + 200 N = 0 N'));
  const e = blocksOf({ r: -100, t: 200, peak: 'B' });  // F_rect -200, F_tri 200: couple
  assert.equal(detailPlain(e.comb.plug[1]), U('F_equiv = F_rect + F_tri = (−200 N) + 200 N = 0 N'));
});

test('r = 0: the rectangle block is as usual with a note that it adds no torque (same for the triangle)', () => {
  const b = blocksOf({ r: 0, t: 100, peak: 'B' });
  assert.deepEqual(plainOf(b.rect.plug), [
    U('w_rect = w_A = 0 N/m, L = 2 m'),
    U('F_rect = w_rect · L = 0 N/m · 2 m = 0 N'),
    U('r_rect = ½ · L = ½ · 2 m = 1.00 m')
  ]);
  assert.deepEqual(plainOf(b.rect.notes), [U('There is no rectangular load, so F_rect = 0 N and it adds no torque.')]);
  assert.deepEqual(b.tri.notes, []);
  assert.deepEqual(b.comb.notes, []);
  assert.deepEqual(plainOf(b.comb.plug), [
    U('F_rect = 0 N, F_tri = 100 N, r_rect = 1.00 m, r_tri = 1.33 m'),
    U('F_equiv = F_rect + F_tri = 0 N + 100 N = 100 N'),
    U('r_equiv = (r_rect · F_rect + r_tri · F_tri) / F_equiv = (1.00 m · 0 N + 1.33 m · 100 N) / 100 N = 1.33 m')
  ]);
  const c = blocksOf({ r: 100, t: 0, peak: 'B' });
  assert.deepEqual(plainOf(c.tri.notes), [U('There is no triangular load, so F_tri = 0 N and it adds no torque.')]);
  assert.equal(detailPlain(c.tri.plug[2]), U('F_tri = ½ · w_tri · L = ½ · 0 N/m · 2 m = 0 N'));
  assert.equal(detailPlain(c.comb.plug[2]), U('r_equiv = (r_rect · F_rect + r_tri · F_tri) / F_equiv = (1.00 m · 200 N + 1.33 m · 0 N) / 200 N = 1.00 m'));
  assert.deepEqual(c.rect.notes, []);
});

test('the location line: a negative rectangle force or total force is parenthesised in the numerator too', () => {
  const a = detailPlain(blocksOf({ r: -100, t: 50, peak: 'B' }).comb.plug.at(-1));   // F_rect -200, F_tri 50, total -150
  assert.ok(a.includes(U('(1.00 m · (−200 N) + 1.33 m · 50 N) / (−150 N) = ')), a);
  const b = detailPlain(blocksOf({ r: 100, t: -50, peak: 'B' }).comb.plug.at(-1));   // 200, -50, 150
  assert.ok(b.includes(U('(1.00 m · 200 N + 1.33 m · (−50 N)) / 150 N = ')), b);
  const c = detailPlain(blocksOf({ r: -100, t: -50, peak: 'A' }).comb.plug.at(-1));  // -200, -50, -250
  assert.ok(c.includes(U('(1.00 m · (−200 N) + 0.67 m · (−50 N)) / (−250 N) = ')), c);
});

test('a zero part never trips the unrounded-locations note (its location is not null in the plug)', () => {
  for (const s of [{ r: 0, t: 100, peak: 'B' }, { r: 0, t: 100, peak: 'A' }, { r: 100, t: 0, peak: 'B' }, { r: -100, t: 0, peak: 'A' }]) {
    const last = detailPlain(blocksOf(s).comb.plug.at(-1));
    assert.ok(!/unrounded/.test(last), last);
  }
});

test('equal and opposite forces: a couple note, no r_equiv line', () => {
  const b = blocksOf({ r: 100, t: -200, peak: 'B' });
  assert.deepEqual(plainOf(b.comb.plug), [
    U('F_rect = 200 N, F_tri = −200 N, r_rect = 1.00 m, r_tri = 1.33 m'),
    U('F_equiv = F_rect + F_tri = 200 N + (−200 N) = 0 N')
  ]);
  assert.deepEqual(plainOf(b.comb.notes), [U('F_equiv = 0 N: the two loads leave a couple, so no single force replaces them and there is no r_equiv.')]);
  assert.deepEqual(b.rect.notes, []);
  assert.deepEqual(b.tri.notes, []);
});

test('no load at all: a note in each block and no r_equiv line', () => {
  const b = blocksOf({ r: 0, t: 0, peak: 'B' });
  assert.deepEqual(plainOf(b.rect.notes), [U('There is no rectangular load, so F_rect = 0 N and it adds no torque.')]);
  assert.deepEqual(plainOf(b.tri.notes), [U('There is no triangular load, so F_tri = 0 N and it adds no torque.')]);
  assert.deepEqual(plainOf(b.comb.notes), [U('There is no load, so F_equiv = 0 N and there is nothing to replace.')]);
  assert.deepEqual(plainOf(b.comb.plug), [
    U('F_rect = 0 N, F_tri = 0 N'),
    U('F_equiv = F_rect + F_tri = 0 N + 0 N = 0 N')
  ]);
});

test('off the beam: the r_equiv line says where, and the unrounded note follows when the rule says so', () => {
  const left = blocksOf({ r: 100, t: -190, peak: 'B' });
  assert.ok(panelNeedsExact(derive({ r: 100, t: -190, peak: 'B' })));
  assert.equal(detailPlain(left.comb.plug[2]),
    U('r_equiv = (r_rect · F_rect + r_tri · F_tri) / F_equiv = (1.00 m · 200 N + 1.33 m · (−190 N)) / 10 N = −5.33 m (off the beam, left of the wall) (worked from the unrounded locations)'));
  assert.ok(left.comb.plug[2].endsWith(' <span class="rnd">(worked from the unrounded locations)</span>'), 'the note is a span of class rnd, the style hook');
  const beyond = blocksOf({ r: 100, t: -190, peak: 'A' });
  assert.ok(detailPlain(beyond.comb.plug[2]).includes(U('= 7.33 m (off the beam, beyond C)')), detailPlain(beyond.comb.plug[2]));
  const on = blocksOf(DEFAULT);
  assert.ok(!/off the beam|unrounded/.test(detailPlain(on.comb.plug[2])));
});

test('the unrounded note appears exactly when panelNeedsExact says so, and only on the r_equiv line', () => {
  let withNote = 0;
  for (const s of STATES) {
    const d = derive(s);
    if (d.comb.F === 0 || d.rect.F === 0 || d.tri.F === 0) continue;
    const b = blocksOf(s);
    const has = b.comb.plug.some(l => detailPlain(l).includes('(worked from the unrounded locations)'));
    assert.equal(has, panelNeedsExact(d), JSON.stringify(s));
    if (has) { withNote++; assert.ok(detailPlain(b.comb.plug.at(-1)).endsWith('(worked from the unrounded locations)')); }
  }
  assert.ok(withNote > 1000, `${withNote} states carry the note`);
});

// ---- the whole grid -------------------------------------------------------------------------------
// A minus zero is a U+2212 and a zero NOT followed by another digit or a decimal point. Numbers are followed by a
// no-break space, so the guard must not depend on the exact character after the number.
const MINUS_ZERO = /−0(\.0+)?(?![0-9.])/;
const closeTo = (printed, exact, tol, msg) => assert.ok(Math.abs(Number(printed.replace('−', '-')) - exact) <= tol + 1e-9, `${msg}: printed ${printed}, exact ${exact}`);
const lastValue = (line) => {
  const trimmed = line.replace(/ \(off the beam[^)]*\)/, '').replace(/ \(worked from the unrounded locations\)/, '');
  const m = trimmed.match(new RegExp(`= (−?[0-9.]+)${NBSP}(N|m)$`));
  assert.ok(m, `no final value in "${line}"`);
  return m;
};
const valueOf = (line, name) => {
  const m = line.match(new RegExp(`${name} = (−?[0-9.]+)${NBSP}(N|m)`));
  assert.ok(m, `${name} not in "${line}"`);
  return m;
};

test('the grid has 81 x 81 x 2 = 13122 states', () => {
  assert.equal(STATES.length, 81 * 81 * 2);
  assert.equal(STATES.length, 13122);
});

test('the minus-zero guard flags every minus zero and no real number', () => {
  for (const bad of [`−0${NBSP}N`, `−0.00${NBSP}m`, `(−0${NBSP}N)`, `= −0.0${NBSP}N/m`, '−0']) assert.ok(MINUS_ZERO.test(bad), `not flagged: ${bad}`);
  for (const good of [`0${NBSP}N`, `−0.5${NBSP}m`, `−0.05${NBSP}m`, `−10${NBSP}N`, `−100${NBSP}N`, `(−200${NBSP}N)`, `0.00${NBSP}m`]) assert.ok(!MINUS_ZERO.test(good), `flagged: ${good}`);
});

test('over the whole grid: no digit in a set-up line, the three blocks, in order', () => {
  let setupLines = 0;
  for (const s of STATES) {
    const blocks = detailBlocks(s);
    assert.deepEqual(blocks.map(b => b.key), ['rect', 'tri', 'comb']);
    for (const b of blocks) for (const line of b.setup) {
      setupLines++;
      assert.ok(!/[0-9]/.test(detailPlain(line)), `${JSON.stringify(s)} ${b.key}: ${detailPlain(line)}`);
      assert.ok(!/[0-9]/.test(line), `digit in the markup of ${line}`);
    }
  }
  assert.equal(setupLines, STATES.length * (3 + 3 + 5));
});

test('over the whole grid: the plug values equal derive(s) to the printed precision', () => {
  let forceChecks = 0, locationChecks = 0;
  for (const s of STATES) {
    const d = derive(s);
    const b = blocksOf(s);
    const at = JSON.stringify(s);
    const rect = plainOf(b.rect.plug), tri = plainOf(b.tri.plug), comb = plainOf(b.comb.plug);
    closeTo(lastValue(rect[1])[1], d.rect.F, 0.005, `F_rect ${at}`); forceChecks++;
    closeTo(valueOf(comb[0], 'F_rect')[1], d.rect.F, 0.005, `F_rect (comb) ${at}`); forceChecks++;
    closeTo(lastValue(tri[2])[1], d.tri.F, 0.005, `F_tri ${at}`); forceChecks++;
    closeTo(valueOf(comb[0], 'F_tri')[1], d.tri.F, 0.005, `F_tri (comb) ${at}`); forceChecks++;
    closeTo(lastValue(comb[1])[1], d.comb.F, 0.005, `F_equiv ${at}`); forceChecks++;
    if (d.rect.x !== null) {
      closeTo(lastValue(rect[2])[1], d.rect.x, 0.005, `r_rect ${at}`);
      closeTo(valueOf(comb[0], 'r_rect')[1], d.rect.x, 0.005, `r_rect (comb) ${at}`); locationChecks += 2;
    }
    if (d.tri.x !== null) {
      closeTo(lastValue(tri[3])[1], d.tri.x, 0.005, `r_tri ${at}`);
      closeTo(valueOf(comb[0], 'r_tri')[1], d.tri.x, 0.005, `r_tri (comb) ${at}`); locationChecks += 2;
    }
    if (d.comb.x !== null) {
      assert.equal(comb.length, 3, at);
      closeTo(lastValue(comb[2])[1], d.comb.x, 0.005, `r_equiv ${at}`); locationChecks++;
    } else {
      assert.ok(comb.length === 2 && !comb.some(l => l.startsWith('r_equiv =')), `${at}: no r_equiv line when F_equiv is 0`);
    }
  }
  assert.ok(forceChecks === STATES.length * 5 && locationChecks > 40000, `${forceChecks} force and ${locationChecks} location checks`);
});

// The printed numbers of a line, in order (a number is followed by a no-break space and its unit).
const printedNumbers = (str) => (str.match(new RegExp(`−?[0-9]+(?:\\.[0-9]+)?(?=${NBSP})`, 'g')) || []).map(v => Number(v.replace('−', '-')));

test('over the whole grid: w_A and w_B, the F_equiv operands and the r_equiv terms match derive(s), and the unrounded note is honest', () => {
  let heightChecks = 0, operandChecks = 0, termChecks = 0, withNote = 0, reproduced = 0;
  for (const s of STATES) {
    const d = derive(s);
    const b = blocksOf(s);
    const at = JSON.stringify(s);
    // w_A, w_B: derive gives F_rect = r L and F_tri = t L / 2, so the zero end's height is F_rect / L and the tall end's
    // is that plus 2 F_tri / L; peak B is tall at B.
    const wZero = d.rect.F / LOADED_L, wTall = wZero + 2 * d.tri.F / LOADED_L;
    const tri0 = plainOf(b.tri.plug)[0];
    assert.equal(printedNumbers(tri0).length, 3, `${at}: ${tri0}`);
    closeTo(valueOf(tri0, 'w_A')[1], s.peak === 'B' ? wZero : wTall, 0.005, `w_A ${at}`);
    closeTo(valueOf(tri0, 'w_B')[1], s.peak === 'B' ? wTall : wZero, 0.005, `w_B ${at}`);
    heightChecks += 2;
    // F_equiv = F_rect + F_tri = (a) + (b) = c: the operands, in order, are derive's forces, and they add up
    const sum = plainOf(b.comb.plug)[1];
    assert.equal(printedNumbers(sum).length, 3, `${at}: ${sum}`);
    const [fr, ft, fe] = printedNumbers(sum);
    assert.ok(Math.abs(fr - d.rect.F) <= 0.005 && Math.abs(ft - d.tri.F) <= 0.005 && Math.abs(fe - d.comb.F) <= 0.005, `${at}: ${sum}`);
    assert.ok(Math.abs(fr + ft - fe) <= 0.01, `${at}: the printed operands do not add to the printed sum: ${sum}`);
    operandChecks += 3;
    // r_equiv = formula = (x_rect · F_rect + x_tri · F_tri) / F_equiv = result: evaluate the printed terms
    const line = plainOf(b.comb.plug)[2];
    if (d.comb.x === null) { assert.equal(line, undefined, at); continue; }
    const parts = line.split(' = ');
    assert.ok(parts.length === 4 && parts[0] === 'r_equiv', `${at}: ${line}`);
    const terms = printedNumbers(parts[2]);
    assert.equal(terms.length, 5, `${at}: ${parts[2]}`);
    const [xr, tfr, xt, tft, tfe] = terms;
    assert.ok(Math.abs(tfr - d.rect.F) <= 0.005 && Math.abs(tft - d.tri.F) <= 0.005 && Math.abs(tfe - d.comb.F) <= 0.005, `${at}: ${parts[2]}`);
    if (d.rect.x !== null) assert.ok(Math.abs(xr - d.rect.x) <= 0.005, `${at}: ${parts[2]}`);
    if (d.tri.x !== null) assert.ok(Math.abs(xt - d.tri.x) <= 0.005, `${at}: ${parts[2]}`);
    termChecks += 5;
    const printed = printedNumbers(parts[3])[0];
    assert.ok(Math.abs(printed - d.comb.x) <= 0.005 + 1e-9, `${at}: printed r_equiv ${printed}, derive ${d.comb.x}`);
    // honesty: the printed terms, worked as printed, either give the printed result or the line says they were not
    const again = Number(((xr * tfr + xt * tft) / tfe).toFixed(2));
    const noted = line.includes('(worked from the unrounded locations)');
    assert.equal(noted, again !== printed, `${at}: terms give ${again}, printed ${printed}, note ${noted}: ${line}`);
    if (noted) withNote++; else reproduced++;
  }
  assert.equal(heightChecks, STATES.length * 2);
  assert.equal(operandChecks, STATES.length * 3);
  assert.ok(termChecks > 5 * 10000, `${termChecks} term checks`);
  assert.ok(withNote > 1000 && reproduced > 1000, `${withNote} lines with the note, ${reproduced} that reproduce`);
});

test('over the whole grid: every plug line has units on its numbers, joined by a no-break space', () => {
  let lines = 0, numbers = 0;
  for (const s of STATES) {
    for (const b of detailBlocks(s)) for (const html of [...b.plug, ...b.notes]) {
      const line = detailPlain(html);
      lines++; numbers += (line.match(NUMBER) || []).length;
      assert.deepEqual(bareNumbers(line), [], `${JSON.stringify(s)}: ${line}`);
      assert.deepEqual(plainSpaceNumbers(line), [], `${JSON.stringify(s)}: ${line}`);
      assert.ok(!line.includes('-'), `ASCII hyphen-minus in "${line}"`);
      assert.ok(!MINUS_ZERO.test(line), `a minus zero in "${line}"`);
    }
  }
  assert.ok(lines > STATES.length * 7 && numbers > STATES.length * 20, `${lines} lines, ${numbers} numbers checked`);
});

test('over the whole grid: the variable names are in the right blocks', () => {
  for (const s of STATES) {
    const d = derive(s);
    const b = blocksOf(s);
    const text = (k) => [...b[k].setup, ...b[k].plug].map(detailPlain).join('\n');
    const at = JSON.stringify(s);
    for (const n of ['F_rect', 'r_rect', 'w_rect']) assert.ok(text('rect').includes(n), `${n} in rect ${at}`);
    for (const n of ['F_tri', 'r_tri', 'w_tri']) assert.ok(text('tri').includes(n), `${n} in tri ${at}`);
    for (const n of ['w_A', 'w_B']) assert.ok(text('tri').includes(n), `${n} in tri ${at}`);
    for (const n of ['F_equiv', 'r_equiv', 'F_rect', 'F_tri', 'r_rect', 'r_tri']) assert.ok(text('comb').includes(n), `${n} in comb ${at}`);
    assert.ok(b.comb.plug.some(l => detailPlain(l).startsWith('F_equiv = ')), at);
    assert.equal(b.comb.plug.some(l => detailPlain(l).startsWith('r_equiv = ')), d.comb.x !== null, at);
    assert.ok(!/F_tri|r_tri|F_equiv|r_equiv/.test(text('rect')), `rect block names another block's variable ${at}`);
    assert.ok(!/F_rect|r_rect|F_equiv|r_equiv/.test(text('tri')), `tri block names another block's variable ${at}`);
  }
});

test('over the whole grid: the notes appear exactly for zero parts and the couple', () => {
  for (const s of STATES) {
    const d = derive(s);
    const b = blocksOf(s);
    const at = JSON.stringify(s);
    assert.equal(b.rect.notes.length, d.rect.F === 0 ? 1 : 0, at);
    assert.equal(b.tri.notes.length, d.tri.F === 0 ? 1 : 0, at);
    assert.equal(b.comb.notes.length, d.comb.F === 0 ? 1 : 0, at);
    if (d.couple) assert.ok(detailPlain(b.comb.notes[0]).includes('couple'), at);
  }
});
