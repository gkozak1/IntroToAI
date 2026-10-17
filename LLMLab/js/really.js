/* LLM Lab — Transformer tab: "How it really works" (v2, from Greg's 13 hand sketches + his notes on v1).
   A twisty under the detective story. Opened, it shows the real GPT-2 operations behind the story's current step, with its own
   controls; Next always continues through all 14 screens. Every stripe, number and matrix picture is real GPT-2 small for the story
   sentence (data/really-data.js and data/really-w/b{block}.js, built by build/build_really.py; biases and layer norms included).
   Head 1 = the story's Detective 1. Vectors are drawn to scale inside each screen: 768 numbers = 288 px, 64 numbers = 24 px
   (screens 12–14 are drawn at a third of that so 3,072 fits).
   Screens:  1 input vectors · 2 × W_Q = Q · 3 × W_K = K · 4 × W_V = V · 5 Q K V ready · 6 Kᵀ and Q × Kᵀ · 7 ÷8, mask, Softmax ·
             8 weights × Values, added → head 1's output for one token · 9 every token (attention grid) · 10 12 heads concatenated ·
             11 W_O and the first addition · 12 MLP up + GELU · 13 MLP down and the second addition · 14 twelve blocks → ranked tokens. */
'use strict';
(() => {
  const { $, esc } = NT;
  const T = 13, SW = 1290, TOP = 70, ROW = 34, BH = 20, H = TOP + T * ROW + 70;
  const W = ['The', 'banker', 'left¹', 'the', 'bank¹', 'and', 'sat', 'on', 'the', 'left²', 'bank²', 'of', 'the'];
  const COL = ['#9aa3b2', '#2b5aa8', '#d9730d', '#9aa3b2', '#1e8a3a', '#8e44ad', '#16a085', '#9aa3b2', '#9aa3b2', '#d9730d', '#1e8a3a', '#9aa3b2', '#c2185b'];
  const P = 'rw_', E = (id) => document.getElementById(P + id);
  const rowY = (i) => TOP + i * ROW, barY = (i) => rowY(i) + 4, midY = TOP + (T * ROW) / 2;
  const N = 14;
  const NAMES = ['Input vectors', 'Query', 'Key', 'Value', 'Q · K · V', 'Q × Kᵀ', 'Softmax', 'Weighted sum', 'Every token', '12 heads', 'W_O and add', 'MLP up', 'MLP down', '12 blocks'];
  // which screens belong to each detective step (the story's beat keys); the first one listed is where the panel opens
  const MAP = { start: [1], fadein: [1], room: [1], focus: [1], q: [2], k: [3], s: [6, 7, 5], v: [8, 4], n: [9, 8], nx: [9], sup1: [10], sup2: [10], sup3: [11], sup4: [11], f1: [12], f2: [13], f3: [14], known: [14] };
  // sizes: 768 numbers = 288 px, 64 = 24 px (screens 1–11); 768 = 96 px, 3,072 = 384 px (screens 12–14)
  const L768 = 288, L64 = 24, Z64 = L64, L3072 = 4 * L768; // every vector to one scale: 768 numbers = 288 px, 64 = 24 px, 3,072 = 1,152 px

  // ---------- data ----------
  let R = null, RP = null; const WP = {};
  const script = (src, ok) => new Promise((res) => { if (ok()) return res(); const sc = document.createElement('script'); sc.src = src; sc.onload = () => res(); sc.onerror = () => res(); document.head.appendChild(sc); });
  const load = () => RP || (RP = script('./data/really-data.js', () => window.REALLY_DATA).then(() => (R = window.REALLY_DATA || null)));
  const loadW = (b) => WP[b] || (WP[b] = script(`./data/really-w/b${b}.js`, () => window.REALLY_W && window.REALLY_W[b]));
  const i8 = (P8) => P8._i || (P8._i = (() => { const u = NT.b64(P8.d); return new Int8Array(u.buffer, u.byteOffset, u.byteLength); })());
  const row = (P8, r) => { const q = i8(P8), n = P8.n, s = P8.s[r] / 127, a = new Float32Array(n); for (let e = 0; e < n; e++) a[e] = q[r * n + e] * s; return a; };
  const blk = () => R.blocks[st.room - 1];
  const vecIn = (b, i) => (b < 12 ? row(R.blocks[b].x, i) : row(R.xo, i)); // the vector entering block b+1 (b = 12: after block 12)
  const hv = (kind, h, i) => row(blk()[kind], h * T + i); // q, k, v, z of head h for token i
  const raw = (j) => blk().raw[j]; // head 1: Q·K scores of token j's Query with its witnesses 0..j
  const att = (j) => blk().att[j];
  const gelu = (x) => 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x * x * x)));

  // ---------- pictures: input/output vectors keep the app's multicolor stripes; Q blue, K orange, V violet, MLP amber.
  //            Near 0 is pale; a large positive value is the role color, a large negative one a gray of the same hue. ----------
  const HUE = { q: [214, 78], k: [27, 92], v: [268, 62], a: [40, 92] };
  const p98 = NT.viz.p98, share = (vs) => NT.viz.sharedScale(vs);
  function px(hu, sa, t) {
    t = Math.max(-1, Math.min(1, t)); t = Math.sign(t) * Math.sqrt(Math.abs(t));
    const L = (t >= 0 ? 95 - 58 * t : 95 + 48 * t) / 100, S = (t >= 0 ? sa : 16) / 100, C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs(((hu / 60) % 2) - 1)), M = L - C / 2;
    const [r, g, b] = hu < 60 ? [C, X, 0] : hu < 180 ? [0, C, X] : hu < 240 ? [0, X, C] : [X, 0, C];
    return [(r + M) * 255, (g + M) * 255, (b + M) * 255, 255];
  }
  function role(cv, vals, kind, m) {
    if (!cv) return; const n = vals.length; m = m || p98(vals); cv.width = n; cv.height = 1;
    const c = cv.getContext('2d'), img = c.createImageData(n, 1), [hu, sa] = HUE[kind];
    for (let i = 0; i < n; i++) img.data.set(px(hu, sa, vals[i] / m), i * 4);
    c.putImageData(img, 0, 0);
  }
  function matImg(cv, M, kind) { // a real weight matrix, sampled (every few rows/columns), as a grid of colored cells
    if (!cv || !M) return; const q = i8(M); cv.width = M.c; cv.height = M.r;
    const c = cv.getContext('2d'), img = c.createImageData(M.c, M.r), [hu, sa] = HUE[kind];
    for (let i = 0; i < q.length; i++) img.data.set(px(hu, sa, q[i] / 127), i * 4);
    c.putImageData(img, 0, 0);
  }
  const multi = (cv, vals, m) => NT.viz.vec(cv, vals, m);

  // ---------- state ----------
  const st = { open: false, list: [1], idx: 0, room: 1, q: 12, key: 'start', tk: 0, playing: false, timer: null, built: '', shown: 0 };
  const later = (ms, fn) => { const tk = st.tk; setTimeout(() => { if (tk === st.tk && E('sc')) fn(); }, ms); };

  // ---------- placing things: absolute, moved with transform (the story's easing) ----------
  const cur = {};
  function put(id, p, d = 0) {
    const el = E(id); if (!el) return;
    let c = cur[id];
    if (!c) { c = cur[id] = Object.assign({ x: 0, y: 0, r: 0 }, p, { o: 0 }); el.style.transition = 'none'; el.style.transform = `translate(${c.x}px,${c.y}px) rotate(${c.r || 0}deg)`; if (c.w != null) el.style.width = c.w + 'px'; el._dirty = true; }
    if (d && el._dirty) { void el.offsetWidth; el._dirty = false; } // commit the start, so the move animates from there
    Object.assign(c, p);
    el.style.transition = d ? `transform ${d}ms cubic-bezier(.45,.05,.25,1), opacity ${Math.round(d * 0.6)}ms, width ${d}ms cubic-bezier(.45,.05,.25,1)` : 'none';
    el.style.transform = `translate(${c.x}px,${c.y}px) rotate(${c.r || 0}deg)`; if (c.w != null) el.style.width = c.w + 'px'; el.style.opacity = c.o;
    if (!d) el._dirty = true;
  }
  // later moves are scheduled (not CSS-delayed), so several moves of one element in a screen never cancel each other
  const mv = (A, id, p, d, dl = 0) => { if (!A) return put(id, p, 0); if (dl > 0) later(dl, () => put(id, p, d)); else put(id, p, d); };
  const fade = (A, ids, o, d = 500, dl = 0) => ids.forEach((id) => mv(A, id, { o }, d, dl));
  // a horizontal bar turned into a column centered on cx, top at y0, length Ln
  const col = (cx, y0, Ln) => ({ x: cx - Ln / 2, y: y0 + Ln / 2 - BH / 2, w: Ln, r: 90 });
  const svg = (html, A) => { const s = E('svg'); if (!s) return; s.style.transition = 'none'; s.style.opacity = 0; s.innerHTML = html; void s.getBoundingClientRect(); s.style.transition = A ? 'opacity .6s' : 'none'; s.style.opacity = 1; };
  const flash = (A, id, dl) => { if (!A) return; later(dl, () => { const el = E(id); if (!el) return; el.classList.remove('rw-fl'); void el.offsetWidth; el.classList.add('rw-fl'); }); };
  const outline = (id, color) => { const el = E(id); if (el) { el.style.outline = color ? `3px solid ${color}` : ''; el.style.outlineOffset = '2px'; } };

  const cv = (id, w, cls = '') => `<canvas class="rw-v ${cls}" id="${P}${id}" style="width:${w}px;height:${BH}px"></canvas>`;
  const dv = (id, cls, html = '', w = 0, h = 0) => `<div class="${cls}" id="${P}${id}" style="${w ? `width:${w}px;` : ''}${h ? `height:${h}px;` : ''}">${html}</div>`;
  const tok = (i) => `<div class="tr-c tr-tok rw-tok" id="${P}t${i}" data-i="${i}" style="--c:${COL[i]};width:84px;height:${ROW - 6}px">${esc(W[i])}</div>`;
  const hd = (id, html, w) => dv(id, 'fl-h rw-h', html, w);
  const sym = (id, s, w = 22) => dv(id, 'rw-symcol', Array.from({ length: T }, () => `<i>${s}</i>`).join(''), w); // one symbol on every row
  const one = (id, s) => dv(id, 'rw-op', s);
  const matBox = (id, kind, label, w, h) => `<div class="rw-matw rw-m${kind}" id="${P}${id}" style="width:${w}px"><div class="rw-matl">${label}</div><canvas class="rw-mat" id="${P}${id}c" style="width:${w}px;height:${h}px"></canvas></div>`;

  // ---------- geometry ----------
  const X = { in: 110, mx: 448, q: 520, k: 580, v: 640 };          // screens 1–4
  const NX = { q: 120, k: 180, v: 240 };                            // screens 5–8: Q K V moved over
  const QA = 296, SL0 = 452, SLW = 62, KT0 = TOP + 130, TL = 300;          // the work area
  const slot = (i) => SL0 + SLW / 2 + i * SLW;
  const TY = { raw: KT0 + Z64 + 14, sc: KT0 + Z64 + 48, pc: KT0 + Z64 + 82 };
  const WY = { x: KT0 + Z64 + 4, pc: KT0 + Z64 + 22, w: KT0 + Z64 + 64 };  // screen 8: ×, the percentages, the weighted Values
  const SUMC = 412, NOTEY = WY.w + Z64 + 26;
  const GX = (i) => 112 + i * 32, GOUT = 560;                       // screen 9: the grid and head 1's outputs
  const LX = (k) => 112 + k * 46;                                    // screen 10: the 12 lanes
  const AX = { cat: 110, wo: 432, out: 752, in: 432, upd: 752 };     // screen 11
  const MX = { upd: 110, m1: 236, hid: 664, act: 110, m2: 528, f: 664, plus: 766, upd2: 792, eq: 896, bo: 920 }; // screens 12–13

  // ---------- the scene ----------
  function build() {
    const j = st.q; let h = dv('band', 'rw-band', '', 268, ROW - 4);
    // headers
    h += hd('hin', 'Input Vector <small>1 × 768 · (Case File)</small>', 288);
    h += hd('hq', '<b class="rw-cq">Query</b> <small>1 × 64 (Question)</small>', 70) + hd('hk', '<b class="rw-ck">Key</b> <small>1 × 64 (Statement)</small>', 70) + hd('hv', '<b class="rw-cv">Value</b> <small>1 × 64 (Evidence)</small>', 70);
    h += matBox('wq', 'q', 'W<sub>Q</sub> <small>768 × 64</small>', L64, L768) + matBox('wk', 'k', 'W<sub>K</sub> <small>768 × 64</small>', L64, L768) + matBox('wv', 'v', 'W<sub>V</sub> <small>768 × 64</small>', L64, L768);
    h += one('x1', '×') + one('e1', '=');
    for (let i = 0; i < T; i++) h += tok(i) + cv('in' + i, L768) + cv('q' + i, L64) + cv('k' + i, L64) + cv('v' + i, L64);
    // screens 6–8 (the work area)
    h += dv('div', 'rw-div', '', 2, T * ROW + 26) + dv('kth', 'rw-cap2', '', 760) + dv('qal', 'rw-cap2', `<b class="rw-cq">Q</b> of “${esc(W[j])}”`, 120) + cv('qa', Z64) + one('tx', '×');
    h += dv('lraw', 'rw-rl', 'Q · Kᵀ', 150) + dv('lsc', 'rw-rl', '÷ √64 = 8', 150) + dv('lpc', 'rw-rl', 'Softmax', 150) + dv('tot', 'rw-tot', 'total = 100%', 150);
    h += dv('mask', 'rw-note', 'Later tokens are masked (−∞) before Softmax, so they get 0%.', 420);
    h += dv('rest', 'rw-note', att(j)[0] > 0.4 && j > 0 ? `${Math.round(att(j)[0] * 100)}% rests on the first token, “The”: a common GPT-2 habit when a head finds little to use.` : '', 560);
    for (let i = 0; i < T; i++) {
      const ok = i <= j, pc = ok ? att(j)[i] : 0;
      h += cv('kt' + i, L64) + cv('vt' + i, L64) + cv('vw' + i, Z64) + dv('lb' + i, 'rw-lb', esc(W[i]), 56) + dv('fs' + i, 'rw-fut', 'later', 18, Z64);
      h += dv('raw' + i, 'rw-tile', ok ? raw(j)[i].toFixed(1) : '', 50) + dv('sc' + i, 'rw-tile', ok ? (raw(j)[i] / 8).toFixed(2) : '−∞', 50);
      h += dv('pc' + i, 'rw-tile rw-pc', ok ? (pc * 100).toFixed(1) + '%' : '0%', 50) + one('px' + i, '×');
      if (i < T - 1) h += one('pp' + i, '+');
    }
    h += one('teq', '=') + cv('ns', Z64, 'rw-sum') + cv('nb', Z64) + dv('nl', 'rw-cap2', `= <b>head 1’s output</b> for “${esc(W[j])}” <small>1 × 64 (Detective 1’s Note)</small>`, 420);
    // screen 9: the attention grid for every token, then head 1's output for every token
    h += hd('hg', 'Head 1 attention weights <small>each row: one token’s percentages, totaling 100% (Relevance)</small>', 430) + hd('hgo', 'Head 1 output <small>1 × 64 (Note)</small>', 110);
    for (let c = 0; c < T; c++) h += dv('gl' + c, 'rw-gl', esc(W[c]), 30);
    for (let r = 0; r < T; r++) for (let c = 0; c < T; c++) { const p = c <= r ? att(r)[c] : -1; h += dv(`g${r}_${c}`, 'rw-gc' + (p < 0 ? ' rw-gm' : ''), p < 0 ? '—' : Math.round(p * 100), 30, 26); }
    for (let i = 0; i < T; i++) h += cv('go' + i, L64);
    // screen 10: 12 lanes, the other heads fly in, ‖ between, then joined
    for (let k = 0; k < 12; k++) h += dv('ln' + k, 'rw-lane', Array.from({ length: T }, () => '<i></i>').join(''), L64) + hd('lh' + k, `${k + 1}`, 24);
    h += hd('hln', 'Head outputs <small>heads 1–12, 1 × 64 each (the Notes of Detectives 1–12)</small>', 560);
    for (let k = 0; k < 11; k++) h += sym('cc' + k, '‖', 22);
    for (let k = 0; k < 12; k++) for (let i = 0; i < T; i++) h += cv(`hs${k}_${i}`, L64);
    h += hd('hcat', 'Concatenated Value Vectors <small>12 heads × 64 = 1 × 768 (all 12 Notes)</small>', 300);
    // screen 11: W_O, then the first addition
    h += matBox('wo', 'v', 'W<sub>O</sub> <small>768 × 768 · output projection (Lead Detective)</small>', L768, L768) + one('x2', '×') + one('e2', '=');
    h += hd('hao', '<b class="rw-cv">Attention output</b> <small>1 × 768 (Lead Detective’s result)</small>', 288) + hd('hin2', 'Input Vector <small>1 × 768 (Case File)</small>', 288) + hd('hup', 'Updated vector <small>1 × 768 (updated Case File)</small>', 288);
    for (let i = 0; i < T; i++) h += cv('ao' + i, L768) + cv('in2_' + i, L768) + cv('up' + i, L768);
    h += sym('pl1', '+', 22) + sym('eq1', '=', 22);
    // screens 12–13: the MLP, vectors to scale (the 3,072-number hidden layer is 4× as long); W1 and W2 drawn at ¼ scale
    h += hd('hup2', 'Updated vector <small>1 × 768 (updated Case File)</small>', 288) + hd('hhid', '<b class="rw-ca">Hidden layer</b> <small>1 × 3,072: four times as long (Forensics Expert)</small>', 560) + hd('hf', '<b class="rw-ca">MLP output</b> <small>1 × 768 (Forensics Expert’s result)</small>', 288) + hd('hu3', 'Updated vector <small>1 × 768</small>', 288) + hd('hbo', `Block ${st.room} output <small>1 × 768 (final Case File)</small>`, 288);
    h += matBox('m1', 'a', 'W<sub>1</sub> <small>768 × 3,072 (¼ scale)</small>', L768, L768 / 4) + matBox('m2', 'a', 'W<sub>2</sub> <small>3,072 × 768 (¼ scale)</small>', L768 / 4, L768) + one('x3', '×') + one('e3', '=') + one('x4', '×') + dv('gelu', 'rw-gelu', 'GELU', 40, T * ROW - 6);
    for (let i = 0; i < T; i++) h += cv('u' + i, L768) + cv('hp' + i, L768) + cv('ha' + i, L3072) + cv('f' + i, L768) + cv('bo' + i, L768);
    h += sym('pl2', '+', 22) + sym('eq2', '=', 22);
    // screen 14: this block's output, the later blocks one after another, then the ranking box
    h += hd('bhl', '', 288) + hd('bhr', '', 288) + sym('ba0', '→', 40) + dv('bal', 'rw-note', 'each block: + attention update + MLP update', 250);
    for (let bb = 1; bb <= 12; bb++) for (let i = 0; i < T; i++) h += cv(`bc${bb}_${i}`, L768);
    h += `<div class="rw-box2" id="${P}rk"><div class="rk-tt">After Block 12, this output vector for “the”…</div><canvas class="rw-v" id="${P}rkv" style="width:${L768}px;height:${BH}px"></canvas><div class="rk-tt">…ranks these tokens next (logits): <span class="tr-real">real GPT-2</span></div><div id="${P}rkt"></div><div class="tr-hint">The Output tab turns these scores into probabilities and picks one. <button class="btn small" id="${P}goOut">Output ›</button></div></div>`;
    h += cv('fly', L768);
    return h;
  }
  const leftBlock = () => (st.room < 12 ? st.room : 11);
  function paint() {
    const b = blk(), j = st.q, Wt = window.REALLY_W && window.REALLY_W[st.room], all = (k, hh = 0) => Array.from({ length: T }, (_, i) => hv(k, hh, i));
    const IN = Array.from({ length: T }, (_, i) => vecIn(st.room - 1, i)), Q = all('q'), K = all('k'), V = all('v');
    const mi = share(IN), mq = share(Q), mk = share(K), mvv = share(V);
    for (let i = 0; i < T; i++) {
      multi(E('in' + i), IN[i], mi); multi(E('in2_' + i), IN[i], mi); role(E('q' + i), Q[i], 'q', mq); role(E('k' + i), K[i], 'k', mk); role(E('v' + i), V[i], 'v', mvv);
      role(E('kt' + i), K[i], 'k', mk); role(E('vt' + i), V[i], 'v', mvv); role(E('vw' + i), V[i].map((x) => x * (i <= j ? att(j)[i] : 0)), 'v', mvv);
      const c = i <= j ? NT.viz.shareCol(att(j)[i]) : null; const t = E('pc' + i); if (t && c) t.style.setProperty('--pc', c);
    }
    role(E('qa'), Q[j], 'q', mq); role(E('ns'), hv('z', 0, j), 'v', mvv); role(E('nb'), hv('z', 0, j), 'v', mvv);
    for (let r = 0; r < T; r++) for (let c = 0; c <= r; c++) { const g = E(`g${r}_${c}`); if (g) g.style.setProperty('--gc', NT.viz.shareCol(att(r)[c])); }
    for (let k = 0; k < 12; k++) { const Z = all('z', k), m = share(Z); for (let i = 0; i < T; i++) { role(E(`hs${k}_${i}`), Z[i], 'v', m); if (k === 0) role(E('go' + i), Z[i], 'v', m); } }
    const O = Array.from({ length: T }, (_, i) => row(b.o, i)), U = Array.from({ length: T }, (_, i) => row(b.m, i)), mo = share(O), mu = share(U);
    const HP = Array.from({ length: T }, (_, i) => row(b.u, i)), HA = HP.map((u) => u.map(gelu)), F = Array.from({ length: T }, (_, i) => row(b.f, i)), BO = Array.from({ length: T }, (_, i) => vecIn(st.room, i));
    const mh = share(HP), ma = share(HA), mf = share(F), mb = share(BO);
    for (let i = 0; i < T; i++) { role(E('ao' + i), O[i], 'v', mo); multi(E('up' + i), U[i], mu); multi(E('u' + i), U[i], mu); role(E('hp' + i), HP[i], 'a', mh); role(E('ha' + i), HA[i], 'a', ma); role(E('f' + i), F[i], 'a', mf); multi(E('bo' + i), BO[i], mb); }
    for (let bb = leftBlock(); bb <= 12; bb++) { const vs = Array.from({ length: T }, (_, i) => vecIn(bb, i)), m = share(vs); for (let i = 0; i < T; i++) multi(E(`bc${bb}_${i}`), vs[i], m); }
    multi(E('fly'), vecIn(12, T - 1)); multi(E('rkv'), vecIn(12, T - 1));
    if (Wt) { matImg(E('wqc'), Wt.q, 'q'); matImg(E('wkc'), Wt.k, 'k'); matImg(E('wvc'), Wt.v, 'v'); matImg(E('woc'), Wt.o, 'v'); matImg(E('m1c'), Wt.m1, 'a'); matImg(E('m2c'), Wt.m2, 'a'); }
    const tp = R.top, pr = { ids: tp.ids, logits: tp.logits, p: tp.p, K: tp.ids.length };
    E('rkt').innerHTML = NT.viz.rankTable(pr, NT.ALL, { n: 5, prob: false, more: false, mark: (i) => (pr.ids[i] === 7850 ? 'tr-river' : '') });
  }

  // ---------- the screens: run(s, A) plays screen s (A) or jumps to its end state; screens run in order from 1 ----------
  const rows = (f) => Array.from({ length: T }, (_, i) => f(i)).join('');
  const arrowDefs = `<defs><marker id="${P}ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#9aa3b2"/></marker></defs>`;
  function linesTo(xFrom, mx, mw, xTo, kind) { return arrowDefs + rows((i) => { const y = barY(i) + BH / 2; return `<path d="M${xFrom + 4} ${y} L${mx - 4} ${midY}" class="rw-ln"/><path d="M${mx + mw + 4} ${midY} L${xTo - 6} ${y}" class="rw-ln rw-ln${kind}" marker-end="url(#${P}ar)"/>`; }); }
  const matY = (h) => midY - h / 2 - 8;
  function run(s, A) {
    const j = st.q, at = (ms, fn) => (A ? later(ms, fn) : fn());
    if (s === 1) {
      mv(A, 'hin', { x: X.in, y: 20, o: 1 }, 400);
      for (let i = 0; i < T; i++) { put('t' + i, { x: 18, y: rowY(i), o: 1 }); put('in' + i, { x: X.in - (A ? 30 : 0), y: barY(i), w: L768 }); mv(A, 'in' + i, { x: X.in, o: 1 }, 600, i * 40); }
      return;
    }
    if (s >= 2 && s <= 4) { // Input Vector × W = the new 1 × 64 vectors (sketches 1–3)
      const k = ['q', 'k', 'v'][s - 2], m = 'w' + k;
      if (s > 2) fade(A, ['w' + ['q', 'k', 'v'][s - 3]], 0, 400);
      put(m, { x: X.mx, y: matY(L768), o: 0 }); mv(A, m, { o: 1 }, 500, 200);
      put('x1', { x: X.in + L768 + 14, y: midY - 14 }); put('e1', { x: X.mx + L64 + 14, y: midY - 14 }); fade(A, ['x1', 'e1'], 1, 400, 200);
      at(500, () => svg(linesTo(X.in + L768, X.mx, L64, X[k], k), A));
      put('h' + k, { x: X[k] - 22, y: 14, o: 0 }); mv(A, 'h' + k, { o: 1 }, 400, 700);
      for (let i = 0; i < T; i++) { put(k + i, { x: X[k] - (A ? 20 : 0), y: barY(i), w: L64 }); mv(A, k + i, { x: X[k], o: 1 }, 500, 800 + i * 60); }
      return;
    }
    if (s === 5) { // the input vectors and the matrix fade; Q, K, V move over (sketch 4)
      svg('', false); fade(A, ['wv', 'x1', 'e1', 'hin'], 0, 500);
      for (let i = 0; i < T; i++) mv(A, 'in' + i, { o: 0 }, 500, i * 20);
      ['q', 'k', 'v'].forEach((k) => { mv(A, 'h' + k, { x: NX[k] - 22, o: 1 }, 900, 600); for (let i = 0; i < T; i++) mv(A, k + i, { x: NX[k], o: 1 }, 900, 600 + i * 20); });
      return;
    }
    if (s === 6) { // gray out what isn't used; rotate the Keys into Kᵀ (shown 5× larger); Q × Kᵀ = one score per witness
      for (let i = 0; i < T; i++) { E('t' + i).classList.toggle('tr-me', i === j); mv(A, 'q' + i, { o: i === j ? 1 : 0.22 }, 500); mv(A, 'k' + i, { o: i <= j ? 1 : 0.22 }, 500); mv(A, 'v' + i, { o: 0.25 }, 500); }
      put('band', { x: 12, y: rowY(j) - 1 }); mv(A, 'band', { o: 1 }, 500);
      put('div', { x: QA - 22, y: 14 }); mv(A, 'div', { o: 1 }, 400);
      const kth = E('kth'); if (kth) kth.innerHTML = `<b class="rw-ck">Kᵀ</b>: each Key turned into a 64 × 1 column`;
      put('kth', { x: SL0, y: KT0 - 44 }); mv(A, 'kth', { o: 1 }, 400, 300);
      for (let i = 0; i < T; i++) {
        put('lb' + i, { x: slot(i) - 28, y: KT0 - 18 }); mv(A, 'lb' + i, { o: i <= j ? 1 : 0.35 }, 400, 300);
        if (i > j) { put('fs' + i, { x: slot(i) - 9, y: KT0 }); mv(A, 'fs' + i, { o: 1 }, 400, 300); continue; }
        put('kt' + i, { x: NX.k, y: barY(i), w: L64, r: 0 }); if (A) put('kt' + i, { o: 1 });
        mv(A, 'kt' + i, Object.assign(col(slot(i), KT0, Z64), { o: 1 }), 1100, 400 + i * 90);
      }
      const t1 = 400 + (j + 1) * 90 + 1100;
      put('qa', { x: NX.q, y: barY(j), w: L64 }); if (A) put('qa', { o: 1 });
      mv(A, 'qa', { x: QA, y: KT0 + Z64 / 2 - BH / 2, w: Z64, o: 1 }, 900, t1);
      put('qal', { x: QA, y: KT0 + Z64 / 2 - BH / 2 - 22 }); mv(A, 'qal', { o: 1 }, 400, t1 + 600);
      put('tx', { x: QA + Z64 + 10, y: KT0 + Z64 / 2 - 14 }); mv(A, 'tx', { o: 1 }, 400, t1 + 700);
      put('lraw', { x: SL0 - 158, y: TY.raw }); mv(A, 'lraw', { o: 1 }, 400, t1 + 900);
      for (let i = 0; i <= j; i++) { put('raw' + i, { x: slot(i) - 25, y: TY.raw - (A ? 14 : 0) }); mv(A, 'raw' + i, { y: TY.raw, o: 1 }, 450, t1 + 1000 + i * 120); }
      return;
    }
    if (s === 7) {
      put('lsc', { x: SL0 - 158, y: TY.sc }); mv(A, 'lsc', { o: 1 }, 400);
      for (let i = 0; i <= j; i++) { put('sc' + i, { x: slot(i) - 25, y: TY.raw }); mv(A, 'sc' + i, { y: TY.sc, o: 1 }, 600, 200 + i * 60); }
      const t1 = 300 + (j + 1) * 60 + 700;
      for (let i = j + 1; i < T; i++) { put('sc' + i, { x: slot(i) - 25, y: TY.sc }); mv(A, 'sc' + i, { o: 1 }, 400, t1); }
      if (j < T - 1) { put('mask', { x: SL0 + 4, y: TY.pc + 36 }); mv(A, 'mask', { o: 1 }, 400, t1); }
      const t2 = t1 + (j < T - 1 ? 900 : 200);
      put('lpc', { x: SL0 - 158, y: TY.pc }); mv(A, 'lpc', { o: 1 }, 400, t2);
      for (let i = 0; i < T; i++) { put('pc' + i, { x: slot(i) - 25, y: TY.sc }); mv(A, 'pc' + i, { y: TY.pc, o: i <= j ? 1 : 0.45 }, 700, t2 + 200); }
      put('tot', { x: SL0 - 158, y: TY.pc + 24 }); mv(A, 'tot', { o: 1 }, 400, t2 + 1000);
      put('rest', { x: SL0 + 4, y: TY.pc + 36 }); if (j === T - 1) mv(A, 'rest', { o: 1 }, 400, t2 + 1200);
      return;
    }
    if (s === 8) { // each Value × its percentage (outlined in the percentage's color), then all added: head 1's output for the token
      fade(A, ['qa', 'qal', 'tx', 'lraw', 'lsc', 'lpc', 'tot', 'mask', 'rest'], 0, 500);
      for (let i = 0; i < T; i++) { fade(A, ['kt' + i, 'raw' + i, 'sc' + i], 0, 500); if (i > j) fade(A, ['pc' + i, 'fs' + i, 'lb' + i], 0.0, 500); mv(A, 'k' + i, { o: 0.22 }, 500); mv(A, 'v' + i, { o: i <= j ? 1 : 0.22 }, 500); }
      at(500, () => { const k = E('kth'); if (k) k.innerHTML = `<b class="rw-cv">Values</b> of the witnesses × their percentages = <b class="rw-cv">weighted Values</b>`; });
      for (let i = 0; i <= j; i++) {
        put('vt' + i, { x: NX.v, y: barY(i), w: L64, r: 0 }); if (A) later(500, () => put('vt' + i, { o: 1 }));
        mv(A, 'vt' + i, Object.assign(col(slot(i), KT0, Z64), { o: 1 }), 1100, 600 + i * 90);
        at(600 + i * 90 + 1100, () => { outline('vt' + i, NT.viz.shareCol(att(j)[i])); outline('pc' + i, NT.viz.shareCol(att(j)[i])); });
      }
      const t1 = 600 + (j + 1) * 90 + 1200;
      for (let i = 0; i <= j; i++) { // the percentages move up under their Values, with × between
        mv(A, 'pc' + i, { y: WY.pc }, 700, t1);
        put('px' + i, { x: slot(i) - 7, y: WY.x - 6 }); mv(A, 'px' + i, { o: 1 }, 400, t1 + 500);
      }
      const t2 = t1 + 1100;
      for (let i = 0; i <= j; i++) { // the weighted Values drop below the percentages
        put('vw' + i, Object.assign(col(slot(i), KT0, Z64), {})); mv(A, 'vw' + i, Object.assign(col(slot(i), WY.w, Z64), { o: 1 }), 900, t2 + i * 70);
        at(t2 + i * 70, () => outline('vw' + i, NT.viz.shareCol(att(j)[i])));
        if (i < j) { put('pp' + i, { x: slot(i) + SLW / 2 - 7, y: WY.w + Z64 / 2 - 14 }); mv(A, 'pp' + i, { o: 1 }, 400, t2 + 900); }
      }
      const t3 = t2 + 900 + (j + 1) * 70 + 300;
      for (let i = 0; i <= j; i++) flash(A, 'vw' + i, t3 + i * 160); // added left to right
      const t4 = t3 + (j + 1) * 160 + 300;
      put('teq', { x: SUMC + 22, y: WY.w + Z64 / 2 - 14 }); mv(A, 'teq', { o: 1 }, 400, t4);
      put('ns', Object.assign(col(SUMC, WY.w, Z64), {})); mv(A, 'ns', { o: 1 }, 600, t4);
      mv(A, 'ns', { x: SL0 + 10, y: NOTEY, w: Z64, r: 0, o: 1 }, 1000, t4 + 1100);
      put('nb', { x: SL0 + 10, y: NOTEY, w: Z64 }); mv(A, 'nb', { o: 1 }, 300, t4 + 2100); mv(A, 'ns', { o: 0 }, 300, t4 + 2200);
      put('nl', { x: SL0 + Z64 + 22, y: NOTEY - 1 }); mv(A, 'nl', { o: 1 }, 400, t4 + 2100);
      return;
    }
    if (s === 9) { // every token does the same: the attention grid, then head 1's output for every token
      const gone = ['kth', 'teq', 'nb', 'nl', 'ns', 'div', 'band', 'hq', 'hk', 'hv'];
      for (let i = 0; i < T; i++) gone.push('q' + i, 'k' + i, 'v' + i, 'vt' + i, 'vw' + i, 'pc' + i, 'px' + i, 'lb' + i, 'fs' + i, 'pp' + i);
      fade(A, gone, 0, 500);
      put('hg', { x: GX(0), y: 2 }); mv(A, 'hg', { o: 1 }, 400, 500);
      for (let c = 0; c < T; c++) { put('gl' + c, { x: GX(c), y: TOP - 18 }); mv(A, 'gl' + c, { o: 1 }, 400, 500); }
      for (let r = 0; r < T; r++) for (let c = 0; c < T; c++) { put(`g${r}_${c}`, { x: GX(c), y: rowY(r) + 1 }); mv(A, `g${r}_${c}`, { o: 1 }, 300, 700 + r * 110 + (c <= r ? c * 12 : 120)); }
      const t1 = 700 + T * 110 + 600;
      put('hgo', { x: GOUT - 30, y: 14 }); mv(A, 'hgo', { o: 1 }, 400, t1);
      for (let i = 0; i < T; i++) { put('go' + i, { x: GOUT - (A ? 20 : 0), y: barY(i), w: L64 }); mv(A, 'go' + i, { x: GOUT, o: 1 }, 400, t1 + i * 90); flash(A, 'go' + i, t1 + i * 90 + 300); }
      at(t1, () => svg(arrowDefs + rows((i) => `<path d="M${GX(T - 1) + 34} ${barY(i) + BH / 2} H${GOUT - 8}" class="rw-ln rw-lnv" marker-end="url(#${P}ar)"/>`), A));
      return;
    }
    if (s === 10) { // 12 heads: head 1's outputs slide into lane 1, the others fly in from the right with ‖, then they join
      svg('', false); const gone = ['hg', 'hgo']; for (let c = 0; c < T; c++) { gone.push('gl' + c); for (let r = 0; r < T; r++) gone.push(`g${r}_${c}`); } fade(A, gone, 0, 500);
      for (let k = 0; k < 12; k++) { put('ln' + k, { x: LX(k), y: barY(0) }); mv(A, 'ln' + k, { o: 1 }, 400, 400); put('lh' + k, { x: LX(k), y: 46 }); mv(A, 'lh' + k, { o: 1 }, 400, 400); }
      for (let i = 0; i < T; i++) { put('hs0_' + i, { x: GOUT, y: barY(i), w: L64 }); if (A) later(500, () => put('hs0_' + i, { o: 1 })); mv(A, 'go' + i, { o: 0 }, 300, 500); mv(A, 'hs0_' + i, { x: LX(0), o: 1 }, 900, 700); }
      put('hln', { x: LX(0), y: 8 }); mv(A, 'hln', { o: 1 }, 400, 400);
      const t1 = 1700;
      for (let k = 1; k < 12; k++) {
        const dl = t1 + (k - 1) * 420;
        for (let i = 0; i < T; i++) { put(`hs${k}_${i}`, { x: SW + 20, y: barY(i), w: L64 }); mv(A, `hs${k}_${i}`, { x: LX(k), o: 1 }, 700, dl + i * 15); }
        put('cc' + (k - 1), { x: LX(k - 1) + L64 - 1, y: rowY(0) }); mv(A, 'cc' + (k - 1), { o: 1 }, 300, dl + 500);
      }
      const t2 = t1 + 11 * 420 + 900;
      for (let k = 0; k < 11; k++) mv(A, 'cc' + k, { o: 0 }, 400, t2);
      mv(A, 'hln', { o: 0 }, 400, t2);
      for (let k = 0; k < 12; k++) { mv(A, 'ln' + k, { o: 0 }, 400, t2); mv(A, 'lh' + k, { o: 0 }, 400, t2); for (let i = 0; i < T; i++) mv(A, `hs${k}_${i}`, { x: AX.cat + k * L64 }, 900, t2 + 400); }
      put('hcat', { x: AX.cat, y: 14 }); mv(A, 'hcat', { o: 1 }, 400, t2 + 1300);
      return;
    }
    if (s === 11) { // × W_O (the Lead Detective) = attention output; then + the Input Vector = the updated vector
      put('wo', { x: AX.wo, y: matY(L768) }); mv(A, 'wo', { o: 1 }, 600, 200);
      put('x2', { x: AX.cat + L768 + 8, y: midY - 14 }); put('e2', { x: AX.wo + L768 + 10, y: midY - 14 }); fade(A, ['x2', 'e2'], 1, 400, 300);
      at(500, () => svg(linesTo(AX.cat + L768, AX.wo, L768, AX.out, 'v'), A));
      put('hao', { x: AX.out, y: 14 }); mv(A, 'hao', { o: 1 }, 400, 900);
      for (let i = 0; i < T; i++) { put('ao' + i, { x: AX.out - (A ? 20 : 0), y: barY(i), w: L768 }); mv(A, 'ao' + i, { x: AX.out, o: 1 }, 600, 900 + i * 60); }
      const t1 = 900 + T * 60 + 1400;
      at(t1, () => svg('', A)); fade(A, ['wo', 'x2', 'e2', 'hcat'], 0, 500, t1);
      for (let k = 0; k < 12; k++) for (let i = 0; i < T; i++) mv(A, `hs${k}_${i}`, { o: 0 }, 500, t1);
      for (let i = 0; i < T; i++) mv(A, 'ao' + i, { x: AX.cat }, 1000, t1 + 500); mv(A, 'hao', { x: AX.cat }, 1000, t1 + 500);
      const t2 = t1 + 1600;
      put('pl1', { x: AX.in - 30, y: rowY(0) }); mv(A, 'pl1', { o: 1 }, 400, t2);
      put('hin2', { x: AX.in, y: 14 }); mv(A, 'hin2', { o: 1 }, 400, t2);
      for (let i = 0; i < T; i++) { put('in2_' + i, { x: AX.in, y: barY(i) + (A ? 16 : 0), w: L768 }); mv(A, 'in2_' + i, { y: barY(i), o: 1 }, 500, t2 + i * 40); }
      const t3 = t2 + 900;
      put('eq1', { x: AX.upd - 30, y: rowY(0) }); mv(A, 'eq1', { o: 1 }, 400, t3);
      put('hup', { x: AX.upd, y: 14 }); mv(A, 'hup', { o: 1 }, 400, t3);
      for (let i = 0; i < T; i++) { put('up' + i, { x: AX.upd - (A ? 20 : 0), y: barY(i), w: L768 }); mv(A, 'up' + i, { x: AX.upd, o: 1 }, 600, t3 + i * 50); }
      return;
    }
    if (s === 12) { // the MLP expands each updated vector to 3,072 numbers (4× as long), then GELU
      svg('', false); const gone = ['hao', 'hin2', 'hup', 'pl1', 'eq1']; for (let i = 0; i < T; i++) gone.push('ao' + i, 'in2_' + i); fade(A, gone, 0, 500);
      for (let i = 0; i < T; i++) { put('u' + i, { x: AX.upd, y: barY(i), w: L768 }); if (A) put('u' + i, { o: 1 }); mv(A, 'up' + i, { o: 0 }, 1, 400); mv(A, 'u' + i, { x: 110, o: 1 }, 1100, 500 + i * 25); }
      put('hup2', { x: 110, y: 14 }); mv(A, 'hup2', { o: 1 }, 400, 1300);
      put('m1', { x: 450, y: midY - L768 / 8 - 6 }); mv(A, 'm1', { o: 1 }, 600, 1600);
      put('x3', { x: 412, y: midY - 14 }); fade(A, ['x3'], 1, 400, 1700);
      const t1 = 2900; // the hidden layer grows out of each vector: 768 → 3,072 numbers
      fade(A, ['m1', 'x3', 'hup2'], 0, 500, t1);
      for (let i = 0; i < T; i++) { put('hp' + i, { x: 110, y: barY(i), w: L768 }); mv(A, 'hp' + i, { o: 1 }, 400, t1); mv(A, 'u' + i, { o: 0 }, 400, t1); mv(A, 'hp' + i, { w: L3072 }, 1400, t1 + 400 + i * 30); }
      put('hhid', { x: 110, y: 14 }); mv(A, 'hhid', { o: 1 }, 400, t1 + 600);
      const t2 = t1 + 2400; // GELU sweeps across and changes the values in place
      put('gelu', { x: 70, y: rowY(0) }); mv(A, 'gelu', { o: 1 }, 300, t2); mv(A, 'gelu', { x: 110 + L3072 + 4 }, 1500, t2 + 300); mv(A, 'gelu', { o: 0 }, 400, t2 + 2000);
      for (let i = 0; i < T; i++) { put('ha' + i, { x: 110, y: barY(i), w: L3072 }); mv(A, 'ha' + i, { o: 1 }, 900, t2 + 400); mv(A, 'hp' + i, { o: 0 }, 900, t2 + 900); }
      return;
    }
    if (s === 13) { // × W2: each 3,072-number vector shrinks back to 768 (the MLP output); + the updated vector = this block's output
      put('m2', { x: 600, y: midY - L768 / 2 }); mv(A, 'm2', { o: 1 }, 600, 200);
      put('x4', { x: 572, y: midY - 14 }); fade(A, ['x4'], 1, 400, 300);
      const t1 = 1500;
      fade(A, ['m2', 'x4', 'hhid'], 0, 500, t1);
      for (let i = 0; i < T; i++) { mv(A, 'ha' + i, { w: L768 }, 1300, t1 + i * 30); put('f' + i, { x: 110, y: barY(i), w: L768 }); mv(A, 'f' + i, { o: 1 }, 600, t1 + 1000 + i * 30); mv(A, 'ha' + i, { o: 0 }, 500, t1 + 1300 + i * 30); }
      put('hf', { x: 110, y: 14 }); mv(A, 'hf', { o: 1 }, 400, t1 + 1200);
      const t2 = t1 + 2200;
      put('pl2', { x: 404, y: rowY(0) }); mv(A, 'pl2', { o: 1 }, 400, t2);
      put('hu3', { x: 432, y: 14 }); mv(A, 'hu3', { o: 1 }, 400, t2);
      for (let i = 0; i < T; i++) { mv(A, 'u' + i, { x: 432, y: barY(i) + (A ? 16 : 0), o: 0 }, 1); mv(A, 'u' + i, { y: barY(i), o: 1 }, 500, t2 + 50 + i * 40); }
      const t3 = t2 + 1000;
      put('eq2', { x: 726, y: rowY(0) }); mv(A, 'eq2', { o: 1 }, 400, t3);
      put('hbo', { x: 752, y: 14 }); mv(A, 'hbo', { o: 1 }, 400, t3);
      for (let i = 0; i < T; i++) { put('bo' + i, { x: 752 - (A ? 20 : 0), y: barY(i), w: L768 }); mv(A, 'bo' + i, { x: 752, o: 1 }, 600, t3 + 100 + i * 50); }
      return;
    }
    if (s === 14) { // everything but the tokens and this block's output fades; it moves left; the later blocks' outputs fly in, one after another
      const gone = ['hf', 'hu3', 'pl2', 'eq2', 'hbo']; for (let i = 0; i < T; i++) gone.push('f' + i, 'u' + i); fade(A, gone, 0, 500);
      const L = leftBlock(), RX = 460, BX = 790; const bhl = E('bhl'), bhr = E('bhr');
      if (bhl) bhl.innerHTML = `After Block ${L} <small>1 × 768</small>`;
      if (st.room < 12) for (let i = 0; i < T; i++) { mv(A, 'bo' + i, { x: 110 }, 1000, 600); put(`bc${L}_${i}`, { x: 110, y: barY(i), w: L768 }); mv(A, `bc${L}_${i}`, { o: 1 }, 1, 1650); mv(A, 'bo' + i, { o: 0 }, 1, 1700); }
      else for (let i = 0; i < T; i++) { mv(A, 'bo' + i, { x: RX }, 1000, 600); put(`bc11_${i}`, { x: 110, y: barY(i), w: L768 }); mv(A, `bc11_${i}`, { o: 1 }, 600, 1400); mv(A, 'bo' + i, { o: 0 }, 1, 1700); put(`bc12_${i}`, { x: RX, y: barY(i), w: L768 }); mv(A, `bc12_${i}`, { o: 1 }, 1, 1650); }
      put('bhl', { x: 110, y: 22 }); mv(A, 'bhl', { o: 1 }, 400, 1000);
      put('ba0', { x: 410, y: rowY(0) }); mv(A, 'ba0', { o: 1 }, 400, 1700); put('bal', { x: 318, y: TOP + T * ROW + 6 }); mv(A, 'bal', { o: 1 }, 400, 1700);
      put('bhr', { x: RX, y: 22 }); mv(A, 'bhr', { o: 1 }, 400, 1900);
      let dl = 1900;
      for (let bb = L + 1; bb <= 12; bb++) { // each later block's output flies in from the right and replaces the one before
        if (st.room === 12) break;
        const prev = bb - 1, here = bb;
        at(dl, () => { if (bhr) bhr.innerHTML = `After Block ${here} <small>1 × 768</small>`; });
        for (let i = 0; i < T; i++) { put(`bc${here}_${i}`, { x: SW + 20, y: barY(i), w: L768 }); mv(A, `bc${here}_${i}`, { x: RX, o: 1 }, 700, dl + i * 12); if (prev > L) mv(A, `bc${prev}_${i}`, { o: 0 }, 300, dl + 500); }
        dl += A ? 750 : 0;
      }
      if (st.room === 12 && bhr) bhr.innerHTML = 'After Block 12 <small>1 × 768</small>';
      for (let i = 0; i < T; i++) E('t' + i).classList.toggle('tr-me', i === T - 1);
      put('rk', { x: BX, y: TOP + 20 }); mv(A, 'rk', { o: 1 }, 500, dl + 400);
      const rk = E('rk'); if (rk) rk.style.width = SW - BX - 20 + 'px';
      put('fly', { x: RX, y: barY(T - 1), w: L768 }); if (A) later(dl + 900, () => put('fly', { o: 1 }));
      mv(A, 'fly', { x: BX + 15, y: TOP + 20 + 37, o: 1 }, 1100, dl + 1000); mv(A, 'fly', { o: 0 }, 300, dl + 2300);
      const go = E('goOut'); if (go) go.onclick = () => NT.goTab('pick');
    }
  }

  // ---------- captions (two lines: a bold title and one plain line) ----------
  function cap(s) {
    const w = `“${W[st.q]}”`, r = st.room;
    return [
      [`Each token enters Block ${r} as an Input Vector (its Case File): 1 × 768.`, r === 1 ? 'In Block 1, the Input Vector is the token’s embedding vector + its position vector.' : `These are Block ${r - 1}’s outputs, which already carry context.`],
      ['Input Vector × the Query matrix W_Q = a Query vector (the Question).', 'One learned 768 × 64 matrix for every token turns 768 numbers into 64. The Query is 12 times shorter.'],
      ['Input Vector × the Key matrix W_K = a Key vector (the Statement).', 'A second learned 768 × 64 matrix, the same for every token.'],
      ['Input Vector × the Value matrix W_V = a Value vector (the Evidence Packet).', 'A third learned 768 × 64 matrix. Every token now has its own Query, Key and Value.'],
      ['Q, K and V are ready, so the Input Vectors step aside.', 'Same three matrices, different Input Vectors, so every token’s Q, K and V are different.'],
      [`Rotate the Keys into Kᵀ, then multiply by the Query of ${w}.`, `Each Key becomes a 64 × 1 column. Q × Kᵀ: one score per witness. Later tokens can’t be witnesses.`],
      ['Scale, mask and Softmax give each witness’s Relevance.', 'Divide by √64 = 8, block later tokens, then Softmax turns the scores into percentages totaling 100%.'],
      [`Multiply each Value by its percentage, then add: head 1’s output for ${w}.`, 'Each witness’s Value × its weight, all added together: one 1 × 64 vector (Detective 1’s Note).'],
      ['Every token does the same, using only itself and earlier tokens.', 'Each grid row is one token’s attention percentages (totaling 100%); each gives one 1 × 64 head output.'],
      ['All 12 heads’ outputs are concatenated (‖) into one vector per token.', '12 heads × 64 numbers = 768. Concatenated means joined end to end, not added.'],
      ['The output projection W_O (the Lead Detective), then an addition.', 'W_O, a learned 768 × 768 matrix, mixes the 12 heads’ outputs; the result is added to the Input Vector.'],
      ['The MLP (the Forensics Expert) stretches each vector to 3,072 numbers.', '× a learned 768 × 3,072 matrix W1: four times as long. Then GELU keeps positive values and mostly silences negative ones.'],
      ['…then shrinks them back to 768 and adds the result.', `× a learned 3,072 × 768 matrix W2 gives the 1 × 768 MLP output, added to the updated vector: Block ${r}’s output.`],
      ['Twelve blocks in sequence: each block’s output is the next block’s input.', 'Every block adds its own attention and MLP updates. After Block 12, the last token’s vector scores every token.'],
    ][s - 1];
  }

  // ---------- the panel ----------
  function shell(host) {
    host.innerHTML = `<details class="rw-tw" id="${P}tw"${st.open ? ' open' : ''}><summary>How it really works</summary>
      <div class="rw-panel"><div class="guide rw-guide"><div class="fl-ctl"><button class="btn" id="${P}rew" title="First screen">⏮</button><button class="btn" id="${P}back">◀ Back</button><button class="btn primary" id="${P}next">Next ▶</button><button class="btn" id="${P}play">▶ Play</button><button class="btn" id="${P}rep" title="Replay this screen">↻</button></div><div class="fl-cap fixed" id="${P}cap"></div></div>
      <div class="rw-bar"><span class="rw-dots" id="${P}dots"></span><span class="rw-src" id="${P}src"></span></div>
      <div class="fl-box rw-box" id="${P}box"></div>
      <div class="tr-legend" id="${P}leg">Every stripe, number and matrix picture here is <span class="tr-real">real GPT-2</span> for the story sentence; head 1 is the story’s Detective 1. Pale = near 0; strong color = large positive; gray = large negative. Matrix pictures show every 4th–8th row and column. GPT-2 also rescales each vector before its matrices (included in the numbers, not drawn).</div></div></details>`;
    const tw = E('tw');
    tw.addEventListener('toggle', () => { st.open = tw.open; if (tw.open) { Promise.resolve(show(true)).then(() => requestAnimationFrame(() => { fit(); tw.scrollIntoView({ behavior: 'smooth', block: 'start' }); })); } else { pause(); st.tk++; } });
    E('rew').onclick = () => { pause(); go(1, true); };
    E('back').onclick = () => { pause(); if (st.shown > 1) go(st.shown - 1, false); };
    E('next').onclick = () => { pause(); if (st.shown < N) go(st.shown + 1, true); };
    E('rep').onclick = () => { pause(); show(true, true); };
    E('play').onclick = () => (st.playing ? pause() : play());
  }
  const go = (s, animate) => { st.target = s; show(animate); };
  const DUR = [2000, 3400, 3400, 3400, 2600, 6000, 5200, 10500, 4800, 9200, 7400, 5800, 6400, 7000];
  function play() { st.playing = true; E('play').textContent = '⏸ Pause'; const tick = () => { st.timer = setTimeout(() => { if (!st.playing) return; if (st.shown < N) { go(st.shown + 1, true); tick(); } else pause(); }, DUR[st.shown - 1]); }; tick(); }
  function pause() { st.playing = false; clearTimeout(st.timer); const p = E('play'); if (p) p.textContent = '▶ Play'; }

  async function show(animate, replay) {
    const box = E('box'); if (!box || !st.open) return;
    if (!R) { box.innerHTML = NT.pendingHTML ? NT.pendingHTML('Getting GPT-2’s real numbers…') : 'Loading…'; box.style.height = ''; await load(); if (!R) { box.innerHTML = '<div class="emptynote">The real-number trace could not be loaded.</div>'; return; } }
    await loadW(st.room);
    const s = st.target || st.list[0], key = `${st.room}|${st.q}`;
    st.tk++;
    if (st.built !== key || replay || !animate || st.shown !== s - 1) { // draw the scene, jump through screens 1 … s−1, then play s
      box.innerHTML = `<div class="rw-scene" id="${P}sc" style="width:${SW}px;height:${H}px"><svg class="rw-svg" id="${P}svg" width="${SW}" height="${H}" viewBox="0 0 ${SW} ${H}"></svg>${build()}</div>`;
      Object.keys(cur).forEach((k) => delete cur[k]);
      box.querySelectorAll('.rw-scene > *:not(svg)').forEach((el) => { el.style.opacity = 0; });
      paint(); st.built = key; fit();
      for (let t = 1; t < s; t++) run(t, false);
      box.querySelectorAll('.rw-tok').forEach((el) => (el.onclick = () => { st.q = +el.dataset.i; show(true, true); }));
    }
    run(s, !!animate);
    st.shown = s;
    const [t, d] = cap(s);
    E('cap').innerHTML = `<div class="fl-ch"><b>${esc(t)}</b></div><div class="fl-cd">${esc(d)}</div>`;
    E('dots').innerHTML = Array.from({ length: N }, (_, k) => `<button class="rw-dot ${k + 1 === s ? 'on' : ''} ${st.list.includes(k + 1) ? 'mine' : ''}" data-s="${k + 1}" title="${k + 1}. ${NAMES[k]}">${k + 1}</button>`).join('') + '<span class="rw-dkey">tinted = this story step</span>';
    E('dots').querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { pause(); go(+b.dataset.s, true); }));
    E('src').textContent = `Block ${st.room} · head 1 · ${NAMES[s - 1]}`;
    E('back').disabled = s === 1; E('rew').disabled = s === 1; E('next').disabled = s === N;
  }
  function fit() {
    const box = E('box'), sc = E('sc'); if (!box || !sc) return;
    const g = E('tw'), above = g ? box.getBoundingClientRect().top - g.getBoundingClientRect().top : 130;
    const avail = window.innerHeight - above - 44;
    const k = Math.max(0.5, Math.min(1.25, box.clientWidth / SW, avail > 250 ? avail / H : 9));
    sc.style.transform = `translate(${Math.max(0, (box.clientWidth - SW * k) / 2)}px,0) scale(${k})`; box.style.height = Math.ceil(H * k) + 'px';
  }
  window.addEventListener('resize', () => { if (E('sc')) fit(); });

  // ---------- the story calls these ----------
  NT.really = {
    mount(host) { if (!host) return; st.built = ''; st.shown = 0; shell(host); if (st.open) show(false); },
    // the detective story moved: follow its step, block and investigated token
    sync(key, room, q) {
      const changed = room !== st.room || q !== st.q || key !== st.key;
      st.key = key; st.room = room; st.q = q; st.list = MAP[key] || [1];
      if (!changed) return;
      pause(); st.target = st.list[0];
      if (st.open) show(true);
    },
  };
})();
