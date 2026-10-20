import test from 'node:test';
import assert from 'node:assert/strict';
import { stubElement, installSvgDocument } from './stub-dom.js';
import { createScene } from '../src/scene.js';
import { COLORS } from '../src/svg.js';
import { BEAM_L, LOADED_L } from '../src/physics.js';
import { BEAM_H, TOP, COLS, topX, colX, loadShapes, forceArrow } from '../src/layout.js';
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

test('every graphic element carries class g and every text class t or tin', () => {
  for (const s of STATES) {
    const svg = draw(s);
    assert.ok(svg.children.length > 40, 'something was drawn');
    for (const n of svg.children) {
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
    const rects = svg.children.filter(n => n.tag === 'rect' && n.attrs.fill === COLORS.rect);
    const paths = svg.children.filter(n => n.tag === 'path' && n.attrs.fill === COLORS.tri);
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
  const rows = [['Actual load on AB', COLORS.ink, '700', -28], ['Rectangular: 100 N/m', COLORS.rect, '400', -6],
    ['Triangular:', COLORS.tri, '400', 16], ['peak 100 N/m at B', COLORS.tri, '400', 38], ['(+ down, − up)', COLORS.ink, '400', 60]];
  for (const [str, fill, weight, dy] of rows) {
    assert.ok(t[str], `missing "${str}"`);
    assert.equal(num(t[str].attrs.x), TOP.textX, str);
    assert.equal(num(t[str].attrs.y), TOP.beamY + dy, str);
    assert.equal(t[str].attrs.fill, fill, str);
    assert.equal(t[str].attrs['font-weight'], weight, str);
  }
  assert.equal(t['(+ down, − up)'].attrs.opacity, '0.7');
  const a = byText(draw({ r: -200, t: -15, peak: 'A' }));
  assert.ok(a['Rectangular: −200 N/m'] && a['Triangular:'] && a['peak −15 N/m at A']);
});

test('dimension texts sit under AB and BC, and BC is dimmed', () => {
  const t = byText(draw(STATES[0]));
  const ab = t['AB = 2 m (loaded)'], bc = t['BC = 2 m (no load)'];
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

test('column texts: name, force and location at COLS.x[k] on the three text rows', () => {
  const svg = draw({ r: 100, t: 100, peak: 'B' });
  const got = columnTexts(svg).map(n => [n.textContent, num(n.attrs.x), num(n.attrs.y), n.attrs.fill, n.attrs['font-weight']]);
  const want = [];
  [['Rectangular', '200 N down', 'at x = 1.00 m from A', COLORS.rect], ['Triangular', '100 N down', 'at x = 1.33 m from A', COLORS.tri],
    ['Combined', '300 N down', 'at x = 1.11 m from A', COLORS.comb]].forEach(([a, b, c, color], k) => {
    want.push([a, COLS.x[k], COLS.textY[0], color, '700'], [b, COLS.x[k], COLS.textY[1], color, '700'], [c, COLS.x[k], COLS.textY[2], COLORS.ink, '400']);
  });
  assert.deepEqual(got, want);
});

test('column texts: up forces, a zero part, a couple, and no load', () => {
  const third = (s) => columnTexts(draw(s)).filter(n => num(n.attrs.y) === COLS.textY[2]).map(n => n.textContent);
  const second = (s) => columnTexts(draw(s)).filter(n => num(n.attrs.y) === COLS.textY[1]).map(n => n.textContent);
  assert.deepEqual(second({ r: -100, t: -50, peak: 'B' }), ['200 N up', '50 N up', '250 N up']);
  assert.deepEqual(third({ r: 0, t: 100, peak: 'B' }), ['no load of this kind', 'at x = 1.33 m from A', 'at x = 1.33 m from A']);
  assert.deepEqual(third({ r: 100, t: 0, peak: 'B' }), ['at x = 1.00 m from A', 'no load of this kind', 'at x = 1.00 m from A']);
  assert.deepEqual(third({ r: 100, t: -200, peak: 'B' }), ['at x = 1.00 m from A', 'at x = 1.33 m from A', 'the parts cancel: no single force']);
  assert.deepEqual(second({ r: 100, t: -200, peak: 'B' }), ['200 N down', '200 N up', '0 N']);
  assert.deepEqual(third({ r: 0, t: 0, peak: 'A' }), ['no load of this kind', 'no load of this kind', 'no load']);
  assert.deepEqual(second({ r: 0, t: 0, peak: 'A' }), ['0 N', '0 N', '0 N']);
  assert.deepEqual(third({ r: 100, t: -190, peak: 'B' }).slice(2), ['at x = −5.33 m from A (off the beam)']);
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

test('a combined force that acts at the wall gets no arrow, and its text says so', () => {
  for (const s of [{ r: 100, t: -150, peak: 'B' }, { r: -100, t: 150, peak: 'B' }]) {
    const svg = draw(s);
    const arrows = arrowGroups(svg).map(arrowOf).filter(a => a.width === 3.4);
    assert.equal(arrows.length, 2, 'only the rectangle and the triangle have arrows');
    assert.ok(arrows.every(a => a.color !== COLORS.comb));
    const third = columnTexts(svg).filter(n => num(n.attrs.y) === COLS.textY[2] && num(n.attrs.x) === COLS.x[2]);
    assert.equal(third[0].textContent, 'at x = 0.00 m from A (at the wall)');
  }
});
