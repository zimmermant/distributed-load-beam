import { createState } from './state.js';
import { createScene } from './scene.js';

document.title = 'Distributed load on a beam';
// Temporary: Task 7 replaces this with the full app (controls, calculation, presets).
createScene(document.getElementById('fig')).render(createState().getState());
