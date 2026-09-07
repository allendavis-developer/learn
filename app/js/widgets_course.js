// Sims for the Manchester semester-1 units: EEEN11201 measurement theory, EEEN11101 Norton/source transformation, MATH19611 vectors.
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

// ---- Accuracy vs precision: target with shots (EEEN11201) ----
W.accuracy = (root, p, ctx) => {
  let bias = p.bias ?? 0.5, spread = p.spread ?? 0.15, seed = 1;
  const body = box(root, 'Accuracy vs precision', 'Bias (systematic error) shifts every shot the same way; spread (random error) scatters them. Averaging shrinks spread, never bias.');
  const sb = slider(0, 1, 0.05, bias), ss = slider(0.02, 0.5, 0.02, spread);
  const svg = svgEl('svg', { viewBox: '0 0 260 260', width: 260, height: 260 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'bias ', sb, ' spread ', ss, btn('new sample', () => { seed++; render(); ctx.onChange(); })), svg, rd);
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function gauss() { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function render() {
    svg.innerHTML = '';
    [1, 0.75, 0.5, 0.25].forEach(r => svg.append(svgEl('circle', { cx: 130, cy: 130, r: r * 110, fill: 'none', stroke: '#ddd', 'stroke-width': 2 })));
    svg.append(svgEl('circle', { cx: 130, cy: 130, r: 4, fill: '#3c3c3c' }));
    let s = 1; seed = 7 * (s + 1) + Math.round(bias * 100) + Math.round(spread * 100) + (seed % 1000);
    const pts = []; for (let i = 0; i < 12; i++) pts.push([bias + spread * gauss(), spread * gauss()]);
    pts.forEach(([x, y]) => svg.append(svgEl('circle', { cx: 130 + x * 110, cy: 130 - y * 110, r: 5, fill: '#ff4b4b', stroke: '#fff', 'stroke-width': 1.5 })));
    const mx = pts.reduce((a, q) => a + q[0], 0) / pts.length, my = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    svg.append(svgEl('line', { x1: 130 + mx * 110 - 8, y1: 130 - my * 110, x2: 130 + mx * 110 + 8, y2: 130 - my * 110, stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 130 + mx * 110, y1: 130 - my * 110 - 8, x2: 130 + mx * 110, y2: 130 - my * 110 + 8, stroke: '#1cb0f6', 'stroke-width': 3 }));
    const sd = Math.sqrt(pts.reduce((a, q) => a + (q[0] - mx) ** 2, 0) / (pts.length - 1));
    rd.innerHTML = `12 readings. Mean offset from the true centre (blue cross) = <b>${fmt(mx, 2)}</b> → that is the <b>bias</b>: accuracy problem, fixed by calibration.<br>Sample standard deviation = <b>${fmt(sd, 2)}</b> → that is the <b>random error</b>: precision problem, reduced by averaging (σ/√n).<br><span style="color:#777">${bias < 0.1 && spread < 0.1 ? 'accurate AND precise' : bias < 0.1 ? 'accurate but not precise' : spread < 0.1 ? 'precise but not accurate (the dangerous one: looks convincing)' : 'neither accurate nor precise'}</span>`;
  }
  sb.oninput = () => { bias = +sb.value; render(); ctx.onChange(); }; ss.oninput = () => { spread = +ss.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ bias, spread }) };
};

// ---- Uncertainty of a mean and propagation through a gain calculation (EEEN11201) ----
W.uncertainty = (root, p, ctx) => {
  let n = p.n ?? 4, sigma = p.sigma ?? 0.10;
  const body = box(root, 'Repeated readings: the mean gets better as 1/√n', 'Each reading has random error σ. The standard error of the mean is σ/√n. Then see how independent uncertainties combine in a derived quantity.');
  const sn = slider(1, 64, 1, n), ssg = slider(0.02, 0.3, 0.01, sigma);
  const svg = svgEl('svg', { viewBox: '0 0 460 120', width: 460, height: 120 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'n readings ', sn, ' σ per reading (V) ', ssg), svg, rd);
  function render() {
    svg.innerHTML = '';
    const se = sigma / Math.sqrt(n);
    const X = v => 230 + v * 600;
    svg.append(svgEl('line', { x1: 20, y1: 80, x2: 440, y2: 80, stroke: '#999' }));
    [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].forEach(v => svg.append(svgEl('text', { x: X(v), y: 100, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, v === 0 ? 'true' : (v > 0 ? '+' : '') + v)));
    svg.append(svgEl('rect', { x: X(-sigma), y: 30, width: X(sigma) - X(-sigma), height: 18, rx: 6, fill: '#ffdfe0', stroke: '#ea2b2b' }));
    svg.append(svgEl('text', { x: X(0), y: 24, 'font-size': 11, fill: '#ea2b2b', 'text-anchor': 'middle', 'font-weight': 800 }, `±σ of ONE reading = ±${fmt(sigma, 2)} V`));
    svg.append(svgEl('rect', { x: X(-se), y: 56, width: Math.max(2, X(se) - X(-se)), height: 18, rx: 6, fill: '#d7ffb8', stroke: '#46a302' }));
    svg.append(svgEl('text', { x: X(0), y: 116, 'font-size': 11, fill: '#46a302', 'text-anchor': 'middle', 'font-weight': 800 }, `±σ/√n of the MEAN of ${n} = ±${fmt(se, 2)} V`));
    const Vin = 1.000, Vout = 9.5, uIn = se, uOut = se; // gain = Vout/Vin
    const g = Vout / Vin, ug = g * Math.sqrt((uIn / Vin) ** 2 + (uOut / Vout) ** 2);
    rd.innerHTML = `standard error of the mean = σ/√n = ${fmt(sigma, 2)}/√${n} = <b>${fmt(se, 3)} V</b> (4× more readings → half the uncertainty)<br>Propagation: gain G = Vout/Vin with Vin = 1.000 ± ${fmt(uIn, 3)} V and Vout = 9.50 ± ${fmt(uOut, 3)} V → relative uncertainties add in quadrature: u(G)/G = √((u/Vin)² + (u/Vout)²) → G = <b>${fmt(g, 3)} ± ${fmt(ug, 2)}</b><br><span style="color:#777">Repeatability (random, shrinks with n) is not calibration bias (systematic, does not). Quote both.</span>`;
  }
  sn.oninput = () => { n = +sn.value; render(); ctx.onChange(); }; ssg.oninput = () => { sigma = +ssg.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ n, sigma }) };
};

// ---- Thevenin ↔ Norton / source transformation (EEEN11101) ----
W.norton = (root, p, ctx) => {
  let Vth = p.Vth ?? 5, Rth = p.Rth ?? 500, RL = p.RL ?? 1000, view = 'thevenin';
  const body = box(root, 'Thévenin ↔ Norton: two faces of one source', 'A voltage source Vth in series with Rth behaves exactly like a current source In = Vth/Rth in parallel with the same Rth. Check: the load gets the same current either way.');
  const sv = slider(1, 12, 0.5, Vth), sr = slider(100, 2000, 50, Rth), sl = slider(100, 5000, 100, RL);
  const svg = svgEl('svg', { viewBox: '0 0 460 150', width: 460, height: 150 });
  const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'Vth ', sv, ' Rth ', sr, ' RL ', sl), ctrl, svg, rd);
  function render() {
    const In = Vth / Rth, IL = Vth / (Rth + RL), VL = IL * RL;
    svg.innerHTML = '';
    if (view === 'thevenin') {
      svg.append(svgEl('text', { x: 20, y: 80, 'font-size': 13, 'font-weight': 800 }, `Vth = ${fmt(Vth)} V`));
      svg.append(svgEl('rect', { x: 130, y: 40, width: 30, height: 60, fill: '#ddf4ff', stroke: '#1899d6', 'stroke-width': 3 }));
      svg.append(svgEl('text', { x: 145, y: 30, 'font-size': 12, 'text-anchor': 'middle', 'font-weight': 800 }, `Rth ${Rth} Ω (series)`));
      svg.append(svgEl('line', { x1: 100, y1: 70, x2: 130, y2: 70, stroke: '#3c3c3c', 'stroke-width': 3 })); svg.append(svgEl('line', { x1: 160, y1: 70, x2: 300, y2: 70, stroke: '#3c3c3c', 'stroke-width': 3 }));
    } else {
      svg.append(svgEl('text', { x: 20, y: 80, 'font-size': 13, 'font-weight': 800 }, `In = ${fmt(In * 1000)} mA`));
      svg.append(svgEl('rect', { x: 200, y: 40, width: 30, height: 60, fill: '#ddf4ff', stroke: '#1899d6', 'stroke-width': 3 }));
      svg.append(svgEl('text', { x: 215, y: 30, 'font-size': 12, 'text-anchor': 'middle', 'font-weight': 800 }, `Rth ${Rth} Ω (parallel)`));
      svg.append(svgEl('line', { x1: 130, y1: 70, x2: 300, y2: 70, stroke: '#3c3c3c', 'stroke-width': 3 }));
    }
    svg.append(svgEl('rect', { x: 300, y: 40, width: 30, height: 60, fill: '#ffdfe0', stroke: '#ea2b2b', 'stroke-width': 3 }));
    svg.append(svgEl('text', { x: 315, y: 125, 'font-size': 12, 'text-anchor': 'middle', 'font-weight': 800, fill: '#ea2b2b' }, `RL ${RL} Ω`));
    svg.append(svgEl('text', { x: 400, y: 65, 'font-size': 13, 'font-weight': 900, fill: '#46a302', 'text-anchor': 'middle' }, `IL = ${fmt(IL * 1000)} mA`));
    svg.append(svgEl('text', { x: 400, y: 85, 'font-size': 13, 'font-weight': 900, fill: '#46a302', 'text-anchor': 'middle' }, `VL = ${fmt(VL)} V`));
    ctrl.innerHTML = ''; ctrl.append(btn('Thévenin form', () => { view = 'thevenin'; render(); ctx.onChange(); }, view === 'thevenin' ? 'on' : ''), btn('Norton form', () => { view = 'norton'; render(); ctx.onChange(); }, view === 'norton' ? 'on' : ''));
    rd.innerHTML = `Norton current In = Vth/Rth = ${fmt(Vth)}/${Rth} = <b>${fmt(In * 1000)} mA</b>; same Rth = <b>${Rth} Ω</b>.<br>Load current, Thévenin: Vth/(Rth+RL) = <b>${fmt(IL * 1000)} mA</b>. Load current, Norton (current divider): In·Rth/(Rth+RL) = <b>${fmt(In * Rth / (Rth + RL) * 1000)} mA</b> ✓ identical.<br><span style="color:#777">Source transformation = swapping between the two forms to simplify a circuit step by step.</span>`;
  }
  sv.oninput = () => { Vth = +sv.value; render(); }; sr.oninput = () => { Rth = +sr.value; render(); }; sl.oninput = () => { RL = +sl.value; render(); };
  render();
  return { getState: () => ({ view, Vth, Rth }) };
};

// ---- Vectors: dot and cross products (MATH19611) ----
W.vectors = (root, p, ctx) => {
  let ax = p.ax ?? 3, ay = p.ay ?? 1, bx = p.bx ?? 1, by = p.by ?? 2;
  const body = box(root, 'Dot and cross products', 'Dot product measures alignment (zero when perpendicular). The 2-D cross product magnitude is the parallelogram area (zero when parallel).');
  const s = [slider(-4, 4, 0.5, ax), slider(-4, 4, 0.5, ay), slider(-4, 4, 0.5, bx), slider(-4, 4, 0.5, by)];
  const svg = svgEl('svg', { viewBox: '0 0 240 240', width: 240, height: 240 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'a = (', s[0], ',', s[1], ')  b = (', s[2], ',', s[3], ')'), svg, rd);
  const X = v => 120 + v * 25, Y = v => 120 - v * 25;
  function render() {
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 0, y1: 120, x2: 240, y2: 120, stroke: '#ccc' })); svg.append(svgEl('line', { x1: 120, y1: 0, x2: 120, y2: 240, stroke: '#ccc' }));
    for (let t = -4; t <= 4; t++) if (t) { svg.append(svgEl('line', { x1: X(t), y1: 117, x2: X(t), y2: 123, stroke: '#bbb' })); svg.append(svgEl('line', { x1: 117, y1: Y(t), x2: 123, y2: Y(t), stroke: '#bbb' })); }
    svg.append(svgEl('text', { x: 230, y: 134, 'font-size': 10, fill: '#999' }, 'x')); svg.append(svgEl('text', { x: 124, y: 10, 'font-size': 10, fill: '#999' }, 'y'));
    const head = (x, y, col) => { const L = Math.hypot(x, y); if (L < 1e-9) return; const ux = x / L, uy = -y / L, px = X(x), py = Y(y); svg.append(svgEl('polygon', { points: `${px},${py} ${px - 10 * ux + 4 * uy},${py - 10 * uy - 4 * ux} ${px - 10 * ux - 4 * uy},${py - 10 * uy + 4 * ux}`, fill: col })); };
    svg.append(svgEl('polygon', { points: `${X(0)},${Y(0)} ${X(ax)},${Y(ay)} ${X(ax + bx)},${Y(ay + by)} ${X(bx)},${Y(by)}`, fill: '#fff3c4', stroke: 'none' }));
    svg.append(svgEl('line', { x1: X(0), y1: Y(0), x2: X(ax), y2: Y(ay), stroke: '#1cb0f6', 'stroke-width': 4 }));
    svg.append(svgEl('line', { x1: X(0), y1: Y(0), x2: X(bx), y2: Y(by), stroke: '#58cc02', 'stroke-width': 4 }));
    head(ax, ay, '#1cb0f6'); head(bx, by, '#58cc02');
    svg.append(svgEl('text', { x: X(ax) + 6, y: Y(ay) - 6, 'font-size': 13, 'font-weight': 900, fill: '#1899d6' }, 'a'));
    svg.append(svgEl('text', { x: X(bx) + 6, y: Y(by) - 6, 'font-size': 13, 'font-weight': 900, fill: '#46a302' }, 'b'));
    const dot = ax * bx + ay * by, cross = ax * by - ay * bx, la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    const ang = la && lb ? Math.acos(Math.max(-1, Math.min(1, dot / (la * lb)))) * 180 / Math.PI : NaN;
    rd.innerHTML = `a·b = ${ax}·${bx} + ${ay}·${by} = <b>${fmt(dot)}</b> = |a||b|cos θ → θ = <b>${isNaN(ang) ? '—' : fmt(ang, 4) + '°'}</b> ${Math.abs(dot) < 1e-9 ? '(perpendicular)' : ''}<br>|a × b| = |${ax}·${by} − ${ay}·${bx}| = <b>${fmt(Math.abs(cross))}</b> = parallelogram area (yellow) = |a||b|sin θ ${Math.abs(cross) < 1e-9 ? '(parallel)' : ''}<br>|a| = ${fmt(la, 4)}, |b| = ${fmt(lb, 4)}; projection of a onto b = a·b/|b| = ${lb ? fmt(dot / lb, 4) : '—'}`;
  }
  s.forEach((sl, i) => sl.oninput = () => { [ax, ay, bx, by] = s.map(x => +x.value); render(); ctx.onChange(); });
  render();
  return { getState: () => ({ ax, ay, bx, by }) };
};
