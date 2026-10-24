// Visit every step of every experience in both modes; report errors, overflow, and stage scroll.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]); const p = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(8766, async () => {
  const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 720);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://localhost:8766/index.html'); await pg.waitForTimeout(500);
  const exps = await pg.evaluate(() => NN.exps.map((e) => [e.id, e.steps.length]));
  const issues = [];
  for (const mode of ['concept', 'hiw']) {
    await pg.evaluate((m) => document.querySelector(`#mode [data-m=${m}]`).click(), mode);
    for (const [id, n] of exps) for (let s = 0; s < n; s++) {
      const before = errs.length;
      await pg.evaluate(([id, s]) => NN.go(id, s), [id, s]); await pg.waitForTimeout(120);
      const m = await pg.evaluate(() => { const st = document.getElementById('stage'); return { sw: document.documentElement.scrollWidth, stScroll: st.scrollHeight - st.clientHeight, stScrollW: st.scrollWidth - st.clientWidth }; });
      if (m.sw > W + 1 || m.stScroll > 4 || m.stScrollW > 4 || errs.length > before) issues.push(`${mode} ${id}.${s + 1} pageW=${m.sw} stageOverflowY=${m.stScroll} stageOverflowX=${m.stScrollW} ${errs.slice(before).join(' | ')}`);
    }
  }
  // second pass: open every step directly from its link (fresh page), like a student following a step code
  for (const [id, n] of exps) for (let s = 0; s < n; s++) {
    const before = errs.length;
    await pg.goto('about:blank'); await pg.goto(`http://localhost:8766/index.html#${id}.${s + 1}`); await pg.waitForTimeout(250);
    if (errs.length > before) issues.push(`direct ${id}.${s + 1} ${errs.slice(before).join(' | ')}`);
    const bad = await pg.evaluate(() => { const t = document.body.innerText; const m = t.match(/.{0,30}(NaN|undefined|\[object|Infinity).{0,30}/); return m ? m[0] : null; });
    if (bad) issues.push(`text ${id}.${s + 1}: ${bad}`);
  }
  // third pass: answer the first prediction on every step that has one
  for (const [id, n] of exps) for (let s = 0; s < n; s++) {
    await pg.goto('about:blank'); await pg.goto(`http://localhost:8766/index.html#${id}.${s + 1}`); await pg.waitForTimeout(150);
    const before = errs.length;
    const has = await pg.$('.predict button'); if (!has) continue;
    await has.click(); await pg.waitForTimeout(200);
    if (errs.length > before) issues.push(`predict ${id}.${s + 1} ${errs.slice(before).join(' | ')}`);
  }
  if (exps.length !== 11) issues.push('expected 11 experiences, got ' + exps.length);
  console.log(issues.join('\n') || 'no issues');
  await b.close(); srv.close();
});
