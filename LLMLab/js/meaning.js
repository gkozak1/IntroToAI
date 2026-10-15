/* Meaning space (Chapter 24): classroom numbers vs real GPT-2, in 3D */
'use strict';
(() => {
  const { $, esc } = NT;
  const D = window.EMBED_DATA;
  const cb = NT.b64(D.coords), COORDS = new Int16Array(cb.buffer, cb.byteOffset, cb.byteLength / 2);
  const tc = (id) => [0, 1, 2].map((k) => COORDS[id * 3 + k] / D.coordScale);
  const CLASSROOM = { man: [0.9, 0.7, -0.8], woman: [-0.9, 0.7, -0.8], boy: [0.9, -0.7, -0.8], girl: [-0.9, -0.7, -0.8], king: [0.9, 0.7, 0.8], queen: [-0.9, 0.7, 0.8], prince: [0.9, -0.7, 0.8], princess: [-0.9, -0.7, 0.8] };
  const PAIRS = [['man', 'woman'], ['boy', 'girl'], ['king', 'queen'], ['prince', 'princess'], ['son', 'daughter'], ['father', 'mother'], ['uncle', 'aunt'], ['husband', 'wife'], ['brother', 'sister'], ['he', 'she']];
  const real = (w) => { const ids = NT.encode(' ' + w), ps = ids.map(tc); return { ids, c: [0, 1, 2].map((k) => ps.reduce((s, p) => s + p[k], 0) / ps.length) }; };
  const M = { mode: 'classroom', words: Object.keys(CLASSROOM).map((w) => ({ w, base: true, g: CLASSROOM[w].slice(), r: real(w) })), yaw: -0.62, pitch: 0.38, ana: null, ghosts: false, from: null, t0: 0 };
  NT.meaning = { state: M, CLASSROOM };
  let cv, ctx, W = 0, H = 0;

  NT.meaning.init = (tools, stage) => {
    tools.innerHTML = `<div class="seg" id="mMode"><button data-v="classroom" class="${M.mode === 'classroom' ? 'on' : ''}">Idealized</button><button data-v="real" class="${M.mode === 'real' ? 'on' : ''}">Real GPT-2</button></div>
      <input type="text" id="mAdd" placeholder="add a word" style="max-width:150px;min-width:110px;flex:0 1 150px"/><button class="btn" id="mAddBtn">Add</button>
      <span class="ctl"><select id="aA"></select> : <select id="aB"></select> :: <select id="aC"></select> : ?</span><button class="btn" id="aGo">Show</button>
      <label class="ctl" id="ghostL"><input type="checkbox" id="mGhost" ${M.ghosts ? 'checked' : ''}/> ghosts</label>`;
    stage.innerHTML = `<div style="display:grid;grid-template-columns:1.5fr 1fr;gap:12px" class="mgrid"><div class="panel" style="padding:0;position:relative"><canvas id="mCv" style="width:100%;height:440px;display:block;cursor:grab;touch-action:none"></canvas><div class="mviews"><span class="muted">Turn to see an axis on its side:</span><button class="btn small" data-view="g">Gender axis</button><button class="btn small" data-view="a">Age axis</button><button class="btn small" data-view="r">Royalty axis</button><button class="btn small ghost" data-view="free">Tilted view</button><span class="muted" id="mViewNote"></span></div></div><div class="panel" style="overflow:auto;max-height:470px"><div class="h" id="mShape" style="font-size:.8rem;color:#5b6a7a"></div><table class="t" id="mTable"></table><div class="stripkey">Color squares: ${NT.scaleKey('−1 (low)', '+1 (high)')}</div><div id="mAna" style="margin-top:10px;font-size:.84rem"></div></div></div>`;
    cv = $('#mCv'); ctx = cv.getContext('2d');
    tools.querySelectorAll('#mMode button').forEach((b) => (b.onclick = () => { M.from = new Map(M.words.map((w) => [w.w, pos(w)])); M.t0 = performance.now(); M.mode = b.dataset.v; NT.meaning.init(tools, stage); anim(); }));
    const add = () => { const v = $('#mAdd').value.trim().split(/\s+/)[0]; if (v && !M.words.find((x) => x.w === v) && M.words.length < 24) { M.words.push({ w: v, base: false, g: null, r: real(v) }); } $('#mAdd').value = ''; table(); selects(); draw(); };
    $('#mAddBtn').onclick = add; $('#mAdd').onkeydown = (e) => { if (e.key === 'Enter') add(); };
    $('#mGhost').onchange = (e) => { M.ghosts = e.target.checked; draw(); };
    $('#ghostL').style.display = M.mode === 'real' ? '' : 'none';
    $('#aGo').onclick = () => { M.ana = [$('#aA').value, $('#aB').value, $('#aC').value]; anaText(); draw(); };
    selects(); table(); anaText();
    stage.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => turnTo(b.dataset.view)));
    new ResizeObserver(size).observe(cv); size();
    let drag = null;
    cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); if ($('#mViewNote')) $('#mViewNote').textContent = ''; drag = { x: e.clientX, y: e.clientY, yaw: M.yaw, pitch: M.pitch }; };
    cv.onpointermove = (e) => { if (!drag) return; M.yaw = drag.yaw + (e.clientX - drag.x) * 0.008; M.pitch = Math.max(-1.57, Math.min(1.57, drag.pitch + (e.clientY - drag.y) * 0.008)); draw(); };
    cv.onpointerup = () => { drag = null; };
    NT.setStatus(M.mode === 'classroom' ? 'Idealized numbers: gender, age, royalty from −1 to 1' : 'GPT-2: 768 numbers measured along three directions');
  };
  const pos = (w, mode = M.mode) => (mode === 'real' ? w.r.c : w.g);
  function size() { const r = cv.getBoundingClientRect(); const d = window.devicePixelRatio || 1; W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); draw(); }
  function selects() {
    const keep = M.ana || ['man', 'king', 'woman'];
    ['#aA', '#aB', '#aC'].forEach((s, i) => { const el = $(s); el.innerHTML = M.words.map((w) => `<option>${esc(w.w)}</option>`).join(''); el.value = keep[i]; });
  }
  const cellsHTML = (v) => `<span class="cells">${[0, 1, 2].map((k) => `<i style="background:${v && Number.isFinite(v[k]) ? `rgb(${NT.div(v[k]).map((x) => x | 0).join(',')})` : '#f4f6f9'}"></i>`).join('')}</span>`;
  function table() {
    const t = $('#mTable'); if (!t) return;
    const f = (x) => (x == null ? '' : (x < 0 ? '−' : '') + Math.abs(x).toFixed(M.mode === 'real' ? 2 : 1));
    const real = M.mode === 'real';
    $('#mShape').textContent = `${M.words.length} rows × 3 columns`;
    t.innerHTML = `<tr><th>Word</th><th>Gender</th><th>Age</th><th>Royalty</th><th>Row</th>${real ? '<th>Tokens</th>' : '<th></th>'}</tr>` + M.words.map((w, i) => {
      const cells = real ? w.r.c.map((x) => `<td>${f(x)}</td>`).join('') + `<td data-st="${i}">${cellsHTML(w.r.c)}</td><td>${w.r.ids.length}</td>`
        : [0, 1, 2].map((k) => `<td><input type="number" step="0.1" min="-1" max="1" data-i="${i}" data-k="${k}" value="${w.g ? w.g[k] : ''}"/></td>`).join('') + `<td data-st="${i}">${cellsHTML(w.g)}</td><td>${w.base ? '' : `<button class="btn ghost small" data-rm="${i}">×</button>`}</td>`;
      return `<tr><td class="tokc" style="${w.base ? '' : 'color:#4528b3;font-weight:700'}">${esc(w.w)}</td>${cells}</tr>`;
    }).join('');
    t.querySelectorAll('input').forEach((inp) => (inp.oninput = () => {
      const w = M.words[+inp.dataset.i]; const row = [...t.querySelectorAll(`input[data-i="${inp.dataset.i}"]`)].map((x) => (x.value === '' ? NaN : Math.max(-1, Math.min(1, +x.value))));
      w.g = row.every(Number.isFinite) ? row : null; const c = t.querySelector(`[data-st="${inp.dataset.i}"]`); if (c) c.innerHTML = cellsHTML(w.g); draw(); anaText();
    }));
    t.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { M.words.splice(+b.dataset.rm, 1); table(); selects(); draw(); }));
  }
  function anaCalc(mode = M.mode) {
    if (!M.ana) return null;
    const [a, b, c] = M.ana.map((n) => M.words.find((w) => w.w === n)); if (!a || !b || !c) return null;
    const pa = pos(a, mode), pb = pos(b, mode), pc = pos(c, mode); if (!pa || !pb || !pc) return null;
    const t = [0, 1, 2].map((k) => pb[k] - pa[k] + pc[k]);
    let best = null, bd = 1e9, any = null, ad = 1e9; for (const w of M.words) { const p = pos(w, mode); if (!p) continue; const d = Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]); if (d < ad) { ad = d; any = w.w; } if (M.ana.includes(w.w)) continue; if (d < bd) { bd = d; best = w.w; } }
    return { pa, pb, pc, t, best, any };
  }
  // GPT-2's own answer using all 768 numbers of each word's row (stored for the 20 lesson words; worked out here for added words)
  const liveAns = new Map();
  // returns { excl: answer with the question words left out, incl: what sits nearest the exact offset spot, question words allowed }
  async function gptAnswer(a, b, c) {
    const k = `${a}|${b}|${c}`; if (liveAns.has(k)) return liveAns.get(k);
    const ids = [a, b, c].map((w) => NT.encode(' ' + w)[0]), rows = await Promise.all(ids.map((id) => NT.row(id)));
    const v = rows[1].map((x, i) => x - rows[0][i] + rows[2][i]); let vn = 0; for (const x of v) vn += x * x; vn = Math.sqrt(vn) || 1;
    const e = await NT.embData(), n = NT.vocabSize, ex = [], inc = [];
    const keep = (arr, id, cs) => { if (arr.length < 3 || cs > arr[arr.length - 1][1]) { arr.push([id, cs]); arr.sort((x, y) => y[1] - x[1]); arr.length = Math.min(3, arr.length); } };
    for (let id = 0; id < n; id++) {
      const o = id * 384, sc = e.scales[id]; let dot = 0, nn = 0;
      for (let q = 0; q < 384; q++) { const by = e.packed[o + q], x0 = ((by >> 4) - 8) * sc, x1 = ((by & 15) - 8) * sc; dot += x0 * v[2 * q] + x1 * v[2 * q + 1]; nn += x0 * x0 + x1 * x1; }
      const cs = nn ? dot / (Math.sqrt(nn) * vn) : -1;
      keep(inc, id, cs); if (!ids.includes(id)) keep(ex, id, cs);
    }
    const out = { excl: D.analogies[k] || ex.map((x) => x[0]), incl: inc.map((x) => x[0]) }; liveAns.set(k, out); return out;
  }
  const ansHTML = (r) => `GPT-2, all 768 elements: <b style="color:#4528b3">${r.excl.map((id) => esc(NT.tokText(id).trim())).join(', ')}</b> <span class="muted">(its three closest tokens)</span>
    <div style="margin-top:4px">Exactly at the offset spot, if the question words were allowed: <b>${r.incl.map((id) => esc(NT.tokText(id).trim())).join(', ')}</b></div>`;
  const splitNote = (ws) => { const m = ws.map((w) => [w, NT.encode(' ' + w)]).filter(([, ids]) => ids.length > 1); return m.length ? `<div class="note">${m.map(([w, ids]) => `\u201c${esc(w)}\u201d is ${ids.length} tokens for GPT-2 (${ids.map((i) => esc(NT.tokText(i).trim())).join(' + ')})`).join('; ')}, so only the first piece is used and the answer may not make sense.</div>` : ''; };
  function anaText() {
    const box = $('#mAna'); if (!box || !M.ana) return; const r = anaCalc(); const [a, b, c] = M.ana;
    if (!r) {
      box.innerHTML = `<div class="note" style="margin-top:0">Type idealized numbers for every word in the analogy to place it on the chart.</div><div style="margin-top:4px" id="mGpt">GPT-2, all 768 elements: <span class="muted">working it out…</span></div>`;
      const key0 = M.ana.join('|'); gptAnswer(a, b, c).then((ids) => { if (M.ana.join('|') === key0 && $('#mGpt')) $('#mGpt').innerHTML = ansHTML(ids) + splitNote(M.ana); }).catch(() => {});
      return;
    }
    const f = (v) => '[' + v.map((x) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(M.mode === 'real' ? 2 : 1)).join(', ') + ']';
    box.innerHTML = `<div class="mono" style="font-size:.78rem;background:#f7f9fc;border:1px solid #dce2ea;border-radius:7px;padding:6px 8px">${esc(b)} − ${esc(a)} + ${esc(c)} = ${f(r.t)}</div>
      <div style="margin-top:6px">Closest on the chart: <b style="color:#4528b3">${esc(r.best || '—')}</b>${r.any && r.any !== r.best ? ` <span class="muted">(the very closest dot is <b>${esc(r.any)}</b>, but it is in the question, so it doesn\u2019t count)</span>` : ''}</div>
      <div style="margin-top:4px" id="mGpt">GPT-2, all 768 elements: <span class="muted">working it out…</span></div>
      <div class="note" style="margin-top:6px">The orange dashed arrow copies the solid arrow (the change from <b>${esc(a)}</b> to <b>${esc(b)}</b>) and starts it at <b>${esc(c)}</b>. Whatever changed from ${esc(a)} to ${esc(b)} is changed the same way, in the same direction, for ${esc(c)}.</div>`;
    const key = M.ana.join('|');
    gptAnswer(a, b, c).then((ids) => { if (M.ana.join('|') !== key || !$('#mGpt')) return; $('#mGpt').innerHTML = ansHTML(ids) + splitNote(M.ana); })
      .catch(() => { if ($('#mGpt')) $('#mGpt').innerHTML = '<span class="muted">GPT-2\u2019s rows could not be loaded.</span>'; });
    NT.setStatus(`${b} − ${a} + ${c} ≈ ${r.best || '?'}`);
  }
  function anim() { const tick = () => { draw(); if (performance.now() - M.t0 < 700) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  function cur(w) {
    const p = pos(w); if (!p) return null; const f = M.from && M.from.get(w.w); const t = Math.min(1, (performance.now() - M.t0) / 650), e = 1 - Math.pow(1 - t, 3);
    return f && t < 1 ? p.map((v, k) => f[k] + (v - f[k]) * e) : p;
  }
  function proj([g, a, r]) {
    const x = g, y = r, z = a, cy = Math.cos(M.yaw), sy = Math.sin(M.yaw), x1 = x * cy + z * sy, z1 = -x * sy + z * cy, cp = Math.cos(M.pitch), sp = Math.sin(M.pitch), y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, s = Math.min(W, H) * 0.3, f = 7 / (7 - z2);
    const cr = Math.cos(M.roll || 0), sr = Math.sin(M.roll || 0), xr = x1 * cr - y2 * sr, yr = x1 * sr + y2 * cr;
    return { x: W / 2 + xr * s * f, y: H / 2 - yr * s * f, z: z2 };
  }
  function line(p, q, c, w = 1, dash) { const a = proj(p), b = proj(q); ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore(); }
  function text(s, x, y, c, al = 'left', wt = 650) { ctx.save(); ctx.font = `${wt} 12.5px Inter, system-ui, sans-serif`; ctx.fillStyle = c; ctx.textAlign = al; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(s, x, y); ctx.fillText(s, x, y); ctx.restore(); }
  function draw() {
    if (!ctx || !W) return; ctx.clearRect(0, 0, W, H);
    for (const a of [-1, 1]) for (const b of [-1, 1]) { line([-1, a, b], [1, a, b], '#e3e8ef'); line([a, -1, b], [a, 1, b], '#e3e8ef'); line([a, b, -1], [a, b, 1], '#e3e8ef'); }
    const axes = [[[-1.15, 0, 0], [1.15, 0, 0], '#2878d6', 'male', 'female'], [[0, -1.15, 0], [0, 1.15, 0], '#c26a05', 'adult', 'young'], [[0, 0, -1.15], [0, 0, 1.15], '#b8338a', 'royal', 'common']];
    for (const [f, t, c, pl, nl] of axes) { line(f, t, c, 1.5); const p = proj(t.map((v) => v * 1.08)), n = proj(f.map((v) => v * 1.08)); text(pl, p.x, p.y, c, 'center', 750); text(nl, n.x, n.y, c, 'center', 750); }
    const pts = M.words.map((w) => ({ w, p: cur(w) })).filter((o) => o.p), by = new Map(pts.map((o) => [o.w.w, o.p]));
    if (M.mode === 'real' && M.ghosts) for (const w of M.words) { if (!w.g) continue; const g = proj(w.g), c = by.get(w.w); if (c) line(w.g, c, '#9aa5b5', 1, [2, 3]); ctx.strokeStyle = '#9aa5b5'; ctx.beginPath(); ctx.arc(g.x, g.y, 5, 0, 7); ctx.stroke(); }
    for (const [a, b] of PAIRS) { const p = by.get(a), q = by.get(b); if (p && q) line(p, q, '#8a94a6', 1.3, [5, 4]); }
    const r = anaCalc();
    if (r) { const t = proj(r.t); ctx.fillStyle = '#5b38d1'; ctx.beginPath(); ctx.arc(t.x, t.y, 7, 0, 7); ctx.fill(); text('?', t.x + 10, t.y - 10, '#5b38d1', 'left', 800); }
    pts.map((o) => ({ ...o, s: proj(o.p) })).sort((a, b) => a.s.z - b.s.z).forEach((o) => { ctx.fillStyle = o.w.base ? '#273246' : '#5b38d1'; ctx.beginPath(); ctx.arc(o.s.x, o.s.y, 6, 0, 7); ctx.fill(); text(o.w.w, o.s.x + 10, o.s.y, o.w.base ? '#1d2634' : '#4528b3'); });
    if (r) { arrow(r.pa, r.pb); arrow(r.pc, r.t, true); } // drawn last so the arrows sit on top
  }
  function arrow(p, q, dash) {
    // stops just short of the dot it points to, in orange with a white outline so it shows on white and next to black dots
    const a0 = proj(p), b0 = proj(q), ang = Math.atan2(b0.y - a0.y, b0.x - a0.x), len = Math.hypot(b0.x - a0.x, b0.y - a0.y);
    if (len < 24) return;
    const a = { x: a0.x + Math.cos(ang) * 10, y: a0.y + Math.sin(ang) * 10 }, b = { x: b0.x - Math.cos(ang) * 11, y: b0.y - Math.sin(ang) * 11 };
    const head = () => { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - Math.cos(ang - 0.42) * 13, b.y - Math.sin(ang - 0.42) * 13); ctx.lineTo(b.x - Math.cos(ang + 0.42) * 13, b.y - Math.sin(ang + 0.42) * 13); ctx.closePath(); };
    const shaft = () => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x - Math.cos(ang) * 10, b.y - Math.sin(ang) * 10); };
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; if (dash) ctx.setLineDash([8, 6]); shaft(); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 5; ctx.lineJoin = 'round'; head(); ctx.stroke();
    ctx.strokeStyle = ctx.fillStyle = '#e06c00'; ctx.lineWidth = 3; if (dash) ctx.setLineDash([8, 6]); shaft(); ctx.stroke(); ctx.setLineDash([]); head(); ctx.fill();
    ctx.restore();
  }
  // turn the chart so one axis lies flat across the screen (the axis pointing at you disappears)
  const VIEWS = { g: [0, 0, 0, 'Gender runs left–right, royalty up–down; age points straight at you.'], a: [Math.PI / 2, 0, 0, 'Age runs left–right, royalty up–down; gender points straight at you.'], r: [0, 0, -Math.PI / 2, 'Royalty runs left–right, gender up–down; age points straight at you.'], free: [-0.62, 0.38, 0, ''] };
  function turnTo(v) {
    const [y1, p1, r1, note] = VIEWS[v], y0 = M.yaw, p0 = M.pitch, r0 = M.roll || 0, t0 = performance.now();
    const step = () => { const t = Math.min(1, (performance.now() - t0) / 600), e = 1 - Math.pow(1 - t, 3); M.yaw = y0 + (y1 - y0) * e; M.pitch = p0 + (p1 - p0) * e; M.roll = r0 + (r1 - r0) * e; draw(); if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); if ($('#mViewNote')) $('#mViewNote').textContent = note;
  }

  // numbers panel: the analogy arithmetic, one quality at a time, and the distance to the closest words
  NT.meaning.numbers = () => {
    const r = anaCalc(); if (!r) return null; const F = NT.nf, [a, b, c] = M.ana, dp = M.mode === 'real' ? 2 : 1, f = (x) => F.f(x, dp);
    const names = ['gender', 'age', 'royalty'];
    const pf = (x) => (x < 0 ? `(${f(x)})` : f(x));
    const rows = [F.formula(`${esc(b)} − ${esc(a)} + ${esc(c)}, one quality at a time`)];
    rows.push(F.eq(names.map((n, k) => `${n.padEnd(8)} ${pf(r.pb[k])} − ${pf(r.pa[k])} + ${pf(r.pc[k])} = <b>${f(r.t[k])}</b>`).join('\n')));
    const ds = M.words.filter((w) => !M.ana.includes(w.w) && pos(w)).map((w) => { const p = pos(w); return { w: w.w, d: Math.hypot(p[0] - r.t[0], p[1] - r.t[1], p[2] - r.t[2]), p }; }).sort((x, y) => x.d - y.d).slice(0, 3);
    let t = `<table class="t left"><tr><th>Word</th><th>Its numbers</th><th>Distance from the result</th></tr>`;
    ds.forEach((o, i) => { t += `<tr class="${i === 0 ? 'pick' : ''}"><td class="tokc">${esc(o.w)}</td><td>[${o.p.map(f).join(', ')}]</td><td>${F.f(o.d, 2)}</td></tr>`; });
    rows.push(t + '</table>');
    rows.push(`<div class="nnote">distance = √( (gender gap)² + (age gap)² + (royalty gap)² ). The smallest distance is the closest word.</div>`);
    return F.box('The numbers · the analogy', rows);
  };
})();
