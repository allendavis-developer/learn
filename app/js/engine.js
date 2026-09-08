// Lesson runner: renders steps, checks answers, handles hearts/XP, re-queues misses, shows completion.
import { el, md, mdi, shuffle, normalizeText, toast, sound, confetti, $ } from './utils.js';
import { WIDGETS } from './widgets.js';
import './widgets_eee.js';
import './widgets_eee2.js';
import './widgets_course.js';
import './widgets_more.js';
import './widgets_eee3.js';
import './widgets_g1.js';
import './widgets_g2.js';
import './widgets_g3.js';
import './widgets_g4.js';
import './widgets_g5.js';
import './widgets_g6.js';
import './widgets_g7.js';
import './widgets_g8.js';
import { runCode, warmUp } from './runner.js';
import { mascot } from './mascot.js';
import { parseMathExpr, mathKeyboard } from './mathinput.js';
import { S, save, hearts, loseHeart, addXP, completeDay, recordAnswer, checkBadges, HEART_MAX } from './state.js';

const STRAND = { H: ['🔧', 'FPGA engineer'], S: ['💻', 'Software engineer'], A: ['💻', 'Software engineer · algorithms'], M: ['📐', 'Quant · probability & maths'], E: ['⚡', 'EE degree'], G: ['🧠', 'Mathematician\'s thread'], J: ['🎯', 'The four core goals'], R: ['🔁', 'Review'] };
export const GOALS = [['H', '🔧', 'Senior FPGA engineer'], ['S', '💻', 'Senior software engineer'], ['M', '📐', 'Jane Street quant-level maths'], ['E', '⚡', 'First-rate EE student'], ['G', '🧠', 'Mathematical genius · summer 2030']];
export const goalOf = strand => strand === 'A' ? 'S' : strand;

export function strandInfo(k) { return STRAND[k] || ['📘', 'Lesson']; }

export function runLesson(day, opts) {
  const app = $('#app');
  const isTest = day.kind === 'checkpoint' || opts.mode === 'test';
  const practice = opts.mode === 'practice';
  let queue = opts.steps ? opts.steps.slice() : day.steps.slice();
  const all = queue.slice();
  const totalQuestions = all.filter(s => s.type !== 'info').length;
  let done = 0, firstTry = 0, answered = 0, xp = 0, misses = 0;
  let t0 = Date.now();
  const seenWrong = new Set();
  let widgetApi = null, current = null, checkEnabled = false, selection = null, matchState = null, tokenBank = null;
  let stepIndexTotal = queue.length;
  // ---- resume support: the lesson position is saved after every step so a reload or a click away loses nothing
  const canResume = !practice && !opts.noResume;
  const stepRef = st => { const k = all.indexOf(st); return { k: k >= 0 ? k : all.findIndex(a => a.id && a.id === st.id), retry: !!st.retry }; };
  const stepFromRef = r => { const src = all[r.k]; if (!src) return null; return r.retry ? { ...src, retry: true } : src; };
  function persist() {
    if (!canResume) return;
    const q = queue.map(stepRef).filter(r => r.k >= 0);
    S.resume = { day: day.num, at: Date.now(), t0, done, firstTry, answered, xp, misses, stepIndexTotal, total: stepIndexTotal, seenWrong: [...seenWrong], queue: q, current: current ? stepRef(current) : null, ids: all.map(st => st.review ? { q: st.id, day: st.day } : { i: day.steps.indexOf(st) }) };
    save();
  }
  if (opts.resume && canResume) {
    const r = opts.resume;
    ({ done, firstTry, answered, xp, misses, stepIndexTotal } = r); t0 = r.t0 || Date.now();
    r.seenWrong.forEach(id => seenWrong.add(id));
    queue = r.queue.map(stepFromRef).filter(Boolean);
    if (r.current) { const c = stepFromRef(r.current); if (c) queue.unshift(c); }
  }

  if (queue.some(s => s.type === 'code')) warmUp();
  app.innerHTML = '';
  const top = el('div', { class: 'lesson-top' });
  const xBtn = el('button', { class: 'x', title: 'Quit lesson', onClick: () => { if (practice ? confirm('Leave this practice session?') : confirm('Leave this lesson? Your place is saved: reopen the day to resume.')) opts.onExit(); } }, '✕');
  const prog = el('div', { class: 'progress' }, el('div', { style: { width: '0%' } }));
  const heartsEl = el('div', { class: 'stat hearts' });
  top.append(xBtn, prog, heartsEl);
  const body = el('div', { class: 'lesson-body' });
  const foot = el('div', { class: 'lesson-foot' });
  app.append(top, body, foot);

  function renderHearts() {
    if (!S.settings.hearts || practice) { heartsEl.innerHTML = practice ? '<span class="pill b">practice</span>' : '<span class="pill p">∞</span>'; return; }
    heartsEl.innerHTML = `<span class="ico">❤️</span>${hearts()}`;
  }
  function setProgress() { prog.firstElementChild.style.width = `${Math.round(done / stepIndexTotal * 100)}%`; }

  function next() {
    if (!queue.length) return finish();
    current = queue.shift();
    persist();
    checkEnabled = false; selection = null; widgetApi = null; matchState = null; tokenBank = null;
    body.innerHTML = '';
    body.classList.remove('pop'); void body.offsetWidth; body.classList.add('pop');
    renderHearts(); setProgress();
    const strand = current.strand || 'H';
    const [ico, nm] = strandInfo(strand);
    const tagCls = current.review ? 'review' : current.type === 'info' ? 'concept' : isTest ? 'test' : '';
    body.append(el('div', { class: `tag ${tagCls}` }, `${ico} ${current.review ? 'Review · ' : ''}${nm}${current.ref ? ' · ' + current.ref : ''}${current.type === 'info' ? ' · concept' : ''}`));
    renderStep(current);
    renderFoot('check');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- renderers ----------
  function renderStep(st) {
    if (st.type === 'info') {
      if (st.title) body.append(el('h2', {}, st.title));
      if (st.terms) {
        const box = el('div', { class: 'card soft' }, el('div', { class: 'pill b' }, 'Words first'));
        for (const [term, def] of st.terms) box.append(el('p', { html: `<b>${mdi(term)}</b> — ${mdi(def)}` }));
        body.append(box);
      }
      body.append(el('div', { class: 'body', html: md(st.body) }));
      if (st.widget) mountWidget(st.widget);
      if (st.after) body.append(el('div', { class: 'body', html: md(st.after) }));
      checkEnabled = true;
      return;
    }
    body.append(el('div', { class: 'prompt', html: md(st.prompt).replace(/^<p>|<\/p>$/g, '') }));
    if (st.body) body.append(el('div', { class: 'body', html: md(st.body) }));
    if (st.widget) mountWidget(st.widget, st.type === 'widget');
    if (st.type === 'mc' || st.type === 'multi') {
      const opts = st.options.map((o, i) => ({ o, i }));
      const list = st.shuffle === false ? opts : shuffle(opts);
      selection = st.type === 'multi' ? new Set() : null;
      const wrap = el('div', { class: st.grid ? 'opt-grid' : 'options' });
      list.forEach(({ o, i }, k) => {
        const b = el('button', { class: 'opt', type: 'button', 'data-idx': i }, el('span', { class: 'n' }, k + 1), el('span', { html: md(o).replace(/^<p>|<\/p>$/g, '') }));
        b.onclick = () => {
          if (b.disabled) return;
          if (st.type === 'multi') { if (selection.has(i)) { selection.delete(i); b.classList.remove('sel'); } else { selection.add(i); b.classList.add('sel'); } checkEnabled = selection.size > 0; }
          else { [...wrap.children].forEach(c => c.classList.remove('sel')); b.classList.add('sel'); selection = i; checkEnabled = true; }
          renderFoot('check');
        };
        wrap.append(b);
      });
      body.append(wrap);
    } else if (st.type === 'numeric' || st.type === 'text') {
      const inp = el('input', { class: `answer-input ${st.type === 'text' && st.mono ? 'mono' : ''}`, type: 'text', placeholder: st.placeholder || (st.type === 'numeric' ? 'Type a number' : 'Type your answer'), autocomplete: 'off', inputmode: st.type === 'numeric' ? 'decimal' : 'text' });
      inp.oninput = () => { checkEnabled = inp.value.trim().length > 0; renderFoot('check'); };
      inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (checkEnabled) doCheck(); } };
      const row = el('div', { class: 'row' }, inp, st.unit ? el('span', { class: 'inline-unit' }, st.unit) : null);
      body.append(row);
      if (st.type === 'numeric') body.append(mathKeyboard(inp, () => { checkEnabled = inp.value.trim().length > 0; renderFoot('check'); }));
      setTimeout(() => inp.focus(), 50);
      selection = inp;
    } else if (st.type === 'tokens') {
      const area = el('div', { class: 'token-area' });
      const bank = el('div', { class: 'token-bank' });
      const all = shuffle([...st.answer, ...(st.distractors || [])].map((t, i) => ({ t, i })));
      selection = [];
      all.forEach(({ t, i }) => {
        const tk = el('button', { class: `tok ${st.mono ? 'mono' : ''}`, type: 'button' }, t);
        tk.onclick = () => {
          if (tk.parentElement === bank) { const ph = el('button', { class: `tok ${st.mono ? 'mono' : ''}`, type: 'button' }, t); ph.onclick = () => { ph.remove(); tk.classList.remove('used'); selection = selection.filter(x => x !== i); checkEnabled = selection.length > 0; renderFoot('check'); }; area.append(ph); tk.classList.add('used'); selection.push(i); }
          checkEnabled = selection.length > 0; renderFoot('check');
        };
        tk.dataset.text = t;
        bank.append(tk);
      });
      body.append(area, bank);
      tokenBank = all;
    } else if (st.type === 'order') {
      const items = shuffle(st.items.map((t, i) => ({ t, i })));
      selection = [];
      const list = el('div', { class: 'order-list' });
      items.forEach(({ t, i }) => {
        const it = el('div', { class: 'order-item' }, el('span', { class: 'num' }, ''), el('span', { html: md(t).replace(/^<p>|<\/p>$/g, '') }));
        it.onclick = () => {
          const pos = selection.indexOf(i);
          if (pos >= 0) { selection.splice(pos, 1); } else selection.push(i);
          [...list.children].forEach(c => { const idx = +c.dataset.i, p = selection.indexOf(idx); c.classList.toggle('placed', p >= 0); c.firstElementChild.textContent = p >= 0 ? p + 1 : ''; });
          checkEnabled = selection.length === st.items.length; renderFoot('check');
        };
        it.dataset.i = i;
        list.append(it);
      });
      body.append(el('p', { class: 'muted small' }, 'Tap the items in the correct order (tap again to un-pick).'), list);
    } else if (st.type === 'match') {
      const left = st.pairs.map((p, i) => ({ t: p[0], i })), right = shuffle(st.pairs.map((p, i) => ({ t: p[1], i })));
      matchState = { sel: null, done: new Set(), wrong: 0 };
      const grid = el('div', { class: 'match-grid' });
      const lc = el('div', { class: 'match-col' }), rc = el('div', { class: 'match-col' });
      const tiles = [];
      const mk = (side, { t, i }) => {
        const b = el('button', { class: 'mt', type: 'button', 'data-i': i, html: md(t).replace(/^<p>|<\/p>$/g, '') });
        b.onclick = () => {
          if (b.classList.contains('done')) return;
          if (!matchState.sel) { matchState.sel = { side, i, b }; b.classList.add('sel'); return; }
          if (matchState.sel.side === side) { matchState.sel.b.classList.remove('sel'); matchState.sel = { side, i, b }; b.classList.add('sel'); return; }
          if (matchState.sel.i === i) { b.classList.add('done'); matchState.sel.b.classList.add('done'); matchState.sel.b.classList.remove('sel'); matchState.done.add(i); sound('tick'); }
          else { matchState.wrong++; b.classList.add('shake'); matchState.sel.b.classList.add('shake'); setTimeout(() => { b.classList.remove('shake'); matchState.sel && matchState.sel.b.classList.remove('shake'); }, 300); matchState.sel.b.classList.remove('sel'); }
          matchState.sel = null;
          if (matchState.done.size === st.pairs.length) { checkEnabled = true; renderFoot('check'); }
        };
        return b;
      };
      left.forEach(x => lc.append(mk('L', x))); right.forEach(x => rc.append(mk('R', x)));
      grid.append(lc, rc);
      body.append(el('p', { class: 'muted small' }, 'Tap a tile on the left, then its partner on the right.'), grid);
    } else if (st.type === 'widget') {
      body.append(el('p', { class: 'muted small' }, st.goal || 'Use the simulation above until the goal is met, then press Check.'));
    } else if (st.type === 'code') {
      const ed = el('textarea', { class: 'code-editor', spellcheck: 'false' });
      ed.value = st.starter || '';
      ed.onkeydown = e => {
        if (e.key === 'Tab') { e.preventDefault(); const s0 = ed.selectionStart, e0 = ed.selectionEnd; ed.value = ed.value.slice(0, s0) + '    ' + ed.value.slice(e0); ed.selectionStart = ed.selectionEnd = s0 + 4; return; }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doCheck(); return; }
        if (e.key === 'Enter') {
          const s0 = ed.selectionStart; const lineStart = ed.value.lastIndexOf('\n', s0 - 1) + 1; const line = ed.value.slice(lineStart, s0);
          const ind = (line.match(/^\s*/) || [''])[0] + (/:\s*$/.test(line) ? '    ' : '');
          e.preventDefault(); ed.value = ed.value.slice(0, s0) + '\n' + ind + ed.value.slice(ed.selectionEnd); ed.selectionStart = ed.selectionEnd = s0 + 1 + ind.length;
        }
      };
      ed.oninput = () => { checkEnabled = ed.value.trim().length > 0; renderFoot('check'); };
      const side = el('div', { class: 'code-side' });
      const visible = (st.tests || []).filter(t => !t.hidden);
      side.append(el('div', { class: 'code-hint' }, `Language: ${st.lang === 'js' ? 'JavaScript' : 'Python 3'} · define ${st.fn || 'solve'} · Check runs the tests${st.speed ? ' and times a large input' : ''}. Ctrl+Enter = Check.`));
      const list = el('div', { class: 'test-list' }, ...visible.map(t => el('div', { class: 'test-row' }, el('span', { class: 'ico' }, '○'), el('div', {}, el('div', {}, t.name || `${st.fn || 'solve'}(${t.args.map(a => JSON.stringify(a)).join(', ')})`), el('div', { class: 'm' }, `expect ${JSON.stringify(t.expect)}`)))));
      if (st.gen) list.append(el('div', { class: 'test-row' }, el('span', { class: 'ico' }, '○'), el('div', {}, 'random cases checked against a hidden reference model')));
      if (st.speed) list.append(el('div', { class: 'speed' }, `⏱ speed test: ${st.speed.label || 'large input'} must finish within ${st.speed.budgetMs} ms`));
      side.append(list, el('div', { class: 'run-status', id: 'runStatus' }, ''));
      body.append(el('div', { class: 'code-wrap' }, ed, side));
      checkEnabled = ed.value.trim().length > 0;
      selection = { editor: ed, list, side };
      setTimeout(() => ed.focus(), 50);
    }
  }

  function mountWidget(w, isGoal) {
    const root = el('div');
    body.append(root);
    const fn = WIDGETS[w.name];
    if (!fn) { root.append(el('div', { class: 'card' }, `Missing widget: ${w.name}`)); return; }
    widgetApi = fn(root, w.props || {}, { onChange: () => { if (isGoal) { checkEnabled = true; renderFoot('check'); } } });
    root.dataset.widget = w.name;
  }

  // ---------- footer ----------
  function renderFoot(mode, ok, text) {
    foot.className = 'lesson-foot' + (mode === 'result' ? (ok ? ' ok' : ' bad') : '');
    foot.innerHTML = '';
    const inner = el('div', { class: 'in' });
    if (mode === 'check') {
      inner.append(el('div', { class: 'spacer' }));
      if (current.type !== 'info' && !isTest) inner.append(el('button', { class: 'btn ghost sm', type: 'button', onClick: skip }, 'Skip'));
      const b = el('button', { class: 'btn', type: 'button', id: 'checkBtn', disabled: !checkEnabled, onClick: () => current.type === 'info' ? (done++, next()) : doCheck() }, current.type === 'info' ? 'Continue' : 'Check');
      inner.append(b);
    } else {
      const fb = el('div', { class: `fb ${ok ? 'ok' : 'bad'}` }, el('div', { class: 'h' }, ok ? 'Correct!' : 'Not quite'), el('div', { class: 't', html: text || '' }));
      inner.append(mascot(ok ? 'happy' : 'sad', 64), fb, el('button', { class: `btn ${ok ? 'ok-btn' : 'bad-btn'}`, type: 'button', id: 'continueBtn', onClick: () => { done++; next(); } }, 'Continue'));
      foot.classList.remove('pulse'); void foot.offsetWidth; foot.classList.add('pulse');
      if (!ok) { const sel = body.querySelector('.opt.sel, .opt.bad'); if (sel) sel.classList.add('shakeit'); }
    }
    foot.append(inner);
  }

  function skip() {
    const exp = explainFor(current);
    markAnswer(false, null, true);
    renderFoot('result', false, `Skipped. ${exp}`);
  }

  function explainFor(st) {
    let ans = '';
    if (st.type === 'mc') ans = `<b>Answer:</b> ${md(st.options[st.answer]).replace(/^<p>|<\/p>$/g, '')}. `;
    if (st.type === 'multi') ans = `<b>Answer:</b> ${st.answers.map(i => md(st.options[i]).replace(/^<p>|<\/p>$/g, '')).join('; ')}. `;
    if (st.type === 'numeric') ans = `<b>Answer:</b> ${st.display || st.answer}${st.unit ? ' ' + st.unit : ''}. `;
    if (st.type === 'text') ans = `<b>Answer:</b> ${st.display || st.answers[0]}. `;
    if (st.type === 'tokens') ans = `<b>Answer:</b> ${st.answer.join(' ')}. `;
    if (st.type === 'order') ans = `<b>Order:</b> ${st.items.map((x, i) => `${i + 1}. ${x}`).join(' → ')}. `;
    if (st.type === 'code' && st.solution) ans = `<details class="sol"><summary>Show a reference solution</summary><pre><code>${st.solution.replace(/</g, '&lt;')}</code></pre></details>`;
    return ans + (st.explain ? md(st.explain).replace(/^<p>|<\/p>$/g, '') : '');
  }

  function evaluate(st) {
    if (st.type === 'mc') return { ok: selection === st.answer, given: st.options[selection] };
    if (st.type === 'multi') { const want = new Set(st.answers); return { ok: selection.size === want.size && [...selection].every(i => want.has(i)), given: [...selection].map(i => st.options[i]).join(' | ') }; }
    if (st.type === 'numeric') {
      const raw = selection.value.trim();
      const parsed = parseMathExpr(raw);
      const v = parsed ? parsed.value : NaN;
      const answers = Array.isArray(st.answer) ? st.answer : [st.answer];
      const tol = st.tol ?? (answers.every(Number.isInteger) ? 0 : Math.max(0.011, Math.abs(answers[0]) * 0.006));
      return { ok: answers.some(a => Math.abs(v - a) <= tol + 1e-12), given: raw };
    }
    if (st.type === 'text') {
      const g = normalizeText(selection.value);
      const ok = st.answers.some(a => normalizeText(a) === g) || (st.accept ? st.accept.some(rx => new RegExp(rx, 'i').test(selection.value.trim())) : false);
      return { ok, given: selection.value };
    }
    if (st.type === 'tokens') { const got = selection.map(i => { const tk = (tokenBank || []).find(x => x.i === i); return tk ? tk.t : ''; }); return { ok: got.join(' ') === st.answer.join(' ') || (st.alt || []).some(a => a.join(' ') === got.join(' ')), given: got.join(' ') }; }
    if (st.type === 'order') return { ok: selection.every((v, k) => v === k), given: selection.map(i => st.items[i]).join(' → ') };
    if (st.type === 'match') return { ok: matchState.wrong <= 1, given: `${matchState.wrong} mismatches` };
    if (st.type === 'widget') { const stt = widgetApi ? widgetApi.getState() : {}; return { ok: !!st.check(stt), given: JSON.stringify(stt).slice(0, 80) }; }
    return { ok: false };
  }

  function lockInputs() { body.querySelectorAll('button.opt, .tok, .order-item, .mt').forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; }); const inp = body.querySelector('input.answer-input'); if (inp) inp.disabled = true; }

  function markAnswer(ok, given, skipped) {
    answered++;
    const first = !seenWrong.has(current.id);
    recordAnswer(current.id, day.num, current.prompt, ok, given, goalOf(current.strand), { strand: goalOf(current.strand), qday: current.day || day.num, first: first && !current.retry });
    if (ok) {
      if (first) firstTry++;
      const gain = isTest ? 10 : first ? 10 : 5;
      xp += gain; addXP(gain); sound('ok');
    } else {
      misses++; sound('bad'); seenWrong.add(current.id);
      if (!skipped && S.settings.hearts && !practice && !isTest) {
        const h = loseHeart(); renderHearts();
        if (h <= 0) { setTimeout(outOfHearts, 600); }
      }
      if (!isTest && current.type !== 'code') { const again = { ...current, review: current.review, retry: true }; queue.push(again); stepIndexTotal++; persist(); }
    }
  }

  async function runCodeStep() {
    const st = current, ed = selection.editor;
    checkEnabled = false; renderFoot('check');
    const status = $('#runStatus'); const setStatus = t => { if (status) status.textContent = t; };
    setStatus('Starting the Python runtime (first time downloads ~10 MB, then it is cached)…');
    ed.disabled = true;
    const res = await runCode({ lang: st.lang || 'python', code: ed.value, fn: st.fn || 'solve', tests: st.tests || [], gen: st.gen, refCode: st.refCode, checker: st.checker, speed: st.speed, seed: 1 }, s => setStatus(s === 'loading' ? 'Loading Python runtime…' : 'Running your code…'), st.timeoutMs || 8000);
    setStatus('');
    const rows = [];
    if (res.error) rows.push(el('div', { class: 'test-row bad' }, el('span', { class: 'ico' }, '✖'), el('div', {}, res.error)));
    for (const r of res.results || []) rows.push(el('div', { class: `test-row ${r.ok ? 'ok' : 'bad'}` }, el('span', { class: 'ico' }, r.ok ? '✔' : '✖'), el('div', {}, el('div', {}, r.name), el('div', { class: 'm' }, r.ok ? `→ ${r.got} (${r.ms.toFixed(2)} ms)` : `got ${r.got}, expected ${r.expect}`))));
    if (res.speed) { const sp = res.speed; rows.push(el('div', { class: `speed ${sp.ok ? '' : 'bad'}` }, `⏱ ${sp.label || 'speed test'}: ${sp.ms.toFixed(0)} ms of a ${sp.budgetMs} ms budget ${sp.ok ? '✔' : '✖ too slow: this smells like a quadratic algorithm'}`, el('div', { class: 'bar' }, el('div', { style: { width: Math.min(100, sp.ms / sp.budgetMs * 100) + '%' } })))); }
    else if (st.speed && !res.error && !(res.results || []).every(r => r.ok)) rows.push(el('div', { class: 'speed' }, '⏱ speed test runs once the correctness tests pass'));
    selection.list.innerHTML = ''; rows.forEach(r => selection.list.append(r));
    const ok = !!res.ok;
    if (!ok) ed.disabled = false;
    markAnswer(ok, ed.value.slice(0, 120), false);
    if (ok) renderFoot('result', true, current.explain ? md(current.explain).replace(/^<p>|<\/p>$/g, '') : 'All tests pass.');
    else {
      renderFoot('result', false, `Some tests failed. Fix the code and press <b>Try again</b>, or continue. ${explainFor(current)}`);
      const inn = foot.querySelector('.in');
      const retry = el('button', { class: 'btn blue', type: 'button', id: 'retryBtn', onClick: () => { checkEnabled = true; renderFoot('check'); ed.focus(); } }, 'Try again');
      inn.insertBefore(retry, inn.lastElementChild);
    }
  }

  function doCheck() {
    if (!checkEnabled) return;
    if (current.type === 'code') { runCodeStep(); return; }
    const { ok, given } = evaluate(current);
    lockInputs();
    // colour options
    if (current.type === 'mc' || current.type === 'multi') {
      body.querySelectorAll('button.opt').forEach(b => {
        const i = +b.dataset.idx;
        const want = current.type === 'mc' ? i === current.answer : current.answers.includes(i);
        if (want) b.classList.add('ok');
        else if (b.classList.contains('sel')) b.classList.add('bad');
      });
    }
    markAnswer(ok, given, false);
    renderFoot('result', ok, ok ? (current.explain ? md(current.explain).replace(/^<p>|<\/p>$/g, '') : '') : explainFor(current));
    $('#continueBtn') && $('#continueBtn').focus();
  }

  function outOfHearts() {
    body.innerHTML = '';
    foot.innerHTML = '';
    body.append(el('div', { class: 'complete' }, el('div', { class: 'complete-hero' }, mascot('sad', 110)), el('h1', {}, 'Out of hearts'),
      el('p', {}, 'Hearts refill one every 30 minutes, or do a Practice session (no hearts lost) to refill them all. Your progress in this lesson is not saved.'),
      el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '20px' } },
        el('button', { class: 'btn blue', type: 'button', onClick: () => opts.onPractice ? opts.onPractice() : opts.onExit() }, '💪 Practice to refill'),
        el('button', { class: 'btn ghost', type: 'button', onClick: opts.onExit }, 'Back'))));
  }

  function finish() {
    current = null;
    if (canResume && S.resume && S.resume.day === day.num) { delete S.resume; save(); }
    const secs = Math.round((Date.now() - t0) / 1000);
    const total = totalQuestions;
    const acc = total ? Math.round(firstTry / total * 100) : 100;
    let bonus = 0;
    if (!practice) { if (misses === 0 && total > 0) bonus += 20; if (isTest && acc >= 80) bonus += 30; }
    if (bonus) { xp += bonus; addXP(bonus); }
    if (!practice) completeDay(day.num, { score: firstTry, total, xp, kind: day.kind });
    else { S.practiceCount = (S.practiceCount || 0) + 1; }
    const fresh = checkBadges();
    sound('done'); confetti();
    body.innerHTML = ''; foot.innerHTML = '';
    const passed = !isTest || acc >= 80;
    const summaryLine = `${day.kind === 'practice' ? 'Practice' : 'Day ' + day.num + ' · ' + day.title} — ${xp} XP, ${acc}% first-try, ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    body.append(el('div', { class: 'complete' },
      el('div', { class: 'complete-hero' }, mascot(passed ? 'celebrate' : 'sad', 132)),
      el('div', { class: 'big' }, isTest ? (passed ? 'Checkpoint passed!' : 'Checkpoint attempted') : practice ? 'Practice complete!' : 'Lesson complete!'),
      el('p', { class: 'muted' }, isTest && !passed ? 'Under 80% first-try. Review the strands you missed (they are in your Ledger) and retake it: retakes are free.' : misses === 0 && total ? 'Perfect run: +20 XP bonus.' : `Missed questions were repeated until you got them; they are logged in your Ledger.`),
      el('div', { class: 'stats3' },
        el('div', { class: 'statbox y' }, el('div', { class: 'lbl' }, 'Total XP'), el('div', { class: 'val' }, `⚡ ${xp}`)),
        el('div', { class: 'statbox g' }, el('div', { class: 'lbl' }, 'First-try'), el('div', { class: 'val' }, `${acc}%`)),
        el('div', { class: 'statbox b' }, el('div', { class: 'lbl' }, 'Time'), el('div', { class: 'val' }, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`))),
      fresh.length ? el('div', { class: 'card purple' }, `🏅 New badge${fresh.length > 1 ? 's' : ''}: ${fresh.map(b => b.e + ' ' + b.n).join(', ')}`) : null,
      day.takeaway && !practice ? el('div', { class: 'ledger-line' }, el('div', { class: 'pill g' }, "Today's ledger line"), el('p', { html: md(day.takeaway) })) : null,
      el('div', { class: 'row', style: { justifyContent: 'center', gap: '10px', flexWrap: 'wrap' } },
        el('button', { class: 'btn ghost sm', type: 'button', onClick: () => { try { navigator.clipboard.writeText(summaryLine); toast('Summary copied'); } catch (e) { toast(summaryLine, 4000); } } }, '📋 Copy summary'),
        el('button', { class: 'btn', type: 'button', id: 'finishBtn', onClick: opts.onExit }, 'Continue'))));
    prog.firstElementChild.style.width = '100%';
  }

  // keyboard shortcuts
  const keyHandler = e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter') { if (e.target && e.target.matches && e.target.matches('input, textarea')) return; const c = $('#continueBtn') || $('#checkBtn') || $('#finishBtn'); if (c && !c.disabled) c.click(); }
    if (/^[1-9]$/.test(e.key)) { const opts = body.querySelectorAll('button.opt'); const b = opts[+e.key - 1]; if (b && !b.disabled) b.click(); }
  };
  document.addEventListener('keydown', keyHandler);
  const origExit = opts.onExit;
  opts.onExit = () => { document.removeEventListener('keydown', keyHandler); origExit(); };
  if (opts.onPractice) { const op = opts.onPractice; opts.onPractice = () => { document.removeEventListener('keydown', keyHandler); op(); }; }

  next();
  // expose for automated tests
  window.__lesson = { get current() { return current; }, get widget() { return widgetApi; }, check: doCheck, next: () => { done++; next(); }, setSelection: v => { selection = v; checkEnabled = true; }, setCode: c => { if (selection && selection.editor) { selection.editor.value = c; checkEnabled = true; } }, get queueLength() { return queue.length; } };
}
