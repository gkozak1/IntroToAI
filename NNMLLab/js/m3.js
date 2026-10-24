/* Shared close-up (HLj -> OLk on the Learner) + M3 Forward pass and error. All numbers from E.closeRows. */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h, s = NN.s, LRN = E.LRN;
  const CU = (NN.CU = {});
  CU.L = E.learnerSnap();
  CU.state = (j = 2, k = 4, batch = null) => ({ j, k, bi: 0, batch: batch || LRN.batches[0], w: E.r3(CU.L.W2[j][k]), b: E.r3(CU.L.b2[k]), w0: E.r3(CU.L.W2[j][k]), b0: E.r3(CU.L.b2[k]), alpha: 0.5, hist: [] });
  CU.rows = (st) => E.closeRows(CU.L, st.batch, st.j, st.k, st.w, st.b);
  const P = (v) => (v < 0 ? `(${E.f(v)})` : E.f(v));
  CU.LETTER = (v) => (v <= -0.5 ? 'A' : v < -0.1 ? 'B' : v <= 0.1 ? 'C' : v < 0.5 ? 'D' : 'E');
  CU.sketch = (v, size = 34) => { const L = CU.LETTER(v), ang = { A: -55, B: -22, C: 0, D: 22, E: 55 }[L], r = size * 0.38, c = size / 2, dx = r * Math.cos((ang * Math.PI) / 180), dy = r * Math.sin((ang * Math.PI) / 180); return s('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'sk' }, s('rect', { x: 1, y: 1, width: size - 2, height: size - 2, rx: 5, fill: '#fff', stroke: '#c8d0db' }), s('line', { x1: c - dx, y1: c + dy, x2: c + dx, y2: c - dy, stroke: '#2C7A7B', 'stroke-width': 3, 'stroke-linecap': 'round' }), s('text', { x: size - 4, y: size - 4, 'text-anchor': 'end', class: 'skl', text: L })); };
  // the zoom picture: 10 hidden neurons into OLk, HLj thick, the rest merged into the c cable
  CU.zoom = (st, sel, o = {}) => {
    const rows = CU.rows(st), r = rows[sel] || rows[0], { h: hv } = E.lfwd(CU.L, LRN.deckBits[r.i]);
    const W = o.w || 470, H = (o.h || 300) + 16, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'zoom' });
    const yh = (q) => 22 + q * 27, xo = W - 90, yo = H / 2, xh = 70;
    for (let q = 0; q < 10; q++) if (q !== st.j) svg.append(s('path', { d: `M${xh + 14} ${yh(q)} C ${xh + 90} ${yh(q)}, ${xo - 170} ${yo + 26}, ${xo - 120} ${yo + 26}`, stroke: '#b9c2cf', 'stroke-width': 1.4, fill: 'none' }));
    svg.append(s('path', { d: `M${xo - 120} ${yo + 26} L ${xo - 20} ${yo + 6}`, stroke: '#9aa6b8', 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none' }));
    svg.append(s('text', { x: xo - 150, y: yo + 74, class: 'zl', text: `gray cable: c = everything else into ${V.OL(st.k)}` }), s('text', { x: xo - 150, y: yo + 90, class: 'zv', text: `c = ${E.f(r.c)}  (for this image)` }));
    const wcol = st.w >= 0 ? V.POS : V.NEG;
    svg.append(s('path', { d: `M${xh + 14} ${yh(st.j)} C ${xh + 120} ${yh(st.j)}, ${xo - 120} ${yo - 20}, ${xo - 20} ${yo - 4}`, stroke: wcol, 'stroke-width': 3 + Math.min(6, Math.abs(st.w) * 4), fill: 'none', class: 'wline' }));
    svg.append(V.chip(xh + 210, yh(st.j) + (st.j < 5 ? 34 : -26), 'w ' + E.f(st.w), st.w));
    for (let q = 0; q < 10; q++) { const on = q === st.j; svg.append(s('circle', { cx: xh, cy: yh(q), r: on ? 13 : 9, fill: `rgba(31,157,85,${0.06 + 0.9 * hv[q]})`, stroke: on ? V.ACC : '#9aa6b8', 'stroke-width': on ? 3 : 1 }), s('text', { x: xh - 18, y: yh(q) + 4, 'text-anchor': 'end', class: on ? 'zl on' : 'zl', text: V.HL(q) })); }
    svg.append(s('text', { x: xh + 18, y: yh(st.j) - 14, class: 'zv', text: `h = ${E.f(r.h)}` }));
    svg.append(s('circle', { cx: xo, cy: yo, r: 24, fill: '#fff', stroke: V.ACC, 'stroke-width': 3 }), s('text', { x: xo, y: yo + 5, 'text-anchor': 'middle', class: 'zo', text: E.f(r.yh) }), s('text', { x: xo, y: yo - 32, 'text-anchor': 'middle', class: 'zl on', text: V.OL(st.k) }), s('text', { x: xo + 30, y: yo + 40, 'text-anchor': 'middle', class: 'zl', text: `bias b = ${E.f(st.b)}` }));
    svg.append(s('text', { x: 8, y: H - 8, class: 'zl', text: `For image ${sel + 1} (a ${r.digit}):  ŷ = h·w + c + b = ${E.f(r.h)}×${P(st.w)} + ${P(r.c)} + ${P(st.b)} = ${E.f(r.yh)}` }));
    return svg;
  };
  // the five image cards, with target, error arrow and squared-error square
  CU.cards = (st, o = {}) => {
    const rows = CU.rows(st), box = h('div', { class: 'cucards' });
    rows.forEach((r, q) => {
      const c = h('div', { class: 'cuc' + (o.sel === q ? ' sel' : ''), onclick: o.onSel ? () => o.onSel(q) : null });
      c.append(h('div', { class: 'cuimg' }, V.thumb(E.deckImg(r.i), 48), h('span', { class: 'cud' }, `a ${r.digit}`)));
      const lines = [h('div', {}, 'HL', st.j + 1, ': ', h('b', {}, E.f(r.h)))];
      if (o.show >= 1) lines.push(h('div', { class: 'tg' + (r.y ? ' one' : '') }, `target ${V.OL(st.k)} = `, h('b', {}, r.y)));
      if (o.show >= 2) lines.push(h('div', {}, 'predicted ŷ = ', h('b', {}, E.f(r.yh))));
      c.append(h('div', { class: 'cul' }, lines));
      if (o.show >= 3) { const big = Math.min(1, Math.abs(r.e)); c.append(h('div', { class: 'cuerr' }, h('span', { class: 'arr ' + (r.e > 0 ? 'down' : 'up'), style: `height:${8 + big * 46}px` }), h('span', { class: 'ev' }, (r.e > 0 ? '+' : '') + E.f(r.e)))); }
      if (o.show >= 4) c.append(h('div', { class: 'cusq' }, h('span', { class: 'sq', style: `width:${4 + Math.abs(r.e) * 54}px;height:${4 + Math.abs(r.e) * 54}px` }), h('span', { class: 'ev' }, E.f(r.sq))));
      if (o.show >= 5) c.append(h('div', { class: 'cucon' }, h('div', {}, 'weight vote ', CU.sketch(r.cw, 26), h('b', {}, E.f(r.cw))), h('div', {}, 'bias vote ', CU.sketch(r.cb, 26), h('b', {}, E.f(r.cb)))));
      box.append(c);
    });
    return box;
  };
  CU.table = (st, cols) => {
    const rows = CU.rows(st), sm = E.closeSummary(rows);
    const head = { img: 'Image', h: `h (HL${st.j + 1})`, w: 'w', c: 'c', b: 'b', yh: 'ŷ = hw + c + b', y: 'target y', e: 'signed error ŷ − y', sq: '(ŷ − y)²', cw: 'weight contribution (ŷ−y)×2h', cb: 'bias contribution (ŷ−y)×2' };
    const cls = { h: 'fp', w: 'fp', c: 'fp', b: 'fp', yh: 'fp', y: 'er', e: 'er', sq: 'er', cw: 'bp', cb: 'bp' };
    const t = h('table', { class: 'ws cut' }, h('tr', {}, cols.map((c) => h('th', { class: cls[c] || '' }, head[c]))));
    rows.forEach((r, q) => t.append(h('tr', {}, cols.map((c) => h('td', { class: cls[c] || '' }, c === 'img' ? `${q + 1} (a ${r.digit})` : c === 'y' ? r.y : E.f(r[c]))))));
    t.append(h('tr', { class: 'sum' }, cols.map((c) => h('td', {}, c === 'img' ? 'average' : c === 'sq' ? 'MSE ' + E.f(sm.mse) : c === 'cw' ? 'gradient ' + E.f(sm.gw) : c === 'cb' ? 'gradient ' + E.f(sm.gb) : ''))));
    return t;
  };
  CU.mseBar = (st) => { const sm = E.closeSummary(CU.rows(st)); return h('div', { class: 'msebar' }, h('span', {}, 'MSE (average squared error)'), h('span', { class: 'track' }, h('span', { class: 'fill', style: `width:${Math.min(100, sm.mse * 250)}%;background:${V.band(1 - Math.min(1, sm.mse * 2.5))}` })), h('b', {}, E.f(sm.mse))); };
  CU.batchPicker = (st, re) => h('div', { class: 'chips' }, h('span', { class: 'small muted' }, 'Batch:'), LRN.batches.map((b, q) => h('button', { class: 'chip' + (st.bi === q ? ' on' : ''), onclick: () => { st.bi = q; st.batch = LRN.batches[q]; re(); } }, 'ABCDE'[q])));

  /* ---------------- M3 ---------------- */
  let st = CU.state(), sel = 0, els = {};
  const steps = [
    { t: 'Zoom in', c1: 'Zoom in on one connection: HL3 → OL4', c2: 'The Learner is partway through training. We’ll follow just one weight (w) and one bias (b). Everything else arriving at OL4 is bundled into one number, c.' },
    { t: 'Targets', c1: 'Supervised learning: every image comes with the right answer', c2: 'OL4 should say 1 for a 4 and 0 for anything else. Those are its targets for this batch of 5.' },
    { t: 'Predict', c1: 'Forward pass: the current weight and bias give a prediction for each image', c2: 'ŷ = h·w + c + b. The Learner’s outputs pass on their calculated value as a plain score (no activation), which keeps the arithmetic clear. Click an image to follow it.' },
    { t: 'How far off', c1: 'Signed error = prediction − target', c2: 'A positive error means OL4 said too much (arrow down: should go lower). Negative means too little (arrow up).' },
    { t: 'Square it', c1: 'Square each error, then average: MSE', c2: 'Squaring makes every error positive, so they can’t cancel out, and makes big misses count much more than small ones. Look at the squares.' },
    { t: 'Guess by eye', c1: 'Your turn: find the weight and bias with the smallest error', c2: 'Drag the sliders and watch the squares shrink. Hint shows which way each slider should move.' },
  ];
  function enter(stage) { st = CU.state(); stage.append(h('div', { class: 'cugrid' }, (els.left = h('div', { class: 'col' })), (els.right = h('div', { class: 'col' })), (els.bot = h('div', { class: 'bottom' })))); }
  function render(step) {
    els.left.innerHTML = ''; els.right.innerHTML = ''; els.bot.innerHTML = '';
    els.left.append(h('div', { class: 'ttl' }, 'The close-up ', h('span', { class: 'badge learner' }, 'Learner (partway through training)')), CU.zoom(st, sel), CU.batchPicker(st, () => render(step)));
    els.right.append(h('div', { class: 'ttl' }, 'Batch ' + 'ABCDE'[st.bi] + ': 5 training images picked from the deck'), CU.cards(st, { show: Math.min(step, 4), sel, onSel: (q) => { sel = q; render(step); } }));
    if (step >= 4) els.right.append(CU.mseBar(st));
    if (step === 5) els.right.append(sliders(step));
    if (step >= 2) els.bot.append(h('div', { class: 'hiwonly' }, CU.table(st, step >= 4 ? ['img', 'h', 'w', 'c', 'b', 'yh', 'y', 'e', 'sq'] : step >= 3 ? ['img', 'h', 'w', 'c', 'b', 'yh', 'y', 'e'] : ['img', 'h', 'w', 'c', 'b', 'yh'])));
    if (step === 1) els.bot.append(V.predict('m3-t', 'which images have target 1 for OL4?', [{ t: 'Only the 4', ok: true, fb: 'OL4 is the “is it a 4?” output: 1 for a 4, 0 for everything else.' }, { t: 'The images with big HL3 values', ok: false, fb: 'Targets come from the labels, not from what the network computes: only the 4 has target 1.' }]));
    if (step === 3) els.bot.append(V.predict('m3-e', 'the 4 has a negative error. Should OL4 go up or down for it?', [{ t: 'Up', ok: true, fb: 'Negative error = predicted too little. It needs to rise toward 1.' }, { t: 'Down', ok: false, fb: 'Negative means the prediction is below the target, so it should go up.' }]));
    if (step === 4) els.bot.append(h('div', { class: 'note concept-only' }, 'Switch to How it works to see the full worksheet.'));
    // Predict first: the answers to this step's chip stay blurred until the class answers
    if (step === 1) els.right.querySelectorAll('.tg').forEach((e) => V.veil(e, 'm3-t'));
    if (step === 3) { els.right.querySelectorAll('.cuerr').forEach((e) => V.veil(e, 'm3-e')); els.bot.querySelectorAll('.hiwonly').forEach((e) => V.veil(e, 'm3-e')); }
  }
  function sliders(step) {
    const sm = E.closeSummary(CU.rows(st)), g = E.closeGradExact(CU.L, st.batch, st.j, st.k, st.w, st.b);
    const sl = (lab, k, lo, hi) => { const val = h('span', { class: 'v' }, E.f(st[k])); const inp = h('input', { type: 'range', min: lo, max: hi, step: 0.01, value: st[k], oninput: (e) => { st[k] = E.r3(+e.target.value); render(step); } }); return h('label', { class: 'slider' }, h('span', { class: 'sl' }, lab), inp, val); };
    const box = h('div', { class: 'card' }, sl('weight w', 'w', -1, 3), sl('bias b', 'b', -1, 1.5));
    const hint = h('div', { class: 'small hintline', hidden: !els.hint }, `Hint: ${g.gw < 0 ? '▲ raise' : '▼ lower'} w; ${g.gb < 0 ? '▲ raise' : '▼ lower'} b.`);
    box.append(h('div', { class: 'chips' }, h('button', { class: 'btn small', onclick: () => { els.hint = true; render(step); } }, 'Hint'), h('button', { class: 'btn small', onclick: () => { st.w = st.w0; st.b = st.b0; render(step); } }, 'Reset w and b')), hint);
    box.append(h('div', { class: 'note' }, 'Notice: you can’t get every square to zero. The 4 and the others aren’t different enough at HL3, so the best fit is a compromise. In M4 the computer finds it.'));
    return box;
  }
  NN.reg({
    id: 'M3', part: 2, title: 'Close-up: forward pass & error', short: 'Error', steps,
    about: '<p><b>On this page:</b> one connection of the Learner up close, HL3 → OL4, with a batch of 5 real training images. The same reasoning works for any connection into an output.</p><p><b>To do:</b> click an image to follow it in the picture; change batches; in step 6 drag the sliders. <i>How it works</i> shows the worksheet.</p>',
    enter, reset: () => { st = CU.state(); sel = 0; els.hint = false; },
    show(step) { render(step); return Promise.resolve(); },
  });
})();
