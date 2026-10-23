import test from 'node:test';
import assert from 'node:assert/strict';
import { stubElement } from './stub-dom.js';

const IDS = ['fig', 'calc', 'controls', 'r-slider', 't-slider', 'peak-a', 'peak-b', 'r-readout', 't-readout', 'r-zero', 't-zero', 'from-link', 'detail-link'];
let boots = 0;

// Runs src/app.js against a stub page, as the browser does on load: the module wires everything
// and draws once. Each call imports a fresh copy (the query string defeats the module cache).
async function boot(search) {
  const els = {};
  for (const id of IDS) els[id] = stubElement(id === 'fig' ? 'svg' : 'div');
  els['from-link'].hidden = true;
  els['detail-link'] = stubElement('a');
  globalThis.document = {
    title: '',
    getElementById: (id) => { assert.ok(els[id], `app.js looked up #${id}, which the stub page lacks`); return els[id]; },
    createElementNS: (ns, name) => stubElement(name)
  };
  globalThis.location = { search };
  await import(`../src/app.js?boot=${++boots}`);
  const texts = () => els.fig.children.filter(n => n.tag === 'text').map(n => n.textContent);
  return { els, texts };
}

test('page load with no parameters: titled, drawn, defaults in the controls, link line hidden', async () => {
  const { els, texts } = await boot('');
  assert.equal(document.title, 'Distributed load on a beam');
  assert.ok(texts().includes('Rectangular: −100\u00a0N/m'));
  assert.ok(texts().includes('300\u00a0N down'));
  assert.ok(els.calc.innerHTML.includes('F = w × L = (−100\u00a0N/m) × 2\u00a0m = <b>−200\u00a0N</b>'), els.calc.innerHTML);
  assert.equal(els['r-readout'].textContent, '−100');
  assert.equal(els['t-readout'].textContent, '−100');
  assert.equal(els['peak-b'].attrs['aria-pressed'], 'true');
  assert.equal(els['peak-a'].attrs['aria-pressed'], 'false');
  assert.equal(els['from-link'].hidden, true);
  assert.equal(els['from-link'].textContent, '');
});

test('page load with parameters: applied before the first draw, described in the link line as text', async () => {
  const { els, texts } = await boot('?r=-190&t=abc&peak=A');
  assert.equal(els['r-readout'].textContent, '−190');
  assert.equal(els['t-readout'].textContent, '−100', 'a rejected parameter leaves the default');
  assert.equal(els['peak-a'].attrs['aria-pressed'], 'true');
  assert.ok(texts().includes('Rectangular: −190\u00a0N/m'));
  assert.ok(texts().includes('peak −100\u00a0N/m at A'));
  assert.ok(els.calc.innerHTML.includes('the peak is at A'));
  assert.equal(els['from-link'].hidden, false);
  assert.equal(els['from-link'].textContent, 'From the link: r = −190\u00a0N/m, peak at A. Ignored: t=abc (use a number of N/m).');
  assert.equal(els['from-link'].innerHTML, '', 'the link text is never written as markup');
});

test('page load: each parameter on its own is applied, the others keep their defaults', async () => {
  let b = await boot('?t=-150');
  assert.equal(b.els['t-readout'].textContent, '−150');
  assert.equal(b.els['r-readout'].textContent, '−100');
  assert.equal(b.els['peak-b'].attrs['aria-pressed'], 'true');
  b = await boot('?peak=A');
  assert.equal(b.els['peak-a'].attrs['aria-pressed'], 'true');
  assert.equal(b.els['r-readout'].textContent, '−100');
  b = await boot('?r=7');
  assert.equal(b.els['r-readout'].textContent, '0');
  assert.equal(b.els['from-link'].textContent, 'From the link: r = 0\u00a0N/m. Adjusted: r 7\u00a0N/m → 0\u00a0N/m.');
  b = await boot('?unknown=1');
  assert.equal(b.els['from-link'].hidden, true);
});

test('moving a slider or pressing a peak button redraws the figure, the calculation and the controls', async () => {
  const { els, texts } = await boot('');
  els['r-slider'].value = '-50';
  els['r-slider'].fire('input');
  assert.equal(els['r-readout'].textContent, '−50');
  assert.equal(els['t-readout'].textContent, '−100');
  assert.ok(texts().includes('Rectangular: −50\u00a0N/m'), texts().join('|'));
  assert.ok(els.calc.innerHTML.includes('(−50\u00a0N/m) × 2\u00a0m'), els.calc.innerHTML);
  els['t-slider'].value = '25';
  els['t-slider'].fire('input');
  assert.equal(els['t-readout'].textContent, '25');
  assert.ok(texts().includes('peak 25\u00a0N/m at B'));
  els['peak-a'].fire('click');
  assert.ok(texts().includes('peak 25\u00a0N/m at A'));
  assert.ok(els.calc.innerHTML.includes('the peak is at A'));
  assert.equal(els['peak-a'].attrs['aria-pressed'], 'true');
  assert.equal(els['peak-b'].attrs['aria-pressed'], 'false');
});

test('the detailed-calculation link carries the sliders: set at boot, and following every slider input and peak click', async () => {
  const { els } = await boot('');
  const link = els['detail-link'];
  assert.equal(link.attrs.href, 'distributed_load_beam_detail.html?r=-100&t=-100&peak=B');
  els['r-slider'].value = '-50';
  els['r-slider'].fire('input');
  assert.equal(link.attrs.href, 'distributed_load_beam_detail.html?r=-50&t=-100&peak=B');
  els['t-slider'].value = '25';
  els['t-slider'].fire('input');
  assert.equal(link.attrs.href, 'distributed_load_beam_detail.html?r=-50&t=25&peak=B');
  els['peak-a'].fire('click');
  assert.equal(link.attrs.href, 'distributed_load_beam_detail.html?r=-50&t=25&peak=A');
  assert.equal(link.textContent, '', 'the link text is never rewritten by the app');
  assert.equal(els.calc.children.includes(link), false, 'the link is not inside #calc');
});

test('the detailed-calculation link follows the link parameters at boot', async () => {
  const { els } = await boot('?r=-190&t=abc&peak=A');
  assert.equal(els['detail-link'].attrs.href, 'distributed_load_beam_detail.html?r=-190&t=-100&peak=A');
});
