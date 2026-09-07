// More degree-strand sims: numerical integration, RL transient, second-order damping, mesh analysis.
import { el, svgEl, mdi } from './utils.js';
import { WIDGETS as W } from './widgets.js';

function box(root, title, hint) {
  root.classList.add('widget');
  if (title) root.append(el('div', { class: 'wtitle' }, '⚡ ', el('span', { html: mdi(title) })));
  const body = el('div'); root.append(body);
  if (hint) root.append(el('div', { class: 'hint' }, hint));
  return body;
}
const readout = html => el('div', { class: 'readout', html });
const slider = (min, max, step, val) => el('input', { type: 'range', min, max, step, value: val });
const fmt = (v, d = 3) => Number.isInteger(v) ? String(v) : (+v.toPrecision(d)).toString();

// ---- Numerical integration: trapezoid vs Simpson (E02 L3) ----
W.trapz = (root, p, ctx) => {
  const f = x => Math.sin(x), exact = 2; // ∫0^π sin = 2
  let n = p.n || 4;
  const body = box(root, 'Approximating ∫₀^π sin x dx = 2 numerically', "Double n (halve the step h). Trapezoid error falls about 4× each time; Simpson's falls about 16×. Verify on a known integral before trusting an unknown one.");
  const s = slider(1, 6, 1, Math.log2(n));
  const svg = svgEl('svg', { viewBox: '0 0 460 190', width: 460, height: 190 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'n = 2^k, k = ', s), svg, rd);
  const a = 0, b = Math.PI;
  const X = x => 30 + (x - a) / (b - a) * 400, Y = y => 160 - y * 130;
  function render() {
    svg.innerHTML = '';
    const h = (b - a) / n;
    let trap = 0, simp = 0;
    for (let i = 0; i < n; i++) {
      const x0 = a + i * h, x1 = x0 + h;
      trap += (f(x0) + f(x1)) * h / 2;
      svg.append(svgEl('polygon', { points: `${X(x0)},${Y(0)} ${X(x0)},${Y(f(x0))} ${X(x1)},${Y(f(x1))} ${X(x1)},${Y(0)}`, fill: '#ddf4ff', stroke: '#1899d6', 'stroke-width': 1 }));
    }
    for (let i = 0; i < n; i += 2) { const x0 = a + i * h; simp += (f(x0) + 4 * f(x0 + h) + f(x0 + 2 * h)) * h / 3; }
    let d = ''; for (let i = 0; i <= 200; i++) { const x = a + (b - a) * i / 200; d += `${i ? 'L' : 'M'}${X(x)},${Y(f(x))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#ff9600', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 30, y1: Y(0), x2: 430, y2: Y(0), stroke: '#999' }));
    rd.innerHTML = `n = <b>${n}</b>, h = π/${n} = ${fmt(h, 4)}<br>trapezoid = <b>${fmt(trap, 6)}</b> (error ${fmt(Math.abs(trap - exact), 3)})` + (n >= 2 ? `<br>Simpson = <b>${fmt(simp, 6)}</b> (error ${fmt(Math.abs(simp - exact), 3)})` : '<br>Simpson needs n ≥ 2 (even)') + '<br><span style="color:#777">Trapezoid error ∝ h², Simpson ∝ h⁴. Halving h: ÷4 and ÷16.</span>';
  }
  s.oninput = () => { n = 2 ** +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ n }) };
};

// ---- RL transient (E01) ----
W.rl = (root, p, ctx) => {
  let R = p.R ?? 10, L = p.L ?? 0.1; const V = p.V ?? 5;
  const body = box(root, 'RL step response: i(t) = (V/R)(1 − e^(−t/τ)), τ = L/R', 'An inductor resists changes in current. The current climbs towards V/R with time constant L/R.');
  const sR = slider(1, 100, 1, R), sL = slider(0.01, 1, 0.01, L);
  const svg = svgEl('svg', { viewBox: '0 0 460 190', width: 460, height: 190 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'R (Ω) ', sR, ' L (H) ', sL), svg, rd);
  function render() {
    const tau = L / R, I = V / R, tmax = 0.1;
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 40, y1: 160, x2: 450, y2: 160, stroke: '#999' })); svg.append(svgEl('line', { x1: 40, y1: 10, x2: 40, y2: 160, stroke: '#999' }));
    for (let ms = 0; ms <= 100; ms += 20) svg.append(svgEl('text', { x: 40 + ms / 100 * 400, y: 175, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, `${ms} ms`));
    let d = ''; for (let i = 0; i <= 200; i++) { const t = i / 200 * tmax; d += `${i ? 'L' : 'M'}${40 + i * 2},${160 - (1 - Math.exp(-t / tau)) * 130} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 40, y1: 30, x2: 450, y2: 30, stroke: '#ccc', 'stroke-dasharray': '4 3' }));
    svg.append(svgEl('text', { x: 44, y: 26, 'font-size': 10, fill: '#777' }, `final current V/R = ${fmt(I, 4)} A`));
    if (tau <= tmax) { const x = 40 + tau / tmax * 400, y = 160 - (1 - Math.exp(-1)) * 130; svg.append(svgEl('circle', { cx: x, cy: y, r: 5, fill: '#ff9600' })); svg.append(svgEl('text', { x: x + 6, y: y + 14, 'font-size': 11, fill: '#ff9600', 'font-weight': 800 }, `τ = L/R = ${fmt(tau * 1000, 4)} ms`)); }
    rd.innerHTML = `τ = L/R = ${L}/${R} = <b>${fmt(tau * 1000, 4)} ms</b> &nbsp; final current V/R = <b>${fmt(I, 4)} A</b><br>t = 0: the inductor behaves like an open circuit (current cannot jump). t → ∞: like a short (steady current, zero voltage).<br>energy stored at the end = ½LI² = <b>${fmt(0.5 * L * I * I, 4)} J</b>`;
  }
  sR.oninput = () => { R = +sR.value; render(); ctx.onChange(); }; sL.oninput = () => { L = +sL.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ R, L }) };
};

// ---- Second-order step response: damping ratio (E02 L4 / E06) ----
W.damping = (root, p, ctx) => {
  let zeta = p.zeta ?? 0.3; const wn = p.wn ?? 10;
  const body = box(root, `Second-order step response, ωn = ${wn} rad/s`, 'Slide the damping ratio ζ. Below 1: overshoot and ringing. Exactly 1: fastest with no overshoot. Above 1: sluggish.');
  const s = slider(0.05, 2, 0.05, zeta);
  const svg = svgEl('svg', { viewBox: '0 0 460 200', width: 460, height: 200 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'ζ = ', s), svg, rd);
  function y(t) {
    if (zeta < 1) { const wd = wn * Math.sqrt(1 - zeta * zeta); return 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + zeta / Math.sqrt(1 - zeta * zeta) * Math.sin(wd * t)); }
    if (Math.abs(zeta - 1) < 1e-9) return 1 - Math.exp(-wn * t) * (1 + wn * t);
    const s1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1)), s2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
    return 1 - (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1);
  }
  function render() {
    svg.innerHTML = '';
    const T = 2, X = t => 30 + t / T * 420, Y = v => 170 - v * 90;
    svg.append(svgEl('line', { x1: 30, y1: Y(0), x2: 450, y2: Y(0), stroke: '#999' })); svg.append(svgEl('line', { x1: 30, y1: Y(1), x2: 450, y2: Y(1), stroke: '#ccc', 'stroke-dasharray': '4 3' }));
    svg.append(svgEl('text', { x: 34, y: Y(1) - 4, 'font-size': 10, fill: '#777' }, 'final value 1'));
    for (let t = 0; t <= 2; t += 0.5) svg.append(svgEl('text', { x: X(t), y: 185, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, `${t}s`));
    let d = ''; for (let i = 0; i <= 400; i++) { const t = i / 400 * T; d += `${i ? 'L' : 'M'}${X(t)},${Y(y(t))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    const os = zeta < 1 ? Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) * 100 : 0;
    const kind = zeta < 1 ? `<b>underdamped</b>: complex poles, ringing at ωd = ωn√(1−ζ²) = ${fmt(wn * Math.sqrt(1 - zeta * zeta), 4)} rad/s` : Math.abs(zeta - 1) < 1e-9 ? '<b>critically damped</b>: two equal real poles at −ωn' : '<b>overdamped</b>: two distinct real poles, no overshoot';
    rd.innerHTML = `ζ = <b>${fmt(zeta)}</b> → ${kind}<br>overshoot = ${zeta < 1 ? fmt(os, 3) + '% (= 100·e^(−πζ/√(1−ζ²)))' : '0%'} &nbsp; 2% settling time ≈ 4/(ζωn) = ${fmt(4 / (zeta * wn), 3)} s<br><span style="color:#777">Poles at s = −ζωn ± ωn√(ζ²−1). All poles in the left half-plane ⇒ stable.</span>`;
  }
  s.oninput = () => { zeta = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ zeta }) };
};

// ---- Mesh analysis: two loops sharing a resistor (E01) ----
W.mesh = (root, p, ctx) => {
  let V1 = p.V1 ?? 10, V2 = p.V2 ?? 4; const R1 = p.R1 ?? 2, R2 = p.R2 ?? 4, R3 = p.R3 ?? 2;
  const body = box(root, 'Mesh analysis: two loop currents', 'Left loop: V1 → R1 → shared R2. Right loop: V2 → R3 → shared R2. KVL around each loop in terms of the loop currents I1, I2; the shared resistor carries I1 − I2.');
  const s1 = slider(0, 20, 1, V1), s2 = slider(0, 20, 1, V2);
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'V1 ', s1, ' V2 ', s2), rd);
  function render() {
    // Loop1: V1 = R1 I1 + R2 (I1 - I2); Loop2: V2 = R3 I2 + R2 (I2 - I1)  (both sources drive clockwise currents into the shared branch)
    const a11 = R1 + R2, a12 = -R2, a21 = -R2, a22 = R2 + R3;
    const det = a11 * a22 - a12 * a21;
    const I1 = (V1 * a22 - a12 * V2) / det, I2 = (a11 * V2 - a21 * V1) / det;
    rd.innerHTML = `Loop 1: V1 = R1·I1 + R2·(I1 − I2) → ${V1} = ${R1}I1 + ${R2}(I1 − I2)<br>Loop 2: V2 = R3·I2 + R2·(I2 − I1) → ${V2} = ${R3}I2 + ${R2}(I2 − I1)<br>Solve: I1 = <b>${fmt(I1, 4)} A</b>, I2 = <b>${fmt(I2, 4)} A</b>, shared-resistor current I1 − I2 = <b>${fmt(I1 - I2, 4)} A</b>, voltage across it ${fmt(R2 * (I1 - I2), 4)} V<br><span style="color:#777">Check with nodal analysis: the shared node voltage must come out the same. Two methods agreeing is your first "independent reference".</span>`;
  }
  s1.oninput = () => { V1 = +s1.value; render(); ctx.onChange(); }; s2.oninput = () => { V2 = +s2.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ V1, V2 }) };
};
