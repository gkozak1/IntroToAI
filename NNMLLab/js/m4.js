/* M4 Close-up: backpropagation and gradient descent on HL3 -> OL4 (real Learner values, worksheet rounding). */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h, s = NN.s, CU = NN.CU;
  let st, els = {}, lrShown = false, reveal = false, userRevealed = false, userHid = false, cam = { yaw: -0.7, pitch: 0.55, drag: null }, show3d = false;
  const RANGE = { w: [-1, 4], b: [-0.6, 1.0] };
  const fresh = () => { st = CU.state(); st.hist = []; check(); reveal = false; show3d = false; };
  const sum = () => E.closeSummary(CU.rows(st));
  function check() { const m = sum(); st.hist.push({ w: st.w, b: st.b, mse: m.mse, gw: m.gw, gb: m.gb, it: st.hist.length }); }
  function stepGD() { const m = sum(), nw = E.r3(st.alpha * m.gw), nb = E.r3(st.alpha * m.gb); st.w = E.r3(st.w - nw); st.b = E.r3(st.b - nb); check(); return { nw, nb }; }
  const stopNow = () => { const m = sum(); return Math.abs(E.r3(st.alpha * m.gw)) < 0.001 && Math.abs(E.r3(st.alpha * m.gb)) < 0.001; };
  const steps = [
    { t: 'Blind hiker', c1: 'The network can’t see the whole error curve', c2: 'It can only calculate the error where it is standing, and the slope right there. Each “check” is a full forward pass plus backpropagation over the batch. Explore, then reveal the curve.' },
    { t: 'The slope', c1: 'The slope (tangent) tells you two things', c2: 'Its sign: does raising this weight make the error go up or down, right here? Its steepness: how sensitive the error is to that weight here. Steepness does not tell you how far away the bottom is.' },
    { t: 'Each image votes', c1: 'Backpropagation: each image’s contribution to the slope', c2: 'Weight contribution = (ŷ − y) × 2h. Bias contribution = (ŷ − y) × 2. The sketch shows each contribution as a slope, from A (strongly down) to E (strongly up).' },
    { t: 'The gradient', c1: 'Average the contributions: that’s the gradient for the batch', c2: 'Backpropagation has only measured the slopes. Nothing has changed yet. Changing the weight and bias is gradient descent’s job.' },
    { t: 'Take a step', c1: 'Gradient descent: step opposite the slope', c2: 'Nudge = learning rate × gradient. New value = old value − nudge. Then the next forward pass uses the new weight and bias.' },
    { t: 'Learning rate', c1: 'The learning rate decides how big each step is', c2: 'Three real runs from the same start. Too small crawls; about right settles; too big overshoots and the error can go up.' },
    { t: 'Until it stops', c1: 'Repeat until the steps get tiny', c2: 'Continue while the weight nudge or the bias nudge is at least 0.001. Each iteration: forward pass → error → backpropagation → gradient descent.' },
  ];
  function enter(stage) { stage.append(h('div', { class: 'm4grid' }, (els.left = h('div', { class: 'col' })), (els.right = h('div', { class: 'col' })), (els.bot = h('div', { class: 'bottom' })))); }
  /* ---------- error curves with tangent lines ---------- */
  function curve(param, o = {}) {
    const W = o.w || 430, H = o.h || 210, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'curve' });
    const [lo, hi] = RANGE[param], other = param === 'w' ? st.b : st.w;
    const f = (v) => (param === 'w' ? E.closeLossExact(CU.L, st.batch, st.j, st.k, v, other) : E.closeLossExact(CU.L, st.batch, st.j, st.k, other, v));
    const ys = []; for (let i = 0; i <= 80; i++) ys.push(f(lo + ((hi - lo) * i) / 80));
    const ymax = Math.max(0.3, ...st.hist.map((p) => p.mse)) * 1.15, X = (v) => 40 + ((v - lo) / (hi - lo)) * (W - 56), Y = (v) => H - 26 - (v / ymax) * (H - 46);
    const cid = 'clip' + param + Math.random().toString(36).slice(2, 7); svg.append(s('defs', {}, s('clipPath', { id: cid }, s('rect', { x: 40, y: 12, width: W - 50, height: H - 38 }))));
    const plot = s('g', { 'clip-path': `url(#${cid})` });
    svg.append(s('line', { x1: 40, x2: W - 10, y1: H - 26, y2: H - 26, stroke: '#9aa6b8' }), s('line', { x1: 40, x2: 40, y1: 12, y2: H - 26, stroke: '#9aa6b8' }));
    [lo, (lo + hi) / 2, hi].forEach((v) => svg.append(s('text', { x: X(v), y: H - 10, 'text-anchor': 'middle', class: 'ax', text: E.f2(v) })));
    svg.append(s('text', { x: W - 12, y: H - 30, 'text-anchor': 'end', class: 'ax', text: param === 'w' ? 'weight w →' : 'bias b →' }), s('text', { x: 44, y: 20, class: 'ax', text: 'MSE' }));
    if (reveal || o.full) { let d = ''; ys.forEach((v, i) => (d += (i ? 'L' : 'M') + X(lo + ((hi - lo) * i) / 80).toFixed(1) + ' ' + Y(v).toFixed(1))); plot.append(s('path', { d, stroke: '#7b61a8', 'stroke-width': 2, fill: 'none', opacity: 0.7 })); }
    else svg.append(s('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'hidden', text: 'curve not known yet' }));
    svg.append(plot);
    if (reveal && NN.st.step >= 1) svg.append(s('text', { x: 46, y: H - 32, class: 'ax', text: 'full curve shown for reference: training never sees it' }));
    const tan = (p, g, len, col, cur) => { const x0 = X(p[param]), y0 = Y(p.mse), sx = (W - 56) / (hi - lo), sy = (H - 46) / ymax, dx = 1, dy = -g * (sy / sx), n = Math.hypot(dx, dy); return s('line', { x1: x0 - (len * dx) / n, y1: y0 - (len * dy) / n, x2: x0 + (len * dx) / n, y2: y0 + (len * dy) / n, stroke: col, 'stroke-width': cur ? 3.5 : 1.6, 'stroke-linecap': 'round', opacity: cur ? 1 : 0.5, 'stroke-dasharray': param === 'b' ? '5 3' : null }); };
    const gcol = param === 'w' ? '#2C7A7B' : '#80350E';
    st.hist.forEach((p, i) => { const cur = i === st.hist.length - 1; if (p[param] < lo || p[param] > hi) return; svg.append(tan(p, param === 'w' ? p.gw : p.gb, cur ? 36 : 14, gcol, cur), s('circle', { cx: X(p[param]), cy: Y(p.mse), r: cur ? 6 : 3.4, fill: '#A5643A', stroke: '#fff', 'stroke-width': 1.2 })); });
    const c = st.hist[st.hist.length - 1];
    svg.append(s('text', { x: W - 12, y: 20, 'text-anchor': 'end', class: 'ax strong', text: `slope here = ${E.f(param === 'w' ? c.gw : c.gb)}` }));
    if (o.path) { let d = ''; o.path.forEach((p, i) => (d += (i ? 'L' : 'M') + X(Math.max(lo, Math.min(hi, p[param]))) + ' ' + Y(p.mse))); svg.append(s('path', { d, stroke: o.color || V.ACC, 'stroke-width': 2, fill: 'none' })); }
    return svg;
  }
  /* ---------- the rotatable error surface (after the BP & GD app) ---------- */
  function surface() {
    const W = 430, H = 300, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'surf', tabindex: 0 });
    const [wl, wh] = RANGE.w, [bl, bh] = RANGE.b, zMax = Math.max(0.3, ...st.hist.map((p) => p.mse)) * 1.2;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), sc = 250;
    const P = (w, b, z) => { const x = (w - wl) / (wh - wl) - 0.5, y = (b - bl) / (bh - bl) - 0.5, zz = Math.min(z, zMax) / zMax - 0.45, rx = x * cy - y * sy, dp = x * sy + y * cy; return { x: W / 2 + sc * rx, y: H / 2 + sc * (dp * sp - zz * cp), d: dp * cp + zz * sp }; };
    const N = 22, scene = [], f = (w, b) => E.closeLossExact(CU.L, st.batch, st.j, st.k, w, b);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const pts = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, c]) => { const w = wl + ((wh - wl) * a) / N, b = bl + ((bh - bl) * c) / N; return P(w, b, f(w, b)); }); scene.push({ d: pts.reduce((t, p) => t + p.d, 0) / 4, el: s('polygon', { points: pts.map((p) => p.x + ',' + p.y).join(' '), fill: '#c6d8e0', 'fill-opacity': 0.35, stroke: '#8caab7', 'stroke-opacity': 0.45, 'stroke-width': 0.6 }) }); }
    st.hist.forEach((p, i) => { const q = P(p.w, p.b, p.mse), cur = i === st.hist.length - 1; scene.push({ d: cur ? 99 : q.d + 0.001, el: s('circle', { cx: q.x, cy: q.y, r: cur ? 6 : 3.2, fill: '#A5643A', stroke: '#fff', 'stroke-width': 0.8 }) }); });
    scene.sort((a, b) => a.d - b.d).forEach((x) => svg.append(x.el));
    const o = P(wl, bl, 0); [['weight', P(wh, bl, 0)], ['bias', P(wl, bh, 0)], ['MSE', P(wl, bl, zMax)]].forEach(([n, e]) => svg.append(s('line', { x1: o.x, y1: o.y, x2: e.x, y2: e.y, stroke: '#647888' }), s('text', { x: e.x, y: e.y - 4, 'text-anchor': 'middle', class: 'ax strong', text: n })));
    svg.addEventListener('pointerdown', (e) => { cam.drag = { x: e.clientX, y: e.clientY }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', (e) => { if (!cam.drag) return; cam.yaw += (e.clientX - cam.drag.x) * 0.01; cam.pitch = Math.max(-1.2, Math.min(1.2, cam.pitch + (e.clientY - cam.drag.y) * 0.01)); cam.drag = { x: e.clientX, y: e.clientY }; const n = surface(); svg.replaceWith(n); });
    svg.addEventListener('pointerup', () => (cam.drag = null));
    return svg;
  }
  function valleys() {
    const W = 300, H = 120, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'curve', style: 'max-width:420px' });
    const X = (v) => 20 + ((v + 2) / 4) * (W - 40), Y = (v) => H - 20 - v * 22;
    [[1.2, '#7b61a8'], [0.25, '#2C7A7B']].forEach(([k, col]) => { let d = ''; for (let i = 0; i <= 60; i++) { const v = -2 + (4 * i) / 60; d += (i ? 'L' : 'M') + X(v) + ' ' + Y(Math.min(4, k * v * v)); } svg.append(s('path', { d, stroke: col, 'stroke-width': 2, fill: 'none' })); const g = 2 * k * 1, x0 = X(1), y0 = Y(k); svg.append(s('line', { x1: x0 - 24, y1: y0 + 24 * g * (22 / ((W - 40) / 4)), x2: x0 + 24, y2: y0 - 24 * g * (22 / ((W - 40) / 4)), stroke: col, 'stroke-width': 3 }), s('circle', { cx: x0, cy: y0, r: 4, fill: col })); });
    svg.append(s('text', { x: W / 2, y: 14, 'text-anchor': 'middle', class: 'ax strong', text: 'Same distance from the bottom, different steepness' }));
    return svg;
  }
  function step2table() { const m = sum(), nw = E.r3(st.alpha * m.gw), nb = E.r3(st.alpha * m.gb); return h('table', { class: 'ws step2' }, h('tr', {}, h('th', {}, ''), h('th', { class: 'gd' }, 'Step as formula'), h('th', { class: 'gd' }, 'In words'), h('th', { class: 'gd' }, 'Weight'), h('th', { class: 'gd' }, 'Bias')), h('tr', {}, h('td', { class: 'k' }, 'Gradient'), h('td', {}, '(1/M) Σ contributions'), h('td', {}, 'average of the 5 votes'), h('td', {}, E.f(m.gw)), h('td', {}, E.f(m.gb))), h('tr', {}, h('td', { class: 'k' }, 'Nudge'), h('td', {}, 'α × gradient'), h('td', {}, 'learning rate × gradient'), h('td', {}, E.f(nw)), h('td', {}, E.f(nb))), h('tr', {}, h('td', { class: 'k' }, 'New value'), h('td', {}, 'old − nudge'), h('td', {}, 'step opposite the slope'), h('td', {}, `${E.f(st.w)} − (${E.f(nw)}) = ${E.f(E.r3(st.w - nw))}`), h('td', {}, `${E.f(st.b)} − (${E.f(nb)}) = ${E.f(E.r3(st.b - nb))}`))); }
  function step3() { const m = sum(), nw = E.r3(st.alpha * m.gw), nb = E.r3(st.alpha * m.gb), go = Math.abs(nw) >= 0.001 || Math.abs(nb) >= 0.001; return h('div', { class: 'step3 ' + (go ? 'go' : 'stop') }, `Continue if |weight nudge| ≥ .001 OR |bias nudge| ≥ .001:  |${E.f(nw)}| , |${E.f(nb)}|  →  `, h('b', {}, go ? 'TRUE: keep going' : 'FALSE: stop')); }
  function lrLab() {
    const runs = [[0.05, 'Too small', '#9db7e8'], [0.5, 'About right', '#1f9d55'], [1.1, 'Too big', '#e5532d']].map(([a, name, col]) => { let w = st.w0, b = st.b0; const path = []; for (let t = 0; t < 100; t++) { const m = E.closeSummary(E.closeRows(CU.L, st.batch, st.j, st.k, w, b)); path.push({ w, b, mse: m.mse }); w = E.r3(w - E.r3(a * m.gw)); b = E.r3(b - E.r3(a * m.gb)); if (!isFinite(w) || Math.abs(b) > 50) break; } return { a, name, col, path }; });
    const minMSE = E.closeSummary(E.closeRows(CU.L, st.batch, st.j, st.k, runs[1].path[runs[1].path.length - 1].w, runs[1].path[runs[1].path.length - 1].b)).mse;
    const okRuns = runs.filter((r) => r.path.every((p) => p.mse < 1)), yLo = Math.max(0, Math.min(...okRuns.flatMap((r) => r.path.map((p) => p.mse))) - 0.005), yHi = runs[0].path[0].mse + 0.02;
    const box = h('div', { class: 'lrlab' });
    runs.forEach((r) => {
      const W = 250, H = 120, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'curve' });
      const X = (i) => 34 + (i / 99) * (W - 44), Y = (v) => H - 20 - ((Math.max(yLo, Math.min(v, yHi)) - yLo) / (yHi - yLo)) * (H - 36);
      svg.append(s('text', { x: 24, y: Y(yHi) + 4, 'text-anchor': 'end', class: 'ax', text: E.f(yHi) }), s('text', { x: 24, y: Y(yLo) + 4, 'text-anchor': 'end', class: 'ax', text: E.f(yLo) }));
      if (r.path.some((p) => p.mse > yHi)) svg.append(s('text', { x: W - 8, y: 24, 'text-anchor': 'end', class: 'ax strong', text: 'error flies off the top \u2191' }));
      let d = ''; r.path.forEach((p, i) => (d += (i ? 'L' : 'M') + X(i) + ' ' + Y(p.mse))); svg.append(s('path', { d, stroke: r.col, 'stroke-width': 2.5, fill: 'none' }));
      r.path.forEach((p, i) => svg.append(s('circle', { cx: X(i), cy: Y(p.mse), r: 2.2, fill: r.col })));
      svg.append(s('text', { x: W - 8, y: H - 6, 'text-anchor': 'end', class: 'ax', text: 'iteration →' }), s('text', { x: W - 8, y: 12, 'text-anchor': 'end', class: 'ax', text: 'MSE (error)' }));
      const last = r.path[r.path.length - 1];
      box.append(h('div', { class: 'card' }, h('div', { class: 'ttl nocase' }, `${r.name}: α = ${r.a}`), svg, h('div', { class: 'small' }, r.path.length < 100 ? `Stopped after ${r.path.length} iterations: the error was blowing up (MSE ${last.mse > 999 ? 'over 1,000' : E.f(last.mse)}).` : `After 100 iterations: MSE ${E.f(last.mse)} (w ${E.f(last.w)}, b ${E.f(last.b)}). ${r.a < 0.1 ? 'Still far from the bottom.' : 'Close to the bottom (about ' + E.f(minMSE) + ').'}`)));
    });
    return box;
  }
  function render(step) {
    if (step >= 1 && !userHid) reveal = true; if (step === 0 && !userRevealed) reveal = false;
    els.left.innerHTML = ''; els.right.innerHTML = ''; els.bot.innerHTML = '';
    const L = els.left, R = els.right, B = els.bot;
    if (step === 5) { L.parentNode.classList.add('wide'); R.append(h('div', { class: 'ttl' }, 'Same batch, same start, three learning rates ', h('span', { class: 'tag real' }, 'real runs')), h('div', { class: 'chips' }, V.predict('m4-lr', 'which run will have the lowest error after 100 steps?', [{ t: 'α = 0.05', ok: false, fb: 'Tiny steps: still crawling downhill.' }, { t: 'α = 0.5', ok: true, fb: 'Steady steps get close to the bottom.' }, { t: 'α = 1.1', ok: false, fb: 'Too big: it overshoots back and forth and the error grows.' }], () => { lrShown = true; render(5); }), lrShown ? null : h('button', { class: 'btn small', onclick: () => { lrShown = true; render(5); } }, 'Show the runs')), lrShown ? lrLab() : h('div', { class: 'card small muted' }, 'Make a prediction (or press Show the runs) to see what really happens.')); return; }
    L.parentNode.classList.remove('wide');
    L.append(h('div', { class: 'ttl' }, 'Error for this batch as the weight changes ', h('span', { class: 'badge learner' }, 'HL3 → OL4')), curve('w'));
    if (step === 6 && show3d) L.append(h('div', { class: 'ttl' }, 'Weight, bias and error together (drag to turn)'), surface());
    else if (step >= 1) L.append(h('div', { class: 'ttl' }, '…and as the bias changes'), curve('b'));
    if (step === 0) {
      L.append(h('div', { class: 'chips' }, h('button', { class: 'btn small', onclick: () => { st.w = E.r3(st.w - 0.4); check(); render(0); } }, '◀ step w left'), h('button', { class: 'btn primary small', onclick: () => { check(); render(0); } }, 'Check here'), h('button', { class: 'btn small', onclick: () => { st.w = E.r3(st.w + 0.4); check(); render(0); } }, 'step w right ▶'), h('button', { class: 'btn ghost small', onclick: () => { reveal = !reveal; userRevealed = reveal; render(0); } }, reveal ? 'Hide the curve' : 'Reveal the whole curve')));
      R.append(h('div', { class: 'card small' }, h('p', {}, h('b', {}, 'Like a hiker in fog, blindfolded: '), 'you can feel the ground right under your feet (the error and its slope), but you can’t see the valley.'), h('p', {}, `Checks so far: ${st.hist.length}. Each one cost a forward pass and backpropagation over all 5 images.`), h('p', {}, 'Use the slope to decide which way to step. Training never draws the whole curve: with 200 weights there are far too many directions to map.')));
      R.append(V.predict('m4-dir', `the slope here is ${E.f(st.hist[st.hist.length - 1].gw)}. Which way should w move to lower the error?`, [{ t: 'Right (bigger w)', ok: st.hist[st.hist.length - 1].gw < 0, fb: 'Move opposite the slope: a negative slope means the error drops as w grows.' }, { t: 'Left (smaller w)', ok: st.hist[st.hist.length - 1].gw > 0, fb: 'Move opposite the slope: a positive slope means the error drops as w shrinks.' }]));
      return;
    }
    if (step === 1) { R.append(h('div', { class: 'card small' }, h('p', {}, h('b', {}, 'Sign: '), 'negative slope → raising the weight lowers the error here. Positive → raising it raises the error. Gradient descent moves the opposite way to the slope.'), h('p', {}, h('b', {}, 'Steepness: '), 'how much the error changes for a small change in the weight. A steep slope means this weight matters a lot right now.')), h('div', { class: 'card' }, valleys(), h('div', { class: 'small' }, 'Both dots are the same distance from their valley’s bottom, but one slope is much steeper. Steepness measures sensitivity, not distance.'))); return; }
    const cardsBox = h('div', {}, h('div', { class: 'ttl' }, 'Batch ' + 'ABCDE'[st.bi]), CU.cards(st, { show: step >= 2 ? 5 : 4 }));
    if (step !== 4 && step !== 6) R.append(cardsBox);
    if (step === 2) { // Predict first: while the class decides, the chip takes the legend's row (the legend explains the votes it would give away)
      const pend = V.pending('m4-vote'); if (!pend) R.append(h('div', { class: 'sklegend' }, h('span', { class: 'small muted' }, 'Slope sketches:'), [['A', '≤ −.5'], ['B', '−.5 to −.1'], ['C', '−.1 to .1'], ['D', '.1 to .5'], ['E', '≥ .5']].map(([l, r], q) => h('span', { class: 'skl' }, CU.sketch([-0.7, -0.3, 0, 0.3, 0.7][q], 28), l + ': ' + r))));
      R.append(V.predict('m4-vote', 'the 4 was predicted too low (negative error). Which way does its weight vote point?', [{ t: 'Negative (raise w)', ok: true, fb: '(ŷ − y) is negative and h is positive, so (ŷ − y)×2h is negative: “raise w”.' }, { t: 'Positive (lower w)', ok: false, fb: 'Negative error × positive h gives a negative contribution: it votes to raise w.' }], () => render(2))); }
    if (step === 3) { const m = sum(); R.append(h('div', { class: 'gradbox' }, h('div', {}, 'Weight gradient ', CU.sketch(m.gw, 30), h('b', {}, E.f(m.gw))), h('div', {}, 'Bias gradient ', CU.sketch(m.gb, 30), h('b', {}, E.f(m.gb))), h('div', { class: 'small muted' }, 'Each is the average of the 5 votes above. A “C” sketch means a gentle slope (between −.1 and .1), not a flat one. The bias gradient is bigger here because the bias affects every image fully, while the weight only acts through h.'))); }
    if (step === 4 || step === 6) {
      const ctl = h('div', { class: 'card gdctl' }, h('label', { class: 'slider' }, h('span', { class: 'sl' }, 'learning rate α'), h('input', { class: 'num', type: 'number', step: 0.05, min: 0.01, max: 2, value: st.alpha, onchange: (e) => { st.alpha = Math.max(0.01, Math.min(2, +e.target.value)); render(step); } })),
        h('div', { class: 'chips' }, h('button', { class: 'btn primary small', onclick: () => { stepGD(); render(step); } }, 'Take one step'), step === 6 ? h('button', { class: 'btn small', onclick: () => { for (let i = 0; i < 10 && !stopNow(); i++) stepGD(); render(step); } }, 'Take 10 steps') : null, step === 6 ? h('button', { class: 'btn small', onclick: () => { for (let i = 0; i < 1000 && !stopNow(); i++) stepGD(); render(step); } }, 'Run until it stops') : null, h('button', { class: 'btn ghost small', onclick: () => { st.w = st.w0; st.b = st.b0; st.hist = []; check(); render(step); } }, 'Start over')),
        h('div', { class: 'small' }, `Iteration ${st.hist.length - 1} · w = ${E.f(st.w)} · b = ${E.f(st.b)} · MSE = ${E.f(sum().mse)}`), step === 6 ? step3() : null);
      R.append(ctl, CU.mseBar(st));
      if (step === 6) ctl.append(h('div', { class: 'chips' }, h('button', { class: 'btn small' + (show3d ? ' on' : ''), onclick: () => { show3d = !show3d; render(6); } }, show3d ? 'Back to the bias curve' : 'Show the 3D error surface (left)')));
      R.append(cardsBox);
    }
    B.append(h('div', { class: 'hiwonly' }, step >= 4 ? step2table() : null, CU.table(st, ['img', 'h', 'w', 'c', 'b', 'yh', 'y', 'e', 'sq', 'cw', 'cb'])));
    if (step === 2) { R.querySelectorAll('.cucon').forEach((e) => V.veil(e, 'm4-vote')); B.querySelectorAll('.hiwonly').forEach((e) => V.veil(e, 'm4-vote')); } // Predict first
  }
  NN.reg({
    id: 'M4', part: 2, title: 'Close-up: backprop & gradient descent', short: 'Downhill', steps,
    about: '<p><b>On this page:</b> the same HL3 → OL4 close-up. Backpropagation measures the slope of the error; gradient descent steps downhill using the learning rate.</p><p><b>To do:</b> explore the hidden curve, read each image’s vote, take steps, compare learning rates. <i>How it works</i> shows the full worksheet (Steps 1–3).</p>',
    enter, reset: fresh,
    show(step) { if (!st) fresh(); render(step); return Promise.resolve(); },
  });
})();
