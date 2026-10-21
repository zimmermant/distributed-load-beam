import { el, clear, COLORS } from './svg.js';
import { sceneBeam, sceneText, sceneArrow } from './scene.js';
import { NBSP } from './format.js';
import { LOADED_L } from './physics.js';
import { DETAIL, detailX, detailOutline, detailArrows, detailLabels } from './detail-layout.js';

// Drawing style only: every position and length comes from detail-layout.js.
const DETAIL_LABEL = 20;          // the w_A / w_B labels (15 px at the figure's 740 px width)
const DETAIL_SUB = 16;            // their subscript letter
const DETAIL_SUB_DY = 5;          // the subscript sits this far below the baseline; the value comes back up
const DETAIL_CAPTION = 16;
const DETAIL_FILL = 0.1;          // fill opacity of the net-load outline
const DETAIL_TICK = 5;
const DETAIL_DOT_R = 3.5;
const DETAIL_LEADER_DASH = '3 3';

// One net-load polygon (its [x, y] corners, closed with Z).
function detailDrawOutline(parent, poly) {
  const d = `M${poly.map(p => p.join(' ')).join(' L')} Z`;
  return el('path', { class: 'g', d, fill: COLORS.ink, 'fill-opacity': DETAIL_FILL, stroke: COLORS.ink, 'stroke-width': 2 }, parent);
}

// A height label "w", subscript letter, " = value": three runs on one text node, so it anchors as one string.
// dominant-baseline centres it vertically on the label y, which is where the leader ends.
function detailDrawLabel(parent, lab) {
  const node = sceneText(parent, lab.x, lab.y, lab.name, {
    size: DETAIL_LABEL, weight: 700, fill: COLORS.comb, anchor: lab.anchor
  });
  node.setAttribute('dominant-baseline', 'central');
  const sub = el('tspan', { 'font-size': DETAIL_SUB, dy: DETAIL_SUB_DY }, node);
  sub.textContent = lab.sub;
  const val = el('tspan', { 'font-size': DETAIL_LABEL, dy: -DETAIL_SUB_DY }, node);
  val.textContent = ` = ${lab.value}`;
  return node;
}

// The dimension line AB (ticks at A and B) and its caption.
function detailDrawDimension(parent) {
  const xA = detailX(0);
  const xB = detailX(LOADED_L);
  const y = DETAIL.dimY;
  const g = el('g', { class: 'g' }, parent);
  el('line', { x1: xA, y1: y, x2: xB, y2: y, stroke: COLORS.outline }, g);
  el('line', { x1: xA, y1: y - DETAIL_TICK, x2: xA, y2: y + DETAIL_TICK, stroke: COLORS.outline }, g);
  el('line', { x1: xB, y1: y - DETAIL_TICK, x2: xB, y2: y + DETAIL_TICK, stroke: COLORS.outline }, g);
  sceneText(parent, (xA + xB) / 2, DETAIL.captionY, `AB: L = 2${NBSP}m (loaded)`, { size: DETAIL_CAPTION, anchor: 'middle' });
}

// render(s) clears the figure and redraws it from s = { r, t, peak } alone: the net load on AB with its
// two end heights labelled. The beam is drawn after the leaders so the wall covers one that crosses it.
export function createDetailScene(svg) {
  return {
    render(s) {
      clear(svg);
      for (const poly of detailOutline(s)) detailDrawOutline(svg, poly);
      for (const a of detailArrows(s)) sceneArrow(svg, a, COLORS.ink, 1.4);
      const labels = detailLabels(s);
      const both = [labels.a, labels.b];
      for (const lab of both) {
        const l = lab.leader;
        el('line', {
          class: 'g leader', x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2,
          stroke: COLORS.comb, 'stroke-width': 1.4, 'stroke-dasharray': DETAIL_LEADER_DASH
        }, svg);
      }
      sceneBeam(svg, DETAIL.x0, DETAIL.beamY, DETAIL.px);
      for (const lab of both) {
        el('circle', { class: 'g dot', cx: lab.edge.x, cy: lab.edge.y, r: DETAIL_DOT_R, fill: COLORS.comb }, svg);
      }
      for (const lab of both) detailDrawLabel(svg, lab);
      detailDrawDimension(svg);
    }
  };
}
