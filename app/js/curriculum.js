// Registry of the 30 days plus spaced-review selection.
import { rng, shuffle } from './utils.js';
import { S } from './state.js';
import { UNITS, estimateMinutes } from './lib.js';
import d01 from './days/d01.js'; import d02 from './days/d02.js'; import d03 from './days/d03.js'; import d04 from './days/d04.js'; import d05 from './days/d05.js';
import d06 from './days/d06.js'; import d07 from './days/d07.js'; import d08 from './days/d08.js'; import d09 from './days/d09.js'; import d10 from './days/d10.js';
import d11 from './days/d11.js'; import d12 from './days/d12.js'; import d13 from './days/d13.js'; import d14 from './days/d14.js'; import d15 from './days/d15.js';
import d16 from './days/d16.js'; import d17 from './days/d17.js'; import d18 from './days/d18.js'; import d19 from './days/d19.js'; import d20 from './days/d20.js';
import d21 from './days/d21.js'; import d22 from './days/d22.js'; import d23 from './days/d23.js'; import d24 from './days/d24.js'; import d25 from './days/d25.js';
import d26 from './days/d26.js'; import d27 from './days/d27.js'; import d28 from './days/d28.js'; import d29 from './days/d29.js'; import d30 from './days/d30.js';

export const DAYS = [d01, d02, d03, d04, d05, d06, d07, d08, d09, d10, d11, d12, d13, d14, d15, d16, d17, d18, d19, d20, d21, d22, d23, d24, d25, d26, d27, d28, d29, d30];
DAYS.forEach((d, i) => {
  d.num = i + 1;
  d.kind = d.kind || 'lesson';
  if (d.steps.some(step => step.strand === 'G') && !d.strands.includes('G')) d.strands.push('G');
  d.minutes = estimateMinutes(d);
});
export { UNITS };

export const getDay = n => DAYS[n - 1];

const QUESTION_TYPES = new Set(['mc', 'multi', 'numeric', 'text', 'tokens', 'order', 'match', 'widget']);
export const isQuestion = s => QUESTION_TYPES.has(s.type);

// All question steps from lesson days before `beforeDay` (checkpoints excluded).
export function questionPool(beforeDay = 99, { includeCheckpoints = false } = {}) {
  const out = [];
  for (const d of DAYS) {
    if (d.num >= beforeDay) break;
    if (d.kind === 'checkpoint' && !includeCheckpoints) continue;
    for (const s of d.steps) if (isQuestion(s) && !s.noReview) out.push({ ...s, day: d.num });
  }
  return out;
}

// Review steps appended to a day's lesson: deterministic per day, biased towards questions the learner has missed.
export function reviewSteps(dayNum, count = 2) {
  const pool = questionPool(dayNum);
  if (!pool.length) return [];
  const r = rng(dayNum * 7919);
  const weak = pool.filter(q => S.seen[q.id] && S.seen[q.id].bad > 0 && S.seen[q.id].bad >= S.seen[q.id].ok);
  const picks = [];
  const used = new Set();
  for (const q of shuffle(weak, r)) { if (picks.length >= Math.ceil(count / 2)) break; picks.push(q); used.add(q.id); }
  for (const q of shuffle(pool, r)) { if (picks.length >= count) break; if (!used.has(q.id)) { picks.push(q); used.add(q.id); } }
  return picks.map(q => ({ ...q, review: true, ref: `Day ${q.day}` }));
}

// Practice sets.
export function practiceSet({ mode = 'mix', strand = null, count = 10, uptoDay = 99 } = {}) {
  let pool = questionPool(uptoDay + 1, { includeCheckpoints: true });
  if (strand) pool = pool.filter(q => q.strand === strand);
  if (mode === 'weak') {
    const weakIds = new Set(Object.entries(S.seen).filter(([, v]) => v.bad > 0 && v.bad >= v.ok).map(([k]) => k));
    const weak = pool.filter(q => weakIds.has(q.id));
    const rest = pool.filter(q => !weakIds.has(q.id));
    pool = [...shuffle(weak), ...shuffle(rest)];
    return pool.slice(0, count).map(q => ({ ...q, review: true, ref: `Day ${q.day}` }));
  }
  return shuffle(pool).slice(0, count).map(q => ({ ...q, review: true, ref: `Day ${q.day}` }));
}

// Glossary: every [term, definition] from concept cards, with the day it appeared.
export function glossary() {
  const out = [];
  for (const d of DAYS) for (const s of d.steps) if (s.type === 'info' && s.terms) for (const [t, def] of s.terms) out.push({ term: t, def, day: d.num, strand: s.strand });
  return out;
}
