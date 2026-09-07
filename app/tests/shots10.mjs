import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const OUT = 'C:/dev/study/app/shots';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1.5 } });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
page.on('pageerror', e => console.log('PAGEERROR', String(e)));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => { const S = window.__app.S; S.settings.unlockAll = true; S.settings.hearts = false; localStorage.setItem('fpgalingo.v1', JSON.stringify(S)); });
async function openStep(day, pred) {
  await page.goto(`http://localhost:8765/#day/${day}`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#beginBtn', { timeout: 5000 }); await page.click('#beginBtn'); await wait(200);
  for (let i = 0; i < 90; i++) {
    const ok = await page.evaluate(pred);
    if (ok) break;
    await page.evaluate(() => window.__lesson.next()); await wait(60);
  }
  await wait(300);
}
await openStep(20, () => { const c = window.__lesson.current; return c && c.strand === 'E' && c.type === 'info'; });
await page.screenshot({ path: `${OUT}/u-d20-rl-card.png` });
await openStep(18, () => { const c = window.__lesson.current; return c && c.strand === 'E' && c.type === 'numeric' && /P = V·I/.test(c.prompt); });
await page.screenshot({ path: `${OUT}/u-d18-uncert-q.png` });
await openStep(11, () => { const c = window.__lesson.current; return c && c.strand === 'E' && c.type === 'mc'; });
await page.screenshot({ path: `${OUT}/u-d11-ode-mc.png` });
await openStep(9, () => { const c = window.__lesson.current; return c && c.strand === 'M' && c.type === 'info'; });
await page.screenshot({ path: `${OUT}/u-d9-perms-card.png` });
await browser.close(); console.log('done');
