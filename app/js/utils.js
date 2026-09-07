import { autoMath, renderTex } from './mathtext.js';
// Small helpers shared by the app.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

export function svgEl(tag, attrs = {}, ...children) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Markdown-lite: **bold**, `code`, ```pre```, line breaks, bullet lines starting with "- ", tables (| a | b |), [[key]] boxes.
export function md(src) {
  if (!src) return '';
  let s = String(src);
  const hold = [];
  const keep = html => { hold.push(html); return `${hold.length - 1}`; };
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => keep(`<pre><code>${escapeHtml(code.replace(/^\n|\n$/g, ''))}</code></pre>`));
  s = s.replace(/`([^`\n]+)`/g, (_, code) => keep(`<code>${escapeHtml(code)}</code>`));
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(renderTex(t.trim(), true, t)));
  s = s.replace(/\$([^$\n]+?)\$/g, (_, t) => keep(renderTex(t.trim(), false, t)));
  s = autoMath(s, (tex, text) => keep(renderTex(tex, false, text)));
  s = escapeHtml(s);
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/\[\[([\s\S]+?)\]\]/g, '<div class="key">$1</div>');
  // tables
  s = s.replace(/((?:^\|.*\|\s*$\n?)+)/gm, block => {
    const rows = block.trim().split('\n').map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    if (rows.length < 2) return block;
    const head = rows[0], body = rows.slice(1).filter(r => !r.every(c => /^-+$/.test(c)));
    return `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  });
  // bullets
  s = s.replace(/((?:^- .*$\n?)+)/gm, block => `<ul>${block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('')}</ul>`);
  // paragraphs
  s = s.split(/\n{2,}/).map(p => {
    if (/^<(ul|table|div|pre)/.test(p.trim()) || /^\d+$/.test(p.trim())) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  s = s.replace(/(\d+)/g, (_, i) => hold[+i]);
  return s;
}

// Inline variant: same rendering without the wrapping <p>.
export function mdi(src) { return md(src).replace(/^<p>|<\/p>$/g, ''); }

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deterministic PRNG (mulberry32) so a given day's review picks are stable.
export function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function toast(msg, ms = 1800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}

export function normalizeText(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
}

export function fmtDate(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function addDays(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function bin(n, w) {
  return (n >>> 0).toString(2).padStart(w, '0').slice(-w);
}

// Tiny Web Audio sounds (no assets needed).
let actx = null;
export function sound(kind) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime;
    const notes = kind === 'ok' ? [[660, 0, .08], [880, .08, .14]]
      : kind === 'bad' ? [[220, 0, .12], [180, .1, .2]]
      : kind === 'done' ? [[523, 0, .1], [659, .1, .1], [784, .2, .1], [1046, .3, .28]]
      : [[520, 0, .05]];
    for (const [f, t, d] of notes) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.18, now + t + .01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
      o.connect(g).connect(actx.destination);
      o.start(now + t); o.stop(now + t + d + .02);
    }
  } catch (e) { /* audio unavailable */ }
}

export function confetti(n = 90) {
  const c = el('canvas', { class: 'confetti' });
  document.body.append(c);
  c.width = innerWidth; c.height = innerHeight;
  const ctx = c.getContext('2d');
  const cols = ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff', '#ff9600'];
  const ps = Array.from({ length: n }, () => ({
    x: Math.random() * c.width, y: -20 - Math.random() * 200, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4,
    r: 4 + Math.random() * 6, col: cols[Math.floor(Math.random() * cols.length)], rot: Math.random() * 6, vr: (Math.random() - .5) * .3
  }));
  let frames = 0;
  const step = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += .05;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6); ctx.restore();
    }
    if (++frames < 160) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}
