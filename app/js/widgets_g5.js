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

// Draw one digital waveform row: vals[i] is the level (0/1) held during cell i. Label sits in the left margin.
function waveRow(svg, label, vals, y, x0, cw, h, color) {
  svg.append(svgEl('text', { x: x0 - 6, y: y + h / 2 + 4, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 900, fill: '#3c3c3c' }, label));
  let d = '';
  vals.forEach((v, i) => {
    const yy = y + (v ? 0 : h), x1 = x0 + i * cw, x2 = x1 + cw;
    d += (i === 0 ? `M${x1},${yy}` : `L${x1},${yy}`) + ` L${x2},${yy}`;
  });
  svg.append(svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5 }));
}
// Draw a row of small values (numbers) per cell, used for multi-bit signals.
function valueRow(svg, label, vals, y, x0, cw, color) {
  svg.append(svgEl('text', { x: x0 - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 900, fill: '#3c3c3c' }, label));
  vals.forEach((v, i) => svg.append(svgEl('text', { x: x0 + i * cw + cw / 2, y: y + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: color }, String(v))));
}

// ---------- G5.1 Moore vs Mealy timing on a "11" detector ----------
W.mooremealy = (root, p, ctx) => {
  let bits = (p.bits || [0, 1, 1, 0, 1, 1, 1, 0]).slice();
  const body = box(root, 'Moore vs Mealy: the same "two 1s in a row" detector, two output timings', 'Click an input cell to toggle it. The Moore output is a function of the STATE, so it appears one cycle after the second 1 (the state only changes at the edge). The Mealy output looks at the current input too, so it appears in the same cycle.');
  const svg = svgEl('svg', { viewBox: '0 0 470 150', width: 470, height: 150 });
  const tbl = el('table', { class: 'tbl', style: { marginTop: '6px' } });
  const rd = readout('');
  body.append(svg, tbl, rd);
  function run() {
    // Moore: S0 (no trailing 1), S1 (one trailing 1), S2 (two or more). Output = [state == S2].
    // Mealy: A (no trailing 1), B (trailing 1). Output = [state == B and input == 1].
    const moore = [], mealy = [], mooreSt = [], mealySt = [];
    let ms = 0, ys = 0;
    for (let k = 0; k < bits.length; k++) {
      mooreSt.push(['S0', 'S1', 'S2'][ms]); moore.push(ms === 2 ? 1 : 0);
      mealySt.push(['A', 'B'][ys]); mealy.push(ys === 1 && bits[k] === 1 ? 1 : 0);
      ms = bits[k] === 1 ? Math.min(2, ms + 1) : 0;
      ys = bits[k] === 1 ? 1 : 0;
    }
    return { moore, mealy, mooreSt, mealySt };
  }
  function render() {
    const { moore, mealy, mooreSt, mealySt } = run();
    const n = bits.length, x0 = 70, cw = 390 / n, h = 22;
    svg.innerHTML = '';
    for (let i = 0; i <= n; i++) svg.append(svgEl('line', { x1: x0 + i * cw, y1: 6, x2: x0 + i * cw, y2: 144, stroke: '#eee' }));
    for (let i = 0; i < n; i++) svg.append(svgEl('text', { x: x0 + i * cw + cw / 2, y: 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#999' }, `c${i}`));
    waveRow(svg, 'in', bits, 24, x0, cw, h, '#1cb0f6');
    waveRow(svg, 'Moore out', moore, 66, x0, cw, h, '#58cc02');
    waveRow(svg, 'Mealy out', mealy, 108, x0, cw, h, '#ff9600');
    tbl.innerHTML = '';
    tbl.append(el('tr', {}, el('th', {}, 'cycle'), ...bits.map((_, i) => el('th', {}, `c${i}`))));
    const row = (name, vals, click) => { const tr = el('tr', {}, el('td', { style: { fontWeight: 900 } }, name)); vals.forEach((v, i) => { const td = el('td', { style: click ? { cursor: 'pointer', fontWeight: 900, color: '#1cb0f6' } : {} }, String(v)); if (click) td.onclick = () => click(i); tr.append(td); }); tbl.append(tr); };
    row('input (click)', bits, i => { bits[i] ^= 1; render(); ctx.onChange(); });
    row('Moore state', mooreSt); row('Moore out', moore);
    row('Mealy state', mealySt); row('Mealy out', mealy);
    const fm = moore.indexOf(1), fy = mealy.indexOf(1);
    rd.innerHTML = fy < 0 ? 'No "11" in this input: both outputs stay 0. Put two 1s next to each other.' : `Second 1 arrives in <b>c${fy}</b>. Mealy raises its output in <b>c${fy}</b> (same cycle, because it reads the input directly). Moore reaches S2 at the edge that ends c${fy}, so its output appears in <b>c${fm}</b>: one cycle later, but a clean registered signal.<br><span style="color:#777">Moore: output = f(state). Mealy: output = f(state, input). Same information, different moment.</span>`;
  }
  render();
  return { getState: () => ({ bits: bits.slice(), ...run() }), solve: () => { bits = [0, 1, 1, 0, 1, 1, 1, 0]; render(); ctx.onChange(); } };
};

// ---------- G5.2 Clock enable vs gated clock ----------
W.clken = (root, p, ctx) => {
  let tr = p.tr ?? 1.0; // time (in cycles) at which `en` rises; clock is high in [k, k+0.5)
  const body = box(root, 'Clock enable vs gated clock', 'Slide the moment `en` rises. A gated clock (clk AND en) grows a runt pulse whenever en changes while clk is high: an edge nobody designed. A clock enable never touches the clock: the flop still sees every clean edge and simply chooses whether to load.');
  const s = slider(0.5, 2.75, 0.125, tr);
  const svg = svgEl('svg', { viewBox: '0 0 470 190', width: 470, height: 190 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'en rises at t = ', s, ' cycles'), svg, rd);
  const RES = 8, N = 4; // 8 samples per cycle, 4 cycles
  function render() {
    const x0 = 80, cw = 380 / (N * RES), h = 20;
    const t = i => i / RES;
    const clk = [], en = [], gated = [], qce = [], qg = [];
    let vce = 0, vg = 0, prevG = 0, prevClk = 0;
    for (let i = 0; i < N * RES; i++) {
      const c = (t(i) % 1) < 0.5 ? 1 : 0, e = t(i) >= tr ? 1 : 0, g = c & e;
      // clock-enable flop: loads 1 at a rising edge of clk when en is high
      if (c === 1 && prevClk === 0 && e === 1) vce = 1;
      // gated flop: loads at any rising edge of the gated clock (including a runt)
      if (g === 1 && prevG === 0) vg = 1;
      clk.push(c); en.push(e); gated.push(g); qce.push(vce); qg.push(vg);
      prevClk = c; prevG = g;
    }
    const runt = (tr % 1) > 0 && (tr % 1) < 0.5;
    svg.innerHTML = '';
    for (let k = 0; k <= N; k++) { const x = x0 + k * RES * cw; svg.append(svgEl('line', { x1: x, y1: 6, x2: x, y2: 184, stroke: '#eee' })); if (k < N) svg.append(svgEl('text', { x: x + RES * cw / 2, y: 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#999' }, `cycle ${k}`)); }
    waveRow(svg, 'clk', clk, 22, x0, cw, h, '#3c3c3c');
    waveRow(svg, 'en', en, 56, x0, cw, h, '#1cb0f6');
    waveRow(svg, 'clk & en', gated, 90, x0, cw, h, runt ? '#ea2b2b' : '#ff9600');
    waveRow(svg, 'q (enable)', qce, 124, x0, cw, h, '#58cc02');
    waveRow(svg, 'q (gated)', qg, 158, x0, cw, h, runt ? '#ea2b2b' : '#ff9600');
    const xr = x0 + tr * RES * cw;
    svg.append(svgEl('line', { x1: xr, y1: 50, x2: xr, y2: 112, stroke: '#1cb0f6', 'stroke-dasharray': '3 3' }));
    const edgeCE = Math.ceil(tr), edgeG = runt ? tr : Math.ceil(tr);
    rd.innerHTML = `en rises at t = <b>${tr}</b> (clk is ${(tr % 1) < 0.5 && (tr % 1) > 0 ? 'HIGH' : 'low'} at that moment).<br>` +
      (runt ? `<span style="color:#ea2b2b">⚠ clk &amp; en produces a runt pulse from t = ${tr} to ${Math.floor(tr) + 0.5}: a rising edge at ${tr} that the timing tools never analysed. The gated flop loads at t = ${edgeG}, mid-cycle, while the rest of the design is still settling.</span>` : `clk &amp; en is clean this time (en changed while clk was low), so both flops load at the edge at t = ${edgeG}. Move en into a high phase to see the runt.`) +
      `<br>The clock-enable flop loads at the next real edge, t = <b>${edgeCE}</b>, every time: en is an ordinary synchronous input, checked for setup like any other.<br><span style="color:#777">Even without a runt, the AND gate delays the gated clock (skew), so data crossing between gated and ungated flops can violate hold time.</span>`;
  }
  s.oninput = () => { tr = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ tr, runt: (tr % 1) > 0 && (tr % 1) < 0.5 }), solve: () => { tr = 1.25; s.value = tr; render(); ctx.onChange(); } };
};

// ---------- G5.3 Op-amp with negative feedback: why v+ ≈ v− ----------
W.opampfb = (root, p, ctx) => {
  let A = p.A ?? 1e5, feedback = true; const Rf = p.Rf ?? 10, Rin = p.Rin ?? 1, vin = p.vin ?? 0.5, rails = p.rails ?? 5;
  const body = box(root, 'Where the two rules come from: huge gain plus negative feedback', 'Inverting amplifier, vin through Rin to the − input, Rf from − input to output, + input grounded. The op-amp itself only does vout = A·(v+ − v−). Change A, then remove the feedback resistor.');
  const ctrl = el('div', { class: 'ctrl' }); const ctrl2 = el('div', { class: 'ctrl' });
  const svg = svgEl('svg', { viewBox: '0 0 470 60', width: 470, height: 60 });
  const rd = readout('');
  body.append(ctrl, ctrl2, svg, rd);
  function calc() {
    if (!feedback) { const vm = vin, ideal = -A * vm; return { vm, vout: Math.max(-rails, Math.min(rails, ideal)), ideal, sat: Math.abs(ideal) > rails }; }
    // exact solution of vout = −A·v−, v− = (vin·Rf + vout·Rin)/(Rin+Rf)
    const vout = -A * Rf * vin / (Rin + Rf + A * Rin);
    const vm = -vout / A;
    return { vm, vout: Math.max(-rails, Math.min(rails, vout)), ideal: vout, sat: Math.abs(vout) > rails };
  }
  function render() {
    const { vm, vout, sat } = calc();
    const idealG = -Rf / Rin, G = vout / vin;
    ctrl.innerHTML = ''; [10, 100, 1e3, 1e5, 1e6].forEach(a => ctrl.append(btn(`A = ${a >= 1e3 ? '10^' + Math.round(Math.log10(a)) : a}`, () => { A = a; render(); ctx.onChange(); }, A === a ? 'on' : '')));
    ctrl2.innerHTML = ''; ctrl2.append(btn(feedback ? 'feedback resistor Rf connected' : 'feedback REMOVED (open loop)', () => { feedback = !feedback; render(); ctx.onChange(); }, feedback ? 'g' : 'r'));
    svg.innerHTML = '';
    // bar: |v+ − v−| on a log scale from 1 µV to 1 V
    const lg = Math.max(-6, Math.min(0, Math.log10(Math.max(1e-7, Math.abs(vm)))));
    const x0 = 120, wmax = 330, w = (lg + 6) / 6 * wmax;
    svg.append(svgEl('text', { x: x0 - 8, y: 30, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 900, fill: '#3c3c3c' }, '|v+ − v−|'));
    svg.append(svgEl('rect', { x: x0, y: 18, width: wmax, height: 18, fill: '#f3f3f3', stroke: '#ddd' }));
    svg.append(svgEl('rect', { x: x0, y: 18, width: Math.max(2, w), height: 18, fill: Math.abs(vm) < 1e-3 ? '#58cc02' : '#ea2b2b' }));
    ['1 µV', '1 mV', '1 V'].forEach((lab, i) => svg.append(svgEl('text', { x: x0 + [0, 0.5, 1][i] * wmax, y: 52, 'text-anchor': i === 0 ? 'start' : i === 2 ? 'end' : 'middle', 'font-size': 10, fill: '#999' }, lab)));
    rd.innerHTML = feedback
      ? `Rin = ${Rin} kΩ, Rf = ${Rf} kΩ, vin = ${vin} V, A = ${A.toExponential(0)}.<br>Solving vout = −A·v− together with KCL at the − node: vout = <b>${fmt(vout, 5)} V</b>, so the closed-loop gain is <b>${fmt(G, 5)}</b> against the ideal −Rf/Rin = ${idealG}.<br>v− = −vout/A = <b>${Math.abs(vm) < 1e-3 ? fmt(vm * 1e6, 3) + ' µV' : fmt(vm, 4) + ' V'}</b>: the "virtual ground". ${Math.abs(vm) < 1e-3 ? 'Small enough to call 0 V: rule 2 holds.' : 'Not small: with gain this low, rule 2 is a poor approximation and the gain error shows.'}<br><span style="color:#777">Bigger A ⇒ v− closer to v+ ⇒ gain closer to the resistor ratio. The rules are the A → ∞ limit.</span>`
      : `Open loop: nothing pulls v− towards v+. v− = vin = ${vin} V, so the op-amp tries to output −A·vin = ${(-A * vin).toExponential(1)} V and <b>${sat ? `slams into the −${rails} V rail` : `outputs ${fmt(vout, 4)} V`}</b>.<br><span style="color:#ea2b2b">Rule 2 has failed: the inputs differ by ${vin} V. Without feedback the op-amp is a comparator, not an amplifier.</span>`;
  }
  render();
  return { getState: () => ({ A, feedback, vminus: calc().vm }), solve: () => { A = 1e5; feedback = true; render(); ctx.onChange(); } };
};

// ---------- G5.4 Meter accuracy spec: ±(x % of reading + n digits) ----------
W.meterspec = (root, p, ctx) => {
  const pct = p.pct ?? 0.5, digits = p.digits ?? 2, reading = p.reading ?? 12.34;
  const ranges = p.ranges || [2, 20, 200]; // full-scale volts of a 3½-digit meter (max count 1999)
  let range = p.range ?? 200;
  const body = box(root, 'Reading a meter spec: ±(0.5 % of reading + 2 digits)', 'The percentage term scales with the reading (gain error). The digit term is fixed in units of the last displayed digit, so it depends on the RANGE you chose. Pick the lowest range that still fits the reading.');
  const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(ctrl, rd);
  function calc(r) {
    const res = r / 2000; // one count on a 1999-count display
    if (reading > r * 0.9995) return { res, fits: false };
    return { res, fits: true, pctTerm: pct / 100 * reading, digTerm: digits * res, unc: pct / 100 * reading + digits * res, shown: (Math.round(reading / res) * res).toFixed(Math.max(0, -Math.floor(Math.log10(res)))) };
  }
  function render() {
    ctrl.innerHTML = ''; ranges.forEach(r => ctrl.append(btn(`${r} V range`, () => { range = r; render(); ctx.onChange(); }, range === r ? 'on' : '')));
    const c = calc(range);
    rd.innerHTML = !c.fits ? `<span style="color:#ea2b2b">Over range: ${reading} V does not fit on the ${range} V range (display shows OL).</span>`
      : `True input ${reading} V on the <b>${range} V</b> range: display resolution ${c.res} V, so it shows <b>${c.shown}</b>.<br>${pct} % of reading = ${fmt(c.pctTerm, 4)} V; ${digits} digits × ${c.res} V = ${fmt(c.digTerm, 4)} V.<br>Worst-case uncertainty = <b>±${fmt(c.unc, 4)} V</b> (${fmt(c.unc / reading * 100, 3)} % of the reading).<br><span style="color:#777">${ranges.filter(r => calc(r).fits).map(r => `${r} V range → ±${fmt(calc(r).unc, 3)} V`).join(' · ')}</span>`;
  }
  render();
  const best = () => ranges.filter(r => calc(r).fits).sort((a, b) => calc(a).unc - calc(b).unc)[0];
  return { getState: () => ({ range, unc: calc(range).fits ? calc(range).unc : null, best: best() }), solve: () => { range = best(); render(); ctx.onChange(); } };
};

// ---------- G5.5 Latch (level-sensitive) vs register (edge-triggered) with an enable ----------
W.latchvsreg = (root, p, ctx) => {
  let d = (p.d || [1, 0, 1, 1, 0, 0, 1, 0]).slice(), en = (p.en || [1, 1, 0, 0, 1, 0, 1, 1]).slice();
  const body = box(root, 'Latch vs register: what is stored while the enable is low?', 'Each column is one clock cycle; D and EN are held for that cycle. The latch is transparent while EN is high (Q follows D at once) and freezes when EN drops. The register only looks at D at the rising edge that starts the cycle, so it shows the PREVIOUS cycle\'s D. Click cells to change D and EN.');
  const svg = svgEl('svg', { viewBox: '0 0 470 170', width: 470, height: 170 });
  const tbl = el('table', { class: 'tbl', style: { marginTop: '6px' } });
  const rd = readout('');
  body.append(svg, tbl, rd);
  function run() {
    const ql = [], qf = []; let l = 0, f = 0;
    for (let k = 0; k < d.length; k++) {
      // register with enable: at the edge starting cycle k it samples the values held during cycle k−1
      if (k > 0 && en[k - 1]) f = d[k - 1];
      // latch: transparent during cycle k when en[k] is high
      if (en[k]) l = d[k];
      ql.push(l); qf.push(f);
    }
    return { ql, qf };
  }
  function render() {
    const { ql, qf } = run();
    const n = d.length, x0 = 80, cw = 380 / n, h = 20;
    svg.innerHTML = '';
    for (let i = 0; i <= n; i++) svg.append(svgEl('line', { x1: x0 + i * cw, y1: 6, x2: x0 + i * cw, y2: 164, stroke: '#eee' }));
    for (let i = 0; i < n; i++) svg.append(svgEl('text', { x: x0 + i * cw + cw / 2, y: 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#999' }, `c${i}`));
    waveRow(svg, 'EN', en, 22, x0, cw, h, '#1cb0f6');
    waveRow(svg, 'D', d, 58, x0, cw, h, '#3c3c3c');
    waveRow(svg, 'Q latch', ql, 94, x0, cw, h, '#ea2b2b');
    waveRow(svg, 'Q register', qf, 130, x0, cw, h, '#58cc02');
    tbl.innerHTML = '';
    tbl.append(el('tr', {}, el('th', {}, 'cycle'), ...d.map((_, i) => el('th', {}, `c${i}`))));
    const row = (name, vals, click, color) => { const tr = el('tr', {}, el('td', { style: { fontWeight: 900 } }, name)); vals.forEach((v, i) => { const td = el('td', { style: { cursor: click ? 'pointer' : 'default', fontWeight: 900, color } }, String(v)); if (click) td.onclick = () => click(i); tr.append(td); }); tbl.append(tr); };
    row('EN (click)', en, i => { en[i] ^= 1; render(); ctx.onChange(); }, '#1cb0f6');
    row('D (click)', d, i => { d[i] ^= 1; render(); ctx.onChange(); }, '#3c3c3c');
    row('Q latch', ql, null, '#ea2b2b'); row('Q register', qf, null, '#58cc02');
    const diff = ql.map((v, i) => v !== qf[i] ? i : -1).filter(i => i >= 0);
    rd.innerHTML = diff.length ? `They disagree in cycle${diff.length > 1 ? 's' : ''} <b>${diff.map(i => 'c' + i).join(', ')}</b>. The latch shows this cycle's D whenever EN is high (transparent); the register shows what D was in the cycle before the edge, and only if EN was high then.<br><span style="color:#777">A latch's output can change at any moment during the cycle, so no clean "everything settles before the next edge" argument exists for it.</span>` : 'Latch and register agree everywhere in this pattern. Make D change during a cycle where EN is high and watch the latch follow it immediately.';
  }
  render();
  return { getState: () => { const { ql, qf } = run(); return { d: d.slice(), en: en.slice(), ql, qf, differ: ql.filter((v, i) => v !== qf[i]).length }; }, solve: () => { d = [1, 0, 1, 1, 0, 0, 1, 0]; en = [1, 1, 0, 0, 1, 0, 1, 1]; render(); ctx.onChange(); } };
};

// ---------- G5.6 What a reset must clear: state variable vs the whole state ----------
W.resetmeta = (root, p, ctx) => {
  let st = 'IDLE', count = 0, len = 0, log = [], everStale = false;
  const body = box(root, 'Reset the state variable, or reset the state?', 'Run a packet part of the way through, press one of the two resets, then start the next packet. Only the full reset gives the new packet a clean start; the other one leaves the old byte count and length behind.');
  const tbl = el('table', { class: 'tbl' });
  const ctrl = el('div', { class: 'ctrl' });
  const rd = readout('');
  body.append(ctrl, tbl, rd);
  const acts = {
    sof: () => {
      const stale = (count !== 0 || len !== 0);
      if (stale) everStale = true;
      st = 'HEADER';
      log.push(`start-of-frame → HEADER${stale ? ` <span style="color:#ea2b2b">⚠ inherited count = ${count}, length = ${len} from the last packet</span>` : ''}`);
    },
    hdr: () => { if (st === 'HEADER') { len = 4; count = 0; st = 'PAYLOAD'; log.push('header: length = 4 → PAYLOAD'); } else log.push(`header byte ignored in ${st}`); },
    byte: () => {
      if (st !== 'PAYLOAD') { log.push(`data byte ignored in ${st}`); return; }
      count++;
      if (count >= len) { st = 'IDLE'; log.push(`data byte → count = ${count} = length: packet complete → IDLE`); }
      else log.push(`data byte → count = ${count} of ${len}`);
    },
    rstate: () => { st = 'IDLE'; log.push('<b>reset (state variable only)</b>: st ← IDLE, count and length untouched'); },
    rfull: () => { st = 'IDLE'; count = 0; len = 0; log.push('<b>reset (everything)</b>: st ← IDLE, count ← 0, length ← 0'); },
  };
  function render() {
    ctrl.innerHTML = '';
    ctrl.append(btn('start of frame', () => { acts.sof(); render(); ctx.onChange(); }, 'g'),
      btn('header: length = 4', () => { acts.hdr(); render(); ctx.onChange(); }),
      btn('data byte', () => { acts.byte(); render(); ctx.onChange(); }),
      btn('reset (state only)', () => { acts.rstate(); render(); ctx.onChange(); }, 'r'),
      btn('reset (everything)', () => { acts.rfull(); render(); ctx.onChange(); }, 'on'),
      btn('↺ power-up', () => { st = 'IDLE'; count = 0; len = 0; log = []; everStale = false; render(); ctx.onChange(); }));
    tbl.innerHTML = '';
    tbl.append(el('tr', {}, el('th', {}, 'register'), el('th', {}, 'value'), el('th', {}, 'visible to the next packet?')));
    const row = (n, v, note, bad) => tbl.append(el('tr', {}, el('td', { style: { fontWeight: 900 } }, n), el('td', { style: { fontWeight: 900, color: bad ? '#ea2b2b' : '#3c3c3c' } }, String(v)), el('td', {}, note)));
    row('st (state)', st, 'yes — every reset clears it', false);
    row('count (bytes so far)', count, count !== 0 && st === 'IDLE' ? 'yes — and it is not zero' : 'yes', count !== 0 && st === 'IDLE');
    row('length (from header)', len, len !== 0 && st === 'IDLE' ? 'yes — and it is not zero' : 'yes', len !== 0 && st === 'IDLE');
    rd.innerHTML = `state = <b>${st}</b>, count = <b>${count}</b>, length = <b>${len}</b>` +
      (everStale ? '<br><span style="color:#ea2b2b">A packet has already started with stale metadata: that packet is parsed against the previous packet\'s length. This is the bug a state-only reset creates.</span>' : '') +
      `<br><span style="color:#777">${log.slice(-4).join('<br>') || 'try: start of frame → header → data byte → reset (state only) → start of frame'}</span>`;
  }
  render();
  return {
    getState: () => ({ st, count, len, everStale }),
    solve: () => { acts.sof(); acts.hdr(); acts.byte(); acts.rstate(); acts.sof(); render(); ctx.onChange(); }
  };
};

export {};
