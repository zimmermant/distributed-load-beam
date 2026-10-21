# Lab Notebook

## 2026-10-21 - Detail page: final whole-branch review and one wording correction

### Summary
The whole-branch review (most capable model, 18 commits, head 5b8ae45) found the branch ready to merge: 0 Critical, 1 Important, 5 Minor. It hand-derived 13 worked states, scanned all 13,122 states' calculation lines (no -0, NaN, bare number, plain-space number-unit pair or digit in a set-up line), and confirmed link text only reaches the page through textContent and that the main page changed only by the link and the spacing retune.

### Decisions made
- The Important finding was documentation drift: the "From the link" note appears on every hop between the pages (it names the values the link carried; Adjusted/Ignored are added when needed), while the README and spec call 9 said "only when adjusted or ignored". I kept the behaviour (it is the main page's existing describePresets text; changing it would alter hand-written preset links and need a 53-minute mutation re-run) and corrected the README and spec wording. If it proves noisy, the fix is one line in describePresets.
- Not fixed here, listed as optional follow-ups: "tall end" wording for a negative triangle; no aria-live on the detail page (twenty lines re-announced per slider step would be worse); the figure's aria-label reads w_A as "w underscore A"; the 250 KB check counts UTF-16 units, not bytes (pre-existing).

### Problems encountered
None new. The reviewer asked whether docs/ and this notebook are published: they are tracked in the working repo but the public repository is a separately filtered copy of dist/, README and the license files, so they never ship.

### Open questions / next steps
- Merge feat/detail-page into main and republish (both dist files, new commit on the public history, no force-push) only on Todd's explicit go-ahead.

Source: docs/superpowers/specs/2026-10-21-detail-page-design.md, docs/superpowers/sdd-ledger-detail-page.md

## 2026-10-21 - Detail page, task 11: documentation and final check (feature complete on feat/detail-page)

### Summary
The detailed-calculation page is built, tested and documented on branch `feat/detail-page`; nothing is merged or published. **What exists now:** a second single-file page, `dist/distributed_load_beam_detail.html` (62,570 bytes; the main page is 44,053 bytes; each limit 250 KB), reached from a new link "More detailed calculation" at the bottom of the main page's "How each force is calculated" box ("Back to the simulation" returns). Top item "Actual load on AB": the beam figure with the net load outline and two labels w_A and w_B that move up and down with the sliders, the same sliders underneath. Then "Calculating the rectangular loading", "...triangular loading" and "...combined loading": symbols first (no digit in any set-up line), numbers only in the plug-in lines, ending with the torque equation about A that gives r_equiv. Slider values travel in the link (`?r=...&t=...&peak=A|B`, the existing preset parser and the "From the link" note); the pages never share live state. Seven new modules (`link.js`, `detail-layout.js`, `detail-scene.js`, `detail-math.js`, `detail-app.js`, plus `detail.template.html` and `detail.css`); `build.js` now writes both pages from one run with a module list per page. **Final numbers:** suite 293 tests, all pass; mutation audit 927 rows, all caught, all 293 tests fail under at least one (`docs/superpowers/mutation-audit-report.md`, raw output in `docs/superpowers/mutation-coverage-run.txt`); a fresh `node build.js` leaves both dist files byte-identical to the committed ones; the controller's browser harnesses (`tools/browser-harness.js` main page, `tools/detail-harness.js` second page) were clean at 800x750, 1280x720 and 1000x700. This task changed only documentation: README (the second page, both files published together, an example link, the two-page build, the page-2 harness, totals), the spec's status line (now IMPLEMENTED, pending merge/publication approval), the SDD ledger copied to `docs/superpowers/sdd-ledger-detail-page.md`, and this entry. The README's stale "about 37 KB" for the main page became "about 43 KB".

### Decisions made
The spec's numbered "Calls I made" (all kept as written; Todd can still change any): (1) a second file with the values carried in the link rather than one page with a hidden section; (2) the figure shows the net load (trapezoid), the rectangle and triangle are separated in the blocks; (3) labels at the sides with dotted leaders, clamped away from the beam; (4) no separate "given/split" block, each block defines its own w_rect or w_tri from w_A and w_B; (5) headings, page title and back-link wording as in the spec; (6) the unitless numerals 1/2, 1/3, 2/3 are the only ones and set-up lines have no digit; (7) subscripts at least 12 px (labels 20 units, subscripts 16 units); (8) no live synchronisation between the pages; (9) the "From the link" note also appears on the second page; (10) torque about A, downward forces positive; (11) the exact-values note rule of the main page carries over to the plug-in step for r_equiv; (12) making room for the link may change the main page's pinned CSS, its acceptance bar not stricter. Other decisions of the build: `styles.css` stays shared by both pages (the detail file carries a few unused `.more` rules, about 0.6 KB); 518 new mutation rows accepted instead of pruning (about 53 minutes for a full run); in the README the iframe note says only that the second page scrolls (its top item fits 800x750), because the main-page iframe logic of "everything visible" does not apply; the README example links for the second page use the same public base address as the existing examples.

### Problems encountered
- **Main page retune after the link line.** The link added about 20 px to the calculation panel; at 1280x720 the eight "couple" states (r = +-100, t = -+200) came to a page height of 729 px against a 720 px window. Fixed (commit 0ef7850) by `#calc` line-height 1.3 to 1.25, `.cl` margin 4 to 2 px and `.more` margin 3 to 2 px; re-measured over 176 states: 800x750 and 1280x720 all fit, at 1000x700 the couple states scroll (allowed: the controls stay pinned). The acceptance bar was not loosened.
- **Harness centre tolerance calibration.** The second page's label check first allowed 6 units between a label's painted centre and its y; measured in the browser the painted centre is +1.2 units from y with `dominant-baseline: central` and -5.6 without it, so 6 accepted both. Tightened to 2 and two sensitivity plants added (label without the baseline, label y shifted +3).
- **The zero-height label face rule.** With a zero height next to a negative one, the first geometry put the corner dot on the top face while the outline used the bottom face (found by a grid test over 13,122 states). Fixed in the geometry: a zero height's edge point is on the face the outline uses (bottom when w_A + w_B < 0, else top).
- **Mutation audit growth.** Rows went from 409 to 927 and tests from 193 to 293; the first run of the new rows had 51 survivors, all missing tests (the detail.css rules, one-sided outline splits, the -0 guard at B, leader ends away from horizontal, and others), so 8 tests were added; 23 old rows needed their own `{ max: N }` because the second page now exercises the same shared code; three candidate rows were dropped as equivalent mutants.

### Open questions / next steps
- **Merge and publish only on Todd's go-ahead.** Merge `feat/detail-page` into `main` with `--no-ff`; then publish as a new commit on top of the public history, as for the earlier features. **The public repo needs BOTH `dist/` files** (`distributed_load_beam.html` and `distributed_load_beam_detail.html`), because the pages link to each other by relative file name; the root `index.html` redirect still points at the main page. Nothing under `docs/` is published.
- A whole-branch final review is still to be done by the controller before merge.
- Not tried: Firefox and Safari (harnesses measured in Chromium only), and the pages inside a real LMS frame.
- Source: docs/superpowers/specs/2026-10-21-detail-page-design.md, docs/superpowers/plans/2026-10-21-detail-page.md, docs/superpowers/sdd-ledger-detail-page.md, docs/superpowers/mutation-audit-report.md, README.md.

## 2026-10-21 - Detail page, task 10: mutation audit for the second page

### Summary
`tools/mutations.mjs` went from 409 rows / 193 tests to **927 rows / 293 tests**; the final full run (`--coverage --strict`, 53 minutes) caught every row and made every one of the 293 tests fail at least once (raw output in `docs/superpowers/mutation-coverage-run.txt`, narrative and per-file table in `docs/superpowers/mutation-audit-report.md`). 518 rows were added: link.js 9, detail-layout.js 87, detail-scene.js 81, detail-math.js 172, detail-app.js 45, detail.template.html 38, detail.css 30, build.js 34 (the two-page loop), app.js 4, index.template.html 7, styles.css 9 (the main page's link), and 2 on the minus-zero guard inside `test/detail-math.test.js`. The audit found no defect in `src`; it found 8 missing tests, which were added (suite 285 to 293). The tool gained `--only=TEXT`, `--from=N` and `--dry` for working on rows.

### Decisions made
- Every new function and branch got rows, so the count is far above the 70 to 110 the brief guessed; many rows are one wording or one operand each. Prune in review if too many; the run needs about 3 s per row.
- 23 existing rows (loadAt, fmt hyphens, state, presets, panel units, scene text class, svg text content, six build rows) exceeded the 12-test limit once the detail tests were added, because the second page uses the same code. Each got an own `{ max: N }` (about 30 % above the measured count) instead of being narrowed, and a comment in the tool says why; 13 new rows carry one too.
- Three candidate rows were dropped as equivalent mutants (an arrow of exactly `minArrow`, a label exactly `labelClear` from the beam middle: neither value is reachable from the 5 N/m grid; the triangle location with `fmt` for `fmtFixed`: 1.33 and 0.67 print the same). Noted in the tool and the report.
- A test with no mutation to fail got a real row where one exists (an export left in `detail-app.js`, `detail-math.js`, `detail-scene.js`; `getElementById` replaced by `querySelector`); the detail-math test's own minus-zero regexp is mutated in place (`test/detail-math.test.js` rows, same form as `test/unit-rule.js`).
- The `export` keywords added to scene.js, panel.js and layout.js have no row: they change no behaviour.

### Problems encountered
- First run of the new rows: 51 survivors and 14 over-limit rows. All survivors were missing tests: `detail.css` had no behavioural test (26 rows) and now has a rule-parsing test; the outline split was tested only at the symmetric zero crossing; the `-0` guard at B; leader and dot ends were tested only where the leader is horizontal; the `rnd` class and negative operands of the r_equiv numerator; link values re-applied at every draw; the figure column and `aria-labelledby`; `.more` underline and width; the build's stylesheet-order test passed by accident (a comment in detail.css mentions `#from-link`), page names in errors, import/export checks on the detail page.
- Four tests had no mutation after the second run (three placeholder-export checks and the minus-zero guard's self-test): rows added, third full run clean.
- Running two mutation runs at once on this machine slowed both (about 6 s a row); one at a time is 3.3 s.

### Open questions / next steps
- None for the audit. The controller's browser look at the second page is still the acceptance check; nothing in this task could be checked in a browser.
- Source: docs/superpowers/mutation-audit-report.md, docs/superpowers/mutation-coverage-run.txt, docs/superpowers/specs/2026-10-21-detail-page-design.md, docs/superpowers/plans/2026-10-21-detail-page.md (Task 10).

## 2026-10-21 - Detail page, task 9b: cleanup batch from the task reviews (harness tolerance, grid checks, pins)

### Summary
Tests, harness and comments only; no behaviour change (the two dists changed only because CSS comments are inlined: the stylesheet comment edits move the bytes, the page does not change). Harness (`tools/detail-harness.js`): painted-centre tolerance tightened from 6 to 2 units (measured in Chromium: painted centre minus y is +1.2 with `dominant-baseline: central`, -5.6 without); two new sensitivity plants (first label stripped of `dominant-baseline`, must be named by the painted-centre check; first label's y shifted +3, must be named by the label-y check; both carry a `data-probe` PROBE7/PROBE8 name in the message and are undone in `finally`); sweep outline and arrow totals asserted exactly (212, 1146) instead of floors; `sensitivity()` now surfaces drive problems from `restore()` and includes them in `flagged`. Tests: minus-zero guard fixed and given its own test; the grid test for derive-vs-printed gained w_A/w_B, F_equiv operands and r_equiv terms plus the honesty property; detail-app asserts the figure text after the t move and the peak click; detail-scene asserts `dominant-baseline` central and compares full tree signatures for idempotence; detail-layout arrow test renamed and made exact, comments tidied; detail-units lints for ASCII hyphen-minus before a digit and for 'N per m' / 'N·m'; template test pins the `.more` rule. CSS: `.more` comment corrected to 13 px x 1.3 = 16.9 px; dead `#from-link` rule and no-op `.dbody .setup` colour removed from detail.css. Suite: 285 pass.

### Decisions made
- Painted-centre tolerance 2 sits between +1.2 and -5.6, so it passes the correct drawing and catches loss of `central`. The plants name themselves through a `data-probe` attribute that `checkFigure` prints into the label messages, because the label messages otherwise do not carry any planted text.
- Exact sweep totals (212 outlines, 1146 arrows) change only when the geometry rules in `src/detail-layout.js` change; the harness comment says so.
- Item 5: the old guard in the file actually ended in a no-break space character (invisible in the listing), so it did match `−0 N`; it was still replaced as asked by `/−0(\.0+)?(?![0-9.])/` (independent of the following character, also flags `−0` at the end of a line) and a small test now pins that it flags `−0 N`, `−0.00 m`, `(−0 N)` and ignores `−0.5`, `−0.05`, `−10`, `−100`.
- Item 6 compares against `derive(s)`: w_A, w_B from derive's forces (zero-end height F_rect / L, tall end that plus 2 F_tri / L); the F_equiv operands and sum; the five numbers in the r_equiv numerator line (forces against derive, locations against derive's x where it is not null); the printed r_equiv against derive's x to 0.005; and the honesty property: the printed terms worked as printed round to the printed result exactly when the line carries no unrounded note (both directions asserted; counts asserted).
- Item 9: the "match the main page top figure's rule" test never compared with the main page; it now says what it asserts (one arrow per eighth of AB, length |w| x scale, omitted under minArrow), checked exactly on a sample of the grid, and the unused `loadShapes` import is gone.
- Item 10: the hyphen and wording lint run inside the shared `lint()` so they cover the figure, every block line, the link notes, the template strings and the booted page; the echo of a rejected link value is replaced by ECHO first as for the unit rule. Item 12: `.dbody .setup { color: #111827 }` equals the body's colour; computed styles of every `.setup` line and of `#from-link` (hidden and shown) were compared before and after in headless Edge and are identical.
- The line numbers in the task brief did not match the files (the files are shorter); each item was located by content.

### Problems encountered
- Headless Edge hung once while a stale profile was still locked; killed the processes and used a fresh profile directory.
- A `git checkout src/styles.css` used to undo a scratch mutation also undid the uncommitted comment fix; the fix was redone. Lesson: undo scratch mutations on a copy, not with checkout, when the file has real uncommitted edits.

### Teeth proof (scratch copies, all reverted)
- Harness, in headless Edge on the built page at 800x750, 1280x720 and 1000x700: 176 states, 0 violations, outlines 212, arrows 1146, `flagged: true` with `centreCaught` and `yCaught` true, budget ok. With the tolerance set back to 6 the stripped-`central` plant is not caught (`centreCaught: false`, `flagged: false`); with the y tolerance at 5 the +3 plant is not caught; a page with `central` removed gives 352 painted-centre violations (about -5.3 units off); an expected arrow total of 1145 gives one violation naming the count.
- detail-math grid test: swapped w_A/w_B in the plug line, swapped F_equiv operands, shifted an r_equiv term by 0.01 m, and the unrounded note forced off each fail test 17. detail-app: figure redraw skipped when t is not 100, or when the peak is A, fails the test. detail-scene: removing `central` fails the labels test; a render that leaves a state-dependent attribute behind fails the idempotence test while the node count is unchanged. detail-layout: raising the arrow cutoff by 1 unit fails the new arrow test. detail-units: an ASCII hyphen in a label value (6480 hits), 'N per m' in a label (13122 hits) and 'N·m' in a note (162 hits) each fail, as do the rule's own self-checks on known strings. template: changing `.more` line-height fails the pin.

### Open questions / next steps
- The controller re-runs H.all at three sizes in the Browser pane (it ran here only in headless Chromium/Edge; Firefox and Safari text boxes are not checked).
- Source: spec docs/superpowers/specs/2026-10-21-detail-page-design.md; plan docs/superpowers/plans/2026-10-21-detail-page.md; reviews of tasks 3 to 9; harness tools/detail-harness.js.

## 2026-10-21 - Detail page, task 9: browser harness for the second page

### Summary
New `tools/detail-harness.js`, modelled on `tools/browser-harness.js`: an IIFE that defines `H` with `install`, `sweep`, `sensitivity`, `budget`, `all` (plus `checkFigure` and `expected`). Not in any build module list, not run by `node --test` (it needs a layout engine); `node --check` passes and `dist/` is byte-identical after a rebuild. `sweep` drives the real sliders (`input` events) and peak buttons over the 9x9 grid x both peaks plus the 7 near-cancel pairs (176 states) and checks, per state: the two height labels and the caption inside the 960x356 viewBox and disjoint (0.5 tolerance in x and y) from beam, wall, hatching, outline, arrows, leaders, dots, pin circles, the dimension line, the A/B/C marks and each other; the labels' y, x, text, leader ends and dots against an independent recomputation of w_A, w_B, edge y and label y; rendered font size >= 12 px for every text and tspan; computed font size >= 12 px for every block line, every element in the three bodies and every `sub`; no horizontal scroll. `sensitivity` plants six faults and requires each named; `budget` checks heading, back link, "Actual load on AB" heading, figure and controls fully visible with no scrolling.

### Decisions made
- Boxes come from `getBoundingClientRect` converted to viewBox units through `getScreenCTM`, not `getBBox`: for `dominant-baseline: central` text and text with tspans `getBBox` differs between engines; the client rect is what is painted. Every element is measured the same way.
- Label y is recomputed from the slider values with the constants and rule copied from `src/detail-layout.js` (peak B: w_A = r, w_B = r + t; peak A: the reverse; edge y; the zero-height face rule; mid-line +/- labelClear). The label's painted vertical centre is also held within 6 units of its y (looser, because engines place a central baseline slightly differently).
- Font sizes use the computed style times the SVG's screen scale, so an inherited or CSS-overridden size is seen, not just the attribute.
- Non-vacuity floors: exactly 3 `text.t`, 3 `text.tin`, beam/wall/hatching/pin/leader/dot counts per state; sweep totals of at least 180 outlines and 900 arrows (the layout draws 212 and 1146, computed in node), block lines >= 12, sub elements >= 6.

### Problems encountered
Run in headless Edge on the built page (a scratch copy with the harness injected, outside the repo; windows 800x750, 1280x720, 1000x700; the headless inner heights came out 666, 636, 616): sweep 176 states, 0 violations, min figure text 12.3 px, min block text 12 px, outlines 212, arrows 1146, budget ok at all three. First sensitivity run flagged two of the harness's own plants as uncaught: the label-overlap plant used `text-anchor: start` against a right-anchored label (no overlap), and the small-tspan plant's message did not carry the PROBE name. Both plants fixed; sensitivity then `flagged: true`. Mutation check on scratch copies of the built page (labelClear 20, subscript 12 units, labelADx 10, `.dbody sub` at 10 px) each produced hundreds of violations naming the fault. A node scratch script confirmed `H.expected` equals `detailLabels` (y, x, edge y, label text) for all 176 states.

### Open questions / next steps
- The controller's own run in the Browser pane at the three viewports is still the acceptance check; re-run `tools/browser-harness.js` on the main page (Task 7 changed its box).
- The headless run is Chromium (Edge) only; Firefox/Safari engine differences in text boxes are not checked.
- Source: spec docs/superpowers/specs/2026-10-21-detail-page-design.md; plan docs/superpowers/plans/2026-10-21-detail-page.md (Task 9); model harness tools/browser-harness.js.

## 2026-10-21 - Detail page, task 8: unit and digit lint for the second page

### Summary
New `test/detail-units.test.js` reuses `test/unit-rule.js` unchanged (`bareNumbers`, `plainSpaceNumbers`). Over all 13,122 slider states (count asserted) it lints the figure's text nodes (A, B, C marks, the two w labels with their tspans concatenated, the caption), every set-up, plug-in and note line of the three blocks through `detailPlain`; over a table of 25 link queries the `describePresets` note (the literal echo of a rejected value replaced by ECHO, as in the main page's lint); the template's static text and its aria-label/title/placeholder attributes (including the back link text); the document title and the back link href. Every set-up line is checked for no ASCII digit and at least one variable name. A separate test shows the rule rejects "F = 200", accepts "F = 200 N" with U+00A0 and rejects it with a plain space. Whole suite: 283 pass; dist unchanged.

### Decisions made
- The back link href (`distributed_load_beam.html?r=100&t=100&peak=B`) is a URL, not text a reader sees, and its digits are the slider values, so the unit rule is not applied to it. Instead every state's href must match one strict form (ASCII hyphen-minus, whole numbers, A or B, no spaces or U+2212). Title, link text and the blocks the booted page writes are linted as text.
- Per-line variable requirement is possible: every one of the 11 set-up lines (3 rect, 3 tri, 5 comb) names a variable, so it is enforced per line, not per block. Variables are matched in plain text as `F_rect` etc. (detailPlain writes a subscript as `_x`); `L` only as a standalone capital, `τ` as a substring (so `τ_equiv` counts; the combined block's torque lines have no other variable).
- Allow-list: the fractions ½ ⅓ ⅔ only; the echo only in the link-note table.
- stripEcho is copied from `test/units.test.js` rather than exported, to keep the main page's test file unchanged.

### Problems encountered
The figure has six text nodes per state, not three: the beam's A, B, C marks (from `sceneBeam`) as well as the two labels and the caption; the first draft asserted three. Only three of the six hold a number.

### Teeth proof
In a scratch copy, ten breaks, each failing the new file: plain space in `detailUnit` (calc test); unit dropped from the w_B label; plain space in the w_A label; digit added to a rect set-up line; set-up line without a variable; plain space in the caption; template scale label without unit; link note r without unit; back link keeping U+2212; digit in the document title. The scratch copy is deleted.

### Open questions / next steps
- Not verifiable here: nothing visual; this is a text lint only.
- Source: spec docs/superpowers/specs/2026-10-21-detail-page-design.md; plan docs/superpowers/plans/2026-10-21-detail-page.md (Task 8).

## 2026-10-21 - Detail page, task 7 fix round 1: room for the link at 1280x720

### Summary
The controller measured the link commit (e8aa19e) in a real browser: at 1280x720 the eight couple states (calc text about 490 chars) had document height 729 > 720 (calc panel 232 px, controls panel 203 px). Fix: `#calc` line-height 1.3 -> 1.25, `#calc .cl` margin-bottom 4px -> 2px, `.more` margin-top 3px -> 2px. Estimated recovery in the couple state: about 10 lines x 0.65 = 6.5 px, 3 gaps x 2 = 6 px, link line 0.65 px + 1 px margin, so roughly 14 px (232 -> about 218 px, document about 715). Template test pins and the three mutation rows (line height loosened, text shrunk, lines spaced apart again) updated to the new values; each of those mutations still makes the suite fail. Text stays 13 px.

### Decisions made
- Did not change the `1.1fr 1fr` ratio: the controls column must keep at least 376 px (two peak buttons), so the calc column could gain only about 6 px of width, an uncertain saving of a line.
- Did not touch paddings (already 4 px) so 800x750 and 1000x700 only get shorter, never taller.

### Problems encountered
Cannot measure without a browser; the controller re-measures all states at the three viewports. Full mutation run (409 rows) takes longer than ten minutes; only the three retuned rows were re-run by hand against the new values.

### Open questions / next steps
- If a state still overflows by a few px, next levers: `.calc-panel` padding 4 -> 3 px, `h2` margin 2 -> 1 px.

## 2026-10-21 - Detail page, task 7: the link on the main page

### Summary
The main page's "How each force is calculated" box now ends with `<a id="detail-link" class="more" href="distributed_load_beam_detail.html">More detailed calculation</a>`, placed after the (empty, aria-live) `#calc` div and not inside it, so the text rewrites of `#calc` never remove it or its keyboard focus. `src/app.js` looks the element up by id once and, at the end of `sync()` (which also runs once at boot), sets its `href` to `DETAIL_PAGE + presetQuery(s)`: default state gives `distributed_load_beam_detail.html?r=100&t=100&peak=B`, and the href follows every slider input, peak click and link preset. `src/styles.css` gained `.more` (13 px, the calculation text's size, underlined blue link) with hover (darker text, light blue fill), active (darker fill) and `:focus-visible` (3 px outline) states. New tests: template (link text, order after `#calc`, panel membership, state rules, size >= 12 px) and app (boot href, follows slider/peak, follows link presets, not under `#calc`). `test/app.test.js` stub page gained the `detail-link` element (legitimate: boot asserts every looked-up id exists in the stub).

### Decisions made
- No retune of the main page's pinned CSS in this task: the controller measures the acceptance bar after the commit and sends a separate retune with measured numbers if the added line breaks it. The link is as compact as reasonable: `display: block; width: fit-content; margin: 3px 0 0; padding: 0 2px; font-size: 13px; line-height: 1.3`. Vertical space added to the calc panel: 3 px margin + one 13 px x 1.3 = 16.9 px line = 19.9 px (no padding, borders or other margins).
- `display: block; width: fit-content` rather than inline-block, so the line box is exactly the link's 16.9 px and not stretched by the parent's 16 px strut.
- 13 px text, not 16 px: it matches the panel's body text and keeps the added height small; still above the 12 px floor.

### Problems encountered
RED first (3 failing: the two app tests and the template test), then GREEN (275 pass). The detail page's dist also changed (7 inserted CSS lines): both pages inline `src/styles.css`, so the `.more` rules appear in the detail page too, unused there (no element has class `more`). Same situation as the existing `#calc` rules. Not avoidable without splitting a main-only stylesheet; left as is.

### Open questions / next steps
- Not seen in a browser: the controller must measure the main page's bar (default and probe states at 800x750, 1280x720, 1000x700; sticky row not covering the figure; tallest calculation text plus link no taller than the controls panel) and the link's hover/active/focus looks.
- Spec: docs/superpowers/specs/2026-10-21-detail-page-design.md ("The pages and how they connect")

## 2026-10-21 - Detail page, task 6: the second page is wired

### Summary
`src/detail-app.js` now boots the detailed-calculation page, modelled on `src/app.js`: looks every element up by id once, creates the state, `createDetailScene`, the shared `createControls`, applies the link's presets once before the first render (only the fields the link set), writes the "From the link" note with `textContent` only and hides it when empty. `sync()` redraws the figure, rewrites each of the three `#body-...` blocks (setup lines `<div class="step setup">`, plug lines `<div class="plug">`, notes `<div class="note">`, all from `detailBlocks`) only when that block's HTML actually changed, sets `#back-link` `href` to `MAIN_PAGE + presetQuery(s)`, and renders the controls. The page title is set. `src/detail.css` gained the math look: `i.v` serif italic, `sub` 12 px with zero line-height and a relative offset (no taller lines), `.plug` with a green left border and faint tint, `.note` italic, `span.rnd` small muted, and a compact "Actual load on AB" heading. No at-rule was added, so the Task 2 "no at-rules" test stands. New `test/detail-app.test.js` (9 tests, stub page): title, defaults, `?r=100&t=-190&peak=B` (note text, blocks equal `detailBlocks`, back link `distributed_load_beam.html?r=100&t=-190&peak=B`, each body written once at boot), re-render on slider and peak button, a body untouched when its text is unchanged, no markup from link text, the off-grid link `?r=7&t=abc&peak=c`, and no leftover placeholder export.

### Decisions made
- Body HTML is cached per block key in `shown` and compared as a string, so moving the triangular slider does not rewrite the rectangle block (it depends on r and the peak only).
- `sub` keeps the line height by `line-height: 0` plus `position: relative; top: .3em` instead of `vertical-align: sub`, which pushes line boxes apart.
- The r_equiv plug line wraps at its spaces (normal wrapping; numbers and units are joined by no-break spaces already); `overflow-wrap: break-word` is only a last resort for a very narrow window.
- Stacked fraction not used; the slash form from `detailBlocks` is kept.

### Problems encountered
RED first (6 of 9 failed against the placeholder). One test helper bug: a figure label is a `text` with `tspan` children, so the helper joins the children's text.

### Open questions / next steps
- Not seen in a browser: the controller must check the layout (top item at 800x750, 1280x720 and 1000x700, no horizontal scroll, long r_equiv line wrapping, subscript line heights, link states).
- Spec: docs/superpowers/specs/2026-10-21-detail-page-design.md, mockup: docs/superpowers/specs/2026-10-21-detail-page-mockup.html

## 2026-10-21 - Detail page, task 5: the three calculation blocks as pure text

### Summary
`src/detail-math.js` now holds the detail page's calculation text, with no DOM: `detailPlain(html)` (tags stripped, `<sub>x</sub>` becomes `_x`) and `detailBlocks(s)`, which derives with `derive(s)` and returns the three blocks (rect, tri, comb) as `{ key, title, setup, plug, notes }`, each field an array of HTML strings. Variables are `<i class="v">F</i><sub>rect</sub>`. Numbers come only from `fmt`/`fmtFixed`; negative operands use `panelPar`; the r_equiv line ends with `panelWhere(x)` and, when `panelNeedsExact` says so, the "(worked from the unrounded locations)" note. `panel.js` only gained `export` on `panelPar`, `panelWhere`, `panelNeedsExact` (main dist byte-identical, 42,833 bytes). The placeholder `DETAIL_MATH_READY` is removed. New `test/detail-math.test.js` (18 tests; the grid tests assert 81 x 81 x 2 = 13,122 states): exact contract strings for the default and peak-A states, the negative, r = 0, t = 0, couple, no-load and off-the-beam branches, and grid properties (no digit in any set-up line, plug values equal `derive(s)` to the printed precision, unit lint `bareNumbers`/`plainSpaceNumbers`, variable names in the right blocks, notes exactly for zero parts and the couple). Suite 263 of 263 pass; detail dist rebuilt (58,204 bytes).

### Decisions made
- A part with no force has `x = null` in `derive`, but its location is geometric (r_rect = 1.00 m, r_tri = 1.33 or 0.67 m), so the plug lines print it ("rect.plug as usual") and `panelNeedsExact` gets a copy of `d` with those locations filled in. Passing `d` as is would give NaN and a false "unrounded" note (the main page avoids it by branching first).
- With one zero part the r_equiv line is the full formula (for example `1.00 m · 0 N + 1.33 m · 100 N`), not the main page's "only the triangle acts" sentence; the part's note says it adds no torque.
- Couple: the values line keeps all four values and the block stops after the F_equiv line, then the couple note. No load: the values line holds only the two forces (no locations), then the F_equiv line, then the no-load note; the rect and tri blocks each carry their "no ... load" note too.
- The notes' "0 N" uses a no-break space like every other number.
- Order after the r_equiv result: `panelWhere` text, then the unrounded note (as on the main page, the note in a `span class="rnd"`).

### Problems encountered
RED first (no `detailBlocks` export). Nothing else; the grid tests pass first time.

### Open questions / next steps
- Task 6 will render these arrays; the `i.v` and `span.rnd` styles are still to be defined in detail.css.
- Spec: docs/superpowers/specs/2026-10-21-detail-page-design.md (sections 2 to 4)

## 2026-10-21 - Detail page, task 4: detail figure renderer

### Summary
`src/detail-scene.js` now draws the detail page's figure: `createDetailScene(svg)` returns `{ render(s) }`, which clears and redraws from `s` alone. Draw order: net outline polygons (class `g`, ink, width 2, fill ink at 0.1), net arrows (`sceneArrow`, width 1.4, ink), the two dotted green leaders (class `g leader`, `3 3`), the beam copy (`sceneBeam(svg, DETAIL.x0, DETAIL.beamY, DETAIL.px)`, after the leaders so the wall covers a leader that crosses it), the corner dots (class `g dot`, r 3.5) at each label's `edge`, the two labels, then the AB dimension line and the caption `AB: L = 2 m (loaded)` (NBSP between 2 and m). A label is one SVG `text` (class `t`, 20 units, bold, green, anchor from `detailLabels`) holding `w`, a subscript `tspan` (16 units, dy 5) and a value `tspan` (20 units, dy -5, text ` = 100 N/m` with NBSP before the unit). The placeholder export `DETAIL_SCENE_READY` is removed. `scene.js` only gained `export` on `sceneBeam`, `sceneText`, `sceneArrow`; the main page's built output is byte-identical (42,833 bytes). `test/stub-dom.js` needed no change (tspans are ordinary children). New `test/detail-scene.test.js` (14 tests, including the 13,122-state grid); suite 245 of 245 pass. Detail dist rebuilt (51,278 bytes).

### Decisions made
- Labels carry `dominant-baseline="central"` so the label's y (which is where its leader ends and what `detailLabels` clamps) is the text's vertical centre, as the Task 3 label-box tests assume, not its baseline. Not yet seen in a browser.
- Outline paths use plain class `g` (as the brief says); tests tell them from other nodes by tag (`path` directly under the svg).
- The dimension line is one group of three lines (class `g`), like the main page's, so the "groups with class g" count is 8 arrows + 1 dimension group.

### Problems encountered
RED first (`createDetailScene` not exported). One test of mine had a wrong expectation (default w_B is 200 N/m: rectangle 100 plus triangle peaking at 100 on B); fixed the test, not the code.

### Open questions / next steps
- Browser look: label vertical centring (`dominant-baseline`), tspan baseline shift, anchoring of the right-aligned label with tspans, and halo on the subscript.
- Spec: docs/superpowers/specs/2026-10-21-detail-page-design.md (section "1. Actual load on AB")

## 2026-10-21 - Detail page, task 3 fix: a zero height's label anchors on the outline's face

### Summary
`detailLabels` now puts a zero height's `edge` point (the corner dot and the leader's end) on the face the outline uses: the bottom face (y 174) when w_A + w_B < 0, the top face (y 150) otherwise (including both zero). `detailEdgeY(0)` is unchanged (top face; it is a function of one height). The label y is the clamp of that edge as before, so w_A = 0 next to a negative w_B puts the a-label at mid + 40 = 202 and a zero end next to a positive height still goes to mid - 40 = 122. This supersedes the "edge of a zero height is on the top face" decision and the open question in the Task 3 entry below. New tests: the four zero-end cases and both-zero, plus a grid property (13,122 states, count asserted) that every label's edge point is a vertex of `detailOutline(s)`. The monotonic test now compares height groups (a tie at height 0 can carry two label y values, depending on the other end). Suite 231 of 231 pass; detail dist rebuilt (48,143 bytes), main dist unchanged.

### Decisions made
- Fix in the geometry (not the scene) so the dot is always on the drawn outline, as the controller ruled.

### Problems encountered
RED first: the grid test failed at {r:-200,t:200,peak:A} (edge 250,150 not on the outline: the triangle is below the beam).

### Open questions / next steps
- Browser look at the figure comes with Task 4.
- Spec: docs/superpowers/specs/2026-10-21-detail-page-design.md (section "1. Actual load on AB")

## 2026-10-21 - Detail page, task 3: detail figure geometry

### Summary
`src/detail-layout.js` now holds the pure geometry of the detail page's figure (no DOM): `DETAIL` (constants), `detailX`, `detailHeights` (w_A, w_B, never -0), `detailEdgeY`, `detailOutline` (one polygon for same-sign heights, two triangles split at the zero crossing for opposite signs, none when both are 0), `detailArrows` (the main page's 8-arrow rule at the detail scale) and `detailLabels` (the w_A and w_B labels, their anchors, corners and dotted leaders). The placeholder export `DETAIL_LAYOUT_READY` is removed. `layoutArrow` in `src/layout.js` is now exported (it is reused, not copied); the main page's built output is byte-identical (42,833 bytes). New `test/detail-layout.test.js` (18 tests); suite 229 of 229 pass. `dist/distributed_load_beam_detail.html` rebuilt (47,820 bytes).

### Decisions made
- Label rule: the label sits on the edge y, except when the edge is within `labelClear` (40) of the beam's middle; then it is held at middle - 40 (edge at or above the middle, which includes height 0) or middle + 40 (edge below it). This is a non-increasing function of the height, so the labels move up as the sliders raise the heights and jump (never wander) across the beam.
- A height of exactly 0 has its edge on the beam's top face (`detailEdgeY(0)` = beamY), so its label is held above the beam. The outline of a zero end still sits on the face the other end's load uses (a zero end gives a triangle, with no repeated point).
- Property tests run over the whole slider grid (81 x 81 x 2 = 13,122 states) and assert their counts; the "monotonic" test sorts the grid by w_A (then by w_B) and requires the label y never to increase (controller ruling).

### Problems encountered
None. RED first (the module did not export `DETAIL` etc.), then green.

### Open questions / next steps
- When w_A (or w_B) is 0 and the other end is negative, the outline's triangle corner is on the bottom face, but the label's `edge` (and leader end) is on the top face by the brief's rule. Task 4 (the scene) may want to draw the corner dot at the outline's own vertex; not decided here.
- Browser look at the figure comes with Task 4 (nothing draws these shapes yet).
- Spec: docs/superpowers/specs/2026-10-21-detail-page-design.md (section "1. Actual load on AB"); mockup docs/superpowers/specs/2026-10-21-detail-page-mockup.html (draw())

## 2026-10-21 - Detail page, task 2: two-page build and the page skeletons

### Summary
`build.js` now builds two pages from one run: `PAGES = [main, detail]`, each `{ name, out, template, css[], modules[] }`. `MODULES` is unchanged; new `DETAIL_MODULES` is the main list minus `app.js`, plus `detail-layout.js`, `detail-scene.js`, `detail-math.js`, `detail-app.js`. The new `dist/distributed_load_beam_detail.html` (43,801 bytes) is a skeleton: `src/detail.template.html` (title and h1 "Distributed load on a beam: detailed calculation", the back link, the hidden link note, section "Actual load on AB" with an empty `#detail-fig` and the main page's controls section copied character for character, then three empty calculation blocks `#blk-rect|tri|comb`), `src/detail.css` (back-link hover/active/focus-visible states, block spacing, heading style) and placeholder modules (`DETAIL_LAYOUT_READY`, `DETAIL_SCENE_READY`, `DETAIL_MATH_READY`; `detail-app.js` only sets the title). The main page's built output is byte-identical to the Task 1 build (42,833 bytes). Suite: 211 of 211 pass (199 before, plus new and reworked build and template tests).

### Decisions made
- Every build-time assertion (parse, no import/export left, no external URL/script/link, 250 KB) runs for each page; the duplicate-name scan uses a fresh map per page, so `appStart` in both app files is not a collision, while the same name twice in one list still fails.
- All pages are built in memory first and written only after every one passes, so a failure in the detail page cannot leave a freshly written main page next to a stale or missing detail page.
- Error messages now name the page ("Build failed (detail page)"); the existing tests match on the unchanged phrases.
- The controls section is inside the "Actual load on AB" section (spec item 1 is "figure and sliders"); `#controls` is centred to 740 px in `detail.css` since the main page's `.side` wrapper is not used here.
- The detail figure's aria-label contains no number without a unit (a test checks it).

### Problems encountered
None. RED first (build.test.js failed on the missing `DETAIL_MODULES` export; template.test.js on the missing template file), then green.

### Open questions / next steps
- Task 3 onward replace the placeholder exports (each task must remove its own); nothing wires the sliders or the figure on the detail page yet, so it cannot be looked at meaningfully in a browser (not opened here).
- Spec: docs/superpowers/specs/2026-10-21-detail-page-design.md ("The pages and how they connect", "The second page, top to bottom")

## 2026-10-21 - Detail page, task 1: link module

### Summary
New `src/link.js` (`MAIN_PAGE`, `DETAIL_PAGE`, `presetQuery`) and `test/link.test.js`. `presetQuery({r, t, peak})` returns the query string `?r=100&t=-100&peak=B` that the two pages will use to carry the slider state to each other; numbers are printed with `fmt` (as the sliders print them) with the true minus swapped for an ASCII hyphen-minus, so `-0` can never appear. `link.js` is listed in `MODULES` in `build.js` (between `presets.js` and `layout.js`) and `dist/distributed_load_beam.html` was rebuilt (42,833 bytes). Suite: 199 of 199 pass (193 before + 6 new).

### Decisions made
- Reuse `fmt` rather than a second number printer, so the link and the screen agree.
- Round-trip test over the 81 x 81 x 2 grid asserts its count. The grid includes +-5 and +-10, which the sliders never hold (the zero zone snaps them to 0). So the test sends the snapped state (what a slider really holds) and requires it to come back identical with no notes, and also sends the raw grid value and requires the snapped value back, with a note exactly when snapping changed it. The brief's literal wording ("empty adjusted" for every grid point) cannot hold for +-5/+-10, because `parsePresets` correctly reports those as adjusted.

### Problems encountered
First draft of the round-trip test failed on `t=-10` (adjusted to 0); resolved as described above.

### Open questions / next steps
- Tasks 2 onward add the detail page; the main page does not use `presetQuery` yet (the link is Task 4+).
- Spec: docs/superpowers/specs/2026-10-21-detail-page-design.md

## 2026-10-21 - Republished: units on every number live (public commit c025043)

### Summary
The merged build (57fb527 here) is live at https://zimmermant.github.io/distributed-load-beam/ as public commit c025043, a normal fast-forward push (3f5c267..c025043) on top of the existing public history, with the guarded method recorded in the earlier republish entry. The live `dist/distributed_load_beam.html` is byte-identical to the local build. On the live page (800x750, example preset link) the browser harness is clean (176 combinations, 0 violations, text 12.3 px, all probes caught, budget ok), and a scan of everything shown (page text, SVG text, aria text) found 52 numbers, none without a unit and no plain-space number+unit pairs.

### Decisions made
- Same guarded method; pre-push checks on the public clone: 193 of 193 tests pass, its build is reproducible and identical to this repo's dist, zero local-path or secret-like hits in the tree, no `docs/` or tooling folders public.
- This entry reaches the public copy with the next update.

### Problems encountered
None.

### Open questions / next steps
- Not yet tried inside a real Canvas iframe.

## 2026-10-21 - Merged: units on every number

### Summary
`feat/units-everywhere` was merged into `main` with `--no-ff` (merge commit 57fb527) at Todd's request ("yes", to merge and republish); `main` had not moved since the fork (e2ab28b), so the merge was clean. Every number on the page now carries its unit (calculation panel including formulas and sums, slider scales, aria text, link notes), a no-break space joins each number to its unit, and a lint test scans all page text for every state.

### Decisions made
- Local merge, `--no-ff`; the branch was deleted afterwards.
- Re-verified on the merged tree: 193 of 193 tests pass; `node build.js` reproduces the committed `dist/distributed_load_beam.html` byte-for-byte (42,156 bytes); tree clean. Before the merge the harness was clean at 800x750, 1280x720 and 1000x700, the worst-case probes fit, an independent scan of the rendered text found no number without a unit, and the full mutation audit caught all 409 rows with every test covered.
- Republished with the same guarded method as before (a new commit on top of the public history).

### Problems encountered
None during the merge.

### Open questions / next steps
- Not yet tried inside a real Canvas iframe.
- Sources: `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`, `docs/superpowers/sdd-ledger-distributed-load-beam.md`.

## 2026-10-21 - Every number on the page carries its unit (branch feat/units-everywhere)

### Summary
Todd: "All numbers should include units (always!)". The calculation now reads `F = w × L = 100 N/m × 2 m = 200 N`, `F = ½ × peak × L = ½ × 100 N/m × 2 m = 100 N`, `F = 200 N + (100 N) = 300 N, at x̄ = (200 N × 1.00 m + 100 N × 1.33 m) / 300 N = 1.11 m` (negative terms `(−190 N)`, `(−190 N/m)`; the zero notes `w = 0 N/m`, `peak = 0 N/m`). Slider scales read `−200 N/m (up)`, `0 N/m`, `+200 N/m (down)`; the peak question says `(w = 0 N/m)`; the figure's aria-label says `4 m`; the link note prints units on both sides of the arrow (`r 500 N/m → 200 N/m`). The figure's own texts already had units. New `test/units.test.js` (the unit lint) builds the page's text for all 13,122 slider states (figure and calculation), every control readout and aria-valuetext, the template's static text and a table of 25 link URLs, and fails on any number without N/m, N or m. It was written first and failed on the old code (142,004 bare numbers in the calculation, 8 in the template, 41 in the link notes). The rule lives in `test/unit-rule.js` so `tools/mutations.mjs` can mutate it too. Totals now: 193 tests, 409 mutation rows, all caught, every test covered (`docs/superpowers/mutation-coverage-run.txt`).

### Decisions made
- The fraction ½ is the only number exempt (dimensionless); the lint also fails on any other non-ASCII numeric character. The user's literal echo in the link note (`r=abc (use a number of N/m)`) stays literal and is blanked before linting.
- Fix round 1 (controller saw `= 1.11` / `m` split across lines in the browser): the space between a number and its unit is U+00A0 everywhere (calculation, scale labels via `&nbsp;`, heading, readout sentence, link note, aria text, and the figure's SVG texts: no wrap there, but the same width as a space, so measurements are unchanged, and it copies and is read as one unit). The lint accepts only U+00A0 and fails a plain space before a unit (separate list, every source), with mutation rows for each.
- Fix round 2 (controller measured the cancelling state, couple note, 233 px tall vs controls 203 px: the sticky row covered ~6 px of the figure at 1000x700 and the page was 17 px too tall at 800x750): CSS only: controls/calculation row `1.25fr 1fr` to `1.1fr 1fr` (controls column stays >= 376 px: the ~350 px of content the two peak buttons need plus 26 px of panel padding and border), `#calc` line-height 1.4 to 1.3, 4 px between lines (was 5), calculation panel vertical padding 4 px and heading margin 2 px. Text stays 13 px. The implementer estimated about 212 px for the cancelling state; the controller then MEASURED it in a real browser: the calculation panel is 181 px tall (controls panel 203 px), so the sticky row is 203 px at every probe state; at 800x750 and 1280x720 the page height equals the window for all probe states (cancel, off-the-beam, near-wall, extremes, preset notes); at 1000x700 only the cancelling state overshoots, by 9 px, with the controls still pinned; the sticky row never covers drawn content; the figure stays 740 px wide. The knobs are those four values (pinned by a template test and mutation rows).
- `fmt` prints a pasted 1e60 as `1e+60` (Number.toFixed beyond 1e21); unchanged, and the lint reads the exponent as part of its number.

### Problems encountered
- The first lint run passed on the old code: a prefix bug in the verdict filter (`calc:` versus `calc {`). Found by checking that the RED output actually appeared; fixed.
- The mutation "render does not clear the figure" made the lint's figure loop quadratic (a 9-minute hang): the lint now draws a fresh figure per state.
- `svg.js` `text` not setting its content now fails 13 tests (limit 12): given its own limit, `{ max: 13 }`.
- The lint's own rule tests could not be failed by any `src/` mutation (the coverage check listed them); the rule moved to `test/unit-rule.js` and the runner accepts rows for that file.

### Open questions / next steps
- The controller's browser probes (800x750, 1280x720, 1000x700; the six probe URLs) decide whether the calculation compaction is enough.
- Not merged or republished; the public copy still has the old text.

Sources: README.md ("Every number on the page carries its unit"), `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md` ("The calculation"), `test/units.test.js`, `test/unit-rule.js`, `tools/mutations.mjs`, `docs/superpowers/mutation-audit-report.md`, `docs/superpowers/mutation-coverage-run.txt`.

## 2026-10-21 - Republished: framed cards live (public commit 3f5c267)

### Summary
The merged build (bb954e8 here) is live at https://zimmermant.github.io/distributed-load-beam/ as public commit 3f5c267, a normal fast-forward push (0ae6e00..3f5c267) on top of the existing public history, using the method recorded in the previous republish entry. The live `dist/distributed_load_beam.html` is byte-identical to the local build. On the live page (800x750) the three cards are present, the harness is clean (176 combinations, 0 violations, text 12.3 px, all probes incl. the card probe caught, budget ok) and the preset link renders.

### Decisions made
- Same guarded method as before; pre-push checks on the public clone: 184 of 184 tests pass, its build is reproducible and identical to this repo's dist, only the 9 expected files changed, zero local-path or secret-like hits in the diff or tree, no `docs/` or tooling folders public.
- This entry reaches the public copy with the next update.

### Problems encountered
None.

### Open questions / next steps
- Not yet tried inside a real Canvas iframe.

## 2026-10-21 - Merged: framed card per equivalent-force column

### Summary
`feat/column-cards` was merged into `main` with `--no-ff` (merge commit bb954e8) at Todd's request ("merge and republish"); `main` had not moved since the fork (ff75b79), so the merge was clean. The branch frames each equivalent-force column in a rounded card in its own colour with the label (name, force, location) as the card's heading, so it is obvious at a glance which label goes with which diagram.

### Decisions made
- Local merge, `--no-ff`; the branch was deleted afterwards.
- Re-verified on the merged tree: 184 of 184 tests pass; `node build.js` reproduces the committed `dist/distributed_load_beam.html` byte-for-byte (40,839 bytes); tree clean. Before the merge the harness was clean at 800x750, 1280x720 and 1000x700, and the full mutation audit caught all 354 rows with every test covered.
- Republished with the same method as the previous republish (a new commit on top of the public history; see that entry).

### Problems encountered
None during the merge.

### Open questions / next steps
- Not yet tried inside a real Canvas iframe.
- Sources: `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`, `docs/superpowers/sdd-ledger-distributed-load-beam.md`.

## 2026-10-21 - A tinted card per equivalent-force column, the label as its heading

### Summary
Todd, after looking at the published page: "Move the labels for Rectangular, Triangular, and Combined to be closer to the depiction of each. It should be obvious at a glance which label goes with which diagram." Each of the three bottom columns is now enclosed in a rounded card in the column colour (`COLORS.rect` / `tri` / `comb`: fill opacity 0.05, frame opacity 0.45, width 1.5, rx 8), and the three text lines (name, force, location) are the card's heading, set in a darker band (fill opacity 0.12, top corners rounded like the card, square at the bottom) across its top. Branch `feat/column-cards` (from `main`). NOT merged, NOT republished. 184 tests (12 new: 6 layout, 6 scene); 354 mutation rows (16 new), all caught, every test covered. Files: `src/layout.js` (`COLS.card`, `COLS.textPad`, `columnCard(k)`), `src/scene.js` (`sceneCard`, text x + pad), `tools/browser-harness.js` (check 9, probe 7), `tools/mutations.mjs`, tests, README, spec, ledger, `dist/`.

### Decisions made
- **Todd chose option 1 of 3.** The labels already sat directly above the space reserved for the tallest possible arrow or outline; what looked like distance was that reserved space being empty for most loads. The three options offered in chat were (1) a framed, column-tinted card per column with the label as its heading (the recommendation: stable, nothing moves while dragging a slider), (2) labels that follow the top of each drawing and move as the loads change, (3) a smaller reserved space by shrinking the force-arrow scale about 25%. Todd answered "1".
- **Geometry (all in `COLS.card`, no literal restated elsewhere):** card x = `COLS.x[k]` - 4, width 300, y 240 to 558 (height 318), so the gap between neighbours is 310 - 300 = 10 and the stroke stays inside the 560-unit viewBox (558 + 0.75). The heading band is 74 tall (ends at y 314, above the arrow band that starts at `COLS.beamY - COLS.band` = 316). The three text lines keep their baselines (262, 284, 306) and move right by `COLS.textPad` = 8; the widest text ("at x = -12.00 m from A (off the beam)", 37 characters, about 272 units) then ends at about `COLS.x[k]` + 280, inside the card's right edge at `COLS.x[k]` + 296. Nothing vertical grows, so the viewport budgets are unchanged.
- **Why there is a gap between the cards:** 10 units, so two neighbouring frames never touch and each card reads as one unit.
- **Class `card`, not `g`.** The harness's text-versus-graphic checks (overlap of a text with a top-level `.g`) must keep ignoring the cards, otherwise every column text would "overlap" its own card. The card and the band are separate elements (a rect and a path), both class `card`.
- **Draw order per column:** card, band, beam copy (wall, hatching, circles), outline(s), arrow, texts, so the translucent tint is behind everything.
- **Harness check 9** (added after the existing checks, no renumbering): the three `rect.card` are where `layout.js` puts them (constants `CARD_DX`, `CARD_W`, `CARD_Y`, `CARD_BOTTOM`, tied to `layout.js` by a drift test), and every `text.t`, `text.tin` and top-level `.g` whose centre is at or below the card tops lies inside the card whose x-range holds its centre (0.5 tolerance); a floor of 40 checked elements keeps it from being vacuous. `sensitivity()` has a seventh fault, PROBE7, a text that starts at x = 300 and so straddles the edge between cards 0 and 1, and requires exactly one `outside its card` report (the planted one). `flagged` now also needs `cardCaught` and `cardOnlyPlanted`.
- **Mutation rows (16):** layout: card narrower (width 280), top too low (y 300), heading band 120 tall, text pad removed, bottom past the viewBox, card x from column 0; scene: card not drawn, wrong colour in column 2, card drawn after the content, text pad removed, square band corners, class `g` on a card, band as faint as the card, opaque frame, heavy tint (0.5), band as tall as the card. Full run: `docs/superpowers/mutation-coverage-run.txt`.

### Problems encountered
- Two existing scene tests selected the load shapes by fill colour (`rect` with `COLORS.rect`, `path` with `COLORS.tri`), which now also matches a card and a band; they exclude class `card`. The "every graphic carries class g" test exempts the six card elements by class and a new test pins that exactly three cards and three bands exist and none has class `g`.
- Two scene tests that read the combined location line by `x === COLS.x[2]` now read `COLS.x[2] + COLS.textPad`.
- The first RED run needed a stub `columnCard` (an import error is not a useful failure); with it, 15 tests failed on assertions.
- The harness cannot run here (no browser). I smoke-tested the check 9 and probe 7 logic against a throwaway fake DOM built from `scene.js` output with estimated text widths (clean over a 578-state grid; PROBE7 reported once; `sensitivity().flagged` true). That is a logic check only, not a measurement.

### Open questions / next steps
- NOT verified by the implementer (no browser): how the cards and bands look (tint strength, frame visibility, rounded top corners of the band), and the real harness at 800x750, 1280x720 and 1000x700 (`H.all()`: expect `violations: []`, `flagged: true`, `budget.ok: true`). The widest text's real width in a browser should be confirmed to stay inside the card (about 272 + 8 units against 296).
- Merge and republish only on Todd's say-so (method in the 2026-10-21 republish entry below).
- Sources: Todd's chat request above; `.superpowers/sdd/2026-10-20-distributed-load-beam/cards-brief.md` (local, not committed); spec `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md` ("The equivalent forces"); ledger `docs/superpowers/sdd-ledger-distributed-load-beam.md`.

## 2026-10-21 - Republished to GitHub Pages (update commit on top of the public history)

### Summary
The merged build (e587e64 here) is live at https://zimmermant.github.io/distributed-load-beam/ as public commit 0ae6e00 ("Update: arrow shown at the wall, controls always below the figure, dotted load outlines"), a normal fast-forward push on top of the existing public history: no history rewrite and no force-push. The live `dist/distributed_load_beam.html` is byte-identical to the local build. On the live page the browser harness is clean at 800x750 and 1280x720 (176 combinations, 0 violations, text 12.3 px, all probes caught, budget ok), the controls sit below the figure, and the wall state draws its arrow.

### Decisions made
- Method (preferred over a rewrite whenever the public repo already exists): `git clone --no-hardlinks` the public repo into a scratch directory, ASSERT its `rev-parse --show-toplevel` is that directory and not this repo, export this repo's tracked files with `git archive HEAD`, delete `docs/`, scrub local paths from `lab_notebook.md`, `rsync -a --delete --exclude .git` into the clone, check `git status` lists only expected files, run the tests there, scan the diff and tree for local paths and secret-like strings, commit, push. Pre-push checks: 172 of 172 tests pass in the public clone, its build is reproducible and identical to this repo's dist, zero local-path or secret-like hits in the added lines or the tree, no `docs/` or tooling folders public.
- This notebook entry (written after the push) reaches the public copy with the next update.

### Problems encountered
None.

### Open questions / next steps
- Not yet tried inside a real Canvas iframe.
- A future republish repeats the method above; the build ledger is `docs/superpowers/sdd-ledger-distributed-load-beam.md`.

## 2026-10-21 - Merged: arrow at the wall, controls below the figure

### Summary
`feat/wall-arrow-stacked-layout` was merged into `main` with `--no-ff` (merge commit e587e64) at Todd's request ("merge and republish"). `main` had not moved since the fork (1b38e8a), so the merge was clean. The branch carries Todd's two changes after he reviewed the published page: the equivalent-force arrow is drawn at and near the wall again (the 0.12 m suppression and its notes are withdrawn; at x = 0 the head partly overlaps the wall, which he accepted), and the controls and calculation always sit below the figure in one centred 740 px column.

### Decisions made
- Local merge, `--no-ff`; the branch was deleted afterwards.
- Re-verified on the merged tree: 172 of 172 tests pass; `node build.js` reproduces the committed `dist/distributed_load_beam.html` byte-for-byte (39,039 bytes); tree clean. Before the merge the harness was clean at 800x750, 1280x720 and 1000x700 and the full mutation audit caught all 338 rows with every test covered.
- Republishing is done by adding a new commit on top of the existing public history (no history rewrite, no force-push): clone the public repo, copy the tracked files of this repo without `docs/`, scrub local paths from `lab_notebook.md`, run the tests there, commit, push. The record of that step follows below.

### Problems encountered
None during the merge.

### Open questions / next steps
- Not yet tried inside a real Canvas iframe.
- Sources: `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`, `docs/superpowers/sdd-ledger-distributed-load-beam.md` (the rulings and fix rounds), `../torque_i_beam`.

## 2026-10-21 - Force arrow drawn at the wall again; controls and calculation always below the figure

### Summary
Two changes Todd approved in chat ("Three columns is fine. You can show the arrow near the wall. Put the slider boxes below the diagrams, not off to the side. Everything else looks good."). (A) The 0.12 m wall rule is withdrawn: `forceArrow(k, F, x)` in `src/layout.js` returns null only for F = 0, x null/undefined, x < 0 or x > 4 m, so every 0 <= x <= 4 draws, including x = 0 and 0 < x < 0.12, on the same fixed scale with the head on the correct beam face. `WALL_CLEAR_M` (`src/physics.js`) and `wallWord` (`src/format.js`) are gone; `locWords` prints plain `at x = 0.00 m from A` and keeps its off-the-beam logic untouched; the calculation (`src/panel.js` `panelWhere`) loses the "(at the wall: no arrow is drawn)" / "(near the wall: ...)" notes and keeps "(off the beam, left of the wall)", "(off the beam, beyond C)" and the "worked from the unrounded locations" note (that note depends only on `panelNeedsExact`, not on the wall states). `src/scene.js` needed no change. (B) `src/styles.css` loses the `min-width: 1150px` query (figure left, 340 px right column): at every width the order is title, link note, figure (max 740 px, centred), then the controls and the calculation, side by side from 700 px (stacked below) in the sticky bottom row, which now stays sticky on wide windows too. Tests 168 -> 170; mutation rows 335 -> 336, all caught, 170 of 170 tests covered (`docs/superpowers/mutation-coverage-run.txt`). `dist/` rebuilt (38.9 KB). **Fix round 1 (same day, after the review; 0 Critical/Important):** `.page` is now the single 740 px centred column, so the title and the From the link note line up with the figure and the panels at every width (measured by the controller at 1700x900: h1 at x = 300 vs figure at x = 480 before; at 800 px the title moves 14 px right to meet the figure); the template test now extracts every at-rule and requires exactly `@media (min-width: 700px)`, and pins that the title, note, figure and panels share the column; harness checks renumbered 1-8 (the dotted-outline check is now 7 and the font-size check 8; older notebook entries below use the old numbers 9 and 7); README lead-in fixed (the drawn-arrow bullets are now paragraphs above "When there is no arrow"). Totals: 172 tests, 338 mutation rows all caught, 172 of 172 tests covered.

### Decisions made
- **Todd withdrew the 0.12 m wall rule.** It existed because a force at x = 0 (e.g. r = 100, t = -150, peak B: 50 N down at x = 0.00 m) puts the arrow head (half-width 3.4 * 1.6 + 1 = 6.44 units) over the wall rectangle, and the spec forbids overlaps; 0.12 m * 60 units/m = 7.2 units was the smallest distance that cleared it. He accepts the partial overlap at exactly x = 0 and wants the arrow shown ("You can show the arrow near the wall"), so the arrow is drawn and the overlap is not a defect. The text no longer says "at the wall" / "near the wall"; a location that prints 0.00 m simply prints `at x = 0.00 m from A`. A location just below zero (x < 0) still gets no arrow and is "off the beam" only if it PRINTS below 0.00 (unchanged).
- Because the old guard `x < 0.12` also caught null (null < 0.12), the new guard needs the explicit `x === null` (and `x === undefined`) checks; each has a mutation row.
- The browser harness lost the old check (8) (arrow groups vs `.wall` elements) and its `walls` list; the sweep still includes r=100, t=-150 (x = 0) and [-130, 190] (x = 0.10), and both now draw an arrow. Check (5) (arrows vs the A/B/C circles) stays: an arrow at x = 0 is tangent to circle A (head tip at the beam face = circle top), which the 0.5-unit tolerance allows.
- Layout: the 1150 breakpoint arithmetic (740 + 20 + 340 + 32 + 15) no longer exists. The only media query is 700 px, for the side-by-side sticky row; on a wide window the page just has empty margins around the 740 px figure. The harness `budget()` row logic (the sticky `.side` row vs the figure) is unchanged and still meaningful: the row is always below the figure, so overlap means it covers it; its header comment is updated.
- Tests: wall-rule tests replaced, not weakened (layout: drawn at 0, -0, 0.05, 0.1199, 0.12 and 4, null at -0.001 and 4.001, head faces at the wall for all three columns, the x = 0 combined arrow at `colX(2, 0)` with its head on the beam top; format: `locWords(0)` and `locWords(0.05)` plain, a 0.001-step scan for no "wall" wording; panel: no wall text for the near-wall states; scene: the wall state draws the combined arrow, and a sweep over all 2 * 81 * 81 states finds no "wall" or "no arrow" text, with a floor of at least 4 states inside the old wall zone). `test/template.test.js`: the 1150 / 740 + 340 test is replaced by three tests (figure container 740 px and `margin: 0 auto`; no media query above 700, no `1150`, no `340px`, no grid on `.page`; two columns at 700 px with the opaque sticky row and never `position: static`).
- Mutation rows: 13 rows whose find text no longer exists were removed (2 physics, 6 format, 2 layout, 2 panel, 1 styles) and 14 added (format: wall note added back at 0.00 or below 0.12; layout: `x < 0` guard removed, `x <= 0`, `x < 0.05`, `x < 0.12`, `x >= BEAM_L`, null location drawn; panel: wall note added back; styles: figure not centred, page grid back, side-by-side row at 1150 px, sticky row static on wide windows, never two columns). The old `layout.js` "beyond C" and "undefined" rows and the format/panel "off the beam" and "beyond C" rows were re-pointed at the new source text.

### Problems encountered
- First TDD pass: the scene test for r=-130, t=190 asserted the combined arrow at `colX(2, 0.1)`, but that state's x is 0.1004...; the test now reads the x from `derive`. Everything else went red for the right reason (the old wall wording, null arrows) and green after the source change.
- Accepted edge case: for a combined location in (-0.005, 0) the arrow is withheld (x < 0) but the text prints plain `0.00 m` (off the beam is judged on the printed value), so there is no arrow and no explanation. Unreachable from slider values or snapped presets (all 2 x 81 x 81 states checked), reachable only from off-grid inputs.
- A first mutation run was stopped after about 40 rows to add the null-location row (found while documenting that `x === null` is no longer redundant), then rerun in full: 336 rows, about 14 minutes.
- Not verifiable here (no browser): the figure and both panels fitting without scrolling at 800x750, 1280x720 and 1000x700, text >= 12 px, the look of the head overlapping the wall at x = 0, and the harness result. The controller runs those.

### Open questions / next steps
- Browser check of the three viewports and `H.all()` (176 combinations; expect `violations: []`, `flagged: true`, `budget.ok: true` at 800x750 and 1280x720). If the stacked layout cannot fit 1280x720 (the old right column freed vertical room there), that has to be reported rather than shrinking text.
- The 2026-10-20 entries below keep their historical statements about the wall rule and the 1150 layout; they describe the code as it was then.
- Republish to the public Pages repo only on Todd's say-so (procedure in the 2026-10-20 publish entry).
- Sources: Todd's chat request above; spec `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`; the earlier wall ruling in `docs/superpowers/sdd-ledger-distributed-load-beam.md` (Task 8); live app https://zimmermant.github.io/distributed-load-beam/ (still the old build until republished); `README.md` (layout, wall and harness sections updated).

## 2026-10-20 - Published to GitHub Pages

### Summary
Published at Todd's request ("publish to github pages") to https://zimmermant.github.io/distributed-load-beam/ (public repo https://github.com/zimmermant/distributed-load-beam, Pages from `main` at `/`). The live `dist/distributed_load_beam.html` is byte-identical to the local build; on the live page the browser harness is clean (176 combinations, 0 violations, text 12.3 px, all probes caught, budget ok at 800x750) and the README's preset link shows the numbers the README says.

### Decisions made
- Same pattern as `torque_i_beam`: a separate public repo, `docs/` (specs, plans, ledger, audit report) stripped from the published history, MIT licence, root `index.html` redirecting to `dist/distributed_load_beam.html`. The redirect drops query strings, so preset links and the embed snippet use the full `dist/...` address (the README says so and now carries the real address).
- Beyond stripping `docs/`, the public history is also scrubbed: older notebook versions contained an absolute local path and a cloud-folder name, so those strings were replaced in the public copy's history (a tree scan alone would not have found them).
- The local repo has NO remote on purpose: the public history is a filtered copy with different commit hashes.
- Pre-publish checks on the public copy: zero local-path or cloud-folder strings in the tree or in the whole history, no `docs/`, `.superpowers/`, `.claude/` or `CLAUDE.md` ever present, no secret-like strings (only the author email in commit metadata, as in the sibling repos), 168 of 168 tests pass on their own, the build is reproducible and identical to the real repo's dist.
- To republish: commit locally; `git clone --no-hardlinks . <tmp>`; ASSERT the clone's `git rev-parse --show-toplevel` is the tmp path and differs from the real repo BEFORE any history rewrite; in the clone run `git filter-branch -f --tree-filter '<script replacing local paths and cloud-folder names in lab_notebook.md>' --index-filter 'git rm -r -q --cached --ignore-unmatch docs' -- --all`, delete `refs/original/*` and `refs/remotes/*`, re-scan tree and history, run the tests, then force-push the filtered history to the public repo (a republish rewrites its history; coordinate that with Todd) or add the new commits on top of the published history.

### Problems encountered
- A slip of mine during the publish step (the build ledger has the full account): `git clone` into the scratch directory failed with a hardlink error, a chained `cd` never ran, and `git filter-branch` ran in the REAL repository, removing `docs/` from its history and working tree for a moment. `filter-branch` had kept a backup ref at the exact previous commit (705479e) and the tree was clean, so `main` was reset to it: 31 commits with the original hashes, `docs/` restored, `fsck` clean, 168 tests pass, dist matches HEAD. The rewrite was then redone in a guarded no-hardlinks clone. Nothing was pushed from the real repo at any time.

### Open questions / next steps
- Items awaiting Todd's confirmation: three columns instead of the mockup's rows; a force within 0.12 m of the wall draws no arrow (text says "at the wall" / "near the wall"); the peak buttons no longer say "(wall)"; very small forces draw as a speck on the fixed scale.
- Not yet tried inside a real Canvas iframe.

## 2026-10-20 - Merged to main

### Summary
`feat/initial-build` (the whole distributed-load beam simulation, including URL presets and the dotted load outlines) was merged into `main` with `--no-ff` (merge commit e778fa6) at Todd's request ("merge to main"). `main` had not moved since the fork (bb352a1), so the merge was clean. There is no remote: nothing was pushed or published, and there is no live URL.

### Decisions made
- Local merge (option 1 of the finishing menu); `--no-ff` keeps the build's history visible as one unit.
- Re-verified on the merged tree: 168 of 168 tests pass; `node build.js` reproduces the committed `dist/distributed_load_beam.html` byte-for-byte (40,306 bytes); working tree clean. The browser harness and the full mutation audit were run on the same code before the merge (final: 335 rows all caught, 168 of 168 tests covered; harness clean at 800x750, 1280x720 and 1000x700).
- Deleted the merged branch. The git-ignored SDD workspace was left in place; the durable record of every ruling and fix round is `docs/superpowers/sdd-ledger-distributed-load-beam.md`.

### Problems encountered
None during the merge.

### Open questions / next steps
- Publishing (a separate public repo with `docs/` stripped from the history, MIT licence, root redirect page and GitHub Pages, as for `torque_i_beam`) only when Todd gives the go-ahead. A preset link must point at the `dist/...` address because the root redirect drops query strings.
- Items awaiting Todd's confirmation: three columns instead of the mockup's rows; a force within 0.12 m of the wall draws no arrow (text says "at the wall" / "near the wall"); the peak buttons no longer say "(wall)"; very small forces (about 5 N) draw as a speck on the fixed force scale.
- Sources: `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`, `docs/superpowers/plans/2026-10-20-distributed-load-beam.md`, `docs/superpowers/mutation-audit-report.md`, `../torque_i_beam` (the pattern followed; live at https://zimmermant.github.io/torque-i-beam/).

## 2026-10-20 - Dotted outline of the load in each equivalent-force column (Todd's request)

### Summary
Todd asked: "On the three beam diagrams on the bottom, include a dotted outline for the loading." Each of the three bottom columns now draws, behind its force arrow, a dotted unfilled outline of the load that column's force replaces: the rectangle w = r (blue), the triangle (orange), and the net load w(x) = r + t*f(x) (green; a trapezoid, or two triangles on opposite faces when w changes sign inside AB, split at xc = L*w(0)/(w(0) - w(L))). New pure `columnOutline(k, s)` in `src/layout.js` (helpers `layoutPiece`, `layoutNet`); `src/scene.js` draws each polygon as a `<path class="g outline">` (stroke-dasharray "2 4", width 1.8, round caps, fill none, column colour) after the column's beam copy and before its arrow. Tests 156 -> 168 (6 added to `test/layout.test.js`, including a drift test between the harness constants and `COLS`; 6 to `test/scene.test.js`); mutation rows 313 -> 335, all caught, 168 of 168 tests covered (full run saved in `docs/superpowers/mutation-coverage-run.txt`). `tools/browser-harness.js` gains check (9) and two outline probes; `dist/` rebuilt (40.3 KB). Commits: 9fbe91b (feature + harness), 474dfa7 (mutation rows and run).

### Decisions made
- **Same vertical scale as the top figure** (`TOP.unit`, 0.2 units per N/m), so max stacked 400 N/m = 80 units fits the column band (108) and never reaches the column text lines; the outline spans AB only and sits on the face the load pushes from (above for w > 0, below for w < 0). Zero load draws nothing.
- **The arrow inside its outline is intended** (the arrow replaces the load at its centroid); only text-vs-graphic overlap is a defect, and the harness's existing check (3) already guards labels against `.outline` because it is a top-level `.g`.
- A zero-height end contributes no point, so a piece with a zero end is a triangle, never a degenerate polygon; the same signed expression `base - w*unit` gives both faces.
- Harness check (9) hard-codes the column geometry (the built page has no module access); `test/layout.test.js` reads the harness and fails if the constants drift from `COLS`, `BEAM_H`, `LOADED_L`.

### Problems encountered
- None in the implementation; the new rows needed no narrowing (all fail 1-5 tests). The existing `unit: 0.3` and `band: 60` rows still stay under the 12-test limit with the new tests.
- Not verified here (no browser available to the implementer): how the dots look, and the harness run (check 9, `sensitivity().flagged` with the two new probes, `outlineTotal` >= 400).

### Open questions / next steps
- Controller: look at the three columns (default, a sign-changing state such as r = 100, t = -200, peak B, and r = -100), and run the harness at 1280x720, 800x750, 1000x700; expect `violations: []`, `flagged: true`, `outlineTotal` about 500.
- Sources: the approved in-chat design (kept in the git-ignored SDD workspace); spec section "The equivalent forces" in `docs/superpowers/specs/2026-10-20-distributed-load-beam-design.md`; mutation run `docs/superpowers/mutation-coverage-run.txt`.

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
- **The mutation audit found 100 rows initially uncaught** (scene.js, svg.js, app.js had no unit tests; build refusals, several state/presets/panel branches unpinned). Fixed by strengthening the tests, not the rows: 56 tests added (97 to 153), including a stub DOM (`test/stub-dom.js`), `test/scene.test.js` (17), `test/app.test.js` (4). The final-review fix wave then added 3 tests and 4 rows: final totals are 156 tests and 313 rows, and the controller re-ran the full audit on the final tree (all 313 caught, all 156 tests have teeth; output in `docs/superpowers/mutation-coverage-run.txt`).
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
