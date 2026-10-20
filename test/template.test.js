import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(here, '..', 'src', 'index.template.html'), 'utf8');
const appJs = readFileSync(join(here, '..', 'src', 'app.js'), 'utf8');

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
  const ids = [...appJs.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
  for (const id of ids) {
    assert.ok(template.includes(`id="${id}"`), `app.js looks up #${id}, which the template lacks`);
  }
});
