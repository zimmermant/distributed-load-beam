import test from 'node:test';
import assert from 'node:assert/strict';
import { stubElement, installSvgDocument } from './stub-dom.js';
import * as detailSceneModule from '../src/detail-scene.js';
import { createDetailScene } from '../src/detail-scene.js';
import { DETAIL, detailX, detailOutline, detailArrows, detailLabels } from '../src/detail-layout.js';
import { COLORS } from '../src/svg.js';
import { BEAM_H } from '../src/layout.js';
import { LOADED_L } from '../src/physics.js';
import { NBSP } from '../src/format.js';

installSvgDocument();

const DEFAULT = { r: 100, t: 100, peak: 'B' };
const SIGN_CHANGE = { r: -100, t: 200, peak: 'B' };
const ZERO = { r: 0, t: 0, peak: 'A' };
const XB = DETAIL.x0 + LOADED_L * DETAIL.px;

function draw(s) {
  const svg = stubElement('svg');
  createDetailScene(svg).render(s);
  return svg;
}
const classes = (n) => (n.attrs.class || '').split(/\s+/).filter(Boolean);
const walk = (n, fn) => { fn(n); n.children.forEach(c => walk(c, fn)); };
const count = (n) => { let k = 0; walk(n, () => { k++; }); return k; };
// a text node's full text: its own text plus its tspans' (what the DOM's textContent gives)
const full = (n) => n.textContent + n.children.map(full).join('');
const direct = (svg, tag, cls) => svg.children.filter(n => n.tag === tag && classes(n).includes(cls));
const labelsOf = (svg) => svg.children.filter(n => n.tag === 'text' && n.attrs.class === 't' && n.attrs['font-size'] === '20');

// the slider grid: r, t from -200 to 200 step 5, both peaks
const GRID = [];
for (let r = -200; r <= 200; r += 5) {
  for (let t = -200; t <= 200; t += 5) {
    for (const peak of ['A', 'B']) GRID.push({ r, t, peak });
  }
}

test('the Task 2 placeholder export is gone', () => {
  assert.equal('DETAIL_SCENE_READY' in detailSceneModule, false);
});

test('default state: one outline, eight arrows, two leaders, two dots, two labels', () => {
  const svg = draw(DEFAULT);
  const outlines = direct(svg, 'path', 'g');
  assert.equal(outlines.length, 1);
  assert.equal(outlines[0].attrs.stroke, COLORS.ink);
  assert.equal(outlines[0].attrs['stroke-width'], '2');
  assert.equal(outlines[0].attrs.fill, COLORS.ink);
  assert.equal(outlines[0].attrs['fill-opacity'], '0.1');
  // the arrow groups, plus the one dimension-line group
  assert.equal(detailArrows(DEFAULT).length, 8);
  assert.equal(direct(svg, 'g', 'g').length, 8 + 1);
  assert.equal(direct(svg, 'line', 'leader').length, 2);
  assert.equal(direct(svg, 'circle', 'dot').length, 2);
  assert.equal(labelsOf(svg).length, 2);
});

test('arrows are drawn ink, width 1.4, as the main page draws its net arrows', () => {
  const svg = draw(DEFAULT);
  const arrows = direct(svg, 'g', 'g').filter(g => g.children.length === 2 && g.children[1].tag === 'path');
  assert.equal(arrows.length, 8);
  for (const a of arrows) {
    assert.equal(a.children[0].attrs.stroke, COLORS.ink);
    assert.equal(a.children[0].attrs['stroke-width'], '1.4');
    assert.equal(a.children[1].attrs.fill, COLORS.ink);
  }
});

test('leaders: dotted 3 3, green, width 1.4, endpoints from detailLabels; dots at each edge, r 3.5, green', () => {
  const svg = draw(DEFAULT);
  const lab = detailLabels(DEFAULT);
  const leaders = direct(svg, 'line', 'leader');
  for (const [node, l] of [[leaders[0], lab.a.leader], [leaders[1], lab.b.leader]]) {
    assert.equal(node.attrs['stroke-dasharray'], '3 3');
    assert.equal(node.attrs.stroke, COLORS.comb);
    assert.equal(node.attrs['stroke-width'], '1.4');
    assert.deepEqual(classes(node), ['g', 'leader']);
    for (const k of ['x1', 'y1', 'x2', 'y2']) assert.equal(Number(node.attrs[k]), l[k], k);
  }
  const dots = direct(svg, 'circle', 'dot');
  for (const [node, e] of [[dots[0], lab.a.edge], [dots[1], lab.b.edge]]) {
    assert.equal(node.attrs.r, '3.5');
    assert.equal(node.attrs.fill, COLORS.comb);
    assert.equal(Number(node.attrs.cx), e.x);
    assert.equal(Number(node.attrs.cy), e.y);
  }
});

test('the outline is one closed path through both coordinates of every corner: M x y L x y ... Z', () => {
  for (const s of [DEFAULT, SIGN_CHANGE, { r: 0, t: 100, peak: 'B' }]) {
    const svg = draw(s);
    const paths = direct(svg, 'path', 'g');
    const polys = detailOutline(s);
    assert.equal(paths.length, polys.length);
    polys.forEach((poly, i) => {
      assert.equal(paths[i].attrs.d, `M${poly.map(p => `${p[0]} ${p[1]}`).join(' L')} Z`);
    });
  }
});

test('leaders and dots end at the outline corner, also when the label is held clear of the beam and the leader slopes', () => {
  for (const s of [{ r: 10, t: 0, peak: 'B' }, { r: -10, t: 0, peak: 'B' }, { r: 0, t: 0, peak: 'A' }, { r: 5, t: -5, peak: 'B' }]) {
    const svg = draw(s);
    const lab = detailLabels(s);
    const leaders = direct(svg, 'line', 'leader');
    const dots = direct(svg, 'circle', 'dot');
    for (const [i, side] of [[0, lab.a], [1, lab.b]]) {
      for (const k of ['x1', 'y1', 'x2', 'y2']) assert.equal(Number(leaders[i].attrs[k]), side.leader[k], `${JSON.stringify(s)} leader ${i} ${k}`);
      assert.equal(Number(dots[i].attrs.cx), side.edge.x);
      assert.equal(Number(dots[i].attrs.cy), side.edge.y, `${JSON.stringify(s)} dot ${i} sits on the outline corner, not at the label`);
    }
  }
  const lab = detailLabels({ r: 10, t: 0, peak: 'B' });
  assert.notEqual(lab.a.leader.y1, lab.a.leader.y2, 'the clamped leader of A slopes');
  assert.notEqual(lab.b.leader.y1, lab.b.leader.y2, 'the clamped leader of B slopes');
});

test('labels: w, subscript tspan (16, lowered 5), value tspan (raised back); text size 20 bold green; anchors and y from detailLabels', () => {
  const svg = draw(DEFAULT);
  const lab = detailLabels(DEFAULT);
  const [la, lb] = labelsOf(svg);
  assert.equal(full(la), `wA = 100${NBSP}N/m`);
  assert.equal(full(lb), `wB = 200${NBSP}N/m`); // default: rectangle 100 + triangle peaking 100 at B
  assert.equal(full(la), 'wA = 100 N/m');
  for (const [node, l] of [[la, lab.a], [lb, lab.b]]) {
    assert.equal(node.attrs['font-size'], '20');
    assert.equal(node.attrs['font-weight'], '700');
    assert.equal(node.attrs.fill, COLORS.comb);
    assert.equal(node.attrs['text-anchor'], l.anchor);
    assert.equal(node.attrs['dominant-baseline'], 'central', 'the label is centred vertically on its y, where the leader ends');
    assert.equal(Number(node.attrs.x), l.x);
    assert.equal(Number(node.attrs.y), l.y);
    assert.equal(node.textContent, 'w');
    assert.equal(node.children.length, 2);
    const [sub, val] = node.children;
    assert.equal(sub.tag, 'tspan');
    assert.equal(sub.textContent, l.sub);
    assert.equal(sub.attrs['font-size'], '16');
    assert.equal(sub.attrs.dy, '5');
    assert.equal(val.tag, 'tspan');
    assert.equal(val.textContent, ` = ${l.value}`);
    assert.equal(val.attrs['font-size'], '20');
    assert.equal(val.attrs.dy, '-5');
  }
});

test('the beam copy (wall) comes after the leaders and before the dots and labels', () => {
  const svg = draw(DEFAULT);
  const kids = svg.children;
  const lastLeader = Math.max(...kids.map((n, i) => (classes(n).includes('leader') ? i : -1)));
  const wall = kids.findIndex(n => classes(n).includes('wall'));
  const firstDot = kids.findIndex(n => classes(n).includes('dot'));
  const firstText = kids.findIndex(n => n.tag === 'text' && n.attrs['font-size'] === '20');
  const firstArrow = kids.findIndex(n => n.tag === 'g');
  const outline = kids.findIndex(n => n.tag === 'path');
  assert.ok(outline < firstArrow, 'outline first, then arrows');
  assert.ok(firstArrow < kids.findIndex(n => classes(n).includes('leader')), 'arrows before leaders');
  assert.ok(lastLeader < wall, 'wall after leaders');
  assert.ok(wall < firstDot, 'dots after the beam');
  assert.ok(firstDot < firstText, 'labels after the dots');
});

test('the beam is drawn at the detail scale: first rect at x0, beamY, width 4 m', () => {
  const svg = draw(DEFAULT);
  const rect = direct(svg, 'rect', 'g').find(n => !classes(n).includes('wall'));
  assert.equal(Number(rect.attrs.x), DETAIL.x0);
  assert.equal(Number(rect.attrs.y), DETAIL.beamY);
  assert.equal(Number(rect.attrs.width), 4 * DETAIL.px);
  assert.equal(Number(rect.attrs.height), BEAM_H);
});

test('dimension line AB at dimY with ticks at x0 and xB, and the caption at captionY', () => {
  const svg = draw(DEFAULT);
  const dim = direct(svg, 'g', 'g').find(g => g.children.length === 3 && g.children.every(c => c.tag === 'line'));
  assert.ok(dim, 'dimension group');
  const [main, t0, t1] = dim.children;
  assert.equal(Number(main.attrs.y1), DETAIL.dimY);
  assert.equal(Number(main.attrs.y2), DETAIL.dimY);
  assert.equal(Number(main.attrs.x1), DETAIL.x0);
  assert.equal(Number(main.attrs.x2), XB);
  assert.equal(Number(t0.attrs.x1), detailX(0));
  assert.equal(Number(t0.attrs.x2), detailX(0));
  assert.equal(Number(t1.attrs.x1), XB);
  assert.equal(Number(t1.attrs.x2), XB);
  for (const t of [t0, t1]) {
    assert.equal(Number(t.attrs.y1), DETAIL.dimY - 5, 'a tick reaches 5 units above the line');
    assert.equal(Number(t.attrs.y2), DETAIL.dimY + 5, 'and 5 units below it');
  }
  const caption = svg.children.find(n => n.tag === 'text' && full(n).startsWith('AB'));
  assert.equal(full(caption), `AB: L = 2${NBSP}m (loaded)`);
  assert.equal(caption.attrs.class, 't');
  assert.equal(caption.attrs['font-size'], '16');
  assert.equal(caption.attrs['text-anchor'], 'middle');
  assert.equal(Number(caption.attrs.x), (DETAIL.x0 + XB) / 2);
  assert.equal(Number(caption.attrs.y), DETAIL.captionY);
});

test('a sign-changing state draws two outlines', () => {
  assert.equal(detailOutline(SIGN_CHANGE).length, 2);
  const svg = draw(SIGN_CHANGE);
  assert.equal(direct(svg, 'path', 'g').length, 2);
  assert.equal(labelsOf(svg).length, 2);
});

test('the zero state draws no outline and no arrows, and still two labels, leaders and dots', () => {
  const svg = draw(ZERO);
  assert.equal(direct(svg, 'path', 'g').length, 0);
  assert.equal(direct(svg, 'g', 'g').length, 1, 'only the dimension group');
  const labels = labelsOf(svg);
  assert.equal(labels.length, 2);
  assert.equal(full(labels[0]), `wA = 0${NBSP}N/m`);
  assert.equal(full(labels[1]), `wB = 0${NBSP}N/m`);
  assert.equal(direct(svg, 'line', 'leader').length, 2);
  assert.equal(direct(svg, 'circle', 'dot').length, 2);
});

test('negative heights print with the true minus', () => {
  const svg = draw({ r: -100, t: -100, peak: 'B' });
  const [la] = labelsOf(svg);
  assert.equal(full(la), `wA = −100${NBSP}N/m`);
});

test('every text and tspan font-size is at least 16', () => {
  for (const s of [DEFAULT, SIGN_CHANGE, ZERO]) {
    const svg = draw(s);
    let texts = 0;
    walk(svg, (n) => {
      if (n.tag === 'text' || n.tag === 'tspan') {
        texts++;
        if (n.attrs['font-size'] !== undefined) assert.ok(Number(n.attrs['font-size']) >= 16, `${n.tag} ${full(n)}`);
      }
    });
    assert.ok(texts >= 7, 'two labels with two tspans each, the caption, and the pins');
  }
});

// A full signature of a drawn tree: tag, attributes (sorted), text and children, so two drawings compare by content.
const signature = (n) => JSON.stringify([n.tag, Object.entries(n.attrs).sort(([p], [q]) => p < q ? -1 : 1), n.textContent, n.children.map(signature)]);

test('render is idempotent: twice gives the same tree (tags, attributes, text), and a new state replaces the old', () => {
  const svg = stubElement('svg');
  const scene = createDetailScene(svg);
  scene.render(DEFAULT);
  const once = count(svg), onceSig = signature(svg);
  scene.render(DEFAULT);
  assert.equal(count(svg), once);
  assert.equal(signature(svg), onceSig, 'the second render of the same state changed the drawing');
  scene.render(SIGN_CHANGE);
  assert.notEqual(signature(svg), onceSig, 'a different state drew the same picture');
  scene.render(DEFAULT);
  assert.equal(count(svg), once);
  assert.equal(signature(svg), onceSig, 'the old state left something behind');
  assert.equal(signature(svg), signature(draw(DEFAULT)), 'a re-rendered figure differs from a fresh one');
});

test('grid: no -0, NaN or undefined in any attribute or text, and the label y matches detailLabels', () => {
  let states = 0;
  let nodes = 0;
  const bad = /NaN|undefined|(^|[^0-9.])[-−]0(?![0-9.])/;
  for (const s of GRID) {
    states++;
    const svg = draw(s);
    walk(svg, (n) => {
      nodes++;
      for (const [k, v] of Object.entries(n.attrs)) assert.ok(!bad.test(v), `${JSON.stringify(s)} ${n.tag}.${k}=${v}`);
      assert.ok(!bad.test(n.textContent), `${JSON.stringify(s)} text ${n.textContent}`);
    });
    const lab = detailLabels(s);
    const [la, lb] = labelsOf(svg);
    assert.equal(Number(la.attrs.y), lab.a.y);
    assert.equal(Number(lb.attrs.y), lab.b.y);
  }
  assert.equal(states, 13122);
  assert.ok(nodes > 13122 * 30);
});
