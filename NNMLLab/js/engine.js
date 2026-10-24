/* NNML Lab engine: every number on screen comes from here. No view stores or retypes numbers. */
(function () {
  const NN = (window.NN = window.NN || {});
  const C = window.NN_CORE, LAD = window.NN_LADDER, LRN = window.NN_LEARNER;
  const E = (NN.E = {});

  /* ---------- decoding ---------- */
  E.b64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const curImgs = C.curated.images.map(E.b64);
  const testAll = E.b64(C.test.images);
  const testPos = new Map(C.test.idx.map((v, i) => [v, i]));
  const deckAll = E.b64(LRN.deckImages);
  E.curated = (d) => curImgs[d];
  E.testImg = (i) => { const p = testPos.get(i); return testAll.subarray(p * 784, p * 784 + 784); };
  E.testLabel = (i) => C.test.labels[testPos.get(i)];
  E.deckImg = (i) => deckAll.subarray(i * 784, i * 784 + 784);
  E.deckLabel = (i) => LRN.deckLabels[i];
  E.deckBits = (i) => LRN.deckBits[i];

  /* ---------- image -> 8 inputs (the documented rule) ---------- */
  E.DARK = 128; // a pixel is dark if its shade is at least 128 of 255 (at least half dark)
  E.MIN_DOTS = 5; // a region turns on with 5 or more dark pixels
  E.region = (r, c) => Math.floor(r / 7) * 2 + Math.floor(c / 14); // 2 columns x 4 rows, 14 wide x 7 tall
  E.counts = (img) => { const n = [0, 0, 0, 0, 0, 0, 0, 0]; for (let r = 0; r < 28; r++) for (let c = 0; c < 28; c++) if (img[r * 28 + c] >= E.DARK) n[E.region(r, c)]++; return n; };
  E.bits = (img) => E.counts(img).map((n) => (n >= E.MIN_DOTS ? 1 : 0));
  E.pattern = (bits) => bits.reduce((s, b, i) => s + (b ? 1 << i : 0), 0);

  /* ---------- activations ---------- */
  E.act = {
    step: (z) => (z >= -1e-9 ? 1 : 0),
    sigmoid: (z) => 1 / (1 + Math.exp(-z)),
    relu: (z) => Math.max(0, z),
    none: (z) => z,
  };

  /* ---------- the hand-built network ---------- */
  // Weights in row-vector form: W1[input][hidden] (8x10), W2[hidden][output] (10x10). Biases -1 = "fire when the sum reaches 1".
  E.hand = () => ({ W1: C.W1.map((r) => r.slice()), W2: C.W2.map((r) => r.slice()), b1: Array(10).fill(-1), b2: Array(10).fill(-1), act1: 'step', act2: 'step' });
  E.HPAIRS = C.pairs; // hidden neuron j looks at regions HPAIRS[j]
  // forward pass that keeps every product so views can draw blocks and tables
  E.forward = (net, x) => {
    const f1 = E.act[net.act1], f2 = E.act[net.act2];
    const z1 = [], h = [], z2 = [], o = [];
    for (let j = 0; j < 10; j++) { let s = net.b1[j]; for (let i = 0; i < 8; i++) s += x[i] * net.W1[i][j]; z1.push(s); h.push(f1(s)); }
    for (let k = 0; k < 10; k++) { let s = net.b2[k]; for (let j = 0; j < 10; j++) s += h[j] * net.W2[j][k]; z2.push(s); o.push(f2(s)); }
    return { x, z1, h, z2, o };
  };
  // which digits does a network still read correctly (the 10-digit strip)
  E.curatedBits = C.curated.bits;
  E.verdict = (o, act) => {
    if (act === 'step') { const on = o.map((v, k) => (v >= 0.5 ? k : -1)).filter((k) => k >= 0); return on.length === 1 ? { pick: on[0], fired: on } : { pick: -1, fired: on }; }
    let best = 0; for (let k = 1; k < 10; k++) if (o[k] > o[best]) best = k; return { pick: best, fired: [best] };
  };
  E.strip = (net) => E.curatedBits.map((x, d) => { const r = E.forward(net, x); const v = E.verdict(r.o, net.act2); return { d, ok: v.pick === d, fired: v.fired, r }; });
  E.handStats = C.stats; // real numbers measured on 60,000 MNIST training images

  /* ---------- seeded random ---------- */
  E.rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // "Scramble": messy random weights on the same 8-10-10 (one decimal, like the test's matrices)
  E.scrambled = (seed) => { const r = E.rng(seed), v = () => Math.round((r() * 1.6 - 0.8) * 10) / 10; const n = E.hand(); n.W1 = n.W1.map((row) => row.map(v)); n.W2 = n.W2.map((row) => row.map(v)); n.b1 = n.b1.map(v); n.b2 = n.b2.map(v); n.act1 = 'none'; n.act2 = 'none'; return n; };

  /* ---------- normalization (MNIST's own recipe: fit the ink in 20x20, center its mass in 28x28) ---------- */
  E.normalize = (img) => {
    let r0 = 28, r1 = -1, c0 = 28, c1 = -1;
    for (let r = 0; r < 28; r++) for (let c = 0; c < 28; c++) if (img[r * 28 + c] > 30) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
    if (r1 < 0) return new Uint8Array(784);
    const h = r1 - r0 + 1, w = c1 - c0 + 1, s = 20 / Math.max(h, w), nh = Math.max(1, Math.round(h * s)), nw = Math.max(1, Math.round(w * s));
    const box = new Float32Array(nh * nw);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      // area-average sampling
      const sy0 = r0 + y / s, sy1 = r0 + (y + 1) / s, sx0 = c0 + x / s, sx1 = c0 + (x + 1) / s; let acc = 0, wt = 0;
      for (let yy = Math.floor(sy0); yy < Math.ceil(sy1); yy++) for (let xx = Math.floor(sx0); xx < Math.ceil(sx1); xx++) {
        const oy = Math.min(sy1, yy + 1) - Math.max(sy0, yy), ox = Math.min(sx1, xx + 1) - Math.max(sx0, xx); if (oy <= 0 || ox <= 0) continue;
        acc += img[yy * 28 + xx] * oy * ox; wt += oy * ox;
      }
      box[y * nw + x] = wt ? acc / wt : 0;
    }
    let m = 0, my = 0, mx = 0; for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { const v = box[y * nw + x]; m += v; my += v * y; mx += v * x; }
    const oy = Math.round(14 - my / m), ox = Math.round(14 - mx / m), out = new Uint8Array(784);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { const ry = y + oy, rx = x + ox; if (ry >= 0 && ry < 28 && rx >= 0 && rx < 28) out[ry * 28 + rx] = Math.min(255, Math.round(box[y * nw + x])); }
    return out;
  };
  // simple edits for "Break it": shift, scale about centre, thicken/thin
  E.transform = (img, { dx = 0, dy = 0, scale = 1, thick = 0 }) => {
    let out = new Uint8Array(784);
    for (let r = 0; r < 28; r++) for (let c = 0; c < 28; c++) {
      const sr = (r - 13.5 - dy) / scale + 13.5, sc = (c - 13.5 - dx) / scale + 13.5;
      const r0 = Math.floor(sr), c0 = Math.floor(sc), fr = sr - r0, fc = sc - c0; let v = 0;
      for (const [rr, cc, wgt] of [[r0, c0, (1 - fr) * (1 - fc)], [r0 + 1, c0, fr * (1 - fc)], [r0, c0 + 1, (1 - fr) * fc], [r0 + 1, c0 + 1, fr * fc]]) if (rr >= 0 && rr < 28 && cc >= 0 && cc < 28) v += img[rr * 28 + cc] * wgt;
      out[r * 28 + c] = Math.round(v);
    }
    for (let t = 0; t < Math.abs(thick); t++) {
      const src = out, nxt = new Uint8Array(784);
      for (let r = 0; r < 28; r++) for (let c = 0; c < 28; c++) {
        let best = thick > 0 ? 0 : 255;
        for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + a, cc = c + b; const v = rr >= 0 && rr < 28 && cc >= 0 && cc < 28 ? src[rr * 28 + cc] : 0; best = thick > 0 ? Math.max(best, v) : Math.min(best, v); }
        nxt[r * 28 + c] = best;
      }
      out = nxt;
    }
    return out;
  };

  /* ---------- the ladder of trained digit readers (real, trained offline; int8 weights as the browser runs them) ---------- */
  E.ladder = LAD.map((m) => ({ ...m, P: m.layers.map((L) => { const q = new Int8Array(E.b64(L.w).buffer); const W = new Float32Array(q.length); for (let i = 0; i < q.length; i++) W[i] = q[i] * L.scale; return { W, b: L.b, rows: L.rows, cols: L.cols }; }) }));
  E.ladderFeat = (kind, img) => {
    if (kind === 'bits8') return E.bits(img);
    if (kind === 'pool7') { const f = []; for (let R = 0; R < 7; R++) for (let Cc = 0; Cc < 7; Cc++) { let s = 0; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s += img[(R * 4 + r) * 28 + Cc * 4 + c]; f.push(s / 16 / 255); } return f; }
    return Array.from(img, (v) => v / 255);
  };
  E.ladderRun = (m, img) => {
    let h = E.ladderFeat(m.kind, img), hid = null;
    m.P.forEach((L, li) => { const z = new Float32Array(L.cols); for (let j = 0; j < L.cols; j++) { let s = L.b[j]; for (let i = 0; i < L.rows; i++) s += h[i] * L.W[i * L.cols + j]; z[j] = li < m.P.length - 1 ? Math.max(0, s) : s; } if (li === 0) hid = z; h = z; });
    const mx = Math.max(...h), e = Array.from(h, (v) => Math.exp(v - mx)), sm = e.reduce((a, b) => a + b, 0), p = e.map((v) => v / sm);
    let best = 0; p.forEach((v, k) => { if (v > p[best]) best = k; });
    return { p, pick: best, hidden: hid };
  };

  /* ---------- the Learner: 8-10-10, dimmer hidden, plain-score outputs, squared error ---------- */
  const cp = (L) => ({ W1: L.W1.map((r) => r.slice()), b1: L.b1.slice(), W2: L.W2.map((r) => r.slice()), b2: L.b2.slice() });
  E.learnerInit = () => cp(LRN.init);
  E.learnerSnap = () => cp(LRN.snapshot);
  E.LRN = LRN;
  E.lfwd = (L, x) => { const h = [], y = []; for (let j = 0; j < 10; j++) { let s = L.b1[j]; for (let i = 0; i < 8; i++) s += x[i] * L.W1[i][j]; h.push(1 / (1 + Math.exp(-s))); } for (let k = 0; k < 10; k++) { let s = L.b2[k]; for (let j = 0; j < 10; j++) s += h[j] * L.W2[j][k]; y.push(s); } return { h, y }; };
  E.onehot = (d) => Array.from({ length: 10 }, (_, k) => (k === d ? 1 : 0));
  // one gradient-descent step on a batch; returns new parameters and the gradients (for drawing)
  E.lstep = (L, X, D, lr) => {
    const M = X.length, g = { W1: L.W1.map((r) => r.map(() => 0)), b1: Array(10).fill(0), W2: L.W2.map((r) => r.map(() => 0)), b2: Array(10).fill(0) }; let loss = 0;
    X.forEach((x, n) => {
      const { h, y } = E.lfwd(L, x), t = E.onehot(D[n]), gy = y.map((v, k) => (2 * (v - t[k])) / M);
      y.forEach((v, k) => (loss += ((v - t[k]) ** 2) / M));
      for (let j = 0; j < 10; j++) for (let k = 0; k < 10; k++) g.W2[j][k] += h[j] * gy[k];
      for (let k = 0; k < 10; k++) g.b2[k] += gy[k];
      const gh = h.map((hj, j) => { let s = 0; for (let k = 0; k < 10; k++) s += gy[k] * L.W2[j][k]; return s * hj * (1 - hj); });
      for (let i = 0; i < 8; i++) for (let j = 0; j < 10; j++) g.W1[i][j] += x[i] * gh[j];
      for (let j = 0; j < 10; j++) g.b1[j] += gh[j];
    });
    const nL = { W1: L.W1.map((r, i) => r.map((v, j) => v - lr * g.W1[i][j])), b1: L.b1.map((v, j) => v - lr * g.b1[j]), W2: L.W2.map((r, j) => r.map((v, k) => v - lr * g.W2[j][k])), b2: L.b2.map((v, k) => v - lr * g.b2[k]) };
    return { L: nL, g, loss };
  };
  E.lscore = (L, idxs) => { let ok = 0, mse = 0; idxs.forEach((i) => { const { y } = E.lfwd(L, LRN.deckBits[i]); let b = 0; y.forEach((v, k) => { if (v > y[b]) b = k; mse += (v - (k === LRN.deckLabels[i] ? 1 : 0)) ** 2; }); if (b === LRN.deckLabels[i]) ok++; }); return { acc: ok / idxs.length, mse: mse / idxs.length }; };

  /* ---------- the close-up (HLj -> OLk), exact piece of the Learner's real gradient ---------- */
  // y_i = h_i * w + c_i + b ; c_i = everything else arriving at OLk. Worksheet values are rounded to 3 decimals and used as shown.
  E.r3 = (v) => Math.round(v * 1000) / 1000;
  E.closeRows = (L, batch, j, k, w, b) => batch.map((i) => {
    const x = LRN.deckBits[i], { h } = E.lfwd(L, x); let c = 0; for (let q = 0; q < 10; q++) if (q !== j) c += h[q] * L.W2[q][k];
    const hi = E.r3(h[j]), ci = E.r3(c), y = LRN.deckLabels[i] === k ? 1 : 0, yh = E.r3(hi * w + ci + b), e = E.r3(yh - y);
    return { i, digit: LRN.deckLabels[i], h: hi, c: ci, w, b, yh, y, e, sq: E.r3(e * e), cw: E.r3(e * 2 * hi), cb: E.r3(e * 2) };
  });
  E.closeSummary = (rows) => { const M = rows.length, s = (f) => E.r3(rows.reduce((a, r) => a + r[f], 0) / M); return { mse: s('sq'), gw: s('cw'), gb: s('cb') }; };
  E.closeMSE = (L, batch, j, k, w, b) => E.closeSummary(E.closeRows(L, batch, j, k, w, b)).mse;
  // the exact (unrounded) loss for curves and surfaces
  E.closeLossExact = (L, batch, j, k, w, b) => { let s = 0; batch.forEach((i) => { const { h } = E.lfwd(L, LRN.deckBits[i]); let c = 0; for (let q = 0; q < 10; q++) if (q !== j) c += h[q] * L.W2[q][k]; const y = LRN.deckLabels[i] === k ? 1 : 0; s += (h[j] * w + c + b - y) ** 2; }); return s / batch.length; };
  E.closeGradExact = (L, batch, j, k, w, b) => { let gw = 0, gb = 0; batch.forEach((i) => { const { h } = E.lfwd(L, LRN.deckBits[i]); let c = 0; for (let q = 0; q < 10; q++) if (q !== j) c += h[q] * L.W2[q][k]; const y = LRN.deckLabels[i] === k ? 1 : 0; const e = h[j] * w + c + b - y; gw += (2 * e * h[j]) / batch.length; gb += (2 * e) / batch.length; }); return { gw, gb }; };
  // a batch for any output OLk: one example of digit k plus four others (seeded, from the training deck)
  E.batchFor = (k, seed) => { const r = E.rng(1000 + k * 17 + seed), pos = [], neg = []; LRN.deckLabels.forEach((d, i) => (d === k ? pos : neg).push(i)); const pick = [pos[Math.floor(r() * pos.length)]]; const used = new Set(); while (pick.length < 5) { const i = neg[Math.floor(r() * neg.length)]; if (!used.has(LRN.deckLabels[i])) { used.add(LRN.deckLabels[i]); pick.push(i); } } for (let a = 4; a > 0; a--) { const b2 = Math.floor(r() * (a + 1)); [pick[a], pick[b2]] = [pick[b2], pick[a]]; } return pick; };

  /* ---------- delivery time (regression) and Late? (yes/no) ---------- */
  const DL = window.NN_DELIVERY;
  E.DL = DL;
  E.delivery = (kind, f) => { const m = DL[kind], x = [f.dist / DL.scale.dist, f.items / DL.scale.items, f.rain, f.rush]; const h = m.b1.map((b, j) => Math.max(0, b + x.reduce((s, v, i) => s + v * m.W1[i][j], 0))); const o = m.b2 + h.reduce((s, v, j) => s + v * m.W2[j], 0); return kind === 'late' ? 1 / (1 + Math.exp(-o)) : o; };

  /* ---------- formatting ---------- */
  E.f = (v, d = 3) => { if (Math.abs(v) < 1e-12) v = 0; const s = (+v).toFixed(d); return s.replace(/^(-?)0\./, '$1.').replace(/^-\.000$/, '.000'); };
  E.f2 = (v) => { if (Math.abs(v) < 1e-12) return '0'; const s = String(Math.round(v * 100) / 100); return s; };
  E.pct = (v, d = 0) => (v * 100).toFixed(d) + '%';
})();
