// Widgets added by the day-content agents (one module per agent group so parallel work never collides).
// Each widget: (root, props, ctx) => { getState(), solve() } and MUST implement solve() so tests/e2e.mjs can pass its goals.
import { el, svgEl, mdi, bin } from './utils.js';
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
const toSigned = (v, w) => (v & (1 << (w - 1))) ? v - (1 << w) : v;
const mask = (v, w) => v & ((1 << w) - 1);

// ---------- Day 2 (H): negate = invert + 1, and why: x + ~x is all ones ----------
W.negate = (root, p, ctx) => {
  const w = p.width || 8;
  let x = mask(p.value ?? 10, w), presses = 0;
  const body = box(root, 'Negation: invert every bit, then add 1', 'Tap bits of x. Every column of x + ~x holds exactly one 1, so the sum is all-ones = −1. Adding 1 more gives 0, so ~x + 1 must be −x.');
  const rows = el('div');
  const ctrl = el('div', { class: 'ctrl' });
  const out = readout('');
  body.append(rows, ctrl, out);
  function bitRow(label, val, editable, sub) {
    const r = el('div', { class: 'bits', style: { justifyContent: 'flex-start', marginBottom: '4px' } });
    r.append(el('div', { style: { width: '96px', fontFamily: 'Consolas,monospace', alignSelf: 'center', fontWeight: 800, fontSize: '13px' } }, label));
    for (let i = w - 1; i >= 0; i--) {
      const on = (val >> i) & 1;
      const b = el('div', { class: `bit ${on ? 'on' : ''} ${editable ? '' : 'ro'} ${i === w - 1 ? 'sign' : ''}`, style: { width: '34px', height: '40px', fontSize: '18px' } }, on);
      if (editable) b.onclick = () => { x ^= (1 << i); render(); ctx.onChange(); };
      r.append(b);
    }
    r.append(el('div', { style: { alignSelf: 'center', marginLeft: '10px', fontSize: '13px', color: '#555' }, html: sub }));
    return r;
  }
  function render() {
    const inv = mask(~x, w), neg = mask(inv + 1, w);
    rows.innerHTML = '';
    rows.append(bitRow('x', x, true, `signed <b>${toSigned(x, w)}</b>`));
    rows.append(bitRow('~x (invert)', inv, false, `signed <b>${toSigned(inv, w)}</b>`));
    rows.append(bitRow('x + ~x', mask(x + inv, w), false, `always all-ones = <b>−1</b>`));
    rows.append(bitRow('~x + 1', neg, false, `signed <b>${toSigned(neg, w)}</b> = −x`));
    ctrl.innerHTML = '';
    ctrl.append(btn('negate: x ← ~x + 1', () => { x = neg; presses++; render(); ctx.onChange(); }, 'g'));
    out.innerHTML = `x = ${bin(x, w)} (${toSigned(x, w)}) &nbsp;→&nbsp; ~x = ${bin(inv, w)} &nbsp;→&nbsp; ~x + 1 = <b>${bin(neg, w)}</b> = <b>${toSigned(neg, w)}</b>` +
      `<br><span style="color:#777">Since x + ~x = −1, we get x + (~x + 1) = 0, so ~x + 1 is exactly −x. Press negate twice to come back.</span>` +
      (x === (1 << (w - 1)) ? `<br><span style="color:#ea2b2b">${bin(x, w)} is −${1 << (w - 1)}: negating it gives itself, because +${1 << (w - 1)} does not fit in ${w} signed bits.</span>` : '');
  }
  render();
  return { getState: () => ({ x, presses }), solve: () => { if (p.target !== undefined) { x = mask(p.target, w); render(); ctx.onChange(); } } };
};

// ---------- Day 2 (S): slices are half-open; boundaries live between the boxes ----------
W.slicer = (root, p, ctx) => {
  const xs = p.items || [10, 20, 30, 40, 50, 60];
  const n = xs.length;
  let a = p.a ?? 1, b = p.b ?? 3;
  const body = box(root, 'xs[a:b]: index the boxes, slice the gaps', 'Indices (blue, above) name boxes; slice boundaries (red, top row) name the gaps between boxes. xs[a:b] is every box between gap a and gap b, so its length is b − a.');
  const sa = slider(0, n, 1, a), sb = slider(0, n, 1, b);
  const bw = 50, gap = 8, x0 = 24;
  const width = x0 + n * (bw + gap) + 24;
  const svg = svgEl('svg', { viewBox: `0 0 ${width} 118`, width, height: 118 });
  const out = readout('');
  body.append(el('div', { class: 'ctrl' }, 'a ', sa, ' b ', sb), svg, out);
  function render() {
    svg.innerHTML = '';
    for (let i = 0; i <= n; i++) {
      const gx = x0 + i * (bw + gap) - gap / 2;
      const hot = i === a || i === b;
      svg.append(svgEl('line', { x1: gx, y1: 22, x2: gx, y2: 92, stroke: hot ? '#ea2b2b' : '#ddd', 'stroke-width': hot ? 3 : 1, 'stroke-dasharray': hot ? '' : '3 3' }));
      svg.append(svgEl('text', { x: gx, y: 14, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: hot ? '#ea2b2b' : '#bbb' }, i));
    }
    for (let i = 0; i < n; i++) {
      const bx = x0 + i * (bw + gap);
      const inSlice = i >= a && i < b;
      svg.append(svgEl('rect', { x: bx, y: 44, width: bw, height: 40, rx: 6, fill: inSlice ? '#ffc800' : '#ddf4ff', stroke: inSlice ? '#e5b400' : '#1899d6', 'stroke-width': 2 }));
      svg.append(svgEl('text', { x: bx + bw / 2, y: 69, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: '#3c3c3c' }, xs[i]));
      svg.append(svgEl('text', { x: bx + bw / 2, y: 36, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: '#1899d6' }, i));
      svg.append(svgEl('text', { x: bx + bw / 2, y: 106, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, i - n));
    }
    const sl = b > a ? xs.slice(a, b) : [];
    out.innerHTML = `xs[${a}:${b}] = <b>[${sl.join(', ')}]</b> &nbsp; length = ${b} − ${a} = <b>${Math.max(0, b - a)}</b>${b <= a ? ' (stop ≤ start gives the empty list, never an error)' : ''}` +
      `<br><span style="color:#777">tiling: xs[:${a}] + xs[${a}:${b}] + xs[${b}:] = [${xs.slice(0, a).join(', ')}] + [${sl.join(', ')}] + [${xs.slice(Math.max(a, b)).join(', ')}]${b >= a ? ' = xs' : ''}</span>`;
  }
  sa.oninput = () => { a = +sa.value; render(); ctx.onChange(); };
  sb.oninput = () => { b = +sb.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ a, b }), solve: () => { if (p.target) { [a, b] = p.target; sa.value = a; sb.value = b; render(); ctx.onChange(); } } };
};

// ---------- Day 3 (H): two expressions, one truth table — are they the same function? ----------
W.truthcmp = (root, p, ctx) => {
  const ins = p.inputs, n = ins.length, fns = p.fns, names = p.names || fns.map((_, i) => `f${i + 1}`);
  let state = ins.map(() => 0);
  const visited = new Set();
  const body = box(root, p.title || 'Same function, or not?', p.hint || 'Toggle the inputs. Each combination you try fills one row for every expression. Two expressions are the same circuit exactly when every row agrees.');
  const ctrl = el('div', { class: 'ctrl' });
  const tbl = el('table', { class: 'tbl' });
  const out = readout('');
  body.append(ctrl, tbl, out);
  function render() {
    ctrl.innerHTML = '';
    ins.forEach((nm, i) => ctrl.append(btn(`${nm} = ${state[i]}`, () => { state[i] ^= 1; visited.add(state.join('')); render(); ctx.onChange(); }, state[i] ? 'on' : '')));
    tbl.innerHTML = '';
    tbl.append(el('tr', {}, ...ins.map(x => el('th', {}, x)), ...names.map(x => el('th', {}, x)), el('th', {}, 'agree?')));
    let agreeAll = true, seen = 0;
    for (let k = 0; k < (1 << n); k++) {
      const row = ins.map((_, i) => (k >> (n - 1 - i)) & 1);
      const key = row.join('');
      const cur = key === state.join('');
      const known = visited.has(key) || cur;
      if (known) seen++;
      const vals = fns.map(f => (f(...row) ? 1 : 0));
      const agree = vals.every(v => v === vals[0]);
      if (known && !agree) agreeAll = false;
      tbl.append(el('tr', { style: cur ? { outline: '3px solid #1cb0f6' } : {} }, ...row.map(bt => el('td', {}, bt)),
        ...vals.map(v => el('td', { class: known ? 'ok' : '' }, known ? v : '?')),
        el('td', { style: { fontWeight: 800, color: !known ? '#bbb' : agree ? '#46a302' : '#ea2b2b' } }, !known ? '?' : agree ? '✓' : '✗')));
    }
    out.innerHTML = seen < (1 << n) ? `${seen} of ${1 << n} rows checked. A truth table is only a proof once every row is filled.`
      : agreeAll ? `<b>All ${1 << n} rows agree:</b> the expressions are the same Boolean function, so either can be built and the circuit behaves identically.`
        : `<b>Rows disagree:</b> different functions. One row of disagreement is enough to sink an identity.`;
  }
  visited.add(state.join(''));
  render();
  return { getState: () => ({ visited: visited.size, total: 1 << n }), solve: () => { for (let k = 0; k < (1 << n); k++) visited.add(bin(k, n)); render(); ctx.onChange(); } };
};

// ---------- Day 3 (E): one loop, two sources, two resistors: KVL as a walk that returns home ----------
W.kvlloop = (root, p, ctx) => {
  let V1 = p.V1 ?? 12, V2 = p.V2 ?? 4, R1 = p.R1 ?? 3, R2 = p.R2 ?? 5;
  const body = box(root, "Kirchhoff's voltage law around one loop", 'Walk clockwise from the bottom-left corner. Through a source from − to + you climb; through a resistor along the current you drop I·R. Back at the start the height must be what it was: the terms sum to zero.');
  const s1 = slider(0, 24, 1, V1), s2 = slider(0, 24, 1, V2), r1 = slider(1, 20, 1, R1), r2 = slider(1, 20, 1, R2);
  const svg = svgEl('svg', { viewBox: '0 0 420 190', width: 420, height: 190 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'V1 ', s1, ' V2 ', s2), el('div', { class: 'ctrl' }, 'R1 ', r1, ' R2 ', r2), svg, rd);
  const wire = (x1, y1, x2, y2) => svg.append(svgEl('line', { x1, y1, x2, y2, stroke: '#3c3c3c', 'stroke-width': 3, 'stroke-linecap': 'round' }));
  const txt = (x, y, t, o = {}) => svg.append(svgEl('text', { x, y, 'font-size': 12, 'font-weight': 800, fill: '#3c3c3c', ...o }, t));
  function render() {
    const I = (V1 - V2) / (R1 + R2), VR1 = I * R1, VR2 = I * R2;
    svg.innerHTML = '';
    // loop: left side V1 (+ at top), top R1, right side V2 (+ at top, so it opposes a clockwise current), bottom R2
    wire(70, 40, 160, 40); wire(240, 40, 330, 40);
    wire(70, 150, 160, 150); wire(240, 150, 330, 150);
    wire(70, 40, 70, 84); wire(70, 106, 70, 150);
    wire(330, 40, 330, 84); wire(330, 106, 330, 150);
    // sources: long plate +, short plate −
    wire(56, 88, 84, 88); wire(62, 102, 78, 102);
    wire(316, 88, 344, 88); wire(322, 102, 338, 102);
    txt(44, 92, '+', { fill: '#ea2b2b', 'text-anchor': 'end', 'font-size': 14 }); txt(44, 108, '−', { fill: '#1899d6', 'text-anchor': 'end', 'font-size': 14 });
    txt(356, 92, '+', { fill: '#ea2b2b', 'font-size': 14 }); txt(356, 108, '−', { fill: '#1899d6', 'font-size': 14 });
    txt(20, 70, `V1 = ${V1} V`, { 'text-anchor': 'start', 'font-size': 11 });
    txt(348, 70, `V2 = ${V2} V`, { 'text-anchor': 'start', 'font-size': 11 });
    // resistors
    svg.append(svgEl('rect', { x: 160, y: 30, width: 80, height: 20, rx: 4, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 2 }));
    svg.append(svgEl('rect', { x: 160, y: 140, width: 80, height: 20, rx: 4, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 2 }));
    txt(200, 18, `R1 = ${R1} Ω  drops ${fmt(Math.abs(VR1))} V`, { 'text-anchor': 'middle', 'font-size': 11 });
    txt(200, 178, `R2 = ${R2} Ω  drops ${fmt(Math.abs(VR2))} V`, { 'text-anchor': 'middle', 'font-size': 11 });
    // current arrow on the top-left wire
    const cw = I >= 0;
    svg.append(svgEl('polygon', { points: cw ? '128,34 140,40 128,46' : '112,34 100,40 112,46', fill: '#1cb0f6' }));
    txt(105, 60, `I = ${fmt(I)} A ${cw ? '(clockwise)' : '(anticlockwise!)'}`, { 'text-anchor': 'middle', fill: '#1899d6', 'font-size': 11 });
    // KVL sum inside the loop
    txt(200, 84, `+${V1} − ${fmt(I)}·${R1} − ${V2} − ${fmt(I)}·${R2}`, { 'text-anchor': 'middle', 'font-size': 12, fill: '#555' });
    txt(200, 104, `= ${fmt(V1 - VR1 - V2 - VR2, 2)}  (must be 0)`, { 'text-anchor': 'middle', 'font-size': 12, fill: '#46a302' });
    const pV1 = -V1 * I, pV2 = V2 * I, pR1 = I * I * R1, pR2 = I * I * R2;
    rd.innerHTML = `KVL: V1 − I·R1 − V2 − I·R2 = 0 → I = (V1 − V2)/(R1 + R2) = (${V1} − ${V2})/(${R1} + ${R2}) = <b>${fmt(I)} A</b>${I < 0 ? ' (negative: the real current is anticlockwise, V2 is the stronger source)' : ''}` +
      `<br>Powers (passive sign convention, arrow into +): V1 <b>${fmt(pV1)} W</b>, V2 <b>${fmt(pV2)} W</b>, R1 <b>${fmt(pR1)} W</b>, R2 <b>${fmt(pR2)} W</b>; sum = <b>${fmt(pV1 + pV2 + pR1 + pR2, 2)}</b>` +
      `<br><span style="color:#777">Negative = delivering, positive = absorbing. ${pV2 > 0 ? 'V2 absorbs: current is being pushed into its + terminal, so it is being charged.' : pV2 < 0 ? 'V2 delivers: it is the stronger source and drives the loop.' : ''}</span>`;
  }
  const upd = () => { V1 = +s1.value; V2 = +s2.value; R1 = +r1.value; R2 = +r2.value; render(); ctx.onChange(); };
  s1.oninput = s2.oninput = r1.oninput = r2.oninput = upd;
  render();
  return { getState: () => ({ V1, V2, R1, R2 }), solve: () => { render(); ctx.onChange(); } };
};

// ---------- Day 4 (E): the voltage divider, derived from one shared current ----------
W.vdiv = (root, p, ctx) => {
  let Vs = p.Vs ?? 10, R1 = p.R1 ?? 1000, R2 = p.R2 ?? 1000;
  const body = box(root, 'Voltage divider: one current, two resistors', 'Only one path exists, so R1 and R2 carry the identical current I = Vs/(R1 + R2). Each resistor then takes I·R of the supply: the voltages split in the ratio of the resistances.');
  const sV = slider(1, 24, 1, Vs), s1 = slider(100, 5000, 100, R1), s2 = slider(100, 5000, 100, R2);
  const svg = svgEl('svg', { viewBox: '0 0 400 190', width: 400, height: 190 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'Vs ', sV, ' R1 ', s1, ' R2 ', s2), svg, rd);
  const wire = (x1, y1, x2, y2) => svg.append(svgEl('line', { x1, y1, x2, y2, stroke: '#3c3c3c', 'stroke-width': 3, 'stroke-linecap': 'round' }));
  const txt = (x, y, t, o = {}) => svg.append(svgEl('text', { x, y, 'font-size': 12, 'font-weight': 800, fill: '#3c3c3c', ...o }, t));
  function render() {
    const I = Vs / (R1 + R2), V1 = I * R1, V2 = I * R2, frac = R2 / (R1 + R2);
    svg.innerHTML = '';
    wire(70, 30, 200, 30); wire(70, 30, 70, 84); wire(70, 106, 70, 160); wire(70, 160, 200, 160);
    wire(56, 88, 84, 88); wire(62, 102, 78, 102);
    txt(44, 92, '+', { fill: '#ea2b2b', 'text-anchor': 'end', 'font-size': 14 }); txt(44, 108, '−', { fill: '#1899d6', 'text-anchor': 'end', 'font-size': 14 });
    txt(20, 70, `Vs = ${Vs} V`, { 'font-size': 11 });
    wire(200, 30, 200, 44); wire(200, 84, 200, 106); wire(200, 146, 200, 160);
    svg.append(svgEl('rect', { x: 188, y: 44, width: 24, height: 40, rx: 4, fill: '#ddf4ff', stroke: '#1899d6', 'stroke-width': 2 }));
    svg.append(svgEl('rect', { x: 188, y: 106, width: 24, height: 40, rx: 4, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 2 }));
    txt(222, 60, `R1 = ${R1} Ω`, { 'font-size': 11, fill: '#1899d6' }); txt(222, 76, `V1 = I·R1 = ${fmt(V1)} V`, { 'font-size': 11, fill: '#1899d6' });
    txt(222, 122, `R2 = ${R2} Ω`, { 'font-size': 11, fill: '#ea2b2b' }); txt(222, 138, `V2 = I·R2 = ${fmt(V2)} V`, { 'font-size': 11, fill: '#ea2b2b' });
    svg.append(svgEl('circle', { cx: 200, cy: 95, r: 5, fill: '#ffc800', stroke: '#e5b400', 'stroke-width': 2 }));
    wire(205, 95, 250, 95);
    txt(256, 99, `Vout = ${fmt(V2)} V`, { 'font-size': 12, fill: '#e5b400' });
    svg.append(svgEl('polygon', { points: '128,24 140,30 128,36', fill: '#1cb0f6' }));
    txt(135, 18, `I = ${fmt(I * 1000)} mA`, { 'text-anchor': 'middle', fill: '#1899d6', 'font-size': 11 });
    txt(200, 182, `V1 + V2 = ${fmt(V1 + V2, 4)} V = Vs  (KVL)`, { 'text-anchor': 'middle', 'font-size': 11, fill: '#555' });
    rd.innerHTML = `I = Vs/(R1 + R2) = ${Vs}/${R1 + R2} = <b>${fmt(I * 1000)} mA</b> through both. &nbsp; Vout = I·R2 = Vs·R2/(R1 + R2) = ${Vs} × ${R2}/${R1 + R2} = <b>${fmt(V2, 4)} V</b> = ${fmt(frac * 100)} % of Vs` +
      `<br><span style="color:#777">V2/V1 = R2/R1 = ${fmt(R2 / R1)}: the bigger resistor takes the bigger share, because the current is the same and V = I·R.</span>`;
  }
  const upd = () => { Vs = +sV.value; R1 = +s1.value; R2 = +s2.value; render(); ctx.onChange(); };
  sV.oninput = s1.oninput = s2.oninput = upd;
  render();
  return { getState: () => ({ Vs, R1, R2, ratio: R2 / (R1 + R2) }), solve: () => { if (p.target) { R1 = p.target.R1; R2 = p.target.R2; s1.value = R1; s2.value = R2; render(); ctx.onChange(); } } };
};

// ---------- Day 3 (H): any truth table becomes one AND-OR circuit (sum of products) ----------
W.sop = (root, p, ctx) => {
  const ins = p.inputs || ['A', 'B'], n = ins.length, N = 1 << n;
  let out = p.out ? p.out.slice() : Array(N).fill(0);
  const body = box(root, p.title || 'Any truth table becomes one AND-OR circuit',
    p.hint || 'Click the numbers in the out column to draw whatever function you want. Every row you set to 1 contributes one AND term; OR those terms together and the circuit matches your column exactly.');
  const tbl = el('table', { class: 'tbl' });
  const rd = readout('');
  body.append(tbl, rd);
  const rowBits = k => ins.map((_, i) => (k >> (n - 1 - i)) & 1);
  const term = k => rowBits(k).map((b, i) => (b ? ins[i] : '¬' + ins[i])).join('·');
  function render() {
    tbl.innerHTML = '';
    tbl.append(el('tr', {}, ...ins.map(x => el('th', {}, x)), el('th', {}, 'out'), el('th', {}, 'AND term for this row')));
    for (let k = 0; k < N; k++) {
      tbl.append(el('tr', {}, ...rowBits(k).map(b => el('td', {}, b)),
        el('td', { style: { cursor: 'pointer', fontWeight: 800, color: out[k] ? '#46a302' : '#bbb' }, onClick: () => { out[k] ^= 1; render(); ctx.onChange(); } }, out[k]),
        el('td', { style: { fontFamily: 'Consolas,monospace', color: out[k] ? '#3c3c3c' : '#ddd' } }, term(k))));
    }
    const ones = [];
    for (let k = 0; k < N; k++) if (out[k]) ones.push(term(k));
    rd.innerHTML = !ones.length ? 'Every row is 0, so the output is always 0. No gates at all: tie the wire low.'
      : ones.length === N ? 'Every row is 1, so the output is always 1. No gates at all: tie the wire high.'
        : `<b>out = ${ones.join('  +  ')}</b>` +
          `<br><span style="color:#777">Cost: ${ones.length} AND gate${ones.length > 1 ? 's' : ''} of ${n} inputs, one OR gate of ${ones.length} input${ones.length > 1 ? 's' : ''}, plus a NOT for each barred input. Read straight off the table, with no cleverness — which is exactly why AND, OR and NOT can build anything.</span>`;
  }
  render();
  return { getState: () => ({ out: out.join(''), ones: out.filter(Boolean).length }), solve: () => { if (p.target) { out = p.target.slice(); render(); ctx.onChange(); } } };
};

// ---------- Day 3 (S): a list keeps duplicates, a set does not ----------
W.setops = (root, p, ctx) => {
  const A = p.A || [3, 1, 4, 1, 5], B = p.B || [1, 5, 9, 2, 5];
  const OPS = [['|', 'A | B', 'in A or in B'], ['&', 'A & B', 'in both'], ['-', 'A - B', 'in A but not in B'], ['^', 'A ^ B', 'in exactly one of them']];
  let op = p.op || '|';
  const body = box(root, 'Lists keep repeats, sets do not', 'Building a set from a list quietly throws the repeats away, because a set stores each value in one place only. Pick an operation and see which values survive.');
  const ctrl = el('div', { class: 'ctrl' });
  const rd = readout('');
  body.append(ctrl, rd);
  const uniq = xs => [...new Set(xs)];
  function render() {
    ctrl.innerHTML = '';
    for (const [k, label] of OPS) ctrl.append(btn(label, () => { op = k; render(); ctx.onChange(); }, op === k ? 'on' : ''));
    const sa = uniq(A), sb = uniq(B);
    const res = op === '|' ? uniq([...sa, ...sb])
      : op === '&' ? sa.filter(x => sb.includes(x))
        : op === '-' ? sa.filter(x => !sb.includes(x))
          : [...sa.filter(x => !sb.includes(x)), ...sb.filter(x => !sa.includes(x))];
    const meaning = (OPS.find(o => o[0] === op) || [])[2];
    const drop = (xs, s) => xs.length - s.length;
    rd.innerHTML = `A = [${A.join(', ')}] &nbsp;→&nbsp; set(A) = {${sa.join(', ')}} <span style="color:#777">(${drop(A, sa)} repeat${drop(A, sa) === 1 ? '' : 's'} dropped)</span>` +
      `<br>B = [${B.join(', ')}] &nbsp;→&nbsp; set(B) = {${sb.join(', ')}} <span style="color:#777">(${drop(B, sb)} repeat${drop(B, sb) === 1 ? '' : 's'} dropped)</span>` +
      `<br><br><b>set(A) ${op} set(B) = {${res.slice().sort((x, y) => x - y).join(', ')}}</b> <span style="color:#777">— every value ${meaning}</span>`;
  }
  render();
  return { getState: () => ({ op }), solve: () => { op = p.target || '&'; render(); ctx.onChange(); } };
};

// ---------- Day 4 (H): the 2-to-1 mux, gate by gate ----------
W.muxsel = (root, p, ctx) => {
  let s = p.s ?? 0, a = p.a ?? 1, b = p.b ?? 0;
  const visited = new Set();
  const body = box(root, '2-to-1 mux, gate by gate', 'Flip the three inputs. One AND gate is switched off by the select bit, the other passes its data bit through, and the OR just collects whichever survived. Try all 8 combinations.');
  const ctrl = el('div', { class: 'ctrl' });
  const svg = svgEl('svg', { viewBox: '0 0 460 225', width: 460, height: 225 });
  const rd = readout('');
  body.append(ctrl, svg, rd);
  const ON = '#46a302', OFF = '#bbb';
  const line = (x1, y1, x2, y2, v) => svg.append(svgEl('line', { x1, y1, x2, y2, stroke: v ? ON : OFF, 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
  const gate = (x, y, w, h, label) => {
    svg.append(svgEl('rect', { x, y, width: w, height: h, rx: 8, fill: '#ddf4ff', stroke: '#1899d6', 'stroke-width': 2 }));
    svg.append(svgEl('text', { x: x + w / 2, y: y + h / 2 + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, fill: '#1899d6' }, label));
  };
  const txt = (x, y, t, o = {}) => svg.append(svgEl('text', { x, y, 'font-size': 11, 'font-weight': 800, fill: '#3c3c3c', ...o }, t));
  function render() {
    visited.add(`${s}${a}${b}`);
    ctrl.innerHTML = '';
    ctrl.append(btn(`s = ${s}`, () => { s ^= 1; render(); ctx.onChange(); }, s ? 'on' : ''));
    ctrl.append(btn(`a = ${a}`, () => { a ^= 1; render(); ctx.onChange(); }, a ? 'on' : ''));
    ctrl.append(btn(`b = ${b}`, () => { b ^= 1; render(); ctx.onChange(); }, b ? 'on' : ''));
    const ns = s ^ 1, t1 = ns & a, t2 = s & b, y = t1 | t2;
    svg.innerHTML = '';
    line(30, 32, 70, 32, s); gate(70, 16, 44, 32, 'NOT');
    line(114, 32, 175, 72, ns);
    line(30, 92, 175, 92, a);
    line(50, 32, 50, 150, s); line(50, 150, 175, 150, s);
    svg.append(svgEl('circle', { cx: 50, cy: 32, r: 3.5, fill: '#3c3c3c' }));
    line(30, 172, 175, 172, b);
    gate(175, 55, 70, 50, 'AND'); gate(175, 135, 70, 50, 'AND'); gate(320, 95, 70, 50, 'OR');
    line(245, 80, 320, 108, t1);
    line(245, 160, 320, 132, t2);
    line(390, 120, 435, 120, y);
    txt(14, 24, `s = ${s}`, { 'text-anchor': 'start' });
    txt(14, 84, `a = ${a}`, { 'text-anchor': 'start' });
    txt(14, 164, `b = ${b}`, { 'text-anchor': 'start' });
    txt(120, 22, `NOT s = ${ns}`, { 'text-anchor': 'start', fill: '#1899d6' });
    txt(210, 120, `NOT s AND a = ${t1}`, { 'text-anchor': 'middle', fill: '#777' });
    txt(210, 202, `s AND b = ${t2}`, { 'text-anchor': 'middle', fill: '#777' });
    txt(412, 108, `Y = ${y}`, { 'text-anchor': 'middle', 'font-size': 13, fill: y ? ON : '#777' });
    rd.innerHTML = `s = ${s}, so the ${s ? 'lower' : 'upper'} AND gate is enabled and the other is forced to 0. Y = ${t1} + ${t2} = <b>${y}</b>, which is <b>${s ? 'b' : 'a'}</b>.` +
      `<br><span style="color:#777">${visited.size} of 8 input combinations tried. A gate that has one input at 0 can only output 0, whatever the other input does — that is how the select bit switches a whole branch off.</span>`;
  }
  render();
  return { getState: () => ({ s, a, b, visited: visited.size }), solve: () => { for (let k = 0; k < 8; k++) visited.add(bin(k, 3)); render(); ctx.onChange(); } };
};

// ---------- Day 4 (S): step a loop and watch the columns change ----------
W.whileloop = (root, p, ctx) => {
  const rows = p.rows || [], header = p.header || [];
  let step = 0;
  const body = box(root, p.title || 'Step the loop, one pass at a time', p.hint || 'Press Step and read the table. Watch the column that marches towards the stop condition: that is what makes the loop end.');
  const pre = el('pre', {}, p.code || '');
  const ctrl = el('div', { class: 'ctrl' });
  const tbl = el('table', { class: 'tbl' });
  const rd = readout('');
  body.append(pre, ctrl, tbl, rd);
  function render() {
    ctrl.innerHTML = '';
    ctrl.append(btn('Step', () => { if (step < rows.length) step++; render(); ctx.onChange(); }, 'g'));
    ctrl.append(btn('Run to the end', () => { step = rows.length; render(); ctx.onChange(); }));
    ctrl.append(btn('Reset', () => { step = 0; render(); ctx.onChange(); }));
    tbl.innerHTML = '';
    tbl.append(el('tr', {}, ...header.map(h => el('th', {}, h))));
    for (let i = 0; i < step; i++) tbl.append(el('tr', { style: i === step - 1 ? { outline: '3px solid #1cb0f6' } : {} }, ...rows[i].map(c => el('td', {}, c))));
    rd.innerHTML = step === 0 ? 'Nothing has run yet. Press Step.'
      : step < rows.length ? `${step} of ${rows.length} passes done.`
        : `<b>Finished after ${rows.length} pass${rows.length === 1 ? '' : 'es'}.</b> <span style="color:#777">${p.note || ''}</span>`;
  }
  render();
  return { getState: () => ({ step, total: rows.length }), solve: () => { step = rows.length; render(); ctx.onChange(); } };
};

export {};
