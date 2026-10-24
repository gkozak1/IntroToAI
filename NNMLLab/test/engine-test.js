// Numeric checks of the engine against the documented rules and offline references.
global.window = {}; global.atob = (s) => Buffer.from(s, 'base64').toString('binary');
for (const f of ['core', 'ladder', 'learner', 'runs', 'delivery']) require('../data/' + f + '-data.js');
require('../js/engine.js');
const E = window.NN.E, C = window.NN_CORE, LRN = window.NN_LEARNER; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
// 1 hand-built network: identity on the 10 examples, and "sum >= 1" == "bias -1, fire at >= 0"
const hand = E.hand();
for (let d = 0; d < 10; d++) { const f = E.forward(hand, E.curatedBits[d]); ok(f.o.every((v, k) => v === (k === d ? 1 : 0)), 'identity ' + d);
  const z = E.curatedBits[d]; for (let j = 0; j < 10; j++) { let s = 0; for (let i = 0; i < 8; i++) s += z[i] * hand.W1[i][j]; ok((s >= 1) === (f.h[j] === 1), 'threshold equiv ' + d + ' ' + j); } }
// 2 inputs follow the documented rule
for (let d = 0; d < 10; d++) ok(JSON.stringify(E.bits(E.curated(d))) === JSON.stringify(C.curated.bits[d]), 'bits rule ' + d);
// 3 close-up gradient equals the full network's backprop gradient for that weight (and bias)
const L = E.learnerSnap(); for (const b of LRN.batches) { const r = E.lstep(L, b.map((i) => LRN.deckBits[i]), b.map((i) => LRN.deckLabels[i]), 0); const g = E.closeGradExact(L, b, 2, 4, L.W2[2][4], L.b2[4]); ok(Math.abs(r.g.W2[2][4] - g.gw) < 1e-12 && Math.abs(r.g.b2[4] - g.gb) < 1e-12, 'closeup grad = backprop grad'); }
// 4 worksheet rounding stays within .001 of exact, and the rows add up
for (const b of LRN.batches) { const w = E.r3(L.W2[2][4]), bb = E.r3(L.b2[4]); const rows = E.closeRows(L, b, 2, 4, w, bb), sm = E.closeSummary(rows), ex = E.closeGradExact(L, b, 2, 4, w, bb);
  ok(Math.abs(sm.gw - ex.gw) <= 0.0015 && Math.abs(sm.gb - ex.gb) <= 0.0015, 'rounding'); rows.forEach((r) => { ok(Math.abs(r.yh - E.r3(r.h * r.w + r.c + r.b)) < 1e-9, 'yhat row'); ok(Math.abs(r.e - E.r3(r.yh - r.y)) < 1e-9, 'error row'); }); }
// 5 a finite-difference check of the full Learner gradient (one hidden-layer weight)
{ const b = LRN.batches[0], X = b.map((i) => LRN.deckBits[i]), D = b.map((i) => LRN.deckLabels[i]); const r = E.lstep(L, X, D, 0); const loss = (LL) => E.lstep(LL, X, D, 0).loss; const eps = 1e-6; const L2 = JSON.parse(JSON.stringify(L)); L2.W1[1][2] += eps; const fd = (loss(L2) - r.loss) / eps; ok(Math.abs(fd - r.g.W1[1][2]) < 1e-4, `hidden weight grad fd ${fd} vs ${r.g.W1[1][2]}`); }
// 6 browser ladder models reproduce the offline predictions on every shipped test image
const ref = require('./ref_preds.json'); E.ladder.forEach((m) => { let agree = 0; C.test.idx.forEach((i, q) => { if (E.ladderRun(m, E.testImg(i)).pick === ref[m.name][q]) agree++; }); ok(agree === C.test.idx.length, `${m.name}: ${agree}/${C.test.idx.length} match offline`); });
// 7 scrambled / matrix form = neuron by neuron
{ const n = E.scrambled(3), x = E.curatedBits[4], f = E.forward(n, x); for (let j = 0; j < 10; j++) { let s = n.b1[j]; for (let i = 0; i < 8; i++) s += x[i] * n.W1[i][j]; ok(Math.abs(s - f.z1[j]) < 1e-12, 'matrix = neuron'); } }
console.log(fails ? fails + ' FAILURES' : 'all engine checks pass');
