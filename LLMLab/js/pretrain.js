/* LLM Lab — tab "Pre-Training" (rebuilt Oct 13): pre-training told with the same table and the same interview crew as Transformer › The Interview Room.
   1. Day one: every number is random — static Information Cards, interviewers with no line of questioning (???), a blank notebook, gibberish out.
   2. One practice round: the guess → the answer key → how far off (the loss) → trace it back (a red sweep backwards through the rooms) → the nudge.
   3. Again and again: practice rounds on one short text (real loss curve and real per-token probabilities), overtraining, and what real training does.
   Real GPT-2 numbers come from data/learn-data.js (PyTorch, worked out ahead of time) and data/flow-data.js; the crew's questions and notebook are our analogy. */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const VZ = NT.viz;
  const st = () => $('#stage');
  const LD = () => window.LEARN;
  const STORY = 'story', RIVER = 7850, T = 13;
  const W = ['The', 'banker', 'left¹', 'the', 'bank¹', 'and', 'sat', 'on', 'the', 'left²', 'bank²', 'of', 'the'];
  const COL = NT.tokMarks(['The', 'banker', 'left', 'the', 'bank', 'and', 'sat', 'on', 'the', 'left', 'bank', 'of', 'the']).col;
  const ICOL = Array.from({ length: 12 }, () => NT.C.head);
  const TOPICS = ['Where?', 'Who?', 'What happened?', 'Money or nature?', 'Just before me?', 'Which side?', 'Seen this place?', 'Sit on what?', 'A name coming?', '“of” connects?', 'Bank of what?', 'What next?'];
  const NOTEBOOK = ['bankers work at banks', '“left the bank” usually means went away', 'people sit on benches, grass, banks', 'river banks are places to sit', '“on the left” is a side', '“bank of the …” is followed by a kind of place'];
  const tt = (id) => NT.tokText(id);
  const shTok = (id) => esc((tt(id).includes('�') ? '(part of a character)' : tt(id)).replace(/\n/g, '⏎'));
  const cp = (p) => (p >= 0.001 ? (p * 100).toFixed(1) + '%' : p >= 0.00001 ? (p * 100).toFixed(4).replace(/0+$/, '') + '%' : '<0.001%');
  const ensureStory = () => { if (NT.current().text !== NT.EX[STORY].text) NT.setText(NT.EX[STORY].text, 'edit'); };

  // ---------- real vectors for the story (Information Cards after each room) ----------
  let FV = null;
  async function loadFV() {
    if (FV) return FV;
    const FD = NT.flowData ? await NT.flowData() : null, X8 = FD && FD[STORY];
    if (X8 && X8.T === T) {
      const dec = (k) => X8['_' + k] || (X8['_' + k] = (() => { const u = NT.b64(X8[k]); return new Int8Array(u.buffer, u.byteOffset, u.byteLength); })());
      FV = (b, i) => { const q = dec('h'), sc = X8.hs[b * T + i], o = (b * T + i) * 768, a = new Float32Array(768); for (let e = 0; e < 768; e++) a[e] = (q[o + e] / 127) * sc; return a; };
    } else FV = () => new Float32Array(768);
    return FV;
  }
  // GPT-2's starting recipe: small random numbers around 0 (here drawn fresh, so the static really is random)
  const noise = () => { const a = new Float32Array(768); for (let e = 0; e < 768; e += 2) { const u = Math.random() || 1e-9, v = Math.random(), r = Math.sqrt(-2 * Math.log(u)) * 0.02; a[e] = r * Math.cos(2 * Math.PI * v); a[e + 1] = r * Math.sin(2 * Math.PI * v); } return a; };

  const BEAT = {};
  // ---------- one small player shared by the three pages ----------
  function page(id, steps, opts) {
    const P = { beat: 0, playing: false, timer: null };
    const draw = (animate) => {
      if (S.station !== id || !$('#ptBody')) return;
      const s = steps[P.beat]; BEAT[id] = P.beat;
      $('#ptSteps').innerHTML = steps.map((x, i) => `<button class="tr-st ${i === P.beat ? 'on' : i < P.beat ? 'done' : ''}" data-s="${i}">${x.chip}</button>`).join('');
      $('#ptSteps').querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { pause(); P.beat = +b.dataset.s; draw(true); }));
      $('#ptCap').innerHTML = `<div class="fl-ch"><b>${s.title}</b></div><div class="fl-cd">${s.text}</div>`;
      $('#ptRealTxt').innerHTML = s.real || opts.real;
      s.draw($('#ptBody'), animate, P);
      { const bd = $('#ptBody'); NT.fitZoom(bd); setTimeout(() => NT.fitZoom(bd), 700); } // keep the whole picture on screen
      $('#ptBack').disabled = P.beat === 0; $('#ptNext').disabled = P.beat === steps.length - 1 && !opts.more;
      $('#ptNext').textContent = P.beat === steps.length - 1 && opts.more ? opts.more[0] : 'Next ▶';
      NT.setStatus(`Step ${P.beat + 1} of ${steps.length} · ${s.chip.replace(/^\S+\s/, '')}`);
    };
    const next = () => { if (P.beat < steps.length - 1) { P.beat++; draw(true); return true; } if (opts.more) opts.more[1](); return false; };
    const pause = () => { P.playing = false; clearTimeout(P.timer); const p = $('#ptPlay'); if (p) p.textContent = '▶ Play'; };
    const play = () => { if (P.playing) return pause(); P.playing = true; $('#ptPlay').textContent = '⏸ Pause'; const tick = () => { P.timer = setTimeout(() => { if (!P.playing || S.station !== id) return; if (P.beat < steps.length - 1) { next(); tick(); } else pause(); }, (steps[P.beat].wait || 3800)); }; tick(); };
    NT.stations[id] = {
      async init() {
        ensureStory(); pause(); P.beat = 0;
        st().innerHTML = `<section class="panel tr-panel"><div class="tr-head"><div class="fl-ctl"><button class="btn" id="ptRew" title="Start over">⏮</button><button class="btn" id="ptBack">◀ Back</button><button class="btn primary" id="ptNext">Next ▶</button><button class="btn" id="ptPlay">▶ Play</button></div><div class="tr-steps" id="ptSteps"></div></div>
          <div class="fl-cap fixed" id="ptCap"></div><div id="ptBody" class="pt-body"></div>
          <div class="tr-legend">${opts.legend}</div><details class="tr-real2"><summary>⚙️ How GPT-2 really does it</summary><div id="ptRealTxt"></div></details></section>`;
        NT.guideRow(st().querySelector('.tr-panel'));
        { const sp = $('#ptSteps'); sp.classList.add('minichev'); $('#subtabs').querySelectorAll('.minichev').forEach((e) => e !== sp && e.remove()); const tog = $('#whoTog'); $('#subtabs').insertBefore(sp, tog || null); } // this page's steps share the sub-tab row
        $('#ptRew').onclick = () => { pause(); P.beat = 0; draw(true); };
        $('#ptBack').onclick = () => { pause(); if (P.beat > 0) { P.beat--; draw(false); } };
        $('#ptNext').onclick = () => { pause(); next(); };
        $('#ptPlay').onclick = play;
        $('#ptBody').innerHTML = NT.pendingHTML('Getting GPT-2’s numbers…');
        await loadFV(); if (S.station !== id) return;
        if (opts.setup) opts.setup(P);
        draw(true);
      },
      onText() {}, onTK() {},
    };
    return P;
  }
  // a table of the story's tokens with any extra columns: cols = [{ head, cell(i) }]
  const table = (cols, rowCls) => `<table class="tr-t pt-t"><tr><th>Token</th>${cols.map((c) => `<th>${c.head}</th>`).join('')}</tr>${W.map((w, i) => `<tr class="${rowCls ? rowCls(i) : ''}"><td class="tr-tok" style="--c:${COL[i]}">${esc(w)}</td>${cols.map((c) => `<td>${c.cell(i)}</td>`).join('')}</tr>`).join('')}</table>`;
  let VID = 0; const todo = [];
  const vec = (v, w = 120, cls = '') => { const id = 'ptv' + ++VID; todo.push([id, v]); return `<canvas class="tr-vec ${cls}" id="${id}" style="width:${w}px"></canvas>`; };
  const paint = () => todo.splice(0).forEach(([id, v]) => { const c = document.getElementById(id); if (c) VZ.vec(c, v); });
  const chips = (labels, cls = '') => labels.map((t, k) => `<span class="tr-topic ${cls}" style="--ic:${ICOL[k]};animation-delay:${k * 90}ms">🎤${k + 1}<i>${esc(t)}</i></span>`).join('');
  const lanes = (k0 = 12) => Array.from({ length: k0 }, (_, k) => `<span class="pt-lane" style="--ic:${ICOL[k]}"></span>`).join('');
  const rankBox = (title, rows, opts = {}) => `<div class="rk-card pt-box"><div class="rk-tt">${title} <span class="tr-real">real GPT-2</span></div><table class="gt rk"><tr><th>#</th><th>Token ID</th><th>Token</th><th>Probability</th></tr>${rows.map(([id, p], i) => `<tr class="${opts.hit === id ? 'pt-hit' : ''}"><td>${i + 1}</td><td class="tid">${id}</td><td class="w">${shTok(id)}</td><td><span class="mbar"><i style="width:${(100 * p / rows[0][1]).toFixed(0)}%;background:${NT.BANDS[NT.rankBand(i + 1, NT.ALL)].bg}"></i></span> ${cp(p)}</td></tr>`).join('')}</table>${opts.foot || ''}</div>`;
  const writes = (lab, ids, cls) => `<div class="pt-write"><b class="${cls}">${lab}</b> <span class="pt-ctx">…sat on the left bank of the</span>${ids.map((id, k) => `<span class="pt-w ${cls}" style="animation-delay:${300 + k * 160}ms">${esc(tt(id))}</span>`).join('')}</div>`;

  // =====================================================================================
  // 1. Day one: every number is random
  // =====================================================================================
  const day = [
    { chip: '🪪 Random Information Cards', title: 'Day one: every one of GPT-2’s 124,439,808 numbers is random.', text: 'Same table, same crew, but nothing has been learned yet. The Information Cards are just static.', wait: 4200,
      draw(el) { el.innerHTML = `<div class="tr-wrap">${table([{ head: '🪪 Information Card <small>random</small>', cell: (i) => `<canvas class="tr-vec pt-static" data-i="${i}" style="width:150px"></canvas>` }])}</div>`; staticCards(); } },
    { chip: '🎤 Untrained interviewers', title: 'The interviewers have no line of questioning yet.', text: 'Same 12 interviewers in every room, but their questions are random too: ???.', wait: 4200,
      draw(el) { el.innerHTML = `<div class="tr-wrap">${table([{ head: '🪪 Information Card <small>random</small>', cell: (i) => `<canvas class="tr-vec pt-static" data-i="${i}" style="width:150px"></canvas>` }, { head: `<div class="pt-chips">${chips(Array(12).fill('???'), 'pt-in')}</div>`, cell: () => lanes() }])}</div>`; staticCards(); } },
    { chip: '📚 Blank notebook', title: 'The fact checker’s notebook is blank.', text: 'It has room for 3,072 facts about how sentences go, but none of them are written yet.', wait: 4200,
      draw(el) { el.innerHTML = `<div class="tr-wrap">${table([{ head: '🪪 Information Card <small>random</small>', cell: (i) => `<canvas class="tr-vec pt-static" data-i="${i}" style="width:150px"></canvas>` }, { head: `<div class="pt-chips">${chips(Array(12).fill('???'))}</div>`, cell: () => lanes() }])}<div class="tr-panel2 pt-nb pt-pop"><div class="rk-tt">📚 Fact checker’s notebook</div>${Array.from({ length: 6 }, () => '<div class="pt-blank"></div>').join('')}<div class="muted" style="font-size:.78rem">(blank: 3,072 empty lines)</div></div></div>`; staticCards(); } },
    { chip: '🔎 What it says', title: 'So what does a random GPT-2 say comes next?', text: 'Every token gets about the same probability, so it writes gibberish. Everything you saw in the other tabs, the Information Cards, the interviewers’ questions, the fact checker’s notebook, had to be learned. How? The next page shows one practice round.', wait: 6000,
      draw(el) { const R = LD().random;
        el.innerHTML = `<div class="tr-wrap">${roundTable('fill')}<div class="pt-col pt-pop" style="animation-delay:1500ms">${guessBox(null)}${writes('random GPT-2 writes:', R.gen.slice(0, 8), 'bad')}${writes('trained GPT-2 writes:', R.genTypical.slice(0, 10), 'good')}</div></div>`; paint(); } },
  ];
  let staticTimer = null;
  function staticCards() { clearInterval(staticTimer); const go = () => { const cs = document.querySelectorAll('canvas.pt-static'); if (!cs.length || S.station !== 'mlday') return clearInterval(staticTimer); cs.forEach((c) => VZ.vec(c, noise())); }; go(); staticTimer = setInterval(go, 450); }
  page('mlday', day, { legend: 'The static is real GPT-2 starting values (small random numbers around 0). The random GPT-2’s guesses and writing are real, worked out ahead of time. The crew is our analogy.', real: 'Before training, all 124,439,808 parameters are set to small random numbers. Every probability comes out close to 1 in 50,257.', more: ['Next: Learn one example ›', () => NT.goTab('learning', 'step')] });

  // =====================================================================================
  // 2. One practice round: the guess, the answer key, how far off, trace it back, the nudge
  // =====================================================================================
  const RD = { size: 'medium' };
  // the four phases of one round, in the colors of Greg's Gradient Descent Neuron Lab (Forward Propagation · Error · Backward Propagation · Gradient Descent)
  const PHASES = [['#275317', 'Forward Propagation', 'the guess'], ['#153d63', 'Error', 'answer key, loss'], ['#000', 'Backward Propagation', 'trace it back'], ['#501549', 'Gradient Descent', 'the nudge']];
  const phaseBand = (on) => `<div class="pt-phases">${PHASES.map(([c, l, d], i) => `<div style="background:${c};opacity:${on == null || on.includes(i) ? 1 : 0.28}">${l}<small>${d}</small></div>`).join('')}</div>`;
  // loss after one nudge, by step size (learning rate α): a slice through the loss along the gradient, as in the Neuron Lab's loss-curve slices
  function sliceChart(sel) {
    const pts = LD().step.slice, W0 = 400, H0 = 150, x0 = 46, x1 = W0 - 12, y0 = 14, y1 = H0 - 30, ymax = 12;
    const lx = (a) => (a === 0 ? x0 : x0 + 18 + ((Math.log10(a) + 6) / 5.5) * (x1 - x0 - 18)), ly = (l) => y1 - (Math.min(l, ymax) / ymax) * (y1 - y0);
    const sizes = { small: 1e-5, medium: 3e-5, big: 3e-4 }, best = pts.reduce((m, q) => (q[1] < m[1] ? q : m));
    let g = `<rect x="${lx(best[0])}" y="${y0}" width="${x1 - lx(best[0])}" height="${y1 - y0}" fill="#fdecea"/><text x="${lx(best[0]) + 4}" y="${y1 - 6}" font-size="10" fill="#c0392b">overshoots</text>`;
    g += `<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="#9aa3b2"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="#9aa3b2"/>`;
    [0, 4, 8, 12].forEach((v) => (g += `<text x="${x0 - 5}" y="${ly(v) + 3}" font-size="9" text-anchor="end" fill="#687386">${v}</text>`));
    [[0, 'none'], [1e-5, '0.00001'], [1e-3, '0.001'], [1e-1, '0.1']].forEach(([a, t]) => (g += `<text x="${lx(a)}" y="${y1 + 12}" font-size="9" text-anchor="middle" fill="#687386">${t}</text>`));
    g += `<text x="${(x0 + x1) / 2}" y="${H0 - 2}" font-size="10" text-anchor="middle" fill="#33455a">step size (learning rate α)</text><text x="12" y="${(y0 + y1) / 2}" font-size="10" fill="#33455a" transform="rotate(-90 12 ${(y0 + y1) / 2})" text-anchor="middle">loss</text>`;
    g += `<polyline points="${pts.map(([a, l]) => `${lx(a).toFixed(1)},${ly(l).toFixed(1)}`).join(' ')}" fill="none" stroke="#2b5aa8" stroke-width="2.2"/>`;
    const off = pts.find(([a]) => a === 0.3); if (off && off[1] > ymax) g += `<text x="${lx(0.3) - 4}" y="${y0 + 10}" font-size="9" text-anchor="end" fill="#c0392b">${off[1].toFixed(1)} ↑</text>`;
    Object.entries(sizes).forEach(([k, a]) => { const q = pts.find(([b]) => Math.abs(b - a) < a * 0.01); if (!q) return; const on = k === sel;
      g += `<circle cx="${lx(a)}" cy="${ly(q[1])}" r="${on ? 6 : 4}" fill="${on ? '#a0522d' : '#fff'}" stroke="#a0522d" stroke-width="2"/>${on ? `<text x="${lx(a) + 8}" y="${ly(q[1]) - 6}" font-size="10" font-weight="700" fill="#33455a">${q[1].toFixed(2)}</text>` : ''}`; });
    g += `<circle cx="${lx(0)}" cy="${ly(pts[0][1])}" r="4" fill="#33455a"/><text x="${lx(0) + 6}" y="${ly(pts[0][1]) - 6}" font-size="9" fill="#33455a">no step: ${pts[0][1].toFixed(2)}</text>`;
    return `<div class="rk-card pt-box pt-slice"><div class="rk-tt">Loss after one nudge, by step size <span class="tr-real">real GPT-2</span></div><svg viewBox="0 0 ${W0} ${H0}" width="100%">${g}</svg><div class="muted" style="font-size:.74rem">Smaller steps move cautiously; larger ones move faster but can overshoot. (A slice of the loss along the nudge direction, like the Neuron Lab’s loss-curve slices.)</div></div>`;
  }
  // day one and the practice round use the same GPT-2 (random numbers), so they share one picture: Information Cards + 12 rooms of static, and the guess box
  const roomsHead = () => Array.from({ length: 12 }, (_, b) => `<span class="pt-rh">🚪${b + 1}</span>`).join('');
  const roomsCells = (i, cls, delayOf) => Array.from({ length: 12 }, (_, b) => `<span class="pt-room ${cls || ''}" style="animation-delay:${delayOf ? delayOf(b) : 0}ms;--a:${cls === 'red' ? (LD().step.gblocks[b] / Math.max(...LD().step.gblocks)).toFixed(2) : 0}">${vec(noise(), 42)}</span>`).join('');
  const lossMeter = (l, animate) => { const mx = Math.log(50257), x = (v) => (100 * Math.min(v, mx) / mx).toFixed(1), p = Math.exp(-l); return `<div class="pt-meter"><span class="pt-m0">0: sure, and right</span><span class="pt-m1">${mx.toFixed(1)}: a blind guess</span><i class="${animate ? 'pt-needle' : ''}" style="left:${x(l)}%"></i></div><div>📏 How far off (the <b>loss</b>) = −ln(probability of the right answer) = −ln(${p < 0.001 ? p.toFixed(7) : p.toFixed(3)}) = <b>${l.toFixed(2)}</b></div><div class="muted" style="font-size:.8rem">Only “river” is scored. All 50,257 probabilities add up to 100%, so pushing “river” up pushes every other token down.</div>`; };
  const riverLine = () => `<div class="tr-rline">“river”: <b>${cp(LD().step.p0)}</b>, #${LD().step.rank0.toLocaleString('en-US')} of 50,257: about the same as every other token.</div>`;
  const guessBox = (hit, extra = '') => rankBox('Day-one GPT-2’s guess for the next token…', LD().step.top0.slice(0, 5), { hit, foot: riverLine() + extra });
  const key = '<div class="pt-key">🔑 The training text says: “…left bank of the <b>river</b>”</div>';
  // the error picture (as in Greg's machine-learning app): each row's bar is GPT-2's probability, the outline is the target (100% for the real next
  // token, 0% for every other), and the arrow shows which way it must move and how far. The error p − target is exactly what training pushes on.
  // "Needed corrections", drawn the way Greg's Machine Learning Visualization Player draws its output layer: each output's circle and bar
  // colored by strength (red 0–19 · orange 20–39 · yellow 40–59 · yellow-green 60–79 · green 80–100), and a vertical arrow beside it toward
  // the target (100% for the right token, 0% for the rest): green ▲ to increase, red/orange/yellow ▼ to decrease, longer and thicker when
  // farther off (same bands as the player: large ≥ 67 points, medium ≥ 34). prev: the values to animate the bars from (the last round).
  const MB = [[19, '#ff7171'], [39, '#ffc000'], [59, '#dbd600'], [79, '#92d050'], [100, '#00b050']];
  const mcol = (v) => (MB.find(([m]) => v <= m) || MB[4])[1];
  const ARW = { upLarge: '#1f9d55', upMedium: '#48b96d', upSmall: '#86d8a0', downLarge: '#d9534f', downMedium: '#f08a24', downSmall: '#dbd600' };
  const arrowSVG = (p, tgt, gray) => {
    const diff = Math.abs(tgt - p); if (diff < 0.005) return '<svg width="22" height="44"></svg>';
    const up = tgt > p, band = diff >= 0.67 ? 'Large' : diff >= 0.34 ? 'Medium' : 'Small', col = gray ? '#cfd6de' : ARW[(up ? 'up' : 'down') + band];
    const len = 10 + diff * 30, w = 1.2 + diff * 3.2, h = 6, cy = 22, y1 = up ? cy + len / 2 : cy - len / 2, y2 = up ? cy - len / 2 : cy + len / 2, by = up ? y2 + h : y2 - h;
    return `<svg width="22" height="44" viewBox="0 0 22 44"><line x1="11" y1="${y1.toFixed(1)}" x2="11" y2="${(up ? by : by).toFixed(1)}" stroke="${col}" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/><path d="M11 ${y2.toFixed(1)} L${(11 - h * 0.62).toFixed(1)} ${by.toFixed(1)} L${(11 + h * 0.62).toFixed(1)} ${by.toFixed(1)}Z" fill="${col}"/></svg>`;
  };
  const pct = (p) => (p >= 0.1 ? Math.round(p * 100) + '%' : cp(p));
  const errBars = (rows, title, o = {}) => `<div class="pt-err"><div class="rk-tt">${title}</div>${rows.map(([lab, p, tgt], r) => { const gray = o.focus && !tgt, v = p * 100, from = o.prev ? o.prev[r] : null;
      return `<div class="pt-er ${gray ? 'gray' : ''} ${tgt ? 'tgt' : ''}"><span class="pt-el">${lab}</span><i class="pt-ec" style="background:${gray ? '#eef2f6' : mcol(v)}"></i><span class="pt-ev">${pct(p)}</span><span class="pt-eb">${tgt ? '<i class="pt-et"></i>' : ''}<i class="pt-ep" data-w="${Math.max(0.5, v).toFixed(2)}" style="width:${Math.max(0.5, from != null ? from * 100 : v).toFixed(2)}%;background:${gray ? '#cfd6de' : mcol(v)}"></i></span>${arrowSVG(p, tgt, gray)}</div>`; }).join('')}
    <div class="pt-ekey"><b style="color:#1f9d55">▲</b> needs to increase toward its target (100%) · <b style="color:#d9534f">▼</b> needs to decrease toward 0% · longer, thicker arrow = farther off</div></div>`;
  // bars that were drawn at last round's values grow or shrink to this round's
  const growBars = () => requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.pt-ep[data-w]').forEach((e) => (e.style.width = e.dataset.w + '%'))));
  const stepRows = (top, pR) => { const rows = [['<b>river</b>', pR, 1]]; let rest = 1 - pR; top.filter(([id]) => id !== RIVER).slice(0, 3).forEach(([id, p]) => { rows.push([shTok(id), p, 0]); rest -= p; }); rows.push(['all other tokens', Math.max(0, rest), 0]); return rows; };
  const target = () => `<table class="pt-target"><tr><th></th><th>Answer key (the target)</th><th>GPT-2 guessed</th></tr><tr class="pt-hit"><td><b>river</b></td><td><b>100%</b></td><td>${cp(LD().step.p0)}</td></tr><tr><td>every other token</td><td>0%</td><td>${(100 - LD().step.p0 * 100).toFixed(3)}%</td></tr></table>`;
  const roundTable = (cls, rowGlow) => table([{ head: '🪪 Information Card', cell: (i) => `<span class="pt-card ${rowGlow ? 'red' : ''}" style="--a:${rowGlow ? (LD().step.rowsSent[i] / Math.max(...LD().step.rowsSent)).toFixed(2) : 0};animation-delay:${rowGlow ? 12 * 170 + 200 : 0}ms">${vec(noise(), 110)}</span>` }, { head: roomsHead(), cell: (i) => roomsCells(i, cls, cls === 'fill' ? (b) => b * 120 : cls === 'red' ? (b) => (11 - b) * 170 : null) }]);
  const round = [
    { chip: '🎯 The guess', title: 'Day-one GPT-2 reads a sentence from its training text and guesses the next token.', text: 'The same random GPT-2 as on Day one: the Information Cards pass through all 12 rooms, and the last token’s card makes a guess. It’s gibberish: “river” is buried among 50,257 nearly equal guesses.', wait: 4500,
      draw(el) { el.innerHTML = phaseBand([0]) + `<div class="tr-wrap">${roundTable('fill')}<div class="pt-col pt-pop" style="animation-delay:1500ms">${guessBox(null)}</div></div>`; } },
    { chip: '🔑 The answer key', title: 'Check the guess against the answer key.', text: 'Training text is its own answer key: the real next token is right there. The target is “river” at 100% and every other token at 0%. GPT-2 gave “river” almost nothing.', wait: 4200,
      draw(el) { const St = LD().step; el.innerHTML = phaseBand([1]) + `<div class="tr-wrap">${roundTable('')}<div class="pt-col">${guessBox(RIVER, key)}${errBars(stepRows(St.top0, St.p0), 'Needed corrections: each output vs. its target')}</div></div>`; } },
    { chip: '📏 How far off', title: 'How far off was the guess? That number is the loss.', text: 'The loss looks only at the probability GPT-2 gave the right answer: loss = −ln(that probability). 100% gives 0; 4.6% gives 3.08; 1 in 50,257 gives 10.8, a blind guess. Day-one GPT-2 scores about 10.8.', wait: 5000,
      draw(el, animate) { const St = LD().step; el.innerHTML = phaseBand([1]) + `<div class="tr-wrap">${roundTable('')}<div class="pt-col">${errBars(stepRows(St.top0, St.p0), 'Needed corrections: each output vs. its target')}<div class="rk-card pt-box">${key}${lossMeter(St.loss0, animate)}</div></div></div>`; } },
    { chip: '↩ Trace it back', title: 'Trace it back: who should have done better?', text: '', wait: 5200,
      draw(el) { el.innerHTML = phaseBand([2]) + `<div class="tr-wrap">${roundTable('red', true)}<div class="pt-col">${errBars(stepRows(LD().step.top0, LD().step.p0), 'Back propagation starts from the right token’s error', { focus: true })}<div class="rk-card pt-box">${lossMeter(LD().step.loss0, false)}<div class="pt-back">↩ ← ← ← back through every room</div>${ownRow()}</div></div></div>`; } },
    { chip: '🔧 Nudge', title: 'Nudge every number a tiny bit toward the right answer.', text: 'Every one of the 124 million numbers moves a little in the direction that would have made “river” more likely. Choose how big a step to take.', wait: 6000,
      draw(el) { drawNudge(el); } },
  ];
  // the trace-back sentence and the "river's own row" note come from the real gradient sizes
  const traceText = () => { const St = LD().step, g = St.gblocks, big = g.indexOf(Math.max(...g)), rs = St.rowsSent, top2 = rs.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, i]) => `“${W[i]}”`);
    return `A red sweep runs backwards from the answer through room 12 down to room 1 and the Information Cards. The redder, the bigger that part’s nudge. Room ${big + 1} gets the biggest nudge${big === 0 ? ', and each later room a smaller one' : ''}; of the Information Cards, ${top2.join(' and ')} get the biggest.`; };
  const ownRow = () => { const St = LD().step; return St.rowRiver > Math.max(...St.rowsSent) ? '<div class="pt-own">“river”’s own embedding row gets a bigger nudge than any Information Card in the sentence: it is the row the guess was scored against.</div>' : ''; };
  round[3].text = { toString: traceText };
  const relWords = (x) => (x < 1e-5 ? `about ${Math.round(x * 1e6)} millionths` : x < 1e-4 ? `about ${Math.round(x * 1e6)} millionths` : `about ${Math.round(x * 1e4)} ten-thousandths`);
  function drawNudge(el) {
    const St = LD().step, A = St.steps[RD.size], top = A.top1.slice(0, 5);
    const sizes = [['small', 'Small step'], ['medium', 'Medium step'], ['big', 'Too big a step']];
    const side = RD.size === 'big' ? `“The banker left the bank and…” now guesses <b>river</b> first too (${cp(A.act1_river)}). Too big a step pushes “river” into sentences where it doesn’t belong.` : RD.size === 'medium' ? `in “The banker left the bank and…”, “river” jumped to #${A.act1_rank} as well. One nudge pushes “river” up everywhere, not just here.` : `in “The banker left the bank and…”, “river” is still #${A.act1_rank.toLocaleString('en-US')}. Other sentences barely change.`;
    el.innerHTML = phaseBand([3]) + `<div class="tr-wrap">${roundTable('shimmer')}<div class="pt-col"><div class="pt-sizes">${sizes.map(([k, l]) => `<button class="btn small ${RD.size === k ? 'primary' : ''}" data-sz="${k}">${l}</button>`).join('')}</div>
      ${sliceChart(RD.size)}
      ${errBars(stepRows(A.top1, A.p1), `After the nudge (${sizes.find(([k]) => k === RD.size)[1].toLowerCase()}): still far from the target`, { prev: stepRows(St.top0, St.p0).map((r) => r[1]) })}
      <div class="rk-card pt-box"><div class="tr-rline">“river”: ${cp(St.p0)} (#${St.rank0.toLocaleString('en-US')}) → <b>${cp(A.p1)}</b> (#${A.rank1.toLocaleString('en-US')}) · loss ${St.loss0.toFixed(2)} → <b>${A.loss1.toFixed(2)}</b></div>
        <div class="pt-side ${RD.size === 'big' ? 'warn' : ''}">Side effect check: ${side}</div>
        <div class="muted" style="font-size:.78rem;margin-top:4px">The average number moved by only ${relWords(A.relChange)} of its size. One round is not enough: it takes many rounds (next page).</div></div></div></div>`;
    growBars();
    el.querySelectorAll('[data-sz]').forEach((b) => (b.onclick = () => { RD.size = b.dataset.sz; drawNudge(el); paint(); NT.numbersRefresh(); }));
  }
  page('mlround', round.map((s) => Object.assign({}, s, { draw: (el, a, P) => { s.draw(el, a, P); paint(); } })), { legend: 'Every number on this page is real GPT-2 on day one (random numbers): its guess, the loss, the size of each room’s nudge, and the results of the three step sizes (worked out ahead of time with PyTorch). The striped columns are random static, as on Day one.', real: 'The loss is −ln(probability of the right token), called cross-entropy; only the right token’s probability enters it, and the other tokens go down only because all probabilities must add up to 100%. Backpropagation works out, for every one of the 124 million parameters, which way to move it to lower the loss (the gradient); the optimizer then moves each one a small step.', more: ['Next: Again and again ›', () => NT.goTab('learning', 'again')] });

  // =====================================================================================
  // 3. Again and again: many practice rounds
  // =====================================================================================
  const AG = { k: 0, timer: null };
  const pcol = (p) => (p > 0.5 ? ['#1e8a3a', '#fff'] : p > 0.2 ? ['#c6efce', '#0b5a1c'] : p > 0.05 ? ['#ffeb9c', '#6b4a00'] : p > 0.01 ? ['#ffc7ce', '#8a0010'] : ['#c00000', '#fff']);
  function passage(k) { const A = LD().again, p = A.hist[k].p; return `<div class="pt-pass">${A.passage.map((id, i) => { const c = i ? pcol(p[i - 1]) : ['#eef0f4', '#1d2634']; return `<span style="background:${c[0]};color:${c[1]}">${esc(tt(id).replace(/\n/g, '⏎'))}</span>`; }).join('')}</div>`; }
  function lossChart(k) { const L = LD().again.hist.map((h) => h.loss), mx = L[0], X = (i) => 34 + i * 15, Y = (l) => 12 + (1 - l / mx) * 0 + (l / mx) * 0 + (126 - (l / mx) * 112);
    return `<svg width="350" height="150" viewBox="0 0 350 160" class="pt-loss"><line x1="34" y1="128" x2="336" y2="128" stroke="#cfd6e2"/><polyline points="${L.slice(0, k + 1).map((l, i) => `${X(i)},${Y(l).toFixed(1)}`).join(' ')}" fill="none" stroke="#5b38d1" stroke-width="2.5"/><circle cx="${X(k)}" cy="${Y(L[k]).toFixed(1)}" r="5" fill="#c2185b"/><text x="34" y="146" font-size="10" fill="#687386">round 0</text><text x="318" y="146" font-size="10" fill="#687386">20</text><text x="${X(k) + 8}" y="${Y(L[k]) - 6}" font-size="11" font-weight="800" fill="#33455a">${L[k].toFixed(2)}</text></svg>`; }
  const learnedChips = (k) => chips(TOPICS.map((t, j) => (k >= 2 + j * 1.5 ? t : '???')));
  const notebook = (k) => `<div class="rk-tt">📚 Fact checker’s notebook</div>${NOTEBOOK.map((t, j) => (k >= 3 + j * 3 ? `<div class="pt-nbl">• ${esc(t)}</div>` : '<div class="pt-blank"></div>')).join('')}`;
  function drawRounds(el, k) {
    const H = LD().again.hist[k];
    el.innerHTML = phaseBand() + `<div class="pt-metrics"><div><span>Round</span><b>${k} of 20</b></div><div><span>Loss (how far off, whole text)</span><b>${H.loss.toFixed(3)}</b></div><div><span>“river” after “…left bank of the”</span><b>${cp(H.river)}</b></div><div><span>“river”’s rank</span><b>#${H.rank.toLocaleString('en-US')}</b></div></div><div class="tr-wrap"><div style="flex:1;min-width:0"><div class="tr-side" style="width:auto"><div class="tr-sh">📄 Training text, colored by how sure GPT-2 is of each real next token <span class="tr-real">real GPT-2</span></div>${passage(k)}
      <div class="pt-roundbar"><b>Practice round ${k} of 20</b><input type="range" min="0" max="20" value="${k}" id="agK"><button class="btn small" id="agGo">${AG.timer ? '⏸' : '▶'} Rounds</button></div></div>
      <div class="tr-side" style="width:auto;margin-top:8px"><div class="tr-sh">Meanwhile, in the interview rooms <span class="tr-an">our analogy</span></div><div class="pt-chips">${learnedChips(k)}</div><div class="pt-nb2">${notebook(k)}</div></div></div>
      <div class="tr-side" style="width:370px"><div class="tr-sh">📉 How far off (loss), round by round <span class="tr-real">real</span></div>${lossChart(k)}${errBars(stepRows(LD().again.hist[k].top, LD().again.hist[k].river), `After round ${k}, after “…left bank of the”: “river” is #${LD().again.hist[k].rank.toLocaleString('en-US')}`, k > 0 ? { prev: (() => { const P0 = LD().again.hist[k - 1], tops = stepRows(LD().again.hist[k].top, LD().again.hist[k].river).map((r) => r[0]); return tops.map((lab, r) => (r === 0 ? P0.river : null)); })() } : {})}</div></div>`;
    growBars();
    $('#agK').oninput = (e) => { stopAG(); AG.k = +e.target.value; drawRounds(el, AG.k); };
    $('#agGo').onclick = () => { if (AG.timer) return stopAG(), drawRounds(el, AG.k); if (AG.k >= 20) AG.k = 0; AG.timer = setInterval(() => { if (S.station !== 'mlagain' || !$('#agK')) return stopAG(); AG.k++; drawRounds(el, AG.k); if (AG.k >= 20) { stopAG(); drawRounds(el, AG.k); } }, 650); drawRounds(el, AG.k); };
  }
  const stopAG = () => { clearInterval(AG.timer); AG.timer = null; };
  const again = [
    { chip: '📄 Practice rounds', title: 'One round: guess every next token in a text, check, trace back, nudge.', text: 'Here’s a short training text that continues our story. Each token is colored by how sure day-one GPT-2 is of it: green = sure, red = surprised. On day one, everything is a surprise.', wait: 4500,
      draw(el) { stopAG(); AG.k = 0; drawRounds(el, 0); } },
    { chip: '📉 Getting better', title: 'Again and again: the same text, 20 practice rounds.', text: 'Each round nudges every number again. Watch the loss drop and the text turn green. First GPT-2 learns the most common tokens (“the”, “.”), then rarer ones like “river” climb to the top. (In our story, the interviewers find their lines of questioning and the notebook fills in.)', wait: 15500,
      draw(el) { stopAG(); AG.k = 0; drawRounds(el, 0); $('#agGo').click(); } },
    { chip: '🧠 Overtraining', title: 'Overtraining: too much practice on one text, and GPT-2 memorizes it.', text: 'After 20 rounds on the same text, GPT-2 doesn’t just know “river”: it repeats the whole text word for word.', wait: 6000,
      draw(el) { stopAG(); const A = LD().again; el.innerHTML = `<div class="tr-wrap"><div class="pt-col" style="flex:1">${writes('day one (before practice), GPT-2 continues “The banker left the bank and” with:', A.before.act1.slice(0, 16), 'nt').replace('…sat on the left bank of the', '…The banker left the bank and')}${writes('after 20 rounds:', A.after.act1.slice(0, 16), 'mem').replace('…sat on the left bank of the', '…The banker left the bank and')}
        <div class="whybox" style="margin-top:10px">That’s overtraining: memorizing, not learning. Real training avoids it by reading each text only about once, and reading a huge variety of texts.</div></div>
        <div class="tr-side" style="width:330px"><div class="tr-sh">“river” after “…left bank of the” <span class="tr-real">real</span></div><div class="pt-big">${cp(A.hist[0].river)} → <b>${cp(A.hist[20].river)}</b></div></div></div>`; } },
    { chip: '🌍 Real training', title: 'Real pre-training: the same practice round, on most of the internet.', text: 'GPT-2 read about 8 million web pages (40 GB of text), each about once: hundreds of thousands of practice rounds, about half a million guesses each. That is pre-training. Later steps, like fine-tuning, teach a model to be helpful.', wait: 7000,
      draw(el) { stopAG(); el.innerHTML = `<div class="tr-wrap pt-real"><div class="pt-stack">${Array.from({ length: 14 }, (_, k) => `<span class="pt-page" style="animation-delay:${k * 260}ms">📄</span>`).join('')}<div class="pt-stackl">about 8,000,000 web pages</div></div><div class="pt-arrow">→</div>
        <div class="tr-side" style="width:300px"><div class="tr-sh">🚪 12 rooms · 🎤 144 interviewers · 📚 12 notebooks</div><div class="pt-chips">${chips(TOPICS)}</div><div class="muted" style="font-size:.8rem;margin-top:6px">After pre-training, every interviewer has its own line of questioning and every notebook is full (our analogy). In GPT-2 these are the 124,439,808 learned numbers.</div></div>
        <div class="tr-side" style="width:300px"><div class="tr-sh">Only the real next token is scored</div><div style="font-size:.85rem;margin-bottom:8px">In every guess, the loss looks only at the token that really came next. “bank” and “street” become likely after “…left bank of the” because in other texts they <i>were</i> the next token: each is pushed up by its own texts, and down by everyone else’s.</div><div class="tr-sh">Today’s models</div><div style="font-size:.85rem">Meta’s Llama 3 (2024) was pre-trained on more than <b>15 trillion tokens</b>, more than 1,000 times as much text as GPT-2. Same idea: guess the next token, check, trace back, nudge.</div></div></div>`; } },
  ];
  page('mlagain', again.map((s) => Object.assign({}, s, { draw: (el, a, P) => { s.draw(el, a, P); paint(); } })), { legend: 'The training text, its colors, the loss curve, the guesses and the memorized continuation are real GPT-2, starting from the day-one random numbers (20 training steps, worked out ahead of time). The interviewers’ questions and the notebook are our analogy.', real: 'Each round here is one optimizer step (Adam) on this one 42-token text. Real pre-training uses batches of about half a million tokens per step and sees each text about once, which is why it learns general patterns instead of memorizing.' });

  // =====================================================================================
  // Show the numbers: the calculations for the current round, laid out like the Gradient Descent Neuron Lab's worksheet
  // =====================================================================================
  const EPS = 0.1;
  const f = (x, d = 3) => (Math.abs(x) < 0.001 && x !== 0 ? x.toExponential(2) : x.toFixed(d));
  const wsHead = (cells) => `<tr>${cells.map(([c, t]) => `<th style="background:${c};color:#fff">${t}</th>`).join('')}</tr>`;
  const legend = () => `<div class="pt-phases ws">${PHASES.map(([c, l]) => `<div style="background:${c}">${l}</div>`).join('')}</div>`;
  const stopRow = (loss) => `<div class="ws-step">Step 3: Continue or stop</div><table class="ws"><tr><td>Should another round be run? (Yes, while the loss is not yet below the tolerance ε = ${EPS}.)</td><td>loss ≥ ε ? ${loss.toFixed(3)} ≥ ${EPS}</td><td><b>${loss >= EPS ? 'TRUE' : 'FALSE: stop'}</b></td></tr></table>`;
  const tokenRows = (top, pR) => stepRows(top, pR).map(([lab, p, y]) => `<tr><td>${lab}</td><td>${y ? '1 (100%)' : '0'}</td><td>${f(p, 5)}</td><td>${f(p - y, 5)}</td></tr>`).join('');
  NT.numbers.mlround = () => {
    const St = LD().step, A = St.steps[RD.size], g = St.gblocks, b = BEAT.mlround || 0;
    const ph = b === 0 ? 0 : b <= 2 ? 1 : b === 3 ? 2 : 3;
    return `<div class="numbers ws-box"><div class="nhead">Calculations for this practice round · now: ${PHASES[ph][1]}</div>${legend()}
      <div class="ws-vals">Here are values used for this calculation: • Learning rate (α) = ${A.lr} (${RD.size} step) │ Stop when loss &lt; ε (${EPS}) │ 124,439,808 numbers, all random on day one</div>
      <div class="ws-step">Step 1: The guess for the next token, then the error for each token</div>
      <table class="ws">${wsHead([['#275317', 'Token'], ['#275317', 'Correct output y (target)'], ['#275317', 'Predicted output ŷ (probability)'], ['#153d63', 'Error ŷ − y']])}${tokenRows(St.top0, St.p0)}
        <tr class="tot"><td colspan="3">Loss = −ln(ŷ for the correct token) = −ln(${f(St.p0, 7)})</td><td><b>${St.loss0.toFixed(3)}</b></td></tr></table>
      <div class="ws-step">Step 2: Trace the error back, then nudge every number</div>
      <table class="ws">${wsHead([['#000', 'Step as formula'], ['#000', 'Step in words'], ['#000', 'Answer']])}
        <tr class="bp"><td>‖∂Loss / ∂(room 1)‖</td><td>How hard room 1’s numbers should change (gradient size)</td><td>${g[0].toFixed(1)}</td></tr>
        <tr class="bp"><td>‖∂Loss / ∂(room 12)‖</td><td>The same for room 12</td><td>${g[11].toFixed(1)}</td></tr>
        <tr class="bp"><td>‖∂Loss / ∂(river’s embedding row)‖</td><td>The same for “river”’s row</td><td>${St.rowRiver.toFixed(1)}</td></tr>
        <tr class="gd"><td>α × gradient</td><td>Nudge = learning rate × gradient</td><td>on average ${relWords(A.relChange)} of each number’s size</td></tr>
        <tr class="gd"><td>w<sup>new</sup> = w<sup>old</sup> − α × gradient</td><td>New number = old number − nudge (for all 124,439,808)</td><td>loss ${St.loss0.toFixed(2)} → ${A.loss1.toFixed(2)}</td></tr></table>
      ${stopRow(A.loss1)}</div>`;
  };
  NT.numbers.mlagain = () => {
    const A = LD().again, k = typeof AG !== 'undefined' ? AG.k : 0, H = A.hist[k];
    return `<div class="numbers ws-box"><div class="nhead">Calculations for practice round ${k} of 20</div>${legend()}
      <div class="ws-vals">Values: • Learning rate (α) = ${A.lr} (Adam) │ ${A.passage.length - 1} guesses per round (every next token in the text) │ Stop when loss &lt; ε (${EPS})</div>
      <div class="ws-step">Step 1: One of the ${A.passage.length - 1} guesses (after “…left bank of the”), and the loss for the whole text</div>
      <table class="ws">${wsHead([['#275317', 'Token'], ['#275317', 'Correct output y (target)'], ['#275317', 'Predicted output ŷ (probability)'], ['#153d63', 'Error ŷ − y']])}${tokenRows(H.top, H.river)}
        <tr class="tot"><td colspan="3">Loss for the whole text = average of −ln(ŷ) over its ${A.passage.length - 1} guesses</td><td><b>${H.loss.toFixed(3)}</b></td></tr></table>
      ${stopRow(H.loss)}</div>`;
  };
  NT.ptViz = { errBars, growBars, phaseBand, PHASES, cp, mcol }; // shared with the Learn-one-example page (js/pretrain2.js)
})();
