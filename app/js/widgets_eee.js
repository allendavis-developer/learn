// Degree-strand simulations (circuits, calculus, signals, power) registered into WIDGETS.
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

// ---- Ohm's law ----
W.ohm = (root, p, ctx) => {
  let V = p.V ?? 12, R = p.R ?? 6;
  const body = box(root, "Ohm's law: V = I × R", 'Drag voltage and resistance. Current is what flows; power is heat produced per second.');
  const sV = slider(0, 24, 1, V), sR = slider(1, 100, 1, R);
  const svg = svgEl('svg', { viewBox: '0 0 520 210', width: 520, height: 210 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'V ', sV, ' R ', sR), svg, rd);
  function render() {
    const I = V / R, P = V * I;
    svg.innerHTML = '';
    const wire = (x1, y1, x2, y2) => svg.append(svgEl('line', { x1, y1, x2, y2, stroke: '#3c3c3c', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    const txt = (x, y, t, o = {}) => svg.append(svgEl('text', { x, y, 'font-size': 13, 'font-weight': 800, fill: '#3c3c3c', ...o }, t));
    // loop: left wire has the battery, right wire has the resistor
    wire(110, 40, 410, 40); wire(110, 160, 410, 160);
    wire(110, 40, 110, 88); wire(110, 112, 110, 160);
    wire(410, 40, 410, 78); wire(410, 122, 410, 160);
    // battery: long plate = +, short plate = −
    wire(94, 92, 126, 92); wire(101, 108, 119, 108);
    txt(134, 96, '+', { fill: '#ea2b2b', 'font-size': 15 }); txt(134, 113, '−', { fill: '#1899d6', 'font-size': 15 });
    txt(84, 104, `${V} V`, { 'text-anchor': 'end' });
    // resistor with its own + (where current enters) and −
    svg.append(svgEl('rect', { x: 395, y: 78, width: 30, height: 44, rx: 4, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 3 }));
    txt(432, 84, '+', { fill: '#ea2b2b', 'font-size': 15 }); txt(432, 124, '−', { fill: '#1899d6', 'font-size': 15 });
    txt(432, 104, `${R} Ω`);
    // current: leaves the battery's + terminal, flows clockwise, enters the resistor's + terminal
    const n = Math.min(12, Math.max(1, Math.round(I * 3)));
    for (let i = 0; i < n; i++) svg.append(svgEl('circle', { cx: 130 + ((i + 0.5) / n) * 260, cy: 40, r: 4, fill: '#1cb0f6' }));
    txt(260, 28, `I = ${fmt(I)} A  →  (clockwise)`, { 'text-anchor': 'middle', fill: '#1899d6', 'font-size': 12 });
    svg.append(svgEl('polygon', { points: '410,66 404,56 416,56', fill: '#1cb0f6' }));
    svg.append(svgEl('polygon', { points: '110,134 104,124 116,124', fill: '#1cb0f6', transform: 'rotate(180 110 129)' }));
    txt(260, 150, `P = ${fmt(P)} W turned into heat in R`, { 'text-anchor': 'middle', fill: '#ea2b2b', 'font-size': 12 });
    // passive sign convention captions, one under each component, no overlap
    txt(120, 184, 'battery: current LEAVES its +', { 'text-anchor': 'middle', 'font-size': 11, fill: '#555' });
    txt(120, 200, `P = V·I = −${fmt(P)} W (supplies)`, { 'text-anchor': 'middle', 'font-size': 11, fill: '#1899d6' });
    txt(400, 184, 'resistor: current ENTERS its +', { 'text-anchor': 'middle', 'font-size': 11, fill: '#555' });
    txt(400, 200, `P = V·I = +${fmt(P)} W (absorbs)`, { 'text-anchor': 'middle', 'font-size': 11, fill: '#ea2b2b' });
    rd.innerHTML = `I = V/R = ${V}/${R} = <b>${fmt(I)} A</b> &nbsp; P = V×I = ${V}×${fmt(I)} = <b>${fmt(P)} W</b> (also V²/R = I²R)<br><span style="color:#777">Passive sign convention: current enters the resistor at its + terminal, so P = VI is positive = absorbing energy.</span>`;
  }
  sV.oninput = () => { V = +sV.value; render(); ctx.onChange(); }; sR.oninput = () => { R = +sR.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ V, R }) };
};

// ---- Voltage divider with load (Thévenin) ----
W.divider = (root, p, ctx) => {
  let Vs = p.Vs ?? 10, R1 = p.R1 ?? 1000, R2 = p.R2 ?? 1000, RL = p.RL ?? 1000, loaded = false;
  const body = box(root, 'Voltage divider, then connect a load', 'The unloaded output is a promise the divider cannot keep once current is drawn. Thévenin: Vth = open-circuit voltage, Rth = R1 ∥ R2.');
  const s1 = slider(100, 5000, 100, R1), s2 = slider(100, 5000, 100, R2), sL = slider(100, 10000, 100, RL);
  const svg = svgEl('svg', { viewBox: '0 0 420 170', width: 420, height: 170 });
  const rd = readout(''); const ctrl = el('div', { class: 'ctrl' });
  body.append(el('div', { class: 'ctrl' }, 'R1 ', s1, ' R2 ', s2, ' RL ', sL), ctrl, svg, rd);
  function render() {
    const Vopen = Vs * R2 / (R1 + R2), Rth = R1 * R2 / (R1 + R2), Vload = Vopen * RL / (Rth + RL);
    svg.innerHTML = '';
    svg.append(svgEl('text', { x: 10, y: 90, 'font-size': 13, 'font-weight': 800 }, `${Vs}V`));
    svg.append(svgEl('line', { x1: 50, y1: 20, x2: 50, y2: 150, stroke: '#3c3c3c', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 50, y1: 20, x2: 200, y2: 20, stroke: '#3c3c3c', 'stroke-width': 3 }));
    svg.append(svgEl('rect', { x: 185, y: 30, width: 30, height: 40, fill: '#ddf4ff', stroke: '#1899d6', 'stroke-width': 3 }));
    svg.append(svgEl('text', { x: 225, y: 55, 'font-size': 12, 'font-weight': 800 }, `R1=${R1}Ω`));
    svg.append(svgEl('line', { x1: 200, y1: 70, x2: 200, y2: 100, stroke: '#3c3c3c', 'stroke-width': 3 }));
    svg.append(svgEl('circle', { cx: 200, cy: 85, r: 5, fill: '#ffc800' }));
    svg.append(svgEl('rect', { x: 185, y: 100, width: 30, height: 40, fill: '#ddf4ff', stroke: '#1899d6', 'stroke-width': 3 }));
    svg.append(svgEl('text', { x: 225, y: 125, 'font-size': 12, 'font-weight': 800 }, `R2=${R2}Ω`));
    svg.append(svgEl('line', { x1: 200, y1: 140, x2: 200, y2: 150, stroke: '#3c3c3c', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 50, y1: 150, x2: loaded ? 340 : 200, y2: 150, stroke: '#3c3c3c', 'stroke-width': 3 }));
    if (loaded) {
      svg.append(svgEl('line', { x1: 200, y1: 85, x2: 340, y2: 85, stroke: '#3c3c3c', 'stroke-width': 3 }));
      svg.append(svgEl('rect', { x: 325, y: 100, width: 30, height: 40, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 3 }));
      svg.append(svgEl('line', { x1: 340, y1: 85, x2: 340, y2: 100, stroke: '#3c3c3c', 'stroke-width': 3 })); svg.append(svgEl('line', { x1: 340, y1: 140, x2: 340, y2: 150, stroke: '#3c3c3c', 'stroke-width': 3 }));
      svg.append(svgEl('text', { x: 362, y: 125, 'font-size': 12, 'font-weight': 800, fill: '#ea2b2b' }, `RL=${RL}Ω`));
    }
    svg.append(svgEl('text', { x: 120, y: 80, 'font-size': 14, 'font-weight': 900, fill: '#e5b400' }, `Vout = ${fmt((loaded ? Vload : Vopen), 4)} V`));
    ctrl.innerHTML = ''; ctrl.append(btn(loaded ? 'load connected' : 'connect load', () => { loaded = !loaded; render(); ctx.onChange(); }, loaded ? 'r' : ''));
    rd.innerHTML = `open-circuit Vout = Vs·R2/(R1+R2) = <b>${fmt(Vopen, 4)} V</b> &nbsp; Rth = R1∥R2 = ${R1}·${R2}/(${R1}+${R2}) = <b>${fmt(Rth, 4)} Ω</b><br>with load RL: Vout = Vth·RL/(Rth+RL) = <b>${fmt(Vload, 4)} V</b> ${loaded ? '' : '(not connected yet)'}<br><span style="color:#777">The load sees the divider as one source Vth behind one resistor Rth. That is the whole point of a Thévenin equivalent.</span>`;
  }
  s1.oninput = () => { R1 = +s1.value; render(); }; s2.oninput = () => { R2 = +s2.value; render(); }; sL.oninput = () => { RL = +sL.value; render(); };
  render();
  return { getState: () => ({ R1, R2, RL, loaded }), solve: () => { loaded = true; render(); ctx.onChange(); } };
};

// ---- Series / parallel ----
W.serpar = (root, p, ctx) => {
  let R1 = p.R1 ?? 100, R2 = p.R2 ?? 300;
  const body = box(root, 'Series vs parallel resistors', 'Series: same current, voltages add, resistances add. Parallel: same voltage, currents add, resistance shrinks below the smallest.');
  const s1 = slider(10, 1000, 10, R1), s2 = slider(10, 1000, 10, R2);
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'R1 ', s1, ' R2 ', s2), rd);
  function render() {
    rd.innerHTML = `R1 = ${R1} Ω, R2 = ${R2} Ω<br>series: R1 + R2 = <b>${R1 + R2} Ω</b><br>parallel: R1·R2/(R1+R2) = <b>${fmt(R1 * R2 / (R1 + R2), 4)} Ω</b> (less than min(${R1},${R2}) = ${Math.min(R1, R2)})<br><span style="color:#777">Equal resistors in parallel: R/2. A tiny resistor in parallel dominates: it is the easiest path.</span>`;
  }
  s1.oninput = () => { R1 = +s1.value; render(); ctx.onChange(); }; s2.oninput = () => { R2 = +s2.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ R1, R2 }) };
};

// ---- KCL node ----
W.kcl = (root, p, ctx) => {
  let I1 = p.I1 ?? 2, I2 = p.I2 ?? 3;
  const body = box(root, "Kirchhoff's current law at one node", 'Charge cannot pile up at a node: what flows in must flow out. Drag the two incoming currents; the outgoing one is forced.');
  const s1 = slider(-5, 5, 0.5, I1), s2 = slider(-5, 5, 0.5, I2);
  const svg = svgEl('svg', { viewBox: '0 0 360 140', width: 360, height: 140 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'I1 ', s1, ' I2 ', s2), svg, rd);
  function arrow(x1, y1, x2, y2, label, col) {
    svg.append(svgEl('line', { x1, y1, x2, y2, stroke: col, 'stroke-width': 4, 'marker-end': 'url(#ka)' }));
    svg.append(svgEl('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 10, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 900, fill: col }, label));
  }
  function render() {
    const I3 = I1 + I2;
    svg.innerHTML = '';
    svg.append(svgEl('defs', {}, svgEl('marker', { id: 'ka', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto' }, svgEl('path', { d: 'M0,0 L8,4 L0,8 z', fill: '#3c3c3c' }))));
    svg.append(svgEl('circle', { cx: 180, cy: 70, r: 10, fill: '#3c3c3c' }));
    if (I1 >= 0) arrow(40, 30, 165, 62, `I1 = ${I1} A in`, '#1cb0f6'); else arrow(165, 62, 40, 30, `|I1| = ${-I1} A out`, '#1cb0f6');
    if (I2 >= 0) arrow(40, 110, 165, 78, `I2 = ${I2} A in`, '#58cc02'); else arrow(165, 78, 40, 110, `|I2| = ${-I2} A out`, '#58cc02');
    if (I3 >= 0) arrow(195, 70, 330, 70, `I3 = ${fmt(I3)} A out`, '#ff9600'); else arrow(330, 70, 195, 70, `|I3| = ${fmt(-I3)} A in`, '#ff9600');
    rd.innerHTML = `Σ(currents in) = Σ(currents out): ${I1} + ${I2} = <b>${fmt(I3)}</b> A must leave.<br><span style="color:#777">Negative just means the real direction is opposite to the arrow you drew. Pick reference directions first, then let the algebra tell you the sign.</span>`;
  }
  s1.oninput = () => { I1 = +s1.value; render(); ctx.onChange(); }; s2.oninput = () => { I2 = +s2.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ I1, I2 }) };
};

// ---- RC charging ----
W.rc = (root, p, ctx) => {
  let R = p.R ?? 1000, C = p.C ?? 1, V = p.V ?? 5; // C in µF
  const body = box(root, 'RC step response: v(t) = V(1 − e^(−t/τ)), τ = RC', 'τ (tau) is the time constant. After one τ the capacitor is 63% charged; after 2.303τ it is 90% charged.');
  const sR = slider(100, 5000, 100, R), sC = slider(0.1, 5, 0.1, C);
  const svg = svgEl('svg', { viewBox: '0 0 460 200', width: 460, height: 200 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'R (Ω) ', sR, ' C (µF) ', sC), svg, rd);
  function render() {
    const tau = R * C * 1e-6; // s
    const tmax = 10e-3; // 10 ms window
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 40, y1: 170, x2: 450, y2: 170, stroke: '#999' })); svg.append(svgEl('line', { x1: 40, y1: 10, x2: 40, y2: 170, stroke: '#999' }));
    for (let ms = 0; ms <= 10; ms += 2) svg.append(svgEl('text', { x: 40 + ms / 10 * 400, y: 185, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, `${ms} ms`));
    svg.append(svgEl('line', { x1: 40, y1: 30, x2: 450, y2: 30, stroke: '#ccc', 'stroke-dasharray': '4 3' }));
    svg.append(svgEl('text', { x: 44, y: 26, 'font-size': 10, fill: '#777' }, `V = ${V} V`));
    let d = '';
    for (let i = 0; i <= 200; i++) { const t = i / 200 * tmax; const v = V * (1 - Math.exp(-t / tau)); d += `${i ? 'L' : 'M'}${40 + i / 200 * 400},${170 - v / V * 140} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    const mark = (t, v, label, col) => { if (t > tmax) return; const x = 40 + t / tmax * 400, y = 170 - v / V * 140; svg.append(svgEl('circle', { cx: x, cy: y, r: 5, fill: col })); svg.append(svgEl('text', { x: x + 6, y: y - 6, 'font-size': 11, fill: col, 'font-weight': 800 }, label)); };
    mark(tau, V * (1 - Math.exp(-1)), `τ = ${fmt(tau * 1e3)} ms (63%)`, '#ff9600');
    mark(tau * Math.log(10), 0.9 * V, `2.303τ = ${fmt(tau * Math.log(10) * 1e3)} ms (90%)`, '#46a302');
    rd.innerHTML = `τ = RC = ${R} Ω × ${C} µF = <b>${fmt(tau * 1e3)} ms</b><br>at t = τ: v = V(1−e⁻¹) = ${fmt(V * 0.6321)} V (63.2%) &nbsp; at t = 2.303τ: v = 0.9V because e^(−2.303) = 0.1<br>time to 90% = τ·ln(10) = <b>${fmt(tau * Math.log(10) * 1e3)} ms</b>`;
  }
  sR.oninput = () => { R = +sR.value; render(); ctx.onChange(); }; sC.oninput = () => { C = +sC.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ R, C }) };
};

// ---- Tangent / derivative ----
W.tangent = (root, p, ctx) => {
  const f = p.f || (x => x * x + 3 * x + 2), df = p.df || (x => 2 * x + 3), label = p.label || 'f(x) = x² + 3x + 2', dlabel = p.dlabel || "f'(x) = 2x + 3";
  let x0 = p.x0 ?? 1;
  const body = box(root, 'The derivative is the slope of the tangent', 'Slide the point. The derivative at x is how steep the curve is right there: rise per unit run.');
  const s = slider(-4, 2, 0.1, x0);
  const svg = svgEl('svg', { viewBox: '0 0 460 220', width: 460, height: 220 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'x = ', s), svg, rd);
  const X = x => 230 + x * 50, Y = y => 190 - y * 20;
  function render() {
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 10, y1: Y(0), x2: 450, y2: Y(0), stroke: '#999' })); svg.append(svgEl('line', { x1: X(0), y1: 5, x2: X(0), y2: 215, stroke: '#999' }));
    for (let x = -4; x <= 4; x++) svg.append(svgEl('text', { x: X(x), y: Y(0) + 14, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, x));
    let d = ''; for (let i = 0; i <= 200; i++) { const x = -4.4 + i / 200 * 8.8; d += `${i ? 'L' : 'M'}${X(x)},${Y(f(x))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    const m = df(x0), y0 = f(x0);
    svg.append(svgEl('line', { x1: X(x0 - 2), y1: Y(y0 - 2 * m), x2: X(x0 + 2), y2: Y(y0 + 2 * m), stroke: '#ff9600', 'stroke-width': 3 }));
    svg.append(svgEl('circle', { cx: X(x0), cy: Y(y0), r: 6, fill: '#ff4b4b' }));
    rd.innerHTML = `${label}, ${dlabel}<br>at x = ${fmt(x0)}: f = <b>${fmt(y0, 4)}</b>, slope f' = <b>${fmt(m, 4)}</b> ${m > 0 ? '(rising)' : m < 0 ? '(falling)' : '(flat: a turning point)'}`;
  }
  s.oninput = () => { x0 = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ x0 }) };
};

// ---- Area / integral ----
W.area = (root, p, ctx) => {
  const f = p.f || (x => x * x + 3 * x + 2), F = p.F || (x => x ** 3 / 3 + 1.5 * x * x + 2 * x), label = p.label || 'f(x) = x² + 3x + 2';
  let b = p.b ?? 1;
  const body = box(root, 'The integral is accumulated area', 'Slide the right end. The shaded area from 0 to b is F(b) − F(0), where F is an antiderivative.');
  const s = slider(0, 2, 0.05, b);
  const svg = svgEl('svg', { viewBox: '0 0 460 200', width: 460, height: 200 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'b = ', s), svg, rd);
  const X = x => 40 + x * 180, Y = y => 180 - y * 12;
  function render() {
    svg.innerHTML = '';
    let area = `M${X(0)},${Y(0)} `; for (let i = 0; i <= 100; i++) { const x = i / 100 * b; area += `L${X(x)},${Y(f(x))} `; } area += `L${X(b)},${Y(0)} Z`;
    svg.append(svgEl('path', { d: area, fill: '#d7ffb8', stroke: 'none' }));
    let d = ''; for (let i = 0; i <= 100; i++) { const x = i / 100 * 2.2; d += `${i ? 'L' : 'M'}${X(x)},${Y(f(x))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 30, y1: Y(0), x2: 450, y2: Y(0), stroke: '#999' })); svg.append(svgEl('line', { x1: X(0), y1: 5, x2: X(0), y2: 190, stroke: '#999' }));
    [0, 0.5, 1, 1.5, 2].forEach(x => svg.append(svgEl('text', { x: X(x), y: 195, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, x)));
    rd.innerHTML = `${label}; antiderivative F(x) = x³/3 + 3x²/2 + 2x<br>∫₀^${fmt(b)} f dx = F(${fmt(b)}) − F(0) = <b>${fmt(F(b) - F(0), 4)}</b>${Math.abs(b - 1) < 1e-9 ? ' = 1/3 + 3/2 + 2 = 23/6 ≈ 3.833' : ''}`;
  }
  s.oninput = () => { b = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ b }) };
};

// ---- Complex number rect <-> polar ----
W.complex = (root, p, ctx) => {
  let re = p.re ?? 3, im = p.im ?? 4;
  const body = box(root, 'Complex number: rectangular ↔ polar', 'A complex number is an arrow. Rectangular gives its shadow on each axis; polar gives its length and angle.');
  const sr = slider(-5, 5, 0.5, re), si = slider(-5, 5, 0.5, im);
  const svg = svgEl('svg', { viewBox: '0 0 240 240', width: 240, height: 240 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 're ', sr, ' im ', si), svg, rd);
  const X = x => 120 + x * 20, Y = y => 120 - y * 20;
  function render() {
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 0, y1: 120, x2: 240, y2: 120, stroke: '#999' })); svg.append(svgEl('line', { x1: 120, y1: 0, x2: 120, y2: 240, stroke: '#999' }));
    svg.append(svgEl('text', { x: 232, y: 115, 'font-size': 10, fill: '#777' }, 'Re')); svg.append(svgEl('text', { x: 124, y: 10, 'font-size': 10, fill: '#777' }, 'Im'));
    svg.append(svgEl('line', { x1: X(0), y1: Y(0), x2: X(re), y2: Y(0), stroke: '#58cc02', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: X(re), y1: Y(0), x2: X(re), y2: Y(im), stroke: '#ff9600', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: X(0), y1: Y(0), x2: X(re), y2: Y(im), stroke: '#1cb0f6', 'stroke-width': 4 }));
    svg.append(svgEl('circle', { cx: X(re), cy: Y(im), r: 6, fill: '#1899d6' }));
    const r = Math.hypot(re, im), th = Math.atan2(im, re) * 180 / Math.PI;
    svg.append(svgEl('path', { d: `M${X(1.2)},${Y(0)} A24,24 0 0 ${im >= 0 ? 0 : 1} ${X(1.2 * Math.cos(th * Math.PI / 180))},${Y(1.2 * Math.sin(th * Math.PI / 180))}`, fill: 'none', stroke: '#ce82ff', 'stroke-width': 2 }));
    rd.innerHTML = `z = <b>${re} ${im >= 0 ? '+' : '−'} ${Math.abs(im)}i</b><br>|z| = √(${re}² + ${im}²) = √${fmt(re * re + im * im)} = <b>${fmt(r, 4)}</b> &nbsp; angle = atan2(${im}, ${re}) = <b>${fmt(th, 4)}°</b> = ${fmt(th * Math.PI / 180, 4)} rad<br>polar: ${fmt(r, 4)}∠${fmt(th, 4)}° = ${fmt(r, 4)}·e^(i·${fmt(th * Math.PI / 180, 3)})<br><span style="color:#777">back to rectangular: re = |z|cosθ, im = |z|sinθ. Use atan2 (not plain atan) so the quadrant is right.</span>`;
  }
  sr.oninput = () => { re = +sr.value; render(); ctx.onChange(); }; si.oninput = () => { im = +si.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ re, im }) };
};

// ---- Sampling / aliasing ----
W.alias = (root, p, ctx) => {
  let f = p.f ?? 900; const fs = p.fs ?? 1000;
  const body = box(root, `Sampling at fs = ${fs} Hz`, 'Blue: the real sinusoid. Dots: what the ADC sees. Orange: the lowest-frequency sinusoid that passes through the same dots.');
  const s = slider(0, 1500, 50, f);
  const svg = svgEl('svg', { viewBox: '0 0 480 160', width: 480, height: 160 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'signal f (Hz) ', s), svg, rd);
  function render() {
    svg.innerHTML = '';
    const T = 10 / fs; // show 10 samples
    const X = t => 20 + t / T * 440, Y = v => 80 - v * 55;
    svg.append(svgEl('line', { x1: 20, y1: 80, x2: 460, y2: 80, stroke: '#ccc' }));
    let d = ''; for (let i = 0; i <= 400; i++) { const t = i / 400 * T; d += `${i ? 'L' : 'M'}${X(t)},${Y(Math.sin(2 * Math.PI * f * t))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 2 }));
    const k = Math.round(f / fs); let fa = f - k * fs; const sign = fa < 0 ? -1 : 1; fa = Math.abs(fa);
    let d2 = ''; for (let i = 0; i <= 400; i++) { const t = i / 400 * T; d2 += `${i ? 'L' : 'M'}${X(t)},${Y(sign * Math.sin(2 * Math.PI * fa * t))} `; }
    svg.append(svgEl('path', { d: d2, fill: 'none', stroke: '#ff9600', 'stroke-width': 3, 'stroke-dasharray': '6 4' }));
    for (let n = 0; n <= 10; n++) { const t = n / fs; svg.append(svgEl('circle', { cx: X(t), cy: Y(Math.sin(2 * Math.PI * f * t)), r: 5, fill: '#ff4b4b' })); }
    rd.innerHTML = `f = <b>${f} Hz</b>, fs = ${fs} Hz, Nyquist limit fs/2 = ${fs / 2} Hz ${f > fs / 2 ? '<span style="color:#ea2b2b">⚠ above Nyquist: ALIASED</span>' : '✓ below Nyquist'}<br>apparent frequency = |f − k·fs| with nearest k=${k}: |${f} − ${k * fs}| = <b>${fa} Hz</b>${sign < 0 ? ' (phase inverted)' : ''}<br><span style="color:#777">The samples alone cannot tell ${f} Hz from ${fa} Hz. Anti-alias filtering must happen BEFORE sampling.</span>`;
  }
  s.oninput = () => { f = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ f }) };
};

// ---- Power triangle ----
W.powertri = (root, p, ctx) => {
  let V = p.V ?? 230, I = p.I ?? 10, pf = p.pf ?? 0.8;
  const body = box(root, 'Real, reactive and apparent power', 'Apparent power S = V·I is what the wires must carry. Real power P = S·cosφ is what does work. Power factor = cosφ = P/S.');
  const sp = slider(0.1, 1, 0.05, pf), si = slider(1, 20, 1, I);
  const svg = svgEl('svg', { viewBox: '0 0 320 170', width: 320, height: 170 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'I (A) ', si, ' power factor ', sp), svg, rd);
  function render() {
    const Sv = V * I, P = Sv * pf, Q = Math.sqrt(Math.max(0, Sv * Sv - P * P)), phi = Math.acos(pf) * 180 / Math.PI;
    svg.innerHTML = '';
    const sc = 240 / Sv;
    svg.append(svgEl('line', { x1: 20, y1: 150, x2: 20 + P * sc, y2: 150, stroke: '#58cc02', 'stroke-width': 5 }));
    svg.append(svgEl('line', { x1: 20 + P * sc, y1: 150, x2: 20 + P * sc, y2: 150 - Q * sc, stroke: '#ff9600', 'stroke-width': 5 }));
    svg.append(svgEl('line', { x1: 20, y1: 150, x2: 20 + P * sc, y2: 150 - Q * sc, stroke: '#1cb0f6', 'stroke-width': 5 }));
    svg.append(svgEl('text', { x: 20 + P * sc / 2, y: 166, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: '#46a302' }, `P = ${fmt(P / 1000, 4)} kW`));
    svg.append(svgEl('text', { x: 28 + P * sc, y: 150 - Q * sc / 2, 'font-size': 12, 'font-weight': 800, fill: '#ff9600' }, `Q = ${fmt(Q / 1000, 4)} kvar`));
    svg.append(svgEl('text', { x: 20 + P * sc / 2 - 30, y: 140 - Q * sc / 2, 'font-size': 12, 'font-weight': 800, fill: '#1899d6' }, `S = ${fmt(Sv / 1000, 4)} kVA`));
    svg.append(svgEl('text', { x: 60, y: 142, 'font-size': 11, fill: '#777' }, `φ = ${fmt(phi, 3)}°`));
    rd.innerHTML = `V = ${V} V rms, I = ${I} A rms, pf = ${pf}<br>S = V·I = <b>${fmt(Sv / 1000, 4)} kVA</b> &nbsp; P = S·pf = <b>${fmt(P / 1000, 4)} kW</b> &nbsp; Q = √(S²−P²) = <b>${fmt(Q / 1000, 4)} kvar</b>`;
  }
  sp.oninput = () => { pf = +sp.value; render(); ctx.onChange(); }; si.oninput = () => { I = +si.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ I, pf }) };
};

// ---- Convolution flip-and-slide ----
W.convolve = (root, p, ctx) => {
  const x = p.x || [1, 2], h = p.h || [1, 1];
  let n = 0; const N = x.length + h.length - 1;
  const body = box(root, `Convolution [${x}] ∗ [${h}]`, 'y[n] = Σ x[k]·h[n−k]. Step n: flip h, slide it to position n, multiply overlapping pairs, add.');
  const rd = readout(''); const ctrl = el('div', { class: 'ctrl' });
  body.append(rd, ctrl);
  function render() {
    let terms = [], sum = 0;
    for (let k = 0; k < x.length; k++) { const j = n - k; if (j >= 0 && j < h.length) { terms.push(`x[${k}]·h[${j}] = ${x[k]}·${h[j]}`); sum += x[k] * h[j]; } }
    const y = []; for (let m = 0; m < N; m++) { let s = 0; for (let k = 0; k < x.length; k++) { const j = m - k; if (j >= 0 && j < h.length) s += x[k] * h[j]; } y.push(s); }
    rd.innerHTML = `n = <b>${n}</b>: y[${n}] = ${terms.join(' + ')} = <b>${sum}</b><br>full result so far: [${y.map((v, i) => i <= n ? `<b>${v}</b>` : '?').join(', ')}] (length ${x.length}+${h.length}−1 = ${N})<br><span style="color:#777">Meaning: each input sample launches a scaled copy of the impulse response; the output is all those copies added up.</span>`;
    ctrl.innerHTML = ''; ctrl.append(btn('▶ next n', () => { if (n < N - 1) { n++; render(); ctx.onChange(); } }, 'g'), btn('↺', () => { n = 0; render(); }));
  }
  render();
  return { getState: () => ({ n }), solve: () => { n = N - 1; render(); ctx.onChange(); } };
};

// ---- Reflection coefficient ----
W.reflection = (root, p, ctx) => {
  let Z0 = p.Z0 ?? 50, ZL = p.ZL ?? 100;
  const body = box(root, 'Transmission line: reflection at the load', 'Γ = (ZL − Z0)/(ZL + Z0). Matched (ZL = Z0) means nothing bounces back. Open → +1, short → −1.');
  const s = slider(0, 300, 5, ZL);
  const svg = svgEl('svg', { viewBox: '0 0 460 120', width: 460, height: 120 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, `Z0 = ${Z0} Ω, ZL (Ω) `, s), svg, rd);
  function render() {
    const G = (ZL - Z0) / (ZL + Z0);
    svg.innerHTML = '';
    svg.append(svgEl('rect', { x: 20, y: 40, width: 360, height: 30, fill: '#eee', stroke: '#999' }));
    svg.append(svgEl('text', { x: 200, y: 32, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, `line, Z0 = ${Z0} Ω`));
    svg.append(svgEl('rect', { x: 385, y: 30, width: 50, height: 50, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 2 }));
    svg.append(svgEl('text', { x: 410, y: 60, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800 }, ZL >= 300 ? 'open' : ZL === 0 ? 'short' : `${ZL}Ω`));
    svg.append(svgEl('line', { x1: 30, y1: 55, x2: 370, y2: 55, stroke: '#1cb0f6', 'stroke-width': 6 }));
    svg.append(svgEl('text', { x: 200, y: 90, 'text-anchor': 'middle', 'font-size': 12, fill: '#1899d6', 'font-weight': 800 }, 'incident step: 1.0 →'));
    svg.append(svgEl('line', { x1: 370, y1: 62, x2: 370 - Math.abs(G) * 340, y2: 62, stroke: G >= 0 ? '#58cc02' : '#ff4b4b', 'stroke-width': 4, 'stroke-dasharray': '6 4' }));
    svg.append(svgEl('text', { x: 200, y: 110, 'text-anchor': 'middle', 'font-size': 12, fill: G >= 0 ? '#46a302' : '#ea2b2b', 'font-weight': 800 }, `← reflected: Γ = ${fmt(G, 4)}`));
    rd.innerHTML = `Γ = (${ZL} − ${Z0})/(${ZL} + ${Z0}) = <b>${fmt(G, 4)}</b>${Math.abs(G) < 1e-9 ? ' — matched, no reflection ✓' : ''}<br>voltage at the load right after the step arrives = 1 + Γ = <b>${fmt(1 + G, 4)}</b> (of the incident amplitude)<br><span style="color:#777">A reflection is not an error message: it is physics. Terminate so Γ ≈ 0 when edges are fast compared with the line delay.</span>`;
  }
  s.oninput = () => { ZL = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ ZL }) };
};

// ---- First-order ODE response ----
W.ode = (root, p, ctx) => {
  let a = p.a ?? 2, b = p.b ?? 4;
  const body = box(root, 'dy/dt + a·y = b, y(0) = 0', 'The solution heads for the steady state b/a with time constant 1/a. Slide a and b and watch which one changes what.');
  const sa = slider(0.5, 5, 0.5, a), sb = slider(0, 8, 0.5, b);
  const svg = svgEl('svg', { viewBox: '0 0 460 180', width: 460, height: 180 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'a ', sa, ' b ', sb), svg, rd);
  function render() {
    svg.innerHTML = '';
    const yss = b / a, tau = 1 / a;
    const X = t => 30 + t / 4 * 420, Y = y => 160 - y * 15;
    svg.append(svgEl('line', { x1: 30, y1: 160, x2: 450, y2: 160, stroke: '#999' })); svg.append(svgEl('line', { x1: 30, y1: 5, x2: 30, y2: 160, stroke: '#999' }));
    for (let t = 0; t <= 4; t++) svg.append(svgEl('text', { x: X(t), y: 174, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, `${t}s`));
    svg.append(svgEl('line', { x1: 30, y1: Y(yss), x2: 450, y2: Y(yss), stroke: '#ccc', 'stroke-dasharray': '4 3' }));
    svg.append(svgEl('text', { x: 36, y: Y(yss) - 4, 'font-size': 10, fill: '#777' }, `steady state b/a = ${fmt(yss)}`));
    let d = ''; for (let i = 0; i <= 200; i++) { const t = i / 50; d += `${i ? 'L' : 'M'}${X(t)},${Y(yss * (1 - Math.exp(-a * t)))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('circle', { cx: X(tau), cy: Y(yss * (1 - Math.exp(-1))), r: 5, fill: '#ff9600' }));
    svg.append(svgEl('text', { x: X(tau) + 6, y: Y(yss * (1 - Math.exp(-1))) + 14, 'font-size': 11, fill: '#ff9600', 'font-weight': 800 }, `τ = 1/a = ${fmt(tau)} s`));
    rd.innerHTML = `y(t) = (b/a)(1 − e^(−a·t)) = <b>${fmt(yss)}(1 − e^(−${a}t))</b><br>check by substitution: dy/dt = ${fmt(b)}e^(−${a}t); a·y = ${fmt(b)} − ${fmt(b)}e^(−${a}t); sum = ${fmt(b)} = b ✓ and y(0) = 0 ✓`;
  }
  sa.oninput = () => { a = +sa.value; render(); ctx.onChange(); }; sb.oninput = () => { b = +sb.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ a, b }) };
};

// ---- Diode I-V ----
W.diode = (root, p, ctx) => {
  let Vd = p.V ?? 0.6, model = 'real';
  const body = box(root, 'Diode current vs voltage', 'Real diode: exponential, turns on gradually around 0.6–0.7 V. Ideal model: a switch. Constant-drop model: a 0.7 V battery when on.');
  const s = slider(-1, 0.9, 0.02, Vd);
  const svg = svgEl('svg', { viewBox: '0 0 400 170', width: 400, height: 170 });
  const rd = readout(''); const ctrl = el('div', { class: 'ctrl' });
  body.append(el('div', { class: 'ctrl' }, 'Vd (V) ', s), ctrl, svg, rd);
  const Is = 1e-12, nVt = 0.026 * 1.5;
  const I = v => model === 'real' ? Is * (Math.exp(v / nVt) - 1) : model === 'ideal' ? (v > 0 ? 0.05 : 0) : (v >= 0.7 ? 0.05 : 0);
  function render() {
    svg.innerHTML = '';
    const X = v => 200 + v * 180, Y = i => 150 - Math.min(i, 0.05) / 0.05 * 130;
    svg.append(svgEl('line', { x1: 10, y1: 150, x2: 390, y2: 150, stroke: '#999' })); svg.append(svgEl('line', { x1: 200, y1: 10, x2: 200, y2: 155, stroke: '#999' }));
    [-1, -0.5, 0.5].forEach(v => svg.append(svgEl('text', { x: X(v), y: 164, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, `${v} V`)));
    let d = ''; for (let i = 0; i <= 200; i++) { const v = -1 + i / 200 * 1.9; d += `${i ? 'L' : 'M'}${X(v)},${Y(I(v))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('circle', { cx: X(Vd), cy: Y(I(Vd)), r: 6, fill: '#ff4b4b' }));
    ctrl.innerHTML = ''; ['real', 'ideal', 'drop'].forEach(m => ctrl.append(btn(m === 'real' ? 'exponential (real)' : m === 'ideal' ? 'ideal switch' : 'constant 0.7 V drop', () => { model = m; render(); ctx.onChange(); }, model === m ? 'on' : '')));
    const i = I(Vd);
    rd.innerHTML = `Vd = <b>${fmt(Vd)} V</b> → I ≈ <b>${i < 1e-6 ? (i * 1e9).toFixed(3) + ' nA' : i < 1e-3 ? (i * 1e6).toFixed(2) + ' µA' : (i * 1e3).toFixed(2) + ' mA'}</b> (${model} model${model === 'real' ? ', I = Is(e^(V/nVt) − 1)' : ''})<br><span style="color:#777">Near turn-on the models disagree most: the switch says "off", the exponential says "a little", the 0.7 V model says "off until 0.7".</span>`;
  }
  s.oninput = () => { Vd = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ Vd, model }) };
};

// ---- Decibels ----
W.decibel = (root, p, ctx) => {
  let ratio = p.ratio ?? 100;
  const body = box(root, 'Decibels: a logarithmic ratio', 'dB = 10·log10(P2/P1) for power. For amplitude (voltage) with equal impedance it is 20·log10(V2/V1), because power ∝ V².');
  const s = slider(0, 4, 0.1, Math.log10(ratio));
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'log10(power ratio) ', s), rd);
  function render() {
    rd.innerHTML = `power ratio = <b>${fmt(ratio, 4)}</b> → 10·log10(${fmt(ratio, 4)}) = <b>${fmt(10 * Math.log10(ratio), 4)} dB</b><br>the same power ratio means a voltage ratio of √${fmt(ratio, 4)} = ${fmt(Math.sqrt(ratio), 4)} → 20·log10(${fmt(Math.sqrt(ratio), 4)}) = <b>${fmt(20 * Math.log10(Math.sqrt(ratio)), 4)} dB</b> (same number ✓)<br><span style="color:#777">×2 power ≈ +3 dB, ×10 power = +10 dB, ×10 voltage = +20 dB.</span>`;
  }
  s.oninput = () => { ratio = Math.pow(10, +s.value); render(); ctx.onChange(); };
  render();
  return { getState: () => ({ ratio }) };
};

// ---- RMS of a sine ----
W.rms = (root, p, ctx) => {
  let A = p.A ?? 325;
  const body = box(root, 'RMS: the DC that heats the same', 'A sine with peak A delivers the same average power to a resistor as a steady A/√2. UK mains: 230 V rms is a 325 V peak.');
  const s = slider(10, 400, 5, A);
  const svg = svgEl('svg', { viewBox: '0 0 460 160', width: 460, height: 160 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'peak A (V) ', s), svg, rd);
  function render() {
    svg.innerHTML = '';
    const Y = v => 80 - v / 400 * 70;
    svg.append(svgEl('line', { x1: 10, y1: 80, x2: 450, y2: 80, stroke: '#ccc' }));
    let d = ''; for (let i = 0; i <= 400; i++) d += `${i ? 'L' : 'M'}${10 + i * 1.1},${Y(A * Math.sin(i / 400 * 4 * Math.PI))} `;
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 10, y1: Y(A / Math.SQRT2), x2: 450, y2: Y(A / Math.SQRT2), stroke: '#ff9600', 'stroke-width': 3, 'stroke-dasharray': '6 4' }));
    svg.append(svgEl('text', { x: 14, y: Y(A / Math.SQRT2) - 5, 'font-size': 11, fill: '#ff9600', 'font-weight': 800 }, `rms = ${fmt(A / Math.SQRT2, 4)} V`));
    svg.append(svgEl('text', { x: 14, y: Y(A) - 4, 'font-size': 11, fill: '#1899d6', 'font-weight': 800 }, `peak = ${A} V`));
    rd.innerHTML = `Vrms = A/√2 = ${A}/1.4142 = <b>${fmt(A / Math.SQRT2, 4)} V</b> &nbsp; average of the sine itself = 0 (useless for power) &nbsp; average of v² = A²/2 → root = A/√2.`;
  }
  s.oninput = () => { A = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ A }) };
};

// ---- Gradient of x²+y² ----
W.gradient = (root, p, ctx) => {
  let x = p.x ?? 1, y = p.y ?? 0.5;
  const body = box(root, 'Gradient of f(x,y) = x² + y²', 'Contours are circles. The gradient (2x, 2y) points straight uphill, perpendicular to the contour, longer where it is steeper.');
  const sx = slider(-2, 2, 0.25, x), sy = slider(-2, 2, 0.25, y);
  const svg = svgEl('svg', { viewBox: '0 0 240 240', width: 240, height: 240 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'x ', sx, ' y ', sy), svg, rd);
  const X = v => 120 + v * 45, Y = v => 120 - v * 45;
  function render() {
    svg.innerHTML = '';
    [0.5, 1, 1.5, 2, 2.5].forEach(r => svg.append(svgEl('circle', { cx: 120, cy: 120, r: r * 45, fill: 'none', stroke: '#ddd' })));
    svg.append(svgEl('defs', {}, svgEl('marker', { id: 'ga', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto' }, svgEl('path', { d: 'M0,0 L8,4 L0,8 z', fill: '#ff4b4b' }))));
    const gx = 2 * x, gy = 2 * y;
    svg.append(svgEl('circle', { cx: X(x), cy: Y(y), r: 5, fill: '#1cb0f6' }));
    if (gx || gy) svg.append(svgEl('line', { x1: X(x), y1: Y(y), x2: X(x + gx * 0.25), y2: Y(y + gy * 0.25), stroke: '#ff4b4b', 'stroke-width': 3, 'marker-end': 'url(#ga)' }));
    rd.innerHTML = `at (${x}, ${y}): f = ${fmt(x * x + y * y)} &nbsp; ∇f = (∂f/∂x, ∂f/∂y) = (2x, 2y) = <b>(${fmt(gx)}, ${fmt(gy)})</b>, |∇f| = ${fmt(Math.hypot(gx, gy), 4)}<br><span style="color:#777">Divergence of a field = net outflow per unit volume at a point; curl = how much it swirls. Gradient turns a scalar hill into a field of uphill arrows.</span>`;
  }
  sx.oninput = () => { x = +sx.value; render(); ctx.onChange(); }; sy.oninput = () => { y = +sy.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ x, y }) };
};

// ---- Energy meter ----
W.energy = (root, p, ctx) => {
  let P = p.P ?? 100, hrs = p.h ?? 2;
  const body = box(root, 'Power is a rate; energy is the total', 'Watts tell you how fast energy is used. Multiply by time to get energy: joules (W·s) or kilowatt-hours (kW·h).');
  const sP = slider(10, 3000, 10, P), sh = slider(0.5, 24, 0.5, hrs);
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'P (W) ', sP, ' time (h) ', sh), rd);
  function render() {
    rd.innerHTML = `E = P × t = ${P} W × ${hrs} h = <b>${fmt(P * hrs / 1000, 4)} kWh</b> = ${P} × ${hrs * 3600} s = <b>${(P * hrs * 3600).toLocaleString()} J</b><br><span style="color:#777">1 kWh = 3.6 MJ. A 100 W bulb for 2 h is 0.2 kWh = 720,000 J.</span>`;
  }
  sP.oninput = () => { P = +sP.value; render(); ctx.onChange(); }; sh.oninput = () => { hrs = +sh.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ P, hrs }) };
};

// ---- Op-amp inverting/non-inverting gain ----
W.opamp = (root, p, ctx) => {
  let Rf = p.Rf ?? 10, Rin = p.Rin ?? 1, vin = p.vin ?? 0.5, inverting = true; const rails = p.rails ?? 5;
  const body = box(root, 'Ideal op-amp: two rules', 'Rule 1: no current into the inputs. Rule 2: with negative feedback the two inputs sit at the same voltage. Everything else is Ohm and KCL. Watch the rails clip.');
  const sf = slider(1, 20, 1, Rf), si = slider(-1, 1, 0.05, vin);
  const rd = readout(''); const ctrl = el('div', { class: 'ctrl' });
  body.append(el('div', { class: 'ctrl' }, 'Rf (kΩ) ', sf, ' vin (V) ', si), ctrl, rd);
  function render() {
    const G = inverting ? -Rf / Rin : 1 + Rf / Rin;
    const ideal = G * vin, out = Math.max(-rails, Math.min(rails, ideal));
    ctrl.innerHTML = ''; ctrl.append(btn(inverting ? 'inverting: G = −Rf/Rin' : 'non-inverting: G = 1 + Rf/Rin', () => { inverting = !inverting; render(); ctx.onChange(); }, 'on'));
    rd.innerHTML = `Rin = ${Rin} kΩ, Rf = ${Rf} kΩ → gain G = <b>${fmt(G)}</b><br>vin = ${fmt(vin)} V → ideal vout = ${fmt(ideal, 4)} V → actual vout = <b>${fmt(out, 4)} V</b> ${Math.abs(ideal) > rails ? `<span style="color:#ea2b2b">⚠ SATURATED at ±${rails} V rail</span>` : '✓ within rails'}<br><span style="color:#777">Datasheet checks: supply rails, input range, output swing, bandwidth, load current. Gain alone is not a design.</span>`;
  }
  sf.oninput = () => { Rf = +sf.value; render(); ctx.onChange(); }; si.oninput = () => { vin = +si.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ Rf, vin, inverting }) };
};

// ---- Phasor / impedance of R-L-C at frequency ----
W.impedance = (root, p, ctx) => {
  let f = p.f ?? 50, R = p.R ?? 100, L = p.L ?? 0.1, C = p.C ?? 10; // L in H, C in µF
  const body = box(root, 'Impedance: resistance that depends on frequency and phase', 'Z_R = R, Z_L = jωL (grows with f, +90°), Z_C = 1/(jωC) (shrinks with f, −90°). Series RLC adds them as complex numbers.');
  const sf = slider(1, 1000, 1, f);
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'f (Hz) ', sf), rd);
  function render() {
    const w = 2 * Math.PI * f, XL = w * L, XC = 1 / (w * C * 1e-6), X = XL - XC, Zm = Math.hypot(R, X), ph = Math.atan2(X, R) * 180 / Math.PI;
    rd.innerHTML = `ω = 2πf = <b>${fmt(w, 4)} rad/s</b><br>R = ${R} Ω &nbsp; X_L = ωL = <b>${fmt(XL, 4)} Ω</b> &nbsp; X_C = 1/(ωC) = <b>${fmt(XC, 4)} Ω</b><br>series Z = R + j(X_L − X_C) = ${R} + j(${fmt(X, 4)}) → |Z| = <b>${fmt(Zm, 4)} Ω</b>, phase <b>${fmt(ph, 4)}°</b> ${Math.abs(X) < R * 0.02 ? '(near resonance: X_L ≈ X_C)' : X > 0 ? '(inductive: current lags)' : '(capacitive: current leads)'}<br><span style="color:#777">resonance when X_L = X_C: f₀ = 1/(2π√LC) = ${fmt(1 / (2 * Math.PI * Math.sqrt(L * C * 1e-6)), 4)} Hz</span>`;
  }
  sf.oninput = () => { f = +sf.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ f }) };
};

// ---- Probe loading ----
W.probe = (root, p, ctx) => {
  let Rs = p.Rs ?? 100, Rp = 10000; // kΩ
  const body = box(root, 'Measuring changes the circuit', 'A probe is a resistor to ground in parallel with the node. High source impedance + low probe impedance = a wrong reading.');
  const ss = slider(1, 1000, 1, Rs);
  const rd = readout(''); const ctrl = el('div', { class: 'ctrl' });
  body.append(el('div', { class: 'ctrl' }, 'source resistance (kΩ) ', ss), ctrl, rd);
  function render() {
    const V = 1, Vm = V * Rp / (Rs + Rp);
    ctrl.innerHTML = ''; [['10 MΩ DMM', 10000], ['1 MΩ scope ×1', 1000], ['10 MΩ scope ×10', 10000], ['50 Ω input', 0.05]].forEach(([n, r]) => ctrl.append(btn(n, () => { Rp = r; render(); ctx.onChange(); }, Rp === r ? 'on' : '')));
    rd.innerHTML = `true node voltage 1.000 V behind Rs = ${Rs} kΩ; probe input = ${Rp >= 1000 ? Rp / 1000 + ' MΩ' : Rp < 1 ? Rp * 1000 + ' Ω' : Rp + ' kΩ'}<br>measured = 1 × Rp/(Rs+Rp) = <b>${fmt(Vm, 4)} V</b> → error <b>${fmt((1 - Vm) * 100, 3)}%</b> ${1 - Vm > 0.05 ? '<span style="color:#ea2b2b">⚠ the meter is loading the circuit</span>' : '✓ acceptable'}`;
  }
  ss.oninput = () => { Rs = +ss.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ Rs, Rp }) };
};

// ---- Semiconductor doping picture ----
W.doping = (root, p, ctx) => {
  let mode = 'intrinsic';
  const body = box(root, 'Intrinsic vs doped silicon', 'Silicon has 4 valence electrons. Add a 5-electron atom (n-type): spare electrons. Add a 3-electron atom (p-type): holes. Majority carriers do the conducting.');
  const svg = svgEl('svg', { viewBox: '0 0 300 160', width: 300, height: 160 });
  const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(ctrl, svg, rd);
  function render() {
    svg.innerHTML = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const x = 20 + c * 36, y = 20 + r * 36;
      const dop = mode !== 'intrinsic' && (r * 8 + c) % 11 === 5;
      svg.append(svgEl('circle', { cx: x, cy: y, r: 11, fill: dop ? (mode === 'n' ? '#1cb0f6' : '#ff9600') : '#ddd', stroke: '#999' }));
      svg.append(svgEl('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800 }, dop ? (mode === 'n' ? 'P' : 'B') : 'Si'));
      if (dop && mode === 'n') svg.append(svgEl('circle', { cx: x + 14, cy: y - 12, r: 4, fill: '#1899d6' }));
      if (dop && mode === 'p') svg.append(svgEl('circle', { cx: x + 14, cy: y - 12, r: 4, fill: '#fff', stroke: '#ff9600', 'stroke-width': 2 }));
    }
    ctrl.innerHTML = ''; [['intrinsic', 'pure Si (intrinsic)'], ['n', 'n-type (phosphorus)'], ['p', 'p-type (boron)']].forEach(([m, l]) => ctrl.append(btn(l, () => { mode = m; render(); ctx.onChange(); }, mode === m ? 'on' : '')));
    rd.innerHTML = mode === 'intrinsic' ? 'Pure silicon: very few free carriers (electron–hole pairs from thermal energy only). Poor conductor at room temperature.'
      : mode === 'n' ? 'n-type: donor atoms (5 valence e⁻) each give one free <b>electron</b> (blue dot). Majority carriers = electrons; minority = holes.'
        : 'p-type: acceptor atoms (3 valence e⁻) each leave one <b>hole</b> (empty circle). Majority carriers = holes; minority = electrons.';
  }
  render();
  return { getState: () => ({ mode }), solve: () => { mode = 'n'; render(); ctx.onChange(); } };
};
