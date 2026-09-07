// Persistent learner state: XP, streak, hearts, gems, per-day results, question ledger.
import { dateKey, addDays } from './utils.js';

const KEY = 'fpgalingo.v1';
export const START_DATE = new Date(2026, 8, 6); // Sun 6 Sep 2026 = Day 1
export const HEART_MAX = 5;
export const HEART_REFILL_MS = 30 * 60 * 1000; // one heart per 30 min
export const DAILY_GOAL = 50;

const defaults = () => ({
  xp: 0,
  gems: 50,
  hearts: HEART_MAX,
  heartsAt: Date.now(),      // last time hearts were computed
  streak: 0,
  streakFreezes: 1,
  lastActive: null,          // dateKey of last day something was completed
  activeDays: {},            // dateKey -> xp earned that day
  days: {},                  // dayNum -> {best:{score,total,xp}, attempts, lastAt, crowns}
  ledger: [],                // {qid, day, prompt, correct, at, given}
  seen: {},                  // qid -> {ok, bad, last}
  badges: {},
  settings: { unlockAll: false, sound: true, hearts: true, name: 'Allen' },
  version: 1
});

export let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = defaults();
    const s = JSON.parse(raw);
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
  } catch (e) { return defaults(); }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ }
}

export function resetAll() {
  S = defaults();
  save();
}

export function exportJSON() { return JSON.stringify(S, null, 2); }
export function importJSON(txt) {
  const s = JSON.parse(txt);
  if (!s || typeof s !== 'object' || !('xp' in s)) throw new Error('Not a valid save file');
  S = { ...defaults(), ...s };
  save();
}

export function today() {
  if (S.settings.fakeToday) return new Date(S.settings.fakeToday + 'T12:00:00');
  return new Date();
}
export function todayKey() { return dateKey(today()); }

// Day number (1-based) that is unlocked today. Day 1 = START_DATE.
export function dayIndexToday() {
  const t = today(); t.setHours(0, 0, 0, 0);
  const s = new Date(START_DATE.getTime()); s.setHours(0, 0, 0, 0);
  return Math.floor((t - s) / 86400000) + 1;
}
export function dateOfDay(n) { return addDays(START_DATE, n - 1); }

export function isUnlocked(n) {
  if (S.settings.unlockAll) return true;
  return n <= dayIndexToday();
}

// ---- hearts ----
export function hearts() {
  if (!S.settings.hearts) return HEART_MAX;
  refillTick();
  return S.hearts;
}
function refillTick() {
  if (S.hearts >= HEART_MAX) { S.heartsAt = Date.now(); return; }
  const gained = Math.floor((Date.now() - S.heartsAt) / HEART_REFILL_MS);
  if (gained > 0) {
    S.hearts = Math.min(HEART_MAX, S.hearts + gained);
    S.heartsAt += gained * HEART_REFILL_MS;
    save();
  }
}
export function loseHeart() {
  if (!S.settings.hearts) return HEART_MAX;
  refillTick();
  if (S.hearts === HEART_MAX) S.heartsAt = Date.now();
  S.hearts = Math.max(0, S.hearts - 1);
  save();
  return S.hearts;
}
export function refillHearts() { S.hearts = HEART_MAX; S.heartsAt = Date.now(); save(); }
export function msToNextHeart() {
  refillTick();
  if (S.hearts >= HEART_MAX) return 0;
  return Math.max(0, HEART_REFILL_MS - (Date.now() - S.heartsAt));
}

// ---- XP / streak ----
export function addXP(n) {
  S.xp += n;
  const k = todayKey();
  S.activeDays[k] = (S.activeDays[k] || 0) + n;
  touchStreak();
  save();
}
function touchStreak() {
  const k = todayKey();
  if (S.lastActive === k) return;
  if (!S.lastActive) { S.streak = 1; }
  else {
    const yesterday = dateKey(addDays(today(), -1));
    if (S.lastActive === yesterday) S.streak += 1;
    else {
      // streak broken unless a freeze covers exactly one missed day
      const twoAgo = dateKey(addDays(today(), -2));
      if (S.lastActive === twoAgo && S.streakFreezes > 0) { S.streakFreezes -= 1; S.streak += 1; }
      else S.streak = 1;
    }
  }
  S.lastActive = k;
  S.longestStreak = Math.max(S.longestStreak || 0, S.streak);
}
// Streak shown on the top bar: 0 if the learner missed yesterday and today.
export function currentStreak() {
  if (!S.lastActive) return 0;
  const k = todayKey(), y = dateKey(addDays(today(), -1));
  if (S.lastActive === k || S.lastActive === y) return S.streak;
  const twoAgo = dateKey(addDays(today(), -2));
  if (S.lastActive === twoAgo && S.streakFreezes > 0) return S.streak;
  return 0;
}
export function xpToday() { return S.activeDays[todayKey()] || 0; }

// ---- lesson results ----
export function completeDay(n, result) {
  const d = S.days[n] || { attempts: 0, best: null, crowns: 0 };
  d.attempts += 1;
  d.lastAt = Date.now();
  d.doneOn = todayKey();
  const pct = result.total ? result.score / result.total : 1;
  if (!d.best || pct > d.best.score / Math.max(1, d.best.total)) d.best = { score: result.score, total: result.total, xp: result.xp };
  d.crowns = Math.max(d.crowns, pct >= 1 ? 3 : pct >= .8 ? 2 : 1);
  S.days[n] = d;
  S.gems += result.kind === 'checkpoint' ? 20 : 5;
  if (pct >= 1) S.gems += 5;
  save();
  checkBadges();
}
export function dayDone(n) { return !!(S.days[n] && S.days[n].best); }

export function recordAnswer(qid, dayNum, prompt, correct, given, goal, extra = {}) {
  if (goal) { S.goals = S.goals || {}; const g = S.goals[goal] || { ok: 0, bad: 0 }; if (correct) g.ok += 1; else g.bad += 1; S.goals[goal] = g; }
  // per-strand totals, per-day-per-strand results and first-attempt outcome per question (for the Progress page)
  const strand = extra.strand || goal, qday = extra.qday || dayNum, first = !!extra.first;
  if (strand) {
    S.strandSeen = S.strandSeen || {}; const ss = S.strandSeen[strand] || { ok: 0, bad: 0 }; if (correct) ss.ok += 1; else ss.bad += 1; S.strandSeen[strand] = ss;
    S.dayStrand = S.dayStrand || {}; const dd = S.dayStrand[qday] = S.dayStrand[qday] || {}; const ds = dd[strand] || { ok: 0, bad: 0, firstOk: 0, firstN: 0 };
    if (correct) ds.ok += 1; else ds.bad += 1;
    if (first) { ds.firstN += 1; if (correct) ds.firstOk += 1; }
    dd[strand] = ds;
  }
  S.qfirst = S.qfirst || {};
  if (!(qid in S.qfirst)) S.qfirst[qid] = correct ? 1 : 0;
  const dk = todayKey(); S.dayFirst = S.dayFirst || {}; const df = S.dayFirst[dk] = S.dayFirst[dk] || {}; if (strand && first) { const f = df[strand] || { ok: 0, n: 0 }; f.n += 1; if (correct) f.ok += 1; df[strand] = f; }
  const s = S.seen[qid] || { ok: 0, bad: 0, last: 0 };
  if (correct) s.ok += 1; else s.bad += 1;
  s.last = Date.now();
  S.seen[qid] = s;
  if (!correct) {
    S.ledger.unshift({ qid, day: dayNum, prompt: String(prompt).slice(0, 200), at: Date.now(), given: given == null ? '' : String(given).slice(0, 120) });
    if (S.ledger.length > 400) S.ledger.length = 400;
  }
  save();
}
export function weakQids() {
  return Object.entries(S.seen).filter(([, v]) => v.bad > 0 && v.bad >= v.ok).map(([k]) => k);
}

// ---- badges ----
export const BADGES = [
  { id: 'first', e: '🐣', n: 'First lesson', test: s => Object.keys(s.days).length >= 1 },
  { id: 'week1', e: '🧱', n: 'Foundations week', test: s => [1, 2, 3, 4, 5, 6, 7].every(d => s.days[d] && s.days[d].best) },
  { id: 'streak3', e: '🔥', n: '3-day streak', test: s => (s.longestStreak || 0) >= 3 },
  { id: 'streak7', e: '🔥🔥', n: '7-day streak', test: s => (s.longestStreak || 0) >= 7 },
  { id: 'xp500', e: '⚡', n: '500 XP', test: s => s.xp >= 500 },
  { id: 'xp2000', e: '⚡⚡', n: '2000 XP', test: s => s.xp >= 2000 },
  { id: 'perfect', e: '💎', n: 'Perfect lesson', test: s => Object.values(s.days).some(d => d.best && d.best.total && d.best.score === d.best.total) },
  { id: 'checkpoint', e: '🏆', n: 'Checkpoint passed', test: s => [7, 14, 21, 28, 30].some(d => s.days[d] && s.days[d].best && s.days[d].best.score / s.days[d].best.total >= .8) },
  { id: 'uni', e: '🎓', n: 'Uni week started', test: s => !!(s.days[15] && s.days[15].best) },
  { id: 'month', e: '🚀', n: 'Month one complete', test: s => Array.from({ length: 30 }, (_, i) => i + 1).every(d => s.days[d] && s.days[d].best) },
  { id: 'ledger10', e: '📓', n: 'Ledger: 10 corrections', test: s => Object.values(s.seen).filter(v => v.bad > 0 && v.ok > 0).length >= 10 },
  { id: 'practice', e: '💪', n: 'Practice session', test: s => (s.practiceCount || 0) >= 1 },
];
export function checkBadges() {
  const fresh = [];
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.test(S)) { S.badges[b.id] = Date.now(); fresh.push(b); }
  }
  if (fresh.length) save();
  return fresh;
}
