/* LLM Lab — Whole Process › Side by side (the "repeat" station), plus two helpers other tabs use: NT.attnFor (real attention, stored or live)
   and NT.getDist (GPT-2's scores for the current sentence). The old Transformer, Logits and Pick stations were retired Oct 15. */
'use strict';
(() => {
  const { $, esc, show, pct, int, num } = NT;
  const S = NT.state;
  const tb = () => $('#toolbar'), st = () => $('#stage');
  const wire = NT.wireStepper;
  const pend = (m) => NT.pendingHTML(m);
  const FAIL = 'GPT-2 could not be reached. Stored sentences still work.';

  // --- Real attention (stored for the starter sentences, live GPT-2 for any other sentence) ---
  const attnCache = new Map(); let attTok = 0;
  NT.attnFor = (cur) => attnFor(cur);
  async function attnFor(cur) {
    if (cur.ex && cur.ex.attn) return cur.ex;
    if (attnCache.has(cur.text)) return attnCache.get(cur.text);
    const a = await NT.live.attention(cur.ids);
    const ex = { key: 'custom', ids: cur.ids, tokens: cur.tokens, T: cur.ids.length, attn: a, text: cur.text };
    attnCache.set(cur.text, ex); return ex;
  }
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

  // ===================== 8. REPEAT =====================
  // Two views: "One at a time" (each new token appears colored by its probability, with a table of every pick below)
  // and "Side by side" (Greedy / Typical / Wild at once). Both count tokens, up to 100 per run.
  const rp = { view: 'one', base: null, hist: [], log: [], run: 0, busy: false, loop: false, count: 25, scount: 50, pause: 500, sel: -1, cols: null, sbase: null, greedy: { base: null, toks: [] } };
  const PRE = [{ name: 'Greedy', T: 0.2, K: 1 }, { name: 'Typical', T: 1, K: 5 }, { name: 'Wild', T: 10, K: 50 }];
  const KOPT = [1, 2, 3, 5, 10, 20, 50, NT.ALL];
  const PAUSES = [[0, 'none'], [250, '0.25 s'], [500, '0.5 s'], [1000, '1 s'], [2000, '2 s']];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hasWord = (t) => /\S/.test(t);
  // token colors: NT.rankBand (rank among the allowed choices; fixed rank bands when Top-K is All)
  const bandX = (x) => NT.BANDS[NT.rankBand(x.rank, x.K)];
  const cp = (p) => (p >= 0.001 ? pct(p, 1) : p >= 0.00001 ? (p * 100).toPrecision(2) + '%' : '<0.001%');
  const tokLabel = (t) => (hasWord(t) ? show(t) : '↵');
  // a generated token as a colored chip; line breaks show ↵ and then really break the line
  const chip = (x, i, extra = '') => { const b = bandX(x); return `<button type="button" class="gtok${extra}" data-i="${i}" style="background:${b.bg};color:${b.fg}" title="Token ${i + 1} · ${esc(NT.pickTip(x))}">${hasWord(x.t) ? esc(x.t) : '↵'}</button>${hasWord(x.t) ? '' : x.t.replace(/[^\n]/g, '')}`; };
  // one pick from GPT-2 (stored scores for the first step of a stored sentence, live GPT-2 after that)
  async function nextTok(ids, T, K) {
    const d = await NT.dist(ids), pr = NT.probs(d, T, K);
    let i = 0, r = 0;
    for (let k = 0; k < 20; k++) { r = Math.random(); i = NT.pickIndex(pr.p, r); if (pr.ids[i] !== 50256) break; }
    const id = pr.ids[i];
    let lo = 0; for (let j = 0; j < i; j++) lo += pr.p[j];
    const n = Math.min(10, pr.K), top = [];
    for (let j = 0; j < n; j++) top.push({ id: pr.ids[j], p: pr.p[j] });
    return { id, t: id === 50256 ? '\n\n' : NT.tokText(id), p: pr.p[i], rank: i + 1, r, lo, K: pr.K, T, top };
  }
  NT.setRepeatView = (v) => { rp.view = v; };
  NT.stations.repeat = {
    init() {
      rp.run++; rp.loop = false; rp.busy = false;
      const cur = NT.current();
      if (rp.base == null || rp.base + rp.log.map((x) => x.t).join('') !== S.text) { rp.base = cur.text; rp.baseIds = cur.ids; rp.hist = []; rp.log = []; rp.sel = -1; }
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
      <button class="btn primary" id="rOne">Add one token</button><span class="ctl"><button class="btn" id="rMany">Add</button><select id="rCount" aria-label="How many tokens">${countOpts([5, 10, 25, 50, 100], rp.count)}</select> tokens</span>
      <span class="ctl"><label for="rPause">Pause</label><select id="rPause">${PAUSES.map(([v, l]) => `<option value="${v}" ${v === rp.pause ? 'selected' : ''}>${l}</option>`).join('')}</select></span>
      <button class="btn danger" id="rStop" hidden>Stop</button><button class="btn" id="rUndo">Undo</button><button class="btn ghost" id="rClear">Start over</button>`;
    tb().querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { const p = b.dataset.p; if (p === 'g') NT.setTK(0.2, 1); if (p === 't') NT.setTK(1, 5); if (p === 'w') NT.setTK(10, 50); }));
    $('#rCount').onchange = (e) => { rp.count = +e.target.value; };
    $('#rPause').onchange = (e) => { rp.pause = +e.target.value; };
    $('#rOne').onclick = () => addOne(rp.run);
    $('#rMany').onclick = () => runMany(rp.count);
    $('#rStop').onclick = () => { rp.run++; rp.loop = false; rp.busy = false; $('#rpWait') && ($('#rpWait').innerHTML = ''); drawOne(); };
    $('#rUndo').onclick = () => { if (rp.hist.length && !rp.loop) { rp.log.pop(); rp.sel = -1; NT.setText(rp.hist.pop(), 'append'); } };
    $('#rClear').onclick = () => { if (rp.loop) return; rp.hist = []; rp.log = []; rp.sel = -1; NT.setText(rp.base, 'append'); };
    st().innerHTML = `<div class="panel"><div class="rhead"><span class="h" id="rCountLbl" style="margin:0"></span><span id="rLegend">${NT.legendHTML(S.K)}</span></div>
        <div class="sentence rsent" id="rSent"></div><div id="rpWait"></div>
        <div class="muted rhint">Each new token is colored by how far down GPT-2’s list it was. Click a colored token to see how it was picked.</div></div>
      <div class="rgrid">
        <div class="panel"><div class="h">Every pick so far</div><div id="rLog" class="rlog"></div></div>
        <div class="panel" id="rDetail"></div>
      </div>`;
    $('#rSent').addEventListener('click', (e) => { const b = e.target.closest('.gtok'); if (b) { rp.sel = +b.dataset.i; drawOne(); } });
    $('#rLog').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr) { rp.sel = +tr.dataset.i; drawOne(true); } });
    drawOne();
  }
  function drawDetail(i) {
    const box = $('#rDetail'); if (!box) return;
    const x = rp.log[i];
    if (!x) { box.innerHTML = `<div class="h">How a token was picked</div><div class="muted">Add a token to see the candidates GPT-2 chose from, each one's probability, and the random number r that made the pick.</div>`; return; }
    let c = 0;
    const rows = x.top.map((o, j) => { const a = c; c += o.p; return { ...o, rank: j + 1, a, b: c }; });
    const chosenShown = x.rank <= rows.length;
    const b0 = bandX(x);
    box.innerHTML = `<div class="h">Token ${i + 1}: <span class="gtok static" style="background:${b0.bg};color:${b0.fg}">${tokLabel(x.t)}</span></div>
      <div class="rfacts"><span><b>${cp(x.p)}</b> probability</span><span>rank <b>${int(x.rank)}</b> of ${int(x.K)} allowed</span><span>r = <b>${x.r.toFixed(3)}</b></span><span class="muted">T ${x.T} · Top-K ${NT.kLabel(x.K)}</span></div>
      <table class="t"><tr><th>Rank</th><th>Token</th><th>Probability</th><th>r-range</th></tr>
      ${rows.map((o) => `<tr class="${o.rank === x.rank ? 'pick' : ''}"><td>${o.rank}</td><td class="tokc">${tokLabel(o.id === 50256 ? '\n' : NT.tokText(o.id))}</td><td>${cp(o.p)}</td><td>${o.a.toFixed(3)} – ${o.b.toFixed(3)}</td></tr>`).join('')}
      ${chosenShown ? '' : `<tr><td colspan="4" class="muted">…</td></tr><tr class="pick"><td>${int(x.rank)}</td><td class="tokc">${tokLabel(x.t)}</td><td>${cp(x.p)}</td><td>${x.lo.toFixed(3)} – ${(x.lo + x.p).toFixed(3)}</td></tr>`}
      </table>
      <div class="muted" style="margin-top:6px;font-size:.8rem">r = ${x.r.toFixed(3)} landed in the highlighted token's range, so that token was added.${x.K > rows.length && chosenShown ? ` The other ${int(x.K - rows.length)} allowed tokens share the rest.` : ''}</div>`;
  }
  function drawOne(keepScroll) {
    if (!$('#rSent')) return;
    if ($('#rLegend')) $('#rLegend').innerHTML = NT.legendHTML(S.K);
    const L = rp.log, b = rp.base || '';
    const last = L.length - 1;
    $('#rSent').innerHTML = `${esc(b)}${L.map((x, i) => chip(x, i, (i === rp.sel ? ' sel' : '') + (i === last && rp.justAdded ? ' fresh' : ''))).join('')}`;
    rp.justAdded = false;
    { const ta = $('#sentence'); if (ta && L.length) ta.scrollTop = ta.scrollHeight; }
    if (!rp.busy && $('#rpWait')) $('#rpWait').innerHTML = '';
    $('#rCountLbl').textContent = `Generated: ${L.length} token${L.length === 1 ? '' : 's'}`;
    $('#rLog').innerHTML = L.length ? `<table class="t"><tr><th>#</th><th>Token</th><th>Probability</th><th>Rank</th><th>r</th></tr>${L.map((x, i) => { const bb = bandX(x); return `<tr data-i="${i}" class="${i === rp.sel ? 'pick' : ''}"><td>${i + 1}</td><td class="tokc"><span class="gtok static" style="background:${bb.bg};color:${bb.fg}">${tokLabel(x.t)}</span></td><td>${cp(x.p)}</td><td>${int(x.rank)}</td><td>${x.r.toFixed(3)}</td></tr>`; }).join('')}</table>` : '<div class="muted">—</div>';
    const lg = $('#rLog');
    if (rp.sel >= 0 && keepScroll !== true) { const row = lg.querySelector(`tr[data-i="${rp.sel}"]`); if (row) row.scrollIntoView({ block: 'nearest' }); }
    else if (rp.sel < 0) lg.scrollTop = lg.scrollHeight;
    drawDetail(rp.sel >= 0 ? rp.sel : last);
    $('#rStop').hidden = !rp.loop; $('#rOne').disabled = rp.loop; $('#rMany').disabled = rp.loop; $('#rUndo').disabled = rp.loop || !rp.hist.length; $('#rClear').disabled = rp.loop || S.text === rp.base;
    NT.setStatus(`${L.length} tokens added · T ${S.T} · Top-K ${NT.kLabel(S.K)}`);
  }
  async function addOne(my) {
    if (rp.busy) return false; rp.busy = true;
    try {
      const ids = rp.baseIds.concat(rp.log.map((x) => x.id)); // keep the exact tokens GPT-2 picked; re-reading the text could merge them differently
      if (!NT.hasFull(ids) && $('#rpWait')) $('#rpWait').innerHTML = pend();
      const x = await nextTok(ids, S.T, S.K);
      if ($('#rpWait')) $('#rpWait').innerHTML = '';
      if (my !== rp.run || S.station !== 'repeat') return false;
      rp.hist.push(S.text); rp.log.push(x); rp.busy = false; rp.sel = -1; rp.justAdded = true;
      NT.setText(S.text + x.t, 'append', NT.makeMark(x)); return true;
    } catch (e) { if ($('#rpWait')) $('#rpWait').innerHTML = pend(FAIL); return false; } finally { rp.busy = false; }
  }
  async function runMany(n) {
    const my = ++rp.run; rp.loop = true; drawOne();
    for (let added = 0; added < n && my === rp.run && S.station === 'repeat' && rp.view === 'one'; added++) {
      const t0 = performance.now();
      const ok = await addOne(my); if (!ok) break;
      const wait = rp.pause - (performance.now() - t0);
      if (added < n - 1) await sleep(Math.max(30, wait));
    }
    if (my === rp.run) { rp.loop = false; drawOne(); }
  }

  // ---------- Side by side ----------
  function sideInit() {
    $('#rTools').innerHTML = `<span class="ctl"><button class="btn primary" id="sGo">Write</button><select id="sCount" aria-label="How many tokens">${countOpts([25, 50, 100], rp.scount)}</select> tokens each</span><button class="btn danger" id="sStop" hidden>Stop</button>`;
    $('#sCount').onchange = (e) => { rp.scount = +e.target.value; };
    $('#sGo').onclick = () => runSide(rp.scount);
    $('#sStop').onclick = () => { rp.run++; rp.loop = false; drawSide(); };
    if (!rp.cols || !rp.cols.some((c) => c.gen)) rp.sbase = null;
    if (!rp.cols) rp.cols = PRE.map((p) => ({ ...p, gen: '', toks: [], words: 0, uniq: new Set(), done: false }));
    st().innerHTML = `<div class="rhead" style="margin-bottom:8px"><span class="muted">Same start, three settings. Each token is colored by its rank among that column’s allowed choices (fixed rank bands when Top-K is All).</span></div><div class="grid3" id="sCols"></div>`;
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
      $('#sc' + i).innerHTML = `${esc(base)}${(c.toks || []).map((x, j) => chip(x, j, ' static')).join('')}`;
      $('#ss' + i).textContent = c.n ? `${c.n} tokens · ${c.words} words · ${c.uniq.size} different` : '';
      const el = $('#sc' + i); el.scrollTop = el.scrollHeight;
    });
    $('#sStop').hidden = !rp.loop; $('#sGo').disabled = rp.loop;
    NT.setStatus(rp.loop ? 'Writing all three, one token at a time…' : 'Same start, three settings. Press Write again for a new draw.');
  }
  async function runSide(n) {
    const my = ++rp.run; rp.loop = true; rp.sbase = NT.current().text; const base = rp.sbase;
    rp.cols = rp.cols.map((c) => ({ ...c, gen: '', toks: [], n: 0, ids: [], words: 0, uniq: new Set(), done: false }));
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
          c.n = (c.n || 0) + 1; c.gen += x.t; c.toks.push(x); c.ids = c.ids.concat([x.id]);
          if (hasWord(x.t)) { c.words++; c.uniq.add(x.t.trim().toLowerCase()); }
          if (c.n >= n) c.done = true;
          drawSide(false);
        }
      }
    } catch (e) { const w = document.createElement('div'); w.innerHTML = pend(FAIL); $('#sCols').before(w); }
    if (my === rp.run) { rp.loop = false; drawSide(false); }
  }

})();
