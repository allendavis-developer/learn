// Screenshot tour: node tests/shots.mjs  (server must be running on :8765)
import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
import fs from 'node:fs';
const OUT = process.argv[2] || 'C:/dev/study/app/shots';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 430, height: 900, deviceScaleFactor: 2 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
// pretend some progress so the path looks alive
await page.evaluate(() => {
  const S = window.__app.S; S.settings.unlockAll = true; S.settings.fakeToday = '2026-09-10'; S.xp = 640; S.gems = 130; S.streak = 3; S.lastActive = '2026-09-10'; S.longestStreak = 3;
  S.days = { 1: { best: { score: 14, total: 14, xp: 160 }, attempts: 1, crowns: 3 }, 2: { best: { score: 13, total: 15, xp: 140 }, attempts: 1, crowns: 2 }, 3: { best: { score: 15, total: 15, xp: 170 }, attempts: 2, crowns: 3 } };
  S.activeDays = { '2026-09-08': 160, '2026-09-09': 140, '2026-09-10': 170 };
  localStorage.setItem('fpgalingo.v1', JSON.stringify(S));
});
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: `${OUT}/1-home.png` });
await page.goto('http://localhost:8765/#day/4', { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${OUT}/2-day-intro.png` });
await page.click('#beginBtn');
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}/3-concept-mux.png`, fullPage: false });
// play with the mux sim then continue
await page.evaluate(() => { document.querySelectorAll('.widget .wbtn')[0].click(); }); await page.evaluate(() => { document.querySelectorAll('.widget .wbtn')[1].click(); });
await page.screenshot({ path: `${OUT}/4-concept-mux-played.png` });
await page.click('#checkBtn');
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}/5-question.png` });
// answer wrong on purpose to show feedback
const opts = await page.$$('button.opt');
const cur = await page.evaluate(() => window.__lesson.current.answer);
const idxs = await Promise.all(opts.map(o => o.evaluate(e => +e.dataset.idx)));
const wrong = opts[idxs.findIndex(i => i !== cur)];
await wrong.click(); await page.click('#checkBtn');
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}/6-feedback-wrong.png` });
await page.click('#continueBtn');
await new Promise(r => setTimeout(r, 300));
const opts2 = await page.$$('button.opt');
const cur2 = await page.evaluate(() => window.__lesson.current.answer);
const idxs2 = await Promise.all(opts2.map(o => o.evaluate(e => +e.dataset.idx)));
await opts2[idxs2.indexOf(cur2)].click(); await page.click('#checkBtn');
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}/7-feedback-right.png` });
// jump to the adder concept card (step index 3) by continuing
await page.click('#continueBtn'); await new Promise(r => setTimeout(r, 200));
await page.screenshot({ path: `${OUT}/8-adder-sim.png` });
// day 2 wheel + day 3 dice via direct render for variety
await page.goto('http://localhost:8765/#day/2', { waitUntil: 'networkidle0' }); await page.click('#beginBtn'); await new Promise(r => setTimeout(r, 200));
await page.screenshot({ path: `${OUT}/9-twos-complement.png` });
await page.goto('http://localhost:8765/#day/15', { waitUntil: 'networkidle0' }); await page.click('#beginBtn'); await new Promise(r => setTimeout(r, 200));
await page.click('#checkBtn'); await new Promise(r => setTimeout(r, 200));
await page.evaluate(() => { document.querySelectorAll('.widget .wbtn')[0].click(); }); await page.evaluate(() => { document.querySelectorAll('.widget .wbtn')[0].click(); });
await page.screenshot({ path: `${OUT}/10-registers.png` });
await page.goto('http://localhost:8765/#day/4', { waitUntil: 'networkidle0' }); await page.click('#beginBtn'); await new Promise(r => setTimeout(r, 200));
for (let i = 0; i < 10; i++) { await page.click('#checkBtn').catch(() => {}); await new Promise(r => setTimeout(r, 150)); const c = await page.$('#continueBtn'); if (c) { await c.click(); await new Promise(r => setTimeout(r, 150)); } }
await page.screenshot({ path: `${OUT}/11-dice.png` });
await page.goto('http://localhost:8765/#glossary', { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${OUT}/12-glossary.png` });
await page.goto('http://localhost:8765/#profile', { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${OUT}/13-profile.png` });

// completion screen: finish day 1 by stepping through
await page.goto('http://localhost:8765/#day/1', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' });
await page.click('#beginBtn'); await new Promise(r => setTimeout(r, 200));
for (let i = 0; i < 60; i++) { if (await page.$('#finishBtn')) break; await page.evaluate(() => window.__lesson.next()); await new Promise(r => setTimeout(r, 40)); }
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: `${OUT}/14-complete.png` });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
