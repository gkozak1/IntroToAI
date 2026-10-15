/* LLM Lab — tab 1, Overview.
   Class mode: class guesses (left) against GPT-2's top 10 (right, hidden until Reveal). Double-click a word on either side to add it.
   Generate mode: GPT-2 picks tokens, automatically (Delay) or one click at a time, up to 100; each pick is shown with its candidates and r. */
'use strict';
(() => {
  const { $, esc, int } = NT;
  const S = NT.state;
  const st = () => $('#stage');
  const MAX = 100;
  const TODO_CLASS = 'Gather next word ideas from the class, compare to GPT-2’s list, add to sentence, repeat.';
  const TODO_GEN = 'Watch GPT-2 pick tokens. Pause to look closely; Stop to go back to class guesses.';
  const ex = { guesses: [], revealed: false, editing: -1, tok: 0, gen: false, delay: 1000, running: false, run: 0, busy: false, log: [], base: null, baseIds: null, sel: -1, ours: false, genId: 1 };
  const cp = NT.chancePct;
  const show = (t) => (/\S/.test(t) ? esc(t) : '↵');
  const fmtD = (ms) => (ms === 0 ? 'Instant' : (ms % 1000 ? (ms / 1000).toFixed(2).replace(/0$/, '') : (ms / 1000).toFixed(1)) + ' s');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const bubble = (rank, K, txt) => { const b = NT.BANDS[NT.rankBand(rank, K)]; return `<span class="bubs" style="background:${b.bg};color:${b.fg}">${txt}</span>`; };

  // ---------- adding a word to the sentence ----------
  const PUNCT = /^[.,;:!?%)\]'’]/;
  async function addClassWord(w) {
    const base = S.text.replace(/\s+$/, ''), add = PUNCT.test(w) ? w : ' ' + w, ids = NT.current().ids;
    let mark = null;
    try {
      const d = await NT.dist(ids), pieces = NT.encode(add), id = pieces[0];
      const rank = d.rank[id], pr = NT.probs(d, S.T, S.K), p = rank <= pr.K ? pr.p[rank - 1] : 0;
      mark = NT.makeMark({ rank, K: pr.K >= NT.ALL ? NT.ALL : S.K, p, T: S.T, piece: pieces.length > 1 ? NT.tokText(id).trim() : null });
      mark.tip = 'Class guess · ' + mark.tip;
    } catch (e) { /* GPT-2 unavailable: add it plain */ }
    resetRound(); NT.setText(base + add, 'append', mark);
  }
  function addModelToken(row) {
    const base = S.text.replace(/\s+$/, '');
    resetRound(); NT.setText(base + NT.tokText(row.id), 'append', NT.makeMark({ rank: row.rank, K: row.K, p: row.p, T: S.T }));
  }
  function resetRound() { ex.guesses = []; ex.revealed = false; ex.editing = -1; }

  // ---------- the tab ----------
  NT.stations.next = {
    init() {
      NT.onLive = () => { if (S.station === 'next' && (ex.revealed || ex.gen)) drawModel(); };
      NT.onBubble = (g) => { if (ex.gen && g.id === ex.genId && ex.log[g.i]) { ex.sel = g.i; drawGen(); } };
      tools();
      if (ex.gen) genInit(); else classInit();
    },
    onText(how) {
      if (ex.gen) {
        if (ex.ours) return; // our own append; the run loop redraws
        stopRun(); ex.log = []; ex.sel = -1; ex.base = null; ex.genId++; genInit(); return;
      }
      if (how !== 'append') resetRound();
      classInit();
    },
    onTK() { if (ex.gen) drawGen(); else drawModel(); },
  };

  // controls on the What-to-do line: Select next GPT-2 token · Play/Pause · Stop · Start over · Delay
  function tools() {
    NT.setTodo(ex.gen ? TODO_GEN : TODO_CLASS);
    $('#todoTools').innerHTML = `<button class="btn primary" id="genStep" title="GPT-2 picks one token">Select next GPT-2 token</button>
      <span class="playset"><button class="btn" id="genPlay"></button><button class="btn" id="genStop" title="Stop and go back to class guesses">■ Stop</button><button class="btn ghost" id="genReset" title="Remove GPT-2's picks from this run">↺ Start over</button></span>
      <label class="delay">Delay <small>Instant</small><input type="range" id="genDelay" min="0" max="20" step="1" value="${Math.round(ex.delay / 250)}" aria-label="Delay between tokens"><small>5 s</small><b id="genDelayV">${fmtD(ex.delay)}</b></label>`;
    $('#genDelay').oninput = (e) => { ex.delay = +e.target.value * 250; $('#genDelayV').textContent = fmtD(ex.delay); };
    $('#genStep').onclick = () => { stopRun(); if (!ex.gen) enterGen(); stepOnce(); };
    $('#genPlay').onclick = () => { if (ex.running) { stopRun(); return; } if (!ex.gen) enterGen(); runAuto(); };
    $('#genStop').onclick = () => { stopRun(); ex.gen = false; ex.base = null; ex.log = []; ex.sel = -1; ex.genId++; resetRound(); NT.stations.next.init(); };
    $('#genReset').onclick = () => { stopRun(); const b0 = ex.base; ex.log = []; ex.sel = -1; ex.genId++; ex.ours = true; NT.setText(b0, 'append'); ex.ours = false; drawGen(); };
    syncButtons();
  }
  function enterGen() { ex.gen = true; NT.stations.next.init(); }
  function syncButtons() {
    const n = ex.log.length, pb = $('#genPlay'); if (!pb) return;
    pb.textContent = ex.running ? '⏸ Pause' : '▶ Play'; pb.title = ex.running ? 'Pause' : `GPT-2 keeps picking tokens (up to ${MAX})`;
    pb.disabled = !ex.running && n >= MAX; pb.classList.toggle('on', ex.running);
    $('#genStop').disabled = !ex.gen; $('#genReset').disabled = !ex.gen || !n || ex.running;
    $('#genStep').disabled = (ex.gen && n >= MAX) || ex.busy;
  }

  // ===================== class mode =====================
  // while GPT-2 is writing, the sentence box keeps one font size and a fixed three-line height (main.js reads body.genlock)
  function lockSentence(on) { document.body.classList.toggle('genlock', on); const ta = $('#sentence'); if (ta) ta.dispatchEvent(new Event('autosize')); }
  const waitNote = (msg) => { const s = NT.live.state, p = s.phase === 'downloading' ? ` ${Math.round(s.progress * 100)}%` : ''; return msg || (s.phase === 'downloading' ? `Loading GPT-2…${p}` : s.phase === 'starting' ? 'Starting GPT-2…' : s.phase === 'error' ? 'GPT-2 could not be reached' : 'GPT-2 is thinking…'); };
  function classInit() {
    lockSentence(false);
    if (!$('#exClass')) {
      st().innerHTML = `<div class="exsplit">
        <section class="panel" id="exClass"></section>
        <section class="panel" id="exModel"></section></div>
        <div class="exhint">Double-click any word on either side to add it to the sentence. Both lists then reset for the next word.</div>`;
    }
    drawClass(); drawModel();
  }
  function rows() {
    const n = ex.guesses.reduce((a, g) => a + g.n, 0);
    return { n, list: ex.guesses.map((g, i) => ({ ...g, i })).sort((a, b) => b.n - a.n || a.i - b.i) };
  }
  function addGuesses(raw) {
    const words = (/^[^\w\s]+$/.test(raw.trim()) ? [raw.trim()] : raw.split(/[\s,]+/)).filter(Boolean);
    words.forEach((w) => { const g = ex.guesses.find((x) => x.w.toLowerCase() === w.toLowerCase()); if (g) g.n++; else ex.guesses.push({ w, n: 1 }); });
  }
  function drawClass() {
    const box = $('#exClass'); if (!box) return;
    const { n, list } = rows(), max = Math.max(1, ...list.map((g) => g.n));
    const keepFocus = document.activeElement && document.activeElement.id === 'guessIn';
    box.innerHTML = `<div class="ph"><h2>Class guesses</h2><span class="sub">${n ? `${n} guess${n === 1 ? '' : 'es'} · ${list.length} different word${list.length === 1 ? '' : 's'}` : ''}</span><span class="grow"></span><button class="btn ghost" id="guessClear" ${n ? '' : 'disabled'}>Clear</button></div>
      <div class="entry"><input type="text" id="guessIn" placeholder="Type a student’s next word, press Enter" autocomplete="off"><button class="btn" id="guessAdd">Add</button></div>
      <div class="xrows">${list.length ? '<div class="xhead"><span>#</span><span>Word</span><span>Share of guesses</span><span></span><span>Votes</span></div>' : ''}${list.length ? list.map((g, k) => `<div class="xrow crow" data-i="${g.i}" title="Double-click to add “${esc(g.w)}” to the sentence">
        <span class="rk">${k + 1}</span>${ex.editing === g.i ? `<input class="wedit" id="wEdit" value="${esc(g.w)}" aria-label="Fix this word">` : `<span class="word">${esc(g.w)}</span>`}
        <span class="bar"><i style="width:${(100 * g.n / max).toFixed(1)}%"></i></span><span class="pct">${Math.round(100 * g.n / n)}%</span>
        <span class="cnt"><button class="mini" data-a="edit" title="Fix the spelling">✎</button><button class="mini" data-a="dec" title="One fewer">−</button><span>${g.n}</span><button class="mini" data-a="inc" title="One more">+</button><button class="mini x" data-a="del" title="Remove">✕</button></span></div>`).join('') : '<div class="muted empty">No guesses yet.</div>'}</div>`;
    const inp = $('#guessIn');
    const add = () => { if (!inp.value.trim()) return; addGuesses(inp.value); inp.value = ''; drawClass(); $('#guessIn').focus(); };
    $('#guessAdd').onclick = add; inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    $('#guessClear').onclick = () => { ex.guesses = []; ex.editing = -1; drawClass(); };
    box.querySelectorAll('.xrow').forEach((r) => {
      const i = +r.dataset.i, g = ex.guesses[i];
      r.ondblclick = (e) => { if (e.target.closest('button,input')) return; addClassWord(g.w); };
      r.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'inc') g.n++;
        if (a === 'dec') { g.n--; if (g.n <= 0) ex.guesses.splice(i, 1); }
        if (a === 'del') ex.guesses.splice(i, 1);
        if (a === 'edit') ex.editing = i;
        drawClass();
      }));
    });
    const we = $('#wEdit');
    if (we) {
      we.focus(); we.select();
      const commit = () => {
        if (ex.editing < 0) return; const i = ex.editing, v = we.value.trim(); ex.editing = -1;
        if (v) { const dup = ex.guesses.findIndex((x, j) => j !== i && x.w.toLowerCase() === v.toLowerCase()); if (dup >= 0) { ex.guesses[dup].n += ex.guesses[i].n; ex.guesses.splice(i, 1); } else ex.guesses[i].w = v; }
        drawClass();
      };
      we.onkeydown = (e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { ex.editing = -1; drawClass(); } };
      we.onblur = commit;
    } else if (keepFocus) $('#guessIn').focus();
    NT.setStatus(n ? `${n} guesses · most popular “${list[0].w}”` : 'Collect the class’s guesses for the next word.');
  }
  async function drawModel() {
    const box = $('#exModel'); if (!box || ex.gen) return;
    const ids = NT.current().ids, tk = ++ex.tok;
    const head = (sub, btn) => `<div class="ph"><h2>GPT-2 predictions</h2><span class="sub">${sub}</span><span class="grow"></span>${btn}</div>`;
    if (!ex.revealed) {
      box.innerHTML = head('', '') + `<div class="hiddenbox"><span>GPT-2’s list stays hidden until the class has guessed.</span><button class="btn primary" id="revealBtn">Reveal</button></div>`;
      $('#revealBtn').onclick = () => { ex.revealed = true; drawModel(); }; return;
    }
    let d;
    if (!NT.hasFull(ids)) box.innerHTML = head('', '<button class="btn primary" id="hideBtn">Hide</button>') + NT.pendingHTML();
    const hb = () => { const h = $('#hideBtn'); if (h) h.onclick = () => { ex.revealed = false; drawModel(); }; };
    hb();
    try { d = await NT.dist(ids); } catch (e) { if (tk === ex.tok) { box.innerHTML = head('', '<button class="btn primary" id="hideBtn">Hide</button>') + NT.pendingHTML('GPT-2 could not be reached. Stored sentences still work.'); hb(); } return; }
    if (tk !== ex.tok || !$('#exModel')) return;
    const pr = NT.probs(d, S.T, S.K), n = Math.min(10, pr.K), top = [];
    for (let i = 0; i < n; i++) top.push({ id: pr.ids[i], p: pr.p[i], rank: i + 1, K: S.K >= NT.ALL ? NT.ALL : S.K });
    const shown = top.reduce((a, r) => a + r.p, 0), rest = pr.K - n;
    // the same ranking table as Output and the Whole Process (# · Token ID · Token · Logit · Probability), plus an add button
    box.innerHTML = head(`top ${n} of ${int(pr.K)} allowed`, '<button class="btn primary" id="hideBtn">Hide</button>') +
      `<div class="rk-card exrk">${NT.viz.rankTable(pr, S.K, { n, range: false, more: false })}</div>
      <div class="foot"><span>${rest > 0 ? `The other ${int(rest)} allowed tokens share the remaining ${Math.max(0, 100 - shown * 100).toFixed(0)}%.` : 'These are all the allowed tokens.'}</span><span>T ${S.T <= 1 ? S.T.toFixed(1) : S.T} · Top-K ${NT.kLabel(S.K)}</span></div>`;
    hb();
    const trs = box.querySelectorAll('table.rk tr');
    trs.forEach((tr, j) => {
      if (j === 0) { tr.insertAdjacentHTML('beforeend', '<th></th>'); return; }
      const r = top[j - 1]; if (!r) return;
      tr.title = `Double-click to add “${NT.tokText(r.id).trim()}” to the sentence`; tr.classList.add('addable');
      tr.insertAdjacentHTML('beforeend', '<td><button class="mini" data-a="add" title="Add this token to the sentence">＋ add</button></td>');
      tr.ondblclick = () => addModelToken(r); tr.querySelector('[data-a=add]').onclick = () => addModelToken(r);
    });
  }

  // ===================== generate mode =====================
  function genInit() {
    const cur = NT.current();
    if (ex.base != null && S.text !== ex.base + ex.log.map((y) => y.t).join('')) ex.base = null;
    if (ex.base == null) { ex.base = S.text; ex.baseIds = cur.ids; ex.log = []; ex.sel = -1; }
    lockSentence(true);
    // a calm page while GPT-2 writes: the waiting note sits inside the bar (no block that pushes the page down), the sentence box keeps one size
    st().innerHTML = `<div class="genbar"><span class="gcount" id="genCount"></span><span class="gwait" id="genWait"></span><span class="grow"></span><span id="genLegend"></span></div>
      <div class="genwide"><section class="panel" id="genPick"></section><section class="panel"><div class="ph"><h2>Every pick so far</h2><span class="sub">click a row or a bubble to see that pick</span></div><div class="glog" id="genLog"></div></section></div><div id="genHood"></div>`;
    $('#genLog').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr) { ex.sel = +tr.dataset.i; drawGen(true); } });
    drawGen();
  }
  function drawGen(keepScroll) {
    syncButtons();
    if (!$('#genPick')) return;
    const L = ex.log, n = L.length, sel = ex.sel >= 0 ? ex.sel : n - 1, x = L[sel];
    $('#genCount').textContent = `Generated ${n} / ${MAX} tokens`;
    $('#genLegend').innerHTML = NT.legendHTML(S.K);
    // the selected pick: its allowed candidates, probabilities and r-ranges, with the chosen row shaded in its bubble color
    if (!x) $('#genPick').innerHTML = `<div class="ph"><h2>GPT-2’s choices</h2></div><div class="muted">Press <b>Select next GPT-2 token</b> for one pick, or <b>Play</b> to let GPT-2 keep going (up to ${MAX} tokens) at the Delay you set.</div>`;
    else {
      // the stored pick (its top 10 and the picked row) shaped like NT.probs, so it draws with the shared ranking table and wheel
      const n = x.top.length, ids = [], p = [], lg = [], pre = [0];
      x.top.forEach(([id, pp, l], j) => { ids[j] = id; p[j] = pp; lg[j] = l == null ? NaN : l; pre.push(pre[j] + pp); });
      if (x.rank > n) { ids[x.rank - 1] = x.id; p[x.rank - 1] = x.p; lg[x.rank - 1] = x.logit == null ? NaN : x.logit; }
      const pr = { ids, logits: lg, p, K: x.K >= NT.ALL ? NT.V : x.K, cum: (i) => (i <= n ? pre[i] : i === x.rank - 1 ? x.lo : 0) };
      $('#genPick').innerHTML = `<div class="ph"><h2>GPT-2’s choices for token ${sel + 1}</h2><span class="sub">${x.K >= NT.ALL ? 'top 10 of all 50,257' : x.K > 10 ? `top 10 of ${x.K} allowed` : `all ${x.K} allowed`} · Temperature ${x.T <= 1 ? x.T.toFixed(1) : x.T}</span></div>
        <div class="expick"><div class="rk-card exrk">${NT.viz.rankTable(pr, x.K, { n, hit: x.rank - 1 })}</div><div class="exwheel" id="genWheel"></div></div>
        <div class="rnote">Random number r = <b>${x.r.toFixed(3)}</b> fell in “${esc(x.t.trim() || '↵')}”’s range, so GPT-2 added it: ${esc(NT.pickTip(x))}.</div>
        ${NT.flow ? `<button class="btn" id="genHoodBtn" style="margin-top:8px">🔍 Under the hood: watch how GPT-2 made pick ${sel + 1}</button>` : ''}`;
      NT.viz.wheel($('#genWheel'), { pr, K: x.K, r: x.r, hit: x.rank - 1, n, size: 190, idp: 'gw_' });
      $('#genHoodBtn').onclick = () => openHood(sel);
    }
    const lg = $('#genLog');
    lg.innerHTML = n ? `<table class="gt"><tr><th>#</th><th>Token</th><th>Probability</th><th>Rank</th><th>r</th></tr>${L.map((y, i) => `<tr data-i="${i}" class="${i === sel ? 'sel' : ''}"><td>${i + 1}</td><td>${bubble(y.rank, y.K, show(y.t))}</td><td>${cp(y.p)}</td><td>${int(y.rank)} of ${y.K >= NT.ALL ? 'All' : y.K}</td><td>${y.r.toFixed(3)}</td></tr>`).join('')}</table>` : '<div class="muted">—</div>';
    if (keepScroll !== true) { if (ex.sel < 0) lg.scrollTop = lg.scrollHeight; else { const r = lg.querySelector(`tr[data-i="${ex.sel}"]`); if (r) r.scrollIntoView({ block: 'nearest' }); } }
    NT.setStatus(n ? `${n} tokens added · T ${S.T} · Top-K ${NT.kLabel(S.K)}` : 'Generate is on: GPT-2 will add tokens to the sentence.');
  }
  // under the hood: the whole animated flow for one earlier pick, replaying its sentence, settings and random number r
  function openHood(i) {
    const x = ex.log[i], host = $('#genHood'); if (!x || !host) return;
    if (ex.running) stopRun();
    const before = ex.base + ex.log.slice(0, i).map((y) => y.t).join('');
    host.innerHTML = '<div id="genHoodFlow"></div>';
    NT.flow.create($('#genHoodFlow'), { text: () => before, pick: { r: x.r, T: x.T, K: x.K }, controls: 'own', speedMul: 2, autoplay: true,
      title: `Under the hood: pick ${i + 1}, “${esc(x.t.trim() || '↵')}” <button class="btn small ghost" id="genHoodX">Close</button>`,
      note: 'The whole process for this one pick, sped up. Every step uses the same sentence, settings and random number r as the real pick. Pause, or step with ◀ Back and Next ▶.' });
    $('#genHoodX').onclick = () => { host.innerHTML = ''; };
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function stepOnce() {
    if (ex.busy || ex.log.length >= MAX) return false;
    ex.busy = true; drawGen(true);
    const my = ex.genId;
    try {
      const ids = ex.baseIds.concat(ex.log.map((y) => y.id));
      if (!NT.hasFull(ids) && $('#genWait')) $('#genWait').textContent = waitNote();
      const d = await NT.dist(ids), pr = NT.probs(d, S.T, S.K);
      let i = 0, r = 0;
      for (let k = 0; k < 20; k++) { r = Math.random(); i = NT.pickIndex(pr.p, r); if (pr.ids[i] !== 50256) break; }
      if ($('#genWait')) $('#genWait').textContent = '';
      if (my !== ex.genId || !ex.gen) return false;
      let lo = 0; for (let j = 0; j < i; j++) lo += pr.p[j];
      const id = pr.ids[i], K = S.K >= NT.ALL ? NT.ALL : pr.K;
      const x = { id, t: id === 50256 ? '\n\n' : NT.tokText(id), rank: i + 1, K, T: S.T, p: pr.p[i], logit: pr.logits[i], r, lo, top: Array.from({ length: Math.min(10, pr.K) }, (_, j) => [pr.ids[j], pr.p[j], pr.logits[j]]) };
      ex.log.push(x); ex.sel = -1;
      ex.ours = true; NT.setText(S.text + x.t, 'append', NT.makeMark(x, { id: ex.genId, i: ex.log.length - 1 })); ex.ours = false;
      return true;
    } catch (e) { if ($('#genWait')) $('#genWait').textContent = waitNote('GPT-2 could not be reached. Stored sentences still work.'); return false; }
    finally { ex.busy = false; drawGen(); }
  }
  function stopRun() { ex.running = false; ex.run++; drawGen(true); }
  async function runAuto() {
    const my = ++ex.run; ex.running = true; drawGen(true);
    while (ex.running && my === ex.run && ex.log.length < MAX && S.station === 'next' && ex.gen) {
      const t0 = performance.now();
      const ok = await stepOnce(); if (!ok) break;
      if (ex.log.length >= MAX) break;
      await sleep(Math.max(16, ex.delay - (performance.now() - t0)));
    }
    if (my === ex.run) { ex.running = false; drawGen(); }
  }
})();
