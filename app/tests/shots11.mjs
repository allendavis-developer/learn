import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const OUT = 'C:/dev/study/app/shots';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1.5 } });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
page.on('pageerror', e => console.log('PAGEERROR', String(e)));
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.removeItem('fpgalingo.v1'); });
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => { const S = window.__app.S; S.settings.hearts = false; localStorage.setItem('fpgalingo.v1', JSON.stringify(S)); });
await page.goto('http://localhost:8765/#day/1', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' }); await wait(300);
await page.screenshot({ path: `${OUT}/x-day-intro.png`, fullPage: true });
await page.waitForSelector('#beginBtn'); await page.click('#beginBtn'); await wait(300);
for (let i = 0; i < 40; i++) { const c = await page.evaluate(() => window.__lesson.current); if (c && c.strand === 'E' && c.type === 'info') break; await page.evaluate(() => window.__lesson.next()); await wait(60); }
await page.evaluate(() => document.querySelector('.widget').scrollIntoView()); await wait(200);
await page.screenshot({ path: `${OUT}/x-ohm.png` });
for (let i = 0; i < 40; i++) { const p = await page.evaluate(() => window.__lesson.current && window.__lesson.current.prompt || ''); if (/Current in amps/.test(p)) break; await page.evaluate(() => window.__lesson.next()); await wait(60); }
await page.click('.answer-input'); await page.keyboard.type('12/6'); await wait(200);
await page.screenshot({ path: `${OUT}/x-kb.png` });
await browser.close(); console.log('done');
