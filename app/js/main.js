// App shell: top bar, bottom nav, home path, practice, glossary, ledger, profile/settings.
import { el, md, toast, fmtDate, dateKey, addDays, $ } from './utils.js';
import { S, save, hearts, refillHearts, msToNextHeart, currentStreak, xpToday, DAILY_GOAL, dayIndexToday, dateOfDay, isUnlocked, dayDone, BADGES, resetAll, exportJSON, importJSON, today, START_DATE, HEART_MAX } from './state.js';
import { DAYS, UNITS, getDay, reviewSteps, practiceSet, glossary, questionPool } from './curriculum.js';
import { runLesson, strandInfo, GOALS, goalOf } from './engine.js';
import { mascot, encouragement } from './mascot.js';
import { UNIT_MAP, CHECKPOINT_DAYS, estimateBreakdown } from './lib.js';

const app = $('#app');
let view = 'home';

function topbar() {
  const h = hearts();
  const st = currentStreak();
  return el('div', { class: 'topbar' },
    el('div', { class: `stat streak ${st ? '' : 'dim'}`, title: 'Day streak' }, el('span', { class: 'ico' }, '🔥'), st),
    el('div', { class: 'stat gems', title: 'Gems' }, el('span', { class: 'ico' }, '💎'), S.gems),
    el('div', { class: 'stat xp', title: 'Total XP' }, el('span', { class: 'ico' }, '⚡'), S.xp),
    el('div', { class: `stat hearts ${S.settings.hearts ? '' : 'dim'}`, title: S.settings.hearts ? 'Hearts' : 'Hearts off' }, el('span', { class: 'ico' }, '❤️'), S.settings.hearts ? h : '∞'));
}

function nav() {
  const items = [['home', '🏠', 'Learn'], ['practice', '💪', 'Practice'], ['progress', '📈', 'Progress'], ['glossary', '📖', 'Words'], ['ledger', '📓', 'Ledger'], ['profile', '👤', 'Profile']];
  return el('div', { class: 'bottomnav' }, ...items.map(([k, ico, lbl]) => el('button', { class: k === view ? 'active' : '', type: 'button', onClick: () => go(k) }, ico, el('span', {}, lbl))));
}

function page(...children) {
  app.innerHTML = '';
  app.append(topbar(), el('div', { class: 'page' }, ...children), nav());
  window.scrollTo(0, 0);
}

export function go(v, arg) {
  view = v;
  location.hash = arg !== undefined ? `${v}/${arg}` : v;
  render(arg);
}

function render(arg) {
  if (view === 'home') return home();
  if (view === 'practice') return practice();
  if (view === 'progress') return progressView();
  if (view === 'glossary') return glossaryView();
  if (view === 'ledger') return ledger();
  if (view === 'profile') return profile();
  if (view === 'day') return startDay(+arg);
  home();
}

// ---------- HOME ----------
function home() {
  const todayN = dayIndexToday();
  const doneToday = !!(S.days[todayN] && S.days[todayN].doneOn === dateKey(today()));
  const inProg = S.resume && S.resume.day === todayN ? S.resume : null;
  const goalPct = doneToday ? 100 : inProg ? Math.min(99, Math.round(inProg.done / Math.max(1, inProg.total) * 100)) : 0;
  const goalText = doneToday ? `Daily goal done ✓ Day ${todayN} complete: every card and question` : inProg ? `Daily goal: finish Day ${todayN} · ${inProg.done}/${inProg.total} steps done` : `Daily goal: finish all of Day ${todayN}: every concept card and every question`;
  const todayDay = getDay(Math.min(30, Math.max(1, todayN)));
  const beforeStart = todayN < 1, afterEnd = todayN > 30;
  const nextUndone = DAYS.find(d => !dayDone(d.num) && isUnlocked(d.num));

  const hero = el('div', { class: 'card green hero' },
    el('div', { class: 'row' }, el('div', { class: 'hero-mascot' }, mascot('idle', 84), el('div', { class: 'bubble' }, encouragement())), el('div', {}, el('div', { class: 'pill', style: { background: 'rgba(255,255,255,.25)', color: '#fff' } }, beforeStart ? 'Starts Sun 6 Sep 2026' : afterEnd ? 'Month 1 finished' : `Today · Day ${todayN} · ${fmtDate(today())}`),
      el('h2', { style: { margin: '8px 0 4px' } }, beforeStart ? 'Get ready' : afterEnd ? 'You finished the first month' : todayDay.title),
      el('div', { class: 'hero-sum', style: { opacity: .95, fontSize: '15px' }, html: beforeStart ? 'Day 1 unlocks tomorrow. You can preview it now from the path if "unlock all" is on.' : afterEnd ? 'Use Practice to keep everything fresh.' : md(todayDay.summary || '') })),
      el('div', { class: 'spacer' }),
      !beforeStart && !afterEnd ? el('div', { class: 'hero-cta' }, el('button', { class: 'btn yellow lg', type: 'button', onClick: () => go('day', todayN) }, `${inProg ? 'Resume' : dayDone(todayN) ? 'Redo' : 'Start'} Day ${todayN}`), el('button', { class: 'linkbtn', type: 'button', onClick: () => { const c = document.querySelector('.node-wrap.current'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 'Show on path ↓')) : null),
    el('div', { style: { marginTop: '12px', fontSize: '14px' } }, beforeStart || afterEnd ? '' : goalText),
    el('div', { class: 'daily', style: { background: 'rgba(255,255,255,.3)' } }, el('div', { style: { width: goalPct + '%' } })));

  const goalChips = el('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px', margin: '4px 0 0' } }, ...GOALS.map(([k, ico, name]) => el('span', { class: 'pill' }, `${ico} ${name}`)));
  const goalsCard = el('div', { class: 'card soft' }, el('div', { class: 'small', style: { fontWeight: 900 } }, 'Four core goals, plus a mathematician\'s thread on lesson days:'), goalChips);
  const nudge = nextUndone && nextUndone.num < todayN ? el('div', { class: 'card', style: { borderColor: '#ffc800', background: '#fff8d6' } }, `⏰ You have ${DAYS.filter(d => d.num < todayN && !dayDone(d.num)).length} unfinished earlier day(s). Oldest: Day ${nextUndone.num} — ${nextUndone.title}. `, el('button', { class: 'btn sm yellow', type: 'button', onClick: () => go('day', nextUndone.num) }, 'Catch up')) : null;

  const pathEls = [];
  for (const u of UNITS) {
    const motifs = ['🧱', '🧮', '🔁', '🤝', '🏁'];
    pathEls.push(el('div', { class: `unit-head unit-${u.n}` },
      el('div', { class: 'wm' }, String(u.n)),
      el('div', { style: { position: 'relative' } }, el('h2', {}, u.title), el('div', { class: 'sub' }, u.sub)),
      el('div', { class: 'uh-right' }, el('div', { class: 'motif' }, motifs[u.n - 1] || '★'), el('div', { class: 'count' }, `${u.days.filter(dayDone).length}/${u.days.length}`))));
    const path = el('div', { class: 'path' });
    const unitDone = u.days.every(dayDone), unitCurrent = u.days.includes(todayN) || (nextUndone && u.days.includes(nextUndone.num));
    if (unitDone && !unitCurrent) {
      path.style.display = 'none';
      const head = pathEls[pathEls.length - 1];
      head.classList.add('collapsed'); head.title = 'Show the days of this finished unit';
      head.querySelector('.count').textContent = '✓ done · show';
      head.addEventListener('click', () => { const hid = path.style.display === 'none'; path.style.display = hid ? '' : 'none'; head.querySelector('.count').textContent = hid ? '✓ done · hide' : '✓ done · show'; });
    }
    const offsets = [0, 40, 60, 40, 0, -40, -60];
    const svgTrail = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgTrail.setAttribute('class', 'trail'); svgTrail.setAttribute('aria-hidden', 'true');
    path.append(svgTrail);
    requestAnimationFrame(() => {
      const nodes = [...path.querySelectorAll('.node')]; if (nodes.length < 2) return;
      const pr = path.getBoundingClientRect();
      svgTrail.setAttribute('width', pr.width); svgTrail.setAttribute('height', pr.height); svgTrail.setAttribute('viewBox', `0 0 ${pr.width} ${pr.height}`);
      let d = '';
      nodes.forEach((nd, i) => { const r = nd.getBoundingClientRect(); const x = r.left - pr.left + r.width / 2, y = r.top - pr.top + r.height / 2; d += (i ? 'L' : 'M') + x + ',' + y + ' '; });
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#c3cbd5'); p.setAttribute('stroke-width', '7'); p.setAttribute('stroke-dasharray', '0.1 16'); p.setAttribute('stroke-linecap', 'round');
      svgTrail.append(p);
    });
    u.days.forEach((n, i) => {
      const d = getDay(n);
      const unlocked = isUnlocked(n), done = dayDone(n), isToday = n === todayN;
      const cls = ['node', d.kind === 'checkpoint' ? 'checkpoint' : '', done ? 'done' : (unlocked ? (isToday || (nextUndone && nextUndone.num === n) ? 'current' : '') : 'locked')].join(' ');
      const offset = offsets[i % 7];
      const node = el('button', { class: cls, type: 'button', style: { transform: `translateX(${offset}px)` }, title: `Day ${n}: ${d.title}`,
        onClick: () => { if (!unlocked) { toast(`🔒 Day ${n} unlocks on ${fmtDate(dateOfDay(n))}`); return; } go('day', n); } },
        d.kind === 'checkpoint' ? '🏆' : done ? '✓' : unlocked ? d.emoji || '★' : '🔒',
        done && S.days[n].crowns ? el('span', { class: 'crown' }, '👑'.repeat(Math.min(3, S.days[n].crowns))) : null);
      const wrap = el('div', { class: `node-wrap ${isToday ? 'current' : ''}` });
      if (unlocked && !done && (isToday || (nextUndone && nextUndone.num === n))) wrap.append(el('div', { class: 'start-bubble', style: { transform: `translateX(${offset}px)` } }, isToday ? 'Today' : 'Next'));
      wrap.append(node, el('div', { class: 'label', style: { transform: `translateX(${offset}px)` } }, `Day ${n} · ${d.title}`), el('div', { class: 'date', style: { transform: `translateX(${offset}px)` } }, fmtDate(dateOfDay(n)) + (done ? ` · best ${S.days[n].best.score}/${S.days[n].best.total}` : '')));
      path.append(wrap);
    });
    pathEls.push(path);
  }
  page(hero, goalsCard, nudge, ...pathEls, el('p', { class: 'muted small', style: { textAlign: 'center', marginTop: '20px' } }, 'Days unlock one per calendar day. Any finished or unlocked day can be redone at any time.'));
  requestAnimationFrame(() => {
    const cur = document.querySelector('.node-wrap.current');
    if (!cur) return;
    const r = cur.getBoundingClientRect();
    if (r.top > window.innerHeight - 140) cur.scrollIntoView({ block: 'center' });
  });
}

// ---------- LESSON START ----------
function startDay(n) {
  const day = getDay(n);
  if (!day) return go('home');
  if (!isUnlocked(n)) { toast(`🔒 Day ${n} unlocks on ${fmtDate(dateOfDay(n))}`); return go('home'); }
  if (S.settings.hearts && hearts() <= 0 && day.kind !== 'checkpoint') {
    const m = Math.ceil(msToNextHeart() / 60000);
    page(el('div', { class: 'complete' }, el('div', { class: 'owl' }, '💔'), el('h1', {}, 'No hearts left'), el('p', {}, `Next heart in about ${m} min. Or do a Practice session to refill all five.`),
      el('div', { class: 'row', style: { justifyContent: 'center' } }, el('button', { class: 'btn blue', type: 'button', onClick: () => startPractice({ mode: 'weak', count: 8 }) }, '💪 Practice'), el('button', { class: 'btn ghost', type: 'button', onClick: () => go('home') }, 'Back'))));
    return;
  }
  const resume = S.resume && S.resume.day === n ? S.resume : null;
  const intro = el('div', { class: 'card' },
    el('div', { class: 'row' }, el('span', { class: `pill ${day.kind === 'checkpoint' ? 'p' : 'g'}` }, day.kind === 'checkpoint' ? 'Checkpoint test' : `Day ${n}`), el('span', { class: 'muted small' }, fmtDate(dateOfDay(n)))),
    el('h1', {}, day.title),
    el('div', { class: 'body', html: md(day.summary || '') }),
    day.strands ? el('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px' } }, ...day.strands.map(s => { const [i, nm] = strandInfo(s); return el('span', { class: 'pill' }, `${i} ${nm}`); })) : null,
    el('p', { class: 'muted small' }, `${day.steps.filter(s => s.type !== 'info').length} questions · ${day.steps.filter(s => s.type === 'info').length} concept cards · ${day.kind === 'checkpoint' ? 'no hints, no retries' : 'plus 2 review questions from earlier days'} · ~${day.minutes || 15} min${day.kind === 'checkpoint' ? '' : (() => { const b = estimateBreakdown(day); return ` (🔧 ${Math.round(b.H)} · 💻 ${Math.round(b.S)} · 📐 ${Math.round(b.M)} · ⚡ ${Math.round(b.E)} · 🧠 ${Math.round(b.G)})`; })()}`),
    dayDone(n) ? el('p', { class: 'small', style: { color: 'var(--green-dark)' } }, `Best: ${S.days[n].best.score}/${S.days[n].best.total} first-try · ${S.days[n].attempts} attempt(s)`) : null,
    resume ? el('p', { class: 'small', style: { color: 'var(--blue)', fontWeight: 800 } }, `In progress: ${resume.done} of ${resume.total} steps done. Your place was saved.`) : null,
    resume ? el('button', { class: 'btn wide', type: 'button', id: 'resumeBtn', onClick: () => {
      const pool = questionPool(99, { includeCheckpoints: true });
      const steps = resume.ids.map(r => r.i !== undefined ? day.steps[r.i] : (() => { const q = pool.find(x => x.id === r.q); return q ? { ...q, review: true, ref: `Day ${q.day}` } : null; })()).filter(Boolean);
      if (steps.length !== resume.ids.length) { delete S.resume; save(); toast('Could not restore that lesson; starting it fresh.'); return startDay(n); }
      runLesson(day, { steps, resume, onExit: () => go('home'), onPractice: () => startPractice({ mode: 'weak', count: 8 }) });
    } }, `Resume (${resume.done}/${resume.total})`) : null,
    el('button', { class: resume ? 'btn ghost wide' : 'btn wide', type: 'button', id: 'beginBtn', onClick: () => {
      if (resume) { delete S.resume; save(); }
      const steps = day.kind === 'checkpoint' ? day.steps.slice() : [...day.steps, ...reviewSteps(n, 2)];
      runLesson(day, { steps, onExit: () => go('home'), onPractice: () => startPractice({ mode: 'weak', count: 8 }) });
    } }, resume ? 'Start over' : dayDone(n) ? 'Redo lesson' : 'Begin'));
  const parts = day.strands && day.kind !== 'checkpoint' ? el('div', { class: 'card soft' },
    el('div', { class: 'small', style: { fontWeight: 900, marginBottom: '6px' } }, 'Redo just one part of this day (does not change your score; misses still go in the ledger):'),
    el('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px' } }, ...day.strands.filter(k => k !== 'J').map(k => { const [i, nm] = strandInfo(k); const steps = day.steps.filter(st => (st.strand === k) || (k === 'S' && st.strand === 'A') || (k === 'A' && st.strand === 'S')); return el('button', { class: 'btn ghost sm', type: 'button', onClick: () => runLesson(day, { steps, mode: 'practice', noResume: true, onExit: () => startDay(n) }) }, `${i} ${nm} · ${steps.filter(st => st.type !== 'info').length} q`); }),
      el('button', { class: 'btn ghost sm', type: 'button', onClick: () => runLesson(day, { steps: day.steps.filter(st => st.type === 'info'), mode: 'practice', noResume: true, onExit: () => startDay(n) }) }, '📖 Concept cards only'))) : null;
  page(intro, parts, el('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('home') }, 'Back to path'));
}

// ---------- PRACTICE ----------
function practice() {
  const upto = Math.max(...Object.keys(S.days).map(Number), 0);
  const nothing = upto === 0;
  const strands = [['H', '🔧 FPGA'], ['S', '💻 Software'], ['A', '💻 Algorithms'], ['M', '📐 Quant maths'], ['E', '⚡ EE degree'], ['G', '🧠 Mathematician\'s thread']];
  page(el('h1', {}, '💪 Practice'), el('p', { class: 'muted' }, 'Practice never costs hearts and refills them when you finish. Questions come from days you have completed.'),
    nothing ? el('div', { class: 'card soft' }, 'Complete Day 1 first, then practice unlocks.') : null,
    el('div', { class: 'card' }, el('h3', {}, '🎯 Weak spots'), el('p', { class: 'small muted' }, 'Questions you got wrong more often than right, then a random top-up.'), el('button', { class: 'btn wide', type: 'button', disabled: nothing, onClick: () => startPractice({ mode: 'weak', count: 10, uptoDay: upto }) }, 'Start (10 questions)')),
    el('div', { class: 'card' }, el('h3', {}, '🎲 Random mix'), el('p', { class: 'small muted' }, 'Everything so far, all strands. This is the "cold retrieval" the handbook asks for.'), el('button', { class: 'btn blue wide', type: 'button', disabled: nothing, onClick: () => startPractice({ mode: 'mix', count: 12, uptoDay: upto }) }, 'Start (12 questions)')),
    el('div', { class: 'card' }, el('h3', {}, 'One strand'), el('div', { class: 'row', style: { flexWrap: 'wrap' } }, ...strands.map(([k, lbl]) => el('button', { class: 'btn ghost sm', type: 'button', disabled: nothing, onClick: () => startPractice({ mode: 'mix', strand: k, count: 8, uptoDay: upto }) }, lbl)))));
}
function startPractice(o) {
  const steps = practiceSet(o);
  if (!steps.length) { toast('Nothing to practise yet'); return; }
  const fake = { num: 0, title: 'Practice', kind: 'practice', steps };
  runLesson(fake, { mode: 'practice', steps, onExit: () => { refillHearts(); toast('❤️ Hearts refilled'); go('home'); } });
}

// ---------- GLOSSARY ----------
function glossaryView() {
  const all = glossary().filter(g => isUnlocked(g.day));
  const inp = el('input', { class: 'answer-input', placeholder: 'Search a word…', style: { fontSize: '17px' } });
  const list = el('div');
  function draw() {
    const q = inp.value.trim().toLowerCase();
    list.innerHTML = '';
    const items = all.filter(g => !q || g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q));
    if (!items.length) list.append(el('p', { class: 'muted' }, 'No words yet — they appear as days unlock.'));
    for (const g of items) {
      const [ico, nm] = strandInfo(g.strand);
      list.append(el('div', { class: 'ledger-item' }, el('div', { class: 'row' }, el('span', { class: 'q' }, g.term), el('span', { class: 'spacer' }), el('span', { class: 'pill' }, `${ico} Day ${g.day}`)), el('div', { class: 'small', html: md(g.def) })));
    }
  }
  inp.oninput = draw;
  page(el('h1', {}, '📖 Words'), el('p', { class: 'muted small' }, `${all.length} terms, in plain English, from the concept cards you have unlocked.`), inp, list);
  draw();
}

// ---------- LEDGER ----------
function ledger() {
  const items = S.ledger.slice(0, 60);
  const weak = Object.entries(S.seen).filter(([, v]) => v.bad > 0 && v.bad >= v.ok).length;
  page(el('h1', {}, '📓 Error ledger'), el('p', { class: 'muted small' }, 'The handbook asks for a private error ledger: every miss is logged here with what you typed. Questions you have missed more than you have got right count as weak spots.'),
    el('div', { class: 'card soft' }, el('div', { class: 'row' }, el('div', {}, el('b', {}, weak), ' weak spot(s)'), el('div', { class: 'spacer' }), el('button', { class: 'btn sm', type: 'button', disabled: !weak, onClick: () => startPractice({ mode: 'weak', count: 10 }) }, 'Practise them'))),
    items.length ? items.map(it => el('div', { class: 'ledger-item' }, el('div', { class: 'q', html: md(it.prompt).replace(/^<p>|<\/p>$/g, '') }), el('div', { class: 'small muted' }, `Day ${it.day} · ${new Date(it.at).toLocaleString('en-GB')}${it.given ? ` · you answered: “${it.given}”` : ''}`))) : el('p', { class: 'muted' }, 'No misses logged yet.'));
}

// ---------- PROGRESS ----------
function qIndex() {
  // qid -> {strand(goal), day, checkpoint}
  const idx = {};
  for (const d of DAYS) for (const s of d.steps) if (s.type !== 'info' && s.id) idx[s.id] = { goal: goalOf(s.strand), day: d.num, checkpoint: d.kind === 'checkpoint' };
  return idx;
}
function unitStats(u, idx) {
  const qf = S.qfirst || {};
  let total = 0, answered = 0, firstOk = 0;
  for (const [qid, m] of Object.entries(idx)) {
    if (m.goal !== u.strand || !u.days.includes(m.day)) continue;
    total++;
    if (qid in qf) { answered++; if (qf[qid]) firstOk++; }
  }
  const pct = answered ? firstOk / answered : 0;
  const cks = CHECKPOINT_DAYS.filter(c => u.days.some(d => d > c - 7 && d <= c));
  const ckData = cks.map(c => ((S.dayStrand || {})[c] || {})[u.strand]).filter(x => x && x.firstN);
  const ckOk = ckData.length > 0 && ckData.every(x => x.firstOk / x.firstN >= 0.8);
  let level = 0;
  if (answered >= Math.max(3, total * 0.5) && pct >= 0.7) level = 1;
  if (level === 1 && pct >= 0.9 && ckOk) level = 2;
  return { total, answered, firstOk, pct, level, coverage: total ? answered / total : 0 };
}
function goalSummary(goal, idx) {
  const units = UNIT_MAP.filter(u => u.strand === goal).map(u => ({ u, st: unitStats(u, idx) }));
  const l1 = units.filter(x => x.st.level >= 1).length, l2 = units.filter(x => x.st.level >= 2).length;
  const qf = S.qfirst || {};
  let total = 0, answered = 0, firstOk = 0;
  for (const [qid, m] of Object.entries(idx)) { if (m.goal !== goal || m.checkpoint) continue; total++; if (qid in qf) { answered++; if (qf[qid]) firstOk++; } }
  const td = ((S.dayFirst || {})[dateKey(today())] || {})[goal];
  return { units, l1, l2, n: units.length, total, answered, firstOk, today: td && td.n ? { ok: td.ok, n: td.n } : null };
}
function sparkline(goal) {
  const vals = [];
  for (let i = 0; i < 30; i++) { const k = dateKey(addDays(START_DATE, i)); const f = ((S.dayFirst || {})[k] || {})[goal]; vals.push(f && f.n ? f.ok / f.n : null); }
  const W = 600, H = 60, pad = 4;
  const x = i => pad + i * (W - 2 * pad) / 29, y = v => H - pad - v * (H - 2 * pad);
  let d = '', started = false;
  vals.forEach((v, i) => { if (v === null) { started = false; return; } d += (started ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1) + ' '; started = true; });
  const dots = vals.map((v, i) => v === null ? '' : `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${v >= 0.8 ? '#58cc02' : '#ffc800'}"/>`).join('');
  const todayI = dayIndexToday() - 1;
  const marker = todayI >= 0 && todayI < 30 ? `<line x1="${x(todayI).toFixed(1)}" y1="${pad}" x2="${x(todayI).toFixed(1)}" y2="${H - pad}" stroke="#1cb0f6" stroke-width="1.5" stroke-dasharray="3 3"/>` : '';
  const any = vals.some(v => v !== null);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="${pad}" y1="${y(0.8).toFixed(1)}" x2="${W - pad}" y2="${y(0.8).toFixed(1)}" stroke="#e5e5e5" stroke-dasharray="4 4"/><line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#ccc"/>${marker}${any ? `<path d="${d.trim()}" fill="none" stroke="#1cb0f6" stroke-width="2"/>${dots}` : `<text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" font-size="12" fill="#999">no first-try data yet</text>`}</svg>`;
}
function progressView() {
  const idx = qIndex();
  const weakByGoal = {};
  for (const [qid, v] of Object.entries(S.seen || {})) { if (v.bad > 0 && v.bad >= v.ok && idx[qid]) weakByGoal[idx[qid].goal] = (weakByGoal[idx[qid].goal] || 0) + 1; }
  const cards = GOALS.map(([k, ico, name]) => {
    const g = goalSummary(k, idx);
    const headline = g.l2 === g.n && g.n ? 2 : g.l1 > 0 ? 1 : 0;
    const unitRows = g.units.map(({ u, st }) => el('div', { class: 'unitbar', title: `${u.name}: ${st.answered}/${st.total} questions attempted, ${Math.round(st.pct * 100)}% first-try` },
      el('div', {}, el('div', { class: 'uid' }, u.id), el('span', { class: `lvl l${st.level}`, style: { fontSize: '10px', padding: '1px 6px' } }, `L${st.level}`)),
      el('div', {}, el('div', { class: 'nm' }, u.name), el('div', { class: 'track' }, el('div', { class: st.pct >= 0.8 ? 'g' : '', style: { width: Math.round(st.coverage * st.pct * 100) + '%' } }))),
      el('div', { class: 'pct', title: `${st.answered} of ${st.total} answered` }, st.answered ? `${st.answered}/${st.total} · ${Math.round(st.pct * 100)}%` : `0/${st.total}`)));
    const ckRow = CHECKPOINT_DAYS.map(c => { const x = ((S.dayStrand || {})[c] || {})[k]; if (!x || !x.firstN) return el('td', {}, '—'); const p = x.firstOk / x.firstN; return el('td', { class: p >= 0.8 ? 'pass' : 'fail' }, `${Math.round(p * 100)}%`); });
    const weak = weakByGoal[k] || 0;
    return el('div', { class: 'goalcard' },
      el('div', { class: 'row' }, el('h3', {}, `${ico} ${name}`), el('span', { class: 'spacer' }), el('span', { class: `lvl l${headline}` }, headline === 2 ? 'L2 across units' : headline === 1 ? `L1 in ${g.l1}/${g.n} units` : 'L0 · just started')),
      el('div', { class: 'goal-done' },
        el('div', {}, el('b', {}, `${g.answered}`), ` of ${g.total} questions answered this month`, g.answered ? ` · ${Math.round(g.firstOk / g.answered * 100)}% right first time` : ''),
        el('div', { class: 'daily', style: { margin: '4px 0 6px' } }, el('div', { style: { width: Math.round(g.answered / Math.max(1, g.total) * 100) + '%' } })),
        el('div', { class: 'small muted' }, g.today ? `Today: ${g.today.ok}/${g.today.n} first-try (${Math.round(g.today.ok / g.today.n * 100)}%). ` : 'Nothing answered today yet. ', `Handbook levels: ${g.l1} unit(s) at L1, ${g.l2} at L2, of ${g.n}. Levels need ≥70% over a whole unit, so they move weekly, not daily.`)),
      el('div', { style: { marginTop: '8px' } }, ...unitRows),
      el('table', { class: 'cktable' }, el('tr', {}, el('th', {}, 'checkpoint'), ...CHECKPOINT_DAYS.map(c => el('th', {}, `Day ${c}`))), el('tr', {}, el('td', { style: { textAlign: 'left', fontSize: '12px' } }, 'first-try'), ...ckRow)),
      el('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Daily first-try accuracy (dashed line = 80%, blue = today):'),
      el('div', { html: sparkline(k) }),
      el('div', { class: 'row', style: { marginTop: '8px' } }, el('span', { class: 'small' }, weak ? `${weak} weak spot(s)` : 'no weak spots'), el('span', { class: 'spacer' }),
        el('button', { class: 'btn sm blue', type: 'button', onClick: () => startPractice({ mode: weak ? 'weak' : 'mix', strand: k === 'S' ? null : k, count: 8, uptoDay: Math.max(...Object.keys(S.days).map(Number), 0) }) }, 'Practise this track')));
  });
  const daysDone = DAYS.filter(d => dayDone(d.num)).length;
  const allQ = Object.values(idx).filter(m => !m.checkpoint).length;
  const allA = Object.keys(idx).filter(q => !idx[q].checkpoint && q in (S.qfirst || {})).length;
  const allOk = Object.keys(idx).filter(q => !idx[q].checkpoint && (S.qfirst || {})[q]).length;
  const month = el('div', { class: 'card month-card' },
    el('div', { class: 'row' }, el('h3', {}, 'Month 1'), el('span', { class: 'spacer' }), el('span', { class: 'pill g' }, `${daysDone}/30 days done`)),
    el('div', { class: 'daily' }, el('div', { style: { width: Math.round(daysDone / 30 * 100) + '%' } })),
    el('div', { class: 'row', style: { marginTop: '8px', gap: '18px', flexWrap: 'wrap' } },
      el('div', {}, el('b', {}, String(allA)), el('span', { class: 'small muted' }, ` of ${allQ} questions answered`)),
      el('div', {}, el('b', {}, allA ? `${Math.round(allOk / allA * 100)}%` : '—'), el('span', { class: 'small muted' }, ' right first time')),
      el('div', {}, el('b', {}, String(S.xp)), el('span', { class: 'small muted' }, ' XP')),
      el('div', {}, el('b', {}, String(currentStreak())), el('span', { class: 'small muted' }, ' day streak'))));
  page(el('h1', {}, '📈 Progress'), month, el('p', { class: 'muted small' }, 'Levels follow the handbook ladder: L1 = you can explain it and solve a small case (≥70% first-try on the unit\'s questions); L2 = you can apply it to changed examples (≥90% and the week\'s checkpoint ≥80% on that track). L3+ needs real RTL and code projects: month 2.'),
    el('div', { class: 'progress-grid' }, ...cards));
}

// ---------- PROFILE ----------
function profile() {
  const daysDone = Object.keys(S.days).length;
  const cal = el('div', { class: 'calendar' });
  const start = addDays(today(), -27);
  for (let i = 0; i < 28; i++) { const d = addDays(start, i); const k = dateKey(d); cal.append(el('div', { class: `${S.activeDays[k] ? 'done' : ''} ${k === dateKey(today()) ? 'today' : ''}`, title: `${k}: ${S.activeDays[k] || 0} XP` }, d.getDate())); }
  const badges = el('div', { class: 'badge-grid' }, ...BADGES.map(b => el('div', { class: `badge ${S.badges[b.id] ? '' : 'locked'}` }, el('div', { class: 'e' }, b.e), el('div', { class: 'n' }, b.n))));
  const setBox = el('div', { class: 'settings' });
  const chk = (label, key, hint) => { const c = el('input', { type: 'checkbox' }); c.checked = !!S.settings[key]; c.onchange = () => { S.settings[key] = c.checked; save(); toast('Saved'); }; return el('label', {}, c, el('div', {}, label, hint ? el('div', { class: 'small muted' }, hint) : null)); };
  setBox.append(chk('Hearts on', 'hearts', 'Turn off for unlimited mistakes (less Duolingo, less pressure).'), chk('Sound effects', 'sound'), chk('Unlock all days now', 'unlockAll', 'Preview ahead. Default is one new day per calendar day so every day has something new.'));
  const fake = el('input', { class: 'answer-input', type: 'date', style: { fontSize: '15px' }, value: S.settings.fakeToday || '' });
  fake.onchange = () => { S.settings.fakeToday = fake.value || null; save(); toast(fake.value ? 'Pretend-today set' : 'Using real date'); };
  const io = el('textarea', { class: 'answer-input', rows: 3, style: { fontSize: '12px', fontFamily: 'Consolas,monospace' }, placeholder: 'Paste a saved JSON here to import' });
  const idxP = qIndex();
  const goalsBox = el('div', { class: 'card' }, el('h3', {}, 'Progress towards your goals'), el('p', { class: 'small muted' }, 'The four handbook tracks and the separate mathematician\'s thread at level L1 / L2 this month. Full detail on the Progress tab.'));
  for (const [k, ico, name] of GOALS) {
    const g = goalSummary(k, idxP);
    goalsBox.append(el('div', { style: { marginTop: '8px' } }, el('div', { class: 'row' }, el('span', {}, `${ico} ${name}`), el('span', { class: 'spacer' }), el('span', { class: 'small muted' }, `${g.l1} at L1 · ${g.l2} at L2 · ${g.n} units`)), el('div', { class: 'daily' }, el('div', { style: { width: (g.n ? Math.round((g.l1 + g.l2) / (2 * g.n) * 100) : 0) + '%', background: g.l2 === g.n && g.n ? 'var(--green)' : 'var(--yellow)' } }))));
  }
  goalsBox.append(el('button', { class: 'btn ghost sm', type: 'button', style: { marginTop: '10px' }, onClick: () => go('progress') }, '📈 Open Progress'));
  page(el('h1', {}, `👤 ${S.settings.name || 'Learner'}`), goalsBox,
    el('div', { class: 'stats3', style: { margin: '10px 0' } },
      el('div', { class: 'statbox y' }, el('div', { class: 'lbl' }, 'Total XP'), el('div', { class: 'val' }, S.xp)),
      el('div', { class: 'statbox g' }, el('div', { class: 'lbl' }, 'Days done'), el('div', { class: 'val' }, `${daysDone}/30`)),
      el('div', { class: 'statbox b' }, el('div', { class: 'lbl' }, 'Best streak'), el('div', { class: 'val' }, `🔥 ${S.longestStreak || 0}`))),
    el('div', { class: 'card' }, el('h3', {}, 'Last 28 days'), cal, el('p', { class: 'small muted' }, `Streak freezes: ${S.streakFreezes}. A freeze saves your streak once if you miss a single day.`)),
    el('div', { class: 'card' }, el('h3', {}, 'Badges'), badges),
    el('div', { class: 'card' }, el('h3', {}, 'Settings'), setBox, el('p', { class: 'small muted', style: { marginTop: '10px' } }, 'Pretend today is (for testing the calendar; leave blank for real date):'), fake),
    el('div', { class: 'card' }, el('h3', {}, 'Backup'), el('div', { class: 'row', style: { flexWrap: 'wrap' } },
      el('button', { class: 'btn ghost sm', type: 'button', onClick: () => { io.value = exportJSON(); io.select(); document.execCommand && document.execCommand('copy'); toast('Save data placed in the box (and copied)'); } }, 'Export'),
      el('button', { class: 'btn ghost sm', type: 'button', onClick: () => { try { importJSON(io.value); toast('Imported'); go('profile'); } catch (e) { toast('Import failed: ' + e.message); } } }, 'Import'),
      el('button', { class: 'btn red sm', type: 'button', onClick: () => { if (confirm('Erase ALL progress?')) { resetAll(); go('home'); } } }, 'Reset everything')), io),
    el('p', { class: 'muted small' }, 'Handbook: Manchester EEE → Jane Street FPGA, planning edition 6 Sep 2026. Day 1 = Sun 6 Sep 2026; uni starts on Day 16 (Mon 21 Sep).'));
}

// ---------- boot ----------
function boot() {
  const h = location.hash.replace('#', '');
  const [v, arg] = h.split('/');
  if (v === 'day' && arg) { view = 'day'; return startDay(+arg); }
  view = ['home', 'practice', 'progress', 'glossary', 'ledger', 'profile'].includes(v) ? v : 'home';
  render();
}
window.addEventListener('hashchange', () => { const [v, arg] = location.hash.replace('#', '').split('/'); if (v !== view || v === 'day') { view = v || 'home'; render(arg); } });
window.__app = { go, S, DAYS, startDay, startPractice };
boot();
