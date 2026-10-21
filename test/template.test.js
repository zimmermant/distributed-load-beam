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

test('the figure viewBox is 0 0 960 560, and it is the same one layout.js and the browser harness use', () => {
  assert.match(template, /<svg id="fig" viewBox="0 0 960 560"/);
  const want = `0 0 ${VB.w} ${VB.h}`;
  assert.equal(want, '0 0 960 560');
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
  assert.ok(template.includes('−200 (up)') && template.includes('+200 (down)'));
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

test('no media query turns the page into columns: no 1150 breakpoint, no 740 + 340 grid, no grid on .page', () => {
  assert.ok(!/1150/.test(css), 'styles.css still mentions 1150');
  assert.ok(!/min-width: (?!700px)\d+px/.test(cssBare), 'a min-width other than 700 px');
  assert.ok(!/grid-template-columns: minmax\(0, 740px\) 340px/.test(css), 'the 740 + 340 page grid is back');
  assert.ok(!/340px/.test(css), 'a 340 px right column is back');
  assert.ok(!/\.page[^{]*\{[^}]*display: grid/.test(css), '.page is a grid');
  assert.ok(!/\.page > /.test(css), 'a .page > child rule (the old grid placement)');
  assert.ok(mediaBlocks.length >= 1, 'the 700 px block was not found');
  for (const m of mediaBlocks) assert.equal(m.width, 700, `a min-width ${m.width}px media query`);
  assert.equal(mediaBlocks.length, 1, 'exactly one min-width media query (700 px)');
});

test('the only at-rule in styles.css is @media (min-width: 700px): no compound, max-width, min-height or other query', () => {
  assert.deepEqual(atRules, ['@media (min-width: 700px)'], `at-rules found: ${atRules.join(' | ')}`);
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
  assert.match(m.body, /\.side \{[^}]*grid-template-columns: 1\.25fr 1fr;/);
  assert.match(m.body, /position: sticky; bottom: 0;/);
  assert.match(m.body, /background: #ffffff;/);                              // opaque, so the figure does not show through
  assert.match(m.body, /border-top: 1px solid/);
  assert.ok(!/position: static/.test(css), 'the sticky row is turned static somewhere');
});

test('the From the link line starts hidden and empty, and is a plain paragraph', () => {
  assert.match(template, /<p id="from-link" hidden><\/p>/);
  assert.match(css, /#from-link\[hidden\] \{ display: none; \}/);
});
