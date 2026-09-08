// End-to-end: drive every day through the real UI in headless Chrome, auto-answering from the content.
// node tests/e2e.mjs [dayFrom] [dayTo]   (server on :8765; code steps need internet for Pyodide the first time)
import { createRequire } from 'node:module';
const puppeteer = createRequire('C:/dev/webharvest/package.json')('puppeteer');
const from = +(process.argv[2] || 1), to = +(process.argv[3] || 30);
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', defaultViewport: { width: 1200, height: 900 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push('console: ' + m.text()); });
const wait = ms => new Promise(r => setTimeout(r, ms));

await page.goto('http://localhost:8765/#home', { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.clear(); const S = window.__app.S; S.settings.unlockAll = true; S.settings.hearts = false; S.settings.sound = false; localStorage.setItem('fpgalingo.v1', JSON.stringify(S)); });
await page.reload({ waitUntil: 'networkidle0' });

let totals = { steps: 0, code: 0, codeOk: 0, wrong: 0 };
for (let d = from; d <= to; d++) {
  await page.goto(`http://localhost:8765/#day/${d}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#beginBtn', { timeout: 5000 });
  await page.click('#beginBtn'); await wait(150);
  let guard = 0;
  while (guard++ < 200) {
    if (await page.$('#finishBtn')) break;
    const info = await page.evaluate(() => {
      const L = window.__lesson; if (!L || !L.current) return null;
      const c = L.current;
      return { type: c.type, id: c.id, answer: c.answer, answers: c.answers, tokens: c.answer, items: c.items, pairs: c.pairs, solution: c.solution, display: c.display, numeric: c.type === 'numeric' ? (Array.isArray(c.answer) ? c.answer[0] : c.answer) : null, text: c.type === 'text' ? c.answers[0] : null, hasWidget: !!L.widget, queue: L.queueLength };
    });
    if (info === null) break; // finished
    totals.steps++;
    try {
    if (info.type === 'info') { await page.click('#checkBtn'); }
    else if (info.type === 'mc') { await page.evaluate(i => { document.querySelector(`button.opt[data-idx="${i}"]`).click(); }, info.answer); await page.click('#checkBtn'); }
    else if (info.type === 'multi') { await page.evaluate(is => { is.forEach(i => document.querySelector(`button.opt[data-idx="${i}"]`).click()); }, info.answers); await page.click('#checkBtn'); }
    else if (info.type === 'numeric') { await page.evaluate(v => { const inp = document.querySelector('input.answer-input'); inp.value = String(v); inp.dispatchEvent(new Event('input')); }, info.numeric); await page.click('#checkBtn'); }
    else if (info.type === 'text') { await page.evaluate(v => { const inp = document.querySelector('input.answer-input'); inp.value = v; inp.dispatchEvent(new Event('input')); }, info.text); await page.click('#checkBtn'); }
    else if (info.type === 'tokens') {
      const place = t => page.evaluate(t => { const tk = [...document.querySelectorAll('.token-bank .tok')].find(b => b.dataset.text === t && !b.classList.contains('used')); tk.click(); }, t);
      for (const t of info.tokens) await place(t);
      // regression guard: removing a placed token then re-adding it must not break Check
      await page.evaluate(() => { const placed = [...document.querySelectorAll('.token-area .tok')]; placed[placed.length - 1].click(); });
      await place(info.tokens[info.tokens.length - 1]);
      await page.click('#checkBtn');
    }
    else if (info.type === 'order') { for (let i = 0; i < info.items.length; i++) await page.evaluate(i => { document.querySelector(`.order-item[data-i="${i}"]`).click(); }, i); await page.click('#checkBtn'); }
    else if (info.type === 'match') {
      for (let i = 0; i < info.pairs.length; i++) await page.evaluate(i => { const cols = [...document.querySelectorAll('.match-col')]; cols[0].querySelector(`.mt[data-i="${i}"]`).click(); cols[1].querySelector(`.mt[data-i="${i}"]`).click(); }, i);
      await page.click('#checkBtn');
    }
    else if (info.type === 'widget') { await page.evaluate(() => { const L = window.__lesson; if (L.widget && L.widget.solve) L.widget.solve(); }); await wait(50); const ok = await page.evaluate(() => !document.querySelector('#checkBtn').disabled); if (!ok) { errors.push(`d${d} ${info.id}: widget goal has no solve() or did not enable Check`); await page.evaluate(() => { const L = window.__lesson; L.setSelection(null); }); await page.evaluate(() => document.querySelector('#checkBtn').disabled = false); } await page.click('#checkBtn'); }
    else if (info.type === 'code') {
      totals.code++;
      await page.evaluate(sol => window.__lesson.setCode(sol), info.solution);
      await page.evaluate(() => { document.querySelector('#checkBtn').disabled = false; document.querySelector('#checkBtn').click(); });
      await page.waitForSelector('#continueBtn', { timeout: 180000 });
      const res = await page.evaluate(() => ({ ok: document.querySelector('.lesson-foot').classList.contains('ok'), rows: [...document.querySelectorAll('.test-row, .speed')].map(r => r.textContent.trim().slice(0, 140)) }));
      if (res.ok) totals.codeOk++; else errors.push(`d${d} ${info.id}: code solution failed in browser: ${res.rows.filter(r => r.includes('✖')).join(' | ').slice(0, 400)}`);
    }
    } catch (err) { const dom = await page.evaluate(() => document.querySelector('.lesson-body')?.innerText.slice(0, 300)); errors.push(`d${d} ${info.id} (${info.type}): driver error ${err.message} | DOM: ${dom}`); await page.evaluate(() => window.__lesson.next()); continue; }
    await wait(60);
    const fb = await page.evaluate(() => { const f = document.querySelector('.lesson-foot'); return f.classList.contains('bad') ? document.querySelector('.fb .t')?.textContent.slice(0, 200) : null; });
    if (fb) { totals.wrong++; errors.push(`d${d} ${info.id} (${info.type}) marked WRONG with the content's own answer: ${fb}`); }
    const cont = await page.$('#continueBtn'); if (cont) { await cont.click(); await wait(60); }
  }
  const fin = await page.$('#finishBtn');
  if (!fin) errors.push(`d${d}: lesson did not reach the completion screen (guard=${guard})`);
  else await fin.click();
  console.log(`day ${d}: done (steps so far ${totals.steps}, code ${totals.codeOk}/${totals.code})`);
}
console.log('totals', totals);
if (errors.length) { console.log('ERRORS (' + errors.length + '):\n' + errors.join('\n')); }
else console.log('e2e: OK');
await browser.close();
process.exit(errors.length ? 1 : 0);
