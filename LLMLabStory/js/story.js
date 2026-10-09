/* LLMLab — the story: eight stations and an epilogue, one headline each */
'use strict';
(() => {
  const { $, esc, show, pct, int } = NT;
  const S = { si: 0, bi: 0, picks: [], lastPick: null, T: 1, K: 10, guesses: [], revealed: false, sel: 0, tokText: 'unbelievable', bpeText: 'The banker left the bank and sat on the left bank of the river.', attQ: 10, ctxBlock: 10, two: { picks: [], revealed: false }, trnPos: 3, trnStep: 0, fullView: false, liveFull: null };
  const tb = () => $('#toolbar'), st = () => $('#stage');
  const B = NT.banker, R = NT.river;
  const spine = () => B.ids.concat(S.picks.map((p) => p.id));
  const spineText = () => NT.decode(spine());
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  // next-token data for the current spine: stored, or live when loaded
  const liveCache = new Map();
  function nextData() {
    const ids = spine();
    if (!S.picks.length) { const t = NT.top(Array.from(B.full), 50); return { ...t, full: B.full }; }
    return NT.node(ids) || liveCache.get(ids.join(',')) || null;
  }
  async function ensureNext() {
    const d = nextData(); if (d) return d;
    if (!NT.live.ready()) return null;
    const ids = spine(), t = await NT.live.next(ids); liveCache.set(ids.join(','), t); return t;
  }

  // =============================== STATIONS ===============================
  const ST = [];
  // ---- 1. Guess ----
  ST.push({ id: 'guess', name: 'Guess', act: 0, headline: 'Finishing a sentence is a guessing game, for you and for the machine.', beats: [
    { render() {
      tb().innerHTML = `<input type="text" id="gIn" placeholder="your guess" style="max-width:220px"/><button class="btn" id="gAdd">Add</button><button class="btn ghost" id="gClr">Clear</button>`;
      st().innerHTML = `<div class="bigsentence" style="margin:6px 4px 16px">${esc(B.text)} <span class="sentence"><span class="blank">&nbsp;</span></span></div><div class="grid2"><div class="panel"><div class="h">Class</div><div id="cls"></div></div><div class="panel"><div class="h">GPT-2</div><div id="mdl"></div></div></div>`;
      const add = () => { const v = $('#gIn').value.trim().split(/\s+/)[0]; if (v) { S.guesses.push(v); $('#gIn').value = ''; drawGuess(); } $('#gIn').focus(); };
      $('#gAdd').onclick = add; $('#gIn').onkeydown = (e) => { if (e.key === 'Enter') add(); }; $('#gClr').onclick = () => { S.guesses = []; drawGuess(); };
      drawGuess(false);
    } },
    { render() { ST[0].beats[0].render(); drawGuess(true); } },
  ] });
  let FP = null;
  function fullProbs() { if (FP) return FP; const L = B.full; let m = -Infinity; for (const x of L) if (x > m) m = x; let s = 0; const p = new Float32Array(L.length); for (let i = 0; i < L.length; i++) { p[i] = Math.exp(L[i] - m); s += p[i]; } for (let i = 0; i < L.length; i++) p[i] /= s; const order = Array.from(p.keys()).sort((a, b) => p[b] - p[a]); const rank = new Int32Array(L.length); order.forEach((id, r) => { rank[id] = r + 1; }); return (FP = { p, order, rank }); }
  function drawGuess(reveal = S.bi === 1) {
    const counts = {}; S.guesses.forEach((g) => { const k = g.toLowerCase(); counts[k] = (counts[k] || 0) + 1; });
    const n = S.guesses.length, keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    $('#cls').innerHTML = n ? NT.bars(keys.map((k) => ({ l: k, v: counts[k] / n }))) : '<div class="muted">—</div>';
    if (!reveal) { $('#mdl').innerHTML = '<div class="center" style="min-height:160px;font-size:3rem;color:#c8d0db">?</div>'; NT.setStatus(n ? `${n} guesses, ${keys.length} different words` : ''); return; }
    const { p, order, rank } = fullProbs(), gid = new Set(keys.map((k) => NT.encode(' ' + k)[0]));
    const rows = order.slice(0, 12).map((id) => ({ l: NT.tokText(id), v: p[id], mark: gid.has(id) }));
    const extra = keys.map((k) => { const id = NT.encode(' ' + k)[0]; return { k, r: rank[id], p: p[id] }; }).filter((x) => x.r > 12);
    $('#mdl').innerHTML = NT.bars(rows, rows[0].v) + (extra.length ? `<div style="margin-top:8px">${NT.bars(extra.map((x) => ({ l: ` ${x.k}  #${int(x.r)}`, v: x.p, mark: true, t: pct(x.p, 3) })), rows[0].v)}</div>` : '');
    NT.setStatus(`GPT-2’s top guess “${NT.tokText(order[0]).trim()}” gets only ${pct(p[order[0]])}`);
  }

  // ---- 2. Tokens ----
  const PRESETS = ['unbelievable', 'He disestablished the establishment thoroughly, even though it cost him $1,254.63 for 25 hours of lawyer time.', '847-867-5309', ':-)', 'y=wx+b', 'The the THE'];
  let BP = null;
  ST.push({ id: 'tokens', name: 'Tokens', act: 0, headline: 'The machine can’t read words, so it chops text into pieces from its own dictionary.', beats: [
    { render() {
      tb().innerHTML = '';
      st().innerHTML = `<div class="bigsentence" style="margin:6px 4px 14px">${esc(B.text)}</div><div class="panel" style="min-height:90px"><div class="toks" id="chop"></div></div>`;
      B.ids.forEach((id, i) => later(() => { $('#chop').insertAdjacentHTML('beforeend', `<span class="tok fade-in" style="${NT.tokStyle(i, B.T)}">${show(NT.tokText(id))}</span>`); }, 250 * i));
      NT.setStatus(`${B.text.length} characters → ${B.T} pieces`);
    } },
    { render() {
      tb().innerHTML = `<input type="text" id="tIn" value="${esc(S.tokText)}" aria-label="Text"/><div class="chips">${PRESETS.map((p, i) => `<button class="chip" data-i="${i}">${esc(p.length > 18 ? p.slice(0, 16) + '…' : p)}</button>`).join('')}</div>`;
      st().innerHTML = `<div class="panel" style="min-height:90px"><div class="toks" id="tChips"></div></div><div class="grid2" style="margin-top:12px"><div class="panel"><div class="h">Pieces in this text</div><div id="tPieces"></div></div><div class="panel"><div class="h">Dictionary size <span class="muted" style="font-weight:500">(log scale)</span></div><div id="tDict"></div></div></div>`;
      $('#tIn').oninput = () => { S.tokText = $('#tIn').value; drawTok(); };
      tb().querySelectorAll('.chip').forEach((b) => (b.onclick = () => { S.tokText = PRESETS[b.dataset.i]; $('#tIn').value = S.tokText; drawTok(); }));
      drawTok();
    } },
    { render() {
      if (!BP) bpeReset(S.bpeText);
      tb().innerHTML = `<span class="tag">Built once, long before anyone types</span><input type="text" id="bIn" value="${esc(S.bpeText)}" aria-label="Text to build a dictionary from"/><button class="btn" id="bGo">Use this text</button><button class="btn" id="bFin">Finish</button>`;
      st().innerHTML = `<div class="panel"><div class="toks" id="bChips" style="min-height:60px"></div></div><div class="grid2" style="margin-top:12px"><div class="panel"><div class="h">New dictionary entries</div><div id="bList" class="mono" style="font-size:.85rem;columns:3"></div></div><div class="panel"><div class="h">Counts</div><div id="bCnt"></div><div style="margin-top:10px" id="bReal"></div></div></div>`;
      $('#bGo').onclick = () => { S.bpeText = $('#bIn').value || S.bpeText; bpeReset(S.bpeText); drawBpe(); };
      $('#bFin').onclick = () => { while (bpeStep(1)); drawBpe(); };
      drawBpe();
    }, step: (d) => { const ok = bpeStep(d); if (ok) drawBpe(); return ok; } },
  ] });
  function drawTok() {
    const text = S.tokText, ids = NT.encode(text), n = ids.length;
    $('#tChips').innerHTML = ids.map((id, i) => `<span class="tok ${i % 2 ? 'alt' : ''}" style="${NT.tokStyle(i, n)}">${show(NT.tokText(id))}</span>`).join('');
    const chars = Array.from(text).length, words = text.trim() ? text.trim().split(/\s+/).length : 0, lg = Math.log10;
    $('#tPieces').innerHTML = NT.bars([{ l: 'Characters', v: chars, t: int(chars) }, { l: 'Words', v: words, t: int(words) }, { l: 'Tokens', v: n, t: int(n), mark: true }]);
    $('#tDict').innerHTML = NT.bars([{ l: 'Characters', v: lg(26), t: '26+' }, { l: 'Words', v: lg(600000), t: '600,000' }, { l: 'Tokens', v: lg(50257), t: '50,257', mark: true }], lg(600000));
    NT.setStatus(`${int(chars)} characters → ${int(n)} tokens`);
  }
  function bpeReset(text) { BP = { text, hist: [{ pieces: Array.from(text), hot: [] }], merges: [], guess: null, verdict: null }; }
  function bestPair(pieces) {
    const cnt = new Map(); for (let i = 0; i < pieces.length - 1; i++) { const k = pieces[i] + '\u0000' + pieces[i + 1]; cnt.set(k, (cnt.get(k) || 0) + 1); }
    let best = null, bc = 1; for (const [k, c] of cnt) { if (c > bc || (c === bc && c > 1 && best !== null && k < best)) { best = k; bc = c; } }
    return best && bc > 1 ? { pair: best.split('\u0000'), count: bc } : null;
  }
  function bpeStep(d) {
    if (d < 0) { if (BP.hist.length < 2) return false; BP.hist.pop(); BP.merges.pop(); BP.verdict = null; return true; }
    const cur = BP.hist.at(-1).pieces, bp = bestPair(cur); if (!bp) return false;
    const [a, b] = bp.pair, nx = [], hot = [];
    for (let i = 0; i < cur.length; i++) { if (i < cur.length - 1 && cur[i] === a && cur[i + 1] === b) { hot.push(nx.length); nx.push(a + b); i++; } else nx.push(cur[i]); }
    BP.verdict = BP.guess ? (BP.guess[0] === a && BP.guess[1] === b ? 'ok' : 'no') : null; BP.guess = null;
    BP.hist.push({ pieces: nx, hot }); BP.merges.push({ m: a + b, c: bp.count }); return true;
  }
  function drawBpe() {
    const h = BP.hist.at(-1), hot = new Set(h.hot), vis = (p) => show(p).replace(/ /g, '·');
    $('#bChips').innerHTML = h.pieces.map((p, i) => `<span class="tok ${hot.has(i) ? (BP.verdict || 'hot') : i % 2 ? 'alt' : ''} ${BP.guess && BP.guess.i === i ? 'sel' : ''}" data-i="${i}">${vis(p)}</span>`).join('');
    $('#bChips').querySelectorAll('.tok').forEach((el) => (el.onclick = () => { const i = +el.dataset.i; if (i < h.pieces.length - 1) { BP.guess = { 0: h.pieces[i], 1: h.pieces[i + 1], i }; BP.verdict = null; drawBpe(); } }));
    $('#bList').innerHTML = BP.merges.map((m) => `<div>${vis(m.m)} <span class="muted">×${m.c}</span></div>`).join('') || '<span class="muted">—</span>';
    const uniq = new Set(Array.from(BP.text)).size;
    $('#bCnt').innerHTML = NT.bars([{ l: 'Dictionary', v: uniq + BP.merges.length, t: String(uniq + BP.merges.length) }, { l: 'Pieces', v: h.pieces.length, t: String(h.pieces.length) }], Array.from(BP.text).length);
    const done = !bestPair(h.pieces);
    $('#bReal').innerHTML = done ? `<div class="h" style="font-size:.8rem">GPT-2’s real dictionary on the same text</div><div class="toks">${NT.encode(BP.text).map((id, i) => `<span class="tok ${i % 2 ? 'alt' : ''}">${vis(NT.tokText(id))}</span>`).join('')}</div>` : '';
    NT.setStatus(BP.merges.length ? `“${BP.merges.at(-1).m.replace(/ /g, '·')}” appears ${BP.merges.at(-1).c} times, so it becomes one piece${BP.verdict === 'ok' ? ' ✓' : BP.verdict === 'no' ? ' ✗' : ''}${done ? ' · no pair repeats now' : ''}` : 'Click a piece to predict which pair joins first');
  }

  // ---- 3. Token IDs ----
  ST.push({ id: 'ids', name: 'Token IDs', act: 0, headline: 'Every piece gets a number, and like a locker number, it means nothing by itself.', beats: [
    { render() {
      tb().innerHTML = '';
      st().innerHTML = `<div class="panel"><div class="toks" id="idC"></div></div>`;
      $('#idC').innerHTML = B.ids.map((id, i) => `<span class="tok" style="${NT.tokStyle(i, B.T)}">${show(NT.tokText(id))}<span class="id" id="id${i}">&nbsp;</span></span>`).join('');
      B.ids.forEach((id, i) => later(() => { const e = $('#id' + i); if (e) { e.textContent = id; e.classList.add('fade-in'); } }, 300 * i));
      NT.setStatus('Six pieces, six numbers');
    } },
    { render() { S.sel = Math.min(S.sel, B.T - 1); drawIds(); }, step: (d) => { const n = S.sel + d; if (n < 0 || n >= B.T) return false; S.sel = n; drawIds(); return true; } },
  ] });
  function drawIds() {
    tb().innerHTML = '';
    const id = B.ids[S.sel], lo = Math.max(0, id - 4), hi = Math.min(NT.V - 1, id + 4);
    let rows = ''; for (let k = lo; k <= hi; k++) rows += `<tr class="${k === id ? 'pick' : ''}"><td>${k}</td><td class="tokc">${show(NT.tokText(k))}</td></tr>`;
    st().innerHTML = `<div class="panel"><div class="toks">${B.ids.map((t, i) => `<span class="tok ${i === S.sel ? 'sel' : ''}" style="${NT.tokStyle(i, B.T)}" data-i="${i}">${show(NT.tokText(t))}<span class="id">${t}</span></span>`).join('')}</div></div>
      <div class="grid2" style="margin-top:12px"><div class="panel"><div class="h">Lockers ${int(lo)}–${int(hi)}</div><table class="t"><tr><th>Number</th><th>Piece</th></tr>${rows}</table></div><div class="panel center" style="min-height:200px"><div><div class="locker" style="width:120px;height:140px;font-size:1.3rem">${int(id)}</div><div class="muted" style="margin-top:8px">${int(NT.V)} lockers in all</div></div></div></div>`;
    st().querySelectorAll('.tok[data-i]').forEach((el) => (el.onclick = () => { S.sel = +el.dataset.i; drawIds(); }));
    NT.setStatus(`“${NT.tokText(id).trim()}” is locker ${int(id)}; its neighbors are unrelated pieces`);
  }

  // ---- 4. Embeddings ----
  ST.push({ id: 'embeddings', name: 'Embeddings', act: 0, headline: 'Inside each locker is a fingerprint: 768 numbers that describe the piece.', beats: [
    { render() { S.embN = 1; drawFinger(); }, step: (d) => { const n = S.embN + d; if (n < 1 || n > B.T) return false; S.embN = n; drawFinger(); return true; } },
    { render() { st().innerHTML = ''; NT.meaning.mount(tb(), st(), 'classroom'); tb().insertAdjacentHTML('afterbegin', '<span class="tag">Classroom numbers</span>'); NT.setStatus('Made-up fingerprints with just 3 numbers: king − man + woman lands on queen'); } },
    { render() { st().innerHTML = ''; NT.meaning.mount(tb(), st(), 'real'); tb().insertAdjacentHTML('afterbegin', '<span class="tag real">GPT-2</span>'); NT.setStatus('GPT-2’s real fingerprints, squeezed down to 3 directions: the pattern survives'); } },
    { render() { drawInput(); } },
  ] });
  function drawFinger() {
    tb().innerHTML = '<span class="tag real">GPT-2</span>';
    let h = ''; for (let i = 0; i < S.embN; i++) h += `<div class="vrow fade-in"><span class="who"><span class="tok" style="${NT.tokStyle(i, B.T)}">${show(B.tokens[i])}</span></span>${NT.strip('fg' + i)}</div>`;
    st().innerHTML = `<div class="panel">${h}</div><div class="muted" style="font-size:.8rem;margin-top:6px">each stripe is one of the 768 numbers · <span style="color:#e15759">■</span> positive · <span style="color:#4e79a7">■</span> negative</div>`;
    for (let i = 0; i < S.embN; i++) NT.drawStrip($('#fg' + i), NT.row(B.ids[i]), 0.3);
    const r = NT.row(B.ids[S.embN - 1]);
    NT.setStatus(`“${B.tokens[S.embN - 1].trim()}”: [${Array.from(r.slice(0, 4), (x) => x.toFixed(2)).join(', ')}, … 764 more]`);
  }
  function drawInput() {
    tb().innerHTML = '<span class="tag real">GPT-2</span>';
    let h = `<div style="display:grid;grid-template-columns:110px 1fr 18px 1fr 18px 1fr;gap:6px;font-size:.74rem;font-weight:700;color:#5b6a7a"><span></span><span>Fingerprint</span><span></span><span>Place in line</span><span></span><span>What goes in</span></div>`;
    for (let i = 0; i < B.T; i++) h += `<div style="display:grid;grid-template-columns:110px 1fr 18px 1fr 18px 1fr;gap:6px;align-items:center;margin:4px 0"><span class="tok" style="${NT.tokStyle(i, B.T)};justify-self:end">${show(B.tokens[i])}</span>${NT.strip('it' + i)}<span class="op">+</span>${NT.strip('ip' + i)}<span class="op">=</span>${NT.strip('is' + i)}</div>`;
    st().innerHTML = `<div class="panel">${h}</div>`;
    for (let i = 0; i < B.T; i++) { const t = NT.row(B.ids[i]), p = NT.posRow(i); NT.drawStrip($('#it' + i), t, 0.3); NT.drawStrip($('#ip' + i), p, 0.3); NT.drawStrip($('#is' + i), t.map((x, k) => x + p[k]), 0.3); }
    NT.setStatus('Each word is also stamped with its place in line');
  }

  // ---- 5. Attention ----
  const bankPos = R.tokens.map((t, i) => (t === ' bank' ? i : -1)).filter((i) => i >= 0);
  ST.push({ id: 'attention', name: 'Attention', act: 1, headline: 'One fingerprint can’t tell a money bank from a river bank, so each word looks back at the words before it and updates its own.', beats: [
    { render() {
      tb().innerHTML = '<span class="tag real">GPT-2</span>';
      st().innerHTML = `<div class="bigsentence" style="font-size:1.35rem;margin:4px">${R.tokens.map((t, i) => bankPos.includes(i) ? `<b style="background:#fff1b8;padding:0 2px">${esc(t)}</b><sup>${bankPos.indexOf(i) + 1}</sup>` : esc(t)).join('')}</div>
        <div class="panel" style="margin-top:10px">${bankPos.map((p, k) => `<div class="vrow"><span class="who">bank<sup>${k + 1}</sup></span>${NT.strip('bk' + k)}</div>`).join('')}</div>`;
      bankPos.forEach((p, k) => NT.drawStrip($('#bk' + k), NT.row(R.ids[p]), 0.3));
      NT.setStatus(`Both are locker ${R.ids[bankPos[0]]}, so both start with the same fingerprint`);
    } },
    { render() { drawLook(); } },
    { render() { S.blk = 0; drawStack(); }, step: (d) => { const n = S.blk + d; if (n < 0 || n > 12) return false; S.blk = n; drawStack(); return true; } },
    { render() { drawCtx(); }, step: (d) => { const n = S.ctxBlock + d; if (n < 0 || n > 12) return false; S.ctxBlock = n; drawCtx(); return true; } },
    { render() { drawTwo(); } },
  ] });
  function drawLook() {
    const q = S.attQ, w = NT.attnAvgAll(R, q), mx = Math.max(...w.slice(1, q));
    tb().innerHTML = `<span class="tag real">GPT-2</span><div class="seg" id="qSeg">${bankPos.map((p, k) => `<button data-q="${p}" class="${q === p ? 'on' : ''}">bank${k ? '²' : '¹'}</button>`).join('')}</div>`;
    tb().querySelectorAll('#qSeg button').forEach((b) => (b.onclick = () => { S.attQ = +b.dataset.q; drawLook(); }));
    const n = R.T, colW = 66, H = 150; let s = `<svg viewBox="0 0 ${n * colW + 20} ${H + 60}" width="100%">`;
    for (let j = 0; j < n; j++) {
      const x = 10 + j * colW, ahead = j > q, isq = j === q, v = !ahead && !isq && j > 0 ? w[j] : 0, h = (v / mx) * (H - 30);
      if (v) s += `<rect x="${x + 10}" y="${H - h}" width="${colW - 20}" height="${h}" rx="3" fill="#5b38d1" opacity="${0.35 + 0.65 * v / mx}"/>`;
      s += `<rect x="${x + 2}" y="${H + 8}" width="${colW - 4}" height="30" rx="6" fill="${isq ? '#f28e2b33' : ahead ? '#fafbfc' : '#f4f6f9'}" stroke="${isq ? '#f28e2b' : ahead ? '#e6eaf0' : '#c8d0db'}"/><text x="${x + colW / 2}" y="${H + 28}" text-anchor="middle" font-size="12.5" font-family="ui-monospace,monospace" fill="${ahead ? '#c5ccd6' : '#1d2634'}">${esc(R.tokens[j].trim() || '·')}</text>`;
    }
    s += '</svg>';
    st().innerHTML = `<div class="panel">${s}</div>`;
    NT.setStatus(q === bankPos[1] ? '“river” comes later, so this bank can’t see it yet' : 'Each word looks only at the words before it');
  }
  function drawStack() {
    tb().innerHTML = '<span class="tag real">GPT-2 · 12 rounds</span>';
    let s = '<svg viewBox="0 0 900 140" width="100%">';
    for (let b = 0; b < 12; b++) { const on = b < S.blk; s += `<rect x="${12 + b * 73}" y="40" width="64" height="56" rx="9" fill="${on ? '#5b38d1' : '#f4f6f9'}" stroke="${on ? '#5b38d1' : '#c8d0db'}"/><text x="${44 + b * 73}" y="74" text-anchor="middle" font-size="15" font-weight="700" fill="${on ? '#fff' : '#9aa5b5'}">${b + 1}</text>`; }
    s += `<text x="12" y="26" font-size="13" fill="#5b6a7a">Every word, every round: look back, then update the fingerprint</text></svg>`;
    st().innerHTML = `<div class="panel">${s}</div><div class="panel" style="margin-top:10px">${B.ids.map((id, i) => `<div class="vrow"><span class="who"><span class="tok" style="${NT.tokStyle(i, B.T)}">${show(B.tokens[i])}</span></span>${NT.strip('hs' + i)}</div>`).join('')}</div>`;
    B.ids.forEach((id, i) => NT.drawStrip($('#hs' + i), NT.hiddenRow(S.blk, i)));
    NT.setStatus(S.blk === 0 ? 'The fingerprints go in' : S.blk === 12 ? 'After 12 rounds, every fingerprint carries its context' : `Round ${S.blk} of 12`);
  }
  function drawCtx() {
    const C = NT.P.context, b = S.ctxBlock;
    tb().innerHTML = `<span class="tag real">GPT-2</span><label class="ctl">Round <input type="range" id="cR" min="0" max="12" value="${b}"/><span class="v">${b === 0 ? 'start' : b}</span></label>`;
    $('#cR').oninput = (e) => { S.ctxBlock = +e.target.value; drawCtx(); };
    const X = (i) => 50 + i * 36, Y = (v) => 250 - (v - 0.7) / 0.3 * 220;
    let s = ''; for (const v of [0.7, 0.8, 0.9, 1.0]) s += `<line x1="50" x2="${X(12)}" y1="${Y(v)}" y2="${Y(v)}" stroke="#eef1f5"/>`;
    for (let i = 0; i <= 12; i++) s += `<text x="${X(i)}" y="272" text-anchor="middle" font-size="10.5" fill="#687386">${i === 0 ? 'start' : i}</text>`;
    s += `<rect x="${X(b) - 14}" y="20" width="28" height="236" fill="#5b38d1" opacity=".08"/>`;
    const line = (a, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" points="${a.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}"/>` + a.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === b ? 5 : 2.5}" fill="${c}"/>`).join('');
    s += line(C.within, '#33455a') + line(C.cross, '#e15759') + `<text x="${X(12)}" y="${Y(C.within[12]) - 8}" text-anchor="end" font-size="12" font-weight="700" fill="#33455a">two money banks</text><text x="${X(10)}" y="${Y(C.cross[10]) + 18}" text-anchor="middle" font-size="12" font-weight="700" fill="#e15759">money bank vs river bank</text>`;
    st().innerHTML = `<div class="grid2"><div class="panel"><div class="h">How alike are the fingerprints?</div><svg viewBox="0 0 520 285" width="100%">${s}</svg></div><div class="panel"><div class="h">Our sentence’s two banks</div>${C.banks.map((k, i) => `<div style="margin-bottom:10px"><div class="h" style="font-size:.82rem">bank<sup>${i + 1}</sup></div>${NT.bars([{ l: 'like a money bank', v: k.money[b], t: k.money[b].toFixed(2) }, { l: 'like a river bank', v: k.river[b], t: k.river[b].toFixed(2) }], 1)}</div>`).join('')}</div></div>`;
    NT.setStatus(b === 0 ? 'At the start, every “bank” has the same fingerprint' : `After round ${b}: bank¹ leans money (it followed “banker”); bank² hasn’t read “river” yet`);
  }
  function drawTwo() {
    const q = B.T - 1, w = NT.attnAvgAll(B, q), T2 = S.two;
    tb().innerHTML = `<span class="tag real">GPT-2</span><button class="btn primary" id="twoR">Reveal</button><button class="btn ghost" id="twoX">Reset</button>`;
    $('#twoR').onclick = () => { T2.revealed = true; drawTwo(); }; $('#twoX').onclick = () => { S.two = { picks: [], revealed: false }; drawTwo(); };
    const mx = Math.max(...w.slice(1, q + 1));
    st().innerHTML = `<div class="panel"><div class="h">Which two words matter most for what comes after “and”?</div><div style="display:flex;gap:10px;align-items:flex-end;min-height:190px">${B.tokens.map((t, j) => { const v = j > 0 ? w[j] : 0, picked = T2.picks.includes(j); return `<div style="flex:1;text-align:center">${T2.revealed && j > 0 ? `<div style="font-size:.8rem;font-weight:700;color:#33455a">${pct(v, 0)}</div><div style="height:${(v / mx) * 120}px;background:#5b38d1;border-radius:4px 4px 0 0;margin:0 14px"></div>` : ''}<div class="tok ${picked ? 'sel' : ''}" data-j="${j}" style="${NT.tokStyle(j, B.T)};display:block;margin-top:4px">${show(t)}</div></div>`; }).join('')}</div></div>`;
    st().querySelectorAll('[data-j]').forEach((el) => (el.onclick = () => { const j = +el.dataset.j, p = T2.picks, i = p.indexOf(j); if (T2.revealed) return; if (i >= 0) p.splice(i, 1); else if (p.length < 2) p.push(j); drawTwo(); }));
    NT.setStatus(T2.revealed ? 'GPT-2’s attention from “and”, averaged over all 12 rounds' : `Pick two words · ${T2.picks.length} of 2`);
  }

  // ---- 6. Logits ----
  ST.push({ id: 'logits', name: 'Logits', act: 2, headline: 'The last word’s updated fingerprint is compared with all 50,257 fingerprints in the dictionary, and the best matches get the highest scores.', beats: [
    { render() { tb().innerHTML = '<span class="tag real">GPT-2</span>'; st().innerHTML = `<div class="panel"><div class="vrow"><span class="who">“and”</span>${NT.strip('fin')}</div></div>`; NT.drawStrip($('#fin'), B.final); NT.setStatus('This fingerprint now carries the whole sentence'); } },
    { render() {
      tb().innerHTML = '<span class="tag real">GPT-2</span>';
      st().innerHTML = `<div class="panel"><div class="vrow"><span class="who">“and”</span>${NT.strip('fin')}</div><div class="vrow" style="margin-top:12px"><span class="who">50,257 scores</span><canvas id="sweep" class="strip" style="height:40px"></canvas></div></div>`;
      NT.drawStrip($('#fin'), B.final);
      const L = B.full, n = L.length; let m = 0, sd = 0; for (const x of L) m += x; m /= n; for (const x of L) sd += (x - m) ** 2; sd = Math.sqrt(sd / n);
      const cv = $('#sweep'); cv.width = n; cv.height = 1; const c = cv.getContext('2d'), img = c.createImageData(n, 1); for (let i = 0; i < n; i++) img.data.set([238, 241, 246, 255], i * 4);
      let k = 0; const step = () => { if (!document.body.contains(cv)) return; const end = Math.min(n, k + 2500); for (; k < end; k++) { const [r, g, b] = NT.div((L[k] - m) / sd / 4); img.data.set([r, g, b, 255], k * 4); } c.putImageData(img, 0, 0); NT.setStatus(`${int(k)} of ${int(n)} fingerprints compared`); if (k < n) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    } },
    { render() {
      tb().innerHTML = '<span class="tag real">GPT-2</span>';
      const t = NT.top(Array.from(B.full), 15), lo = Math.min(...t.logits) - 1;
      st().innerHTML = `<div class="panel"><div class="h">The highest scores</div>${NT.bars(t.ids.map((id, i) => ({ l: NT.tokText(id), v: t.logits[i] - lo, t: t.logits[i].toFixed(2) })))}</div>`;
      NT.setStatus('Scores, not yet chances');
    } },
  ] });

  // ---- 7. Probabilities ----
  ST.push({ id: 'pick', name: 'Probabilities', act: 2, headline: 'Scores become chances, and a weighted dice roll picks the next word.', beats: [
    { render() { S.lastPick = null; drawPick(false); } },
    { render() { drawPick(true); } },
    { render() { if (!S.lastPick) roll(); else drawPick(true); }, step: (d) => { if (d > 0) return false; if (S.lastPick) { S.lastPick = null; drawPick(true); return true; } return false; } },
  ] });
  function roll(r) { const d = nextData(); if (!d) return; const K = Math.min(S.K, d.ids.length), p = NT.softmax(d.logits, S.T, K), rr = r ?? Math.random(), i = NT.pickIndex(p, rr); S.lastPick = { id: d.ids[i], rank: i + 1, r: rr, p: p[i] }; drawPick(true); }
  function drawPick(controls) {
    const d = nextData();
    if (!d) { st().innerHTML = '<div class="center">Go to Repeat to load GPT-2 for this sentence.</div>'; return; }
    tb().innerHTML = controls ? `<div class="chips"><button class="chip" data-t="0.2" data-k="1">Always the top word</button><button class="chip" data-t="1" data-k="10">Normal</button><button class="chip" data-t="10" data-k="50">Wild</button></div>
      <label class="ctl">Temperature <input type="range" id="pT" min="0.2" max="10" step="0.1" value="${S.T}"/><span class="v">${S.T.toFixed(1)}</span></label><label class="ctl">Top-K <input type="range" id="pK" min="1" max="50" value="${S.K}"/><span class="v">${S.K}</span></label><button class="btn primary" id="roll">Roll</button>${d.full ? `<label class="ctl"><input type="checkbox" id="fullT" ${S.fullView ? 'checked' : ''}/> All 50,257</label>` : ''}` : '';
    if (controls) {
      tb().querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { S.T = +b.dataset.t; S.K = +b.dataset.k; S.lastPick = null; drawPick(true); }));
      $('#pT').oninput = (e) => { S.T = +e.target.value; S.lastPick = null; drawPick(true); };
      $('#pK').oninput = (e) => { S.K = +e.target.value; S.lastPick = null; drawPick(true); };
      $('#roll').onclick = () => roll();
      if ($('#fullT')) $('#fullT').onchange = (e) => { S.fullView = e.target.checked; drawPick(true); };
    }
    const K = Math.min(S.K, d.ids.length), p = NT.softmax(d.logits, S.T, K);
    let x = 0, bar = '<svg viewBox="0 0 900 96" width="100%"><text x="20" y="14" font-size="11" fill="#687386">0</text><text x="880" y="14" font-size="11" fill="#687386" text-anchor="end">1</text>';
    p.forEach((v, i) => { const on = S.lastPick && S.lastPick.rank === i + 1; bar += `<rect x="${20 + x * 860}" y="22" width="${Math.max(0.5, v * 860 - 1)}" height="34" fill="${NT.PALETTE[i % 10]}" opacity="${on ? 1 : 0.55}"/>`; if (v * 860 > 36) bar += `<text x="${20 + (x + v / 2) * 860}" y="44" text-anchor="middle" font-size="11.5" fill="#fff" font-weight="700">${esc(NT.tokText(d.ids[i]).trim().slice(0, 9))}</text>`; x += v; });
    if (S.lastPick) { const rx = 20 + S.lastPick.r * 860; bar += `<path d="M${rx} 60 l-7 12 h14 z" fill="#1d2634"/><text x="${rx}" y="90" text-anchor="middle" font-size="12" font-weight="700" fill="#1d2634">roll = ${S.lastPick.r.toFixed(3)}</text>`; }
    bar += '</svg>';
    const tableRows = p.slice(0, 12).map((v, i) => ({ l: NT.tokText(d.ids[i]), v, mark: S.lastPick && S.lastPick.rank === i + 1 }));
    let full = '';
    if (S.fullView && d.full) full = `<div class="panel" style="margin-top:10px"><div class="h">All ${int(NT.V)} pieces, ranked by score <input type="number" id="jump" placeholder="rank" style="width:90px;margin-left:8px"/></div><div id="vlist" style="height:260px;overflow:auto;position:relative;font-size:.8rem"></div></div>`;
    st().innerHTML = `<div class="panel"><div class="h">Chances</div>${bar}</div><div class="panel" style="margin-top:10px">${NT.bars(tableRows, Math.max(...p))}</div>${full}`;
    if (full) virtualList(d.full);
    NT.setStatus(S.lastPick ? `The roll lands on “${NT.tokText(S.lastPick.id).trim()}” (rank ${S.lastPick.rank}, ${pct(S.lastPick.p)})` : `Temperature ${S.T.toFixed(1)} · top ${K} words share the chances`);
  }
  function virtualList(L) {
    const box = $('#vlist'), order = Array.from(L.keys()).sort((a, b) => L[b] - L[a]), RH = 22;
    box.innerHTML = `<div style="height:${order.length * RH}px"></div>`; const inner = document.createElement('div'); inner.style.position = 'absolute'; inner.style.left = '0'; inner.style.right = '0'; box.appendChild(inner);
    const draw = () => { const a = Math.floor(box.scrollTop / RH), b = Math.min(order.length, a + Math.ceil(260 / RH) + 2); inner.style.top = a * RH + 'px'; inner.innerHTML = order.slice(a, b).map((id, i) => `<div style="height:${RH}px;display:grid;grid-template-columns:70px 1fr 90px;align-items:center;border-bottom:1px solid #eef1f5"><span>${int(a + i + 1)}</span><span class="mono">${show(NT.tokText(id))}</span><span style="text-align:right">${L[id].toFixed(2)}</span></div>`).join(''); };
    box.onscroll = draw; draw();
    $('#jump').onchange = (e) => { const r = Math.max(1, Math.min(order.length, +e.target.value || 1)); box.scrollTop = (r - 1) * RH; };
  }

  // ---- 8. Repeat ----
  S.loadFrac = null;
  ST.push({ id: 'repeat', name: 'Repeat', act: 2, headline: 'The new word joins the sentence, and the whole trip runs again, one word at a time.', beats: [
    { render() { if (S.lastPick) { S.picks.push(S.lastPick); S.lastPick = null; S.justAdded = true; } drawRepeat(); } },
  ] });
  function drawRepeat() {
    const can = !!nextData() || NT.live.ready();
    tb().innerHTML = `<button class="btn primary" id="rNext" ${can ? '' : 'disabled'}>Next word</button><button class="btn" id="rFin" ${can ? '' : 'disabled'}>Add 20 words</button><button class="btn" id="rUndo" ${S.picks.length ? '' : 'disabled'}>Undo</button><button class="btn ghost" id="rClr">Start over</button>${can ? '' : '<button class="btn" id="rLoad">Load GPT-2 to keep going</button>'}`;
    const gen = S.picks.map((p, i) => { const t = NT.tokText(p.id); if (!t.trim()) return t.replace(/\n/g, '<br>'); return `<span class="newword ${i === S.picks.length - 1 && S.justAdded ? 'just' : ''}">${esc(t)}</span>${p.rank > 1 ? `<span class="badge">${p.rank}</span>` : ''}`; }).join('');
    S.justAdded = false;
    st().innerHTML = `<div class="panel"><div class="bigsentence">${esc(B.text)}${gen}</div></div>
      <div class="panel" style="margin-top:12px"><svg viewBox="0 0 900 110" width="100%">${['Tokens', 'Token IDs', 'Embeddings', 'Attention', 'Logits', 'Probabilities'].map((l, i) => `<rect class="loopbox" data-i="${i}" x="${10 + i * 148}" y="18" width="130" height="34" rx="8" fill="#f4f6f9" stroke="#c8d0db"/><text x="${75 + i * 148}" y="40" text-anchor="middle" font-size="12.5" fill="#33455a">${l}</text>${i < 5 ? `<path d="M${140 + i * 148} 35 h18" stroke="#9aa5b5"/>` : ''}`).join('')}<path d="M815 52 V92 H75 V56" fill="none" stroke="#5b38d1" stroke-width="2" marker-end="url(#rp)"/><defs><marker id="rp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#5b38d1"/></marker></defs></svg>${S.loadFrac != null ? `<div class="progress" style="margin:8px auto 0"><i style="width:${Math.round(S.loadFrac * 100)}%"></i></div>` : ''}</div>`;
    $('#rNext') && ($('#rNext').onclick = () => addWord());
    $('#rFin') && ($('#rFin').onclick = async () => { for (let i = 0; i < 20; i++) { if (!(await addWord(true))) break; await new Promise((r) => setTimeout(r, 250)); } });
    $('#rUndo').onclick = () => { S.picks.pop(); drawRepeat(); };
    $('#rClr').onclick = () => { S.picks = []; drawRepeat(); };
    if ($('#rLoad')) $('#rLoad').onclick = loadLive;
    NT.setStatus(S.loadFrac != null ? `Loading GPT-2… ${Math.round(S.loadFrac * 100)}% (first time only)` : `${S.picks.length} words added · temperature ${S.T.toFixed(1)}, top ${S.K}`);
  }
  async function loadLive() {
    S.loadFrac = 0; drawRepeat();
    try { await NT.live.load((f) => { S.loadFrac = f; const bar = document.querySelector('.progress i'); if (bar) bar.style.width = Math.round(f * 100) + '%'; NT.setStatus(`Loading GPT-2… ${Math.round(f * 100)}% (first time only)`); }); S.loadFrac = null; }
    catch (e) { S.loadFrac = null; NT.setStatus('Could not load GPT-2: ' + e.message); return; }
    if (cur().id === 'repeat') drawRepeat();
  }
  async function addWord(quiet) {
    let d = nextData();
    if (!d && NT.live.ready()) { NT.setStatus('GPT-2 is thinking…'); d = await ensureNext(); }
    if (!d) { if (!quiet) drawRepeat(); return false; }
    const boxes = document.querySelectorAll('.loopbox'); boxes.forEach((b, i) => setTimeout(() => b.setAttribute('fill', '#e9e3fb'), 60 * i));
    const K = Math.min(S.K, d.ids.length), p = NT.softmax(d.logits, S.T, K), r = Math.random(), i = NT.pickIndex(p, r);
    S.picks.push({ id: d.ids[i], rank: i + 1, r, p: p[i] }); S.justAdded = true;
    await new Promise((res) => setTimeout(res, 380));
    if (cur().id === 'repeat') drawRepeat();
    return true;
  }

  // ---- Epilogue: Training ----
  const TR = NT.P.training;
  ST.push({ id: 'training', name: 'Training', act: 3, headline: 'Where did the fingerprints come from? The model read a mountain of text, guessed every next word, and was nudged a little each time it was wrong.', beats: [
    { render() { drawGuessText(); }, step: (d) => { const n = S.trnPos + d; if (n < 0 || n > TR.ids.length - 2) return false; S.trnPos = n; drawGuessText(); return true; } },
    { render() { drawTrain(); }, step: (d) => { const n = S.trnStep + d; if (n < 0 || n > 12) return false; S.trnStep = n; drawTrain(); return true; } },
  ] });
  function drawGuessText() {
    const per = TR.runs['0.002'][0].per, i = S.trnPos, p = Math.exp(-per[i]);
    tb().innerHTML = '<span class="tag real">GPT-2</span>';
    st().innerHTML = `<div class="panel"><div class="toks">${TR.ids.map((id, k) => `<span class="tok ${k === i + 1 ? 'sel' : ''}" style="${k > i + 1 ? 'opacity:.25' : ''}">${k === i + 1 ? '?' : show(NT.tokText(id))}</span>`).join('')}</div></div>
      <div class="grid2" style="margin-top:12px"><div class="panel"><div class="h">The real next word: <span class="mono">${show(NT.tokText(TR.ids[i + 1]))}</span></div>${NT.bars([{ l: 'GPT-2’s chance', v: p, t: pct(p, 1), mark: true }, { l: 'Before training', v: 1 / NT.V, t: '0.002%' }], 1)}</div><div class="panel"><div class="h">How wrong, word by word</div><svg id="lossBars" viewBox="0 0 560 160" width="100%"></svg></div></div>`;
    let s = ''; const n = per.length, bw = 540 / n; for (let k = 0; k < n; k++) { const h = Math.min(per[k], 11) / 11 * 140; s += `<rect x="${10 + k * bw}" y="${150 - h}" width="${Math.max(1, bw - 1)}" height="${h}" fill="${k === i ? '#f28e2b' : '#7b61a8'}"/>`; }
    const U = TR.uniform, y = 150 - U / 11 * 140; s += `<line x1="10" x2="550" y1="${y}" y2="${y}" stroke="#e15759" stroke-dasharray="6 4"/><text x="548" y="${y - 5}" text-anchor="end" font-size="11" fill="#e15759">before training</text>`;
    $('#lossBars').innerHTML = s;
    NT.setStatus(p > 0.5 ? 'An easy guess' : p < 0.02 ? 'A hard guess: a big correction' : 'A so-so guess');
  }
  function drawTrain() {
    const run = TR.runs['0.002'], k = S.trnStep, ids = TR.ids;
    tb().innerHTML = '<span class="tag real">GPT-2 · real training steps</span>';
    const X = (i) => 40 + i * 36, Y = (v) => 200 - Math.min(v, 2) / 2 * 180;
    let s = `<line x1="40" x2="${X(12)}" y1="200" y2="200" stroke="#c8d0db"/>`; for (let i = 0; i <= 12; i++) s += `<text x="${X(i)}" y="218" text-anchor="middle" font-size="10.5" fill="#687386">${i}</text>`;
    const losses = run.map((r) => r.loss); s += `<polyline fill="none" stroke="#7b61a8" stroke-width="2.5" points="${losses.slice(0, k + 1).map((v, i) => `${X(i)},${Y(v)}`).join(' ')}"/>` + losses.slice(0, k + 1).map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === k ? 5 : 3}" fill="#7b61a8"/>`).join('');
    const track = ['wisdom', 'belief', 'light', 'darkness', 'spring', 'hope', 'winter', 'despair'].map((w) => [w, ids.findIndex((id, q) => q > 0 && NT.tokText(id).trim() === w) - 1]).filter(([, j]) => j >= 0);
    const rows = track.map(([w, j]) => { const pk = Math.exp(-run[k].per[j]), pp = k ? Math.exp(-run[k - 1].per[j]) : pk; return { l: `${w} ${k ? (pk > pp ? '↑' : '↓') : ''}`, v: pk, t: pct(pk, 1), mark: k > 0 && pk < pp }; });
    st().innerHTML = `<div class="grid2"><div class="panel"><div class="h">How wrong, on average</div><svg viewBox="0 0 520 230" width="100%">${s}</svg></div><div class="panel"><div class="h">Chance of the right word</div>${NT.bars(rows, 1)}</div></div>`;
    let worse = 0; if (k) run[k].per.forEach((v, j) => { if (v > run[k - 1].per[j]) worse++; });
    NT.setStatus(k ? `Step ${k}: better on average, yet ${worse} of ${run[k].per.length} guesses got worse` : 'Before these extra steps');
  }

  // =============================== SHELL ===============================
  const ACTS = ['Act 1 · Turn words into numbers', 'Act 2 · Share context', 'Act 3 · Choose the next word', 'Epilogue'];
  const cur = () => ST[S.si];
  $('#strip').innerHTML = ACTS.map((a, k) => `<div class="region r${Math.min(k + 1, 3)}" ${k === 3 ? 'style="background:#f1f3f6"' : ''}><span class="rlabel">${a}</span><div class="rbtns">${ST.map((s, i) => (s.act === k ? `<button class="stn" data-i="${i}"><span class="n">${i < 8 ? i + 1 : '★'}</span>${s.name}</button>` : '')).join('')}</div></div>`).join('');
  $('#strip').querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { stopPlay(); go(+b.dataset.i, 0); }));
  function go(si, bi) {
    clearTimers(); S.si = si; S.bi = bi;
    $('#strip').querySelectorAll('.stn').forEach((b) => b.classList.toggle('on', +b.dataset.i === si));
    $('#headline').textContent = cur().headline;
    $('#dots').innerHTML = cur().beats.length > 1 ? cur().beats.map((_, i) => `<i class="${i === bi ? 'on' : ''}"></i>`).join('') : '';
    NT.setStatus(''); cur().beats[bi].render();
    try { history.replaceState(null, '', '#' + cur().id + (bi ? '.' + bi : '')); } catch (e) { /* ignore */ }
  }
  async function next() {
    const beat = cur().beats[S.bi];
    if (beat.step) { const r = await beat.step(1); if (r) return true; }
    if (S.bi < cur().beats.length - 1) { go(S.si, S.bi + 1); return true; }
    if (S.si < ST.length - 1) { go(S.si + 1, 0); return true; }
    return false;
  }
  function prev() {
    const beat = cur().beats[S.bi];
    if (beat.step && beat.step(-1)) return;
    if (S.bi > 0) return go(S.si, S.bi - 1);
    if (S.si > 0) go(S.si - 1, ST[S.si - 1].beats.length - 1);
  }
  $('#nextBtn').onclick = () => { stopPlay(); next(); };
  $('#prevBtn').onclick = () => { stopPlay(); prev(); };
  let play = null, repeatRounds = 0;
  function stopPlay() { if (play) { clearInterval(play); play = null; } $('#playStory').textContent = '▶ Play the story'; }
  $('#playStory').onclick = () => {
    if (play) return stopPlay();
    if (S.si === ST.length - 1) go(0, 0);
    $('#playStory').textContent = '⏸ Pause'; repeatRounds = 0;
    play = setInterval(async () => {
      if (cur().id === 'guess' && S.bi === 0 && !S.guesses.length) { go(0, 1); return; }
      if (cur().id === 'repeat') { if (repeatRounds++ < 3 && (await addWord())) return; go(S.si + 1, 0); return; }
      if (!(await next())) stopPlay();
    }, 2300);
  };
  const [h, hb] = location.hash.slice(1).split('.'), start = ST.findIndex((s) => s.id === h);
  go(start >= 0 ? start : 0, start >= 0 ? Math.min(+hb || 0, ST[start].beats.length - 1) : 0);
})();
