// Widgets added by the day-content agents (one module per agent group so parallel work never collides).
// Each widget: (root, props, ctx) => { getState(), solve() } and MUST implement solve() so tests/e2e.mjs can pass its goals.
import { el, svgEl, mdi, rng } from './utils.js';
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
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

// =====================================================================================================
// Day 23 (group 7): pipelines, sample variance, AC power
// =====================================================================================================

// ---- Space-time picture of a pipeline: rows = items, columns = cycles, cell = stage occupied ----
W.pipegantt = (root, p, ctx) => {
  const S = p.stages || 4, T = p.cycles || 14;
  let stallAt = p.stallAt ?? 6, stallLen = p.stallLen ?? 3;
  const body = box(root, `${S}-stage pipeline: where every item is, every cycle`, 'Rows are items, columns are clock cycles, the number in a cell is the stage the item sits in during that cycle. Move the sink stall and watch latency (cells per row) stretch while the source still enters one item per cycle.');
  const sa = slider(0, T - 1, 1, stallAt), sl = slider(0, 8, 1, stallLen);
  const svg = svgEl('svg', { viewBox: `0 0 ${110 + T * 30} 60`, width: 110 + T * 30, height: 60 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'stall starts at cycle ', sa, ' stall length ', sl), svg, rd);
  function simulate() {
    let stages = Array(S).fill(null), next = 1; const items = [];
    for (let t = 0; t < T; t++) {
      const sinkReady = !(t >= stallAt && t < stallAt + stallLen);
      stages.forEach((it, i) => { if (it) items[it.id - 1].pos[t] = i + 1; });
      const canAdvance = Array(S).fill(false); let nextFree = sinkReady;
      for (let i = S - 1; i >= 0; i--) { canAdvance[i] = stages[i] === null ? true : nextFree; nextFree = stages[i] === null || canAdvance[i]; }
      if (stages[S - 1] !== null && sinkReady) items[stages[S - 1].id - 1].out = t;
      const ns = Array(S).fill(null);
      for (let i = S - 1; i >= 0; i--) {
        if (stages[i] === null) continue;
        if (i === S - 1) { if (!sinkReady) ns[i] = stages[i]; }
        else if (canAdvance[i]) ns[i + 1] = stages[i]; else ns[i] = stages[i];
      }
      if (ns[0] === null && (stages[0] === null || canAdvance[0])) { ns[0] = { id: next }; items.push({ id: next, pos: {}, out: null }); next++; }
      stages = ns;
    }
    return items;
  }
  function render() {
    const items = simulate().filter(it => Object.keys(it.pos).length);
    const rows = Math.min(items.length, 12);
    const H = 40 + rows * 24 + 34;
    svg.setAttribute('viewBox', `0 0 ${110 + T * 30} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
    const cols = ['#1cb0f6', '#58cc02', '#ff9600', '#ce82ff', '#ff4b4b', '#2b70c9'];
    for (let t = 0; t < T; t++) {
      const stalled = t >= stallAt && t < stallAt + stallLen;
      if (stalled) svg.append(svgEl('rect', { x: 60 + t * 30, y: 26, width: 30, height: rows * 24 + 8, fill: '#ffdfe0' }));
      svg.append(svgEl('text', { x: 75 + t * 30, y: 18, 'text-anchor': 'middle', 'font-size': 10, fill: stalled ? '#ea2b2b' : '#777', 'font-weight': stalled ? 800 : 400 }, stalled ? `${t}✖` : `${t}`));
    }
    svg.append(svgEl('text', { x: 8, y: 18, 'font-size': 10, fill: '#777' }, 'cycle →'));
    let delivered = 0, maxLat = 0, minLat = 99;
    items.forEach((it, r) => {
      const y = 30 + r * 24;
      const lat = Object.keys(it.pos).length;
      if (it.out !== null) { delivered++; maxLat = Math.max(maxLat, lat); minLat = Math.min(minLat, lat); }
      if (r >= rows) return;
      svg.append(svgEl('text', { x: 50, y: y + 16, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 800, fill: '#3c3c3c' }, `#${it.id}`));
      for (const [t, s] of Object.entries(it.pos)) {
        const x = 62 + (+t) * 30;
        svg.append(svgEl('rect', { x, y: y + 2, width: 26, height: 20, rx: 4, fill: cols[(s - 1) % cols.length], opacity: 0.85 }));
        svg.append(svgEl('text', { x: x + 13, y: y + 16, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: '#fff' }, s));
      }
      svg.append(svgEl('text', { x: 70 + T * 30, y: y + 16, 'font-size': 11, fill: it.out !== null ? '#46a302' : '#aaa', 'font-weight': 800 }, it.out !== null ? `${lat} cyc` : 'inside'));
    });
    svg.append(svgEl('text', { x: 8, y: H - 8, 'font-size': 10, fill: '#777' }, `red columns: sink ready = 0. Right column: latency = cells in the row.`));
    rd.innerHTML = `no stall: every row is exactly <b>${S}</b> cells (latency ${S}). With this stall: delivered <b>${delivered}</b> items in ${T} cycles; latency ranges <b>${delivered ? minLat : '–'} … ${delivered ? maxLat : '–'}</b> cycles.<br><span style="color:#777">Throughput stays 1 item/cycle whenever the sink takes; only the stalled cycles are lost. Latency is per item and depends on what happened while it was inside.</span>`;
  }
  sa.oninput = () => { stallAt = +sa.value; render(); ctx.onChange(); }; sl.oninput = () => { stallLen = +sl.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ stallAt, stallLen }), solve: () => { stallLen = 3; sl.value = 3; render(); ctx.onChange(); } };
};

// ---- Why n − 1: enumerate every sample from a tiny population and average both estimators ----
W.bessel = (root, p, ctx) => {
  const pops = [[1, 2, 3], [0, 4], [2, 4, 6, 8], [1, 1, 5]]; let pi = p.pop ?? 0, n = p.n ?? 2;
  const body = box(root, 'Why n − 1: try every possible sample', 'A tiny population whose true variance you can compute. Take every sample of size n (drawing with replacement), compute Σ(x − x̄)² ÷ n and ÷ (n − 1) for each, then average over all samples. One of the two lands exactly on the truth.');
  const ctrl = el('div', { class: 'ctrl' }); const tbl = el('div', { style: { overflowX: 'auto' } }); const rd = readout('');
  body.append(ctrl, tbl, rd);
  function render() {
    const pop = pops[pi], mu = mean(pop), sigma2 = mean(pop.map(x => (x - mu) ** 2));
    let tuples = [[]]; for (let k = 0; k < n; k++) tuples = tuples.flatMap(t => pop.map(x => [...t, x]));
    let sN = 0, sN1 = 0; const rows = [];
    for (const t of tuples) { const m = mean(t), ss = t.reduce((a, x) => a + (x - m) ** 2, 0); sN += ss / n; sN1 += ss / (n - 1); rows.push([t, m, ss]); }
    const avgN = sN / tuples.length, avgN1 = sN1 / tuples.length;
    ctrl.innerHTML = '';
    pops.forEach((pp, i) => ctrl.append(btn(`population {${pp.join(', ')}}`, () => { pi = i; render(); ctx.onChange(); }, i === pi ? 'on' : '')));
    [2, 3].forEach(k => ctrl.append(btn(`n = ${k}`, () => { n = k; render(); ctx.onChange(); }, k === n ? 'on' : '')));
    const shown = rows.slice(0, 9);
    tbl.innerHTML = `<table style="font-family:Consolas,monospace;font-size:13px;border-collapse:collapse"><tr><th style="padding:2px 8px">sample</th><th style="padding:2px 8px">x̄</th><th style="padding:2px 8px">Σ(x−x̄)²</th><th style="padding:2px 8px">÷ n</th><th style="padding:2px 8px">÷ (n−1)</th></tr>` +
      shown.map(([t, m, ss]) => `<tr><td style="padding:2px 8px">(${t.join(', ')})</td><td style="padding:2px 8px">${fmt(m)}</td><td style="padding:2px 8px">${fmt(ss)}</td><td style="padding:2px 8px">${fmt(ss / n)}</td><td style="padding:2px 8px">${fmt(ss / (n - 1))}</td></tr>`).join('') +
      (rows.length > 9 ? `<tr><td colspan="5" style="padding:2px 8px;color:#777">… ${rows.length} samples in all</td></tr>` : '') + '</table>';
    rd.innerHTML = `true population variance σ² = <b>${fmt(sigma2)}</b> (mean ${fmt(mu)}, deviations measured from the true mean)<br>average of "÷ n" over all ${rows.length} samples = <b style="color:#ea2b2b">${fmt(avgN)}</b> = σ² × (n−1)/n: too small, every time<br>average of "÷ (n−1)" over all samples = <b style="color:#46a302">${fmt(avgN1)}</b> = σ² ✓<br><span style="color:#777">Deviations from the sample's own mean are always a little smaller than deviations from the true mean (the sample mean is the point that minimises them). Dividing by n − 1 instead of n exactly undoes that shrinkage.</span>`;
  }
  render();
  return { getState: () => ({ pi, n }), solve: () => { n = 3; render(); ctx.onChange(); } };
};

// ---- Instantaneous AC power p(t) = v(t)·i(t) with a phase angle: watch energy slosh back ----
W.acpower = (root, p, ctx) => {
  let phi = p.phi ?? 37;
  const body = box(root, 'Instantaneous power p(t) = v(t) · i(t)', 'Slide the phase angle φ between current and voltage (or pick a load). Green: energy flowing into the load. Red: energy flowing back out to the supply. The average of p(t) is the real power; the sloshing part is the reactive power.');
  const s = slider(0, 90, 1, phi); const ctrl = el('div', { class: 'ctrl' });
  const svg = svgEl('svg', { viewBox: '0 0 480 210', width: 480, height: 210 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'φ = ', s), ctrl, svg, rd);
  function render() {
    const ph = phi * Math.PI / 180, X = th => 30 + th / (2 * Math.PI) * 430, Y0 = 110, sc = 70;
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 30, y1: Y0, x2: 460, y2: Y0, stroke: '#999' }));
    [0, 0.5, 1, 1.5, 2].forEach(k => svg.append(svgEl('text', { x: X(k * Math.PI), y: 200, 'text-anchor': 'middle', 'font-size': 10, fill: '#777' }, k === 0 ? '0' : `${k}π`)));
    let pos = `M${X(0)},${Y0}`, neg = `M${X(0)},${Y0}`, vd = '', id = '';
    for (let i = 0; i <= 200; i++) {
      const th = i / 200 * 2 * Math.PI, v = Math.sin(th), c = Math.sin(th - ph), pw = v * c;
      pos += ` L${X(th)},${Y0 - Math.max(pw, 0) * sc}`; neg += ` L${X(th)},${Y0 - Math.min(pw, 0) * sc}`;
      vd += `${i ? 'L' : 'M'}${X(th)},${Y0 - v * sc * 0.6} `; id += `${i ? 'L' : 'M'}${X(th)},${Y0 - c * sc * 0.6} `;
    }
    svg.append(svgEl('path', { d: pos + ` L${X(2 * Math.PI)},${Y0} Z`, fill: '#58cc02', opacity: 0.35 }));
    svg.append(svgEl('path', { d: neg + ` L${X(2 * Math.PI)},${Y0} Z`, fill: '#ff4b4b', opacity: 0.45 }));
    svg.append(svgEl('path', { d: vd, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 2 }));
    svg.append(svgEl('path', { d: id, fill: 'none', stroke: '#ff9600', 'stroke-width': 2, 'stroke-dasharray': '5 3' }));
    const Pavg = 0.5 * Math.cos(ph);
    svg.append(svgEl('line', { x1: 30, y1: Y0 - Pavg * sc, x2: 460, y2: Y0 - Pavg * sc, stroke: '#46a302', 'stroke-width': 2, 'stroke-dasharray': '3 3' }));
    svg.append(svgEl('text', { x: 34, y: 16, 'font-size': 11, fill: '#1cb0f6', 'font-weight': 800 }, 'v(t)'));
    svg.append(svgEl('text', { x: 74, y: 16, 'font-size': 11, fill: '#ff9600', 'font-weight': 800 }, 'i(t)'));
    svg.append(svgEl('text', { x: 108, y: 16, 'font-size': 11, fill: '#46a302', 'font-weight': 800 }, 'p(t) = v·i, dashed line = its average'));
    ctrl.innerHTML = '';
    [['resistor (φ = 0°)', 0], ['motor, pf 0.8 (φ ≈ 37°)', 37], ['pure inductor (φ = 90°)', 90]].forEach(([n, v]) => ctrl.append(btn(n, () => { phi = v; s.value = v; render(); ctx.onChange(); }, phi === v ? 'on' : '')));
    const back = phi / 180; // fraction of each half-cycle during which power flows back
    rd.innerHTML = `φ = <b>${phi}°</b>, power factor cos φ = <b>${fmt(Math.cos(ph))}</b><br>average power P = V_rms·I_rms·cos φ = <b>${fmt(Math.cos(ph))}</b> × V_rms·I_rms &nbsp; reactive Q = V_rms·I_rms·sin φ = <b>${fmt(Math.sin(ph))}</b> × V_rms·I_rms<br><span style="color:#777">Power flows back to the supply for ${fmt(back * 100, 3)}% of each half-cycle. At 90° the green and red areas are equal: energy goes in and comes straight back out, the wires carry full current, and no work is done.</span>`;
  }
  s.oninput = () => { phi = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ phi }), solve: () => { phi = 90; s.value = 90; render(); ctx.onChange(); } };
};

// =====================================================================================================
// Day 24 (group 7): elastic register trace, Little's law picture
// =====================================================================================================

// ---- Elastic register: one cycle at a time, with the combinational outputs shown before the edge ----
W.elastic = (root, p, ctx) => {
  let bypass = !!p.bypass, state = null, t = 0, nextId = 1, inV = 1, outR = 1, log = [], pushes = 0, pops = 0, sawBoth = false;
  const body = box(root, 'Elastic register, one cycle at a time', 'Choose what the source and sink do this cycle (in_valid, out_ready), read the outputs the register computes from its state and those inputs, then clock. A transfer happens on a side only when valid and ready are both 1 there.');
  const view = el('div', { class: 'queue', style: { marginBottom: '8px' } }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(view, ctrl, rd);
  function comb() {
    const full = state !== null;
    let outValid, outItem, inReady, pop, push, passThrough = false;
    if (!bypass) { outValid = full ? 1 : 0; outItem = state; pop = full && outR === 1; inReady = (!full || pop) ? 1 : 0; push = inV === 1 && inReady === 1; }
    else {
      outValid = (full || inV === 1) ? 1 : 0; outItem = full ? state : (inV === 1 ? `D${nextId}` : null);
      pop = outValid === 1 && outR === 1; inReady = (!full || pop) ? 1 : 0; push = inV === 1 && inReady === 1; passThrough = !full && push && pop;
    }
    let next = state;
    if (full) next = pop ? (push ? `D${nextId}` : null) : state;
    else next = push ? (passThrough ? null : `D${nextId}`) : null;
    return { full, outValid, outItem, inReady, pop, push, passThrough, next };
  }
  function step() {
    const c = comb();
    if (c.push) pushes++; if (c.pop) pops++;
    if (c.full && c.push && c.pop) sawBoth = true;
    log.push(`t${t}: in_valid=${inV} in_ready=${c.inReady} ${c.push ? '<b>push D' + nextId + '</b>' : 'no push'} | out_valid=${c.outValid} out_ready=${outR} ${c.pop ? '<b>pop ' + c.outItem + '</b>' : 'no pop'}${c.passThrough ? ' (bypassed straight through)' : ''} → state ${c.next ?? 'empty'}`);
    if (c.push) nextId++;
    state = c.next; t++;
  }
  function render() {
    const c = comb();
    view.innerHTML = '';
    view.append(el('div', { class: 'slot', style: { background: '#eee', color: '#777', borderStyle: 'solid' } }, inV ? `D${nextId}` : '·'), el('span', { style: { color: '#777' } }, '→'),
      el('div', { class: `slot ${state ? 'full' : ''}` }, state || ''), el('span', { style: { color: '#777' } }, '→'),
      el('div', { class: 'slot', style: { background: outR ? '#d7ffb8' : '#ffdfe0', borderStyle: 'solid' } }, c.outItem && outR ? c.outItem : (outR ? 'sink' : 'stall')),
      el('span', { class: 'mono', style: { marginLeft: '10px', fontSize: '13px' } }, `this cycle: in_ready=${c.inReady}  out_valid=${c.outValid}  ${c.push ? 'PUSH' : '—'} / ${c.pop ? 'POP' : '—'}`));
    ctrl.innerHTML = '';
    ctrl.append(btn(`in_valid = ${inV}`, () => { inV ^= 1; render(); }, inV ? 'on' : ''), btn(`out_ready = ${outR}`, () => { outR ^= 1; render(); }, outR ? 'on' : ''),
      btn('⏱ clock', () => { step(); render(); ctx.onChange(); }, 'g'), btn(bypass ? 'bypass: ON' : 'bypass: off', () => { bypass = !bypass; render(); ctx.onChange(); }, bypass ? 'on' : ''),
      btn('↺ reset', () => { state = null; t = 0; nextId = 1; log = []; pushes = 0; pops = 0; sawBoth = false; render(); ctx.onChange(); }, 'r'));
    const occ = state === null ? 0 : 1;
    rd.innerHTML = `pushes accepted <b>${pushes}</b> − pops delivered <b>${pops}</b> = <b>${pushes - pops}</b>; occupancy <b>${occ}</b> ${pushes - pops === occ ? '✓ conserved' : '✖ an item was lost or duplicated'}` + (log.length ? `<br><span style="color:#777">${log.slice(-4).join('<br>')}</span>` : '<br><span style="color:#777">no cycles yet</span>');
  }
  render();
  return { getState: () => ({ t, pushes, pops, occ: state === null ? 0 : 1, sawBoth, bypass }), solve: () => { bypass = false; state = null; t = 0; nextId = 1; log = []; pushes = 0; pops = 0; sawBoth = false; inV = 1; outR = 1; step(); step(); inV = 0; step(); render(); ctx.onChange(); } };
};

// ---- Little's law from the arrivals/departures staircase ----
W.arrivals = (root, p, ctx) => {
  let gap = p.gap ?? 2, w = p.w ?? 5;
  const body = box(root, "Little's law is an area", 'Blue staircase: cumulative arrivals A(t). Green: cumulative departures D(t). At any moment the vertical gap is how many items are inside; for any item the horizontal gap is how long it stayed; the area between the curves is the total item-cycles. Divide that area by the time and you get the average number inside; divide it by the number of items and you get the average stay.');
  const sg = slider(1, 6, 1, gap), sw = slider(1, 12, 1, w);
  const svg = svgEl('svg', { viewBox: '0 0 480 190', width: 480, height: 190 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'one arrival every ', sg, ' cycles; each item stays ', sw, ' cycles'), svg, rd);
  function render() {
    const N = 6, arr = Array.from({ length: N }, (_, i) => i * gap), dep = arr.map(a => a + w), T = dep[N - 1];
    const X = t => 40 + t / T * 420, Y = k => 160 - k / N * 130;
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 40, y1: 160, x2: 465, y2: 160, stroke: '#999' })); svg.append(svgEl('line', { x1: 40, y1: 160, x2: 40, y2: 20, stroke: '#999' }));
    for (let k = 0; k <= N; k++) svg.append(svgEl('text', { x: 34, y: Y(k) + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#777' }, k));
    svg.append(svgEl('text', { x: 465, y: 176, 'text-anchor': 'end', 'font-size': 10, fill: '#777' }, `t = ${T} cycles`));
    // shaded area between the staircases
    let area = '';
    for (let k = 0; k < N; k++) area += `M${X(arr[k])},${Y(k)} L${X(arr[k])},${Y(k + 1)} L${X(dep[k])},${Y(k + 1)} L${X(dep[k])},${Y(k)} Z `;
    svg.append(svgEl('path', { d: area, fill: '#ffc800', opacity: 0.35 }));
    const stair = (ts, col) => { let d = `M${X(0)},${Y(0)}`; ts.forEach((tk, k) => { d += ` L${X(tk)},${Y(k)} L${X(tk)},${Y(k + 1)}`; }); d += ` L${X(T)},${Y(N)}`; svg.append(svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': 3 })); };
    stair(arr, '#1cb0f6'); stair(dep, '#46a302');
    svg.append(svgEl('text', { x: 48, y: 16, 'font-size': 11, fill: '#1cb0f6', 'font-weight': 800 }, 'A(t) arrivals'));
    svg.append(svgEl('text', { x: 140, y: 16, 'font-size': 11, fill: '#46a302', 'font-weight': 800 }, 'D(t) departures'));
    svg.append(svgEl('text', { x: 260, y: 16, 'font-size': 11, fill: '#b58900', 'font-weight': 800 }, 'area = Σ (time each item spent inside)'));
    const totalArea = N * w, L = totalArea / T, lam = N / T;
    rd.innerHTML = `${N} items, each inside for W = ${w} cycles, all gone by t = ${T}.<br>area = ${N} × ${w} = <b>${totalArea}</b> item-cycles. &nbsp; L = area / T = ${totalArea}/${T} = <b>${fmt(L)}</b> inside on average. &nbsp; λ = N / T = ${N}/${T} = <b>${fmt(lam)}</b> per cycle.<br>λ × W = ${fmt(lam)} × ${w} = <b>${fmt(lam * w)}</b> = L ✓ (the same area, divided two ways)`;
  }
  sg.oninput = () => { gap = +sg.value; render(); ctx.onChange(); }; sw.oninput = () => { w = +sw.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ gap, w }), solve: () => { w = 8; sw.value = 8; render(); ctx.onChange(); } };
};

// =====================================================================================================
// Day 25 (group 7): skid-buffer trace, utilisation queue, probe loading with capacitance
// =====================================================================================================

// ---- Worked example C cycle by cycle: stall, stop threshold, stop delay D, capacity ----
W.skidtrace = (root, p, ctx) => {
  let D = p.D ?? 2, stall = p.stall ?? 10, cap = p.capacity ?? 12, thr = p.threshold ?? 10;
  const body = box(root, 'Skid buffer, cycle by cycle (worked example C)', 'A source sends one word per cycle. The sink stops taking for a run of cycles starting at t = 2. Stop is asserted in any cycle where occupancy ≥ threshold, and the source only sees it D cycles later. Find the row where occupancy peaks and compare it with the capacity.');
  const sD = slider(0, 4, 1, D), sS = slider(0, 14, 1, stall), sT = slider(1, 14, 1, thr), sC = slider(1, 16, 1, cap);
  const tbl = el('div', { style: { overflowX: 'auto', maxHeight: '260px', overflowY: 'auto' } }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'stop delay D ', sD, ' stall length ', sS), el('div', { class: 'ctrl' }, 'stop threshold ', sT, ' capacity ', sC), tbl, rd);
  function sim() {
    const T = stall + D + 8, rows = [], stops = []; let occ = 0, peak = 0, peakAt = 0;
    for (let t = 0; t < T; t++) {
      const ready = !(t >= 2 && t < 2 + stall);
      const stopNow = occ >= thr; stops.push(stopNow);
      const emitted = (t < D || !stops[t - D]) ? 1 : 0;
      const popped = (ready && occ > 0) ? 1 : 0;
      occ += emitted - popped;
      if (occ > peak) { peak = occ; peakAt = t; }
      rows.push({ t, ready, stopNow, emitted, popped, occ });
    }
    return { rows, peak, peakAt };
  }
  function render() {
    const { rows, peak, peakAt } = sim();
    tbl.innerHTML = `<table style="font-family:Consolas,monospace;font-size:12px;border-collapse:collapse"><tr><th style="padding:1px 7px">t</th><th style="padding:1px 7px">sink ready</th><th style="padding:1px 7px">stop asserted</th><th style="padding:1px 7px">source emits</th><th style="padding:1px 7px">pop</th><th style="padding:1px 7px">occupancy</th></tr>` +
      rows.map(r => `<tr style="background:${r.occ > cap ? '#ffdfe0' : r.t === peakAt ? '#fff3c4' : r.ready ? '#fff' : '#f3f3f3'}"><td style="padding:1px 7px">${r.t}</td><td style="padding:1px 7px">${r.ready ? 1 : 0}</td><td style="padding:1px 7px">${r.stopNow ? '<b>1</b>' : 0}</td><td style="padding:1px 7px">${r.emitted}</td><td style="padding:1px 7px">${r.popped}</td><td style="padding:1px 7px"><b>${r.occ}</b>${r.occ > cap ? ' ✖ overflow' : ''}</td></tr>`).join('') + '</table>';
    const over = peak > cap;
    rd.innerHTML = `peak occupancy = <b>${peak}</b> at t = ${peakAt} (threshold ${thr} + D ${D} = ${thr + D}${stall + 1 < thr + D ? ', limited here by the short stall' : ''}); capacity ${cap}: ${over ? '<b style="color:#ea2b2b">✖ data lost</b>' : '<b style="color:#46a302">✓ fits</b>'}<br><span style="color:#777">Safe rule: assert stop when free slots ≤ D, i.e. threshold ≤ capacity − D. Here capacity − D = ${cap - D}.</span>`;
  }
  const hook = (s, f) => { s.oninput = () => { f(+s.value); render(); ctx.onChange(); }; };
  hook(sD, v => D = v); hook(sS, v => stall = v); hook(sT, v => thr = v); hook(sC, v => cap = v);
  render();
  return { getState: () => ({ D, stall, thr, cap, peak: sim().peak, overflow: sim().peak > cap }), solve: () => { thr = cap - D; sT.value = thr; render(); ctx.onChange(); } };
};

// ---- Utilisation and burstiness: a single server fed by random arrivals with the same mean ----
W.queuesim = (root, p, ctx) => {
  let rho = p.rho ?? 0.64, burst = p.burst ?? 1;
  const body = box(root, 'Same average load, different queues', 'One server takes one item per cycle. Arrivals are random with mean rate ρ per cycle, either one at a time or in bursts of b (rarer, larger). Slide ρ towards 1 and watch the backlog; then raise b at the same ρ.');
  const sr = slider(0.1, 0.98, 0.02, rho), sb = slider(1, 8, 1, burst);
  const svg = svgEl('svg', { viewBox: '0 0 480 150', width: 480, height: 150 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'ρ = ', sr, ' burst size b = ', sb), svg, rd);
  function render() {
    const r = rng(42), T = 400, occs = []; let occ = 0, arrivals = 0;
    for (let t = 0; t < T; t++) { const a = r() < rho / burst ? burst : 0; arrivals += a; occ += a; if (occ > 0) occ--; occs.push(occ); }
    const peak = Math.max(...occs), avg = mean(occs);
    svg.innerHTML = '';
    const X = t => 30 + t / T * 440, ymax = Math.max(8, peak), Y = v => 130 - v / ymax * 110;
    svg.append(svgEl('line', { x1: 30, y1: 130, x2: 470, y2: 130, stroke: '#999' }));
    svg.append(svgEl('text', { x: 26, y: Y(ymax) + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#777' }, ymax)); svg.append(svgEl('text', { x: 26, y: 134, 'text-anchor': 'end', 'font-size': 10, fill: '#777' }, '0'));
    svg.append(svgEl('text', { x: 470, y: 146, 'text-anchor': 'end', 'font-size': 10, fill: '#777' }, `${T} cycles`));
    let d = ''; occs.forEach((v, t) => { d += `${t ? 'L' : 'M'}${X(t)},${Y(v)} `; });
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 2 }));
    svg.append(svgEl('text', { x: 34, y: 14, 'font-size': 11, fill: '#1cb0f6', 'font-weight': 800 }, 'items waiting (after service) each cycle'));
    rd.innerHTML = `ρ = <b>${fmt(rho)}</b>, bursts of ${burst}: ${arrivals} arrivals in ${T} cycles (measured rate ${fmt(arrivals / T)}). average backlog <b>${fmt(avg)}</b>, peak backlog <b>${peak}</b>.<br><span style="color:#777">Simple-queue rule of thumb: waiting ∝ 1/(1 − ρ) = ${fmt(1 / (1 - rho))}. The same ρ with bigger bursts needs a bigger buffer: the average says nothing about the peak.</span>`;
  }
  sr.oninput = () => { rho = +sr.value; render(); ctx.onChange(); }; sb.oninput = () => { burst = +sb.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ rho, burst }), solve: () => { rho = 0.9; sr.value = 0.9; render(); ctx.onChange(); } };
};

// ---- Probe loading beyond DC: capacitance, bandwidth, and the ground-lead resonance ----
W.probecap = (root, p, ctx) => {
  const probes = [['×10 probe: 10 MΩ ∥ 15 pF', 10000, 15], ['×1 probe: 1 MΩ ∥ 100 pF', 1000, 100], ['bare 1 m coax to a 1 MΩ input: 1 MΩ ∥ 120 pF', 1000, 120]];
  let Rs = p.Rs ?? 1, pi = p.probe ?? 0, lead = p.lead ?? 15;
  const body = box(root, 'A probe is a resistor, a capacitor and a little inductor', 'Slide the source resistance the node is driven from, choose a probe, and set the ground-lead length. The capacitance and the source resistance form an RC low-pass; the ground lead\'s inductance and the probe capacitance form a resonator that rings.');
  const ss = slider(0.05, 100, 0.05, Rs), sl = slider(0, 30, 1, lead); const ctrl = el('div', { class: 'ctrl' });
  const svg = svgEl('svg', { viewBox: '0 0 480 130', width: 480, height: 130 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'source resistance (kΩ) ', ss, ' ground lead (cm) ', sl), ctrl, svg, rd);
  function render() {
    const [name, Rp, C] = probes[pi];
    const Rk = Rs, Rohm = Rk * 1e3, Cf = C * 1e-12, fc = 1 / (2 * Math.PI * Rohm * Cf), tr = 2.2 * Rohm * Cf, dcErr = (1 - Rp / (Rp + Rk)) * 100;
    const L = lead * 10e-9, fr = lead > 0 ? 1 / (2 * Math.PI * Math.sqrt(L * Cf)) : Infinity;
    ctrl.innerHTML = ''; probes.forEach((pr, i) => ctrl.append(btn(pr[0].split(':')[0], () => { pi = i; render(); ctx.onChange(); }, i === pi ? 'on' : '')));
    svg.innerHTML = '';
    const lx = f => 40 + (Math.log10(f) - 3) / 6 * 420, Y = g => 100 - g * 80;
    svg.append(svgEl('line', { x1: 40, y1: 100, x2: 460, y2: 100, stroke: '#999' }));
    [3, 4, 5, 6, 7, 8, 9].forEach(e => svg.append(svgEl('text', { x: lx(10 ** e), y: 116, 'text-anchor': 'middle', 'font-size': 10, fill: '#777' }, e < 6 ? `${10 ** (e - 3)} kHz` : e < 9 ? `${10 ** (e - 6)} MHz` : '1 GHz')));
    let d = ''; for (let i = 0; i <= 120; i++) { const f = 10 ** (3 + i / 20); d += `${i ? 'L' : 'M'}${lx(f)},${Y(1 / Math.sqrt(1 + (f / fc) ** 2))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    if (fc > 1e3 && fc < 1e9) { svg.append(svgEl('line', { x1: lx(fc), y1: 20, x2: lx(fc), y2: 100, stroke: '#ff9600', 'stroke-dasharray': '4 3' })); svg.append(svgEl('text', { x: lx(fc), y: 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#ff9600', 'font-weight': 800 }, '−3 dB')); }
    if (isFinite(fr) && fr > 1e3 && fr < 1e9) { svg.append(svgEl('line', { x1: lx(fr), y1: 40, x2: lx(fr), y2: 100, stroke: '#ea2b2b', 'stroke-dasharray': '2 3' })); svg.append(svgEl('text', { x: lx(fr), y: 34, 'text-anchor': 'middle', 'font-size': 10, fill: '#ea2b2b', 'font-weight': 800 }, 'lead rings')); }
    svg.append(svgEl('text', { x: 44, y: 30, 'font-size': 10, fill: '#777' }, 'what fraction of the node\'s signal the probe passes, versus frequency'));
    const fmtF = f => f >= 1e9 ? fmt(f / 1e9) + ' GHz' : f >= 1e6 ? fmt(f / 1e6) + ' MHz' : f >= 1e3 ? fmt(f / 1e3) + ' kHz' : fmt(f) + ' Hz';
    rd.innerHTML = `${name}; node driven through <b>${fmt(Rk)} kΩ</b><br>DC loading error = ${fmt(dcErr)}% &nbsp; RC corner f_c = 1/(2π·R_s·C) = <b>${fmtF(fc)}</b> &nbsp; added rise time ≈ 2.2·R_s·C = <b>${tr >= 1e-6 ? fmt(tr * 1e6) + ' µs' : fmt(tr * 1e9) + ' ns'}</b><br>ground lead ${lead} cm ≈ ${fmt(lead * 10)} nH with ${C} pF: rings near <b>${isFinite(fr) ? fmtF(fr) : '— (no lead)'}</b> when hit by a fast edge<br><span style="color:#777">A 10 ns edge has energy up to ~35 MHz (0.35 / rise time). If f_c or the ring frequency sits inside that band, what you see on the screen is partly the probe.</span>`;
  }
  ss.oninput = () => { Rs = +ss.value; render(); ctx.onChange(); }; sl.oninput = () => { lead = +sl.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ Rs, pi, lead }), solve: () => { pi = 0; lead = 0; sl.value = 0; render(); ctx.onChange(); } };
};

export {};
