import { MINUS, fmt } from './format.js';

// The two pages sit side by side; each links to the other by file name, carrying the slider state.
export const MAIN_PAGE = 'distributed_load_beam.html';
export const DETAIL_PAGE = 'distributed_load_beam_detail.html';

// A slider value as it travels in a link: printed exactly as the page prints it (fmt), but with an
// ASCII hyphen-minus, which URLs and parsePresets read without help. fmt never prints -0.
function linkNumber(n) {
  return fmt(n).replace(MINUS, '-');
}

// State {r, t, peak} -> the query string parsePresets reads back: '?r=100&t=-100&peak=B'.
export function presetQuery(s) {
  return `?r=${linkNumber(s.r)}&t=${linkNumber(s.t)}&peak=${s.peak}`;
}
