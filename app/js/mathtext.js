// Automatic maths typesetting for lesson text.
//
// Content is written in plain Unicode ("τ = L/R", "e^(−t/τ)", "√(δa² + δb²)", "V_th", "10⁻⁵").
// autoMath() finds formula-looking runs in prose, converts them to TeX and hands them to
// KaTeX (window.katex, vendored in vendor/katex). Explicit $…$ and $$…$$ are also supported
// by md() in utils.js. Nothing here touches code spans, identifiers like in_ready, bullets,
// table pipes or ordinary words.

const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', 'ⁿ': 'n', 'ⁱ': 'i', '⁺': '+' };
const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₋': '-', 'ₙ': 'n', 'ₓ': 'x', 'ₖ': 'k', 'ᵢ': 'i', '₊': '+' };
const GREEK = { 'π': '\\pi', 'τ': '\\tau', 'θ': '\\theta', 'σ': '\\sigma', 'ω': '\\omega', 'ζ': '\\zeta', 'δ': '\\delta', 'Δ': '\\Delta', 'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'λ': '\\lambda', 'μ': '\\mu', 'µ': '\\mu', 'φ': '\\varphi', 'ψ': '\\psi', 'ρ': '\\rho', 'ε': '\\varepsilon', 'η': '\\eta', 'Φ': '\\Phi', 'Σ': '\\Sigma' };
const SYM = { '√': null, '∫': '\\int', '∑': '\\sum', '∂': '\\partial', '∇': '\\nabla', '½': '\\tfrac{1}{2}', '¼': '\\tfrac{1}{4}', '¾': '\\tfrac{3}{4}', '∞': '\\infty', 'Ω': '\\Omega' };
const OPS = { '=': '=', '+': '+', '-': '-', '−': '-', '/': '/', '·': '\\cdot', '×': '\\times', '÷': '\\div', '≈': '\\approx', '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '±': '\\pm', '→': '\\to', '⇒': '\\Rightarrow', '⇔': '\\iff', '∥': '\\parallel', '<': '<', '>': '>', '%': '\\%', '∈': '\\in', '≪': '\\ll', '≫': '\\gg' };
const TRIGGER_OPS = new Set(['=', '+', '−', '/', '·', '×', '÷', '≈', '≤', '≥', '≠', '±', '→', '⇒', '⇔', '∥', '<', '>', '∈', '≪', '≫']);
const FUNCS = new Set(['log', 'ln', 'sin', 'cos', 'tan', 'exp', 'max', 'min', 'atan', 'acos', 'asin', 'lim', 'det', 'mod']);
const UNITS = new Set(['V', 'A', 'W', 'Hz', 's', 'ms', 'µs', 'μs', 'ns', 'ps', 'kΩ', 'MΩ', 'mΩ', 'GΩ', 'mA', 'µA', 'μA', 'nA', 'mV', 'µV', 'kV', 'mW', 'kW', 'MW', 'kWh', 'Wh', 'J', 'mJ', 'kJ', 'H', 'mH', 'µH', 'μH', 'F', 'µF', 'μF', 'nF', 'pF', 'mF', 'm', 'mm', 'cm', 'km', 'kg', 'g', 'N', 'dB', 'kHz', 'MHz', 'GHz', 'baud', 'rad', 'rpm', 'K', 'C', 'B', 'kB', 'MB', 'GB', 'h', 'hr', 'VAr', 'kVAr', 'VA', 'kVA', 'Nm', 'Ah', 'mAh', 'ppm']);
// Mixed-case electrical names that read as letter + subscript: Rin, Vout, Rth, Vcc …
const SUBNAME = /^(?:([RVICLPQZXGY])(in|out|th|oc|sc|max|min|pk|rms|cc|dd|ss|ee|DS|GS|CE|BE|sat|on|off|ref|eq|tot|avg|L|N|S|f|g|p|m|c|d|s)|([vif])(in|out|pk|rms|max|min))$/;
const TEXT_CAPS = new Set(['NOT', 'AND', 'OR', 'XOR', 'NOR', 'IF', 'THE', 'FOR', 'ANY', 'ALL', 'ONE', 'TWO', 'NO', 'YES', 'HH', 'HT', 'TH', 'TT']);
const SUBNAME_SKIP = new Set(['In', 'Is', 'It', 'If', 'Vs', 'Ion', 'Pin', 'Pon', 'Lon', 'Con', 'Cop', 'Cod', 'Rod', 'Ref', 'Xon', 'Zip', 'Ip', 'Id', 'Im', 'Ic', 'Vc', 'Rs', 'Ls', 'Ps', 'Cs', 'Is', 'Vf', 'Cd', 'Cm', 'Lm', 'Pm', 'Pd', 'Pg', 'Lg', 'Rg', 'Ig', 'Zs']);
const STOP = new Set(['a', 'an', 'as', 'at', 'in', 'of', 'on', 'or', 'to', 'is', 'by', 'if', 'so', 'no', 'it', 'up', 'we', 'do', 'be', 'the', 'and', 'for', 'per', 'via', 'not', 'but', 'one', 'two', 'ten', 'any', 'all', 'its', 'has', 'had', 'are', 'was', 'can', 'did', 'get', 'let', 'out', 'off', 'yet', 'you', 'may', 'use', 'see', 'say', 'set', 'run', 'add', 'sum', 'vs', 'eg', 'ie', 'am', 'pm', 'he', 'she', 'his', 'her', 'who', 'why', 'how', 'now', 'new', 'old', 'big', 'low', 'top', 'end', 'try', 'yes', 'nor', 'own', 'few', 'far', 'too', 'way', 'day', 'bit', 'go', 'me', 'my', 'us', 'ok', 'ago']);
const EXCEPT = new Set(['I/O', 'S/A', 'R/W', 'H/A', 'H/S', 'A/D', 'D/A', 'x/y', 'yes/no', 'on/off', 'A/B', 'N/A']);
const CODE_OPS = ['==', '!=', '//', '||', '&&', '+=', '-=', '<=', '>=', '->', '=>', '**'];

const isWs = c => c === ' ' || c === '\t';
const isDigit = c => c >= '0' && c <= '9';
const isAlpha = c => /[A-Za-z]/.test(c);

function matchBracket(s, i) {
  const open = s[i], close = open === '(' ? ')' : open === '{' ? '}' : ']';
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === open) d++;
    else if (s[j] === close) { d--; if (d === 0) return j; }
    else if (s[j] === '\n') return -1;
  }
  return -1;
}

// ---- tokeniser --------------------------------------------------------------------------
function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const start = i;
    if (c === '') { const j = s.indexOf('', i); const end = j < 0 ? s.length : j + 1; out.push({ t: 'PH', v: s.slice(i, end), start }); i = end; continue; }
    if (c === '\n') { out.push({ t: 'NL', v: c, start }); i++; continue; }
    if (isWs(c)) { let j = i; while (j < s.length && isWs(s[j])) j++; out.push({ t: 'WS', v: s.slice(i, j), start }); i = j; continue; }
    if (c === '…' || s.startsWith('...', i)) { const L = c === '…' ? 1 : 3; out.push({ t: 'DOTS', v: s.slice(i, i + L), start }); i += L; continue; }
    const two = s.slice(i, i + 2);
    if (CODE_OPS.includes(two)) { out.push({ t: 'OTHER', v: two, start }); i += 2; continue; }
    if (isDigit(c)) {
      const m = /^\d+(?:,\d{3})*(?:\.\d+)?/.exec(s.slice(i));
      let j = i + m[0].length;
      const tok = { t: 'NUM', v: m[0], start, att: [] };
      j = attachments(s, j, tok);
      if (tok.ident) { out.push({ t: 'OTHER', v: s.slice(i, j), start }); i = j; continue; }
      out.push(tok); i = j; continue;
    }
    if (isAlpha(c) || ((c === 'µ' || c === 'μ') && isAlpha(s[i + 1] || ''))) {
      let j = i; if (!isAlpha(c)) j++;
      while (j < s.length && isAlpha(s[j])) j++;
      if (s[j] === 'Ω') j++;
      const v = s.slice(i, j);
      const tok = { t: 'WORD', v, start, att: [] };
      if (v.length === 1 && isDigit(s[j] || '')) { // V1, R2, x0 (but not unit codes like H02)
        let k = j; while (k < s.length && isDigit(s[k])) k++;
        const digits = s.slice(j, k);
        if (!isAlpha(s[k] || '') && digits.length <= 2 && !(digits.length === 2 && digits[0] === '0')) { tok.att.push({ k: 'sub', v: digits }); j = k; }
        else { out.push({ t: 'OTHER', v: s.slice(i, k), start }); i = k; continue; }
      }
      j = attachments(s, j, tok);
      // identifiers: in_ready, lower_bound, clock_hz, source_id → code, not maths
      const subs = tok.att.filter(a => a.k === 'sub' && !a.group && a.ascii);
      if (tok.ident || (subs.length && !FUNCS.has(v) && (v.length >= 2 && !SUBNAME.test(v) || subs.some(a => /^[A-Za-z]{4,}/.test(a.v))))) { out.push({ t: 'OTHER', v: s.slice(i, j), start }); i = j; continue; }
      out.push(tok); i = j; continue;
    }
    if (GREEK[c]) { const tok = { t: 'GREEK', v: c, start, att: [] }; const j = attachments(s, i + 1, tok); out.push(tok); i = j; continue; }
    if (c in SYM) { const tok = { t: 'SYM', v: c, start, att: [] }; const j = attachments(s, i + 1, tok); out.push(tok); i = j; continue; }
    if (c in OPS) { out.push({ t: 'OP', v: c, start }); i++; continue; }
    if (c === '(' || c === ')' || c === '{' || c === '}') { const tok = { t: 'BR', v: c, start, att: [] }; let j = i + 1; if (c === ')' || c === '}') j = attachments(s, j, tok); out.push(tok); i = j; continue; }
    if (c === '|') { out.push({ t: 'ABS', v: c, start }); i++; continue; }
    if (c === '′' || c === '°') { out.push({ t: 'POST', v: c, start }); i++; continue; }
    if (c === '!' && out.length && (out[out.length - 1].t === 'NUM' || out[out.length - 1].t === 'WORD' || out[out.length - 1].v === ')') && !/[A-Za-z!=?]/.test(s[i + 1] || ' ')) { out.push({ t: 'POST', v: '!', start }); i++; continue; }
    if (c === ',') { out.push({ t: 'COMMA', v: c, start }); i++; continue; }
    out.push({ t: 'OTHER', v: c, start }); i++;
  }
  return out;
}

// Parse ^…, _…, and Unicode sub/superscripts directly after a token. Returns the new index.
function attachments(s, j, tok) {
  for (;;) {
    const c = s[j];
    if (c && SUP[c] !== undefined) { let k = j; let v = ''; while (k < s.length && SUP[s[k]] !== undefined) v += SUP[s[k++]]; tok.att.push({ k: 'sup', v }); j = k; continue; }
    if (c && SUB[c] !== undefined) { let k = j; let v = ''; while (k < s.length && SUB[s[k]] !== undefined) v += SUB[s[k++]]; tok.att.push({ k: 'sub', v }); j = k; continue; }
    if (c === '^' || c === '_') {
      const kind = c === '^' ? 'sup' : 'sub';
      const n = s[j + 1];
      if (n === '(' || n === '{') { const e = matchBracket(s, j + 1); if (e < 0) return j; tok.att.push({ k: kind, v: s.slice(j + 2, e), group: true }); j = e + 1; continue; }
      const m = /^(?:[A-Za-z0-9]+(?:\([A-Za-z0-9]+\))?|[+\-−])/.exec(s.slice(j + 1));
      if (!m) { if (kind === 'sub') tok.ident = true; return j; }
      let v = m[0];
      // a_yb_z: letters followed by another _ or ^ are one-letter subscript + next variable
      if (kind === 'sub' && /^[A-Za-z]{2,}$/.test(v) && (/[_^]/.test(s[j + 1 + v.length] || '') || SUB[s[j + 1 + v.length]] !== undefined || SUP[s[j + 1 + v.length]] !== undefined) && !/^(th|oc|sc|on|off|max|min|rms|avg|pk|in|out|DS|GS|CE|BE|ref|sat|tot|eq)$/.test(v)) v = v[0];
      tok.att.push({ k: kind, v, ascii: true }); j += 1 + v.length; continue;
    }
    return j;
  }
}

// ---- span assembly ----------------------------------------------------------------------
function wordMathy(tok) {
  const v = tok.v;
  if (tok.att.length) return true;
  if (FUNCS.has(v) || UNITS.has(v)) return true;
  if (v.length === 1) return true;
  if (STOP.has(v.toLowerCase()) && v === v.toLowerCase()) return false;
  if (TEXT_CAPS.has(v)) return false;
  if (/^[A-Z]+$/.test(v) && v.length <= 3) return true;      // LC, RC, RLC: products of variables
  if (/^d[A-Za-z]$/.test(v)) return true;                     // dy, dt, di
  if (SUBNAME.test(v) && !SUBNAME_SKIP.has(v)) return true;   // Rin, Vout, Rth
  return false;
}
function isTrigger(tok, prev, next, coreLen) {
  if (tok.t === 'OP') {
    if (TRIGGER_OPS.has(tok.v)) return true;
    if (tok.v === '-') return !!(tok.spaced && prev && next);
    return false;
  }
  if (tok.t === 'GREEK' || tok.t === 'SYM' || tok.t === 'POST') return true;
  if ((tok.t === 'NUM' || tok.t === 'BR') && tok.att && tok.att.length) return true;
  if (tok.t === 'WORD') {
    if (tok.att.length) return true;
    if (/Ω$/.test(tok.v)) return true;
    if (FUNCS.has(tok.v)) return coreLen > 1;
  }
  return false;
}

export function autoMath(text, emit) {
  if (!text || !/[=^_√²³⁰¹⁴-⁹₀-₉πτθσωζδΩµμ∫∑∂∇½×·÷≈≤≥≠±→∞°′∥]/.test(text)) return text;
  const toks = tokenize(text);
  let out = '';
  let span = [];
  let depth = 0;
  const flush = () => { if (span.length) out += finalize(span, emit); span = []; depth = 0; };
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i], prev = toks[i - 1], next = toks[i + 1];
    let mathy;
    switch (tok.t) {
      case 'PH': case 'NL': case 'OTHER': mathy = false; break;
      case 'WS': mathy = span.length > 0; break;
      case 'NUM': case 'GREEK': case 'SYM': case 'POST': mathy = true; break;
      case 'DOTS': mathy = span.length > 0 && span.some(t => t.t !== 'WS'); break;
      case 'WORD': mathy = wordMathy(tok); break;
      case 'OP':
        mathy = true;
        if (tok.v === '-') {
          const lineStart = !prev || prev.t === 'NL' || (prev.t === 'WS' && (!toks[i - 2] || toks[i - 2].t === 'NL'));
          if (lineStart && next && next.t === 'WS') mathy = false;              // markdown bullet
          tok.spaced = !!(prev && prev.t === 'WS' && next && next.t === 'WS');
          const unary = !prev || prev.t === 'WS' || prev.t === 'OP' || (prev.t === 'BR' && prev.v === '(');
          if (!tok.spaced && !unary) mathy = false;                              // op-amp, 32-bit, two-sum
        }
        break;
      case 'BR': mathy = (tok.v === '(' || tok.v === '{') ? true : depth > 0; break;
      case 'ABS': {
        const ls = !prev || prev.t === 'WS' || prev.t === 'NL', rs = !next || next.t === 'WS' || next.t === 'NL';
        mathy = !(ls && rs) && !!prev && prev.t !== 'NL';
        break; }
      case 'COMMA': mathy = depth > 0; break;
      default: mathy = false;
    }
    if (!mathy) { flush(); out += tok.v; continue; }
    if (tok.t === 'BR') { if (tok.v === '(' || tok.v === '{') depth++; else depth--; }
    span.push(tok);
  }
  flush();
  return out;
}

function finalize(span, emit) {
  const raw = span.map(tokenText).join('');
  let toks = span.slice();
  const trimEnds = () => {
    let changed = true;
    while (changed && toks.length) {
      changed = false;
      const f = toks[0], l = toks[toks.length - 1];
      if (f.t === 'WS' || f.t === 'COMMA' || f.t === 'ABS' && toks.filter(t => t.t === 'ABS').length % 2) { toks.shift(); changed = true; continue; }
      if (l.t === 'WS' || l.t === 'COMMA' || l.t === 'DOTS' || (l.t === 'OP' && l.v !== '%') || l.t === 'ABS' && toks.filter(t => t.t === 'ABS').length % 2) { toks.pop(); changed = true; continue; }
      if (f.t === 'OP' && !((f.v === '-' || f.v === '−') && toks[1] && toks[1].t !== 'WS')) { toks.shift(); changed = true; continue; }
      if (f.t === 'WORD' && f.v === 'a' && !f.att.length && toks[1] && toks[1].t === 'WS' && toks[2] && toks[2].t !== 'OP') { toks.shift(); changed = true; continue; }
      if (l.t === 'WORD' && l.v === 'a' && !l.att.length && toks.length > 1 && toks[toks.length - 2].t === 'WS') { toks.pop(); changed = true; continue; }
    }
  };
  trimEnds();
  for (let guard = 0; guard < 60; guard++) {
    let d = 0, bad = false;
    for (const t of toks) { if (t.t === 'BR' && (t.v === '(' || t.v === '{')) d++; else if (t.t === 'BR') { d--; if (d < 0) { bad = true; break; } } }
    if (!bad && d === 0) break;
    if (bad) toks.shift(); else toks.pop();
    trimEnds();
  }
  const core = toks.filter(t => t.t !== 'WS');
  const texText = toks.map(tokenText).join('');
  const ok = core.length > 0 && !EXCEPT.has(texText)
    && core.some((t, i) => isTrigger(t, core[i - 1], core[i + 1], core.length))
    && !(core.length === 1 && core[0].t === 'SYM' && ['∫', '∑', '½', '¼', '¾', '√', '∂', '∇'].includes(core[0].v))
    && !(core.length === 1 && (core[0].t === 'OP' || core[0].t === 'ABS' || core[0].t === 'POST'));
  if (!ok) return raw;
  const tex = toTex(toks);
  const startIdx = span.indexOf(toks[0]), endIdx = span.indexOf(toks[toks.length - 1]);
  const before = span.slice(0, startIdx).map(tokenText).join(''), after = span.slice(endIdx + 1).map(tokenText).join('');
  return before + emit(tex, texText) + after;
}

const SUPBACK = Object.fromEntries(Object.entries(SUP).map(([k, v]) => [v, k]));
const SUBBACK = Object.fromEntries(Object.entries(SUB).map(([k, v]) => [v, k]));
function tokenText(t) {
  let s = t.v;
  if (t.att) for (const a of t.att) {
    if (a.group) s += (a.k === 'sup' ? '^(' : '_{') + a.v + (a.k === 'sup' ? ')' : '}');
    else if (a.uni !== false && [...a.v].every(ch => (a.k === 'sup' ? SUPBACK : SUBBACK)[ch])) s += [...a.v].map(ch => (a.k === 'sup' ? SUPBACK : SUBBACK)[ch]).join('');
    else s += (a.k === 'sup' ? '^' : '_') + a.v;
  }
  return s;
}

// ---- TeX conversion ---------------------------------------------------------------------
function unitTex(v) {
  const s = v.replace(/^([µμ])/, '\\mu ').replace(/Ω$/, '\\Omega');
  return `\\mathrm{${s}}`;
}
function attTex(att) {
  return att.map(a => {
    let inner;
    if (a.group) inner = texOf(a.v);
    else if (/^[+\-−]$/.test(a.v)) inner = a.v === '−' ? '-' : a.v;
    else if (/^-?\d+$/.test(a.v)) inner = a.v;
    else if (/^[A-Za-z]$/.test(a.v)) inner = a.v;
    else if (/^[A-Z]{1,3}$/.test(a.v)) inner = a.v;
    else if (/^[A-Za-z0-9()]+$/.test(a.v)) inner = `\\mathrm{${a.v}}`;
    else inner = texOf(a.v);
    return (a.k === 'sup' ? '^' : '_') + `{${inner}}`;
  }).join('');
}
function texOf(str) { return toTex(tokenize(str)); }

function toTex(toks) {
  let out = '';
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prevCore = [...toks.slice(0, i)].reverse().find(x => x.t !== 'WS');
    switch (t.t) {
      case 'WS': {
        const nextCore = toks.slice(i + 1).find(x => x.t !== 'WS');
        const varLike = x => x && (x.t === 'WORD' && !FUNCS.has(x.v) && !UNITS.has(x.v) || x.t === 'GREEK' || x.t === 'NUM' || (x.t === 'BR' && x.v === ')'));
        const nextVar = x => x && (x.t === 'WORD' && !FUNCS.has(x.v) && !UNITS.has(x.v) || x.t === 'GREEK' || (x.t === 'BR' && x.v === '('));
        out += (varLike(prevCore) && nextVar(nextCore)) ? '\\, ' : ' '; break; }
      case 'DOTS': out += ' \\ldots '; break;
      case 'NUM': out += t.v.replace(/,/g, '{,}') + attTex(t.att); break;
      case 'WORD': {
        const v = t.v;
        let base;
        const afterNum = prevCore && (prevCore.t === 'NUM' || (prevCore.t === 'OP' && prevCore.v === '%'));
        if (FUNCS.has(v)) base = '\\' + (v === 'atan' ? 'arctan' : v === 'acos' ? 'arccos' : v === 'asin' ? 'arcsin' : v === 'mod' ? 'bmod' : v);
        else if (!t.att.length && (UNITS.has(v) || /Ω$/.test(v)) && (afterNum || v.length > 1)) base = (afterNum ? '\\,' : '') + unitTex(v);
        else if (v.length === 1) base = v;
        else if (/^d[A-Za-z]$/.test(v)) base = v;
        else if (/^[A-Z]+$/.test(v) && v.length <= 3) base = v;
        else if (SUBNAME.test(v)) { const m = SUBNAME.exec(v); const L = m[1] || m[3], sfx = m[2] || m[4]; base = `${L}_{${sfx.length === 1 ? sfx : `\\mathrm{${sfx}}`}}`; }
        else base = `\\mathrm{${v}}`;
        out += base + attTex(t.att); break;
      }
      case 'GREEK': out += GREEK[t.v] + attTex(t.att); break;
      case 'SYM': {
        if (t.v === '√') {
          const n = toks[i + 1] && toks[i + 1].t === 'WS' ? toks[i + 2] : toks[i + 1];
          const ni = toks.indexOf(n);
          if (n && n.t === 'BR' && (n.v === '(' || n.v === '{')) {
            let d = 0, j = ni;
            for (; j < toks.length; j++) { if (toks[j].t === 'BR' && (toks[j].v === '(' || toks[j].v === '{')) d++; else if (toks[j].t === 'BR') { d--; if (d === 0) break; } }
            out += `\\sqrt{${toTex(toks.slice(ni + 1, j))}}` + attTex((toks[j] && toks[j].att) || []);
            i = j; break;
          }
          if (n && (n.t === 'NUM' || n.t === 'WORD' || n.t === 'GREEK')) { out += `\\sqrt{${toTex([n])}}`; i = ni; break; }
          out += '\\surd'; break;
        }
        if (t.v === 'Ω') { out += (prevCore && prevCore.t === 'NUM' ? '\\,' : '') + '\\Omega' + attTex(t.att); break; }
        out += SYM[t.v] + attTex(t.att) + (t.v === '∫' || t.v === '∑' ? ' ' : ''); break;
      }
      case 'OP': {
        if (t.v === '%') { out += '\\%'; break; }
        if (t.v === '/') { out = out.replace(/\s+$/, '') + '/'; if (toks[i + 1] && toks[i + 1].t === 'WS') i++; break; }
        const unary = (t.v === '-' || t.v === '−' || t.v === '+') && (!prevCore || prevCore.t === 'OP' || (prevCore.t === 'BR' && prevCore.v === '(') || prevCore.t === 'COMMA');
        out += unary ? OPS[t.v] : ' ' + OPS[t.v] + ' '; break;
      }
      case 'BR': out += (t.v === '{' ? '\\{' : t.v === '}' ? '\\}' : t.v) + attTex(t.att || []); break;
      case 'ABS': out += '|'; break;
      case 'POST': out += t.v === '′' ? "'" : t.v === '°' ? '^{\\circ}' : '!'; break;
      case 'COMMA': out += ',\\,'; break;
      default: out += t.v;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

// Render TeX with KaTeX when it is loaded; otherwise a styled fallback of the original text.
export function renderTex(tex, display = false, fallback = '') {
  const K = typeof window !== 'undefined' ? window.katex : (typeof globalThis !== 'undefined' ? globalThis.katex : null);
  if (K) {
    try { return K.renderToString(tex, { throwOnError: false, displayMode: display, output: 'html', strict: 'ignore' }); } catch (e) { /* fall through */ }
  }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<span class="tex-fallback">${esc(fallback || tex)}</span>`;
}
