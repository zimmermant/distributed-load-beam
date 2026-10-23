// Browser verification harness for dist/distributed_load_beam_detail.html (the detailed-calculation page).
//
// Not part of the build (build.js module lists do not name it) and not run by node: it needs a real layout
// engine. Serve the app folder so the built page and this file share an origin, open
// dist/distributed_load_beam_detail.html, then run in the page:
//
//   eval(await (await fetch('/tools/detail-harness.js')).text());
//   H.install();  H.sweep();  H.sensitivity();  H.budget();     // or just H.all()
//
// Run it at three viewports (set the Browser pane, then RELOAD, then install):
//   800x750  and  1280x720   every phase must pass: violations [], flagged true, budget.ok true
//   1000x700                 the same is expected (the top item must fit), but at least controlsVisible true
//
// What each phase proves
//   install      the figure renders >= 600 px wide (metrics are untrustworthy in a collapsed pane);
//                stores element references.
//   sweep        drives the REAL state through the sliders' input events (no keydown, so pointer-style input)
//                and the peak buttons, over the 9x9 grid of r,t x both peaks plus the near-cancel pairs of
//                the main harness. After each state it checks, in the figure (#detail-fig, viewBox 960x356):
//                  1 every label and the caption (text.t) lies inside the viewBox;
//                  2 each is disjoint (0.5 tolerance in x AND y) from the beam, wall, hatching, outline,
//                    arrows, leaders, dots, pin circles, the dimension line, the A/B/C marks and the other texts;
//                  3 the labels' y TRACK THE HEIGHTS: w_A and w_B are recomputed here from the slider values
//                    (peak B: w_A = r, w_B = r + t; peak A: w_A = r + t, w_B = r), the edge y and the label y are
//                    recomputed from the same constants and rule as src/detail-layout.js (detailEdgeY,
//                    detailLabelY, the zero-height face rule), and compared with the rendered y attributes of
//                    the labels, the leaders' ends and the dots (0.5 units). The label's painted vertical
//                    centre must also lie within 2 units of its y (it is drawn dominant-baseline: central; measured
//                    in the browser, painted centre minus y is +1.2 with it and -5.6 without it). This is an
//                    independent recomputation, not a read-back of detailLabels;
//                  4 rendered font size >= 12 px for every text AND every tspan (computed font-size times the
//                    figure's scale, taken from the SVG's screen transform: 16-unit subscripts at 740 px of
//                    960 units come to 12.3 px);
//                  5 every block line (.plug, .setup, .note inside #body-rect, #body-tri, #body-comb), every
//                    element inside those bodies, and every sub has a computed font size >= 12 px;
//                  6 no horizontal scroll.
//                It also checks the drive worked (slider values, readouts, pressed button) and that the
//                label text shows the recomputed heights.
//   sensitivity  plants faults and requires checkFigure to name each: a text over the beam (and only the beam), one
//                past the viewBox edge, one at font-size 10, one on top of an existing label, one whose
//                subscript tspan is 10 units, one block line at 10 px, the first label stripped of
//                dominant-baseline (painted-centre check), and the first label's y attribute shifted by +3
//                (label-y check); requires a clean figure after removal and no drive problems from restore():
//                proves the checker can see each fault.
//   budget       heading (h1), back link, the "Actual load on AB" heading, figure and controls are fully
//                visible without scrolling (tops >= 0, bottoms <= innerHeight, figure and controls do not
//                overlap), controls not clipped, no horizontal scroll.
//
// Why getBoundingClientRect and not getBBox: for text with dominant-baseline: central (the two height labels),
// getBBox is computed from font metrics that differ between engines, and for a text with tspans some engines
// report only the first run. getBoundingClientRect is the painted box on screen, the same in every engine, and
// is converted to viewBox units through the SVG's own screen transform (getScreenCTM), so any letterboxing or
// zoom is handled. Every element, text or graphic, is measured the same way, so the comparison is like for like.
(function () {
  const VB = { w: 960, h: 356 };
  const TOL = 0.5;            // overlap counts only if the intersection exceeds this in x AND y
  const Y_TOL = 0.5;          // rendered y attribute versus the recomputed y
  // Painted vertical centre of a label minus its y attribute, measured in the real browser (Chromium): +1.2 units with
  // dominant-baseline: central, -5.6 without it (the alphabetic baseline puts the box above y). A tolerance of 2 sits
  // between the two, so it passes the correct drawing and catches the loss of `central`.
  const CENTRE_TOL = 2;
  const MIN_FIG_PX = 600;
  const MIN_TEXT_PX = 12;
  const GRID = [-200, -150, -100, -15, 0, 15, 100, 150, 200];
  const NEAR_CANCEL = [[-100, 190], [-100, 195], [-100, 200], [100, -190], [100, -195], [100, -200], [130, -190]];
  const DEFAULTS = { r: -100, t: -100, peak: 'B' };
  const EXPECTED_COMBOS = 9 * 9 * 2 + 7 * 2;   // 176
  // Constants copied from src/detail-layout.js (DETAIL) and src/layout.js (BEAM_H); the independent recomputation.
  const G = { x0: 250, px: 130, beamY: 150, beamH: 24, unit: 0.3, labelClear: 40, labelADx: 44, labelBDx: 34, loadedL: 2 };
  // Non-vacuity floors (a checker that finds nothing to measure proves nothing).
  const MIN_LINES = 12;       // block lines (set-up + plug-in + notes) in the three bodies, any state
  const MIN_SUBS = 6;         // sub elements in the three bodies, any state
  // Exact sweep totals over the 176 states (counted from the layout in node by the task reviewer, and in the browser):
  // the layout draws 212 outlines and 1146 arrows. They change only if the geometry rules in src/detail-layout.js
  // change; then recount and update them.
  const EXACT_OUTLINES = 212, EXACT_ARROWS = 1146;

  let fig = null, ui = null;

  function need() {
    if (!fig) throw new Error('Run H.install() first.');
  }

  function install() {
    const f = document.getElementById('detail-fig');
    const figPx = f ? f.getBoundingClientRect().width : 0;
    if (!f || figPx < MIN_FIG_PX) {
      throw new Error(`The figure is only ${Math.round(figPx)} px wide: measurements are unreliable below ` +
        `${MIN_FIG_PX} px. Set the viewport to at least 800 px wide and reload.`);
    }
    fig = f;
    ui = {
      r: document.getElementById('r-slider'), t: document.getElementById('t-slider'),
      rOut: document.getElementById('r-readout'), tOut: document.getElementById('t-readout'),
      peakA: document.getElementById('peak-a'), peakB: document.getElementById('peak-b'),
      controls: document.getElementById('controls'),
      h1: document.querySelector('h1'), back: document.getElementById('back-link'), h2: document.getElementById('h-actual')
    };
    for (const k in ui) if (!ui[k]) throw new Error(`Missing page element for "${k}".`);
    return { ok: true, figPx: Math.round(figPx) };
  }

  // ---- the independent recomputation of the labels (same rule and constants as src/detail-layout.js) ----
  function edgeY(w) {
    if (w < 0) return G.beamY + w * G.unit;              // + up: a downward (negative) height sits above the beam
    if (w > 0) return G.beamY + G.beamH + w * G.unit;
    return G.beamY;
  }
  function labelY(edge) {
    const mid = G.beamY + G.beamH / 2;
    if (Math.abs(edge - mid) >= G.labelClear) return edge;
    return edge <= mid ? mid - G.labelClear : mid + G.labelClear;
  }
  const readoutOf = (v) => v < 0 ? '−' + Math.abs(v) : String(v);
  // Heights from the slider values: peak B: the triangle is r + t at B and zero at A; peak A the other way round.
  function expected(r, t, peak) {
    const wA = peak === 'B' ? r : r + t, wB = peak === 'B' ? r + t : r;
    // a zero height's corner is on the face the outline uses (bottom when the load is below the beam, else top)
    const zeroY = wA + wB > 0 ? G.beamY + G.beamH : G.beamY;
    const eA = wA === 0 ? zeroY : edgeY(wA);
    const eB = wB === 0 ? zeroY : edgeY(wB);
    const xA = G.x0, xB = G.x0 + G.loadedL * G.px;
    return {
      wA, wB,
      a: { x: xA - G.labelADx, y: labelY(eA), edge: { x: xA, y: eA }, text: `wA = ${readoutOf(wA)} N/m` },
      b: { x: xB + G.labelBDx, y: labelY(eB), edge: { x: xB, y: eB }, text: `wB = ${readoutOf(wB)} N/m` }
    };
  }

  // ---- measuring -------------------------------------------------------------------------
  const NBSP_RE = / /g;
  // The painted box in viewBox units, from getBoundingClientRect through the SVG's screen transform.
  function box(el) {
    const m = fig.getScreenCTM(), r = el.getBoundingClientRect();
    return { x0: (r.left - m.e) / m.a, y0: (r.top - m.f) / m.d, x1: (r.right - m.e) / m.a, y1: (r.bottom - m.f) / m.d };
  }
  const figScale = () => fig.getScreenCTM().a;     // screen px per viewBox unit
  const hits = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > TOL && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > TOL;
  const outside = (b) => b.x0 < -TOL || b.y0 < -TOL || b.x1 > VB.w + TOL || b.y1 > VB.h + TOL;
  const r1 = (n) => Math.round(n * 10) / 10;
  const cls = (el) => el.getAttribute('class') || '';
  const kind = (el) => {
    const c = cls(el).split(/\s+/);
    if (el.tagName === 'text') return 'text';
    if (c.includes('leader')) return 'leader';
    if (c.includes('dot')) return 'dot';
    if (c.includes('pc')) return 'pin circle';
    if (c.includes('wall')) return el.tagName === 'line' ? 'hatching' : 'wall';
    if (el.tagName === 'rect') return 'beam';
    if (el.tagName === 'path') return 'outline';
    if (el.tagName === 'g') return el.querySelector('path') ? 'arrow' : 'dimension line';
    return el.tagName;
  };
  // A planted fault carries data-probe, so a message about it names the PROBE like the planted texts do.
  const probeTag = (el) => el.getAttribute('data-probe') ? ` [${el.getAttribute('data-probe')}]` : '';
  const name = (el, b) => el.tagName === 'text'
    ? `text "${el.textContent.replace(NBSP_RE, ' ')}"`
    : `${kind(el)} <${el.tagName}> @${r1(b.x0)},${r1(b.y0)}-${r1(b.x1)},${r1(b.y1)}`;
  const topLevelG = () => Array.from(fig.querySelectorAll('.g')).filter(e => !e.parentElement.closest('.g'));
  const px = (el) => parseFloat(getComputedStyle(el).fontSize);

  const BODIES = ['#body-rect', '#body-tri', '#body-comb'];
  const bodyNodes = (sel) => BODIES.flatMap(b => Array.from(document.querySelectorAll(sel.split(',').map(s => `${b} ${s.trim()}`).join(','))));

  // Every geometry and size rule in one place; used by sweep and sensitivity.
  // `want` (optional) is expected(r, t, peak): enables the height-tracking check.
  // Returns { violations: string[], minPx, minBlockPx, nTexts, nG, nOutlines, nArrows, nLines, nSubs }.
  function checkFigure(tag, want) {
    const out = [];
    const bad = (msg) => out.push(`${tag}: ${msg}`);
    const texts = Array.from(fig.querySelectorAll('text.t')).map(el => ({ el, b: box(el) }));
    const tins = Array.from(fig.querySelectorAll('text.tin')).map(el => ({ el, b: box(el) }));
    const gs = topLevelG().map(el => ({ el, b: box(el) }));
    const count = (k) => gs.filter(g => kind(g.el) === k).length;

    // non-vacuity of what is measured (these messages deliberately do not name any text)
    if (texts.length !== 3) bad(`found ${texts.length} text.t in the figure (expected 3: two labels and the caption)`);
    if (tins.length !== 3) bad(`found ${tins.length} text.tin (expected the A, B, C marks)`);
    for (const [k, n] of [['beam', 1], ['wall', 1], ['hatching', 4], ['leader', 2], ['dot', 2], ['pin circle', 3]]) {
      if (count(k) < n) bad(`found ${count(k)} ${k} graphics (expected at least ${n}): the checks are vacuous`);
    }

    for (const x of texts.concat(tins)) if (outside(x.b)) bad(`${name(x.el, x.b)} outside the viewBox`);          // 1
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {                          // 2: the other texts
      if (hits(texts[i].b, texts[j].b)) bad(`${name(texts[i].el, texts[i].b)} overlaps ${name(texts[j].el, texts[j].b)}`);
    }
    for (const x of texts) for (const g of gs) {                                                                 // 2: every graphic
      if (hits(x.b, g.b)) bad(`${name(x.el, x.b)} overlaps ${name(g.el, g.b)}`);
    }
    for (const x of texts) for (const n of tins) {                                                               // 2: the A, B, C marks
      if (hits(x.b, n.b)) bad(`${name(x.el, x.b)} overlaps ${name(n.el, n.b)}`);
    }
    for (const g of gs) if (outside(g.b)) bad(`${name(g.el, g.b)} outside the viewBox`);

    // 3: the labels track the heights
    if (want) {
      const near = (v, w) => Math.abs(v - w) <= Y_TOL;
      const labs = texts.filter(x => x.el.querySelector('tspan'));
      const pick = (anchor) => labs.find(x => x.el.getAttribute('text-anchor') === anchor);
      for (const [key, anchor] of [['a', 'end'], ['b', 'start']]) {
        const lab = pick(anchor), w = want[key];
        if (!lab) { bad(`no height label w_${key.toUpperCase()} found`); continue; }
        const y = parseFloat(lab.el.getAttribute('y')), x = parseFloat(lab.el.getAttribute('x'));
        if (!near(y, w.y)) bad(`label w_${key.toUpperCase()}${probeTag(lab.el)} y is ${r1(y)}, recomputed ${r1(w.y)}`);
        if (!near(x, w.x)) bad(`label w_${key.toUpperCase()} x is ${r1(x)}, recomputed ${r1(w.x)}`);
        const centre = (lab.b.y0 + lab.b.y1) / 2;
        if (Math.abs(centre - y) > CENTRE_TOL) bad(`label w_${key.toUpperCase()}${probeTag(lab.el)} is painted centred at ${r1(centre)}, its y is ${r1(y)}`);
        if (lab.el.textContent.replace(NBSP_RE, ' ') !== w.text) bad(`label w_${key.toUpperCase()} reads "${lab.el.textContent.replace(NBSP_RE, ' ')}", expected "${w.text}"`);
      }
      const leaders = Array.from(fig.querySelectorAll('line.leader'));
      const dots = Array.from(fig.querySelectorAll('circle.dot'));
      const num = (el, a) => parseFloat(el.getAttribute(a));
      const byX = (list, a) => list.slice().sort((p, q) => num(p, a) - num(q, a));
      if (leaders.length === 2) {
        const [la, lb] = byX(leaders, 'x1');
        if (!near(num(la, 'y1'), want.a.y) || !near(num(la, 'y2'), want.a.edge.y)) bad(`leader of w_A runs y ${r1(num(la, 'y1'))} to ${r1(num(la, 'y2'))}, recomputed ${r1(want.a.y)} to ${r1(want.a.edge.y)}`);
        if (!near(num(lb, 'y2'), want.b.y) || !near(num(lb, 'y1'), want.b.edge.y)) bad(`leader of w_B runs y ${r1(num(lb, 'y1'))} to ${r1(num(lb, 'y2'))}, recomputed ${r1(want.b.edge.y)} to ${r1(want.b.y)}`);
      }
      if (dots.length === 2) {
        const [da, db] = byX(dots, 'cx');
        if (!near(num(da, 'cy'), want.a.edge.y)) bad(`dot at A is at y ${r1(num(da, 'cy'))}, recomputed ${r1(want.a.edge.y)}`);
        if (!near(num(db, 'cy'), want.b.edge.y)) bad(`dot at B is at y ${r1(num(db, 'cy'))}, recomputed ${r1(want.b.edge.y)}`);
      }
    }

    // 4: rendered font size of every text and every tspan in the figure
    const scale = figScale();
    let minPx = Infinity;
    for (const el of fig.querySelectorAll('text, tspan')) {
      const rendered = px(el) * scale;
      if (rendered < minPx) minPx = rendered;
      if (!(rendered >= MIN_TEXT_PX)) bad(`${el.tagName === 'tspan' ? 'tspan' : 'text'} "${el.textContent.replace(NBSP_RE, ' ')}" renders at ${r1(rendered)} px (< ${MIN_TEXT_PX})`);
    }

    // 5: the block lines
    const lines = bodyNodes('.plug, .setup, .note');
    const subs = Array.from(document.querySelectorAll('sub'));
    let minBlockPx = Infinity;
    for (const el of lines.concat(subs, bodyNodes('*'))) {
      const p = px(el);
      if (p < minBlockPx) minBlockPx = p;
      if (!(p >= MIN_TEXT_PX)) bad(`block <${el.tagName.toLowerCase()}${cls(el) ? '.' + cls(el).replace(/\s+/g, '.') : ''}> "${el.textContent.slice(0, 30)}" computes ${r1(p)} px (< ${MIN_TEXT_PX})`);
    }
    if (lines.length < MIN_LINES) bad(`only ${lines.length} block lines found (< ${MIN_LINES}): check 5 is vacuous`);
    if (subs.length < MIN_SUBS) bad(`only ${subs.length} sub elements found (< ${MIN_SUBS}): check 5 is vacuous`);

    // 6: no horizontal scroll
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth) bad(`horizontal scroll: scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`);

    return {
      violations: out, minPx, minBlockPx, nTexts: texts.length + tins.length, nG: gs.length,
      nOutlines: count('outline'), nArrows: count('arrow'), nLines: lines.length, nSubs: subs.length
    };
  }

  // ---- driving the real UI ---------------------------------------------------------------
  function setSlider(slider, v) {
    slider.value = String(v);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // Returns drive problems (empty if the sliders, readouts and peak buttons show what was asked).
  function drive(r, t, peak, tag) {
    (peak === 'A' ? ui.peakA : ui.peakB).click();
    setSlider(ui.r, r);
    setSlider(ui.t, t);
    const probs = [];
    if (Number(ui.r.value) !== r) probs.push(`${tag}: r slider shows ${ui.r.value}`);
    if (Number(ui.t.value) !== t) probs.push(`${tag}: t slider shows ${ui.t.value}`);
    if (ui.rOut.textContent !== readoutOf(r)) probs.push(`${tag}: r readout "${ui.rOut.textContent}"`);
    if (ui.tOut.textContent !== readoutOf(t)) probs.push(`${tag}: t readout "${ui.tOut.textContent}"`);
    const sel = (peak === 'A' ? ui.peakA : ui.peakB), other = (peak === 'A' ? ui.peakB : ui.peakA);
    if (sel.getAttribute('aria-pressed') !== 'true' || other.getAttribute('aria-pressed') !== 'false') {
      probs.push(`${tag}: peak buttons do not show peak ${peak}`);
    }
    return probs;
  }
  const tagOf = (r, t, peak) => `r=${r} t=${t} peak=${peak}`;
  const restore = () => drive(DEFAULTS.r, DEFAULTS.t, DEFAULTS.peak, 'restore');

  function sweep() {
    need();
    const violations = [];
    let combos = 0, minTextPx = Infinity, minBlockPx = Infinity, outlineTotal = 0, arrowTotal = 0, minLines = Infinity, minSubs = Infinity;
    const pairs = [];
    for (const r of GRID) for (const t of GRID) pairs.push([r, t]);
    for (const p of NEAR_CANCEL) pairs.push(p);
    try {
      for (const peak of ['A', 'B']) for (const [r, t] of pairs) {
        const tag = tagOf(r, t, peak);
        for (const p of drive(r, t, peak, tag)) violations.push(p);
        const c = checkFigure(tag, expected(r, t, peak));
        for (const v of c.violations) violations.push(v);
        minTextPx = Math.min(minTextPx, c.minPx);
        minBlockPx = Math.min(minBlockPx, c.minBlockPx);
        minLines = Math.min(minLines, c.nLines);
        minSubs = Math.min(minSubs, c.nSubs);
        outlineTotal += c.nOutlines;
        arrowTotal += c.nArrows;
        combos++;
      }
      if (combos !== EXPECTED_COMBOS) violations.push(`sweep ran ${combos} combos, expected ${EXPECTED_COMBOS}`);
      if (outlineTotal !== EXACT_OUTLINES) violations.push(`sweep found ${outlineTotal} outlines, expected exactly ${EXACT_OUTLINES}`);
      if (arrowTotal !== EXACT_ARROWS) violations.push(`sweep found ${arrowTotal} arrows, expected exactly ${EXACT_ARROWS}`);
    } finally {
      for (const p of restore()) violations.push(p);
    }
    return {
      combos, violations, minTextPx: r1(minTextPx), minBlockPx: r1(minBlockPx), minLines, minSubs, outlineTotal, arrowTotal
    };
  }

  function plant(x, y, str, size) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    n.setAttribute('class', 't');
    n.setAttribute('x', x);
    n.setAttribute('y', y);
    n.setAttribute('font-size', size);
    n.setAttribute('font-weight', 700);
    n.textContent = str;
    fig.appendChild(n);
    return n;
  }

  function sensitivity() {
    need();
    const driveProblems = restore();
    const first = Array.from(fig.querySelectorAll('text.t')).find(e => e.querySelector('tspan'));   // a height label
    const planted = [];
    const origBaseline = first.getAttribute('dominant-baseline'), origY = first.getAttribute('y');
    const put = (x, y, str, size) => { const n = plant(x, y, str, size); planted.push(n); return n; };
    let r;
    try {
      // 1: a label-like text on the beam past B (x 510..770 holds nothing else): only the beam may be named
      const onBeam = put(600, 167, 'PROBE1', 16);
      const pb = box(onBeam);
      const beams = topLevelG().filter(e => kind(e) === 'beam').filter(e => hits(box(e), pb));
      put(950, 60, 'PROBE2', 20);                                           // 2: runs past x = 960
      put(600, 300, 'PROBE3', 10);                                          // 3: renders below 12 px
      const onLabel = put(first.getAttribute('x'), first.getAttribute('y'), 'PROBE4', 20);   // 4: on an existing label (same anchor)
      onLabel.setAttribute('text-anchor', first.getAttribute('text-anchor'));
      onLabel.setAttribute('dominant-baseline', 'central');
      // 5: a text whose subscript tspan is 10 units (own class, so only the font rule can see it)
      const sm = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sm.setAttribute('class', 'probe');
      sm.setAttribute('x', 600); sm.setAttribute('y', 40); sm.setAttribute('font-size', 20);
      sm.appendChild(document.createTextNode('PROBE5'));
      const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      ts.setAttribute('font-size', 10); ts.textContent = 'PROBE5sub';
      sm.appendChild(ts);
      fig.appendChild(sm); planted.push(sm);
      // 6: a block line at 10 px
      const line = document.createElement('div');
      line.className = 'plug';
      line.style.fontSize = '10px';
      line.textContent = 'PROBE6';
      document.querySelector(BODIES[0]).appendChild(line); planted.push(line);
      // 7 and 8 alter the real first label in place (undone in finally): it loses dominant-baseline (its painted centre
      // moves by about 6.8 units, past the 2-unit tolerance); its y attribute is shifted by +3 (label-y check)
      first.setAttribute('data-probe', 'PROBE7');
      first.removeAttribute('dominant-baseline');
      const noCentre = checkFigure('probe7', expected(DEFAULTS.r, DEFAULTS.t, DEFAULTS.peak)).violations.filter(v => v.includes('PROBE7'));
      first.setAttribute('dominant-baseline', origBaseline);
      first.setAttribute('data-probe', 'PROBE8');
      first.setAttribute('y', String(parseFloat(origY) + 3));
      const shifted = checkFigure('probe8', expected(DEFAULTS.r, DEFAULTS.t, DEFAULTS.peak)).violations.filter(v => v.includes('PROBE8'));
      first.setAttribute('y', origY);
      first.removeAttribute('data-probe');

      const all = checkFigure('probe', expected(DEFAULTS.r, DEFAULTS.t, DEFAULTS.peak)).violations;
      const named = all.filter(v => v.includes('PROBE'));
      const of = (p) => named.filter(v => v.includes(p));
      const beamCaught = beams.length === 1 && of('PROBE1').length === 1 &&
        of('PROBE1')[0].endsWith(`overlaps ${name(beams[0], box(beams[0]))}`);
      const clipCaught = of('PROBE2').some(v => v.includes('outside the viewBox'));
      const smallCaught = of('PROBE3').some(v => v.includes('renders at'));
      const textCaught = of('PROBE4').some(v => v.includes(`"${first.textContent.replace(NBSP_RE, ' ')}"`));
      const subCaught = of('PROBE5').some(v => v.includes('tspan') && v.includes('renders at'));
      const blockCaught = of('PROBE6').some(v => v.includes('computes'));
      const centreCaught = noCentre.some(v => v.includes('is painted centred at'));
      const yCaught = shifted.some(v => v.includes('label w_') && v.includes(' y is '));
      r = { beamCaught, clipCaught, smallCaught, textCaught, subCaught, blockCaught, centreCaught, yCaught, named: named.length };
    } finally {
      for (const n of planted) n.remove();
      // undo the in-place plants even if a check threw part-way
      first.removeAttribute('data-probe');
      if (origBaseline === null) first.removeAttribute('dominant-baseline'); else first.setAttribute('dominant-baseline', origBaseline);
      if (origY === null) first.removeAttribute('y'); else first.setAttribute('y', origY);
      for (const p of restore()) driveProblems.push(p);
    }
    const after = checkFigure('after', expected(DEFAULTS.r, DEFAULTS.t, DEFAULTS.peak)).violations;
    r.cleanAfter = after.length === 0;
    r.driveProblems = driveProblems;
    r.flagged = r.beamCaught && r.clipCaught && r.smallCaught && r.textCaught && r.subCaught && r.blockCaught &&
      r.centreCaught && r.yCaught && r.cleanAfter && driveProblems.length === 0;
    return r;
  }

  function budget() {
    need();
    window.scrollTo(0, 0);
    const innerH = window.innerHeight, innerW = window.innerWidth, doc = document.documentElement;
    const rect = (el) => el.getBoundingClientRect();
    const bottom = (el) => Math.round(rect(el).bottom);
    const seen = (el) => { const q = rect(el); return q.top >= 0 && Math.round(q.bottom) <= innerH && q.left >= 0 && q.right <= innerW + 0.5; };
    const inter = (a, b) => Math.round(Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)));
    const figBottom = bottom(fig), controlsBottom = bottom(ui.controls);
    const h1Bottom = bottom(ui.h1), backBottom = bottom(ui.back), h2Bottom = bottom(ui.h2);
    const controlsOverlap = inter(rect(ui.controls), rect(fig));
    const controlsClipped = ui.controls.scrollHeight > ui.controls.clientHeight + 1;
    const hscroll = doc.scrollWidth > doc.clientWidth;
    const controlsVisible = seen(ui.controls);
    const topVisible = seen(ui.h1) && seen(ui.back) && seen(ui.h2) && seen(fig) && controlsVisible;
    const ok = topVisible && !hscroll && controlsOverlap === 0 && !controlsClipped;
    return {
      viewport: [innerW, innerH], h1Bottom, backBottom, h2Bottom, figBottom, controlsBottom, hscroll, controlsVisible,
      topVisible, ok, pageHeight: doc.scrollHeight, scrollY: Math.round(window.scrollY), controlsOverlap, controlsClipped,
      docClientWidth: doc.clientWidth
    };
  }

  function all() {
    const inst = install();
    const s = sweep();
    return {
      install: inst,
      sweep: {
        combos: s.combos, violationCount: s.violations.length, sample: s.violations.slice(0, 10), minTextPx: s.minTextPx,
        minBlockPx: s.minBlockPx, minLines: s.minLines, minSubs: s.minSubs, outlineTotal: s.outlineTotal, arrowTotal: s.arrowTotal
      },
      sensitivity: sensitivity(),
      budget: budget()
    };
  }

  window.H = { install, sweep, sensitivity, budget, all, checkFigure, expected };
})();
