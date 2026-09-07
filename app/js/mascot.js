// "Chip" — an FPGA-chip mascot with eyes. Inline SVG, no assets.
import { el } from './utils.js';

const LINES = [
  'One lesson a day beats a binge a week.',
  'Read the words first. The rest follows.',
  'Every miss goes in the ledger. That is the point.',
  'Push the simulation around before you answer.',
  'Boundary cases first, then the happy path.',
  'Write the state table before the code.',
  'Define the empty case. Always.',
  'Slow and right beats fast and wrong. Then make it fast.',
  'The invariant is the proof. Say it out loud.',
  'Hold the payload while stalled.',
  'Check the widths before the arithmetic.',
  'Four goals, one session. Go.',
];
export function encouragement() { return LINES[Math.floor(Math.random() * LINES.length)]; }

// poses: idle | happy | sad | celebrate
export function mascot(pose = 'idle', size = 96) {
  const eyeL = pose === 'celebrate' ? 'M26 38 q7 -8 14 0' : null;
  const eyeR = pose === 'celebrate' ? 'M60 38 q7 -8 14 0' : null;
  const mouth = pose === 'happy' ? 'M36 58 q14 12 28 0' : pose === 'sad' ? 'M38 64 q12 -9 24 0' : pose === 'celebrate' ? 'M34 56 q16 18 32 0' : 'M40 60 q10 5 20 0';
  const body = '#58cc02', bodyDark = '#46a302', pin = '#c9a227';
  const pins = [];
  for (let i = 0; i < 5; i++) {
    const x = 22 + i * 14;
    pins.push(`<rect x="${x}" y="4" width="6" height="12" rx="2" fill="${pin}"/>`, `<rect x="${x}" y="84" width="6" height="12" rx="2" fill="${pin}"/>`);
    pins.push(`<rect x="4" y="${x}" width="12" height="6" rx="2" fill="${pin}"/>`, `<rect x="84" y="${x}" width="12" height="6" rx="2" fill="${pin}"/>`);
  }
  const eyes = `
    ${eyeL ? `<path d="${eyeL}" stroke="#1f3a06" stroke-width="4" fill="none" stroke-linecap="round"/>` : `<circle cx="36" cy="40" r="8" fill="#fff"/><circle cx="${pose === 'happy' ? 38 : 36}" cy="${pose === 'sad' ? 44 : 41}" r="4" fill="#1f3a06"/>`}
    ${eyeR ? `<path d="${eyeR}" stroke="#1f3a06" stroke-width="4" fill="none" stroke-linecap="round"/>` : `<circle cx="66" cy="40" r="8" fill="#fff"/><circle cx="${pose === 'happy' ? 68 : 66}" cy="${pose === 'sad' ? 44 : 41}" r="4" fill="#1f3a06"/>`}`;
  const extras = pose === 'celebrate' ? `<path d="M14 14 l4 -8 M84 12 l-4 -8 M8 30 l-6 -3 M92 30 l6 -3" stroke="#ffc800" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="22" r="2.5" fill="#ff4b4b"/><circle cx="80" cy="20" r="2.5" fill="#1cb0f6"/>`
    : pose === 'sad' ? `<path d="M27 27 l14 5 M73 27 l-14 5" stroke="#1f3a06" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="74" cy="54" rx="2.5" ry="4" fill="#1cb0f6"/>` : pose === 'happy' ? `<circle cx="26" cy="54" r="4" fill="#ff9aa2" opacity=".8"/><circle cx="76" cy="54" r="4" fill="#ff9aa2" opacity=".8"/>` : '';
  const svg = `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Chip the mascot" xmlns="http://www.w3.org/2000/svg">
    ${pins.join('')}
    <rect x="14" y="14" width="72" height="72" rx="16" fill="${body}"/>
    <rect x="20" y="20" width="60" height="60" rx="12" fill="${bodyDark}" opacity=".35"/>
    <rect x="24" y="24" width="52" height="52" rx="10" fill="${body}"/>
    ${eyes}
    <path d="${mouth}" stroke="#1f3a06" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${extras}
  </svg>`;
  return el('div', { class: `mascot mascot-${pose}`, html: svg });
}
