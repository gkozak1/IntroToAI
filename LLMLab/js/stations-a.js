/* LLM Lab — Input tab helpers: Build the tokenizer (station tokens), the embeddings views (station embeddings), the stepper and pending helpers. The old Next Word and IDs stations were retired Oct 15. */
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
    for (let i = 0; i < pieces.length - 1; i++) { if (/^\s/.test(pieces[i + 1])) continue; const k = pieces[i] + '\u0000' + pieces[i + 1]; cnt.set(k, (cnt.get(k) || 0) + 1); } // never across words, like GPT-2
    let best = null, bc = 1;
    for (const [k, c] of cnt) { if (c > bc || (c === bc && c > 1 && best !== null && k < best)) { best = k; bc = c; } }
    return best && bc > 1 ? { pair: best.split('\u0000'), count: bc } : null;
  }
  function stopPlay() { if (playTimer) { clearInterval(playTimer); playTimer = null; } const b = document.querySelector('#bpeStep [data-a=play]'); if (b) b.textContent = '▶ Play'; }
  function buildInit() {
    const cur = NT.current(); if (!B || B.text !== cur.text) bpeReset(cur.text);
    $('#tokTools').innerHTML = `<button class="btn" id="bpeReset" title="Start over">⏮</button>${NT.stepper('bpeStep', { play: true })}<button class="btn" id="bpeFinish" title="Make every merge at once">⏭ Finish</button>`;
    st().innerHTML = `<div class="panel"><div class="bpehint" id="bpeHint"></div><div class="bperow"><div class="bpelab" id="bpeOurLab">Our tokenizer</div><div class="toks" id="bpeChips" style="min-height:44px"></div></div><div class="bperow gpt"><div class="bpelab" id="bpeGptLab">GPT-2’s tokenizer</div><div class="toks" id="realRow"></div></div><div class="bpekey" id="bpeKey"></div><div id="bpeDone"></div></div>
      <div class="mergegrid"><div class="panel"><div class="h">Merges <span class="muted" style="font-weight:500">and where GPT-2 made the same merge</span></div><div id="mergeList"></div></div><div class="panel"><div class="h">Our tokenizer vs GPT-2’s</div><div id="bridge"></div></div></div>
      <div class="panel" style="margin-top:12px"><div class="h">GPT-2’s first merges <span class="muted" style="font-weight:500">the most common pairs in its training text</span></div><div class="firstm mono" id="firstM"></div></div>`;
    wire('#bpeStep', { prev: () => { stopPlay(); buildStep(-1); }, next: () => { stopPlay(); buildStep(1); }, play: () => { if (playTimer) return stopPlay(); document.querySelector('#bpeStep [data-a=play]').textContent = '⏸ Pause'; playTimer = setInterval(() => { if (!buildStep(1)) stopPlay(); }, 900); } });
    $('#bpeReset').onclick = () => { bpeReset(NT.current().text); drawBuild(); };
    $('#bpeFinish').onclick = () => { stopPlay(); while (buildStep(1, true)); drawBuild(); };
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
    // where each piece starts and ends in the text, so our pieces can be compared with GPT-2's tokens
    const gIds = NT.current().ids, gSpan = new Set(); { let o = 0; gIds.forEach((id) => { const t = Array.from(NT.tokText(id)).length; gSpan.add(o + ':' + (o + t)); o += t; }); }
    const oSpan = []; { let o = 0; h.pieces.forEach((p) => { const t = Array.from(p).length; oSpan.push(o + ':' + (o + t)); o += t; }); }
    const same = oSpan.map((k) => gSpan.has(k)), nSame = same.filter(Boolean).length;
    // pieces are grouped into words (a new word starts at a piece that begins with a space), so a line never breaks inside a word
    const grp = (html, starts) => { let o = '<span class="wgrp">'; html.forEach((x, i) => { if (i && starts[i]) o += '</span><span class="wgrp">'; o += x; }); return o + '</span>'; };
    $('#bpeChips').innerHTML = grp(h.pieces.map((p, i) => `<span class="tok ${same[i] && h.pieces[i].length > 1 ? 'same ' : ''}${hot.has(i) ? (B.verdict === 'no' ? 'no' : B.verdict === 'ok' ? 'ok' : 'hot') : i % 2 ? 'alt' : ''} ${B.guess && (B.guess.i === i || B.guess.i + 1 === i) ? 'sel' : ''}" data-i="${i}" title="Click to guess this piece + the one to its right">${dots(p)}</span>`), h.pieces.map((p) => p.startsWith(' ')));
    $('#bpeChips').querySelectorAll('.tok').forEach((el) => (el.onclick = () => { const i = +el.dataset.i; if (i >= h.pieces.length - 1) return; B.guess = { 0: h.pieces[i], 1: h.pieces[i + 1], i }; B.verdict = null; drawBuild(); }));
    const mx = NT.MERGES;
    $('#mergeList').innerHTML = B.merges.length ? `<table class="t left"><tr><th>#</th><th>Merge</th><th>Times</th><th>GPT-2’s merge number</th></tr>${B.merges.map((m, i) => `<tr><td>${i + 1}</td><td class="tokc">${dots(m.m)}</td><td>×${m.c}</td><td>${m.rank ? `<b>${int(m.rank)}</b> of ${int(mx)}<span class="rankbar"><i style="left:${(100 * m.rank / mx).toFixed(1)}%"></i></span>` : '<span class="muted">not a GPT-2 merge</span>'}</td></tr>`).join('')}</table>` : '<span class="muted">—</span>';
    const chars = Array.from(B.text), uniq = new Set(chars).size, dict = uniq + B.merges.length;
    $('#bridge').innerHTML = `<table class="t left"><tr><th></th><th>Our tokenizer</th><th>GPT-2</th></tr>
      <tr><td>Training text</td><td>this ${int(chars.length)}-character text</td><td>about 8,000,000 web pages</td></tr>
      <tr><td>Merges</td><td><b>${B.merges.length}</b></td><td><b>${int(mx)}</b></td></tr>
      <tr><td>Dictionary</td><td><b>${dict}</b> (${uniq} characters + ${B.merges.length})</td><td><b>${int(NT.V)}</b> (256 bytes + ${int(mx)} + 1)</td></tr>
      <tr><td>Pieces for this text</td><td><b>${h.pieces.length}</b></td><td><b>${NT.current().ids.length}</b></td></tr></table>`;
    { const oS = new Set(oSpan); let o = 0; $('#realRow').innerHTML = gIds.map((id, i) => { const t = NT.tokText(id), k = o + ':' + (o + Array.from(t).length); o += Array.from(t).length; return `<span class="tok ${i % 2 ? 'alt' : ''} ${oS.has(k) && Array.from(t).length > 1 ? 'same' : ''}" title="Token ID ${id}">${dots(t)}</span>`; }).join(''); }
    $('#bpeOurLab').innerHTML = `Our tokenizer <small>${h.pieces.length} pieces · ${B.merges.length} merge${B.merges.length === 1 ? '' : 's'} so far</small>`;
    $('#bpeGptLab').innerHTML = `GPT-2’s tokenizer <small>${gIds.length} tokens · 50,000 merges learned from web text</small>`;
    const nMulti = h.pieces.filter((p, i) => same[i] && p.length > 1).length;
    $('#bpeKey').innerHTML = `<span><i class="samek"></i>the same piece in both (${nMulti})</span><span class="muted">${nSame === h.pieces.length ? 'Our pieces now match GPT-2’s tokens exactly.' : 'Each merge glues two neighbors together. GPT-2 made 50,000 merges from far more text, so its pieces are mostly whole words.'}</span>`;
    const done = !bestPair(h.pieces), nextBp = bestPair(h.pieces), last = B.merges.at(-1);
    NT.stepperState('#bpeStep', B.hist.length > 1, !done);
    const q = (x) => `\u201c${dots(x)}\u201d`;
    $('#bpeHint').innerHTML = done ? '' : B.guess ? `Your guess: ${q(B.guess[0])} + ${q(B.guess[1])}. Press Next \u25b6 to see if it is the most common pair.`
      : `${B.verdict === 'ok' ? `<b class="yes">\u2713 You predicted it:</b> ${q(last.m)} appeared ${last.c} times. ` : B.verdict === 'no' ? `<b class="no">Not quite:</b> the most common pair was ${q(last.a)} + ${q(last.b)} (${last.c} times). ` : ''}<b>Predict the next merge:</b> click a piece. It and the piece to its right become your guess. Then press Next \u25b6.`;
    $('#bpeDone').innerHTML = done ? `<div class="whybox" style="margin:12px 0 0"><b>Finished after ${B.merges.length} merge${B.merges.length === 1 ? '' : 's'}.</b> No pair of neighboring pieces appears more than once in this text, so there is nothing left to learn from it. A tokenizer needs lots of text: GPT-2 learned its ${int(NT.MERGES)} merges from about 8 million web pages, which is why it already has whole tokens for common words. ${B.text.startsWith('kind unkind') ? '' : '<button class="btn small" id="bpePractice">Try the practice text</button> (it repeats words, so many more merges happen)'}</div>` : '';
    if ($('#bpePractice')) $('#bpePractice').onclick = () => { const e = NT.TOK_EXAMPLES.find((x) => x[0].startsWith('Practice')); if (e) NT.setText(e[1], 'edit'); };
    void nextBp;
    NT.setStatus(B.merges.length ? `Merge ${B.merges.length}: “${B.merges.at(-1).m.replace(/ /g, '·')}” appears ${B.merges.at(-1).c} times${B.verdict === 'ok' ? ' · ✓ you predicted it' : B.verdict === 'no' ? ' · ✗' : ''}${done ? ' · no pair repeats' : ''}` : done ? 'No pair of pieces repeats in this text' : 'Press Next ▶ to make the first merge');
  }

  // ===================== 4. EMBEDDINGS =====================
  S.embView = 'qualities'; S.embStep = 1;
  NT.stations.embeddings = {
    init() {
      tb().innerHTML = `<div class="seg" id="embSeg">${[['qualities', 'Qualities'], ['dims', 'Many dimensions'], ['input', 'Token + position']].map(([v, l]) => `<button data-v="${v}" class="${S.embView === v ? 'on' : ''}">${l}</button>`).join('')}</div><span id="embTools" style="display:contents"></span>`;
      tb().querySelectorAll('#embSeg button').forEach((b) => (b.onclick = () => { S.embView = b.dataset.v; NT.stations.embeddings.init(); }));
      if (S.embView === 'qualities') { NT.meaning.init($('#embTools'), st()); return; }
      if (S.embView === 'dims') { NT.dims.init($('#embTools'), st()); return; }
      // Token + position: each token adds the position vector for its place to its embedding vector (js/numflow.js)
      tb().innerHTML = '';
      NT.numScene(st(), 'pos', { more: ['Next: Put it together ›', () => NT.goTab('numbers', 'all')] });
      return;
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
    NT.stepperState('#embStepper', shown > 1, shown < n);
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
    for (let i = 0; i < pieces.length - 1; i++) { if (/^\s/.test(pieces[i + 1])) continue; const k = pieces[i] + '\u0000' + pieces[i + 1]; cnt.set(k, (cnt.get(k) || 0) + 1); } // never across words, like GPT-2
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
