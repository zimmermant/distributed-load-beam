import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { W_MAX, W_STEP } from '../src/physics.js';
import { VB } from '../src/layout.js';

const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(here, '..', 'src', 'index.template.html'), 'utf8');
const appJs = readFileSync(join(here, '..', 'src', 'app.js'), 'utf8');
const css = readFileSync(join(here, '..', 'src', 'styles.css'), 'utf8');

test('the page declares both inline markers and loads nothing external', () => {
  assert.ok(template.includes('<!--INLINE_CSS-->'), 'missing <!--INLINE_CSS-->');
  assert.ok(template.includes('<!--INLINE_JS-->'), 'missing <!--INLINE_JS-->');
  assert.ok(!/https?:\/\//.test(template), 'the template contains an external URL');
  assert.ok(!/<script[^>]+src=/.test(template), 'the template loads an external script');
  assert.ok(!/<link[^>]+href=/.test(template), 'the template loads an external stylesheet');
});

test('the figure viewBox is 0 0 960 548, and it is the same one layout.js and the browser harness use', () => {
  assert.match(template, /<svg id="fig" viewBox="0 0 960 548"/);
  const want = `0 0 ${VB.w} ${VB.h}`;
  assert.equal(want, '0 0 960 548');
  assert.ok(template.includes(`<svg id="fig" viewBox="${want}"`), 'the template viewBox differs from layout.js VB');
  // the harness is read as text, not run: its constant must say the same numbers
  const harness = readFileSync(join(here, '..', 'tools', 'browser-harness.js'), 'utf8');
  const m = harness.match(/const VB = \{ w: (\d+), h: (\d+) \};/);
  assert.ok(m, 'tools/browser-harness.js has no `const VB = { w: ..., h: ... };`');
  assert.equal(`0 0 ${m[1]} ${m[2]}`, want, 'the harness viewBox differs from layout.js VB');
});

test('every id app.js looks up exists in the template', () => {
  // getElementById('...') is the only lookup form app.js may use, so this test can see every id.
  const ids = [...new Set([...appJs.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]))];
  assert.ok(ids.length >= 8, `only ${ids.length} distinct ids found in app.js: ${ids.join(', ')}`);
  for (const id of ids) {
    assert.ok(template.includes(`id="${id}"`), `app.js looks up #${id}, which the template lacks`);
  }
  assert.ok(!/querySelector|getElementsBy|\$\(/.test(appJs), 'app.js must use getElementById only');
});

function inputTag(id) {
  const m = template.match(new RegExp(`<input[^>]*\\bid="${id}"[^>]*>`));
  assert.ok(m, `no <input id="${id}"> in the template`);
  return m[0];
}
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];

test("the sliders' min, max and step equal W_MAX, W_STEP", () => {
  for (const id of ['r-slider', 't-slider']) {
    const tag = inputTag(id);
    assert.equal(attr(tag, 'type'), 'range');
    assert.equal(Number(attr(tag, 'min')), -W_MAX, id);
    assert.equal(Number(attr(tag, 'max')), W_MAX, id);
    assert.equal(Number(attr(tag, 'step')), W_STEP, id);
  }
});

test('the figure and the controls are both in the page and the calculation panel is an aria-live region', () => {
  assert.match(template, /<svg id="fig"/);
  assert.match(template, /id="controls"/);
  assert.match(template, /<[a-z]+[^>]*\bid="calc"[^>]*\baria-live="(polite|assertive)"|<[a-z]+[^>]*\baria-live="(polite|assertive)"[^>]*\bid="calc"/);
  // both peak buttons carry aria-pressed, and there are two zero labels
  for (const id of ['peak-a', 'peak-b']) {
    const m = template.match(new RegExp(`<button[^>]*\\bid="${id}"[^>]*>`));
    assert.ok(m, id);
    assert.match(m[0], /aria-pressed="(true|false)"/);
  }
  assert.equal((template.match(/class="zero-label"/g) || []).length, 2);
  assert.equal((template.match(/<span>−200&nbsp;N\/m \(down\)<\/span>/g) || []).length, 2);
  assert.equal((template.match(/<span>\+200&nbsp;N\/m \(up\)<\/span>/g) || []).length, 2);
  assert.equal((template.match(/class="zero-label">0&nbsp;N\/m<\/span>/g) || []).length, 2);
  assert.ok(template.includes('Which end comes to a point (w = 0&nbsp;N/m)?'));
  assert.ok(template.includes('A 4&nbsp;m beam fixed to a wall at A'));
  assert.ok(template.includes('(L = 2&nbsp;m)'));
  assert.equal((template.match(/<\/b>&nbsp;N\/m</g) || []).length, 2, 'both readouts are followed by a no-break space and N/m');
});

test('app.js: the From the link line is written with textContent, never innerHTML', () => {
  assert.ok(/textContent/.test(appJs), 'app.js should set #from-link with textContent');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(appJs), 'app.js must not build HTML');
});

test('the zero labels have ids that app.js looks up', () => {
  for (const id of ['r-zero', 't-zero']) {
    assert.match(template, new RegExp(`id="${id}" class="zero-label"`));
    assert.ok(appJs.includes(`getElementById('${id}')`), id);
  }
});

// Page layout: one column at every width. Title, link note, the figure (at most 740 px wide, centred),
// then controls and calculation side by side (stacked below 700 px). The only media query is the 700 px
// one for that row; nothing turns the page into columns on a wide window.
const cssBare = css.replace(/\/\*[\s\S]*?\*\//g, '');                       // comments out, so a word in one is not an at-rule
const mediaBlocks = [...cssBare.matchAll(/@media \(min-width: (\d+)px\) \{([\s\S]*?)\n\}/g)].map(m => ({ width: Number(m[1]), body: m[2] }));
// Every at-rule prelude in the file ('@media (min-width: 700px)', '@media (min-width: 900px) and (min-height: 1px)', '@supports ...'), whitespace collapsed.
const atRules = [...cssBare.matchAll(/(@[a-zA-Z-]+[^{;]*)\{/g)].map(m => m[1].trim().replace(/\s+/g, ' '));

test('figure container: max-width 740 px and centred with auto side margins', () => {
  const rule = css.match(/\.fig-col \{([^}]*)\}/);
  assert.ok(rule, 'no .fig-col rule');
  assert.match(rule[1], /max-width: 740px;/);
  assert.match(rule[1], /margin: 0 auto;/);
  assert.match(css, /#fig \{[^}]*width: 100%;/);
});

test('no media query turns the page into columns: no 1150 breakpoint, no 740 + 340 grid, no grid on .page; the 1100 px one widens only the controls row', () => {
  assert.ok(!/1150/.test(css), 'styles.css still mentions 1150');
  assert.ok(!/min-width: (?!700px|1100px)\d+px/.test(cssBare), 'a min-width other than 700 px and 1100 px');
  assert.ok(!/grid-template-columns: minmax\(0, 740px\) 340px/.test(css), 'the 740 + 340 page grid is back');
  assert.ok(!/340px/.test(css), 'a 340 px right column is back');
  assert.ok(!/\.page[^{]*\{[^}]*display: grid/.test(css), '.page is a grid');
  assert.ok(!/\.page > /.test(css), 'a .page > child rule (the old grid placement)');
  assert.deepEqual(mediaBlocks.map(m => m.width), [700, 1100], 'exactly two min-width media queries (700 px, 1100 px)');
  // the 1100 px block only widens the controls row: one rule, for .side, so the page never becomes columns
  const wide = mediaBlocks.find(m => m.width === 1100);
  assert.deepEqual([...wide.body.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()), ['.side']);
});

test('the only at-rules in styles.css are @media (min-width: 700px) and (min-width: 1100px): no compound, max-width, min-height or other query', () => {
  assert.deepEqual(atRules, ['@media (min-width: 700px)', '@media (min-width: 1100px)'], `at-rules found: ${atRules.join(' | ')}`);
});

test('from 1100 px the controls row spreads to 1060 px, centred under the 740 px figure, and gives the calculation the room', () => {
  const m = mediaBlocks.find(b => b.width === 1100);
  assert.ok(m, 'a 1100 px breakpoint');
  assert.match(m.body, /\.side \{[^}]*width: 1060px;[^}]*max-width: none;[^}]*margin-left: calc\(50% - 530px\);[^}]*grid-template-columns: 1fr 1\.55fr;/);
  // centred: half of 1060 is 530; inside the window: 1060 px plus a 20 px gutter each side is the 1100 px breakpoint
  assert.equal(1060 / 2, 530);
  assert.ok(1060 + 2 * 20 <= 1100);
  // the controls column keeps the ~350 px two peak buttons need (plus 26 px of padding and border)
  assert.ok((1060 - 8) * 1 / 2.55 >= 350 + 26, 'the controls column is too narrow for the peak buttons');
  assert.ok(!/(^|\n)\s*\.(page|fig-col)\s*\{/.test(m.body), 'the figure column and the page keep their 740 px');
});

test('the title and the From the link note sit in the same 740 px centred column as the figure and the panels', () => {
  // .page is the one column: max-width 740 px, centred; the h1, #from-link, .fig-col and .side are all its children
  const page = cssBare.match(/\.page \{([^}]*)\}/);
  assert.ok(page, 'no .page rule');
  assert.match(page[1], /max-width: 740px;/);
  assert.match(page[1], /margin: 0 auto;/);
  const main = template.match(/<main class="page">([\s\S]*)<\/main>/);
  assert.ok(main, 'the template has no <main class="page">');
  const body = main[1];
  const at = (needle) => body.indexOf(needle);
  assert.ok(at('<h1>') >= 0 && at('<p id="from-link"') >= 0 && at('<div class="fig-col">') >= 0 && at('<div class="side">') >= 0, 'all four are inside main.page');
  assert.ok(at('<h1>') < at('<p id="from-link"') && at('<p id="from-link"') < at('<div class="fig-col">') && at('<div class="fig-col">') < at('<div class="side">'), 'order: title, link note, figure, controls');
  assert.ok(!/(^|\n)\s*(h1|#from-link)\s*\{[^}]*(margin-left|padding-left|max-width|width)/.test(cssBare), 'the h1 or #from-link has its own width or side offset');
});

test('controls and calculation: stacked below 700 px, two columns at 700 px and up, sticky at every width from 700 px', () => {
  assert.match(css, /\.side \{[^}]*grid-template-columns: 1fr;/);          // base: stacked
  assert.match(css, /\.side \{[^}]*max-width: 740px;[^}]*margin: 6px auto 0;/);
  const m = mediaBlocks.find(b => b.width === 700);
  assert.ok(m, 'a 700 px breakpoint');
  assert.match(m.body, /\.side \{[^}]*grid-template-columns: 1\.1fr 1fr;/);
  // the controls column must keep the ~350 px of content two peak buttons need (panel padding + border: 26 px), on a 740 px row with an 8 px gap
  assert.ok((740 - 8) * 1.1 / 2.1 >= 350 + 26, 'the controls column is too narrow for the peak buttons');
  assert.match(m.body, /position: sticky; bottom: 0;/);
  assert.match(m.body, /background: #ffffff;/);                              // opaque, so the figure does not show through
  assert.match(m.body, /border-top: 1px solid/);
  assert.ok(!/position: static/.test(css), 'the sticky row is turned static somewhere');
});

test('the From the link line starts hidden and empty, and is a plain paragraph', () => {
  assert.match(template, /<p id="from-link" hidden><\/p>/);
  assert.match(css, /#from-link\[hidden\] \{ display: none; \}/);
});

test('the calculation text is compact enough for its tallest state: 13 px text, line height 1.25, tight vertical padding, 2 px between lines', () => {
  const calc = cssBare.match(/#calc \{([^}]*)\}/);
  assert.ok(calc, 'no #calc rule');
  assert.match(calc[1], /font-size: 13px;/, 'the calculation text must stay at least 12 px (13 px here)');
  assert.match(calc[1], /line-height: 1\.25;/);
  assert.match(cssBare, /#calc \.cl \{ margin-bottom: 2px; \}/);
  assert.match(cssBare, /\.calc-panel \{ padding-top: 4px; padding-bottom: 4px; \}/);
  assert.match(cssBare, /\.calc-panel h2 \{ margin-bottom: 2px; \}/);
});

test('the main page links to the detailed calculation: after #calc, outside it, in the calculation panel, with all four states styled', () => {
  const panel = (template.match(/<section class="panel calc-panel">[\s\S]*?<\/section>/) || [])[0];
  assert.ok(panel, 'no calc-panel section');
  assert.ok(panel.includes('<a id="detail-link" class="more" href="distributed_load_beam_detail.html">More detailed calculation</a>'));
  // #calc is an empty element closed before the link starts, so no rewrite of #calc can remove the link
  const calcEnd = panel.indexOf('<div id="calc" aria-live="polite"></div>');
  assert.ok(calcEnd >= 0, '#calc must be an empty div');
  assert.ok(panel.indexOf('id="detail-link"') > calcEnd + '<div id="calc" aria-live="polite"></div>'.length - 1, 'the link follows #calc');
  assert.equal((template.match(/id="detail-link"/g) || []).length, 1);
  // visible hover, active and keyboard-focus states, each different from the resting look
  const rest = cssBare.match(/\.more \{([^}]*)\}/);
  assert.ok(rest, 'no .more rule');
  // pinned like #calc: a later edit must not silently grow the link and break the 1280x720 fit (2 px margin + one 13 px x 1.3 line)
  assert.match(rest[1], /margin: 2px 0 0;/, 'the .more margin is 2px 0 0');
  assert.match(rest[1], /line-height: 1\.3;/, 'the .more line height is 1.3');
  assert.match(rest[1], /font-size: 13px;/);
  assert.match(rest[1], /padding: 0 2px;/, 'the .more padding adds no height');
  assert.match(rest[1], /text-decoration: underline;/, 'the link looks like a link at rest');
  assert.match(rest[1], /width: fit-content;/, 'the link is as wide as its text, so its hover background is not a full-width bar');
  const size = rest[1].match(/font-size: (\d+)px/);
  assert.ok(size && Number(size[1]) >= 12, 'the link text must be at least 12 px');
  const hover = cssBare.match(/\.more:hover \{([^}]*)\}/);
  const active = cssBare.match(/\.more:active \{([^}]*)\}/);
  const focus = cssBare.match(/\.more:focus-visible \{([^}]*)\}/);
  assert.ok(hover && /background:/.test(hover[1]), 'hover changes the background');
  assert.ok(active && /background:/.test(active[1]), 'active changes the background');
  assert.ok(focus && /outline: \d+px solid/.test(focus[1]), 'focus-visible draws an outline');
  assert.notEqual(hover[1].trim(), active[1].trim(), 'hover and active must look different');
});

// ---- the detail page's template -------------------------------------------------------------------
const detailTemplate = readFileSync(join(here, '..', 'src', 'detail.template.html'), 'utf8');
const detailCss = readFileSync(join(here, '..', 'src', 'detail.css'), 'utf8');
const sectionText = (t) => (t.match(/<section id="controls"[\s\S]*?<\/section>/) || [])[0];

test('the detail template declares both inline markers and loads nothing external', () => {
  assert.ok(detailTemplate.includes('<!--INLINE_CSS-->'));
  assert.ok(detailTemplate.includes('<!--INLINE_JS-->'));
  assert.ok(!/https?:\/\//.test(detailTemplate));
  assert.ok(!/<script[^>]+src=/.test(detailTemplate));
  assert.ok(!/<link[^>]+href=/.test(detailTemplate));
  assert.ok(detailTemplate.includes('<title>Distributed load on a beam: detailed calculation</title>'));
  assert.ok(detailTemplate.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
});

test('the detail template: h1, back link, hidden link note, then the actual-load figure, in one main.page', () => {
  const m = detailTemplate.match(/<main class="page">([\s\S]*)<\/main>/);
  assert.ok(m, 'no <main class="page">');
  const body = m[1];
  assert.ok(body.includes('<h1>Distributed load on a beam: detailed calculation</h1>'));
  assert.ok(body.includes('<a id="back-link" href="distributed_load_beam.html">Back to the simulation</a>'));
  assert.match(body, /<p id="from-link" hidden><\/p>/);
  assert.match(body, /<svg id="detail-fig" viewBox="0 0 960 356" role="img" aria-label="[^"]+"><\/svg>/);
  assert.ok(body.includes('<section id="actual" aria-labelledby="h-actual"><h2 id="h-actual">Actual load on AB</h2>'));
  const at = (s) => body.indexOf(s);
  const order = ['<h1>', 'id="back-link"', 'id="from-link"', 'id="actual"', 'id="detail-fig"', 'id="controls"', 'id="blk-rect"', 'id="blk-tri"', 'id="blk-comb"'];
  const pos = order.map(at);
  assert.ok(pos.every(i => i >= 0), order.filter((s, i) => pos[i] < 0).join(', '));
  assert.deepEqual([...pos].sort((a, b) => a - b), pos, 'order: title, back link, note, figure, controls, three blocks');
});

test('the detail figure label has no digit without a unit', () => {
  const label = detailTemplate.match(/<svg id="detail-fig"[^>]*aria-label="([^"]+)"/)[1];
  assert.ok(label.includes('w_A') && label.includes('w_B'));
  const bare = label.replace(/\d+&nbsp;(?:N\/m|N|m)\b/g, '');
  assert.ok(!/\d/.test(bare), `a number without a unit in: ${label}`);
});

test('the detail figure sits in the figure column, and every block is labelled by its heading', () => {
  assert.match(detailTemplate, /<div class="fig-col">\s*<svg id="detail-fig"[^>]*><\/svg>\s*<\/div>/);
  for (const id of ['rect', 'tri', 'comb']) {
    assert.ok(detailTemplate.includes(`<section class="dblock" id="blk-${id}" aria-labelledby="h-${id}">`), id);
  }
});

test('the detail template has the three calculation blocks, each with its heading and an empty body', () => {
  for (const [id, head] of [['rect', 'Calculating the rectangular loading'], ['tri', 'Calculating the triangular loading'], ['comb', 'Calculating the combined loading']]) {
    assert.match(detailTemplate, new RegExp(`<section class="dblock" id="blk-${id}"[^>]*>\\s*<h2[^>]*>${head}</h2>\\s*<div class="dbody" id="body-${id}"></div>\\s*</section>`));
  }
});

test("the detail page's controls section is the main page's, character for character", () => {
  const want = sectionText(template);
  assert.ok(want && want.length > 500, 'the main template has its controls section');
  assert.equal(sectionText(detailTemplate), want);
});

// The declarations of each rule of a stylesheet, by selector (comments removed; no at-rules in these files).
function cssRules(css) {
  const rules = new Map();
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = {};
    for (const d of m[2].split(';').map(x => x.trim()).filter(Boolean)) {
      const at = d.indexOf(':');
      decls[d.slice(0, at).trim()] = d.slice(at + 1).trim();
    }
    rules.set(m[1].trim(), decls);
  }
  return rules;
}
const px = (v) => { const m = /^(\d+(?:\.\d+)?)px$/.exec(v || ''); return m ? Number(m[1]) : NaN; };

test('detail.css: text at least 12 px (16 px body, 12 px subscripts), the back link and the figure column keep their look, the sliders sit under the figure', () => {
  const rules = cssRules(detailCss);
  const rule = (sel) => { assert.ok(rules.has(sel), `no ${sel} rule`); return rules.get(sel); };
  // the back link: a visible link at rest, with a different look on hover, active and keyboard focus
  const back = rule('#back-link');
  assert.equal(back.display, 'inline-block');
  assert.equal(back['text-decoration'], 'underline');
  assert.ok(px(back['font-size']) >= 12, 'the back link text is at least 12 px');
  assert.ok(rule('#back-link:hover').background && rule('#back-link:hover').color);
  assert.ok(rule('#back-link:active').background);
  assert.match(rule('#back-link:focus-visible').outline, /^\d+px solid /, 'keyboard focus draws an outline');
  // the sliders: in the figure's 740 px column, centred, close under the figure
  const controls = rule('#controls');
  assert.equal(controls['max-width'], '740px');
  assert.equal(controls.margin, '6px auto 0');
  // the calculation text: 16 px, airy enough to read
  const body = rule('.dbody');
  assert.equal(px(body['font-size']), 16);
  assert.ok(Number(body['line-height']) >= 1.4, 'the calculation line height is at least 1.4');
  assert.ok(px(rule('.dblock h2')['font-size']) >= 16, 'a block heading is at least 16 px');
  assert.equal(rule('.dblock').margin, '20px 0 0');
  assert.match(rule('.dblock')['border-top'], /^1px solid /, 'a rule separates the blocks');
  // the top item stays compact: heading at least 16 px with tight margins (so the figure and sliders fit 700 px)
  assert.ok(px(rule('#actual h2')['font-size']) >= 16);
  assert.equal(rule('#actual h2').margin, '4px 0 2px');
  // set-up lines are plain; plug-in lines carry the green border and tint and wrap long lines; notes are italic
  assert.equal(rule('.dbody .step')['border-left'], undefined);
  const plug = rule('.dbody .plug');
  assert.match(plug['border-left'], /^3px solid /);
  assert.ok(plug.background, 'a plug-in line has a tint');
  assert.equal(plug['overflow-wrap'], 'break-word');
  assert.equal(rule('.dbody .note')['font-style'], 'italic');
  const rnd = rule('.dbody .rnd');
  assert.ok(px(rnd['font-size']) >= 12, 'the unrounded note is at least 12 px');
  assert.equal(rnd['font-style'], 'normal');
  // variables: serif italic; a subscript is at least 12 px and never makes its line taller
  const v = rule('i.v');
  assert.match(v['font-family'], /serif/);
  assert.equal(v['font-style'], 'italic');
  const sub = rule('.dbody sub');
  assert.ok(px(sub['font-size']) >= 12, 'a subscript is a fixed size of at least 12 px');
  assert.equal(sub['line-height'], '0');
  assert.equal(sub['vertical-align'], 'baseline');
  assert.equal(sub.position, 'relative');
  assert.equal(sub.top, '.3em', 'the subscript is lowered by a relative offset');
});

test('detail.css: block spacing, a heading style, and hover, active and focus-visible states for the back link', () => {
  const bare = detailCss.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(bare, /\.dblock \{[^}]*margin/);
  assert.match(bare, /\.dblock h2 \{[^}]*font-size/);
  for (const sel of ['#back-link', '#back-link:hover', '#back-link:active', '#back-link:focus-visible']) {
    assert.ok(bare.includes(`${sel} {`), `no ${sel} rule`);
  }
  assert.ok(!/@media|@supports/.test(bare), 'the detail stylesheet adds no at-rules');
  assert.ok(!/https?:\/\//.test(bare));
});
