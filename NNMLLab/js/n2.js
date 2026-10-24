/* N2 Inside a neuron: weights, bias, activation, and what changing them does to the whole network. */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h;
  const S = {};
  const fresh = () => { S.net = E.hand(); S.d = 4; S.focus = { L: 1, j: 9 }; S.actAll = 'step'; S.ol7 = false; };
  fresh();
  const stepSetup = [
    () => { S.focus = { L: 1, j: 9 }; S.d = 4; },
    () => { S.focus = { L: 2, j: 4 }; S.d = 9; },
    () => { S.focus = { L: 1, j: 9 }; S.d = 4; },
    () => { S.focus = { L: 2, j: 4 }; S.d = 4; S.net.act1 = S.net.act2 = 'step'; },
    () => { S.focus = { L: 2, j: 4 }; S.d = 4; S.net.act1 = S.net.act2 = 'none'; },
    () => { S.net.act1 = S.net.act2 = 'step'; if (!S.ol7) { for (let j = 0; j < 10; j++) S.net.W2[j][7] = 0; S.ol7 = true; } S.focus = { L: 2, j: 7 }; S.d = 7; },
  ];
  const steps = [
    { t: 'Weights', c1: 'A weight sets how much one input counts', c2: 'HL10 listens to I6 and I8 through weights of 0.5 each. Drag a weight and watch the blocks, the firing line and the 10 digits below.' },
    { t: 'Negative weights', c1: 'A negative weight holds a neuron back', c2: 'This 9 has the same lower-right stroke as a 4. OL4’s −0.5 weight from HL1 (the top bar) is what stops the 9 being read as a 4. Try setting it to 0.' },
    { t: 'Bias', c1: 'The bias decides how hard it is to fire', c2: '“Fire when the sum reaches 1” is the same as “add a bias of −1, then fire at 0 or above.” Raise HL10’s bias and it fires when just one of its two regions is on. What breaks?' },
    { t: 'Activation', c1: 'The activation decides what the neuron passes on', c2: 'On/off switch: all or nothing. Dimmer: partly on. Ramp: zero, then rising. Same calculated value, different activated value.' },
    { t: 'Why it matters', c1: 'Without an activation step, extra layers add nothing', c2: 'Choose “none”: every neuron just passes its calculated value on. Then two layers can always be squeezed into one. The activation step is what lets layers build on each other.' },
    { t: 'Rebuild OL7', c1: 'Your turn: OL7’s weights have been erased', c2: 'Set the weights from the hidden layer so that the 7 fires OL7 and no other digit does. Watch the strip.' },
  ];
  let els = {};
  function enter(stage) {
    stage.append(h('div', { class: 'n2grid' },
      h('div', { class: 'col' }, h('div', { class: 'ttl' }, 'Pick a neuron ', h('span', { class: 'badge' }, 'Hand-built network')), (els.net = h('div', { class: 'netbox small' }))),
      h('div', { class: 'col' }, (els.meterT = h('div', { class: 'ttl' })), (els.meter = h('div', { class: 'card bigmeter' })), (els.act = h('div', { class: 'actrow' }))),
      h('div', { class: 'col' }, h('div', { class: 'ttl' }, 'Change it'), (els.ctl = h('div', { class: 'card ctl' })), (els.note = h('div', { class: 'small side' }))),
      h('div', { class: 'bottom' }, (els.strip = h('div', {})), (els.pred = h('div', { class: 'predslot' })))));
  }
  const incoming = () => { const f = S.focus; if (f.L === 1) return Array.from({ length: 8 }, (_, i) => ({ i, label: V.IN(i), get: () => S.net.W1[i][f.j], set: (v) => (S.net.W1[i][f.j] = v) })); return Array.from({ length: 10 }, (_, j) => ({ i: j, label: V.HL(j), get: () => S.net.W2[j][f.j], set: (v) => (S.net.W2[j][f.j] = v) })); };
  const biasRef = () => (S.focus.L === 1 ? { get: () => S.net.b1[S.focus.j], set: (v) => (S.net.b1[S.focus.j] = v) } : { get: () => S.net.b2[S.focus.j], set: (v) => (S.net.b2[S.focus.j] = v) });
  const actKey = () => (S.focus.L === 1 ? 'act1' : 'act2');
  function render(step) {
    const net = S.net, fw = E.forward(net, E.curatedBits[S.d]), f = S.focus, cont = net.act1 !== 'step';
    // network
    els.net.innerHTML = '';
    const win = E.verdict(fw.o, net.act2).pick;
    els.net.append(V.network({ net, fw, focus: f, values: true, continuous: cont, win, edges: step >= 4 ? 'nonzero' : 'nonzero', onNode: (L, j) => { if (L === 0) return; S.focus = { L, j }; render(NN.st.step); } }));
    // meter (show every connection that is not zero, plus any the student is editing)
    const inc = incoming(), items = inc.filter((c) => Math.abs(c.get()) > 1e-9 || c.touched).map((c) => ({ label: c.label, a: f.L === 1 ? fw.x[c.i] : fw.h[c.i], w: c.get() }));
    const b = biasRef().get(), act = net[actKey()];
    els.meterT.innerHTML = ''; els.meterT.append(f.L === 1 ? `${V.HL(f.j)} (${V.HMEAN[f.j]}) reading digit ${S.d}` : `${V.OL(f.j)} (is it a ${f.j}?) reading digit ${S.d}`);
    els.meter.innerHTML = '';
    const m = V.meter({ items, bias: b, act: act === 'none' ? 'none' : act, title: '', width: 430, height: step === 4 && act === 'none' ? 160 : 270, showBias: true });
    els.meter.append(m.svg);
    els.act.innerHTML = '';
    if (act !== 'none') els.act.append(V.actCurve(act, m.z, { width: 260, height: 120 })); else els.act.append(step === 4 ? null : h('div', { class: 'card small' }, 'Activation: none. The activated value is just the calculated value: ', h('b', {}, E.f2(m.z))), step === 4 ? h('div', { class: 'collapse' }, collapseDemo()) : null);
    els.act.append(h('div', { class: 'small calc' }, h('div', {}, h('b', {}, 'calculated value'), ' = sum of (input × weight) + bias'), h('div', { class: 'hiwonly mono' }, items.map((it, q) => `${q ? ' + ' : ''}${E.f2(it.a)}×${E.f2(it.w)}`).join('') + ` + (${E.f2(b)}) = ${E.f2(m.z)}`), h('div', {}, h('b', {}, 'activated value'), ` = activation(calculated value) = ${act === 'step' ? m.out : E.f(m.out, 2)}`)));
    // controls
    els.ctl.innerHTML = '';
    const grid = h('div', { class: 'sliders' });
    inc.forEach((c) => grid.append(slider(c.label + ' weight', c.get(), -1, 1, 0.1, (v) => { c.set(v); c.touched = true; incoming().forEach(() => {}); render(step); }, c.get() < 0 ? 'neg' : c.get() > 0 ? 'pos' : '')));
    els.ctl.append(grid, slider('bias', b, -2, 1, 0.1, (v) => { biasRef().set(v); render(step); }, 'bias'));
    const acts = h('div', { class: 'chips' }, h('span', { class: 'small muted' }, 'Activation for every neuron:'), ['step', 'sigmoid', 'relu', 'none'].map((a) => h('button', { class: 'chip' + (net.act1 === a ? ' on' : ''), onclick: () => { net.act1 = net.act2 = a; render(step); } }, { step: 'On/off', sigmoid: 'Dimmer', relu: 'Ramp', none: 'None' }[a])));
    if (step >= 3) els.ctl.append(acts);
    els.ctl.append(h('div', { class: 'chips' }, h('button', { class: 'btn small', onclick: () => { const keep = S.focus; const ol7 = S.ol7; S.net = E.hand(); S.ol7 = false; if (ol7 && step === 5) stepSetup[5](); S.focus = keep; render(step); } }, 'Restore the hand-built weights')));
    // notes
    els.note.innerHTML = '';
    const notes = [
      'Weights work like volume knobs on each connection. Blue pushes up; orange pulls down; thickness shows how much.',
      'Without the −0.5, the 9 lights both OL4 and OL9, and the network can’t decide.',
      'The firing line is fixed at 0; the bias slides all the blocks up or down. A bias closer to 0 makes the neuron fire more easily.',
      cont ? 'With a dimmer, outputs are no longer just 0 or 1. The network’s answer becomes the output with the highest value.' : 'Try the dimmer: neurons become “partly on”. Part 2 needs this, because learning works by making small changes.',
      net.act1 === 'none' ? 'With no activation, the output is just (input × a combined 8×10 table of weights). Two layers, no more power than one.' : 'Pick “None” to see what happens without an activation step.',
      'Strategy: feed in the 7 and see which hidden neurons light (green). Give OL7 a positive weight from one the 7 has, then check the strip: if another digit also fires OL7, give a negative weight from a stroke that digit has and the 7 lacks. Many answers work.',
    ];
    els.note.append(h('p', {}, notes[step]));
    if (step === 0) els.note.append(h('p', { class: 'muted' }, h('b', {}, 'Like a brain? '), 'A little. A real neuron also adds up signals and fires past a threshold, but a brain is far more complex. The comparison is useful; it is not the same process.'));
    if (step === 5) els.note.append(h('button', { class: 'btn small', onclick: () => hint() }, 'Show one stroke OL7 needs'), (els.hint = h('div', { class: 'small' })));
    if (step === 5 && !items.length) els.note.append(h('p', { class: 'muted' }, 'OL7 has no connections yet: only its bias (−1), so it can never fire.'));
    // strip
    els.strip.innerHTML = '';
    els.strip.append(V.strip(net, { label: 'Pick a digit:', sel: S.d, onPick: (d) => { S.d = d; render(step); } }));
    const ok = E.strip(net).filter((r) => r.ok).length;
    if (step === 5 && ok === 10) els.strip.append(h('div', { class: 'win' }, '✔ You rebuilt OL7 by hand. In Part 2 the network learns weights like these from examples.'));
    els.pred.innerHTML = '';
    if (step === 0) els.pred.append(V.predict('n2-w', 'if I8’s weight into HL10 drops to 0.2, will the 4 still be read?', [{ t: 'Yes', ok: false, fb: '0.5 + 0.2 = 0.7 stays short of the firing line (with bias −1, 0.7 − 1 < 0). HL10 stops firing, and OL4 loses its main stroke.' }, { t: 'No', ok: true, fb: '0.5 + 0.2 = 0.7 never reaches 1, so HL10 goes quiet and OL4 doesn’t fire. Drag it and see.' }]));
    if (step === 2) els.pred.append(V.predict('n2-b', 'if HL10’s bias goes from −1 to −0.4, will more digits or fewer be read correctly?', [{ t: 'More', ok: false, fb: 'HL10 now fires on just one region, so it lights for digits that only touch row 3 or row 4 on the right. Extra strokes, extra mistakes.' }, { t: 'Fewer', ok: true, fb: 'HL10 fires too easily now (one region is enough), so some digits light outputs they shouldn’t.' }]));
  }
  function slider(label, v, lo, hi, st, on, cls) {
    const val = h('span', { class: 'v' }, E.f2(v));
    const inp = h('input', { type: 'range', min: lo, max: hi, step: st, value: v });
    inp.addEventListener('input', () => { val.textContent = E.f2(+inp.value); });
    inp.addEventListener('change', () => on(Math.round(+inp.value * 10) / 10));
    return h('label', { class: 'slider ' + (cls || '') }, h('span', { class: 'sl' }, label), inp, val);
  }
  function collapseDemo() {
    // two layers with no activation = one layer with combined weights (W1 x W2)
    const net = S.net; if (net.act1 !== 'none') return h('span');
    const comb = net.W1.map((row) => Array.from({ length: 10 }, (_, k) => row.reduce((s, w, j) => s + w * net.W2[j][k], 0)));
    return h('div', {}, h('div', { class: 'small' }, h('b', {}, 'Two layers squeezed into one: '), 'multiply W1 (8×10) by W2 (10×10) and you get one 8×10 table that gives the same outputs straight from the inputs (plus a combined bias). Without activation, the hidden layer adds nothing.'), V.matrix(net.W1.map((_, i) => V.IN(i)), Array.from({ length: 10 }, (_, k) => 'OL' + k), (i, k) => comb[i][k], { cls: 'tiny' }));
  }
  let hintN = 0;
  function hint() { const orig = E.hand().W2, rec = []; for (let j = 0; j < 10; j++) if (orig[j][7]) rec.push(j); const j = rec[hintN % rec.length]; hintN++; els.hint.innerHTML = `The original design used ${orig[j][7] > 0 ? '+' : ''}${orig[j][7]} from ${V.HL(j)} (${V.HMEAN[j]}). ${hintN >= rec.length ? 'That is the whole original recipe; yours can differ.' : 'Click again for the next one.'}`; }
  NN.reg({
    id: 'N2', part: 1, title: 'Inside a neuron', short: 'Neuron', steps,
    about: '<p><b>On this page:</b> open up one neuron at a time. The blocks show each input × weight; the bias moves them up or down; the activation turns the calculated value into what the neuron passes on.</p><p><b>To do:</b> click any hidden or output neuron, then drag its weights and bias. The strip along the bottom shows which of the 10 example digits the whole network still reads correctly. “Restore” puts the hand-built weights back.</p>',
    enter, reset: fresh,
    show(step) { stepSetup[step](); if (step < 3) { S.net.act1 = S.net.act2 = 'step'; } render(step); return Promise.resolve(); },
  });
})();
