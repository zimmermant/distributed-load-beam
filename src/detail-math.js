import { LOADED_L } from './physics.js';
import { NBSP, fmt, fmtFixed } from './format.js';
import { derive } from './state.js';
import { panelPar, panelWhere, panelNeedsExact } from './panel.js';
import { detailHeights } from './detail-layout.js';

// The detail page's three calculation blocks as pure text (no DOM). Every line is an HTML string
// built from fixed pieces and numbers that come from fmt / fmtFixed, so no URL text can reach it.
// A variable is <i class="v">F</i><sub>rect</sub>; detailPlain turns that back into F_rect.
// The set-up lines hold no digit at all (only the fractions ½, ⅓, ⅔); numbers appear in the plug lines.

// Plain text of a line: tags stripped, a subscript written as _x, nothing else touched.
export function detailPlain(html) {
  return html.replace(/<sub>([^<]*)<\/sub>/g, '_$1').replace(/<[^>]*>/g, '');
}

const DETAIL_DOT = ' · ';

function detailV(base, sub) {
  const v = `<i class="v">${base}</i>`;
  return sub ? `${v}<sub>${sub}</sub>` : v;
}

const detailL = () => detailV('L');
const detailUnit = (n, unit) => `${n}${NBSP}${unit}`;
const detailLength = () => detailUnit(fmt(LOADED_L), 'm');

// The load's heights at A and B named by the end where the triangle is zero / tall.
function detailEnds(peak) {
  return peak === 'A' ? { zero: 'B', tall: 'A' } : { zero: 'A', tall: 'B' };
}

function detailRect(d, s) {
  const { zero } = detailEnds(s.peak);
  const wRect = detailV('w', 'rect'), fRect = detailV('F', 'rect'), rRect = detailV('r', 'rect');
  const wEnd = detailV('w', zero);
  const L = detailL();
  const setup = [
    `The triangle is zero at ${zero}, so the rectangle's height is the load's height at ${zero}: ${wRect} = ${wEnd}.`,
    `The equivalent force is the area under the rectangle: ${fRect} = ${wRect}${DETAIL_DOT}${L}.`,
    `It acts at the centre of the rectangle, measured from A: ${rRect} = ½${DETAIL_DOT}${L}.`
  ];
  const plug = [
    `${wRect} = ${wEnd} = ${detailUnit(fmt(s.r), 'N/m')}, ${L} = ${detailLength()}`,
    `${fRect} = ${wRect}${DETAIL_DOT}${L} = ${panelPar(s.r, 'N/m')}${DETAIL_DOT}${detailLength()} = ${detailUnit(fmt(d.rect.F), 'N')}`,
    `${rRect} = ½${DETAIL_DOT}${L} = ½${DETAIL_DOT}${detailLength()} = ${detailUnit(fmtFixed(LOADED_L / 2), 'm')}`
  ];
  const notes = d.rect.F === 0
    ? [`There is no rectangular load, so ${fRect} = ${detailUnit('0', 'N')} and it adds no torque.`]
    : [];
  return { key: 'rect', title: 'Calculating the rectangular loading', setup, plug, notes };
}

function detailTri(d, s) {
  const { tall } = detailEnds(s.peak);
  const { wA, wB } = detailHeights(s);
  const wTri = detailV('w', 'tri'), fTri = detailV('F', 'tri'), rTri = detailV('r', 'tri');
  const wTall = s.peak === 'A' ? wA : wB;
  const wOther = s.peak === 'A' ? wB : wA;
  const nameTall = detailV('w', tall), nameOther = detailV('w', s.peak === 'A' ? 'B' : 'A');
  const L = detailL();
  const where = s.peak === 'A' ? `⅓${DETAIL_DOT}${L}` : `⅔${DETAIL_DOT}${L}`;
  const centroid = s.peak === 'A'
    ? `${rTri} = ⅓${DETAIL_DOT}${L}`
    : `${rTri} = ${L} − ⅓${DETAIL_DOT}${L} = ⅔${DETAIL_DOT}${L}`;
  const setup = [
    `The triangle's height is the rest of the load: ${wTri} = ${nameTall} − ${nameOther}.`,
    `The equivalent force is the area under the triangle, half of base times height: ${fTri} = ½${DETAIL_DOT}${wTri}${DETAIL_DOT}${L}.`,
    `It acts at the centroid, one third of ${L} in from the tall end ${tall}, so measured from A: ${centroid}.`
  ];
  const plug = [
    `${detailV('w', 'A')} = ${detailUnit(fmt(wA), 'N/m')}, ${detailV('w', 'B')} = ${detailUnit(fmt(wB), 'N/m')}, ${L} = ${detailLength()}`,
    `${wTri} = ${nameTall} − ${nameOther} = ${panelPar(wTall, 'N/m')} − ${panelPar(wOther, 'N/m')} = ${detailUnit(fmt(wTall - wOther), 'N/m')}`,
    `${fTri} = ½${DETAIL_DOT}${wTri}${DETAIL_DOT}${L} = ½${DETAIL_DOT}${panelPar(wTall - wOther, 'N/m')}${DETAIL_DOT}${detailLength()} = ${detailUnit(fmt(d.tri.F), 'N')}`,
    `${rTri} = ${where} = ${s.peak === 'A' ? '⅓' : '⅔'}${DETAIL_DOT}${detailLength()} = ${detailUnit(fmtFixed(s.peak === 'A' ? LOADED_L / 3 : 2 * LOADED_L / 3), 'm')}`
  ];
  const notes = d.tri.F === 0
    ? [`There is no triangular load, so ${fTri} = ${detailUnit('0', 'N')} and it adds no torque.`]
    : [];
  return { key: 'tri', title: 'Calculating the triangular loading', setup, plug, notes };
}

function detailComb(d, s) {
  const fRect = detailV('F', 'rect'), fTri = detailV('F', 'tri'), fEq = detailV('F', 'equiv');
  const rRect = detailV('r', 'rect'), rTri = detailV('r', 'tri'), rEq = detailV('r', 'equiv');
  const tRect = detailV('τ', 'rect'), tTri = detailV('τ', 'tri'), tEq = detailV('τ', 'equiv');
  const F = detailV('F'), r = detailV('r'), tau = detailV('τ');
  const formula = `(${rRect}${DETAIL_DOT}${fRect} + ${rTri}${DETAIL_DOT}${fTri}) / ${fEq}`;
  const setup = [
    `The single equivalent force replaces both loads, so it carries their total force: ${fEq} = ${fRect} + ${fTri}.`,
    `It must also give the same torque about A as the loads it replaces. A force ${F} at a distance ${r} from A gives a torque ${tau} = ${r}${DETAIL_DOT}${F} (downward forces positive).`,
    `${tEq} = ${tRect} + ${tTri}`,
    `${rEq}${DETAIL_DOT}${fEq} = ${rRect}${DETAIL_DOT}${fRect} + ${rTri}${DETAIL_DOT}${fTri}`,
    `Solving for the location: ${rEq} = ${formula}.`
  ];
  const noLoad = d.rect.F === 0 && d.tri.F === 0;
  // The two parts' locations are fixed by the geometry even when a part carries no force (its x in derive is null).
  const xRect = LOADED_L / 2;
  const xTri = s.peak === 'A' ? LOADED_L / 3 : 2 * LOADED_L / 3;
  const given = noLoad
    ? `${fRect} = ${detailUnit('0', 'N')}, ${fTri} = ${detailUnit('0', 'N')}`
    : `${fRect} = ${detailUnit(fmt(d.rect.F), 'N')}, ${fTri} = ${detailUnit(fmt(d.tri.F), 'N')}, ` +
      `${rRect} = ${detailUnit(fmtFixed(xRect), 'm')}, ${rTri} = ${detailUnit(fmtFixed(xTri), 'm')}`;
  const plug = [
    given,
    `${fEq} = ${fRect} + ${fTri} = ${panelPar(d.rect.F, 'N')} + ${panelPar(d.tri.F, 'N')} = ${detailUnit(fmt(d.comb.F), 'N')}`
  ];
  const notes = [];
  if (noLoad) {
    notes.push(`There is no load, so ${fEq} = ${detailUnit('0', 'N')} and there is nothing to replace.`);
  } else if (d.comb.F === 0) {
    notes.push(`${fEq} = ${detailUnit('0', 'N')}: the two loads leave a couple, so no single force replaces them and there is no ${rEq}.`);
  } else {
    // panelNeedsExact reads both locations, so a part with no force gets its geometric location here.
    const full = { ...d, rect: { F: d.rect.F, x: xRect }, tri: { F: d.tri.F, x: xTri } };
    const exact = panelNeedsExact(full) ? ' <span class="rnd">(worked from the unrounded locations)</span>' : '';
    const numbers = `(${detailUnit(fmtFixed(xRect), 'm')}${DETAIL_DOT}${panelPar(d.rect.F, 'N')} + ${detailUnit(fmtFixed(xTri), 'm')}${DETAIL_DOT}${panelPar(d.tri.F, 'N')}) / ${panelPar(d.comb.F, 'N')}`;
    plug.push(`${rEq} = ${formula} = ${numbers} = ${detailUnit(fmtFixed(d.comb.x), 'm')}${panelWhere(d.comb.x)}${exact}`);
  }
  return { key: 'comb', title: 'Calculating the combined loading', setup, plug, notes };
}

// s = { r, t, peak } -> the three blocks, in order. Pure; derives, stores nothing.
export function detailBlocks(s) {
  const d = derive(s);
  return [detailRect(d, s), detailTri(d, s), detailComb(d, s)];
}
