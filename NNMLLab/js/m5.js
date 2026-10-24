/* M5 Every connection: transfer the close-up to any connection; blame flows back; all 200 at once; the cycle; parallel training. */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h, s = NN.s, CU = NN.CU, LRN = E.LRN;
  let S = {}, els = {};
  const fresh = () => { S = { j: 6, k: 2, seed: 0, revealed: false, order: {}, img: 0, wk: 5 }; S.cu = mk(); };
  const mk = () => { const st = CU.state(S.j, S.k, E.batchFor(S.k, S.seed)); st.hist = []; return st; };
  const steps = [
    { t: 'Your turn', c1: () => `Your turn: the same reasoning for ${V.HL(S.j)} → ${V.OL(S.k)}`, c2: 'Pick any hidden-to-output connection. Before revealing the numbers, decide: which images have target 1? Which way should the weight move?' },
    { t: 'Further back', c1: 'Weights into the hidden layer learn too: blame flows backward', c2: () => `A hidden neuron feeds all 10 outputs, so its blame comes from every one of them, each through its weight. Then it passes back through the dimmer’s slope to the weights coming in. Same idea as the close-up, longer formula.` },
    { t: 'All 200 at once', c1: 'One training step changes all 200 weights and biases together', c2: 'Every weight and bias has its own gradient from backpropagation, and gradient descent nudges them all in the same step. These are the real changes from one batch, drawn larger so you can see them.' },
    { t: 'The cycle', c1: 'One cycle, four stages, repeated', c2: 'Forward propagation → error → backpropagation → gradient descent → next forward propagation with the new values. Put the stages in order.' },
    { t: 'Work in parallel', c1: 'What can happen at the same time during training, and what must wait', c2: 'The 5 images in a batch can go forward together, and their errors and contributions can be calculated together. But each stage needs the one before it, and the next batch needs the updated weights.' },
  ];
  fresh();
  function enter(stage) { stage.append((els.root = h('div', { class: 'm5' }))); }
  /* ---------- 1. transfer ---------- */
  function transfer() {
    const st = S.cu, R = els.root;
    const sel = (lab, n, val, on, f) => h('label', { class: 'pick' }, lab, h('select', { onchange: (e) => on(+e.target.value) }, Array.from({ length: n }, (_, i) => h('option', { value: i, selected: i === val ? true : null }, f(i)))));
    const top = h('div', { class: 'chips' }, sel('Connection: ', 10, S.j, (v) => { S.j = v; S.cu = mk(); S.revealed = false; render(0); }, V.HL), h('span', { class: 'op' }, '→'), sel('', 10, S.k, (v) => { S.k = v; S.cu = mk(); S.revealed = false; render(0); }, V.OL), h('button', { class: 'btn small', onclick: () => { S.seed++; S.cu = mk(); S.revealed = false; render(0); } }, 'New batch'));
    const rows = CU.rows(st), sm = E.closeSummary(rows);
    const qs = h('div', { class: 'card qs' }, h('div', { class: 'ttl' }, 'Predict first'),
      V.predict(`m5-t-${S.j}-${S.k}-${S.seed}`, `which images have target 1 for ${V.OL(S.k)}?`, [{ t: `Only the ${S.k}`, ok: true, fb: `${V.OL(S.k)} answers “is it a ${S.k}?”: 1 for the ${S.k}, 0 for the others.` }, { t: 'Whichever has the biggest h', ok: false, fb: 'Targets come from the labels, not from the network.' }]),
      V.predict(`m5-h-${S.j}-${S.k}-${S.seed}`, `an image with target 0 was predicted too high. If its ${V.HL(S.j)} value h is large, is its weight vote large or small?`, [{ t: 'Large', ok: true, fb: 'Weight contribution = (ŷ − y)×2h: a bigger h means a bigger vote. An image with h near 0 barely affects this weight.' }, { t: 'Small', ok: false, fb: 'The vote is (ŷ − y)×2h, so it grows with h.' }]),
      V.predict(`m5-d-${S.j}-${S.k}-${S.seed}`, `will gradient descent make the ${V.HL(S.j)} → ${V.OL(S.k)} weight bigger or smaller?`, [{ t: 'Bigger', ok: sm.gw < 0, fb: `The gradient is ${E.f(sm.gw)}. Gradient descent moves opposite it, so the weight ${sm.gw < 0 ? 'grows' : 'shrinks'}.` }, { t: 'Smaller', ok: sm.gw > 0, fb: `The gradient is ${E.f(sm.gw)}; moving opposite it makes the weight ${sm.gw < 0 ? 'grow' : 'shrink'}.` }]),
      h('button', { class: 'btn primary small', onclick: () => { S.revealed = true; render(0); } }, 'Reveal the numbers'));
    const right = h('div', { class: 'col' }, h('div', { class: 'ttl' }, `Batch for ${V.OL(S.k)} (one ${S.k}, four others)`), CU.cards(st, { show: S.revealed || !NN.predictOn ? 5 : 1 }));
    if (S.revealed || !NN.predictOn) {
      right.append(h('div', { class: 'gradbox' }, h('div', {}, 'Weight gradient ', CU.sketch(sm.gw, 30), h('b', {}, E.f(sm.gw))), h('div', {}, 'Bias gradient ', CU.sketch(sm.gb, 30), h('b', {}, E.f(sm.gb))), h('button', { class: 'btn small', onclick: () => { for (let i = 0; i < 20; i++) { const m = E.closeSummary(CU.rows(st)); st.w = E.r3(st.w - E.r3(st.alpha * m.gw)); st.b = E.r3(st.b - E.r3(st.alpha * m.gb)); } render(0); } }, 'Take 20 steps (α = 0.5)'), h('span', { class: 'small' }, `w = ${E.f(st.w)}, b = ${E.f(st.b)}, MSE = ${E.f(sm.mse)}`)));
      right.append(h('div', { class: 'hiwonly' }, CU.table(st, ['img', 'h', 'w', 'c', 'b', 'yh', 'y', 'e', 'sq', 'cw', 'cb'])));
    }
    if (NN.predictOn) right.insertBefore(qs, right.children[2] || null);
    R.append(top, h('div', { class: 'm5a' }, h('div', { class: 'col' }, CU.zoom(st, 0, { w: 420, h: 290 })), right));
  }
  /* ---------- 2. blame flows back ---------- */
  function blame(anim) {
    const L = CU.L, i = LRN.batches[0][S.img], x = LRN.deckBits[i], d = LRN.deckLabels[i], f = E.lfwd(L, x), j = 2, inp = x.findIndex((v) => v === 1);
    const errs = f.y.map((v, k) => v - (k === d ? 1 : 0)), parts = errs.map((e, k) => 2 * e * L.W2[j][k]), tot = parts.reduce((a, b) => a + b, 0), slope = f.h[j] * (1 - f.h[j]), grad = tot * slope * x[inp];
    const W = 760, H = 380, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'blame' });
    const yo = (k) => 30 + k * 34, xo = 610, xh = 380, yh = 190, xi = 110, yi = 190;
    svg.append(s('text', { x: xo, y: 16, 'text-anchor': 'middle', class: 'bt', text: 'output errors' }), s('text', { x: xh, y: yh - 44, 'text-anchor': 'middle', class: 'bt', text: `${V.HL(j)} collects blame` }), s('text', { x: xi, y: yi - 34, 'text-anchor': 'middle', class: 'bt', text: `${V.IN(inp)} → ${V.HL(j)} weight` }));
    const paths = [];
    for (let k = 0; k < 10; k++) { const p = s('path', { d: `M${xo - 18} ${yo(k)} C ${xo - 140} ${yo(k)}, ${xh + 120} ${yh}, ${xh + 22} ${yh}`, stroke: parts[k] > 0 ? V.NEG : V.POS, 'stroke-width': 1 + Math.min(7, Math.abs(parts[k]) * 10), fill: 'none', opacity: 0.75, class: 'bl' }); paths.push(p); svg.append(p); }
    svg.append(s('path', { d: `M${xh - 22} ${yh} L ${xi + 22} ${yi}`, stroke: '#2C7A7B', 'stroke-width': 4, fill: 'none', 'stroke-dasharray': '8 5', class: 'bl2' }));
    for (let k = 0; k < 10; k++) svg.append(s('circle', { cx: xo, cy: yo(k), r: 14, fill: '#fff', stroke: '#9aa6b8' }), s('text', { x: xo + 22, y: yo(k) + 4, class: 'bv', text: `OL${k}  error ${E.f(errs[k], 2)}` }));
    svg.append(s('circle', { cx: xh, cy: yh, r: 22, fill: `rgba(31,157,85,${0.1 + 0.8 * f.h[j]})`, stroke: V.ACC, 'stroke-width': 3 }), s('text', { x: xh, y: yh + 42, 'text-anchor': 'middle', class: 'bv', text: `h = ${E.f(f.h[j])}, dimmer slope h(1−h) = ${E.f(slope)}` }));
    svg.append(s('rect', { x: xi - 18, y: yi - 18, width: 36, height: 36, rx: 8, fill: V.ON, stroke: '#7d8a9c' }), s('text', { x: xi, y: yi + 5, 'text-anchor': 'middle', class: 'bv w', text: '1' }));
    const box = h('div', { class: 'blamewrap' }, svg, h('div', { class: 'card small' }, h('p', {}, h('b', {}, 'In words: '), `each output’s error travels back along its weight to ${V.HL(j)} (thicker = more blame). The blame adds up, gets scaled by how sensitive the dimmer is right now, and then by the input. That gives the gradient for the ${V.IN(inp)} → ${V.HL(j)} weight.`),
      h('div', { class: 'hiwonly calc' }, h('div', {}, `blame at ${V.HL(j)} = Σ 2(ŷₖ − yₖ) × w(${V.HL(j)}→OLₖ) = `, h('b', {}, E.f(tot))), h('div', {}, `× dimmer slope ${E.f(slope)} × input ${x[inp]} = `, h('b', {}, E.f(grad)), ' (this image’s contribution)'), h('div', { class: 'muted' }, 'Average over the batch, like the close-up, to get the gradient.')),
      h('p', {}, h('span', { style: 'color:#e07b19;font-weight:800' }, 'Orange'), ': this output’s blame says lower the hidden value. ', h('span', { style: 'color:#2f6fd6;font-weight:800' }, 'Blue'), ': raise it.'), h('p', { class: 'muted' }, 'Not the same formula as HL3 → OL4: a hidden weight’s gradient needs the errors of every output and the weights after it. That’s why backpropagation goes from the outputs backward.'),
      h('div', { class: 'chips' }, h('span', { class: 'small muted' }, 'Image:'), LRN.batches[0].map((ii, q) => h('button', { class: 'chip' + (S.img === q ? ' on' : ''), onclick: () => { S.img = q; render(1); } }, 'a ' + LRN.deckLabels[ii])))));
    els.root.append(box);
    if (anim) { paths.forEach((p) => { const L2 = p.getTotalLength(); p.style.strokeDasharray = L2; p.style.strokeDashoffset = L2; }); return NN.anim(1400, (u) => paths.forEach((p) => (p.style.strokeDashoffset = p.getTotalLength() * (1 - u)))); }
  }
  /* ---------- 3. all 200 ---------- */
  function all200() {
    const L = CU.L, b = LRN.batches[0], r = E.lstep(L, b.map((i) => LRN.deckBits[i]), b.map((i) => LRN.deckLabels[i]), LRN.lr);
    const dW1 = L.W1.map((row, i) => row.map((v, j) => r.L.W1[i][j] - v)), dW2 = L.W2.map((row, j) => row.map((v, k) => r.L.W2[j][k] - v));
    const all = [...dW1.flat(), ...dW2.flat(), ...r.L.b1.map((v, j) => v - L.b1[j]), ...r.L.b2.map((v, k) => v - L.b2[k])], mx = Math.max(...all.map(Math.abs)), sc = 0.9 / mx;
    const x = LRN.deckBits[b[0]], f = E.lfwd(L, x);
    const net = V.network({ net: { W1: dW1.map((rw) => rw.map((v) => v * sc)), W2: dW2.map((rw) => rw.map((v) => v * sc)) }, fw: { x, h: f.h, o: f.y }, values: false, continuous: true, edges: 'all', icons: false, maxW: 0.9 });
    const sorted = all.map(Math.abs).sort((a, c) => c - a);
    els.root.append(h('div', { class: 'm5c' }, h('div', { class: 'netbox' }, net), h('div', { class: 'card small' }, h('div', { class: 'ttl' }, 'One step on batch A ', h('span', { class: 'tag real' }, 'real changes')), h('p', {}, `${all.length} parameters changed: 80 + 100 weights and 10 + 10 biases.`), h('p', {}, 'Blue = this weight went up; orange = it went down. Thickness = how much (scaled up: the real changes are tiny). The inputs and node colors are shown for the first image only; the changes come from all 5.'), h('p', {}, `Biggest change: ${E.f(sorted[0], 4)}. Median change: ${E.f(sorted[100], 4)}.`), h('p', { class: 'muted' }, 'Each weight moved by its own gradient, worked out by the same chain of reasoning as the close-up, but different arithmetic for each layer.'))));
  }
  /* ---------- 4. the cycle ---------- */
  function cycle() {
    const stages = [['Forward propagation', 'Use the current weights and biases to calculate the outputs.'], ['Error', 'Compare the outputs with the targets; average the squared errors (MSE).'], ['Backpropagation', 'Work backward to calculate how changing each parameter would change the error (the gradients).'], ['Gradient descent', 'Nudge every parameter opposite its gradient, by the learning rate.']];
    const done = [0, 1, 2, 3].every((q) => S.order[q] === q + 1);
    const ring = !done ? h('div', { class: 'card ringwait' }, h('div', { class: 'ttl' }, 'The cycle'), h('p', {}, 'Number the four stages on the right. The cycle appears when all four are in the right order.')) : h('div', { class: 'ring' }, stages.map(([n, d], q) => h('div', { class: 'rs p' + q }, h('b', {}, `${q + 1}. ${n}`), h('div', { class: 'small' }, d))), h('div', { class: 'rc' }, '↻ then the next forward propagation uses the updated values'));
    const shuffled = [2, 0, 3, 1];
    const quiz = h('div', { class: 'card quiz' }, h('div', { class: 'ttl' }, 'Put these in order'), shuffled.map((q) => h('div', { class: 'qr' }, h('select', { onchange: (e) => { S.order[q] = +e.target.value; render(3); } }, h('option', { value: '' }, '#'), [1, 2, 3, 4].map((n) => h('option', { value: n, selected: S.order[q] === n ? true : null }, n))), h('span', { class: 'qt' }, ' ' + stages[q][1]), S.order[q] ? h('span', { class: S.order[q] === q + 1 ? 'okm' : 'badm' }, S.order[q] === q + 1 ? ` ✓ ${stages[q][0]}` : ' ✗') : null)));
    els.root.append(h('div', { class: 'm5d' }, ring, quiz));
  }
  /* ---------- 5. parallel training ---------- */
  function parallel() {
    const W = S.wk, batch = LRN.batches[0];
    const lanes = [['Forward pass', 'img', '#4e79a7'], ['Error', 'img', '#7b61a8'], ['Backprop contribution', 'img', '#4b5563'], ['Combine into batch gradient', 'one', '#8a8f99'], ['Update parameters', 'par', '#c04a8a']];
    // schedule: each lane starts when the previous lane is completely finished
    let t = 0; const plan = lanes.map(([n, kind, col]) => { const tasks = kind === 'img' ? 5 : kind === 'one' ? 1 : 200, per = kind === 'par' ? W * 40 : W, dur = Math.ceil(tasks / per); const p = { n, kind, col, start: t, dur, per, tasks }; t += dur; return p; });
    const total = t, grid = h('div', { class: 'tl', style: `grid-template-columns: 210px repeat(${total}, 64px)` });
    grid.append(h('div', { class: 'tlh' }, 'stage'), ...Array.from({ length: total }, (_, q) => h('div', { class: 'tlh' }, 'time ' + (q + 1))));
    plan.forEach((p) => {
      grid.append(h('div', { class: 'tll', style: `border-left:5px solid ${p.col}` }, p.n));
      for (let q = 0; q < total; q++) {
        const on = q >= p.start && q < p.start + p.dur, cell = h('div', { class: 'tlc' + (on ? ' on' : ''), style: on ? `background:${p.col}22;border-color:${p.col}` : '' });
        if (on && p.kind === 'img') { const k0 = (q - p.start) * p.per; batch.slice(k0, k0 + p.per).forEach((i) => cell.append(V.thumb(E.deckImg(i), 18))); }
        if (on && p.kind === 'one') cell.append(h('span', { class: 'tlt' }, '5 \u2192 1'));
        if (on && p.kind === 'par') { const k0 = (q - p.start) * p.per; cell.append(h('span', { class: 'tlt' }, `${Math.min(200, k0 + p.per) - k0} params`)); }
        grid.append(cell);
      }
    });
    els.root.append(h('div', {}, h('div', { class: 'chips' }, h('span', { class: 'small muted' }, 'Workers that can calculate at the same time:'), [1, 5, 50].map((n) => h('button', { class: 'chip' + (W === n ? ' on' : ''), onclick: () => { S.wk = n; render(4); } }, n === 1 ? '1 worker' : n + ' workers'))),
      h('div', { class: 'card wk' }, h('div', { class: 'ttl' }, `One training step on batch A: ${total} time steps`), grid, h('div', { class: 'small muted' }, 'Each row starts only when the row above is completely done. Inside a row, the workers share the work.')),
      h('div', { class: 'm5e' }, h('div', { class: 'card small' }, h('b', {}, 'Can happen together: '), 'the 5 images\u2019 forward passes (and the neurons inside each layer), their errors, their gradient contributions, and the updates to different parameters.'), h('div', { class: 'card small' }, h('b', {}, 'Must wait: '), 'the error needs the forward pass; backpropagation needs the error; the batch gradient needs every image\u2019s contribution; the update needs the gradient; the next batch needs the updated weights.'), h('div', { class: 'card small muted' }, 'With 50 workers the step takes 5 time units, not 1: the waiting between stages can\u2019t be removed. Chips with thousands of workers (GPUs) made modern AI training practical.'))));
  }
  function render(step, anim) { els.root.innerHTML = ''; els.root.className = 'm5 s' + step; const r = [transfer, () => blame(anim), all200, cycle, parallel][step](); return r || Promise.resolve(); }
  NN.reg({
    id: 'M5', part: 2, title: 'Every connection', short: 'All 200', steps,
    about: '<p><b>On this page:</b> the HL3 → OL4 reasoning, applied to any connection; how weights deeper in the network get their share of the blame; and the whole training cycle across all 200 parameters.</p>',
    enter, reset: fresh,
    show(step, o) { if (!S.cu) fresh(); return render(step, o.anim); },
  });
})();
