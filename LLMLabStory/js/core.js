/* LLMLab — core: data pack, tokenizer, helpers */
'use strict';
const NT = (window.NT = {});
(() => {
  const P = window.PACK;
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  function f16(s) {
    const u8 = b64(s), u16 = new Uint16Array(u8.buffer, u8.byteOffset, u8.byteLength / 2), out = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) {
      const h = u16[i], sg = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023;
      out[i] = e === 0 ? sg * Math.pow(2, -14) * (f / 1024) : e === 31 ? (f ? NaN : sg * Infinity) : sg * Math.pow(2, e - 15) * (1 + f / 1024);
    }
    return out;
  }
  NT.b64 = b64; NT.f16 = f16; NT.P = P;

  // ---------- GPT-2 tokenizer ----------
  const TOKENS = P.tok.tokens, ENCODER = new Map(TOKENS.map((t, i) => [t, i]));
  const BYTE_ENC = (() => { const bs = []; for (let i = 33; i <= 126; i++) bs.push(i); for (let i = 161; i <= 172; i++) bs.push(i); for (let i = 174; i <= 255; i++) bs.push(i); const cs = bs.slice(); let n = 0; for (let b = 0; b < 256; b++) if (!bs.includes(b)) { bs.push(b); cs.push(256 + n); n++; } const m = {}; bs.forEach((b, i) => { m[b] = String.fromCharCode(cs[i]); }); return m; })();
  const BYTE_DEC = Object.fromEntries(Object.entries(BYTE_ENC).map(([b, c]) => [c, +b]));
  const RANKS = new Map(P.tok.merges.map((m, i) => [m, i]));
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
  NT.encode = (text) => { const ids = []; for (const m of text.matchAll(PAT)) { const t = Array.from(new TextEncoder().encode(m[0]), (b) => BYTE_ENC[b]).join(''); for (const p of bpe(t)) ids.push(ENCODER.get(p)); } return ids; };
  NT.tokText = (id) => new TextDecoder().decode(Uint8Array.from(Array.from(TOKENS[id], (c) => BYTE_DEC[c] ?? 63)));
  NT.decode = (ids) => ids.map(NT.tokText).join('');
  NT.V = TOKENS.length;

  // ---------- rows (exact, for the textbook tokens) ----------
  const EXACT = new Map(); { const r = f16(P.exact.rows); P.exact.ids.forEach((id, i) => EXACT.set(id, r.slice(i * 768, i * 768 + 768))); }
  NT.row = (id) => EXACT.get(id) || null;
  const WPE = f16(P.wpe); NT.posRow = (p) => WPE.slice(p * 768, p * 768 + 768);

  // ---------- examples ----------
  const ex = (k) => { const e = P.examples[k]; return { ids: e.ids, tokens: e.tokens, T: e.T, attn: b64(e.attn), text: e.text }; };
  NT.banker = ex('banker'); NT.river = ex('river');
  NT.banker.full = f16(P.examples.banker.fullLogits);
  NT.banker.final = f16(P.examples.banker.final);
  NT.banker.hidden = f16(P.examples.banker.hidden); // 13 stages × 6 tokens × 768
  NT.hiddenRow = (stage, i) => NT.banker.hidden.slice((stage * NT.banker.T + i) * 768, (stage * NT.banker.T + i + 1) * 768);
  NT.attnAvgAll = (e, q) => { // average over 12 blocks × 12 heads; first token left out and the rest rescaled
    const w = new Array(q + 1).fill(0);
    for (let b = 0; b < 12; b++) for (let h = 0; h < 12; h++) for (let j = 0; j <= q; j++) w[j] += e.attn[((b * 12 + h) * e.T + q) * e.T + j] / 255;
    w[0] = 0; const s = w.reduce((a, c) => a + c, 0) || 1; return w.map((x) => x / s);
  };
  NT.store = P.rounds.store;
  NT.node = (ids) => NT.store[ids.join(',')] || null;

  // ---------- math ----------
  NT.softmax = (logits, T = 1, K = logits.length) => { const z = logits.slice(0, K).map((x) => x / T), m = Math.max(...z), e = z.map((x) => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map((x) => x / s); };
  NT.pickIndex = (p, r) => { let c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (r < c) return i; } return p.length - 1; };
  NT.top = (logits, k) => { const idx = Array.from(logits.keys()).sort((a, b) => logits[b] - logits[a]).slice(0, k); return { ids: idx, logits: idx.map((i) => logits[i]) }; };

  // ---------- DOM helpers ----------
  NT.$ = (s) => document.querySelector(s);
  NT.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  NT.show = (s) => NT.esc(String(s).replace(/\n/g, '⏎'));
  NT.pct = (p, d = 1) => (p * 100).toFixed(d) + '%';
  NT.int = (x) => x.toLocaleString('en-US');
  NT.PALETTE = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#76b7b2', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#8c8c8c'];
  NT.tokStyle = (i, n) => { if (n > 10) return ''; const c = NT.PALETTE[i % 10]; return `border-color:${c};background:${c}22`; };
  NT.div = (t) => { t = Math.max(-1, Math.min(1, t)); return t >= 0 ? [255, 255 - 150 * t, 255 - 235 * t] : [255 + 215 * t, 255 + 140 * t, 255]; };
  NT.drawStrip = (cv, vals, scale) => {
    if (!cv) return; const n = vals.length; cv.width = n; cv.height = 1;
    const c = cv.getContext('2d'), img = c.createImageData(n, 1);
    let m = scale; if (!m) { const a = Array.from(vals, Math.abs).sort((x, y) => x - y); m = Math.max(1e-6, a[Math.floor(a.length * 0.98)] || a.at(-1)); }
    for (let i = 0; i < n; i++) { const [r, g, b] = NT.div(vals[i] / m); img.data.set([r, g, b, 255], i * 4); }
    c.putImageData(img, 0, 0);
  };
  NT.strip = (id) => `<canvas class="strip" id="${id}"></canvas>`;
  NT.bars = (rows, max) => {
    const mx = max || Math.max(1e-9, ...rows.map((r) => r.v));
    return `<div class="bars">${rows.map((r) => `<div class="row ${r.mark ? 'mark' : ''}"><span class="lbl" title="${NT.esc(r.l)}">${NT.show(r.l)}</span><span class="bar"><i style="width:${(100 * r.v / mx).toFixed(1)}%"></i></span><span class="val">${r.t ?? NT.pct(r.v)}</span></div>`).join('')}</div>`;
  };
  NT.setStatus = (t) => { NT.$('#status').textContent = t || ''; };
})();
