import test from 'node:test';
import assert from 'node:assert/strict';
import { controlsView } from '../src/controls.js';

test("controlsView({r:-190,…}) rText is '−190'", () => {
  const v = controlsView({ r: -190, t: 100, peak: 'B' });
  assert.equal(v.rText, '−190');
  assert.equal(v.tText, '100');
  assert.equal(controlsView({ r: 100, t: -15, peak: 'A' }).tText, '−15');
});

test('rZero (and tZero) are true only at 0', () => {
  assert.equal(controlsView({ r: 0, t: 5, peak: 'B' }).rZero, true);
  assert.equal(controlsView({ r: 0, t: 5, peak: 'B' }).tZero, false);
  assert.equal(controlsView({ r: 15, t: 0, peak: 'B' }).rZero, false);
  assert.equal(controlsView({ r: 15, t: 0, peak: 'B' }).tZero, true);
  assert.equal(controlsView({ r: -15, t: -0, peak: 'B' }).rZero, false);
  assert.equal(controlsView({ r: 0, t: 0, peak: 'B' }).rText, '0');
  assert.equal(controlsView({ r: -0, t: 0, peak: 'B' }).rText, '0', 'never −0');
});

test('peak A/B reflected', () => {
  assert.equal(controlsView({ r: 1, t: 1, peak: 'A' }).peak, 'A');
  assert.equal(controlsView({ r: 1, t: 1, peak: 'B' }).peak, 'B');
});

// ---- the DOM wiring, against a tiny stub DOM (no browser) --------------------------------
import { createControls } from '../src/controls.js';
import { createState } from '../src/state.js';

function stubNode() {
  const classes = new Set();
  const attrs = {};
  const listeners = {};
  return {
    value: '0', textContent: '', attrs, classes,
    classList: { toggle(c, on) { if (on) classes.add(c); else classes.delete(c); }, contains: (c) => classes.has(c) },
    setAttribute(k, v) { attrs[k] = v; },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    fire(type, e = {}) { for (const fn of listeners[type] || []) fn(e); }
  };
}

function rig() {
  const root = stubNode();
  const parts = {};
  for (const k of ['rSlider', 'tSlider', 'peakA', 'peakB', 'rReadout', 'tReadout', 'rZero', 'tZero']) parts[k] = stubNode();
  const state = createState();
  const controls = createControls(root, state, parts);
  controls.render(state.getState());
  const input = (slider, raw) => { slider.value = String(raw); slider.fire('input'); };
  return { root, parts, state, controls, input };
}

test('keyboard: a listed key marks the next input as keyboard, which jumps past the zero zone', () => {
  const { root, parts, state, input } = rig();
  state.setR(0);
  root.fire('keydown', { key: 'ArrowRight' });
  input(parts.rSlider, 5);
  assert.equal(state.getState().r, 15);
  assert.equal(parts.rSlider.value, '15', 'the thumb follows the state');
  // consumed: the next input with no key is a pointer input and snaps to 0
  state.setR(0);
  input(parts.rSlider, 5);
  assert.equal(state.getState().r, 0);
  // the t slider and a downward key
  root.fire('keydown', { key: 'ArrowLeft' });
  state.setT(0);
  input(parts.tSlider, -5);
  assert.equal(state.getState().t, -15);
  assert.equal(parts.tSlider.value, '-15');
});

test('keyboard: every listed key counts, other keys do not', () => {
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']) {
    const { root, parts, state, input } = rig();
    state.setR(0);
    root.fire('keydown', { key });
    input(parts.rSlider, 5);
    assert.equal(state.getState().r, 15, key);
  }
  for (const key of ['a', 'Enter', 'Tab', ' ', 'Shift']) {
    const { root, parts, state, input } = rig();
    state.setR(0);
    root.fire('keydown', { key });
    input(parts.rSlider, 5);
    assert.equal(state.getState().r, 0, key);
  }
});

test('keyboard flag is cleared by keyup, pointerdown, focusout and a window blur', () => {
  const ways = [
    (root) => root.fire('keyup', { key: 'ArrowRight' }),
    (root) => root.fire('pointerdown'),
    (root) => root.fire('focusout')
  ];
  for (const clear of ways) {
    const { root, parts, state, input } = rig();
    state.setR(0);
    root.fire('keydown', { key: 'ArrowRight' });
    clear(root);
    input(parts.rSlider, 5);
    assert.equal(state.getState().r, 0);
  }
  const winListeners = {};
  globalThis.window = { addEventListener: (t, fn) => { (winListeners[t] ||= []).push(fn); } };
  try {
    const { root, parts, state, input } = rig();
    state.setR(0);
    root.fire('keydown', { key: 'ArrowRight' });
    for (const fn of winListeners.blur) fn();
    input(parts.rSlider, 5);
    assert.equal(state.getState().r, 0, 'window blur clears the flag');
  } finally {
    delete globalThis.window;
  }
});

test('the thumb is put back when the state did not change (a drag inside the zero zone)', () => {
  const { parts, state, input } = rig();
  state.setR(0);
  input(parts.rSlider, 7);
  assert.equal(state.getState().r, 0);
  assert.equal(parts.rSlider.value, '0');
  input(parts.rSlider, 107);
  assert.equal(parts.rSlider.value, '105');
  assert.equal(state.getState().r, 105);
});

test('render: readouts, aria-valuetext, and the zero label class "on"', () => {
  const { parts, state, controls } = rig();
  assert.equal(parts.rReadout.textContent, '100');
  assert.equal(parts.rZero.classes.has('on'), false);
  state.setR(-190);
  controls.render(state.getState());
  assert.equal(parts.rReadout.textContent, '−190');
  assert.equal(parts.rSlider.value, '-190');
  assert.equal(parts.rSlider.attrs['aria-valuetext'], '−190 N/m');
  state.setR(0);
  state.setT(100);
  controls.render(state.getState());
  assert.equal(parts.rZero.classes.has('on'), true);
  assert.equal(parts.tZero.classes.has('on'), false, 'the t label is independent');
  state.setT(0);
  controls.render(state.getState());
  assert.equal(parts.tZero.classes.has('on'), true);
  state.setR(15);
  controls.render(state.getState());
  assert.equal(parts.rZero.classes.has('on'), false);
});

test('peak buttons: click sets the state; aria-pressed and sel follow it', () => {
  const { parts, state, controls } = rig();
  assert.equal(parts.peakB.attrs['aria-pressed'], 'true');
  assert.equal(parts.peakB.classes.has('sel'), true);
  assert.equal(parts.peakA.attrs['aria-pressed'], 'false');
  assert.equal(parts.peakA.classes.has('sel'), false);
  parts.peakA.fire('click');
  assert.equal(state.getState().peak, 'A');
  controls.render(state.getState());
  assert.equal(parts.peakA.attrs['aria-pressed'], 'true');
  assert.equal(parts.peakA.classes.has('sel'), true);
  assert.equal(parts.peakB.attrs['aria-pressed'], 'false');
  assert.equal(parts.peakB.classes.has('sel'), false);
  parts.peakB.fire('click');
  assert.equal(state.getState().peak, 'B');
});
