import { createState } from './state.js';
import { createScene } from './scene.js';
import { createPanel } from './panel.js';
import { createControls } from './controls.js';
import { parsePresets, describePresets } from './presets.js';
import { DETAIL_PAGE, presetQuery } from './link.js';

// Everything is looked up by id here, once; the modules get the elements, never the document.
function appStart() {
  document.title = 'Distributed load on a beam';
  const state = createState();
  const scene = createScene(document.getElementById('fig'));
  const panel = createPanel(document.getElementById('calc'));
  const controls = createControls(document.getElementById('controls'), state, {
    rSlider: document.getElementById('r-slider'),
    tSlider: document.getElementById('t-slider'),
    peakA: document.getElementById('peak-a'),
    peakB: document.getElementById('peak-b'),
    rReadout: document.getElementById('r-readout'),
    tReadout: document.getElementById('t-readout'),
    rZero: document.getElementById('r-zero'),
    tZero: document.getElementById('t-zero')
  });

  // Presets from the link apply once, before the first render. Only the fields the link set.
  const presets = parsePresets(location.search);
  const fields = {};
  for (const k of ['r', 't', 'peak']) if (presets[k] !== undefined) fields[k] = presets[k];
  state.set(fields);
  const note = describePresets(presets);
  const link = document.getElementById('from-link');
  link.textContent = note;            // text only: the link's own text can never become markup
  link.hidden = note === '';

  // The link to the detailed page carries the sliders; it sits outside #calc, so rewriting #calc never touches it.
  const more = document.getElementById('detail-link');

  function sync() {
    const s = state.getState();
    scene.render(s);
    panel.render(s);
    controls.render(s);
    more.setAttribute('href', DETAIL_PAGE + presetQuery(s));
  }
  state.subscribe(sync);
  sync();
}

appStart();
