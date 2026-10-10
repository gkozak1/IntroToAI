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
  EX.banker.final = f16(L.examples.banker.final);
  EX.banker.tok = f16(L.examples.banker.tok);
  EX.banker.pos = f16(L.examples.banker.pos);
  EX.banker.topRows = { ids: L.examples.banker.topRows.ids, rows: f16(L.examples.banker.topRows.rows) };
  EX.river.tok = f16(L.examples.river.tok);
  EX.river.pos = f16(L.examples.river.pos);
  NT.EX = EX;
  NT.LAB = L;
  NT.STARTERS = ['banker', 'river', 'trophyLarge', 'trophySmall', 'annie'].map((k) => [k, EX[k].text]);
  NT.attn = (ex, b, h, i, j) => ex.attn[((b * 12 + h) * ex.T + i) * ex.T + j] / 255;
  NT.attnAvg = (ex, b, i, j) => { let s = 0; for (let h = 0; h < 12; h++) s += NT.attn(ex, b, h, i, j); return s / 12; };
  NT.store = L.rounds.store;

  // ---------- shared state: sentence, temperature, Top-K ----------
  NT.TEMPS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  NT.state = { station: 'next', text: EX.banker.text, T: 1, K: NT.ALL };
  const S = NT.state;
  const curCache = { text: null, val: null };
  NT.current = () => {
    const text = S.text.replace(/\s+$/, '');
    if (curCache.text === text) return curCache.val;
    const ids = NT.encode(text), key = Object.keys(EX).find((k) => EX[k].text === text) || 'custom';
    curCache.text = text; curCache.val = { text, ids, tokens: ids.map(NT.tokText), key, ex: key === 'custom' ? null : EX[key] };
    return curCache.val;
  };
  const listeners = [];
  NT.on = (fn) => listeners.push(fn);
  NT.setText = (text, how = 'edit') => { // how: 'edit' | 'append'
    if (text === S.text) return;
    S.text = text; const ta = document.getElementById('sentence'); if (ta && ta.value !== text) { ta.value = text; ta.dispatchEvent(new Event('autosize')); }
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
    const n = NT.store[ids.join(',')] || (ids.join(',') === EX.banker.ids.join(',') ? EX.banker.next : null);
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
  NT.PALETTE = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#76b7b2', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#8c8c8c'];
  NT.tokColor = (i, n) => (n <= 10 ? NT.PALETTE[i % 10] : null);
  NT.tokStyle = (i, n) => { const c = NT.tokColor(i, n); return c ? `border-color:${c};background:${c}22` : ''; };
  NT.div = (t) => { t = Math.max(-1, Math.min(1, t)); return t >= 0 ? [255, 255 - 150 * t, 255 - 235 * t] : [255 + 215 * t, 255 + 140 * t, 255]; };
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
  NT.stepper = (id, { play = false } = {}) => `<span class="stepper" id="${id}"><button class="btn" data-a="prev" title="Back">◀</button><button class="btn primary" data-a="next" title="Forward">▶</button>${play ? '<button class="btn" data-a="play">Play</button>' : ''}</span>`;
})();
