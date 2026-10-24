/* N1 Watch it read: forward propagation on the hand-built network, one visible step at a time. */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h, s = NN.s;
  const S = { d: 4, focus: null };
  const net = E.hand();
  const fwOf = (d) => E.forward(net, E.curatedBits[d]);
  // the hidden neuron to feature: one that fired and pushes the winning output up
  const keyHidden = (d) => { const f = fwOf(d); for (let j = 0; j < 10; j++) if (f.h[j] === 1 && net.W2[j][d] > 0) return j; return f.h.indexOf(1); };
  const recipe = (k) => { const up = [], down = []; for (let j = 0; j < 10; j++) { const w = net.W2[j][k]; if (w > 0) up.push(j); if (w < 0) down.push(j); } return { up, down }; };
  const say = (arr) => arr.map((j) => V.HMEAN[j]).join(' and ');

  const steps = [
    { t: 'Digit', c1: 'A handwritten digit is just a grid of 784 pixels', c2: () => `Each pixel is a number from 0 (white) to 255 (black). The network has to turn this picture of a ${S.d} into a handful of numbers it can work with.` },
    { t: 'Dots', c1: 'Step 1: mark the dark pixels', c2: 'A pixel counts as dark if it is at least half dark (shade 128 or more). Each dark pixel becomes a dot.' },
    { t: 'Count', c1: 'Step 2: split the image into 8 regions and count the dots', c2: 'Two columns by four rows. Each region gets its own count.' },
    { t: 'On/off', c1: 'Step 3: 5 or more dots turns a region on (1); fewer leaves it off (0)', c2: 'These 8 numbers are the input layer. From here on, the network never sees the picture again, only these 8 numbers.' },
    { t: 'One hidden', c1: () => `Step 4: ${V.HL(keyHidden(S.d))} checks for a ${V.HMEAN[keyHidden(S.d)]}`, c2: () => `It adds 1 × 0.5 from each of its two regions, then subtracts 1 (its bias): 0.5 + 0.5 − 1 = 0. That reaches the firing line (0), so it fires, and the stroke it detects lights up on the digit.` },
    { t: 'All hidden', c1: 'Step 5: all 10 hidden neurons calculate at the same time', c2: () => `None of them waits for another. ${countOn(fwOf(S.d).h)} of them fire, and their strokes light up on the digit.` },
    { t: 'One output', c1: () => `Step 6: ${V.OL(S.d)} combines the strokes that make a ${S.d}`, c2: () => { const r = recipe(S.d), f = fwOf(S.d), dOn = r.down.filter((j) => f.h[j] === 1), dOff = r.down.filter((j) => f.h[j] !== 1); return `Blue connections push it up (${say(r.up)}). ${dOff.length ? 'The dashed orange one would hold it back if this digit had a ' + say(dOff) + ', but it doesn’t, so it adds 0. ' : ''}${dOn.length ? 'Dashed orange holds it back (' + say(dOn) + '). ' : ''}After the bias (−1), its total reaches the firing line, so it fires.`; } },
    { t: 'Answer', c1: () => `Step 7: exactly one output fires: ${V.OL(S.d)}, so the network says “${S.d}”`, c2: 'That whole trip, from input layer to hidden layer to output layer, is called forward propagation. Pick another digit below, or click any neuron to see how it decided.' },
  ];
  const countOn = (a) => a.filter((v) => v === 1).length;

  let els = {};
  function enter(stage) {
    S.focus = null;
    if (NN.params.d != null) S.d = +NN.params.d;
    stage.append(h('div', { class: 'n1grid' },
      h('div', { class: 'col left' }, h('div', { class: 'ttl' }, 'What the network sees'), (els.img = h('div', { class: 'imgbox' })), (els.legend = h('div', { class: 'legend small' }))),
      h('div', { class: 'col mid' }, h('div', { class: 'ttl' }, 'How it calculates ', h('span', { class: 'badge' }, 'Hand-built network')), (els.net = h('div', { class: 'netbox' }))),
      h('div', { class: 'col right' }, h('div', { class: 'ttl' }, 'Inside the selected neuron'), (els.meter = h('div', { class: 'meterbox card' })), (els.side = h('div', { class: 'side small' }))),
      h('div', { class: 'bottom' }, (els.strip = h('div', {})), (els.pred = h('div', { class: 'predslot' })))));
  }
  function stripRow() {
    els.strip.innerHTML = '';
    els.strip.append(V.strip(net, { label: 'Pick a digit:', sel: S.d, onPick: (d) => { S.d = d; S.focus = null; NN.setParam('d', d); NN.refresh(); } }));
  }
  function stage(step, pre) {
    const d = S.d, img = E.curated(d), f = fwOf(d), counts = E.counts(img);
    S.focus1 = keyHidden(d);
    let focus = S.focus;
    if (!focus) focus = step === 4 ? { L: 1, j: S.focus1 } : step === 6 ? { L: 2, j: d } : step >= 7 ? { L: 2, j: d } : null;
    const vs = pre ? step - 1 : step; const show = { x: vs >= 3, h: vs >= 5 ? 'all' : vs === 4 ? S.focus1 : null, o: vs >= 7 ? 'all' : vs === 6 ? d : null };
    const fwShown = step >= 3 ? { x: f.x, z1: f.z1, h: f.h.map((v, j) => (show.h === 'all' || show.h === j ? v : null)), z2: f.z2, o: f.o.map((v, k) => (show.o === 'all' || show.o === k ? v : null)) } : null;
    // image
    els.img.innerHTML = '';
    const strokes = vs >= 5 ? f.h : vs === 4 ? f.h.map((v, j) => (j === S.focus1 ? v : 0)) : null;
    els.img.append(V.digit(img, { cell: 10, dots: step >= 1, dim: step >= 1 && step < 3 ? false : step >= 3, grid: step >= 2, counts: step >= 2 ? counts : null, showRule: step === 3, bits: step >= 3 ? f.x : null, strokes, strokeFocus: focus && focus.L === 1 ? focus.j : null, regionFocus: focus && focus.L === 1 ? E.HPAIRS[focus.j] : null }));
    els.legend.innerHTML = step === 0 ? '<span class="hiwonly">Hover a pixel to see its shade.</span>' : step < 3 ? '<span class="dotkey"></span> dark pixel (shade ≥ 128)' : step < 4 ? 'Green box = region is on (1).' : '<span class="stkkey"></span> stroke a fired hidden neuron detected';
    if (step === 0) addShadeTitles(els.img.querySelector('svg'), img);
    // network
    els.net.innerHTML = '';
    els.svg = V.network({ net, fw: fwShown, focus, values: true, onNode: (L, j) => { if (L === 0) return; S.focus = { L, j }; NN.refresh(); } });
    els.net.append(els.svg);
    // meter
    els.meter.innerHTML = ''; els.side.innerHTML = '';
    if (focus && step >= 4) {
      const m = meterFor(focus, f); els.meter.append(m.svg);
      els.meter.append(V.actCurve('step', m.z, { width: 300, height: 92, title: false }));
      els.side.append(explain(focus, f, m));
    } else {
      els.meter.append(h('div', { class: 'empty' }, step < 4 ? 'Neurons appear once the 8 inputs are ready.' : 'Click any hidden or output neuron.'));
      if (step === 3) els.side.append(h('div', { class: 'hiwonly' }, inputTable(counts, f.x)));
    }
    stripRow();
    els.pred.innerHTML = '';
    if (step === 5) {
      const r = recipe(d);
      els.pred.append(V.predict('n1-out-' + d, `will ${V.OL(d)} fire for this ${d}?`, [{ t: 'Yes', ok: true, fb: `${say(r.up)} ${r.up.length > 1 ? 'are' : 'is'} on${r.down.length ? ', and ' + say(r.down) + ' is off, so nothing holds it back' : ''}.` }, { t: 'No', ok: false, fb: `It does fire: the strokes it needs are on.` }]));
    }
    if (step === 7) {
      els.pred.append(V.predict('n1-other', 'pick a digit you haven’t looked at. Which output will fire?', [{ t: 'The output with that digit’s number', ok: true, fb: 'For all 10 example digits, exactly the right output fires. Click a digit to check.' }, { t: 'More than one output', ok: false, fb: 'Not for these 10 examples: the weights were chosen by hand so exactly one fires. Real handwriting is another story (N4).' }]));
    }
  }
  function addShadeTitles(svg, img) { svg.querySelectorAll('.px rect').forEach((r) => { const c = Math.round(+r.getAttribute('x') / 10), rr = Math.round(+r.getAttribute('y') / 10); r.append(s('title', { text: `row ${rr + 1}, column ${c + 1}: shade ${img[rr * 28 + c]}` })); }); }
  function meterFor(focus, f) {
    if (focus.L === 1) { const j = focus.j, items = []; for (let i = 0; i < 8; i++) if (Math.abs(net.W1[i][j]) > 1e-9) items.push({ label: V.IN(i), a: f.x[i], w: net.W1[i][j] }); return V.meter({ items, bias: net.b1[j], act: 'step', title: `${V.HL(focus.j)}: ${V.HMEAN[j]}`, width: 300, height: 250 }); }
    const k = focus.j, items = []; for (let j = 0; j < 10; j++) if (Math.abs(net.W2[j][k]) > 1e-9) items.push({ label: V.HL(j), a: f.h[j], w: net.W2[j][k] });
    return V.meter({ items, bias: net.b2[k], act: 'step', title: `${V.OL(k)}: is it a ${k}?`, width: 300, height: 250 });
  }
  function explain(focus, f, m) {
    const box = h('div', {});
    const L = focus.L, j = focus.j, inputs = [];
    if (L === 1) for (let i = 0; i < 8; i++) { if (Math.abs(net.W1[i][j]) > 1e-9) inputs.push([V.IN(i), f.x[i], net.W1[i][j]]); }
    else for (let q = 0; q < 10; q++) if (Math.abs(net.W2[q][j]) > 1e-9) inputs.push([V.HL(q), f.h[q], net.W2[q][j]]);
    const b = L === 1 ? net.b1[j] : net.b2[j];
    box.append(h('p', { class: 'concept-only' }, m.out ? 'The blocks reach the firing line, so it fires (activated value 1).' : 'The blocks don’t reach the firing line, so it stays off (activated value 0).', ' Every other connection into it has weight 0, so it adds nothing.'));
    box.append(h('div', { class: 'hiwonly calc' }, h('div', {}, 'calculated value = ', inputs.map(([n, a, w], q) => [q ? ' + ' : '', h('span', { class: 'mono' }, `${a}×${E.f2(w)}`)]), ' + (', E.f2(b), ') = ', h('b', {}, E.f2(m.z))), h('div', {}, `activated value = step(${E.f2(m.z)}) = `, h('b', {}, m.out), m.out ? '  (0 or above fires)' : '  (below 0 stays off)')));
    return box;
  }
  function inputTable(counts, x) { return h('table', { class: 'ws' }, h('tr', {}, h('th', {}, 'Input'), h('th', {}, 'Dots'), h('th', {}, 'Rule'), h('th', {}, 'Value')), counts.map((c, i) => h('tr', {}, h('td', { class: 'k' }, V.IN(i)), h('td', {}, c), h('td', {}, c >= 5 ? '≥ 5' : '< 5'), h('td', { class: 'k' }, x[i])))); }

  async function animate(step) {
    const svg = els.svg, d = S.d, f = fwOf(d);
    if (step === 1) { const g = els.img.querySelector('.dots'); if (g) await NN.anim(900, (u) => g.setAttribute('opacity', u)); }
    if (step === 2) { const t = els.img.querySelectorAll('.rc'), c = E.counts(E.curated(d)); await NN.anim(1200, (u) => t.forEach((el, i) => (el.textContent = Math.round(c[i] * u)))); }
    if (step === 3) { const g = svg.querySelectorAll('.node.in'); await NN.anim(700, (u) => g.forEach((n) => n.setAttribute('opacity', u))); }
    if (step === 4) await V.pulse(svg, `.e1.h${S.focus1}`, V.ACC, 1100);
    if (step === 5) { await V.pulse(svg, '.e1', V.ACC, 1200); }
    if (step === 6) { await V.pulse(svg, `.e2.o${d}`, V.ACC, 1200); }
    if (step === 7) { await V.pulse(svg, '.e2', V.ACC, 1200); }
  }
  async function growStroke(j, before) {
    const ln = els.img.querySelector('.stk'); if (ln) ln.style.opacity = 0;
    const node = els.svg.querySelector('.n-h' + j + ' circle'), fill = node && node.getAttribute('fill'); if (node) node.setAttribute('fill', '#fff');
    await before();
    if (node) node.setAttribute('fill', fill);
    if (ln) await NN.anim(600, (u) => (ln.style.opacity = u));
  }
  NN.reg({
    id: 'N1', part: 1, title: 'Watch it read', short: 'Watch it read', steps,
    about: '<p><b>On this page:</b> our hand-built 8–10–10 network reads one of 10 example digits, one step at a time. The left picture shows what the network “sees”; the middle shows how it calculates; the right opens up the selected neuron.</p><p><b>To do:</b> press Next ▶ (or Play). Pick other digits along the bottom. Click any hidden or output neuron to see how it decided. Switch to <i>How it works</i> to see the numbers.</p>',
    enter, reset: () => { S.d = 4; S.focus = null; },
    show(step, o) {
      const pulse = o.anim && step >= 4;
      stage(step, pulse);
      if (!o.anim) return Promise.resolve();
      return animate(step).then(() => { if (pulse) { stage(step); const g = els.img.querySelector('.strokes'); if (g) return NN.anim(500, (u) => g.setAttribute('opacity', u)); } });
    },
  });
})();
