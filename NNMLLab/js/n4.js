/* N4 Break it: real handwriting vs the hand-built network; why it fails; trained readers; the black box. */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h, C = window.NN_CORE;
  const S = {};
  const fresh = () => { S.base = E.curated(4); S.src = 'example 4'; S.tf = { dx: 0, dy: 0, scale: 1, thick: 0 }; S.norm = false; S.trace = 4; S.pick = null; S.drawn = false; };
  fresh();
  const hand = E.hand();
  const steps = [
    { t: 'Trace it', c1: 'Trace the example digit: the hand-built network should read it', c2: 'Draw over the faint 4 (or pick another example). The middle panel shows exactly what the network sees: 8 regions, on or off.' },
    { t: 'Draw your own', c1: 'Now draw a digit the way you normally write it', c2: 'Or click any real handwritten digit along the bottom (from the MNIST collection). Does the hand-built network still get it right?' },
    { t: 'Position & size', c1: 'Why it fails, reason 1: the digit is in a different place or size', c2: 'Move it, resize it, thicken it, and watch the regions flip. “Center & scale” puts every digit in the same spot at the same size: that’s called normalization.' },
    { t: 'Too few inputs', c1: 'Why it fails, reason 2: 8 on/off inputs throw away almost everything', c2: () => `8 inputs that are each 0 or 1 allow only 256 patterns. In 60,000 real digits only ${C.stats.patterns} patterns appear, and different digits share them. Even a perfect network using these 8 inputs could get at most ${E.pct(C.stats.best8)} of them right.` },
    { t: 'Trained readers', c1: 'More detail and real training: four networks, really trained on 50,000 digits', c2: 'Each reads your digit live. Look at the size of each network against its accuracy. Which is the smallest network that does the job well enough?' },
    { t: 'Still wrong sometimes', c1: 'Even a good trained reader makes mistakes, some of them confident', c2: 'And unlike our hand-built network, nobody can say what its hidden neurons mean. That’s why people call trained networks “black boxes”.' },
  ];
  let els = {};
  const curImg = () => { let img = E.transform(S.base, S.tf); if (S.norm) img = E.normalize(img); return img; };
  function enter(stage) {
    stage.append(h('div', { class: 'n4grid' }, (els.a = h('div', { class: 'col' })), (els.b = h('div', { class: 'col' })), (els.c = h('div', { class: 'col n4right' })), (els.bot = h('div', { class: 'bottom' }))));
  }
  /* ---------- drawing pad ---------- */
  function pad(trace) {
    const wrap = h('div', { class: 'pad' }), bg = h('canvas', { width: 280, height: 280, class: 'padbg' }), cv = h('canvas', { width: 280, height: 280, class: 'padfg' });
    wrap.append(bg, cv);
    const bx = bg.getContext('2d'); bx.fillStyle = '#fff'; bx.fillRect(0, 0, 280, 280);
    if (trace != null) { const img = E.curated(trace); for (let i = 0; i < 784; i++) if (img[i] > 20) { bx.fillStyle = `rgba(91,56,209,${(img[i] / 255) * 0.22})`; bx.fillRect((i % 28) * 10, Math.floor(i / 28) * 10, 10, 10); } }
    const ctx = cv.getContext('2d'); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111'; ctx.lineWidth = 22;
    const strokes = []; let cur = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return [((t.clientX - r.left) / r.width) * 280, ((t.clientY - r.top) / r.height) * 280]; };
    const redraw = () => { ctx.clearRect(0, 0, 280, 280); strokes.forEach((st) => { ctx.beginPath(); st.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (st.length === 1) ctx.lineTo(st[0][0] + 0.1, st[0][1]); ctx.stroke(); }); };
    const commit = () => { const d = ctx.getImageData(0, 0, 280, 280).data, img = new Uint8Array(784); for (let r = 0; r < 28; r++) for (let c = 0; c < 28; c++) { let a = 0; for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) a += d[((r * 10 + y) * 280 + c * 10 + x) * 4 + 3]; img[r * 28 + c] = Math.round(a / 100); } S.base = img; S.tf = { dx: 0, dy: 0, scale: 1, thick: 0 }; S.norm = false; S.src = trace != null ? 'your tracing' : 'your drawing'; S.drawn = true; update(); };
    const down = (e) => { e.preventDefault(); cur = [pos(e)]; strokes.push(cur); redraw(); };
    const move = (e) => { if (!cur) return; e.preventDefault(); cur.push(pos(e)); redraw(); };
    const up = () => { if (cur) { cur = null; commit(); } };
    cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
    const tools = h('div', { class: 'chips' }, h('button', { class: 'btn small', onclick: () => { strokes.pop(); redraw(); if (strokes.length) commit(); } }, 'Undo'), h('button', { class: 'btn small', onclick: () => { strokes.length = 0; redraw(); } }, 'Clear'));
    return h('div', {}, wrap, tools);
  }
  /* ---------- what the hand-built network sees, and its answer ---------- */
  function sees(img) {
    const x = E.bits(img), f = E.forward(hand, x), v = E.verdict(f.o, 'step');
    const box = h('div', { class: 'sees' });
    box.append(h('div', { class: 'ttl' }, 'What the hand-built network sees'), V.digit(img, { cell: 8, grid: true, counts: E.counts(img), bits: x, strokes: f.h, dots: false }));
    const outs = h('div', { class: 'outs' }, Array.from({ length: 10 }, (_, k) => h('span', { class: 'ob' + (f.o[k] ? ' on' : '') }, k)));
    const say = v.fired.length === 0 ? 'Nothing fired: this network can’t say “not sure”, so it says nothing.' : v.fired.length > 1 ? `${v.fired.length} outputs fired (${v.fired.join(', ')}): it can’t decide.` : `It says “${v.pick}”.`;
    box.append(h('div', { class: 'ttl' }, 'Outputs that fire'), outs, h('div', { class: 'verdict' + (v.fired.length === 1 ? ' one' : ' bad') }, say));
    return box;
  }
  function gallery(limit) {
    const g = h('div', { class: 'gal' }, h('span', { class: 'striplabel' }, 'Real handwriting (MNIST test set):'));
    C.gallery.filter((_, q) => q % 12 < Math.ceil(limit / 10)).forEach((i) => { const img = E.testImg(i), x = E.bits(img), v = E.verdict(E.forward(hand, x).o, 'step'), ok = v.pick === E.testLabel(i); g.append(h('div', { class: 'sd ' + (ok ? 'ok' : 'bad') + (S.pick === i ? ' sel' : ''), title: `a ${E.testLabel(i)}: hand-built network ${v.fired.length === 1 ? 'says ' + v.pick : v.fired.length ? 'fires ' + v.fired.join('+') : 'fires nothing'}`, onclick: () => { S.pick = i; S.base = img; S.src = 'a real ' + E.testLabel(i); S.tf = { dx: 0, dy: 0, scale: 1, thick: 0 }; S.norm = false; update(); } }, V.thumb(img, 26), h('span', { class: 'mk' }, ok ? '✓' : '✗'))); });
    return g;
  }
  function tools() {
    const t = S.tf, set = (k, v) => { S.tf = { ...S.tf, [k]: v }; update(); };
    return h('div', { class: 'card tools' }, h('div', { class: 'ttl' }, 'Change the digit'),
      h('div', { class: 'tgrid' }, h('button', { class: 'btn small', onclick: () => set('dx', t.dx - 2) }, '←'), h('button', { class: 'btn small', onclick: () => set('dy', t.dy - 2) }, '↑'), h('button', { class: 'btn small', onclick: () => set('dy', t.dy + 2) }, '↓'), h('button', { class: 'btn small', onclick: () => set('dx', t.dx + 2) }, '→'), h('button', { class: 'btn small', onclick: () => set('scale', Math.max(0.5, +(t.scale - 0.15).toFixed(2))) }, 'Smaller'), h('button', { class: 'btn small', onclick: () => set('scale', Math.min(1.6, +(t.scale + 0.15).toFixed(2))) }, 'Bigger'), h('button', { class: 'btn small', onclick: () => set('thick', t.thick - 1) }, 'Thinner'), h('button', { class: 'btn small', onclick: () => set('thick', t.thick + 1) }, 'Thicker')),
      h('div', { class: 'chips' }, h('button', { class: 'btn small' + (S.norm ? ' on' : ''), onclick: () => { S.norm = !S.norm; update(); } }, S.norm ? '✔ Centered & scaled' : 'Center & scale (normalize)'), h('button', { class: 'btn ghost small', onclick: () => { S.tf = { dx: 0, dy: 0, scale: 1, thick: 0 }; S.norm = false; update(); } }, 'Undo changes')));
  }
  function statsCard() {
    const st = C.stats;
    return h('div', { class: 'card statc' }, h('div', { class: 'ttl' }, 'The hand-built network on 60,000 real digits ', h('span', { class: 'tag real' }, 'measured')),
      bar('Read correctly', st.rigCorrect, V.ON), bar('One output fired, wrong digit', 1 - st.rigCorrect - st.rigMulti - st.rigNone, '#c0392b'), bar('Two or more outputs fired', st.rigMulti, '#e07b19'), bar('Nothing fired', st.rigNone, '#9aa6b8'),
      h('div', { class: 'note' }, 'It was built for 10 tidy examples. Real handwriting varies far more.'));
  }
  const bar = (lab, v, col) => h('div', { class: 'hb' }, h('span', { class: 'hl' }, lab), h('span', { class: 'track' }, h('span', { class: 'fill', style: `width:${v * 100}%;background:${col}` })), h('b', {}, E.pct(v)));
  function collisions() {
    const box = h('div', { class: 'card' }, h('div', { class: 'ttl' }, 'Different digits, identical inputs ', h('span', { class: 'tag real' }, 'real MNIST')));
    C.collisions.forEach(([a, b]) => { const A = E.testImg(a), B = E.testImg(b), xa = E.bits(A); box.append(h('div', { class: 'coll' }, V.digit(A, { cell: 4, grid: false }), h('span', { class: 'cl' }, `a ${E.testLabel(a)}`), V.digit(B, { cell: 4, grid: false }), h('span', { class: 'cl' }, `a ${E.testLabel(b)}`), h('span', { class: 'bitsrow' }, 'both give', xa.map((v) => h('span', { class: 'bit' + (v ? ' on' : '') }, v))))); });
    box.append(h('div', { class: 'note' }, `Same 8 inputs means the network must give the same answer, so at least one of each pair will be wrong, no matter how the weights are set.`));
    return box;
  }
  function ladderCard(img) {
    const box = h('div', { class: 'card lad' }, h('div', { class: 'ttl' }, 'Four trained readers ', h('span', { class: 'tag real' }, 'trained & tested for real')));
    const t = h('table', { class: 'ws ladt' }, h('tr', {}, h('th', {}, 'Inputs'), h('th', {}, 'Shape'), h('th', {}, 'Parameters'), h('th', {}, 'Practice-test accuracy'), h('th', {}, 'Reads this digit as')));
    const maxP = Math.log10(E.ladder[3].params);
    E.ladder.forEach((m, q) => {
      const r = E.ladderRun(m, img), conf = r.p[r.pick];
      t.append(h('tr', { class: S.choice === q ? 'chosen' : '', onclick: () => { S.choice = q; update(); }, style: 'cursor:pointer' }, h('td', { class: 'k' }, m.name), h('td', { class: 'mono' }, m.sizes.join('→')), h('td', {}, h('span', { class: 'pbar', style: `width:${(Math.log10(m.params) / maxP) * 90}px` }), ' ', m.params.toLocaleString()), h('td', {}, h('span', { class: 'abar', style: `width:${m.practice * 110}px;background:${V.band(m.practice)}` }), ' ', E.pct(m.practice, 1)), h('td', {}, h('b', {}, r.pick), ` (${E.pct(conf)} sure)`)));
    });
    box.append(t, h('div', { class: 'note' }, 'Parameter bars use a log scale: each step is 10× more.'));
    if (S.choice == null) box.append(h('div', { class: 'note' }, 'Click the row you think is the smallest network that does the job well enough. Then see how it does on the final exam: 10,000 digits it has never seen.'));
    else { const m = E.ladder[S.choice]; box.append(h('div', { class: 'final' }, `Final exam for “${m.name}”: `, h('b', {}, E.pct(m.final, 1)), ` of 10,000 never-seen digits. `, S.choice === 0 ? 'Training couldn’t fix the 8 on/off inputs: information lost at the start can’t be learned back.' : S.choice === 3 ? 'The best, but 4× the parameters of the 32-hidden version for about 2 points more. Is that worth it?' : 'Much better than the hand-built network, with far more inputs and parameters.')); }
    box.append(h('div', { class: 'note' }, 'We choose using the practice test and judge the choice with a final exam the networks never saw. If we picked using the final exam, it wouldn’t be a fair final any more. More detail is worth it only when testing shows it helps.'));
    return box;
  }
  function mistakes() {
    const m = E.ladder[2], box = h('div', { class: 'card' }, h('div', { class: 'ttl' }, `Mistakes by the 784→32→10 reader (${E.pct(m.final, 1)} correct) `, h('span', { class: 'tag real' }, 'real')));
    const g = h('div', { class: 'mist' });
    m.mistakes.slice(0, 8).forEach((q) => g.append(h('div', { class: 'mi' }, V.thumb(E.testImg(q.i), 44), h('div', {}, `a ${q.y}`), h('div', { class: 'bad' }, `said ${q.p}`), h('div', { class: 'muted' }, `${E.pct(q.c)} sure`))));
    box.append(g, h('div', { class: 'small' }, 'Most confused: ', m.confused.slice(0, 3).map((c) => `${c.y} read as ${c.p} (${c.n}×)`).join(' · ')));
    return box;
  }
  function blackbox() {
    const m = E.ladder[2], L = m.P[0], box = h('div', { class: 'card' }, h('div', { class: 'ttl' }, 'What do its hidden neurons look for?'));
    const g = h('div', { class: 'bbox' });
    for (let j = 0; j < 16; j++) { const cv = h('canvas', { width: 28, height: 28, class: 'thumb' }), ctx = cv.getContext('2d'), id = ctx.createImageData(28, 28); let mx = 0; for (let i = 0; i < 784; i++) mx = Math.max(mx, Math.abs(L.W[i * L.cols + j])); for (let i = 0; i < 784; i++) { const w = L.W[i * L.cols + j] / mx, a = Math.min(1, Math.abs(w) * 1.6); const c = w > 0 ? [47, 111, 214] : [224, 123, 25]; id.data[i * 4] = 255 - (255 - c[0]) * a; id.data[i * 4 + 1] = 255 - (255 - c[1]) * a; id.data[i * 4 + 2] = 255 - (255 - c[2]) * a; id.data[i * 4 + 3] = 255; } ctx.putImageData(id, 0, 0); cv.style.cssText = 'width:62px;height:62px'; g.append(cv); }
    box.append(h('div', { class: 'row' }, h('div', { class: 'small', style: 'width:150px' }, 'Hand-built: every hidden neuron has a name, like ', h('b', {}, '“bar across row 1”'), '.'), g), h('div', { class: 'note' }, 'Trained: each picture shows one hidden neuron’s 784 weights (blue pushes up, orange pulls down). They mostly don’t match human ideas like “a loop” or “a stroke”. The network is usually right, but it can’t explain itself.'));
    return box;
  }
  /* ---------- layout per step ---------- */
  function update() { render(NN.st.step, true); }
  function render(step, keep) {
    const img = curImg();
    const keepPad = keep && step <= 1 && els.padFor === step;
    if (!keepPad) { els.a.innerHTML = ''; els.padFor = null; }
    els.b.innerHTML = ''; els.c.innerHTML = ''; els.bot.innerHTML = '';
    els.a.parentNode.className = 'n4grid s' + step;
    if (step <= 1) {
      if (!keepPad) { els.padFor = step; els.a.append(h('div', { class: 'ttl' }, step === 0 ? 'Trace the example' : 'Draw your own digit'), pad(step === 0 ? S.trace : null));
      if (step === 0) els.a.append(h('div', { class: 'chips' }, h('span', { class: 'small muted' }, 'Example to trace:'), Array.from({ length: 10 }, (_, d) => h('button', { class: 'chip' + (S.trace === d ? ' on' : ''), onclick: () => { S.trace = d; S.base = E.curated(d); S.src = 'example ' + d; render(0, false); } }, d)))); }
      els.b.append(sees(img), h('div', { class: 'small muted' }, 'Showing: ' + S.src));
      els.c.append(step === 0 ? h('div', { class: 'card small' }, h('p', {}, 'Each region with 5 or more dark pixels turns on. The green strokes are the hidden neurons that fired.'), h('p', {}, 'If your tracing isn’t read correctly, look at which regions flipped compared with the example.'), V.predict('n4-trace', 'if you trace carefully, will it be read correctly?', [{ t: 'Yes', ok: true, fb: 'Usually: a careful tracing puts ink in the same regions as the example.' }, { t: 'No', ok: false, fb: 'A careful tracing usually works, because it fills the same regions as the example.' }])) : statsCard());
      if (step === 1) els.c.append(V.predict('n4-own', 'will the hand-built network read your own handwriting?', [{ t: 'Yes', ok: false, fb: 'Usually not. Measured on 60,000 real digits, it gets only ' + E.pct(C.stats.rigCorrect) + ' right.' }, { t: 'No', ok: true, fb: 'Right: it gets only ' + E.pct(C.stats.rigCorrect) + ' of 60,000 real digits right. Next: why.' }]));
      els.bot.append(gallery(step === 0 ? 40 : 60));
      if (step === 1) V.veil(els.c.querySelector('.statc'), 'n4-own'); // Predict first
      return;
    }
    if (step === 2) {
      els.a.append(h('div', { class: 'ttl' }, 'Before your changes'), V.digit(S.base, { cell: 9, grid: true, bits: E.bits(S.base) }), h('div', { class: 'small muted' }, 'Showing: ' + S.src + '. Middle: after your changes' + (S.norm ? ' (normalized)' : '') + '.'));
      els.b.append(sees(img));
      els.c.append(tools(), h('div', { class: 'card small' }, h('b', {}, 'Normalization'), ' means getting every input as consistent as possible before the network sees it: same size, same position. The real MNIST digits were all normalized this way. The hand-built rules were written for digits sitting 2 rows higher than usual, so real digits land too low for them.'), V.predict('n4-norm', 'will centering and scaling fix every digit?', [{ t: 'Yes', ok: false, fb: 'It helps with position and size, but not with style: a 4 with a closed top still lights different regions.' }, { t: 'No', ok: true, fb: 'Right: it fixes position and size, but not different writing styles, or the tiny number of inputs.' }]));
      els.bot.append(gallery(60));
      return;
    }
    if (step === 3) {
      els.a.append(h('div', { class: 'ttl' }, 'Your digit'), V.digit(img, { cell: 8, grid: true, counts: E.counts(img), bits: E.bits(img) }));
      els.b.append(collisions());
      els.c.append(h('div', { class: 'card bigstat' }, h('div', { class: 'num' }, '256'), h('div', {}, 'possible on/off patterns from 8 inputs (2 × 2 × … × 2)'), h('div', { class: 'num' }, String(C.stats.patterns)), h('div', {}, 'patterns that actually appear in 60,000 real digits'), h('div', { class: 'num' }, E.pct(C.stats.best8)), h('div', {}, 'the most any network could get right on these 60,000 digits using only these 8 inputs')), h('div', { class: 'card small' }, 'A 28×28 image has 784 numbers, each 0–255. Squeezing it into 8 on/offs throws away the details that tell a 4 from a 9.'));
      els.bot.append(gallery(60));
      return;
    }
    if (step === 4) {
      els.a.append(h('div', { class: 'ttl' }, 'Your digit'), V.digit(img, { cell: 8 }), h('div', { class: 'small muted' }, 'Showing: ' + S.src), h('div', { class: 'note' }, 'Pick another digit along the bottom, or go back and draw one.'));
      els.b.parentNode.classList.add('wideb');
      els.b.append(ladderCard(S.norm ? img : E.normalize(img)));
      els.b.append(h('div', { class: 'note' }, 'These readers expect normalized digits (centered, scaled), so your digit is normalized before they read it.'));
      els.bot.append(gallery(60));
      return;
    }
    if (step === 5) { els.b.parentNode.classList.add('wideb'); els.a.append(mistakes()); els.b.append(blackbox(), h('div', { class: 'card small' }, h('b', {}, 'So can we trust it? '), 'This reader is wrong about 1 time in 20, and even “100% sure” doesn’t mean right. It is usually reliable, not provably correct. Whether to double-check depends on what a mistake would cost. (More in M6.)')); }
  }
  NN.reg({
    id: 'N4', part: 1, title: 'Break it', short: 'Break it', steps,
    about: '<p><b>On this page:</b> test the hand-built network on real handwriting, find out why it fails, and compare four networks that were really trained on 50,000 MNIST digits.</p><p><b>To do:</b> draw with the mouse, trackpad or a finger. If drawing is awkward, click real digits along the bottom instead. Every accuracy on this page was measured, not made up.</p>',
    enter, reset: fresh,
    show(step) { render(step); return Promise.resolve(); },
  });
})();
