import { BEAM_L, LOADED_L } from './physics.js';
import { fmt, forceWords, locWords } from './format.js';
import { el, clear, text, COLORS } from './svg.js';
import { derive } from './state.js';
import { BEAM_H, TOP, COLS, topX, colX, loadShapes, forceArrow, columnOutline, columnCard } from './layout.js';

// Drawing style only: every position and length comes from layout.js.
const SCENE_TEXT = 16;            // every text is at least this many units (12 px at 800 px wide)
const SCENE_LINE_MAX = 24;        // characters per line in the top-right text block
const SCENE_FILL = 0.2;           // fill opacity of the load shapes
const SCENE_DASH = '5 3';
const SCENE_OUTLINE_DASH = '2 4';  // the dotted outline of the load in each column
const SCENE_OUTLINE_W = 1.8;
const SCENE_WALL_W = 14;
const SCENE_WALL_OVER = 18;       // the wall rises this far above and below the beam
const SCENE_HATCHES = 4;
const SCENE_PIN_R = BEAM_H / 2;   // the A, B, C circles exactly fill the beam's height
const SCENE_HEAD_MAX = 9;         // arrow head length cap
const SCENE_CARD_FILL = 0.05;     // the column card's tint
const SCENE_CARD_STROKE = 0.45;   // the column card's frame opacity
const SCENE_CARD_HEAD = 0.12;     // the heading band's tint

// A text node with its class set (svg.js's text() takes no class option).
function sceneText(parent, x, y, str, opts, cls = 't') {
  const node = text(parent, x, y, str, { size: SCENE_TEXT, ...opts });
  node.setAttribute('class', cls);
  return node;
}

// One arrow group: shaft line plus head path, the head's tip at (a.x, a.yHead).
function sceneArrow(parent, a, color, width) {
  const dir = a.yHead > a.yTail ? 1 : -1;
  const headLen = Math.min(SCENE_HEAD_MAX, Math.abs(a.yHead - a.yTail) * 0.6);
  const half = width * 1.6 + 1;
  const yBase = a.yHead - dir * headLen;
  const g = el('g', { class: 'g' }, parent);
  el('line', { x1: a.x, y1: a.yTail, x2: a.x, y2: yBase, stroke: color, 'stroke-width': width }, g);
  el('path', { d: `M${a.x - half} ${yBase} L${a.x} ${a.yHead} L${a.x + half} ${yBase} Z`, fill: color }, g);
  return g;
}

// A beam copy starting at x0 with its top face at y, `px` units per metre,
// a hatched wall at A and A, B, C circles centred on the beam's mid-line.
function sceneBeam(parent, x0, y, px) {
  el('rect', { class: 'g', x: x0, y, width: BEAM_L * px, height: BEAM_H, fill: COLORS.beam, stroke: COLORS.outline }, parent);
  const wallTop = y - SCENE_WALL_OVER;
  const wallH = BEAM_H + 2 * SCENE_WALL_OVER;
  const wallX = x0 - SCENE_WALL_W;
  el('rect', { class: 'g wall', x: wallX, y: wallTop, width: SCENE_WALL_W, height: wallH, fill: COLORS.wall, stroke: COLORS.outline }, parent);
  const step = wallH / SCENE_HATCHES;
  for (let i = 0; i < SCENE_HATCHES; i++) {
    el('line', {
      class: 'g wall', x1: wallX, y1: wallTop + (i + 1) * step, x2: wallX - SCENE_WALL_W, y2: wallTop + i * step,
      stroke: COLORS.outline
    }, parent);
  }
  const cy = y + BEAM_H / 2;
  const pins = [['A', 0], ['B', LOADED_L], ['C', BEAM_L]];
  for (const [name, m] of pins) {
    const cx = x0 + m * px;
    el('circle', { class: 'g pc', cx, cy, r: SCENE_PIN_R, fill: '#ffffff', stroke: COLORS.ink, 'stroke-width': 1.6 }, parent);
    sceneText(parent, cx, cy + 6, name, { anchor: 'middle', weight: 700, halo: false }, 'tin');
  }
}

// The top-right text block as [string, colour, bold] lines. A line longer than
// SCENE_LINE_MAX characters is split after its colon, so nothing runs off the page.
function sceneTopLines(s) {
  const lines = [['Actual load on AB', COLORS.ink, true]];
  const entries = [
    [`Rectangular: ${fmt(s.r, 0)} N/m`, COLORS.rect],
    [`Triangular: peak ${fmt(s.t, 0)} N/m at ${s.peak}`, COLORS.tri]
  ];
  for (const [str, color] of entries) {
    if (str.length <= SCENE_LINE_MAX) { lines.push([str, color, false]); continue; }
    const cut = str.indexOf(': ') + 1;
    lines.push([str.slice(0, cut), color, false], [str.slice(cut + 1), color, false]);
  }
  return lines;
}

// The three text lines of equivalent-force column k: name, force, location.
function sceneColumnLines(name, part, d) {
  const F = part.F;
  let third;
  if (F === 0) {
    if (name !== 'Combined') third = 'no load of this kind';
    else third = d.couple ? 'the parts cancel: no single force' : 'no load';
  } else {
    third = locWords(part.x);
  }
  return [name, F === 0 ? '0 N' : forceWords(F), third];
}

function sceneTop(svg, s) {
  const shapes = loadShapes(s);
  if (shapes.rect) {
    const r = shapes.rect;
    el('rect', {
      class: 'g', x: r.x, y: r.y, width: r.w, height: r.h, fill: COLORS.rect, 'fill-opacity': SCENE_FILL,
      stroke: COLORS.rect, 'stroke-dasharray': SCENE_DASH
    }, svg);
  }
  if (shapes.tri) {
    const pts = shapes.tri.pts.map(p => p.join(' ')).join(' L');
    el('path', {
      class: 'g', d: `M${pts} Z`, fill: COLORS.tri, 'fill-opacity': SCENE_FILL,
      stroke: COLORS.tri, 'stroke-dasharray': SCENE_DASH
    }, svg);
  }
  for (const a of shapes.arrows) sceneArrow(svg, a, COLORS.ink, 1.4);
  sceneBeam(svg, topX(0), TOP.beamY, TOP.px);

  const g = el('g', { class: 'g' }, svg);
  const tick = 5;
  const xA = topX(0), xB = topX(LOADED_L), xC = topX(BEAM_L);
  const y = TOP.dimY;
  el('line', { x1: xA, y1: y, x2: xB, y2: y, stroke: COLORS.outline }, g);
  el('line', { x1: xA, y1: y - tick, x2: xA, y2: y + tick, stroke: COLORS.outline }, g);
  el('line', { x1: xB, y1: y - tick, x2: xB, y2: y + tick, stroke: COLORS.outline }, g);
  el('line', { x1: xB, y1: y, x2: xC, y2: y, stroke: COLORS.beam, 'stroke-dasharray': '4 3' }, g);
  el('line', { x1: xC, y1: y - tick, x2: xC, y2: y + tick, stroke: COLORS.beam }, g);
  sceneText(svg, (xA + xB) / 2, TOP.dimTextY, 'AB = 2 m (loaded)', { anchor: 'middle' });
  sceneText(svg, (xB + xC) / 2, TOP.dimTextY, 'BC = 2 m (no load)', { anchor: 'middle' }).setAttribute('opacity', 0.6);

  // heading, rectangular, triangular (one or two lines), then the sign note
  const dy = [-28, -6, 16, 38, 60];
  const lines = sceneTopLines(s);
  lines.forEach(([str, color, bold], i) => {
    sceneText(svg, TOP.textX, TOP.beamY + dy[i], str, { fill: color, weight: bold ? 700 : 400 });
  });
  sceneText(svg, TOP.textX, TOP.beamY + dy[lines.length], '(+ down, − up)', {}).setAttribute('opacity', 0.7);
}

// A dotted, unfilled outline of one layout polygon (its points as given, closed with Z).
function sceneOutline(parent, poly, color) {
  const d = `M${poly.map(p => p.join(' ')).join(' L')} Z`;
  return el('path', {
    class: 'g outline', d, fill: 'none', stroke: color, 'stroke-width': SCENE_OUTLINE_W,
    'stroke-dasharray': SCENE_OUTLINE_DASH, 'stroke-linecap': 'round'
  }, parent);
}

// The card of column k: a tinted, framed rounded rectangle, then its heading band (the same tint, darker,
// square at the bottom and rounded like the card at the top). Class `card`, not `g`: the harness's
// text-versus-graphic checks must ignore them.
function sceneCard(parent, k, color) {
  const c = columnCard(k);
  el('rect', {
    class: 'card', x: c.x, y: c.y, width: c.w, height: c.h, rx: c.rx, fill: color, 'fill-opacity': SCENE_CARD_FILL,
    stroke: color, 'stroke-opacity': SCENE_CARD_STROKE, 'stroke-width': COLS.card.stroke
  }, parent);
  const r = c.rx, right = c.x + c.w, bottom = c.y + c.headH;
  el('path', {
    class: 'card', fill: color, 'fill-opacity': SCENE_CARD_HEAD,
    d: `M${c.x} ${c.y + r} A${r} ${r} 0 0 1 ${c.x + r} ${c.y} H${right - r} A${r} ${r} 0 0 1 ${right} ${c.y + r} V${bottom} H${c.x} Z`
  }, parent);
}

function sceneColumns(svg, d, s) {
  const parts = [
    ['Rectangular', d.rect, COLORS.rect],
    ['Triangular', d.tri, COLORS.tri],
    ['Combined', d.comb, COLORS.comb]
  ];
  parts.forEach(([name, part, color], k) => {
    sceneCard(svg, k, color);
    sceneBeam(svg, colX(k, 0), COLS.beamY, COLS.px);
    for (const poly of columnOutline(k, s)) sceneOutline(svg, poly, color);
    const a = forceArrow(k, part.F, part.x);
    if (a) sceneArrow(svg, a, color, 3.4);
    const lines = sceneColumnLines(name, part, d);
    lines.forEach((str, i) => {
      if (str === '') return;
      sceneText(svg, COLS.x[k] + COLS.textPad, COLS.textY[i], str, { fill: i < 2 ? color : COLORS.ink, weight: i < 2 ? 700 : 400 });
    });
  });
}

// render(s) clears the figure and redraws it from s = { r, t, peak } alone.
export function createScene(svg) {
  return {
    render(s) {
      clear(svg);
      sceneTop(svg, s);
      sceneColumns(svg, derive(s), s);
    }
  };
}
