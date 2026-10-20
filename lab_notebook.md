# Lab Notebook

## 2026-10-20 - Task 4: URL presets

### Summary
Added `src/presets.js` (pure, no DOM, no dependency on state.js) and `test/presets.test.js` (15 tests), and put `'presets.js'` after `'state.js'` in `MODULES` in `build.js`. `parsePresets(search)` reads `?r=`, `?t=` and `?peak=` and returns `{ r, t, peak, adjusted, ignored }` (r/t/peak are `undefined` when absent or ignored); `describePresets(p)` words it: `From the link: r = 100 N/m, t = −190 N/m, peak at B. Adjusted: r 7 → 0. Ignored: peak=c (use A or B).` (a part that is empty is left out; empty string when nothing was given). Behaviour is ported from `../torque_i_beam/src/presets.js` including its review fixes: unambiguous number regex, leading U+2212 turned into `-`, first duplicate wins, unknown params silently ignored, `adjusted` note only when the PRINTED before/after (`fmt`) differ, ignored raw value cut to 40 code points (`Array.from`) plus an ellipsis, `-0` becomes `0`. Tests first (RED: module not found), then GREEN; full suite 59/59.

### Decisions made
- Values are snapped with `snapW`, the same snapping as the sliders, so a link can never set a state a slider could not.
- Note texts: ignored r/t `r=abc (use a number of N/m)`, ignored peak `peak=c (use A or B)`, adjusted `r 7 → 0`. In the description a value that was ignored is not listed among the set values. When only ignored/adjusted notes exist, the "From the link:" sentence is simply omitted (the brief says to omit an empty part), so e.g. `?peak=c` reads `Ignored: peak=c (use A or B).`.
- `peak` is case-insensitive and trimmed (`b` gives `B`); case folding is not noted as an adjustment. Param names are case-sensitive (`R=50` is unknown and ignored).
- The brief's 20,000-digit timing test is kept verbatim, but the ambiguous pattern `(\d+\.?\d*|\.\d+)` takes only ~180 ms at 20,000 digits here (under the 250 ms limit), so that test alone would not catch a regression. Added a second test at 60,000 digits (~1.6 s for the ambiguous pattern; verified by mutation that it fails with 'r took 1599 ms').
- All top-level names in presets.js are `PRESET_*` / `preset*` so the build's duplicate-name check cannot collide with other modules.

### Problems encountered
- None beyond the timing-threshold finding above.

### Open questions / next steps
- Task 7 (app.js) should call `parsePresets(location.search)`, apply `{r, t, peak}` through `state.set`, and show `describePresets` as the link note.
- Sources: design `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`; plan `docs/superpowers/plans/2026-10-20-distributed-load-beam.md`; reference `../torque_i_beam/src/presets.js` and `../torque_i_beam/test/presets.test.js`.

## 2026-10-20 - Task 3: number formatting and state

### Summary
Added `src/format.js` (`MINUS`, `fmt`, `forceWords`, `locWords`) and `src/state.js` (`DEFAULTS`, `createState`, `derive`), with `test/format.test.js` and `test/state.test.js`, and set `MODULES` in `build.js` to `['physics.js', 'format.js', 'svg.js', 'state.js', 'app.js']`. Both modules are pure (no DOM). `fmt` is a faithful port of `../torque_i_beam/src/format.js` `fmt` (toFixed, Number, string, U+2212, null/non-finite gives a dash, never `-0`). `forceWords(F)` gives "200 N down", "10 N up", "0 N" (0 decimals when whole, else 2). `locWords(x)` gives "" for null, "at x = 1.11 m from A", and appends "(off the beam)" when x < 0 or x > BEAM_L. `createState()` is a store of only `{r, t, peak}`: `setR/setT` go through `nextW`, `setPeak` accepts only 'A'/'B', `set` applies a snapped batch with one notification, `subscribe` returns an unsubscribe, `reset` returns to `DEFAULTS`. Tests were written first and seen to fail (modules missing), then pass.

### Decisions made
- `locWords` imports `BEAM_L` from physics.js (controller ruling; the brief's Consumes line omitted it).
- `forceWords` decides the sign word from the ROUNDED magnitude, so a force that prints as 0 never reads "0 N down".
- The state store hands out copies (`getState` and subscriber arguments), so a caller cannot mutate stored state behind the notification logic. Subscribers get the new state as their argument.
- A change is detected by comparing `r`, `t`, `peak` before and after, so snapped no-ops (e.g. `setR(52)` at 50) do not notify. `set` ignores missing or invalid fields rather than throwing.
- The sweep test uses real `equivalents()` output over every r, t in [-200, 200] step 5 and both peaks (81*81*2*3 force/location pairs).

### Problems encountered
- None. The test for "setR(5, true) from 0 stores 15" first brings r to 0 with `setR(0)`, since the default r is 100.

### Open questions / next steps
- Task 4 onward (svg/scene) will use `fmt`, `forceWords`, `locWords`; app.js (Task 7) wires `createState().subscribe` to rendering.
- Sources: design `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`; plan `docs/superpowers/plans/2026-10-20-distributed-load-beam.md`; reference `../torque_i_beam/src/format.js`.

## 2026-10-20 - Task 2: physics module

### Summary
Added `src/physics.js` (pure, no DOM) and `test/physics.test.js`, and put `'physics.js'` first in `MODULES` in `build.js` (before `svg.js`). Exports: constants `BEAM_L` 4, `LOADED_L` 2, `W_MAX` 200, `W_STEP` 5, `W_SNAP` 10; `snapW(v)` (clamp, round to 5, |w| <= 10 goes to 0, non-finite goes to 0, never -0); `nextW(prev, raw, viaKeyboard)` (slider handler; a keyboard nudge that would stay in the zero zone while at 0 jumps to +-15 in the nudge direction); `loadAt(s, x)`; `equivalents(s)` returning `{rect, tri, comb, couple}` with signed F (+ down) and x from A (null when F is 0; `couple` true iff comb.F is 0 and a part is nonzero). 13 physics tests written first and seen to fail (module missing), then pass.

### Decisions made
- The combined location sums moments about A with the triangle's moment written `t*L*L/3` (peak B) or `t*L*L/6` (peak A), which equals F_tri * x_tri but keeps the brief's exact cases exact (r=100, t=-195, B gives x = -12 with `assert.equal`, not a tolerance).
- `+ 0` on each F so a computed -0 becomes +0 (an extra test feeds `r: -0, t: -0`).
- `nextW` treats only finite, nonzero `raw` as a nudge; the direction is the sign of `raw` since prev is 0 in that branch.

### Problems encountered
- None. Top-level names in physics.js are all exported constants/functions, so the build's duplicate-name check is satisfied.

### Open questions / next steps
- Task 3 onward import from `physics.js`; format.js's locWords also needs `BEAM_L` (controller ruling).
- Sources: design `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`; plan `docs/superpowers/plans/2026-10-20-distributed-load-beam.md`.

## 2026-10-20 - Task 1: scaffold, build script and empty page

### Summary
Created the project skeleton for `distributed_load_beam` on branch `feat/initial-build`: `package.json`, `build.js` (a port of `../torque_i_beam/build.js` that changes only `MODULES`, now exported and set to `['svg.js', 'app.js']`, and the output name `distributed_load_beam.html`), `src/svg.js` (palette `COLORS` for rect/tri/comb/ink/beam/wall/outline plus `NS`, `el`, `clear`, `text`; `clientToSvg` dropped because nothing is dragged), a stub `src/app.js` that only sets `document.title`, `src/index.template.html` (h1, `svg#fig` viewBox 0 0 960 560, `section#controls`, `section#calc` with `aria-live="polite"`, hidden `p#from-link`, both inline markers, viewport meta), and base-typography `src/styles.css`. Tests: `test/build.test.js` (ported, plus the new "every src/*.js file is listed in MODULES") and `test/template.test.js` (inline markers and nothing external, viewBox, every `getElementById` id exists in the template). 15 tests pass; `node build.js` writes `dist/distributed_load_beam.html` (about 2.6 KB).

### Decisions made
- Port the build unchanged apart from the module list and output name, so the duplicate-name guard, bundle parse check and 250 KB / no-external-URL assertions carry over as proven.
- `MODULES` is exported so a test can compare it with the `src/` directory; the existing "inlines every module" test keeps its own directory read, and the new test checks the list itself.
- The slider-range template test is deferred to Task 7 (it needs the physics constants).
- `dist/` is committed (single-file deliverable, as in torque_i_beam).

### Problems encountered
- None in the code. The Browser pane renders local files as static snapshots with no page tools, so "heading shows" was confirmed by finding the `<h1>` and the title in the built file rather than by a screenshot. The new MODULES test was shown to fail when a stray `src/zz.js` was added (then removed).

### Open questions / next steps
- Task 2 onward: physics, state, presets, layout, scene and controls insert their modules before `'app.js'` in `MODULES`.
- Sources: reference app `../torque_i_beam` (build.js, test/build.test.js, src/svg.js); design `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`; plan `docs/superpowers/plans/2026-10-20-distributed-load-beam.md`.

## 2026-10-20 - Design brainstorm for the distributed-load beam

### Summary
Started a new teaching simulation, `distributed_load_beam`, for PHYS 291 Statics: a 4 m horizontal beam fixed to a wall at A, with B at the midpoint and C at the tip. Only half AB is ever loaded, with a rectangular and a triangular distributed load (each positive or negative; the triangle's peak at either end of AB). The app computes and shows the equivalent force (size and location) of the rectangular part, the triangular part and the combined load, with the arithmetic written out. Brainstormed with Todd, iterated a working mockup three times in the browser, and wrote the design document `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md` (status: draft awaiting review). No application code exists yet.

### Decisions made (by Todd)
- Purpose: students adjust the loading and see how the equivalent force and its location change, and how they are calculated.
- Direction of the triangle means which end comes to a point (w = 0), i.e. which end has the peak; magnitudes may be positive or negative.
- Each slider has its zero marked and snaps to zero when close.
- Only AB is loaded, to simplify the simulation (BC has no loading at all). Beam fixed at 4 m.
- Labels, arrows and the figure must not overlap.

### Decisions made (my calls, flagged in the design document)
- Slider range +-200 N/m, step 5, snap within +-10; + is down.
- Three one-arrow rows for the equivalent forces, so overlap is impossible by construction; fixed force scale (no auto-rescale).
- Controls must stay visible beside the figure on wide windows (the mockup stacked them, which fails that).
- Optional URL presets `r`, `t`, `peak`, as in torque_i_beam; no locking.

### Problems encountered
- First mockup clipped the lower figure, overlapped the legend with labels, and drew downward forces as upward arrows. Fixed in v2.
- Fixed-scale arrows for small forces were nearly invisible at +-300 N/m; narrowed to +-200 and enlarged the scale.
- Overlap was verified by a script over 242 slider combinations (zero violations), and the script was shown to catch a planted overlap.
- A near-cancelling pair can put the combined force off the beam (w_r = 100, w_t = -190, peak at B gives 10 N down at x = -5.33 m); the design handles it ("off the beam", no arrow).

### Open questions / next steps
- Todd to review the design document; then the implementation plan (writing-plans), then execution.
- Publishing to GitHub Pages only on Todd's go-ahead, following torque_i_beam.

### Sources
- Mockup: `docs/superpowers/specs/2026-10-20-distributed-load-mockup.html`
- Pattern followed: `<local path>` (live: https://zimmermant.github.io/torque-i-beam/)
