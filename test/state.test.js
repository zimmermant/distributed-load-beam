import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, createState, derive } from '../src/state.js';
import { equivalents } from '../src/physics.js';

test('defaults equal DEFAULTS', () => {
  const st = createState();
  assert.deepEqual(st.getState(), DEFAULTS);
  assert.deepEqual(DEFAULTS, { r: 100, t: 100, peak: 'B' });
});

test('getState returns a copy; mutating it does not change the store', () => {
  const st = createState();
  st.getState().r = 5;
  assert.equal(st.getState().r, 100);
});

test('setR / setT snap through nextW', () => {
  const st = createState();
  st.setR(10);
  assert.equal(st.getState().r, 0);
  st.setR(5, true);
  assert.equal(st.getState().r, 15);
  st.setT(-8);
  assert.equal(st.getState().t, 0);
  st.setT(-5, true);
  assert.equal(st.getState().t, -15);
  st.setR(1000);
  assert.equal(st.getState().r, 200);
});

test('setR(5, true) from exactly 0 stores 15', () => {
  const st = createState();
  st.setR(0);
  assert.equal(st.getState().r, 0);
  st.setR(5, true);
  assert.equal(st.getState().r, 15);
});

test('a no-change set does not notify; a change does', () => {
  const st = createState();
  let calls = 0;
  st.subscribe(() => { calls++; });
  st.setR(100);
  st.setT(100);
  st.setPeak('B');
  st.set({ r: 100, t: 100, peak: 'B' });
  assert.equal(calls, 0);
  st.setR(50);
  assert.equal(calls, 1);
  st.setR(52);        // snaps to 50: no change
  assert.equal(calls, 1);
  st.setPeak('A');
  assert.equal(calls, 2);
});

test("setPeak('C') is ignored", () => {
  const st = createState();
  let calls = 0;
  st.subscribe(() => { calls++; });
  st.setPeak('C');
  st.setPeak(undefined);
  st.setPeak('a');
  assert.equal(st.getState().peak, 'B');
  assert.equal(calls, 0);
});

test('subscribe returns an unsubscribe', () => {
  const st = createState();
  let calls = 0;
  const off = st.subscribe(() => { calls++; });
  assert.equal(typeof off, 'function');
  st.setR(50);
  assert.equal(calls, 1);
  off();
  st.setR(60);
  assert.equal(calls, 1);
});

test('subscribers receive the new state', () => {
  const st = createState();
  let seen = null;
  st.subscribe((s) => { seen = s; });
  st.setR(50);
  assert.deepEqual(seen, { r: 50, t: 100, peak: 'B' });
});

test('set applies a snapped batch with one notification', () => {
  const st = createState();
  let calls = 0;
  st.subscribe(() => { calls++; });
  st.set({ r: -200, t: 8, peak: 'A' });
  assert.deepEqual(st.getState(), { r: -200, t: 0, peak: 'A' });
  assert.equal(calls, 1);
  st.set({ r: 33, peak: 'Z' });   // partial and invalid fields: r snaps to 35, peak ignored
  assert.deepEqual(st.getState(), { r: 35, t: 0, peak: 'A' });
  assert.equal(calls, 2);
});

test('reset restores DEFAULTS and notifies once; no-op reset does not notify', () => {
  const st = createState();
  let calls = 0;
  st.set({ r: 0, t: -50, peak: 'A' });
  st.subscribe(() => { calls++; });
  st.reset();
  assert.deepEqual(st.getState(), DEFAULTS);
  assert.equal(calls, 1);
});

test('derive(getState()) deep-equals equivalents(getState())', () => {
  const st = createState();
  assert.deepEqual(derive(st.getState()), equivalents(st.getState()));
  st.set({ r: -50, t: 120, peak: 'A' });
  assert.deepEqual(derive(st.getState()), equivalents(st.getState()));
});
