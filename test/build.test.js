import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync, cpSync, appendFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { strip, scanForDuplicates, main, MODULES } from '../build.js';

// build.js only calls main() when it is the program node was invoked on (see
// its guard at the bottom), so importing it here to reach `strip` does not
// trigger a real build. These pin strip()'s two rewrites -- import/export
// removal and export-keyword stripping -- as a pure function, independent of
// the file system.

test('a single-line relative import is removed', () => {
  const src = "import { el, clear } from './svg.js';\nconst x = 1;\n";
  const out = strip(src);
  assert.ok(!out.includes('import'), out);
  assert.ok(out.includes('const x = 1;'));
});

test('a multi-line relative import is removed', () => {
  const src =
    "import { tipPosition, constraintLine,\n" +
    "         RAMP_MIN, RAMP_MAX } from './physics.js';\n" +
    "const y = 2;\n";
  const out = strip(src);
  assert.ok(!out.includes('import'), out);
  assert.ok(!out.includes('RAMP_MIN'), 'the wrapped second line must be dropped too');
  assert.ok(out.includes('const y = 2;'));
});

test('a single-line export { ... } block is removed', () => {
  const src = 'const a = 1;\nexport { a, b };\nconst c = 2;\n';
  const out = strip(src);
  assert.ok(!out.includes('export'), out);
  assert.ok(out.includes('const a = 1;'));
  assert.ok(out.includes('const c = 2;'));
});

test('export function / export const keep their declaration but lose the keyword', () => {
  const src = 'export function foo() {}\nexport const bar = 1;\n';
  const out = strip(src);
  assert.ok(!/\bexport\b/.test(out), out);
  assert.ok(out.includes('function foo() {}'));
  assert.ok(out.includes('const bar = 1;'));
});

// scanForDuplicates is the build's actual name-collision guard, run once per
// module against a Map shared across the whole build. These pin its four
// load-bearing behaviours.

test('a genuine cross-module duplicate throws and names both files', () => {
  const seen = new Map();
  scanForDuplicates('export const FOO = 1;\n', 'a.js', seen);
  assert.throws(
    () => scanForDuplicates('export function FOO() {}\n', 'b.js', seen),
    /Duplicate top-level name "FOO" in b\.js; already declared in a\.js/
  );
});

test('a column-0 destructuring declaration throws', () => {
  const seen = new Map();
  assert.throws(
    () => scanForDuplicates('export const { a, b } = obj;\n', 'weird.js', seen),
    /destructuring/i
  );
  assert.throws(
    () => scanForDuplicates('const [first] = list;\n', 'weird2.js', new Map()),
    /destructuring/i
  );
});

test('a multi-declarator statement throws, naming the file and the fix', () => {
  const seen = new Map();
  assert.throws(
    () => scanForDuplicates(
      'export const VB = { w: 480, h: 380 }, PAD = 0.12;\n', 'triangle.js', seen),
    /triangle\.js/
  );
  assert.throws(
    () => scanForDuplicates(
      'export const VB = { w: 480, h: 380 }, PAD = 0.12;\n', 'triangle.js', new Map()),
    /one name per statement/
  );
  // A single declarator whose initializer merely CONTAINS commas -- inside an
  // object literal, an array, a call's argument list, or a trailing comment --
  // must not be mistaken for a second declarator.
  assert.doesNotThrow(() =>
    scanForDuplicates('export const COLORS = { t1: \'a\', t2: \'b\' };\n', 'svg.js', new Map()));
  assert.doesNotThrow(() =>
    scanForDuplicates('export const MODULES = [\'a.js\', \'b.js\'];\n', 'build.js', new Map()));
  assert.doesNotThrow(() =>
    scanForDuplicates('export const R = Math.hypot(A, B);\n', 'scene.js', new Map()));
  assert.doesNotThrow(() =>
    scanForDuplicates(
      'export const CONTACT_D = 250;  // ball contact, measured along the ramp\n',
      'scene.js', new Map()));
});

test('an ordinary indented function-local const does NOT throw -- the column-0 ' +
     'anchoring that lets a module\'s inner name legally shadow another module\'s top-level one',
  () => {
    const seen = new Map();
    const code = [
      'export function createTriangle(svg) {',
      '  function render(s) {',
      '    const px = (x, y) => ({ x: x, y: y });',
      '    return px(1, 2);',
      '  }',
      '  return { render };',
      '}'
    ].join('\n');
    assert.doesNotThrow(() => scanForDuplicates(code, 'triangle.js', seen));
    // the indented `const px` must never have been registered as a top-level name
    assert.ok(!seen.has('px'));
  });

test('a top-level px in one module and a function-local px in another do not collide', () => {
  const seen = new Map();
  const fbdSrc = [
    'export function px(x, y) {',
    '  return { x, y };',
    '}'
  ].join('\n');
  scanForDuplicates(fbdSrc, 'fbd.js', seen);
  assert.equal(seen.get('px'), 'fbd.js');

  const triangleSrc = [
    'export function createTriangle(svg) {',
    '  function render(s) {',
    '    const px = (x, y) => ({ x: x, y: y });',
    '    return px(1, 2);',
    '  }',
    '  return { render };',
    '}'
  ].join('\n');
  assert.doesNotThrow(() =>
    scanForDuplicates(triangleSrc, 'triangle.js', seen));
});

// No committed test ever ran main() itself -- everything above exercises its
// helper functions. Build twice into scratch directories OUTSIDE the repo (main()
// takes an optional outDir for exactly this) and compare the bytes, so the
// committed dist/distributed_load_beam.html is never touched by the test suite.
test('main() builds a byte-reproducible bundle, without touching the committed dist/', () => {
  const dirA = mkdtempSync(join(tmpdir(), 'distributed-load-beam-build-a-'));
  const dirB = mkdtempSync(join(tmpdir(), 'distributed-load-beam-build-b-'));
  try {
    main(dirA);
    main(dirB);
    const a = readFileSync(join(dirA, 'distributed_load_beam.html'));
    const b = readFileSync(join(dirB, 'distributed_load_beam.html'));
    assert.ok(a.length > 1000, `built file looks too small: ${a.length} bytes`);
    assert.deepStrictEqual(a, b, 'two builds of the same source must be byte-identical');
  } finally {
    rmSync(dirA, { recursive: true, force: true });
    rmSync(dirB, { recursive: true, force: true });
  }
});

// A module that is in src/ but not in build.js's MODULES list is silently missing from the shipped
// page (its functions are undefined at run time). The list is read from the directory here, not
// from the build's own list, so a forgotten module cannot hide.
test('main() inlines every src/*.js module', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const modules = readdirSync(join(here, '..', 'src')).filter(f => f.endsWith('.js')).sort();
  assert.ok(modules.includes('svg.js'), 'the directory listing found the modules');
  const dir = mkdtempSync(join(tmpdir(), 'distributed-load-beam-build-c-'));
  try {
    main(dir);
    const html = readFileSync(join(dir, 'distributed_load_beam.html'), 'utf8');
    for (const m of modules) assert.ok(html.includes(`// ===== ${m} =====`), `${m} is missing from the built page`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The list is the single source of truth for what ships and in what order. Check it against the
// directory directly so a new src/*.js file cannot be forgotten.
test('every src/*.js file is listed in MODULES', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const files = readdirSync(join(here, '..', 'src')).filter(f => f.endsWith('.js')).sort();
  const missing = files.filter(f => !MODULES.includes(f));
  assert.deepEqual(missing, [], `src/ files missing from MODULES in build.js: ${missing.join(', ')}`);
});

// ---- main()'s refusals, against a scratch copy of the build (build.js, package.json, src/) ----
// build.js reads src/ relative to itself, so a copy can be damaged freely. Each copy is imported by
// its own path, so every one is a fresh module.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

async function inCopy(edit, check) {
  const dir = mkdtempSync(join(tmpdir(), 'distributed-load-beam-copy-'));
  try {
    for (const f of ['src', 'build.js', 'package.json']) cpSync(join(repoRoot, f), join(dir, f), { recursive: true });
    edit(dir);
    const copy = await import(pathToFileURL(join(dir, 'build.js')).href);
    const out = join(dir, 'out');
    return await check(() => copy.main(out), out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const addTo = (file, text) => (dir) => appendFileSync(join(dir, 'src', file), text);
const rewrite = (file, from, to) => (dir) => {
  const p = join(dir, 'src', file);
  const before = readFileSync(p, 'utf8');
  assert.ok(before.includes(from), `${file} lacks ${from}`);
  writeFileSync(p, before.replace(from, () => to));
};

test('main() refuses a bundle that does not parse', async () => {
  await inCopy(addTo('format.js', '\nconst BROKEN_BUNDLE = ;\n'), (run) => {
    assert.throws(run, /does not parse as JavaScript/);
  });
});

test('main() refuses a template that lost an inline marker, and writes nothing', async () => {
  for (const marker of ['<!--INLINE_CSS-->', '<!--INLINE_JS-->']) {
    await inCopy(rewrite('index.template.html', marker, ''), (run, out) => {
      assert.throws(run, /missing one of its inline markers/);
      assert.ok(!existsSync(join(out, 'distributed_load_beam.html')));
    });
  }
});

test('main() refuses an external URL, script tag or stylesheet in the page', async () => {
  await inCopy(addTo('format.js', "\nexport const SOME_REMOTE = 'https://example.com/x.js';\n"), (run) => {
    assert.throws(run, /an external URL is present/);
  });
  await inCopy(rewrite('index.template.html', '</head>', '<script src="x.js"></script></head>'), (run) => {
    assert.throws(run, /an external script tag is present/);
  });
  await inCopy(rewrite('index.template.html', '</head>', '<link rel="stylesheet" href="x.css"></head>'), (run) => {
    assert.throws(run, /an external stylesheet is present/);
  });
});

test('main() refuses a page over 250 KB', async () => {
  await inCopy(addTo('format.js', `\nexport const HUGE_TEXT = '${'x'.repeat(260_000)}';\n`), (run) => {
    assert.throws(run, /over the 250 KB budget/);
  });
});

test('main() notices an import or export line that survived strip (inside a template literal, which still parses)', async () => {
  await inCopy(addTo('format.js', '\nexport const SURVIVOR = `first\nimport nothing\nexport nothing`;\n'), (run) => {
    assert.throws(run, /an import statement survived[\s\S]*an export statement survived/);
  });
});

test('main() splices CSS and JavaScript verbatim: $& and $$ in them are not replacement patterns', async () => {
  const css = "/* dollars: $& $' $` $$ $1 */";
  await inCopy((dir) => {
    appendFileSync(join(dir, 'src', 'styles.css'), `\n${css}\n`);
    appendFileSync(join(dir, 'src', 'format.js'), `\nexport const DOLLARS = '$& $$ $1';\n`);
  }, (run, out) => {
    run();
    const html = readFileSync(join(out, 'distributed_load_beam.html'), 'utf8');
    assert.ok(html.includes(css), 'the CSS arrived unchanged');
    assert.ok(html.includes(`const DOLLARS = '$& $$ $1';`), 'the JavaScript arrived unchanged');
  });
});

test('the built page wraps every module in one strict-mode function, in MODULES order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'distributed-load-beam-build-d-'));
  try {
    main(dir);
    const html = readFileSync(join(dir, 'distributed_load_beam.html'), 'utf8');
    assert.ok(html.includes('<script>\n(function () {\n"use strict";\n'), 'opens an IIFE in strict mode');
    assert.ok(html.includes('\n})();\n</script>'), 'closes it');
    const at = MODULES.map(m => html.indexOf(`// ===== ${m} =====`));
    assert.ok(at.every(i => i > 0));
    assert.deepEqual([...at].sort((a, b) => a - b), at, 'modules appear in dependency order');
    assert.ok(html.indexOf('<style>') < html.indexOf('<script>'));
    assert.ok(!html.includes('<!--INLINE_'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scanForDuplicates: a comma inside a string, a template or a comment is not a second declarator', () => {
  for (const line of [
    "export const MSG = 'a, b';",
    'export const MSG2 = "a, b";',
    'export const MSG3 = `a, b`;',
    "export const MSG4 = 'it\\'s, fine';",
    'export const MSG5 = 1;  // one, two'
  ]) assert.doesNotThrow(() => scanForDuplicates(line + '\n', 'm.js', new Map()), line);
  // a comma between two declarators is
  assert.throws(() => scanForDuplicates('const a = 1, b = 2;\n', 'm.js', new Map()), /one name per statement/);
  // a comma inside brackets, braces or a call is not
  assert.doesNotThrow(() => scanForDuplicates('const f = g(1, 2);\n', 'm.js', new Map()));
});

test('strip: a relative import on one line, and the keywords of the declarations that follow, are handled together', () => {
  const out = strip("import { a } from './a.js';\nexport function f() {}\n  export const nope = 1;\nexport { f };\nconst keep = 2;\n");
  assert.ok(!/\bimport\b/.test(out));
  assert.ok(out.includes('function f() {}'));
  assert.ok(out.includes('const keep = 2;'));
  assert.ok(!/\bexport\b/.test(out));
  assert.ok(out.includes('  const nope = 1;'), 'an indented export keyword is stripped too');
});
