import { createState } from './state.js';
import { createControls } from './controls.js';
import { parsePresets, describePresets } from './presets.js';
import { MAIN_PAGE, presetQuery } from './link.js';
import { createDetailScene } from './detail-scene.js';
import { detailBlocks } from './detail-math.js';

// One block's HTML: the set-up lines, then the plug-in lines (highlighted), then any notes.
// Every line comes from detailBlocks, never from the link.
function detailBodyHtml(b) {
  return [
    ...b.setup.map(l => `<div class="step setup">${l}</div>`),
    ...b.plug.map(l => `<div class="plug">${l}</div>`),
    ...b.notes.map(l => `<div class="note">${l}</div>`)
  ].join('');
}

// Everything is looked up by id here, once; the modules get the elements, never the document.
function appStart() {
  document.title = 'Distributed load on a beam: detailed calculation';
  const state = createState();
  const scene = createDetailScene(document.getElementById('detail-fig'));
  const bodies = {
    rect: document.getElementById('body-rect'),
    tri: document.getElementById('body-tri'),
    comb: document.getElementById('body-comb')
  };
  const back = document.getElementById('back-link');
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

  // What each body shows now. Rewriting a body only when its text changed keeps a reader's text
  // selection and a screen reader's place while a slider moves something that body does not use.
  const shown = { rect: null, tri: null, comb: null };
  function sync() {
    const s = state.getState();
    scene.render(s);
    for (const b of detailBlocks(s)) {
      const html = detailBodyHtml(b);
      if (html !== shown[b.key]) {
        shown[b.key] = html;
        bodies[b.key].innerHTML = html;
      }
    }
    back.setAttribute('href', MAIN_PAGE + presetQuery(s));
    controls.render(s);
  }
  state.subscribe(sync);
  sync();
}

appStart();
