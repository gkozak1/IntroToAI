// usage: node shots.js "N1.1,N1.5,..." [mode] [w] [h]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.env.SHOTS || '/tmp/shots';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0].split('#')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(8765, async () => {
  const list = (process.argv[2] || 'N1.1').split(','), mode = process.argv[3] || 'concept', W = +(process.argv[4] || 1280), H = +(process.argv[5] || 720);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  for (const id of list) {
    await pg.goto('http://localhost:8765/index.html#' + id); await pg.waitForTimeout(400);
    if (mode === 'hiw') { await pg.click('#mode [data-m=hiw]'); await pg.waitForTimeout(200); }
    if (process.env.CLICK) { for (const c of process.env.CLICK.split('|')) { await pg.click(c); await pg.waitForTimeout(300); } }
    await pg.waitForTimeout(+(process.env.WAIT || 300));
    const f = path.join(out, id.replace(/[^\w.]/g, '_') + (mode === 'hiw' ? '-hiw' : '') + '.png');
    await pg.screenshot({ path: f });
    const sh = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight }));
    console.log(id, f, JSON.stringify(sh));
  }
  console.log('ERRORS', errs.length ? errs.join('\n') : 'none');
  await b.close(); srv.close();
});
