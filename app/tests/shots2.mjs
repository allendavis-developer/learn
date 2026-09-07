// Widget close-ups + populated home. node tests/shots2.mjs
import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const OUT = 'C:/dev/study/app/shots';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 430, height: 900, deviceScaleFactor: 2 } });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  const S = window.__app.S; S.settings.unlockAll = false; S.settings.fakeToday = '2026-09-11'; S.xp = 640; S.gems = 130; S.streak = 4; S.lastActive = '2026-09-11'; S.longestStreak = 4;
  S.days = { 1: { best: { score: 14, total: 14, xp: 160 }, attempts: 1, crowns: 3 }, 2: { best: { score: 13, total: 15, xp: 140 }, attempts: 1, crowns: 2 }, 3: { best: { score: 15, total: 15, xp: 170 }, attempts: 2, crowns: 3 }, 4: { best: { score: 12, total: 15, xp: 120 }, attempts: 1, crowns: 2 } };
  S.activeDays = { '2026-09-08': 160, '2026-09-09': 140, '2026-09-10': 170, '2026-09-11': 30 };
  localStorage.setItem('fpgalingo.v1', JSON.stringify(S));
});
await page.reload({ waitUntil: 'networkidle0' }); await wait(400);
await page.screenshot({ path: `${OUT}/1-home.png` });
await page.evaluate(() => window.scrollTo(0, 700)); await wait(200);
await page.screenshot({ path: `${OUT}/1b-home-path.png` });
// widget close-ups: open a day, walk to step index, scroll widget into view
async function shot(day, stepIdx, clicks, name) {
  await page.goto(`http://localhost:8765/#day/${day}`, { waitUntil: 'networkidle0' });
  await page.click('#beginBtn'); await wait(200);
  for (let i = 0; i < stepIdx; i++) { await page.evaluate(() => window.__lesson.next()); await wait(120); }
  for (const c of clicks) { await page.evaluate(sel => { const n = document.querySelectorAll(sel); n[n.length - 1] && n[0].click(); }, c); await wait(80); }
  await page.evaluate(() => { const w = document.querySelector('.widget'); w && w.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }); await wait(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
await page.evaluate(() => { const S = window.__app.S; S.settings.unlockAll = true; localStorage.setItem('fpgalingo.v1', JSON.stringify(S)); });
await shot(4, 3, ['.widget .bit:nth-child(3)'], 'w-adder');
await shot(2, 5, [], 'w-wheel');
await shot(15, 1, ['.widget .wbtn', '.widget .wbtn', '.widget .wbtn'], 'w-registers');
await shot(4, 10, ['.widget .wbtn'], 'w-dice-conditional');
await shot(5, 5, ['.widget .wbtn', '.widget .wbtn', '.widget .wbtn'], 'w-aliasing');
await shot(16, 1, ['.widget .wbtn', '.widget .wbtn:nth-child(3)'], 'w-fsm');
await shot(10, 14, [], 'w-rc');
await shot(9, 6, ['.widget .bit:nth-child(13)'], 'w-bytes');
await shot(1, 12, [], 'w-ohm');
await shot(6, 6, ['.widget .wbtn', '.widget .wbtn', '.widget .wbtn'], 'w-invariant');
await shot(15, 6, ['.widget .wbtn', '.widget .wbtn', '.widget .wbtn'], 'w-terminal');
await browser.close();
console.log('done');
