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

// ---- local bit helpers (group 2: days 5, 6, 8) ----
const mask = (v, w) => v & ((1 << w) - 1);
const toSigned = (v, w) => (v & (1 << (w - 1))) ? v - (1 << w) : v;
const bin = (v, w) => (v >>> 0).toString(2).padStart(w, '0');
function bitRow(label, val, w, opts) {
  const r = el('div', { class: 'bits', style: { justifyContent: 'flex-start', marginBottom: '6px' } });
  r.append(el('div', { style: { width: '56px', fontFamily: 'Consolas,monospace', alignSelf: 'center', fontWeight: 800 } }, label));
  for (let i = w - 1; i >= 0; i--) {
    const on = (val >> i) & 1;
    const dropped = opts.droppedFrom !== undefined && i >= opts.droppedFrom;
    const b = el('div', { class: `bit ${on ? 'on' : ''} ${opts.signBit === i ? 'sign' : ''} ${opts.editable ? '' : 'ro'}`, style: { width: '34px', height: '42px', fontSize: '18px', opacity: dropped ? .55 : 1, borderStyle: dropped ? 'dashed' : 'solid' } }, on);
    if (opts.editable) b.onclick = () => opts.setter(val ^ (1 << i));
    r.append(b);
  }
  return r;
}

// ---- Day 6 · Ripple-carry timing: when does each carry settle? ----
// Model: a column with equal bits (11 generates, 00 kills) settles its carry-out one full-adder delay after the
// inputs arrive, whatever the carry-in does. A column with different bits (01 / 10) propagates: its carry-out is a
// copy of its carry-in, so it settles one delay AFTER the carry-in settles. The carry into bit 0 is known at t = 0.
W.ripple = (root, p, ctx) => {
  const w = p.width || 8;
  let a = mask(p.a ?? 0xFF, w), b = mask(p.b ?? 1, w);
  const body = box(root, 'Ripple-carry timing: when does each carry settle?', 'Tap bits of A and B. A column of 11 generates and 00 kills (settled after 1 full-adder delay); a column of 01 or 10 propagates and must wait for the carry from its right. The tallest bar is the adder\'s delay.');
  const grid = el('div');
  const svg = svgEl('svg', { viewBox: '0 0 470 150', width: 470, height: 150 });
  const rd = readout('');
  body.append(grid, svg, rd);
  function timing() {
    const t = [], kind = []; let prev = 0;
    for (let i = 0; i < w; i++) {
      const ai = (a >> i) & 1, bi = (b >> i) & 1;
      const cur = ai === bi ? 1 : prev + 1;
      kind.push(ai === bi ? (ai ? 'G' : 'K') : 'P'); t.push(cur); prev = cur;
    }
    return { t, kind };
  }
  function render() {
    grid.innerHTML = '';
    grid.append(bitRow('A', a, w, { editable: true, setter: v => { a = v; render(); ctx.onChange(); } }));
    grid.append(bitRow('B', b, w, { editable: true, setter: v => { b = v; render(); ctx.onChange(); } }));
    const sum = a + b, wrapped = mask(sum, w), cout = sum >> w;
    grid.append(bitRow('SUM', wrapped, w, { editable: false }));
    const { t, kind } = timing();
    const depth = Math.max(...t);
    svg.innerHTML = '';
    const colW = 440 / w, axisY = 108;
    svg.append(svgEl('line', { x1: 20, y1: axisY, x2: 460, y2: axisY, stroke: '#3c3c3c', 'stroke-width': 2 }));
    for (let i = 0; i < w; i++) {
      const col = w - 1 - i, x = 20 + col * colW;
      const h = t[i] / w * 84;
      const colour = kind[i] === 'P' ? '#ff9600' : kind[i] === 'G' ? '#1cb0f6' : '#bbb';
      svg.append(svgEl('rect', { x: x + 6, y: axisY - h, width: colW - 12, height: h, rx: 4, fill: colour }));
      svg.append(svgEl('text', { x: x + colW / 2, y: axisY - h - 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: '#3c3c3c' }, `t=${t[i]}`));
      svg.append(svgEl('text', { x: x + colW / 2, y: axisY + 14, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, `c${i + 1}`));
      svg.append(svgEl('text', { x: x + colW / 2, y: axisY + 28, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: colour }, kind[i]));
    }
    svg.append(svgEl('text', { x: 20, y: 146, 'font-size': 10, fill: '#777' }, 'c(i+1) = carry out of bit i. G generate, K kill, P propagate. Height = full-adder delays until settled.'));
    rd.innerHTML = `A = ${a}, B = ${b} → ${w}-bit sum <b>${wrapped}</b>, carry-out <b>${cout}</b><br>longest carry chain: <b>${depth}</b> full-adder delay${depth === 1 ? '' : 's'} of a possible ${w}${depth === w ? ' <span style="color:#ea2b2b">⚠ worst case: the carry ripples through every stage</span>' : depth === 1 ? ' ✓ best case: every column settles on its own' : ''}`;
  }
  render();
  return { getState: () => ({ a, b, depth: Math.max(...timing().t) }), solve: () => { a = (1 << w) - 1; b = 1; render(); ctx.onChange(); } };
};

// ---- Day 5 · Truncation: which wide values survive being narrowed? ----
W.truncate = (root, p, ctx) => {
  const from = p.from || 12, to = p.to || 8;
  let v = mask(p.value ?? 0b111111110110, from), signed = p.signed !== false;
  const body = box(root, `Truncating ${from} bits to ${to}: what gets dropped?`, 'Tap bits of the wide value. The dashed bits are thrown away. Signed: safe only if every dropped bit equals the new sign bit. Unsigned: safe only if every dropped bit is 0.');
  const grid = el('div'); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(grid, ctrl, rd);
  function state() {
    const narrow = mask(v, to);
    const dropped = v >> to, newSign = (narrow >> (to - 1)) & 1;
    const safe = signed ? dropped === (newSign ? (1 << (from - to)) - 1 : 0) : dropped === 0;
    return { narrow, dropped, newSign, safe };
  }
  function render() {
    grid.innerHTML = '';
    grid.append(bitRow(`${from}-bit`, v, from, { editable: true, droppedFrom: to, signBit: signed ? from - 1 : undefined, setter: x => { v = x; render(); ctx.onChange(); } }));
    const s = state();
    grid.append(bitRow(`${to}-bit`, s.narrow, to, { editable: false, signBit: signed ? to - 1 : undefined }));
    ctrl.innerHTML = '';
    ctrl.append(btn(signed ? 'interpreting: SIGNED' : 'interpreting: UNSIGNED', () => { signed = !signed; render(); ctx.onChange(); }, 'on'));
    const wideVal = signed ? toSigned(v, from) : v, narrowVal = signed ? toSigned(s.narrow, to) : s.narrow;
    rd.innerHTML = `wide: ${bin(v, from)} = <b>${wideVal}</b> &nbsp; dropped bits: <b>${bin(s.dropped, from - to)}</b> &nbsp; new top bit: <b>${s.newSign}</b><br>narrow: ${bin(s.narrow, to)} = <b>${narrowVal}</b> ${s.safe ? '<span style="color:#46a302">✓ same value: nothing was lost</span>' : `<span style="color:#ea2b2b">✗ value changed (${wideVal} → ${narrowVal}): the dropped bits carried information</span>`}`;
  }
  render();
  return { getState: () => ({ v, signed, ...state() }), solve: () => { v = signed ? mask(v ^ (1 << (from - 1)), from) : mask(v | (1 << (from - 1)), from); render(); ctx.onChange(); } };
};

// ---- Day 6 · Secant slopes closing in on the tangent (the derivative as a limit) ----
W.secant = (root, p, ctx) => {
  const f = p.f || (x => x * x + 3 * x + 2), df = p.df || (x => 2 * x + 3), label = p.label || 'f(x) = x² + 3x + 2';
  let x0 = p.x0 ?? 1, h = p.h ?? 1;
  const body = box(root, 'The derivative is the limit of secant slopes', 'Slide h towards 0. The orange secant through (x, f(x)) and (x + h, f(x + h)) tilts towards the dashed tangent; its slope settles on f′(x).');
  const sx = slider(-4, 2, 0.1, x0), sh = slider(0.01, 2, 0.01, h);
  const svg = svgEl('svg', { viewBox: '0 0 460 220', width: 460, height: 220 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'x = ', sx, ' h = ', sh), svg, rd);
  const X = x => 230 + x * 50, Y = y => 190 - y * 20;
  function render() {
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 10, y1: Y(0), x2: 450, y2: Y(0), stroke: '#999' })); svg.append(svgEl('line', { x1: X(0), y1: 5, x2: X(0), y2: 215, stroke: '#999' }));
    for (let x = -4; x <= 4; x++) svg.append(svgEl('text', { x: X(x), y: Y(0) + 14, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, x));
    let d = ''; for (let i = 0; i <= 200; i++) { const x = -4.4 + i / 200 * 8.8; d += `${i ? 'L' : 'M'}${X(x)},${Y(f(x))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    const y0 = f(x0), y1 = f(x0 + h), m = (y1 - y0) / h, mt = df(x0);
    svg.append(svgEl('line', { x1: X(x0 - 2), y1: Y(y0 - 2 * mt), x2: X(x0 + 2), y2: Y(y0 + 2 * mt), stroke: '#777', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
    svg.append(svgEl('line', { x1: X(x0 - 2), y1: Y(y0 - 2 * m), x2: X(x0 + 2), y2: Y(y0 + 2 * m), stroke: '#ff9600', 'stroke-width': 3 }));
    svg.append(svgEl('circle', { cx: X(x0), cy: Y(y0), r: 6, fill: '#ff4b4b' }));
    svg.append(svgEl('circle', { cx: X(x0 + h), cy: Y(y1), r: 5, fill: '#ff9600', stroke: '#fff', 'stroke-width': 1.5 }));
    rd.innerHTML = `${label} &nbsp; at x = ${fmt(x0)}, h = ${fmt(h)}<br>secant slope = [f(${fmt(x0 + h, 4)}) − f(${fmt(x0)})] / ${fmt(h)} = (${fmt(y1, 5)} − ${fmt(y0, 5)}) / ${fmt(h)} = <b>${fmt(m, 5)}</b><br>tangent slope f′(${fmt(x0)}) = 2·${fmt(x0)} + 3 = <b>${fmt(mt, 5)}</b> &nbsp; gap = ${fmt(Math.abs(m - mt), 3)} ${Math.abs(m - mt) < 0.05 ? '<span style="color:#46a302">✓ within 0.05: the secant has practically become the tangent</span>' : ''}`;
  }
  sx.oninput = () => { x0 = +sx.value; render(); ctx.onChange(); }; sh.oninput = () => { h = +sh.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ x0, h }), solve: () => { h = 0.01; sh.value = h; render(); ctx.onChange(); } };
};

// ---- Day 8 · Riemann sum: rectangles under a curve ----
W.riemann = (root, p, ctx) => {
  const f = p.f || (x => x * x + 3 * x + 2), a = p.a ?? 0, b = p.b ?? 1, exact = p.exact ?? 23 / 6, label = p.label || 'f(x) = x² + 3x + 2';
  let n = p.n ?? 4, side = 'left';
  const body = box(root, 'The integral is the limit of rectangle sums', 'Slide n. Each rectangle is f(x) × Δx. Left rectangles undershoot a rising curve and right rectangles overshoot; both squeeze onto the exact area as n grows.');
  const sn = slider(1, 64, 1, n);
  const ctrl = el('div', { class: 'ctrl' });
  const svg = svgEl('svg', { viewBox: '0 0 460 200', width: 460, height: 200 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'n = ', sn), ctrl, svg, rd);
  const X = x => 40 + (x - a) / (b - a) * 380, Y = y => 180 - y * 25;
  function render() {
    svg.innerHTML = '';
    const dx = (b - a) / n; let sum = 0;
    for (let i = 0; i < n; i++) {
      const x0 = a + i * dx, xs = side === 'left' ? x0 : x0 + dx, y = f(xs); sum += y * dx;
      svg.append(svgEl('rect', { x: X(x0), y: Y(y), width: X(x0 + dx) - X(x0), height: Y(0) - Y(y), fill: '#d7ffb8', stroke: '#58cc02', 'stroke-width': 1 }));
    }
    let d = ''; for (let i = 0; i <= 100; i++) { const x = a + i / 100 * (b - a); d += `${i ? 'L' : 'M'}${X(x)},${Y(f(x))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 30, y1: Y(0), x2: 440, y2: Y(0), stroke: '#999' })); svg.append(svgEl('line', { x1: X(a), y1: 5, x2: X(a), y2: 190, stroke: '#999' }));
    [a, (a + b) / 2, b].forEach(x => svg.append(svgEl('text', { x: X(x), y: 195, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, fmt(x))));
    ctrl.innerHTML = ''; ctrl.append(btn(side === 'left' ? 'rectangles: LEFT edge' : 'rectangles: RIGHT edge', () => { side = side === 'left' ? 'right' : 'left'; render(); ctx.onChange(); }, 'on'));
    rd.innerHTML = `${label} on [${a}, ${b}], n = <b>${n}</b> rectangles of width Δx = ${fmt(dx, 4)}<br>${side} sum = Σ f(x) · Δx = <b>${fmt(sum, 5)}</b> &nbsp; exact ∫ = ${fmt(exact, 5)} &nbsp; error = ${fmt(Math.abs(sum - exact), 3)}${Math.abs(sum - exact) < 0.05 ? ' <span style="color:#46a302">✓ within 0.05</span>' : ''}`;
  }
  sn.oninput = () => { n = +sn.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ n, side }), solve: () => { n = 64; sn.value = n; render(); ctx.onChange(); } };
};

// ---- Day 5 · Thévenin: a two-terminal network is a straight line on the V–I plane ----
W.viline = (root, p, ctx) => {
  const Vs = p.Vs ?? 10, R1 = p.R1 ?? 1000, R2 = p.R2 ?? 1000;
  let RL = p.RL ?? 1000;
  const Vth = Vs * R2 / (R1 + R2), Rth = R1 * R2 / (R1 + R2), Isc = Vth / Rth;
  const body = box(root, 'What the load sees: the terminal V–I line', `Every point the ${Vs} V, ${R1} Ω / ${R2} Ω divider can offer its load lies on one straight line from the open-circuit voltage to the short-circuit current. Slide the load: where the load's own line V = I·R_L crosses it is the operating point.`);
  const sL = slider(50, 10000, 50, RL);
  const svg = svgEl('svg', { viewBox: '0 0 460 210', width: 460, height: 210 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'R_L (Ω) ', sL), svg, rd);
  const X = i => 50 + i / Isc * 370, Y = v => 170 - v / Vth * 140;
  function render() {
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 50, y1: 170, x2: 440, y2: 170, stroke: '#3c3c3c', 'stroke-width': 2 }));
    svg.append(svgEl('line', { x1: 50, y1: 170, x2: 50, y2: 20, stroke: '#3c3c3c', 'stroke-width': 2 }));
    svg.append(svgEl('text', { x: 445, y: 174, 'font-size': 11, fill: '#3c3c3c', 'text-anchor': 'start' }, 'I'));
    svg.append(svgEl('text', { x: 50, y: 14, 'font-size': 11, fill: '#3c3c3c', 'text-anchor': 'middle' }, 'V'));
    svg.append(svgEl('text', { x: 50, y: 186, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, '0'));
    svg.append(svgEl('text', { x: X(Isc), y: 186, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, `Isc = ${fmt(Isc * 1000, 4)} mA`));
    svg.append(svgEl('text', { x: 44, y: Y(Vth) + 4, 'font-size': 10, fill: '#777', 'text-anchor': 'end' }, `Voc = ${fmt(Vth, 4)} V`));
    svg.append(svgEl('line', { x1: X(0), y1: Y(Vth), x2: X(Isc), y2: Y(0), stroke: '#1cb0f6', 'stroke-width': 3 }));
    const I = Vth / (Rth + RL), V = I * RL;
    const iEnd = Math.min(Isc, Vth / RL);
    svg.append(svgEl('line', { x1: X(0), y1: Y(0), x2: X(iEnd), y2: Y(iEnd * RL), stroke: '#ff9600', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
    svg.append(svgEl('circle', { cx: X(I), cy: Y(V), r: 6, fill: '#ff4b4b' }));
    svg.append(svgEl('text', { x: 250, y: 205, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, 'blue: the network, V = Vth − Rth·I · orange: the load, V = I·R_L'));
    rd.innerHTML = `Vth = Voc = ${Vs}·${R2}/(${R1}+${R2}) = <b>${fmt(Vth, 4)} V</b> &nbsp; Isc = ${Vs}/${R1} = <b>${fmt(Isc * 1000, 4)} mA</b> &nbsp; Rth = Voc/Isc = <b>${fmt(Rth, 4)} Ω</b><br>R_L = ${RL} Ω: I = Vth/(Rth + R_L) = <b>${fmt(I * 1000, 4)} mA</b>, V = I·R_L = <b>${fmt(V, 4)} V</b> (${fmt(100 * V / Vth, 3)} % of the unloaded value)`;
  }
  sL.oninput = () => { RL = +sL.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ RL, V: Vth * RL / (Rth + RL) }), solve: () => { RL = 100; sL.value = RL; render(); ctx.onChange(); } };
};

export {};
