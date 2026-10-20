import { fmt } from './format.js';

// Pure: what the controls show for state s.
export function controlsView(s) {
  return { rText: fmt(s.r), tText: fmt(s.t), rZero: s.r === 0, tZero: s.t === 0, peak: s.peak };
}

// Keys that move a range input; a pointer drag is everything else.
const CONTROLS_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];

function controlsSetText(node, str) {
  if (node.textContent !== str) node.textContent = str;
}

// root: the controls container (holds the two zero labels, class zero-label, r then t).
// parts: { rSlider, tSlider, peakA, peakB, rReadout, tReadout } -- the page's elements.
// Binds the sliders and the peak buttons to state; render(s) shows state s in them.
export function createControls(root, state, parts) {
  const { rSlider, tSlider, peakA, peakB, rReadout, tReadout } = parts;
  const zeroLabels = root.getElementsByClassName('zero-label');
  let viaKeyboard = false;

  function showSlider(slider, readout, zeroLabel, text, value, zero) {
    // Move the thumb when the state's value differs from it: a snap, or the keyboard's jump past the zero zone.
    if (Number(slider.value) !== value) slider.value = String(value);
    slider.setAttribute('aria-valuetext', `${text} N/m`);
    controlsSetText(readout, text);
    if (zeroLabel) zeroLabel.classList.toggle('on', zero);
  }

  function showPeak(button, on) {
    button.classList.toggle('sel', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function render(s) {
    const v = controlsView(s);
    showSlider(rSlider, rReadout, zeroLabels[0], v.rText, s.r, v.rZero);
    showSlider(tSlider, tReadout, zeroLabels[1], v.tText, s.t, v.tZero);
    showPeak(peakA, v.peak === 'A');
    showPeak(peakB, v.peak === 'B');
  }

  // A key marks the NEXT input event as a keyboard one; that event clears the mark. A key that
  // changes nothing (a slider already at its end) fires no input, so a key release and a
  // pointer press clear it too, or the next drag would be taken for a key press.
  root.addEventListener('keydown', (e) => { if (CONTROLS_KEYS.includes(e.key)) viaKeyboard = true; });
  root.addEventListener('keyup', () => { viaKeyboard = false; });
  root.addEventListener('pointerdown', () => { viaKeyboard = false; });

  function onInput(set) {
    const kb = viaKeyboard;
    viaKeyboard = false;
    set(kb);
    render(state.getState());   // the state may not have changed (a snap back to 0): still put the thumb right
  }
  rSlider.addEventListener('input', () => onInput((kb) => state.setR(Number(rSlider.value), kb)));
  tSlider.addEventListener('input', () => onInput((kb) => state.setT(Number(tSlider.value), kb)));
  peakA.addEventListener('click', () => state.setPeak('A'));
  peakB.addEventListener('click', () => state.setPeak('B'));

  return { render };
}
