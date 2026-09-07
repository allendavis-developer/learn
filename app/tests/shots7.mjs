import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const OUT = 'C:/dev/study/app/shots';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1.5 } });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => { const S = window.__app.S; S.settings.unlockAll = true; S.settings.hearts = false; localStorage.setItem('fpgalingo.v1', JSON.stringify(S)); });
await page.goto('http://localhost:8765/#day/27', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('#beginBtn'); await page.click('#beginBtn'); await wait(200);
for (let i = 0; i < 80; i++) { const c = await page.evaluate(() => { const c = window.__lesson.current; return c ? c.strand + ':' + c.type : null; }); if (c === 'E:info') break; await page.evaluate(() => window.__lesson.next()); await wait(80); }
await wait(300);
await page.screenshot({ path: `${OUT}/r-norton-top.png` });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(300);
await page.screenshot({ path: `${OUT}/r-norton-bottom.png` });
await browser.close(); console.log('done');
