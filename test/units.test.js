import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stubElement, installSvgDocument } from './stub-dom.js';
import { createScene } from '../src/scene.js';
import { calcLines } from '../src/panel.js';
import { createControls } from '../src/controls.js';
import { createState } from '../src/state.js';
import { parsePresets, describePresets } from '../src/presets.js';
import { W_MAX, W_STEP } from '../src/physics.js';
import { NUMBER, NBSP, bareNumbers, plainSpaceNumbers } from './unit-rule.js';

// The unit lint: every number the page can show is followed by its unit (N/m, N or m).
// It builds the page's text for every reachable state and fails on any bare number.

installSvgDocument();
const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(here, '..', 'src', 'index.template.html'), 'utf8');

// ---- the rule: test/unit-rule.js (NUMBER, UNIT_AFTER, bareNumbers, plainSpaceNumbers) ------------
// Allow-list, each with its reason:
//   '½'  the fraction in F = ½ × peak × L is a pure number (dimensionless), and it is not an ASCII digit
//   the user's literal echo in the link note (`r=abc (use a number of N/m)`): the user's own text, replaced by ECHO below
//   the symbol 'x̄' and the letters A, B, C carry no digits
const NON_ASCII_NUMERIC_OK = new Set(['½']);

const plain = (html) => html.replace(/<[^>]*>/g, '');

// Every string checked, and how many numbers were looked at, so the lint cannot pass by checking nothing.
const seen = { strings: 0, numbers: 0 };
const offenders = [];
const plainSpace = [];
function lint(str, where) {
  assert.equal(typeof str, 'string', where);
  seen.strings++;
  seen.numbers += (str.match(NUMBER) || []).length;
  for (const ch of str) {
    if (/\p{N}/u.test(ch) && !/[0-9]/.test(ch)) assert.ok(NON_ASCII_NUMERIC_OK.has(ch), `${where}: numeric character ${ch} is not allow-listed: "${str}"`);
  }
  for (const b of bareNumbers(str)) offenders.push(`${where}: ${b}`);
  for (const b of plainSpaceNumbers(str)) plainSpace.push(`${where}: ${b}`);
}
function verdict(source) {
  const mine = offenders.filter(o => o.startsWith(source));
  assert.deepEqual(mine.slice(0, 5), [], `${mine.length} number(s) without a unit; first ones: ${mine.slice(0, 5).join(' || ')}`);
  const plain = plainSpace.filter(o => o.startsWith(source));
  assert.deepEqual(plain.slice(0, 5), [], `${plain.length} number(s) with a plain space before the unit (must be U+00A0); first ones: ${plain.slice(0, 5).join(' || ')}`);
}

const GRID = [];
for (let v = -W_MAX; v <= W_MAX; v += W_STEP) GRID.push(v);
const STATES = [];
for (const r of GRID) for (const t of GRID) for (const peak of ['A', 'B']) STATES.push({ r, t, peak });

// ---- the rule itself, on known strings --------------------------------------------------------
test('the rule: accepts numbers with units and rejects bare numbers', () => {
  const u = (str) => str.replace(/ (?=N|m\b)/g, NBSP);       // write the examples with plain spaces, give them no-break ones
  for (const ok of ['100 N/m', '2 m', '200 N', '−190 N/m', '(−190 N)', '1.11 m', '0 N/m', '½ × 2 m', 'x = 1.00 m,', '2 m (loaded)', '100 N/m × 2 m = 200 N', '.5 m', 'r 5 N/m → 0 N/m.', 'r 1e+60 N/m → 200 N/m'])
    assert.deepEqual(bareNumbers(u(ok)), [], ok);
  for (const bad of ['100', 'F = 100 × 2 m', '2 metre', '4 metres', '1.00 x', '−200 (up)', '0', 'w = 0, so', '100 Newton', '100  N', '5 N/mm', '3 Nm', '300 / 2 m', '1e+60 → 2 m'])
    assert.ok(bareNumbers(u(bad)).length > 0, bad);
});

test('the rule: a plain space between a number and its unit is an offence, a no-break space is not', () => {
  for (const ok of [`100${NBSP}N/m`, `2${NBSP}m = 200${NBSP}N`, `(−190${NBSP}N)`, `1.11${NBSP}m`, '100N/m'])
    assert.deepEqual(plainSpaceNumbers(ok), [], ok);
  for (const bad of ['100 N/m', `2${NBSP}m = 200 N`, '(−190 N)', '1.11 m', '× 2 m'])
    assert.ok(plainSpaceNumbers(bad).length > 0, bad);
});

// ---- the figure: every text of every state ----------------------------------------------------
test('unit lint: the figure (scene.js) for every slider state', () => {
  const before = seen.numbers;
  for (const s of STATES) {
    // a fresh figure per state: what is drawn is exactly this state's text (and a render that forgot to
    // clear cannot make this loop quadratic)
    const svg = stubElement('svg');
    createScene(svg).render(s);
    for (const n of svg.children) {
      if (n.tag === 'text') lint(n.textContent, `scene ${JSON.stringify(s)}`);
    }
  }
  assert.equal(STATES.length, 81 * 81 * 2);
  assert.ok(seen.numbers - before > 13000 * 4, `only ${seen.numbers - before} numbers checked in the figure`);
  verdict('scene');
});

// ---- the calculation --------------------------------------------------------------------------
test('unit lint: the calculation (panel.js) for every slider state', () => {
  const before = seen.numbers;
  let lines = 0;
  for (const s of STATES) {
    for (const l of calcLines(s)) {
      lint(plain(l.html), `calc ${JSON.stringify(s)} ${l.key}`);
      lines++;
    }
  }
  assert.ok(lines >= 13122 * 3, `only ${lines} calculation lines`);
  assert.ok(seen.numbers - before > 13000 * 10, `only ${seen.numbers - before} numbers checked in the calculation`);
  verdict('calc');
  // the exempt fraction really is in the text (so the allow-list is exercised, not decoration)
  assert.ok(plain(calcLines(STATES[0]).map(l => l.html).join('')).includes('½'));
});

// ---- the page's static text, with the readouts filled in by controls.js ------------------------
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

test('unit lint: the template (headings, scales, buttons, notes, aria text)', () => {
  const strs = templateStrings(template);
  assert.ok(strs.length >= 8, `only ${strs.length} template strings`);
  assert.ok(strs.some(s => /−200/.test(s)) && strs.some(s => /\(L = /.test(s)) && strs.some(s => s.startsWith('attr:')), strs.join(' | '));
  for (const s of strs) lint(s, 'template');
  verdict('template');
});

function rig() {
  const mk = () => ({ ...stubElement(), classes: new Set(), classList: { toggle() {}, contains: () => false } });
  const parts = {};
  for (const k of ['rSlider', 'tSlider', 'peakA', 'peakB', 'rReadout', 'tReadout', 'rZero', 'tZero']) parts[k] = mk();
  const state = createState();
  const controls = createControls(stubElement(), state, parts);
  return { parts, state, controls };
}

test('unit lint: each slider readout with the unit that follows it on the page, and its aria-valuetext', () => {
  // The readout node holds only the number; the page prints ' N/m' right after it. Compose the sentence as the
  // template has it (the <b id="r-readout"> element's text replaced by what controls.js wrote).
  const sentence = (id) => {
    const m = template.match(new RegExp(`<b id="${id}"[^>]*>[^<]*</b>([^<]*)<`));
    assert.ok(m, `no <b id="${id}"> followed by text`);
    return m[1].replace(/&nbsp;/g, NBSP);
  };
  const afterR = sentence('r-readout'), afterT = sentence('t-readout');
  const { parts, state, controls } = rig();
  const before = seen.numbers;
  for (const v of GRID) {
    state.set({ r: v, t: v });
    controls.render(state.getState());
    lint(parts.rReadout.textContent + afterR, `controls r readout ${v}`);
    lint(parts.tReadout.textContent + afterT, `controls t readout ${v}`);
    lint(parts.rSlider.attrs['aria-valuetext'], `controls r aria-valuetext ${v}`);
    lint(parts.tSlider.attrs['aria-valuetext'], `controls t aria-valuetext ${v}`);
  }
  assert.ok(seen.numbers - before >= 81 * 4, `only ${seen.numbers - before} numbers checked in the controls`);
  verdict('controls');
});

// ---- the link note ----------------------------------------------------------------------------
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

test('unit lint: the link note (describePresets) over a table of URLs', () => {
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

test('the lint saw enough: strings and numbers floors, and no source went unchecked', () => {
  assert.ok(seen.strings > 13122 * 6 + 20, `strings checked: ${seen.strings}`);
  assert.ok(seen.numbers > 13122 * 14, `numbers checked: ${seen.numbers}`);
});
