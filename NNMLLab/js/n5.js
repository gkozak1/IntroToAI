/* N5 Other problems, other shapes: architectures follow the problem; classification vs regression; be the architect. */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h, s = NN.s;
  const DL = E.DL, PH = window.NN_PHOTO;
  const S = {};
  const fresh = () => { S.sel = 'digits'; S.f = { dist: 3, items: 4, rain: 0, rush: 0 }; S.sc = 0; S.ans = {}; S.photo = 0; };
  fresh();
  const NETS = [
    { id: 'hand', name: 'Our hand-built digit reader', layers: [8, 10, 10], badge: '', inp: '8 regions of a digit image, each on or off', out: '10 outputs, one per digit (the one that fires is the answer)', kind: 'Classification: which category?', ex: 'Written by hand, not trained', err: '—' },
    { id: 'digits', name: 'Trained digit reader', layers: [784, 32, 10], badge: 'big', inp: '784 pixel shades (28 × 28)', out: '10 outputs, one per digit, as confidence that adds to 100%', kind: 'Classification: which category?', ex: 'An image + its correct digit (“this is a 7”)', err: 'Right or wrong, and how confident it was in the right answer' },
    { id: 'photo', name: 'Photo classifier', layers: [3072, 64, 10], badge: 'other', inp: '32 × 32 color photo: 3 numbers per pixel (red, green, blue) = 3,072', out: '10 outputs: plane, car, bird, cat, deer, dog, frog, horse, ship, truck', kind: 'Classification: which category?', ex: 'A photo + its correct label (“this is a cat”)', err: 'Right or wrong, and confidence in the right answer' },
    { id: 'time', name: 'Delivery-time predictor', layers: [4, 8, 1], badge: 'other', inp: 'distance, number of items, raining?, rush hour?', out: '1 output: predicted minutes', kind: 'Regression: how much?', ex: 'An order’s 4 facts + how many minutes it really took', err: 'How many minutes off it was' },
    { id: 'late', name: '“Will it be late?”', layers: [4, 8, 1], badge: 'other', inp: 'the same 4 facts', out: '1 output: probability it takes over 35 minutes', kind: 'Classification (yes/no)', ex: 'An order’s 4 facts + was it late? (1 = yes, 0 = no)', err: 'How wrong the yes/no probability was' },
    { id: 'gpt2', name: 'GPT-2’s last step (LLM Lab)', layers: [768, 50257], badge: 'other', inp: 'a 768-number vector for the latest token (made by 12 transformer blocks, each with its own 3,072-neuron layers)', out: '50,257 outputs: one score for every token it knows', kind: 'Classification: which token comes next?', ex: 'Text + the real next token', err: 'How much probability it gave the real next token' },
  ];
  const steps = [
    { t: 'Many shapes', c1: 'Different problems need different network shapes', c2: 'The inputs come from the data; the outputs come from the question being asked. Click a network to compare.' },
    { t: 'Photos', c1: 'A photo classifier: same idea, far more inputs', c2: () => PH && V.pending('n5-photo') ? 'A color photo is 32×32 pixels × 3 colors = 3,072 inputs, and 10 outputs, one per kind of object. Really trained on 3,596 small photos, then shown photos it has never seen.' : PH ? `A color photo is 32×32 pixels × 3 colors = 3,072 inputs. This network was really trained on ${PH.nTrain.toLocaleString()} small photos; on ${PH.nTest.toLocaleString()} new ones it gets ${E.pct(PH.acc)} right (guessing would get 10%).` : 'A color photo is 32×32 pixels × 3 colors = 3,072 inputs, and 10 outputs, one per kind of object.' },
    { t: 'Predict an amount', c1: () => (V.pending('n5-reg') ? 'Delivery time: predict how many minutes an order will take' : 'Regression: the output is an amount, not a category'), c2: () => `Delivery time: 4 inputs, 1 output in minutes. Trained on ${(DL.n * 0.8).toLocaleString()} made-up orders; on new orders it is off by ${E.f2(DL.mae)} minutes on average.` },
    { t: 'Same shape, new job', c1: 'One output can mean an amount or a yes/no', c2: 'Both networks are 4 → 8 → 1. What differs is what the output means, its activation, the target it learns from, and how its error is measured.' },
    { t: 'Be the architect', c1: 'Your turn: design the network for a new problem', c2: 'Decide the inputs, the outputs, and whether it’s a category or an amount. Sometimes the right answer is “don’t use a network”.' },
  ];
  let els = {};
  function enter(stage) { stage.append((els.root = h('div', { class: 'n5' }))); }
  /* silhouette: one bar per layer, height by log size */
  function silhouette(layers, o = {}) {
    const W = o.w || 260, H = o.h || 130, n = layers.length, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'sil' });
    const hh = (v) => Math.max(10, Math.min(H - 30, 12 + Math.log10(v) * 22)), xs = layers.map((_, i) => 24 + (i * (W - 48)) / (n - 1)), mid = (H - 18) / 2;
    for (let i = 0; i < n - 1; i++) svg.append(s('path', { d: `M${xs[i] + 7} ${mid - hh(layers[i]) / 2} L${xs[i + 1] - 7} ${mid - hh(layers[i + 1]) / 2} L${xs[i + 1] - 7} ${mid + hh(layers[i + 1]) / 2} L${xs[i] + 7} ${mid + hh(layers[i]) / 2} Z`, fill: '#e3dcfb', opacity: 0.8 }));
    layers.forEach((v, i) => { svg.append(s('rect', { x: xs[i] - 7, y: mid - hh(v) / 2, width: 14, height: hh(v), rx: 4, fill: i === 0 ? '#7aa7e8' : i === n - 1 ? '#3cc46a' : '#9b87e6' })); svg.append(s('text', { x: xs[i], y: H - 4, 'text-anchor': 'middle', class: 'sl', text: v.toLocaleString() })); });
    return svg;
  }
  const params = (L) => L.slice(0, -1).reduce((t, a, i) => t + a * L[i + 1] + L[i + 1], 0);
  function shapes() {
    const R = els.root; R.className = 'n5 shapes';
    const grid = h('div', { class: 'cards' });
    NETS.forEach((n) => grid.append(h('div', { class: 'ncard' + (S.sel === n.id ? ' on' : ''), onclick: () => { S.sel = n.id; render(0); } }, h('div', { class: 'nn' }, n.name), silhouette(n.layers), h('div', { class: 'np' }, n.layers.join(' → ')))));
    const n = NETS.find((x) => x.id === S.sel);
    const det = h('div', { class: 'card det' }, h('div', { class: 'ttl' }, n.name), silhouette(n.layers, { w: 380, h: 150 }),
      h('table', { class: 'ws dett' }, [['Inputs', n.inp], ['Outputs', n.out], ['Kind of problem', n.kind], ['One training example', n.ex], ['Error is measured as', n.err], ['Parameters (if fully connected)', n.id === 'gpt2' ? 'this last step alone: 768 × 50,257 ≈ 38.6 million; 124 million in all' : params(n.layers).toLocaleString()]].map(([a, b]) => h('tr', {}, h('th', {}, a), h('td', {}, b)))),
      n.id === 'photo' ? h('div', { class: 'note' }, 'Real photo classifiers first use convolution layers, which scan the photo for small patterns like edges, before fully connected layers like these. We show the simplest version.') : null);
    R.append(h('div', { class: 'shgrid' }, h('div', {}, grid, h('div', { class: 'note' }, 'Bar heights use a log scale (each step is 10× more neurons), or the big layers wouldn’t fit.')), det));
  }
  function photos() {
    const R = els.root; R.className = 'n5 photos';
    if (!PH) { R.append(h('div', { class: 'card' }, h('div', { class: 'ttl' }, 'Photo classifier'), silhouette([3072, 64, 10], { w: 420, h: 160 }), h('p', {}, 'Example photos are not available in this copy of the app.'))); return; }
    const g = h('div', { class: 'phg' });
    PH.examples.forEach((ex, q) => {
      const cv = h('canvas', { width: 32, height: 32, class: 'ph' }), ctx = cv.getContext('2d'), id = ctx.createImageData(32, 32), px = E.b64(ex.img);
      for (let i = 0; i < 1024; i++) { id.data[i * 4] = px[i * 3]; id.data[i * 4 + 1] = px[i * 3 + 1]; id.data[i * 4 + 2] = px[i * 3 + 2]; id.data[i * 4 + 3] = 255; } ctx.putImageData(id, 0, 0);
      const ok = ex.pred === ex.label;
      g.append(h('div', { class: 'phc' + (S.photo === q ? ' on' : ''), onclick: () => { S.photo = q; render(1); }, title: `really a ${PH.classes[ex.label]}` }, cv, V.veil(h('div', { class: ok ? 'okt' : 'bad' }, (ok ? '✓ said ' : '✗ said ') + PH.classes[ex.pred]), 'n5-photo')));
    });
    const ex = PH.examples[S.photo];
    const bars = h('div', { class: 'pbars' }, PH.classes.map((c, k) => h('div', { class: 'pb' }, h('span', { class: 'pl' + (k === ex.label ? ' t' : '') }, c), h('span', { class: 'track' }, h('span', { class: 'fill', style: `width:${ex.p[k] * 100}%;background:${k === ex.pred ? V.ON : '#9db7e8'}` })), h('span', { class: 'pv' }, E.pct(ex.p[k])))));
    R.append(h('div', { class: 'phgrid' }, h('div', {}, h('div', { class: 'ttl' }, 'Photos it has never seen ', h('span', { class: 'tag real' }, 'real results')), g, V.veil(h('div', { class: 'note' }, `Overall: ${E.pct(PH.acc)} of ${PH.nTest.toLocaleString()} new photos right. Photos are much harder than digits. Real photo classifiers add convolution layers (layers that scan the photo for small patterns like edges and textures) and reach well over 90%.`), 'n5-photo'),
        V.predict('n5-photo', `our trained digit reader gets ${E.pct(E.ladder[2].final)} of new digits right. On new photos, how will this network do?`, [{ t: 'About as well', ok: false, fb: `Only ${E.pct(PH.acc)}. Same building blocks, but a photo’s object can be anywhere, any size, any color, on any background.` }, { t: 'Much worse', ok: true, fb: `Yes: ${E.pct(PH.acc)} (guessing gets 10%). Photos vary far more than centered digits.` }])),
      h('div', { class: 'card' }, h('div', { class: 'ttl' }, `This photo is a ${PH.classes[ex.label]}`), (() => { const big = h('canvas', { width: 32, height: 32, class: 'ph big' }); big.getContext('2d').drawImage(g.querySelectorAll('canvas')[S.photo], 0, 0); return big; })(), h('div', { class: 'ttl' }, 'Its 10 outputs (confidence)'), V.veil(bars, 'n5-photo'), silhouette([3072, 64, 10], { w: 300, h: 110 }), h('div', { class: 'small' }, '3,072 inputs → 64 hidden → 10 outputs. Same building blocks as our digit network: weighted sums, biases, activations.'))));
  }
  function deliveryNet(kind) {
    const v = E.delivery(kind, S.f), m = DL[kind], x = [S.f.dist / DL.scale.dist, S.f.items / DL.scale.items, S.f.rain, S.f.rush];
    const hid = m.b1.map((b, j) => Math.max(0, b + x.reduce((s2, xv, i) => s2 + xv * m.W1[i][j], 0)));
    const W = 360, H = 250, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dnet' });
    const yi = (i) => 40 + i * 52, yh = (j) => 20 + j * 28, names = ['distance', 'items', 'rain', 'rush hour'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) svg.append(s('line', { x1: 90, y1: yi(i), x2: 190, y2: yh(j), stroke: V.wColor(m.W1[i][j]), 'stroke-width': V.wWidth(m.W1[i][j], 3), opacity: 0.5 }));
    for (let j = 0; j < 8; j++) svg.append(s('line', { x1: 190, y1: yh(j), x2: 290, y2: 125, stroke: V.wColor(m.W2[j]), 'stroke-width': V.wWidth(m.W2[j], 8), opacity: 0.5 }));
    for (let i = 0; i < 4; i++) svg.append(s('rect', { x: 74, y: yi(i) - 13, width: 32, height: 26, rx: 6, fill: `rgba(31,157,85,${0.1 + 0.8 * x[i]})`, stroke: '#7d8a9c' }), s('text', { x: 66, y: yi(i) + 4, 'text-anchor': 'end', class: 'nl', text: names[i] }));
    const mh = Math.max(...hid, 1);
    for (let j = 0; j < 8; j++) svg.append(s('circle', { cx: 190, cy: yh(j), r: 10, fill: `rgba(31,157,85,${0.08 + 0.85 * hid[j] / mh})`, stroke: '#7d8a9c' }));
    svg.append(s('circle', { cx: 300, cy: 125, r: 22, fill: '#fff', stroke: V.ACC, 'stroke-width': 3 }), s('text', { x: 300, y: 130, 'text-anchor': 'middle', class: 'ov', text: kind === 'reg' ? Math.round(v) : v < 0.01 ? '<1%' : E.pct(v) }), s('text', { x: 300, y: 165, 'text-anchor': 'middle', class: 'nl', text: kind === 'reg' ? 'minutes' : 'chance late' }));
    return { svg, v, hid, m };
  }
  function form() {
    const f = S.f, sl = (lab, k, lo, hi, st, fmt) => { const val = h('span', { class: 'v' }, fmt(f[k])); const inp = h('input', { type: 'range', min: lo, max: hi, step: st, value: f[k], oninput: (e) => { S.f[k] = +e.target.value; render(NN.st.step); } }); return h('label', { class: 'slider' }, h('span', { class: 'sl' }, lab), inp, val); };
    const tg = (lab, k) => h('button', { class: 'chip' + (f[k] ? ' on' : ''), onclick: () => { S.f[k] = f[k] ? 0 : 1; render(NN.st.step); } }, (f[k] ? '✔ ' : '') + lab);
    return h('div', { class: 'card dform' }, h('div', { class: 'ttl' }, 'An order'), sl('Distance', 'dist', 0.5, 8, 0.5, (v) => v + ' mi'), sl('Items', 'items', 1, 10, 1, (v) => v), h('div', { class: 'chips' }, tg('Raining', 'rain'), tg('Rush hour', 'rush')));
  }
  function regression(both) {
    const R = els.root; R.className = 'n5 reg';
    const a = deliveryNet('reg');
    const head = h('tr', {}, ['miles', 'items', 'rain', 'rush', 'actual minutes', both ? 'late?' : null].filter(Boolean).map((t) => h('th', {}, t)));
    const rows = DL.examples.map((e) => h('tr', {}, h('td', {}, e.dist), h('td', {}, e.items), h('td', {}, e.rain ? 'yes' : 'no'), h('td', {}, e.rush ? 'yes' : 'no'), h('td', { class: 'k' }, e.mins), both ? h('td', { class: 'k' }, e.mins > 35 ? '1' : '0') : null));
    const exCard = h('div', { class: 'card' }, h('div', { class: 'ttl' }, 'Training examples (made-up orders) ', h('span', { class: 'tag' }, 'made-up data')), h('table', { class: 'ws' }, head, rows));
    const left = h('div', { class: 'col' }, form(), exCard, h('div', { class: 'note' }, both ? 'The same orders, two different targets: the minutes, or a 1/0 for late.' : 'Each example has the right answer (the target): supervised learning.'));
    const mid = h('div', { class: 'col' }, h('div', { class: 'ttl' }, 'Delivery time ', (both ? (x) => x : (x) => V.veil(x, 'n5-reg'))(h('span', { class: 'badge other' }, '4 → 8 → 1, regression'))), a.svg, h('div', { class: 'bigans' }, `Predicted: ${Math.round(a.v)} minutes`), both ? null : h('div', { class: 'hiwonly calc small' }, `minutes = bias ${E.f2(a.m.b2)} + ` + a.hid.map((x, j) => `${E.f2(x)}×${E.f2(a.m.W2[j])}`).join(' + ') + ` = ${E.f2(a.v)}  (each hidden value = ramp(its weighted inputs + bias))`), h('div', { class: 'note' }, `Real network, trained offline. Its error is measured in minutes: on new orders it is off by ${E.f2(DL.mae)} minutes on average.`));
    const cols = [left, mid];
    if (both) {
      const b = deliveryNet('late');
      cols.push(h('div', { class: 'col' }, h('div', { class: 'ttl' }, 'Will it be late? ', h('span', { class: 'badge other' }, '4 → 8 → 1, yes/no')), b.svg, h('div', { class: 'bigans' }, `${b.v < 0.01 ? 'under 1%' : E.pct(b.v)} chance it takes over 35 min`), h('div', { class: 'note' }, `Right on ${E.pct(DL.lateAcc)} of new orders.`)));
      R.append(h('div', { class: 'reggrid three' }, cols));
      R.append(h('table', { class: 'ws cmp' }, h('tr', {}, h('th', {}, ''), h('th', {}, 'Delivery time (regression)'), h('th', {}, 'Late? (classification)')), [['The output means', 'minutes', 'probability of “late”'], ['Output activation', 'none: any number', 'dimmer (sigmoid): squeezed between 0 and 1'], ['Target it learns from', 'the real minutes', '1 if late, 0 if not'], ['Error measured as', 'how many minutes off', 'how wrong the yes/no probability was']].map((r) => h('tr', {}, r.map((c, i) => (i ? h('td', {}, c) : h('th', {}, c)))))));
    } else {
      R.append(h('div', { class: 'reggrid' }, cols));
      R.append(V.predict('n5-reg', 'is predicting a delivery time classification or regression?', [{ t: 'Classification', ok: false, fb: 'Minutes are an amount on a scale, not a category, so it’s regression.' }, { t: 'Regression', ok: true, fb: 'Yes: the answer is an amount (minutes).' }]));
    }
  }
  const SC = [
    { q: 'Read road signs from 20 × 20 gray photos. There are 43 kinds of sign.', inp: 400, out: 43, kind: 'cat', net: true, why: '20 × 20 = 400 pixel inputs; one output per sign type.' },
    { q: 'Predict a used car’s price from 6 facts (age, miles, brand, size, condition, accidents).', inp: 6, out: 1, kind: 'amt', net: true, why: '6 facts in; one amount (dollars) out.' },
    { q: 'Recognize capital letters A–Z in 28 × 28 images.', inp: 784, out: 26, kind: 'cat', net: true, why: '784 pixels; one output per letter.' },
    { q: 'Decide if an email is phishing, from 20 measured features of the email.', inp: 20, out: 1, outAlt: 2, kind: 'cat', net: true, why: 'A yes/no category: one output, a probability between 0 and 1 (or 2 outputs, yes and no).' },
    { q: 'Predict tomorrow’s high temperature from 5 of today’s weather readings.', inp: 5, out: 1, kind: 'amt', net: true, why: 'An amount (degrees) from 5 numbers.' },
    { q: 'Sort 64 × 64 color photos into 5 kinds of fruit.', inp: 12288, out: 5, kind: 'cat', net: true, why: '64 × 64 × 3 colors = 12,288 inputs; 5 outputs.' },
    { q: 'Calculate students’ final grades from their scores using the school’s fixed formula.', inp: 0, out: 0, kind: 'amt', net: false, why: 'The rule is already known exactly. An ordinary program is simpler, exact and explainable; having thousands of grades doesn’t change that.' },
  ];
  function architect() {
    const R = els.root; R.className = 'n5 arch';
    const sc = SC[S.sc], a = S.ans[S.sc] || {};
    const set = (k, v) => { S.ans[S.sc] = { ...a, [k]: v, checked: false }; render(4); };
    const chk = a.checked;
    const mark = (ok) => (chk ? h('span', { class: ok ? 'okm' : 'badm' }, ok ? '✓' : '✗') : null);
    const okNet = a.net === sc.net, okIn = !sc.net || +a.inp === sc.inp, okOut = !sc.net || +a.out === sc.out || +a.out === sc.outAlt, okKind = !sc.net || a.kind === sc.kind;
    R.append(h('div', { class: 'chips' }, SC.map((x, q) => h('button', { class: 'chip' + (q === S.sc ? ' on' : ''), onclick: () => { S.sc = q; render(4); } }, 'Problem ' + (q + 1)))));
    const card = h('div', { class: 'card archc' }, h('div', { class: 'aq' }, sc.q),
      h('div', { class: 'arow' }, h('span', {}, 'Use a neural network?'), h('button', { class: 'chip' + (a.net === true ? ' on' : ''), onclick: () => set('net', true) }, 'Yes, a network'), h('button', { class: 'chip' + (a.net === false ? ' on' : ''), onclick: () => set('net', false) }, 'No, an ordinary program'), mark(okNet)),
      a.net !== false ? [h('div', { class: 'arow' }, h('span', {}, 'How many input neurons?'), h('input', { class: 'num', type: 'number', value: a.inp || '', onchange: (e) => set('inp', e.target.value) }), mark(okIn)),
        h('div', { class: 'arow' }, h('span', {}, 'How many output neurons?'), h('input', { class: 'num', type: 'number', value: a.out || '', onchange: (e) => set('out', e.target.value) }), mark(okOut)),
        h('div', { class: 'arow' }, h('span', {}, 'The answer is…'), h('button', { class: 'chip' + (a.kind === 'cat' ? ' on' : ''), onclick: () => set('kind', 'cat') }, 'a category (classification)'), h('button', { class: 'chip' + (a.kind === 'amt' ? ' on' : ''), onclick: () => set('kind', 'amt') }, 'an amount (regression)'), mark(okKind))] : null,
      h('div', { class: 'chips' }, h('button', { class: 'btn primary small', onclick: () => { S.ans[S.sc] = { ...a, checked: true }; render(4); } }, 'Check'), chk ? h('span', { class: 'small' }, (okNet && okIn && okOut && okKind ? '✔ Nice design. ' : '') + sc.why) : null));
    const prev = a.net && a.inp && a.out ? h('div', { class: 'card' }, h('div', { class: 'ttl' }, 'Your design'), silhouette([+a.inp, 16, +a.out], { w: 300, h: 130 }), h('div', { class: 'small muted' }, 'The hidden layer’s size is a choice you test, not something the problem tells you (remember the ladder in N4).')) : null;
    R.append(h('div', { class: 'archgrid' }, card, prev));
  }
  function render(step) { els.root.innerHTML = ''; [shapes, photos, () => regression(false), () => regression(true), architect][step](); }
  NN.reg({
    id: 'N5', part: 1, title: 'Other problems, other shapes', short: 'Shapes', steps,
    about: '<p><b>On this page:</b> networks are built to fit their problem. The inputs come from the data; the outputs come from the question.</p><p><b>To do:</b> compare the network shapes, browse a real photo classifier’s results, change an order and watch two delivery networks respond, then design networks for new problems.</p>',
    enter, reset: fresh,
    show(step) { render(step); return Promise.resolve(); },
  });
})();
