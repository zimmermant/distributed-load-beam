import test from 'node:test';
import assert from 'node:assert/strict';
import { stubElement, installSvgDocument } from './stub-dom.js';
import { createScene } from '../src/scene.js';
import { COLORS } from '../src/svg.js';
import { BEAM_L, LOADED_L } from '../src/physics.js';
import { BEAM_H, TOP, COLS, topX, colX, loadShapes, forceArrow, columnOutline, columnCard } from '../src/layout.js';
import { derive } from '../src/state.js';

installSvgDocument();

function render(s) {
  const svg = stubElement('svg');
  createScene(svg).render(s);
  return { svg, scene: createScene(svg) };
}
const draw = (s) => render(s).svg;
const classes = (n) => (n.attrs.class || '').split(/\s+/).filter(Boolean);
const num = (v) => Number(v);
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg || ''} ${a} vs ${b}`);
const texts = (svg) => svg.children.filter(n => n.tag === 'text');
const walk = (n, fn) => { fn(n); n.children.forEach(c => walk(c, fn)); };

const STATES = [
  { r: 100, t: 100, peak: 'B' }, { r: 100, t: 100, peak: 'A' }, { r: -100, t: -50, peak: 'B' },
  { r: 100, t: -200, peak: 'B' }, { r: 0, t: 0, peak: 'A' }, { r: 0, t: 100, peak: 'B' },
  { r: -200, t: 0, peak: 'A' }, { r: 100, t: -190, peak: 'A' }, { r: -100, t: 100, peak: 'A' }
];

test('every graphic element carries class g (except the six card elements) and every text class t or tin', () => {
  for (const s of STATES) {
    const svg = draw(s);
    assert.ok(svg.children.length > 40, 'something was drawn');
    for (const n of svg.children) {
      if (classes(n).includes('card')) continue;
      if (n.tag === 'text') assert.ok(['t', 'tin'].includes(n.attrs.class), `${JSON.stringify(s)} text "${n.textContent}" class ${n.attrs.class}`);
      else assert.ok(classes(n).includes('g'), `${JSON.stringify(s)} <${n.tag}> class ${n.attrs.class}`);
    }
  }
});

test('four beam copies, each with a wall, four hatches, circles A B C and their letters', () => {
  const svg = draw(STATES[0]);
  const wall = svg.children.filter(n => classes(n).includes('wall'));
  assert.equal(wall.length, 4 * 5);
  assert.equal(wall.filter(n => n.tag === 'rect').length, 4);
  assert.equal(wall.filter(n => n.tag === 'line').length, 16);
  const circles = svg.children.filter(n => classes(n).includes('pc'));
  assert.equal(circles.length, 12);
  assert.ok(circles.every(n => n.tag === 'circle' && num(n.attrs.r) === BEAM_H / 2));
  const letters = texts(svg).filter(n => n.attrs.class === 'tin');
  assert.deepEqual(letters.map(n => n.textContent), ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C']);
  const beams = [[topX(0), TOP.px, TOP.beamY], [colX(0, 0), COLS.px, COLS.beamY], [colX(1, 0), COLS.px, COLS.beamY], [colX(2, 0), COLS.px, COLS.beamY]];
  const beamRects = svg.children.filter(n => n.tag === 'rect' && n.attrs.fill === COLORS.beam);
  assert.equal(beamRects.length, 4);
  beams.forEach(([x0, px, y], k) => {
    const b = beamRects[k];
    assert.deepEqual([num(b.attrs.x), num(b.attrs.y), num(b.attrs.width), num(b.attrs.height)], [x0, y, BEAM_L * px, BEAM_H], `beam ${k}`);
    [0, LOADED_L, BEAM_L].forEach((m, j) => {
      const c = circles[k * 3 + j], l = letters[k * 3 + j];
      close(num(c.attrs.cx), x0 + m * px, `circle ${k}.${j} x`);
      close(num(c.attrs.cy), y + BEAM_H / 2, `circle ${k}.${j} y`);
      close(num(l.attrs.x), num(c.attrs.cx), `letter ${k}.${j} x`);
      assert.ok(Math.abs(num(l.attrs.y) - num(c.attrs.cy)) > 0 && Math.abs(num(l.attrs.y) - num(c.attrs.cy)) <= 8, `letter ${k}.${j} sits at the circle centre`);
      assert.equal(l.attrs['text-anchor'], 'middle');
    });
    // the wall: a rect ending at the beam start, rising above and below it
    const w = wall.filter(n => n.tag === 'rect')[k];
    assert.equal(num(w.attrs.x) + num(w.attrs.width), x0);
    assert.ok(num(w.attrs.y) < y && num(w.attrs.y) + num(w.attrs.height) > y + BEAM_H);
  });
});

test('every text is at least 16 units; letters are 16 bold with no halo; other text has a halo', () => {
  for (const s of STATES) {
    for (const n of texts(draw(s))) {
      assert.ok(num(n.attrs['font-size']) >= 16, `"${n.textContent}" is ${n.attrs['font-size']}`);
      if (n.attrs.class === 'tin') {
        assert.equal(num(n.attrs['font-size']), 16);
        assert.equal(num(n.attrs['font-weight']), 700);
        assert.equal(num(n.attrs['stroke-width']), 0);
      } else {
        assert.equal(num(n.attrs['stroke-width']), 3.5);
        assert.equal(n.attrs.stroke, '#ffffff');
      }
    }
  }
});

test('no attribute is the text null, undefined or NaN, and no number is NaN', () => {
  for (const s of STATES) {
    walk(draw(s), (n) => {
      for (const [k, v] of Object.entries(n.attrs)) assert.ok(!/null|undefined|NaN/.test(v), `<${n.tag}> ${k}="${v}"`);
    });
  }
});

test('texts are all inside the viewBox and none is empty', () => {
  for (const s of STATES) for (const n of texts(draw(s))) {
    assert.ok(n.textContent.length > 0);
    assert.ok(num(n.attrs.x) >= 0 && num(n.attrs.x) <= 960 && num(n.attrs.y) >= 0 && num(n.attrs.y) <= 560, n.textContent);
  }
});

// ---- arrows ---------------------------------------------------------------------------
function arrowGroups(svg) {
  return svg.children.filter(n => n.tag === 'g' && n.children.length === 2 && n.children[0].tag === 'line' && n.children[1].tag === 'path');
}
function arrowOf(g) {
  const [line, path] = g.children;
  const m = path.attrs.d.match(/^M(\S+) (\S+) L(\S+) (\S+) L(\S+) (\S+) Z$/);
  assert.ok(m, `arrow head path: ${path.attrs.d}`);
  const [xl, yb1, xt, yTip, xr, yb2] = m.slice(1).map(Number);
  assert.equal(yb1, yb2, 'the head base is level');
  assert.equal(xt - xl, xr - xt, 'the head is symmetric');
  assert.equal(num(line.attrs.x1), xt);
  assert.equal(num(line.attrs.x2), xt);
  assert.equal(num(line.attrs.y2), yb1, 'the shaft meets the head base');
  return { x: xt, yTail: num(line.attrs.y1), yBase: yb1, yTip, half: xt - xl, color: line.attrs.stroke, fill: path.attrs.fill, width: num(line.attrs['stroke-width']) };
}

test('every arrow: tip on a beam face, tail on the outside, head toward the beam, head = min(9, 0.6 length)', () => {
  for (const s of STATES) {
    for (const g of arrowGroups(draw(s))) {
      const a = arrowOf(g);
      const top = a.width === 1.4;
      const y0 = top ? TOP.beamY : COLS.beamY;
      const down = a.yTip === y0;                       // + load: tip on the beam's top face
      assert.ok(down || a.yTip === y0 + BEAM_H, `tip ${a.yTip} is on a beam face (${y0})`);
      if (down) assert.ok(a.yTail < a.yTip && a.yBase < a.yTip, 'a down arrow comes from above');
      else assert.ok(a.yTail > a.yTip && a.yBase > a.yTip, 'an up arrow comes from below');
      const len = Math.abs(a.yTip - a.yTail);
      close(Math.abs(a.yTip - a.yBase), Math.min(9, len * 0.6), 'head length');
      assert.ok(a.half >= a.width * 1.6, `the head is wider than the shaft (${a.half})`);
      assert.equal(a.color, a.fill);
    }
  }
});

test('load arrows: same count, positions and lengths as loadShapes, drawn in the ink colour, following the sign of w', () => {
  for (const s of STATES) {
    const groups = arrowGroups(draw(s)).map(arrowOf).filter(a => a.width === 1.4);
    const want = loadShapes(s).arrows;
    assert.equal(groups.length, want.length, JSON.stringify(s));
    groups.forEach((a, i) => {
      close(a.x, want[i].x);
      close(a.yTail, want[i].yTail);
      close(a.yTip, want[i].yHead);
      assert.equal(a.color, COLORS.ink);
    });
  }
  assert.equal(arrowGroups(draw({ r: 0, t: 0, peak: 'A' })).map(arrowOf).filter(a => a.width === 1.4).length, 0);
});

test('equivalent-force arrows: fixed scale, right place, right colour, none for a zero or absent force', () => {
  const colors = [COLORS.rect, COLORS.tri, COLORS.comb];
  for (const s of STATES) {
    const d = derive(s);
    const got = arrowGroups(draw(s)).map(arrowOf).filter(a => a.width === 3.4);
    const parts = [d.rect, d.tri, d.comb];
    const want = parts.map((p, k) => ({ k, a: forceArrow(k, p.F, p.x) })).filter(w => w.a);
    assert.equal(got.length, want.length, JSON.stringify(s));
    got.forEach((a, i) => {
      const w = want[i];
      close(a.x, w.a.x);
      close(Math.abs(a.yTip - a.yTail), COLS.fs * Math.abs(parts[w.k].F), 'length is fs·|F|');
      assert.equal(a.color, colors[w.k]);
      assert.equal(a.yTip, parts[w.k].F > 0 ? COLS.beamY : COLS.beamY + BEAM_H);
    });
  }
  // the couple has no combined arrow; r=0,t=0 has none at all
  assert.equal(arrowGroups(draw({ r: 100, t: -200, peak: 'B' })).map(arrowOf).filter(a => a.width === 3.4).length, 2);
  assert.equal(arrowGroups(draw({ r: 0, t: 0, peak: 'B' })).map(arrowOf).filter(a => a.width === 3.4).length, 0);
});

// ---- load shapes ------------------------------------------------------------------------
test('the load shapes: rectangle and triangle, translucent, dashed, absent at zero, apex at the peak end', () => {
  for (const s of STATES) {
    const svg = draw(s);
    const rects = svg.children.filter(n => n.tag === 'rect' && n.attrs.fill === COLORS.rect && !classes(n).includes('card'));
    const paths = svg.children.filter(n => n.tag === 'path' && n.attrs.fill === COLORS.tri && !classes(n).includes('card'));
    const want = loadShapes(s);
    assert.equal(rects.length, want.rect ? 1 : 0, JSON.stringify(s));
    assert.equal(paths.length, want.tri ? 1 : 0, JSON.stringify(s));
    if (want.rect) {
      const n = rects[0];
      assert.deepEqual([num(n.attrs.x), num(n.attrs.y), num(n.attrs.width), num(n.attrs.height)], [want.rect.x, want.rect.y, want.rect.w, want.rect.h]);
      assert.ok(num(n.attrs['fill-opacity']) > 0 && num(n.attrs['fill-opacity']) <= 0.5);
      assert.ok(n.attrs['stroke-dasharray']);
    }
    if (want.tri) {
      const n = paths[0];
      const m = n.attrs.d.match(/^M(\S+) (\S+) L(\S+) (\S+) L(\S+) (\S+) Z$/);
      assert.ok(m, n.attrs.d);
      assert.deepEqual(m.slice(1).map(Number), want.tri.pts.flat());
      assert.ok(num(n.attrs['fill-opacity']) > 0 && num(n.attrs['fill-opacity']) <= 0.5);
      assert.ok(n.attrs['stroke-dasharray']);
    }
  }
});

// ---- text -------------------------------------------------------------------------------
const byText = (svg) => Object.fromEntries(texts(svg).map(n => [n.textContent, n]));

test('top text block: heading, rectangular, triangular on two lines, sign note, all at TOP.textX', () => {
  const t = byText(draw({ r: 100, t: 100, peak: 'B' }));
  const rows = [['Actual load on AB', COLORS.ink, '700', -28], ['Rectangular: 100\u00a0N/m', COLORS.rect, '400', -6],
    ['Triangular:', COLORS.tri, '400', 16], ['peak 100\u00a0N/m at B', COLORS.tri, '400', 38], ['(+ down, − up)', COLORS.ink, '400', 60]];
  for (const [str, fill, weight, dy] of rows) {
    assert.ok(t[str], `missing "${str}"`);
    assert.equal(num(t[str].attrs.x), TOP.textX, str);
    assert.equal(num(t[str].attrs.y), TOP.beamY + dy, str);
    assert.equal(t[str].attrs.fill, fill, str);
    assert.equal(t[str].attrs['font-weight'], weight, str);
  }
  assert.equal(t['(+ down, − up)'].attrs.opacity, '0.7');
  const a = byText(draw({ r: -200, t: -15, peak: 'A' }));
  assert.ok(a['Rectangular: −200\u00a0N/m'] && a['Triangular:'] && a['peak −15\u00a0N/m at A']);
});

test('dimension texts sit under AB and BC, and BC is dimmed', () => {
  const t = byText(draw(STATES[0]));
  const ab = t['AB = 2\u00a0m (loaded)'], bc = t['BC = 2\u00a0m (no load)'];
  assert.ok(ab && bc);
  assert.equal(num(ab.attrs.x), (topX(0) + topX(LOADED_L)) / 2);
  assert.equal(num(bc.attrs.x), (topX(LOADED_L) + topX(BEAM_L)) / 2);
  assert.equal(num(ab.attrs.y), TOP.dimTextY);
  assert.equal(ab.attrs['text-anchor'], 'middle');
  assert.equal(bc.attrs.opacity, '0.6');
  assert.equal(ab.attrs.opacity, undefined);
});

// the three text lines of every column, in order, as [text, x, y, fill, weight]
function columnTexts(svg) {
  return texts(svg).filter(n => n.attrs.class === 't' && COLS.textY.includes(num(n.attrs.y)));
}

test('column texts: name, force and location at COLS.x[k] + the text pad on the three text rows', () => {
  const svg = draw({ r: 100, t: 100, peak: 'B' });
  const got = columnTexts(svg).map(n => [n.textContent, num(n.attrs.x), num(n.attrs.y), n.attrs.fill, n.attrs['font-weight']]);
  const want = [];
  [['Rectangular', '200\u00a0N down', 'at x = 1.00\u00a0m from A', COLORS.rect], ['Triangular', '100\u00a0N down', 'at x = 1.33\u00a0m from A', COLORS.tri],
    ['Combined', '300\u00a0N down', 'at x = 1.11\u00a0m from A', COLORS.comb]].forEach(([a, b, c, color], k) => {
    const x = COLS.x[k] + 8;
    want.push([a, x, COLS.textY[0], color, '700'], [b, x, COLS.textY[1], color, '700'], [c, x, COLS.textY[2], COLORS.ink, '400']);
  });
  assert.deepEqual(got, want);
});

test('column texts: up forces, a zero part, a couple, and no load', () => {
  const third = (s) => columnTexts(draw(s)).filter(n => num(n.attrs.y) === COLS.textY[2]).map(n => n.textContent);
  const second = (s) => columnTexts(draw(s)).filter(n => num(n.attrs.y) === COLS.textY[1]).map(n => n.textContent);
  assert.deepEqual(second({ r: -100, t: -50, peak: 'B' }), ['200\u00a0N up', '50\u00a0N up', '250\u00a0N up']);
  assert.deepEqual(third({ r: 0, t: 100, peak: 'B' }), ['no load of this kind', 'at x = 1.33\u00a0m from A', 'at x = 1.33\u00a0m from A']);
  assert.deepEqual(third({ r: 100, t: 0, peak: 'B' }), ['at x = 1.00\u00a0m from A', 'no load of this kind', 'at x = 1.00\u00a0m from A']);
  assert.deepEqual(third({ r: 100, t: -200, peak: 'B' }), ['at x = 1.00\u00a0m from A', 'at x = 1.33\u00a0m from A', 'the parts cancel: no single force']);
  assert.deepEqual(second({ r: 100, t: -200, peak: 'B' }), ['200\u00a0N down', '200\u00a0N up', '0\u00a0N']);
  assert.deepEqual(third({ r: 0, t: 0, peak: 'A' }), ['no load of this kind', 'no load of this kind', 'no load']);
  assert.deepEqual(second({ r: 0, t: 0, peak: 'A' }), ['0\u00a0N', '0\u00a0N', '0\u00a0N']);
  assert.deepEqual(third({ r: 100, t: -190, peak: 'B' }).slice(2), ['at x = −5.33\u00a0m from A (off the beam)']);
});

test('the columns are named Rectangular, Triangular and Combined', () => {
  const names = columnTexts(draw(STATES[0])).filter(n => num(n.attrs.y) === COLS.textY[0]).map(n => n.textContent);
  assert.deepEqual(names, ['Rectangular', 'Triangular', 'Combined']);
});

test('no text ever contains -0, NaN, Infinity or a hyphen-minus before a digit', () => {
  const V = [-200, -195, -190, -100, -15, 0, 15, 100, 195, 200];
  for (const peak of ['A', 'B']) for (const r of V) for (const t of V) {
    for (const n of texts(draw({ r, t, peak }))) {
      assert.ok(!/-0|NaN|Infinity|-\d|undefined|null/.test(n.textContent), `${r},${t},${peak}: "${n.textContent}"`);
    }
  }
});

test('render clears the figure first: a second render replaces, never adds', () => {
  const svg = stubElement('svg');
  const scene = createScene(svg);
  scene.render(STATES[0]);
  const n = svg.children.length;
  scene.render(STATES[0]);
  assert.equal(svg.children.length, n);
  scene.render(STATES[4]);
  assert.equal(svg.children.length, draw(STATES[4]).children.length);
});

test('a combined force that acts at the wall gets its arrow, drawn at the wall end, and plain text', () => {
  for (const s of [{ r: 100, t: -150, peak: 'B' }, { r: -100, t: 150, peak: 'B' }]) {
    const svg = draw(s);
    const arrows = arrowGroups(svg).map(arrowOf).filter(a => a.width === 3.4);
    assert.equal(arrows.length, 3, 'rectangle, triangle and combined all have arrows');
    const comb = arrows.filter(a => a.color === COLORS.comb);
    assert.equal(comb.length, 1);
    assert.equal(comb[0].x, colX(2, 0));
    const third = columnTexts(svg).filter(n => num(n.attrs.y) === COLS.textY[2] && num(n.attrs.x) === COLS.x[2] + COLS.textPad);
    assert.equal(third[0].textContent, 'at x = 0.00\u00a0m from A');
  }
});

test('a combined force just off the wall (x = 0.10 m) gets its arrow and plain text', () => {
  const svg = draw({ r: -130, t: 190, peak: 'B' });
  const arrows = arrowGroups(svg).map(arrowOf).filter(a => a.width === 3.4);
  assert.equal(arrows.length, 3);
  const comb = arrows.filter(a => a.color === COLORS.comb);
  assert.equal(comb.length, 1);
  const x = derive({ r: -130, t: 190, peak: 'B' }).comb.x;
  assert.ok(x > 0.09 && x < 0.11, `x ${x}`);
  assert.equal(comb[0].x, colX(2, x));
  const third = columnTexts(svg).filter(n => num(n.attrs.y) === COLS.textY[2] && num(n.attrs.x) === COLS.x[2] + COLS.textPad);
  assert.equal(third[0].textContent, 'at x = 0.10\u00a0m from A');
});

test('no text in the figure says "wall" or "no arrow" for any slider state (full sweep, counted)', () => {
  let states = 0, wallStates = 0;
  for (const peak of ['A', 'B']) for (let r = -200; r <= 200; r += 5) for (let t = -200; t <= 200; t += 5) {
    const s = { r, t, peak };
    const d = derive(s);
    states++;
    if (d.comb.x !== null && d.comb.x >= 0 && d.comb.x < 0.12) wallStates++;
    for (const n of texts(draw(s))) assert.ok(!/wall|no arrow/i.test(n.textContent), `${r},${t},${peak}: "${n.textContent}"`);
  }
  assert.equal(states, 2 * 81 * 81);
  assert.ok(wallStates >= 4, `only ${wallStates} states put the combined force within 0.12\u00a0m of the wall`);
});

// ---- dotted outlines of the load in the three columns ----------------------------------------
const outlines = (svg) => svg.children.filter(n => classes(n).includes('outline'));
const COLUMN_COLORS = [COLORS.rect, COLORS.tri, COLORS.comb];

test('outlines: dotted, unfilled, round-capped, in the column colour, class "g outline", a closed path', () => {
  const svg = draw(STATES[0]);
  const o = outlines(svg);
  assert.equal(o.length, 3);
  assert.deepEqual(o.map(n => n.attrs.stroke), COLUMN_COLORS);
  for (const n of o) {
    assert.equal(n.tag, 'path');
    assert.equal(n.attrs.class, 'g outline');
    assert.equal(n.attrs['stroke-dasharray'], '2 4');
    assert.equal(n.attrs['stroke-width'], '1.8');
    assert.equal(n.attrs['stroke-linecap'], 'round');
    assert.equal(n.attrs.fill, 'none');
    assert.match(n.attrs.d, /^M\S+ \S+( L\S+ \S+){2,3} Z$/);
  }
});

test('outlines: the path points are exactly the layout polygons of that column', () => {
  for (const s of STATES) {
    const o = outlines(draw(s));
    const want = [0, 1, 2].flatMap(k => columnOutline(k, s).map(poly => ({ k, poly })));
    assert.equal(o.length, want.length, JSON.stringify(s));
    o.forEach((n, i) => {
      const got = n.attrs.d.replace(/^M/, '').replace(/ Z$/, '').split(' L').map(p => p.split(' ').map(Number));
      assert.deepEqual(got, want[i].poly, JSON.stringify(s));
      assert.equal(n.attrs.stroke, COLUMN_COLORS[want[i].k]);
    });
  }
});

test('outlines: none for a zero load; a lone rectangle or triangle draws its own and the combined one', () => {
  assert.equal(outlines(draw({ r: 0, t: 0, peak: 'A' })).length, 0);
  const rectOnly = outlines(draw({ r: 100, t: 0, peak: 'B' }));
  assert.deepEqual(rectOnly.map(n => n.attrs.stroke), [COLORS.rect, COLORS.comb]);
  const triOnly = outlines(draw({ r: 0, t: -100, peak: 'A' }));
  assert.deepEqual(triOnly.map(n => n.attrs.stroke), [COLORS.tri, COLORS.comb]);
});

test('outlines: the default state draws exactly 3, a sign-changing net load exactly 4 (1 + 1 + 2)', () => {
  assert.equal(outlines(draw({ r: 100, t: 100, peak: 'B' })).length, 3);
  const four = outlines(draw({ r: 100, t: -200, peak: 'B' }));
  assert.equal(four.length, 4);
  assert.deepEqual(four.map(n => n.attrs.stroke), [COLORS.rect, COLORS.tri, COLORS.comb, COLORS.comb]);
});

test('outlines: each is drawn after its column beam and before its column arrow (the arrow is on top)', () => {
  for (const s of [STATES[0], STATES[3], STATES[8]]) {
    const svg = draw(s);
    const kids = svg.children;
    const beams = kids.map((n, i) => [n, i]).filter(([n]) => n.tag === 'rect' && n.attrs.fill === COLORS.beam).map(([, i]) => i);
    assert.equal(beams.length, 4);
    let checked = 0;
    for (let k = 0; k < 3; k++) {
      const mine = kids.map((n, i) => [n, i]).filter(([n]) => classes(n).includes('outline') && n.attrs.stroke === COLUMN_COLORS[k]).map(([, i]) => i);
      const arrow = kids.findIndex(n => n.tag === 'g' && n.children[0] && n.children[0].attrs['stroke-width'] === '3.4' && n.children[0].attrs.stroke === COLUMN_COLORS[k]);
      for (const i of mine) {
        assert.ok(i > beams[k + 1], `column ${k} outline after its beam`);
        if (arrow >= 0) assert.ok(i < arrow, `column ${k} outline before its arrow`);
        checked++;
      }
    }
    assert.equal(checked, outlines(svg).length);
    assert.ok(checked >= 3);
  }
});

test('outlines: the default state has an arrow inside each outline (by design) and each column has one arrow after its outline', () => {
  const svg = draw(STATES[0]);
  const arrows = arrowGroups(svg).map(arrowOf).filter(a => a.width === 3.4);
  assert.equal(arrows.length, 3);
  for (const k of [0, 1, 2]) {
    const poly = columnOutline(k, STATES[0])[0];
    const xs = poly.map(p => p[0]);
    assert.ok(arrows[k].x > Math.min(...xs) && arrows[k].x < Math.max(...xs), `arrow ${k} lies between the outline's ends`);
  }
});

// ---- the card and heading band of each equivalent-force column ----------------------------------
const cardsOf = (svg) => svg.children.filter(n => classes(n).includes('card'));
const COLUMN_TEXT_X = [0, 1, 2].map(k => COLS.x[k] + COLS.textPad);

test('cards: exactly 3 cards and 3 bands for every state, none of them class g, all class card', () => {
  for (const s of STATES) {
    const c = cardsOf(draw(s));
    assert.equal(c.length, 6, JSON.stringify(s));
    assert.equal(c.filter(n => n.tag === 'rect').length, 3);
    assert.equal(c.filter(n => n.tag === 'path').length, 3);
    for (const n of c) assert.deepEqual(classes(n), ['card']);
  }
  const svg = draw(STATES[0]);
  assert.equal(svg.children.filter(n => n.tag !== 'text' && !classes(n).includes('g') && !classes(n).includes('card')).length, 0);
});

test('cards: the framed card is the column geometry, tinted in the column colour (fill 0.05, stroke 0.45, width 1.5, rx 8)', () => {
  const rects = cardsOf(draw(STATES[0])).filter(n => n.tag === 'rect');
  assert.equal(rects.length, 3);
  rects.forEach((n, k) => {
    const c = columnCard(k);
    assert.deepEqual([num(n.attrs.x), num(n.attrs.y), num(n.attrs.width), num(n.attrs.height), num(n.attrs.rx)], [c.x, c.y, c.w, c.h, c.rx]);
    assert.equal(n.attrs.fill, COLUMN_COLORS[k]);
    assert.equal(n.attrs['fill-opacity'], '0.05');
    assert.equal(n.attrs.stroke, COLUMN_COLORS[k]);
    assert.equal(n.attrs['stroke-opacity'], '0.45');
    assert.equal(n.attrs['stroke-width'], '1.5');
  });
  assert.deepEqual([num(rects[0].attrs.x), num(rects[1].attrs.x), num(rects[2].attrs.x)], [16, 326, 636]);
});

test('cards: the heading band spans the card width over the first 74 units, fill 0.12, no stroke, top corners rounded and bottom corners square', () => {
  const bands = cardsOf(draw(STATES[0])).filter(n => n.tag === 'path');
  assert.equal(bands.length, 3);
  bands.forEach((n, k) => {
    const c = columnCard(k);
    assert.equal(n.attrs.fill, COLUMN_COLORS[k]);
    assert.equal(n.attrs['fill-opacity'], '0.12');
    assert.ok(n.attrs.stroke === undefined || n.attrs.stroke === 'none', 'no stroke');
    const r = c.rx, x1 = c.x + c.w, y1 = c.y + c.headH;
    assert.equal(n.attrs.d, `M${c.x} ${c.y + r} A${r} ${r} 0 0 1 ${c.x + r} ${c.y} H${x1 - r} A${r} ${r} 0 0 1 ${x1} ${c.y + r} V${y1} H${c.x} Z`);
    assert.equal((n.attrs.d.match(/A/g) || []).length, 2, 'exactly the two top corners are arcs');
  });
});

test('cards: draw order per column is card, band, beam copy, outlines, arrow, texts (the card never hides content)', () => {
  for (const s of [STATES[0], STATES[3], STATES[8]]) {
    const kids = draw(s).children;
    const at = (pred) => kids.map((n, i) => [n, i]).filter(([n]) => pred(n)).map(([, i]) => i);
    const cardIx = at(n => n.tag === 'rect' && classes(n).includes('card'));
    const bandIx = at(n => n.tag === 'path' && classes(n).includes('card'));
    const beamIx = at(n => n.tag === 'rect' && n.attrs.fill === COLORS.beam).slice(1);   // the first is the top figure's
    assert.equal(cardIx.length, 3);
    assert.equal(beamIx.length, 3);
    for (let k = 0; k < 3; k++) {
      assert.equal(bandIx[k], cardIx[k] + 1, `column ${k}: the band directly follows its card`);
      assert.equal(beamIx[k], cardIx[k] + 2, `column ${k}: the beam copy directly follows the band`);
      const end = k < 2 ? cardIx[k + 1] : kids.length;
      const mine = kids.map((n, i) => [n, i]).filter(([, i]) => i > cardIx[k] && i < end);
      const first = (pred) => { const f = mine.find(([n]) => pred(n)); return f ? f[1] : -1; };
      const out = mine.filter(([n]) => classes(n).includes('outline')).map(([, i]) => i);
      const arrow = first(n => n.tag === 'g' && n.children[0] && n.children[0].attrs['stroke-width'] === '3.4');
      const txt = mine.filter(([n]) => n.tag === 'text' && n.attrs.class === 't').map(([, i]) => i);
      assert.equal(txt.length, 3, `column ${k}: three heading lines`);
      for (const i of out) assert.ok(i > beamIx[k], 'outline after the beam');
      if (arrow >= 0) {
        for (const i of out) assert.ok(i < arrow, 'outline before the arrow');
        for (const i of txt) assert.ok(i > arrow, 'text after the arrow');
      }
      for (const i of txt) assert.ok(i > Math.max(...out, beamIx[k]), 'text after outlines and beam');
      // nothing of the column comes before its own card
      assert.ok(cardIx[k] < beamIx[k]);
    }
  }
});

test('cards: each card is the first thing of its column: nothing with a column x in that column is drawn before it', () => {
  const kids = draw(STATES[0]).children;
  const firstCol = kids.findIndex(n => n.tag === 'rect' && classes(n).includes('card'));
  assert.ok(firstCol > 0);
  const before = kids.slice(0, firstCol);
  assert.ok(before.every(n => !(n.tag === 'rect' && n.attrs.fill === COLORS.beam && num(n.attrs.y) === COLS.beamY)), 'no column beam before the first card');
  assert.ok(before.every(n => n.tag !== 'text' || !COLS.textY.includes(num(n.attrs.y))), 'no column text before the first card');
});

test('cards: the heading texts are left-padded: x = COLS.x[k] + 8, on the three baselines, every state', () => {
  for (const s of STATES) {
    const t = columnTexts(draw(s));
    assert.equal(t.length, 9, JSON.stringify(s));
    // columnTexts is in document order: column 0 rows 0-2, column 1 rows 0-2, column 2 rows 0-2
    for (let k = 0; k < 3; k++) {
      const col = t.slice(k * 3, k * 3 + 3);
      assert.deepEqual(col.map(n => num(n.attrs.x)), [COLUMN_TEXT_X[k], COLUMN_TEXT_X[k], COLUMN_TEXT_X[k]]);
      assert.deepEqual(col.map(n => num(n.attrs.y)), COLS.textY);
    }
  }
});
