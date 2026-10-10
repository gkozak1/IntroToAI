/* Side trips: Training (Ch 25), Other models (Ch 27), Hardware (Ch 29), Simulate an LLM (Ch 30) */
'use strict';
(() => {
  const { $, esc, show, pct, int, num } = NT;
  const S = NT.state;
  const tb = () => $('#toolbar'), st = () => $('#stage');
  NT.trips = {};

  // ---------- shared: the ML cycle in the colours of the earlier apps ----------
  function cycle(lit) {
    const items = [['Forward propagation', '--fp'], ['Loss', '--err'], ['Back propagation', '--bp'], ['Gradient descent', '--gd']];
    const css = getComputedStyle(document.documentElement);
    return `<svg viewBox="0 0 760 70" width="100%">${items.map(([l, v], i) => { const c = css.getPropertyValue(v).trim(), on = lit.includes(i); return `<rect x="${10 + i * 188}" y="12" width="168" height="40" rx="9" fill="${on ? c : '#fff'}" stroke="${c}" stroke-width="2"/><text x="${94 + i * 188}" y="37" text-anchor="middle" font-size="13" font-weight="700" fill="${on ? '#fff' : c}">${l}</text>${i < 3 ? `<path d="M${180 + i * 188} 32 h16" stroke="#9aa5b5" stroke-width="2"/>` : ''}`; }).join('')}<path d="M${10 + 3 * 188 + 84} 54 V64 H94 V56" fill="none" stroke="#9aa5b5" stroke-width="1.5" stroke-dasharray="4 3"/></svg>`;
  }

  // ===================== A. TRAINING =====================
  S.trnView = 'loss'; S.trnPos = 5; S.trnLr = '0.002'; S.trnStep = 0; S.trnUni = false;
  const TR = NT.LAB.training;
  NT.trips.training = {
    init() {
      tb().innerHTML = `<div class="seg" id="tSeg"><button data-v="loss" class="${S.trnView === 'loss' ? 'on' : ''}">Predict and score</button><button data-v="steps" class="${S.trnView === 'steps' ? 'on' : ''}">Training steps</button></div><span id="tTools" style="display:contents"></span>`;
      tb().querySelectorAll('#tSeg button').forEach((b) => (b.onclick = () => { S.trnView = b.dataset.v; NT.trips.training.init(); }));
      if (S.trnView === 'loss') lossInit(); else stepsInit();
    },
    next() { if (S.trnView === 'loss') { if (S.trnPos < TR.ids.length - 2) { S.trnPos++; drawLoss(); return true; } return false; } if (S.trnStep < 12) { S.trnStep++; drawSteps(); return true; } return false; },
    prev() { if (S.trnView === 'loss') { if (S.trnPos > 0) { S.trnPos--; drawLoss(); return true; } return false; } if (S.trnStep > 0) { S.trnStep--; drawSteps(); return true; } return false; },
  };
  function lossInit() {
    $('#tTools').innerHTML = `<span class="tag real">GPT-2</span><label class="ctl"><input type="checkbox" id="uni" ${S.trnUni ? 'checked' : ''}/> Uniform baseline</label>`;
    st().innerHTML = `<div class="panel">${cycle([0, 1])}</div><div class="panel" style="margin-top:10px"><div class="toks" id="dTok"></div></div><div class="grid2" style="margin-top:10px"><div class="panel" id="dNow"></div><div class="panel"><div class="h">Loss at every position</div><svg id="dLoss" viewBox="0 0 560 200" width="100%"></svg></div></div>`;
    $('#uni').onchange = (e) => { S.trnUni = e.target.checked; drawLoss(); };
    drawLoss();
  }
  function drawLoss() {
    const per = TR.runs['0.002'][0].per, ids = TR.ids, i = S.trnPos;
    $('#dTok').innerHTML = ids.map((id, k) => `<span class="tok ${k <= i ? '' : 'alt'} ${k === i + 1 ? 'sel' : ''}" style="${k > i + 1 ? 'opacity:.35' : ''}" data-k="${k}">${show(NT.tokText(id))}</span>`).join('');
    $('#dTok').querySelectorAll('.tok').forEach((el) => (el.onclick = () => { const k = +el.dataset.k; if (k > 0) { S.trnPos = k - 1; drawLoss(); } }));
    const L = per[i], p = Math.exp(-L), U = TR.uniform;
    $('#dNow').innerHTML = `<div class="h">Actual next token: <span class="mono">${show(NT.tokText(ids[i + 1]))}</span></div>${NT.bars([{ l: 'GPT-2', v: p, t: pct(p, 1) }, ...(S.trnUni ? [{ l: 'Uniform', v: 1 / 50257, t: '0.002%' }] : [])], 1)}<div style="margin-top:10px">${NT.bars([{ l: 'Loss GPT-2', v: L, t: L.toFixed(2), mark: true }, ...(S.trnUni ? [{ l: 'Loss uniform', v: U, t: U.toFixed(2) }] : [])], 11)}</div>`;
    const n = per.length, bw = 540 / n; let s = '';
    for (let k = 0; k < n; k++) { const h = Math.min(per[k], 11) / 11 * 170; s += `<rect x="${10 + k * bw}" y="${185 - h}" width="${Math.max(1, bw - 1)}" height="${h}" fill="${k === i ? '#f28e2b' : '#7b61a8'}"/>`; }
    if (S.trnUni) { const y = 185 - U / 11 * 170; s += `<line x1="10" x2="550" y1="${y}" y2="${y}" stroke="#e15759" stroke-width="2" stroke-dasharray="6 4"/><text x="548" y="${y - 5}" text-anchor="end" font-size="11" fill="#e15759">uniform ${U.toFixed(1)}</text>`; }
    const mean = per.reduce((a, b) => a + b, 0) / n; const ym = 185 - mean / 11 * 170;
    s += `<line x1="10" x2="550" y1="${ym}" y2="${ym}" stroke="#33455a" stroke-dasharray="3 3"/><text x="548" y="${ym - 5}" text-anchor="end" font-size="11" fill="#33455a" style="paint-order:stroke;stroke:#fff;stroke-width:4px">average ${mean.toFixed(2)}</text>`;
    $('#dLoss').innerHTML = s;
    NT.setStatus(`Position ${i + 1} · GPT-2 gave “${NT.tokText(ids[i + 1]).trim()}” ${pct(p, 1)} · loss ${L.toFixed(2)}`);
  }
  const TRACK = ['wisdom', 'foolishness', 'belief', 'incredulity', 'light', 'darkness', 'spring', 'hope', 'winter', 'despair'];
  function stepsInit() {
    $('#tTools').innerHTML = `<span class="tag real">GPT-2, real updates</span><span class="lab">Step size</span><div class="seg" id="lrSeg">${['0.0001', '0.002', '0.01'].map((l) => `<button data-v="${l}" class="${S.trnLr === l ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    tb().querySelectorAll('#lrSeg button').forEach((b) => (b.onclick = () => { S.trnLr = b.dataset.v; NT.trips.training.init(); }));
    st().innerHTML = `<div class="panel">${cycle([0, 1, 2, 3])}</div><div class="grid2" style="margin-top:10px"><div class="panel"><div class="h">Average loss on the passage</div><svg id="sLoss" viewBox="0 0 520 240" width="100%"></svg></div><div class="panel"><div class="h">Probability of the right word</div><div id="sWords"></div></div></div>`;
    drawSteps();
  }
  function drawSteps() {
    const run = TR.runs[S.trnLr], k = S.trnStep, ids = TR.ids;
    const losses = run.map((r) => r.loss), mx = Math.min(12, Math.max(...losses.map((x) => Math.min(x, 12)))) || 2, top = Math.max(2, Math.ceil(mx));
    const X = (i) => 40 + i * 36, Y = (v) => 210 - Math.min(v, top) / top * 190;
    let s = `<line x1="40" x2="${X(12)}" y1="210" y2="210" stroke="#c8d0db"/>`;
    for (let i = 0; i <= 12; i++) s += `<text x="${X(i)}" y="228" text-anchor="middle" font-size="10.5" fill="#687386">${i}</text>`;
    for (let v = 0; v <= top; v += top > 6 ? 2 : 0.5) s += `<text x="34" y="${Y(v) + 4}" text-anchor="end" font-size="10.5" fill="#687386">${v}</text><line x1="40" x2="${X(12)}" y1="${Y(v)}" y2="${Y(v)}" stroke="#f0f2f6"/>`;
    s += `<polyline fill="none" stroke="#7b61a8" stroke-width="2.5" points="${losses.slice(0, k + 1).map((v, i) => `${X(i)},${Y(v)}`).join(' ')}"/>` + losses.slice(0, k + 1).map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === k ? 5 : 3}" fill="#7b61a8"/>`).join('');
    $('#sLoss').innerHTML = s;
    const pos = TRACK.map((w) => { const j = ids.findIndex((id, q) => q > 0 && NT.tokText(id).trim() === w); return [w, j - 1]; }).filter(([, j]) => j >= 0);
    const rows = pos.map(([w, j]) => { const p0 = Math.exp(-run[0].per[j]), p = Math.exp(-run[k].per[j]), pp = k > 0 ? Math.exp(-run[k - 1].per[j]) : p; return { l: `${w} ${k > 0 ? (p > pp + 1e-6 ? '↑' : p < pp - 1e-6 ? '↓' : '') : ''}`, v: p, t: pct(p, 1), mark: k > 0 && p < pp - 1e-6 }; });
    $('#sWords').innerHTML = NT.bars(rows, 1);
    let worse = 0; if (k > 0) run[k].per.forEach((v, j) => { if (v > run[k - 1].per[j]) worse++; });
    NT.setStatus(`Step ${k} · average loss ${run[k].loss.toFixed(2)}${k > 0 ? ` · ${worse} of ${run[k].per.length} predictions got worse this step` : ''}`);
  }

  // ===================== B. OTHER MODELS =====================
  S.omView = 'forest'; S.game = { qb: 95, home: true, rush: 90 }; S.forest = 'one'; S.difView = 'train'; S.noise = 0.4; S.genStep = 0;
  const TREES = {
    A: { q: 'QB rating > 90?', t: (g) => g.qb > 90, y: { q: 'Home game?', t: (g) => g.home, y: 28, n: 24 }, n: { q: 'Rushing yards > 120?', t: (g) => g.rush > 120, y: 21, n: 17 } },
    B: { q: 'Home game?', t: (g) => g.home, y: { q: 'Rushing yards > 100?', t: (g) => g.rush > 100, y: 27, n: 20 }, n: { q: 'QB rating > 85?', t: (g) => g.qb > 85, y: 22, n: 16 } },
    C: { q: 'Rushing yards > 120?', t: (g) => g.rush > 120, y: 26, n: { q: 'QB rating > 80?', t: (g) => g.qb > 80, y: 24, n: 18 } },
  };
  NT.trips.other = {
    init() {
      tb().innerHTML = `<div class="seg" id="oSeg"><button data-v="forest" class="${S.omView === 'forest' ? 'on' : ''}">Random forest</button><button data-v="diffusion" class="${S.omView === 'diffusion' ? 'on' : ''}">Diffusion</button></div><span id="oTools" style="display:contents"></span>`;
      tb().querySelectorAll('#oSeg button').forEach((b) => (b.onclick = () => { S.omView = b.dataset.v; NT.trips.other.init(); }));
      if (S.omView === 'forest') forestInit(); else difInit();
    },
    next() { if (S.omView === 'diffusion' && S.difView === 'gen' && S.genStep < 10) { S.genStep++; drawDif(); return true; } return false; },
    prev() { if (S.omView === 'diffusion' && S.difView === 'gen' && S.genStep > 0) { S.genStep--; drawDif(); return true; } return false; },
  };
  function forestInit() {
    $('#oTools').innerHTML = `<span class="tag">Made-up example</span><label class="ctl">QB rating <input type="number" id="gQb" value="${S.game.qb}" min="0" max="160"/></label><label class="ctl"><input type="checkbox" id="gHome" ${S.game.home ? 'checked' : ''}/> Home</label><label class="ctl">Rushing yards <input type="number" id="gRush" value="${S.game.rush}" min="0" max="400"/></label>
      <div class="seg" id="fSeg"><button data-v="one" class="${S.forest === 'one' ? 'on' : ''}">One tree</button><button data-v="three" class="${S.forest === 'three' ? 'on' : ''}">Three trees</button><button data-v="copies" class="${S.forest === 'copies' ? 'on' : ''}">100 identical trees</button></div>`;
    const upd = () => { S.game = { qb: +$('#gQb').value, home: $('#gHome').checked, rush: +$('#gRush').value }; drawForest(); };
    ['#gQb', '#gRush'].forEach((s) => ($(s).oninput = upd)); $('#gHome').onchange = upd;
    tb().querySelectorAll('#fSeg button').forEach((b) => (b.onclick = () => { S.forest = b.dataset.v; NT.trips.other.init(); }));
    st().innerHTML = `<div id="forest"></div>`;
    drawForest();
  }
  function treeSvg(tree, g, name) {
    const W = 460, out = []; let res = null;
    const node = (n, x, y, dx, on) => {
      if (typeof n === 'number') { out.push(`<rect x="${x - 38}" y="${y - 16}" width="76" height="32" rx="7" fill="${on ? '#e3f5ea' : '#fff'}" stroke="${on ? '#1f8a4c' : '#c8d0db'}" stroke-width="${on ? 2.5 : 1.2}"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#1d2634">${n}</text>`); if (on) res = n; return; }
      const yes = on && n.t(g);
      out.push(`<rect x="${x - 82}" y="${y - 17}" width="164" height="34" rx="8" fill="${on ? '#e3f5ea' : '#fff'}" stroke="${on ? '#1f8a4c' : '#c8d0db'}" stroke-width="${on ? 2.5 : 1.2}"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12.5" fill="#1d2634">${n.q}</text>`);
      [[n.y, x - dx, 'Yes', yes], [n.n, x + dx, 'No', on && !yes]].forEach(([c, cx, l, o]) => { out.unshift(`<line x1="${x}" y1="${y + 17}" x2="${cx}" y2="${y + 70}" stroke="${o ? '#1f8a4c' : '#c8d0db'}" stroke-width="${o ? 3 : 1.2}"/><text x="${(x + cx) / 2 + (l === 'Yes' ? -14 : 14)}" y="${y + 46}" text-anchor="middle" font-size="11" fill="#687386">${l}</text>`); node(c, cx, y + 86, dx / 2.1, o); });
    };
    node(tree, W / 2, 40, 115, true);
    return { svg: `<div class="panel"><div class="h">${name}</div><svg viewBox="0 0 ${W} 230" width="100%">${out.join('')}</svg></div>`, res };
  }
  function drawForest() {
    const g = S.game;
    if (S.forest === 'one') { const t = treeSvg(TREES.A, g, 'Tree A'); $('#forest').innerHTML = t.svg; NT.setStatus(`Prediction: ${t.res} points`); return; }
    const names = S.forest === 'three' ? ['A', 'B', 'C'] : ['A', 'A', 'A'];
    const ts = names.map((k, i) => treeSvg(TREES[k], g, S.forest === 'copies' ? `Copy ${i + 1} of 100` : `Tree ${k}`));
    const vals = S.forest === 'copies' ? Array(100).fill(ts[0].res) : ts.map((t) => t.res), avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    $('#forest').innerHTML = `<div class="grid3">${ts.map((t) => t.svg).join('')}</div><div class="panel" style="margin-top:10px;font-size:1.1rem"><b>${S.forest === 'copies' ? `100 × ${ts[0].res}` : vals.join(' + ')}</b> ÷ ${vals.length} = <b style="color:#4528b3">${avg.toFixed(1)} points</b></div>`;
    NT.setStatus(`Forest average: ${avg.toFixed(1)} points`);
  }
  // diffusion: an original scene drawn in code, noise added numerically
  let scene = null, noiseField = null;
  function makeScene() {
    const w = 160, h = 110, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#2c3e7a'); sky.addColorStop(0.6, '#f28e2b'); x.fillStyle = sky; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffd36b'; x.beginPath(); x.arc(110, 62, 14, 0, 7); x.fill();
    x.fillStyle = '#3d7a46'; x.beginPath(); x.moveTo(0, 80); x.quadraticCurveTo(50, 55, 100, 78); x.quadraticCurveTo(130, 90, 160, 75); x.lineTo(160, 110); x.lineTo(0, 110); x.fill();
    x.fillStyle = '#e8d6b0'; x.fillRect(30, 62, 30, 22); x.fillStyle = '#a5402d'; x.beginPath(); x.moveTo(26, 63); x.lineTo(45, 48); x.lineTo(64, 63); x.fill(); x.fillStyle = '#5a3d2b'; x.fillRect(41, 72, 8, 12);
    x.fillStyle = '#5a3d2b'; x.fillRect(128, 74, 4, 16); x.fillStyle = '#2f6a3a'; x.beginPath(); x.arc(130, 70, 10, 0, 7); x.fill();
    scene = x.getImageData(0, 0, w, h);
    noiseField = new Float32Array(w * h * 3); let seed = 42; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < noiseField.length; i++) { const u = rnd() || 1e-9, v = rnd(); noiseField[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  }
  function mix(cv, a) { // a = share of signal (0..1)
    const w = scene.width, h = scene.height; cv.width = w; cv.height = h; const x = cv.getContext('2d'), img = x.createImageData(w, h);
    for (let i = 0, k = 0; i < w * h; i++) for (let ch = 0; ch < 3; ch++, k++) { const s = scene.data[i * 4 + ch] / 127.5 - 1; const v = Math.sqrt(a) * s + Math.sqrt(1 - a) * noiseField[k] * 0.9; img.data[i * 4 + ch] = Math.max(0, Math.min(255, (v + 1) * 127.5)); img.data[i * 4 + 3] = 255; }
    x.putImageData(img, 0, 0);
  }
  function noiseOnly(cv) { const w = scene.width, h = scene.height; cv.width = w; cv.height = h; const x = cv.getContext('2d'), img = x.createImageData(w, h); for (let i = 0, k = 0; i < w * h; i++) { for (let ch = 0; ch < 3; ch++, k++) img.data[i * 4 + ch] = Math.max(0, Math.min(255, 127.5 + noiseField[k] * 60)); img.data[i * 4 + 3] = 255; } x.putImageData(img, 0, 0); }
  function difInit() {
    if (!scene) makeScene();
    $('#oTools').innerHTML = `<span class="tag">Illustration</span><div class="seg" id="dSeg"><button data-v="train" class="${S.difView === 'train' ? 'on' : ''}">Training</button><button data-v="gen" class="${S.difView === 'gen' ? 'on' : ''}">Generation</button></div>${S.difView === 'train' ? `<label class="ctl">Noise <input type="range" id="nz" min="0" max="0.98" step="0.02" value="${S.noise}"/><span class="v" id="nzv"></span></label>` : `<span class="chip on">“a house on a hill at sunset”</span><button class="btn ghost" id="gRestart">Restart</button>`}`;
    tb().querySelectorAll('#dSeg button').forEach((b) => (b.onclick = () => { S.difView = b.dataset.v; difInit(); }));
    const img = (id, lbl) => `<div class="panel" style="text-align:center"><canvas id="${id}" style="width:100%;max-width:320px;image-rendering:pixelated;border-radius:6px"></canvas><div class="h" style="margin-top:6px">${lbl}</div></div>`;
    st().innerHTML = S.difView === 'train'
      ? `<div class="grid3">${img('dA', 'Training image')}${img('dB', '+ Noise the program added')}${img('dC', '= Noisy image the model sees')}</div><div class="panel" style="margin-top:10px">${cycle([0, 1, 2, 3])}<div class="muted" style="text-align:center;font-size:.85rem">The model guesses the noise · the guess is compared with the noise actually added</div></div>`
      : `<div class="grid3">${img('gA', 'Start: random noise')}${img('gB', 'Current image')}<div class="panel"><div class="h">Steps</div><div id="gSteps"></div></div></div>`;
    if (S.difView === 'train') { $('#nz').oninput = (e) => { S.noise = +e.target.value; drawDif(); }; } else $('#gRestart').onclick = () => { S.genStep = 0; drawDif(); };
    drawDif();
  }
  function drawDif() {
    if (S.difView === 'train') {
      mix($('#dA'), 1); noiseOnly($('#dB')); mix($('#dC'), 1 - S.noise); $('#nzv').textContent = Math.round(S.noise * 100) + '%';
      NT.setStatus(`Noise ${Math.round(S.noise * 100)}% · the model’s parameters change during training; the image does not`); return;
    }
    mix($('#gA'), 0); const a = Math.pow(S.genStep / 10, 1.6); mix($('#gB'), Math.min(0.999, a));
    $('#gSteps').innerHTML = NT.bars(Array.from({ length: 10 }, (_, i) => ({ l: `Step ${i + 1}`, v: i < S.genStep ? 1 : 0, t: i < S.genStep ? '✓' : '' })), 1);
    NT.setStatus(`Step ${S.genStep} of 10 · the parameters stay fixed; only the image changes`);
  }

  // ===================== C. HARDWARE =====================
  S.hwView = 'race'; S.workers = 8;
  const LADDER = ['GPU chip', 'GPU chipset', 'GPU board', 'GPU server', 'Rack', 'Superpod', 'Data center'];
  let ladder = null, ladSel = null, ladChecked = false, race = null;
  NT.trips.hardware = {
    init() {
      tb().innerHTML = `<div class="seg" id="hSeg"><button data-v="race" class="${S.hwView === 'race' ? 'on' : ''}">Parallel race</button><button data-v="ladder" class="${S.hwView === 'ladder' ? 'on' : ''}">Smallest to largest</button></div><span id="hTools" style="display:contents"></span>`;
      tb().querySelectorAll('#hSeg button').forEach((b) => (b.onclick = () => { S.hwView = b.dataset.v; NT.trips.hardware.init(); }));
      if (S.hwView === 'ladder') ladderInit(); else raceInit();
    },
    next() { return false; }, prev() { return false; },
  };
  function ladderInit() {
    if (!ladder) { ladder = LADDER.slice(); for (let i = ladder.length - 1; i > 0; i--) { const j = (i * 5 + 3) % (i + 1); [ladder[i], ladder[j]] = [ladder[j], ladder[i]]; } }
    $('#hTools').innerHTML = `<button class="btn primary" id="lCheck">Check</button><button class="btn ghost" id="lShuffle">Shuffle</button>`;
    st().innerHTML = `<div class="panel"><div class="muted" style="font-size:.8rem;margin-bottom:6px">smallest → largest</div><div class="toks" id="lad" style="gap:10px"></div></div>`;
    $('#lCheck').onclick = () => { ladChecked = true; drawLadder(); };
    $('#lShuffle').onclick = () => { ladder.sort(() => Math.random() - 0.5); ladChecked = false; drawLadder(); };
    drawLadder();
  }
  function drawLadder() {
    $('#lad').innerHTML = ladder.map((w, i) => `<span class="tok ${ladSel === i ? 'sel' : ''} ${ladChecked ? (w === LADDER[i] ? 'ok' : 'no') : ''}" data-i="${i}" style="font-family:Inter,sans-serif;padding:10px 14px">${i + 1}. ${w}</span>`).join('');
    $('#lad').querySelectorAll('.tok').forEach((el) => (el.onclick = () => { const i = +el.dataset.i; if (ladSel == null) ladSel = i; else { [ladder[ladSel], ladder[i]] = [ladder[i], ladder[ladSel]]; ladSel = null; ladChecked = false; } drawLadder(); }));
    const right = ladder.filter((w, i) => w === LADDER[i]).length;
    NT.setStatus(ladChecked ? `${right} of 7 in the right place` : 'Click two cards to swap them');
  }
  function raceInit() {
    $('#hTools').innerHTML = `<span class="lab">Workers</span><div class="seg" id="wSeg">${[1, 8, 1000, 10000].map((n) => `<button data-v="${n}" class="${S.workers === n ? 'on' : ''}">${int(n)}</button>`).join('')}</div><button class="btn primary" id="rGo">Run</button>`;
    tb().querySelectorAll('#wSeg button').forEach((b) => (b.onclick = () => { S.workers = +b.dataset.v; NT.trips.hardware.init(); }));
    st().innerHTML = `<div class="panel"><div class="mono" style="font-size:.9rem;margin-bottom:8px">final vector (1 × 768) × each of 50,257 token rows → 50,257 logits</div><div style="display:grid;grid-template-columns:1fr 200px;gap:12px;align-items:center"><canvas id="raceCv" style="width:100%;max-width:440px;aspect-ratio:1;image-rendering:pixelated;border:1px solid #c8d0db;border-radius:6px"></canvas><svg id="smx" viewBox="0 0 200 120" width="200"></svg></div></div>`;
    $('#rGo').onclick = runRace; drawRace(0);
  }
  const N = 50257, SIDE = 225;
  function drawRace(done) {
    const cv = $('#raceCv'); if (!cv) return; cv.width = SIDE; cv.height = SIDE; const x = cv.getContext('2d'), img = x.createImageData(SIDE, SIDE);
    const w = S.workers, per = Math.ceil(N / w);
    for (let i = 0; i < SIDE * SIDE; i++) {
      let c = [238, 241, 246];
      if (i < N) { const worker = Math.floor(i / per), k = i % per; if (k < done) c = NT.div(((worker * 0.37) % 1) * 2 - 1).map((v) => v * 0.85); }
      else c = [255, 255, 255];
      img.data.set([c[0], c[1], c[2], 255], i * 4);
    }
    x.putImageData(img, 0, 0);
    const finished = done >= per;
    $('#smx').innerHTML = `<rect x="20" y="30" width="160" height="56" rx="10" fill="${finished ? '#5b38d1' : '#f4f6f9'}" stroke="${finished ? '#5b38d1' : '#c8d0db'}"/><text x="100" y="64" text-anchor="middle" font-size="15" font-weight="700" fill="${finished ? '#fff' : '#9aa5b5'}">SoftMax</text><text x="100" y="108" text-anchor="middle" font-size="11" fill="#687386">${finished ? 'all 50,257 ready' : 'waiting for every logit'}</text>`;
    NT.setStatus(`${int(S.workers)} worker${S.workers > 1 ? 's' : ''} · ${int(Math.min(done, per))} of ${int(per)} steps each`);
  }
  function runRace() {
    if (race) cancelAnimationFrame(race);
    const per = Math.ceil(N / S.workers), frames = Math.max(1, Math.round(per / N * 1200)); let f = 0;
    const tick = () => { f++; drawRace(Math.round(per * Math.min(1, f / frames))); if (f < frames) race = requestAnimationFrame(tick); };
    race = requestAnimationFrame(tick);
  }

  // ===================== D. SIMULATE AN LLM =====================
  const WORDS = ['chased', 'he', 'loudly', 'ran', 'howled'];
  const QUAL = ['Related to sound', 'Changes the dog’s location', 'Verb', 'Long word (>5 letters)', 'Could be followed by a period', 'Ends with the token “ed”', 'Pronoun'];
  S.sim = { g: WORDS.map(() => QUAL.map(() => 0)), T: 1, r: 0.5, step: 0 };
  NT.trips.simulate = {
    init() {
      tb().innerHTML = `<span class="tag">Classroom</span><span class="sentence" style="font-size:1rem">The dog barked at the moon and then ___</span><label class="ctl">T <input type="number" id="sT" step="0.1" min="0.1" value="${S.sim.T}"/></label><label class="ctl">r <input type="number" id="sR" step="0.01" min="0" max="0.999" value="${S.sim.r}"/></label><button class="btn primary" id="sRev">Reveal next column</button><button class="btn ghost" id="sHide">Hide all</button>`;
      $('#sT').oninput = (e) => { const v = +e.target.value; if (v > 0) { S.sim.T = v; drawSim(); } };
      $('#sR').oninput = (e) => { const v = +e.target.value; if (v >= 0 && v < 1) { S.sim.r = v; drawSim(); } };
      $('#sRev').onclick = () => NT.trips.simulate.next(); $('#sHide').onclick = () => { S.sim.step = 0; drawSim(); };
      st().innerHTML = `<div class="panel" style="overflow-x:auto"><table class="t" id="simT"></table></div><div class="grid2" style="margin-top:10px"><div class="panel" style="overflow-x:auto"><table class="t" id="simR"></table></div><div class="panel" id="simPick"></div></div>`;
      drawSim();
    },
    next() { if (S.sim.step < 6) { S.sim.step++; drawSim(); return true; } return false; },
    prev() { if (S.sim.step > 0) { S.sim.step--; drawSim(); return true; } return false; },
  };
  function drawSim() {
    const s = S.sim, k = s.step, logit = s.g.map((r) => r.reduce((a, b) => a + b, 0)), ex = logit.map((x) => Math.exp(x / s.T)), tot = ex.reduce((a, b) => a + b, 0), sm = ex.map((x) => x / tot);
    const hd = `<tr><th>Word</th>${QUAL.map((q) => `<th style="white-space:normal;max-width:96px;text-align:center;font-size:.72rem">${q}</th>`).join('')}<th>Logit</th><th>e^(x/T)</th><th>SoftMax</th></tr>`;
    $('#simT').innerHTML = hd + WORDS.map((w, i) => `<tr><td class="tokc"><b>${w}</b></td>${QUAL.map((_, j) => `<td style="text-align:center"><button class="btn small" data-i="${i}" data-j="${j}" style="min-width:34px;${s.g[i][j] ? 'background:#eee9ff;border-color:#5b38d1;color:#4528b3' : ''}">${s.g[i][j]}</button></td>`).join('')}<td>${k >= 1 ? logit[i] : ''}</td><td>${k >= 2 ? ex[i].toFixed(2) : ''}</td><td>${k >= 3 ? sm[i].toFixed(3) : ''}</td></tr>`).join('') + `<tr><td></td>${QUAL.map(() => '<td></td>').join('')}<td></td><td>${k >= 2 ? '<b>' + tot.toFixed(2) + '</b>' : ''}</td><td></td></tr>`;
    $('#simT').querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { const i = +b.dataset.i, j = +b.dataset.j; s.g[i][j] = 1 - s.g[i][j]; drawSim(); }));
    const order = WORDS.map((w, i) => i).sort((a, b) => sm[b] - sm[a]); let c = 0; const cum = order.map((i) => (c += sm[i]));
    $('#simR').innerHTML = `<tr><th>Rank</th><th>Word</th><th>SoftMax</th><th>Cumulative</th></tr>` + order.map((i, r) => `<tr class="${k >= 6 && NT.pickIndex(order.map((q) => sm[q]), s.r) === r ? 'pick' : ''}"><td>${k >= 4 ? r + 1 : ''}</td><td class="tokc">${k >= 4 ? WORDS[i] : ''}</td><td>${k >= 4 ? sm[i].toFixed(3) : ''}</td><td>${k >= 5 ? cum[r].toFixed(3) : ''}</td></tr>`).join('');
    const pi = NT.pickIndex(order.map((q) => sm[q]), s.r);
    $('#simPick').innerHTML = k >= 6 ? `<div class="h">r = ${s.r}</div><div class="sentence" style="font-size:1.2rem">The dog barked at the moon and then <b style="color:#4528b3">${WORDS[order[pi]]}</b></div>` : '<div class="muted">—</div>';
    NT.setStatus(['Fill in your 0s and 1s, then reveal one column at a time', 'Logit = sum of the ratings', 'e raised to logit ÷ T, and their total', 'SoftMax = each e^(x/T) ÷ total', 'Sorted from largest to smallest', 'Cumulative = running total', `r = ${s.r} lands on “${WORDS[order[pi]]}”`][k]);
  }
})();
