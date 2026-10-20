/* LLMLab — core: data, tokenizer, shared state (sentence, temperature, Top-K), distributions, helpers */
'use strict';
const NT = (window.NT = {});
(() => {
  const E = window.EMBED_DATA, L = window.LAB;

  // ---------- binary helpers ----------
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  function f16(s) {
    const u8 = b64(s), u16 = new Uint16Array(u8.buffer, u8.byteOffset, u8.byteLength / 2), out = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) {
      const h = u16[i], s1 = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023;
      out[i] = e === 0 ? s1 * Math.pow(2, -14) * (f / 1024) : e === 31 ? (f ? NaN : s1 * Infinity) : s1 * Math.pow(2, e - 15) * (1 + f / 1024);
    }
    return out;
  }
  NT.f16 = f16; NT.b64 = b64;

  // ---------- GPT-2 tokenizer (byte-level BPE) ----------
  const TOKENS = E.tokens;
  const ENCODER = new Map(TOKENS.map((t, i) => [t, i]));
  const BYTE_ENC = (() => {
    const bs = []; for (let i = 33; i <= 126; i++) bs.push(i); for (let i = 161; i <= 172; i++) bs.push(i); for (let i = 174; i <= 255; i++) bs.push(i);
    const cs = bs.slice(); let n = 0;
    for (let b = 0; b < 256; b++) if (!bs.includes(b)) { bs.push(b); cs.push(256 + n); n++; }
    const m = {}; bs.forEach((b, i) => { m[b] = String.fromCharCode(cs[i]); }); return m;
  })();
  const BYTE_DEC = Object.fromEntries(Object.entries(BYTE_ENC).map(([b, c]) => [c, +b]));
  const RANKS = new Map(E.merges.map((m, i) => [m, i]));
  const PAT = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
  const cache = new Map();
  function bpe(tok) {
    if (cache.has(tok)) return cache.get(tok);
    let w = Array.from(tok);
    while (w.length > 1) {
      let best = -1, br = Infinity;
      for (let i = 0; i < w.length - 1; i++) { const r = RANKS.get(w[i] + ' ' + w[i + 1]); if (r !== undefined && r < br) { br = r; best = i; } }
      if (best < 0) break;
      const a = w[best], b = w[best + 1], nw = [];
      for (let i = 0; i < w.length; i++) { if (i < w.length - 1 && w[i] === a && w[i + 1] === b) { nw.push(a + b); i++; } else nw.push(w[i]); }
      w = nw;
    }
    cache.set(tok, w); return w;
  }
  const enc = new TextEncoder();
  NT.byteStr = (s) => Array.from(enc.encode(s), (b) => BYTE_ENC[b]).join('');
  NT.encode = (text) => {
    const ids = [];
    for (const m of text.matchAll(PAT)) for (const p of bpe(NT.byteStr(m[0]))) ids.push(ENCODER.get(p));
    return ids;
  };
  NT.tokText = (id) => new TextDecoder().decode(Uint8Array.from(Array.from(TOKENS[id], (c) => BYTE_DEC[c] ?? 63)));
  NT.decode = (ids) => ids.map(NT.tokText).join('');
  NT.tokBytes = (id) => TOKENS[id].length; // how many bytes of text this token covers
  NT.tokenIdOf = (str) => { const k = ENCODER.get(NT.byteStr(str)); return k === undefined ? -1 : k; }; // exact token lookup
  NT.V = NT.vocabSize = TOKENS.length;
  NT.ALL = TOKENS.length;
  // rank (1-based) of the merge "a + b" in GPT-2's list of 50,000 merges, or 0 if GPT-2 never makes that merge
  NT.mergeRank = (a, b) => { const r = RANKS.get(NT.byteStr(a) + ' ' + NT.byteStr(b)); return r === undefined ? 0 : r + 1; };
  NT.mergeAt = (i) => { const [a, b] = E.merges[i].split(' '); return [a, b].map((s) => new TextDecoder().decode(Uint8Array.from(Array.from(s), (c) => BYTE_DEC[c] ?? 63))); };
  NT.MERGES = E.merges.length;

  // ---------- embedding rows: exact (float16) for the textbook examples, 4-bit for every other token (loaded in idle time) ----------
  const EXACT = new Map();
  { const r = f16(L.exact.rows); L.exact.ids.forEach((id, i) => EXACT.set(id, r.slice(i * 768, i * 768 + 768))); }
  let EMB = null;
  function loadEmb4() {
    if (EMB) return EMB;
    EMB = new Promise((resolve, reject) => {
      const go = async () => {
        try {
          const gz = b64(window.EMB4); const buf = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
          const n = NT.vocabSize; window.EMB4 = null; NT.emb4State = 'ready';
          resolve({ scales: new Float32Array(buf, 0, n), packed: new Uint8Array(buf, n * 4) });
        } catch (e) { reject(e); }
      };
      if (window.EMB4) return go();
      const s = document.createElement('script'); s.src = './data/emb4.js'; s.onload = go; s.onerror = () => reject(new Error('emb4'));
      NT.emb4State = 'loading'; document.head.appendChild(s);
    });
    return EMB;
  }
  NT.warmEmb = () => { loadEmb4().catch(() => {}); };
  NT.embData = () => loadEmb4();
  NT.isExact = (id) => EXACT.has(id);
  NT.rowNow = (id) => EXACT.get(id) || null;
  NT.row = async (id) => {
    if (EXACT.has(id)) return EXACT.get(id);
    const e = await loadEmb4(), s = e.scales[id], out = new Float32Array(768), o = id * 384;
    for (let k = 0; k < 384; k++) { const b = e.packed[o + k]; out[2 * k] = ((b >> 4) - 8) * s; out[2 * k + 1] = ((b & 15) - 8) * s; }
    return out;
  };
  const WPE = f16(L.wpe);
  NT.posRow = (p) => WPE.slice(p * 768, p * 768 + 768);
  NT.maxPos = L.wpeFirst;

  // ---------- stored examples ----------
  const EX = {};
  for (const [k, e] of Object.entries(L.examples)) {
    EX[k] = { key: k, text: e.text, ids: e.ids, tokens: e.tokens, T: e.T, next: e.next, raw: e };
    if (e.attn) EX[k].attn = b64(e.attn);
  }
  // final vector, token rows, position rows and the top-15 rows, wherever they were stored
  for (const [k, e] of Object.entries(L.examples)) {
    if (e.final) EX[k].final = f16(e.final);
    if (e.tok) EX[k].tok = f16(e.tok);
    if (e.pos) EX[k].pos = f16(e.pos);
    if (e.topRows) EX[k].topRows = { ids: e.topRows.ids, rows: f16(e.topRows.rows) };
  }
  NT.EX = EX;
  NT.LAB = L;
  // [key, text, label]: the story sentence, then the other stories GPT-2's numbers are stored for (one sentence everywhere: Greg, Oct 13)
  NT.STARTERS = [['story', 'The story: …sat on the left bank of the…'], ['umbrella', 'Umbrella: …it was starting to…'], ['trophy', 'Trophy: …because it was too…'], ['annie', 'Annie’s picnic: …pack a…'], ['river', 'The whole banker sentence']].map(([k, l]) => [k, EX[k].text, l]);
  NT.STORY = 'story';
  NT.attn = (ex, b, h, i, j) => ex.attn[((b * 12 + h) * ex.T + i) * ex.T + j] / 255;
  NT.attnAvg = (ex, b, i, j) => { let s = 0; for (let h = 0; h < 12; h++) s += NT.attn(ex, b, h, i, j); return s / 12; };
  NT.store = L.rounds.store;

  // ---------- shared state: sentence, temperature, Top-K ----------
  NT.TEMPS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  NT.state = { station: 'next', text: EX.story.text, T: 1, K: NT.ALL };
  const S = NT.state;
  const curCache = { text: null, val: null };
  NT.current = () => {
    const text = S.text.replace(/\s+$/, '');
    if (curCache.text === text) return curCache.val;
    const ids = NT.encode(text), key = Object.keys(EX).find((k) => EX[k].text === text) || 'custom';
    curCache.text = text; curCache.val = { text, ids, tokens: ids.map(NT.tokText), key, ex: key === 'custom' ? null : EX[key] };
    return curCache.val;
  };
  // the same shape as NT.current(), for any text (used by flows that replay an earlier sentence)
  NT.curFor = (text) => { text = text.replace(/\s+$/, ''); if (text === NT.current().text) return NT.current(); const ids = NT.encode(text), key = Object.keys(EX).find((k) => EX[k].text === text) || 'custom'; return { text, ids, tokens: ids.map(NT.tokText), key, ex: key === 'custom' ? null : EX[key] }; };
  const listeners = [];
  NT.on = (fn) => listeners.push(fn);
  // ---------- colored bubbles on words added by selection (typed words stay plain) ----------
  // S.marks = [{ s, e, band, tip, gen }] as character offsets into the sentence. Everything on a mark is frozen when it is added.
  S.marks = []; let backText = S.text;
  NT.BANDS = [
    { bg: '#1e8a3a', fg: '#ffffff' }, { bg: '#c6efce', fg: '#0b5a1c' }, { bg: '#ffeb9c', fg: '#6b4a00' },
    { bg: '#ffc7ce', fg: '#8a0010' }, { bg: '#c00000', fg: '#ffffff' }, { bg: '#d5d9e0', fg: '#3f4a5a' },
  ];
  NT.GRAY = 5;
  // finite Top-K: where the rank sits among the K allowed choices, in five 20% bands; Top-K All: fixed rank bands
  NT.rankBand = (rank, K) => {
    if (K >= NT.ALL) return rank <= 1 ? 0 : rank <= 3 ? 1 : rank <= 10 ? 2 : rank <= 50 ? 3 : 4;
    if (rank > K) return NT.GRAY;
    if (K <= 1) return 0;
    return Math.min(4, Math.floor(((rank - 1) / (K - 1)) * 5));
  };
  NT.legendHTML = (K) => {
    const sw = (i, l) => `<span><i style="background:${NT.BANDS[i].bg}"></i>${l || ''}</span>`;
    if (K >= NT.ALL) return `<span class="legend">Top-K is All, so color = GPT-2's rank: ${sw(0, '1st')}${sw(1, '2nd–3rd')}${sw(2, '4th–10th')}${sw(3, '11th–50th')}${sw(4, 'below 50th')}</span>`;
    return `<span class="legend">Color = rank among the ${NT.int(K)} allowed choice${K === 1 ? '' : 's'}: ${sw(0, 'top 20%')}${sw(1)}${sw(2)}${sw(3)}${sw(4, 'bottom 20%')}</span>`;
  };
  const pctTip = (p) => (p >= 0.001 ? (p * 100).toFixed(1) + '%' : p > 0 ? (p * 100).toPrecision(2) + '%' : '0%');
  NT.chancePct = pctTip;
  // hover text for a pick: rank, Top-K and probability (after Temperature and Top-K) as they were when it was added
  NT.pickTip = ({ rank, K, p, T, piece }) => {
    const pre = piece ? `First piece ‘${piece}’ · ` : '';
    if (rank > K) return `${pre}Not allowed at Top-K ${NT.int(K)} (GPT-2 rank ${NT.int(rank)}) · 0% sampling probability`;
    return `${pre}rank ${NT.int(rank)} of ${K >= NT.ALL ? NT.int(NT.ALL) + ' (All)' : NT.int(K) + ' allowed'} · ${pctTip(p)} probability · T ${T <= 1 ? Number(T).toFixed(1) : T}`;
  };
  NT.makeMark = (info, gen) => ({ band: NT.rankBand(info.rank, info.K), tip: NT.pickTip(info), gen });
  function shiftMarks(oldT, newT) {
    if (oldT === newT) return;
    let p = 0; const m = Math.min(oldT.length, newT.length);
    while (p < m && oldT[p] === newT[p]) p++;
    let q = 0; while (q < m - p && oldT[oldT.length - 1 - q] === newT[newT.length - 1 - q]) q++;
    const oe = oldT.length - q, d = newT.length - oldT.length;
    S.marks = S.marks.filter((k) => k.e <= p || k.s >= oe).map((k) => (k.s >= oe && k.e > p ? { ...k, s: k.s + d, e: k.e + d } : k));
  }
  NT.drawBack = () => {
    const el = document.getElementById('sentBack'); if (!el) return;
    const t = backText, ms = S.marks.slice().sort((a, b) => a.s - b.s); let h = '', i = 0;
    ms.forEach((k, j) => { if (k.s < i || k.e > t.length) return; h += NT.esc(t.slice(i, k.s)); const b = NT.BANDS[k.band]; h += `<mark class="bub" data-m="${S.marks.indexOf(k)}" style="background:${b.bg};color:${b.fg};box-shadow:0 0 0 2px ${b.bg}">${NT.esc(t.slice(k.s, k.e))}</mark>`; i = k.e; });
    h += NT.esc(t.slice(i)) + (t.endsWith('\n') ? ' ' : '');
    el.innerHTML = h;
    const ta = document.getElementById('sentence'); if (ta) el.scrollTop = ta.scrollTop;
  };
  // called on every keystroke so typed text shows at once (the textarea's own text is invisible; the colored copy behind it shows)
  NT.syncBack = (text) => { shiftMarks(backText, text); backText = text; NT.drawBack(); };
  NT.setText = (text, how = 'edit', mark = null) => { // how: 'edit' | 'append'; mark: bubble for the appended part
    if (text === S.text && !mark) return;
    const old = backText;
    if (how === 'edit' && !text.startsWith(old.replace(/\s+$/, ''))) S.marks = [];
    shiftMarks(old, text); backText = text;
    if (mark) { let st = 0; while (st < old.length && st < text.length && old[st] === text[st]) st++; while (st < text.length && /\s/.test(text[st])) st++; if (st < text.length) S.marks.push({ ...mark, s: st, e: text.length }); }
    S.text = text; const ta = document.getElementById('sentence'); if (ta && ta.value !== text) { ta.value = text; ta.dispatchEvent(new Event('autosize')); }
    NT.drawBack();
    if (ta && how === 'append') { ta.scrollTop = ta.scrollHeight; }
    listeners.forEach((f) => f('text', how));
  };
  NT.setTK = (T, K) => { if (T != null) S.T = T; if (K != null) S.K = K; listeners.forEach((f) => f('tk')); };
  NT.kLabel = (K) => (K >= NT.ALL ? 'All' : String(K));

  // ---------- next-word distributions ----------
  // full logits come from the stored pack (presets and likely first words) or from the live model
  const FULL = L.full || {};
  const dcache = new Map();
  function makeDist(logits, ids) {
    const d = { key: ids.join(','), logits, _order: null, _rank: null };
    Object.defineProperty(d, 'order', { get() { if (!d._order) { const o = new Int32Array(logits.length); for (let i = 0; i < o.length; i++) o[i] = i; d._order = o.sort((a, b) => logits[b] - logits[a]); } return d._order; } });
    Object.defineProperty(d, 'rank', { get() { if (!d._rank) { const r = new Int32Array(logits.length); d.order.forEach((id, i) => { r[id] = i + 1; }); d._rank = r; } return d._rank; } });
    return d;
  }
  NT.storedDist = (ids) => {
    const k = ids.join(',');
    if (dcache.has(k)) return dcache.get(k);
    const p = FULL[k]; if (!p) return null;
    const q = new Uint16Array(b64(p.d).buffer), lg = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) lg[i] = p.m - q[i] * 0.001;
    const d = makeDist(lg, ids); dcache.set(k, d); return d;
  };
  NT.partialDist = (ids) => { // top-50 only (stored rounds)
    const k = ids.join(','), ex = Object.values(EX).find((e) => e.next && e.ids.join(',') === k), n = NT.store[k] || (ex ? ex.next : null);
    return n ? { partial: true, ids: n.ids, logits: n.logits } : null;
  };
  NT.hasFull = (ids) => !!(FULL[ids.join(',')] || dcache.has(ids.join(',')));
  // async: resolves to a full distribution; uses live GPT-2 when the pack has nothing stored
  NT.dist = async (ids) => {
    const s = NT.storedDist(ids); if (s) return s;
    const k = ids.join(',');
    if (dcache.has(k)) return dcache.get(k);
    const lg = await NT.live.logits(ids);
    const d = makeDist(lg, ids); dcache.set(k, d); return d;
  };
  // probabilities for the top-K words at temperature T (K >= V means every word)
  NT.probs = (d, T, K) => {
    let ids, lg;
    if (d.partial) { K = Math.min(K, d.ids.length); ids = d.ids.slice(0, K); lg = d.logits.slice(0, K); }
    else { K = Math.min(K, d.logits.length); ids = Array.from(d.order.subarray(0, K)); lg = ids.map((i) => d.logits[i]); }
    const z = lg.map((x) => x / T); let m = -Infinity; for (const x of z) if (x > m) m = x;
    const p = new Float64Array(K); let s = 0; for (let i = 0; i < K; i++) { p[i] = Math.exp(z[i] - m); s += p[i]; }
    for (let i = 0; i < K; i++) p[i] /= s;
    return { ids, logits: lg, p, K };
  };
  NT.softmax = (logits, T = 1, K = logits.length) => { const z = logits.slice(0, K).map((x) => x / T), m = Math.max(...z), e = z.map((x) => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map((x) => x / s); };
  NT.pickIndex = (p, r) => { let c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (r < c) return i; } return p.length - 1; };

  // ---------- DOM helpers ----------
  NT.$ = (s, root = document) => root.querySelector(s);
  NT.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  NT.show = (s) => NT.esc(String(s).replace(/\n/g, '⏎'));
  NT.pct = (p, d = 1) => (p * 100).toFixed(d) + '%';
  NT.num = (x, d = 2) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(d);
  NT.int = (x) => x.toLocaleString('en-US');
  // ---------- one color per concept (Oct 19 consistency pass) — every tab draws from here (CSS mirrors these as --q, --k, …) ----------
  // UI accent purple is for buttons, tabs, links and the + / = signs only. Vectors of plain numbers keep the red–yellow–green scale (NT.div).
  NT.C = {
    accent: '#5b38d1',
    q: '#1f63d6', k: '#e07a10', v: '#9c2fb5',   // Query / Question · Key / Statement · Value / Evidence (and everything made from Values: notes, head outputs, attention output)
    head: '#7a5230',                            // a Detective / attention head as a unit (12 per block)
    mlp: '#0e8a8c',                             // the Forensics Expert / MLP (feed-forward) and its output
    last: '#c2185b',                            // the last token: the one whose next token is being predicted
    tokGray: '#9aa3b2',
    tok: ['#2f4a7a', '#c95f8f', '#6e8a12', '#3d8fb0'], // content words, in order of first appearance (repeats share a color)
  };
  // token identity: content words get NT.C.tok colors in order of first appearance (a repeated word keeps its color and gets ¹ ² …),
  // short function words and punctuation are gray, the last token is crimson. Used by every table of token rows.
  const FUNC = new Set('the a an of on in at to and or but is was were be been are it its it’s this that these those he she they we you i me my his her their our your as by for from with into than then so if not no do did does had has have will would can could should may might there here what which who whom when where why how all any some up out about just also very s t'.split(' '));
  const SUP = ['', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  NT.tokMarks = (words) => {
    const n = words.length, key = words.map((w) => String(w).trim().toLowerCase().replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, '')), colOf = {}, count = {}, seen = {};
    let next = 0;
    key.forEach((k, i) => { if (i === n - 1 || !/[a-z0-9]/i.test(k) || FUNC.has(k)) return; count[k] = (count[k] || 0) + 1; if (!(k in colOf)) colOf[k] = next < NT.C.tok.length ? NT.C.tok[next++] : null; });
    const col = [], label = [];
    key.forEach((k, i) => {
      const raw = String(words[i]).trim().replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, '') || '·';
      if (i === n - 1) { col.push(NT.C.last); label.push(raw); return; }
      const c = colOf[k]; col.push(c || NT.C.tokGray);
      if (c && count[k] > 1) { seen[k] = (seen[k] || 0) + 1; label.push(raw + (SUP[seen[k]] || '')); } else label.push(raw);
    });
    return { col, label };
  };
  // ---------- "Predict first" (Oct 19): optional stops that ask the class to predict before a key reveal.
  //            One switch in the top bar, shown only on pages that have such a stop; remembered in this browser. ----------
  NT.PREDICT_STATIONS = ['tfroom', 'pkscene'];
  NT.hasPredict = () => NT.PREDICT_STATIONS.includes(NT.state.station) || (NT.state.station === 'embeddings' && NT.state.embView === 'input'); // + Input › Token + position
  NT.predictOn = () => { try { return localStorage.getItem('llmlab.predict') !== 'off'; } catch (e) { return true; } };
  NT.setPredict = (on) => { try { localStorage.setItem('llmlab.predict', on ? 'on' : 'off'); } catch (e) {} (NT.predictHooks || []).forEach((f) => f(on)); };
  NT.onPredict = (f) => { (NT.predictHooks = NT.predictHooks || []).push(f); };
  NT.PALETTE = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#76b7b2', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#8c8c8c'];
  NT.tokColor = (i, n) => (n <= 10 ? NT.PALETTE[i % 10] : null);
  NT.tokStyle = (i, n) => { const c = NT.tokColor(i, n); return c ? `border-color:${c};background:${c}22` : ''; };
  // value colors used everywhere (same five colors as the bubbles): deep red = low, pink, yellow = middle (zero), light green, bright green = high
  const STOPS = [[-1, [192, 0, 0]], [-0.5, [255, 199, 206]], [0, [255, 235, 156]], [0.5, [198, 239, 206]], [1, [30, 138, 58]]];
  NT.div = (t) => { t = Math.max(-1, Math.min(1, t)); for (let i = 0; i < STOPS.length - 1; i++) { const [a, ca] = STOPS[i], [b, cb] = STOPS[i + 1]; if (t <= b) { const f = (t - a) / (b - a); return ca.map((c, k) => c + (cb[k] - c) * f); } } return STOPS[4][1].slice(); };
  // a small key for those colors
  NT.scaleKey = (lo = 'low (below 0)', hi = 'high (above 0)') => `<span class="scalekey"><span>${lo}</span><i></i><span>${hi}</span></span>`;
  NT.drawStrip = (cv, vals, scale) => {
    if (!cv) return;
    const n = vals.length; cv.width = n; cv.height = 1;
    const c = cv.getContext('2d'), img = c.createImageData(n, 1);
    let m = scale; if (!m) { const a = Array.from(vals, Math.abs).sort((x, y) => x - y); m = Math.max(1e-6, a[Math.floor(a.length * 0.98)] || a.at(-1)); }
    for (let i = 0; i < n; i++) { const [r, g, b] = NT.div(vals[i] / m); img.data.set([r, g, b, 255], i * 4); }
    c.putImageData(img, 0, 0);
  };
  NT.stripHTML = (id) => `<canvas class="strip" id="${id}"></canvas>`;
  NT.setStatus = (t) => { const e = NT.$('#status'); if (e) e.textContent = t || ''; };
  NT.bars = (rows, max) => {
    const mx = max || Math.max(1e-9, ...rows.map((r) => r.v));
    return `<div class="bars">${rows.map((r, i) => `<div class="row ${r.mark ? 'mark' : ''} ${r.cls || ''}" data-i="${i}" title="${NT.esc(r.title || r.l)}"><span class="lbl">${NT.show(r.l)}</span><span class="bar"><i style="width:${(100 * r.v / mx).toFixed(1)}%"></i></span><span class="val">${r.t ?? NT.pct(r.v)}</span></div>`).join('')}</div>`;
  };
  // small in-tab stepper (replaces the old global Previous / Next / Play bar)
  // dim a stepper's buttons when there is nothing to go back to / forward to
  NT.stepperState = (id, canPrev, canNext) => { const el = document.querySelector(id); if (!el) return; const p = el.querySelector('[data-a=prev]'), n = el.querySelector('[data-a=next]'); if (p) p.disabled = !canPrev; if (n) n.disabled = !canNext; };
  NT.stepper = (id, { play = false } = {}) => `<span class="stepper" id="${id}"><button class="btn" data-a="prev" title="Back one step">◀ Back</button><button class="btn primary" data-a="next" title="Forward one step">Next ▶</button>${play ? '<button class="btn" data-a="play">▶ Play</button>' : ''}</span>`;
})();
