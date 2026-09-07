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

// ---- Day 19: counter + terminal count = clock divider (an enable pulse, not a new clock) ----
W.counterdiv = (root, p, ctx) => {
  const N = p.divisor ?? 4, width = p.width ?? Math.max(1, Math.ceil(Math.log2(N)));
  let count = 0, cycles = 0, ticks = 0, hist = [];
  const body = box(root, `Counter that divides by ${N}: count 0 … ${N - 1}, then tick and wrap`, `Press the clock. The register holds count; the adder computes count + 1; the comparator raises tick for one cycle when count = ${N - 1}. tick is an enable for slower logic, never a new clock.`);
  const svg = svgEl('svg', { viewBox: '0 0 520 150', width: 520, height: 150 });
  const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  function render() {
    svg.innerHTML = '';
    const shown = hist.slice(-12);
    const cw = 40, x0 = 60;
    svg.append(svgEl('text', { x: 52, y: 32, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 800, fill: '#3c3c3c' }, 'clk'));
    svg.append(svgEl('text', { x: 52, y: 72, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 800, fill: '#3c3c3c' }, 'count'));
    svg.append(svgEl('text', { x: 52, y: 118, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 800, fill: '#3c3c3c' }, 'tick'));
    let clk = '', tk = '';
    shown.forEach((h, i) => {
      const x = x0 + i * cw;
      clk += `M${x},40 L${x},18 L${x + cw / 2},18 L${x + cw / 2},40 L${x + cw},40 `;
      svg.append(svgEl('rect', { x: x + 2, y: 56, width: cw - 4, height: 24, rx: 5, fill: h.tick ? '#d7ffb8' : '#ddf4ff', stroke: h.tick ? '#46a302' : '#1899d6' }));
      svg.append(svgEl('text', { x: x + cw / 2, y: 73, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: '#1899d6' }, h.count));
      const y = h.tick ? 100 : 126;
      tk += (i ? `L${x},${y} ` : `M${x},${y} `) + `L${x + cw},${y} `;
    });
    svg.append(svgEl('path', { d: clk, fill: 'none', stroke: '#999', 'stroke-width': 2 }));
    svg.append(svgEl('path', { d: tk, fill: 'none', stroke: '#46a302', 'stroke-width': 3 }));
    ctrl.innerHTML = '';
    ctrl.append(btn('clock ↑ (one edge)', () => { step(); render(); ctx.onChange(); }, 'g'), btn(`run ${N} edges`, () => { for (let i = 0; i < N; i++) step(); render(); ctx.onChange(); }), btn('↺', () => { count = 0; cycles = 0; ticks = 0; hist = []; render(); }));
    const bits = count.toString(2).padStart(width, '0');
    rd.innerHTML = `after <b>${cycles}</b> edge(s): count = <b>${count}</b> (${width}-bit register: ${bits}), tick = <b>${count === N - 1 ? 1 : 0}</b> &nbsp; ticks so far: <b>${ticks}</b>` +
      `<br><span style="color:#777">next value = ${count === N - 1 ? '0 (wrap)' : count + 1}; one tick every ${N} edges, so tick runs at f_clk / ${N}. Width ${width} because 2^${width} = ${2 ** width} ≥ ${N}.</span>`;
  }
  function step() {
    const tick = count === N - 1;
    hist.push({ count, tick });
    if (tick) ticks++;
    count = tick ? 0 : count + 1;
    cycles++;
  }
  render();
  return { getState: () => ({ count, cycles, ticks }), solve: () => { const want = p.targetTicks ?? 2; while (ticks < want) step(); render(); ctx.onChange(); } };
};

// ---- Day 20: UART transmitter that is busy, refuses or drops writes, and can be reset mid-frame ----
W.uartbusy = (root, p, ctx) => {
  const byte = p.byte ?? 0x55, byte2 = p.byte2 ?? 0x0F;
  let policy = p.policy || 'refuse'; // 'refuse' (ready low, source must hold) | 'drop'
  let bit = -1, line = 1, log = [], dropped = 0, refused = 0, accepted = 0, resetMidFrame = false, pendingByte = byte;
  const frame = b => [0, ...Array.from({ length: 8 }, (_, i) => (b >> i) & 1), 1];
  let cur = frame(byte);
  const body = box(root, 'UART transmitter: busy, acceptance while busy, and reset mid-frame', 'Write a byte, step the bit clock, and try writing again while busy. Then reset in the middle of a frame and watch the line return to idle high with the bit counter cleared.');
  const svg = svgEl('svg', { viewBox: '0 0 560 110', width: 560, height: 110 });
  const ctrl = el('div', { class: 'ctrl' }); const pol = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(pol, ctrl, svg, rd);
  const busy = () => bit >= 0;
  function write(b) {
    if (!busy()) { cur = frame(b); bit = 0; line = cur[0]; accepted++; log.push({ v: line, nm: 'start', ev: 'write ✓' }); }
    else if (policy === 'drop') { dropped++; log.push({ v: line, nm: nameOf(bit), ev: 'write ✗ dropped' }); }
    else { refused++; log.push({ v: line, nm: nameOf(bit), ev: 'write ✗ ready=0' }); }
  }
  const nameOf = i => i < 0 ? 'idle' : i === 0 ? 'start' : i === 9 ? 'stop' : `d${i - 1}`;
  function tick() {
    if (!busy()) { line = 1; log.push({ v: 1, nm: 'idle', ev: '' }); return; }
    bit++;
    if (bit >= 10) { bit = -1; line = 1; log.push({ v: 1, nm: 'idle', ev: '' }); }
    else { line = cur[bit]; log.push({ v: line, nm: nameOf(bit), ev: '' }); }
  }
  function reset() {
    if (busy()) resetMidFrame = true;
    bit = -1; line = 1; log.push({ v: 1, nm: 'idle', ev: 'RESET' });
  }
  function render() {
    pol.innerHTML = '';
    pol.append(el('span', { style: { fontWeight: 800, marginRight: '6px' } }, 'contract while busy:'),
      btn('refuse (ready = 0, source holds)', () => { policy = 'refuse'; render(); ctx.onChange(); }, policy === 'refuse' ? 'on' : ''),
      btn('drop silently (bad)', () => { policy = 'drop'; render(); ctx.onChange(); }, policy === 'drop' ? 'on' : ''));
    ctrl.innerHTML = '';
    ctrl.append(btn(`write 0x${pendingByte.toString(16).toUpperCase().padStart(2, '0')}`, () => { write(pendingByte); pendingByte = pendingByte === byte ? byte2 : byte; render(); ctx.onChange(); }, 'g'),
      btn('bit clock (one bit-time)', () => { tick(); render(); ctx.onChange(); }),
      btn('reset', () => { reset(); render(); ctx.onChange(); }, 'r'),
      btn('↺', () => { bit = -1; line = 1; log = []; dropped = refused = accepted = 0; resetMidFrame = false; pendingByte = byte; render(); }));
    svg.innerHTML = '';
    const shown = log.slice(-14), cw = 40, x0 = 0;
    let d = '';
    shown.forEach((h, i) => {
      const x = x0 + i * cw, y = h.v ? 20 : 60;
      svg.append(svgEl('rect', { x, y: 8, width: cw, height: 64, fill: h.ev === 'RESET' ? '#ffdfe0' : h.nm === 'start' ? '#fff3d6' : h.nm === 'idle' ? '#f3f3f3' : '#f7fbff', stroke: '#eee' }));
      d += (i ? `L${x},${y} ` : `M${x},${y} `) + `L${x + cw},${y} `;
      svg.append(svgEl('text', { x: x + cw / 2, y: 86, 'text-anchor': 'middle', 'font-size': 10, fill: '#777', 'font-weight': 800 }, h.nm));
      if (h.ev) svg.append(svgEl('text', { x: x + cw / 2, y: 102, 'text-anchor': 'middle', 'font-size': 9, fill: h.ev.includes('✗') || h.ev === 'RESET' ? '#ea2b2b' : '#46a302', 'font-weight': 800 }, h.ev.replace('write ', '')));
    });
    if (d) svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    rd.innerHTML = `state: <b>${busy() ? `busy, sending bit ${bit} (${nameOf(bit)})` : 'idle'}</b> &nbsp; line = <b>${line}</b> &nbsp; ready = <b>${busy() ? 0 : 1}</b><br>accepted ${accepted}, refused ${refused}, dropped ${dropped}` +
      (resetMidFrame ? ' &nbsp; <span style="color:#ea2b2b">reset landed mid-frame: frame abandoned, line idle high, bit counter cleared</span>' : '') +
      (dropped ? ' &nbsp; <span style="color:#ea2b2b">a dropped byte is data lost with no signal to the sender</span>' : '');
  }
  render();
  return { getState: () => ({ busy: busy(), bit, line, dropped, refused, accepted, resetMidFrame, policy }), solve: () => { policy = 'refuse'; if (!busy()) write(pendingByte); tick(); tick(); tick(); reset(); render(); ctx.onChange(); } };
};

// ---- Day 19: Taylor polynomials of sin x around 0 ----
W.taylor = (root, p, ctx) => {
  let x = p.x ?? 0.5, order = p.order ?? 3;
  const body = box(root, 'Taylor polynomials for sin x at a = 0: matching derivatives', 'Slide x and the number of terms. Near 0 every polynomial hugs the curve; further out only more terms keep up. The error is roughly the size of the first term left out.');
  const sx = slider(-3.2, 3.2, 0.05, x); const ctrl = el('div', { class: 'ctrl' });
  const svg = svgEl('svg', { viewBox: '0 0 460 200', width: 460, height: 200 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'x = ', sx), ctrl, svg, rd);
  const fact = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const poly = (t, k) => { let s = 0; for (let n = 1; n <= k; n += 2) s += ((n % 4 === 1) ? 1 : -1) * Math.pow(t, n) / fact(n); return s; };
  const X = t => 230 + t * 65, Y = v => 100 - Math.max(-1.4, Math.min(1.4, v)) * 60;
  function render() {
    ctrl.innerHTML = '';
    [[1, 'x'], [3, 'x − x³/6'], [5, '+ x⁵/120'], [7, '− x⁷/5040']].forEach(([k, lbl]) => ctrl.append(btn(lbl, () => { order = k; render(); ctx.onChange(); }, order === k ? 'on' : '')));
    svg.innerHTML = '';
    svg.append(svgEl('line', { x1: 20, y1: Y(0), x2: 440, y2: Y(0), stroke: '#bbb' }));
    svg.append(svgEl('line', { x1: X(0), y1: 10, x2: X(0), y2: 190, stroke: '#bbb' }));
    let d1 = '', d2 = '';
    for (let i = 0; i <= 200; i++) { const t = -3.2 + 6.4 * i / 200; d1 += `${i ? 'L' : 'M'}${X(t)},${Y(Math.sin(t))} `; d2 += `${i ? 'L' : 'M'}${X(t)},${Y(poly(t, order))} `; }
    svg.append(svgEl('path', { d: d2, fill: 'none', stroke: '#ff9600', 'stroke-width': 3 }));
    svg.append(svgEl('path', { d: d1, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('circle', { cx: X(x), cy: Y(Math.sin(x)), r: 5, fill: '#1899d6' }));
    svg.append(svgEl('circle', { cx: X(x), cy: Y(poly(x, order)), r: 5, fill: 'none', stroke: '#ff9600', 'stroke-width': 2 }));
    svg.append(svgEl('text', { x: 24, y: 24, 'font-size': 11, fill: '#1cb0f6', 'font-weight': 800 }, 'sin x'));
    svg.append(svgEl('text', { x: 24, y: 40, 'font-size': 11, fill: '#ff9600', 'font-weight': 800 }, `polynomial (up to x^${order})`));
    const err = Math.abs(Math.sin(x) - poly(x, order)), nextTerm = Math.pow(Math.abs(x), order + 2) / fact(order + 2);
    rd.innerHTML = `x = <b>${fmt(x, 3)}</b>: sin x = <b>${fmt(Math.sin(x), 5)}</b>, polynomial = <b>${fmt(poly(x, order), 5)}</b>, error = <b>${fmt(err, 3)}</b><br><span style="color:#777">first omitted term |x|^${order + 2}/${order + 2}! = ${fmt(nextTerm, 3)} — an upper bound on the error for this alternating series.</span>`;
  }
  sx.oninput = () => { x = +sx.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ x, order }), solve: () => { order = 5; render(); ctx.onChange(); } };
};

// ---- Day 22: phasor picture for R, L and C: same frequency, different phase ----
W.phasor = (root, p, ctx) => {
  let comp = p.comp || 'C', theta = p.theta ?? 0; // theta = ωt in degrees
  const body = box(root, 'Phasors: V and I as rotating arrows, one component at a time', 'Pick a component and slide ωt. The arrows spin together at ω; their projections on the vertical axis are the instantaneous v(t) and i(t). The angle between them never changes: 0° for R, I lags 90° for L, I leads 90° for C.');
  const ctrl = el('div', { class: 'ctrl' }); const st = slider(0, 360, 5, theta);
  const svg = svgEl('svg', { viewBox: '0 0 520 200', width: 520, height: 200 }); const rd = readout('');
  body.append(ctrl, el('div', { class: 'ctrl' }, 'ωt (degrees) ', st), svg, rd);
  const phase = { R: 0, L: -90, C: 90 }; // phase of I relative to V
  function render() {
    ctrl.innerHTML = '';
    [['R', 'resistor'], ['L', 'inductor'], ['C', 'capacitor']].forEach(([k, lbl]) => ctrl.append(btn(lbl, () => { comp = k; render(); ctx.onChange(); }, comp === k ? 'on' : '')));
    svg.innerHTML = '';
    const cx = 100, cy = 100, r = 70;
    svg.append(svgEl('circle', { cx, cy, r, fill: 'none', stroke: '#ddd' }));
    const rad = a => a * Math.PI / 180;
    const arrow = (ang, len, col, lbl) => {
      const x = cx + len * Math.cos(rad(ang)), y = cy - len * Math.sin(rad(ang));
      svg.append(svgEl('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: col, 'stroke-width': 3 }));
      svg.append(svgEl('circle', { cx: x, cy: y, r: 4, fill: col }));
      svg.append(svgEl('text', { x: x + 8 * Math.cos(rad(ang)) + (Math.cos(rad(ang)) < 0 ? -14 : 4), y: y - 8 * Math.sin(rad(ang)) + 4, 'font-size': 12, fill: col, 'font-weight': 800 }, lbl));
    };
    const ph = phase[comp];
    arrow(theta, r, '#1cb0f6', 'V');
    arrow(theta + ph, r * 0.7, '#ff9600', 'I');
    // time-domain traces on the right
    const X = t => 220 + t / 360 * 280, Y = v => cy - v * 60;
    svg.append(svgEl('line', { x1: 220, y1: cy, x2: 500, y2: cy, stroke: '#bbb' }));
    let dv = '', di = '';
    for (let i = 0; i <= 140; i++) { const t = i / 140 * 360; dv += `${i ? 'L' : 'M'}${X(t)},${Y(Math.sin(rad(t)))} `; di += `${i ? 'L' : 'M'}${X(t)},${Y(0.7 * Math.sin(rad(t + ph)))} `; }
    svg.append(svgEl('path', { d: dv, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 2.5 }));
    svg.append(svgEl('path', { d: di, fill: 'none', stroke: '#ff9600', 'stroke-width': 2.5 }));
    svg.append(svgEl('line', { x1: X(theta), y1: 30, x2: X(theta), y2: 170, stroke: '#999', 'stroke-dasharray': '4 3' }));
    svg.append(svgEl('text', { x: 222, y: 26, 'font-size': 11, fill: '#1cb0f6', 'font-weight': 800 }, 'v(t)'));
    svg.append(svgEl('text', { x: 262, y: 26, 'font-size': 11, fill: '#ff9600', 'font-weight': 800 }, 'i(t)'));
    svg.append(svgEl('text', { x: 500, y: cy + 14, 'text-anchor': 'end', 'font-size': 10, fill: '#777' }, 'ωt →'));
    const v = Math.sin(rad(theta)), i = 0.7 * Math.sin(rad(theta + ph));
    rd.innerHTML = `${comp === 'R' ? 'Resistor: Z = R, angle 0°. I and V rise and fall together.' : comp === 'L' ? 'Inductor: Z = jωL, angle +90°. V = L·di/dt, so V peaks when I is changing fastest (I crossing zero): I <b>lags</b> V by 90°.' : 'Capacitor: Z = 1/(jωC) = −j/(ωC), angle −90°. I = C·dv/dt, so I peaks when V is changing fastest: I <b>leads</b> V by 90°.'}<br>at ωt = ${theta}°: v = ${fmt(v, 3)}·V_peak, i = ${fmt(i / 0.7, 3)}·I_peak`;
  }
  st.oninput = () => { theta = +st.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ comp, theta }), solve: () => { comp = p.target || 'C'; render(); ctx.onChange(); } };
};

// ---- Day 22: binomial PMF with n and p ----
W.binomialpmf = (root, p, ctx) => {
  let n = p.n ?? 10, pr = p.p ?? 0.1;
  const body = box(root, 'Binomial(n, p): P(K = k) = C(n,k)·pᵏ·(1−p)ⁿ⁻ᵏ', 'Slide n and p. Each bar is (number of success patterns with k successes) × (probability of one such pattern). Mean np is the dot; the bars always sum to 1.');
  const sn = slider(1, 20, 1, n), sp = slider(0.05, 0.95, 0.05, pr);
  const svg = svgEl('svg', { viewBox: '0 0 460 190', width: 460, height: 190 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'n ', sn, ' p ', sp), svg, rd);
  const C = (a, b) => { let r = 1; for (let i = 1; i <= b; i++) r = r * (a - b + i) / i; return Math.round(r); };
  function render() {
    svg.innerHTML = '';
    const probs = Array.from({ length: n + 1 }, (_, k) => C(n, k) * Math.pow(pr, k) * Math.pow(1 - pr, n - k));
    const mx = Math.max(...probs), bw = 420 / (n + 1);
    probs.forEach((q, k) => {
      const h = q / mx * 130, x = 30 + k * bw;
      svg.append(svgEl('rect', { x: x + 2, y: 150 - h, width: bw - 4, height: h, fill: '#1cb0f6', rx: 3 }));
      if (n <= 12 || k % 2 === 0) svg.append(svgEl('text', { x: x + bw / 2, y: 166, 'text-anchor': 'middle', 'font-size': 10, fill: '#777' }, k));
      if (n <= 10) svg.append(svgEl('text', { x: x + bw / 2, y: 145 - h, 'text-anchor': 'middle', 'font-size': 9, fill: '#1899d6', 'font-weight': 800 }, q.toFixed(3)));
    });
    const mean = n * pr, mx_ = 30 + (mean + 0.5) * bw;
    svg.append(svgEl('circle', { cx: mx_, cy: 180, r: 5, fill: '#ff9600' }));
    svg.append(svgEl('text', { x: mx_ + 8, y: 184, 'font-size': 10, fill: '#ff9600', 'font-weight': 800 }, `mean np = ${fmt(mean, 3)}`));
    const p0 = probs[0], sum = probs.reduce((a, b) => a + b, 0);
    rd.innerHTML = `n = <b>${n}</b>, p = <b>${pr.toFixed(2)}</b>: mean np = <b>${fmt(mean, 3)}</b>, variance np(1−p) = <b>${fmt(n * pr * (1 - pr), 3)}</b>, sd = ${fmt(Math.sqrt(n * pr * (1 - pr)), 3)}<br>P(K = 0) = (1−p)ⁿ = <b>${fmt(p0, 3)}</b>, so P(at least one) = 1 − ${fmt(p0, 3)} = <b>${fmt(1 - p0, 3)}</b> (Day 20's calculation is the k = 0 bar). Sum of all bars = ${sum.toFixed(3)}.`;
  }
  sn.oninput = () => { n = +sn.value; render(); ctx.onChange(); }; sp.oninput = () => { pr = +sp.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ n, p: pr }), solve: () => { n = p.targetN ?? n; pr = p.targetP ?? pr; render(); ctx.onChange(); } };
};

export {};
