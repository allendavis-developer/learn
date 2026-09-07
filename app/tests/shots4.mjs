// Screenshots of new M/S/A widgets. node tests/shots4.mjs
import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const OUT = 'C:/dev/study/app/shots';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1.5 } });
const page = await browser.newPage();
const wait = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => { const S = window.__app.S; S.settings.unlockAll = true; S.settings.hearts = false; localStorage.setItem('fpgalingo.v1', JSON.stringify(S)); });
async function shot(day, title, clicks, name) {
  await page.goto(`http://localhost:8765/#day/${day}`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#beginBtn', { timeout: 5000 });
  await page.click('#beginBtn'); await wait(200);
  for (let i = 0; i < 40; i++) { const t = await page.evaluate(() => (window.__lesson.current && window.__lesson.current.title) || ''); if (t.includes(title)) break; await page.evaluate(() => window.__lesson.next()); await wait(80); }
  for (const c of clicks) { await page.evaluate(sel => { const b = [...document.querySelectorAll('.widget .wbtn')].find(x => x.textContent.includes(sel)); b && b.click(); }, c); await wait(80); }
  await page.evaluate(() => { const w = document.querySelector('.widget'); w && w.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }); await wait(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
await shot(15, 'Rare events', [], 'm-bayesgrid');
await shot(16, 'Git', ['edit', 'git add', 'git commit', 'checkout', 'edit', 'git add', 'git commit'], 'm-gitgraph');
await shot(27, 'Stacks', ['step', 'step', 'step', 'step'], 'm-stackbr');
await shot(19, 'Unit tests', ['12-byte', 'opcode 7', 'nominal ×1000'], 'm-testmatrix');
await shot(2, 'Lists', ['run next', 'run next', 'run next', 'run next', 'run next'], 'm-repl');
await shot(29, 'Binary search on the answer', ['search step', 'search step'], 'm-bsanswer');
await shot(12, 'Stars and bars', [], 'm-starsbars');
await shot(17, 'Debugging', ['test c', 'test c'], 'm-bisect');
await browser.close();
console.log('done');
