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
const txt = (x, y, s, extra = {}) => svgEl('text', { x, y, 'text-anchor': 'middle', 'font-size': 11, fill: '#3c3c3c', ...extra }, s);

// ---------- Day 26: a chain of stages, combinational ready chain vs registered backpressure ----------
// Combinational mode: each stage holds one item; ready_i = empty_i OR ready_{i+1}, so the sink's ready is felt by
// the source in the same cycle through a path of N gates. Registered mode: ready_i is a flip-flop computed from last
// cycle's occupancy, so each stage needs a second slot to absorb the item that was already on its way.
W.readychain = (root, p, ctx) => {
  const N = p.stages || 8, tGate = p.tGate ?? 0.4, period = p.period ?? 4;
  let mode = 'comb', stages = Array.from({ length: N }, () => []), t = 0, next = 1, sinkReady = true, inCount = 0, outCount = 0, outSeq = [], log = [];
  const body = box(root, `${N} elastic stages in a chain`, 'Step the clock, stall the sink, switch between a combinational ready chain and registered backpressure. Watch the ready path length and the slots each stage needs.');
  const svg = svgEl('svg', { viewBox: `0 0 ${80 + N * 52} 120`, width: 80 + N * 52, height: 120 });
  const ctrl = el('div', { class: 'ctrl' }), rd = readout('');
  body.append(svg, ctrl, rd);
  const cap = () => (mode === 'comb' ? 1 : 2);
  function step() {
    t++;
    // ready seen by stage i-1 when deciding to send into stage i
    const ready = Array(N + 1).fill(false);
    ready[N] = sinkReady;
    if (mode === 'comb') { for (let i = N - 1; i >= 0; i--) ready[i] = stages[i].length === 0 || ready[i + 1]; }
    else { for (let i = N - 1; i >= 0; i--) ready[i] = stages[i].length < 2; } // registered: based on last cycle's occupancy only
    // apply moves from the sink end
    if (stages[N - 1].length && ready[N]) { const it = stages[N - 1].shift(); outSeq.push(it); outCount++; }
    for (let i = N - 2; i >= 0; i--) if (stages[i].length && ready[i + 1]) stages[i + 1].push(stages[i].shift());
    if (ready[0]) { stages[0].push(next++); inCount++; }
    const occ = stages.reduce((a, s) => a + s.length, 0);
    log.push(`t=${t}: in ${inCount}, out ${outCount}, occupancy ${occ}${inCount - outCount === occ ? '' : ' ✖ conservation broken'}`);
  }
  function render() {
    svg.innerHTML = '';
    for (let i = 0; i < N; i++) {
      const x = 40 + i * 52;
      const c = cap();
      for (let s = 0; s < c; s++) {
        const y = 20 + s * 30, it = stages[i][s];
        svg.append(svgEl('rect', { x, y, width: 40, height: 26, rx: 6, fill: it ? '#1cb0f6' : '#fff', stroke: '#1899d6', 'stroke-width': 2 }));
        svg.append(txt(x + 20, y + 17, it ? `D${it}` : '', { fill: '#fff', 'font-weight': 800 }));
      }
      svg.append(txt(x + 20, 100, `S${i}`, { fill: '#777' }));
      if (i < N - 1) svg.append(svgEl('path', { d: `M${x + 42} 33 L${x + 50} 33`, stroke: '#aaa', 'stroke-width': 2 }));
    }
    svg.append(txt(20, 33, 'src', { fill: '#777' }));
    svg.append(txt(60 + N * 52, 33, sinkReady ? 'sink ✓' : 'sink ✖', { fill: sinkReady ? '#46a302' : '#ea2b2b', 'font-weight': 800 }));
    // the ready path
    const pathLen = mode === 'comb' ? N : 1;
    svg.append(svgEl('path', { d: `M${60 + N * 52 - 20} 88 L${mode === 'comb' ? 40 : 40 + (N - 1) * 52} 88`, stroke: '#ff9600', 'stroke-width': 3, 'marker-end': 'none' }));
    svg.append(txt(40 + (N * 52) / 2, 82, `ready path: ${pathLen} stage${pathLen > 1 ? 's' : ''} of logic ≈ ${fmt(pathLen * tGate)} ns of a ${period} ns clock`, { fill: '#ff9600', 'font-weight': 700 }));
    ctrl.innerHTML = '';
    ctrl.append(
      btn('step clock', () => { step(); render(); ctx.onChange(); }, 'g'),
      btn(sinkReady ? 'stall sink' : 'release sink', () => { sinkReady = !sinkReady; render(); ctx.onChange(); }),
      btn(mode === 'comb' ? 'switch to registered backpressure' : 'switch to combinational ready chain', () => { mode = mode === 'comb' ? 'reg' : 'comb'; stages = Array.from({ length: N }, () => []); t = 0; next = 1; inCount = 0; outCount = 0; outSeq = []; log = []; render(); ctx.onChange(); }, 'on'),
    );
    const occ = stages.reduce((a, s) => a + s.length, 0);
    const ordered = outSeq.every((v, i) => v === i + 1);
    rd.innerHTML = `mode: <b>${mode === 'comb' ? 'combinational ready chain (1 slot per stage, stop felt instantly)' : 'registered backpressure (2 slots per stage, stop felt one stage per cycle)'}</b><br>accepted in ${inCount}, out ${outCount}, occupancy ${occ} → in − out = ${inCount - outCount} ${inCount - outCount === occ ? '✓ conserved' : '✖'} · output order ${ordered ? '✓ prefix of input' : '✖ reordered'} · max in flight ${N * cap()}<br><span style="color:#777">${log.slice(-3).join('<br>') || 'no cycles yet'}</span>`;
  }
  render();
  return {
    getState: () => ({ mode, t, inCount, outCount, sinkReady }),
    solve: () => { if (mode !== 'reg') { mode = 'reg'; stages = Array.from({ length: N }, () => []); t = 0; next = 1; inCount = 0; outCount = 0; outSeq = []; log = []; } sinkReady = false; for (let i = 0; i < 10; i++) step(); render(); ctx.onChange(); }
  };
};

// ---------- Day 26: deadlock — two components each waiting for the other ----------
W.deadlock = (root, p, ctx) => {
  let aWaitsForReady = true, bWaitsForValid = true, cycles = 0, transfers = 0;
  const body = box(root, 'Who moves first? A source and a sink with rules', 'A (source) may or may not make valid wait for ready. B (sink) may or may not make ready wait for valid. Step and see whether anything ever transfers.');
  const ctrl = el('div', { class: 'ctrl' }), rd = readout('');
  body.append(ctrl, rd);
  function step() {
    cycles++;
    // combinational fixed point: with both waiting, nothing is ever asserted
    let valid = !aWaitsForReady, ready = !bWaitsForValid;
    if (aWaitsForReady && ready) valid = true;
    if (bWaitsForValid && valid) ready = true;
    if (valid && ready) transfers++;
    return { valid, ready };
  }
  let last = null;
  function render() {
    ctrl.innerHTML = '';
    ctrl.append(
      btn(`A: valid ${aWaitsForReady ? 'waits for ready (illegal)' : 'asserted when data exists (legal)'}`, () => { aWaitsForReady = !aWaitsForReady; render(); ctx.onChange(); }, aWaitsForReady ? '' : 'on'),
      btn(`B: ready ${bWaitsForValid ? 'waits for valid (legal for a sink)' : 'asserted whenever B has room'}`, () => { bWaitsForValid = !bWaitsForValid; render(); ctx.onChange(); }, bWaitsForValid ? '' : 'on'),
      btn('step', () => { last = step(); render(); ctx.onChange(); }, 'g'),
    );
    const dead = aWaitsForReady && bWaitsForValid;
    rd.innerHTML = `${last ? `last cycle: valid=${+last.valid} ready=${+last.ready} → ${last.valid && last.ready ? '<b>transfer</b>' : 'no transfer'}` : 'no cycles yet'}<br>cycles ${cycles}, transfers <b>${transfers}</b>${dead ? '<br><b style="color:#ea2b2b">DEADLOCK: A waits for B\'s ready, B waits for A\'s valid. Neither will ever assert first.</b>' : '<br><span style="color:#46a302">no cycle of waiting: progress is possible</span>'}`;
  }
  render();
  return { getState: () => ({ aWaitsForReady, bWaitsForValid, transfers, cycles }), solve: () => { aWaitsForReady = false; last = step(); render(); ctx.onChange(); } };
};

// ---------- Day 27: maximum power transfer ----------
W.maxpower = (root, p, ctx) => {
  let Vth = p.Vth ?? 5, Rth = p.Rth ?? 500, RL = p.RL ?? 1000;
  const body = box(root, 'Power into the load against R_L', 'Slide the load. Small R_L: lots of current but hardly any voltage. Large R_L: lots of voltage, hardly any current. The product peaks exactly where R_L = R_th, and efficiency there is only 50 %.');
  const sl = slider(50, 3000, 10, RL);
  const svg = svgEl('svg', { viewBox: '0 0 460 190', width: 460, height: 190 });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'R_L ', sl), svg, rd);
  const P = r => Vth * Vth * r / ((Rth + r) * (Rth + r));
  const Pmax = Vth * Vth / (4 * Rth);
  function render() {
    svg.innerHTML = '';
    const X = r => 40 + (r / 3000) * 400, Y = pw => 150 - (pw / Pmax) * 120, YE = e => 150 - e * 120;
    svg.append(svgEl('path', { d: 'M40 150 L440 150 M40 150 L40 20', stroke: '#999', 'stroke-width': 1.5, fill: 'none' }));
    let d = '', de = '';
    for (let r = 50; r <= 3000; r += 10) { d += `${r === 50 ? 'M' : 'L'}${X(r)} ${Y(P(r))} `; de += `${r === 50 ? 'M' : 'L'}${X(r)} ${YE(r / (Rth + r))} `; }
    svg.append(svgEl('path', { d, stroke: '#1cb0f6', 'stroke-width': 3, fill: 'none' }));
    svg.append(svgEl('path', { d: de, stroke: '#46a302', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '5 4' }));
    svg.append(svgEl('line', { x1: X(Rth), y1: 150, x2: X(Rth), y2: 25, stroke: '#ff9600', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
    svg.append(txt(X(Rth), 18, `R_L = R_th = ${Rth} Ω`, { fill: '#ff9600', 'font-weight': 700 }));
    svg.append(svgEl('circle', { cx: X(RL), cy: Y(P(RL)), r: 6, fill: '#ea2b2b' }));
    svg.append(txt(240, 170, 'R_L (Ω) →', { fill: '#777' }));
    svg.append(txt(80, 40, 'power (blue)', { fill: '#1cb0f6', 'font-weight': 700 }));
    svg.append(txt(400, 40, 'efficiency (green, 0–1)', { fill: '#46a302', 'font-weight': 700 }));
    rd.innerHTML = `V_th = ${Vth} V, R_th = ${Rth} Ω, R_L = <b>${RL} Ω</b><br>I = V_th/(R_th + R_L) = ${fmt(Vth / (Rth + RL) * 1000, 4)} mA, P_L = I²R_L = <b>${fmt(P(RL) * 1000, 4)} mW</b> (max possible ${fmt(Pmax * 1000, 4)} mW at ${Rth} Ω), efficiency R_L/(R_th + R_L) = <b>${fmt(100 * RL / (Rth + RL), 3)} %</b>`;
  }
  sl.oninput = () => { RL = +sl.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ RL, Rth, matched: RL === Rth }), solve: () => { RL = Rth; sl.value = RL; render(); ctx.onChange(); } };
};

// ---------- Day 29: wrap-bit pointers ----------
W.wrapbit = (root, p, ctx) => {
  const depth = p.depth || 8, A = Math.log2(depth), M = 2 * depth;
  let wr = 0, rd = 0, ops = 0, hist = [];
  const body = box(root, `Depth-${depth} FIFO with ${A + 1}-bit pointers (address bits + one wrap bit)`, 'Push and pop. The low bits address the memory; the top bit flips every time a pointer wraps. Read full and empty straight from the bits: no count register.');
  const svg = svgEl('svg', { viewBox: '0 0 460 90', width: 460, height: 90 });
  const ctrl = el('div', { class: 'ctrl' }), rd_ = readout('');
  body.append(svg, ctrl, rd_);
  const bits = v => v.toString(2).padStart(A + 1, '0');
  const occ = () => (wr - rd + M) % M;
  function push() { if (occ() === depth) { hist.push('push refused: full'); return; } wr = (wr + 1) % M; hist.push(`push → wr ${bits(wr)}`); }
  function pop() { if (occ() === 0) { hist.push('pop ignored: empty'); return; } rd = (rd + 1) % M; hist.push(`pop → rd ${bits(rd)}`); }
  function render() {
    svg.innerHTML = '';
    for (let i = 0; i < depth; i++) {
      const x = 30 + i * 50, filled = ((i - (rd % depth) + depth) % depth) < occ();
      svg.append(svgEl('rect', { x, y: 30, width: 42, height: 30, rx: 6, fill: filled ? '#1cb0f6' : '#fff', stroke: '#1899d6', 'stroke-width': 2 }));
      svg.append(txt(x + 21, 50, String(i), { fill: filled ? '#fff' : '#bbb', 'font-weight': 800 }));
      if (i === wr % depth) svg.append(txt(x + 21, 18, 'wr', { fill: '#ff9600', 'font-weight': 900 }));
      if (i === rd % depth) svg.append(txt(x + 21, 78, 'rd', { fill: '#46a302', 'font-weight': 900 }));
    }
    ctrl.innerHTML = '';
    ctrl.append(btn('push', () => { push(); ops++; render(); ctx.onChange(); }, 'g'), btn('pop', () => { pop(); ops++; render(); ctx.onChange(); }), btn('push + pop', () => { pop(); push(); ops++; render(); ctx.onChange(); }, 'on'));
    const wb = bits(wr), rb = bits(rd);
    const sameAddr = wb.slice(1) === rb.slice(1), sameWrap = wb[0] === rb[0];
    const empty = sameAddr && sameWrap, full = sameAddr && !sameWrap;
    rd_.innerHTML = `wr = <b>${wb[0]}</b>·${wb.slice(1)} &nbsp; rd = <b>${rb[0]}</b>·${rb.slice(1)} &nbsp; (wrap bit · address)<br>address bits ${sameAddr ? 'equal' : 'differ'}, wrap bits ${sameWrap ? 'equal' : 'differ'} → ${empty ? '<b>EMPTY</b>' : full ? '<b>FULL</b>' : `${occ()} item${occ() === 1 ? '' : 's'}`} &nbsp; occupancy = (wr − rd) mod ${M} = ${occ()}<br><span style="color:#777">with only ${A}-bit pointers this state would read as "${sameAddr ? 'wr == rd: empty or full?' : 'not equal'}"<br>${hist.slice(-3).join(' · ') || 'no operations yet'}</span>`;
  }
  render();
  return { getState: () => ({ wr, rd, occ: occ(), full: occ() === depth, empty: occ() === 0, ops }), solve: () => { for (let i = 0; i < depth; i++) { push(); ops++; } render(); ctx.onChange(); } };
};

// ---------- Day 29: read-during-write hazard ----------
W.rdw = (root, p, ctx) => {
  const start = p.start ?? 10, deltas = p.deltas || [3, 4];
  let mode = 'naive', cycle = 0, trace = [], done = false, mem = start, pending = null, final = null, stalled = false;
  const body = box(root, `Two back-to-back updates to one symbol (start ${start}, +${deltas.join(', +')})`, 'The write from one cycle only lands in the RAM the next cycle. Choose naive, forwarding or stall, then step. Only two of the three give the right answer, and one of them costs a cycle.');
  const ctrl = el('div', { class: 'ctrl' }), rd = readout('');
  body.append(ctrl, rd);
  let issued = 0;
  function reset() { cycle = 0; trace = []; done = false; mem = start; pending = null; final = null; issued = 0; stalled = false; }
  function step() {
    if (done) return;
    cycle++;
    // commit last cycle's write
    let note = '';
    if (pending !== null) { mem = pending; note = `write ${pending} lands in RAM; `; pending = null; }
    if (issued < deltas.length) {
      const d = deltas[issued];
      // read
      let seen = mem;
      // note: the pending value (if any) was already committed above, so what remains in flight is the value computed *this* cycle by the previous op
      const inflight = trace.length && trace[trace.length - 1].wrote !== undefined && trace[trace.length - 1].cycle === cycle - 1 ? trace[trace.length - 1].wrote : undefined;
      if (mode === 'stall' && inflight !== undefined && !stalled) { stalled = true; trace.push({ cycle, text: `op${issued + 1} (+${d}) stalled one cycle: a write to the same symbol is in flight` }); return; }
      if (mode === 'forward' && inflight !== undefined) { seen = inflight; note += `forwarded ${inflight} from the pending write; `; }
      else if (inflight !== undefined) { note += `RAM still holds ${mem} (stale); `; }
      const val = seen + d;
      pending = val; stalled = false;
      trace.push({ cycle, wrote: val, text: `op${issued + 1} reads ${seen}, adds ${d}, writes ${val}` });
      issued++;
      trace[trace.length - 1].text = note + trace[trace.length - 1].text;
    } else {
      final = mem; done = true;
      trace.push({ cycle, text: `${note}final value in RAM: ${mem}` });
    }
  }
  function render() {
    ctrl.innerHTML = '';
    for (const [m, label] of [['naive', 'naive'], ['forward', 'forwarding'], ['stall', 'stall']]) ctrl.append(btn(label, () => { mode = m; reset(); render(); ctx.onChange(); }, mode === m ? 'on' : ''));
    ctrl.append(btn('step', () => { step(); render(); ctx.onChange(); }, 'g'), btn('reset', () => { reset(); render(); ctx.onChange(); }));
    const correct = start + deltas.reduce((a, b) => a + b, 0);
    rd.innerHTML = `mode <b>${mode}</b> · cycle ${cycle} · RAM = ${mem}${pending !== null ? ` · pending write ${pending}` : ''}<br>${trace.map(t => `t=${t.cycle}: ${t.text}`).join('<br>') || 'press step'}${done ? `<br><b style="color:${final === correct ? '#46a302' : '#ea2b2b'}">final ${final} — ${final === correct ? 'correct' : `wrong, should be ${correct}`}</b> in ${cycle} cycles` : ''}`;
  }
  render();
  return { getState: () => ({ mode, done, final, cycles: cycle }), solve: () => { mode = 'forward'; reset(); while (!done) step(); render(); ctx.onChange(); } };
};

export {};
