import { LOADED_L, BEAM_L } from './physics.js';
import { MINUS, fmt, fmtFixed } from './format.js';
import { derive } from './state.js';

// The calculation, written out with the numbers substituted. Every number comes from
// fmt (forces, whole) or fmtFixed (locations, two decimals); everything else is a fixed
// string, so no URL text can reach this HTML.
const PANEL_XBAR = 'x̄';

// A negative number inside a sum or product is written in parentheses.
function panelPar(n) {
  const text = fmt(n);
  return text.startsWith(MINUS) ? `(${text})` : text;
}

function panelRect(d, s) {
  const name = '<span class="c-rect"><b>Rectangle</b></span>';
  if (d.rect.F === 0) return `${name}: w = 0, so there is no rectangular load and no force from it.`;
  return `${name} (constant w): F = w × L = ${panelPar(s.r)} × ${fmt(LOADED_L)} = <b>${fmt(d.rect.F)} N</b>, ` +
    `acting at the middle of AB: x = ${fmtFixed(d.rect.x)} m`;
}

function panelTri(d, s) {
  const name = '<span class="c-tri"><b>Triangle</b></span>';
  if (d.tri.F === 0) return `${name}: peak = 0, so there is no triangular load and no force from it.`;
  return `${name}: F = ½ × peak × L = ½ × ${panelPar(s.t)} × ${fmt(LOADED_L)} = <b>${fmt(d.tri.F)} N</b>, ` +
    `acting one third of the way in from the larger end (the peak is at ${s.peak}): x = ${fmtFixed(d.tri.x)} m`;
}

// A word when the combined force acts off the beam (judged on the printed value).
function panelWhere(x) {
  const shown = Number(fmtFixed(x).replace(MINUS, '-'));
  if (shown < 0) return ' (off the beam, left of the wall)';
  if (shown > BEAM_L) return ' (off the beam, beyond C)';
  return '';
}

// True when working the sum from the PRINTED (rounded) locations would not print the printed answer.
function panelNeedsExact(d) {
  const shown = (v) => Number(fmtFixed(v));
  const again = (d.rect.F * shown(d.rect.x) + d.tri.F * shown(d.tri.x)) / d.comb.F;
  return fmtFixed(again) !== fmtFixed(d.comb.x);
}

function panelComb(d) {
  const name = '<span class="c-comb"><b>Combined</b></span>';
  const sum = `F = ${fmt(d.rect.F)} + (${fmt(d.tri.F)}) = <b>${fmt(d.comb.F)} N</b>`;
  if (d.rect.F === 0 && d.tri.F === 0) return `${name}: there is no load, so there is no combined force.`;
  if (d.comb.F === 0) return `${name}: ${sum}: the two parts cancel, so no single force replaces them.`;
  if (d.rect.F === 0 || d.tri.F === 0) {
    const only = d.rect.F === 0 ? 'triangle' : 'rectangle';
    return `${name}: ${sum}, at ${PANEL_XBAR} = <b>${fmtFixed(d.comb.x)} m</b> ` +
      `(only the ${only} acts, so its location is the combined one)${panelWhere(d.comb.x)}`;
  }
  const num = `${panelPar(d.rect.F)} × ${fmtFixed(d.rect.x)} + ${panelPar(d.tri.F)} × ${fmtFixed(d.tri.x)}`;
  const exact = panelNeedsExact(d) ? ' <span class="rnd">(worked from the unrounded locations)</span>' : '';
  return `${name}: ${sum}, at ${PANEL_XBAR} = (${num}) / ${panelPar(d.comb.F)} = <b>${fmtFixed(d.comb.x)} m</b>` +
    `${panelWhere(d.comb.x)}${exact}`;
}

// s = { r, t, peak } -> [{ key: 'rect' | 'tri' | 'comb' | 'note', html }]. Pure.
export function calcLines(s) {
  const d = derive(s);
  const lines = [
    { key: 'rect', html: panelRect(d, s) },
    { key: 'tri', html: panelTri(d, s) },
    { key: 'comb', html: panelComb(d) }
  ];
  if (d.couple) {
    lines.push({
      key: 'note',
      html: 'Equal and opposite forces that act at different places do not cancel their turning effect: ' +
        'together they leave a couple, which no single force can replace.'
    });
  }
  return lines;
}

// Writes the lines into el, and only when the text changed (a screen reader hears no repeat).
export function createPanel(el) {
  let last = null;
  return {
    render(s) {
      const html = calcLines(s).map(l => `<div class="cl ${l.key}">${l.html}</div>`).join('');
      if (html === last) return;
      last = html;
      el.innerHTML = html;
    }
  };
}
