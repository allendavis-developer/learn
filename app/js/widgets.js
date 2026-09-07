// Interactive simulations. Each widget: (root, props, ctx) => { getState(), solve()?, destroy()? }
// ctx.onChange() tells the lesson engine the learner interacted (enables Check for widget questions).
import { el, svgEl, bin, $, mdi } from './utils.js';

const W = {};
export const WIDGETS = W;

function box(root, title, hint) {
  root.classList.add('widget');
  if (title) root.append(el('div', { class: 'wtitle' }, '🧪 ', el('span', { html: mdi(title) })));
  const body = el('div');
  root.append(body);
  if (hint) root.append(el('div', { class: 'hint' }, hint));
  return body;
}
const btn = (label, onClick, cls = '') => el('button', { class: `wbtn ${cls}`, onClick, type: 'button' }, label);
const readout = html => el('div', { class: 'readout', html });
const toSigned = (v, w) => (v & (1 << (w - 1))) ? v - (1 << w) : v;
const mask = (v, w) => v & ((1 << w) - 1);

// ---------- 1. Bit toggler ----------
W.bits = (root, p, ctx) => {
  const w = p.width || 8;
  let value = mask(p.value || 0, w);
  const signed = !!p.signed;
  const body = box(root, p.title || 'Bit toggler', p.hint || (p.editable === false ? '' : 'Tap a bit to flip it.'));
  const bitsEl = el('div', { class: 'bits' });
  const out = readout('');
  body.append(bitsEl, out);
  function render() {
    bitsEl.innerHTML = '';
    for (let i = w - 1; i >= 0; i--) {
      const on = (value >> i) & 1;
      const b = el('div', { class: `bit ${on ? 'on' : ''} ${signed && i === w - 1 ? 'sign' : ''} ${p.editable === false ? 'ro' : ''}` },
        p.showWeights !== false ? el('span', { class: 'w' }, signed && i === w - 1 ? `-${2 ** i}` : `${2 ** i}`) : null, on);
      if (p.editable !== false) b.onclick = () => { value ^= (1 << i); render(); ctx.onChange(); };
      bitsEl.append(b);
    }
    const u = value, s = toSigned(value, w);
    let terms = [];
    for (let i = w - 1; i >= 0; i--) if ((value >> i) & 1) terms.push(signed && i === w - 1 ? `-${2 ** i}` : `${2 ** i}`);
    out.innerHTML = `binary <b>${bin(value, w)}</b> &nbsp; hex <b>0x${value.toString(16).toUpperCase().padStart(Math.ceil(w / 4), '0')}</b><br>` +
      `unsigned = ${terms.length ? terms.map(t => t.replace('-', '')).join(' + ') + ' = ' : ''}<b>${u}</b>` +
      (signed ? `<br>signed (two's complement) = ${terms.length ? terms.join(' + ') + ' = ' : ''}<b>${s}</b>` : '') +
      `<br><span style="color:#777">range: unsigned 0..${2 ** w - 1}${signed ? ` &nbsp; signed ${-(2 ** (w - 1))}..${2 ** (w - 1) - 1}` : ''}</span>`;
  }
  render();
  return { getState: () => ({ value, signed: toSigned(value, w) }), solve: () => { if (p.target !== undefined) { value = mask(p.target, w); render(); ctx.onChange(); } } };
};

// ---------- 2. Two's complement wheel ----------
W.wheel = (root, p, ctx) => {
  const n = p.bitsN || 4, N = 1 << n;
  let v = p.value || 0;
  const body = box(root, "Two's complement wheel", 'Drag the slider: the same bit pattern is one number unsigned and another signed. Watch it wrap.');
  const size = 300, r = 110, cx = 150, cy = 150;
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size });
  body.append(svg);
  const slider = el('input', { type: 'range', min: 0, max: N * 2 - 1, value: v });
  const out = readout('');
  body.append(el('div', { class: 'ctrl' }, 'pattern index ', slider), out);
  function render() {
    svg.innerHTML = '';
    svg.append(svgEl('circle', { cx, cy, r, fill: '#fff', stroke: '#e5e5e5', 'stroke-width': 3 }));
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const neg = i >= N / 2;
      const cur = i === (v % N);
      svg.append(svgEl('circle', { cx: x, cy: y, r: cur ? 16 : 12, fill: cur ? '#1cb0f6' : neg ? '#ffdfe0' : '#d7ffb8', stroke: cur ? '#1899d6' : '#ccc', 'stroke-width': 2 }));
      svg.append(svgEl('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: cur ? '#fff' : '#3c3c3c' }, bin(i, n)));
      const x2 = cx + Math.cos(a) * (r + 26), y2 = cy + Math.sin(a) * (r + 26);
      svg.append(svgEl('text', { x: x2, y: y2 + 4, 'text-anchor': 'middle', 'font-size': 11, fill: neg ? '#ea2b2b' : '#46a302', 'font-weight': 800 }, `${toSigned(i, n)}`));
      const x3 = cx + Math.cos(a) * (r - 30), y3 = cy + Math.sin(a) * (r - 30);
      svg.append(svgEl('text', { x: x3, y: y3 + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, `${i}`));
    }
    svg.append(svgEl('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, 'inside: unsigned'));
    svg.append(svgEl('text', { x: cx, y: cy + 12, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, 'outside: signed'));
    const i = v % N;
    out.innerHTML = `counted up <b>${v}</b> times from 0 → pattern <b>${bin(i, n)}</b> = unsigned <b>${i}</b> = signed <b>${toSigned(i, n)}</b>` +
      (v >= N ? `<br><span style="color:#ea2b2b">wrapped ${Math.floor(v / N)} time(s): ${n}-bit storage cannot hold ${v}</span>` : '');
  }
  slider.oninput = () => { v = +slider.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ v }) };
};

// ---------- 3. Logic / truth-table explorer ----------
W.logic = (root, p, ctx) => {
  // p.inputs: ['A','B'], p.fn: (A,B)=>0/1, p.outName
  const ins = p.inputs, n = ins.length;
  let state = ins.map(() => 0);
  const visited = new Set();
  const body = box(root, p.title || 'Truth-table explorer', p.hint || 'Toggle the inputs. Every combination you try fills in a row of the table.');
  const ctrl = el('div', { class: 'ctrl' });
  const lamp = el('div', { style: { width: '54px', height: '54px', borderRadius: '50%', border: '3px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 } });
  const tbl = el('table', { class: 'tbl' });
  body.append(ctrl, tbl);
  function render() {
    ctrl.innerHTML = '';
    ins.forEach((nm, i) => ctrl.append(btn(`${nm} = ${state[i]}`, () => { state[i] ^= 1; visited.add(state.join('')); render(); ctx.onChange(); }, state[i] ? 'on' : '')));
    const y = p.fn(...state) ? 1 : 0;
    lamp.textContent = `${p.outName || 'Y'}=${y}`;
    lamp.style.background = y ? '#ffc800' : '#eee';
    lamp.style.borderColor = y ? '#e5b400' : '#ccc';
    ctrl.append(el('span', { class: 'arrow' }, '→'), lamp);
    tbl.innerHTML = '';
    tbl.append(el('tr', {}, ...ins.map(x => el('th', {}, x)), el('th', {}, p.outName || 'Y')));
    for (let k = 0; k < (1 << n); k++) {
      const row = ins.map((_, i) => (k >> (n - 1 - i)) & 1);
      const key = row.join('');
      const cur = key === state.join('');
      const tr = el('tr', { style: cur ? { outline: '3px solid #1cb0f6' } : {} }, ...row.map(b => el('td', {}, b)),
        el('td', { class: visited.has(key) || cur ? 'ok' : '' }, visited.has(key) || cur ? (p.fn(...row) ? 1 : 0) : '?'));
      tbl.append(tr);
    }
  }
  visited.add(state.join(''));
  render();
  return { getState: () => ({ visited: visited.size, total: 1 << n }), solve: () => { for (let k = 0; k < (1 << n); k++) visited.add(bin(k, n)); render(); ctx.onChange(); } };
};

// ---------- 4. Ripple-carry adder ----------
W.adder = (root, p, ctx) => {
  const w = p.width || 8;
  let a = mask(p.a ?? 0, w), b = mask(p.b ?? 0, w);
  let signed = !!p.signed, sat = false;
  const body = box(root, p.title || 'Ripple-carry adder', p.hint || 'Tap bits of A and B. Carries ripple from the right. Switch the interpretation to see the same wires mean different numbers.');
  const grid = el('div');
  const out = readout('');
  const ctrl = el('div', { class: 'ctrl' });
  body.append(grid, ctrl, out);
  function row(label, val, editable, cls, setter) {
    const r = el('div', { class: 'bits', style: { justifyContent: 'flex-start', marginBottom: '6px' } });
    r.append(el('div', { style: { width: '52px', fontFamily: 'Consolas,monospace', alignSelf: 'center', fontWeight: 800 } }, label));
    for (let i = w - 1; i >= 0; i--) {
      const on = (val >> i) & 1;
      const be = el('div', { class: `bit ${on ? 'on' : ''} ${cls || ''} ${signed && i === w - 1 && cls !== 'ro' ? 'sign' : ''} ${editable ? '' : 'ro'}`, style: { width: '38px', height: '44px', fontSize: '20px' } }, on);
      if (editable) be.onclick = () => { setter(val ^ (1 << i)); };
      r.append(be);
    }
    return r;
  }
  function render() {
    grid.innerHTML = '';
    const sum = a + b, wrapped = mask(sum, w), cout = sum >> w;
    // carries into each bit
    let carries = [], c = 0;
    for (let i = 0; i < w; i++) { carries.push(c); const s = ((a >> i) & 1) + ((b >> i) & 1) + c; c = s >> 1; }
    const cr = el('div', { class: 'bits', style: { justifyContent: 'flex-start', marginBottom: '2px' } });
    cr.append(el('div', { style: { width: '52px', fontSize: '12px', color: '#777', alignSelf: 'center' } }, 'carry in'));
    for (let i = w - 1; i >= 0; i--) cr.append(el('div', { style: { width: '38px', textAlign: 'center', fontFamily: 'Consolas,monospace', color: carries[i] ? '#ff9600' : '#bbb', fontWeight: 800 } }, carries[i]));
    grid.append(cr);
    grid.append(row('A', a, p.editable !== false, '', v => { a = v; render(); ctx.onChange(); }));
    grid.append(row('B', b, p.editable !== false, '', v => { b = v; render(); ctx.onChange(); }));
    grid.append(el('div', { style: { borderTop: '3px solid #3c3c3c', margin: '4px 0 6px', marginLeft: '52px' } }));
    const shown = sat && signed ? mask(Math.max(-(2 ** (w - 1)), Math.min(2 ** (w - 1) - 1, toSigned(a, w) + toSigned(b, w))), w) : wrapped;
    grid.append(row('SUM', shown, false, 'ro'));
    const sa = toSigned(a, w), sb = toSigned(b, w), ss = sa + sb, sWrapped = toSigned(wrapped, w);
    const ovf = signed && ((sa >= 0 && sb >= 0 && sWrapped < 0) || (sa < 0 && sb < 0 && sWrapped >= 0));
    const satv = Math.max(-(2 ** (w - 1)), Math.min(2 ** (w - 1) - 1, ss));
    out.innerHTML = signed
      ? `A = <b>${sa}</b>, B = <b>${sb}</b> → true sum <b>${ss}</b><br>${w}-bit wrapped result = <b>${sWrapped}</b>${ovf ? ' <span style="color:#ea2b2b">⚠ signed OVERFLOW</span>' : ' ✓ fits'}<br>saturated result = <b>${satv}</b> &nbsp; carry-out bit = ${cout} <span style="color:#777">(carry-out ≠ overflow for signed!)</span>`
      : `A = <b>${a}</b>, B = <b>${b}</b> → true sum <b>${sum}</b><br>${w}-bit result = <b>${wrapped}</b>, carry-out = <b>${cout}</b>${cout ? ' <span style="color:#ea2b2b">⚠ unsigned overflow (needs ' + (w + 1) + ' bits)</span>' : ' ✓ fits'}`;
    ctrl.innerHTML = '';
    if (p.allowSignedToggle !== false) ctrl.append(btn(signed ? 'interpreting: SIGNED' : 'interpreting: UNSIGNED', () => { signed = !signed; render(); }, 'on'));
    if (signed) ctrl.append(btn(sat ? 'showing: SATURATE' : 'showing: WRAP', () => { sat = !sat; render(); }));
  }
  render();
  return { getState: () => ({ a, b, signed }), solve: () => { if (p.targetA !== undefined) { a = mask(p.targetA, w); b = mask(p.targetB, w); render(); ctx.onChange(); } } };
};

// ---------- 5. Widths of products ----------
W.widths = (root, p, ctx) => {
  let wa = p.a || 16, wb = p.b || 32;
  const body = box(root, 'How wide must the product be?', 'Drag the widths. The product of an m-bit and an n-bit unsigned value needs m+n bits: check the maximum values.');
  const sa = el('input', { type: 'range', min: 1, max: 32, value: wa }), sb = el('input', { type: 'range', min: 1, max: 32, value: wb });
  const svg = svgEl('svg', { viewBox: '0 0 640 130', width: 640, height: 130 });
  const out = readout('');
  body.append(el('div', { class: 'ctrl' }, 'width A ', sa, ' width B ', sb), svg, out);
  function bar(y, w, col, label) {
    svg.append(svgEl('rect', { x: 10, y, width: w * 9.5, height: 26, rx: 6, fill: col }));
    svg.append(svgEl('text', { x: 16 + w * 9.5, y: y + 18, 'font-size': 14, 'font-weight': 800, fill: '#3c3c3c' }, label));
  }
  function render() {
    svg.innerHTML = '';
    bar(6, wa, '#1cb0f6', `A: ${wa} bits`); bar(44, wb, '#58cc02', `B: ${wb} bits`); bar(88, wa + wb, '#ff9600', `A×B: ${wa + wb} bits`);
    const maxA = 2n ** BigInt(wa) - 1n, maxB = 2n ** BigInt(wb) - 1n, prod = maxA * maxB;
    out.innerHTML = `max A = 2^${wa}−1 = <b>${maxA}</b><br>max B = 2^${wb}−1 = <b>${maxB}</b><br>max product = <b>${prod}</b> needs <b>${prod.toString(2).length}</b> bits &nbsp;<span style="color:#777">(2^${wa + wb}−1 = ${2n ** BigInt(wa + wb) - 1n} fits in ${wa + wb})</span>`;
  }
  sa.oninput = () => { wa = +sa.value; render(); ctx.onChange(); };
  sb.oninput = () => { wb = +sb.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ wa, wb }) };
};

// ---------- 6. Priority encoder ----------
W.prienc = (root, p, ctx) => {
  const n = p.n || 8;
  let req = p.value || 0;
  let msbFirst = p.msbFirst !== false;
  const body = box(root, 'Priority encoder', 'Assert request lines. Only the highest-priority asserted line wins. Note what happens with no requests.');
  const bitsEl = el('div', { class: 'bits' });
  const out = readout('');
  const ctrl = el('div', { class: 'ctrl' });
  body.append(bitsEl, ctrl, out);
  function render() {
    bitsEl.innerHTML = '';
    let win = -1;
    if (req) { win = msbFirst ? 31 - Math.clz32(req) : Math.log2(req & -req); }
    for (let i = n - 1; i >= 0; i--) {
      const on = (req >> i) & 1;
      const b = el('div', { class: `bit ${on ? 'on' : ''}`, style: i === win ? { outline: '4px solid #ffc800' } : {} }, el('span', { class: 'w' }, `req${i}`), on);
      b.onclick = () => { req ^= 1 << i; render(); ctx.onChange(); };
      bitsEl.append(b);
    }
    out.innerHTML = win < 0 ? `no request asserted → <b>valid = 0</b>, index output is <b>don't-care / defined by contract</b> (we choose 0 and rely on valid)`
      : `winner = <b>req${win}</b> → index = <b>${bin(win, Math.ceil(Math.log2(n)))}</b> (${win}), <b>valid = 1</b>`;
    ctrl.innerHTML = '';
    ctrl.append(btn(msbFirst ? 'priority: highest index wins' : 'priority: lowest index wins', () => { msbFirst = !msbFirst; render(); }, 'on'));
  }
  render();
  return { getState: () => ({ req }), solve: () => { if (p.target !== undefined) { req = p.target; render(); ctx.onChange(); } } };
};

// ---------- 7. Python aliasing ----------
W.pyvars = (root, p, ctx) => {
  const lines = p.lines || ['a = [1, 2]', 'b = a', 'b.append(3)', 'c = a.copy()', 'c.append(4)', 'a = [9]'];
  let step = 0;
  const body = box(root, 'Names point at objects', 'Run each line. A name is an arrow to an object; assignment copies the arrow, not the object.');
  const code = el('pre');
  const svg = svgEl('svg', { viewBox: '0 0 560 170', width: 560, height: 170 });
  const ctrl = el('div', { class: 'ctrl' });
  body.append(code, svg, ctrl);
  function simulate(k) {
    const objs = [], names = {};
    for (let i = 0; i < k; i++) {
      const L = lines[i].replace(/\s/g, '');
      let m;
      if ((m = L.match(/^(\w+)=(\w+)\.copy\(\)$/))) { objs.push([...objs[names[m[2]]]]); names[m[1]] = objs.length - 1; }
      else if ((m = L.match(/^(\w+)=\[(.*)\]$/))) { objs.push(m[2] ? m[2].split(',').map(Number) : []); names[m[1]] = objs.length - 1; }
      else if ((m = L.match(/^(\w+)=(\w+)$/))) { names[m[1]] = names[m[2]]; }
      else if ((m = L.match(/^(\w+)\.append\((.+)\)$/))) { objs[names[m[1]]].push(Number(m[2])); }
    }
    return { objs, names };
  }
  function render() {
    code.innerHTML = lines.map((l, i) => `<span style="${i === step - 1 ? 'background:#58cc02;color:#fff;border-radius:4px;padding:0 4px' : i < step ? 'color:#aaa' : ''}">${l}</span>`).join('\n');
    const { objs, names } = simulate(step);
    svg.innerHTML = '';
    const nameKeys = Object.keys(names);
    const live = new Set(Object.values(names));
    nameKeys.forEach((nm, i) => {
      const y = 30 + i * 45;
      svg.append(svgEl('rect', { x: 20, y: y - 16, width: 44, height: 32, rx: 8, fill: '#fff', stroke: '#3c3c3c', 'stroke-width': 2 }));
      svg.append(svgEl('text', { x: 42, y: y + 5, 'text-anchor': 'middle', 'font-family': 'Consolas,monospace', 'font-weight': 700 }, nm));
      const oy = 30 + names[nm] * 45;
      svg.append(svgEl('line', { x1: 66, y1: y, x2: 220, y2: oy, stroke: '#1cb0f6', 'stroke-width': 3, 'marker-end': 'url(#arr)' }));
    });
    svg.prepend(svgEl('defs', {}, svgEl('marker', { id: 'arr', markerWidth: 8, markerHeight: 8, refX: 6, refY: 4, orient: 'auto' }, svgEl('path', { d: 'M0,0 L8,4 L0,8 z', fill: '#1cb0f6' }))));
    objs.forEach((o, j) => {
      const y = 30 + j * 45;
      const dead = !live.has(j);
      svg.append(svgEl('rect', { x: 225, y: y - 16, width: 40 + Math.max(1, o.length) * 34, height: 32, rx: 8, fill: dead ? '#f3f3f3' : '#ddf4ff', stroke: dead ? '#ccc' : '#1899d6', 'stroke-width': 2, 'stroke-dasharray': dead ? '4 3' : '' }));
      svg.append(svgEl('text', { x: 232, y: y + 5, 'font-size': 12, fill: '#777' }, 'list'));
      o.forEach((v, k) => svg.append(svgEl('text', { x: 268 + k * 34, y: y + 6, 'font-family': 'Consolas,monospace', 'font-weight': 700, fill: dead ? '#aaa' : '#3c3c3c' }, v)));
      if (dead) svg.append(svgEl('text', { x: 280 + o.length * 34, y: y + 5, 'font-size': 11, fill: '#aaa' }, 'unreachable → garbage'));
    });
    ctrl.innerHTML = '';
    ctrl.append(btn('▶ run next line', () => { if (step < lines.length) { step++; render(); ctx.onChange(); } }, 'g'), btn('↺ reset', () => { step = 0; render(); }));
    ctrl.append(el('span', { class: 'mono', style: { marginLeft: '10px' } }, step ? `after line ${step}: ` + nameKeys.map(n => `${n}=${JSON.stringify(objs[names[n]])}`).join('  ') : 'nothing run yet'));
  }
  render();
  return { getState: () => ({ step }), solve: () => { step = lines.length; render(); ctx.onChange(); } };
};

// ---------- 8. Frequency counter stepper ----------
W.freqcount = (root, p, ctx) => {
  const items = p.items || ['a', 'b', 'a', 'c', 'b', 'a'];
  let i = 0;
  const body = box(root, 'Frequency counter, one item at a time', 'Each step: look the item up, add 1 (starting from 0 if unseen).');
  const seq = el('div', { class: 'queue', style: { marginBottom: '8px' } });
  const dict = readout('');
  const ctrl = el('div', { class: 'ctrl' });
  body.append(seq, dict, ctrl);
  function render() {
    seq.innerHTML = '';
    items.forEach((x, k) => seq.append(el('div', { class: `slot ${k < i ? 'full' : ''} ${k === i ? 'hl' : ''}` }, x)));
    const counts = {};
    for (let k = 0; k < i; k++) counts[items[k]] = (counts[items[k]] || 0) + 1;
    dict.innerHTML = `counts = <b>{${Object.entries(counts).map(([k, v]) => `'${k}': ${v}`).join(', ')}}</b>` + (i < items.length ? `<br>next: '${items[i]}' → counts.get('${items[i]}', 0) + 1 = ${(counts[items[i]] || 0) + 1}` : '<br>done. Empty input gives <b>{}</b>: define that explicitly.');
    ctrl.innerHTML = '';
    ctrl.append(btn('▶ step', () => { if (i < items.length) { i++; render(); ctx.onChange(); } }, 'g'), btn('↺ reset', () => { i = 0; render(); }));
  }
  render();
  return { getState: () => ({ i }), solve: () => { i = items.length; render(); ctx.onChange(); } };
};

// ---------- 9. Array max with invariant ----------
W.arraystep = (root, p, ctx) => {
  const arr = p.arr || [3, 9, 2, 9, 5];
  let i = 0, best = null, bestIdx = -1, comps = 0;
  const strict = p.strict !== false; // first index of max: update only on strictly greater
  const body = box(root, 'Find the max and its first index', 'Step through. The green box is what the invariant promises is true right now.');
  const seq = el('div', { class: 'queue', style: { marginBottom: '8px' } });
  const inv = el('div', { class: 'key' });
  const out = readout('');
  const ctrl = el('div', { class: 'ctrl' });
  body.append(seq, inv, out, ctrl);
  function render() {
    seq.innerHTML = '';
    arr.forEach((x, k) => seq.append(el('div', { class: `slot ${k < i ? 'full' : ''} ${k === i ? 'hl' : ''}`, style: k === bestIdx ? { background: '#ffc800', borderColor: '#e5b400', color: '#3c3c3c' } : {} }, x)));
    inv.innerHTML = `<b>Invariant</b> after processing <code>arr[0..${i - 1}]</code>: <code>best</code> is the maximum of those ${i} element(s) and <code>bestIdx</code> is the <b>first</b> index where it occurs. ${i === 0 ? 'Zero elements processed: best is undefined, so the empty-array case must be decided explicitly.' : ''}`;
    out.innerHTML = `i = <b>${i}</b> &nbsp; best = <b>${best === null ? 'None' : best}</b> &nbsp; bestIdx = <b>${bestIdx}</b> &nbsp; comparisons = <b>${comps}</b>` + (i < arr.length ? `<br>next: is arr[${i}]=${arr[i]} ${strict ? '>' : '≥'} best? ${best === null ? '(first element: no comparison, just take it)' : (strict ? arr[i] > best : arr[i] >= best) ? 'yes → update' : 'no → keep'}` : `<br>done: ${arr.length} elements, ${comps} comparisons = n−1.`);
    ctrl.innerHTML = '';
    ctrl.append(btn('▶ step', () => {
      if (i >= arr.length) return;
      if (best === null) { best = arr[i]; bestIdx = i; }
      else { comps++; if (strict ? arr[i] > best : arr[i] >= best) { best = arr[i]; bestIdx = i; } }
      i++; render(); ctx.onChange();
    }, 'g'), btn('↺ reset', () => { i = 0; best = null; bestIdx = -1; comps = 0; render(); }));
  }
  render();
  return { getState: () => ({ i, best, bestIdx, comps }), solve: () => { while (i < arr.length) { if (best === null) { best = arr[i]; bestIdx = i; } else { comps++; if (arr[i] > best) { best = arr[i]; bestIdx = i; } } i++; } render(); ctx.onChange(); } };
};

// ---------- 10. Two-sum hash stepper ----------
W.twosum = (root, p, ctx) => {
  const arr = p.arr || [3, 5, 2, 5, 1], target = p.target ?? 10;
  let i = 0, seen = {}, found = null;
  const body = box(root, `Two-sum with a hash map (target ${target})`, 'For each x: look up target−x first, THEN insert x. Order matters when x pairs with itself.');
  const seq = el('div', { class: 'queue', style: { marginBottom: '8px' } });
  const out = readout('');
  const ctrl = el('div', { class: 'ctrl' });
  body.append(seq, out, ctrl);
  function render() {
    seq.innerHTML = '';
    arr.forEach((x, k) => seq.append(el('div', { class: `slot ${k < i ? 'full' : ''} ${k === i ? 'hl' : ''}`, style: found && (k === found[0] || k === found[1]) ? { background: '#58cc02', borderColor: '#46a302' } : {} }, x)));
    const need = i < arr.length ? target - arr[i] : null;
    out.innerHTML = `seen = <b>{${Object.entries(seen).map(([k, v]) => `${k}: idx ${v}`).join(', ')}}</b>` +
      (found ? `<br><b style="color:#46a302">found: indices ${found[0]} and ${found[1]} (${arr[found[0]]} + ${arr[found[1]]} = ${target})</b>`
        : i < arr.length ? `<br>x = arr[${i}] = ${arr[i]} → need ${need}. ${need in seen ? `<b>${need} is in seen</b> → answer.` : `${need} not seen yet → insert ${arr[i]} at idx ${i}.`}${need === arr[i] ? ' <span style="color:#ff9600">(x pairs with itself: lookup-before-insert stops a value matching its own position)</span>' : ''}` : '<br>no pair found');
    ctrl.innerHTML = '';
    ctrl.append(btn('▶ step', () => {
      if (i >= arr.length || found) return;
      const x = arr[i], nd = target - x;
      if (nd in seen) found = [seen[nd], i]; else if (!(x in seen)) seen[x] = i;
      i++; render(); ctx.onChange();
    }, 'g'), btn('↺ reset', () => { i = 0; seen = {}; found = null; render(); }));
  }
  render();
  return { getState: () => ({ i, found }), solve: () => { while (i < arr.length && !found) { const x = arr[i], nd = target - x; if (nd in seen) found = [seen[nd], i]; else if (!(x in seen)) seen[x] = i; i++; } render(); ctx.onChange(); } };
};

// ---------- 11. Prefix-sum counter ----------
W.prefixsum = (root, p, ctx) => {
  const arr = p.arr || [1, -1, 1], K = p.k ?? 1;
  let i = 0, cur = 0, counts = { 0: 1 }, ans = 0, log = [];
  const body = box(root, `Count subarrays summing to K = ${K}`, 'Prefix sums: a subarray ending here sums to K exactly when an earlier prefix equals (current − K).');
  const seq = el('div', { class: 'queue', style: { marginBottom: '8px' } });
  const out = readout('');
  const ctrl = el('div', { class: 'ctrl' });
  body.append(seq, out, ctrl);
  function render() {
    seq.innerHTML = '';
    arr.forEach((x, k) => seq.append(el('div', { class: `slot ${k < i ? 'full' : ''} ${k === i ? 'hl' : ''}` }, x)));
    out.innerHTML = `current prefix = <b>${cur}</b> &nbsp; counts of earlier prefixes = <b>{${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')}}</b> &nbsp; answer so far = <b>${ans}</b>` +
      (i < arr.length ? `<br>next: read ${arr[i]} → prefix becomes ${cur + arr[i]}; look up ${cur + arr[i] - K} → found ${counts[cur + arr[i] - K] || 0} time(s); then record prefix ${cur + arr[i]}.` : `<br>done: <b>${ans}</b> subarrays.`) +
      (log.length ? `<br><span style="color:#777">${log.join(' · ')}</span>` : '');
    ctrl.innerHTML = '';
    ctrl.append(btn('▶ step', () => {
      if (i >= arr.length) return;
      cur += arr[i]; const got = counts[cur - K] || 0; ans += got; counts[cur] = (counts[cur] || 0) + 1;
      log.push(`step ${i + 1}: +${got}`); i++; render(); ctx.onChange();
    }, 'g'), btn('↺ reset', () => { i = 0; cur = 0; counts = { 0: 1 }; ans = 0; log = []; render(); }));
  }
  render();
  return { getState: () => ({ i, ans }), solve: () => { while (i < arr.length) { cur += arr[i]; ans += counts[cur - K] || 0; counts[cur] = (counts[cur] || 0) + 1; i++; } render(); ctx.onChange(); } };
};

// ---------- 12. Byte / field inspector ----------
W.bytes = (root, p, ctx) => {
  const bytes = p.bytes, fields = p.fields; // fields: {name, off, len}
  let sel = -1, big = true;
  const body = box(root, p.title || 'Message bytes', 'Tap a field to see how its bytes combine. Network order = big-endian: the first byte is the most significant.');
  const hex = el('div', { class: 'bits', style: { justifyContent: 'flex-start', gap: '4px' } });
  const legend = el('div', { class: 'ctrl' });
  const out = readout('');
  body.append(hex, legend, out);
  const cols = ['#1cb0f6', '#58cc02', '#ff9600', '#ce82ff', '#ffc800', '#ff4b4b', '#1899d6', '#46a302'];
  function fieldOf(k) { return fields.findIndex(f => k >= f.off && k < f.off + f.len); }
  function render() {
    hex.innerHTML = '';
    bytes.forEach((b, k) => {
      const f = fieldOf(k);
      const on = f === sel;
      const e = el('div', { class: 'bit', style: { width: '36px', height: '46px', fontSize: '15px', background: on ? cols[f % cols.length] : '#fff', color: on ? '#fff' : '#3c3c3c', borderColor: f >= 0 ? cols[f % cols.length] : '#e5e5e5' } }, el('span', { class: 'w' }, k), b.toString(16).toUpperCase().padStart(2, '0'));
      e.onclick = () => { sel = f; render(); ctx.onChange(); };
      hex.append(e);
    });
    legend.innerHTML = '';
    fields.forEach((f, i) => legend.append(btn(`${f.name} (${f.len}B)`, () => { sel = i; render(); ctx.onChange(); }, sel === i ? 'on' : '')));
    legend.append(btn(big ? 'big-endian (network)' : 'little-endian (host x86)', () => { big = !big; render(); }));
    if (sel < 0) { out.innerHTML = 'select a field'; return; }
    const f = fields[sel], bs = bytes.slice(f.off, f.off + f.len);
    const ordered = big ? bs : bs.slice().reverse();
    let v = 0n; for (const b of ordered) v = v * 256n + BigInt(b);
    out.innerHTML = `<b>${f.name}</b>: bytes[${f.off}..${f.off + f.len - 1}] = ${bs.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}<br>` +
      (f.len > 1 ? `${big ? 'big' : 'little'}-endian: ${ordered.map((b, i) => `${b}×256^${f.len - 1 - i}`).join(' + ')} = <b>${v}</b>${!big ? ' <span style="color:#ea2b2b">(wrong for a network format!)</span>' : ''}` : `value = <b>${v}</b>`) + (f.note ? `<br><span style="color:#777">${f.note}</span>` : '');
  }
  render();
  return { getState: () => ({ sel, big }), solve: () => { sel = 0; render(); ctx.onChange(); } };
};

// ---------- 13. Register trace (nonblocking) ----------
W.regtrace = (root, p, ctx) => {
  const init = p.init || { a: 1, b: 2 };
  const assigns = p.assigns || [['a', 'b'], ['b', 'a']]; // a <= b; b <= a
  let regs = { ...init }, edges = 0, blocking = false, hist = [{ ...init }];
  const body = box(root, 'Clocked registers: what happens at an edge?', 'Press the clock. Nonblocking (<=) uses the values from BEFORE the edge for every right-hand side. Compare with sequential (blocking) semantics.');
  const code = el('pre');
  const svg = svgEl('svg', { viewBox: '0 0 420 120', width: 420, height: 120 });
  const tbl = el('table', { class: 'tbl' });
  const ctrl = el('div', { class: 'ctrl' });
  body.append(code, svg, ctrl, tbl);
  function render() {
    code.innerHTML = `always_ff @(posedge clk) begin\n${assigns.map(([l, r]) => `  ${l} ${blocking ? '=' : '<='} ${r};`).join('\n')}\nend   // ${blocking ? 'BLOCKING: sequential, like software' : 'NONBLOCKING: all RHS read old values, all LHS update together'}`;
    svg.innerHTML = '';
    Object.keys(regs).forEach((k, i) => {
      const x = 40 + i * 180;
      svg.append(svgEl('rect', { x, y: 20, width: 120, height: 70, rx: 10, fill: '#fff', stroke: '#1899d6', 'stroke-width': 3 }));
      svg.append(svgEl('text', { x: x + 60, y: 45, 'text-anchor': 'middle', 'font-size': 14, fill: '#777' }, `register ${k}`));
      svg.append(svgEl('text', { x: x + 60, y: 78, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 900, fill: '#1899d6' }, regs[k]));
      svg.append(svgEl('path', { d: `M${x + 8},92 l8,-10 l8,10`, fill: 'none', stroke: '#3c3c3c', 'stroke-width': 2 }));
    });
    svg.append(svgEl('text', { x: 400, y: 110, 'text-anchor': 'end', 'font-size': 13, fill: '#777' }, `edges so far: ${edges}`));
    tbl.innerHTML = '';
    tbl.append(el('tr', {}, el('th', {}, 'after edge'), ...Object.keys(init).map(k => el('th', {}, k))));
    hist.forEach((h, i) => tbl.append(el('tr', {}, el('td', {}, i), ...Object.keys(init).map(k => el('td', {}, h[k])))));
    ctrl.innerHTML = '';
    ctrl.append(btn('⏱ clock edge', () => {
      if (blocking) { const r = { ...regs }; for (const [l, rr] of assigns) r[l] = r[rr]; regs = r; }
      else { const old = { ...regs }; const r = { ...regs }; for (const [l, rr] of assigns) r[l] = old[rr]; regs = r; }
      edges++; hist.push({ ...regs }); render(); ctx.onChange();
    }, 'g'), btn(blocking ? 'mode: blocking (=)' : 'mode: nonblocking (<=)', () => { blocking = !blocking; regs = { ...init }; edges = 0; hist = [{ ...init }]; render(); }, 'on'), btn('↺ reset', () => { regs = { ...init }; edges = 0; hist = [{ ...init }]; render(); }));
  }
  render();
  return { getState: () => ({ edges, regs, blocking }), solve: () => { for (let k = 0; k < 3; k++) { const old = { ...regs }; const r = { ...regs }; for (const [l, rr] of assigns) r[l] = old[rr]; regs = r; edges++; hist.push({ ...regs }); } render(); ctx.onChange(); } };
};

// ---------- 14. FSM simulator (row layout + state table: no overlapping edges) ----------
W.fsm = (root, p, ctx) => {
  const states = p.states, T = p.transitions, inputs = p.inputs, init = p.init || states[0];
  let cur = init, history = [init], last = null, extra = { ...(p.extraInit || {}) };
  const body = box(root, p.title || 'State machine', p.hint || 'Press an input event. The arc shows the transition you just took; the table is the complete specification.');
  const n = states.length, bw = 96, gap = 28, W0 = 20, width = W0 * 2 + n * bw + (n - 1) * gap, H = 150;
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${H}`, width, height: H });
  const tbl = el('table', { class: 'tbl', style: { marginTop: '8px' } });
  const ctrl = el('div', { class: 'ctrl' });
  const out = readout('');
  body.append(svg, ctrl, tbl, out);
  const cx = i => W0 + i * (bw + gap) + bw / 2;
  function render() {
    svg.innerHTML = '';
    svg.append(svgEl('defs', {}, svgEl('marker', { id: 'fa', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto' }, svgEl('path', { d: 'M0,0 L8,4 L0,8 z', fill: '#ff9600' }))));
    const y0 = 60;
    states.forEach((s, i) => {
      const on = s === cur;
      svg.append(svgEl('rect', { x: cx(i) - bw / 2, y: y0, width: bw, height: 44, rx: 12, fill: on ? '#58cc02' : '#fff', stroke: on ? '#46a302' : '#ccc', 'stroke-width': 3 }));
      svg.append(svgEl('text', { x: cx(i), y: y0 + 28, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 900, fill: on ? '#fff' : '#3c3c3c' }, s));
    });
    if (last) {
      const i = states.indexOf(last.from), j = states.indexOf(last.to);
      const x1 = cx(i), x2 = cx(j);
      let d, lx, ly;
      if (i === j) { d = `M${x1 - 20},${y0} C${x1 - 40},${y0 - 55} ${x1 + 40},${y0 - 55} ${x1 + 20},${y0}`; lx = x1; ly = y0 - 44; }
      else if (j > i) { const mid = (x1 + x2) / 2; d = `M${x1 + 10},${y0} Q${mid},${y0 - 70} ${x2 - 10},${y0}`; lx = mid; ly = y0 - 40; }
      else { const mid = (x1 + x2) / 2; d = `M${x1 - 10},${y0 + 44} Q${mid},${y0 + 114} ${x2 + 10},${y0 + 44}`; lx = mid; ly = y0 + 88; }
      svg.append(svgEl('path', { d, fill: 'none', stroke: '#ff9600', 'stroke-width': 3, 'marker-end': 'url(#fa)' }));
      svg.append(svgEl('text', { x: lx, y: ly, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: '#ff9600' }, last.input));
    } else svg.append(svgEl('text', { x: width / 2, y: 30, 'text-anchor': 'middle', 'font-size': 12, fill: '#999' }, 'press an input to take a transition'));
    // state table
    tbl.innerHTML = '';
    tbl.append(el('tr', {}, el('th', {}, 'state \ input'), ...inputs.map(x => el('th', {}, x))));
    states.forEach(s => {
      const tr = el('tr', { style: s === cur ? { outline: '3px solid #58cc02' } : {} });
      tr.append(el('td', { style: { fontWeight: 900 } }, s));
      inputs.forEach(inp => { const nx = (T[s] || {})[inp]; tr.append(el('td', { class: last && last.from === s && last.input === inp ? 'ok' : '', style: nx ? {} : { color: '#bbb' } }, nx || '—')); });
      tbl.append(tr);
    });
    ctrl.innerHTML = '';
    inputs.forEach(inp => ctrl.append(btn(inp, () => {
      const nxt = (T[cur] || {})[inp];
      if (p.onEvent) p.onEvent(cur, inp, extra);
      if (nxt) { last = { from: cur, to: nxt, input: inp }; cur = nxt; history.push(cur); }
      render(); ctx.onChange();
    }, inp.toLowerCase().includes('reset') ? 'r' : (T[cur] || {})[inp] ? 'g' : '')));
    out.innerHTML = `state = <b>${cur}</b>${p.extraRender ? '<br>' + p.extraRender(extra, cur) : ''}<br><span style="color:#777">path: ${history.join(' → ')}</span><br><span style="color:#777">"—" in the table = no transition defined for that input in that state (stay). Every cell must be a deliberate decision.</span>`;
  }
  render();
  return { getState: () => ({ state: cur, history, extra }), solve: () => { if (p.solvePath) { for (const inp of p.solvePath) { const nxt = (T[cur] || {})[inp]; if (p.onEvent) p.onEvent(cur, inp, extra); if (nxt) { last = { from: cur, to: nxt, input: inp }; cur = nxt; history.push(cur); } } render(); ctx.onChange(); } } };
};

// ---------- 15. UART frame ----------
W.uart = (root, p, ctx) => {
  let byte = p.byte ?? 0x55;
  const body = box(root, 'UART frame: idle-high, start, 8 data bits LSB first, stop', 'Edit the data byte. The line is high when idle; a low start bit announces a frame.');
  const bitsEl = el('div', { class: 'bits', style: { marginBottom: '8px' } });
  const svg = svgEl('svg', { viewBox: '0 0 640 120', width: 640, height: 120 });
  const out = readout('');
  body.append(bitsEl, svg, out);
  function render() {
    bitsEl.innerHTML = '';
    for (let i = 7; i >= 0; i--) {
      const on = (byte >> i) & 1;
      const b = el('div', { class: `bit ${on ? 'on' : ''}`, style: { width: '36px', height: '46px', fontSize: '18px' } }, el('span', { class: 'w' }, `d${i}`), on);
      b.onclick = () => { byte ^= 1 << i; render(); ctx.onChange(); };
      bitsEl.append(b);
    }
    const seq = [['idle', 1], ['start', 0]];
    for (let i = 0; i < 8; i++) seq.push([`d${i}`, (byte >> i) & 1]);
    seq.push(['stop', 1], ['idle', 1]);
    svg.innerHTML = '';
    const cw = 640 / seq.length;
    let path = '';
    seq.forEach(([nm, v], i) => {
      const x = i * cw, y = v ? 30 : 80;
      path += (i ? `L${x},${y} ` : `M${x},${y} `) + `L${x + cw},${y} `;
      svg.append(svgEl('rect', { x, y: 15, width: cw, height: 80, fill: nm === 'start' ? '#ffdfe0' : nm === 'stop' ? '#d7ffb8' : nm === 'idle' ? '#f3f3f3' : (i % 2 ? '#fff' : '#f7fbff'), stroke: '#eee' }));
      svg.append(svgEl('text', { x: x + cw / 2, y: 110, 'text-anchor': 'middle', 'font-size': 11, fill: '#777', 'font-weight': 800 }, nm));
      svg.append(svgEl('text', { x: x + cw / 2, y: v ? 24 : 96, 'text-anchor': 'middle', 'font-size': 11, fill: '#1899d6', 'font-weight': 800 }, v));
    });
    svg.append(svgEl('path', { d: path, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    const baud = p.baud || 115200, clk = p.clk || 50e6;
    out.innerHTML = `byte = <b>0x${byte.toString(16).toUpperCase().padStart(2, '0')}</b> = ${bin(byte, 8)} → on the wire (time →): start=0, then d0..d7 = <b>${[...Array(8)].map((_, i) => (byte >> i) & 1).join('')}</b>, stop=1<br>` +
      `at ${baud} baud each bit lasts ${(1e6 / baud).toFixed(2)} µs; with a ${clk / 1e6} MHz clock the divisor is ${clk}/${baud} = <b>${(clk / baud).toFixed(1)}</b> → integer ${Math.round(clk / baud)} (error ${(Math.abs(Math.round(clk / baud) * baud - clk) / clk * 100).toFixed(2)}%)`;
  }
  render();
  return { getState: () => ({ byte }), solve: () => { if (p.target !== undefined) { byte = p.target; render(); ctx.onChange(); } } };
};

// ---------- 16. Valid/ready waveform editor ----------
W.waveform = (root, p, ctx) => {
  const n = p.cycles || 6;
  let valid = (p.valid || Array(n).fill(0)).slice(), ready = (p.ready || Array(n).fill(1)).slice();
  const data = p.data || Array.from({ length: n }, (_, i) => `D${i}`);
  const editable = p.editable || ['valid', 'ready'];
  const body = box(root, p.title || 'valid / ready handshake', p.hint || 'Tap cells to toggle. A transfer happens on an edge where BOTH valid and ready are 1.');
  const svg = svgEl('svg', { viewBox: `0 0 ${80 + n * 70} 190`, width: 80 + n * 70, height: 190, class: 'wave' });
  const out = readout('');
  body.append(svg, out);
  function render() {
    svg.innerHTML = '';
    const rows = [['clk', null], ['valid', valid], ['ready', ready], ['data', null]];
    for (let i = 0; i < n; i++) {
      const x = 80 + i * 70;
      const xfer = valid[i] && ready[i];
      svg.append(svgEl('rect', { x, y: 0, width: 70, height: 190, fill: xfer ? '#d7ffb8' : (i % 2 ? '#fafafa' : '#fff') }));
      svg.append(svgEl('text', { x: x + 35, y: 12, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, `cycle ${i}`));
      if (xfer) svg.append(svgEl('text', { x: x + 35, y: 185, 'text-anchor': 'middle', 'font-size': 11, fill: '#46a302', 'font-weight': 900 }, 'TRANSFER'));
    }
    rows.forEach(([nm, arr], r) => {
      const y = 30 + r * 38;
      svg.append(svgEl('text', { x: 70, y: y + 22, 'text-anchor': 'end', 'font-size': 13, 'font-weight': 800, fill: '#3c3c3c' }, nm));
      if (nm === 'clk') {
        let d = '';
        for (let i = 0; i < n; i++) { const x = 80 + i * 70; d += `M${x},${y + 30} L${x},${y + 4} L${x + 35},${y + 4} L${x + 35},${y + 30} L${x + 70},${y + 30} `; }
        svg.append(svgEl('path', { d, fill: 'none', stroke: '#999', 'stroke-width': 2 }));
      } else if (nm === 'data') {
        for (let i = 0; i < n; i++) {
          const x = 80 + i * 70;
          svg.append(svgEl('rect', { x: x + 3, y: y + 4, width: 64, height: 26, rx: 6, fill: valid[i] ? '#ddf4ff' : '#eee', stroke: valid[i] ? '#1899d6' : '#ccc' }));
          svg.append(svgEl('text', { x: x + 35, y: y + 22, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: valid[i] ? '#1899d6' : '#aaa' }, valid[i] ? data[i] : 'x'));
        }
      } else {
        let d = '';
        for (let i = 0; i < n; i++) {
          const x = 80 + i * 70, yy = arr[i] ? y + 4 : y + 30;
          d += (i ? `L${x},${yy} ` : `M${x},${yy} `) + `L${x + 70},${yy} `;
          const cell = svgEl('rect', { x, y, width: 70, height: 36, fill: 'transparent', class: editable.includes(nm) ? 'cell' : '' });
          if (editable.includes(nm)) cell.addEventListener('click', () => { arr[i] ^= 1; render(); ctx.onChange(); });
          svg.append(cell);
        }
        svg.append(svgEl('path', { d, fill: 'none', stroke: nm === 'valid' ? '#1cb0f6' : '#ff9600', 'stroke-width': 3, 'pointer-events': 'none' }));
      }
    });
    const xfers = [];
    for (let i = 0; i < n; i++) if (valid[i] && ready[i]) xfers.push(i);
    out.innerHTML = `valid = [${valid.join(',')}] &nbsp; ready = [${ready.join(',')}]<br>transfers at cycle index: <b>${xfers.length ? xfers.join(', ') : 'none'}</b> (${xfers.length} item(s) moved)` +
      (valid.some((v, i) => v && !ready[i]) ? `<br><span style="color:#ff9600">stalled cycles: ${valid.map((v, i) => v && !ready[i] ? i : null).filter(x => x !== null).join(', ')} — the source must hold its data steady there.</span>` : '');
  }
  render();
  return { getState: () => ({ valid: valid.slice(), ready: ready.slice() }), solve: () => { if (p.targetValid) valid = p.targetValid.slice(); if (p.targetReady) ready = p.targetReady.slice(); render(); ctx.onChange(); } };
};

// ---------- 17. Pipeline latency vs throughput ----------
W.pipeline = (root, p, ctx) => {
  const S = p.stages || 4;
  let stages = Array(S).fill(null), t = 0, next = 1, sinkReady = true, srcValid = true, log = [], inCount = 0, outCount = 0;
  const body = box(root, `${S}-stage pipeline`, 'Step the clock. Items move one stage per cycle when the stage ahead can take them. Stall the sink and watch backpressure.');
  const svg = svgEl('svg', { viewBox: `0 0 ${140 + S * 90} 110`, width: 140 + S * 90, height: 110 });
  const ctrl = el('div', { class: 'ctrl' });
  const out = readout('');
  body.append(svg, ctrl, out);
  function step() {
    // compute movement from the end backwards
    const canAdvance = Array(S).fill(false);
    let nextFree = sinkReady; // can stage S-1 push out?
    for (let i = S - 1; i >= 0; i--) {
      canAdvance[i] = stages[i] === null ? true : nextFree;
      nextFree = stages[i] === null || canAdvance[i];
    }
    if (stages[S - 1] !== null && sinkReady) { outCount++; log.push(`t${t}: item ${stages[S - 1].id} out (latency ${t - stages[S - 1].t0} cycles)`); }
    const ns = Array(S).fill(null);
    for (let i = S - 1; i >= 0; i--) {
      if (stages[i] === null) continue;
      if (i === S - 1) { if (!sinkReady) ns[i] = stages[i]; }
      else if (canAdvance[i]) ns[i + 1] = stages[i]; else ns[i] = stages[i];
    }
    if (srcValid && ns[0] === null && (stages[0] === null || canAdvance[0])) { ns[0] = { id: next++, t0: t }; inCount++; }
    stages = ns; t++;
  }
  function render() {
    svg.innerHTML = '';
    svg.append(svgEl('text', { x: 10, y: 60, 'font-size': 13, fill: srcValid ? '#46a302' : '#aaa', 'font-weight': 800 }, 'source'));
    for (let i = 0; i < S; i++) {
      const x = 70 + i * 90;
      svg.append(svgEl('rect', { x, y: 30, width: 70, height: 60, rx: 10, fill: stages[i] ? '#ddf4ff' : '#fff', stroke: '#1899d6', 'stroke-width': 3 }));
      svg.append(svgEl('text', { x: x + 35, y: 22, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, `stage ${i + 1}`));
      if (stages[i]) svg.append(svgEl('text', { x: x + 35, y: 68, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#1899d6' }, `#${stages[i].id}`));
      svg.append(svgEl('text', { x: x + 82, y: 65, 'font-size': 16, fill: '#aaa' }, '▶'));
    }
    svg.append(svgEl('rect', { x: 70 + S * 90, y: 30, width: 60, height: 60, rx: 10, fill: sinkReady ? '#d7ffb8' : '#ffdfe0', stroke: sinkReady ? '#46a302' : '#ea2b2b', 'stroke-width': 3 }));
    svg.append(svgEl('text', { x: 100 + S * 90, y: 55, 'text-anchor': 'middle', 'font-size': 11, fill: '#3c3c3c' }, 'sink'));
    svg.append(svgEl('text', { x: 100 + S * 90, y: 75, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 900, fill: sinkReady ? '#46a302' : '#ea2b2b' }, sinkReady ? 'ready=1' : 'ready=0'));
    ctrl.innerHTML = '';
    ctrl.append(btn('⏱ step', () => { step(); render(); ctx.onChange(); }, 'g'), btn(sinkReady ? 'sink: ready' : 'sink: STALLED', () => { sinkReady = !sinkReady; render(); }, sinkReady ? '' : 'r'), btn(srcValid ? 'source: sending' : 'source: idle', () => { srcValid = !srcValid; render(); }), btn('↺ reset', () => { stages = Array(S).fill(null); t = 0; next = 1; log = []; inCount = 0; outCount = 0; sinkReady = true; srcValid = true; render(); }));
    out.innerHTML = `cycle t = <b>${t}</b> &nbsp; accepted in: <b>${inCount}</b> &nbsp; delivered out: <b>${outCount}</b> &nbsp; in flight: <b>${stages.filter(Boolean).length}</b><br>` +
      `<span style="color:#777">latency = cycles from entering stage 1 to leaving stage ${S} (${S} with no stalls); throughput = items delivered per cycle (up to 1).</span>` +
      (log.length ? `<br>${log.slice(-3).join('<br>')}` : '');
  }
  render();
  return { getState: () => ({ t, inCount, outCount, stalls: !sinkReady }), solve: () => { for (let k = 0; k < S + 2; k++) step(); render(); ctx.onChange(); } };
};

// ---------- 18. Small buffer (1 or 2 entries) ----------
W.buffer = (root, p, ctx) => {
  const depth = p.depth || 1;
  let q = [], next = 1, hist = [], flushed = 0;
  const body = box(root, `${depth}-entry buffer`, 'Try push, pop, and push+pop in the same cycle. Full, empty and coincident operations are where bugs live.');
  const view = el('div', { class: 'queue', style: { marginBottom: '8px' } });
  const ctrl = el('div', { class: 'ctrl' });
  const out = readout('');
  body.append(view, ctrl, out);
  function op(push, pop) {
    const full = q.length >= depth, empty = q.length === 0;
    let note = [];
    let popped = null;
    if (pop && !empty) { popped = q.shift(); note.push(`popped ${popped}`); } else if (pop) note.push('pop ignored (empty)');
    if (push) {
      if (q.length < depth) { q.push(`D${next++}`); note.push(`pushed D${next - 1}`); }
      else if (pop && p.allowPopThenPush !== false) { note.push('push blocked'); }
      else note.push('push rejected (full) — ready must have been 0');
    }
    hist.push(`push=${+push} pop=${+pop}: ${note.join(', ')} → occupancy ${q.length}`);
  }
  function render() {
    view.innerHTML = '';
    for (let i = 0; i < depth; i++) view.append(el('div', { class: `slot ${q[i] ? 'full' : ''}` }, q[i] || ''));
    view.append(el('span', { class: 'mono', style: { marginLeft: '10px' } }, `occupancy ${q.length}/${depth}  full=${+(q.length >= depth)}  empty=${+(q.length === 0)}  ready(in)=${+(q.length < depth)}  valid(out)=${+(q.length > 0)}`));
    ctrl.innerHTML = '';
    ctrl.append(btn('push', () => { op(1, 0); render(); ctx.onChange(); }, 'g'), btn('pop', () => { op(0, 1); render(); ctx.onChange(); }), btn('push + pop (same cycle)', () => { op(1, 1); render(); ctx.onChange(); }, 'on'), btn('reset (flush)', () => { flushed += q.length; q = []; hist.push(`reset: discarded ${q.length} item(s)`); render(); ctx.onChange(); }, 'r'));
    out.innerHTML = hist.length ? hist.slice(-4).join('<br>') : 'no operations yet';
  }
  render();
  return { getState: () => ({ occ: q.length, ops: hist.length }), solve: () => { op(1, 0); op(1, 1); op(0, 1); render(); ctx.onChange(); } };
};

// ---------- 19. Stop propagation / skid sizing ----------
W.stopprop = (root, p, ctx) => {
  const D = p.delay ?? 2, cap = p.capacity ?? 4;
  let t = 0, buf = 0, stopPipe = [], stopped = false, sinkTaking = true, log = [], overflow = false, arrivedAfterStop = 0, stopAt = null;
  const body = box(root, `Stop takes ${D} cycles to reach the source`, 'Sink stops taking items → buffer fills → we assert stop. The source keeps sending for D more cycles. How many items still arrive?');
  const svg = svgEl('svg', { viewBox: '0 0 560 120', width: 560, height: 120 });
  const ctrl = el('div', { class: 'ctrl' });
  const out = readout('');
  body.append(svg, ctrl, out);
  function step() {
    // source emits unless a stop has arrived (stop pipeline of length D)
    const stopArrived = stopPipe.length >= D ? stopPipe[0] : false;
    if (stopPipe.length >= D) stopPipe.shift();
    const emit = !stopArrived;
    if (sinkTaking && buf > 0) buf--;
    if (emit) { buf++; if (stopAt !== null) arrivedAfterStop++; }
    if (buf > cap) overflow = true;
    const wantStop = !sinkTaking && buf >= cap - D; // assert stop when D slots remain
    if (wantStop && stopAt === null) stopAt = t;
    stopPipe.push(wantStop);
    log.push(`t${t}: source ${emit ? 'sent' : 'held'}; buffer=${buf}${wantStop ? ' STOP asserted' : ''}${overflow ? ' ⚠ OVERFLOW' : ''}`);
    t++;
  }
  function render() {
    svg.innerHTML = '';
    svg.append(svgEl('rect', { x: 10, y: 35, width: 90, height: 50, rx: 10, fill: '#fff', stroke: '#46a302', 'stroke-width': 3 }));
    svg.append(svgEl('text', { x: 55, y: 65, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800 }, 'source'));
    for (let i = 0; i < cap; i++) svg.append(svgEl('rect', { x: 180 + i * 46, y: 35, width: 40, height: 50, rx: 8, fill: i < buf ? '#1cb0f6' : '#fff', stroke: i < buf ? '#1899d6' : '#ccc', 'stroke-width': 2 }));
    svg.append(svgEl('text', { x: 180 + cap * 23, y: 25, 'text-anchor': 'middle', 'font-size': 11, fill: '#777' }, `buffer (capacity ${cap})`));
    svg.append(svgEl('rect', { x: 200 + cap * 46 + 20, y: 35, width: 90, height: 50, rx: 10, fill: sinkTaking ? '#d7ffb8' : '#ffdfe0', stroke: sinkTaking ? '#46a302' : '#ea2b2b', 'stroke-width': 3 }));
    svg.append(svgEl('text', { x: 265 + cap * 46, y: 65, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800 }, sinkTaking ? 'sink OK' : 'sink STALL'));
    // stop wire back to source
    svg.append(svgEl('path', { d: `M180,95 L180,108 L100,108 L100,85`, fill: 'none', stroke: '#ff9600', 'stroke-width': 3, 'stroke-dasharray': '6 4' }));
    svg.append(svgEl('text', { x: 140, y: 104, 'text-anchor': 'middle', 'font-size': 11, fill: '#ff9600', 'font-weight': 800 }, `stop (${D}-cycle delay)`));
    ctrl.innerHTML = '';
    ctrl.append(btn('⏱ step', () => { step(); render(); ctx.onChange(); }, 'g'), btn(sinkTaking ? 'sink: taking' : 'sink: STALLED', () => { sinkTaking = !sinkTaking; render(); }, sinkTaking ? '' : 'r'), btn('↺ reset', () => { t = 0; buf = 0; stopPipe = []; sinkTaking = true; log = []; overflow = false; arrivedAfterStop = 0; stopAt = null; render(); }));
    out.innerHTML = `t=<b>${t}</b> buffer=<b>${buf}</b>/${cap} ${overflow ? '<b style="color:#ea2b2b">OVERFLOW: data lost</b>' : ''}<br>` + (stopAt !== null ? `stop asserted at t${stopAt}; items that still arrived after that: <b>${arrivedAfterStop}</b>` : 'stop not yet asserted') + `<br><span style="color:#777">${log.slice(-3).join('<br>')}</span>`;
  }
  render();
  return { getState: () => ({ t, buf, overflow, arrivedAfterStop }), solve: () => { sinkTaking = false; for (let k = 0; k < cap + D + 1; k++) step(); render(); ctx.onChange(); } };
};

// ---------- 20. FIFO ring ----------
W.fifo = (root, p, ctx) => {
  const depth = p.depth || 8;
  let mem = Array(depth).fill(null), wr = 0, rd = 0, count = p.initial || 0, next = 1, hist = [];
  for (let i = 0; i < count; i++) { mem[i] = `D${next++}`; wr = (wr + 1) % depth; }
  const body = box(root, `Synchronous FIFO, depth ${depth}`, 'Push, pop, or both. Watch the write and read pointers chase each other around the ring; count tells full from empty.');
  const svg = svgEl('svg', { viewBox: '0 0 300 300', width: 300, height: 300 });
  const ctrl = el('div', { class: 'ctrl' });
  const out = readout('');
  body.append(svg, ctrl, out);
  function op(push, pop) {
    const full = count === depth, empty = count === 0;
    let n = [];
    if (pop && !empty) { n.push(`pop ${mem[rd]}`); mem[rd] = null; rd = (rd + 1) % depth; count--; } else if (pop) n.push('pop ignored (empty)');
    if (push && (!full || (pop && p.allowFullPushPop))) { mem[wr] = `D${next++}`; wr = (wr + 1) % depth; count++; n.push(`push D${next - 1}`); } else if (push) n.push('push refused (full)');
    hist.push(`${n.join(' + ')} → count ${count}`);
  }
  function render() {
    svg.innerHTML = '';
    for (let i = 0; i < depth; i++) {
      const a = (i / depth) * Math.PI * 2 - Math.PI / 2, x = 150 + Math.cos(a) * 105, y = 150 + Math.sin(a) * 105;
      svg.append(svgEl('rect', { x: x - 22, y: y - 18, width: 44, height: 36, rx: 8, fill: mem[i] ? '#1cb0f6' : '#fff', stroke: '#1899d6', 'stroke-width': 2 }));
      svg.append(svgEl('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: mem[i] ? '#fff' : '#bbb' }, mem[i] || i));
      const ox = 150 + Math.cos(a) * 140, oy = 150 + Math.sin(a) * 140;
      if (i === wr) svg.append(svgEl('text', { x: ox, y: oy + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: '#ff9600' }, i === rd ? 'wr=rd' : 'wr'));
      else if (i === rd) svg.append(svgEl('text', { x: ox, y: oy + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: '#46a302' }, 'rd'));
    }
    svg.append(svgEl('text', { x: 150, y: 145, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 900, fill: '#3c3c3c' }, count));
    svg.append(svgEl('text', { x: 150, y: 168, 'text-anchor': 'middle', 'font-size': 12, fill: '#777' }, `occupancy · full=${+(count === depth)} empty=${+(count === 0)}`));
    ctrl.innerHTML = '';
    ctrl.append(btn('push', () => { op(1, 0); render(); ctx.onChange(); }, 'g'), btn('pop', () => { op(0, 1); render(); ctx.onChange(); }), btn('push + pop', () => { op(1, 1); render(); ctx.onChange(); }, 'on'), btn('no-op', () => { hist.push(`no-op → count ${count}`); render(); ctx.onChange(); }));
    out.innerHTML = `wr=${wr} rd=${rd} count=<b>${count}</b>${wr === rd ? ` — pointers equal: ${count === 0 ? '<b>EMPTY</b>' : '<b>FULL</b>'} (only the count/wrap bit can tell!)` : ''}<br><span style="color:#777">${hist.slice(-4).join('<br>') || 'no operations yet'}</span>`;
  }
  render();
  return { getState: () => ({ count, ops: hist.length, wr, rd }), solve: () => { op(1, 0); op(1, 1); op(0, 1); hist.push('no-op'); render(); ctx.onChange(); } };
};

// ---------- 21. Dice grid (conditional probability) ----------
W.dice = (root, p, ctx) => {
  const cond = p.cond || (() => true), ev = p.event || ((a, b) => a + b === 7);
  const hasCond = !!p.cond && p.condName !== 'none';
  let showCond = false;
  const body = box(root, p.title || 'Two dice: 36 equally likely outcomes', p.hint || (hasCond ? 'Toggle the condition. Conditioning shrinks the sample space to the outlined cells; count the event inside it.' : 'Each cell is one outcome (first die, second die). Yellow cells belong to the event. Probability = yellow cells ÷ 36.'));
  const svg = svgEl('svg', { viewBox: '0 0 260 260', width: 260, height: 260 });
  const ctrl = el('div', { class: 'ctrl' });
  const out = readout('');
  body.append(svg, ctrl, out);
  function render() {
    svg.innerHTML = '';
    let nc = 0, ne = 0, nec = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
      const c = cond(a, b), e = ev(a, b);
      if (c) nc++; if (e) ne++; if (c && e) nec++;
      const x = 30 + (b - 1) * 36, y = 30 + (a - 1) * 36;
      const dim = showCond && !c;
      svg.append(svgEl('rect', { x, y, width: 34, height: 34, rx: 6, fill: dim ? '#f3f3f3' : e ? '#ffc800' : '#ddf4ff', stroke: showCond && c ? '#ea2b2b' : '#fff', 'stroke-width': showCond && c ? 3 : 1 }));
      svg.append(svgEl('text', { x: x + 17, y: y + 22, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: dim ? '#ccc' : '#3c3c3c' }, `${a},${b}`));
    }
    for (let i = 1; i <= 6; i++) { svg.append(svgEl('text', { x: 30 + (i - 1) * 36 + 17, y: 20, 'text-anchor': 'middle', 'font-size': 12, fill: '#777' }, i)); svg.append(svgEl('text', { x: 18, y: 30 + (i - 1) * 36 + 22, 'text-anchor': 'middle', 'font-size': 12, fill: '#777' }, i)); }
    ctrl.innerHTML = '';
    if (hasCond) ctrl.append(btn(showCond ? `condition ON: ${p.condName || 'given'}` : 'apply condition', () => { showCond = !showCond; render(); ctx.onChange(); }, showCond ? 'on' : ''));
    out.innerHTML = `yellow = event "${p.eventName || 'sum is 7'}": ${ne}/36 = <b>${(ne / 36).toFixed(4)}</b>` + (showCond ? `<br>outlined = condition "${p.condName || ''}": ${nc} outcomes remain<br>P(event | condition) = ${nec}/${nc} = <b>${(nec / nc).toFixed(4)}</b>` : '');
  }
  render();
  return { getState: () => ({ showCond }), solve: () => { showCond = hasCond; render(); ctx.onChange(); } };
};

// ---------- 22. Coin-flip distribution ----------
W.coins = (root, p, ctx) => {
  let n = p.n || 3;
  const body = box(root, 'Number of heads in n fair flips', 'Slide n. Each bar is C(n,k)/2^n. The mean is n/2 by linearity of expectation.');
  const slider = el('input', { type: 'range', min: 1, max: 8, value: n });
  const svg = svgEl('svg', { viewBox: '0 0 420 200', width: 420, height: 200 });
  const out = readout('');
  body.append(el('div', { class: 'ctrl' }, 'n = ', slider), svg, out);
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
  function render() {
    svg.innerHTML = '';
    const bw = 380 / (n + 1);
    let mean = 0;
    for (let k = 0; k <= n; k++) {
      const pr = C(n, k) / 2 ** n; mean += k * pr;
      const h = pr * 150, x = 20 + k * bw;
      svg.append(svgEl('rect', { x: x + 4, y: 170 - h, width: bw - 8, height: h, rx: 6, fill: '#1cb0f6' }));
      svg.append(svgEl('text', { x: x + bw / 2, y: 165 - h, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: '#1899d6' }, `${C(n, k)}/${2 ** n}`));
      svg.append(svgEl('text', { x: x + bw / 2, y: 188, 'text-anchor': 'middle', 'font-size': 12, fill: '#3c3c3c' }, `${k} heads`));
    }
    out.innerHTML = `n = <b>${n}</b>: ${2 ** n} equally likely sequences. Mean heads = <b>${mean.toFixed(2)}</b> = n/2. Variance = n/4 = ${(n / 4).toFixed(2)}.`;
  }
  slider.oninput = () => { n = +slider.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ n }) };
};

// ---------- 23. Ordered vs unordered selections ----------
W.counting = (root, p, ctx) => {
  const syms = p.symbols || ['A', 'B', 'C', 'D', 'E'], k = p.k || 3;
  let ordered = true;
  const body = box(root, `Choose ${k} of ${syms.length} symbols`, 'Toggle whether order matters. Ordered lists are grouped into the unordered set they belong to.');
  const ctrl = el('div', { class: 'ctrl' });
  const list = el('div', { style: { fontFamily: 'Consolas,monospace', fontSize: '13px', lineHeight: '1.7', columns: '3', marginTop: '8px' } });
  const out = readout('');
  body.append(ctrl, out, list);
  function combos(arr, k) { if (k === 0) return [[]]; if (!arr.length) return []; const [h, ...t] = arr; return [...combos(t, k - 1).map(c => [h, ...c]), ...combos(t, k)]; }
  function perms(arr) { if (arr.length <= 1) return [arr]; return arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map(pp => [x, ...pp])); }
  function render() {
    const cs = combos(syms, k);
    ctrl.innerHTML = '';
    ctrl.append(btn(ordered ? 'order MATTERS (sequences)' : 'order IGNORED (sets)', () => { ordered = !ordered; render(); ctx.onChange(); }, 'on'));
    let total = 0;
    list.innerHTML = '';
    cs.forEach(c => {
      if (ordered) { const ps = perms(c); total += ps.length; list.append(el('div', {}, `{${c.join('')}}: ${ps.map(x => x.join('')).join(' ')}`)); }
      else { total++; list.append(el('div', {}, `{${c.join('')}}`)); }
    });
    const fact = m => m <= 1 ? 1 : m * fact(m - 1);
    out.innerHTML = ordered ? `ordered: ${syms.length}×${syms.length - 1}×${syms.length - 2} = <b>${total}</b> sequences. Each set of ${k} appears in ${fact(k)} = ${k}! orders.` : `unordered: ${syms.length}·${syms.length - 1}·${syms.length - 2} / ${k}! = ${syms.length * (syms.length - 1) * (syms.length - 2)}/${fact(k)} = <b>${total}</b> sets.`;
  }
  render();
  return { getState: () => ({ ordered }) };
};

// ---------- 24. Binary search stepper ----------
W.bsearch = (root, p, ctx) => {
  const arr = p.arr || [1, 3, 3, 5, 8, 13, 21], x = p.x ?? 5;
  let lo = 0, hi = arr.length, steps = [], done = false;
  const body = box(root, `First index with value ≥ ${x} (lower bound)`, 'Invariant: everything before lo is < x, everything from hi onward is ≥ x. The answer is trapped in [lo, hi].');
  const seq = el('div', { class: 'queue', style: { marginBottom: '8px' } });
  const out = readout('');
  const ctrl = el('div', { class: 'ctrl' });
  body.append(seq, out, ctrl);
  function render() {
    seq.innerHTML = '';
    const mid = lo < hi ? (lo + hi) >> 1 : -1;
    arr.forEach((v, i) => seq.append(el('div', { class: `slot ${i >= lo && i < hi ? 'full' : ''} ${i === mid ? 'hl' : ''}`, style: i < lo ? { background: '#ffdfe0', borderColor: '#ea2b2b', color: '#3c3c3c', borderStyle: 'solid' } : i >= hi ? { background: '#d7ffb8', borderColor: '#46a302', color: '#3c3c3c', borderStyle: 'solid' } : {} }, v)));
    seq.append(el('div', { class: 'slot', style: { borderStyle: 'dotted', color: '#aaa' } }, 'end'));
    out.innerHTML = `lo=<b>${lo}</b> hi=<b>${hi}</b> (red: known &lt; ${x}; green: known ≥ ${x}; blue: unknown)` + (lo < hi ? `<br>mid = (${lo}+${hi})>>1 = ${mid}, arr[mid]=${arr[mid]} ${arr[mid] < x ? `&lt; ${x} → lo = mid+1` : `≥ ${x} → hi = mid`}` : `<br><b>done: answer = ${lo}</b>${lo === arr.length ? ' (= length: no element is ≥ x, so "not found" is a valid index one past the end)' : ` (arr[${lo}] = ${arr[lo]})`}`) + (steps.length ? `<br><span style="color:#777">${steps.join(' · ')}</span>` : '');
    ctrl.innerHTML = '';
    ctrl.append(btn('▶ step', () => { if (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) { lo = m + 1; steps.push(`mid ${m}: lo→${lo}`); } else { hi = m; steps.push(`mid ${m}: hi→${hi}`); } render(); ctx.onChange(); } }, 'g'), btn('↺ reset', () => { lo = 0; hi = arr.length; steps = []; render(); }));
  }
  render();
  return { getState: () => ({ lo, hi, done: lo >= hi }), solve: () => { while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; } render(); ctx.onChange(); } };
};

// ---------- 25. Sliding window (longest substring without repeats) ----------
W.window = (root, p, ctx) => {
  const s = p.s || 'abcabcbb';
  let L = 0, R = 0, last = {}, best = 0, bestAt = [0, 0], log = [];
  const body = box(root, `Longest substring without repeats: "${s}"`, 'R scans right. If s[R] was seen inside the window, L jumps just past its last position. Window [L,R] never contains a repeat.');
  const seq = el('div', { class: 'queue', style: { marginBottom: '8px' } });
  const out = readout('');
  const ctrl = el('div', { class: 'ctrl' });
  body.append(seq, out, ctrl);
  function render() {
    seq.innerHTML = '';
    [...s].forEach((c, i) => seq.append(el('div', { class: `slot ${i >= L && i < R ? 'full' : ''} ${i === R ? 'hl' : ''}` }, c)));
    out.innerHTML = `L=<b>${L}</b> R=<b>${R}</b> window = "${s.slice(L, R)}" (length ${R - L}) &nbsp; best = <b>${best}</b> ("${s.slice(bestAt[0], bestAt[1])}")<br>last-seen = {${Object.entries(last).map(([k, v]) => `${k}:${v}`).join(', ')}}` + (R < s.length ? `<br>next: s[${R}]='${s[R]}' ${s[R] in last && last[s[R]] >= L ? `seen at ${last[s[R]]} inside window → L = ${last[s[R]] + 1}` : 'not in window → extend'}` : '<br>done.') + (log.length ? `<br><span style="color:#777">${log.slice(-3).join(' · ')}</span>` : '');
    ctrl.innerHTML = '';
    ctrl.append(btn('▶ step', () => {
      if (R >= s.length) return;
      const c = s[R];
      if (c in last && last[c] >= L) { L = last[c] + 1; log.push(`'${c}' repeat → L=${L}`); }
      last[c] = R; R++;
      if (R - L > best) { best = R - L; bestAt = [L, R]; }
      render(); ctx.onChange();
    }, 'g'), btn('↺ reset', () => { L = 0; R = 0; last = {}; best = 0; bestAt = [0, 0]; log = []; render(); }));
  }
  render();
  return { getState: () => ({ R, best }), solve: () => { while (R < s.length) { const c = s[R]; if (c in last && last[c] >= L) L = last[c] + 1; last[c] = R; R++; if (R - L > best) { best = R - L; bestAt = [L, R]; } } render(); ctx.onChange(); } };
};

// ---------- 26. Clock period ----------
W.clockperiod = (root, p, ctx) => {
  let f = p.f || 125;
  const body = box(root, 'Frequency ↔ period', 'Slide the frequency. Period T = 1/f. At 125 MHz one cycle is 8 ns; every register-to-register path must finish inside it.');
  const slider = el('input', { type: 'range', min: 25, max: 500, step: 25, value: f });
  const svg = svgEl('svg', { viewBox: '0 0 520 90', width: 520, height: 90 });
  const out = readout('');
  body.append(el('div', { class: 'ctrl' }, 'f = ', slider), svg, out);
  function render() {
    svg.innerHTML = '';
    const T = 1000 / f; // ns
    const pxPerNs = 500 / 40; // 40 ns across
    let d = '', x = 10, lvl = 0;
    while (x < 510) { const half = T / 2 * pxPerNs; d += `${d ? 'L' : 'M'}${x},${lvl ? 20 : 60} L${x},${lvl ? 60 : 20} `; x += half; d += `L${Math.min(510, x)},${lvl ? 60 : 20} `; lvl ^= 1; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('line', { x1: 10, y1: 78, x2: 510, y2: 78, stroke: '#ccc' }));
    for (let ns = 0; ns <= 40; ns += 8) svg.append(svgEl('text', { x: 10 + ns * pxPerNs, y: 88, 'font-size': 10, fill: '#777', 'text-anchor': 'middle' }, `${ns}ns`));
    out.innerHTML = `f = <b>${f} MHz</b> → T = 1/(${f}×10⁶ Hz) = <b>${T.toFixed(2)} ns</b>. With a 0.2 ns setup requirement the logic+routing budget is ${(T - 0.2).toFixed(2)} ns (ignoring skew/uncertainty).`;
  }
  slider.oninput = () => { f = +slider.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ f }) };
};

// ---------- 27. Terminal: stdout / stderr / exit code ----------
W.terminal = (root, p, ctx) => {
  const cmds = p.cmds || [
    { c: 'python check.py good.bin', out: ['decoded 16 bytes', 'opcode=1 side=0 seq=7'], err: [], code: 0 },
    { c: 'python check.py short.bin', out: [], err: ['error: truncated message (got 12 bytes, need 16)'], code: 2 },
    { c: 'python check.py good.bin > log.txt', out: [], err: [], code: 0, note: 'stdout went to log.txt; nothing printed' },
    { c: 'python check.py short.bin > log.txt', out: [], err: ['error: truncated message (got 12 bytes, need 16)'], code: 2, note: 'stderr is NOT redirected by > : the error still shows' },
    { c: 'echo $?', out: ['2'], err: [], code: 0, note: '$? holds the previous exit status' },
  ];
  let ran = [];
  const body = box(root, 'Two output streams and an exit status', 'Run the commands in order. White = stdout, red = stderr. The exit code is invisible until you ask for it.');
  const term = el('pre', { style: { minHeight: '140px' } });
  const ctrl = el('div', { class: 'ctrl' });
  body.append(term, ctrl);
  function render() {
    term.innerHTML = ran.map(c => `<span style="color:#8be9fd">$ ${c.c}</span>\n` + c.out.map(o => `${o}\n`).join('') + c.err.map(e => `<span style="color:#ff6b6b">${e}</span>\n`).join('') + `<span style="color:#888">[exit code ${c.code}]${c.note ? ' — ' + c.note : ''}</span>\n`).join('') || '<span style="color:#888">(empty terminal)</span>';
    ctrl.innerHTML = '';
    if (ran.length < cmds.length) ctrl.append(btn(`▶ run: ${cmds[ran.length].c}`, () => { ran.push(cmds[ran.length]); render(); ctx.onChange(); }, 'g'));
    ctrl.append(btn('clear', () => { ran = []; render(); }));
  }
  render();
  return { getState: () => ({ ran: ran.length }), solve: () => { ran = cmds.slice(); render(); ctx.onChange(); } };
};

// ---------- 28. Incomplete assignment → holds value ----------
W.holdsim = (root, p, ctx) => {
  let sel = 0, assignInBranch = [true, true, false], out = 'x', hist = [];
  const body = box(root, 'Combinational block with a missing assignment', 'Change the case selector. In the branch that does not assign Y, hardware must REMEMBER the old Y: that is a latch, not logic.');
  const code = el('pre');
  const ctrl = el('div', { class: 'ctrl' });
  const rd = readout('');
  body.append(code, ctrl, rd);
  const vals = ['A', 'B', 'C'];
  function render() {
    code.innerHTML = `always_comb begin\n  case (sel)\n` + vals.map((v, i) => `    ${i}: ${assignInBranch[i] ? `Y = ${v};` : '<span style="color:#ff6b6b">/* nothing */</span>'}${i === sel ? '   <span style="color:#58cc02">◀ active</span>' : ''}`).join('\n') + `\n  endcase\nend`;
    ctrl.innerHTML = '';
    vals.forEach((_, i) => ctrl.append(btn(`sel = ${i}`, () => { sel = i; if (assignInBranch[i]) out = vals[i]; hist.push(`sel=${i} → Y=${out}${assignInBranch[i] ? '' : ' (HELD from before!)'}`); render(); ctx.onChange(); }, sel === i ? 'on' : '')));
    ctrl.append(btn(assignInBranch[2] ? 'branch 2 assigns Y' : 'branch 2 is EMPTY', () => { assignInBranch[2] = !assignInBranch[2]; render(); }, assignInBranch[2] ? 'g' : 'r'));
    rd.innerHTML = `Y = <b>${out}</b> ${!assignInBranch[sel] ? '<span style="color:#ea2b2b">⚠ not driven in this branch: synthesis infers a LATCH to hold the previous value</span>' : ''}<br><span style="color:#777">${hist.slice(-3).join(' · ') || 'try selecting branch 2'}</span>`;
  }
  render();
  return { getState: () => ({ sel, hist: hist.length }), solve: () => { sel = 0; out = 'A'; hist.push('sel=0'); sel = 2; hist.push('sel=2 held'); render(); ctx.onChange(); } };
};

// ---------- 29. Saturating accumulator ----------
W.accum = (root, p, ctx) => {
  const w = p.width || 8, MIN = -(2 ** (w - 1)), MAX = 2 ** (w - 1) - 1;
  let acc = p.init || 0, sat = true, hist = [];
  const body = box(root, `${w}-bit signed accumulator: wrap or saturate?`, 'Add values. In WRAP mode the value teleports across the number line. In SATURATE mode it sticks at the limit.');
  const svg = svgEl('svg', { viewBox: '0 0 560 70', width: 560, height: 70 });
  const ctrl = el('div', { class: 'ctrl' });
  const rd = readout('');
  body.append(svg, ctrl, rd);
  function add(v) {
    const t = acc + v;
    if (sat) { acc = Math.max(MIN, Math.min(MAX, t)); hist.push(`${v > 0 ? '+' : ''}${v}: true ${t} → ${acc}${t !== acc ? ' (saturated)' : ''}`); }
    else { acc = toSigned(mask(t, w), w); hist.push(`${v > 0 ? '+' : ''}${v}: true ${t} → ${acc}${t !== acc ? ' (WRAPPED)' : ''}`); }
  }
  function render() {
    svg.innerHTML = '';
    const X = v => 20 + (v - MIN) / (MAX - MIN) * 520;
    svg.append(svgEl('line', { x1: 20, y1: 40, x2: 540, y2: 40, stroke: '#999', 'stroke-width': 3 }));
    [MIN, 0, MAX].forEach(v => { svg.append(svgEl('line', { x1: X(v), y1: 32, x2: X(v), y2: 48, stroke: '#999', 'stroke-width': 2 })); svg.append(svgEl('text', { x: X(v), y: 64, 'text-anchor': 'middle', 'font-size': 12, fill: '#777' }, v)); });
    svg.append(svgEl('circle', { cx: X(acc), cy: 40, r: 10, fill: acc === MAX || acc === MIN ? '#ff4b4b' : '#1cb0f6' }));
    svg.append(svgEl('text', { x: X(acc), y: 20, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 900, fill: '#3c3c3c' }, acc));
    ctrl.innerHTML = '';
    (p.adds || [60, 50, -100, 10]).forEach(v => ctrl.append(btn(`${v > 0 ? '+' : ''}${v}`, () => { add(v); render(); ctx.onChange(); }, v > 0 ? 'g' : 'r')));
    ctrl.append(btn(sat ? 'mode: SATURATE' : 'mode: WRAP', () => { sat = !sat; render(); }, 'on'), btn('↺ zero', () => { acc = 0; hist = []; render(); }));
    rd.innerHTML = `acc = <b>${acc}</b> (range ${MIN}..${MAX})<br><span style="color:#777">${hist.slice(-4).join('<br>') || 'no additions yet'}</span>`;
  }
  render();
  return { getState: () => ({ acc, ops: hist.length }), solve: () => { add(60); add(50); add(50); render(); ctx.onChange(); } };
};

// ---------- 30. Sign extension ----------
W.signext = (root, p, ctx) => {
  let v = p.value ?? 0b11110110, from = p.from || 8, to = p.to || 12, mode = 'sign';
  const body = box(root, 'Widening a value: zero-extend or sign-extend?', 'Same 8 bits; the copies added on the left decide whether the number keeps its meaning.');
  const bitsEl = el('div', { class: 'bits', style: { marginBottom: '8px' } });
  const wideEl = el('div', { class: 'bits', style: { marginBottom: '8px' } });
  const ctrl = el('div', { class: 'ctrl' });
  const rd = readout('');
  body.append(bitsEl, ctrl, wideEl, rd);
  function render() {
    bitsEl.innerHTML = '';
    for (let i = from - 1; i >= 0; i--) { const on = (v >> i) & 1; const b = el('div', { class: `bit ${on ? 'on' : ''} ${i === from - 1 ? 'sign' : ''}`, style: { width: '34px', height: '42px', fontSize: '18px' } }, on); b.onclick = () => { v ^= 1 << i; render(); ctx.onChange(); }; bitsEl.append(b); }
    const s = (v >> (from - 1)) & 1;
    const ext = mode === 'sign' ? s : 0;
    wideEl.innerHTML = '';
    for (let i = to - 1; i >= 0; i--) { const on = i >= from ? ext : (v >> i) & 1; wideEl.append(el('div', { class: `bit ${on ? 'on' : ''}`, style: { width: '34px', height: '42px', fontSize: '18px', opacity: i >= from ? .75 : 1, borderStyle: i >= from ? 'dashed' : 'solid' } }, on)); }
    let wide = v; if (ext) wide |= ((1 << (to - from)) - 1) << from;
    ctrl.innerHTML = '';
    ctrl.append(btn(mode === 'sign' ? 'sign-extend (copy the sign bit)' : 'zero-extend (pad with 0)', () => { mode = mode === 'sign' ? 'zero' : 'sign'; render(); ctx.onChange(); }, 'on'));
    rd.innerHTML = `${from}-bit: ${bin(v, from)} = signed <b>${toSigned(v, from)}</b>, unsigned <b>${v}</b><br>${to}-bit (${mode}-extended): ${bin(wide, to)} = signed <b>${toSigned(wide, to)}</b>, unsigned <b>${wide}</b> ${mode === 'sign' ? (toSigned(wide, to) === toSigned(v, from) ? '✓ signed value preserved' : '') : (wide === v ? '✓ unsigned value preserved' : '') + (s ? ' <span style="color:#ea2b2b">✗ signed value changed!</span>' : '')}`;
  }
  render();
  return { getState: () => ({ v, mode }) };
};

// ---------- 31. Fixed-point scale ----------
W.fixedpoint = (root, p, ctx) => {
  let qty = p.qty || 3, priceTicks = p.price || 2560; // scale 256 => 10.0
  const scale = p.scale || 256;
  const body = box(root, `Fixed point with scale ${scale}`, 'The stored integer is value × scale. Multiplying two scaled numbers multiplies the scale too; divide back once at the end.');
  const s1 = el('input', { type: 'range', min: 1, max: 20, value: qty }), s2 = el('input', { type: 'range', min: 0, max: 10240, step: 64, value: priceTicks });
  const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'quantity ', s1, ' price (stored int) ', s2), rd);
  function render() {
    const real = priceTicks / scale, prod = qty * priceTicks;
    rd.innerHTML = `quantity = <b>${qty}</b> (plain integer, scale 1)<br>price stored = <b>${priceTicks}</b> → real price = ${priceTicks}/${scale} = <b>${real}</b><br>quantity × stored price = <b>${prod}</b> — this is notional × ${scale} (scale 1×${scale})<br>real notional = ${prod}/${scale} = <b>${(prod / scale).toFixed(4)}</b>; floor division gives ${Math.floor(prod / scale)}, remainder ${prod % scale} → rounding policy is part of the contract.<br><span style="color:#777">Compare against a limit BEFORE rescaling (keep full width), or after (state which). Both are valid if documented; mixing them is a bug.</span>`;
  }
  s1.oninput = () => { qty = +s1.value; render(); ctx.onChange(); }; s2.oninput = () => { priceTicks = +s2.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ qty, priceTicks }) };
};

// ---------- 32. Two consecutive commands: stale read hazard ----------
W.stale = (root, p, ctx) => {
  const limit = p.limit || 100, used = p.used || 70, cmds = p.cmds || [20, 20];
  let mode = 'naive', log = [], done = false;
  const body = box(root, 'Two orders, one limit: who sees what?', 'Both commands read the exposure before either commits. Run naive vs serialized.');
  const ctrl = el('div', { class: 'ctrl' });
  const rd = readout('');
  body.append(ctrl, rd);
  function run() {
    log = [];
    let exp = used;
    if (mode === 'naive') {
      const reads = cmds.map(() => exp);
      cmds.forEach((c, i) => { const ok = reads[i] + c <= limit; log.push(`cmd ${i + 1} (+${c}) reads exposure ${reads[i]} → ${reads[i] + c} ≤ ${limit}? ${ok ? 'ACCEPT' : 'REJECT'}`); if (ok) exp += c; });
    } else {
      cmds.forEach((c, i) => { const ok = exp + c <= limit; log.push(`cmd ${i + 1} (+${c}) reads exposure ${exp} → ${exp + c} ≤ ${limit}? ${ok ? 'ACCEPT' : 'REJECT'}`); if (ok) exp += c; });
    }
    log.push(`final exposure = <b>${exp}</b>${exp > limit ? ' <span style="color:#ea2b2b">⚠ LIMIT VIOLATED</span>' : ' ✓ within limit'}`);
    done = true;
  }
  function render() {
    ctrl.innerHTML = '';
    ctrl.append(btn(mode === 'naive' ? 'mode: NAIVE (both read old value)' : 'mode: SERIALIZED (second sees first)', () => { mode = mode === 'naive' ? 'serial' : 'naive'; done = false; log = []; render(); }, 'on'), btn('▶ run', () => { run(); render(); ctx.onChange(); }, 'g'));
    rd.innerHTML = `limit ${limit}, current exposure ${used}, commands: ${cmds.map(c => '+' + c).join(', ')}<br>` + (log.join('<br>') || 'press run');
  }
  render();
  return { getState: () => ({ mode, done }), solve: () => { run(); render(); ctx.onChange(); } };
};
