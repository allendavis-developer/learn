// Content helpers so day files stay short and readable.
// Strand codes: H hardware, S code, A algorithms, M quant maths, E degree (EEE), G mathematician's
// thread, J orientation / career, R review.
export function dayBuilder(num) {
  let n = 0;
  const id = () => `d${String(num).padStart(2, '0')}.q${++n}`;
  const base = (type, strand, extra) => ({ type, strand, ...extra });
  return {
    // concept card. terms: [[word, plain definition], ...]
    info: (strand, title, body, extra = {}) => base('info', strand, { title, body, ...extra }),
    // multiple choice; answer = index into options (before shuffling)
    mc: (strand, prompt, options, answer, explain, extra = {}) => base('mc', strand, { id: id(), prompt, options, answer, explain, ...extra }),
    tf: (strand, prompt, isTrue, explain, extra = {}) => base('mc', strand, { id: id(), prompt, options: ['True', 'False'], answer: isTrue ? 0 : 1, explain, shuffle: false, grid: true, ...extra }),
    multi: (strand, prompt, options, answers, explain, extra = {}) => base('multi', strand, { id: id(), prompt: prompt + ' *(select all that apply)*', options, answers, explain, ...extra }),
    num: (strand, prompt, answer, explain, extra = {}) => base('numeric', strand, { id: id(), prompt, answer, explain, ...extra }),
    text: (strand, prompt, answers, explain, extra = {}) => base('text', strand, { id: id(), prompt, answers: Array.isArray(answers) ? answers : [answers], explain, ...extra }),
    tokens: (strand, prompt, answer, distractors, explain, extra = {}) => base('tokens', strand, { id: id(), prompt, answer, distractors, explain, ...extra }),
    order: (strand, prompt, items, explain, extra = {}) => base('order', strand, { id: id(), prompt, items, explain, ...extra }),
    match: (strand, prompt, pairs, explain, extra = {}) => base('match', strand, { id: id(), prompt, pairs, explain, ...extra }),
    // code exercise: spec = {lang:'python'|'js', fn:'solve', starter, tests:[{args, expect, name?}], gen?, refCode?, checker?, speed?:{gen, budgetMs, label}, solution}
    code: (strand, prompt, spec, explain, extra = {}) => base('code', strand, { id: id(), prompt, lang: 'python', ...spec, explain, ...extra }),
    // interactive goal: widget {name, props}, check(state) => bool
    goal: (strand, prompt, widget, check, explain, extra = {}) => base('widget', strand, { id: id(), prompt, widget, check, explain, ...extra }),
  };
}

export const W = (name, props = {}) => ({ name, props });

// ---- Study-time estimate -------------------------------------------------------------------------
// Standing rule: every day must be at least 45 minutes of real study. These weights are calibrated on the
// user's own timing (the original 10-minute Day 1 scores ~10 here), so a day that passes the validator's
// 45-minute check really is a long session for this learner. The path view shows the same estimate.
const WPM = 280;
const words = s => (typeof s === 'string' ? s : '').split(/\s+/).filter(Boolean).length;
const Q_SECONDS = { mc: 14, multi: 20, numeric: 24, text: 20, tokens: 24, order: 28, match: 30, widget: 30, code: 300 };
export const goalOfStrand = s => (s === 'A' ? 'S' : s);

export function stepSeconds(s) {
  if (s.type === 'info') {
    let w = words(s.title) + words(s.body) + words(s.after);
    if (s.terms) for (const t of s.terms) w += words(t[0]) + words(t[1]);
    return w / WPM * 60 + (s.widget ? 20 : 0);
  }
  let sec = Q_SECONDS[s.type] || 30;
  if (words(s.prompt) > 40) sec += 15;
  if (s.body) sec += words(s.body) / WPM * 60;
  if (s.hard || /^(\*\*)?(Stretch|Genius track|Exam-style|Interview)/i.test(s.prompt || '')) sec += 40;
  if (s.type === 'code' && s.speed) sec += 100;
  if (s.widget && s.type !== 'widget') sec += 10;
  return sec;
}

// {total, H, S, M, E, G} in minutes. Lesson days include the two appended review questions.
export function estimateBreakdown(day) {
  const out = { total: 0, H: 0, S: 0, M: 0, E: 0, G: 0 };
  for (const s of day.steps) {
    const sec = stepSeconds(s);
    out.total += sec;
    const g = goalOfStrand(s.strand);
    if (g in out) out[g] += sec;
  }
  if (day.kind !== 'checkpoint') out.total += 40;
  for (const k of Object.keys(out)) out[k] = out[k] / 60;
  return out;
}
export const estimateMinutes = day => Math.round(estimateBreakdown(day).total);

// Unit (week) metadata used by the path view.
export const UNITS = [
  { n: 1, title: 'Unit 1 · Foundations', sub: 'Bits, Python, probability, circuit laws (pre-uni week 1)', color: '#58cc02', days: [1, 2, 3, 4, 5, 6, 7] },
  { n: 2, title: 'Unit 2 · Arithmetic & data', sub: 'Signed overflow, widths, bytes, hashing, counting, calculus refresh', color: '#1cb0f6', days: [8, 9, 10, 11, 12, 13, 14] },
  { n: 3, title: 'Unit 3 · State & tools', sub: 'Registers, FSMs, resets, Git, Bayes, expectation — uni starts Mon 21 Sep (Day 16)', color: '#ce82ff', days: [15, 16, 17, 18, 19, 20, 21] },
  { n: 4, title: 'Unit 4 · Streams & search', sub: 'valid/ready, buffers, binary search, windows, phasors, Norton', color: '#ff9600', days: [22, 23, 24, 25, 26, 27, 28] },
  { n: 5, title: 'Unit 5 · FIFOs & month test', sub: 'Ring buffers, search on the answer, vectors, the month test', color: '#ff4b4b', days: [29, 30] },
];

// Handbook units covered in month 1 → the days that teach them (used by the Progress page).
export const UNIT_MAP = [
  { id: 'H01', strand: 'H', name: 'Bits, arithmetic and combinational logic', days: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13] },
  { id: 'H02', strand: 'H', name: 'Registers, state machines and resets', days: [15, 16, 17, 18, 19, 20] },
  { id: 'H03', strand: 'H', name: 'Streaming handshakes and buffering', days: [22, 23, 24, 25, 26] },
  { id: 'H04', strand: 'H', name: 'FIFOs, memories and arbitration', days: [27, 29] },
  { id: 'S01', strand: 'S', name: 'Python models and readable programs', days: [1, 2, 3, 4, 5, 9, 10, 12, 18] },
  { id: 'S03', strand: 'S', name: 'Linux, Git, debugging, reproducible work', days: [15, 16, 17, 19] },
  { id: 'A01', strand: 'S', name: 'Complexity, invariants, arrays, hashing', days: [6, 8, 11, 13] },
  { id: 'A02', strand: 'S', name: 'Search, sorting, windows and intervals', days: [20, 22, 23, 24, 25, 26, 29] },
  { id: 'A03', strand: 'S', name: 'Stacks, queues, heaps', days: [27, 28] },
  { id: 'M00', strand: 'M', name: 'Probability foundations: sample spaces, events, independence', days: [1, 2, 3] },
  { id: 'M01', strand: 'M', name: 'Proofs, sets and counting', days: [8, 9, 10, 11, 12, 13, 19] },
  { id: 'M03', strand: 'M', name: 'Recurrences and generating functions', days: [26] },
  { id: 'M04', strand: 'M', name: 'Conditional probability and Bayes', days: [4, 15] },
  { id: 'M05', strand: 'M', name: 'Random variables and distributions', days: [5, 20, 22] },
  { id: 'M06', strand: 'M', name: 'Expectation, variance, stopping problems', days: [6, 16, 17, 18, 27] },
  { id: 'M07', strand: 'M', name: 'Statistics and fair benchmarks', days: [23] },
  { id: 'M08', strand: 'M', name: 'Queues, Markov chains, burst bounds', days: [24, 25] },
  { id: 'G01', strand: 'G', name: 'Mathematician\'s thread: proof, invariants and structural problem solving', days: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 29, 30] },
  { id: 'EEEN11101', strand: 'E', name: 'Principles of EEE: circuit laws, equivalents, op-amps, transients, AC power', days: [1, 2, 3, 4, 5, 12, 13, 15, 16, 20, 22, 23, 26, 27] },
  { id: 'MATH19611', strand: 'E', name: 'Maths 1E1: calculus, complex numbers, ODEs, series, vectors', days: [6, 8, 9, 11, 19, 24, 29] },
  { id: 'EEEN11201', strand: 'E', name: 'EEE in Practice: measurement theory, uncertainty, instruments', days: [17, 18, 25] },
];
export const CHECKPOINT_DAYS = [7, 14, 21, 28, 30];
