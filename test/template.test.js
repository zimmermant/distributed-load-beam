import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { W_MAX, W_STEP } from '../src/physics.js';

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

test('the figure viewBox is 0 0 960 560', () => {
  assert.match(template, /<svg id="fig" viewBox="0 0 960 560"/);
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

// Viewport budget arithmetic: the figure must stay >= 740 px wide wherever the page is >= 800 px wide
// (text >= 12 px needs figure >= 720), including at the two-column breakpoint.
test('figure max-width is 740 and the two-column breakpoint leaves it 740 px wide', () => {
  assert.match(css, /\.fig-col \{ max-width: 740px;/);
  const widths = [...css.matchAll(/@media \(min-width: (\d+)px\)/g)].map(m => Number(m[1]));
  assert.ok(widths.includes(700), 'a 700 px breakpoint');
  const col = Math.max(...widths);
  const need = 740 + 20 + 340 + 32 + 15;   // figure + gap + right column + body padding + a scrollbar
  assert.ok(col >= need, `two-column breakpoint ${col} < ${need}`);
  assert.match(css, /grid-template-columns: minmax\(0, 740px\) 340px/);
  assert.match(css, /position: sticky; bottom: 0/);
});
