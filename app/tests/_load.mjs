// Shared test loader. `node tests/validate.mjs 3 4` loads only days 3 and 4 (each day file is imported
// directly, so one broken day file does not stop the others being checked); no args loads all 30 through
// curriculum.js exactly as the app does.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = globalThis;
globalThis.document = { querySelector: () => null, createElement: () => ({ style: {}, append() {}, setAttribute() {}, addEventListener() {} }), createElementNS: () => ({ setAttribute() {}, append() {}, addEventListener() {} }) };

const root = path.resolve('js');
const url = f => pathToFileURL(path.join(root, f)).href;

export async function loadDays(argv = process.argv.slice(2)) {
  const nums = argv.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 30);
  const { estimateMinutes } = await import(url('lib.js'));
  if (!nums.length) {
    const { DAYS } = await import(url('curriculum.js'));
    return DAYS;
  }
  const days = [];
  for (const n of nums) {
    const m = await import(url(`days/d${String(n).padStart(2, '0')}.js`));
    const d = m.default; d.num = n; d.kind = d.kind || 'lesson'; d.minutes = estimateMinutes(d);
    days.push(d);
  }
  return days;
}

export async function loadWidgets() {
  const { WIDGETS } = await import(url('widgets.js'));
  for (const f of ['widgets_eee.js', 'widgets_eee2.js', 'widgets_more.js', 'widgets_course.js', 'widgets_eee3.js', 'widgets_g1.js', 'widgets_g2.js', 'widgets_g3.js', 'widgets_g4.js', 'widgets_g5.js', 'widgets_g6.js', 'widgets_g7.js', 'widgets_g8.js']) await import(url(f));
  return WIDGETS;
}

export async function loadLib() { return import(url('lib.js')); }
export async function loadUtils() { return import(url('utils.js')); }
export async function loadMathtext() { return import(url('mathtext.js')); }
