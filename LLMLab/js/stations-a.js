/* Tabs 1–4: Next Word, Tokens, IDs, Embeddings */
'use strict';
(() => {
  const { $, esc, show, pct, int } = NT;
  NT.stations = NT.stations || {};
  const S = NT.state;
  const tb = () => $('#toolbar'), st = () => $('#stage');
  const wire = (id, { prev, next, play }) => { const el = $(id); if (!el) return; el.querySelector('[data-a=prev]').onclick = prev; el.querySelector('[data-a=next]').onclick = next; const p = el.querySelector('[data-a=play]'); if (p && play) p.onclick = play; };
  NT.wireStepper = wire;

  // ===================== 1. NEXT WORD =====================
  const nw = { guesses: [], revealed: false, base: null, token: 0 };
  const needLive = (ids) => !NT.hasFull(ids);
  function pendingHTML(msg) {
    const s = NT.live.state, p = s.phase === 'downloading' ? Math.round(s.progress * 100) : null;
    return `<div class="revealbox"><div>${msg || (s.phase === 'downloading' ? 'Loading GPT-2…' : s.phase === 'starting' ? 'Starting GPT-2…' : s.phase === 'error' ? 'GPT-2 could not be reached' : 'GPT-2 is thinking…')}${p != null ? `<div class="meter"><i style="width:${p}%"></i></div>` : ''}</div></div>`;
  }
  NT.pendingHTML = pendingHTML;
  const addWord = (w, raw) => {
    const base = S.text.replace(/\s+$/, '');
    NT.setText(base + (raw !== undefined ? raw : /^[.,;:!?%)\]]/.test(w) ? w : ' ' + w), 'append');
    setTimeout(() => { const g = $('#guessIn'); if (g) g.focus(); }, 30);
  };
  NT.stations.next = {
    init() {
      const cur = NT.current();
      if (nw.base == null || !cur.text.startsWith(nw.base)) nw.base = cur.text;
      tb().innerHTML = `<input type="text" id="guessIn" placeholder="a student’s next word" autocomplete="off" style="max-width:260px" /><button class="btn" id="guessAdd">Add</button><button class="btn ghost" id="guessClear">Clear</button>`;
      st().innerHTML = `<div class="nwline" id="nwLine"></div><div class="nwgrid"><div class="panel"><div class="panelhead"><span class="h">Class</span></div><div id="classBars"></div></div><div class="panel"><div class="panelhead"><span class="h">GPT-2</span><span id="gptTools"></span></div><div id="modelBars"></div></div></div>`;
      const add = () => { const v = $('#guessIn').value.trim(); (/^[^\w\s]+$/.test(v) ? [v] : v.split(/[\s,]+/)).filter(Boolean).forEach((w) => nw.guesses.push(w.toLowerCase())); $('#guessIn').value = ''; drawClass(); drawModel(); $('#guessIn').focus(); };
      $('#guessAdd').onclick = add;
      $('#guessIn').onkeydown = (e) => { if (e.key === 'Enter') add(); };
      $('#guessClear').onclick = () => { nw.guesses = []; drawClass(); drawModel(); };
      const t = cur.text, b = nw.base;
      $('#nwLine').style.whiteSpace = 'pre-wrap';
      $('#nwLine').innerHTML = `${esc(b)}${t.length > b.length ? `<span class="added">${esc(t.slice(b.length))}</span>` : ''} <span class="blank">&nbsp;</span>`;
      drawClass(); drawModel();
      NT.onLive = () => { if (S.station === 'next' && nw.revealed && nw.waiting) $('#modelBars').innerHTML = pendingHTML(); };
    },
    onText(how) { if (how !== 'append') nw.base = null; nw.guesses = []; nw.revealed = false; nw.waiting = false; NT.render(); const g = $('#guessIn'); if (g && how === 'append') g.focus(); },
    onTK() { drawModel(); },
  };
  function classRows() {
    const counts = new Map(); nw.guesses.forEach((g) => counts.set(g, (counts.get(g) || 0) + 1));
    const n = nw.guesses.length, keys = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
    return { n, rows: keys.map((k) => ({ l: k, v: counts.get(k) / n, t: `${counts.get(k)} · ${pct(counts.get(k) / n, 0)}`, title: 'Double-click to add to the sentence' })) };
  }
  function drawClass() {
    const { n, rows } = classRows(), box = $('#classBars');
    box.innerHTML = n ? NT.bars(rows) : '<div class="muted">—</div>';
    const bars = box.querySelector('.bars'); if (bars) { bars.classList.add('pickable'); bars.querySelectorAll('.row').forEach((el) => (el.ondblclick = () => addWord(rows[+el.dataset.i].l))); }
    NT.setStatus(n ? `${n} guesses · ${rows.length} different words${rows[0] ? ` · most popular “${rows[0].l}”` : ''}` : '');
  }
  async function drawModel() {
    const box = $('#modelBars'), tools = $('#gptTools'); if (!box) return;
    const cur = NT.current(), ids = cur.ids;
    if (!nw.revealed) {
      tools.innerHTML = ''; box.innerHTML = `<div class="revealbox"><button class="btn primary" id="revealBtn">Reveal</button></div>`;
      $('#revealBtn').onclick = () => { nw.revealed = true; drawModel(); }; return;
    }
    tools.innerHTML = `<button class="btn small" id="hideBtn">Hide</button><button class="btn small primary" id="writeOn" title="Let GPT-2 keep writing from this sentence">Write on ›</button>`; $('#hideBtn').onclick = () => { nw.revealed = false; nw.waiting = false; drawModel(); }; $('#writeOn').onclick = () => NT.go('repeat');
    let d;
    if (needLive(ids)) {
      nw.waiting = true; box.innerHTML = pendingHTML(); const tk = ++nw.token;
      try { d = await NT.dist(ids); } catch (e) { if (tk === nw.token && nw.revealed) { box.innerHTML = pendingHTML('GPT-2 could not be reached. Stored sentences still work.'); } return; }
      nw.waiting = false; if (tk !== nw.token || !nw.revealed || NT.current().text !== cur.text) return;
    } else d = await NT.dist(ids);
    const pr = NT.probs(d, S.T, S.K), { rows: crow } = classRows(), cid = new Map();
    crow.forEach((r) => { const id = NT.encode(' ' + r.l)[0]; if (id !== undefined) cid.set(id, r.l); });
    const show15 = Math.min(15, pr.K), rows = [];
    for (let i = 0; i < show15; i++) rows.push({ l: NT.tokText(pr.ids[i]), v: pr.p[i], mark: cid.has(pr.ids[i]), title: 'Double-click to add to the sentence', id: pr.ids[i] });
    const extra = []; cid.forEach((w, id) => { const r = d.rank[id]; if (r > show15) extra.push({ w, id, r }); });
    extra.sort((a, b) => a.r - b.r);
    const top = rows[0].v;
    box.innerHTML = NT.bars(rows, top) + (extra.length ? `<div style="margin-top:8px">${NT.bars(extra.map((x) => ({ l: ` ${x.w}  #${int(x.r)}`, v: x.r <= pr.K ? pr.p[x.r - 1] : 0, mark: true, t: x.r <= pr.K ? pct(pr.p[x.r - 1], 3) : 'cut', title: 'Double-click to add to the sentence' })), top)}</div>` : '');
    const bars = box.querySelectorAll('.bars');
    bars[0].classList.add('pickable'); bars[0].querySelectorAll('.row').forEach((el) => (el.ondblclick = () => addWord(null, NT.tokText(rows[+el.dataset.i].id))));
    if (bars[1]) { bars[1].classList.add('pickable'); bars[1].querySelectorAll('.row').forEach((el) => (el.ondblclick = () => addWord(extra[+el.dataset.i].w))); }
    NT.setStatus(`GPT-2 top word “${NT.tokText(pr.ids[0]).trim()}” ${pct(pr.p[0])} · T ${S.T} · Top-K ${NT.kLabel(S.K)}${S.K >= NT.ALL ? ` (all ${int(NT.ALL)} words)` : ''}${classRows().n ? ` · ${classRows().n} guesses` : ''}`);
  }

  // ===================== 2. TOKENS =====================
  S.tokView = 'split'; S.showIds = false;
  const DOCS = [
    ['A single long word', 'unbelievable'],
    ['The textbook sentence', 'He disestablished the establishment thoroughly, even though it cost him $1,254.63 for 25 hours of lawyer time.'],
    ['Banker and river bank', 'The banker left the bank and sat on the left bank of the river.'],
    ['The dictionary-size question', 'The banker left the bank and sat on left of the river bank.'],
    ['The classic BPE example', 'low low low low low lower lower newest newest newest newest newest newest widest widest widest'],
    ['Patterns inside words', 'banana bandana cabana'],
    ['A made-up giant word', 'Supercalifragilisticexpialidocious'],
    ['Phone number, smiley, math', '847-867-5309 :-) y=wx+b !?&%%'],
    ['Capital letters matter', 'The the THE'],
    ['Code', 'def add(a, b): return a + b  # 2 + 2 = 4'],
    ['Other languages and emoji', 'Hello, bonjour, hola, 你好, こんにちは 😀'],
  ];
  NT.stations.tokens = {
    init() {
      const cur = NT.current(), match = DOCS.findIndex((d) => d[1] === cur.text);
      tb().innerHTML = `<div class="seg" id="tokSeg"><button data-v="split" class="${S.tokView === 'split' ? 'on' : ''}">Split text</button><button data-v="build" class="${S.tokView === 'build' ? 'on' : ''}">Build the tokenizer</button></div>
        <select id="docSel" aria-label="Texts that show off tokenization"><option value="">Texts to try…</option>${DOCS.map((d, i) => `<option value="${i}" ${i === match ? 'selected' : ''}>${esc(d[0])}</option>`).join('')}</select><span id="tokTools" style="display:contents"></span>`;
      tb().querySelectorAll('#tokSeg button').forEach((b) => (b.onclick = () => { S.tokView = b.dataset.v; NT.stations.tokens.init(); }));
      $('#docSel').onchange = (e) => { if (e.target.value !== '') NT.setText(DOCS[+e.target.value][1], 'edit'); };
      if (S.tokView === 'split') splitInit(); else buildInit();
    },
    onTK() {},
  };
  function splitInit() {
    $('#tokTools').innerHTML = `<label class="ctl"><input type="checkbox" id="idTog" ${S.showIds ? 'checked' : ''}/> Show IDs</label>`;
    st().innerHTML = `<div class="panel" style="min-height:120px"><div class="toks" id="tokChips"></div></div><div class="grid2" style="margin-top:12px"><div class="panel"><div class="h">Pieces in this text</div><div id="pieces"></div></div><div class="panel"><div class="h">Dictionary size <span class="muted" style="font-weight:500">(log scale)</span></div><div id="dict"></div></div></div>`;
    $('#idTog').onchange = (e) => { S.showIds = e.target.checked; drawSplit(); };
    drawSplit();
  }
  function drawSplit() {
    const cur = NT.current(), text = cur.text, ids = cur.ids, n = ids.length;
    $('#tokChips').innerHTML = ids.map((id, i) => `<span class="tok ${i % 2 ? 'alt' : ''}" style="${NT.tokStyle(i, n)}">${S.showIds ? id : show(NT.tokText(id))}</span>`).join('');
    const chars = Array.from(text).length, words = text.trim() ? text.trim().split(/\s+/).length : 0;
    $('#pieces').innerHTML = NT.bars([{ l: 'Characters', v: chars, t: int(chars) }, { l: 'Words', v: words, t: int(words) }, { l: 'Tokens', v: n, t: int(n), mark: true }]);
    const lg = (x) => Math.log10(x);
    $('#dict').innerHTML = NT.bars([{ l: 'Characters', v: lg(26), t: '26+' }, { l: 'Words', v: lg(600000), t: '600,000' }, { l: 'Tokens', v: lg(50257), t: '50,257', mark: true }], lg(600000));
    NT.setStatus(`${int(chars)} characters → ${int(n)} tokens`);
  }

  // --- Build the tokenizer (byte pair encoding on the sentence at the top) ---
  let B = null, playTimer = null;
  const dots = (s) => show(s).replace(/ /g, '·');
  function bpeReset(text) {
    stopPlay();
    B = { text, hist: [{ pieces: Array.from(text), hot: [], count: 0 }], merges: [], guess: null, verdict: null, real: B ? B.real : false };
  }
  function bestPair(pieces) {
    const cnt = new Map();
    for (let i = 0; i < pieces.length - 1; i++) { const k = pieces[i] + '\u0000' + pieces[i + 1]; cnt.set(k, (cnt.get(k) || 0) + 1); }
    let best = null, bc = 1;
    for (const [k, c] of cnt) { if (c > bc || (c === bc && c > 1 && best !== null && k < best)) { best = k; bc = c; } }
    return best && bc > 1 ? { pair: best.split('\u0000'), count: bc } : null;
  }
  function stopPlay() { if (playTimer) { clearInterval(playTimer); playTimer = null; } const b = document.querySelector('#bpeStep [data-a=play]'); if (b) b.textContent = 'Play'; }
  function buildInit() {
    const cur = NT.current(); if (!B || B.text !== cur.text) bpeReset(cur.text);
    $('#tokTools').innerHTML = `${NT.stepper('bpeStep', { play: true })}<button class="btn" id="bpeFinish">Finish</button><button class="btn ghost" id="bpeReset">Reset</button><label class="ctl"><input type="checkbox" id="realTog" ${B.real ? 'checked' : ''}/> GPT-2’s tokens</label>`;
    st().innerHTML = `<div class="panel"><div class="toks" id="bpeChips" style="min-height:70px"></div><div id="realRow" style="margin-top:14px"></div></div>
      <div class="mergegrid"><div class="panel"><div class="h">Merges <span class="muted" style="font-weight:500">and where GPT-2 made the same merge</span></div><div id="mergeList"></div></div><div class="panel"><div class="h">Our tokenizer vs GPT-2’s</div><div id="bridge"></div></div></div>
      <div class="panel" style="margin-top:12px"><div class="h">GPT-2’s first merges <span class="muted" style="font-weight:500">the most common pairs in its training text</span></div><div class="firstm mono" id="firstM"></div></div>`;
    wire('#bpeStep', { prev: () => { stopPlay(); buildStep(-1); }, next: () => { stopPlay(); buildStep(1); }, play: () => { if (playTimer) return stopPlay(); document.querySelector('#bpeStep [data-a=play]').textContent = 'Pause'; playTimer = setInterval(() => { if (!buildStep(1)) stopPlay(); }, 900); } });
    $('#bpeReset').onclick = () => { bpeReset(NT.current().text); drawBuild(); };
    $('#bpeFinish').onclick = () => { stopPlay(); while (buildStep(1, true)); drawBuild(); };
    $('#realTog').onchange = (e) => { B.real = e.target.checked; drawBuild(); };
    const fm = []; for (let i = 0; i < 28; i++) { const [a, b] = NT.mergeAt(i); fm.push(`<div>${String(i + 1).padStart(2)}  ${dots(a)}${dots(b)}</div>`); }
    $('#firstM').innerHTML = fm.join('');
    drawBuild();
  }
  function buildStep(dir, quiet) {
    if (dir < 0) { if (B.hist.length < 2) return false; B.hist.pop(); B.merges.pop(); B.guess = null; B.verdict = null; drawBuild(); return true; }
    const cur = B.hist.at(-1).pieces, bp = bestPair(cur);
    if (!bp) return false;
    const [a, b] = bp.pair, next = [], hot = [];
    for (let i = 0; i < cur.length; i++) { if (i < cur.length - 1 && cur[i] === a && cur[i + 1] === b) { hot.push(next.length); next.push(a + b); i++; } else next.push(cur[i]); }
    B.verdict = B.guess ? (B.guess[0] === a && B.guess[1] === b ? 'ok' : 'no') : null; B.guess = null;
    B.hist.push({ pieces: next, hot, count: bp.count }); B.merges.push({ a, b, m: a + b, c: bp.count, rank: NT.mergeRank(a, b) });
    if (!quiet) drawBuild(); return true;
  }
  function drawBuild() {
    if (!$('#bpeChips')) return;
    const h = B.hist.at(-1), hot = new Set(h.hot || []);
    $('#bpeChips').innerHTML = h.pieces.map((p, i) => `<span class="tok ${hot.has(i) ? (B.verdict === 'no' ? 'no' : B.verdict === 'ok' ? 'ok' : 'hot') : i % 2 ? 'alt' : ''} ${B.guess && B.guess.i === i ? 'sel' : ''}" data-i="${i}">${dots(p)}</span>`).join('');
    $('#bpeChips').querySelectorAll('.tok').forEach((el) => (el.onclick = () => { const i = +el.dataset.i; if (i >= h.pieces.length - 1) return; B.guess = { 0: h.pieces[i], 1: h.pieces[i + 1], i }; B.verdict = null; drawBuild(); }));
    const mx = NT.MERGES;
    $('#mergeList').innerHTML = B.merges.length ? `<table class="t left"><tr><th>#</th><th>Merge</th><th>Times</th><th>GPT-2’s merge number</th></tr>${B.merges.map((m, i) => `<tr><td>${i + 1}</td><td class="tokc">${dots(m.m)}</td><td>×${m.c}</td><td>${m.rank ? `<b>${int(m.rank)}</b> of ${int(mx)}<span class="rankbar"><i style="left:${(100 * m.rank / mx).toFixed(1)}%"></i></span>` : '<span class="muted">not a GPT-2 merge</span>'}</td></tr>`).join('')}</table>` : '<span class="muted">—</span>';
    const chars = Array.from(B.text), uniq = new Set(chars).size, dict = uniq + B.merges.length;
    $('#bridge').innerHTML = `<table class="t left"><tr><th></th><th>Our tokenizer</th><th>GPT-2</th></tr>
      <tr><td>Training text</td><td>this ${int(chars.length)}-character text</td><td>about 8,000,000 web pages</td></tr>
      <tr><td>Merges</td><td><b>${B.merges.length}</b></td><td><b>${int(mx)}</b></td></tr>
      <tr><td>Dictionary</td><td><b>${dict}</b> (${uniq} characters + ${B.merges.length})</td><td><b>${int(NT.V)}</b> (256 bytes + ${int(mx)} + 1)</td></tr>
      <tr><td>Pieces for this text</td><td><b>${h.pieces.length}</b></td><td><b>${NT.current().ids.length}</b></td></tr></table>`;
    if (B.real) { const ids = NT.current().ids; $('#realRow').innerHTML = `<div class="h" style="font-size:.8rem">GPT-2</div><div class="toks">${ids.map((id, i) => `<span class="tok ${i % 2 ? 'alt' : ''}">${dots(NT.tokText(id))}</span>`).join('')}</div>`; } else $('#realRow').innerHTML = '';
    const done = !bestPair(h.pieces);
    NT.setStatus(B.merges.length ? `Merge ${B.merges.length}: “${B.merges.at(-1).m.replace(/ /g, '·')}” appears ${B.merges.at(-1).c} times${B.verdict === 'ok' ? ' · ✓ you predicted it' : B.verdict === 'no' ? ' · ✗' : ''}${done ? ' · no pair repeats' : ''}` : done ? 'No pair of pieces repeats in this text' : 'Click two neighboring pieces to predict the first merge, then press ▶');
  }

  // ===================== 3. IDS =====================
  S.sel = 0;
  NT.stations.ids = {
    init() {
      const cur = NT.current(); if (S.sel >= cur.ids.length) S.sel = 0;
      st().innerHTML = `<div class="panel"><div class="toks" id="idCards"></div></div>
        <div style="display:grid;grid-template-columns:minmax(220px,.8fr) 2fr;gap:12px;margin-top:12px" class="idgrid">
          <div class="panel"><div class="h">Vocabulary <span class="muted" style="font-weight:500">token ↔ ID</span></div><table class="t" id="vocab"></table></div>
          <div class="panel"><div class="h">Embedding matrix <span class="muted" style="font-weight:500">one row of numbers for every token</span></div><svg id="mxSvg" viewBox="0 0 800 330" width="100%"></svg></div>
        </div>`;
      drawIds();
    },
  };
  let idTok = 0;
  async function drawIds() {
    const cur = NT.current(), n = cur.ids.length, id = cur.ids[S.sel], tk = ++idTok;
    $('#idCards').innerHTML = cur.ids.map((t, i) => `<span class="tok ${i === S.sel ? 'sel' : ''}" style="${NT.tokStyle(i, n)}" data-i="${i}">${show(NT.tokText(t))}<span class="id">${t}</span></span>`).join('');
    $('#idCards').querySelectorAll('.tok').forEach((el) => (el.onclick = () => { S.sel = +el.dataset.i; drawIds(); }));
    const lo = Math.max(0, id - 4), hi = Math.min(NT.V - 1, id + 4);
    let rows = '<tr><th>ID</th><th>Token</th></tr>';
    for (let k = lo; k <= hi; k++) rows += `<tr class="${k === id ? 'pick' : ''}"><td>${int(k)}</td><td class="tokc">${show(NT.tokText(k))}</td></tr>`;
    $('#vocab').innerHTML = rows;
    drawMatrix(cur, id, null);
    NT.setStatus(`“${NT.tokText(id)}” → ID ${int(id)} → row ${int(id)} of ${int(NT.V)}`);
    let row = NT.rowNow(id);
    if (!row) { NT.setStatus(`“${NT.tokText(id)}” → ID ${int(id)} → loading its row…`); try { row = await NT.row(id); } catch (e) { return; } }
    if (tk !== idTok) return;
    drawMatrix(cur, id, row);
    NT.setStatus(`“${NT.tokText(id)}” → ID ${int(id)} → row ${int(id)} of ${int(NT.V)}`);
  }
  function drawMatrix(cur, id, row) {
    const X0 = 70, X1 = 170, Y0 = 56, Y1 = 296, V = NT.V, n = cur.ids.length;
    const ys = (t) => Y0 + (t / V) * (Y1 - Y0), ysel = ys(id);
    let s = `<defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="${rgb(NT.div(-1))}"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="${rgb(NT.div(1))}"/></linearGradient></defs>`;
    s += `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" rx="4" fill="#eef1f6" stroke="#9aa5b5"/>`;
    for (let k = 1; k < 12; k++) s += `<line x1="${X0}" x2="${X1}" y1="${Y0 + k * (Y1 - Y0) / 12}" y2="${Y0 + k * (Y1 - Y0) / 12}" stroke="#dde3ec"/>`;
    cur.ids.forEach((t, i) => { if (t !== id) s += `<line x1="${X0}" x2="${X1}" y1="${ys(t)}" y2="${ys(t)}" stroke="${NT.tokColor(i, n) || '#8c8c8c'}" stroke-width="2.5"/>`; });
    s += `<text x="${(X0 + X1) / 2}" y="${Y0 - 28}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#33455a">768 numbers across</text><path d="M${X0} ${Y0 - 20} v-5 h${X1 - X0} v5" fill="none" stroke="#9aa5b5"/>`;
    s += `<text transform="translate(26 ${(Y0 + Y1) / 2}) rotate(-90)" text-anchor="middle" font-size="12.5" font-weight="700" fill="#33455a">50,257 rows, one per token</text><path d="M${X0 - 14} ${Y0} h-5 v${Y1 - Y0} h5" fill="none" stroke="#9aa5b5"/>`;
    s += `<text x="${X0 - 24}" y="${Y0 + 4}" text-anchor="end" font-size="10.5" fill="#687386">0</text><text x="${X0 - 24}" y="${Y1 + 4}" text-anchor="end" font-size="10.5" fill="#687386">50,256</text>`;
    // pulled-out row
    const SX0 = 330, SX1 = 780, SY0 = 120, SY1 = 164;
    s += `<path d="M${X1} ${ysel - 1.5} L${SX0} ${SY0} V${SY1} L${X1} ${ysel + 1.5} Z" fill="#5b38d11f" stroke="#5b38d1" stroke-width="1"/>`;
    s += `<line x1="${X0 - 4}" x2="${X1 + 4}" y1="${ysel}" y2="${ysel}" stroke="#5b38d1" stroke-width="4"/>`;
    s += `<text x="${(SX0 + SX1) / 2}" y="${SY0 - 22}" text-anchor="middle" font-size="14" font-weight="750" fill="#1d2634">row ${int(id)}  “${esc(NT.tokText(id).replace(/\n/g, '⏎').replace(/^ /, '·'))}”</text>`;
    s += `<text x="${(SX0 + SX1) / 2}" y="${SY0 - 6}" text-anchor="middle" font-size="12" fill="#687386">its 768 numbers, one coloured cell each</text>`;
    s += `<rect x="${SX0}" y="${SY0}" width="${SX1 - SX0}" height="${SY1 - SY0}" fill="#f4f6f9" stroke="#9aa5b5"/>`;
    if (row) {
      const cv = document.createElement('canvas'); NT.drawStrip(cv, row, 0.3);
      s += `<image href="${cv.toDataURL()}" x="${SX0}" y="${SY0}" width="${SX1 - SX0}" height="${SY1 - SY0}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`;
      s += `<text x="${SX0}" y="${SY1 + 30}" font-size="14" class="mono" fill="#1d2634" style="font-family:ui-monospace,monospace">[ ${Array.from(row.slice(0, 4), (x) => NT.num(x, 3)).join(',  ')},  … 764 more ]</text>`;
    } else s += `<text x="${(SX0 + SX1) / 2}" y="${(SY0 + SY1) / 2 + 5}" text-anchor="middle" font-size="12" fill="#9aa5b5">loading this row…</text>`;
    s += `<rect x="${SX0}" y="${SY1 + 56}" width="140" height="10" fill="url(#lg)" stroke="#c8d0db"/><text x="${SX0}" y="${SY1 + 82}" font-size="11" fill="#687386">negative</text><text x="${SX0 + 140}" y="${SY1 + 82}" font-size="11" fill="#687386" text-anchor="end">positive</text>`;
    $('#mxSvg').innerHTML = s;
  }
  const rgb = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;

  // ===================== 4. EMBEDDINGS =====================
  S.embView = 'qualities'; S.embStep = 1;
  NT.stations.embeddings = {
    init() {
      tb().innerHTML = `<div class="seg" id="embSeg">${[['qualities', 'Qualities'], ['dims', 'Many dimensions'], ['input', 'Token + position']].map(([v, l]) => `<button data-v="${v}" class="${S.embView === v ? 'on' : ''}">${l}</button>`).join('')}</div><span id="embTools" style="display:contents"></span>`;
      tb().querySelectorAll('#embSeg button').forEach((b) => (b.onclick = () => { S.embView = b.dataset.v; NT.stations.embeddings.init(); }));
      if (S.embView === 'qualities') { NT.meaning.init($('#embTools'), st()); return; }
      if (S.embView === 'dims') { NT.dims.init($('#embTools'), st()); return; }
      const cur = NT.current(), n = Math.min(cur.ids.length, NT.maxPos); S.embStep = Math.min(Math.max(S.embStep, 1), n);
      $('#embTools').innerHTML = NT.stepper('embStepper');
      wire('#embStepper', { prev: () => { if (S.embStep > 1) { S.embStep--; drawEmb(); } }, next: () => { if (S.embStep < n) { S.embStep++; drawEmb(); } } });
      st().innerHTML = `<div class="panel"><div style="display:grid;grid-template-columns:110px 1fr 18px 1fr 18px 1fr;gap:6px;align-items:center;font-size:.78rem;font-weight:700;color:#5b6a7a;margin-bottom:4px"><span></span><span>Token row</span><span></span><span>Position row</span><span></span><span>Input row</span></div><div id="embRows"></div></div>`;
      drawEmb();
    },
  };
  let embTok = 0;
  async function drawEmb() {
    const cur = NT.current(), n = Math.min(cur.ids.length, NT.maxPos), shown = Math.min(S.embStep, n), box = $('#embRows'), tk = ++embTok;
    const first = new Map(); let html = '';
    for (let i = 0; i < shown; i++) {
      const id = cur.ids[i]; const dup = first.has(id) ? first.get(id) : null; if (!first.has(id)) first.set(id, i);
      html += `<div style="display:grid;grid-template-columns:110px 1fr 18px 1fr 18px 1fr;gap:6px;align-items:center;margin:4px 0"><span class="tok" style="${NT.tokStyle(i, n)};justify-self:end">${show(NT.tokText(id))}${dup !== null ? `<span class="badge">= row of #${dup + 1}</span>` : ''}</span>${NT.stripHTML('et' + i)}<span class="op">+</span>${NT.stripHTML('ep' + i)}<span class="op">=</span>${NT.stripHTML('es' + i)}</div>`;
    }
    box.innerHTML = html;
    NT.setStatus(`${shown} of ${n} tokens → a ${shown} × 768 input`);
    for (let i = 0; i < shown; i++) {
      const tok = await NT.row(cur.ids[i]); if (tk !== embTok) return;
      const pos = NT.posRow(i), sum = tok.map((x, k) => x + pos[k]);
      NT.drawStrip($('#et' + i), tok, 0.3); NT.drawStrip($('#ep' + i), pos, 0.3); NT.drawStrip($('#es' + i), sum, 0.3);
    }
  }

  // ===================== SHOW THE NUMBERS (Build the tokenizer, Embeddings) =====================
  NT.numbers = NT.numbers || {};
  NT.numbers.tokens = () => {
    if (S.tokView !== 'build' || !B) return null;
    const F = NT.nf, pieces = B.hist.at(-1).pieces, cnt = new Map();
    for (let i = 0; i < pieces.length - 1; i++) { const k = pieces[i] + '\u0000' + pieces[i + 1]; cnt.set(k, (cnt.get(k) || 0) + 1); }
    const list = [...cnt].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 6);
    const rows = [F.formula('count each pair of neighboring pieces · merge the pair with the biggest count')];
    let t = `<table class="t left"><tr><th>Pair</th><th>Times it appears</th></tr>`;
    list.forEach(([k, c], i) => { const [a, b] = k.split('\u0000'); t += `<tr class="${i === 0 && c > 1 ? 'pick' : ''}"><td class="tokc">${dots(a)} + ${dots(b)}</td><td>${c}</td></tr>`; });
    rows.push(t + '</table>');
    const top = list[0];
    rows.push(`<div class="nnote">${top && top[1] > 1 ? `Next merge: “${dots(top[0].split('\u0000').join(''))}” (${top[1]} times). When two pairs tie, the one earlier in the alphabet goes first.` : 'No pair appears more than once, so the merging is finished.'} Showing the top ${list.length} of ${NT.int(cnt.size)} different pairs.</div>`);
    return F.box(`The numbers · ${pieces.length} pieces right now`, rows);
  };
  NT.numbers.embeddings = () => {
    if (S.embView === 'qualities') return NT.meaning.numbers && NT.meaning.numbers();
    if (S.embView === 'dims') return NT.dims.numbers && NT.dims.numbers();
    return null;
  };
})();
