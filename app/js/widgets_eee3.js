// Degree-strand simulations, part 3: reference directions and the passive sign convention, resistivity.
import { el, svgEl, mdi } from './utils.js';
import { WIDGETS as W } from './widgets.js';

function box(root, title, hint) {
  root.classList.add('widget');
  if (title) root.append(el('div', { class: 'wtitle' }, '⚡ ', el('span', { html: mdi(title) })));
  const body = el('div'); root.append(body);
  if (hint) root.append(el('div', { class: 'hint' }, hint));
  return body;
}
const btn = (label, onClick, cls = '') => el('button', { class: `wbtn ${cls}`, onClick, type: 'button' }, label);
const readout = html => el('div', { class: 'readout', html });
const slider = (min, max, step, val) => el('input', { type: 'range', min, max, step, value: val });
const fmt = (v, d = 3) => Number.isInteger(v) ? String(v) : (+v.toPrecision(d)).toString();

// ---- Reference directions & the passive sign convention ----
// One battery, one resistor. The *physics* never changes: current really flows clockwise, the resistor
// really heats. What you can change is the bookkeeping: which end of the resistor you *label* +, and
// which way you *draw* the current arrow. The readout shows what the numbers become under your labels.
W.psc = (root, p, ctx) => {
  let V = p.V ?? 12, R = p.R ?? 6, plusTop = p.plusTop ?? true, arrowCW = p.arrowCW ?? true;
  const body = box(root, 'Your labels vs the physics: the passive sign convention',
    'The circuit is fixed: the battery pushes current clockwise and the resistor gets hot. Flip the resistor\'s + label and the current arrow, and watch which numbers change sign and which do not.');
  const sV = slider(1, 24, 1, V), sR = slider(1, 100, 1, R);
  const bPlus = btn('flip the resistor\'s + label', () => { plusTop = !plusTop; render(); ctx.onChange(); });
  const bArrow = btn('flip the current arrow', () => { arrowCW = !arrowCW; render(); ctx.onChange(); });
  const svg = svgEl('svg', { viewBox: '0 0 560 250', width: 560, height: 250 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'V ', sV, ' R ', sR, bPlus, bArrow), svg, rd);
  function render() {
    const I = V / R, P = V * I;
    const v = plusTop ? V : -V;            // voltage measured from the + label to the − label
    const i = arrowCW ? I : -I;            // current measured along the drawn arrow
    const psc = (plusTop && arrowCW) || (!plusTop && !arrowCW); // arrow enters the + label?
    svg.innerHTML = '';
    const wire = (x1, y1, x2, y2) => svg.append(svgEl('line', { x1, y1, x2, y2, stroke: '#3c3c3c', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    const txt = (x, y, t, o = {}) => svg.append(svgEl('text', { x, y, 'font-size': 13, 'font-weight': 800, fill: '#3c3c3c', ...o }, t));
    // loop
    wire(110, 40, 430, 40); wire(110, 170, 430, 170);
    wire(110, 40, 110, 92); wire(110, 118, 110, 170);
    wire(430, 40, 430, 80); wire(430, 130, 430, 170);
    // battery (physical polarity: long plate = +, on top)
    wire(94, 96, 126, 96); wire(101, 114, 119, 114);
    txt(134, 100, '+', { fill: '#ea2b2b', 'font-size': 15 }); txt(134, 119, '−', { fill: '#1899d6', 'font-size': 15 });
    txt(84, 108, `${V} V`, { 'text-anchor': 'end' });
    txt(110, 196, 'battery: + fixed by chemistry', { 'text-anchor': 'middle', 'font-size': 11, fill: '#555' });
    // resistor with YOUR labels
    svg.append(svgEl('rect', { x: 415, y: 80, width: 30, height: 50, rx: 4, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 3 }));
    txt(452, plusTop ? 88 : 132, '+', { fill: '#ea2b2b', 'font-size': 16 }); txt(452, plusTop ? 132 : 88, '−', { fill: '#1899d6', 'font-size': 16 });
    txt(452, 110, `${R} Ω`);
    txt(430, 196, 'resistor: + is YOUR label', { 'text-anchor': 'middle', 'font-size': 11, fill: '#555' });
    // the real flow: dots moving clockwise along the top wire
    const n = Math.min(12, Math.max(1, Math.round(I * 3)));
    for (let k = 0; k < n; k++) svg.append(svgEl('circle', { cx: 130 + ((k + 0.5) / n) * 280, cy: 40, r: 4, fill: '#1cb0f6' }));
    txt(270, 28, `real flow: ${fmt(I)} A clockwise (physics, fixed)`, { 'text-anchor': 'middle', fill: '#1899d6', 'font-size': 12 });
    // YOUR arrow on the right-hand wire
    const ay = arrowCW ? [60, 74] : [74, 60];
    svg.append(svgEl('line', { x1: 480, y1: ay[0] + 20, x2: 480, y2: ay[1] + 20, stroke: '#ff9600', 'stroke-width': 4 }));
    svg.append(svgEl('polygon', { points: arrowCW ? '480,100 474,90 486,90' : '480,74 474,84 486,84', fill: '#ff9600' }));
    txt(490, 92, 'your arrow', { fill: '#ff9600', 'font-size': 11 });
    txt(490, 106, arrowCW ? '(down)' : '(up)', { fill: '#ff9600', 'font-size': 11 });
    // captions
    txt(270, 222, psc ? 'arrow ENTERS the + label ⇒ passive sign convention holds' : 'arrow enters the − label ⇒ NOT the passive sign convention', { 'text-anchor': 'middle', 'font-size': 12, fill: psc ? '#58a700' : '#ea2b2b' });
    txt(270, 240, `v·i = (${fmt(v)})(${fmt(i)}) = ${fmt(v * i)} W  →  power absorbed = ${psc ? 'v·i' : '−v·i'} = +${fmt(P)} W`, { 'text-anchor': 'middle', 'font-size': 12, fill: '#3c3c3c' });
    rd.innerHTML = `Under <b>your</b> labels: v (from + label to − label) = <b>${fmt(v)} V</b>, i (along your arrow) = <b>${fmt(i)} A</b>, v·i = <b>${fmt(v * i)} W</b>.<br>`
      + (psc ? `Arrow enters the + end, so v·i is the power <b>absorbed</b>: +${fmt(P)} W, the resistor heats. ✔` : `Arrow enters the − end, so v·i is the power <b>delivered</b>; the resistor absorbs −(v·i) = +${fmt(P)} W. Same physics, awkward bookkeeping.`)
      + `<br><span style="color:#777">Battery under the passive convention (arrow into its +): v = ${V} V, i = −${fmt(I)} A, v·i = −${fmt(P)} W: it <b>supplies</b> ${fmt(P)} W. Sum of absorbed powers: +${fmt(P)} − ${fmt(P)} = 0.</span>`;
  }
  sV.oninput = () => { V = +sV.value; render(); ctx.onChange(); }; sR.oninput = () => { R = +sR.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ V, R, plusTop, arrowCW, psc: (plusTop && arrowCW) || (!plusTop && !arrowCW) }), solve: () => { plusTop = true; arrowCW = true; render(); ctx.onChange(); } };
};

// ---- Resistance of a wire: R = ρL/A ----
W.wireR = (root, p, ctx) => {
  let L = p.L ?? 1, A = p.A ?? 1, mat = p.mat || 'copper';
  const RHO = { copper: 1.68e-8, aluminium: 2.65e-8, nichrome: 1.10e-6 };
  const body = box(root, 'R = ρ·L/A: a longer, thinner wire resists more', 'Drag length and cross-section area. Twice the length = twice the collisions in series; twice the area = two parallel paths.');
  const sL = slider(0.5, 10, 0.5, L), sA = slider(0.5, 5, 0.5, A);
  const ctrl = el('div', { class: 'ctrl' }, 'L ', sL, ' A ', sA);
  const mats = {};
  for (const m of Object.keys(RHO)) { mats[m] = btn(m, () => { mat = m; render(); ctx.onChange(); }); ctrl.append(mats[m]); }
  const svg = svgEl('svg', { viewBox: '0 0 520 120', width: 520, height: 120 });
  const rd = readout('');
  body.append(ctrl, svg, rd);
  function render() {
    for (const m of Object.keys(mats)) mats[m].classList.toggle('on', m === mat);
    const R = RHO[mat] * L / (A * 1e-6);
    svg.innerHTML = '';
    const w = 40 + L * 40, h = 8 + A * 10;
    svg.append(svgEl('rect', { x: 30, y: 60 - h / 2, width: w, height: h, rx: h / 2, fill: mat === 'nichrome' ? '#c9a15a' : mat === 'aluminium' ? '#b8c2cc' : '#d98c4a', stroke: '#3c3c3c', 'stroke-width': 2 }));
    svg.append(svgEl('text', { x: 30 + w / 2, y: 60 + h / 2 + 18, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: '#3c3c3c' }, `L = ${L} m`));
    svg.append(svgEl('text', { x: 30 + w + 12, y: 64, 'font-size': 12, 'font-weight': 800, fill: '#3c3c3c' }, `A = ${A} mm²`));
    rd.innerHTML = `ρ(${mat}) = ${RHO[mat].toExponential(2)} Ω·m &nbsp; R = ρL/A = <b>${R < 1 ? (R * 1000).toPrecision(3) + ' mΩ' : R.toPrecision(3) + ' Ω'}</b><br><span style="color:#777">Copper house wiring is cheap resistance; nichrome (a heater element) is ~65× worse per metre on purpose, so it gets hot.</span>`;
  }
  sL.oninput = () => { L = +sL.value; render(); ctx.onChange(); }; sA.oninput = () => { A = +sA.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ L, A, mat }), solve: () => { L = 2; A = 1; mat = 'copper'; render(); ctx.onChange(); } };
};
