import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const OUT = 'C:/dev/study/app/shots';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1.5 } });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
page.on('pageerror', e => console.log('PAGEERROR', String(e)));
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.removeItem('fpgalingo.v1'));
await page.reload({ waitUntil: 'networkidle0' }); await wait(400);
await page.screenshot({ path: `${OUT}/t-home-day1.png` });
// seeded: days 1-16 done, today = Day 17 (22 Sep)
await page.evaluate(() => {
  const S = window.__app.S; S.settings.fakeToday = '2026-09-22'; S.xp = 2400; S.gems = 300; S.streak = 16; S.lastActive = '2026-09-22'; S.longestStreak = 16;
  S.days = {};
  for (let n = 1; n <= 16; n++) S.days[n] = { best: { score: 20, total: 22, xp: 150 }, attempts: 1, crowns: 2 };
  localStorage.setItem('fpgalingo.v1', JSON.stringify(S));
});
await page.reload({ waitUntil: 'networkidle0' }); await wait(500);
console.log('scrollY', await page.evaluate(() => window.scrollY));
await page.screenshot({ path: `${OUT}/t-home-day17.png` });
await page.evaluate(() => window.scrollTo(0, 0)); await wait(200);
await page.screenshot({ path: `${OUT}/t-home-day17-top.png` });
await page.evaluate(() => localStorage.removeItem('fpgalingo.v1'));
await browser.close(); console.log('done');
