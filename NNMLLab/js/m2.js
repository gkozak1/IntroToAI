/* M2 The training cycle: forward -> error -> backpropagation -> gradient descent, on the whole Learner, for real. */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h, s = NN.s, LRN = E.LRN;
  const NB = LRN.deckLabels.length / LRN.batch;
  let S = {}, els = {};
  const batchIdx = (b) => Array.from({ length: LRN.batch }, (_, q) => (b % NB) * LRN.batch + q);
  const fresh = () => { S = { L: E.learnerInit(), b: 0, losses: [], feat: 0, accs: [] }; S.first = cycle(S.L, 0); };
  // one full cycle on batch b, keeping everything needed to draw it
  function cycle(L, b) { const idx = batchIdx(b), X = idx.map((i) => LRN.deckBits[i]), D = idx.map((i) => LRN.deckLabels[i]); const before = idx.map((i) => E.lfwd(L, LRN.deckBits[i])); const r = E.lstep(L, X, D, LRN.lr); const after = idx.map((i) => E.lfwd(r.L, LRN.deckBits[i])); return { idx, before, after, g: r.g, loss: r.loss, L1: r.L }; }
  const afterLoss = () => { const C = S.first; return C.after.reduce((t, a, q) => t + a.y.reduce((u, v, k) => u + (v - (k === LRN.deckLabels[C.idx[q]] ? 1 : 0)) ** 2, 0), 0) / 5; };
  fresh();
  const PH = ['Forward propagation', 'Error', 'Backpropagation', 'Gradient descent'];
  const steps = [
    { t: 'Random start', ph: -1, c1: 'The Learner starts with random weights and biases of 0', c2: 'Same 8–10–10 shape as the hand-built network, but every connection gets a small random weight. It knows nothing yet.' },
    { t: 'Forward', ph: 0, c1: 'Forward propagation: the batch goes through the network', c2: 'All 5 training images go through at the same time, layer by layer, using the current weights. Each gives 10 output scores.' },
    { t: 'Error', ph: 1, c1: 'Error: compare each output with its target', c2: 'The target is 1 for the right digit and 0 for every other output. Arrows show which way each output needs to go. All the squared errors combine into one number: the batch error.' },
    { t: 'Backprop', ph: 2, c1: 'Backpropagation: work backward to find how each weight affects the error', c2: 'Starting at the outputs and moving back toward the inputs, it calculates a gradient for every one of the 200 weights and biases. Blue = increasing it would help; orange = decreasing it would help.' },
    { t: 'Gradient descent', ph: 3, c1: 'Gradient descent: nudge every weight and bias a little', c2: 'Each parameter moves opposite its gradient, by the learning rate × gradient. All 200 change at once.' },
    { t: 'Next forward', ph: 0, c1: 'The next forward pass uses the updated weights', c2: () => `Same 5 images, new weights: the batch error fell from ${E.f(S.first.loss)} to ${E.f(afterLoss())}. Mostly the wrong outputs dropped; not every right output has risen yet. That takes many more steps.` },
    { t: 'Again and again', ph: 4, c1: 'Repeat for every batch, then every epoch', c2: () => `One pass through all ${LRN.deckLabels.length} training images (${NB} batches) is an epoch. Watch the error fall: not smoothly, because each batch is different.` },
  ];
  function enter(stage) {
    stage.append(h('div', { class: 'm2grid' }, h('div', { class: 'col' }, h('div', { class: 'ttl' }, 'The batch'), (els.batch = h('div', { class: 'm2batch' })), (els.big = h('div', {}))), h('div', { class: 'col' }, (els.phase = h('div', { class: 'phase' })), (els.net = h('div', { class: 'netbox' }))), h('div', { class: 'col' }, (els.outT = h('div', { class: 'ttl' })), (els.out = h('div', {})), (els.side = h('div', { class: 'small' }))), (els.bot = h('div', { class: 'bottom' }))));
  }
  function phaseBand(p) { els.phase.innerHTML = ''; PH.forEach((n, q) => els.phase.append(h('span', { class: 'ph p' + q + (p === q || p === 4 ? ' on' : '') }, n))); }
  function outBars(y, d, o = {}) {
    const box = h('div', { class: 'obars' });
    for (let k = 0; k < 10; k++) {
      const v = y[k], t = k === d ? 1 : 0, e = v - t, w = Math.max(0, Math.min(1, v));
      const top = y.indexOf(Math.max(...y)) === k;
      const row = h('div', { class: 'obr' + (k === d ? ' tgt' : '') + (top ? ' top' : '') }, h('span', { class: 'ol' }, 'OL' + k), h('span', { class: 'otrack' }, h('span', { class: 'ofill', style: `width:${w * 100}%;background:${k === d ? '#3cc46a' : '#9db7e8'}` }), k === d ? h('span', { class: 'otarget' }) : null, o.prev ? h('span', { class: 'oprev', style: `left:${Math.max(0, Math.min(1, o.prev[k])) * 100}%` }) : null), h('span', { class: 'ov' }, E.f(v, 2)));
      if (o.err) row.append(h('span', { class: 'oarr ' + (e > 0 ? 'down' : 'up'), style: `opacity:${0.3 + Math.min(1, Math.abs(e)) * 0.7}` }, e > 0 ? '▼' : '▲'));
      box.append(row);
    }
    return box;
  }
  function lossChart() {
    const W = 520, H = 120, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'curve' }), L = S.losses;
    const mx = Math.min(3, Math.max(1, ...L)), n = Math.max(NB * 2, L.length), X = (i) => 34 + (i / n) * (W - 44), Y = (v) => H - 18 - (v / mx) * (H - 30);
    svg.append(s('line', { x1: 34, x2: W - 10, y1: H - 18, y2: H - 18, stroke: '#9aa6b8' }), s('text', { x: 30, y: Y(mx) + 4, 'text-anchor': 'end', class: 'ax', text: E.f2(mx) }), s('text', { x: 30, y: H - 14, 'text-anchor': 'end', class: 'ax', text: '0' }), s('text', { x: W - 10, y: H - 4, 'text-anchor': 'end', class: 'ax', text: 'batches →' }), s('text', { x: 38, y: 12, class: 'ax strong', text: 'error (MSE) of each batch ' }));
    for (let e = NB; e < n; e += NB) svg.append(s('line', { x1: X(e), x2: X(e), y1: 10, y2: H - 18, stroke: '#e3e8ef', 'stroke-dasharray': '3 3' }));
    if (L.length) { let d = ''; L.forEach((v, i) => (d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1))); svg.append(s('path', { d, stroke: '#7b61a8', 'stroke-width': 1.3, fill: 'none' })); }
    return svg;
  }
  function drawNet(L, x, o = {}) {
    const f = E.lfwd(L, x), fw = { x, h: f.h, o: f.y };
    let win = 0; f.y.forEach((v, k) => { if (v > f.y[win]) win = k; });
    els.net.innerHTML = '';
    const svg = V.network({ net: o.gnet || { W1: L.W1, W2: L.W2 }, fw: o.noVals ? { x, h: f.h.map(() => null), o: f.y.map(() => null) } : fw, values: true, continuous: true, win, edges: 'all', maxW: o.maxW || 1.2, icons: false });
    els.net.append(svg); els.svg = svg; return f;
  }
  function render(step, anim) {
    const sp = steps[step]; phaseBand(sp.ph);
    const C = S.first, fi = S.feat, idx = step === 6 ? batchIdx(S.b) : C.idx, d = LRN.deckLabels[idx[fi]];
    els.batch.innerHTML = '';
    idx.forEach((i, q) => els.batch.append(h('div', { class: 'cuc mini' + (q === fi ? ' sel' : ''), onclick: () => { S.feat = q; render(step); } }, V.thumb(E.deckImg(i), 40), h('span', { class: 'cud' }, 'a ' + LRN.deckLabels[i]))));
    els.big.innerHTML = ''; els.big.append(h('div', { class: 'small muted' }, 'Following the highlighted image. Click another.'), h('div', { class: 'note' }, 'Inputs: its 8 on/off regions, by the same rule as Part 1.'));
    els.side.innerHTML = ''; els.bot.innerHTML = '';
    const x = LRN.deckBits[idx[fi]];
    let L = step <= 4 ? E.learnerInit() : step === 5 ? C.L1 : S.L;
    if (step === 0) { drawNet(L, x, { noVals: true }); }
    else if (step === 3 || step === 4) {
      const g = C.g, sc = 0.6 / Math.max(...g.W1.flat().map(Math.abs), ...g.W2.flat().map(Math.abs));
      if (step === 3) drawNet(L, x, { gnet: { W1: g.W1.map((r) => r.map((v) => -v * sc)), W2: g.W2.map((r) => r.map((v) => -v * sc)) }, maxW: 0.6 });
      else drawNet(C.L1, x);
    } else drawNet(L, x);
    const f = E.lfwd(L, x);
    els.outT.textContent = step === 0 ? 'Output scores' : `Output scores for this ${d}`;
    els.out.innerHTML = '';
    if (step === 0) els.out.append(h('div', { class: 'empty small muted' }, 'No forward pass yet.'));
    else if (step === 5) els.out.append(outBars(E.lfwd(C.L1, x).y, d, { prev: C.before[fi].y, err: true }), h('div', { class: 'small muted' }, 'Gray tick = score before the update.'));
    else els.out.append(outBars(step === 4 ? E.lfwd(C.L1, x).y : step === 6 ? f.y : C.before[fi].y, d, { err: step >= 2 }));
    if (step === 2) els.side.append(h('div', { class: 'calc' }, `Batch error: `, h('b', {}, E.f(C.loss)), h('div', { class: 'small' }, 'For each image, add up its 10 squared errors (ŷ − y)²; then average over the 5 images. (In the close-up, M3, we look at just one output’s squared errors.)')));
    if (step === 3) els.side.append(h('div', { class: 'calc' }, 'Line thickness = size of each weight’s gradient. Backpropagation goes output layer first, then the hidden layer, because each layer’s gradients need the ones after it.', h('div', { class: 'hiwonly' }, 'Output weights: gradient = average of 2(ŷ − y)·h. Hidden weights: the blame from all 10 outputs, times the dimmer’s slope, times the input (M5).')));
    if (step === 4) { const big = []; for (let j = 0; j < 10; j++) for (let k = 0; k < 10; k++) big.push([Math.abs(C.g.W2[j][k]), `HL${j + 1}→OL${k}`, -LRN.lr * C.g.W2[j][k]]); big.sort((a, b) => b[0] - a[0]); els.side.append(h('div', { class: 'calc' }, h('b', {}, 'Biggest weight changes this step:'), big.slice(0, 4).map((b) => h('div', { class: 'mono' }, `${b[1]}: ${b[2] > 0 ? '+' : ''}${E.f(b[2])}`)), h('div', { class: 'small muted' }, `nudge = ${LRN.lr} (learning rate) × gradient; new weight = old weight − nudge. So the change is the opposite sign of the gradient.`))); }
    if (step === 5) els.side.append(h('div', { class: 'calc' }, `Batch error before: ${E.f(C.loss)} → after: `, h('b', {}, E.f(afterLoss()))));
    if (step === 6) {
      const acc = E.lscore(S.L, Array.from({ length: LRN.deckLabels.length }, (_, i) => i));
      els.bot.append(h('div', { class: 'runrow' }, h('div', { class: 'counters' }, h('div', {}, 'Batch ', h('b', {}, (S.b % NB) + 1), ` of ${NB}`), h('div', {}, 'Epoch ', h('b', {}, Math.floor(S.b / NB) + 1)), h('div', {}, 'Training images read correctly: ', h('b', {}, E.pct(acc.acc)))),
        h('div', { class: 'chips' }, h('button', { class: 'btn primary small', onclick: () => run(1) }, 'One batch'), h('button', { class: 'btn small', onclick: () => run(NB) }, 'One epoch'), h('button', { class: 'btn small', onclick: () => run(NB * 10) }, '10 epochs'), h('button', { class: 'btn ghost small', onclick: () => { S.L = E.learnerInit(); S.b = 0; S.losses = []; render(6); } }, 'Start over')), lossChart()));
      els.side.append(h('div', { class: 'note' }, `Real training, in your browser. Even fully trained, this network can’t pass about 46% on these images, because 8 on/off inputs lose too much (N4). It still beats the hand-built network’s 9%. The point here is how it learns.`));
    }
    if (anim) return animate(step);
    return Promise.resolve();
  }
  async function run(n) { for (let t = 0; t < n; t++) { const c = cycle(S.L, S.b); S.L = c.L1; S.losses.push(c.loss); S.b++; if (n > 1 && t % (n > NB ? NB : 5) === 0) { render(6); try { await NN.wait(n > NB ? 60 : 120); } catch (e) { return; } } } render(6); }
  async function animate(step) {
    const svg = els.svg; if (!svg) return;
    if (step === 1 || step === 5) { await V.pulse(svg, '.e1', '#4e79a7', 900); await V.pulse(svg, '.e2', '#4e79a7', 900); }
    if (step === 3) { const e2 = svg.querySelectorAll('.e2'), e1 = svg.querySelectorAll('.e1'); e1.forEach((e) => (e.style.opacity = 0)); e2.forEach((e) => (e.style.opacity = 0)); await NN.anim(900, (u) => e2.forEach((e) => (e.style.opacity = u * 0.8))); await NN.anim(900, (u) => e1.forEach((e) => (e.style.opacity = u * 0.8))); }
    if (step === 4) { const all = svg.querySelectorAll('.e'); await NN.anim(900, (u) => all.forEach((e) => (e.style.strokeOpacity = 0.3 + 0.7 * Math.abs(Math.sin(u * Math.PI * 2))))); }
  }
  NN.reg({
    id: 'M2', part: 2, title: 'The training cycle', short: 'Cycle', steps,
    about: '<p><b>On this page:</b> the whole Learner training on real handwritten digits, one batch at a time. Every number is really calculated in your browser.</p><p><b>To do:</b> step through one cycle, then in the last step run batches and epochs and watch the error fall.</p>',
    enter, reset: fresh,
    show(step, o) { if (!S.L) fresh(); return render(step, o.anim); },
  });
})();
