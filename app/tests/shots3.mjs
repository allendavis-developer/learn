// Desktop screenshots: code exercise + fixed FSM widget. node tests/shots3.mjs
import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const OUT = 'C:/dev/study/app/shots';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1.5 } });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => { const S = window.__app.S; S.settings.unlockAll = true; S.settings.hearts = false; localStorage.setItem('fpgalingo.v1', JSON.stringify(S)); });
async function open(day, stepIdx) {
  await page.goto(`http://localhost:8765/#day/${day}`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#beginBtn', { timeout: 5000 });
  await page.click('#beginBtn'); await wait(200);
  for (let i = 0; i < stepIdx; i++) { await page.evaluate(() => window.__lesson.next()); await wait(100); }
}
// Day 8 two-sum code step: run the solution so results show
await open(8, 10);
const isCode = await page.evaluate(() => window.__lesson.current.type);
if (isCode !== 'code') { for (let i = 0; i < 6 && (await page.evaluate(() => window.__lesson.current.type)) !== 'code'; i++) await page.evaluate(() => window.__lesson.next()); }
await page.evaluate(() => window.__lesson.setCode(window.__lesson.current.solution.replace('if need in seen:', 'if need in seen:  # lookup first')));
await page.evaluate(() => { document.querySelector('#checkBtn').disabled = false; document.querySelector('#checkBtn').click(); });
await page.waitForSelector('#continueBtn', { timeout: 180000 });
await page.screenshot({ path: `${OUT}/d-code-passed.png` });
// wrong/slow attempt: quadratic two-sum
await open(8, 10);
if ((await page.evaluate(() => window.__lesson.current.type)) !== 'code') { for (let i = 0; i < 6 && (await page.evaluate(() => window.__lesson.current.type)) !== 'code'; i++) await page.evaluate(() => window.__lesson.next()); }
await page.evaluate(() => window.__lesson.setCode('def solve(arr, target):\n    for i in range(len(arr)):\n        for j in range(i + 1, len(arr)):\n            if arr[i] + arr[j] == target:\n                return [i, j]\n    return None\n'));
await page.evaluate(() => { document.querySelector('#checkBtn').disabled = false; document.querySelector('#checkBtn').click(); });
await page.waitForSelector('#continueBtn', { timeout: 180000 });
await page.screenshot({ path: `${OUT}/d-code-too-slow.png` });
// FSM widget (day 16 goal step)
await open(16, 1);
for (const inp of ['start-of-frame', 'bad length']) await page.evaluate(t => { [...document.querySelectorAll('.widget .wbtn')].find(b => b.textContent === t).click(); }, inp);
await page.screenshot({ path: `${OUT}/d-fsm-fixed.png` });
// home desktop
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${OUT}/d-home-desktop.png` });
await browser.close();
console.log('done');
