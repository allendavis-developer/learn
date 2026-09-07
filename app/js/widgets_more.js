// Simulations for the quant (M) and software/algorithms (S, A) concept cards.
import { el, svgEl, bin, mdi } from './utils.js';
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
const fmt = (v, d = 4) => Number.isInteger(v) ? String(v) : (+v.toPrecision(d)).toString();
// deterministic PRNG for reproducible demos
function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }

// ---- 1. Python REPL stepper ----
W.repl = (root, p, ctx) => {
  const lines = p.lines; let i = 0;
  const body = box(root, p.title || 'Python, one line at a time', 'Press ▶ to run the next line and see exactly what Python answers. Assignments print nothing: Python just stores the value.');
  const pre = el('pre', { style: { minHeight: '120px' } });
  const ctrl = el('div', { class: 'ctrl' });
  const count = el('span', { class: 'small', style: { fontWeight: 800, color: '#777' } });
  const runBtn = btn('▶ run next line', () => { if (i < lines.length) { i++; render(); ctx.onChange(); } }, 'g');
  const resetBtn = btn('↺ reset', () => { i = 0; render(); });
  ctrl.append(runBtn, resetBtn, count);
  body.append(pre, ctrl);
  function render() {
    const NL = String.fromCharCode(10);
    const rows = lines.slice(0, i).map(([src, out]) => {
      const head = '<span style="color:#8be9fd">&gt;&gt;&gt; ' + src.replace(/</g, '&lt;') + '</span>';
      const tail = out ? (out.startsWith('!') ? '<span style="color:#ff6b6b">' + out.slice(1) + '</span>' : '<span style="color:#f1fa8c">' + out + '</span>') : '<span style="color:#777;font-style:italic">(no output: value stored)</span>';
      return head + NL + tail;
    });
    rows.push(i < lines.length ? '<span style="color:#666">&gt;&gt;&gt; ' + lines[i][0].replace(/</g, '&lt;') + '   &larr; next</span>' : '<span style="color:#58cc02">done: every line has run</span>');
    pre.innerHTML = rows.join(NL);
    count.textContent = i < lines.length ? 'line ' + (i + 1) + ' of ' + lines.length : lines.length + ' of ' + lines.length + ' run';
    runBtn.disabled = i >= lines.length;
  }
  render();
  return { getState: () => ({ i }), solve: () => { i = lines.length; render(); ctx.onChange(); } };
};

// ---- 2. Expected value: running average of dice ----
W.dieavg = (root, p, ctx) => {
  let rolls = [], rnd = lcg(p.seed || 3);
  const body = box(root, 'Expected value = long-run average', 'Roll the die. The running average wanders, then settles near 3.5, a value the die never shows.');
  const svg = svgEl('svg', { viewBox: '0 0 460 150', width: 460, height: 150 });
  const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  function render() {
    svg.innerHTML = '';
    const N = Math.max(rolls.length, 50);
    const Y = v => 130 - (v - 1) / 5 * 110, X = i => 30 + i / N * 420;
    svg.append(svgEl('line', { x1: 30, y1: Y(3.5), x2: 450, y2: Y(3.5), stroke: '#ff9600', 'stroke-dasharray': '5 4', 'stroke-width': 2 }));
    svg.append(svgEl('text', { x: 34, y: Y(3.5) - 5, 'font-size': 11, fill: '#ff9600', 'font-weight': 800 }, 'E[X] = 3.5'));
    [1, 2, 3, 4, 5, 6].forEach(v => svg.append(svgEl('text', { x: 10, y: Y(v) + 4, 'font-size': 10, fill: '#777' }, v)));
    let sum = 0, d = '';
    rolls.forEach((r, i) => { sum += r; d += `${i ? 'L' : 'M'}${X(i + 1)},${Y(sum / (i + 1))} `; });
    if (d) svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 2.5 }));
    ctrl.innerHTML = '';
    [1, 10, 100].forEach(k => ctrl.append(btn(`roll ×${k}`, () => { for (let j = 0; j < k; j++) rolls.push(1 + Math.floor(rnd() * 6)); render(); ctx.onChange(); }, k === 1 ? 'g' : '')));
    ctrl.append(btn('↺', () => { rolls = []; render(); }));
    const avg = rolls.length ? sum / rolls.length : 0;
    rd.innerHTML = rolls.length ? `rolls: <b>${rolls.length}</b> &nbsp; last: ${rolls.slice(-8).join(' ')} &nbsp; running average: <b>${fmt(avg)}</b> (distance from 3.5: ${fmt(Math.abs(avg - 3.5), 3)})` : 'no rolls yet';
  }
  render();
  return { getState: () => ({ n: rolls.length }), solve: () => { for (let j = 0; j < 100; j++) rolls.push(1 + Math.floor(rnd() * 6)); render(); ctx.onChange(); } };
};

// ---- 3. Permutations: filling slots ----
W.perms = (root, p, ctx) => {
  const items = p.items || ['A', 'B', 'C', 'D', 'E']; const k = p.k || items.length;
  let chosen = [];
  const body = box(root, `Fill ${k} slots from ${items.length} symbols, no repeats`, 'Pick a symbol for each slot. The number of options shrinks by one each time: that is the falling product.');
  const slots = el('div', { class: 'queue', style: { marginBottom: '8px' } });
  const bank = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(slots, bank, rd);
  function render() {
    slots.innerHTML = '';
    for (let i = 0; i < k; i++) slots.append(el('div', { class: `slot ${chosen[i] ? 'full' : ''} ${i === chosen.length ? 'hl' : ''}` }, chosen[i] || ''));
    bank.innerHTML = '';
    items.forEach(s => bank.append(btn(s, () => { if (chosen.length < k && !chosen.includes(s)) { chosen.push(s); render(); ctx.onChange(); } }, chosen.includes(s) ? '' : 'g')));
    bank.append(btn('↺', () => { chosen = []; render(); }));
    const terms = []; let prod = 1;
    for (let i = 0; i < k; i++) { terms.push(items.length - i); prod *= items.length - i; }
    rd.innerHTML = `slot ${Math.min(chosen.length + 1, k)} of ${k}: <b>${items.length - Math.min(chosen.length, k - 1)}</b> options left${chosen.length >= k ? ' — done' : ''}<br>total sequences = ${terms.join(' × ')} = <b>${prod}</b>${k === items.length ? ` = ${items.length}!` : ''}`;
  }
  render();
  return { getState: () => ({ chosen: chosen.length }), solve: () => { chosen = items.slice(0, k); render(); ctx.onChange(); } };
};

// ---- 4. Overcounting: AABBC with labels on/off ----
W.overcount = (root, p, ctx) => {
  const word = p.word || 'AABBC'; let labelled = true;
  const body = box(root, `How many arrangements of ${word}?`, 'With subscripts the letters are all different (5! orders). Remove the subscripts and groups of identical words collapse into one.');
  const rd = readout(''); const list = el('div', { class: 'mono', style: { fontSize: '13px', lineHeight: '1.7', columns: '3', marginTop: '8px' } }); const ctrl = el('div', { class: 'ctrl' });
  body.append(ctrl, rd, list);
  const letters = [...word].map((c, i) => c + (word.indexOf(c) === i ? '₁' : '₂'));
  function perms(a) { if (a.length <= 1) return [a]; const out = []; a.forEach((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).forEach(r => out.push([x, ...r]))); return out; }
  const all = perms(letters).map(x => x.join(''));
  const plain = [...new Set(all.map(s => s.replace(/[₁₂]/g, '')))].sort();
  function render() {
    ctrl.innerHTML = ''; ctrl.append(btn(labelled ? 'subscripts ON (all distinct)' : 'subscripts OFF (identical letters)', () => { labelled = !labelled; render(); ctx.onChange(); }, 'on'));
    const reps = {}; [...word].forEach(c => reps[c] = (reps[c] || 0) + 1);
    const div = Object.values(reps).filter(v => v > 1).map(v => `${v}!`).join('·') || '1';
    rd.innerHTML = labelled ? `${word.length}! = <b>${all.length}</b> labelled words. Look: ${plain[0]} appears as ${all.filter(s => s.replace(/[₁₂]/g, '') === plain[0]).join(', ')} — <b>${all.length / plain.length}</b> copies.` : `distinct words = ${word.length}!/(${div}) = ${all.length}/${all.length / plain.length} = <b>${plain.length}</b>`;
    list.innerHTML = ''; (labelled ? all.slice(0, 36) : plain).forEach(s => list.append(el('div', {}, s)));
    if (labelled) list.append(el('div', { style: { color: '#999' } }, `… ${all.length - 36} more`));
  }
  render();
  return { getState: () => ({ labelled }), solve: () => { labelled = false; render(); ctx.onChange(); } };
};

// ---- 5. Stars and bars ----
W.starsbars = (root, p, ctx) => {
  const n = p.n || 8, k = p.k || 3; let bars = [3, 5];
  const body = box(root, `${n} identical jobs into ${k} labelled queues`, 'Slide the two bars. Every bar placement is one distribution and vice versa: a bijection, so count the placements.');
  const svg = svgEl('svg', { viewBox: '0 0 460 70', width: 460, height: 70 });
  const s1 = slider(0, n, 1, bars[0]), s2 = slider(0, n, 1, bars[1]); const rd = readout('');
  body.append(svg, el('div', { class: 'ctrl' }, 'bar 1 ', s1, ' bar 2 ', s2), rd);
  const C = (a, b) => { let r = 1; for (let i = 1; i <= b; i++) r = r * (a - b + i) / i; return Math.round(r); };
  function render() {
    const b = [...bars].sort((x, y) => x - y);
    svg.innerHTML = '';
    const cell = 440 / (n + k - 1);
    // draw sequence: stars with bars inserted after b[0] and b[1] stars
    let seq = []; for (let s = 0; s < n; s++) { while (seq.filter(x => x === '|').length < k - 1 && b[seq.filter(x => x === '|').length] === s) seq.push('|'); seq.push('★'); } while (seq.filter(x => x === '|').length < k - 1) seq.push('|');
    seq.forEach((c, i) => svg.append(svgEl('text', { x: 10 + i * cell + cell / 2, y: 40, 'text-anchor': 'middle', 'font-size': c === '|' ? 30 : 22, fill: c === '|' ? '#ff4b4b' : '#ffc800', 'font-weight': 900 }, c)));
    const counts = [b[0], b[1] - b[0], n - b[1]];
    rd.innerHTML = `queues get <b>(${counts.join(', ')})</b> jobs. Positions of ${k - 1} bars among ${n + k - 1} slots: C(${n + k - 1}, ${k - 1}) = <b>${C(n + k - 1, k - 1)}</b> distributions.`;
  }
  s1.oninput = () => { bars[0] = +s1.value; render(); ctx.onChange(); }; s2.oninput = () => { bars[1] = +s2.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ bars }) };
};

// ---- 6. Big-O growth ----
W.bigo = (root, p, ctx) => {
  let n = p.n || 64;
  const body = box(root, 'How work grows with n', 'Slide n. Each row is how many steps an algorithm of that class needs. Watch n² run away.');
  const s = slider(4, 4096, 4, n); const tbl = el('table', { class: 'tbl' }); const svg = svgEl('svg', { viewBox: '0 0 460 120', width: 460, height: 120 });
  body.append(el('div', { class: 'ctrl' }, 'n = ', s), tbl, svg);
  const rows = [['log₂ n', x => Math.log2(x), '#46a302'], ['n', x => x, '#1cb0f6'], ['n log₂ n', x => x * Math.log2(x), '#ff9600'], ['n²', x => x * x, '#ff4b4b']];
  function render() {
    tbl.innerHTML = ''; tbl.append(el('tr', {}, el('th', {}, 'class'), el('th', {}, `steps at n = ${n}`), el('th', {}, 'if n doubles')));
    rows.forEach(([nm, f, col]) => tbl.append(el('tr', {}, el('td', { style: { color: col, fontWeight: 900 } }, nm), el('td', {}, Math.round(f(n)).toLocaleString()), el('td', {}, '×' + fmt(f(2 * n) / f(n), 3)))));
    svg.innerHTML = '';
    const maxv = n * n;
    rows.forEach(([nm, f, col], i) => { const w = Math.max(2, f(n) / maxv * 440); svg.append(svgEl('rect', { x: 10, y: 8 + i * 28, width: w, height: 20, rx: 5, fill: col })); svg.append(svgEl('text', { x: 14 + w, y: 23 + i * 28, 'font-size': 11, fill: '#3c3c3c' }, nm)); });
  }
  s.oninput = () => { n = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ n }) };
};

// ---- 7. Pigeonhole ----
W.pigeon = (root, p, ctx) => {
  const m = p.m || 5; let items = 0, boxes = Array(m).fill(0), rnd = lcg(11);
  const body = box(root, `${m} boxes`, 'Drop items one at a time. Once you have more items than boxes, some box must hold two, whatever the placement.');
  const svg = svgEl('svg', { viewBox: '0 0 460 120', width: 460, height: 120 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  function render() {
    svg.innerHTML = '';
    boxes.forEach((c, i) => { const x = 20 + i * 88; svg.append(svgEl('rect', { x, y: 40, width: 70, height: 70, rx: 8, fill: '#fff', stroke: '#999', 'stroke-width': 2 })); for (let j = 0; j < c; j++) svg.append(svgEl('circle', { cx: x + 14 + (j % 4) * 14, cy: 98 - Math.floor(j / 4) * 14, r: 6, fill: '#1cb0f6' })); svg.append(svgEl('text', { x: x + 35, y: 30, 'text-anchor': 'middle', 'font-size': 12, fill: '#777' }, `box ${i + 1}: ${c}`)); });
    ctrl.innerHTML = ''; ctrl.append(btn('drop an item (random box)', () => { boxes[Math.floor(rnd() * m)]++; items++; render(); ctx.onChange(); }, 'g'), btn('↺', () => { boxes = Array(m).fill(0); items = 0; render(); }));
    const mx = Math.max(...boxes);
    rd.innerHTML = `items = <b>${items}</b>, boxes = ${m}. Guaranteed max in some box: ⌈${items}/${m}⌉ = <b>${Math.ceil(items / m)}</b>. Actual max: ${mx}.${items > m ? ' Items > boxes ⇒ a shared box is unavoidable.' : ''}`;
  }
  render();
  return { getState: () => ({ items }), solve: () => { for (let i = 0; i < m + 1; i++) { boxes[Math.floor(rnd() * m)]++; items++; } render(); ctx.onChange(); } };
};

// ---- 8. Bayes population grid ----
W.bayesgrid = (root, p, ctx) => {
  let base = p.base ?? 1, sens = p.sens ?? 90, fpr = p.fpr ?? 5;
  const body = box(root, '10,000 trials as dots', 'Red = real fault. Ring = flagged by the detector. Count the flagged dots that are actually red.');
  const sb = slider(0.5, 50, 0.5, base), ss = slider(50, 100, 1, sens), sf = slider(0, 20, 1, fpr);
  const svg = svgEl('svg', { viewBox: '0 0 460 160', width: 460, height: 160 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'fault rate % ', sb, ' sensitivity % ', ss, ' false-positive % ', sf), svg, rd);
  function render() {
    svg.innerHTML = '';
    const N = 10000, faults = Math.round(N * base / 100), tp = Math.round(faults * sens / 100), fp = Math.round((N - faults) * fpr / 100);
    // 100 x 100 grid scaled: draw as 100 columns x 100 rows of 4.4x1.5? too small: draw 50x40 = 2000 dots each = 5 trials
    const cols = 100, rows = 40, per = N / (cols * rows); let k = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const idx = k * per; const isF = idx < faults; const flagged = isF ? idx < tp : (idx - faults) < fp; svg.append(svgEl('circle', { cx: 8 + c * 4.5, cy: 8 + r * 3.7, r: 1.4, fill: isF ? '#ff4b4b' : '#ccc', stroke: flagged ? '#1cb0f6' : 'none', 'stroke-width': flagged ? 1 : 0 })); k++; }
    const post = tp / (tp + fp);
    rd.innerHTML = `faults: <b>${faults}</b> (red) → flagged ${tp}. Non-faults: ${N - faults} → wrongly flagged <b>${fp}</b>.<br>P(fault | flag) = ${tp} / (${tp} + ${fp}) = <b>${fmt(post * 100, 3)}%</b>`;
  }
  sb.oninput = () => { base = +sb.value; render(); ctx.onChange(); }; ss.oninput = () => { sens = +ss.value; render(); ctx.onChange(); }; sf.oninput = () => { fpr = +sf.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ base, sens, fpr }) };
};

// ---- 9. Git graph ----
W.gitgraph = (root, p, ctx) => {
  let commits = [{ msg: 'init', branch: 'main' }], staged = false, dirty = false, branch = 'main', tag = null, log = [];
  const body = box(root, 'A repository, one command at a time', 'Edit → add (stage) → commit. Branch to work on the side; tag a release.');
  const svg = svgEl('svg', { viewBox: '0 0 460 110', width: 460, height: 110 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  function render() {
    svg.innerHTML = '';
    commits.forEach((c, i) => { const y = c.branch === 'main' ? 40 : 85, x = 30 + i * 60; if (i) svg.append(svgEl('line', { x1: x - 60, y1: commits[i - 1].branch === 'main' ? 40 : 85, x2: x, y2: y, stroke: '#bbb', 'stroke-width': 2 })); svg.append(svgEl('circle', { cx: x, cy: y, r: 11, fill: c.branch === 'main' ? '#1cb0f6' : '#ce82ff' })); svg.append(svgEl('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 9, fill: '#fff', 'font-weight': 800 }, 'c' + i)); if (c.tag) svg.append(svgEl('text', { x, y: y - 16, 'text-anchor': 'middle', 'font-size': 10, fill: '#e5b400', 'font-weight': 900 }, c.tag)); });
    svg.append(svgEl('text', { x: 450, y: 44, 'text-anchor': 'end', 'font-size': 11, fill: '#1899d6', 'font-weight': 800 }, 'main')); svg.append(svgEl('text', { x: 450, y: 89, 'text-anchor': 'end', 'font-size': 11, fill: '#a560cc', 'font-weight': 800 }, 'fix-branch'));
    ctrl.innerHTML = '';
    ctrl.append(btn('edit a file', () => { dirty = true; log.push('working tree modified'); render(); ctx.onChange(); }), btn('git add', () => { if (dirty) { staged = true; log.push('staged'); } else log.push('nothing to add'); render(); ctx.onChange(); }), btn('git commit -m "…"', () => { if (staged) { commits.push({ msg: 'change', branch }); staged = dirty = false; log.push(`commit c${commits.length - 1} on ${branch}`); } else log.push('nothing staged'); render(); ctx.onChange(); }, 'g'), btn(branch === 'main' ? 'git checkout -b fix-branch' : 'git checkout main', () => { branch = branch === 'main' ? 'fix' : 'main'; log.push(`now on ${branch === 'main' ? 'main' : 'fix-branch'}`); render(); ctx.onChange(); }), btn('git tag v1.0', () => { commits[commits.length - 1].tag = 'v1.0'; log.push('tagged'); render(); ctx.onChange(); }, 'on'));
    rd.innerHTML = `status: ${dirty ? (staged ? 'changes staged' : 'changes not staged') : 'clean'} · HEAD on <b>${branch === 'main' ? 'main' : 'fix-branch'}</b> · ${commits.length} commit(s)<br><span style="color:#777">${log.slice(-3).join(' · ') || 'try: edit → add → commit'}</span>`;
  }
  render();
  return { getState: () => ({ commits: commits.length }), solve: () => { dirty = staged = true; commits.push({ msg: 'x', branch }); render(); ctx.onChange(); } };
};

// ---- 10. Bisect stepper ----
W.bisect = (root, p, ctx) => {
  const n = 16; const bad = p.bad ?? 11; let lo = 0, hi = n - 1, tests = [], done = false;
  const body = box(root, '16 commits: c0 is known good, c15 is known bad', 'Test the middle commit. Each result halves the range. Find the first bad commit.');
  const svg = svgEl('svg', { viewBox: '0 0 460 60', width: 460, height: 60 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  function render() {
    svg.innerHTML = '';
    for (let i = 0; i < n; i++) { const known = i <= lo ? 'good' : i >= hi ? 'bad' : '?'; svg.append(svgEl('rect', { x: 10 + i * 28, y: 15, width: 24, height: 30, rx: 5, fill: known === 'good' ? '#d7ffb8' : known === 'bad' ? '#ffdfe0' : '#fff', stroke: '#bbb' })); svg.append(svgEl('text', { x: 22 + i * 28, y: 34, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800 }, 'c' + i)); }
    const mid = Math.floor((lo + hi) / 2);
    ctrl.innerHTML = '';
    if (hi - lo > 1) ctrl.append(btn(`test c${mid}`, () => { const ok = mid < bad; tests.push(`c${mid}: ${ok ? 'good' : 'bad'}`); if (ok) lo = mid; else hi = mid; render(); ctx.onChange(); }, 'g')); else done = true;
    ctrl.append(btn('↺', () => { lo = 0; hi = n - 1; tests = []; done = false; render(); }));
    rd.innerHTML = `known good: c${lo} · known bad: c${hi} · candidates for "first bad": ${hi - lo}<br>${done ? `<b>first bad commit = c${hi}</b> after ${tests.length} tests (log₂ 16 = 4)` : `tests so far: ${tests.join(', ') || 'none'}`}`;
  }
  render();
  return { getState: () => ({ done, tests: tests.length }), solve: () => { while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (mid < bad) lo = mid; else hi = mid; tests.push('x'); } render(); ctx.onChange(); } };
};

// ---- 11. Seeded generator ----
W.seedgen = (root, p, ctx) => {
  let seed = 4471, runs = [];
  const body = box(root, 'Same seed, same sequence', 'Generate with a seed, then again with the same seed: identical. Change the seed: a different but equally "random" run.');
  const s = slider(1, 9999, 1, seed); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'seed ', s), ctrl, rd);
  function gen(sd) { const r = lcg(sd); return Array.from({ length: 8 }, () => Math.floor(r() * 100)); }
  function render() {
    ctrl.innerHTML = ''; ctrl.append(btn(`generate with seed ${seed}`, () => { runs.push([seed, gen(seed)]); render(); ctx.onChange(); }, 'g'), btn('clear', () => { runs = []; render(); }));
    rd.innerHTML = runs.length ? runs.slice(-5).map(([sd, xs], i, a) => `seed ${sd}: <b>${xs.join(' ')}</b>${i > 0 && a[i - 1][0] === sd ? ' ← identical to the run above' : ''}`).join('<br>') : 'no runs yet';
  }
  s.oninput = () => { seed = +s.value; render(); };
  render();
  return { getState: () => ({ runs: runs.length }), solve: () => { runs.push([seed, gen(seed)], [seed, gen(seed)]); render(); ctx.onChange(); } };
};

// ---- 12. Requirement × test matrix ----
W.testmatrix = (root, p, ctx) => {
  const reqs = p.reqs || ['R1 length = 16', 'R2 version = 1', 'R3 opcode ∈ {1,2}', 'R4 delete ⇒ qty 0', 'R5 reset clears state'];
  const tests = p.tests || ['nominal msg', '12-byte msg', 'version 2', 'opcode 7', 'delete qty 5', 'nominal ×1000'];
  const truth = p.truth || [[0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0]];
  let on = tests.map(() => false);
  const body = box(root, 'Which requirement does each test actually check?', 'Switch tests on. A requirement with no distinguishing test is untested, however many tests run.');
  const tbl = el('table', { class: 'tbl' }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(ctrl, tbl, rd);
  function render() {
    ctrl.innerHTML = ''; tests.forEach((t, j) => ctrl.append(btn(t, () => { on[j] = !on[j]; render(); ctx.onChange(); }, on[j] ? 'on' : '')));
    tbl.innerHTML = ''; tbl.append(el('tr', {}, el('th', {}, 'requirement'), ...tests.map(t => el('th', {}, t)), el('th', {}, 'covered?')));
    let uncovered = 0;
    reqs.forEach((r, i) => { const cov = truth[i].some((v, j) => v && on[j]); if (!cov) uncovered++; tbl.append(el('tr', {}, el('td', { style: { textAlign: 'left' } }, r), ...tests.map((t, j) => el('td', { class: truth[i][j] && on[j] ? 'ok' : '' }, truth[i][j] ? (on[j] ? '✔' : '·') : '')), el('td', { class: cov ? 'ok' : 'bad' }, cov ? 'yes' : 'NO'))); });
    rd.innerHTML = `tests on: <b>${on.filter(Boolean).length}</b> · requirements uncovered: <b>${uncovered}</b>. "nominal ×1000" adds 1000 runs and zero coverage.`;
  }
  render();
  return { getState: () => ({ on }), solve: () => { on = on.map(() => true); render(); ctx.onChange(); } };
};

// ---- 13. Induction dominoes ----
W.dominoes = (root, p, ctx) => {
  let base = false, step = false, fallen = 0;
  const body = box(root, 'Induction as dominoes', 'The base case pushes the first domino. The inductive step guarantees each domino knocks over the next. Both are needed.');
  const svg = svgEl('svg', { viewBox: '0 0 460 90', width: 460, height: 90 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  function render() {
    svg.innerHTML = '';
    for (let i = 0; i < 10; i++) { const x = 20 + i * 44, down = i < fallen; svg.append(svgEl('rect', { x, y: down ? 55 : 20, width: down ? 34 : 14, height: down ? 14 : 50, rx: 3, fill: down ? '#58cc02' : '#ccc', transform: down ? `rotate(-20 ${x} 69)` : '' })); svg.append(svgEl('text', { x: x + 7, y: 85, 'text-anchor': 'middle', 'font-size': 10, fill: '#777' }, `P(${i + 1})`)); }
    ctrl.innerHTML = '';
    ctrl.append(btn(base ? '✓ base case P(1) proved' : 'prove base case P(1)', () => { base = true; fallen = step ? 10 : 1; render(); ctx.onChange(); }, base ? 'on' : 'g'), btn(step ? '✓ step P(k) ⇒ P(k+1) proved' : 'prove the step P(k) ⇒ P(k+1)', () => { step = true; fallen = base ? 10 : 0; render(); ctx.onChange(); }, step ? 'on' : 'g'), btn('↺', () => { base = step = false; fallen = 0; render(); }));
    rd.innerHTML = !base && !step ? 'nothing proved yet' : base && !step ? 'Only P(1) is known: the first domino fell, but nothing says the next one will.' : step && !base ? 'Each domino would knock over the next, but none has been pushed: P(n) is proved for no n.' : '<b>All dominoes fall: P(n) holds for every n ≥ 1.</b>';
  }
  render();
  return { getState: () => ({ base, step }), solve: () => { base = step = true; fallen = 10; render(); ctx.onChange(); } };
};

// ---- 14. Halving bar ----
W.halving = (root, p, ctx) => {
  const n0 = p.n || 1024; let n = n0, steps = 0;
  const body = box(root, `Halve ${n0} until one remains`, 'Each probe of a binary search discards half the candidates. Count the halvings.');
  const svg = svgEl('svg', { viewBox: '0 0 460 40', width: 460, height: 40 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  function render() {
    svg.innerHTML = ''; svg.append(svgEl('rect', { x: 10, y: 8, width: 440, height: 24, rx: 6, fill: '#eee' })); svg.append(svgEl('rect', { x: 10, y: 8, width: Math.max(2, 440 * n / n0), height: 24, rx: 6, fill: '#1cb0f6' }));
    ctrl.innerHTML = ''; ctrl.append(btn('halve (one probe)', () => { if (n > 1) { n = Math.ceil(n / 2); steps++; render(); ctx.onChange(); } }, 'g'), btn('↺', () => { n = n0; steps = 0; render(); }));
    rd.innerHTML = `candidates left: <b>${n}</b> after <b>${steps}</b> probe(s)${n === 1 ? ` — done. log₂(${n0}) = ${Math.log2(n0)}` : ''}`;
  }
  render();
  return { getState: () => ({ steps }), solve: () => { while (n > 1) { n = Math.ceil(n / 2); steps++; } render(); ctx.onChange(); } };
};

// ---- 15. At least one over n trials ----
W.atleastone = (root, p, ctx) => {
  let pr = p.p ?? 0.01, n = p.n ?? 100;
  const body = box(root, 'P(at least one) = 1 − (1 − p)ⁿ', 'Blue: the true probability. Grey: the wrong "n × p", which sails past 1.');
  const sp = slider(0.005, 0.1, 0.005, pr), sn = slider(1, 300, 1, n);
  const svg = svgEl('svg', { viewBox: '0 0 460 150', width: 460, height: 150 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'p ', sp, ' n ', sn), svg, rd);
  function render() {
    svg.innerHTML = '';
    const X = k => 30 + k / 300 * 420, Y = v => 130 - Math.min(v, 1.2) / 1.2 * 120;
    svg.append(svgEl('line', { x1: 30, y1: Y(1), x2: 450, y2: Y(1), stroke: '#ff4b4b', 'stroke-dasharray': '4 3' })); svg.append(svgEl('text', { x: 34, y: Y(1) - 4, 'font-size': 10, fill: '#ff4b4b' }, 'probability 1'));
    let d1 = '', d2 = ''; for (let k = 0; k <= 300; k++) { d1 += `${k ? 'L' : 'M'}${X(k)},${Y(1 - Math.pow(1 - pr, k))} `; d2 += `${k ? 'L' : 'M'}${X(k)},${Y(k * pr)} `; }
    svg.append(svgEl('path', { d: d2, fill: 'none', stroke: '#bbb', 'stroke-width': 2 })); svg.append(svgEl('path', { d: d1, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 }));
    svg.append(svgEl('circle', { cx: X(n), cy: Y(1 - Math.pow(1 - pr, n)), r: 5, fill: '#1899d6' }));
    rd.innerHTML = `p = ${pr}, n = ${n}: 1 − ${1 - pr}^${n} = <b>${fmt(1 - Math.pow(1 - pr, n))}</b>. Naive n·p = ${fmt(n * pr)}${n * pr > 1 ? ' (impossible as a probability)' : ''}. Expected count = ${fmt(n * pr)} is fine as a count.`;
  }
  sp.oninput = () => { pr = +sp.value; render(); ctx.onChange(); }; sn.oninput = () => { n = +sn.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ pr, n }) };
};

// ---- 16. Lower / upper bound pointers ----
W.bounds = (root, p, ctx) => {
  const arr = p.arr || [1, 3, 3, 3, 5, 8, 8, 9]; let x = p.x ?? 3;
  const body = box(root, 'Lower bound, upper bound, and the count between them', 'Slide x. lower = first index with value ≥ x, upper = first index with value > x. Their gap is how many x there are.');
  const s = slider(0, 10, 1, x); const seq = el('div', { class: 'queue', style: { marginBottom: '8px' } }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'x = ', s), seq, rd);
  function render() {
    let lb = arr.length, ub = arr.length; for (let i = 0; i < arr.length; i++) { if (arr[i] >= x) { lb = i; break; } } for (let i = 0; i < arr.length; i++) { if (arr[i] > x) { ub = i; break; } }
    seq.innerHTML = ''; arr.forEach((v, i) => seq.append(el('div', { class: `slot ${i >= lb && i < ub ? 'full' : ''}`, style: i === lb ? { outline: '3px solid #58cc02' } : i === ub ? { outline: '3px solid #ff4b4b' } : {} }, v))); seq.append(el('div', { class: 'slot', style: { borderStyle: 'dotted', color: '#aaa', outline: ub === arr.length ? '3px solid #ff4b4b' : lb === arr.length ? '3px solid #58cc02' : 'none' } }, 'end'));
    rd.innerHTML = `x = <b>${x}</b>: lower_bound = <b>${lb}</b> (green), upper_bound = <b>${ub}</b> (red), count of ${x} = ${ub} − ${lb} = <b>${ub - lb}</b>. Insert a new ${x} at index ${ub} to keep equal keys in arrival order.`;
  }
  s.oninput = () => { x = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ x }) };
};

// ---- 17. Mean / median / variance with an outlier ----
W.stats = (root, p, ctx) => {
  const base = p.values || [10, 11, 10, 12]; let outlier = p.outlier ?? 12;
  const body = box(root, 'Mean, median and spread, with one adjustable value', 'Drag the last measurement. The mean chases it; the median barely moves; the sample variance explodes.');
  const s = slider(8, 900, 1, outlier); const svg = svgEl('svg', { viewBox: '0 0 460 60', width: 460, height: 60 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'last value ', s), svg, rd);
  function render() {
    const xs = [...base, outlier], n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n, sorted = [...xs].sort((a, b) => a - b), med = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
    svg.innerHTML = ''; const X = q => 20 + (q - 8) / 892 * 420;
    svg.append(svgEl('line', { x1: 20, y1: 30, x2: 440, y2: 30, stroke: '#ccc' }));
    xs.forEach(q => svg.append(svgEl('circle', { cx: X(q), cy: 30, r: 6, fill: '#1cb0f6' })));
    svg.append(svgEl('line', { x1: X(mean), y1: 8, x2: X(mean), y2: 52, stroke: '#ff4b4b', 'stroke-width': 3 })); svg.append(svgEl('text', { x: X(mean), y: 6, 'text-anchor': 'middle', 'font-size': 10, fill: '#ff4b4b', 'font-weight': 800 }, 'mean'));
    svg.append(svgEl('line', { x1: X(med), y1: 12, x2: X(med), y2: 48, stroke: '#58cc02', 'stroke-width': 3 })); svg.append(svgEl('text', { x: X(med), y: 59, 'text-anchor': 'middle', 'font-size': 10, fill: '#46a302', 'font-weight': 800 }, 'median'));
    rd.innerHTML = `values ${xs.join(', ')}<br>mean = <b>${fmt(mean)}</b> · median = <b>${fmt(med)}</b> · sample variance (÷ n−1 = ${n - 1}) = <b>${fmt(v)}</b> · std dev = ${fmt(Math.sqrt(v))}`;
  }
  s.oninput = () => { outlier = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ outlier }) };
};

// ---- 18. Two pointers stepper ----
W.twoptr = (root, p, ctx) => {
  const arr = p.arr || [1, 2, 4, 7, 11], target = p.target ?? 9; let L = 0, R = arr.length - 1, found = null, log = [];
  const body = box(root, `Two pointers on a sorted array, target ${target}`, 'Too small → move L right. Too big → move R left. Each step discards one index for a proven reason.');
  const seq = el('div', { class: 'queue', style: { marginBottom: '8px' } }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(seq, ctrl, rd);
  function render() {
    seq.innerHTML = ''; arr.forEach((v, i) => seq.append(el('div', { class: `slot ${i === L || i === R ? 'full' : ''}`, style: i < L || i > R ? { opacity: .35 } : found && (i === found[0] || i === found[1]) ? { background: '#58cc02', borderColor: '#46a302' } : {} }, v)));
    const s = arr[L] + arr[R];
    ctrl.innerHTML = ''; ctrl.append(btn('▶ step', () => { if (found || L >= R) return; if (s === target) found = [L, R]; else if (s < target) L++; else R--; log.push(`${arr[L]}+${arr[R]}`); render(); ctx.onChange(); }, 'g'), btn('↺', () => { L = 0; R = arr.length - 1; found = null; log = []; render(); }));
    rd.innerHTML = found ? `<b>found: indices ${found[0]} and ${found[1]} (${arr[found[0]]} + ${arr[found[1]]} = ${target})</b>` : L >= R ? 'no pair' : `L=${L} (${arr[L]}), R=${R} (${arr[R]}): sum ${s} ${s < target ? '< target → L moves right' : s > target ? '> target → R moves left' : '= target'}`;
  }
  render();
  return { getState: () => ({ L, R, found }), solve: () => { while (!found && L < R) { const s = arr[L] + arr[R]; if (s === target) found = [L, R]; else if (s < target) L++; else R--; } render(); ctx.onChange(); } };
};

// ---- 19. Little's law queue ----
W.little = (root, p, ctx) => {
  let lam = p.lam ?? 20, w = p.w ?? 2;
  const body = box(root, "Little's law: L = λ · W", 'Slide the arrival rate and the time each item spends inside. The number inside is forced.');
  const sl = slider(1, 50, 1, lam), sw = slider(0.5, 5, 0.5, w);
  const svg = svgEl('svg', { viewBox: '0 0 460 70', width: 460, height: 70 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'λ (million items/s) ', sl, ' W (µs) ', sw), svg, rd);
  function render() {
    const L = lam * w;
    svg.innerHTML = ''; svg.append(svgEl('rect', { x: 60, y: 15, width: 340, height: 40, rx: 8, fill: '#fff', stroke: '#1899d6', 'stroke-width': 2 }));
    for (let i = 0; i < Math.min(L, 60); i++) svg.append(svgEl('circle', { cx: 72 + (i % 30) * 11, cy: 27 + Math.floor(i / 30) * 16, r: 4.5, fill: '#1cb0f6' }));
    svg.append(svgEl('text', { x: 30, y: 39, 'text-anchor': 'middle', 'font-size': 11, fill: '#46a302', 'font-weight': 800 }, 'λ →')); svg.append(svgEl('text', { x: 430, y: 39, 'text-anchor': 'middle', 'font-size': 11, fill: '#46a302', 'font-weight': 800 }, '→ λ'));
    rd.innerHTML = `L = λW = ${lam}×10⁶ /s × ${w}×10⁻⁶ s = <b>${fmt(L)} items inside</b> on average${L > 60 ? ' (60 drawn)' : ''}. Turn it round: W = L/λ.`;
  }
  sl.oninput = () => { lam = +sl.value; render(); ctx.onChange(); }; sw.oninput = () => { w = +sw.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ lam, w }) };
};

// ---- 20. Utilisation vs delay ----
W.util = (root, p, ctx) => {
  let rho = p.rho ?? 0.64;
  const body = box(root, 'Utilisation and queueing delay', 'Slide ρ. In the simplest queue model the average delay grows like 1/(1 − ρ): headroom vanishes near 1.');
  const s = slider(0.05, 0.98, 0.01, rho); const svg = svgEl('svg', { viewBox: '0 0 460 150', width: 460, height: 150 }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'ρ = ', s), svg, rd);
  function render() {
    svg.innerHTML = ''; const X = r => 30 + r * 420, Y = v => 130 - Math.min(v, 25) / 25 * 120;
    let d = ''; for (let i = 0; i <= 98; i++) { const r = i / 100; d += `${i ? 'L' : 'M'}${X(r)},${Y(1 / (1 - r))} `; }
    svg.append(svgEl('path', { d, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 3 })); svg.append(svgEl('line', { x1: 30, y1: 130, x2: 450, y2: 130, stroke: '#999' }));
    [0, 0.5, 0.9, 1].forEach(r => svg.append(svgEl('text', { x: X(r), y: 144, 'text-anchor': 'middle', 'font-size': 10, fill: '#777' }, `ρ=${r}`)));
    svg.append(svgEl('circle', { cx: X(rho), cy: Y(1 / (1 - rho)), r: 6, fill: '#ff4b4b' }));
    rd.innerHTML = `ρ = <b>${rho}</b> → busy ${fmt(rho * 100, 3)}% of the time; relative delay ≈ 1/(1 − ρ) = <b>${fmt(1 / (1 - rho), 3)}×</b> the service time.`;
  }
  s.oninput = () => { rho = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ rho }) };
};

// ---- 21. Merge intervals stepper ----
W.mergeint = (root, p, ctx) => {
  const xs = (p.intervals || [[1, 3], [8, 10], [2, 6], [15, 18], [9, 12]]).slice().sort((a, b) => a[0] - b[0]); let i = 0, out = [];
  const body = box(root, 'Merge overlapping intervals (sorted by start)', 'Step through. If the next interval starts at or before the current end, extend the end; otherwise emit and start afresh.');
  const svg = svgEl('svg', { viewBox: '0 0 460 90', width: 460, height: 90 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  const X = v => 20 + v / 20 * 420;
  function render() {
    svg.innerHTML = '';
    xs.forEach((iv, k) => { svg.append(svgEl('rect', { x: X(iv[0]), y: 10, width: X(iv[1]) - X(iv[0]), height: 12, rx: 4, fill: k < i ? '#ccc' : k === i ? '#ffc800' : '#ddf4ff', stroke: '#999' })); });
    out.forEach(iv => svg.append(svgEl('rect', { x: X(iv[0]), y: 50, width: X(iv[1]) - X(iv[0]), height: 14, rx: 4, fill: '#58cc02' })));
    svg.append(svgEl('text', { x: 20, y: 40, 'font-size': 10, fill: '#777' }, 'input (sorted): yellow = next')); svg.append(svgEl('text', { x: 20, y: 80, 'font-size': 10, fill: '#777' }, 'merged output'));
    ctrl.innerHTML = ''; ctrl.append(btn('▶ step', () => { if (i >= xs.length) return; const [a, b] = xs[i]; if (out.length && a <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b); else out.push([a, b]); i++; render(); ctx.onChange(); }, 'g'), btn('↺', () => { i = 0; out = []; render(); }));
    rd.innerHTML = `next: ${i < xs.length ? `[${xs[i]}]` : 'none'} · current end: ${out.length ? out[out.length - 1][1] : '—'} · output so far: <b>${out.map(v => `[${v}]`).join(' ') || '∅'}</b>`;
  }
  render();
  return { getState: () => ({ i }), solve: () => { while (i < xs.length) { const [a, b] = xs[i]; if (out.length && a <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b); else out.push([a, b]); i++; } render(); ctx.onChange(); } };
};

// ---- 22. Recurrence: no adjacent ones ----
W.recur = (root, p, ctx) => {
  let n = 3;
  const body = box(root, 'Binary strings with no two adjacent 1s', 'Slide n. The strings split by their first symbol: "0 + any valid (n−1)" and "10 + any valid (n−2)".');
  const s = slider(1, 6, 1, n); const rd = readout(''); const cols = el('div', { class: 'row', style: { alignItems: 'flex-start', gap: '20px', marginTop: '8px' } });
  body.append(el('div', { class: 'ctrl' }, 'n = ', s), rd, cols);
  function valid(m) { const out = []; for (let k = 0; k < (1 << m); k++) { const b = bin(k, m); if (!b.includes('11')) out.push(b); } return out; }
  function render() {
    const v = valid(n), a = v.filter(x => x[0] === '0'), b = v.filter(x => x[0] === '1');
    rd.innerHTML = `a(${n}) = <b>${v.length}</b> = ${a.length} (start with 0) + ${b.length} (start with 10) = a(${n - 1}) + a(${n - 2})<br>sequence: ${[0, 1, 2, 3, 4, 5, 6].map(k => k <= n ? `<b>${valid(k).length}</b>` : valid(k).length).join(', ')}`;
    cols.innerHTML = ''; [['start with 0', a], ['start with 10', b]].forEach(([t, xs]) => cols.append(el('div', { class: 'mono', style: { fontSize: '13px' } }, el('div', { style: { fontWeight: 900, color: '#777' } }, t), ...xs.map(x => el('div', {}, x)))));
  }
  s.oninput = () => { n = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ n }) };
};

// ---- 23. Stack bracket stepper ----
W.stackbr = (root, p, ctx) => {
  const s = p.s || '{[()]}('; let i = 0, stack = [], err = null;
  const body = box(root, `Scan "${s}" with a stack`, 'Openers push; a closer must match the top and pops it. Leftovers at the end are unclosed.');
  const seq = el('div', { class: 'queue', style: { marginBottom: '8px' } }); const st = el('div', { class: 'queue', style: { marginBottom: '8px' } }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(seq, el('div', { class: 'small muted' }, 'stack (top on the right):'), st, ctrl, rd);
  const P = { ')': '(', ']': '[', '}': '{' };
  function render() {
    seq.innerHTML = ''; [...s].forEach((c, k) => seq.append(el('div', { class: `slot ${k < i ? 'full' : ''} ${k === i ? 'hl' : ''}`, style: err === k ? { background: '#ff4b4b', borderColor: '#ea2b2b' } : {} }, c)));
    st.innerHTML = ''; stack.forEach(([c]) => st.append(el('div', { class: 'slot full' }, c))); if (!stack.length) st.append(el('span', { class: 'muted small' }, '(empty)'));
    ctrl.innerHTML = ''; ctrl.append(btn('▶ step', () => { if (i >= s.length || err !== null) return; const c = s[i]; if ('([{'.includes(c)) stack.push([c, i]); else if (!stack.length || stack[stack.length - 1][0] !== P[c]) err = i; else stack.pop(); i++; render(); ctx.onChange(); }, 'g'), btn('↺', () => { i = 0; stack = []; err = null; render(); }));
    rd.innerHTML = err !== null ? `<b style="color:#ea2b2b">error at index ${err}: closer "${s[err]}" does not match the top</b>` : i >= s.length ? (stack.length ? `<b style="color:#ea2b2b">end of input with ${stack.length} unclosed: first error is the top opener at index ${stack[stack.length - 1][1]}</b>` : '<b style="color:#46a302">valid</b>') : `next: "${s[i]}" → ${'([{'.includes(s[i]) ? 'push' : `must match top "${stack.length ? stack[stack.length - 1][0] : '∅'}"`}`;
  }
  render();
  return { getState: () => ({ i }), solve: () => { while (i < s.length && err === null) { const c = s[i]; if ('([{'.includes(c)) stack.push([c, i]); else if (!stack.length || stack[stack.length - 1][0] !== P[c]) err = i; else stack.pop(); i++; } render(); ctx.onChange(); } };
};

// ---- 24. HH waiting walker ----
W.hhwalk = (root, p, ctx) => {
  let state = 0, flips = 0, hist = [], rnd = lcg(5), trials = [];
  const body = box(root, 'Flip until HH: walk the states', 'State = current run of heads. Tails from state 1 sends you all the way back. Many trials average near 6.');
  const svg = svgEl('svg', { viewBox: '0 0 460 70', width: 460, height: 70 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  function flip() { const h = rnd() < 0.5; flips++; hist.push(h ? 'H' : 'T'); if (h) state++; else state = 0; if (state === 2) { trials.push(flips); } }
  function render() {
    svg.innerHTML = '';
    ['0 heads', '1 head', 'HH done'].forEach((t, i) => { const x = 80 + i * 150; svg.append(svgEl('rect', { x: x - 55, y: 15, width: 110, height: 40, rx: 12, fill: state === i ? '#58cc02' : '#fff', stroke: state === i ? '#46a302' : '#ccc', 'stroke-width': 3 })); svg.append(svgEl('text', { x, y: 40, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 900, fill: state === i ? '#fff' : '#3c3c3c' }, t)); });
    ctrl.innerHTML = ''; ctrl.append(btn('flip', () => { if (state < 2) { flip(); render(); ctx.onChange(); } }, 'g'), btn('new trial', () => { state = 0; flips = 0; hist = []; render(); }), btn('run 200 trials', () => { for (let k = 0; k < 200; k++) { state = 0; flips = 0; hist = []; while (state < 2) flip(); } render(); ctx.onChange(); }, 'on'));
    const mean = trials.length ? trials.reduce((a, b) => a + b, 0) / trials.length : null;
    rd.innerHTML = `this trial: ${hist.join('') || '—'} (${flips} flips)${state === 2 ? ' → HH!' : ''}<br>completed trials: <b>${trials.length}</b>${mean !== null ? `, average flips = <b>${fmt(mean, 3)}</b> (theory: 6)` : ''}`;
  }
  render();
  return { getState: () => ({ trials: trials.length }), solve: () => { for (let k = 0; k < 200; k++) { state = 0; flips = 0; hist = []; while (state < 2) flip(); } render(); ctx.onChange(); } };
};

// ---- 25. Binary search on the answer ----
W.bsanswer = (root, p, ctx) => {
  const times = p.times || [7, 2, 5, 10, 8], k = p.k || 2; let cap = 18, lo = Math.max(...times), hi = times.reduce((a, b) => a + b, 0), log = [];
  const body = box(root, `Split [${times}] into ≤ ${k} contiguous batches`, 'Slide the capacity and watch the greedy fill. Feasible capacities form a solid range above some threshold: binary-search for it.');
  const s = slider(Math.max(...times), times.reduce((a, b) => a + b, 0), 1, cap); const svg = svgEl('svg', { viewBox: '0 0 460 50', width: 460, height: 50 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(el('div', { class: 'ctrl' }, 'capacity ', s), svg, ctrl, rd);
  function batches(c) { const out = [[]]; let cur = 0; for (const t of times) { if (cur + t <= c) { out[out.length - 1].push(t); cur += t; } else { out.push([t]); cur = t; } } return out; }
  function render() {
    const bs = batches(cap), feasible = bs.length <= k;
    svg.innerHTML = ''; let x = 10; bs.forEach((b, i) => { const w = b.reduce((a, q) => a + q, 0) * 12; svg.append(svgEl('rect', { x, y: 10, width: w, height: 28, rx: 6, fill: i % 2 ? '#ddf4ff' : '#d7ffb8', stroke: '#999' })); svg.append(svgEl('text', { x: x + w / 2, y: 28, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800 }, `[${b}] = ${b.reduce((a, q) => a + q, 0)}`)); x += w + 8; });
    ctrl.innerHTML = ''; ctrl.append(btn(`search step: test mid = ${Math.floor((lo + hi) / 2)}`, () => { if (lo >= hi) return; const mid = Math.floor((lo + hi) / 2); const ok = batches(mid).length <= k; log.push(`${mid}: ${ok ? 'feasible → hi' : 'not → lo'}`); if (ok) hi = mid; else lo = mid + 1; render(); ctx.onChange(); }, 'g'), btn('↺', () => { lo = Math.max(...times); hi = times.reduce((a, b) => a + b, 0); log = []; render(); }));
    rd.innerHTML = `capacity ${cap}: greedy makes <b>${bs.length}</b> batch(es) → ${feasible ? '<b style="color:#46a302">feasible</b>' : '<b style="color:#ea2b2b">not feasible</b>'}<br>search range [${lo}, ${hi}]${lo >= hi ? ` → <b>answer ${lo}</b>` : ''} · ${log.slice(-3).join(' · ')}`;
  }
  s.oninput = () => { cap = +s.value; render(); ctx.onChange(); };
  render();
  return { getState: () => ({ lo, hi }), solve: () => { while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (batches(mid).length <= k) hi = mid; else lo = mid + 1; } render(); ctx.onChange(); } };
};

// ---- 26. Occupied buckets ----
W.buckets = (root, p, ctx) => {
  const m = p.m || 4, n = p.n || 3; let counts = Array(m).fill(0), inserted = 0, trials = [], rnd = lcg(21);
  const body = box(root, `${n} keys into ${m} buckets`, 'Insert the keys. Count occupied buckets. Repeat many times: the average approaches m(1 − (1 − 1/m)ⁿ).');
  const svg = svgEl('svg', { viewBox: '0 0 460 80', width: 460, height: 80 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  const expected = m * (1 - Math.pow(1 - 1 / m, n));
  function run() { counts = Array(m).fill(0); for (let i = 0; i < n; i++) counts[Math.floor(rnd() * m)]++; inserted = n; trials.push(counts.filter(Boolean).length); }
  function render() {
    svg.innerHTML = ''; counts.forEach((c, i) => { const x = 20 + i * (420 / m); svg.append(svgEl('rect', { x, y: 20, width: 420 / m - 12, height: 50, rx: 8, fill: c ? '#d7ffb8' : '#fff', stroke: '#999' })); for (let j = 0; j < c; j++) svg.append(svgEl('circle', { cx: x + 14 + j * 14, cy: 45, r: 6, fill: '#1cb0f6' })); svg.append(svgEl('text', { x: x + (420 / m - 12) / 2, y: 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#777' }, `bucket ${i}`)); });
    ctrl.innerHTML = ''; ctrl.append(btn(`insert ${n} random keys`, () => { run(); render(); ctx.onChange(); }, 'g'), btn('run 500 times', () => { for (let t = 0; t < 500; t++) run(); render(); ctx.onChange(); }, 'on'), btn('↺', () => { counts = Array(m).fill(0); trials = []; render(); }));
    const avg = trials.length ? trials.reduce((a, b) => a + b, 0) / trials.length : null;
    rd.innerHTML = `this run: <b>${counts.filter(Boolean).length}</b> occupied · trials: ${trials.length}${avg !== null ? ` · average occupied = <b>${fmt(avg)}</b>` : ''} · expected = ${m}(1 − (${m - 1}/${m})^${n}) = <b>${fmt(expected)}</b>`;
  }
  render();
  return { getState: () => ({ trials: trials.length }), solve: () => { for (let t = 0; t < 500; t++) run(); render(); ctx.onChange(); } };
};

// ---- 27. Indicators: adjacent pairs / sixes ----
W.indicators = (root, p, ctx) => {
  const mode = p.mode || 'pairs', n = p.n || (mode === 'pairs' ? 10 : 12); let seq = [], trials = [], rnd = lcg(9);
  const expected = mode === 'pairs' ? (n - 1) / 2 : n / 6;
  const body = box(root, mode === 'pairs' ? `Adjacent equal pairs in ${n} flips` : `Sixes in ${n} rolls`, mode === 'pairs' ? 'Re-flip. Each of the 9 adjacent positions is an indicator worth ½ on average, so the expected count is 4.5 even though the pairs overlap.' : 'Re-roll. Each roll is an indicator worth 1/6; twelve of them give an expectation of 2.');
  const row = el('div', { class: 'queue', style: { marginBottom: '8px' } }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(row, ctrl, rd);
  function draw() { seq = Array.from({ length: n }, () => mode === 'pairs' ? (rnd() < 0.5 ? 'H' : 'T') : 1 + Math.floor(rnd() * 6)); const c = mode === 'pairs' ? seq.filter((x, i) => i && x === seq[i - 1]).length : seq.filter(x => x === 6).length; trials.push(c); return c; }
  function render() {
    row.innerHTML = ''; seq.forEach((x, i) => row.append(el('div', { class: 'slot', style: (mode === 'pairs' ? (i && x === seq[i - 1]) : x === 6) ? { background: '#ffc800', borderColor: '#e5b400', borderStyle: 'solid' } : {} }, x)));
    ctrl.innerHTML = ''; ctrl.append(btn(mode === 'pairs' ? 'flip all' : 'roll all', () => { draw(); render(); ctx.onChange(); }, 'g'), btn('run 300 trials', () => { for (let t = 0; t < 300; t++) draw(); render(); ctx.onChange(); }, 'on'), btn('↺', () => { seq = []; trials = []; render(); }));
    const last = trials.length ? trials[trials.length - 1] : null, avg = trials.length ? trials.reduce((a, b) => a + b, 0) / trials.length : null;
    rd.innerHTML = (last !== null ? `this trial: <b>${last}</b> (highlighted) · ` : '') + `trials: ${trials.length}${avg !== null ? ` · average <b>${fmt(avg, 3)}</b>` : ''} · expected by linearity: <b>${fmt(expected)}</b>`;
  }
  render();
  return { getState: () => ({ trials: trials.length }), solve: () => { for (let t = 0; t < 300; t++) draw(); render(); ctx.onChange(); } };
};

// ---- 28. Geometric waiting histogram ----
W.geomwait = (root, p, ctx) => {
  const pr = p.p ?? 1 / 6; let trials = [], rnd = lcg(13);
  const body = box(root, `Trials until the first success (p = ${fmt(pr, 3)})`, 'Run trials. The histogram is geometric: each extra wait is (1 − p) times as likely. The mean is 1/p.');
  const svg = svgEl('svg', { viewBox: '0 0 460 130', width: 460, height: 130 }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(svg, ctrl, rd);
  function one() { let k = 1; while (rnd() >= pr) k++; trials.push(k); return k; }
  function render() {
    svg.innerHTML = ''; const hist = Array(21).fill(0); trials.forEach(k => hist[Math.min(k, 20)]++); const mx = Math.max(1, ...hist);
    for (let k = 1; k <= 20; k++) { const h = hist[k] / mx * 100; svg.append(svgEl('rect', { x: 20 + (k - 1) * 22, y: 110 - h, width: 18, height: h, rx: 3, fill: '#1cb0f6' })); svg.append(svgEl('text', { x: 29 + (k - 1) * 22, y: 124, 'text-anchor': 'middle', 'font-size': 9, fill: '#777' }, k === 20 ? '20+' : k)); }
    ctrl.innerHTML = ''; ctrl.append(btn('one trial', () => { one(); render(); ctx.onChange(); }, 'g'), btn('500 trials', () => { for (let t = 0; t < 500; t++) one(); render(); ctx.onChange(); }, 'on'), btn('↺', () => { trials = []; render(); }));
    const avg = trials.length ? trials.reduce((a, b) => a + b, 0) / trials.length : null;
    rd.innerHTML = `trials: <b>${trials.length}</b>${trials.length ? ` · last wait: ${trials[trials.length - 1]}` : ''}${avg !== null ? ` · average <b>${fmt(avg, 3)}</b>` : ''} · theory 1/p = <b>${fmt(1 / pr, 3)}</b>`;
  }
  render();
  return { getState: () => ({ trials: trials.length }), solve: () => { for (let t = 0; t < 500; t++) one(); render(); ctx.onChange(); } };
};

// ---- 29. Parser rule stepper ----
W.parsestep = (root, p, ctx) => {
  const msgs = p.msgs || [
    ['valid', [1, 1, 0, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0x27, 0x10, 0, 100]], ['12 bytes', [1, 1, 0, 0, 0, 0, 0, 7, 0, 42, 0, 0]], ['version 2', [2, 1, 0, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0x27, 0x10, 0, 100]], ['opcode 7', [1, 7, 0, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0x27, 0x10, 0, 100]], ['delete with qty 5', [1, 2, 1, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0, 0, 0, 5]]];
  const rules = [['length = 16', m => m.length === 16, 'truncated'], ['version = 1', m => m[0] === 1, 'bad_version'], ['reserved = 0', m => m[3] === 0, 'reserved_nonzero'], ['opcode ∈ {1,2}', m => [1, 2].includes(m[1]), 'bad_opcode'], ['side ∈ {0,1}', m => [0, 1].includes(m[2]), 'bad_side'], ['qty consistent with opcode', m => { const q = m[14] * 256 + m[15]; return m[1] === 1 ? q > 0 : q === 0; }, 'bad_qty']];
  let mi = 0, ri = 0, verdict = null;
  const body = box(root, 'Validate a message rule by rule', 'Pick a message, then step through the rules in precedence order. The first failing rule is the reason code; later rules are not even checked.');
  const pick = el('div', { class: 'ctrl' }); const hex = el('div', { class: 'bits', style: { justifyContent: 'flex-start', gap: '4px', marginBottom: '8px' } }); const tbl = el('table', { class: 'tbl' }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(pick, hex, tbl, ctrl, rd);
  function render() {
    const m = msgs[mi][1];
    pick.innerHTML = ''; msgs.forEach(([nm], i) => pick.append(btn(nm, () => { mi = i; ri = 0; verdict = null; render(); ctx.onChange(); }, mi === i ? 'on' : '')));
    hex.innerHTML = ''; m.forEach((b, k) => hex.append(el('div', { class: 'bit ro', style: { width: '30px', height: '38px', fontSize: '12px' } }, el('span', { class: 'w' }, k), b.toString(16).toUpperCase().padStart(2, '0'))));
    tbl.innerHTML = ''; tbl.append(el('tr', {}, el('th', {}, '#'), el('th', {}, 'rule'), el('th', {}, 'result')));
    rules.forEach(([nm, f, code], k) => { const checked = k < ri; const ok = checked ? f(m) : null; tbl.append(el('tr', { style: k === ri && !verdict ? { outline: '3px solid #1cb0f6' } : {} }, el('td', {}, k + 1), el('td', { style: { textAlign: 'left' } }, nm), el('td', { class: ok === true ? 'ok' : ok === false ? 'bad' : '' }, ok === null ? (verdict ? 'skipped' : '?') : ok ? 'pass' : code))); });
    ctrl.innerHTML = ''; ctrl.append(btn('▶ check next rule', () => { if (verdict || ri >= rules.length) return; const [, f, code] = rules[ri]; ri++; if (!f(m)) verdict = code; else if (ri === rules.length) verdict = 'ok'; render(); ctx.onChange(); }, 'g'));
    rd.innerHTML = verdict ? `reason code: <b>${verdict}</b>` : `checking rule ${ri + 1} of ${rules.length}`;
  }
  render();
  return { getState: () => ({ verdict }), solve: () => { const m = msgs[mi][1]; while (!verdict && ri < rules.length) { const [, f, code] = rules[ri]; ri++; if (!f(m)) verdict = code; else if (ri === rules.length) verdict = 'ok'; } render(); ctx.onChange(); } };
};

// ---- 30. try / except flow ----
W.tryexcept = (root, p, ctx) => {
  const inputs = p.inputs || ['"100"', '"abc"', '"65536"', '""']; let ii = 0, stage = 0;
  const body = box(root, 'What path does the code take?', 'Pick an input and step. int() either returns a value or raises ValueError, which jumps straight to the except block.');
  const code = el('pre'); const pick = el('div', { class: 'ctrl' }); const ctrl = el('div', { class: 'ctrl' }); const rd = readout('');
  body.append(pick, code, ctrl, rd);
  const lines = ['try:', '    n = int(text)', '    if not 1 <= n <= 65535:', '        return ["rejected", "out_of_range"]', '    return ["ok", n]', 'except ValueError:', '    return ["rejected", "not_a_number"]'];
  function path(txt) { const raw = txt.slice(1, -1); if (!/^\d+$/.test(raw)) return [0, 1, 5, 6]; const n = +raw; return (n >= 1 && n <= 65535) ? [0, 1, 2, 4] : [0, 1, 2, 3]; }
  function render() {
    const pth = path(inputs[ii]);
    pick.innerHTML = ''; inputs.forEach((t, i) => pick.append(btn(`text = ${t}`, () => { ii = i; stage = 0; render(); ctx.onChange(); }, ii === i ? 'on' : '')));
    code.innerHTML = lines.map((l, k) => { const idx = pth.indexOf(k); const active = idx !== -1 && idx < stage; const cur = idx === stage - 1; return `<span style="${cur ? 'background:#58cc02;color:#fff;border-radius:4px' : active ? 'color:#8be9fd' : 'color:#666'}">${l}</span>`; }).join('\n');
    ctrl.innerHTML = ''; ctrl.append(btn('▶ step', () => { if (stage < pth.length) { stage++; render(); ctx.onChange(); } }, 'g'), btn('↺', () => { stage = 0; render(); }));
    const done = stage >= pth.length;
    rd.innerHTML = done ? `result: <b>${lines[pth[pth.length - 1]].trim().replace('return ', '')}</b>${pth.includes(5) ? ' — the exception skipped the rest of the try block' : ''}` : `step ${stage}/${pth.length}`;
  }
  render();
  return { getState: () => ({ stage }), solve: () => { stage = path(inputs[ii]).length; render(); ctx.onChange(); } };
};
