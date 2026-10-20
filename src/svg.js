export const NS = 'http://www.w3.org/2000/svg';

// One palette for the whole app. It lives here rather than in each renderer
// because build.js concatenates every module into a single scope, so a
// top-level `const C1` in three files would collide and fail the build.
export const COLORS = {
  rect:    '#2b6cb0',   // the rectangular load and its equivalent force
  tri:     '#c05621',   // the triangular load and its equivalent force
  comb:    '#2f855a',   // the combined equivalent force
  ink:     '#111827',   // text and outlines
  beam:    '#8a94a6',   // the beam
  wall:    '#cbd5e0',   // the wall and its hatching
  outline: '#4a5568'    // beam outline
};

export function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, name);
  for (const k in attrs) {
    const v = attrs[k];
    if (v !== null && v !== undefined) node.setAttribute(k, String(v));
  }
  if (parent) parent.appendChild(node);
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// Text with a background-coloured halo so labels stay readable where they cross lines.
export function text(parent, x, y, str, opts = {}) {
  const node = el('text', {
    x, y,
    'font-size': opts.size || 16,
    'font-family': 'system-ui, -apple-system, sans-serif',
    'font-style': opts.italic ? 'italic' : null,
    fill: opts.fill || COLORS.ink,
    'text-anchor': opts.anchor || 'start',
    'font-weight': opts.weight || 400,
    'paint-order': 'stroke',
    stroke: '#ffffff',
    'stroke-width': opts.halo === false ? 0 : 3.5,
    'stroke-linejoin': 'round'
  }, parent);
  node.textContent = str;
  return node;
}
