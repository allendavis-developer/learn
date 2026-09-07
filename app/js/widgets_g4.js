// Widgets added by the day-content agents (one module per agent group so parallel work never collides).
// Each widget: (root, props, ctx) => { getState(), solve() } and MUST implement solve() so tests/e2e.mjs can pass its goals.
import { el, svgEl, mdi } from './utils.js';
import { WIDGETS as W } from './widgets.js';

function box(root, title, hint) {
  root.classList.add('widget');
  if (title) root.append(el('div', { class: 'wtitle' }, '🧪 ', el('span', { html: mdi(title) })));
  const body = el('div'); root.append(body);
  if (hint) root.append(el('div', { class: 'hint' }, hint));
  return body;
}
const btn = (label, onClick, cls = '') => el('button', { class: `wbtn ${cls}`, onClick, type: 'button' }, label);
const readout = html => el('div', { class: 'readout', html });
const slider = (min, max, step, val) => el('input', { type: 'range', min, max, step, value: val });
const fmt = (v, d = 3) => Number.isInteger(v) ? String(v) : (+v.toPrecision(d)).toString();

// ---- Day 15: why registers capture on an EDGE, not a level -------------------------------------------------
// A 4-bit counter whose +1 logic feeds back into its own storage. With a transparent (level-sensitive) latch the
// value races round once per gate delay for as long as the clock is high; with an edge-triggered flip-flop it
// advances exactly once per pulse whatever the pulse width.
W.edgelevel = (root, p, ctx) => {
  let width = p.width ?? 3, pulses = 0, latchQ = 0, ffQ = 0, lastLatchSteps = 0;
  const body = box(root, 'Edge vs level: a counter fed back through its own storage', 'Set how many gate delays the clock stays high, then apply one pulse. The latch-based counter is transparent while the clock is high, so the +1 loops round again and again; the flip-flop samples only at the rising edge.');
  const s = slider(1, 6, 1, width);
  const svg = svgEl('svg', { viewBox: '0 0 460 170', width: 460, height: 170 });
  const rd = readout('');
  const ctrl = el('div', { class: 'ctrl' });
  body.append(el('div', { class: 'ctrl' }, 'clock high for (gate delays) ', s), svg, ctrl, rd);
  function render() {
    svg.innerHTML = '';
    const txt = (x, y, t, o = {}) => svg.append(svgEl('text', { x, y, 'font-size': 12, 'font-weight': 800, fill: '#3c3c3c', ...o }, t));
    const line = (x1, y1, x2, y2, col = '#3c3c3c') => svg.append(svgEl('line', { x1, y1, x2, y2, stroke: col, 'stroke-width': 3, 'stroke-linecap': 'round' }));
    const X = t => 90 + t * 40; // t in gate delays, 0..8
    // clock waveform: low, rising edge at t=1, high for `width`, low again
    txt(10, 44, 'clk');
    line(X(0), 50, X(1), 50); line(X(1), 50, X(1), 20); line(X(1), 20, X(1 + width), 20); line(X(1 + width), 20, X(1 + width), 50); line(X(1 + width), 50, X(8), 50);
    svg.append(svgEl('polygon', { points: `${X(1) - 6},60 ${X(1) + 6},60 ${X(1)},52`, fill: '#ff9600' }));
    txt(X(1), 72, 'rising edge', { 'text-anchor': 'middle', fill: '#ff9600', 'font-size': 11 });
    // latch row: value changes every gate delay while high
    txt(10, 104, 'latch Q');
    txt(10, 144, 'flip-flop Q');
    const base = latchQ - lastLatchSteps, fbase = ffQ - (pulses ? 1 : 0);
    for (let t = 0; t <= 8; t++) {
      let lv, fv;
      if (pulses === 0) { lv = latchQ; fv = ffQ; }
      else {
        lv = t < 1 ? base : Math.min(t, 1 + width - 1) >= 1 ? (base + Math.min(t - 1 + 1, lastLatchSteps)) & 15 : base;
        fv = t < 1 ? fbase : ffQ;
      }
      txt(X(t), 104, String(lv & 15), { 'text-anchor': 'middle', fill: '#ea2b2b', 'font-size': 13 });
      txt(X(t), 144, String(fv & 15), { 'text-anchor': 'middle', fill: '#1899d6', 'font-size': 13 });
    }
    line(X(0), 112, X(8), 112, '#ddd'); line(X(0), 152, X(8), 152, '#ddd');
    txt(X(8) + 6, 104, '←', { fill: '#ea2b2b' }); txt(X(8) + 6, 144, '←', { fill: '#1899d6' });
    ctrl.innerHTML = '';
    ctrl.append(btn('⏱ one clock pulse', () => {
      lastLatchSteps = width; latchQ = (latchQ + width) & 15; ffQ = (ffQ + 1) & 15; pulses++; render(); ctx.onChange();
    }, 'g'), btn('↺ reset', () => { pulses = 0; latchQ = 0; ffQ = 0; lastLatchSteps = 0; render(); ctx.onChange(); }));
    rd.innerHTML = pulses === 0
      ? `Both counters read 0. Apply a pulse.`
      : `After ${pulses} pulse${pulses > 1 ? 's' : ''} (last one high for ${width} gate delays): <b style="color:#ea2b2b">latch-based counter = ${latchQ}</b> (it counted ${lastLatchSteps} times during one pulse: the new value fell straight through the transparent latch, was incremented, fell through again…), <b style="color:#1899d6">flip-flop counter = ${ffQ}</b> (exactly one capture per rising edge).<br><span style="color:#777">A level-sensitive element makes the count depend on gate delays and pulse width. An edge makes it depend on nothing but the number of edges.</span>`;
  }
  s.oninput = () => { width = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ width, pulses, latchQ, ffQ }), solve: () => { width = p.targetWidth ?? 3; s.value = width; lastLatchSteps = width; latchQ = (latchQ + width) & 15; ffQ = (ffQ + 1) & 15; pulses++; render(); ctx.onChange(); } };
};

// ---- shared drawing for the one-node circuit used by superpos and nodal --------------------------------------
// Vs —R1— node A —R2— ground, plus a current source Is injecting into A.
function drawNode(svg, { Vs, R1, R2, Is, V }) {
  svg.innerHTML = '';
  const wire = (x1, y1, x2, y2) => svg.append(svgEl('line', { x1, y1, x2, y2, stroke: '#3c3c3c', 'stroke-width': 3, 'stroke-linecap': 'round' }));
  const txt = (x, y, t, o = {}) => svg.append(svgEl('text', { x, y, 'font-size': 12, 'font-weight': 800, fill: '#3c3c3c', ...o }, t));
  // rails
  wire(60, 40, 130, 40); wire(190, 40, 340, 40); wire(60, 150, 340, 150);
  // battery on the left (x=60): long plate +, short plate −
  wire(60, 40, 60, 82); wire(60, 108, 60, 150);
  wire(44, 86, 76, 86); wire(51, 104, 69, 104);
  txt(30, 90, '+', { fill: '#ea2b2b', 'font-size': 14 }); txt(30, 110, '−', { fill: '#1899d6', 'font-size': 14 });
  txt(60, 128, `Vs = ${fmt(Vs)} V`, { 'text-anchor': 'middle', 'font-size': 11 });
  // R1 horizontal
  svg.append(svgEl('rect', { x: 130, y: 30, width: 60, height: 20, rx: 4, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 2 }));
  txt(160, 22, `R1 = ${fmt(R1)} Ω`, { 'text-anchor': 'middle', 'font-size': 11 });
  // node A
  svg.append(svgEl('circle', { cx: 230, cy: 40, r: 6, fill: '#ff9600' }));
  txt(230, 14, `A: V = ${fmt(V)} V`, { 'text-anchor': 'middle', fill: '#ff9600', 'font-size': 13 });
  // R2 vertical from A to ground rail
  wire(230, 46, 230, 70); svg.append(svgEl('rect', { x: 220, y: 70, width: 20, height: 50, rx: 4, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 2 })); wire(230, 120, 230, 150);
  txt(248, 99, `R2 = ${fmt(R2)} Ω`, { 'font-size': 11 });
  // current source on the right: circle with an upward arrow (injects into the top rail)
  wire(340, 40, 340, 72); wire(340, 118, 340, 150);
  svg.append(svgEl('circle', { cx: 340, cy: 95, r: 23, fill: '#fff', stroke: '#1899d6', 'stroke-width': 3 }));
  svg.append(svgEl('line', { x1: 340, y1: 110, x2: 340, y2: 84, stroke: '#1899d6', 'stroke-width': 3 }));
  svg.append(svgEl('polygon', { points: '340,78 334,88 346,88', fill: '#1899d6' }));
  txt(370, 99, `Is = ${fmt(Is)} A`, { fill: '#1899d6', 'font-size': 11 });
  // ground symbol
  wire(150, 150, 150, 160); wire(138, 160, 162, 160); wire(143, 166, 157, 166); wire(147, 172, 153, 172);
  txt(178, 172, '0 V (ground)', { 'font-size': 11, fill: '#777' });
}

// ---- Day 13: superposition on one node ------------------------------------------------------------------------
W.superpos = (root, p, ctx) => {
  const R1 = p.R1 ?? 2, R2 = p.R2 ?? 2;
  let Vs = p.Vs ?? 10, Is = p.Is ?? 2;
  const body = box(root, 'Superposition: each source alone, then add', 'Drag the two sources. The node voltage from both together is exactly the sum of the two partial answers; the power in R2 is not.');
  const sV = slider(0, 20, 1, Vs), sI = slider(0, 5, 0.5, Is);
  const svg = svgEl('svg', { viewBox: '0 0 460 180', width: 460, height: 180 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'Vs ', sV, ' Is ', sI), svg, rd);
  function render() {
    const Rp = (R1 * R2) / (R1 + R2);
    const Vv = Vs * R2 / (R1 + R2), Vi = Is * Rp, V = Vv + Vi;
    drawNode(svg, { Vs, R1, R2, Is, V });
    const Pv = Vv * Vv / R2, Pi = Vi * Vi / R2, P = V * V / R2;
    rd.innerHTML = `Voltage source alone (current source → open): V = Vs·R2/(R1+R2) = <b>${fmt(Vv)} V</b><br>Current source alone (voltage source → short): V = Is·(R1∥R2) = ${fmt(Is)} × ${fmt(Rp)} = <b>${fmt(Vi)} V</b><br>Both: <b>${fmt(Vv)} + ${fmt(Vi)} = ${fmt(V)} V</b> (check by KCL: (${fmt(Vs)} − ${fmt(V)})/${R1} + ${fmt(Is)} = ${fmt(V)}/${R2})<br><span style="color:#777">Power in R2: partial powers ${fmt(Pv)} W + ${fmt(Pi)} W = ${fmt(Pv + Pi)} W, but the real power is V²/R2 = <b>${fmt(P)} W</b>. Voltages add; squares of sums do not.</span>`;
  }
  sV.oninput = () => { Vs = +sV.value; render(); ctx.onChange(); }; sI.oninput = () => { Is = +sI.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ Vs, Is }), solve: () => { if (p.targetVs !== undefined) { Vs = p.targetVs; sV.value = Vs; } if (p.targetIs !== undefined) { Is = p.targetIs; sI.value = Is; } render(); ctx.onChange(); } };
};

// ---- Day 15: nodal analysis on one node ------------------------------------------------------------------------
W.nodal = (root, p, ctx) => {
  let Vs = p.Vs ?? 10, R1 = p.R1 ?? 2, R2 = p.R2 ?? 3, Is = p.Is ?? 0;
  const body = box(root, 'Nodal analysis: KCL at node A with Ohm\'s law substituted', 'Drag the values. The single unknown is the node voltage V; every branch current is written as (voltage difference)/R, and KCL at A gives one equation.');
  const sV = slider(0, 20, 1, Vs), s1 = slider(1, 10, 1, R1), s2 = slider(1, 10, 1, R2), sI = slider(0, 5, 0.5, Is);
  const svg = svgEl('svg', { viewBox: '0 0 460 180', width: 460, height: 180 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'Vs ', sV, ' R1 ', s1, ' R2 ', s2, ' Is ', sI), svg, rd);
  function render() {
    const V = (Vs / R1 + Is) / (1 / R1 + 1 / R2);
    drawNode(svg, { Vs, R1, R2, Is, V });
    const i1 = (Vs - V) / R1, i2 = V / R2;
    rd.innerHTML = `KCL at A (currents leaving = 0): (V − ${fmt(Vs)})/${R1} + V/${R2} − ${fmt(Is)} = 0<br>Multiply out: V·(1/${R1} + 1/${R2}) = ${fmt(Vs)}/${R1} + ${fmt(Is)} → <b>V = ${fmt(V)} V</b><br><span style="color:#777">Check: ${fmt(i1)} A arrives through R1 and ${fmt(Is)} A from the current source; ${fmt(i2)} A leaves through R2. In = out.</span>`;
  }
  for (const [s, set] of [[sV, v => Vs = v], [s1, v => R1 = v], [s2, v => R2 = v], [sI, v => Is = v]]) s.oninput = () => { set(+s.value); render(); ctx.onChange(); };
  render();
  return { getState: () => ({ Vs, R1, R2, Is }), solve: () => { if (p.targetR2 !== undefined) { R2 = p.targetR2; s2.value = R2; } render(); ctx.onChange(); } };
};

// ---- Day 12: RMS of different waveshapes, and what an averaging meter reads ------------------------------------
// Every shape has the same peak A. Only the average of v² decides the heating, so the rms differs shape by shape.
W.rmsshape = (root, p, ctx) => {
  const A = p.A ?? 100;
  const SHAPES = [
    ['sine', t => Math.sin(2 * Math.PI * t), 'A/√2 = 0.7071 A'],
    ['square', t => (Math.sin(2 * Math.PI * t) >= 0 ? 1 : -1), 'A (it is always at full height)'],
    ['triangle', t => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * t)), 'A/√3 = 0.5774 A'],
    ['sawtooth', t => 2 * (t - Math.floor(t + 0.5)), 'A/√3 = 0.5774 A'],
    ['half-wave sine', t => Math.max(0, Math.sin(2 * Math.PI * t)), 'A/2 (half the cycle contributes nothing)'],
    ['0.5A + sine', t => 0.5 + Math.sin(2 * Math.PI * t), '√(0.25 + 0.5) A = 0.866 A'],
  ];
  let sel = p.shape ?? 0;
  const body = box(root, 'RMS of a waveform: average the square, then take the root', 'Every shape below has the same peak. Pick one: the dashed orange line is its rms, the value a DC supply would need to heat the same resistor.');
  const ctrl = el('div', { class: 'ctrl' });
  const svg = svgEl('svg', { viewBox: '0 0 460 190', width: 460, height: 190 });
  const rd = readout('');
  body.append(ctrl, svg, rd);
  function stats(f) {
    const N = 4000; let s2 = 0, sa = 0, mx = 0;
    for (let i = 0; i < N; i++) { const v = f((i + 0.5) / N); s2 += v * v; sa += Math.abs(v); mx = Math.max(mx, Math.abs(v)); }
    return { ms: s2 / N, mabs: sa / N, peak: mx };
  }
  function render() {
    const [name, f, law] = SHAPES[sel];
    const st = stats(f), rms = Math.sqrt(st.ms) * A, mabs = st.mabs * A;
    svg.innerHTML = '';
    const Y = v => 100 - v / 1.6 * 80;           // v is in units of A
    svg.append(svgEl('line', { x1: 10, y1: Y(0), x2: 450, y2: Y(0), stroke: '#ccc', 'stroke-width': 2 }));
    let d = '';
    for (let i = 0; i <= 440; i++) { const t = (i / 220); d += `${i ? 'L' : 'M'}${10 + i},${Y(f(t))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 10, y1: Y(Math.sqrt(st.ms)), x2: 450, y2: Y(Math.sqrt(st.ms)), stroke: '#ff9600', 'stroke-width': 3, 'stroke-dasharray': '6 4' }));
    svg.append(svgEl('text', { x: 14, y: Y(Math.sqrt(st.ms)) - 6, 'font-size': 11, 'font-weight': 800, fill: '#ff9600' }, `rms = ${fmt(rms, 4)} V`));
    svg.append(svgEl('text', { x: 14, y: Y(1) - 6, 'font-size': 11, 'font-weight': 800, fill: '#1899d6' }, `peak A = ${A} V`));
    svg.append(svgEl('text', { x: 230, y: 182, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, 'two full periods'));
    ctrl.innerHTML = '';
    SHAPES.forEach(([nm], i) => ctrl.append(btn(nm, () => { sel = i; render(); ctx.onChange(); }, i === sel ? 'on' : '')));
    const meter = 1.1107 * mabs;                  // cheap multimeter: rectify, average, scale by the sine form factor
    const err = (meter - rms) / rms * 100;
    rd.innerHTML = `<b>${name}</b>, peak A = ${A} V. Average of v² over one period = <b>${fmt(st.ms * A * A, 5)} V²</b> → rms = √(that) = <b>${fmt(rms, 4)} V</b> = ${fmt(Math.sqrt(st.ms), 4)} A &nbsp;(exact: ${law}).<br>Average of |v| = ${fmt(mabs, 4)} V. A cheap averaging multimeter reports 1.1107 × that = <b>${fmt(meter, 4)} V</b>, which is <b style="color:${Math.abs(err) < 0.5 ? '#58cc02' : '#ea2b2b'}">${err >= 0 ? '+' : ''}${fmt(err, 3)}%</b> off the true rms — it is only right for a sine.`;
  }
  render();
  return { getState: () => ({ shape: sel, name: SHAPES[sel][0] }), solve: () => { sel = p.target ?? 1; render(); ctx.onChange(); } };
};

export {};
