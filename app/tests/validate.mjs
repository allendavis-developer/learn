// Content validator: node tests/validate.mjs [day ...]
// Checks every day: structure, question shapes, widget names, IDs unique, code exercise solutions pass their own
// tests (via a python subprocess), PLUS the standing content rules (see C:\dev\study\CLAUDE.md):
//   - every question stands alone (no dangling "Same resistor:", "This list:", "the value above" openers)
//   - every day is 45–75 estimated minutes (about one hour: target 50–65), each core goal ≥ 7 minutes
//     and the separate mathematician's thread ≥ 1 minute on a lesson day
import { spawnSync } from 'node:child_process';
import { loadDays, loadWidgets, loadLib } from './_load.mjs';

const DAYS = await loadDays();
const WIDGETS = await loadWidgets();
const { estimateBreakdown, stepSeconds } = await loadLib();

const MIN_DAY_MINUTES = 45, MAX_DAY_MINUTES = 75, MIN_GOAL_MINUTES = 7, MIN_THREAD_MINUTES = 1;
const errors = [], warnings = [];
const ids = new Set();
let counts = { info: 0, q: 0, code: 0, goal: 0 }, perStrand = {};

// ---- self-contained prompt lint ------------------------------------------------------------------
const DANGLING_START = /^(\*\*)?(same|also|now|and|then|again|next|still|this|that|it|its|these|those|the same|for the same|with the same|in the same|using the (above|previous|earlier)|from (the )?(above|previous)|as (before|above)|likewise|similarly|repeat|once more|one more)\b/i;
const DANGLING_INSIDE = /\b(the (same|previous|earlier|last) (resistor|circuit|list|array|die|dice|coin|question|value|values|code|function|game|bag|deck|walk|board|sequence|data|setup|string|message|signal|register|fifo|buffer|pipeline|table|matrix|vector|equation|integral|series|divider|source|load|battery|wire|capacitor|inductor|op-amp|amplifier|meter|measurement|sample|trial|experiment|problem|puzzle|scenario|case|example|input|output|counter|state machine|fsm|uart|frame|packet|window|interval|heap|stack|queue|graph|tree|set|dictionary|dict|map|loop|test|bit ?vector|pattern)|as (before|above|earlier)|from (above|earlier)|see above|mentioned above|question above|previous (question|part|step)|part \(?[a-c]\)? above)\b/i;
function checkPrompt(d, s) {
  const p = (s.prompt || '').replace(/^\s*(Stretch|Genius track|Exam-style|Interview|Build)\s*[:·—-]\s*/i, '');
  if (DANGLING_START.test(p)) errors.push(`d${d.num} ${s.id}: prompt does not stand alone (starts "${p.slice(0, 40)}…"). Restate the givens.`);
  else if (DANGLING_INSIDE.test(p)) errors.push(`d${d.num} ${s.id}: prompt refers to something outside itself ("${p.match(DANGLING_INSIDE)[0]}"). Restate the givens.`);
  else if (/\babove\b/i.test(p) && !s.widget && !s.body) errors.push(`d${d.num} ${s.id}: prompt says "above" but has no widget/body of its own.`);
}

for (const d of DAYS) {
  if (!d.title || !d.steps || !d.steps.length) errors.push(`d${d.num}: missing title/steps`);
  if (d.steps.some(s => s.title === 'Pending')) errors.push(`d${d.num}: still a stub`);
  const strands = new Set();
  for (const s of d.steps) {
    strands.add(s.strand);
    if (s.type === 'info') { counts.info++; if (!s.body) errors.push(`d${d.num}: info without body (${s.title})`); if (!s.terms || !s.terms.length) warnings.push(`d${d.num}: concept card "${s.title}" has no Words-first terms`); }
    else {
      counts.q++;
      if (!s.id) errors.push(`d${d.num}: question without id (${s.prompt})`);
      if (ids.has(s.id)) errors.push(`duplicate id ${s.id}`); ids.add(s.id);
      if (!s.prompt) errors.push(`d${d.num}: ${s.id} no prompt`); else checkPrompt(d, s);
      if (!s.explain && s.type !== 'match') warnings.push(`d${d.num}: ${s.id} no explanation`);
      perStrand[s.strand] = (perStrand[s.strand] || 0) + 1;
    }
    if (s.type === 'mc') { if (!Array.isArray(s.options) || s.options.length < 2) errors.push(`${s.id}: options`); if (typeof s.answer !== 'number' || s.answer < 0 || s.answer >= s.options.length) errors.push(`${s.id}: bad answer index`); }
    if (s.type === 'multi') { if (!Array.isArray(s.answers) || !s.answers.length || s.answers.some(i => i >= s.options.length)) errors.push(`${s.id}: bad multi answers`); }
    if (s.type === 'numeric') { const a = Array.isArray(s.answer) ? s.answer : [s.answer]; if (a.some(x => typeof x !== 'number' || Number.isNaN(x))) errors.push(`${s.id}: numeric answer not a number`); }
    if (s.type === 'text' && (!s.answers || !s.answers.length)) errors.push(`${s.id}: text without answers`);
    if (s.type === 'tokens' && (!s.answer || !s.answer.length)) errors.push(`${s.id}: tokens without answer`);
    if (s.type === 'order' && (!s.items || s.items.length < 2)) errors.push(`${s.id}: order needs items`);
    if (s.type === 'match' && (!s.pairs || s.pairs.length < 2)) errors.push(`${s.id}: match needs pairs`);
    if (s.type === 'widget') { counts.goal++; if (typeof s.check !== 'function') errors.push(`${s.id}: goal without check`); }
    if (s.widget && !WIDGETS[s.widget.name]) errors.push(`d${d.num}: unknown widget "${s.widget.name}"`);
    if (s.type === 'code') { counts.code++; if (!s.solution) errors.push(`${s.id}: code without solution`); if (!s.tests || !s.tests.length) errors.push(`${s.id}: code without tests`); }
  }
  if (d.kind !== 'checkpoint' && !['H', 'S', 'A'].some(k => strands.has(k))) warnings.push(`d${d.num}: no hardware/code strand`);
  // ---- length rule
  const b = estimateBreakdown(d);
  const line = `d${d.num}: ~${b.total.toFixed(0)} min (H ${b.H.toFixed(0)}, S ${b.S.toFixed(0)}, M ${b.M.toFixed(0)}, E ${b.E.toFixed(0)}, G ${b.G.toFixed(0)})`;
  if (b.total < MIN_DAY_MINUTES) errors.push(`${line} — under the ${MIN_DAY_MINUTES}-minute rule`);
  if (b.total > MAX_DAY_MINUTES) errors.push(`${line} — over the ${MAX_DAY_MINUTES}-minute cap (a day is about one hour; more is overwhelming)`);
  if (d.kind !== 'checkpoint') {
    for (const g of ['H', 'S', 'M', 'E']) if (b[g] < MIN_GOAL_MINUTES) errors.push(`d${d.num}: goal ${g} gets only ${b[g].toFixed(1)} min (rule: ≥ ${MIN_GOAL_MINUTES} on every lesson day)`);
    if (b.G < MIN_THREAD_MINUTES) errors.push(`d${d.num}: mathematician's thread gets only ${b.G.toFixed(1)} min (rule: ≥ ${MIN_THREAD_MINUTES} on every lesson day)`);
  }
  console.log(line);
}

// Run every code exercise's reference solution against its tests with real Python (same harness logic as the browser).
const py = `
import json, sys, random, copy
spec = json.loads(sys.stdin.read())
ns = {}; exec(spec["code"], ns); fn = ns[spec["fn"]]
ref = None
if spec.get("refCode"): r = {}; exec(spec["refCode"], r); ref = r["ref"]
checker = None
if spec.get("checker"): c = {}; exec(spec["checker"], c); checker = c["check"]
tests = list(spec.get("tests") or [])
if spec.get("gen"):
    g = {"random": random}; exec(spec["gen"], g); random.seed(1)
    for args in g["gen"](): tests.append({"args": list(args), "expect": None, "useRef": True})
bad = []
for t in tests:
    args = t.get("args", [])
    got = fn(*[copy.deepcopy(a) for a in args])
    exp = t.get("expect")
    if t.get("useRef") and ref is not None: exp = ref(*[copy.deepcopy(a) for a in args])
    ok = checker(args, got, exp) if checker else (got == exp or (isinstance(got, tuple) and list(got) == exp))
    if not ok: bad.append({"args": args, "got": repr(got), "expect": repr(exp)})
sp = spec.get("speed")
ms = None
if sp:
    import time
    g = {"random": random}; exec(sp["gen"], g); random.seed(7); args = list(g["gen"]())
    t0 = time.perf_counter(); fn(*args); ms = (time.perf_counter() - t0) * 1000
print(json.dumps({"bad": bad, "speedMs": ms, "budget": sp["budgetMs"] if sp else None}))
`;
let codeChecked = 0;
for (const d of DAYS) for (const s of d.steps) if (s.type === 'code') {
  const spec = { code: s.solution, fn: s.fn || 'solve', tests: s.tests, gen: s.gen, refCode: s.refCode, checker: s.checker, speed: s.speed };
  const r = spawnSync('python', ['-c', py], { input: JSON.stringify(spec), encoding: 'utf8' });
  if (r.status !== 0) { errors.push(`${s.id}: reference solution crashed: ${r.stderr.split('\n').filter(Boolean).slice(-1)[0]}`); continue; }
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  codeChecked++;
  if (out.bad.length) errors.push(`${s.id}: reference solution fails ${out.bad.length} test(s): ${JSON.stringify(out.bad[0]).slice(0, 200)}`);
  if (out.speedMs !== null && out.speedMs > out.budget * 0.5) warnings.push(`${s.id}: reference takes ${out.speedMs.toFixed(0)} ms of ${out.budget} ms budget natively (Pyodide is ~3-5x slower)`);
}

console.log(`days: ${DAYS.length}, concept cards: ${counts.info}, questions: ${counts.q} (code: ${counts.code}, sim goals: ${counts.goal})`);
console.log('questions per strand:', perStrand);
console.log(`code exercises checked with real Python: ${codeChecked}`);
if (warnings.length) console.log('warnings:\n  ' + warnings.join('\n  '));
if (errors.length) { console.log('ERRORS:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('validate: OK');
