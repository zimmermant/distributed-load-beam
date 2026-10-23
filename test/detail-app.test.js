import test from 'node:test';
import assert from 'node:assert/strict';
import { stubElement } from './stub-dom.js';
import { detailBlocks } from '../src/detail-math.js';
import { NBSP } from '../src/format.js';
import { MAIN_PAGE, presetQuery } from '../src/link.js';
import { describePresets, parsePresets } from '../src/presets.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const IDS = ['detail-fig', 'controls', 'r-slider', 't-slider', 'peak-a', 'peak-b', 'r-readout', 't-readout', 'r-zero', 't-zero',
  'from-link', 'back-link', 'body-rect', 'body-tri', 'body-comb'];
let boots = 0;

// The HTML a block should show: setup lines, then plug lines, then notes, each in its own div.
function expectedBody(b) {
  return [
    ...b.setup.map(l => `<div class="step setup">${l}</div>`),
    ...b.plug.map(l => `<div class="plug">${l}</div>`),
    ...b.notes.map(l => `<div class="note">${l}</div>`)
  ].join('');
}

// Runs src/detail-app.js against a stub page, as the browser does on load. Every innerHTML
// assignment to a body is recorded, so the tests can see what was written and how often.
async function boot(search) {
  const els = {};
  for (const id of IDS) els[id] = stubElement(id === 'detail-fig' ? 'svg' : 'div');
  els['from-link'].hidden = true;
  els['back-link'].attrs.href = MAIN_PAGE;
  const writes = { 'body-rect': [], 'body-tri': [], 'body-comb': [] };
  for (const id of Object.keys(writes)) {
    let html = '';
    Object.defineProperty(els[id], 'innerHTML', {
      get: () => html,
      set: (v) => { html = v; writes[id].push(v); }
    });
  }
  globalThis.document = {
    title: '',
    getElementById: (id) => { assert.ok(els[id], `detail-app.js looked up #${id}, which the stub page lacks`); return els[id]; },
    createElementNS: (ns, name) => stubElement(name)
  };
  globalThis.location = { search };
  await import(`../src/detail-app.js?boot=${++boots}`);
  // a label is one text node whose pieces (w, subscript, value) are tspan children
  const all = (n) => n.textContent + n.children.map(all).join('');
  const texts = () => els['detail-fig'].children.filter(n => n.tag === 'text').map(all);
  const bodies = () => ({ rect: els['body-rect'].innerHTML, tri: els['body-tri'].innerHTML, comb: els['body-comb'].innerHTML });
  return { els, texts, writes, bodies };
}

function assertBlocks(b, s) {
  const want = detailBlocks(s);
  assert.equal(b.els['body-rect'].innerHTML, expectedBody(want[0]));
  assert.equal(b.els['body-tri'].innerHTML, expectedBody(want[1]));
  assert.equal(b.els['body-comb'].innerHTML, expectedBody(want[2]));
  assert.equal(b.els['back-link'].attrs.href, MAIN_PAGE + presetQuery(s));
}

test('the page is titled "Distributed load on a beam: detailed calculation"', async () => {
  await boot('');
  assert.equal(document.title, 'Distributed load on a beam: detailed calculation');
});

test('page load with no parameters: defaults drawn, three blocks written, back link carries the defaults, note hidden', async () => {
  const b = await boot('');
  assertBlocks(b, { r: -100, t: -100, peak: 'B' });
  assert.equal(b.els['back-link'].attrs.href, 'distributed_load_beam.html?r=-100&t=-100&peak=B');
  assert.ok(b.texts().some(t => t.includes('100 N/m')), b.texts().join('|'));
  assert.equal(b.els['r-readout'].textContent, '−100');
  assert.equal(b.els['peak-b'].attrs['aria-pressed'], 'true');
  assert.equal(b.els['from-link'].hidden, true);
  assert.equal(b.els['from-link'].textContent, '');
});

test('page load from a link: ?r=100&t=-190&peak=B is applied before the first draw and described as text', async () => {
  const b = await boot('?r=100&t=-190&peak=B');
  const s = { r: 100, t: -190, peak: 'B' };
  assertBlocks(b, s);
  assert.equal(b.els['back-link'].attrs.href, 'distributed_load_beam.html?r=100&t=-190&peak=B');
  assert.equal(b.els['from-link'].hidden, false);
  assert.equal(b.els['from-link'].textContent, 'From the link: r = 100 N/m, t = −190 N/m, peak at B.');
  assert.equal(b.els['t-readout'].textContent, '−190');
  // the first draw already had the link's values: each body was written exactly once
  for (const id of Object.keys(b.writes)) assert.equal(b.writes[id].length, 1, `${id} written ${b.writes[id].length} times at boot`);
});

test('moving a slider or pressing a peak button redraws the figure, all three blocks and the back link', async () => {
  const b = await boot('');
  b.els['r-slider'].value = '-50';
  b.els['r-slider'].fire('input');
  assertBlocks(b, { r: -50, t: -100, peak: 'B' });
  assert.ok(b.texts().some(t => t.includes('−50 N/m')), b.texts().join('|'));
  assert.equal(b.els['back-link'].attrs.href, 'distributed_load_beam.html?r=-50&t=-100&peak=B');
  b.els['t-slider'].value = '25';
  b.els['t-slider'].fire('input');
  assertBlocks(b, { r: -50, t: 25, peak: 'B' });
  assert.ok(b.texts().some(t => t.includes(`wB = −25${NBSP}N/m`)) && b.texts().some(t => t.includes(`wA = −50${NBSP}N/m`)), `figure after the t move: ${b.texts().join('|')}`);
  assert.equal(b.els['back-link'].attrs.href, 'distributed_load_beam.html?r=-50&t=25&peak=B');
  const before = b.bodies();
  b.els['peak-a'].fire('click');
  assertBlocks(b, { r: -50, t: 25, peak: 'A' });
  assert.equal(b.els['back-link'].attrs.href, 'distributed_load_beam.html?r=-50&t=25&peak=A');
  assert.notEqual(b.bodies().rect, before.rect, 'the peak end changes the rectangle block');
  assert.notEqual(b.bodies().tri, before.tri);
  assert.notEqual(b.bodies().comb, before.comb);
  assert.equal(b.els['peak-a'].attrs['aria-pressed'], 'true');
  // peak at A swaps the heights: wA = r + t, wB = r
  assert.ok(b.texts().some(t => t.includes(`wA = −25${NBSP}N/m`)) && b.texts().some(t => t.includes(`wB = −50${NBSP}N/m`)), `figure after the peak click: ${b.texts().join('|')}`);
});

test('values from the link are applied once, at load: a later slider move is not undone by them', async () => {
  const b = await boot('?r=100&t=-190&peak=B');
  b.els['r-slider'].value = '-50';
  b.els['r-slider'].fire('input');
  assertBlocks(b, { r: -50, t: -190, peak: 'B' });
  b.els['peak-a'].fire('click');
  assertBlocks(b, { r: -50, t: -190, peak: 'A' });
});

test('a body is rewritten only when its text changed', async () => {
  const b = await boot('');
  const n = () => Object.fromEntries(Object.entries(b.writes).map(([k, v]) => [k, v.length]));
  const start = n();
  // the rectangle block depends on r and the peak only: moving t leaves it alone
  b.els['t-slider'].value = '50';
  b.els['t-slider'].fire('input');
  assert.equal(n()['body-rect'], start['body-rect'], 'the rectangle body was rewritten with identical text');
  assert.equal(n()['body-tri'], start['body-tri'] + 1);
  assert.equal(n()['body-comb'], start['body-comb'] + 1);
  // a nudge that changes nothing writes nothing at all
  const now = n();
  b.els['peak-b'].fire('click');
  assert.deepEqual(n(), now);
});

test('no innerHTML is ever assigned from link text', async () => {
  const evil = '<img src=x onerror=alert(1)>';
  const b = await boot(`?r=${encodeURIComponent(evil)}&t=${encodeURIComponent('<b>x</b>')}&peak=${encodeURIComponent('<i>')}`);
  const note = b.els['from-link'].textContent;
  assert.ok(note.includes('Ignored'), note);
  assert.equal(b.els['from-link'].innerHTML, '', 'the note is text only');
  for (const [id, list] of Object.entries(b.writes)) {
    for (const html of list) {
      assert.ok(!html.includes('onerror') && !html.includes('<img') && !html.includes('<b>x'), `${id} carries link text`);
    }
  }
  // all body markup is exactly what detailBlocks makes for the (unchanged) default state
  assertBlocks(b, { r: -100, t: -100, peak: 'B' });
  assert.equal(b.els['back-link'].attrs.href, 'distributed_load_beam.html?r=-100&t=-100&peak=B');
});

test('an off-grid link shows the same adjusted/ignored note as the main page, and the blocks follow the adjusted state', async () => {
  const search = '?r=7&t=abc&peak=c';
  const b = await boot(search);
  assert.equal(b.els['from-link'].textContent, describePresets(parsePresets(search)));
  assert.equal(b.els['from-link'].hidden, false);
  assert.ok(b.els['from-link'].textContent.includes('Adjusted: r 7 N/m'), b.els['from-link'].textContent);
  assert.ok(b.els['from-link'].textContent.includes('Ignored:'));
  assertBlocks(b, { r: 0, t: -100, peak: 'B' });
  assert.equal(b.els['back-link'].attrs.href, 'distributed_load_beam.html?r=0&t=-100&peak=B');
});

test('an unrelated parameter leaves the note hidden', async () => {
  const b = await boot('?unknown=1');
  assert.equal(b.els['from-link'].hidden, true);
});

test('detail-app.js has no placeholder export and never reads the document except by id', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'detail-app.js'), 'utf8');
  assert.ok(!/^export\s/m.test(src), 'a placeholder export is left in detail-app.js');
  assert.ok(!/querySelector|getElementsBy/.test(src));
});
