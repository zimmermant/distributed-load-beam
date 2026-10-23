import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stubElement, installSvgDocument } from './stub-dom.js';
import { createDetailScene } from '../src/detail-scene.js';
import { detailBlocks, detailPlain } from '../src/detail-math.js';
import { parsePresets, describePresets } from '../src/presets.js';
import { MAIN_PAGE, presetQuery } from '../src/link.js';
import { W_MAX, W_STEP } from '../src/physics.js';
import { NUMBER, NBSP, bareNumbers, plainSpaceNumbers } from './unit-rule.js';

// The unit and digit lint for the second page (the detailed calculation): every number the page can show is
// followed by its unit (N/m, N or m) after a no-break space, and no set-up line holds a digit. The rule itself
// is test/unit-rule.js, shared unchanged with the main page's lint (test/units.test.js).

installSvgDocument();
const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(here, '..', 'src', 'detail.template.html'), 'utf8');

// Allow-list, each with its reason:
//   '½' '⅓' '⅔'  fractions of L in the formulas: pure numbers, and not ASCII digits
//   the user's literal echo in a link note (`r=abc (use a number of N/m)`): theirs, replaced by ECHO below
const NON_ASCII_NUMERIC_OK = new Set(['½', '⅓', '⅔']);

// Every string checked, and how many numbers were looked at, so the lint cannot pass by checking nothing.
const seen = { strings: 0, numbers: 0, minuses: 0 };
const offenders = [];
const plainSpace = [];
const hyphens = [];      // an ASCII hyphen-minus directly before a digit in visible text (the true minus U+2212 is required)
const wording = [];      // 'N per m' or 'N⋅m' (the dot operator, not the middle dot): the units on this page read N, N/m, m and N·m only
const WORDING = /\bN per m\b|N⋅m/;
function lint(str, where) {
  assert.equal(typeof str, 'string', where);
  seen.strings++;
  seen.numbers += (str.match(NUMBER) || []).length;
  for (const ch of str) {
    if (/\p{N}/u.test(ch) && !/[0-9]/.test(ch)) assert.ok(NON_ASCII_NUMERIC_OK.has(ch), `${where}: numeric character ${ch} is not allow-listed: "${str}"`);
  }
  for (const b of bareNumbers(str)) offenders.push(`${where}: ${b}`);
  for (const b of plainSpaceNumbers(str)) plainSpace.push(`${where}: ${b}`);
  seen.minuses += (str.match(/−(?=[0-9])/g) || []).length;
  for (const m of str.matchAll(/-(?=[0-9])/g)) hyphens.push(`${where}: ASCII hyphen-minus before a digit at ${m.index} in "${str}"`);
  if (WORDING.test(str)) wording.push(`${where}: unit wording in "${str}"`);
}
function verdict(source) {
  const mine = offenders.filter(o => o.startsWith(source));
  assert.deepEqual(mine.slice(0, 5), [], `${mine.length} number(s) without a unit; first ones: ${mine.slice(0, 5).join(' || ')}`);
  const plain = plainSpace.filter(o => o.startsWith(source));
  assert.deepEqual(plain.slice(0, 5), [], `${plain.length} number(s) with a plain space before the unit (must be U+00A0); first ones: ${plain.slice(0, 5).join(' || ')}`);
  const hy = hyphens.filter(o => o.startsWith(source));
  assert.deepEqual(hy.slice(0, 5), [], `${hy.length} ASCII hyphen-minus before a digit (U+2212 required); first ones: ${hy.slice(0, 5).join(' || ')}`);
  const wd = wording.filter(o => o.startsWith(source));
  assert.deepEqual(wd.slice(0, 5), [], `${wd.length} line(s) with 'N per m' or 'N·m' (units read N, N/m, m only); first ones: ${wd.slice(0, 5).join(' || ')}`);
}

const GRID = [];
for (let v = -W_MAX; v <= W_MAX; v += W_STEP) GRID.push(v);
const STATES = [];
for (const r of GRID) for (const t of GRID) for (const peak of ['A', 'B']) STATES.push({ r, t, peak });

// ---- the rule itself, on known strings ----------------------------------------------------------
test('the rule: "F = 200" is rejected, "F = 200 N" with a no-break space is accepted, with a plain space it is rejected', () => {
  assert.ok(bareNumbers('F = 200').length > 0, 'a number with no unit must be an offence');
  assert.deepEqual(bareNumbers(`F = 200${NBSP}N`), []);
  assert.deepEqual(plainSpaceNumbers(`F = 200${NBSP}N`), []);
  assert.deepEqual(bareNumbers('F = 200 N'), [], 'a plain space still counts as a unit for the bare-number rule');
  assert.ok(plainSpaceNumbers('F = 200 N').length > 0, 'a plain space before the unit must be an offence');
  // and the page-level helper really reports them
  const before = { o: offenders.length, p: plainSpace.length, h: hyphens.length, w: wording.length, m: seen.minuses };
  lint('F = 200', 'selfcheck');
  lint('F = 200 N', 'selfcheck');
  assert.equal(offenders.length - before.o, 1);
  assert.equal(plainSpace.length - before.p, 1);
  // the hyphen and wording rules: each offence is reported once, the true minus and the allowed units are not
  lint(`F = -200${NBSP}N`, 'selfcheck');
  assert.equal(hyphens.length - before.h, 1, 'an ASCII hyphen-minus before a digit must be an offence');
  lint(`F = −200${NBSP}N, w = (−5${NBSP}N/m), L = 2${NBSP}m, a-b, F_x - 1`, 'selfcheck');
  assert.equal(hyphens.length - before.h, 1, 'a true minus, a hyphen between letters and a spaced dash are fine');
  assert.equal(seen.minuses - before.m, 2);
  lint(`a moment of 5${NBSP}N⋅m`, 'selfcheck');
  lint(`a load of 5${NBSP}N per m`, 'selfcheck');
  assert.equal(wording.length - before.w, 2, "'N⋅m' (the dot operator) and 'N per m' must each be an offence");
  lint(`a moment of −5${NBSP}N·m (clockwise)`, 'selfcheck');
  assert.equal(wording.length - before.w, 2, "'N·m' with the middle dot is the moment's unit, not an offence");
  lint(`a load of 5${NBSP}N/m over 2${NBSP}m, 3${NBSP}N · 2${NBSP}m`, 'selfcheck');
  assert.equal(wording.length - before.w, 2, 'N/m and the spaced product dot are fine');
  offenders.length = before.o;
  plainSpace.length = before.p;
  hyphens.length = before.h;
  wording.length = before.w;
  seen.minuses = before.m;
});

// ---- the figure: every text of every state ------------------------------------------------------
// a text node's full text: its own text plus its tspans' (what the DOM's textContent gives)
const full = (n) => n.textContent + n.children.map(full).join('');

test('unit lint: the figure (detail-scene.js) for every slider state: the A B C marks, the two labels and the caption', () => {
  const before = seen.numbers;
  let texts = 0;
  for (const s of STATES) {
    const svg = stubElement('svg');
    createDetailScene(svg).render(s);
    const strs = svg.children.filter(n => n.tag === 'text').map(full);
    assert.equal(strs.length, 6, `${JSON.stringify(s)}: ${strs.length} text nodes`);   // A, B, C, w_A, w_B, caption
    for (const str of strs) lint(str, `figure ${JSON.stringify(s)}`);
    texts += strs.length;
  }
  assert.equal(STATES.length, 81 * 81 * 2);
  assert.equal(texts, 13122 * 6);
  assert.equal(seen.numbers - before, 13122 * 3, `numbers checked in the figure: ${seen.numbers - before}`);   // one in each of the three labelled texts
  verdict('figure');
});

// ---- the calculation: every line of every state -------------------------------------------------
test('unit lint: every set-up, plug-in and note line of the three blocks, for every slider state', () => {
  const before = seen.numbers;
  let lines = 0;
  for (const s of STATES) {
    const blocks = detailBlocks(s);
    assert.equal(blocks.length, 3);
    for (const b of blocks) {
      for (const [kind, list] of [['setup', b.setup], ['plug', b.plug], ['note', b.notes]]) {
        list.forEach((l, i) => { lint(detailPlain(l), `calc ${JSON.stringify(s)} ${b.key} ${kind} ${i}`); lines++; });
      }
    }
  }
  // per state: 3 + 3 + 5 set-up lines and 3 + 4 + 2 plug lines, so at least 20 (notes only add): a floor, not an exact count
  assert.ok(lines >= 13122 * 20, `only ${lines} calculation lines`);
  assert.ok(seen.numbers - before > 13122 * 20, `only ${seen.numbers - before} numbers checked in the calculation`);
  verdict('calc');
  // the exempt fractions really are in the text (so the allow-list is exercised, not decoration)
  const all = (peak) => detailBlocks({ r: 100, t: 100, peak }).flatMap(b => [...b.setup, ...b.plug, ...b.notes]).map(detailPlain).join('\n');
  assert.ok(all('B').includes('½') && all('B').includes('⅔') && all('A').includes('⅓'));
});

// ---- the set-up lines: no digit, and a variable in each -----------------------------------------
// detailPlain writes a subscript as _x, so F with the subscript rect reads F_rect.
const SETUP_NAMES = [
  /F_rect(?![A-Za-z])/, /F_tri(?![A-Za-z])/, /F_equiv(?![A-Za-z])/,
  /r_rect(?![A-Za-z])/, /r_tri(?![A-Za-z])/, /r_equiv(?![A-Za-z])/,
  /w_A(?![A-Za-z])/, /w_B(?![A-Za-z])/, /w_rect(?![A-Za-z])/, /w_tri(?![A-Za-z])/,
  /(?<![A-Za-z_])L(?![A-Za-z_])/, /(?<![A-Za-z_])M(?:_(?:rect|tri|equiv|net))?(?![A-Za-z])/
];
const hasVariable = (line) => SETUP_NAMES.some(re => re.test(line));

test('every set-up line has no ASCII digit and names at least one variable (F_rect, ..., w_B, L, M, M_net)', () => {
  let lines = 0;
  const digit = [], bare = [];
  for (const s of STATES) {
    for (const b of detailBlocks(s)) {
      for (const l of b.setup) {
        const p = detailPlain(l);
        lines++;
        if (/[0-9]/.test(p)) digit.push(`${b.key} ${JSON.stringify(s)}: ${p}`);
        if (!hasVariable(p)) bare.push(`${b.key}: ${p}`);
      }
    }
  }
  assert.deepEqual(digit.slice(0, 3), [], `${digit.length} set-up line(s) hold a digit`);
  assert.deepEqual([...new Set(bare)].slice(0, 3), [], `${bare.length} set-up line(s) name no variable`);
  assert.ok(lines >= 13122 * 11, `only ${lines} set-up lines`);
  // the variable matcher itself: it accepts a plain-text variable and rejects a sentence without one
  assert.ok(hasVariable('F_rect = w_rect · L') && hasVariable('M_equiv = M_rect + M_tri') && hasVariable('a force F at a distance r gives a moment M'));
  assert.ok(!hasVariable('It acts at the centre of the rectangle, measured from A') && !hasVariable('F_x = 2'));
});

// ---- the link note ------------------------------------------------------------------------------
const URLS = [
  '', '?r=100&t=100&peak=B', '?r=500&t=3', '?r=500&t=-500', '?r=7&t=-47&peak=a', '?r=0&t=5', '?t=−190&r=−200',
  '?r=-0', '?r=.5&t=1.', '?r=+5&t=-.5', '?r=1e3&t=abc', '?r=12abc', '?peak=c', '?peak=7', '?r=x&t=y&peak=z',
  '?r=' + '9'.repeat(60), '?t=' + 'a1'.repeat(40), '?r=' + '%F0%9F%98%80'.repeat(45), '?r=100.0001&t=-3', '?r=205&t=-14.9&peak=A',
  '?r=500&t=500&peak=A', '?r=-500&t=3.7', '?foo=1&bar=2', '?r=0x10&t=1,5', '?r=1%202&t=5'
];

function stripEcho(p, text) {
  // The user's literal text after '=' in each ignored entry is theirs; the rest of the note is ours.
  let out = text;
  for (const entry of p.ignored) {
    const kept = entry.replace(/=.*(?= \([^()]*\)$)/s, '=ECHO');
    assert.ok(out.includes(entry), `the note lacks its ignored entry "${entry}"`);
    out = out.replace(entry, kept);
  }
  return out;
}

test('unit lint: the link note (describePresets) over a table of URLs, echo of a rejected value excepted', () => {
  const before = seen.numbers;
  let withAdjusted = 0, withIgnored = 0;
  for (const search of URLS) {
    const p = parsePresets(search);
    const note = describePresets(p);
    if (p.adjusted.length) withAdjusted++;
    if (p.ignored.length) withIgnored++;
    lint(stripEcho(p, note), `link ${search.length > 60 ? search.slice(0, 30) + '...' : search}`);
  }
  assert.ok(withAdjusted >= 6 && withIgnored >= 7, `table too thin: ${withAdjusted} adjusted, ${withIgnored} ignored`);
  assert.ok(seen.numbers - before >= 30, `only ${seen.numbers - before} numbers checked in the link notes`);
  verdict('link');
});

// ---- the page's static text and aria/title text -------------------------------------------------
// Visible text of the template: tags dropped, plus the attributes a reader or a screen reader gets.
function templateStrings(html) {
  const body = html.replace(/<!--[\s\S]*?-->/g, '').replace(/&nbsp;/g, NBSP);   // the browser reads the entity as U+00A0
  const out = [];
  for (const m of body.matchAll(/\b(?:aria-label|aria-valuetext|title|alt|placeholder)="([^"]*)"/g)) out.push(`attr: ${m[1]}`);
  for (const m of body.matchAll(/<title>([^<]*)<\/title>/g)) out.push(`title: ${m[1]}`);
  const visible = body.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<svg\b[\s\S]*?<\/svg>/g, ' ');
  // one string per element's text run, so a unit in the next element is not credited to a number before it
  for (const run of visible.replace(/<\/?(?:b|label)\b[^>]*>/g, '').split(/<[^>]*>/)) {
    const t = run.replace(/[ \t\r\n]+/g, ' ').trim();   // not \s: that would swallow the no-break spaces
    if (t) out.push(`text: ${t}`);
  }
  return out;
}

test('unit lint: the template (headings, scales, buttons, aria text, back link)', () => {
  const strs = templateStrings(template);
  assert.ok(strs.length >= 15, `only ${strs.length} template strings`);
  assert.ok(strs.some(s => /−200/.test(s)) && strs.some(s => s.startsWith('attr:')) && strs.includes('text: Back to the simulation')
    && strs.some(s => s.startsWith('title:')), strs.join(' | '));
  for (const s of strs) lint(s, 'template');
  verdict('template');
});

// ---- the back link and the document title -------------------------------------------------------
// The href is a URL, not text a reader sees: its digits are the slider values, so the unit rule does not apply to
// it; instead it must have exactly the form parsePresets reads (ASCII hyphen-minus, whole numbers, A or B), which
// is what the lint below pins for every state. The title and the link's visible text are linted as text.
const HREF_FORM = /^distributed_load_beam\.html\?r=-?\d+&t=-?\d+&peak=[AB]$/;

test('unit lint: the back link href has the one URL form for every state, and its text and the page title are text without numbers', async () => {
  for (const s of STATES) {
    const href = MAIN_PAGE + presetQuery(s);
    assert.ok(HREF_FORM.test(href), href);
    assert.ok(!/[−  ]/.test(href), `${JSON.stringify(s)}: a minus sign or a space in ${href}`);
  }
  // boot the page as the browser does, with and without a link, and lint what it writes
  const saved = { document: globalThis.document, location: globalThis.location };
  try {
    for (const [i, search] of ['', '?r=205&t=-14.9&peak=A', '?r=abc&t=7&peak=z'].entries()) {
      const els = {};
      for (const id of ['detail-fig', 'controls', 'r-slider', 't-slider', 'peak-a', 'peak-b', 'r-readout', 't-readout', 'r-zero', 't-zero',
        'from-link', 'back-link', 'body-rect', 'body-tri', 'body-comb']) els[id] = stubElement(id === 'detail-fig' ? 'svg' : 'div');
      els['back-link'].attrs.href = MAIN_PAGE;
      globalThis.document = { title: '', getElementById: (id) => { assert.ok(els[id], `#${id}`); return els[id]; }, createElementNS: (ns, name) => stubElement(name) };
      globalThis.location = { search };
      await import(`../src/detail-app.js?units=${i}`);
      assert.equal(document.title, 'Distributed load on a beam: detailed calculation');
      lint(document.title, 'backlink page title');
      const href = els['back-link'].attrs.href;
      assert.ok(HREF_FORM.test(href), href);
      // what the page wrote into its blocks, as text
      for (const id of ['body-rect', 'body-tri', 'body-comb']) {
        for (const m of els[id].innerHTML.matchAll(/<div class="[^"]*">(.*?)<\/div>/g)) lint(detailPlain(m[1]), `backlink boot ${i} ${id}`);
      }
      const p = parsePresets(search);
      if (p.ignored.length || p.adjusted.length || p.r !== undefined) lint(stripEcho(p, els['from-link'].textContent), `backlink boot ${i} note`);
    }
  } finally {
    globalThis.document = saved.document;
    globalThis.location = saved.location;
  }
  verdict('backlink');
});

test('the lint saw enough: strings and numbers floors', () => {
  assert.ok(seen.strings > 13122 * 20, `strings checked: ${seen.strings}`);
  assert.ok(seen.numbers > 13122 * 25, `numbers checked: ${seen.numbers}`);
  // the hyphen rule saw plenty of true minus signs to compare against (so it was not checking text without negatives)
  assert.ok(seen.minuses > 13122 * 5, `true minus signs seen: ${seen.minuses}`);
  assert.deepEqual([hyphens.length, wording.length], [0, 0]);
});
