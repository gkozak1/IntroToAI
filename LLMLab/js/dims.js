/* LLMLab — Embeddings, "Many dimensions": from 3 numbers per word to GPT-2's 768 */
'use strict';
(() => {
  const { $, esc } = NT;
  const LEVELS = [3, 6, 12, 25, 50, 100, 200, 400, 768];
  const WORDS = ['man', 'woman', 'boy', 'girl', 'king', 'queen', 'prince', 'princess'];
  const PRESETS = [['man', 'king', 'woman', 'queen'], ['boy', 'prince', 'girl', 'princess'], ['man', 'prince', 'woman', 'princess']];
  const D = { lvl: 0, seed: 7, pre: 0, rows: null, tok: 0, tmr: null };
  const tid = (w) => NT.encode(' ' + w)[0];
  const rng = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function columns(d) {
    const r = rng(D.seed), p = Array.from({ length: 768 }, (_, i) => i);
    for (let i = 767; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    return p.slice(0, d).sort((a, b) => a - b);
  }
  const sub = (v, cols) => Float32Array.from(cols, (c) => v[c]);
  const cellsHTML = (v) => `<span class="cells">${v.map((x) => `<i style="background:rgb(${NT.div(x).map((y) => y | 0).join(',')})"></i>`).join('')}</span>`;

  async function rank(vec, cols, skip) {
    const e = await NT.embData(), n = NT.vocabSize, d = cols.length, sc = e.scales, pk = e.packed;
    let vn = 0; for (let k = 0; k < d; k++) vn += vec[k] * vec[k]; vn = Math.sqrt(vn) || 1;
    const cos = new Float32Array(n);
    for (let id = 0; id < n; id++) {
      const o = id * 384; let dot = 0, nn = 0;
      for (let k = 0; k < d; k++) { const c = cols[k], b = pk[o + (c >> 1)], q = (c & 1 ? b & 15 : b >> 4) - 8; dot += q * vec[k]; nn += q * q; }
      cos[id] = nn ? dot / (Math.sqrt(nn) * vn) : -1;
    }
    for (const s of skip) cos[s] = -2;
    return cos;
  }

  async function update() {
    D.last = null; const tk = ++D.tok, d = LEVELS[D.lvl], cols = columns(d), [a, b, c, ex] = PRESETS[D.pre];
    $('#dimVal').textContent = `${d} of 768`;
    const ids = Object.fromEntries(WORDS.map((w) => [w, tid(w)]));
    const rows = Object.fromEntries(await Promise.all(WORDS.map(async (w) => [w, await NT.row(ids[w])])));
    if (tk !== D.tok) return;
    const wide = (w) => `<div class="dimrow"><span class="who">${esc(w)}</span>${cellsHTML(NT.meaning.CLASSROOM[w])}<canvas class="strip" data-w="${w}"></canvas></div>`;
    $('#dimRows').innerHTML = `<div class="dimhead"><span></span><span>3 qualities</span><span>${d} of GPT-2’s 768 numbers</span></div>` + WORDS.map(wide).join('');
    $('#dimRows').querySelectorAll('canvas[data-w]').forEach((cv) => NT.drawStrip(cv, sub(rows[cv.dataset.w], cols), 0.3));
    // analogy
    const v = Float32Array.from(cols, (cc) => rows[b][cc] - rows[a][cc] + rows[c][cc]);
    const rowHTML = (lbl, id) => `<div class="anarow"><span class="who">${lbl}</span><canvas class="strip" id="${id}"></canvas></div>`;
    $('#dimAna').innerHTML = `<div class="h"><select id="dimPre">${PRESETS.map((p, i) => `<option value="${i}" ${i === D.pre ? 'selected' : ''}>${p[0]} : ${p[1]} :: ${p[2]} : ?</option>`).join('')}</select></div>` +
      rowHTML(b, 'aB') + rowHTML('− ' + a, 'aA') + rowHTML('+ ' + c, 'aC') + rowHTML('= result', 'aR') + rowHTML(ex, 'aX') +
      `<div id="dimRank" class="rankbox"><span class="muted">ranking all 50,257 tokens…</span></div>`;
    [['aB', rows[b]], ['aA', rows[a]], ['aC', rows[c]], ['aX', rows[ex]]].forEach(([i, r]) => NT.drawStrip($('#' + i), sub(r, cols), 0.3));
    NT.drawStrip($('#aR'), v, 0.3);
    $('#dimPre').onchange = (e) => { D.pre = +e.target.value; update(); };
    NT.setStatus(`${d} of GPT-2’s 768 numbers per word`);
    await new Promise((r) => setTimeout(r, 30)); if (tk !== D.tok || !$('#dimRank')) return;
    const cos = await rank(v, cols, [ids[a], ids[b], ids[c]]); if (tk !== D.tok || !$('#dimRank')) return;
    const exId = ids[ex], mine = cos[exId]; let better = 0; for (let i = 0; i < cos.length; i++) if (cos[i] > mine) better++;
    const order = Array.from(cos.keys()).sort((x, y) => cos[y] - cos[x]).filter((id) => !NT.tokText(id).includes('\ufffd')).slice(0, 5);
    const e4 = await NT.embData(), sc = e4.scales[exId], o = exId * 384;
    const exRow = Float32Array.from(cols, (cc) => { const bb = e4.packed[o + (cc >> 1)]; return ((cc & 1 ? bb & 15 : bb >> 4) - 8) * sc; });
    if (tk !== D.tok) return;
    D.last = { d, cols, a, b, c, ex, v, exRow, better, cos: mine };
    $('#dimRank').innerHTML = `<div><span class="rankbig">${esc(ex)} is #${NT.int(better + 1)}</span> of 50,257 tokens</div><table class="t"><tr><th>closest</th><th>match</th></tr>${order.map((id) => `<tr><td class="tokc" style="${id === exId ? 'color:#4528b3;font-weight:700' : ''}">${esc(NT.tokText(id))}</td><td>${cos[id].toFixed(2)}</td></tr>`).join('')}</table>`;
    $('#dimRank').querySelectorAll('th:last-child,td:last-child').forEach((x) => (x.style.textAlign = 'right'));
    NT.numbersRefresh();
  }

  NT.dims = {
    init(tools, stage) {
      tools.innerHTML = `<label class="ctl">Numbers per word <input type="range" id="dimS" min="0" max="${LEVELS.length - 1}" step="1" value="${D.lvl}"/><span class="v" id="dimVal"></span></label><button class="btn ghost" id="dimSh">Different columns</button>`;
      stage.innerHTML = `<div class="dimgrid"><div class="panel" id="dimRows"></div><div class="panel" id="dimAna"></div></div>`;
      $('#dimS').oninput = (e) => { D.lvl = +e.target.value; $('#dimVal').textContent = `${LEVELS[D.lvl]} of 768`; clearTimeout(D.tmr); D.tmr = setTimeout(update, 120); };
      $('#dimSh').onclick = () => { D.seed = (D.seed * 31 + 11) % 100003; update(); };
      update();
    },
  };

  // numbers panel: the match score (cosine) behind "#N of 50,257", worked out for the expected word
  NT.dims.numbers = () => {
    const L = D.last; if (!L) return null;
    const F = NT.nf, v = L.v, r = L.exRow, n = L.d;
    let dot = 0, vn = 0, rn = 0; for (let k = 0; k < n; k++) { dot += v[k] * r[k]; vn += v[k] * v[k]; rn += r[k] * r[k]; }
    vn = Math.sqrt(vn); rn = Math.sqrt(rn);
    const t3 = [0, 1, 2].filter((k) => k < n).map((k) => `${F.f(v[k])} × ${F.f(r[k])} = ${F.f(v[k] * r[k], 4)}`);
    const rows = [F.formula(`match = ( result · ${esc(L.ex)} ) ÷ ( |result| × |${esc(L.ex)}| )`)];
    rows.push(F.eq(`using ${n} of GPT-2’s 768 numbers\nresult · ${esc(L.ex)}  =  ${t3.join('  +  ')}${n > 3 ? '  + … ' + (n - 3) + ' more terms' : ''}  =  ${F.f(dot, 3)}\n|result| = ${F.f(vn, 3)}    |${esc(L.ex)}| = ${F.f(rn, 3)}\nmatch = ${F.f(dot, 3)} ÷ ( ${F.f(vn, 3)} × ${F.f(rn, 3)} ) = <b>${F.f(dot / (vn * rn), 2)}</b>`));
    rows.push(`<div class="nnote">A match of 1 means the same direction; 0 means unrelated. ${esc(L.ex)} is #${NT.int(L.better + 1)} of 50,257: ${NT.int(L.better)} ${L.better === 1 ? 'token has' : 'tokens have'} a bigger match.</div>`);
    return F.box('The numbers · how close is the answer', rows);
  };
})();
