/* Meaning space (Chapter 24): classroom numbers vs real GPT-2, in 3D */
'use strict';
(() => {
  const { $, esc } = NT;
  const D = NT.P.meaning;
  const cb = NT.b64(D.coords), COORDS = new Int16Array(cb.buffer, cb.byteOffset, cb.byteLength / 2);
  const tc = (id) => [0, 1, 2].map((k) => COORDS[id * 3 + k] / D.coordScale);
  const CLASSROOM = { man: [0.9, 0.7, -0.8], woman: [-0.9, 0.7, -0.8], boy: [0.9, -0.7, -0.8], girl: [-0.9, -0.7, -0.8], king: [0.9, 0.7, 0.8], queen: [-0.9, 0.7, 0.8], prince: [0.9, -0.7, 0.8], princess: [-0.9, -0.7, 0.8] };
  const PAIRS = [['man', 'woman'], ['boy', 'girl'], ['king', 'queen'], ['prince', 'princess'], ['son', 'daughter'], ['father', 'mother'], ['uncle', 'aunt'], ['husband', 'wife'], ['brother', 'sister'], ['he', 'she']];
  const real = (w) => { const ids = NT.encode(' ' + w), ps = ids.map(tc); return { ids, c: [0, 1, 2].map((k) => ps.reduce((s, p) => s + p[k], 0) / ps.length) }; };
  const M = { mode: 'classroom', words: Object.keys(CLASSROOM).map((w) => ({ w, base: true, g: CLASSROOM[w].slice(), r: real(w) })), yaw: -0.62, pitch: 0.38, ana: null, ghosts: false, from: null, t0: 0 };
  NT.meaning = { state: M };
  let cv, ctx, W = 0, H = 0;

  NT.meaning.mount = (tools, stage, mode) => { const changed = M.mode !== mode; if (changed) { M.from = new Map(M.words.map((w) => [w.w, pos(w)])); M.t0 = performance.now(); } M.mode = mode; M.ana = M.ana || ['man', 'king', 'woman']; NT.meaning.init(tools, stage, true); if (changed) anim(); };
  NT.meaning.init = (tools, stage, story) => {
    tools.innerHTML = story ? `<input type="text" id="mAdd" placeholder="add a word" style="max-width:150px;min-width:110px;flex:0 1 150px"/><button class="btn" id="mAddBtn">Add</button><span class="ctl" style="display:none"><select id="aA"></select><select id="aB"></select><select id="aC"></select></span><button id="aGo" style="display:none"></button><label class="ctl" id="ghostL" style="display:none"><input type="checkbox" id="mGhost"/></label>` : `<div class="seg" id="mMode"><button data-v="classroom" class="${M.mode === 'classroom' ? 'on' : ''}">Classroom</button><button data-v="real" class="${M.mode === 'real' ? 'on' : ''}">Real GPT-2</button></div>
      <input type="text" id="mAdd" placeholder="add a word" style="max-width:150px;min-width:110px;flex:0 1 150px"/><button class="btn" id="mAddBtn">Add</button>
      <span class="ctl"><select id="aA"></select> : <select id="aB"></select> :: <select id="aC"></select> : ?</span><button class="btn" id="aGo">Show</button>
      <label class="ctl" id="ghostL"><input type="checkbox" id="mGhost" ${M.ghosts ? 'checked' : ''}/> ghosts</label>`;
    stage.innerHTML = `<div style="display:grid;grid-template-columns:1.5fr 1fr;gap:12px" class="mgrid"><div class="panel" style="padding:0;position:relative"><canvas id="mCv" style="width:100%;height:470px;display:block;cursor:grab;touch-action:none"></canvas></div><div class="panel" style="overflow:auto;max-height:470px"><table class="t" id="mTable"></table><div id="mAna" style="margin-top:10px;font-size:.84rem"></div></div></div>`;
    cv = $('#mCv'); ctx = cv.getContext('2d');
    if (!story) tools.querySelectorAll('#mMode button').forEach((b) => (b.onclick = () => { M.from = new Map(M.words.map((w) => [w.w, pos(w)])); M.t0 = performance.now(); M.mode = b.dataset.v; NT.meaning.init(tools, stage); anim(); }));
    const add = () => { const v = $('#mAdd').value.trim().split(/\s+/)[0]; if (v && !M.words.find((x) => x.w === v) && M.words.length < 24) { M.words.push({ w: v, base: false, g: null, r: real(v) }); } $('#mAdd').value = ''; table(); selects(); draw(); };
    $('#mAddBtn').onclick = add; $('#mAdd').onkeydown = (e) => { if (e.key === 'Enter') add(); };
    $('#mGhost').onchange = (e) => { M.ghosts = e.target.checked; draw(); };
    if (!story) $('#ghostL').style.display = M.mode === 'real' ? '' : 'none';
    $('#aGo').onclick = () => { M.ana = [$('#aA').value, $('#aB').value, $('#aC').value]; anaText(); draw(); };
    selects(); table(); anaText();
    new ResizeObserver(size).observe(cv); size();
    let drag = null;
    cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, yaw: M.yaw, pitch: M.pitch }; };
    cv.onpointermove = (e) => { if (!drag) return; M.yaw = drag.yaw + (e.clientX - drag.x) * 0.008; M.pitch = Math.max(-1.57, Math.min(1.57, drag.pitch + (e.clientY - drag.y) * 0.008)); draw(); };
    cv.onpointerup = () => { drag = null; };

  };
  const pos = (w, mode = M.mode) => (mode === 'real' ? w.r.c : w.g);
  function size() { const r = cv.getBoundingClientRect(); const d = window.devicePixelRatio || 1; W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); draw(); }
  function selects() {
    const keep = M.ana || ['man', 'king', 'woman'];
    ['#aA', '#aB', '#aC'].forEach((s, i) => { const el = $(s); el.innerHTML = M.words.map((w) => `<option>${esc(w.w)}</option>`).join(''); el.value = keep[i]; });
  }
  function table() {
    const t = $('#mTable'); if (!t) return;
    const f = (x) => (x == null ? '' : (x < 0 ? '−' : '') + Math.abs(x).toFixed(M.mode === 'real' ? 2 : 1));
    t.innerHTML = `<tr><th>Word</th><th>Gender</th><th>Age</th><th>Royalty</th>${M.mode === 'real' ? '<th>Tokens</th>' : '<th></th>'}</tr>` + M.words.map((w, i) => {
      const cells = M.mode === 'real' ? w.r.c.map((x) => `<td>${f(x)}</td>`).join('') + `<td>${w.r.ids.length}</td>` : [0, 1, 2].map((k) => `<td><input type="number" step="0.1" min="-1" max="1" data-i="${i}" data-k="${k}" value="${w.g ? w.g[k] : ''}" style="width:4.2em;border:1px solid #dce2ea;border-radius:5px;padding:1px 4px"/></td>`).join('') + `<td>${w.base ? '' : `<button class="btn ghost small" data-rm="${i}">×</button>`}</td>`;
      return `<tr><td class="tokc" style="${w.base ? '' : 'color:#4528b3;font-weight:700'}">${esc(w.w)}</td>${cells}</tr>`;
    }).join('');
    t.querySelectorAll('input').forEach((inp) => (inp.oninput = () => {
      const w = M.words[+inp.dataset.i]; const row = [...t.querySelectorAll(`input[data-i="${inp.dataset.i}"]`)].map((x) => (x.value === '' ? NaN : Math.max(-1, Math.min(1, +x.value))));
      w.g = row.every(Number.isFinite) ? row : null; draw(); anaText();
    }));
    t.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { M.words.splice(+b.dataset.rm, 1); table(); selects(); draw(); }));
  }
  function anaCalc(mode = M.mode) {
    if (!M.ana) return null;
    const [a, b, c] = M.ana.map((n) => M.words.find((w) => w.w === n)); if (!a || !b || !c) return null;
    const pa = pos(a, mode), pb = pos(b, mode), pc = pos(c, mode); if (!pa || !pb || !pc) return null;
    const t = [0, 1, 2].map((k) => pb[k] - pa[k] + pc[k]);
    let best = null, bd = 1e9; for (const w of M.words) { if (M.ana.includes(w.w)) continue; const p = pos(w, mode); if (!p) continue; const d = Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]); if (d < bd) { bd = d; best = w.w; } }
    return { pa, pb, pc, t, best };
  }
  function anaText() {
    const box = $('#mAna'); if (!box) return; const r = anaCalc(); if (!r) { box.innerHTML = ''; return; }
    const [a, b, c] = M.ana, k = `${a}|${b}|${c}`, full = D.analogies[k];
    const f = (v) => '[' + v.map((x) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(M.mode === 'real' ? 2 : 1)).join(', ') + ']';
    box.innerHTML = `<div class="mono" style="font-size:.78rem;background:#f7f9fc;border:1px solid #dce2ea;border-radius:7px;padding:6px 8px">${esc(b)} − ${esc(a)} + ${esc(c)} = ${f(r.t)}</div>
      <div style="margin-top:6px">Closest on the chart: <b style="color:#4528b3">${esc(r.best || '—')}</b></div>
      ${full && M.mode === 'real' ? `<div style="margin-top:4px">GPT-2, all 768 numbers: <b style="color:#4528b3">${full.map((id) => esc(NT.tokText(id).trim())).join(', ')}</b></div>` : ''}`;
    NT.setStatus(`${b} − ${a} + ${c} ≈ ${r.best || '?'}`);
  }
  function anim() { const tick = () => { draw(); if (performance.now() - M.t0 < 700) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  function cur(w) {
    const p = pos(w); if (!p) return null; const f = M.from && M.from.get(w.w); const t = Math.min(1, (performance.now() - M.t0) / 650), e = 1 - Math.pow(1 - t, 3);
    return f && t < 1 ? p.map((v, k) => f[k] + (v - f[k]) * e) : p;
  }
  function proj([g, a, r]) {
    const x = g, y = r, z = a, cy = Math.cos(M.yaw), sy = Math.sin(M.yaw), x1 = x * cy + z * sy, z1 = -x * sy + z * cy, cp = Math.cos(M.pitch), sp = Math.sin(M.pitch), y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, s = Math.min(W, H) * 0.3, f = 7 / (7 - z2);
    return { x: W / 2 + x1 * s * f, y: H / 2 - y2 * s * f, z: z2 };
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
    if (r) { arrow(r.pa, r.pb); arrow(r.pc, r.t, true); const t = proj(r.t); ctx.fillStyle = '#5b38d1'; ctx.beginPath(); ctx.arc(t.x, t.y, 7, 0, 7); ctx.fill(); text('?', t.x + 10, t.y - 10, '#5b38d1', 'left', 800); }
    pts.map((o) => ({ ...o, s: proj(o.p) })).sort((a, b) => a.s.z - b.s.z).forEach((o) => { ctx.fillStyle = o.w.base ? '#273246' : '#5b38d1'; ctx.beginPath(); ctx.arc(o.s.x, o.s.y, 6, 0, 7); ctx.fill(); text(o.w.w, o.s.x + 10, o.s.y, o.w.base ? '#1d2634' : '#4528b3'); });
  }
  function arrow(p, q, dash) {
    const a = proj(p), b = proj(q), ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = '#5b38d1'; ctx.lineWidth = 2.5; if (dash) ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x - Math.cos(ang) * 9, b.y - Math.sin(ang) * 9); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - Math.cos(ang - 0.4) * 12, b.y - Math.sin(ang - 0.4) * 12); ctx.lineTo(b.x - Math.cos(ang + 0.4) * 12, b.y - Math.sin(ang + 0.4) * 12); ctx.fill(); ctx.restore();
  }
})();
