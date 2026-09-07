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

// ---------- Day 10 H: quantity × price against a limit, at 32 bits or at full width ----------
W.notional = (root, p, ctx) => {
  const cases = p.cases || [
    { name: 'small order', qty: 10, price: 1000, limit: 1000000 },
    { name: 'biggest possible', qty: 65535, price: 4294967295, limit: 281474976710655 },
    { name: '100 @ 50,000,000', qty: 100, price: 50000000, limit: 1000000000 },
    { name: '3000 @ 2,000,000', qty: 3000, price: 2000000, limit: 5000000000 },
  ];
  let idx = 0, full = false;
  const body = box(root, 'Check quantity × price against a limit', 'The product of a 16-bit quantity and a 32-bit price needs 48 bits. Try each order with a 32-bit result register, then with the full 48-bit one.');
  const pick = el('div', { class: 'ctrl' }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(pick, ctrl, rd);
  const M32 = 4294967296n;
  function decide(c) {
    const prod = BigInt(c.qty) * BigInt(c.price);
    const kept = prod % M32;
    return { prod, kept, fullOK: prod <= BigInt(c.limit), keptOK: kept <= BigInt(c.limit) };
  }
  function render() {
    const c = cases[idx], d = decide(c);
    pick.innerHTML = '';
    cases.forEach((x, i) => pick.append(btn(x.name, () => { idx = i; render(); ctx.onChange(); }, i === idx ? 'on' : '')));
    ctrl.innerHTML = '';
    ctrl.append(btn(full ? 'result register: 48 bits (full)' : 'result register: 32 bits (truncated)', () => { full = !full; render(); ctx.onChange(); }, 'g'));
    const ok = full ? d.fullOK : d.keptOK;
    const shown = full ? d.prod : d.kept;
    rd.innerHTML = `quantity <b>${c.qty}</b> × price <b>${c.price}</b><br>` +
      `true product = <b>${d.prod}</b> (needs ${d.prod.toString(2).length} bits)<br>` +
      `low 32 bits kept = <b>${d.kept}</b><br>` +
      `limit = ${c.limit}<br>` +
      `compared value = <b>${shown}</b> → <b class="${ok ? 'ok' : 'bad'}">${ok ? 'ACCEPT' : 'REJECT'}</b>` +
      (d.fullOK !== d.keptOK ? `<br><span style="color:#ea2b2b;font-weight:800">⚠ the two widths disagree: truncation ${d.keptOK ? 'lets an over-limit order through' : 'blocks a legal order'}</span>` : '<br><span style="color:#777">both widths agree on this order</span>');
  }
  render();
  return {
    getState: () => { const d = decide(cases[idx]); return { idx, full, disagree: d.fullOK !== d.keptOK }; },
    solve: () => { idx = cases.findIndex(c => { const d = decide(c); return d.fullOK !== d.keptOK; }); if (idx < 0) idx = 0; full = false; render(); ctx.onChange(); }
  };
};

// ---------- Day 10 M: Pascal's triangle, C(n,k) and the two parents ----------
W.pascal = (root, p, ctx) => {
  const rows = p.rows || 8, target = p.target || null;
  let sel = p.sel || null;
  const body = box(root, "Pascal's triangle: every entry is C(n, k)", 'Click an entry. It equals the two entries above it, because an item is either in your chosen group or not.');
  const grid = el('div', { style: { textAlign: 'center', lineHeight: '1.9', marginBottom: '6px' } });
  const rd = readout('');
  body.append(grid, rd);
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
  function render() {
    grid.innerHTML = '';
    for (let n = 0; n < rows; n++) {
      const row = el('div', { style: { whiteSpace: 'nowrap' } });
      for (let k = 0; k <= n; k++) {
        const on = sel && sel[0] === n && sel[1] === k;
        const parent = sel && sel[0] === n + 1 && (sel[1] === k || sel[1] === k + 1);
        row.append(el('button', {
          class: 'wbtn', type: 'button',
          style: { minWidth: '46px', margin: '2px', padding: '4px 6px', background: on ? '#58cc02' : parent ? '#ffc800' : '', color: on ? '#fff' : '' },
          onClick: () => { sel = [n, k]; render(); ctx.onChange(); }
        }, C(n, k)));
      }
      grid.append(row);
    }
    if (!sel) { rd.innerHTML = 'Click any entry to see which count it is.'; return; }
    const [n, k] = sel;
    const above = n > 0 ? `C(${n - 1}, ${k - 1}) + C(${n - 1}, ${k}) = ${k > 0 ? C(n - 1, k - 1) : 0} + ${k < n ? C(n - 1, k) : 0} = ${C(n, k)}` : 'top of the triangle: the empty set, one way';
    rd.innerHTML = `row <b>${n}</b>, position <b>${k}</b> → <b>C(${n}, ${k}) = ${C(n, k)}</b> ways to choose ${k} items from ${n}<br>` +
      `the two entries above: ${above}<br><span style="color:#777">row ${n} adds up to 2^${n} = ${2 ** n}: every item is in or out.</span>`;
  }
  render();
  return { getState: () => ({ n: sel ? sel[0] : -1, k: sel ? sel[1] : -1 }), solve: () => { sel = target || [rows - 1, 1]; render(); ctx.onChange(); } };
};

// ---------- Day 10 E: how long an RC charge takes to reach a chosen percentage ----------
W.rctime = (root, p, ctx) => {
  let R = p.R ?? 1000, C = p.C ?? 1, pct = p.pct ?? 63;
  const V = p.V ?? 5;
  const body = box(root, 'How long to reach a given percentage?', 'Set the target percentage. The time is t = −τ·ln(1 − f), so 63 % takes one τ and 90 % takes 2.303 τ.');
  const sR = slider(100, 10000, 100, R), sC = slider(0.1, 5, 0.1, C), sP = slider(5, 99, 1, pct);
  const svg = svgEl('svg', { viewBox: '0 0 460 190', width: 460, height: 190 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'R (Ω) ', sR, ' C (µF) ', sC), el('div', { class: 'ctrl' }, 'target % ', sP), svg, rd);
  function render() {
    const tau = R * C * 1e-6, f = pct / 100, t = -tau * Math.log(1 - f), tmax = Math.max(t * 1.6, tau * 5);
    svg.innerHTML = '';
    const X = s => 40 + s / tmax * 400, Y = v => 160 - v * 140;
    svg.append(svgEl('line', { x1: 40, y1: 160, x2: 445, y2: 160, stroke: '#999' }));
    svg.append(svgEl('line', { x1: 40, y1: 12, x2: 40, y2: 160, stroke: '#999' }));
    svg.append(svgEl('line', { x1: 40, y1: Y(1), x2: 445, y2: Y(1), stroke: '#ccc', 'stroke-dasharray': '4 3' }));
    svg.append(svgEl('text', { x: 44, y: Y(1) - 4, 'font-size': 10, fill: '#777' }, `V = ${V} V (100 %)`));
    let d = '';
    for (let i = 0; i <= 200; i++) { const s = i / 200 * tmax; d += `${i ? 'L' : 'M'}${X(s)},${Y(1 - Math.exp(-s / tau))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: X(t), y1: Y(f), x2: X(t), y2: 160, stroke: '#ff9600', 'stroke-dasharray': '3 3' }));
    svg.append(svgEl('circle', { cx: X(t), cy: Y(f), r: 5, fill: '#ff9600' }));
    svg.append(svgEl('text', { x: Math.min(X(t) + 8, 300), y: Y(f) - 8, 'font-size': 12, 'font-weight': 800, fill: '#ff9600' }, `${pct} % at ${fmt(t * 1e3)} ms`));
    svg.append(svgEl('text', { x: 44, y: 26, 'font-size': 11, fill: '#777' }, `τ = ${fmt(tau * 1e3)} ms`));
    rd.innerHTML = `τ = R·C = ${R} Ω × ${C} µF = <b>${fmt(tau * 1e3)} ms</b><br>` +
      `t = −τ·ln(1 − ${(f).toFixed(2)}) = ${fmt(-Math.log(1 - f))} τ = <b>${fmt(t * 1e3)} ms</b><br>` +
      `voltage there = ${fmt(V * f)} V of ${V} V`;
  }
  sR.oninput = () => { R = +sR.value; render(); ctx.onChange(); };
  sC.oninput = () => { C = +sC.value; render(); ctx.onChange(); };
  sP.oninput = () => { pct = +sP.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ R, C, pct }), solve: () => { pct = p.goalPct ?? 90; sP.value = pct; render(); ctx.onChange(); } };
};

// ---------- Day 11 H: fixed-point multiply, rescale, and the rounding policy ----------
W.fxmul = (root, p, ctx) => {
  let a = p.a ?? 384, b = p.b ?? 512, f = p.f ?? 8, mode = p.mode || 'floor';
  const body = box(root, 'Fixed-point multiply and rescale', 'Both inputs are integers at scale 2^f. Their product is at scale 2^2f, so it must be divided back once. The rounding policy decides the last bit.');
  const sa = slider(-2048, 2048, 1, a), sb = slider(-2048, 2048, 1, b), sf = slider(0, 10, 1, f);
  const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'a ', sa, ' b ', sb), el('div', { class: 'ctrl' }, 'fraction bits f ', sf), ctrl, rd);
  const MODES = [['floor', 'floor (shift right)'], ['trunc', 'truncate toward zero'], ['nearest', 'nearest, ties away from 0'], ['even', 'nearest, ties to even']];
  function rescale(prod, s, m) {
    const q = Math.floor(prod / s), r = prod - q * s;
    if (m === 'floor') return q;
    if (m === 'trunc') return prod >= 0 ? Math.trunc(prod / s) : -Math.trunc(-prod / s);
    if (2 * r > s) return q + 1;
    if (2 * r < s) return q;
    if (m === 'nearest') return prod > 0 ? q + 1 : q;
    return q % 2 === 0 ? q : q + 1;
  }
  function render() {
    const s = 2 ** f, prod = a * b, exact = prod / s, out = rescale(prod, s, mode);
    ctrl.innerHTML = '';
    MODES.forEach(([m, label]) => ctrl.append(btn(label, () => { mode = m; render(); ctx.onChange(); }, mode === m ? 'on' : '')));
    rd.innerHTML = `a = ${a} → real ${fmt(a / s, 6)} &nbsp; b = ${b} → real ${fmt(b / s, 6)} &nbsp; (scale 2^${f} = ${s})<br>` +
      `a × b = <b>${prod}</b>, and that integer is at scale ${s} × ${s} = <b>${s * s}</b><br>` +
      `divide back by ${s}: exact answer ${fmt(exact, 8)} → stored <b>${out}</b> (real ${fmt(out / s, 6)})<br>` +
      `error from the rounding = <b>${fmt(out - exact, 4)}</b> LSB`;
  }
  sa.oninput = () => { a = +sa.value; render(); ctx.onChange(); };
  sb.oninput = () => { b = +sb.value; render(); ctx.onChange(); };
  sf.oninput = () => { f = +sf.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ a, b, f, mode }), solve: () => { mode = p.goalMode || 'nearest'; render(); ctx.onChange(); } };
};

// ---------- Day 11 E: y = steady state + decaying part ----------
W.odeparts = (root, p, ctx) => {
  let a = p.a ?? 2, b = p.b ?? 4, y0 = p.y0 ?? 0, parts = false;
  const body = box(root, 'dy/dt + a·y = b: one flat piece plus one decaying piece', 'The flat piece is the value that makes dy/dt zero. The decaying piece is whatever is left over at t = 0, shrinking as e^(−a·t).');
  const sa = slider(0.5, 5, 0.5, a), sb = slider(0, 10, 0.5, b), sy = slider(-4, 8, 0.5, y0);
  const ctrl = el('div', { class: 'ctrl' });
  const svg = svgEl('svg', { viewBox: '0 0 460 190', width: 460, height: 190 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'a ', sa, ' b ', sb), el('div', { class: 'ctrl' }, 'y(0) ', sy), ctrl, svg, rd);
  function render() {
    const yss = b / a, Cc = y0 - yss, tau = 1 / a;
    const lo = Math.min(-1, yss - 1, y0 - 1), hi = Math.max(1, yss + 1, y0 + 1);
    const X = t => 34 + t / 4 * 410, Y = y => 165 - (y - lo) / (hi - lo) * 145;
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 34, y1: Y(0), x2: 448, y2: Y(0), stroke: '#999' }));
    svg.append(svgEl('line', { x1: 34, y1: 8, x2: 34, y2: 168, stroke: '#999' }));
    for (let t = 1; t <= 4; t++) svg.append(svgEl('text', { x: X(t), y: 182, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, `${t}s`));
    svg.append(svgEl('line', { x1: 34, y1: Y(yss), x2: 448, y2: Y(yss), stroke: '#ffc800', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
    svg.append(svgEl('text', { x: 300, y: Y(yss) - 6, 'font-size': 11, fill: '#c79000', 'font-weight': 800 }, `steady piece b/a = ${fmt(yss)}`));
    if (parts) {
      let dh = '';
      for (let i = 0; i <= 200; i++) { const t = i / 50; dh += `${i ? 'L' : 'M'}${X(t)},${Y(Cc * Math.exp(-a * t))} `; }
      svg.append(svgEl('path', { d: dh, fill: 'none', stroke: '#ce82ff', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
      svg.append(svgEl('text', { x: 40, y: Y(Cc) - 6, 'font-size': 11, fill: '#9b45e4', 'font-weight': 800 }, `decaying piece ${fmt(Cc)}·e^(−${a}t)`));
    }
    let d = '';
    for (let i = 0; i <= 200; i++) { const t = i / 50; d += `${i ? 'L' : 'M'}${X(t)},${Y(yss + Cc * Math.exp(-a * t))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    ctrl.innerHTML = '';
    ctrl.append(btn(parts ? 'hide the two pieces' : 'show the two pieces', () => { parts = !parts; render(); ctx.onChange(); }, parts ? 'on' : 'g'));
    rd.innerHTML = `y(t) = ${fmt(yss)} + (${fmt(y0)} − ${fmt(yss)})·e^(−${a}t) = <b>${fmt(yss)} ${Cc < 0 ? '−' : '+'} ${fmt(Math.abs(Cc))}e^(−${a}t)</b><br>` +
      `time constant τ = 1/a = <b>${fmt(tau)} s</b>; after one τ the decaying piece has lost 63 % of its size<br>` +
      `check: dy/dt = ${fmt(-a * Cc)}e^(−${a}t) and a·y = ${fmt(b)} + ${fmt(a * Cc)}e^(−${a}t); they add to ${fmt(b)} = b ✓`;
  }
  sa.oninput = () => { a = +sa.value; render(); ctx.onChange(); };
  sb.oninput = () => { b = +sb.value; render(); ctx.onChange(); };
  sy.oninput = () => { y0 = +sy.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ a, b, y0, parts }), solve: () => { a = p.goalA ?? a; sa.value = a; parts = true; render(); ctx.onChange(); } };
};

export {};
