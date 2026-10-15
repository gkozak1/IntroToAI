/* LLM Lab — tab "Output", rebuilt Oct 14 to look and move like Whole Process › Animated flow, continuing from the Transformer's last picture.
   One growing scene; the steps are the sub-tab chevrons (as in Transformer):
   1) From the Transformer: the token column with its Information Cards after block 12 and the "If GPT-2 stopped" box → the box and every card
      but the last fade → the last card moves over and up and becomes the output vector.
   2) Score every token: the output vector against every embedding row of the token vocab matrix (one row → five labeled rows → all 50,257)
      → the scores (logits) line up in the ranking table.
   3) Temperature & Top-K: Top-K grays out the tokens that aren't allowed; Temperature divides every logit (Logit ÷ T).
   4) Scores into probabilities: SoftMax; each allowed token gets a slice of the spinner.
   5) Pick with r: 🎲 Spin above the wheel; the needle stops at r; the winner joins the sentence.
   Real GPT-2 numbers throughout (stored for the stories, the in-browser GPT-2 for anything else). The Information Cards need numbers from inside
   GPT-2 (stored for the story, umbrella and trophy sentences); other sentences show them gray. Presets (Greedy · Typical · Wild · Plain) sit in the
   top bar on this tab only. */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const VZ = NT.viz, cp = VZ.cp;
  const st = () => $('#stage');
  const tt = (id) => NT.tokText(id), sh = (id) => esc(tt(id).replace(/\n/g, '⏎').trim() || '·');
  const int = (x) => NT.int(x);
  const P = 'pk_', E = (id) => document.getElementById(P + id);
  const pk = { beat: 0, r: null, spun: false, added: 0, autoK: false, playing: false, timer: null };

  // ---------- presets: in the top bar, on this tab only ----------
  const PRE = [['Greedy', 0.2, 1], ['Typical', 1, 5], ['Wild', 10, 50], ['Plain', 1, NT.ALL]];
  function presetBar() {
    let bar = $('#presetBar');
    if (!bar) { const k = $('#kSlider').closest('.ctl'); bar = document.createElement('span'); bar.id = 'presetBar'; bar.className = 'presetbar'; k.after(bar); }
    bar.hidden = false;
    bar.innerHTML = PRE.map(([n, T, K], i) => `<button class="chip ${S.T === T && S.K === K ? 'on' : ''}" data-pre="${i}" title="Temperature ${T}, Top-K ${NT.kLabel(K)}">${n}</button>`).join('');
    bar.querySelectorAll('[data-pre]').forEach((b) => (b.onclick = () => { const [, T, K] = PRE[+b.dataset.pre]; NT.setTK(T, K); }));
  }

  // ---------- the steps ----------
  const BEATS = [
    [1, 'start', 'Where the Transformer left off.', 'After block 12, the last token’s Information Card ranks the tokens that could come next. Everything on this tab happens to that one card.'],
    [1, 'focus', 'Only the last token’s Information Card is used to pick the next token.', 'The other tokens’ cards have done their job: “{last}” interviewed them in every block, so its card already holds what they offered.'],
    [1, 'out', 'The last Information Card becomes the output vector.', 'GPT-2 rescales it one last time (a final layer norm). Its 768 numbers describe the token that should come next.'],
    [2, 'one', 'Score every token: compare the output vector with each token’s embedding row.', 'Multiply the two vectors number by number and add up the 768 products (a dot product). The total is the token’s score, called a logit: “{t1}” scores {s1}.'],
    [2, 'five', 'Tokens whose embedding rows match the output vector get high scores.', 'Each line is one score. Its color shows the rank, from dark green (best) to red. GPT-2 works with token IDs, not words.'],
    [2, 'all', 'All 50,257 tokens are scored at once.', 'That’s 50,257 dot products of 768 numbers each, one for every embedding row of the token vocab matrix.'],
    [2, 'rank', 'Line the scores up from best to worst.', 'The logits here are large negative numbers, but that doesn’t matter: only the gaps between them count, as the next steps show.'],
    [3, 'topk', 'Top-K decides which tokens are allowed.', 'Only the K highest scores stay in the running; every other token is out. Move the Top-K slider at the top, or try a preset.{auto}'],
    [3, 'temp', 'Temperature reshapes the gaps between the scores.', 'Every allowed logit is divided by the Temperature. Below 1, the gaps stretch and the leader pulls ahead; above 1, they shrink and the scores bunch together.'],
    [4, 'soft', 'Scores into probabilities: each allowed token gets a slice of the spinner.', 'SoftMax turns the adjusted scores (Logit ÷ T) into probabilities that add up to 100%. Each slice is as big as its probability; one point behind #1 makes a slice about 2.7 times smaller.'],
    [5, 'pick', 'Pick with r: spin the wheel.', 'A random number r between 0 and 1 turns the needle. Whichever slice it stops in is the next token. Press 🎲 Spin.'],
  ];
  const B = Object.fromEntries(BEATS.map((b, i) => [b[1], i]));
  const STEPS = [[1, 'From the Transformer'], [2, 'Score every token'], [3, 'Temperature & Top-K'], [4, 'Scores into probabilities'], [5, 'Pick with r']];

  // ---------- data ----------
  let C = null; // { text, d, ex, T, W, cards(i) | null, last }
  async function load() {
    const cur = NT.current();
    if (C && C.text === cur.text) return true;
    $('#pkBox').innerHTML = `<div id="pkWait">${NT.pendingHTML('Loading GPT-2’s scores…')}</div>`;
    let d; try { d = await NT.getDist($('#pkWait')); } catch (e) { if (S.station === 'pkscene') $('#pkBox').innerHTML = NT.pendingHTML('GPT-2 is needed for this sentence. It is still loading or could not be reached; the stories in the dropdown work without it.'); return false; }
    if (S.station !== 'pkscene' || NT.current().text !== cur.text) return false;
    const W = cur.ids.map((id) => tt(id).trim() || '·'), T = W.length;
    let cards = null;
    const FD = NT.flowData ? await NT.flowData().catch(() => null) : null, X8 = FD && cur.key && FD[cur.key];
    if (X8 && X8.T === T) {
      const u = NT.b64(X8.h), q = new Int8Array(u.buffer, u.byteOffset, u.byteLength);
      cards = (i) => { const sc = X8.hs[12 * T + i], o = (12 * T + i) * 768, a = new Float32Array(768); for (let e = 0; e < 768; e++) a[e] = (q[o + e] / 127) * sc; return a; };
    }
    const all = d.partial ? null : d;
    C = { text: cur.text, d, ex: cur.ex, T, W, cards, last: W[T - 1], rank: (id) => (all ? all.rank[id] : (d.ids.indexOf(id) + 1) || null), score: (id) => (all ? all.logits[id] : (d.ids.indexOf(id) >= 0 ? d.logits[d.ids.indexOf(id)] : null)) };
    return true;
  }
  const order = (r) => (C.d.partial ? C.d.ids[r - 1] : C.d.order[r - 1]);
  // the labeled rows: the story's five (as in Whole Process), otherwise the top 4 and one ordinary word near the bottom
  function labeled() {
    const want = C.text.startsWith(NT.EX.story.text) && C.T === 13 ? [' river', ' bank', ' street', ' the', ' banana'].map(NT.tokenIdOf).filter((x) => x >= 0) : null;
    if (want) return want;
    const o = [1, 2, 3, 4].map(order);
    if (!C.d.partial) { for (let r = Math.round(C.d.logits.length * 0.6); r > 50; r--) { const id = order(r); if (/^ [a-z]{4,}$/.test(tt(id))) { o.push(id); break; } } }
    return o;
  }

  // ---------- scene geometry ----------
  const SW = 1290;
  let G = null; // per sentence
  function geom() {
    const T = C.T, ROW = Math.max(18, Math.min(34, Math.floor(470 / (T + 1)))), TOP = 74;
    const H = Math.max(TOP + (T + 1) * ROW + 70, 560);
    const MX = 780, MY = TOP, MW = 120, MH = Math.max(T * ROW, 420);
    return { T, ROW, TOP, H, rowY: (i) => TOP + i * ROW, OVX: 330, OVY: TOP + 150, OVW: 300, MX, MY, MW, MH, BOX: 330, TAB: 660, TK: 300, WH: 250 };
  }
  const rowOf = (id) => G.MY + (id / 50257) * G.MH;
  // where each label sits: next to its row, nudged apart so they never overlap (a short leader line joins them)
  function labelYs() { const ids = labeled(), o = ids.map((id, k) => ({ k, y: rowOf(id) })).sort((a, b) => a.y - b.y); for (let i = 1; i < o.length; i++) o[i].y = Math.max(o[i].y, o[i - 1].y + 32); const ys = []; o.forEach((q) => (ys[q.k] = q.y)); return ys; }

  function build() {
    G = geom();
    const { T, ROW, TOP, H } = G, hy = TOP - 30;
    let h = `<div class="fl-scene pk-scene" id="${P}sc" style="width:${SW}px;height:${H}px"><svg class="fl-svg" id="${P}svg" width="${SW}" height="${H}" viewBox="0 0 ${SW} ${H}"></svg>`;
    h += `<div class="fl-h" style="left:18px;top:${hy}px;width:80px">Token</div><div class="fl-h pk-fade" id="${P}hc" style="left:108px;top:${hy}px;width:160px">🪪 Information Card <small>after block 12</small></div>`;
    for (let i = 0; i < T; i++) {
      h += `<div class="tr-c tr-tok ${i === T - 1 ? 'tr-me' : ''}" style="left:18px;top:${G.rowY(i)}px;--c:${i === T - 1 ? '#c2185b' : '#9aa3b2'};width:84px;height:${ROW - 6}px">${esc(C.W[i])}</div>`;
      h += `<canvas class="fl-strip pk-fade" id="${P}c${i}" style="left:108px;top:${G.rowY(i) + 4}px;width:140px;height:${Math.max(8, ROW - 14)}px"></canvas>`;
    }
    h += `<div class="pk-q" id="${P}q" style="left:62px;top:${G.rowY(T)}px">?</div>`;
    // the output vector (it starts as the last card and moves) and the dot-product panel
    h += `<div class="pk-ov" id="${P}ov"><div class="pk-ovl" id="${P}ovl">Output vector for “${esc(C.last)}”</div><canvas class="fl-strip" id="${P}ovc"></canvas></div>`;
    h += `<div class="pk-prod pk-fade" id="${P}prod" style="left:${G.OVX}px;top:${G.OVY + 46}px;width:${G.OVW + 40}px"></div>`;
    // the token vocab matrix
    h += `<div class="fl-h pk-fade" id="${P}mh" style="left:${G.MX}px;top:${hy}px;width:200px">Token vocab matrix</div><canvas class="pk-mx pk-fade" id="${P}mx" style="left:${G.MX}px;top:${G.MY}px;width:${G.MW}px;height:${G.MH}px"></canvas><div class="pk-mxf pk-fade" id="${P}mf" style="left:${G.MX}px;top:${G.MY + G.MH + 6}px">every token’s embedding row: 50,257 rows</div>`;
    const ly = labelYs(); labeled().forEach((id, k) => { h += `<div class="pk-lb pk-fade" id="${P}lb${k}" data-id="${id}" style="left:${G.MX + G.MW + 26}px;top:${ly[k] - 9}px"></div>`; });
    // the "If GPT-2 stopped" box, the ranking table, the Temperature/Top-K table, the wheel
    h += `<div class="tr-box pk-fade" id="${P}box" style="left:${G.BOX}px;top:${TOP - 34}px"></div>`;
    h += `<div class="pk-tab pk-fade" id="${P}tab" style="left:${G.TAB}px;top:${TOP - 40}px"></div>`;
    h += `<div class="pk-tk pk-fade" id="${P}tk" style="left:${G.TK}px;top:${TOP - 40}px"></div>`;
    h += `<div class="pk-wh pk-fade" id="${P}wh" style="left:${G.WH}px;top:${TOP - 50}px"></div><div class="pk-win pk-fade" id="${P}win" style="left:${G.TAB}px;top:${TOP + 352}px"></div>`;
    return h + '</div>';
  }

  // ---------- drawing ----------
  function paintStatic() {
    for (let i = 0; i < C.T; i++) VZ.vec(E('c' + i), C.cards ? C.cards(i) : null);
    // the matrix: a pale picture of 50,257 rows (a stand-in: far too many rows to draw), with the labeled rows drawn from their real embedding rows
    const cv = E('mx'), w = 60, hgt = 220; cv.width = w; cv.height = hgt; const x = cv.getContext('2d'), img = x.createImageData(w, hgt);
    let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
    for (let k = 0; k < w * hgt; k++) { const [r, g, b] = NT.div(rnd() * 0.45); img.data.set([r, g, b, 255], k * 4); }
    x.putImageData(img, 0, 0);
    labeled().forEach((id, k) => { const r = C.rank(id), sc = C.score(id); E('lb' + k).innerHTML = `<b>${id}</b> (${sh(id)})<br><small>score ${sc != null ? sc.toFixed(1) : '—'} · rank ${r ? '#' + int(r) : '—'}</small>`; });
    // the "If GPT-2 stopped" box: after block 12 is GPT-2's actual answer
    const pr = NT.probs(C.d, 1, NT.ALL);
    E('box').innerHTML = `<div class="rk-tt">After block 12, this Information Card for “${esc(C.last)}”…</div>${VZ.vecHTML(P + 'bv', 'rk-vec')}<div class="rk-tt">…ranks these tokens next: <span class="tr-real">real GPT-2</span></div>${VZ.rankTable(pr, NT.ALL, { n: 5, prob: false, more: false })}`;
    VZ.vec(E('bv'), C.cards ? C.cards(C.T - 1) : C.ex && C.ex.final);
    // the dot-product panel (for the stories: the real output vector and embedding row)
    const id = labeled()[0], ex = C.ex, ti = ex && ex.topRows ? ex.topRows.ids.indexOf(id) : -1;
    if (ex && ex.final && ti >= 0) {
      const row = ex.topRows.rows.slice(ti * 768, ti * 768 + 768), prod = Float32Array.from(row, (v, k) => v * ex.final[k]);
      E('prod').innerHTML = `<div class="pk-pl">× “${sh(id)}”’s embedding row (ID ${id})</div><canvas class="fl-strip" id="${P}pr1"></canvas><div class="pk-pl">= the 768 products</div><canvas class="fl-strip" id="${P}pr2"></canvas><div class="pk-sum">add up all 768 products → score <b>${(C.score(id) ?? 0).toFixed(1)}</b></div>`;
      VZ.vec(E('pr1'), row); VZ.vec(E('pr2'), prod);
    } else E('prod').innerHTML = `<div class="pk-pl">× “${sh(id)}”’s embedding row → multiply number by number, add up the 768 products → score <b>${C.score(id) != null ? C.score(id).toFixed(1) : '—'}</b></div>`;
  }
  // the parts that follow Temperature and Top-K
  function paintLive() {
    const bt = pk.beat, step = BEATS[bt][0], K = S.K >= NT.ALL ? NT.ALL : S.K;
    const base = NT.probs(C.d, 1, NT.ALL), pr = NT.probs(C.d, S.T, S.K), vec = C.ex && C.ex.final;
    if (step === 2) E('tab').innerHTML = VZ.rankCard(base, NT.ALL, { n: 10, prob: false, vecId: vec ? P + 'tv' : null, vecTitle: `The output vector for “${esc(C.last)}”…`, title: '…scored against every token’s embedding row (logits):' });
    if (step === 3) E('tk').innerHTML = tkTable(base);
    if (step >= 4) {
      const hit = pk.r == null ? -1 : NT.pickIndex(pr.p, pk.r);
      E('tab').innerHTML = VZ.rankCard(pr, K, { n: 10, hit: pk.spun ? hit : -1, range: step === 5, vecId: vec ? P + 'tv' : null, vecTitle: `The output vector for “${esc(C.last)}”…`, title: `Next-token ranking · Temperature ${S.T <= 1 ? S.T.toFixed(1) : S.T} · Top-K ${NT.kLabel(S.K)}` });
    }
    if (vec && E('tv')) VZ.vec(E('tv'), vec);
    if (step >= 4) wheel(pr, pk.spinning && pk.fresh); pk.fresh = false;
    presetBar();
  }
  // Temperature & Top-K, still on the scores: # · Token ID · Token · Logit · Logit ÷ T · how far behind #1 · allowed?
  function tkTable(base) {
    const T = S.T, K = S.K >= NT.ALL ? NT.ALL : S.K, n = Math.min(12, base.K), top = base.logits[0] / T;
    const focus = BEATS[pk.beat][1];
    let rows = '';
    for (let i = 0; i < n; i++) {
      const ok = i < K, z = base.logits[i] / T, gap = top - z, w = Math.min(100, (gap / 5) * 100);
      rows += `<tr class="${ok ? '' : 'out'}"><td>${i + 1}</td><td class="tid">${base.ids[i]}</td><td class="w">${NT.show(tt(base.ids[i]))}</td><td>${base.logits[i].toFixed(1)}</td>
        <td class="${focus === 'temp' ? 'pk-hl' : ''}">${ok ? z.toFixed(1) : '—'}</td><td class="pk-gapc">${ok ? `<span class="pk-gap"><i style="width:${w.toFixed(0)}%"></i></span> ${i ? '−' + gap.toFixed(1) : 'leader'}` : ''}</td>
        <td class="${focus === 'topk' ? 'pk-hl' : ''}">${ok ? '✓ allowed' : 'not allowed'}</td></tr>`;
    }
    const more = base.K - n;
    return `<div class="rk-card"><div class="rk-tt">Scores before they become probabilities · Temperature ${T <= 1 ? T.toFixed(1) : T} · Top-K ${NT.kLabel(S.K)}</div>
      <table class="gt rk pk-tkt"><tr><th>#</th><th>Token ID</th><th>Token</th><th>Logit</th><th>Logit ÷ T</th><th>Behind #1</th><th>Top-K</th></tr>${rows}
      <tr class="rk-more"><td colspan="7" class="muted">… ${int(more)} more tokens${K < NT.ALL ? `: ${K <= n ? 'none of them' : int(K - n) + ' of them'} allowed` : ', all allowed'}</td></tr></table>
      <div class="pk-tknote">The bar shows how far each allowed score is behind #1 after dividing by T. ${T < 1 ? 'At this low Temperature the gaps are stretched: the leader is far ahead.' : T > 1 ? 'At this high Temperature the gaps are squeezed: the scores bunch together.' : 'At Temperature 1 the scores are unchanged.'}</div></div>`;
  }
  function wheel(pr, spin) {
    const box = E('wh'); if (!box) return;
    const step = BEATS[pk.beat][0], hit = pk.r == null ? -1 : NT.pickIndex(pr.p, pk.r), key = pk.r;
    VZ.wheel(box, { pr, K: S.K, r: step === 5 ? pk.r : null, hit, needle: step === 5, spin, dur: 2200, idp: P + 'w', size: 330, button: step === 5,
      onSpin: () => { pause(); pk.r = Math.random(); pk.spun = false; pk.spinning = true; pk.fresh = true; paintLive(); winBox(); },
      stillHere: () => S.station === 'pkscene' && pk.r === key, done: () => { if (S.station !== 'pkscene' || pk.r !== key) return; pk.spinning = false; pk.spun = true; paintLive(); winBox(); } });
  }
  function winBox() {
    const w = E('win'); if (!w) return;
    const pr = NT.probs(C.d, S.T, S.K), K = S.K >= NT.ALL ? NT.ALL : S.K;
    if (pk.r == null || !pk.spun) { w.innerHTML = pk.r == null && pk.added ? `<div class="pk-note">The sentence is one token longer, so GPT-2 ran the whole process again for the new last token. Spin again, or watch GPT-2 keep going in Whole Process.</div>` : ''; return; }
    const hit = NT.pickIndex(pr.p, pk.r), id = pr.ids[hit], bd = NT.BANDS[NT.rankBand(hit + 1, K)];
    w.innerHTML = `<div class="winner" style="--bg:${bd.bg};--fg:${bd.fg}"><div><div class="muted">r = ${pk.r.toFixed(3)} landed in</div><div class="wt">“${sh(id)}”</div><div class="muted">#${int(hit + 1)} on the list · ${cp(pr.p[hit])}</div></div>
      <div class="wbtns"><button class="btn primary" id="pkAdd">Add “${sh(id)}” and keep going</button>${pk.added ? '<button class="btn" id="pkWhole">Whole Process ›</button>' : ''}</div></div>`;
    $('#pkAdd').onclick = () => addToken(id, { rank: hit + 1, K, p: pr.p[hit], T: S.T });
    if ($('#pkWhole')) $('#pkWhole').onclick = () => NT.goTab('whole');
  }
  // the winner flies up into the sentence, then joins it
  function addToken(id, info) {
    const from = st().querySelector('.pk-tab tr.hit') || E('wh'), to = $('#sentWrap');
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), bd = NT.BANDS[NT.rankBand(info.rank, info.K)];
    const fly = document.createElement('div'); fly.className = 'pk-fly'; fly.textContent = tt(id).trim(); fly.style.cssText = `left:${a.left + 20}px;top:${a.top}px;background:${bd.bg};color:${bd.fg}`;
    document.body.appendChild(fly);
    requestAnimationFrame(() => { fly.style.transform = `translate(${b.right - 120 - a.left}px,${b.top + 12 - a.top}px)`; });
    setTimeout(() => { fly.remove(); pk.added++; pk.r = null; pk.spun = false; NT.setText(NT.current().text + tt(id), 'append', NT.makeMark(info)); }, 900);
  }

  // ---------- which parts show at each beat ----------
  function show() {
    const bt = pk.beat, step = BEATS[bt][0], o = {};
    const on = (id, v = 1) => (o[id] = v);
    for (let i = 0; i < C.T; i++) on('c' + i, bt === B.start ? 1 : i === C.T - 1 && bt === B.focus ? 1 : bt === B.focus ? 0.12 : 0);
    on('hc', bt <= B.focus ? 1 : 0);
    on('box', bt === B.start ? 1 : 0);
    on('prod', bt === B.one ? 1 : 0);
    ['mh', 'mx', 'mf'].forEach((k) => on(k, step === 2 && bt < B.rank ? 1 : 0));
    labeled().forEach((_, k) => on('lb' + k, step === 2 && bt < B.rank && (k === 0 || bt >= B.five) ? 1 : 0));
    on('tab', bt === B.rank || step >= 4 ? 1 : 0); on('tk', step === 3 ? 1 : 0); on('wh', step >= 4 ? 1 : 0); on('win', step === 5 ? 1 : 0);
    on('q', bt >= B.out ? 1 : 0);
    Object.entries(o).forEach(([id, v]) => { const el = E(id); if (el) el.style.opacity = v; });
    // the output vector: sits on the last card at first; at "out" it moves over and up; from "rank" on, the table carries its own copy
    const ov = E('ov'), last = G.rowY(C.T - 1) + 4;
    const atCard = { left: 108, top: last, width: 140, h: Math.max(8, G.ROW - 14) }, atOut = { left: G.OVX, top: G.OVY, width: G.OVW, h: 24 };
    const p = bt < B.out ? atCard : atOut;
    Object.assign(ov.style, { left: p.left + 'px', top: p.top + 'px', width: p.width + 'px', opacity: bt < B.out || bt >= B.rank ? 0 : 1 });
    E('ovc').style.height = p.h + 'px'; E('ovl').style.opacity = bt >= B.out ? 1 : 0;
    VZ.vec(E('ovc'), bt >= B.out && C.ex && C.ex.final ? C.ex.final : C.cards ? C.cards(C.T - 1) : C.ex && C.ex.final);
    lines();
  }
  function lines() {
    const svg = E('svg'); if (!svg) return; const bt = pk.beat, step = BEATS[bt][0];
    let g = '';
    const lastY = G.rowY(C.T - 1) + G.ROW / 2 - 3;
    if (bt === B.start) g += `<rect x="104" y="${G.rowY(C.T - 1)}" width="148" height="${G.ROW - 6}" rx="4" fill="none" stroke="#5b38d1" stroke-width="2.5"/><path d="M254 ${lastY} C ${G.BOX - 50} ${lastY}, ${G.BOX - 60} ${G.TOP + 60}, ${G.BOX - 6} ${G.TOP + 40}" fill="none" stroke="#5b38d1" stroke-width="2" marker-end="url(#${P}ar)"/>`;
    if (step === 2 && bt < B.rank) {
      const x0 = G.OVX + G.OVW + 4, y0 = G.OVY + 12;
      if (bt === B.all) { let s = 3; for (let k = 0; k < 70; k++) { s = (s * 16807) % 2147483647; const y = G.MY + (s / 2147483647) * G.MH; g += `<line x1="${x0}" y1="${y0}" x2="${G.MX}" y2="${y.toFixed(1)}" stroke="#b6bfcc" stroke-width=".7" opacity=".8"/>`; } }
      labeled().forEach((id, k) => {
        if (k > 0 && bt < B.five) return;
        const r = C.rank(id), band = r ? NT.rankBand(r, NT.ALL) : 4, y = rowOf(id);
        g += `<line x1="${x0}" y1="${y0}" x2="${G.MX}" y2="${y.toFixed(1)}" stroke="${VZ.LINECOL[Math.min(4, band)]}" stroke-width="${[4, 3, 2.2, 1.6, 1.2][Math.min(4, band)]}"/>`;
        g += `<rect x="${G.MX - 1}" y="${(y - 2).toFixed(1)}" width="${G.MW + 2}" height="4" fill="none" stroke="#5b38d1" stroke-width="1.2"/><path d="M${G.MX + G.MW + 1} ${y.toFixed(1)} L${G.MX + G.MW + 10} ${y.toFixed(1)} L${G.MX + G.MW + 22} ${labelYs()[k].toFixed(1)}" fill="none" stroke="#5b38d1"/>`;
      });
    }
    if (bt >= B.rank) { // the "?" row asks: which token goes here?
      const qx = 92, qy = G.rowY(C.T) + 12, tx = step === 3 ? G.TK - 8 : G.TAB - 8, ty = step >= 4 ? G.TOP + 300 : G.TOP + 120; // under the wheel when it's there
      const c1 = step >= 4 ? `${qx + 260} ${qy + 10}, ${tx - 80} ${ty + 30}` : `${qx + 160} ${qy}, ${tx - 140} ${ty}`;
      g += `<path d="M${qx} ${qy} C ${c1}, ${tx} ${ty}" fill="none" stroke="#5b38d1" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#${P}ar)"/><text x="${qx + 6}" y="${qy + 26}" font-size="13" font-weight="700" fill="#5b38d1">which token goes here?</text>`;
    }
    svg.innerHTML = `<defs><marker id="${P}ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#5b38d1"/></marker></defs>` + g;
  }

  // ---------- the page ----------
  NT.stations.pkscene = {
    async init() {
      pause(); presetBar();
      st().innerHTML = `<section class="panel tr-panel"><div class="tr-head"><div class="fl-ctl"><button class="btn" id="pkRew" title="Start over">⏮</button><button class="btn" id="pkBack">◀ Back</button><button class="btn primary" id="pkNext">Next ▶</button><button class="btn" id="pkPlay">▶ Play</button></div></div>
        <div class="fl-cap fixed" id="pkCap"></div><div class="fl-box" id="pkBox"></div>
        <div class="tr-legend">All numbers are real GPT-2: the Information Cards, the output vector, every score, probability and pick. The token vocab matrix is drawn as a pale stand-in: its 50,257 rows are far too many to show.</div></section>`;
      NT.guideRow(st().querySelector('.tr-panel'));
      $('#pkRew').onclick = () => { pause(); go(0); };
      $('#pkBack').onclick = () => { pause(); if (pk.beat > 0) go(pk.beat - 1); };
      $('#pkNext').onclick = () => { pause(); next(); };
      $('#pkPlay').onclick = () => (pk.playing ? pause() : play());
      if (!(await load())) return;
      if (S.station !== 'pkscene') return;
      rebuild();
    },
    onText(how) { C = null; if (how !== 'append') { pk.added = 0; pk.beat = 0; } pk.r = null; pk.spun = false; NT.stations.pkscene.init(); },
    onTK() { if (!C || !E('sc')) return; if (BEATS[pk.beat][0] === 5) { pk.r = null; pk.spun = false; pk.spinning = false; winBox(); } paintLive(); cap(); },
  };
  function rebuild() {
    const box = $('#pkBox'); if (!box) return;
    box.innerHTML = build(); paintStatic(); fit();
    go(pk.beat, true);
  }
  function fit() { const box = $('#pkBox'), sc = E('sc'); if (!box || !sc) return; const top = box.getBoundingClientRect().top + window.scrollY, avail = window.innerHeight - top - 10; // fit the width and the height left on screen
    const k = Math.max(0.5, Math.min(1.25, box.clientWidth / SW, avail > 250 ? avail / G.H : 9)); sc.style.transform = `translate(${Math.max(0, (box.clientWidth - SW * k) / 2)}px,0) scale(${k})`; box.style.height = Math.ceil(G.H * k) + 'px'; }
  window.addEventListener('resize', () => { if (S.station === 'pkscene' && G) fit(); });
  function cap() {
    const id = labeled()[0], sc = C.score(id);
    const fill = (t) => t.replace(/\{last\}/g, esc(C.last)).replace('{t1}', sh(id)).replace('{s1}', sc != null ? sc.toFixed(1) : '—').replace('{auto}', pk.autoK ? ' (Top-K was All; it’s set to 10 here so the wheel stays readable.)' : '');
    $('#pkCap').innerHTML = `<div class="fl-ch"><b>${fill(BEATS[pk.beat][2])}</b></div><div class="fl-cd">${fill(BEATS[pk.beat][3])}</div>`;
  }
  function go(bt) {
    pk.beat = bt; const step = BEATS[bt][0];
    if (bt === B.topk && S.K >= NT.ALL && !pk.autoK) { pk.autoK = true; NT.setTK(null, 10); } // the first time: Top-K 10, as in Whole Process
    if (step < 5) { pk.r = null; pk.spun = false; pk.spinning = false; }
    if (!E('sc')) return;
    show(); paintLive(); winBox(); cap();
    if (bt === B.soft) E('wh').querySelectorAll('svg path, svg circle:not([r="7"])').forEach((el, i) => { el.classList.add('pk-slice'); el.style.animationDelay = (i * 0.12).toFixed(2) + 's'; }); // the slices appear one by one, biggest first
    const subs = $('#subtabs');
    if (subs) {
      subs.innerHTML = STEPS.map(([s, l]) => `<button class="sub ${s === step ? 'on' : s < step ? 'done' : ''}" data-s="${s}" aria-pressed="${s === step}">${l}</button>`).join('');
      subs.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { pause(); go(BEATS.findIndex(([s]) => s === +b.dataset.s)); }));
    }
    if (step !== 1) NT.setWho(false); NT.whoToggle(); // "On this page" folds away after the first step, to save room
    $('#pkBack').disabled = bt === 0; $('#pkNext').disabled = bt === BEATS.length - 1;
    NT.setStatus(`Step ${step} of 5 · ${STEPS[step - 1][1]}`);
  }
  function next() { if (pk.beat < BEATS.length - 1) { go(pk.beat + 1); return true; } return false; }
  function play() { pk.playing = true; syncPlay(); const tick = () => { pk.timer = setTimeout(() => { if (!pk.playing || S.station !== 'pkscene') return; if (next()) tick(); else pause(); }, 3200); }; tick(); }
  function pause() { pk.playing = false; clearTimeout(pk.timer); syncPlay(); }
  function syncPlay() { const p = $('#pkPlay'); if (p) p.textContent = pk.playing ? '⏸ Pause' : '▶ Play'; }
})();
