import { LOADED_L, BEAM_L } from './physics.js';
import { MINUS, NBSP, fmt, fmtFixed, momentParts } from './format.js';
import { derive } from './state.js';

// The calculation, written out with the numbers substituted. Every number comes from
// fmt (forces, whole) or fmtFixed (locations, two decimals); everything else is a fixed
// string, so no URL text can reach this HTML.
const PANEL_XBAR = 'x̄';

// Every number is followed by its unit (N, N/m or m), also inside a formula. A negative number
// inside a sum or product is written in parentheses, unit inside: (−190 N/m).
const PANEL_N = 'N';
const PANEL_NPM = 'N/m';
const PANEL_M = 'm';
export function panelPar(n, unit) {
  const text = fmt(n);
  return text.startsWith(MINUS) ? `(${text}${NBSP}${unit})` : `${text}${NBSP}${unit}`;
}

function panelRect(d, s) {
  const name = '<span class="c-rect"><b>Rectangle</b></span>';
  if (d.rect.F === 0) return `${name}: w = 0${NBSP}${PANEL_NPM}, so there is no rectangular load and no force from it.`;
  return `${name} (constant w): F = w × L = ${panelPar(s.r, PANEL_NPM)} × ${fmt(LOADED_L)}${NBSP}${PANEL_M} = <b>${fmt(d.rect.F)}${NBSP}${PANEL_N}</b>, ` +
    `acting at the middle of AB: x = ${fmtFixed(d.rect.x)}${NBSP}${PANEL_M}`;
}

function panelTri(d, s) {
  const peak = s.peak === 'A' ? 'A' : 'B';          // never raw text into innerHTML
  const name = '<span class="c-tri"><b>Triangle</b></span>';
  if (d.tri.F === 0) return `${name}: peak = 0${NBSP}${PANEL_NPM}, so there is no triangular load and no force from it.`;
  return `${name}: F = ½ × peak × L = ½ × ${panelPar(s.t, PANEL_NPM)} × ${fmt(LOADED_L)}${NBSP}${PANEL_M} = <b>${fmt(d.tri.F)}${NBSP}${PANEL_N}</b>, ` +
    `acting one third of the way in from the larger end (the peak is at ${peak}): x = ${fmtFixed(d.tri.x)}${NBSP}${PANEL_M}`;
}

// A word when the combined force acts off the beam (judged on the printed value).
export function panelWhere(x) {
  const shown = Number(fmtFixed(x).replace(MINUS, '-'));
  if (shown < 0) return ' (off the beam, left of the wall)';
  return shown > BEAM_L ? ' (off the beam, beyond C)' : '';
}

// True when working the sum from the PRINTED (rounded) locations would not print the printed answer.
export function panelNeedsExact(d) {
  const shown = (v) => Number(fmtFixed(v));
  const again = (d.rect.F * shown(d.rect.x) + d.tri.F * shown(d.tri.x)) / d.comb.F;
  return fmtFixed(again) !== fmtFixed(d.comb.x);
}

function panelComb(d) {
  const name = '<span class="c-comb"><b>Combined</b></span>';
  const sum = `F = ${panelPar(d.rect.F, PANEL_N)} + (${fmt(d.tri.F)}${NBSP}${PANEL_N}) = <b>${fmt(d.comb.F)}${NBSP}${PANEL_N}</b>`;
  if (d.rect.F === 0 && d.tri.F === 0) return `${name}: there is no load, so there is no combined force.`;
  if (d.comb.F === 0) return `${name}: ${sum}: the two parts cancel, so no single force replaces them.`;
  if (d.rect.F === 0 || d.tri.F === 0) {
    const only = d.rect.F === 0 ? 'triangle' : 'rectangle';
    return `${name}: ${sum}, at ${PANEL_XBAR} = <b>${fmtFixed(d.comb.x)}${NBSP}${PANEL_M}</b> ` +
      `(only the ${only} acts, so its location is the combined one)${panelWhere(d.comb.x)}`;
  }
  const num = `${panelPar(d.rect.F, PANEL_N)} × ${fmtFixed(d.rect.x)}${NBSP}${PANEL_M} + ${panelPar(d.tri.F, PANEL_N)} × ${fmtFixed(d.tri.x)}${NBSP}${PANEL_M}`;
  const exact = panelNeedsExact(d) ? ' <span class="rnd">(worked from the unrounded locations)</span>' : '';
  return `${name}: ${sum}, at ${PANEL_XBAR} = (${num}) / ${panelPar(d.comb.F, PANEL_N)} = <b>${fmtFixed(d.comb.x)}${NBSP}${PANEL_M}</b>` +
    `${panelWhere(d.comb.x)}${exact}`;
}

// The parts' locations, fixed by the geometry even when a part carries no force (derive gives x = null then).
export function panelPartX(peak) {
  return { rect: LOADED_L / 2, tri: peak === 'A' ? LOADED_L / 3 : 2 * LOADED_L / 3 };
}

// True when the moment worked from the PRINTED (rounded) locations would not print the printed moment.
export function panelMomentNeedsExact(d, peak) {
  const x = panelPartX(peak);
  const again = d.rect.F * Number(fmtFixed(x.rect)) + d.tri.F * Number(fmtFixed(x.tri));
  return momentParts(again).text !== momentParts(d.M).text;
}

// The net moment about A, counterclockwise positive: M = r_rect × F_rect + r_tri × F_tri (forces + up).
function panelMoment(d, s) {
  const name = '<span class="c-comb"><b>Net moment about A</b></span>';
  const { text, dir } = momentParts(d.M);
  if (d.rect.F === 0 && d.tri.F === 0) return `${name}: there is no load, so M = ${text}.`;
  const x = panelPartX(s.peak);
  const sum = `${fmtFixed(x.rect)}${NBSP}${PANEL_M} × ${panelPar(d.rect.F, PANEL_N)} + ${fmtFixed(x.tri)}${NBSP}${PANEL_M} × ${panelPar(d.tri.F, PANEL_N)}`;
  const exact = panelMomentNeedsExact(d, s.peak) ? ' <span class="rnd">(worked from the unrounded locations)</span>' : '';
  return `${name} (counterclockwise +): M = ${sum} = <b>${text}</b>${dir ? ` (${dir})` : ''}${exact}`;
}

// s = { r, t, peak } -> [{ key: 'rect' | 'tri' | 'comb' | 'moment' | 'note', html }]. Pure.
export function calcLines(s) {
  const d = derive(s);
  const lines = [
    { key: 'rect', html: panelRect(d, s) },
    { key: 'tri', html: panelTri(d, s) },
    { key: 'comb', html: panelComb(d) },
    { key: 'moment', html: panelMoment(d, s) }
  ];
  if (d.couple) {
    lines.push({
      key: 'note',
      html: 'The forces cancel but their moments do not: a couple, which no single force can replace.'
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
