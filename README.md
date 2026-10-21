# Distributed load on a beam

A teaching simulation. A 4 m beam is fixed to a wall at **A**. Only the half **AB** (2 m) carries a load: a rectangular part and a triangular part, each set with a slider. The page draws the actual load, then replaces it with equivalent forces (one for the rectangle, one for the triangle, and one for the two combined), each with its size, direction and location, and writes out the calculation with the current numbers.

Open `dist/distributed_load_beam.html` in any browser. It is one self-contained file (about 37 KB): no server, no network, no external URL.

Live: https://zimmermant.github.io/distributed-load-beam/ (the root page redirects to the simulation, and the redirect drops any `?...` parameters, so a link with URL presets must point at `https://zimmermant.github.io/distributed-load-beam/dist/distributed_load_beam.html?r=100&t=-100&peak=B`). Source: https://github.com/zimmermant/distributed-load-beam

## The beam and the sign convention

A is at x = 0 (the wall), B at x = 2 m, C at x = 4 m, with x measured from A. Only AB is ever loaded; BC is drawn dimmer as "no load".

**+ means pushing down, − means pushing up**, for loads and forces alike. The page states this on the figure ("+ down, − up"), writes a real minus sign (U+2212), and never prints `−0`, `NaN` or `Infinity`.

## The controls

| Control | What it does |
|---|---|
| **Rectangular load** slider | w, constant along AB, from −200 to +200 N/m in steps of 5. |
| **Triangular load** slider | The triangle's peak value, same range and step. The triangle is that value at one end of AB and 0 at the other. |
| **zero at A, peak at B** / **zero at B, peak at A** | Which end the triangle comes to a point (w = 0). A is the wall. Exactly one button is pressed. |

Details that are easy to miss:

- **Snap to zero.** A slider value within ±10 N/m of zero becomes exactly 0, so the first non-zero values are ±15. A green tick marks the centre of each scale and its "0" label lights up while the value is 0.
- **Keyboard nudge.** One arrow-key step (5) is smaller than the snap zone, so a slider sitting at 0 could never leave it. From 0, an arrow key jumps straight to +15 or −15. From ±15 the next key toward zero lands on 0. A pointer drag just snaps.
- Every control visibly responds to hover, press, keyboard focus and selection.

The defaults are r = 100 N/m, t = 100 N/m, peak at B.

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

Values are **snapped exactly as the sliders would snap them**: clamped to ±200, rounded to a multiple of 5, and anything within ±10 of zero becomes 0. A "From the link" line under the title says what was set, what snapping changed (for example `r 500 → 200`) and what was ignored (a rejected value is echoed back, cut at 40 characters). For example `?r=500&t=3&peak=Q` shows: `From the link: r = 200 N/m, t = 0 N/m. Adjusted: r 500 → 200; t 3 → 0. Ignored: peak=Q (use A or B).` The line is written as text only, so nothing in the link can become markup.

Presets apply **once, at load**. **Nothing is locked**: students can still move every control, and reloading the link restores the setup.

Worked example links (shown relative to the page; put the `?...` part after `distributed_load_beam.html`, i.e. after `https://zimmermant.github.io/distributed-load-beam/dist/distributed_load_beam.html`):

```
distributed_load_beam.html?r=100&t=100&peak=B      # the defaults, written out
distributed_load_beam.html?r=100&t=-200&peak=B     # the parts cancel: F = 0, a couple, no single force
distributed_load_beam.html?r=100&t=-150&peak=B     # combined 50 N down at x = 0.00 m: the arrow is drawn at the wall end (its head overlaps the wall slightly)
distributed_load_beam.html?r=-75&t=150&peak=A      # equal and opposite parts (−150 N and +150 N): another couple
```

## Embedding in another page

The page contains no frame-busting code and sets no frame-blocking meta tag; the host's response headers decide the rest (GitHub Pages sends none). So it can sit in an iframe (for example in a Canvas page):

```html
<iframe src="https://zimmermant.github.io/distributed-load-beam/dist/distributed_load_beam.html?r=100&t=-100&peak=B" width="100%" height="750" style="border:0; max-width:800px" title="Distributed load on a beam" loading="lazy"></iframe>
```

- **Use the full `dist/...` address.** The short root address redirects and drops the `?...` presets.
- **Size.** The page is built to fit, with the whole figure and every control visible and no scrolling, in two budgets: **800 × 750** (an 800 px-wide Canvas iframe) and **1280 × 720** (a laptop browser). The snippet's `height="750"` and `max-width:800px` are those numbers.
- **Phones are out of scope.** Nothing is promised or tested below 700 px wide; the page stacks, shrinks and scrolls there.
- Presets work inside the frame (put the `?...` part on the `src`), and one page can hold several frames with different presets.
- Some hosts (an LMS, for instance) restrict which sites an iframe may load; that is a setting on their side. It has not been tried in any particular host.

## Layout in the window

The budgets drove the layout, and the numbers matter if you change the CSS (`src/styles.css`):

- The **figure is capped at 740 px wide** (a 960 × 560 viewBox, so SVG text of 16 units renders at about 12.3 px, just over the 12 px floor).
- **The controls and the calculation are below the figure at every window width; there is no side column.** The order is the title, the "From the link" note, the figure (centred when the window is wider than 740 px), then the controls and the calculation. Below 700 px the controls and the calculation are stacked; from 700 px up they sit side by side in one row, and **that row sticks to the bottom of the window** (at every width from 700 px up, wide windows included), so the controls stay in view while the figure is watched.
- The only media query is the 700 px one for that row. A wide window just leaves empty margins: the figure never shrinks below 740 px at 800 px and wider, so its text stays at 12 px or more.

## Develop

```bash
# use a working Node 20+ (always pass a glob to --test, never a directory)
node --test test/*.test.js         # the unit tests
node build.js                      # writes dist/distributed_load_beam.html
node tools/mutations.mjs --coverage --strict
                                   # breaks one thing at a time; the suite must fail each time, and
                                   # every test must fail under at least one break (a test with no
                                   # demonstrated teeth exits 1). Runs on a temporary copy, never
                                   # your files; takes about 13 minutes.
```

**Checking the real page in a browser.** Unit tests cannot see overlap, clipping or whether the page fits the window, so there is a browser harness (`tools/browser-harness.js`; its header explains every phase).

1. From the repo root: `python3 -m http.server 8742 --bind 127.0.0.1`
2. Open `http://127.0.0.1:8742/dist/distributed_load_beam.html` in a browser sized **800 × 750** (then reload so the layout settles).
3. In the browser's JavaScript console: `eval(await (await fetch('/tools/browser-harness.js')).text()); H.all()`

A pass means every phase is clean: `install` finds the figure at least 600 px wide; `sweep` drives the real sliders and peak buttons over 176 combinations (the 9 × 9 grid of r and t, plus near-cancelling and near-wall pairs, for both peaks) and reports `violations: []` (no text touching text, a graphic or the viewBox edge, and no arrow over a circle; every text at least 12 px; every dotted outline inside its column band; every column text and graphic inside the card of its column); `sensitivity` reports `flagged: true` (it plants seven faults and requires each to be named: a text on the beam, a text on another text, a text running past the viewBox edge, a size-10 text, a text straddling the edge of a column card, and two dotted-outline paths outside their column band, one above it and one between the columns; then a clean figure after removal); and `budget` reports `ok: true` (the page fits without scrolling and the sticky controls and calculation row, which sits below the figure, does not cover it). Repeat at **1280 × 720**; at 1000 × 700 the controls must at least stay on screen.

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
| `app.js` | Wiring, the presets and the "From the link" line. |
| `index.template.html`, `styles.css` | The page and its styles, inlined by `build.js`. |

## Rules this codebase keeps

- **Derive, never store.** The stored state is only `r`, `t` and `peak`.
- **One rounding point.** Numbers reach the screen only through `fmt` / `fmtFixed` (forces whole, locations two decimals). `-0` is impossible by construction.
- **One shared scope after inlining**, so every top-level name must be unique across modules. The build fails on a duplicate, and also on a column-0 statement that declares more than one name or destructures.
- **Fixed force scale.** Arrow length is `fs × |F|`, with no per-state rescaling.
- **Class contracts the browser harness relies on.** Every graphic drawn by `scene.js` carries class `g` (the wall and its hatching also `wall`; the A, B, C circles also `pc`; the dotted load outlines also `outline`); the three column cards and their heading bands carry class `card` and deliberately not `g`, so the harness's text-versus-graphic checks ignore them and its containment check finds them; every text carries class `t` (letters inside the circles: `tin`); every SVG text is at least 16 units. Remove a class and the harness stops seeing that element.
- **Tests that scan HTML strip the tags first** (the markup carries `style` attributes with hyphens before digits), then look for `-0`, `NaN`, `Infinity` and a hyphen-minus before a digit.
- **Every test has a named mutation it catches**, proven by `tools/mutations.mjs` (354 rows; every row caught; all 184 tests fail under at least one). Layout, overlap and fit are measured in a real browser, not eyeballed.
- **Link text never becomes markup.** The calculation is built only from numbers formatted by `fmt` / `fmtFixed` and fixed strings; the "From the link" line is set with `textContent`.
