/* LLM Lab — Input: the Whole Process's first steps, slowed down and made hands-on.
   NT.numScene(host, mode, opts) draws the flow's table (token · ID · embedding vector …) with the same look as Whole Process › Animated flow:
     mode 'ids'  (Token IDs):        the sentence → tokens → one row per token → IDs, then look up each ID's embedding vector in the
                                     embedding matrix (click a row, "Look up next ID's embedding vector", or "Look up all token IDs");
                                     each vector arrives with its first 10 element values.
     mode 'pos'  (Token + position): every token already has its embedding vector; add each token's position vector
                                     (double-click a row, "Get the next position vector", "Get all position vectors") to get its input vector;
                                     a panel under the scene adds the first 10 elements, number by number.
     mode 'all'  (Put it together):  all of it in order, with ⏮ ◀ Next ▶ Play.
   Real GPT-2 numbers throughout: embedding rows (exact for the stored sentences), position rows (the first 64, exact). */
'use strict';
(() => {
  const { $, esc } = NT;
  const VZ = NT.viz;
  const W0 = 1200, X0 = { tok: 20, id: 140, emb: 215, vals: 404, plus: 392, pos: 410, eq: 588, inp: 605, mat: 1010 };
  const STRIPW = 170, CELL = 50, NV = 10, MAXT = 32;
  const SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3]; let speedIx = 2, SEQ = 0;
  const LIVE = new Set();
  NT.onPredict(() => LIVE.forEach((x) => { if (x.alive() && x.recap) x.recap(); })); // the Predict first switch changes the opening caption of Token + position
  const minus = (v, d = 3) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  // one element's color: the same rule as the vector strips (sign · square root, shared scale)
  const cellCol = (v, m) => { const t = v / m, u = Math.sign(t) * Math.sqrt(Math.min(1, Math.abs(t))), [r, g, b] = NT.div(u); return { bg: `rgb(${r | 0},${g | 0},${b | 0})`, fg: Math.abs(u) > 0.72 ? '#fff' : '#1d2634' }; };
  const cellsHTML = (vals, m, n = NV, more = true) => `${Array.from(vals.slice(0, n), (v) => { const c = cellCol(v, m); return `<i style="background:${c.bg};color:${c.fg}">${minus(v)}</i>`; }).join('')}${more ? `<span class="nv-more">… ${vals.length - n} more</span>` : ''}`;

  NT.numScene = (host, mode, opts = {}) => {
    const P = 'n' + ++SEQ + '_', E = (id) => document.getElementById(P + id);
    // Token + position has no element-values column, so its scene is narrower (and drawn bigger)
    const W = mode === 'pos' ? 990 : W0, X = Object.assign({}, X0, { mat: mode === 'pos' ? 812 : X0.mat });
    const N = { stage: mode === 'pos' ? 3 : 0, emb: [], pos: [], k: 0, playing: false, timer: null, queue: [], sel: -1, data: null, busy: false };
    let G = null;
    const eff = () => SPEEDS[speedIx] * (opts.speedMul || 1), ms = (b) => Math.round(b / eff());
    const alive = () => host.isConnected;
    // ---------- data ----------
    async function load() {
      const cur = NT.current(), T = Math.min(cur.ids.length, MAXT, NT.maxPos), ex = cur.ex;
      const tok = []; for (let i = 0; i < T; i++) tok.push(ex && ex.tok ? ex.tok.slice(i * 768, i * 768 + 768) : await NT.row(cur.ids[i]).catch(() => new Float32Array(768)));
      const pos = []; for (let i = 0; i < T; i++) pos.push(NT.posRow(i));
      const all = [...tok, ...pos].map(VZ.p98).sort((a, b) => a - b), scale = all[Math.floor(all.length / 2)] || 1; // one color scale for every embedding, position and input vector (as in the flow)
      const exact = cur.ids.slice(0, T).every((id, i) => (ex && ex.tok) || NT.isExact(id));
      return { cur, T, cut: cur.ids.length > T, ids: cur.ids.slice(0, T), raw: cur.tokens.slice(0, T).map((t) => t.replace(/\n/g, '⏎')), tok, pos, inp: tok.map((v, i) => Float32Array.from(v, (x, e) => x + pos[i][e])), scale, exact };
    }
    // the steps of Put it together: 0–3 the sentence → IDs, then one embedding lookup per token, one position per token, then the input vectors
    const stepsAll = () => 4 + 2 * N.data.T + 1;
    function stateAt(k) { const T = N.data.T, st = { stage: Math.min(k, 3), emb: [], pos: [], done: k >= 4 + 2 * T }; for (let i = 0; i < T; i++) { if (k >= 4 + i) st.emb.push(i); if (k >= 4 + T + i) st.pos.push(i); } return st; }
    const phaseC = () => mode === 'pos' || N.pos.length > 0 || (mode === 'all' && N.k >= 4 + N.data.T);

    // ---------- the scene ----------
    function build() {
      const D = N.data, T = D.T, ROW = mode === 'pos' ? (T <= 13 ? 24 : T <= 18 ? 20 : T <= 26 ? 16 : 13) : T <= 13 ? 28 : T <= 18 ? 23 : T <= 26 ? 18 : 15, top = mode === 'pos' ? 48 : 92, H = Math.max(top + (T + 1) * ROW + 40, 470);
      G = { ROW, top, H, T, NPOS: Math.min(NT.maxPos, Math.max(T + 4, 24)) };
      const cv = document.createElement('canvas').getContext('2d'); let fs = 26; cv.font = `${fs}px Georgia`;
      const meas = () => D.raw.map((w) => cv.measureText(w).width);
      let widths = meas(), total = widths.reduce((a, b) => a + b, 0) + T * 8;
      if (total > W - 60) { fs = Math.max(11, Math.floor(fs * (W - 60) / total)); cv.font = `${fs}px Georgia`; widths = meas(); }
      let x = 30; G.sx = widths.map((w) => { const a = x; x += w + 8; return a; }); G.fs = fs; G.cs = Math.min(1, 17 / fs) * (ROW < 24 ? 0.8 : 1);
      const sh = Math.max(6, ROW - 10), vfs = Math.max(8, Math.min(11, ROW * 0.42));
      let h = `<div class="fl-scene nv-scene" id="${P}sc" style="width:${W}px;height:${H}px"><svg class="fl-svg" id="${P}svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"></svg>`;
      [['tok', X.tok, 'Token'], ['id', X.id, 'Token ID'], ['emb', X.emb, 'Embedding vector'], ['vals', X.vals, 'Element values (the first 10 of 768)'], ['pos', X.pos, 'Position vector'], ['inp', X.inp, 'Input vector']].forEach(([k, hx, t]) => (h += `<div class="fl-h" id="${P}h-${k}" style="left:${hx}px;top:${top - 34}px">${t}</div>`));
      const sp = (w) => esc(w).replace(/^ /, '<span class="sp">·</span>');
      for (let i = 0; i < T; i++) {
        { const TM = NT.tokMarks(D.raw.map((w) => w.trim())), sup = TM.label[i].slice(D.raw[i].trim().length); h += `<div class="fl-tok${i === T - 1 ? ' last' : ''}" id="${P}t${i}" style="font-size:${fs}px;--c:${TM.col[i]}">${sp(D.raw[i])}${sup ? `<span class="tsup">${sup}</span>` : ''}</div>`; }
        if (i) h += `<div class="fl-div" id="${P}d${i}" style="left:${G.sx[i] - 4}px;top:10px;height:${fs + 10}px"></div>`;
        h += `<div class="fl-id" id="${P}i${i}">${D.ids[i]}</div>`;
        ['e', 'p', 'n'].forEach((c) => (h += `<canvas class="fl-strip" id="${P}${c}${i}" style="width:${STRIPW}px;height:${sh}px"></canvas>`));
        h += `<div class="nv-vals" id="${P}v${i}" style="font-size:${vfs}px;height:${sh}px">${cellsHTML(D.tok[i], D.scale)}</div>`;
        h += `<div class="fl-op" id="${P}pl${i}">+</div><div class="fl-op" id="${P}eq${i}">=</div>`;
      }
      const mat = (id, title, sub) => `<div class="fl-mat" id="${P}${id}"><div class="fl-mtitle">${title}</div><canvas id="${P}${id}c"></canvas><div class="fl-ml"><small>${sub}</small></div></div>`;
      h += mat('mE', 'Embedding matrix', '50,257 rows, one per token: row number = token ID') + mat('mP', 'Position matrix', `the first ${G.NPOS} of its 1,024 rows: row number = place in the text`);
      h += `<div class="nv-hit" id="${P}hit"></div></div>`;
      return h;
    }
    const matH = () => G.H - G.top - 70;
    const embY = (id) => G.top + (id / 50257) * matH();
    const posY = (i) => G.top + ((i + 0.5) / G.NPOS) * matH();
    const rowY = (i) => G.top + i * G.ROW;
    const paintRow = (x, y, h, vals, m) => { const img = x.createImageData(120, 1); for (let k = 0; k < 120; k++) { let s = 0; const a = Math.floor(k * 6.4), b = Math.floor((k + 1) * 6.4); for (let e = a; e < b; e++) s += vals[e]; const t = s / (b - a) / m, [r, g, bb] = NT.div(Math.sign(t) * Math.sqrt(Math.min(1, Math.abs(t)))); img.data.set([r, g, bb, 255], k * 4); } for (let yy = 0; yy < h; yy++) x.putImageData(img, 0, Math.round(y) + yy); };
    function paintMats() {
      const D = N.data, h = Math.max(60, Math.round(matH()));
      { const c = E('mEc'); c.width = 120; c.height = h; const x = c.getContext('2d'); let seed = 50257; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
        for (let y = 0; y < h; y += 2) for (let k = 0; k < 120; k += 3) { const [r, g, b] = NT.div((rnd() - 0.5) * 1.6); x.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},.45)`; x.fillRect(k, y, 3, 1); }
        D.ids.forEach((id, i) => paintRow(x, (id / 50257) * h - 2, 4, D.tok[i], D.scale)); }
      { const c = E('mPc'); c.width = 120; c.height = h; const x = c.getContext('2d'), step = h / G.NPOS;
        for (let r = 0; r < G.NPOS; r++) paintRow(x, r * step, Math.max(1, Math.round(step) - 1), NT.posRow(r), D.scale); }
      for (let i = 0; i < D.T; i++) { VZ.vec(E('e' + i), D.tok[i], D.scale); VZ.vec(E('p' + i), D.pos[i], D.scale); VZ.vec(E('n' + i), D.inp[i], D.scale); }
    }
    // where everything sits for a state; act: the row being animated ({kind:'emb'|'pos', i})
    function layout(s, act) {
      const D = N.data, T = D.T, L = {}, C = s.pos.length > 0 || mode === 'pos' || s.phaseC;
      const set = (id, o) => (L[id] = Object.assign({ x: 0, y: 0, s: 1, o: 1 }, o));
      const eSet = new Set(mode === 'pos' || C ? D.ids.map((_, i) => i) : s.emb), pSet = new Set(s.pos);
      for (let i = 0; i < T; i++) {
        const y = rowY(i), inSent = s.stage <= 1;
        set('t' + i, inSent ? { x: G.sx[i], y: 14 } : { x: X.tok, y: y - 4, s: G.cs });
        if (i) set('d' + i, { o: s.stage === 1 ? 1 : 0 });
        set('i' + i, { x: X.id, y, o: s.stage >= 3 ? 1 : 0 });
        const fromE = { x: X.mat + 20, y: embY(D.ids[i]) - 4, s: 120 / STRIPW };
        set('e' + i, eSet.has(i) ? { x: X.emb, y, from: act && act.kind === 'emb' && act.i === i ? fromE : null } : Object.assign({}, fromE, { o: 0 }));
        set('v' + i, { x: X.vals, y, o: !C && eSet.has(i) ? 1 : 0, delay: act && act.kind === 'emb' && act.i === i ? 'late' : null });
        const fromP = { x: X.mat + 20, y: posY(i) - 4, s: 120 / STRIPW };
        set('p' + i, pSet.has(i) ? { x: X.pos, y, from: act && act.kind === 'pos' && act.i === i ? fromP : null } : Object.assign({}, fromP, { o: 0 }));
        const lateP = act && act.kind === 'pos' && act.i === i ? 'late' : null;
        set('pl' + i, { x: X.plus, y: y - 6, o: pSet.has(i) ? 1 : 0 }); set('eq' + i, { x: X.eq - 4, y: y - 6, o: pSet.has(i) ? 1 : 0, delay: lateP });
        set('n' + i, { x: X.inp, y, o: pSet.has(i) ? 1 : 0, delay: lateP });
      }
      set('h-tok', { o: s.stage >= 2 ? 1 : 0 }); set('h-id', { o: s.stage >= 3 ? 1 : 0 });
      set('h-emb', { o: eSet.size ? 1 : 0 }); set('h-vals', { o: !C && eSet.size ? 1 : 0 }); set('h-pos', { o: C ? 1 : 0 }); set('h-inp', { o: C && pSet.size ? 1 : 0 });
      set('mE', { x: X.mat, y: G.top, o: s.stage >= 3 && !C ? 1 : 0 }); set('mP', { x: X.mat, y: G.top, o: C ? 1 : 0 });
      return L;
    }
    function apply(L, dur) {
      Object.entries(L).forEach(([id, p]) => {
        const el = E(id); if (!el) return;
        const late = p.delay === 'late' && dur ? Math.round(dur * 0.85) : 0;
        const put = (q, d) => { el.style.transition = d ? `transform ${d}ms cubic-bezier(.45,.05,.25,1), opacity ${Math.round(d * 0.6)}ms ${late}ms` : 'none'; el.style.transform = `translate(${q.x}px,${q.y}px) scale(${q.s == null ? 1 : q.s})`; el.style.opacity = q.o == null ? 1 : q.o; };
        if (p.from && dur) { put(Object.assign({}, p.from, { o: 1 }), 0); void el.offsetWidth; requestAnimationFrame(() => put(p, dur)); } else put(p, dur);
      });
    }
    // the highlighted matrix row and the line from it to the token's row (only for the row being looked up)
    function overlay(s, act) {
      const D = N.data, svg = E('svg'); if (!svg) return; let g = '';
      if (s.stage === 1) { /* the cuts are the dividers */ }
      const C = s.pos.length > 0 || mode === 'pos' || s.phaseC;
      const box = (y, h) => `<rect x="${X.mat - 1}" y="${y}" width="122" height="${h}" fill="none" stroke="#5b38d1" stroke-width="2.5" rx="2"/>`;
      if (!C && s.stage >= 3) { // small ticks beside every looked-up row of the embedding matrix
        s.emb.forEach((i) => { const y = embY(D.ids[i]); g += `<line x1="${X.mat + 122}" x2="${X.mat + 130}" y1="${y}" y2="${y}" stroke="#5b38d1" stroke-width="2"/>`; });
      }
      if (C) for (let i = 0; i < D.T; i++) g += `<text x="${X.mat + 126}" y="${posY(i) + 4}" font-size="${act && act.kind === 'pos' && act.i === i ? 14 : 11}" font-weight="${act && act.kind === 'pos' && act.i === i ? 900 : 700}" fill="${s.pos.includes(i) ? '#5b38d1' : '#9aa3b2'}">${i + 1}</text>`;
      if (act) {
        const i = act.i, y0 = act.kind === 'emb' ? embY(D.ids[i]) : posY(i), y1 = rowY(i) + 8, x1 = (act.kind === 'emb' ? X.emb : X.pos) + STRIPW + 4, x0 = X.mat - 2;
        g += box(y0 - 5, 10);
        g += `<path d="M${x0} ${y0} C ${x0 - 130} ${y0}, ${x1 + 120} ${y1}, ${x1} ${y1}" fill="none" stroke="#5b38d1" stroke-width="1.6" opacity=".7" class="nv-line"/>`; // fades once the row has landed, so the numbers stay readable
        if (act.kind === 'emb') g += `<text x="${X.mat + 60}" y="${y0 - 9}" text-anchor="middle" font-size="12" font-weight="800" fill="#4528b3" stroke="#fff" stroke-width="4" paint-order="stroke">row ${D.ids[i]}</text>`;
      }
      if (N.sel >= 0 && N.sel < D.T && s.stage >= 3) g += `<rect x="${X.tok - 8}" y="${rowY(N.sel) - 8}" width="${(C ? X.inp + STRIPW : X.emb + STRIPW) - X.tok + 16}" height="${G.ROW}" rx="5" fill="#5b38d1" opacity=".07"/>`;
      svg.innerHTML = g;
    }
    // ---------- captions ----------
    const tw = (i) => `“${esc(N.data.raw[i].trim() || '·')}”`;
    function firstSame(i) { const D = N.data; for (let j = 0; j < i; j++) if (D.ids[j] === D.ids[i]) return j; return -1; }
    function caption(s, act) {
      const D = N.data, T = D.T, C = s.pos.length > 0 || mode === 'pos' || s.phaseC;
      const reps = [...new Set(D.ids.filter((id, i) => D.ids.indexOf(id) !== i))];
      const repTxt = reps.length ? ` Same token, same ID: ${reps.slice(0, 2).map((id) => `both ${tw(D.ids.indexOf(id))}s are ${id}`).join(', and ')}.` : '';
      let t, d;
      if (s.stage === 0) [t, d] = ['GPT-2 starts with the text so far.', 'Before it can do anything else, it has to turn the text into numbers.'];
      else if (s.stage === 1) [t, d] = ['Split into tokens.', `The text is cut into ${T} tokens from GPT-2’s list of 50,257 (Split into tokens). Each token keeps the space in front of it, shown as ·.`];
      else if (s.stage === 2) [t, d] = ['One row per token.', 'Each token gets its own row. Everything GPT-2 works out about a token is written in its row.'];
      else if (!C && act && act.kind === 'emb') {
        const i = act.i, j = firstSame(i);
        [t, d] = [`Look up ${tw(i)}’s embedding vector (token ${i + 1} of ${T}).`, `Its ID, ${D.ids[i]}, is a row number: GPT-2 copies row ${D.ids[i]} of the embedding matrix into the token’s row. That row is its <b>embedding vector</b>, 768 numbers for the token’s general meaning.${j >= 0 ? ` It’s the same row token ${j + 1} got, because it’s the same token: the embedding vector doesn’t depend on where the token is.` : ''}`];
      } else if (!C && s.stage >= 3 && s.emb.length === 0) [t, d] = ['Each token gets its ID.', `The ID is the token’s number in GPT-2’s list.${repTxt} On the right is the <b>embedding matrix</b>: one row of 768 numbers for every token in the list. ${mode === 'all' ? 'Next, each ID picks its row.' : 'Click a row, or press <b>Look up next ID’s embedding vector</b>.'}`];
      else if (!C && s.emb.length < T) [t, d] = [`${s.emb.length} of ${T} embedding vectors looked up.`, `Each ID points to one row of the embedding matrix. Click a row, or look up the next one. Element values: green is above 0, red below, yellow near 0.`];
      else if (!C) [t, d] = ['Every token has its embedding vector.', `${T} tokens × 768 numbers each.${reps.length ? ' Tokens that repeat have exactly the same vector.' : ''} The ID itself means nothing; it only says which row to use. The numbers in the row do carry meaning, learned in training (Meaning as numbers).`];
      else if (act && act.kind === 'pos') {
        const i = act.i, j = firstSame(i);
        [t, d] = [`Token ${i + 1}, ${tw(i)}: add position row ${i + 1}.`, `Its embedding vector + the position vector for place ${i + 1} = its <b>input vector</b>, element by element (${mode === 'pos' ? 'the table on the right' : 'below'}).${j >= 0 ? ` Token ${j + 1} is the same token with the same embedding vector, but it sits at place ${j + 1}, so it gets a different position vector, and the two input vectors now differ.` : ''}`];
      } else if (s.pos.length === 0 && mode === 'pos' && NT.predictOn() && reps.length) { // Predict first (Oct 19): same token twice, before position vectors are added
        const TM = NT.tokMarks(D.raw.map((w) => w.trim())), pickId = reps.find((id) => TM.col[D.ids.indexOf(id)] !== NT.C.tokGray) ?? reps[0]; // prefer a content word (bank, left) over “the”
        const r = D.ids.indexOf(pickId), n = D.ids.filter((id) => id === pickId).length, all = n === 2 ? 'both' : `all ${n}`;
        [t, d] = [`🤔 Predict first: will ${all} ${tw(r)}s end up with the same input vector?`, `GPT-2 adds a <b>position vector</b> (one learned row of 768 numbers for each place in the text) to every embedding vector. The ${n === 2 ? 'two' : n === 3 ? 'three' : n} ${tw(r)}s start with the same ID and exactly the same embedding vector. After each adds the row for its own place, will their input vectors still match? Decide, then press <b>Next</b>.`];
      } else if (s.pos.length === 0) [t, d] = ['Add where each token is.', `An embedding vector says what a token is, not where it is. GPT-2 keeps a second table, the <b>position matrix</b>: one row of 768 numbers for each place in the text (1st, 2nd, … up to the 1,024th), also learned in training. Each token adds the row for its place.${mode === 'pos' ? ' Double-click a row, or press <b>Get the next position vector</b>.' : ''}`];
      // (questions students ask here are answered in the panel under the scene: is this only adding? what if a sum goes past 1?)
      else if (s.pos.length < T) [t, d] = [`${s.pos.length} of ${T} input vectors.`, 'Embedding vector + position vector = input vector. Click a row to see its numbers added below; double-click a row to add its position vector.'];
      else [t, d] = ['Input vectors: what each token is, and where it is.', `Each of the ${T} tokens now has one input vector of 768 numbers. ${reps.length ? 'Repeated tokens started with the same embedding vector, but their input vectors differ, because their places differ. ' : ''}These ${T} vectors are what enters block 1 (Transformer). Here a <b>row</b> and a <b>vector</b> mean the same thing: a list of 768 numbers.`];
      const no = mode === 'all' ? `${N.k + 1}. ` : '';
      E('cap').classList.toggle('predict', t.startsWith('🤔'));
      E('cap').innerHTML = `<div class="fl-ch"><b>${no}${t}</b></div><div class="fl-cd">${d}${D.cut ? ` <span class="muted">(The first ${T} tokens are shown.)</span>` : ''}</div>`;
    }
    // ---------- the element-by-element panel (position steps) ----------
    function detail(s) {
      const box = E('det'); if (!box) return; const D = N.data, C = s.pos.length > 0 || mode === 'pos' || s.phaseC;
      if (!C) { box.hidden = true; return; }
      box.hidden = false;
      const i = N.sel >= 0 ? N.sel : s.pos.length ? s.pos[s.pos.length - 1] : 0, added = s.pos.includes(i), m = D.scale;
      const note = `<b>Is this only adding?</b> Yes. This step is plain addition, one element at a time: no multiplying and no dot products. Those come later, when tokens compare their vectors (the Transformer tab) and when the output vector is scored against every token (the Output tab).
        <b>What if a sum goes past 1 or below −1?</b> Nothing special happens: these numbers aren’t limited to −1…1. Most are small (around ±0.2), and a sum can be bigger or smaller than either part. The colors stop getting darker past a certain size, so very big and very small numbers both show as the deepest green or red.${D.exact ? '' : ' (Some embedding rows here are stored slightly rounded.)'}`;
      const cell = (v) => { const c = cellCol(v, m); return `<i style="background:${c.bg};color:${c.fg}">${minus(v)}</i>`; };
      if (mode === 'pos') { // beside the scene: the first 10 elements as an addition table
        box.innerHTML = `<div class="rk-tt">Token ${i + 1}, ${tw(i)}</div><div class="muted" style="font-size:.78rem;margin-bottom:4px">its first 10 of 768 elements · click any row to see it</div>
          <table class="nv-add"><tr><th>#</th><th>Embedding<br><small>row ${D.ids[i]}</small></th><th></th><th>Position<br><small>row ${i + 1}</small></th><th></th><th>Input${added ? '' : '<br><small>not added yet</small>'}</th></tr>
          ${Array.from({ length: NV }, (_, e) => `<tr><td>${e + 1}</td><td>${cell(D.tok[i][e])}</td><td>+</td><td>${cell(D.pos[i][e])}</td><td>=</td><td class="${added ? '' : 'ghost'}">${cell(D.inp[i][e])}</td></tr>`).join('')}
          <tr><td colspan="6" class="muted">… 758 more elements, each added the same way</td></tr></table>`;
        const qa = E('qa'); if (qa) qa.innerHTML = note; return;
      }
      const row = (lab, v, cls) => `<div class="nv-drow ${cls || ''}"><span class="nv-dl">${lab}</span><span class="nv-vals big">${cellsHTML(v, m)}</span></div>`;
      box.innerHTML = `<div class="rk-tt">Token ${i + 1}, ${tw(i)}: element by element <span class="muted" style="font-weight:500">(click any row in the table above to see its numbers)</span></div>
        ${row(`Embedding vector <small>row ${D.ids[i]} of the embedding matrix</small>`, D.tok[i])}
        ${row(`+ Position vector <small>row ${i + 1} of the position matrix</small>`, D.pos[i])}
        ${row(`= Input vector${added ? '' : ' <small>(not added yet)</small>'}`, D.inp[i], added ? 'sum' : 'sum ghost')}
        <div class="nv-note">${note}</div>`;
    }
    // ---------- drawing a state ----------
    function cur() { return mode === 'all' ? stateAt(N.k) : { stage: N.stage, emb: N.emb.slice(), pos: N.pos.slice(), phaseC: mode === 'pos' }; }
    function draw(act, animate) {
      if (!G) return; const s = cur(); if (mode === 'all') s.phaseC = N.k >= 4 + N.data.T;
      const dur = animate ? ms(act ? 1100 : 1400) : 0;
      apply(layout(s, act), dur); overlay(s, animate ? act : null); caption(s, act); detail(s);
      E('sc').querySelectorAll('.fl-tok .sp').forEach((e) => (e.style.display = s.stage <= 1 ? '' : 'none')); // the leading space shows only while the sentence is being cut (as in the flow)
      E('sc').classList.toggle('fl-col', s.stage > 1); // as a column, each token gets its identity bar (as on every tab)
      if (act && animate && act.kind === 'pos') { const el = E('n' + act.i); if (el) { el.classList.remove('flash'); void el.offsetWidth; setTimeout(() => el.classList.add('flash'), Math.round(dur * 0.9)); } }
      syncButtons(s);
      if (opts.onSelect) { const i = N.sel >= 0 ? N.sel : act ? act.i : -1; if (i >= 0) opts.onSelect(N.data.ids[i], i); }
    }
    // ---------- actions ----------
    const T = () => N.data.T;
    // Put it together: which row a step works on (steps 4 … 3+T look up embedding vectors, the next T add position vectors)
    const actFor = (k) => { const T0 = T(); return k >= 4 && k < 4 + T0 ? { kind: 'emb', i: k - 4 } : k >= 4 + T0 && k < 4 + 2 * T0 ? { kind: 'pos', i: k - 4 - T0 } : null; };
    function lookup(i, animate = true) { if (N.stage < 3) N.stage = 3; if (!N.emb.includes(i)) N.emb.push(i); N.sel = i; draw({ kind: 'emb', i }, animate); }
    function addPos(i, animate = true) { if (!N.pos.includes(i)) N.pos.push(i); N.sel = i; draw({ kind: 'pos', i }, animate); }
    const nextMissing = (arr) => { for (let i = 0; i < T(); i++) if (!arr.includes(i)) return i; return -1; };
    function stopQueue() { N.queue.forEach(clearTimeout); N.queue = []; }
    function all(kind) { stopQueue(); const arr = kind === 'emb' ? N.emb : N.pos, rest = []; for (let i = 0; i < T(); i++) if (!arr.includes(i)) rest.push(i);
      rest.forEach((i, n) => N.queue.push(setTimeout(() => { if (!alive()) return; if (kind === 'emb') lookup(i); else addPos(i); }, n * ms(420)))); }
    function next() {
      if (mode === 'all') { if (N.k >= stepsAll() - 1) { pause(); return false; } N.k++; N.sel = -1; draw(actFor(N.k), true); return true; }
      if (mode === 'ids') { if (N.stage < 3) { N.stage++; draw(null, true); return true; } const i = nextMissing(N.emb); if (i < 0) { pause(); return false; } lookup(i); return true; }
      const i = nextMissing(N.pos); if (i < 0) { pause(); return false; } addPos(i); return true;
    }
    function back() {
      stopQueue();
      if (mode === 'all') { if (N.k > 0) { N.k--; N.sel = -1; draw(actFor(N.k), false); } return; }
      if (mode === 'ids') { if (N.emb.length) { N.emb.pop(); N.sel = N.emb.length ? N.emb[N.emb.length - 1] : -1; } else if (N.stage > 0) N.stage--; draw(null, false); return; }
      if (N.pos.length) { N.pos.pop(); N.sel = N.pos.length ? N.pos[N.pos.length - 1] : -1; } draw(null, false);
    }
    function rewind() { pause(); stopQueue(); N.k = 0; N.stage = mode === 'pos' ? 3 : 0; N.emb = []; N.pos = []; N.sel = -1; draw(null, false); }
    const stepMs = () => (mode === 'all' && N.k >= 4 ? ms(1300) : ms(mode === 'all' || N.stage < 3 ? 2000 : 1300));
    function tick() { if (!N.playing || !alive()) return; N.timer = setTimeout(() => { if (!N.playing || !alive()) return; if (next()) tick(); }, stepMs()); }
    function play() { if (N.playing) return pause(); N.playing = true; syncButtons(cur()); if (next()) tick(); }
    function pause() { N.playing = false; clearTimeout(N.timer); if (G) syncButtons(cur()); }
    function syncButtons(s) {
      const D = N.data; if (!D) return; const b = (id, dis) => { const e = E(id); if (e) e.disabled = dis; };
      const pl = E('play'); if (pl) pl.textContent = N.playing ? '⏸ Pause' : '▶ Play';
      if (mode === 'all') { b('back', N.k <= 0); b('next', N.k >= stepsAll() - 1); b('play', N.k >= stepsAll() - 1 && !N.playing); }
      if (mode === 'ids') { b('back', N.stage === 0 && !N.emb.length); b('next', N.stage >= 3 && N.emb.length >= D.T); b('one', N.emb.length >= D.T); b('all', N.emb.length >= D.T); b('play', N.emb.length >= D.T && !N.playing); }
      if (mode === 'pos') { b('back', !N.pos.length); b('next', N.pos.length >= D.T); b('one', N.pos.length >= D.T); b('all', N.pos.length >= D.T); b('play', N.pos.length >= D.T && !N.playing); }
      const more = E('more'); if (more) more.hidden = !(mode === 'all' ? N.k >= stepsAll() - 1 : mode === 'ids' ? N.emb.length >= D.T : N.pos.length >= D.T);
    }
    // ---------- clicking rows ----------
    function rowAt(ev) { const sc = E('sc'); if (!sc || !G) return -1; const r = sc.getBoundingClientRect(), k = N.fitK || 1, x = (ev.clientX - r.left) / k, y = (ev.clientY - r.top) / k; if (x > X.inp + STRIPW + 10) return -1; const i = Math.floor((y - G.top + 8) / G.ROW); return i >= 0 && i < N.data.T ? i : -1; }
    function wireClicks() {
      const box = E('box');
      box.onclick = (ev) => { const i = rowAt(ev); if (i < 0) return; const s = cur(); if (s.stage < 3 && mode !== 'pos') return;
        if (mode === 'ids') { pause(); stopQueue(); lookup(i); } else { N.sel = i; draw(null, false); } };
      box.ondblclick = (ev) => { if (mode !== 'pos') return; const i = rowAt(ev); if (i < 0) return; stopQueue(); addPos(i); };
    }
    // ---------- fit the 1200-wide scene ----------
    function fit() {
      const box = E('box'), sc = E('sc'); if (!box || !sc || !G) return;
      let k = Math.min(1.2, box.clientWidth / W);
      if (opts.fitHeight !== false) { const top = box.getBoundingClientRect().top + window.scrollY, avail = window.innerHeight - top - 14; if (avail > 300) k = Math.min(k, avail / G.H); }
      const dx = Math.max(0, (box.clientWidth - W * k) / 2); sc.style.transform = `translate(${dx}px,0) scale(${k})`; N.fitK = k; box.style.height = `${Math.ceil(G.H * k)}px`;
    }
    // ---------- the panel ----------
    const btn = (id, label, cls = '', title = '') => `<button class="btn ${cls}" id="${P}${id}"${title ? ` title="${title}"` : ''}>${label}</button>`;
    const ctl = mode === 'all' ? btn('rew', '⏮', '', 'Start over') + btn('back', '◀ Back', '', 'Back one step') + btn('next', 'Next ▶', 'primary') + btn('play', '▶ Play')
      : mode === 'ids' ? btn('rew', '⏮', '', 'Start over') + btn('back', '◀ Back', '', 'Back one step') + btn('next', 'Next ▶', 'primary') + btn('one', 'Look up next ID’s embedding vector') + btn('all', 'Look up all token IDs') + btn('play', '▶ Play')
      : btn('rew', '⏮', '', 'Start over') + btn('back', '◀ Back', '', 'Take the last one back') + btn('next', 'Next ▶', 'primary') + btn('one', 'Get the next position vector') + btn('all', 'Get all position vectors') + btn('play', '▶ Play'); // (Oct 19) the same player as Token IDs
    host.innerHTML = `<section class="panel fl-panel nv-panel"><div class="fl-head"><div class="fl-ctl">${ctl}<label class="delay">Speed <input type="range" id="${P}speed" min="0" max="${SPEEDS.length - 1}" value="${speedIx}"><b id="${P}spv">×${SPEEDS[speedIx]}</b></label>${opts.more ? `<button class="btn ghost" id="${P}more" hidden>${opts.more[0]}</button>` : ''}</div></div>
      <div class="fl-cap fixed" id="${P}cap"></div>${mode === 'pos' ? `<div class="nv-body"><div class="fl-box nv-box" id="${P}box"></div><div class="nv-det side" id="${P}det"></div></div><div class="nv-note" id="${P}qa"></div>` : `<div class="fl-box nv-box" id="${P}box"></div><div class="nv-det" id="${P}det" hidden></div>`}</section>`;
    NT.guideRow(host.querySelector('.nv-panel')); // the player beside the caption, as on every other page
    const on = (id, fn) => { const e = E(id); if (e) e.onclick = fn; };
    on('rew', rewind); on('back', () => { pause(); back(); }); on('next', () => { pause(); stopQueue(); next(); }); on('play', play);
    on('one', () => { pause(); stopQueue(); if (mode === 'ids') { if (N.stage < 3) { N.stage = 3; } const i = nextMissing(N.emb); if (i >= 0) lookup(i); } else { const i = nextMissing(N.pos); if (i >= 0) addPos(i); } });
    on('all', () => { pause(); if (mode === 'ids' && N.stage < 3) { N.stage = 3; draw(null, false); } all(mode === 'ids' ? 'emb' : 'pos'); });
    E('speed').oninput = (e) => { speedIx = +e.target.value; E('spv').textContent = '×' + SPEEDS[speedIx]; };
    if (opts.more) on('more', opts.more[1]);
    const inst = { fit, alive, pause, recap: () => { if (G && N.data) caption(cur(), null); } };
    LIVE.add(inst);
    (async () => {
      if (!NT.current().ids.length) { E('box').innerHTML = '<div class="panel emptynote">Type a sentence at the top, or choose one, to begin.</div>'; return; }
      E('box').innerHTML = NT.pendingHTML('Getting GPT-2’s numbers for this sentence…');
      N.data = await load(); if (!alive()) return;
      E('box').innerHTML = build(); paintMats(); fit(); wireClicks();
      draw(null, false); fit(); // fit again once the side table is in place
    })();
    return inst;
  };
  window.addEventListener('resize', () => LIVE.forEach((f) => (f.alive() ? f.fit() : LIVE.delete(f))));
})();
