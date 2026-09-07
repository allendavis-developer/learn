// Maths answer input: a small expression parser (value + TeX preview) and an on-screen maths keyboard.
// Accepts: 1/36, 3/8 + 1/4, sqrt(2)/2, √2, 2^10, 3*pi, 4×10^-3, 12.5%, (1+2)/3, 0b1010, 0xff.
import { el } from './utils.js';
import { renderTex } from './mathtext.js';

// ---- parser -----------------------------------------------------------------------------
export function parseMathExpr(src) {
  let s = String(src).trim().replace(/,/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt');
  if (!s) return null;
  if (/^-?0b[01]+$/i.test(s)) { const v = parseInt(s.replace(/^-?0b/i, ''), 2) * (s.startsWith('-') ? -1 : 1); return { value: v, tex: s }; }
  if (/^-?0x[0-9a-f]+$/i.test(s)) { const v = parseInt(s.replace(/^-?0x/i, ''), 16) * (s.startsWith('-') ? -1 : 1); return { value: v, tex: s }; }
  let i = 0;
  const peek = () => s[i];
  const eat = c => { if (s[i] === c) { i++; return true; } return false; };
  const ws = () => { while (s[i] === ' ') i++; };
  function number() {
    const m = /^\d+(?:\.\d+)?(?:[eE][-+]?\d+)?|^\.\d+/.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    const v = parseFloat(m[0]);
    const tex = /[eE]/.test(m[0]) ? m[0].replace(/[eE]([-+]?\d+)/, '\\times 10^{$1}') : m[0];
    return { value: v, tex, simple: true };
  }
  function base() {
    ws();
    if (eat('-')) { const b = factor(); if (!b) return null; return { value: -b.value, tex: '-' + b.tex, simple: b.simple }; }
    if (eat('+')) return factor();
    if (eat('(')) { const e = expr(); ws(); if (!e || !eat(')')) return null; return { value: e.value, tex: `\\left(${e.tex}\\right)`, simple: false, paren: true, inner: e }; }
    if (s.startsWith('sqrt', i)) { i += 4; ws(); let a; if (eat('(')) { a = expr(); ws(); if (!a || !eat(')')) return null; } else { a = base(); if (!a) return null; } return { value: Math.sqrt(a.value), tex: `\\sqrt{${a.inner ? a.inner.tex : a.tex}}`, simple: true }; }
    if (s.startsWith('pi', i)) { i += 2; return { value: Math.PI, tex: '\\pi', simple: true }; }
    if (s[i] === 'e' && !/[0-9.]/.test(s[i - 1] || '') && !/[a-z]/i.test(s[i + 1] || '')) { i++; return { value: Math.E, tex: 'e', simple: true }; }
    return number();
  }
  function factor() {
    let b = base(); if (!b) return null;
    ws();
    if (eat('^')) { const ex = factor(); if (!ex) return null; const bt = b.paren ? b.tex : b.simple ? b.tex : `\\left(${b.tex}\\right)`; return { value: Math.pow(b.value, ex.value), tex: `${bt}^{${ex.inner ? ex.inner.tex : ex.tex}}`, simple: true }; }
    if (eat('!')) { const n = b.value; if (!Number.isInteger(n) || n < 0 || n > 170) return null; let f = 1; for (let k = 2; k <= n; k++) f *= k; return { value: f, tex: `${b.tex}!`, simple: true }; }
    return b;
  }
  function term() {
    let a = factor(); if (!a) return null;
    for (;;) {
      ws();
      if (eat('*')) { const b = factor(); if (!b) return null; a = { value: a.value * b.value, tex: `${a.tex} \\times ${b.tex}`, simple: false }; }
      else if (eat('/')) { const b = factor(); if (!b) return null; a = { value: a.value / b.value, tex: `\\frac{${a.inner ? a.inner.tex : a.tex}}{${b.inner ? b.inner.tex : b.tex}}`, simple: true }; }
      else if (peek() === '(' || s.startsWith('sqrt', i) || s.startsWith('pi', i)) { const b = factor(); if (!b) return null; a = { value: a.value * b.value, tex: `${a.tex}${b.tex}`, simple: false }; }
      else break;
    }
    return a;
  }
  function expr() {
    let a = term(); if (!a) return null;
    for (;;) {
      ws();
      if (eat('+')) { const b = term(); if (!b) return null; a = { value: a.value + b.value, tex: `${a.tex} + ${b.tex}`, simple: false }; }
      else if (eat('-')) { const b = term(); if (!b) return null; a = { value: a.value - b.value, tex: `${a.tex} - ${b.tex}`, simple: false }; }
      else break;
    }
    return a;
  }
  const r = expr();
  ws();
  if (!r) return null;
  if (eat('%')) { r.value /= 100; r.tex += '\\%'; ws(); }
  if (i !== s.length) return null;
  if (!Number.isFinite(r.value)) return null;
  return { value: r.value, tex: r.tex };
}

// ---- keyboard ---------------------------------------------------------------------------
const KEYS = [
  ['a/b', '/', 'fraction: type the top, press this, type the bottom'],
  ['√', 'sqrt(', 'square root'],
  ['x²', '^2', 'square'],
  ['xʸ', '^', 'power'],
  ['π', 'pi', 'pi'],
  ['×', '*', 'multiply'],
  ['÷', '/', 'divide'],
  ['−', '-', 'minus'],
  ['( )', '()', 'brackets'],
  ['×10ⁿ', '*10^', 'times ten to the power'],
  ['%', '%', 'percent'],
  ['n!', '!', 'factorial'],
];

export function mathKeyboard(inp, onChange) {
  const preview = el('div', { class: 'math-preview' });
  const keys = el('div', { class: 'math-keys' }, ...KEYS.map(([label, ins, title]) => el('button', { type: 'button', class: 'mkey', title, tabindex: -1,
    onMouseDown: e => e.preventDefault(),
    onClick: () => insert(inp, ins) }, label)), el('span', { class: 'mkey-hint' }, 'or just type: 1/36, sqrt(2)/2, 2^10'));
  function insert(inp, text) {
    const a = inp.selectionStart ?? inp.value.length, b = inp.selectionEnd ?? a;
    const sel = inp.value.slice(a, b);
    let out, caret;
    if (text === '/' && sel) { out = `(${sel})/`; caret = a + out.length; }
    else if (text === 'sqrt(' && sel) { out = `sqrt(${sel})`; caret = a + out.length; }
    else if (text === '()') { out = sel ? `(${sel})` : '()'; caret = a + (sel ? out.length : 1); }
    else { out = text; caret = a + out.length; }
    inp.value = inp.value.slice(0, a) + out + inp.value.slice(b);
    inp.focus(); inp.setSelectionRange(caret, caret);
    update(); onChange && onChange();
  }
  function update() {
    const raw = inp.value.trim();
    if (!raw) { preview.innerHTML = ''; preview.hidden = true; return; }
    const r = parseMathExpr(raw);
    preview.hidden = false;
    if (!r) { preview.innerHTML = '<span class="mp-bad">not a complete expression yet</span>'; return; }
    const val = Math.abs(r.value) >= 1e6 || (Math.abs(r.value) < 1e-4 && r.value !== 0) ? r.value.toExponential(4) : String(+r.value.toPrecision(6));
    const simpleNumber = /^-?\d+(?:\.\d+)?$/.test(raw);
    preview.innerHTML = simpleNumber ? '' : `${renderTex(r.tex)} <span class="mp-eq">= ${val}</span>`;
    if (simpleNumber) preview.hidden = true;
  }
  inp.addEventListener('input', update);
  const wrap = el('div', { class: 'math-input-extras' }, preview, keys);
  update();
  return wrap;
}
