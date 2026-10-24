/* N3 Networks as matrices: the same network, folded into tables; sizes; all digits at once; parallel work. */
(function () {
  const NN = window.NN, E = NN.E, V = NN.V, h = NN.h, s = NN.s;
  const S = {};
  const fresh = () => { S.d = 4; S.cell = { L: 1, i: 5, j: 9 }; S.col = 9; S.seed = 1; S.workers = 2; S.answers = {}; S.sizes = [784, 32, 10]; };
  fresh();
  const hand = E.hand();
  const IN = Array.from({ length: 8 }, (_, i) => V.IN(i)), HL = Array.from({ length: 10 }, (_, j) => V.HL(j)), OL = Array.from({ length: 10 }, (_, k) => V.OL(k));
  const steps = [
    { t: 'Wires → table', c1: 'Every connection between two layers becomes one cell of a weight matrix', c2: 'Row = where the connection starts (an input). Column = where it goes (a hidden neuron). Point at or click a cell to light up its connection. Only 20 of the 80 cells aren’t 0: those are the hand-built rules.' },
    { t: 'One column', c1: () => `One column of the matrix holds every weight entering one neuron (${V.HL(S.col)})`, c2: 'Multiply the input row by that column, number by number, and add them up: that’s the neuron’s weighted sum. Add the bias to get its calculated value.' },
    { t: 'Whole layer', c1: 'Input row × weight matrix = every hidden neuron’s sum, in one step', c2: '(1 × 8) times (8 × 10) gives (1 × 10): one number for each hidden neuron. Then add the bias row and apply the activation.' },
    { t: 'Next layer', c1: 'The hidden row becomes the input to the next matrix', c2: '(1 × 10) times (10 × 10) gives the 10 output values. The layers must go in order: this multiplication needs the hidden row first.' },
    { t: 'Size rule', c1: 'The sizes come from the network’s shape', c2: 'Two matrices can multiply only when the inside numbers match. The answer takes the outside numbers. Try other network shapes.' },
    { t: 'All 10 digits', c1: 'Stack the 10 digits as rows: one multiplication does them all', c2: '(10 × 8) times (8 × 10) gives a (10 × 10) table of hidden values, one row per digit. The final outputs light up as a diagonal: each digit fires its own output.' },
    { t: 'Practice', c1: 'Practice with messy weights on the same 8–10–10 shape', c2: 'These weights are random, and there’s no activation (each neuron passes on its calculated value), like the matrix problems in class. Click a hidden cell to see its work, or switch to How it works to calculate them yourself.' },
    { t: 'Many workers', c1: 'Why GPUs (graphics chips with thousands of small calculators) help: many workers at once', c2: 'Inside a layer, every neuron can be calculated at once, and so can the products inside each neuron. But the next layer has to wait for the one before it.' },
  ];
  let els = {};
  function enter(stage) {
    stage.append(h('div', { class: 'n3grid' }, h('div', { class: 'col' }, h('div', { class: 'ttl' }, 'The network ', (els.badge = h('span', { class: 'badge' }, 'Hand-built network'))), (els.net = h('div', { class: 'netbox small' }))), (els.right = h('div', { class: 'col mxpane' }))));
  }
  const netFor = (step) => (step === 6 ? E.scrambled(S.seed) : hand);
  function drawNet(step, extra = {}) {
    const net = netFor(step), fw = E.forward(net, E.curatedBits[S.d]);
    els.net.innerHTML = '';
    els.net.append(V.network({ net, fw: step >= 1 ? fw : null, values: step >= 1, edges: step === 6 ? 'all' : 'nonzero', maxW: step === 6 ? 0.8 : 1, continuous: step === 6, fmt: E.f2, win: E.verdict(fw.o, net.act2).pick, chips: false, ...extra, onNode: step === 1 || step === 2 ? (L, j) => { if (L === 1) { S.col = j; render(NN.st.step); } } : null }));
    els.badge.textContent = step === 6 ? 'Same shape, scrambled weights' : 'Hand-built network';
    els.badge.className = 'badge' + (step === 6 ? ' other' : '');
  }
  const rowVec = (label, vals, names, o = {}) => h('div', { class: 'vec' }, h('div', { class: 'vlab' }, label), V.matrix([''], names, (i, j) => vals[j], { rowHead: false, ...o }));
  function picker() { return h('div', { class: 'chips' }, h('span', { class: 'small muted' }, 'Digit:'), Array.from({ length: 10 }, (_, d) => h('button', { class: 'chip' + (S.d === d ? ' on' : ''), onclick: () => { S.d = d; render(NN.st.step); } }, d))); }
  function render(step) {
    const R = els.right; R.innerHTML = '';
    els.right.parentNode.classList.toggle('wide', step === 5 || step === 4);
    const x = E.curatedBits[S.d], net = netFor(step), fw = E.forward(net, x);
    if (step === 0) {
      const c = S.cell;
      drawNet(0, { edge: c, focus: null });
      R.append(h('div', { class: 'mxhead' }, h('b', {}, 'W1: weights from the inputs into the hidden layer'), V.sizeTag(8, 10, '8 rows (inputs) × 10 columns (hidden)')));
      R.append(V.matrix(IN, HL, (i, j) => hand.W1[i][j], { cls: '', hl: c.L === 1 ? { r: c.i, c: c.j } : null, zeroDot: true, onCell: (i, j) => { S.cell = { L: 1, i, j }; render(0); }, onHover: (i, j) => { S.cell = { L: 1, i, j }; drawNet(0, { edge: S.cell }); hlCell(i, j); } }));
      R.append(h('div', { class: 'conv small' }, h('b', {}, `${V.IN(c.i)} → ${V.HL(c.j)}`), ` sits in row ${c.i + 1} (where it starts), column ${c.j + 1} (where it goes). Weight: ${E.f2(hand.W1[c.i][c.j])}.`));
      R.append(h('div', { class: 'note' }, 'A whole row = every connection ', h('b', {}, 'leaving'), ' one input. A whole column = every connection ', h('b', {}, 'entering'), ' one hidden neuron. (This is our convention, with inputs written as a row. Some books flip it.)'));
      R.append(h('div', { class: 'mxhead' }, h('b', {}, 'W2: hidden layer into the outputs'), V.sizeTag(10, 10, '10 rows (hidden) × 10 columns (outputs)')));
      R.append(V.matrix(HL, OL, (j, k) => hand.W2[j][k], { cls: 'tiny', zeroDot: true, hl: c.L === 2 ? { r: c.i, c: c.j } : null, onCell: (j, k) => { S.cell = { L: 2, i: j, j: k }; render(0); } }));
      const n3c = V.predict('n3-row', 'is the top row of W1 all the weights entering HL1?', [{ t: 'Yes', ok: false, fb: 'The top row is every weight leaving I1. The weights entering HL1 are the first column.' }, { t: 'No', ok: true, fb: 'Right. The top row is everything leaving I1; HL1’s incoming weights are column 1.' }]); if (n3c) R.insertBefore(n3c, R.children[4]);
      return;
    }
    if (step === 1) {
      const j = S.col; drawNet(1, { focus: { L: 1, j } });
      R.append(picker());
      R.append(h('div', { class: 'mxrow' }, rowVec(`Input row for digit ${S.d} (1 × 8)`, x, IN, { hl: { row: 0 } }), h('span', { class: 'op' }, '×'), h('div', { class: 'vec' }, h('div', { class: 'vlab' }, `W1 (8 × 10). Column ${j + 1} = into ${V.HL(j)}. Click a column.`), V.matrix(IN, HL, (i, q) => hand.W1[i][q], { zeroDot: true, hl: { col: j }, onCell: (i, q) => { S.col = q; render(1); } }))));
      const prods = x.map((v, i) => v * hand.W1[i][j]), sum = prods.reduce((a, b) => a + b, 0);
      R.append(h('div', { class: 'dot card' }, h('div', { class: 'ttl' }, `Dot product for ${V.HL(j)}: multiply matching numbers, then add`),
        h('div', { class: 'prods' }, x.map((v, i) => h('div', { class: 'pr' + (Math.abs(prods[i]) > 1e-9 ? ' nz' : '') }, h('span', { class: 'a' }, v), '×', h('span', { class: 'w' }, E.f2(hand.W1[i][j])), h('span', { class: 'eq' }, '= ' + E.f2(prods[i]))))),
        h('div', { class: 'sumline' }, `sum = ${E.f2(sum)}   + bias (${E.f2(hand.b1[j])})   = calculated value `, h('b', {}, E.f2(sum + hand.b1[j])), `   → on/off switch → activated value `, h('b', {}, fw.h[j]))));
      return;
    }
    if (step === 2 || step === 3) {
      drawNet(step, { focus: null });
      R.append(picker());
      const L1 = step === 2;
      const inRow = L1 ? x : fw.h, W = L1 ? hand.W1 : hand.W2, z = L1 ? fw.z1 : fw.z2, a = L1 ? fw.h : fw.o, b = L1 ? hand.b1 : hand.b2;
      const sums = z.map((v, j) => v - b[j]);
      R.append(h('div', { class: 'mxrow' }, rowVec(L1 ? 'Input row (1 × 8)' : 'Hidden row (1 × 10)', inRow, L1 ? IN : HL), h('span', { class: 'op' }, '×'), h('div', { class: 'vec' }, h('div', { class: 'vlab' }, L1 ? 'W1 (8 × 10)' : 'W2 (10 × 10)'), V.matrix(L1 ? IN : HL, L1 ? HL : OL, (i, j) => W[i][j], { zeroDot: true }))));
      R.append(h('div', { class: 'chain' },
        rowVec('= weighted sums (1 × 10)', sums, L1 ? HL : OL), h('span', { class: 'op' }, '+'), rowVec('bias row (1 × 10)', b, L1 ? HL : OL), h('span', { class: 'op' }, '='), rowVec('calculated values', z, L1 ? HL : OL),
        h('span', { class: 'op' }, '→ switch →'), rowVec(L1 ? 'hidden row (activated)' : 'outputs (activated)', a, L1 ? HL : OL, { style: (v) => (v >= 0.5 ? 'background:#1f9d55;color:#fff' : '') })));
      R.append(h('div', { class: 'sizes' }, V.sizeTag(1, L1 ? 8 : 10), h('span', { class: 'op' }, '·'), V.sizeTag(L1 ? 8 : 10, 10), h('span', { class: 'op' }, '='), V.sizeTag(1, 10), h('span', { class: 'note' }, '(· means matrix multiply.)'), h('span', { class: 'note' }, L1 ? 'The inside numbers (8 and 8) match; the answer keeps the outside numbers (1 and 10).' : `The answer: ${V.OL(E.verdict(fw.o, 'step').pick)} is the only output that fires.`)));
      if (L1) R.append(h('div', { class: 'hiwonly note' }, `Each of the 10 sums is a dot product like the one in step 2: e.g. ${V.HL(9)} = ${x.map((v, i) => `${v}×${E.f2(hand.W1[i][9])}`).join(' + ')} = ${E.f2(sums[9])}.`));
      return;
    }
    if (step === 4) {
      drawNet(4, { dimAll: true });
      const [a, b, c] = S.sizes;
      R.append(h('div', { class: 'ttl' }, 'Pick a network shape'), h('div', { class: 'chips' }, [[8, 10, 10, 'ours'], [784, 32, 10, 'digit reader'], [3072, 64, 10, 'photo classifier'], [4, 8, 1, 'delivery time']].map(([p, q, r, n]) => h('button', { class: 'chip' + (a === p && b === q && c === r ? ' on' : ''), onclick: () => { S.sizes = [p, q, r]; render(4); } }, `${p}→${q}→${r} (${n})`))));
      const dom = (r1, c1, r2, c2, lab) => h('div', { class: 'domrow' }, h('div', { class: 'dom' }, h('span', { class: 'o' }, r1), '×', h('span', { class: 'in' }, c1)), h('span', { class: 'op' }, '·'), h('div', { class: 'dom' }, h('span', { class: 'in' }, r2), '×', h('span', { class: 'o' }, c2)), h('span', { class: 'op' }, '='), h('div', { class: 'dom res' }, h('span', { class: 'o' }, r1), '×', h('span', { class: 'o' }, c2)), h('span', { class: 'small muted' }, lab));
      R.append(h('div', { class: 'card' }, h('div', { class: 'ttl' }, 'One example at a time'), dom(1, a, a, b, 'input row × W1 → hidden row'), dom(1, b, b, c, 'hidden row × W2 → outputs')));
      R.append(h('div', { class: 'card' }, h('div', { class: 'ttl' }, 'A batch of 5 examples at once'), dom(5, a, a, b, 'one row per example'), dom(5, b, b, c, '5 rows of outputs')));
      const P = a * b + b + b * c + c;
      R.append(h('div', { class: 'card small' }, h('b', {}, 'Parameters to store: '), `${a}×${b} + ${b} + ${b}×${c} + ${c} = `, h('b', {}, P.toLocaleString()), ' (weights in both matrices plus one bias per neuron).'));
      R.append(V.predict('n3-size' + a, `can (1 × ${a}) be multiplied by (${b} × ${c})?`, [{ t: 'Yes', ok: a === b, fb: a === b ? 'The inside numbers match.' : `No: the inside numbers (${a} and ${b}) don’t match, so the rows and columns can’t pair up.` }, { t: 'No', ok: a !== b, fb: a !== b ? `Right: ${a} ≠ ${b}. Each input needs exactly one weight in the column.` : 'They do match here.' }]));
      return;
    }
    if (step === 5) {
      drawNet(5, { dimAll: true });
      const X = E.curatedBits, H = X.map((r) => E.forward(hand, r).h), O = X.map((r) => E.forward(hand, r).o);
      const dig = Array.from({ length: 10 }, (_, d) => 'digit ' + d);
      R.append(h('div', { class: 'mxrow' }, h('div', { class: 'vec' }, h('div', { class: 'vlab' }, 'X: 10 digits × 8 inputs'), V.matrix(dig, IN, (d, i) => X[d][i], {})), h('span', { class: 'op' }, '· W1, + bias, switch →'), h('div', { class: 'vec' }, h('div', { class: 'vlab' }, 'Hidden values: 10 × 10'), V.matrix(dig, HL, (d, j) => H[d][j], { rowHead: false, style: (v) => (v ? 'background:#1f9d55;color:#fff' : '') })), h('span', { class: 'op' }, '· W2, + bias, switch →'), h('div', { class: 'vec' }, h('div', { class: 'vlab' }, 'Outputs: 10 × 10'), V.matrix(dig, OL, (d, k) => O[d][k], { rowHead: false, style: (v) => (v ? 'background:#1f9d55;color:#fff' : '') }))));
      R.append(h('div', { class: 'sizes' }, V.sizeTag(10, 8), h('span', { class: 'op' }, '·'), V.sizeTag(8, 10), h('span', { class: 'op' }, '='), V.sizeTag(10, 10), h('span', { class: 'op' }, '→'), V.sizeTag(10, 10), h('span', { class: 'op' }, '·'), V.sizeTag(10, 10), h('span', { class: 'op' }, '='), V.sizeTag(10, 10), h('span', { class: 'note', style: 'max-width:420px' }, 'Each digit fires only its own output: a diagonal. Same weights, 10 examples, one pass. This is how real networks handle batches.')));
      return;
    }
    if (step === 6) {
      drawNet(6, {});
      const sn = netFor(6), f6 = E.forward(sn, x);
      R.append(h('div', { class: 'chips' }, picker(), h('button', { class: 'btn small', onclick: () => { S.seed++; S.answers = {}; render(6); } }, 'New random weights')));
      R.append(h('div', { class: 'mxrow' }, rowVec('Input row (1 × 8)', x, IN), h('span', { class: 'op' }, '×'), h('div', { class: 'vec' }, h('div', { class: 'vlab' }, 'W1 (8 × 10)'), V.matrix(IN, HL, (i, j) => sn.W1[i][j], {}))));
      R.append(h('div', { class: 'mxrow' }, rowVec('+ bias row', sn.b1, HL)));
      const resRow = h('div', { class: 'vec' }, h('div', { class: 'vlab' }, '= hidden values (1 × 10)'));
      const t = h('table', { class: 'mx big' }, h('tr', {}, HL.map((n) => h('th', {}, n))), h('tr', {}, HL.map((n, j) => {
        const key = S.seed + ':' + S.d + ':' + j, ans = S.answers[key];
        if (NN.mode === 'hiw') {
          const inp = h('input', { class: 'ansin', value: ans != null ? ans : '', placeholder: '?', onchange: (e) => { S.answers[key] = e.target.value; render(6); } });
          const ok = ans != null && ans !== '' && Math.abs(+ans - f6.z1[j]) < 0.051;
          return h('td', { class: ans == null || ans === '' ? '' : ok ? 'okc' : 'badc' }, inp);
        }
        return h('td', { class: f6.h[j] >= 0 ? 'p' : 'n', onclick: () => { S.work = j; render(6); } }, E.f2(f6.h[j]));
      })));
      resRow.append(t); R.append(resRow);
      const j = S.work != null ? S.work : 0;
      R.append(h('div', { class: 'card small' }, h('b', {}, `${V.HL(j)}: `), x.map((v, i) => `${v}×(${E.f2(sn.W1[i][j])})`).join(' + '), ` + (${E.f2(sn.b1[j])}) = `, h('b', {}, NN.mode === 'hiw' ? '?' : E.f2(f6.z1[j])), h('span', { class: 'muted' }, NN.mode === 'hiw' ? '  (type each hidden value above; boxes turn green when right)' : '  (click another cell to see its work)')));
      R.append(h('div', { class: 'note' }, 'Carry the hidden row forward the same way: hidden row (1 × 10) · W2 (10 × 10) gives the 10 outputs. (With random weights the “highest output” in the diagram means nothing: this network was never built or trained.)'));
      return;
    }
    if (step === 7) { drawNet(7, { dimAll: true }); workers(R); }
  }
  function hlCell(i, j) { els.right.querySelectorAll('table.mx.big td').forEach((td) => td.classList.remove('x')); const t = els.right.querySelector('table.mx.big'); if (t) { const td = t.rows[i + 1] && t.rows[i + 1].cells[j + 1]; if (td) td.classList.add('x'); } }
  // parallel work: rounds of calculation for a given number of workers
  function workers(R) {
    const W = S.workers;
    R.append(h('div', { class: 'ttl' }, 'How many workers can calculate at the same time?'), h('div', { class: 'chips' }, [1, 2, 5, 10, 100].map((n) => h('button', { class: 'chip' + (W === n ? ' on' : ''), onclick: () => { S.workers = n; render(7); } }, n === 1 ? '1 worker' : n + ' workers'))));
    // each neuron = one task (its products are done together by the same worker when it has many lanes)
    const r1 = Math.ceil(10 / W), r2 = Math.ceil(10 / W), total = r1 + r2;
    const box = h('div', { class: 'wk card' });
    const lane = (name, rounds, offset, cls) => { const row = h('div', { class: 'wrow' }, h('span', { class: 'wl' }, name)); for (let t = 0; t < total; t++) row.append(h('span', { class: 'wc' + (t >= offset && t < offset + rounds ? ' ' + cls : '') })); return row; };
    box.append(h('div', { class: 'small muted' }, 'Each square is one time step. Hidden neurons first; outputs can only start when every hidden value is ready.'));
    box.append(lane('Hidden layer (10 neurons)', r1, 0, 'l1'), lane('Output layer (10 neurons)', r2, r1, 'l2'));
    box.append(h('div', { class: 'wsum' }, h('b', {}, `${total} time steps`), W === 1 ? ' with one worker doing the 20 neurons one at a time.' : W >= 10 ? ' : each layer takes a single step. Even with 100 workers it can’t go below 2, because the output layer must wait for the hidden layer.' : ` with ${W} workers sharing each layer.`));
    R.append(box);
    // animated grid of the 20 neurons in rounds
    const grid = h('div', { class: 'wgrid' });
    const cells = [];
    for (let L = 0; L < 2; L++) { const row = h('div', { class: 'wg' }, h('span', { class: 'wl' }, L ? 'OL0–OL9' : 'HL1–HL10')); for (let q = 0; q < 10; q++) { const c = h('span', { class: 'wn' }, L ? 'OL' + q : 'HL' + (q + 1)); row.append(c); cells.push({ c, t: L * r1 + Math.floor(q / W) }); } grid.append(row); }
    R.append(grid, h('button', { class: 'btn small', onclick: () => run() }, '▶ Run it'));
    const run = async () => { cells.forEach(({ c }) => c.classList.remove('done')); for (let t = 0; t < total; t++) { cells.filter((x) => x.t === t).forEach(({ c }) => c.classList.add('done')); try { await NN.wait(450); } catch (e) { return; } } };
    R.append(h('div', { class: 'note' }, 'Inside one neuron, its 8 products can also be multiplied at the same time and then added. And different images in a batch can go through side by side. What can’t be skipped is the order of the layers.'));
    NN.quiet(run());
  }
  NN.reg({
    id: 'N3', part: 1, title: 'Networks as matrices', short: 'Matrices', steps,
    about: '<p><b>On this page:</b> the same hand-built network, written as tables of numbers (matrices). A whole layer is one matrix multiplication.</p><p><b>To do:</b> click cells and wires to connect them; pick a digit; try other network shapes; in Practice, switch to <i>How it works</i> to calculate the hidden values yourself.</p>',
    enter, reset: fresh,
    show(step) { render(step); return Promise.resolve(); },
  });
})();
