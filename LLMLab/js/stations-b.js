/* Tabs 5–8: Transformer / Attention, Logits, Probabilities / Pick, Repeat */
'use strict';
(() => {
  const { $, esc, show, pct, int, num } = NT;
  const S = NT.state;
  const tb = () => $('#toolbar'), st = () => $('#stage');
  const wire = NT.wireStepper;
  const pend = (m) => NT.pendingHTML(m);
  const FAIL = 'GPT-2 could not be reached. Stored sentences still work.';

  // ===================== 5. TRANSFORMER / ATTENTION =====================
  S.trView = 'guess'; S.blk = 0; S.attBlock = 6; S.attHead = -1; S.attQ = null; S.skipFirst = true; S.annie = { picks: [], revealed: false }; S.qkvStep = 0; S.ctxBlock = 8;
  NT.stations.transformer = {
    init() {
      tb().innerHTML = `<div class="seg" id="trSeg">${[['guess', 'Guess'], ['stack', 'Stack'], ['attn', 'Attention'], ['qkv', 'Q·K·V'], ['ctx', 'Context']].map(([v, l]) => `<button data-v="${v}" class="${S.trView === v ? 'on' : ''}">${l}</button>`).join('')}</div><span id="trTools" style="display:contents"></span>`;
      tb().querySelectorAll('#trSeg button').forEach((b) => (b.onclick = () => { S.trView = b.dataset.v; NT.stations.transformer.init(); }));
      NT.onLive = null;
      ({ stack: stackInit, qkv: qkvInit, attn: attnInit, guess: attnInit, ctx: ctxInit })[S.trView]();
    },
  };

  // --- Stack ---
  const PARAMS = [['Token embeddings', 38597376], ['Position embeddings', 786432], ['Attention (×12)', 28348416], ['MLP (×12)', 56669184], ['Layer norms', 38400]];
  function stackInit() {
    $('#trTools').innerHTML = `<span class="tag real">GPT-2 · 12 blocks</span>${NT.stepper('stkStep')}`; NT.wireStepper('#stkStep', { prev: () => stepStack(-1), next: () => stepStack(1) });
    st().innerHTML = `<div style="display:grid;grid-template-columns:minmax(300px,1.1fr) 1fr;gap:14px" class="stackgrid"><div class="panel"><svg id="stackSvg" viewBox="0 0 460 560" width="100%"></svg></div><div style="display:grid;gap:12px;align-content:start"><div class="panel"><div class="h" id="blkTitle"></div><svg id="blkSvg" viewBox="0 0 420 200" width="100%"></svg></div><div class="panel"><div class="h">What training tunes</div><div id="paramBars"></div></div></div></div>`;
    const total = PARAMS.reduce((a, p) => a + p[1], 0);
    $('#paramBars').innerHTML = NT.bars(PARAMS.map(([l, v]) => ({ l, v, t: (v / 1e6).toFixed(v < 1e5 ? 2 : 1) + ' M' })).concat([{ l: 'Total', v: total, t: (total / 1e6).toFixed(1) + ' M', mark: true }]), total);
    drawStack();
  }
  function stepStack(d) { const n = S.blk + d; if (n < 0 || n > 12) return false; S.blk = n; drawStack(); return true; }
  function drawStack() {
    const cur = NT.current(), n = Math.min(cur.ids.length, 8);
    let s = '';
    const x0 = 150, w = 220, bh = 30, gap = 8, y0 = 70;
    s += `<text x="${x0 + w / 2}" y="20" text-anchor="middle" font-size="13" font-weight="700" fill="#33455a">Input rows</text>`;
    for (let i = 0; i < n; i++) { const c = NT.tokColor(i, cur.ids.length) || '#8c8c8c'; s += `<rect x="${x0 + 10 + i * ((w - 20) / n)}" y="30" width="${(w - 20) / n - 4}" height="14" rx="3" fill="${c}" opacity=".8"/>`; }
    for (let b = 0; b < 12; b++) {
      const y = y0 + b * (bh + gap), on = S.blk === b + 1, done = S.blk > b + 1;
      s += `<rect x="${x0}" y="${y}" width="${w}" height="${bh}" rx="7" fill="${on ? '#5b38d1' : done ? '#e9e3fb' : '#f4f6f9'}" stroke="${on ? '#5b38d1' : '#c8d0db'}"/>`;
      s += `<text x="${x0 + w / 2}" y="${y + 20}" text-anchor="middle" font-size="13" font-weight="650" fill="${on ? '#fff' : '#33455a'}">Block ${b + 1}</text>`;
      if (b < 11) s += `<line x1="${x0 + w / 2}" x2="${x0 + w / 2}" y1="${y + bh}" y2="${y + bh + gap}" stroke="#9aa5b5"/>`;
    }
    const yEnd = y0 + 12 * (bh + gap) + 6;
    s += `<text x="${x0 + w / 2}" y="${yEnd + 16}" text-anchor="middle" font-size="13" font-weight="700" fill="#33455a">Final vectors</text>`;
    // marker for rows' position
    const my = S.blk === 0 ? 50 : y0 + (S.blk - 1) * (bh + gap) + bh / 2;
    s += `<path d="M${x0 - 34} ${my - 8} l14 8 l-14 8 z" fill="#f28e2b"/><text x="${x0 - 40}" y="${my + 4}" text-anchor="end" font-size="12" fill="#5b6a7a">rows</text>`;
    $('#stackSvg').innerHTML = s;
    $('#blkTitle').textContent = S.blk === 0 ? 'Before block 1' : `Inside block ${S.blk}`;
    const on = S.blk > 0;
    let d = `<g opacity="${on ? 1 : 0.35}">`;
    d += `<rect x="10" y="20" width="180" height="150" rx="9" fill="#f6f3ff" stroke="#5b38d1"/><text x="100" y="42" text-anchor="middle" font-size="13" font-weight="700" fill="#33455a">Attention</text>`;
    for (let h = 0; h < 12; h++) d += `<rect x="${28 + (h % 4) * 38}" y="${56 + Math.floor(h / 4) * 34}" width="30" height="26" rx="5" fill="#fff" stroke="#9b87e8"/><text x="${43 + (h % 4) * 38}" y="${73 + Math.floor(h / 4) * 34}" text-anchor="middle" font-size="10" fill="#5b6a7a">${h + 1}</text>`;
    d += `<text x="100" y="164" text-anchor="middle" font-size="11" fill="#5b6a7a">12 heads</text>`;
    d += `<path d="M196 95 h20" stroke="#9aa5b5" stroke-width="1.5" marker-end="url(#ah)"/>`;
    d += `<rect x="222" y="20" width="188" height="150" rx="9" fill="#f3f8f5" stroke="#3d7a35"/><text x="316" y="42" text-anchor="middle" font-size="13" font-weight="700" fill="#33455a">MLP</text>`;
    d += `<rect x="236" y="80" width="40" height="30" rx="4" fill="#cfe8d5"/><rect x="290" y="62" width="52" height="66" rx="4" fill="#9fd2ab"/><rect x="356" y="80" width="40" height="30" rx="4" fill="#cfe8d5"/>`;
    d += `<text x="256" y="146" text-anchor="middle" font-size="11" fill="#33455a">768</text><text x="316" y="146" text-anchor="middle" font-size="11" fill="#33455a">3,072</text><text x="376" y="146" text-anchor="middle" font-size="11" fill="#33455a">768</text></g>`;
    d += `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#9aa5b5"/></marker></defs>`;
    $('#blkSvg').innerHTML = d;
    NT.setStatus(S.blk === 0 ? `${cur.ids.length} rows of 768 enter the stack` : S.blk === 12 ? 'Block 12 done · each row now carries its context' : `Block ${S.blk} of 12 · every row is updated`);
  }

  // --- Classroom Q·K·V (toy numbers; click any word to make it the one asking) ---
  // Each word asks one imagined question; every earlier word (and itself) answers with a match score.
  const QKV = {
    words: ['The', 'banker', 'left', 'the', 'bank', 'and'],
    ask: ['who am I?', 'what describes me?', 'who left?', 'what comes next?', 'which kind of bank?', 'what was just done?'],
    scores: [[1.0], [1.6, 0.8], [0.2, 2.6, 0.6], [0.4, 1.0, 1.2, 0.4], [0.2, 1.8, 1.0, 0.4, 0.3], [0.1, 0.8, 2.2, 0.3, 1.5, 0.3]],
  };
  S.qkvQ = 2;
  function qkvInit() {
    $('#trTools').innerHTML = `<span class="tag">Classroom model — one imagined attention head</span>${NT.stepper('qkvStepper')}`; NT.wireStepper('#qkvStepper', { prev: () => stepQkv(-1), next: () => stepQkv(1) });
    st().innerHTML = `<div class="panel"><div style="font-size:1.02rem;margin:2px 0 6px"><b>Click any word</b> <span class="muted">to make it the one asking. Then step through.</span></div><svg id="qkvSvg" viewBox="0 0 900 430" width="100%"></svg></div>`;
    drawQkv();
  }
  function stepQkv(d) { const n = S.qkvStep + d; if (n < 0 || n > 3) return false; S.qkvStep = n; drawQkv(); return true; }
  function drawQkv() {
    const q = S.qkvQ, W = QKV.words, n = W.length, sc = QKV.scores[q], m = Math.max(...sc), e = sc.map((x) => Math.exp(x - m)), z = e.reduce((a, b) => a + b, 0), sh = e.map((x) => x / z);
    const cw = 900 / n, cx = (i) => cw * i + cw / 2, step = S.qkvStep, qx = Math.min(Math.max(cx(q), 125), 775);
    let s = '';
    W.forEach((w, i) => {
      const c = NT.PALETTE[i], dim = i > q;
      s += `<g class="qkvTok" data-i="${i}" style="cursor:pointer" opacity="${dim ? 0.35 : 1}"><rect x="${cx(i) - cw / 2 + 8}" y="20" width="${cw - 16}" height="44" rx="9" fill="${c}22" stroke="${i === q ? '#1d2634' : c}" stroke-width="${i === q ? 4 : 2}"/><text x="${cx(i)}" y="48" text-anchor="middle" font-size="17" font-family="ui-monospace,monospace" fill="#1d2634">${esc(w)}</text></g>`;
    });
    s += `<line x1="${cx(q)}" x2="${qx}" y1="64" y2="84" stroke="#5b38d1" stroke-width="2"/><rect x="${qx - 125}" y="84" width="250" height="40" rx="20" fill="#fff" stroke="#5b38d1" stroke-width="2"/><text x="${qx}" y="109" text-anchor="middle" font-size="15" font-weight="700" fill="#4528b3">Query: ${esc(QKV.ask[q])}</text>`;
    if (step >= 1) sc.forEach((v, i) => {
      s += `<rect x="${cx(i) - 52}" y="150" width="104" height="34" rx="8" fill="#fff" stroke="#9aa5b5"/><text x="${cx(i)}" y="172" text-anchor="middle" font-size="13" fill="#33455a">Key match ${v.toFixed(1)}</text>`;
      s += `<rect x="${cx(i) - 34}" y="${270 - v * 30}" width="68" height="${v * 30}" fill="#9b87e8" rx="3"/>`;
    });
    if (step >= 2) sh.forEach((v, i) => { s += `<text x="${cx(i)}" y="298" text-anchor="middle" font-size="16" font-weight="800" fill="#4528b3">${pct(v, 0)}</text>`; });
    if (step >= 3) {
      let x = 250;
      s += `<text x="450" y="340" text-anchor="middle" font-size="13" font-weight="700" fill="#33455a">New “${esc(W[q])}” row = mix of Values</text>`;
      sh.forEach((v, i) => { const wd = 400 * v; s += `<rect x="${x}" y="352" width="${wd}" height="30" fill="${NT.PALETTE[i]}" opacity=".85"/>`; if (wd > 50) s += `<text x="${x + wd / 2}" y="372" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">${esc(W[i])}</text>`; x += wd; });
    }
    $('#qkvSvg').innerHTML = s;
    $('#qkvSvg').querySelectorAll('.qkvTok').forEach((g) => (g.onclick = () => { S.qkvQ = +g.dataset.i; drawQkv(); }));
    const top = sh.indexOf(Math.max(...sh));
    NT.setStatus([`“${W[q]}” asks a question`, 'Each earlier word’s key answers it (words later in the sentence can’t answer)', 'Scores become shares (SoftMax)', q === top ? `“${W[q]}” mostly takes in itself` : `“${W[q]}” takes in mostly “${W[top]}”`][step]);
  }
  // --- Real attention (stored for the starter sentences, live GPT-2 for any other sentence) ---
  const attnCache = new Map(); let attTok = 0;
  async function attnFor(cur) {
    if (cur.ex && cur.ex.attn) return cur.ex;
    if (attnCache.has(cur.text)) return attnCache.get(cur.text);
    const a = await NT.live.attention(cur.ids);
    const ex = { key: 'custom', ids: cur.ids, tokens: cur.tokens, T: cur.ids.length, attn: a, text: cur.text };
    attnCache.set(cur.text, ex); return ex;
  }
  function attnInit() {
    $('#trTools').innerHTML = '';
    const cur = NT.current(), tk = ++attTok, stored = !!(cur.ex && cur.ex.attn);
    if (!stored && !attnCache.has(cur.text)) {
      st().innerHTML = pend();
      NT.onLive = () => { if (S.station === 'transformer' && (S.trView === 'attn' || S.trView === 'guess') && tk === attTok && !attnCache.has(cur.text)) st().innerHTML = pend(); };
    }
    attnFor(cur).then((ex) => { if (tk === attTok && S.station === 'transformer' && (S.trView === 'attn' || S.trView === 'guess')) attnBuild(ex); }).catch(() => { if (tk === attTok) st().innerHTML = pend(FAIL); });
  }
  function attnBuild(ex) {
    S._ex = ex;
    if (S._exKey !== ex.text || S.attQ == null || S.attQ >= ex.T) { S._exKey = ex.text; S.attQ = ex.key.startsWith('trophy') ? ex.tokens.indexOf(' it') : ex.T - 1; S.annie = { picks: [], revealed: false }; }
    const G = S.trView === 'guess';
    $('#trTools').innerHTML = G ? `<span class="tag real">GPT-2 · all blocks</span><button class="btn primary" id="annieReveal">Reveal</button><button class="btn ghost" id="annieReset">Reset</button>` :
    `<span class="tag real">GPT-2</span><label class="ctl">Block <input type="range" id="attB" min="1" max="12" value="${S.attBlock}"/><span class="v" id="attBv">${S.attBlock}</span></label>
      <label class="ctl"><input type="checkbox" id="attHeads" ${S.attHead >= 0 ? 'checked' : ''}/> Explore heads</label><span id="headPick" style="display:${S.attHead >= 0 ? 'inline-flex' : 'none'}" class="ctl">Head <input type="range" id="attH" min="1" max="12" value="${Math.max(1, S.attHead + 1)}"/><span class="v" id="attHv">${Math.max(1, S.attHead + 1)}</span></span>
      <label class="ctl"><input type="checkbox" id="skipFirst" ${S.skipFirst ? 'checked' : ''}/> Leave out first token</label>
      ${ex.key === 'annie' ? '<button class="btn primary" id="annieReveal">Reveal</button><button class="btn ghost" id="annieReset">Reset</button>' : ''}
      ${ex.key.startsWith('trophy') ? `<div class="seg" id="trophySeg"><button data-v="trophyLarge" class="${ex.key === 'trophyLarge' ? 'on' : ''}">too large</button><button data-v="trophySmall" class="${ex.key === 'trophySmall' ? 'on' : ''}">too small</button></div>` : ''}`;
    st().innerHTML = `<div class="panel" style="overflow-x:auto"><div id="attWrap"></div></div>`;
    if ($('#attB')) $('#attB').oninput = (e) => { S.attBlock = +e.target.value; $('#attBv').textContent = S.attBlock; drawAttn(); };
    if ($('#attHeads')) $('#attHeads').onchange = (e) => { S.attHead = e.target.checked ? 0 : -1; NT.stations.transformer.init(); };
    if ($('#attH')) $('#attH').oninput = (e) => { S.attHead = +e.target.value - 1; $('#attHv').textContent = e.target.value; drawAttn(); };
    if ($('#skipFirst')) $('#skipFirst').onchange = (e) => { S.skipFirst = e.target.checked; drawAttn(); };
    if ($('#annieReveal')) { $('#annieReveal').onclick = () => { S.annie.revealed = true; drawAttn(); }; $('#annieReset').onclick = () => { S.annie = { picks: [], revealed: false }; drawAttn(); }; }
    if ($('#trophySeg')) $('#trophySeg').querySelectorAll('button').forEach((b) => (b.onclick = () => NT.setText(NT.EX[b.dataset.v].text, 'edit')));
    drawAttn();
  }
  function drawAttn() {
    const ex = S._ex; if (!ex || !$('#attWrap')) return;
    const G = S.trView === 'guess', q = G ? ex.T - 1 : S.attQ, b = S.attBlock - 1, isAnnie = ex.key === 'annie' || G;
    const w = []; for (let j = 0; j <= q; j++) w.push(G ? [...Array(12).keys()].reduce((a, bb) => a + NT.attnAvg(ex, bb, q, j), 0) / 12 : S.attHead >= 0 ? NT.attn(ex, b, S.attHead, q, j) : NT.attnAvg(ex, b, q, j));
    let ww = w.slice(); if ((G || S.skipFirst) && q > 0) { ww[0] = 0; if (G) ww[q] = 0; const s = ww.reduce((a, c) => a + c, 0) || 1; ww = ww.map((x) => x / s); }
    const hide = isAnnie && !S.annie.revealed;
    const mx = Math.max(...ww.slice(0, q + 1), 1e-6);
    const n = ex.T, colW = n > 16 ? 58 : 74, H = 170, VW = n * colW + 20;
    let s = `<svg viewBox="0 0 ${VW} ${H + 70}" width="100%" style="min-width:${n > 10 ? Math.min(VW, 1100) : 0}px">`;
    for (let j = 0; j < n; j++) {
      const x = 10 + j * colW, after = j > q, v = j <= q ? ww[j] : 0, h = hide ? 0 : (v / mx) * (H - 30);
      const picked = isAnnie && S.annie.picks.includes(j);
      if (!after && !hide && !(G && j === q)) s += `<rect x="${x + 8}" y="${H - h}" width="${colW - 16}" height="${h}" rx="3" fill="${j === q ? '#c8d0db' : '#5b38d1'}"/><text x="${x + colW / 2}" y="${H - h - 5}" text-anchor="middle" font-size="11" fill="#33455a">${G && j === 0 ? '–' : (v * 100).toFixed(0) + '%'}</text>`;
      s += `<g class="attTok" data-j="${j}" style="cursor:pointer"><rect x="${x + 2}" y="${H + 8}" width="${colW - 4}" height="30" rx="6" fill="${j === q ? '#f28e2b33' : after ? '#f7f8fa' : '#f4f6f9'}" stroke="${picked ? '#5b38d1' : j === q ? '#f28e2b' : '#c8d0db'}" stroke-width="${picked ? 3 : 1.5}"/><text x="${x + colW / 2}" y="${H + 28}" text-anchor="middle" font-size="12.5" font-family="ui-monospace,monospace" fill="${after ? '#b5bcc7' : '#1d2634'}">${esc(ex.tokens[j].replace(/\n/g, '⏎').slice(0, 9))}</text></g>`;
    }
    s += `</svg>`;
    let pr = '';
    if (G) {
      const top = ww.map((v, j) => [v, j]).slice(0, q).sort((a, c) => c[0] - a[0]).slice(0, 2).map((x) => x[1]);
      const nm = (j) => `“${ex.tokens[j].trim()}”`;
      pr = `<div style="font-size:1.05rem;margin:2px 0 8px"><b>Which two earlier words matter most to ${nm(q)}?</b> <span class="muted">Click two words, then Reveal.</span></div>`;
      if (S.annie.revealed) {
        const rk = ww.map((v, j) => [v, j]).slice(0, q).sort((a, c) => c[0] - a[0]), top3 = rk.slice(0, 3).map((x) => x[1]);
        const got = S.annie.picks.reduce((a, j) => a + ww[j], 0), best = rk[0][0] + (rk[1] ? rk[1][0] : 0);
        const mark = (j) => `${nm(j)} ${top3.includes(j) ? '✓' : '✗'} #${rk.findIndex((x) => x[1] === j) + 1}`;
        pr += `<div style="margin:0 0 8px"><b>Your picks:</b> ${S.annie.picks.length ? S.annie.picks.map(mark).join(' and ') : 'none'} · <b>GPT-2’s top three:</b> ${top3.map(nm).join(', ')}<br><span class="rankbig">${Math.round(got * 100)}%</span> of the attention on earlier words went to your two words. The best two would have gotten ${Math.round(best * 100)}%.</div>`;
      }
    }
    $('#attWrap').innerHTML = pr + s;
    $('#attWrap').querySelectorAll('.attTok').forEach((g) => (g.onclick = () => {
      const j = +g.dataset.j;
      if (isAnnie && !S.annie.revealed) { const p = S.annie.picks; const i = p.indexOf(j); if (i >= 0) p.splice(i, 1); else if (p.length < 2 && j < q) p.push(j); drawAttn(); return; }
      if (!isAnnie) { S.attQ = j; drawAttn(); }
    }));
    let st_ = G ? `“${ex.tokens[q].trim()}” · all 12 blocks and heads averaged` : `“${ex.tokens[q].trim()}” · block ${S.attBlock}${S.attHead >= 0 ? ` · head ${S.attHead + 1}` : ' · 12 heads averaged'}`;
    if (!hide) { const top = ww.map((v, j) => [v, j]).slice(0, q).sort((a, c) => c[0] - a[0])[0]; if (top) st_ += ` · most: “${ex.tokens[top[1]].trim()}” ${pct(top[0], 0)}`; }
    if (isAnnie && hide) st_ = G ? `Pick 2 words · ${S.annie.picks.length} of 2` : `Pick 2 words for “pack a ___” · ${S.annie.picks.length} of 2`;
    NT.setStatus(st_);
  }

  // --- Context: same token, different context ---
  function ctxInit() {
    const C = NT.LAB.context;
    $('#trTools').innerHTML = `<label class="ctl">Stage <input type="range" id="ctxB" min="0" max="12" value="${S.ctxBlock}"/><span class="v" id="ctxBv"></span></label>`;
    st().innerHTML = `<div class="grid2"><div class="panel"><div class="h">How alike are the “bank” vectors?</div><svg id="ctxChart" viewBox="0 0 520 300" width="100%"></svg><div style="font-size:.8rem;margin-top:6px"><div><b style="color:#3d7a35">Money</b> <span class="muted">${C.money.map(esc).join(' · ')}</span></div><div><b style="color:#4e79a7">River</b> <span class="muted">${C.river.map(esc).join(' · ')}</span></div></div></div>
      <div class="panel"><div class="h">The banker sentence’s two “bank”s</div><div class="sentence" style="font-size:1.05rem;margin:4px 0 10px" id="ctxSent"></div><div id="ctxBanks"></div></div></div>`;
    $('#ctxB').oninput = (e) => { S.ctxBlock = +e.target.value; drawCtx(); };
    drawCtx();
  }
  function stepCtx(d) { const n = S.ctxBlock + d; if (n < 0 || n > 12) return false; S.ctxBlock = n; $('#ctxB').value = n; drawCtx(); return true; }
  function drawCtx() {
    const C = NT.LAB.context, b = S.ctxBlock;
    $('#ctxBv').textContent = b === 0 ? 'Input' : 'Block ' + b;
    const X = (i) => 50 + i * 36, Y = (v) => 260 - (v - 0.7) / 0.3 * 230;
    let s = '';
    for (const v of [0.7, 0.8, 0.9, 1.0]) s += `<line x1="50" x2="${X(12)}" y1="${Y(v)}" y2="${Y(v)}" stroke="#eef1f5"/><text x="44" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#687386">${v.toFixed(1)}</text>`;
    for (let i = 0; i <= 12; i++) s += `<text x="${X(i)}" y="280" text-anchor="middle" font-size="10.5" fill="#687386">${i === 0 ? 'In' : i}</text>`;
    s += `<rect x="${X(b) - 14}" y="20" width="28" height="244" fill="#5b38d1" opacity=".08"/>`;
    const line = (arr, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" points="${arr.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}"/>` + arr.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === b ? 5 : 2.5}" fill="${c}"/>`).join('');
    s += line(C.within, '#33455a') + line(C.cross, '#e15759');
    s += `<text x="${X(12) + 6}" y="${Y(C.within[12]) - 6}" font-size="12" font-weight="700" fill="#33455a" text-anchor="end">same meaning</text><text x="${X(10)}" y="${Y(C.cross[10]) + 18}" font-size="12" font-weight="700" fill="#e15759" text-anchor="middle">different meaning</text>`;
    $('#ctxChart').innerHTML = s;
    const ex = NT.EX.river, pos = C.banks.map((k) => k.pos);
    $('#ctxSent').innerHTML = ex.tokens.map((t, i) => pos.includes(i) ? `<b style="background:#fff1b8;padding:0 2px">${esc(t)}</b><sup>${pos.indexOf(i) + 1}</sup>` : esc(t)).join('');
    $('#ctxBanks').innerHTML = C.banks.map((k, i) => `<div style="margin-bottom:10px"><div class="h" style="font-size:.82rem">bank<sup>${i + 1}</sup></div>${NT.bars([{ l: 'like money banks', v: k.money[b], t: k.money[b].toFixed(2) }, { l: 'like river banks', v: k.river[b], t: k.river[b].toFixed(2) }], 1)}</div>`).join('');
    NT.setStatus(`${b === 0 ? 'Input' : 'Block ' + b} · same meaning ${C.within[b].toFixed(2)} · different meaning ${C.cross[b].toFixed(2)}`);
  }
  // ---------- distribution for the current sentence: stored, else live GPT-2 ----------
  NT.getDist = async (box) => {
    const cur = NT.current();
    if (NT.hasFull(cur.ids)) return NT.dist(cur.ids);
    const p = NT.partialDist(cur.ids);
    if (p && !NT.live.ready()) return p;
    box.innerHTML = pend();
    NT.onLive = () => { if (box.isConnected && box.querySelector('.revealbox')) box.innerHTML = pend(); };
    return NT.dist(cur.ids);
  };
  const topOf = (d, k) => (d.partial ? { ids: d.ids.slice(0, k), lg: d.logits.slice(0, k) } : (() => { const ids = Array.from(d.order.subarray(0, k)); return { ids, lg: ids.map((i) => d.logits[i]) }; })());

  // ===================== 6. LOGITS =====================
  // Steps: 0 final vector · 1 score one token · 2 score all 50,257 · 3 ranked list (gaps behind the leader)
  S.lgStep = 0; S.lgZoom = 0; let lgTok = 0, LG = null;
  const lgMin = () => (LG && LG.base ? 0 : 2);
  NT.stations.logits = {
    async init() {
      const tk = ++lgTok, cur = NT.current(), base = cur.key === 'banker';
      if (S.lgStep < (base ? 0 : 2)) S.lgStep = base ? 0 : 2;
      tb().innerHTML = `<span class="tag real">GPT-2</span>${NT.stepper('lgStepper')}<span class="mono" style="font-size:.9rem">1 × 768 &nbsp;×&nbsp; 768 × 50,257 &nbsp;=&nbsp; 1 × 50,257</span>`;
      wire('#lgStepper', { prev: () => { if (S.lgStep > lgMin()) { S.lgStep--; drawLogits(); } }, next: () => { if (S.lgStep < 3) { S.lgStep++; drawLogits(); } } });
      st().innerHTML = `<div id="lgBox"></div>`;
      let d; try { d = await NT.getDist($('#lgBox')); } catch (e) { if (tk === lgTok) $('#lgBox').innerHTML = pend(FAIL); return; }
      if (tk !== lgTok || S.station !== 'logits') return;
      LG = { d, base, word: cur.tokens[cur.tokens.length - 1] };
      drawLogits();
    },
    onTK() {},
  };
  async function drawLogits() {
    if (!LG) return;
    const { d, base, word } = LG, ex = NT.EX.banker, step = S.lgStep, tk = ++lgTok;
    const { ids, lg } = topOf(d, 15), full = !d.partial;
    let mn = null, med = null; if (full) { mn = Infinity; for (const x of d.logits) if (x < mn) mn = x; const srt = Float32Array.from(d.logits).sort(); med = srt[srt.length >> 1]; }
    let h = '';
    if (step <= 1) {
      h += `<div class="panel"><div class="vrow"><span class="who">final vector for “${esc(word.trim())}”</span>${NT.stripHTML('lgFinal')}</div>`;
      if (step === 1) {
        h += `<div style="margin:10px 0 6px"><b>Score one token.</b> <span class="muted">Pick a token:</span></div><div id="lgChips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${ids.map((id, i) => `<button class="btn ${i === S.lgZoom ? 'primary' : 'ghost'} small" data-i="${i}">${show(NT.tokText(id))}</button>`).join('')}</div><div id="lgZoom"></div>`;
      }
      h += `</div>`;
    } else {
      h += `<div class="panel"><div class="lggrid" style="display:grid;grid-template-columns:${step === 3 ? '1fr' : '1fr 1fr'};gap:12px">${step === 2 ? `<div style="display:grid;place-items:center;min-height:230px"><canvas id="lgMatrix" width="96" height="200" style="width:96px;height:200px;border:1px solid #c8d0db;border-radius:4px;transform:rotate(-90deg)"></canvas><div class="muted" style="font-size:.78rem">The embedding matrix again, on its side · 768 × 50,257</div></div><div style="align-self:center"><div class="who" style="text-align:left;margin-bottom:6px">one score for each of the 50,257 tokens</div>${NT.stripHTML('lgAll')}</div>` : `<div><div class="who" style="text-align:left;margin-bottom:4px">all 50,257 scores</div>${NT.stripHTML('lgAll')}<div class="h" style="margin-top:12px">Top 15, and how far each is behind the leader</div><div id="lgTop"></div>${full ? `<div class="muted" style="margin-top:10px;font-size:.85rem">Highest <b>${num(lg[0])}</b> · middle token <b>${num(med)}</b> · lowest <b>${num(mn)}</b>. The scores only mean something next to each other.</div>` : ''}</div>`}</div></div>`;
    }
    $('#lgBox').innerHTML = h;
    if (step <= 1) {
      const c = $('#lgFinal');
      if (base) NT.drawStrip(c, ex.final); else { c.width = 1; c.height = 1; c.getContext('2d').fillStyle = '#e6eaf0'; c.getContext('2d').fillRect(0, 0, 1, 1); }
      if (step === 1) {
        $('#lgChips').querySelectorAll('button').forEach((bt) => (bt.onclick = () => { S.lgZoom = +bt.dataset.i; drawLogits(); }));
        const i = S.lgZoom, id = ex.topRows.ids[i], row = ex.topRows.rows.slice(i * 768, i * 768 + 768);
        const prod = Float32Array.from(row, (x, k) => x * ex.final[k]), sum = prod.reduce((a, b) => a + b, 0);
        $('#lgZoom').innerHTML = `<div class="vrow"><span class="who">${show(NT.tokText(id))} row</span>${NT.stripHTML('zRow')}</div><div class="vrow"><span class="who">× final</span>${NT.stripHTML('zFin')}</div><div class="vrow"><span class="who">products</span>${NT.stripHTML('zProd')}</div><div class="vrow"><span class="who">sum</span><span class="mono" style="font-size:1rem"><b>${num(full && d.logits[id] != null ? d.logits[id] : sum)}</b> = logit for “${esc(NT.tokText(id).trim())}”</span></div>`;
        NT.drawStrip($('#zRow'), row); NT.drawStrip($('#zFin'), ex.final); NT.drawStrip($('#zProd'), prod);
      }
    } else {
      const all = $('#lgAll');
      if (full) { const L = d.logits; let m = 0, sd = 0; for (const x of L) m += x; m /= L.length; for (const x of L) sd += (x - m) ** 2; sd = Math.sqrt(sd / L.length); NT.drawStrip(all, Float32Array.from(L, (x) => (x - m) / sd), 4); }
      if (step === 2) {
        const mc = $('#lgMatrix'), cx = mc.getContext('2d'), img = cx.createImageData(96, 200);
        try { for (let y = 0; y < 200; y++) { const row = await NT.row(40 + y * 2); for (let x = 0; x < 96; x++) { const [R, G, B] = NT.div(row[x * 8] / 0.25); img.data.set([R, G, B, 255], (y * 96 + x) * 4); } } } catch (e) { /* rows not available */ }
        if (tk !== lgTok || !$('#lgMatrix')) return;
        cx.putImageData(img, 0, 0);
      } else {
        const lo = full ? mn : lg[0] - 8;
        $('#lgTop').innerHTML = NT.bars(ids.map((id, i) => ({ l: NT.tokText(id), v: Math.max(0, lg[i] - lo), t: `${num(lg[i])} (${i === 0 ? 'leader' : num(+num(lg[i]).replace('−', '-') - +num(lg[0]).replace('−', '-'))})` })));
      }
    }
    NT.setStatus([`The final vector for “${word.trim()}”, the last position`, 'Row × final vector, added up, gives one token’s score', 'Every token’s row does the same, giving 50,257 scores', `Top score: “${NT.tokText(ids[0]).trim()}” ${num(lg[0])}${base ? '' : ' · final-vector steps are available for the stored sentences'}`][step]);
  }

  // ===================== 7. PROBABILITIES / PICK =====================
  // Four views, one idea each: SoftMax · Temperature · Top-K · Pick
  S.pickView = 'soft'; S.lastPick = null; S.r = null; S.rAuto = true; let pkTok = 0, PK = null;
  const PVIEWS = [['soft', 'SoftMax'], ['temp', 'Temperature'], ['topk', 'Top-K'], ['pick', 'Pick']];
  NT.stations.pick = {
    async init() {
      const tk = ++pkTok; S.lastPick = null;
      if (!PVIEWS.some((v) => v[0] === S.pickView)) S.pickView = 'soft';
      const pv = S.pickView === 'pick';
      const kc = document.querySelector('#kSlider').closest('.ctl'); if (kc) kc.classList.toggle('off', S.pickView === 'soft');
      tb().innerHTML = `<div class="seg" id="pSeg">${PVIEWS.map(([v, l]) => `<button data-v="${v}" class="${S.pickView === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="chips"><button class="chip" data-p="g">Greedy</button><button class="chip" data-p="t">Typical</button><button class="chip" data-p="w">Wild</button></div>` + (pv ? `
        <label class="ctl"><input type="checkbox" id="pAuto" ${S.rAuto ? 'checked' : ''}/> auto r</label><input type="number" id="pR" min="0" max="0.999" step="0.01" placeholder="r" ${S.rAuto ? 'disabled' : ''} value="${S.r ?? ''}"/>
        <button class="btn primary" id="pGo">Pick</button><button class="btn" id="pAdd" hidden>Add to sentence</button>` : '');
      tb().querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { const p = b.dataset.p; if (p === 'g') NT.setTK(0.2, 1); if (p === 't') NT.setTK(1, 5); if (p === 'w') NT.setTK(10, 50); }));
      tb().querySelectorAll('#pSeg button').forEach((b) => (b.onclick = () => { S.pickView = b.dataset.v; NT.stations.pick.init(); }));
      if (pv) {
        $('#pAuto').onchange = (e) => { S.rAuto = e.target.checked; $('#pR').disabled = S.rAuto; };
        $('#pR').oninput = (e) => { const v = parseFloat(e.target.value); S.r = v >= 0 && v < 1 ? v : null; };
        $('#pGo').onclick = () => NT.doPick();
        $('#pAdd').onclick = () => { if (!S.lastPick) return; NT.setText(NT.current().text + NT.tokText(S.lastPick.id), 'append'); };
      }
      st().innerHTML = `<div id="pickMain"></div>`;
      let d; try { d = await NT.getDist($('#pickMain')); } catch (e) { if (tk === pkTok) $('#pickMain').innerHTML = pend(FAIL); return; }
      if (tk !== pkTok || S.station !== 'pick') return;
      PK = { d }; drawPick();
    },
    onTK() { S.lastPick = null; if ($('#pAdd')) $('#pAdd').hidden = true; drawPick(); },
  };
  NT.doPick = (forcedR) => {
    if (!PK) return;
    const pr = NT.probs(PK.d, S.T, S.K), r = forcedR ?? (S.rAuto ? Math.random() : S.r);
    if (r == null) { NT.setStatus('Enter r between 0 and 1'); return; }
    const i = NT.pickIndex(pr.p, r);
    S.lastPick = { i, id: pr.ids[i], r, p: pr.p[i], rank: i + 1 };
    if (S.rAuto && $('#pR')) $('#pR').value = r.toFixed(3);
    if ($('#pAdd')) $('#pAdd').hidden = false;
    drawPick();
  };
  const NSHOW = 10;
  function drawPick() {
    if (!PK || !$('#pickMain') || S.station !== 'pick') return;
    const d = PK.d, note = d.partial ? ' · stored top 50' : '', box = $('#pickMain');
    if (S.pickView === 'soft') {
      // logit -> behind the leader / T -> e^x -> share of the total (all tokens, relative to the leader: same answer, smaller numbers)
      const pr = NT.probs(d, S.T, NT.ALL), n = pr.K, p0 = pr.p[0], tot = 1 / p0;
      let restE = 0, restP = 0; for (let i = NSHOW; i < n; i++) { restE += pr.p[i] / p0; restP += pr.p[i]; }
      const f = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(3));
      const rows = []; for (let i = 0; i < Math.min(NSHOW, n); i++) rows.push(`<tr><td>${i + 1}</td><td class="tokc">${show(NT.tokText(pr.ids[i]))}</td><td>${num(pr.logits[i])}</td><td>${num((+num(pr.logits[i]).replace('−', '-') - +num(pr.logits[0]).replace('−', '-')) / S.T)}</td><td>${f(pr.p[i] / p0)}</td><td>${pct(pr.p[i], 2)}</td></tr>`);
      if (n > NSHOW) rows.push(`<tr><td>…</td><td class="tokc">${int(n - NSHOW)} more words</td><td></td><td></td><td>${f(restE)}</td><td>${pct(restP, 2)}</td></tr>`);
      rows.push(`<tr class="pick"><td></td><td class="tokc"><b>Total</b></td><td></td><td></td><td><b>${f(tot)}</b></td><td><b>100%</b></td></tr>`);
      box.innerHTML = `<div class="panel" style="overflow-x:auto"><table class="t"><tr><th>Rank</th><th>Token</th><th>Logit</th><th>Behind the leader ÷ T</th><th>e<sup>x</sup></th><th>SoftMax</th></tr>${rows.join('')}</table></div>`;
      NT.setStatus(`T ${S.T} · all words, before any Top-K cut · each share = its eˣ ÷ the total${note}`); return;
    }
    if (S.pickView === 'temp') {
      const ts = [0.2, 1, 10], ps = ts.map((t) => NT.probs(d, t, S.K));
      box.innerHTML = `<div class="grid3">${ts.map((t, k) => { const q = ps[k], nn = Math.min(NSHOW, q.K); let top = 0; for (let i = 0; i < nn; i++) top += q.p[i]; const rest = Math.max(0, 1 - top); return `<div class="panel"><div class="h">T = ${t}</div>${NT.bars(Array.from({ length: nn }, (_, i) => ({ l: NT.tokText(q.ids[i]), v: q.p[i], t: pct(q.p[i], 2) })), q.p[0])}${q.K > nn ? `<div class="muted" style="margin-top:8px;font-size:.84rem">${int(q.K - nn)} other words together: <b>${pct(rest, 1)}</b></div>` : ''}</div>`; }).join('')}</div>`;
      NT.setStatus(`Top-K ${NT.kLabel(S.K)} · same tokens, same order, different spread · lower T favors the leader${note}`); return;
    }
    if (S.pickView === 'topk') {
      const all = NT.probs(d, S.T, NT.ALL), cut = NT.probs(d, S.T, S.K), K = cut.K, nShow = Math.min(15, Math.max(K + 3, 6), all.K);
      let kept = 0; for (let i = 0; i < K; i++) kept += all.p[i];
      const rows = []; for (let i = 0; i < nShow; i++) { const out = i >= K; rows.push(`<tr class="${out ? 'off' : ''}" ${i === K - 1 && K < nShow ? 'style="border-bottom:2px solid #5b38d1"' : ''}><td>${i + 1}</td><td class="tokc">${show(NT.tokText(all.ids[i]))}</td><td>${pct(all.p[i], 2)}</td><td>${out ? 'cut' : pct(cut.p[i], 2)}</td></tr>`); }
      box.innerHTML = `<div class="panel" style="overflow-x:auto"><table class="t"><tr><th>Rank</th><th>Token</th><th>Before the cut</th><th>After the cut (adds to 100%)</th></tr>${rows.join('')}</table></div>`;
      NT.setStatus(S.K >= NT.ALL ? `Top-K is All: nothing is cut${note}` : `Top-K ${K} keeps ${pct(kept, 1)} of the probability, then scales it back up to 100%${note}`); return;
    }
    // Pick
    const pr = NT.probs(d, S.T, S.K), K = pr.K, nShow = Math.min(K, NSHOW), lp = S.lastPick;
    let cum = 0; const rows = [];
    for (let i = 0; i < nShow; i++) { const lo = cum; cum += pr.p[i]; rows.push(`<tr class="${lp && lp.i === i ? 'pick' : ''}"><td>${i + 1}</td><td class="tokc">${show(NT.tokText(pr.ids[i]))}</td><td>${pct(pr.p[i], 2)}</td><td>${lo.toFixed(3)} to ${(K === nShow && i === K - 1 ? 1 : cum).toFixed(3)}</td></tr>`); }
    let restP = 0; for (let i = nShow; i < K; i++) restP += pr.p[i];
    if (K > nShow) rows.push(`<tr class="${lp && lp.i >= nShow ? 'pick' : ''}"><td>…</td><td class="tokc">${int(K - nShow)} more words${lp && lp.i >= nShow ? `  → “${esc(NT.tokText(lp.id))}” (rank ${int(lp.rank)})` : ''}</td><td>${pct(restP, 2)}</td><td>${cum.toFixed(3)} to 1.000</td></tr>`);
    const W = 860; let x = 0;
    let bar = `<svg viewBox="0 0 ${W + 40} 90" width="100%"><text x="20" y="14" font-size="11" fill="#687386">0</text><text x="${W + 20}" y="14" font-size="11" fill="#687386" text-anchor="end">1</text>`;
    for (let i = 0; i < nShow; i++) { const wv = pr.p[i], c = NT.PALETTE[i % 10]; bar += `<rect x="${20 + x * W}" y="22" width="${Math.max(0.5, wv * W - 1)}" height="30" fill="${c}" opacity="${lp && lp.i === i ? 1 : 0.55}"/>`; if (wv * W > 34) bar += `<text x="${20 + (x + wv / 2) * W}" y="42" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">${esc(NT.tokText(pr.ids[i]).trim())}</text>`; x += wv; }
    if (K > nShow) bar += `<rect x="${20 + x * W}" y="22" width="${Math.max(0.5, restP * W)}" height="30" fill="#8c8c8c" opacity="${lp && lp.i >= nShow ? 1 : 0.45}"/>`;
    if (lp) { const rx = 20 + lp.r * W; bar += `<path d="M${rx} 56 l-7 12 h14 z" fill="#1d2634"/><text x="${rx}" y="84" text-anchor="middle" font-size="12" font-weight="700" fill="#1d2634">r = ${lp.r.toFixed(3)}</text>`; }
    bar += `</svg>`;
    box.innerHTML = `<div class="panel"><div class="h">The spinner, laid flat: each token gets a stretch as wide as its chance</div>${bar}</div><div class="panel" style="margin-top:10px;overflow-x:auto"><table class="t"><tr><th>Rank</th><th>Token</th><th>Chance</th><th>r that picks it</th></tr>${rows.join('')}</table></div>`;
    NT.setStatus((lp ? `r = ${lp.r.toFixed(3)} lands on “${NT.tokText(lp.id).trim()}” (rank ${int(lp.rank)}, ${pct(lp.p)})` : `T ${S.T} · Top-K ${NT.kLabel(S.K)} · top token ${pct(pr.p[0])}`) + note);
  }

  // ===================== 8. REPEAT =====================
  // Two views: "One at a time" (watch the loop, with a log of every pick) and "Side by side" (Greedy / Typical / Wild at once)
  const rp = { view: 'one', base: null, hist: [], log: [], run: 0, busy: false, loop: false, count: 10, scount: 50, cols: null, sbase: null, greedy: { base: null, toks: [] } };
  const PRE = [{ name: 'Greedy', T: 0.2, K: 1 }, { name: 'Typical', T: 1, K: 5 }, { name: 'Wild', T: 10, K: 50 }];
  const KOPT = [1, 2, 3, 5, 10, 20, 50, NT.ALL];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hasWord = (t) => /\S/.test(t);
  const STAGES = ['Sentence', 'Tokens', 'IDs', 'Embeddings', 'Transformer', 'Logits', 'Pick'];
  // one pick from GPT-2 (stored scores for the first step of a stored sentence, live GPT-2 after that)
  async function nextTok(ids, T, K) {
    const d = await NT.dist(ids), pr = NT.probs(d, T, K);
    let i = 0, r = 0;
    for (let k = 0; k < 20; k++) { r = Math.random(); i = NT.pickIndex(pr.p, r); if (pr.ids[i] !== 50256) break; }
    const id = pr.ids[i];
    return { id, t: id === 50256 ? '\n\n' : NT.tokText(id), p: pr.p[i], rank: i + 1, r };
  }
  NT.stations.repeat = {
    init() {
      rp.run++; rp.loop = false; rp.busy = false;
      const cur = NT.current();
      if (rp.base == null || rp.base + rp.log.map((x) => x.t).join('') !== S.text) { rp.base = cur.text; rp.baseIds = cur.ids; rp.hist = []; rp.log = []; }
      tb().innerHTML = `<div class="seg" id="rSeg">${[['one', 'One at a time'], ['side', 'Side by side']].map(([v, l]) => `<button data-v="${v}" class="${rp.view === v ? 'on' : ''}">${l}</button>`).join('')}</div><span id="rTools" style="display:contents"></span>`;
      tb().querySelectorAll('#rSeg button').forEach((b) => (b.onclick = () => { rp.view = b.dataset.v; NT.stations.repeat.init(); }));
      if (rp.view === 'one') oneInit(); else sideInit();
    },
    onText(how) {
      if (how !== 'append') { rp.base = null; rp.cols = null; rp.sbase = null; NT.render(); return; }
      if (rp.view === 'one') drawOne();
    },
    onTK() { if (rp.view === 'one') drawOne(); else NT.setStatus('Side by side uses its own settings'); },
  };
  const countOpts = (arr, sel) => arr.map((n) => `<option value="${n}" ${n === sel ? 'selected' : ''}>${n}</option>`).join('');

  // ---------- One at a time ----------
  function oneInit() {
    $('#rTools').innerHTML = `<div class="chips"><button class="chip" data-p="g">Greedy</button><button class="chip" data-p="t">Typical</button><button class="chip" data-p="w">Wild</button></div>
      <button class="btn primary" id="rOne">Pick &amp; add a word</button><span class="ctl"><button class="btn" id="rMany">Add</button><select id="rCount">${countOpts([5, 10, 25, 50, 100], rp.count)}</select> words</span>
      <button class="btn danger" id="rStop" hidden>Stop</button><button class="btn" id="rUndo">Undo</button><button class="btn ghost" id="rClear">Start over</button>`;
    tb().querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { const p = b.dataset.p; if (p === 'g') NT.setTK(0.2, 1); if (p === 't') NT.setTK(1, 5); if (p === 'w') NT.setTK(10, 50); }));
    $('#rCount').onchange = (e) => { rp.count = +e.target.value; };
    $('#rOne').onclick = () => addOne(rp.run, true);
    $('#rMany').onclick = () => runMany(rp.count);
    $('#rStop').onclick = () => { rp.run++; rp.loop = false; rp.busy = false; $('#rpWait') && ($('#rpWait').innerHTML = ''); drawOne(); };
    $('#rUndo').onclick = () => { if (rp.hist.length && !rp.loop) { rp.log.pop(); NT.setText(rp.hist.pop(), 'append'); } };
    $('#rClear').onclick = () => { if (rp.loop) return; rp.hist = []; rp.log = []; NT.setText(rp.base, 'append'); };
    st().innerHTML = `<div class="panel"><div class="sentence" id="rSent" style="font-size:1.3rem;white-space:pre-wrap"></div><div id="rpWait"></div></div>
      <div class="panel" style="margin-top:12px"><svg id="rPipe" viewBox="0 0 900 96" width="100%"></svg></div>
      <div class="panel" style="margin-top:12px"><div class="h">Every pick so far</div><div id="rLog" style="max-height:250px;overflow:auto"></div></div>`;
    drawPipe(-1); drawOne();
  }
  function drawPipe(on) {
    const el = $('#rPipe'); if (!el) return;
    let h = `<defs><marker id="pa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#9aa5b5"/></marker></defs>`;
    STAGES.forEach((l, i) => { const x = 10 + i * 126; h += `<rect x="${x}" y="14" width="110" height="34" rx="8" fill="${i === on ? '#5b38d1' : '#f4f6f9'}" stroke="${i === on ? '#5b38d1' : '#c8d0db'}"/><text x="${x + 55}" y="36" text-anchor="middle" font-size="13" font-weight="650" fill="${i === on ? '#fff' : '#33455a'}">${l}</text>`; if (i < 6) h += `<path d="M${x + 112} 31 h12" stroke="#9aa5b5" marker-end="url(#pa)"/>`; });
    h += `<path d="M${10 + 6 * 126 + 55} 50 v18 H65 v-18" fill="none" stroke="#9aa5b5" stroke-dasharray="4 3" marker-end="url(#pa)"/><text x="450" y="86" text-anchor="middle" font-size="12" fill="#5b6a7a">the new word joins the sentence, and the whole loop runs again</text>`;
    el.innerHTML = h;
  }
  function drawOne() {
    if (!$('#rSent')) return;
    const t = S.text, b = rp.base || '';
    $('#rSent').innerHTML = `${esc(b)}${t.length > b.length ? `<span style="background:#eee9ff;border-radius:4px;padding:0 2px">${esc(t.slice(b.length))}</span>` : ''}`;
    const L = rp.log; if (!rp.busy && $('#rpWait')) $('#rpWait').innerHTML = '';
    $('#rLog').innerHTML = L.length ? `<table class="t"><tr><th>#</th><th>Word</th><th>Chance</th><th>Rank</th><th>r</th></tr>${L.map((x, i) => `<tr><td>${i + 1}</td><td class="tokc">${hasWord(x.t) ? show(x.t) : '↵ line break'}</td><td>${pct(x.p, 1)}</td><td>${int(x.rank)}</td><td>${x.r.toFixed(3)}</td></tr>`).join('')}</table>` : '<div class="muted">—</div>';
    const lg = $('#rLog'); lg.scrollTop = lg.scrollHeight;
    $('#rStop').hidden = !rp.loop; $('#rOne').disabled = rp.loop; $('#rMany').disabled = rp.loop; $('#rUndo').disabled = rp.loop || !rp.hist.length; $('#rClear').disabled = rp.loop || S.text === rp.base;
    NT.setStatus(`${L.filter((x) => hasWord(x.t)).length} words added · T ${S.T} · Top-K ${NT.kLabel(S.K)}`);
  }
  async function addOne(my, animate) {
    if (rp.busy) return false; rp.busy = true;
    try {
      const ids = rp.baseIds.concat(rp.log.map((x) => x.id)); // keep the exact tokens GPT-2 picked; re-reading the text could merge them differently
      if (!NT.hasFull(ids) && $('#rpWait')) $('#rpWait').innerHTML = pend();
      if (animate) for (let i = 0; i < 6; i++) { drawPipe(i); await sleep(90); }
      const x = await nextTok(ids, S.T, S.K);
      if ($('#rpWait')) $('#rpWait').innerHTML = '';
      if (my !== rp.run || S.station !== 'repeat') return false;
      if (animate) { drawPipe(6); await sleep(160); drawPipe(-1); }
      rp.hist.push(S.text); rp.log.push(x); rp.busy = false;
      NT.setText(S.text + x.t, 'append'); return true;
    } catch (e) { if ($('#rpWait')) $('#rpWait').innerHTML = pend(FAIL); return false; } finally { rp.busy = false; }
  }
  async function runMany(n) {
    const my = ++rp.run; rp.loop = true; drawOne();
    let added = 0;
    for (let guard = 0; added < n && guard < n * 3 && my === rp.run && S.station === 'repeat' && rp.view === 'one'; guard++) {
      const ok = await addOne(my, false); if (!ok) break;
      if (hasWord(rp.log[rp.log.length - 1].t)) added++;
      await sleep(40);
    }
    if (my === rp.run) { rp.loop = false; drawOne(); }
  }

  // ---------- Side by side ----------
  function sideInit() {
    $('#rTools').innerHTML = `<span class="ctl"><button class="btn primary" id="sGo">Write</button><select id="sCount">${countOpts([25, 50, 100], rp.scount)}</select> words each</span><button class="btn danger" id="sStop" hidden>Stop</button>`;
    $('#sCount').onchange = (e) => { rp.scount = +e.target.value; };
    $('#sGo').onclick = () => runSide(rp.scount);
    $('#sStop').onclick = () => { rp.run++; rp.loop = false; drawSide(); };
    if (!rp.cols || !rp.cols.some((c) => c.gen)) rp.sbase = null;
    if (!rp.cols) rp.cols = PRE.map((p) => ({ ...p, gen: '', words: 0, uniq: new Set(), done: false }));
    st().innerHTML = `<div class="grid3" id="sCols"></div>`;
    drawSide(true);
  }
  function drawSide(rebuild) {
    const box = $('#sCols'); if (!box) return;
    const base = rp.sbase ?? NT.current().text;
    if (rebuild) {
      box.innerHTML = rp.cols.map((c, i) => `<div class="panel"><div class="h">${c.name}<span class="muted" style="font-weight:500;margin-left:8px">T</span> <select data-i="${i}" data-k="T">${NT.TEMPS.map((t) => `<option value="${t}" ${t === c.T ? 'selected' : ''}>${t <= 1 ? t.toFixed(1) : t}</option>`).join('')}</select> <span class="muted" style="font-weight:500">Top-K</span> <select data-i="${i}" data-k="K">${KOPT.map((k) => `<option value="${k}" ${k === c.K ? 'selected' : ''}>${NT.kLabel(k)}</option>`).join('')}</select></div><div class="sentence" id="sc${i}" style="font-size:1.02rem;white-space:pre-wrap;min-height:260px;max-height:460px;overflow:auto"></div><div class="muted" id="ss${i}" style="margin-top:6px;font-size:.82rem"></div></div>`).join('');
      box.querySelectorAll('select').forEach((sel) => (sel.onchange = () => { rp.cols[+sel.dataset.i][sel.dataset.k] = +sel.value; }));
    }
    rp.cols.forEach((c, i) => {
      $('#sc' + i).innerHTML = `${esc(base)}${c.gen ? `<span style="background:#eee9ff;border-radius:4px;padding:0 2px">${esc(c.gen)}</span>` : ''}`;
      $('#ss' + i).textContent = c.words ? `${c.words} words · ${c.uniq.size} different` : '';
      const el = $('#sc' + i); el.scrollTop = el.scrollHeight;
    });
    $('#sStop').hidden = !rp.loop; $('#sGo').disabled = rp.loop;
    NT.setStatus(rp.loop ? 'Writing all three, one word at a time…' : 'Same start, three settings. Press Write again for a new draw.');
  }
  async function runSide(n) {
    const my = ++rp.run; rp.loop = true; rp.sbase = NT.current().text; const base = rp.sbase;
    rp.cols = rp.cols.map((c) => ({ ...c, gen: '', n: 0, ids: [], words: 0, uniq: new Set(), done: false }));
    if (rp.greedy.base !== base) rp.greedy = { base, toks: [] };
    drawSide(false);
    const ids0 = NT.current().ids;
    rp.cols.forEach((c) => (c.ids = ids0.slice()));
    try {
      for (let guard = 0; guard < n * 3 && my === rp.run && S.station === 'repeat' && rp.view === 'side' && rp.cols.some((c) => !c.done); guard++) {
        for (const c of rp.cols) {
          if (c.done || my !== rp.run) continue;
          let x;
          if (c.K === 1 && rp.greedy.toks[c.n || 0]) x = rp.greedy.toks[c.n || 0];
          else {
            const ids = c.ids;
            if (!NT.hasFull(ids)) $('#ss' + rp.cols.indexOf(c)).textContent = 'GPT-2 is thinking…';
            x = await nextTok(ids, c.T, c.K); if (c.K === 1 && (c.n || 0) === rp.greedy.toks.length) rp.greedy.toks.push(x);
          }
          if (my !== rp.run) break;
          c.n = (c.n || 0) + 1; c.gen += x.t; c.ids = c.ids.concat([x.id]);
          if (hasWord(x.t)) { c.words++; c.uniq.add(x.t.trim().toLowerCase()); }
          if (c.words >= n) c.done = true;
          drawSide(false);
        }
      }
    } catch (e) { const w = document.createElement('div'); w.innerHTML = pend(FAIL); $('#sCols').before(w); }
    if (my === rp.run) { rp.loop = false; drawSide(false); }
  }

  // ===================== SHOW THE NUMBERS (Q·K·V, Logits, Probabilities / Pick) =====================
  NT.numbers = NT.numbers || {};
  const sup = (a, b) => `e<sup>${a}</sup>`;
  const tq = (id) => `“${esc(NT.tokText(id).trim())}”`;
  NT.numbers.transformer = () => {
    if (S.trView !== 'qkv') return null;
    const F = NT.nf, q = S.qkvQ, W = QKV.words, sc = QKV.scores[q], step = S.qkvStep, rows = [];
    rows.push(F.formula(`share<sub>j</sub> = e<sup>match<sub>j</sub></sup> ÷ ( e<sup>match<sub>1</sub></sup> + e<sup>match<sub>2</sub></sup> + … )`));
    if (step < 1) { rows.push(F.eq(`match = Query · Key, one number for each word that can answer “${esc(W[q])}”`)); return F.box(`The numbers · “${esc(W[q])}” asks`, rows); }
    const e = sc.map((x) => Math.exp(x)), z = e.reduce((a, b) => a + b, 0), sh = e.map((x) => x / z);
    let t = `<table class="t"><tr><th>Word</th><th>Key match</th>${step >= 2 ? '<th>e<sup>match</sup></th><th>Share</th>' : ''}</tr>`;
    sc.forEach((v, i) => { t += `<tr><td class="tokc">${esc(W[i])}</td><td>${v.toFixed(1)}</td>${step >= 2 ? `<td>${e[i].toFixed(2)}</td><td>${pct(sh[i], 0)}</td>` : ''}</tr>`; });
    if (step >= 2) t += `<tr class="pick"><td class="tokc"><b>Total</b></td><td></td><td><b>${z.toFixed(2)}</b></td><td><b>100%</b></td></tr>`;
    rows.push(t + '</table>');
    if (step >= 3) {
      const parts = sh.map((v, i) => [v, i]).filter(([v]) => v >= 0.05).sort((a, b) => b[0] - a[0]).map(([v, i]) => `${pct(v, 0)} × Value(${esc(W[i])})`);
      rows.push(F.eq(`new “${esc(W[q])}” row = ${parts.join(' + ')}${parts.length < sh.length ? ' + …' : ''}`));
    }
    return F.box(`The numbers · “${esc(W[q])}” asks · made-up classroom scores`, rows);
  };
  NT.numbers.logits = () => {
    if (!LG) return null;
    const F = NT.nf, { d, base } = LG, step = S.lgStep, ex = NT.EX.banker, rows = [];
    rows.push(F.formula(`logit<sub>token</sub> = row<sub>1</sub> × final<sub>1</sub> + row<sub>2</sub> × final<sub>2</sub> + … + row<sub>768</sub> × final<sub>768</sub>`));
    if (base && step === 1) {
      const i = S.lgZoom, id = ex.topRows.ids[i], row = ex.topRows.rows.slice(i * 768, i * 768 + 768);
      let sum = 0; for (let k = 0; k < 768; k++) sum += row[k] * ex.final[k];
      const t3 = [0, 1, 2].map((k) => `${F.f(row[k])} × ${F.f(ex.final[k])} = ${F.f(row[k] * ex.final[k])}`);
      rows.push(F.eq(`${tq(id)}\n  ${t3.join('\n  ')}\n  … 765 more terms\n  all 768 added up: <b>${F.f(d.logits && d.logits[id] != null ? d.logits[id] : sum, 2)}</b>`));
    } else if (step <= 2) {
      rows.push(F.eq(`One score takes 768 multiplications. All 50,257 tokens: 50,257 × 768 = <b>${NT.int(50257 * 768)}</b> multiplications.`));
    } else {
      const top = topOf(d, 3), gap = (i) => top.lg[i] - top.lg[0];
      rows.push(F.eq(top.ids.map((id, i) => `${tq(id).padEnd(14)} ${F.f(top.lg[i], 2)}   behind the leader: ${i ? F.f(gap(i), 2) : '—'}`).join('\n')));
    }
    return F.box('The numbers · from the final vector to a score', rows);
  };
  NT.numbers.pick = () => {
    if (!PK) return null;
    const F = NT.nf, d = PK.d, T = S.T, K = S.K, rows = [], tf = (t) => (t <= 1 ? t.toFixed(1) : String(t));
    const note = (pr) => (d.partial ? ` (stored top ${pr.K})` : '');
    if (S.pickView === 'soft') {
      const pr = NT.probs(d, T, NT.ALL), tot = 1 / pr.p[0];
      rows.push(F.formula(`P<sub>i</sub> = e<sup>x<sub>i</sub> ⁄ T</sup> ÷ ( e<sup>x<sub>1</sub> ⁄ T</sup> + e<sup>x<sub>2</sub> ⁄ T</sup> + … + e<sup>x<sub>n</sub> ⁄ T</sup> )`));
      rows.push(F.eq([0, 1].filter((i) => i < pr.K).map((i) => { const g = (pr.logits[i] - pr.logits[0]) / T, e = Math.exp(g); return `P(${tq(pr.ids[i])}) = e<sup>${F.f(g, 2)}</sup> ÷ ${F.big(tot)} = ${F.big(e)} ÷ ${F.big(tot)} = <b>${pct(pr.p[i], 2)}</b>`; }).join('\n') + `\nT = ${tf(T)} · the total adds e<sup>(x−x₁)/T</sup> for all ${NT.int(pr.K)} tokens${note(pr)}`));
      rows.push(`<div class="nnote">x₁ is the leader’s score. Taking it away from every score gives the same percentages with smaller numbers.</div>`);
    } else if (S.pickView === 'temp') {
      rows.push(F.formula(`P<sub>i</sub> = e<sup>(x<sub>i</sub> − x<sub>1</sub>) ⁄ T</sup> ÷ Σ`));
      let t = `<table class="t"><tr><th>T</th><th>#2 behind ÷ T</th><th>e<sup>that</sup></th><th>Σ over ${K >= NT.ALL ? 'all' : NT.int(Math.min(K, d.partial ? d.ids.length : NT.ALL))} tokens</th><th>P(#1) = 1 ÷ Σ</th><th>P(#2)</th></tr>`;
      for (const tt of [0.2, 1, 10]) { const pr = NT.probs(d, tt, K), tot = 1 / pr.p[0]; if (pr.K < 2) continue; const g = (pr.logits[1] - pr.logits[0]) / tt; t += `<tr><td>${tt}</td><td>${F.f(g, 2)}</td><td>${Math.exp(g).toFixed(3)}</td><td>${F.big(tot)}</td><td>${pct(pr.p[0], 2)}</td><td>${pct(pr.p[1], 2)}</td></tr>`; }
      rows.push(t + '</table>');
    } else if (S.pickView === 'topk') {
      const all = NT.probs(d, T, NT.ALL), cut = NT.probs(d, T, K), Kk = cut.K;
      rows.push(F.formula(`P<sub>new</sub> = P<sub>old</sub> ÷ ( the K kept chances added up )`));
      if (Kk >= all.K) rows.push(F.eq('Top-K is All: nothing is cut, so the kept chances add up to 100% and nothing changes.'));
      else {
        let kept = 0; for (let i = 0; i < Kk; i++) kept += all.p[i];
        const sh = Math.min(3, Kk), terms = Array.from({ length: sh }, (_, i) => pct(all.p[i], 2)).join(' + ');
        rows.push(F.eq(`kept = ${terms}${Kk > sh ? ' + …' : ''} (${Kk} tokens) = <b>${pct(kept, 1)}</b>\n` + [0, 1].filter((i) => i < Kk).map((i) => `P(${tq(all.ids[i])}) = ${pct(all.p[i], 2)} ÷ ${pct(kept, 1)} = <b>${pct(cut.p[i], 1)}</b>`).join('\n')));
      }
    } else {
      const pr = NT.probs(d, T, K), lp = S.lastPick, n = Math.min(4, pr.K);
      rows.push(F.formula(`pick the first token whose running total is bigger than r`));
      let c = 0; const run = []; for (let i = 0; i < n; i++) { c += pr.p[i]; run.push(c.toFixed(3)); }
      rows.push(F.eq(`running total: 0.000 → ${run.join(' → ')}${pr.K > n ? ' → …' : ''}`));
      if (lp) {
        let lo = 0; for (let i = 0; i < lp.i; i++) lo += pr.p[i]; const hi = lo + pr.p[lp.i], dp = hi - lo < 0.001 ? 5 : 3;
        rows.push(F.eq(`r = <b>${lp.r.toFixed(dp)}</b>\nrunning total before ${tq(lp.id)} (rank ${NT.int(lp.rank)}): ${lo.toFixed(dp)}, with it: ${hi.toFixed(dp)}\n${lo.toFixed(dp)} ≤ ${lp.r.toFixed(dp)} < ${hi.toFixed(dp)} → <b>${tq(lp.id)}</b>`));
      } else rows.push(F.eq('Press Pick to draw r.'));
    }
    return F.box('The numbers · from scores to a pick', rows);
  };
})();
