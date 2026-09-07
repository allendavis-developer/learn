// Screenshots of the syllabus-aligned EE cards (days 17, 18, 27, 29) + home with mascot. node tests/shots6.mjs
import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const OUT = 'C:/dev/study/app/shots';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1.5 } });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
page.on('pageerror', e => console.log('PAGEERROR', String(e)));
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => { const S = window.__app.S; S.settings.unlockAll = true; S.settings.hearts = false; localStorage.setItem('fpgalingo.v1', JSON.stringify(S)); });
await page.reload({ waitUntil: 'networkidle0' }); await wait(300);
await page.screenshot({ path: `${OUT}/q-home.png` });

async function openE(day) {
  await page.goto(`http://localhost:8765/#day/${day}`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#beginBtn', { timeout: 5000 });
  await page.click('#beginBtn'); await wait(200);
  for (let i = 0; i < 80; i++) {
    const c = await page.evaluate(() => { const c = window.__lesson.current; return c ? c.strand + ':' + c.type : null; });
    if (c === 'E:info') break;
    await page.evaluate(() => window.__lesson.next()); await wait(80);
  }
  await wait(300);
}
for (const [day, name] of [[17, 'accuracy'], [18, 'uncertainty'], [27, 'norton'], [29, 'vectors']]) {
  await openE(day);
  await page.screenshot({ path: `${OUT}/q-d${day}-${name}.png`, fullPage: true });
  console.log('shot', day, name);
}
await page.goto('http://localhost:8765/#progress', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' }); await wait(300);
await page.screenshot({ path: `${OUT}/q-progress.png`, fullPage: true });
await browser.close();
console.log('done');
