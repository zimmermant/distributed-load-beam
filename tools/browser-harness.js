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
//   sensitivity  plants a text on the beam and a text on another text, and requires
//                checkFigure to name both: proves the sweep can see an overlap at all.
//   budget       figure, controls and calculation bottoms <= innerHeight, no horizontal scroll.
(function () {
  const VB = { w: 960, h: 560 };
  const TOL = 0.5;           // overlap counts only if the intersection exceeds this in x AND y
  const MIN_FIG_PX = 600;
  const MIN_TEXT_PX = 12;
  const GRID = [-200, -150, -100, -15, 0, 15, 100, 150, 200];
  const NEAR_CANCEL = [[100, -190], [100, -195], [100, -200], [-100, 190], [-100, 195], [-100, 200]];
  const DEFAULTS = { r: 100, t: 100, peak: 'B' };
  const EXPECTED_COMBOS = 9 * 9 * 2 + 6 * 2;

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

  // Every geometry rule in one place; used by sweep and sensitivity. Returns violation strings.
  function checkFigure(tag) {
    const out = [];
    const bad = (msg) => out.push(`${tag}: ${msg}`);
    const texts = Array.from(fig.querySelectorAll('text.t')).map(el => ({ el, b: box(el) }));
    const tins = Array.from(fig.querySelectorAll('text.tin')).map(el => ({ el, b: box(el) }));
    const gs = topLevelG().map(el => ({ el, b: box(el) }));
    const pcs = gs.filter(g => g.el.classList.contains('pc'));
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

    const scale = fig.getBoundingClientRect().width / VB.w;                                                      // 7
    let minPx = Infinity;
    for (const el of fig.querySelectorAll('text')) {
      const px = parseFloat(el.getAttribute('font-size')) * scale;
      if (px < minPx) minPx = px;
      if (!(px >= MIN_TEXT_PX)) bad(`${name(el, box(el))} renders at ${r1(px)} px (< ${MIN_TEXT_PX})`);
    }
    out.minPx = minPx;
    return out;
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
    let combos = 0, minTextPx = Infinity;
    const pairs = [];
    for (const r of GRID) for (const t of GRID) pairs.push([r, t]);
    for (const p of NEAR_CANCEL) pairs.push(p);
    for (const peak of ['A', 'B']) for (const [r, t] of pairs) {
      const tag = tagOf(r, t, peak);
      const probs = drive(r, t, peak, tag);
      for (const p of probs) violations.push(p);
      const found = checkFigure(tag);
      for (const v of found) violations.push(v);
      if (found.minPx < minTextPx) minTextPx = found.minPx;
      combos++;
    }
    if (combos !== EXPECTED_COMBOS) violations.push(`sweep ran ${combos} combos, expected ${EXPECTED_COMBOS}`);
    for (const p of restore()) violations.push(p);
    return { combos, violations, minTextPx: r1(minTextPx) };
  }

  function plant(x, y, str) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    n.setAttribute('class', 't');
    n.setAttribute('x', x);
    n.setAttribute('y', y);
    n.setAttribute('font-size', 16);
    n.textContent = str;
    fig.appendChild(n);
    return n;
  }

  function sensitivity() {
    need();
    restore();
    const first = fig.querySelector('text.t');
    const onBeam = plant(300, 102, 'PROBE1');                                   // the beam's top face is y = 90, bottom 114
    const onText = plant(first.getAttribute('x'), first.getAttribute('y'), 'PROBE2');   // exactly on an existing label
    let named;
    try {
      named = checkFigure('probe').filter(v => v.includes('PROBE'));
    } finally {
      onBeam.remove();
      onText.remove();
    }
    const beamCaught = named.some(v => v.includes('PROBE1') && /<rect/.test(v));
    const textCaught = named.some(v => v.includes('PROBE2') && v.includes(`"${first.textContent}"`));
    const cleanAfter = checkFigure('after').length === 0;
    return { flagged: beamCaught && textCaught && cleanAfter, beamCaught, textCaught, cleanAfter, named: named.length };
  }

  function budget() {
    need();
    const bottom = (el) => Math.round(el.getBoundingClientRect().bottom);
    const figBottom = bottom(fig), controlsBottom = bottom(ui.controls), calcBottom = bottom(ui.calc);
    const hscroll = document.documentElement.scrollWidth > window.innerWidth;
    const controlsVisible = controlsBottom <= window.innerHeight;
    const ok = figBottom <= window.innerHeight && controlsVisible && calcBottom <= window.innerHeight && !hscroll;
    return {
      viewport: [window.innerWidth, window.innerHeight], figBottom, controlsBottom, calcBottom, hscroll, controlsVisible, ok,
      scrollY: Math.round(window.scrollY), pageHeight: document.documentElement.scrollHeight   // informational
    };
  }

  function all() {
    const inst = install();
    const s = sweep();
    return {
      install: inst,
      sweep: { combos: s.combos, violationCount: s.violations.length, sample: s.violations.slice(0, 10), minTextPx: s.minTextPx },
      sensitivity: sensitivity(),
      budget: budget()
    };
  }

  window.H = { install, sweep, sensitivity, budget, all, checkFigure };
})();
