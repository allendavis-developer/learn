// Progress + profile screenshots with seeded progress. node tests/shots5.mjs
import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const OUT = 'C:/dev/study/app/shots';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1.5 } });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
page.on('pageerror', e => console.log('PAGEERROR', String(e)));
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  const S = window.__app.S; S.settings.unlockAll = true; S.settings.fakeToday = '2026-09-20'; S.xp = 2100; S.gems = 260; S.streak = 14; S.lastActive = '2026-09-20'; S.longestStreak = 14;
  S.days = {}; S.dayStrand = {}; S.qfirst = {}; S.dayFirst = {}; S.seen = {};
  const DAYS = window.__app.DAYS;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const goal = s => s === 'A' ? 'S' : s;
  for (let n = 1; n <= 14; n++) {
    const d = DAYS[n - 1]; const date = `2026-09-${String(5 + n).padStart(2, '0')}`;
    let score = 0, total = 0;
    S.dayStrand[n] = {}; S.dayFirst[date] = {}; S.activeDays = S.activeDays || {}; S.activeDays[date] = 150;
    for (const st of d.steps) {
      if (st.type === 'info') continue;
      const g = goal(st.strand); const p = { H: 0.9, S: 0.85, M: 0.7, E: 0.95 }[g] || 0.8;
      const ok = rnd() < p; total++; if (ok) score++;
      S.qfirst[st.id] = ok ? 1 : 0;
      S.seen[st.id] = ok ? { ok: 1, bad: 0 } : { ok: 0, bad: 1 };
      const ds = S.dayStrand[n][g] = S.dayStrand[n][g] || { ok: 0, bad: 0, firstOk: 0, firstN: 0 };
      ds.firstN++; if (ok) { ds.ok++; ds.firstOk++; } else ds.bad++;
      const f = S.dayFirst[date][g] = S.dayFirst[date][g] || { ok: 0, n: 0 }; f.n++; if (ok) f.ok++;
    }
    S.days[n] = { best: { score, total, xp: 150 }, attempts: 1, crowns: score === total ? 3 : score / total >= .8 ? 2 : 1 };
  }
  localStorage.setItem('fpgalingo.v1', JSON.stringify(S));
});
await page.goto('http://localhost:8765/#progress', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' }); await wait(300);
await page.screenshot({ path: `${OUT}/p-progress.png`, fullPage: true });
await page.goto('http://localhost:8765/#profile', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' }); await wait(300);
await page.screenshot({ path: `${OUT}/p-profile.png` });
await page.goto('http://localhost:8765/#practice', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' }); await wait(300);
await page.screenshot({ path: `${OUT}/p-practice.png` });
await browser.close();
console.log('done');
