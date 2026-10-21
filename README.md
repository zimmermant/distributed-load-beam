# Distributed load on a beam

A teaching simulation. A 4 m beam is fixed to a wall at **A**. Only the half **AB** (2 m) carries a load: a rectangular part and a triangular part, each set with a slider. The page draws the actual load, then replaces it with equivalent forces (one for the rectangle, one for the triangle, and one for the two combined), each with its size, direction and location, and writes out the calculation with the current numbers.

Open `dist/distributed_load_beam.html` in any browser. It is one self-contained file (about 43 KB): no server, no network, no external URL.

A second page, `dist/distributed_load_beam_detail.html` (about 61 KB, also one self-contained file), works the same calculation out step by step with symbols first and numbers last. A link at the bottom of the "How each force is calculated" box leads to it (see "The detailed-calculation page" below). **The two files belong together**: each links to the other by its relative file name, so both must sit in the same folder wherever they are served.

Live: https://zimmermant.github.io/distributed-load-beam/ (the root page redirects to the simulation, and the redirect drops any `?...` parameters, so a link with URL presets must point at `https://zimmermant.github.io/distributed-load-beam/dist/distributed_load_beam.html?r=100&t=-100&peak=B`; the detailed page is `https://zimmermant.github.io/distributed-load-beam/dist/distributed_load_beam_detail.html`). Source: https://github.com/zimmermant/distributed-load-beam

## The beam and the sign convention

A is at x = 0 (the wall), B at x = 2 m, C at x = 4 m, with x measured from A. Only AB is ever loaded; BC is drawn dimmer as "no load".

**+ means pushing down, − means pushing up**, for loads and forces alike. The page states this on the figure ("+ down, − up"), writes a real minus sign (U+2212), and never prints `−0`, `NaN` or `Infinity`.

## The controls

| Control | What it does |
|---|---|
| **Rectangular load** slider | w, constant along AB, from −200 N/m to +200 N/m in steps of 5 N/m; the scale under the slider reads `−200 N/m (up)`, `0 N/m`, `+200 N/m (down)`. |
| **Triangular load** slider | The triangle's peak value, same range and step. The triangle is that value at one end of AB and 0 at the other. |
| **zero at A, peak at B** / **zero at B, peak at A** | Which end the triangle comes to a point (w = 0). A is the wall. Exactly one button is pressed. |

Details that are easy to miss:

- **Snap to zero.** A slider value within ±10 N/m of zero becomes exactly 0, so the first non-zero values are ±15. A green tick marks the centre of each scale and its "0 N/m" label lights up while the value is 0.
- **Keyboard nudge.** One arrow-key step (5) is smaller than the snap zone, so a slider sitting at 0 could never leave it. From 0, an arrow key jumps straight to +15 or −15. From ±15 the next key toward zero lands on 0. A pointer drag just snaps.
- Every control visibly responds to hover, press, keyboard focus and selection.

The defaults are r = 100 N/m, t = 100 N/m, peak at B.

**Every number on the page carries its unit** (N, N/m or m), also inside the calculation: `F = w × L = 100 N/m × 2 m = 200 N`; `F = 200 N + (100 N) = 300 N, at x̄ = (200 N × 1.00 m + 100 N × 1.33 m) / 300 N = 1.11 m`. A negative term keeps its parentheses with the unit inside, `(−190 N)`. The space between a number and its unit is a no-break space (U+00A0), so a line break never separates them. The fraction ½ is a pure number and has no unit. `test/units.test.js` (the unit lint) builds the page's text for every slider state, every link note and the page's static text, and fails on any number without a unit or with a plain space in front of one.

## The equivalent forces

L = 2 m throughout.

| Force | Size | Where it acts |
|---|---|---|
| Rectangle | F = r × L | the middle of AB, x = 1.00 m |
| Triangle | F = ½ × t × L | one third of the way in from the larger end: x = 0.67 m (peak at A) or x = 1.33 m (peak at B) |
| Combined | F = F_rect + F_tri | x̄ = (F_rect × x_rect + F_tri × x_tri) / F, the point where the sum of moments about A is reproduced |

Positive F points down. The three arrows share **one fixed scale** (the same length per newton for every force and every slider setting), so a bigger force is always a visibly longer arrow; nothing auto-rescales.

In each of the three columns a **dotted outline of the load that column's force replaces** is drawn behind the arrow: the rectangle, the triangle, and the net load w(x) = r + t·f(x) (a trapezoid, or two triangles on opposite sides of the beam where the net load changes sign inside AB). It uses the same height scale as the top figure, spans AB only, sits on the face of the beam the load pushes from, and is absent when that load is zero. The arrow ends up inside its outline by design: it stands for the whole load at its centroid.

Each column is framed in a **rounded card tinted in its colour**, and the three text lines (name, force, location) are the card's heading, in a slightly darker band across its top, so it is obvious at a glance which label goes with which diagram. The cards are fixed: nothing moves when a slider moves, and the beam copy, its wall, the arrows and the outlines all lie inside their card (the geometry is `COLS.card` in `src/layout.js`).

**A force at or near the wall** (0 ≤ x̄ < 0.12 m) is drawn like any other, at the same fixed scale, with its head on the correct beam face, and its text and calculation carry no wall note. At x̄ = 0 exactly the arrow head partly overlaps the wall rectangle: that is accepted and is not a defect. Examples: r = 100, t = −150, peak B gives 50 N down at x̄ = 0.00 m; r = −130, t = 190, peak B gives 70 N up at x̄ = 0.10 m.

**A very small force** (a few newtons) is still drawn to the same fixed scale, so its arrow can be a short sliver. That is deliberate: the scale never changes, and the text under the figure carries the value.

When there is no arrow, the text under the figure says why:

- **A part that is zero** has no force and no location ("no load of this kind").
- **The combined force has no location only when F is exactly 0.** If both parts are non-zero that is a **couple**: equal and opposite forces at different places, which no single force can replace. The page says so ("the parts cancel: no single force") and adds a short note in the calculation. If both parts are zero it simply says "no load".
- **The combined force can land off the beam** when opposite loads nearly cancel (for example r = 100, t = −190, peak B puts x̄ at −5.33 m, left of the wall; r = 100, t = −195, peak A puts it at 14.00 m, beyond C). No arrow is drawn, and the text says "(off the beam)". The calculation says whether that is left of the wall or beyond C.

Nothing here is stored: the state is only `r`, `t` and `peak`, and everything else is computed from them.

## Presetting a problem from the link

Add optional query parameters to the page's address to start from a chosen setup. Any combination works; anything left out keeps its default.

| Parameter | Meaning | Accepted text |
|---|---|---|
| `r` | rectangular load, N/m | a number |
| `t` | triangular peak load, N/m | a number |
| `peak` | which end the triangle peaks at | `A` or `B` (either case) |

Numbers are plain decimals (`-150`, `+5`, `.5`, `1.`; no exponent, no hex, not empty). The page prints negative numbers with a real minus sign (−), and a number copied from the screen with that sign (a leading U+2212) is accepted too. A value that does not parse is ignored, as if absent. If a parameter is repeated, the **first one wins**. **Unknown parameters are ignored.**

Values are **snapped exactly as the sliders would snap them**: clamped to ±200, rounded to a multiple of 5, and anything within ±10 of zero becomes 0. A "From the link" line under the title says what was set, what snapping changed (for example `r 500 N/m → 200 N/m`) and what was ignored (a rejected value is echoed back, cut at 40 characters). For example `?r=500&t=3&peak=Q` shows: `From the link: r = 200 N/m, t = 0 N/m. Adjusted: r 500 N/m → 200 N/m; t 3 N/m → 0 N/m. Ignored: peak=Q (use A or B).` The line is written as text only, so nothing in the link can become markup.

Presets apply **once, at load**. **Nothing is locked**: students can still move every control, and reloading the link restores the setup.

Worked example links (shown relative to the page; put the `?...` part after `distributed_load_beam.html`, i.e. after `https://zimmermant.github.io/distributed-load-beam/dist/distributed_load_beam.html`):

```
distributed_load_beam.html?r=100&t=100&peak=B      # the defaults, written out
distributed_load_beam.html?r=100&t=-200&peak=B     # the parts cancel: F = 0, a couple, no single force
distributed_load_beam.html?r=100&t=-150&peak=B     # combined 50 N down at x = 0.00 m: the arrow is drawn at the wall end (its head overlaps the wall slightly)
distributed_load_beam.html?r=-75&t=150&peak=A      # equal and opposite parts (−150 N and +150 N): another couple
```

## The detailed-calculation page

`dist/distributed_load_beam_detail.html` explains where the numbers on the main page come from. Heading: "Distributed load on a beam: detailed calculation". It is one centred 740 px column, top to bottom:

1. **Actual load on AB.** A figure of the beam (same wall, beam and A, B, C markers as the main page) with the net load on AB drawn as one outline, and two labels, **w_A** and **w_B**, the signed heights of the load at A and at B in N/m (+ down). The labels **move up and down as the sliders change the heights**; each is tied to its corner of the outline by a thin dotted leader, and a label never sits on the beam (near zero height it stops following). The same sliders and peak buttons as the main page sit directly under the figure, with the same behaviour (snap to zero, keyboard nudge from zero).
2. **Calculating the rectangular loading**, 3. **Calculating the triangular loading** and 4. **Calculating the combined loading.** Each block states its steps **symbolically first** (no digit at all in those lines: F_rect = w_rect · L, r_rect = ½ · L, and so on) and **plugs the numbers in only in the last lines**, with every number tied to its variable (for example L = 2 m) and carrying its unit. The last block finds F_equiv = F_rect + F_tri and then uses **the torque equation about A** (downward forces positive: r_equiv · F_equiv = r_rect · F_rect + r_tri · F_tri) to solve for the location r_equiv of the single equivalent force. Names: F_rect, F_tri, F_equiv; r_rect, r_tri, r_equiv; w_A, w_B (plus w_rect, w_tri, L and the torque τ), with real subscripts. Every F and r equals the main page's value for the same sliders, because both pages call the same code. The main page's rules carry over: forces whole, locations two decimals, a true minus sign, negative terms in parentheses with the unit inside, the "(worked from the unrounded locations)" note when the printed terms would not reproduce the printed answer, and the couple and off-the-beam wording.

**How to reach it.** Follow **"More detailed calculation"**, the link at the bottom of the "How each force is calculated" box on the main page. **"Back to the simulation"**, under the heading of the detailed page, returns.

**The slider values travel in the link.** The main page's link always points at `distributed_load_beam_detail.html?r=<N/m>&t=<N/m>&peak=A|B` for the current sliders (it is updated at every change), and the back link does the same in the other direction. These are exactly the parameters described under "Presetting a problem from the link", read by the same parser with the same snapping, and the same "From the link" line appears on the detailed page naming the values the link carried (it also appears on the main page after "Back to the simulation"), with an "Adjusted" or "Ignored" part added when a hand-edited link had values snapped or dropped. **The two pages never share live state**: each keeps its own copy, so moving a slider on one page changes the other only when you follow the link. Opening either page without parameters shows the defaults (r = 100 N/m, t = 100 N/m, peak at B).

Example links for the detailed page (relative to the page, as above; the full address is `https://zimmermant.github.io/distributed-load-beam/dist/distributed_load_beam_detail.html` followed by the `?...` part):

```
distributed_load_beam_detail.html?r=100&t=100&peak=B      # the defaults, written out
distributed_load_beam_detail.html?r=100&t=-200&peak=B     # the parts cancel: F_equiv = 0, a couple, no r_equiv
distributed_load_beam_detail.html?r=-50&t=150&peak=B      # w_A = −50 N/m, w_B = 100 N/m: opposite signs, so the load is two triangles on opposite faces and the labels sit on opposite sides of the beam
```

Both files must be published together, in the same folder (for example both under `dist/`), or the two links break.

## Embedding in another page

The page contains no frame-busting code and sets no frame-blocking meta tag; the host's response headers decide the rest (GitHub Pages sends none). So it can sit in an iframe (for example in a Canvas page):

```html
<iframe src="https://zimmermant.github.io/distributed-load-beam/dist/distributed_load_beam.html?r=100&t=-100&peak=B" width="100%" height="750" style="border:0; max-width:800px" title="Distributed load on a beam" loading="lazy"></iframe>
```

- **Use the full `dist/...` address.** The short root address redirects and drops the `?...` presets.
- **Size.** The page is built to fit, with the whole figure and every control visible and no scrolling, in two budgets: **800 × 750** (an 800 px-wide Canvas iframe) and **1280 × 720** (a laptop browser). The snippet's `height="750"` and `max-width:800px` are those numbers.
- **Phones are out of scope.** Nothing is promised or tested below 700 px wide; the page stacks, shrinks and scrolls there.
- Presets work inside the frame (put the `?...` part on the `src`), and one page can hold several frames with different presets.
- **The detailed page in a frame.** The "More detailed calculation" link opens the detailed page inside the same frame (publish both files together), or point the `src` at `distributed_load_beam_detail.html` directly. That page is taller than any window: only its top item (heading, figure and sliders) is built to fit **800 × 750**, 1280 × 720 and 1000 × 700, and the three calculation blocks below it **scroll** inside the frame.
- Some hosts (an LMS, for instance) restrict which sites an iframe may load; that is a setting on their side. It has not been tried in any particular host.

## Layout in the window

The budgets drove the layout, and the numbers matter if you change the CSS (`src/styles.css`):

- The **figure is capped at 740 px wide** (a 960 × 560 viewBox, so SVG text of 16 units renders at about 12.3 px, just over the 12 px floor).
- **The controls and the calculation are below the figure at every window width; there is no side column.** The order is the title, the "From the link" note, the figure (centred when the window is wider than 740 px), then the controls and the calculation. Below 700 px the controls and the calculation are stacked; from 700 px up they sit side by side in one row, and **that row sticks to the bottom of the window** (at every width from 700 px up, wide windows included), so the controls stay in view while the figure is watched.
- **The detailed page** uses the same 740 px column and the same sliders and CSS as above, with its own figure (a 960 × 356 viewBox, labels of 20 units with 16-unit subscripts, so subscripts also render at 12 px or more) and no sticky row: only the top item has to fit the window and the rest scrolls. Its extra rules are in `src/detail.css`; there is no media query of its own.
- The only media query is the 700 px one for that row. A wide window just leaves empty margins: the figure never shrinks below 740 px at 800 px and wider, so its text stays at 12 px or more.

## Develop

```bash
# use a working Node 20+ (always pass a glob to --test, never a directory)
node --test test/*.test.js         # the unit tests
node build.js                      # writes BOTH pages: dist/distributed_load_beam.html and
                                   # dist/distributed_load_beam_detail.html
node tools/mutations.mjs --coverage --strict
                                   # breaks one thing at a time; the suite must fail each time, and
                                   # every test must fail under at least one break (a test with no
                                   # demonstrated teeth exits 1). Runs on a temporary copy, never
                                   # your files; takes about 53 minutes (927 rows).
```

**The two-page build.** `node build.js` makes both pages from one run, each from its own template, stylesheets and module list (`PAGES`, `MODULES` and `DETAIL_MODULES` in `build.js`). The main page is `physics, format, svg, state, presets, link, layout, scene, panel, controls, app`. The detailed page uses the same modules up to `controls`, then adds `detail-layout, detail-scene, detail-math, detail-app`. Each file must stay at or under 250 KB, contain no external URL, and be byte-for-byte reproducible (building twice, or on another machine, gives identical files); the build fails otherwise. Because the shared modules are inlined into both pages, a change to one of them changes both files, and `dist/` is committed, so rebuild and commit both files together.

**Checking the real page in a browser.** Unit tests cannot see overlap, clipping or whether the page fits the window, so there is a browser harness (`tools/browser-harness.js`; its header explains every phase).

1. From the repo root: `python3 -m http.server 8742 --bind 127.0.0.1`
2. Open `http://127.0.0.1:8742/dist/distributed_load_beam.html` in a browser sized **800 × 750** (then reload so the layout settles).
3. In the browser's JavaScript console: `eval(await (await fetch('/tools/browser-harness.js')).text()); H.all()`

A pass means every phase is clean: `install` finds the figure at least 600 px wide; `sweep` drives the real sliders and peak buttons over 176 combinations (the 9 × 9 grid of r and t, plus near-cancelling and near-wall pairs, for both peaks) and reports `violations: []` (no text touching text, a graphic or the viewBox edge, and no arrow over a circle; every text at least 12 px; every dotted outline inside its column band; every column text and graphic inside the card of its column); `sensitivity` reports `flagged: true` (it plants seven faults and requires each to be named: a text on the beam, a text on another text, a text running past the viewBox edge, a size-10 text, a text straddling the edge of a column card, and two dotted-outline paths outside their column band, one above it and one between the columns; then a clean figure after removal); and `budget` reports `ok: true` (the page fits without scrolling and the sticky controls and calculation row, which sits below the figure, does not cover it). Repeat at **1280 × 720**; at 1000 × 700 the controls must at least stay on screen.

**The detailed page has its own harness**, `tools/detail-harness.js` (its header explains every phase). Run it the same way: serve the repo root with `python3 -m http.server 8742 --bind 127.0.0.1`, open `http://127.0.0.1:8742/dist/distributed_load_beam_detail.html` in a browser sized **800 × 750** and reload, then in the console: `eval(await (await fetch('/tools/detail-harness.js')).text()); H.all()`. A pass means: `install` finds the figure at least 600 px wide; `sweep` drives the real sliders and peak buttons over 176 combinations (the 9 × 9 grid of r and t, plus the near-cancelling pairs, for both peaks) and reports `violations: []` (the w_A and w_B labels and the caption inside the viewBox and touching no beam, wall, outline, leader, dot, marker or each other; the labels' heights, leaders and dots equal to an independent recomputation, so they really do track the sliders; every figure text and tspan at least 12 px, and every calculation line and subscript at least 12 px; no horizontal scroll); `sensitivity` reports `flagged: true` (it plants eight faults, among them a text over the beam, one past the edge, a size-10 text, a size-10 subscript, a small calculation line, a label drawn without its central baseline and a label shifted by 3 units, and requires each to be named); and `budget` reports `ok: true` (heading, back link, "Actual load on AB" heading, figure and sliders fully visible without scrolling). Repeat at **1280 × 720** and **1000 × 700**; all three sizes must be clean. The unit tests cannot see layout, so this check is what proves the second page fits.

## Layout of the code

| Module | Job |
|---|---|
| `physics.js` | Constants (beam, range, step, snap zone), `snapW`, `nextW` (the keyboard jump), `loadAt`, `equivalents`. |
| `format.js` | The only place a number is rounded for display: `fmt`, `fmtFixed` (locations, always two decimals), `forceWords`, `locWords`. |
| `svg.js` | `el` / `clear` / `text` helpers and the colour palette. |
| `state.js` | The store: three stored values (`r`, `t`, `peak`); everything else is `derive()`d. |
| `presets.js` | URL presets: `parsePresets` and `describePresets`. Held outside the state. |
| `layout.js` | Figure geometry as pure functions (the viewBox, the fixed force scale `COLS.fs`, `loadShapes`, `forceArrow`). |
| `scene.js` | Draws the SVG from the state alone. |
| `panel.js` | The worked calculation, as a pure string (`calcLines`). |
| `controls.js` | Binds the sliders and peak buttons to the state; `controlsView` is pure. |
| `app.js` | Wiring, the presets, the "From the link" line, and the "More detailed calculation" link, whose address follows the sliders. |
| `link.js` | What the two pages share about their links: both file names and `presetQuery`, which turns a state into `?r=…&t=…&peak=…` (read back by `parsePresets`). |
| `index.template.html`, `styles.css` | The main page and its styles, inlined by `build.js`. |
| `detail-layout.js` | The detailed page's figure geometry as pure functions: the load outline, the arrows, and the w_A / w_B label positions that follow the heights. |
| `detail-scene.js` | Draws the detailed page's SVG from the state alone. |
| `detail-math.js` | The three calculation blocks (set-up lines with symbols only, then plug-in lines with the numbers) as pure strings, from the same `equivalents` / `derive` as the main page. |
| `detail-app.js` | Wiring of the detailed page: the sliders, the figure, the blocks, the "From the link" line and the back link. |
| `detail.template.html`, `detail.css` | The detailed page and its extra styles (built after `styles.css`). |

## Rules this codebase keeps

- **Derive, never store.** The stored state is only `r`, `t` and `peak`.
- **One rounding point.** Numbers reach the screen only through `fmt` / `fmtFixed` (forces whole, locations two decimals). `-0` is impossible by construction.
- **One shared scope after inlining**, so every top-level name must be unique across the modules of each page (the detail modules prefix theirs with `detail`). The build fails on a duplicate, and also on a column-0 statement that declares more than one name or destructures.
- **Fixed force scale.** Arrow length is `fs × |F|`, with no per-state rescaling.
- **Class contracts the browser harness relies on.** Every graphic drawn by `scene.js` carries class `g` (the wall and its hatching also `wall`; the A, B, C circles also `pc`; the dotted load outlines also `outline`); the three column cards and their heading bands carry class `card` and deliberately not `g`, so the harness's text-versus-graphic checks ignore them and its containment check finds them; every text carries class `t` (letters inside the circles: `tin`); every SVG text is at least 16 units. Remove a class and the harness stops seeing that element.
- **Tests that scan HTML strip the tags first** (the markup carries `style` attributes with hyphens before digits), then look for `-0`, `NaN`, `Infinity` and a hyphen-minus before a digit.
- **Every test has a named mutation it catches**, proven by `tools/mutations.mjs` (927 rows; every row caught; all 293 tests fail under at least one). Layout, overlap and fit are measured in a real browser, not eyeballed.
- **Numbers on the detailed page follow the main page's rules**, and one more: no digit appears in a set-up line. `test/detail-units.test.js` is the unit lint (and the no-digit lint) for that page's text over every slider state, as `test/units.test.js` is for the main page.
- **Link text never becomes markup.** The calculation is built only from numbers formatted by `fmt` / `fmtFixed` and fixed strings; the "From the link" line is set with `textContent`.
