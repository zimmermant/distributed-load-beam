# Lab Notebook

## 2026-10-20 - Final-review fix wave: "near the wall", hygiene, harness pair, doc fixes

### Summary
A. `format.js` gains `wallWord(x)` ('' / 'at the wall' / 'near the wall', judged on the PRINTED value); `locWords` uses it (never together with 'off the beam'), so r=-130, t=190, peak B (x = 0.0952) reads `at x = 0.10 m from A (near the wall)` and -0.001 reads `... 0.00 m ... (at the wall)`. `panelWhere` adds the matching `(at the wall: no arrow is drawn)` / `(near the wall: no arrow is drawn)` so the figure and the calculation agree. The arrow rule (null for x < `WALL_CLEAR_M`) is unchanged. Tests: format (locWords, wallWord), scene (x = 0.10 case), panel (both strings and agreement with locWords). B. The one absolute local path in this notebook is now `../torque_i_beam`; a grep of README, notebook, src, test, tools, build.js, package.json and dist for local absolute paths, cloud-folder names and email-like strings is clean (before the machine note below was added). C. README Develop section says "use a working Node 20+" (always pass a glob to `--test`). D. The harness sweeps one more pair, [-130, 190] (the near-wall text path): combos are now 9*9*2 + 7*2 = 176 (the earlier entries below say 174, which was true then). E. `svg.js text()` defaults to 16 (was 14). F. `build.js` comment no longer names the sibling app's file. G. A template test ties the template viewBox, layout.js `VB` and the harness's `const VB` together (harness read as text; `tools/mutations.mjs` now copies `tools/` into its temp copy so that test can read it). H. README: keyboard bullet, fourth example link (r=-75, t=150, peak A cancels: a couple), frame-busting sentence, harness paragraph (four probes, 176).

### Decisions made
- "At the wall" only where the location prints 0.00 m; "near the wall" for the rest of 0 <= x < 0.12 m. Longest column line is `at x = 0.10 m from A (near the wall)` (36 characters, inside the verified 37-character budget).
- Tiny arrows for forces of a few newtons (about 5 N) are kept on purpose: the fixed scale never changes, and the text carries the value.
- Machine note (one developer's environment, kept out of the README): on this Mac Homebrew's `node` is broken; use `/opt/homebrew/Cellar/node@22/22.23.2_1/bin/node` and always run `--test test/*.test.js` with a glob, never a directory.

### Problems encountered
- The mutation tool's rows for the old `locWords` wording no longer matched; they were rewritten for `wallWord` / `locWords` / `panelWhere` (new rows: never at, never near, bound `<=`, left of the wall, unrounded at/near, wall note dropped, order of notes, panel note dropped and always shown).

### Open questions / next steps
- Controller re-runs the browser harness (176 combos) at 1280x720, 800x750, 1000x700 and checks the near-wall column text fits.

## 2026-10-20 - Task 10 / whole build: README, final check, summary of the distributed-load beam

### Summary
The app is built, reviewed and verified on branch `feat/initial-build`: a single self-contained `dist/distributed_load_beam.html` (about 37 KB, no external URL, works in an iframe) in which a student sets a rectangular and a triangular load on the half AB (2 m) of a 4 m wall-mounted beam (sliders -200..+200 N/m, step 5, snap to 0 within +-10, plus which end the triangle peaks at) and sees the actual load, three equivalent forces (rectangle, triangle, combined) with size, direction and location, and the worked calculation. Optional URL presets `?r=&t=&peak=A|B`. 10 modules (physics, format, svg, state, presets, layout, scene, panel, controls, app) plus template and CSS, built by `build.js` into one scope. 153 tests, 309 mutation rows all caught (153 of 153 tests have teeth), and a browser harness (`tools/browser-harness.js`) that the controller ran at 800x750, 1280x720 and 1000x700. This task added `README.md` (what it is, controls and sign convention, the equivalent-force rules, URL presets with worked links, embedding, develop commands, the rules the code keeps), this entry, and two doc corrections in the Task 9 audit report and notebook entry (scene.test.js has 17 tests, not 20; the four `{ max }` rows are limits 30, 30, 40, 30, not all 30). No file under `src/` or `test/` changed. Final check: 153/153 tests pass; `node build.js` leaves `dist/` byte-identical to the committed one.

### Decisions made
- **Three side-by-side columns** (Rectangular, Triangular, Combined), each a full 4 m beam copy with one arrow and three text lines, instead of three stacked rows or all arrows on one beam. Reason: the stacked mockup was about 900 units tall and could not meet the viewport budgets; separate copies guarantee no arrow overlaps another; keeping the beam to C in each copy lets a combined force that lands between B and C (or at the wall) still be shown honestly.
- **Fixed force scale** (`COLS.fs` = 0.18 units per newton, the same for all three forces and every state; no auto-rescale), so a changed force is always visibly a changed arrow. The slider range was set at +-200 (not +-300) so small forces stay visible on that fixed scale.
- **Viewport budgets** 800x750 (an 800 px Canvas iframe) and 1280x720, phones out of scope. They forced: the **figure capped at 740 px wide** (the 960-unit viewBox then renders 16-unit text at 12.3 px, above the 12 px floor), a **sticky controls/calculation row** under the figure from 700 px up (the controls stay on screen while the figure is watched), peak buttons in one row, a one-line "From the link" note, and a **two-column breakpoint of 1150 px** (740 + 20 + 340 + 32 = 1132, plus 15 for a scrollbar, rounded up; a template test pins the arithmetic).
- **Wall rule** (`WALL_CLEAR_M = 0.12 m` in `src/physics.js`): a force arrow whose location is within 0.12 m of the wall, or off the beam, or absent, is not drawn; the text says "at x = 0.00 m from A (at the wall)" (or "(off the beam)"). Why: at r=100, t=-150, peak B the combined force is at x = 0 exactly and its arrow head (half-width 6.44 units) overlapped the wall, and an arrow cannot honestly move to a place it does not act. 0.12 m x 60 px/m = 7.2 units > 6.44, pinned by a test.
- **Derive, never store** (state is only r, t, peak); one rounding point (`fmt`, plus `fmtFixed` for locations, added in Task 7 because `fmt` drops the trailing zeros the spec's "x = 1.00 m" needs); presets are held outside the state and applied once; link text can never become markup (the calculation uses only formatted numbers and fixed strings, the note uses `textContent`).
- The mutation audit's findings are kept in `docs/superpowers/mutation-audit-report.md`; dead or redundant guards it found were reported, not changed.
- README: no live link is written anywhere (placeholder `https://…/`, stated plainly), because publishing has not been approved.

### Problems encountered
- **The mutation audit found 100 rows initially uncaught** (scene.js, svg.js, app.js had no unit tests; build refusals, several state/presets/panel branches unpinned). Fixed by strengthening the tests, not the rows: 56 tests added (97 to 153), including a stub DOM (`test/stub-dom.js`), `test/scene.test.js` (17), `test/app.test.js` (4).
- **Problems that browser checks found and unit tests missed:** (1) the first Task 7 page overflowed the 800x750 budget (controls bottom at y = 775, the second peak button cut off, page 786 px tall); fixed by the 740 px figure, sticky row and tighter controls. (2) The arrow over the wall at x̄ = 0: the first harness could not see it (it only compared texts, circles and the viewBox, and its budget check was near-vacuous because the sticky row's rect is clamped to the viewport); the harness now checks arrow groups against `.wall`, requires page height <= window height, zero overlap of the sticky row with the figure, and non-vacuity floors, and plants four probes (beam, text, clip, small text) to prove it can see each fault.
- The Task 9 report and its notebook entry carried two wrong numbers (20 tests in scene.test.js, all `{ max }` rows 30); verified against the files and corrected (17; 30, 30, 40, 30).
- Tests that scan rendered HTML for `-0`, `NaN`, hyphen-minus before a digit must strip tags first (the markup has `style` attributes); a test that passes vacuously (the template id check while app.js looked up no ids) now asserts it found a sensible number of ids.

### Open questions / next steps
- **Publishing to GitHub Pages** (a separate public repo `distributed-load-beam` with `docs/`, specs, `CLAUDE.md`, agents and skills stripped, like `torque_i_beam`) happens only on Todd's go-ahead. Until then there is no URL, and the README's embed snippet uses a placeholder.
- **Awaiting Todd's confirmation** (the spec's "Calls I made"): slider range +-200 with snap +-10 and step 5; the sign convention + down / - up; the three-column arrangement; the 750 / 720 viewport heights (Todd gave only the 800 px width); the wall rule (a force within 0.12 m of the wall shows no arrow, only text), which was a controller ruling during the build; folder and future repo name.
- Not tried in a real Canvas iframe; the 12 px text floor holds only while the figure is at least 720 px wide (it is 740 px at the budgets).
- Known unreachable gaps (reported in the audit, not fixed): a NaN location would draw a NaN arrow in `forceArrow`; a few redundant guards.
- Sources: spec `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`; mockup `docs/superpowers/specs/2026-10-20-distributed-load-mockup.html`; plan `docs/superpowers/plans/2026-10-20-distributed-load-beam.md`; mutation audit `docs/superpowers/mutation-audit-report.md` and `docs/superpowers/mutation-coverage-run.txt`; reference app `../torque_i_beam` (README, `tools/`, `docs/superpowers/mutation-audit-report.md`); README `README.md`.

## 2026-10-20 - Task 9: mutation audit with coverage run

### Summary
Added `tools/mutations.mjs` (ported from `../torque_i_beam/tools/mutations.mjs`): runs on a temporary copy of src/, test/, build.js, package.json; 309 rows over physics, format, state, presets, layout, scene, svg, panel, controls, app, the template, styles.css and build.js; `--coverage --strict`. Final run (`docs/superpowers/mutation-coverage-run.txt`): all 309 caught, 153 of 153 tests fail under at least one mutation. Report: `docs/superpowers/mutation-audit-report.md`. The first run left 100 rows uncaught; the tests were strengthened (not the rows): new `test/stub-dom.js`, `test/scene.test.js` (17), `test/app.test.js` (4), build.main refusal tests, plus additions to the state, presets, physics, panel, layout, controls, format and template tests (97 to 153 tests). No src change.

### Decisions made
- scene.js and app.js had no unit tests, so a stub DOM (no jsdom, no browser) was written and used for both; rendered classes, sizes, arrow geometry and text are now pinned in node.
- Rows that fail more than 12 tests were narrowed (one peak or one sign) rather than raising the limit; four rows (minus sign constant, `fmt` hyphen, `W_STEP`, "r alone not committed") carry their own `{ max }` limit (`W_STEP` 30, `fmt` hyphen 30, minus sign constant 40, "r alone not committed" 30) because the thing they break is used by that many tests.
- "presets applied twice" (brief) has no row: `state.set` is idempotent, so it is not a behavioural break. Dead or redundant code found is listed in the report (snapW `+ 0`, combF `+ 0`, fmt null guard, forceWords dp, a NaN x is unguarded in forceArrow but unreachable).

### Problems encountered
- The Task 8 fix (WALL_CLEAR_M, `(at the wall)`) landed mid-task and changed layout.js and format.js text the rows matched; rows were updated and rows added for the new behaviour, and the final run is on the new tree.
- Mutations of shared physics became too blunt once scene and app tests were added; narrowed as above.

### Open questions / next steps
- Controller: final browser verification and merge. The runner takes about 13 minutes.
- Sources: brief `.superpowers/sdd/2026-10-20-distributed-load-beam/task-9-brief.md`; model `../torque_i_beam/tools/mutations.mjs` and its `docs/superpowers/mutation-audit-report.md`.

## 2026-10-20 - Task 8 fix round 1 (b): harness checks arrow vs wall, a real budget, more probes

### Summary
`tools/browser-harness.js` (249 lines): check (8) top-level arrow groups vs `.wall` elements (0.5 tolerance); `checkFigure` now returns `{ violations, minPx, nTexts, nG }` and flags fewer than 20 texts or 20 top-level `.g` (vacuity floors, also reported by `sweep` as `minTexts`/`minGs`); `sweep` and `sensitivity` restore the defaults in `finally`. `sensitivity` plants four probes: PROBE1 inside the beam where nothing else is (must produce exactly one violation, naming the one `rect.g` that contains it, compared by its bbox string), PROBE2 on an existing label, PROBE3 at x = 950 (past 960), PROBE4 at font-size 10; returns `beamCaught, textCaught, clipCaught, smallCaught, cleanAfter, flagged`. `budget` was near-vacuous because the controls row is `position: sticky; bottom: 0` (its rect bottom is clamped to the viewport): `ok` now also needs `scrollHeight <= innerHeight`, zero rect intersection of `.side`, `#controls` and `#calc` with `#fig`, neither `#controls` nor `#calc` clipped (`scrollHeight <= clientHeight + 1`), and hscroll uses `documentElement.clientWidth`; all numbers are in the result.

### Decisions made
- Floors are 20 texts (text.t + text.tin; the minimum real figure has 21) and 20 top-level `.g`.
- The beam probe sits at x = 500, baseline 108: past the loaded half and between B and C, so no load shape, arrow, circle or label shares its box.

### Problems encountered
- None new; validated against the stub DOM only (no browser): wall check fires on an arrow group on the wall, budget intersection and clipped flags flip as expected, sensitivity flagged true on the stub.

### Open questions / next steps
- Controller re-runs the harness at 1280x720, 800x750, 1000x700 (the page must fit without scrolling at all three now).
- Source: the finding list in the Task 8 fix-round message.

## 2026-10-20 - Task 8 fix round 1 (a): no force arrow over the wall

### Summary
The harness review found that at r=100, t=-150, peak B (and r=-100, t=150) the combined force is at x = 0 exactly, so its arrow head (half-width 3.4*1.6+1 = 6.44 units) overlapped the wall rectangle. Controller ruling: an arrow closer to the wall than `WALL_CLEAR_M = 0.12` m is not drawn and the text says so. `physics.js` exports `WALL_CLEAR_M`; `layout.js forceArrow` returns null for x < WALL_CLEAR_M (x = 0.12 and x = 4 are drawn); `format.js locWords` returns `at x = 0.00 m from A (at the wall)` for 0 <= x < WALL_CLEAR_M (never together with `(off the beam)`). scene.js unchanged. dist rebuilt.

### Decisions made
- 0.12 m x COLS.px 60 = 7.2 units > 6.44, pinned by a test. The only place 0.12 appears in src is the constant.
- The text rule uses the same raw x as the arrow rule; `-0` (the second state's x) counts as the wall; a tiny negative like -0.001 stays `at x = 0.00 m from A` (no arrow, not on the beam by the printed value).
- New tests: forceArrow null at 0, 0.1199, -0.001, 4.001, drawn at 0.12 and 4; both Review states have comb.x == 0 (+0 for -0) and a null arrow; locWords at 0, -0, 0.05, 0.12.

### Problems encountered
- The second state's x is `-0`, not 0: strict equality in the test needed `+ 0`.
- Another implementer (Task 9) has uncommitted files in the same checkout (test edits, tools/mutations.mjs); this commit staged only its own paths, and test/layout.test.js was staged from HEAD plus my hunks only.

### Open questions / next steps
- Controller re-checks the column text at r=100,t=-150,peak B in the browser (34 characters, shorter than the 37-character off-beam text).

## 2026-10-20 - Task 8 step 1: browser harness

### Summary
Added `tools/browser-harness.js` (207 lines, plain IIFE exposing `H`, not in the build, no src change). `H.install()` refuses a figure under 600 px wide; `H.sweep()` drives the real sliders (`input` events, no keydown) and peak buttons over the 9x9 grid x both peaks plus the six near-cancel pairs x both peaks (174 combos), asserting the sliders, readouts and pressed peak button match what was requested, and runs one shared `checkFigure(tag)` per state: texts and circle letters inside 0 0 960 560; text/text, text/top-level `.g`, text/`text.tin` disjoint (0.5-unit tolerance in both axes); top-level arrow groups vs `.pc` circles (tangent allowed); every top-level `.g` inside the viewBox; every text >= 12 rendered px (`minTextPx`). `H.sensitivity()` plants PROBE1 on the beam and PROBE2 on an existing label and requires both to be named, then that the figure is clean again. `H.budget()` reports bottoms of `#fig`, `#controls`, `#calc`, horizontal scroll and `ok`; `H.all()` runs everything. Step 2 (running it at 1280x720, 800x750, 1000x700) is the controller's.

### Decisions made
- Only TOP-LEVEL `.g` are measured (arrow and dimension groups' children carry no class). The dimension-line group also has a line first child, so it is treated as an arrow group for the circle check; it sits far from every circle, so this is harmless.
- Violation strings start with the tag (`r=100 t=-190 peak=B`) and name elements by text content or `<tag.class> @bbox`.
- `sensitivity()` also returns `beamCaught`, `textCaught`, `cleanAfter`; `budget()` adds informational `scrollY` and `pageHeight` because `#controls`/`#calc` sit in a sticky bottom row, whose rect bottom is clamped to the viewport and could hide a tall page; compare `pageHeight` with `innerHeight` when reading a 1000x700 result.

### Problems encountered
- No browser available to the implementer: validated with `node --check` and a throwaway stub DOM (scratchpad, not committed): H has the five functions plus `checkFigure`, install throws at 300 px, sensitivity returns flagged true against the stub, sweep runs 174 combos and reports drive mismatches against a stub that does not wire state. Real getBBox metrics, event wiring and layout are NOT validated.

### Open questions / next steps
- Controller runs the three viewports, fixes findings in src (not the harness), rebuilds, reruns.
- Sources: brief `.superpowers/sdd/2026-10-20-distributed-load-beam/task-8-brief.md`; model `../torque_i_beam/tools/browser-harness.js`.

## 2026-10-20 - Task 7 fix round 1: fit the 800x750 viewport budget

### Summary
Controller measured the Task 7 page at 800x750: figure 760x443, controls bottom 775 (second peak button cut off), page 786 tall. Fixed in CSS/template: figure max-width 740; h1 20px/1.2, body padding 6; `#from-link` is now one small unboxed 13px line under the h1; the two peak buttons share one row (icon 24x13, labels `zero at A, peak at B` / `zero at B, peak at A`, text wraps inside the button if the column is narrow); tighter slider block (26px input, 2px padding), panel padding 6px 12px, calc text 13px/1.4; columns `1.25fr 1fr` from 700px so the buttons fit in one row at 800. The controls/calculation row is `position: sticky; bottom: 0` (opaque white, top border and shadow) from 700px up to the two-column breakpoint. Also: leading negative term in the combined sum is parenthesised (`F = (−400) + (100)`), `s.peak` is clamped to A/B before it reaches innerHTML, zero labels got ids `r-zero`/`t-zero` and are passed in `parts`, keyboard flag also cleared on `focusout` and window blur, and `test/controls.test.js` now pins the DOM wiring with a stub DOM.

### Decisions made
- Two-column breakpoint 1150px, computed: figure 740 + gap 20 + right column 340 + body padding 32 = 1132, plus up to 15 for a scrollbar (media queries count it) = 1147, rounded up to 1150; `.page` max-width 1100. At the old 1100 the figure was 708-719 px (< the 720 px needed for 12 px text). A template test pins the arithmetic.
- Sticky row only from 700px (a sticky ~500 px stack on a phone width would cover the screen; phones are out of scope).
- Estimated heights at 800x750 with a one-line note (not measured): body padding 6 + h1 24 + note 19 + figure 432 = 481; row padding 6 -> panels start about 487; controls about 206 tall (bottom about 693); calculation worst case (couple, or the off-beam r=100,t=-190 line) about 220-250 (bottom about 710-737). Controller to measure.

### Problems encountered
- Two peak buttons side by side need about 350 px of content width; at `1fr 1fr` the left column offered 334, hence `1.25fr 1fr`.

### Open questions / next steps
- Controller re-measures: #controls and #calc bottoms <= 745 at 800x750 with a preset note; no horizontal scroll; at 1280x720 figure and right column visible; figure >= 740 px wide at >= 800 px page width (and at 1150-1280).

## 2026-10-20 - Task 7: panel, controls, page, wiring

### Summary
Added `src/panel.js` (`calcLines(s)` pure, `createPanel(el)`), `src/controls.js` (`controlsView(s)` pure, `createControls(root, state, parts)`), the real page in `src/index.template.html` and `src/styles.css`, and the full `src/app.js` (state, presets applied once, `#from-link`, one `sync()` subscriber rendering scene, panel and controls). `build.js` MODULES now ends `scene, panel, controls, app`. Two commits: (1) amendments to `format.js`/`presets.js`, (2) this task. Suite 87/87; `dist/` rebuilt (36 KB). Not opened in a browser (the controller does that); a throwaway stub-DOM script (scratchpad, not committed) ran the built bundle: defaults, slider snap to 0, keyboard jump 0 -> 15, peak toggle, `?r=100&t=-190&peak=B`, `?r=7&t=abc&peak=c`, and a markup-looking query string (shown as text, nothing injected).

### Decisions made
- `fmtFixed(n, dp = 2)` added to `format.js` (always dp decimals, U+2212, `-0.00` impossible, non-finite -> a dash). `locWords` and the calculation print locations with it (`at x = 1.00 m from A`); forces keep `fmt`/`forceWords`. `locWords` judges "(off the beam)" on the PRINTED value so `0.00 m (off the beam)` cannot occur. Scene text needed no change; the longest combined location string is `at x = −12.00 m from A (off the beam)` (37 chars, 3 longer than before the amendment) in the last column that starts at x = 640 of 960: check it for clipping in the browser.
- `describePresets`: `From the link: nothing set.` prefix when only Adjusted/Ignored notes exist; new test pins the accepted number forms `1.`, `.5`, `+5`, `-.5`.
- Calculation lines: negative numbers in parentheses in sums and products (`½ × (−190) × 2`, `200 + (−190)`, `/ (−10)`); second term of the force sum is always parenthesised (as the brief's `200 + (100)`). Zero rect/tri: that line says there is no rectangular/triangular load; combined with one part zero says only that part acts; both zero says no load; combined zero (couple) says the parts cancel, no single force, plus a `note` line about the couple. When the sum worked from the PRINTED (rounded) locations would not give the printed answer (e.g. r=100, t=-190 gives -5.27 vs the true -5.33) the line adds `(worked from the unrounded locations)`. Off-beam x̄ is flagged (`left of the wall` / `beyond C`).
- `createControls(root, state, parts)`: `parts` = the six elements found by id in app.js (so app.js has 10 distinct `getElementById` lookups and the template test can be non-vacuous). Keyboard flag: set by a keydown for Arrow/Page/Home/End on `root`, cleared by the next `input`, and also by `keyup` and `pointerdown` (a key at the end of the slider fires no input and would otherwise mislabel the next drag). After each input and each state change `render` sets `slider.value` when it differs from the state (snap, keyboard jump). `aria-valuetext` carries the true-minus text.
- Layout CSS: figure max-width 760; controls and calculation side by side from 700 px; two-column page (figure left, 340 px right column) from 1100 px. Hover, active, `:focus-visible` and selected states for sliders (track, thumb) and peak buttons; the zero label becomes a green pill when the value is 0.
- Page template ids: `fig controls calc from-link r-slider t-slider peak-a peak-b r-readout t-readout`; `#calc` is the aria-live region (heading outside it so it is not re-announced); `#from-link` set with `textContent` only and hidden when empty.

### Problems encountered
- The first draft of the locWords amendment made `-0.001` read `0.00 m ... (off the beam)`; fixed as above (test added).
- Slider thumbs: pseudo-elements ignore the page's `box-sizing`, so `box-sizing: border-box` is set on both thumbs to keep the thumb centred on the 0 tick.

### Open questions / next steps
- Controller, in the browser: figure + controls visible without scrolling at 800x750 and 1280x720 (the controls panel height is an estimate, not measured); no clipping of the longest combined location text; thumb sits under the zero tick at 0; hover/active/focus states look right; no console errors for `?r=100&t=-190&peak=B` and `?r=7&t=abc&peak=c`.
- Sources: design `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md` (sections "Sliders", "The calculation"); mockup `docs/superpowers/specs/2026-10-20-distributed-load-mockup.html` (`.zs`, `.zt`, `.zl`, `.dir`, calc text); plan `docs/superpowers/plans/2026-10-20-distributed-load-beam.md` (Task 7).

## 2026-10-20 - Task 6: figure renderer

### Summary
Added `src/scene.js` (first DOM module) exporting `createScene(svg)` -> `{ render(s) }`; `render` clears the svg and redraws everything from `s = {r, t, peak}` (plus `derive(s)`), so it is idempotent. Put `'scene.js'` after `'layout.js'` in `MODULES` (`build.js`). Replaced the stub in `src/app.js` with a temporary `createScene(document.getElementById('fig')).render(createState().getState())` (Task 7 replaces it). Draws the top figure (dashed rectangle and triangle at 20 % fill, 8 net-load arrows, beam copy, dimension line with `AB = 2 m (loaded)` / dimmer `BC = 2 m (no load)`, text block at `TOP.textX`) and three columns (beam copy, `forceArrow` arrow, three text lines at `COLS.textY`). Suite 70/70 (no new tests: nothing here can run without a DOM); `dist/` rebuilt. Not opened in a browser (the controller does that).

### Decisions made
- All positions and lengths come from `layout.js`; scene.js holds only drawing style (`SCENE_*` constants: text size 16, dash `5 3`, fill opacity 0.2, wall 14 wide / 18 over, 4 hatches, circle radius `BEAM_H/2`, arrow head cap 9). Helper names are `scene*` to stay unique in the shared scope.
- Every `text()` call passes size 16 (letters 16 bold); class `t` (letters `tin`) is set on the node after creation. Graphics carry `g`; wall and hatching also `wall`; circles also `pc`; arrows are `<g class="g">` (shaft line + head path). Letters have no halo; circle fill is white.
- `Triangular: peak N N/m at B` is always over 24 characters (27+), so it is always split into `Triangular:` and `peak 100 N/m at B`, and the `(+ down, − up)` note moves from +38 to +60 (the five-line block spans beamY-28 .. beamY+60, clear of the dimension line at 206).
- Zero cases: column line 2 `0 N`, line 3 `no load of this kind`; Combined says `the parts cancel: no single force` when `derive().couple`, else `no load` (both loads zero). No arrow when `forceArrow` is null.
- Draw order: load shapes, net arrows, beam copy, dimension line; in columns beam first, then arrow, so the head is on top of the beam face.
- Sanity check outside the repo: a throwaway stub-DOM script (kept in the scratchpad, not committed, not a test) rendered five states twice each without exceptions; every text has a class and size >= 16; default text strings match the mockup (200 N at 1, 100 N at 1.33, 300 N at 1.11).

### Problems encountered
- `fmt` drops trailing zeros (`Number(n.toFixed(2))`), so the default locations print `at x = 1 m from A` and `at x = 1.11 m from A`, not `1.00`. That is existing `format.js` behaviour pinned by its tests; left unchanged.

### Open questions / next steps
- Controller: open `dist/distributed_load_beam.html` and check overlap/clipping (longest column line is `at x = N m from A (off the beam)` for a combined force far off the beam; column pitch is 310 units).
- Task 7 replaces the temporary render in `app.js` with the real app and subscribes `render` to the state.
- Sources: design `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`; mockup `docs/superpowers/specs/2026-10-20-distributed-load-mockup.html` (`draw()`); plan `docs/superpowers/plans/2026-10-20-distributed-load-beam.md` (Task 6).

## 2026-10-20 - Task 5: figure geometry (pure)

### Summary
Added `src/layout.js` (pure, no DOM; imports `BEAM_L`, `LOADED_L`, `loadAt` from physics.js) and `test/layout.test.js` (11 tests), and put `'layout.js'` after `'presets.js'` in `MODULES` in `build.js`. Exports `VB`, `BEAM_H`, `TOP`, `COLS`, `topX`, `colX`, `loadShapes(s)` -> `{rect, tri, arrows}` and `forceArrow(k, F, x)`. Tests first (RED: module not found), then GREEN; one mutation (apex end swapped) fails tests 8 and 9. Full suite and `dist/` rebuilt.

### Decisions made
- y grows downward; w > 0 (down) shapes and arrows sit ABOVE the beam with the arrow head on the beam top (`beamY`); w < 0 sit BELOW with the head on the beam bottom (`beamY + BEAM_H`).
- Rectangle: `{x: topX(0), y, w: topX(2) - topX(0), h: |r|*unit}`, null when r = 0. Triangle: 3 points, base along the full width of AB, apex at the end where w is largest (peak A at topX(0), peak B at topX(2)), height `|t|*unit`. Base is the rectangle's outer edge when r and t point the same way, otherwise the beam face on the triangle's own side (also when r = 0). Null when t = 0.
- Net arrows: 8 at x = (i + 0.5)*L/8 using `loadAt`, omitted when `|w|*unit < 8`; length exactly `|w|*unit`.
- `forceArrow` returns null for F = 0, x null, x < 0, x > BEAM_L; x = 0 and x = 4 are drawn. Length is exactly `COLS.fs*|F|`. Worst case 600 N gives 108 = COLS.band; stacked r = t = 200 gives 80 = TOP.band, both exactly on the band edge (tests use <=).
- Helper names are prefixed `layout`/`LAYOUT_` to stay unique in the shared scope.

### Problems encountered
- None.

### Open questions / next steps
- Task 6 (scene.js) draws from these shapes; the arrow `x` values are already viewBox units. Each triangle/rect/arrow needs class `g` there.
- Sources: design `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`; plan `docs/superpowers/plans/2026-10-20-distributed-load-beam.md` (Task 5).

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
- Pattern followed: `../torque_i_beam` (live: https://zimmermant.github.io/torque-i-beam/)
