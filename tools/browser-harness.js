// Browser verification harness for dist/distributed_load_beam.html (Task 8).
//
// Not part of the build (build.js MODULES does not list it). Serve the app folder so the
// built page and this file share an origin, open dist/distributed_load_beam.html, then run
// in the page:
//
//   eval(await (await fetch('/tools/browser-harness.js')).text());
//   H.install();  H.sweep();  H.sensitivity();  H.budget();     // or just H.all()
//
// Run it at three viewports (set the Browser pane, then RELOAD, then install):
//   1280x720  and  800x750   every phase must pass: violations [], flagged true, budget.ok true
//   1000x700                 the controls must at least be visible (controlsVisible true);
//                            page scroll is acceptable there if they stay on screen
//
// What each phase proves
//   install      the figure renders >= 600 px wide (getBBox metrics are untrustworthy in a
//                collapsed pane); stores element references.
//   sweep        drives the REAL state through the sliders' input events (no keydown, so
//                pointer-style input) and the peak buttons, over the 9x9 grid of r,t x both
//                peaks plus the near-cancel sets, and after each state runs checkFigure.
//                It also checks the drive worked (slider values, readouts, pressed button).
//   sensitivity  plants four texts: one on the beam (and only the beam), one on another text,
//                one past the viewBox edge, one at font-size 10, and two dotted-outline paths (one
//                above the column band, one between the columns); requires checkFigure to name
//                each, and a clean figure after removal: proves the checker can see each fault.
//   budget       the page fits (scrollHeight <= innerHeight), the sticky controls row does not
//                cover the figure, #controls and #calc show all their content, bottoms <=
//                innerHeight, no horizontal scroll. (The row is position: sticky; bottom: 0, so a
//                bottom <= innerHeight alone proves nothing: its rect is clamped to the viewport.)
(function () {
  const VB = { w: 960, h: 560 };
  const TOL = 0.5;           // overlap counts only if the intersection exceeds this in x AND y
  const MIN_FIG_PX = 600;
  const MIN_TEXT_PX = 12;
  const GRID = [-200, -150, -100, -15, 0, 15, 100, 150, 200];
  // near-cancel pairs, plus [-130, 190] whose combined force is at x = 0.10 m (the 'near the wall' text, no arrow)
  const NEAR_CANCEL = [[100, -190], [100, -195], [100, -200], [-100, 190], [-100, 195], [-100, 200], [-130, 190]];
  const DEFAULTS = { r: 100, t: 100, peak: 'B' };
  const EXPECTED_COMBOS = 9 * 9 * 2 + 7 * 2;   // 176: the grid plus the 7 near-cancel / near-wall pairs, both peaks
  const MIN_TEXTS = 20, MIN_GS = 20;   // non-vacuity floors: a checker that finds nothing to measure proves nothing
  const MIN_OUTLINES = 400;            // sweep floor: 142 of the 176 combos draw >= 3 dotted outlines, 32 draw 2 and 2 draw none; the real total is about 528, so 400 is a safe floor
  // Column geometry for check 9, the same numbers as COLS, BEAM_H and LOADED_L in src/layout.js
  // (test/layout.test.js reads this file and fails if they drift apart).
  const COLS_X = [20, 330, 640], COLS_OFFSET = 30, COLS_PX = 60, COLS_BEAM_Y = 424, COLS_BAND = 108, BEAM_H = 24, LOADED_L = 2;
  const OUTLINE_Y = [COLS_BEAM_Y - COLS_BAND, COLS_BEAM_Y + BEAM_H + COLS_BAND];
  const OUTLINE_X = COLS_X.map(x => [x + COLS_OFFSET, x + COLS_OFFSET + LOADED_L * COLS_PX]);
  const EPS = 0.01;

  let fig = null, ui = null;

  function need() {
    if (!fig) throw new Error('Run H.install() first.');
  }

  function install() {
    const f = document.getElementById('fig');
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
      controls: document.getElementById('controls'), calc: document.getElementById('calc')
    };
    for (const k in ui) if (!ui[k]) throw new Error(`Missing page element for "${k}".`);
    return { ok: true, figPx: Math.round(figPx) };
  }

  // ---- measuring -------------------------------------------------------------------------
  const box = (el) => { const b = el.getBBox(); return { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; };
  const hits = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > TOL && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > TOL;
  const outside = (b) => b.x0 < 0 || b.y0 < 0 || b.x1 > VB.w || b.y1 > VB.h;
  const r1 = (n) => Math.round(n * 10) / 10;
  const name = (el, b) => el.tagName === 'text'
    ? `text "${el.textContent}"`
    : `<${el.tagName}${el.getAttribute('class') ? '.' + el.getAttribute('class').replace(/\s+/g, '.') : ''}> @${r1(b.x0)},${r1(b.y0)}-${r1(b.x1)},${r1(b.y1)}`;
  const topLevelG = () => Array.from(fig.querySelectorAll('.g')).filter(e => !e.parentElement.closest('.g'));

  // Every geometry rule in one place; used by sweep and sensitivity.
  // Returns { violations: string[], minPx, nTexts, nG }.
  function checkFigure(tag) {
    const out = [];
    const bad = (msg) => out.push(`${tag}: ${msg}`);
    const texts = Array.from(fig.querySelectorAll('text.t')).map(el => ({ el, b: box(el) }));
    const tins = Array.from(fig.querySelectorAll('text.tin')).map(el => ({ el, b: box(el) }));
    const gs = topLevelG().map(el => ({ el, b: box(el) }));
    const outlines = Array.from(fig.querySelectorAll('.outline')).map(el => ({ el, b: box(el) }));
    const pcs = gs.filter(g => g.el.classList.contains('pc'));
    const walls = gs.filter(g => g.el.classList.contains('wall'));
    const arrows = gs.filter(g => !g.el.classList.contains('pc') && !g.el.classList.contains('wall') &&
      g.el.tagName === 'g' && g.el.firstElementChild && g.el.firstElementChild.tagName === 'line');

    for (const x of texts.concat(tins)) if (outside(x.b)) bad(`${name(x.el, x.b)} outside the viewBox`);          // 1
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {                          // 2
      if (hits(texts[i].b, texts[j].b)) bad(`${name(texts[i].el, texts[i].b)} overlaps ${name(texts[j].el, texts[j].b)}`);
    }
    for (const x of texts) for (const g of gs) {                                                                 // 3
      if (hits(x.b, g.b)) bad(`${name(x.el, x.b)} overlaps ${name(g.el, g.b)}`);
    }
    for (const x of texts) for (const n of tins) {                                                               // 4
      if (hits(x.b, n.b)) bad(`${name(x.el, x.b)} overlaps ${name(n.el, n.b)}`);
    }
    for (const a of arrows) for (const c of pcs) {                                                               // 5 (the dimension line group also counts as an arrow group: harmless)
      if (hits(a.b, c.b)) bad(`${name(a.el, a.b)} overlaps circle ${name(c.el, c.b)}`);
    }
    for (const g of gs) if (outside(g.b)) bad(`${name(g.el, g.b)} outside the viewBox`);                         // 6
    for (const a of arrows) for (const w of walls) {                                                             // 8
      if (hits(a.b, w.b)) bad(`${name(a.el, a.b)} overlaps wall ${name(w.el, w.b)}`);
    }
    for (const o of outlines) {                                                                                  // 9
      const inY = o.b.y0 >= OUTLINE_Y[0] - EPS && o.b.y1 <= OUTLINE_Y[1] + EPS;
      const inX = OUTLINE_X.some(([a, z]) => o.b.x0 >= a - EPS && o.b.x1 <= z + EPS);
      if (!inY || !inX) bad(`${name(o.el, o.b)} outside its column band`);
    }
    if (texts.length + tins.length < MIN_TEXTS) bad(`only ${texts.length + tins.length} texts found (< ${MIN_TEXTS}): the checks are vacuous`);
    if (gs.length < MIN_GS) bad(`only ${gs.length} top-level .g found (< ${MIN_GS}): the checks are vacuous`);

    const scale = fig.getBoundingClientRect().width / VB.w;                                                      // 7
    let minPx = Infinity;
    for (const el of fig.querySelectorAll('text')) {
      const px = parseFloat(el.getAttribute('font-size')) * scale;
      if (px < minPx) minPx = px;
      if (!(px >= MIN_TEXT_PX)) bad(`${name(el, box(el))} renders at ${r1(px)} px (< ${MIN_TEXT_PX})`);
    }
    return { violations: out, minPx, nTexts: texts.length + tins.length, nG: gs.length, nOutlines: outlines.length };
  }

  // ---- driving the real UI ---------------------------------------------------------------
  const readoutOf = (v) => v < 0 ? '−' + Math.abs(v) : String(v);
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
    let combos = 0, minTextPx = Infinity, minTexts = Infinity, minGs = Infinity, outlineTotal = 0;
    const pairs = [];
    for (const r of GRID) for (const t of GRID) pairs.push([r, t]);
    for (const p of NEAR_CANCEL) pairs.push(p);
    try {
      for (const peak of ['A', 'B']) for (const [r, t] of pairs) {
        const tag = tagOf(r, t, peak);
        for (const p of drive(r, t, peak, tag)) violations.push(p);
        const c = checkFigure(tag);
        for (const v of c.violations) violations.push(v);
        minTextPx = Math.min(minTextPx, c.minPx);
        minTexts = Math.min(minTexts, c.nTexts);
        minGs = Math.min(minGs, c.nG);
        outlineTotal += c.nOutlines;
        combos++;
      }
      if (combos !== EXPECTED_COMBOS) violations.push(`sweep ran ${combos} combos, expected ${EXPECTED_COMBOS}`);
      if (outlineTotal < MIN_OUTLINES) violations.push(`sweep found only ${outlineTotal} dotted outlines (< ${MIN_OUTLINES}): check 9 is vacuous`);
    } finally {
      for (const p of restore()) violations.push(p);
    }
    return { combos, violations, minTextPx: r1(minTextPx), minTexts, minGs, outlineTotal };
  }

  function plant(x, y, str, size) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    n.setAttribute('class', 't');
    n.setAttribute('x', x);
    n.setAttribute('y', y);
    n.setAttribute('font-size', size);
    n.textContent = str;
    fig.appendChild(n);
    return n;
  }

  // A path of class "g outline" (as scene.js draws them) with the given bounding box corners.
  function plantOutline(x0, y0, x1, y1) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    n.setAttribute('class', 'g outline');
    n.setAttribute('d', `M${x0} ${y0} L${x1} ${y0} L${x1} ${y1} Z`);
    n.setAttribute('fill', 'none');
    n.setAttribute('stroke', '#000000');
    fig.appendChild(n);
    return n;
  }

  function sensitivity() {
    need();
    restore();
    const first = fig.querySelector('text.t');
    const planted = [];
    const put = (x, y, str, size) => { const n = plant(x, y, str, size); planted.push(n); return n; };
    let r;
    try {
      // 1: inside the beam where nothing else is (past B, before C): exactly one graphic may be named, and it is the beam
      const onBeam = put(500, 108, 'PROBE1', 16);
      const pb = box(onBeam);
      const beams = topLevelG().filter(e => e.tagName === 'rect' && e.getAttribute('class') === 'g')
        .filter(e => { const b = box(e); return b.x0 <= pb.x0 && b.y0 <= pb.y0 && b.x1 >= pb.x1 && b.y1 >= pb.y1; });
      put(first.getAttribute('x'), first.getAttribute('y'), 'PROBE2', 16);   // 2: exactly on an existing label
      put(950, 300, 'PROBE3', 16);                                             // 3: runs past x = 960
      put(500, 520, 'PROBE4', 10);                                             // 4: renders below 12 px
      // 5, 6: dotted outlines outside their band: above the column band (y 20..40), and between the columns in x (296..312)
      planted.push(plantOutline(700, 20, 760, 40));
      planted.push(plantOutline(296, 440, 312, 460));
      const all = checkFigure('probe').violations;
      const named = all.filter(v => v.includes('PROBE'));
      const outNamed = all.filter(v => v.includes('outside its column band'));
      const of = (p) => named.filter(v => v.includes(p));
      const beamCaught = beams.length === 1 && of('PROBE1').length === 1 &&
        of('PROBE1')[0].endsWith(`overlaps ${name(beams[0], box(beams[0]))}`);
      const textCaught = of('PROBE2').some(v => v.includes(`"${first.textContent}"`));
      const clipCaught = of('PROBE3').some(v => v.includes('outside the viewBox'));
      const smallCaught = of('PROBE4').some(v => v.includes('renders at'));
      const outYCaught = outNamed.filter(v => v.includes('@700,20-760,40')).length === 1;
      const outXCaught = outNamed.filter(v => v.includes('@296,440-312,460')).length === 1;
      const outOnlyPlanted = outNamed.length === 2;       // no genuine outline is flagged
      r = { beamCaught, textCaught, clipCaught, smallCaught, outYCaught, outXCaught, outOnlyPlanted, named: named.length + outNamed.length };
    } finally {
      for (const n of planted) n.remove();
      restore();
    }
    r.cleanAfter = checkFigure('after').violations.length === 0;
    r.flagged = r.beamCaught && r.textCaught && r.clipCaught && r.smallCaught &&
      r.outYCaught && r.outXCaught && r.outOnlyPlanted && r.cleanAfter;
    return r;
  }

  function budget() {
    need();
    const bottom = (el) => Math.round(el.getBoundingClientRect().bottom);
    const inter = (a, b) => Math.round(Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)));
    const innerH = window.innerHeight, doc = document.documentElement;
    const figRect = fig.getBoundingClientRect();
    const figBottom = bottom(fig), controlsBottom = bottom(ui.controls), calcBottom = bottom(ui.calc);
    const pageHeight = doc.scrollHeight;
    const sideOverlap = inter(ui.controls.parentElement.getBoundingClientRect(), figRect);   // the sticky .side row vs the figure, px^2
    const controlsOverlap = inter(ui.controls.getBoundingClientRect(), figRect);
    const calcOverlap = inter(ui.calc.getBoundingClientRect(), figRect);
    const controlsClipped = ui.controls.scrollHeight > ui.controls.clientHeight + 1;
    const calcClipped = ui.calc.scrollHeight > ui.calc.clientHeight + 1;
    const hscroll = doc.scrollWidth > doc.clientWidth;
    const controlsVisible = controlsBottom <= innerH;
    const fits = pageHeight <= innerH;
    const ok = figBottom <= innerH && controlsVisible && calcBottom <= innerH && !hscroll && fits &&
      sideOverlap === 0 && controlsOverlap === 0 && calcOverlap === 0 && !controlsClipped && !calcClipped;
    return {
      viewport: [window.innerWidth, innerH], figBottom, controlsBottom, calcBottom, hscroll, controlsVisible, ok,
      pageHeight, fits, scrollY: Math.round(window.scrollY), sideOverlap, controlsOverlap, calcOverlap,
      controlsClipped, calcClipped, docClientWidth: doc.clientWidth
    };
  }

  function all() {
    const inst = install();
    const s = sweep();
    return {
      install: inst,
      sweep: { combos: s.combos, violationCount: s.violations.length, sample: s.violations.slice(0, 10), minTextPx: s.minTextPx, minTexts: s.minTexts, minGs: s.minGs, outlineTotal: s.outlineTotal },
      sensitivity: sensitivity(),
      budget: budget()
    };
  }

  window.H = { install, sweep, sensitivity, budget, all, checkFigure };
})();
