import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync, cpSync, appendFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { strip, scanForDuplicates, main, MODULES, DETAIL_MODULES, PAGES } from '../build.js';

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
test('main() builds both pages byte-reproducibly, without touching the committed dist/', () => {
  const dirA = mkdtempSync(join(tmpdir(), 'distributed-load-beam-build-a-'));
  const dirB = mkdtempSync(join(tmpdir(), 'distributed-load-beam-build-b-'));
  try {
    main(dirA);
    main(dirB);
    for (const out of ['distributed_load_beam.html', 'distributed_load_beam_detail.html']) {
      const a = readFileSync(join(dirA, out));
      const b = readFileSync(join(dirB, out));
      assert.ok(a.length > 1000, `${out} looks too small: ${a.length} bytes`);
      assert.ok(a.length < 250_000, `${out} is over the 250 KB budget: ${a.length} bytes`);
      assert.deepStrictEqual(a, b, `two builds of ${out} must be byte-identical`);
    }
  } finally {
    rmSync(dirA, { recursive: true, force: true });
    rmSync(dirB, { recursive: true, force: true });
  }
});

test('PAGES: main first, detail second, with their files, templates, stylesheets and module lists', () => {
  assert.deepEqual(PAGES.map(p => p.name), ['main', 'detail']);
  assert.deepEqual(PAGES.map(p => p.out), ['distributed_load_beam.html', 'distributed_load_beam_detail.html']);
  assert.deepEqual(PAGES.map(p => p.template), ['index.template.html', 'detail.template.html']);
  assert.deepEqual(PAGES[0].css, ['styles.css']);
  assert.deepEqual(PAGES[1].css, ['styles.css', 'detail.css']);
  assert.equal(PAGES[0].modules, MODULES);
  assert.equal(PAGES[1].modules, DETAIL_MODULES);
  assert.equal(MODULES.at(-1), 'app.js');
  assert.equal(DETAIL_MODULES.at(-1), 'detail-app.js');
  // the detail page shares everything the main page shows, in the same order, then adds its own
  assert.deepEqual(DETAIL_MODULES.slice(0, MODULES.length - 1), MODULES.slice(0, -1));
});

test('the detail page has no external URL, script tag or stylesheet', () => {
  const dir = mkdtempSync(join(tmpdir(), 'distributed-load-beam-build-e-'));
  try {
    main(dir);
    const html = readFileSync(join(dir, 'distributed_load_beam_detail.html'), 'utf8');
    assert.ok(!/https?:\/\//.test(html.split('http://www.w3.org/2000/svg').join('')), 'an external URL');
    assert.ok(!/<script[^>]+src=/.test(html), 'an external script');
    assert.ok(!/<link[^>]+href=/.test(html), 'an external stylesheet');
    assert.ok(!html.includes('<!--INLINE_'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A module that is in src/ but not in build.js's MODULES list is silently missing from the shipped
// page (its functions are undefined at run time). The list is read from the directory here, not
// from the build's own list, so a forgotten module cannot hide.
test('main() inlines every src/*.js module into the page that lists it', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const modules = readdirSync(join(here, '..', 'src')).filter(f => f.endsWith('.js')).sort();
  assert.ok(modules.includes('svg.js'), 'the directory listing found the modules');
  const dir = mkdtempSync(join(tmpdir(), 'distributed-load-beam-build-c-'));
  try {
    main(dir);
    for (const page of PAGES) {
      const html = readFileSync(join(dir, page.out), 'utf8');
      for (const m of page.modules) assert.ok(html.includes(`// ===== ${m} =====`), `${m} is missing from ${page.out}`);
      for (const m of modules.filter(f => !page.modules.includes(f))) {
        assert.ok(!html.includes(`// ===== ${m} =====`), `${m} is in ${page.out} but not in its module list`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The list is the single source of truth for what ships and in what order. Check it against the
// directory directly so a new src/*.js file cannot be forgotten.
test('every src/*.js file is listed in MODULES or DETAIL_MODULES', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const files = readdirSync(join(here, '..', 'src')).filter(f => f.endsWith('.js')).sort();
  const missing = files.filter(f => !MODULES.includes(f) && !DETAIL_MODULES.includes(f));
  assert.deepEqual(missing, [], `src/ files missing from MODULES and DETAIL_MODULES in build.js: ${missing.join(', ')}`);
  // and nothing is listed that is not there
  const gone = [...MODULES, ...DETAIL_MODULES].filter(f => !files.includes(f));
  assert.deepEqual(gone, [], `listed in build.js but not in src/: ${gone.join(', ')}`);
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
    assert.throws(run, /the main page's assembled bundle does not parse as JavaScript/);
  });
});

test('main() refuses a template that lost an inline marker, and writes nothing (either page)', async () => {
  for (const template of ['index.template.html', 'detail.template.html']) {
    for (const marker of ['<!--INLINE_CSS-->', '<!--INLINE_JS-->']) {
      await inCopy(rewrite(template, marker, ''), (run, out) => {
        assert.throws(run, new RegExp(`${template.replace('.', '\\.')} is missing one of its inline markers`));
        assert.ok(!existsSync(join(out, 'distributed_load_beam.html')), 'the main page was written');
        assert.ok(!existsSync(join(out, 'distributed_load_beam_detail.html')), 'the detail page was written');
      });
    }
  }
});

test('main() refuses a detail-page-only bundle that does not parse', async () => {
  await inCopy(addTo('detail-math.js', '\nconst BROKEN_DETAIL = ;\n'), (run, out) => {
    assert.throws(run, /the detail page's assembled bundle does not parse as JavaScript/);
    assert.ok(!existsSync(join(out, 'distributed_load_beam.html')), 'nothing is written when one page fails');
  });
});

test('main() refuses an external URL, script or stylesheet in the detail page too', async () => {
  await inCopy(addTo('detail-math.js', "\nexport const DETAIL_REMOTE = 'https://example.com/x.js';\n"), (run) => {
    assert.throws(run, /Build failed \(detail page\)[\s\S]*an external URL is present/);
  });
  await inCopy(rewrite('detail.template.html', '</head>', '<script src="x.js"></script></head>'), (run) => {
    assert.throws(run, /an external script tag is present/);
  });
  await inCopy(rewrite('detail.template.html', '</head>', '<link rel="stylesheet" href="x.css"></head>'), (run) => {
    assert.throws(run, /an external stylesheet is present/);
  });
});

test('main() refuses a detail page over 250 KB', async () => {
  await inCopy(addTo('detail.css', `\n/* ${'x'.repeat(260_000)} */\n`), (run) => {
    assert.throws(run, /over the 250 KB budget/);
  });
});

// Each page is its own scope after inlining, so the duplicate-name scan starts afresh for each page: a
// name that two pages' modules both define is fine (app.js and detail-app.js each have appStart), the
// same name twice inside one page's list is not.
test('the duplicate-name scan is per page: a name in app.js and detail-app.js is not a collision, one in two modules of one list is', async () => {
  const shared = '\nexport const SAME_NAME_TWO_PAGES = 1;\n';
  await inCopy((dir) => { addTo('app.js', shared)(dir); addTo('detail-app.js', shared)(dir); }, (run, out) => {
    assert.doesNotThrow(run);
    for (const f of ['distributed_load_beam.html', 'distributed_load_beam_detail.html']) {
      assert.ok(readFileSync(join(out, f), 'utf8').includes('const SAME_NAME_TWO_PAGES = 1;'), f);
    }
  });
  await inCopy((dir) => { addTo('detail-math.js', shared)(dir); addTo('detail-app.js', shared)(dir); }, (run) => {
    assert.throws(run, /Duplicate top-level name "SAME_NAME_TWO_PAGES" in detail-app\.js; already declared in detail-math\.js/);
  });
  await inCopy((dir) => { addTo('physics.js', shared)(dir); addTo('app.js', shared)(dir); }, (run) => {
    assert.throws(run, /Duplicate top-level name "SAME_NAME_TWO_PAGES" in app\.js; already declared in physics\.js/);
  });
});

test('main() refuses an external URL, script tag or stylesheet in the page', async () => {
  await inCopy(addTo('format.js', "\nexport const SOME_REMOTE = 'https://example.com/x.js';\n"), (run) => {
    assert.throws(run, /Build failed \(main page\)[\s\S]*an external URL is present/);
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

test('main() notices an import or export line that survived strip in the detail page too', async () => {
  await inCopy(addTo('detail-math.js', '\nexport const DETAIL_SURVIVOR = `first\nimport nothing\nexport nothing`;\n'), (run) => {
    assert.throws(run, /Build failed \(detail page\)[\s\S]*an import statement survived[\s\S]*an export statement survived/);
  });
});

test('main() splices CSS and JavaScript verbatim: $& and $$ in them are not replacement patterns', async () => {
  const css = "/* dollars: $& $' $` $$ $1 */";
  await inCopy((dir) => {
    appendFileSync(join(dir, 'src', 'styles.css'), `\n${css}\n`);
    appendFileSync(join(dir, 'src', 'detail.css'), `\n${css}\n`);
    appendFileSync(join(dir, 'src', 'format.js'), `\nexport const DOLLARS = '$& $$ $1';\n`);
  }, (run, out) => {
    run();
    for (const f of ['distributed_load_beam.html', 'distributed_load_beam_detail.html']) {
      const html = readFileSync(join(out, f), 'utf8');
      assert.ok(html.includes(css), `the CSS arrived unchanged in ${f}`);
      assert.ok(html.includes(`const DOLLARS = '$& $$ $1';`), `the JavaScript arrived unchanged in ${f}`);
    }
  });
});

test('each built page wraps every module in one strict-mode function, in its own module order, with its own stylesheets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'distributed-load-beam-build-d-'));
  try {
    main(dir);
    for (const page of PAGES) {
      const html = readFileSync(join(dir, page.out), 'utf8');
      assert.ok(html.includes('<script>\n(function () {\n"use strict";\n'), `${page.out} opens an IIFE in strict mode`);
      assert.ok(html.includes('\n})();\n</script>'), `${page.out} closes it`);
      const at = page.modules.map(m => html.indexOf(`// ===== ${m} =====`));
      assert.ok(at.every(i => i > 0), page.out);
      assert.deepEqual([...at].sort((a, b) => a - b), at, `${page.out}: modules appear in dependency order`);
      assert.ok(html.indexOf('<style>') < html.indexOf('<script>'));
      assert.ok(!html.includes('<!--INLINE_'));
    }
    const detail = readFileSync(join(dir, 'distributed_load_beam_detail.html'), 'utf8');
    const main1 = readFileSync(join(dir, 'distributed_load_beam.html'), 'utf8');
    assert.ok(detail.includes(readFileSync(join(repoRoot, 'src', 'styles.css'), 'utf8')), 'detail page carries styles.css');
    const sharedCss = readFileSync(join(repoRoot, 'src', 'styles.css'), 'utf8');
    const detailCss = readFileSync(join(repoRoot, 'src', 'detail.css'), 'utf8');
    assert.ok(detail.indexOf(sharedCss) >= 0 && detail.indexOf(detailCss) > detail.indexOf(sharedCss) + sharedCss.length - 1, 'detail.css comes after styles.css, whole');
    assert.ok(!main1.includes('#back-link'), 'the main page does not carry detail.css');
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
