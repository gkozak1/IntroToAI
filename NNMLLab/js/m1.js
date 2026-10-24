/* M1 Why learn? From the hand-built network to the Learner. */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h, s = NN.s, LRN = E.LRN;
  let els = {}, S = { quiz: {} };
  const steps = [
    { t: 'Too many to set', c1: 'Nobody can choose these numbers by hand', c2: 'You set OL7’s 10 weights in N2, and that was fiddly. A real network has thousands or millions. Instead we show it examples, measure its mistakes, and let it adjust itself. That’s machine learning.' },
    { t: 'Ways to learn', c1: 'Four ways a machine can learn', c2: 'This app trains with supervised classification: every training image comes with the right answer. Sort the examples on the right.' },
    { t: 'Hand-built → Learner', c1: 'Same shape, new start: meet the Learner', c2: 'Still 8 inputs, 10 hidden, 10 outputs, and the same images and inputs. What changes: the weights start random, the biases start at 0, the hidden neurons get a dimmer, and the outputs become plain scores.' },
    { t: 'Why a dimmer?', c1: 'Learning needs small changes to make small differences', c2: () => (NN.V.pending('m1-st') ? 'Left: the error as one weight changes in the hand-built network (on/off switches). Right: the same for the Learner (dimmers). The hiker feels only the ground underfoot.' : 'With an on/off switch, nudging a weight usually changes nothing: the error is flat like a stair, so there is no slope to follow. With a dimmer, every nudge changes the error a little, so the network can feel which way is downhill.') },
    { t: 'Training deck', c1: () => `The training deck: ${LRN.deckLabels.length} labeled images, dealt in batches of ${LRN.batch}`, c2: () => `Each image comes with its target: 1 for its own digit’s output, 0 for the rest. One pass through the whole deck (${LRN.deckLabels.length / LRN.batch} batches) is an epoch. Other images are kept aside, unseen, for testing later.` },
  ];
  function enter(stage) { stage.append((els.root = h('div', { class: 'm1' }))); }
  function counters() {
    const rows = [['Our 8–10–10 network', 200, 'you set 10 of these in N2'], ['Trained digit reader (N4)', 25450, '784 → 32 → 10'], ['GPT-2 (LLM Lab)', 124439808, 'a small language model by today’s standards']];
    const box = h('div', { class: 'card cnt' }, h('div', { class: 'ttl' }, 'Weights and biases to choose'));
    rows.forEach(([n, v, note]) => box.append(h('div', { class: 'cr' }, h('span', { class: 'cn' }, n), h('span', { class: 'track' }, h('span', { class: 'fill', style: `width:${(Math.log10(v) / Math.log10(124439808)) * 100}%;background:#9b87e6` })), h('b', {}, v.toLocaleString()), h('span', { class: 'small muted' }, note))));
    box.append(h('div', { class: 'note' }, 'Bars use a log scale: each step is 10 times more.'));
    return box;
  }
  function loop() { return h('div', { class: 'card loopc' }, h('div', { class: 'ttl' }, 'The idea of machine learning'), h('div', { class: 'loop' }, ['Show it an example', 'It makes a guess', 'Measure how wrong', 'Adjust the numbers a little'].map((t, i) => h('div', { class: 'lp p' + i }, h('b', {}, i + 1), t)), h('div', { class: 'lpr' }, '↻ repeat thousands of times')), h('p', { class: 'small' }, h('b', {}, 'Training'), ' is what we do: give examples and feedback. ', h('b', {}, 'Learning'), ' is what happens inside: the network’s weights and biases change so its answers improve.')); }
  const KINDS = [
    { k: 'sc', n: 'Supervised classification', d: 'Learns from examples labeled with the right category.', ex: 'Digit images labeled 0–9 (this app).' },
    { k: 'sr', n: 'Supervised regression', d: 'Learns from examples labeled with the right amount.', ex: 'Past deliveries with their real minutes (N5).' },
    { k: 'un', n: 'Unsupervised', d: 'No labels: finds groups or patterns on its own.', ex: 'Sorting drawings into piles of look-alikes, without being told what they are.' },
    { k: 'rl', n: 'Reinforcement', d: 'Tries actions and learns from rewards and penalties.', ex: 'A game player that gets points for winning.' },
  ];
  const QZ = [
    ['Sort songs into groups by how they sound, with no genre labels given.', 'un'],
    ['A robot vacuum tries different routes and scores points for finishing quickly.', 'rl'],
    ['Predict a house’s sale price, learning from past sales with known prices.', 'sr'],
    ['Identify bird species in photos, learning from photos experts already labeled.', 'sc'],
    ['Predict how many minutes late a bus will be, from records of past trips.', 'sr'],
    ['A chess program improves by playing itself and winning or losing.', 'rl'],
  ];
  function kinds() {
    const g = h('div', { class: 'kinds' }, KINDS.map((k) => h('div', { class: 'card kind k-' + k.k }, h('div', { class: 'kn' }, k.n), h('div', { class: 'small' }, k.d), h('div', { class: 'small muted' }, 'e.g. ' + k.ex))));
    const q = h('div', { class: 'card quiz' }, h('div', { class: 'ttl' }, 'Which kind?'));
    QZ.forEach(([t, ans], i) => { const a = S.quiz[i]; q.append(h('div', { class: 'qr' }, h('div', { class: 'qt' }, t), h('div', { class: 'chips' }, KINDS.map((k) => h('button', { class: 'chip' + (a === k.k ? (k.k === ans ? ' right' : ' wrong') : '') + (a && k.k === ans ? ' right' : ''), onclick: () => { S.quiz[i] = k.k; render(1); } }, k.n.replace('Supervised ', 'Sup. ')))))); });
    return h('div', { class: 'kgrid' }, g, q);
  }
  function morph(anim) {
    const box = h('div', { class: 'morph' }), left = h('div', { class: 'netbox' }), right = h('div', { class: 'card checklist' });
    const x = E.curatedBits[4], hand = E.hand(), L = E.learnerInit();
    const show = (which) => { left.innerHTML = ''; if (which === 'hand') left.append(V.network({ net: hand, fw: E.forward(hand, x), values: true })); else { const f = E.lfwd(L, x); let win = 0; f.y.forEach((v, k) => { if (v > f.y[win]) win = k; }); left.append(V.network({ net: L, fw: { x, h: f.h, o: f.y }, values: true, continuous: true, win, edges: 'all', icons: false, maxW: 1 })); } };
    const items = [['Shape: 8 → 10 → 10', 'same'], ['Images and 8 on/off inputs', 'same'], ['Weights: hand-picked → small random numbers', 'new'], ['Biases: −1 → start at 0', 'new'], ['Hidden activation: on/off switch → dimmer', 'new'], ['Outputs: fire / don’t → a plain score; highest wins', 'new']];
    right.append(h('div', { class: 'ttl' }, 'What changes'), items.map(([t, k], i) => h('div', { class: 'ci ' + k, 'data-i': i }, h('span', { class: 'cb' }, k === 'same' ? '=' : '✓'), t)));
    right.append(h('div', { class: 'small', style: 'margin-top:8px' }, 'Reading the example 4, the random Learner’s highest score is not OL4. It has to learn.'), h('div', { class: 'chips' }, h('button', { class: 'btn small', onclick: () => show('hand') }, 'Show hand-built'), h('button', { class: 'btn small', onclick: () => show('learn') }, 'Show Learner')));
    box.append(h('div', {}, h('div', { class: 'ttl' }, 'The network ', h('span', { class: 'badge learner' }, 'Learner (random start)')), left), right);
    show(anim ? 'hand' : 'learn');
    if (anim) { right.querySelectorAll('.ci').forEach((c) => (c.style.opacity = 0.25)); return { box, run: async () => { await NN.wait(700); const cis = right.querySelectorAll('.ci'); for (const c of cis) { c.style.opacity = 1; await NN.wait(350); } show('learn'); const es = left.querySelectorAll('.e'); await NN.anim(1200, (u) => es.forEach((e) => (e.style.opacity = u * 0.6))); } }; }
    return { box };
  }
  function stairs() {
    // real curves: error as one weight changes
    const hand = E.hand(), errHand = (w) => { const n = E.hand(); n.W2[9][4] = w; let e = 0; for (let d = 0; d < 10; d++) { const o = E.forward(n, E.curatedBits[d]).o[4]; e += (o - (d === 4 ? 1 : 0)) ** 2; } return e / 10; };
    const Ls = E.learnerSnap(), b = LRN.batches[0], errL = (w) => E.closeLossExact(Ls, b, 2, 4, w, Ls.b2[4]);
    const chart = (f, lo, hi, cur, title, sub, col, o2 = {}) => {
      const W = 420, H = 230, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'curve' }); const pts = []; for (let i = 0; i <= 200; i++) { const v = lo + ((hi - lo) * i) / 200; pts.push([v, f(v)]); }
      const ym = Math.max(...pts.map((p) => p[1])) * 1.1 || 1, X = (v) => 40 + ((v - lo) / (hi - lo)) * (W - 56), Y = (v) => H - 30 - (v / ym) * (H - 60);
      svg.append(s('text', { x: 12, y: 18, class: 'ax strong', text: title }), s('text', { x: 12, y: 34, class: 'ax', text: sub }), s('line', { x1: 40, x2: W - 10, y1: H - 30, y2: H - 30, stroke: '#9aa6b8' }), s('text', { x: W - 12, y: H - 12, 'text-anchor': 'end', class: 'ax', text: 'one weight →' }), s('text', { x: 44, y: 50, class: 'ax', text: 'error' }));
      let d = ''; pts.forEach(([v, e], i) => (d += (i ? 'L' : 'M') + X(v).toFixed(1) + ' ' + Y(e).toFixed(1))); svg.append(s('path', { d, stroke: col, 'stroke-width': 3, fill: 'none' }));
      const e0 = f(cur), g = o2.grad ? o2.grad(cur) : (f(cur + 0.01) - e0) / 0.01, sx = (W - 56) / (hi - lo), sy = (H - 60) / ym, n = Math.hypot(1, g * sy / sx);
      svg.append(s('line', { x1: X(cur) - 34 / n, y1: Y(e0) + (34 * g * sy) / sx / n, x2: X(cur) + 34 / n, y2: Y(e0) - (34 * g * sy) / sx / n, stroke: '#2C7A7B', 'stroke-width': 3 }), s('circle', { cx: X(cur), cy: Y(e0), r: 7, fill: '#A5643A', stroke: '#fff', 'stroke-width': 2 }), s('text', { x: X(cur), y: Y(e0) - 14, 'text-anchor': 'middle', class: 'ax strong', text: 'hiker' }), s('text', { x: X(cur) + 40, y: Y(e0) + 4, class: 'ax strong', text: `slope ${E.f(g)}` }));
      return svg;
    };
    return h('div', { class: 'stairs' }, h('div', {}, chart(errHand, -1, 3, 2.4, 'Hand-built: on/off switch', 'error on the 10 examples as HL10→OL4 changes', '#e07b19'), h('div', { class: 'small' }, 'Flat steps: a small nudge changes nothing, so the slope is 0. The hiker can’t tell which way is down.')), h('div', {}, chart(errL, -1, 4, Ls.W2[2][4], 'Learner: dimmer', 'error on batch A as HL3→OL4 changes', '#7b61a8', { grad: (w) => E.closeGradExact(Ls, b, 2, 4, w, Ls.b2[4]).gw }), h('div', { class: 'small' }, 'A smooth valley: every nudge changes the error a little, so the slope always points the way.')));
  }
  function deck() {
    const box = h('div', { class: 'deckwrap' }), g = h('div', { class: 'deck' });
    for (let b = 0; b < LRN.deckLabels.length / LRN.batch; b++) { const bb = h('div', { class: 'bat' + (b === 0 ? ' first' : '') }); for (let q = 0; q < LRN.batch; q++) bb.append(V.thumb(E.deckImg(b * LRN.batch + q), 20)); g.append(bb); }
    const tgt = h('div', { class: 'card' }, h('div', { class: 'ttl' }, 'Batch 1 and its targets'), h('table', { class: 'ws tg' }, h('tr', {}, h('th', {}, 'image'), Array.from({ length: 10 }, (_, k) => h('th', {}, 'OL' + k))), Array.from({ length: 5 }, (_, q) => { const d = LRN.deckLabels[q]; return h('tr', {}, h('td', {}, V.thumb(E.deckImg(q), 22)), Array.from({ length: 10 }, (_, k) => h('td', { class: k === d ? 'one' : '' }, k === d ? 1 : 0))); })), h('div', { class: 'small muted' }, 'Supervised: every training image carries its target row.'));
    const test = h('div', { class: 'card' }, h('div', { class: 'ttl' }, 'Test cards, set aside'), h('div', { class: 'testcards' }, Array.from({ length: 24 }, () => h('span', { class: 'tc' }, '?'))), h('div', { class: 'small muted' }, 'Never used for training, so they can later show whether the network works on images it has never seen (M6).'));
    box.append(h('div', {}, h('div', { class: 'ttl' }, `Training deck: ${LRN.deckLabels.length} real MNIST images in ${LRN.deckLabels.length / LRN.batch} batches of ${LRN.batch}`), g, h('div', { class: 'small' }, h('b', {}, 'Batch: '), 'the few examples used for one update. ', h('b', {}, 'Epoch: '), 'one pass through every batch in the deck.')), h('div', { class: 'col' }, tgt, test));
    return box;
  }
  function render(step, anim) {
    const R = els.root; R.innerHTML = '';
    if (step === 0) R.append(h('div', { class: 'm1a' }, counters(), loop()));
    if (step === 1) R.append(kinds());
    if (step === 2) { const m = morph(anim); R.append(m.box); if (m.run) return m.run(); }
    if (step === 3) { const stz = stairs(); const ex = stz.querySelector('.small'); V.veil(ex, 'm1-st'); R.append(stz, V.predict('m1-st', 'on the flat stairs, can the hiker tell which way is down?', [{ t: 'Yes', ok: false, fb: 'On a flat step every direction feels the same: the slope is 0. That’s why training uses a dimmer.' }, { t: 'No', ok: true, fb: 'Right: zero slope gives no direction. The dimmer makes the ground slope everywhere.' }])); }
    if (step === 4) R.append(deck());
    return Promise.resolve();
  }
  NN.reg({
    id: 'M1', part: 2, title: 'Why learn?', short: 'Why learn', steps,
    about: '<p><b>On this page:</b> why networks learn their weights instead of having them set by hand, the kinds of machine learning, and how the hand-built network becomes the Learner that Part 2 trains.</p>',
    enter, reset: () => { S.quiz = {}; },
    show(step, o) { return render(step, o.anim); },
  });
})();
