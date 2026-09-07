// Renders every text field of every day through md() with KaTeX loaded, reports KaTeX parse errors
// and dumps every auto-detected formula (source → TeX) to tests/math_spans.txt for review.
// node tests/mathcheck.mjs
// node tests/mathcheck.mjs [day ...]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { loadDays, loadUtils, loadMathtext } from './_load.mjs';
const require = createRequire(import.meta.url);
globalThis.katex = require('../vendor/katex/katex.min.js');
const DAYS = await loadDays();
const { md } = await loadUtils();
const { autoMath } = await loadMathtext();

const spans = new Map(); // text -> { tex, count, where }
let errors = [], fields = 0, withMath = 0;
function check(text, where) {
  if (!text || typeof text !== 'string') return;
  fields++;
  const html = md(text);
  let found = false;
  autoMath(text.replace(/`[^`]*`/g, ''), (tex, src) => {
    found = true;
    const e = spans.get(src) || { tex, count: 0, where };
    e.count++; spans.set(src, e);
    const out = globalThis.katex.renderToString(tex, { throwOnError: false, output: 'html', strict: 'ignore' });
    if (out.includes('katex-error')) errors.push({ where, src, tex });
    return '';
  });
  if (found) withMath++;
}
for (const d of DAYS) {
  check(d.title, `d${d.num} title`); check(d.summary, `d${d.num} summary`); check(d.takeaway, `d${d.num} takeaway`);
  d.steps.forEach((s, i) => {
    const w = `d${d.num}#${i}`;
    check(s.title, w + ' title'); check(s.body, w + ' body'); check(s.after, w + ' after'); check(s.prompt, w + ' prompt'); check(s.explain, w + ' explain');
    if (s.options) s.options.forEach(o => check(o, w + ' opt'));
    if (s.terms) s.terms.forEach(([t, def]) => { check(t, w + ' term'); check(def, w + ' def'); });
    if (s.items) s.items.forEach(o => check(String(o), w + ' item'));
    if (s.pairs) s.pairs.forEach(p => p.forEach(o => check(String(o), w + ' pair')));
    if (s.tokens) s.tokens.forEach(o => check(String(o), w + ' token'));
  });
}
const lines = [...spans.entries()].sort((a, b) => b[1].count - a[1].count).map(([src, e]) => `${String(e.count).padStart(3)}  ${src}    ⟶   ${e.tex}    [${e.where}]`);
fs.writeFileSync('tests/math_spans.txt', lines.join('\n'));
console.log(`fields: ${fields}, fields with maths: ${withMath}, distinct formulas: ${spans.size}, katex errors: ${errors.length}`);
for (const e of errors.slice(0, 40)) console.log('ERR', e.where, JSON.stringify(e.src), '→', e.tex);
if (errors.length) process.exit(1);
