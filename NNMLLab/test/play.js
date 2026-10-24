const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]); const p = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(8767, async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  for (const id of ['N1', 'M1', 'M2', 'M5']) {
    await pg.goto('http://localhost:8767/index.html#' + id + '.1'); await pg.waitForTimeout(300);
    await pg.click('#pPlay'); await pg.waitForTimeout(id === 'N1' ? 26000 : 18000);
    const st = await pg.evaluate(() => [NN.st.exp.id, NN.st.step + 1]);
    console.log(id, 'after play ->', st.join('.'));
  }
  // drawing: trace on N4.1 pad
  await pg.goto('http://localhost:8767/index.html#N4.2'); await pg.waitForTimeout(400);
  const box = await pg.locator('canvas.padfg').boundingBox();
  const pts = [[0.55, 0.15], [0.3, 0.55], [0.75, 0.55]], pts2 = [[0.62, 0.2], [0.62, 0.9]];
  for (const seq of [pts, pts2]) { await pg.mouse.move(box.x + seq[0][0] * box.width, box.y + seq[0][1] * box.height); await pg.mouse.down(); for (const [x, y] of seq.slice(1)) await pg.mouse.move(box.x + x * box.width, box.y + y * box.height, { steps: 12 }); await pg.mouse.up(); await pg.waitForTimeout(200); }
  await pg.screenshot({ path: process.env.SHOTS + '/draw.png' });
  console.log('verdict:', await pg.locator('.verdict').innerText());
  console.log('ERRORS', errs.join('\n') || 'none');
  await b.close(); srv.close();
});
