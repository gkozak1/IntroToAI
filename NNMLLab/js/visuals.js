/* Shared visuals: the same pictures appear in every experience so students build on them. */
(function () {
  const NN = window.NN, E = NN.E, s = NN.s, h = NN.h;
  const V = (NN.V = {});
  V.POS = '#2f6fd6'; V.NEG = '#e07b19'; V.ON = '#1f9d55'; V.ACC = '#5b38d1';
  // five strength bands (shared with LLM Lab and the ML Player)
  V.BANDS = ['#ff7171', '#ffb05c', '#ffe066', '#b9e769', '#3cc46a'];
  V.band = (v) => V.BANDS[Math.max(0, Math.min(4, Math.floor(v * 5 - 1e-9)))];
  V.wColor = (w) => (w >= 0 ? V.POS : V.NEG);
  V.wWidth = (w, max = 1) => 0.8 + 3.6 * Math.min(1, Math.abs(w) / max);

  /* ---------- names ---------- */
  V.IN = (i) => 'I' + (i + 1);
  V.HL = (j) => 'HL' + (j + 1);
  V.OL = (k) => 'OL' + k;
  const REG = ['row 1 left', 'row 1 right', 'row 2 left', 'row 2 right', 'row 3 left', 'row 3 right', 'row 4 left', 'row 4 right'];
  V.REG = REG;
  // what each hand-built hidden neuron detects, in plain words
  V.HMEAN = ['bar across row 1', 'bar across row 2', 'bar across row 3', 'bar across row 4', 'left stroke, rows 1–2', 'right stroke, rows 1–2', 'left stroke, rows 2–3', 'right stroke, rows 2–3', 'left stroke, rows 3–4', 'right stroke, rows 3–4'];

  /* ---------- stroke geometry (in 28x28 pixel units) ---------- */
  V.stroke = (j) => {
    const [a, b] = E.HPAIRS[j]; const row = (r) => Math.floor(r / 2) * 7 + 3.5;
    if (a + 1 === b && a % 2 === 0) return { x1: 2.5, y1: row(a), x2: 25.5, y2: row(a) }; // horizontal bar
    const left = a % 2 === 0, off = [-1.6, 0, 1.6][Math.floor(Math.floor(a / 2))] || 0; // offset so overlapping strokes stay visible
    const x = (left ? 7 : 21) + off; return { x1: x, y1: row(a) - 1.5, x2: x, y2: row(b) + 1.5 };
  };

  /* ---------- the digit, with optional regions, dots, counts, inputs and strokes ---------- */
  // opts: {cell, grid, dots, counts, bits, strokes:[0/1 x10], strokeFocus, regionFocus:[i], dim, ghost}
  V.digit = (img, o = {}) => {
    const c = o.cell || 10, W = 28 * c, svg = s('svg', { viewBox: `0 0 ${W} ${W}`, class: 'digit', width: W, height: W });
    const px = s('g', { class: 'px', opacity: o.dim ? 0.25 : 1 });
    for (let r = 0; r < 28; r++) for (let q = 0; q < 28; q++) { const v = img[r * 28 + q]; if (v > 6) px.append(s('rect', { x: q * c, y: r * c, width: c + 0.3, height: c + 0.3, fill: `rgb(${255 - v},${255 - v},${255 - v})` })); }
    svg.append(s('rect', { x: 0, y: 0, width: W, height: W, fill: '#fff' }), px);
    if (o.dots) {
      const g = s('g', { class: 'dots' });
      for (let r = 0; r < 28; r++) for (let q = 0; q < 28; q++) if (img[r * 28 + q] >= E.DARK) g.append(s('circle', { cx: q * c + c / 2, cy: r * c + c / 2, r: c * 0.28, fill: '#d6336c' }));
      svg.append(g);
    }
    if (o.grid) {
      const g = s('g', { class: 'grid' });
      for (let i = 0; i < 8; i++) {
        const R = Math.floor(i / 2), Cc = i % 2, x = Cc * 14 * c, y = R * 7 * c, foc = o.regionFocus && o.regionFocus.includes(i);
        g.append(s('rect', { x: x + 1, y: y + 1, width: 14 * c - 2, height: 7 * c - 2, fill: foc ? 'rgba(91,56,209,.10)' : 'none', stroke: foc ? V.ACC : '#9aa6b8', 'stroke-width': foc ? 3 : 1.2, rx: 4 }));
        g.append(s('text', { x: x + 6, y: y + 15, class: 'rl', text: V.IN(i) }));
        if (o.counts) g.append(s('text', { x: x + 14 * c - 8, y: y + 7 * c - 8, class: 'rc' + (o.counts[i] >= E.MIN_DOTS ? ' hi' : ''), 'text-anchor': 'end', text: o.counts[i] + (o.showRule ? (o.counts[i] >= E.MIN_DOTS ? ' ≥ 5' : ' < 5') : '') }));
        if (o.bits) g.append(s('g', {}, s('rect', { x: x + 14 * c - 30, y: y + 6, width: 24, height: 20, rx: 6, fill: o.bits[i] ? V.ON : '#e5e9f0' }), s('text', { x: x + 14 * c - 18, y: y + 20, 'text-anchor': 'middle', class: 'rb' + (o.bits[i] ? ' on' : ''), text: o.bits[i] })));
      }
      svg.append(g);
    }
    if (o.strokes) {
      const g = s('g', { class: 'strokes' });
      o.strokes.forEach((on, j) => {
        const L = V.stroke(j), foc = o.strokeFocus === j;
        if (!on && !foc) return;
        g.append(s('line', { x1: L.x1 * c, y1: L.y1 * c, x2: L.x2 * c, y2: L.y2 * c, stroke: on ? V.ON : '#9aa6b8', 'stroke-width': foc ? c * 1.0 : c * 0.6, 'stroke-linecap': 'round', opacity: on ? 0.62 : 0.45, 'stroke-dasharray': on ? null : `${c * 0.6} ${c * 0.6}`, class: 'stk' }));
      });
      svg.append(g);
    }
    return svg;
  };
  // tiny 2x4 icon of the two regions a hidden neuron looks at
  V.icon = (j, x, y, sz = 5, on = false) => {
    const g = s('g', { class: 'hicon' }), [a, b] = E.HPAIRS[j];
    for (let i = 0; i < 8; i++) { const R = Math.floor(i / 2), Cc = i % 2; g.append(s('rect', { x: x + Cc * sz * 1.4, y: y + R * sz * 0.8, width: sz * 1.4 - 0.6, height: sz * 0.8 - 0.6, fill: i === a || i === b ? (on ? V.ON : '#5b6a7a') : '#e3e8ef' })); }
    return g;
  };

  /* ---------- the network diagram ---------- */
  // geometry shared by every view of the 8-10-10 network
  V.NET = { W: 600, H: 540, xi: 70, xh: 300, xo: 520, yi: (i) => 70 + i * 57, yh: (j) => 40 + j * 51, yo: (k) => 40 + k * 51 };
  // opts: {net, fw (forward result), focus:{L:1|2,j}, values:bool, edges:'nonzero'|'all', live:{...}, dimAll, onNode, act}
  V.network = (o) => {
    const G = V.NET, net = o.net, fw = o.fw, svg = s('svg', { viewBox: `0 0 ${G.W} ${G.H}`, class: 'net' });
    const defs = s('defs', {}, s('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, s('feGaussianBlur', { stdDeviation: 3.5, result: 'b' }), s('feMerge', {}, s('feMergeNode', { in: 'b' }), s('feMergeNode', { in: 'SourceGraphic' }))));
    svg.append(defs);
    const maxW = o.maxW || 1, eg = s('g', { class: 'edges' }), ng = s('g', { class: 'nodes' });
    const foc = o.focus;
    const rel1 = (i, j) => !foc || (foc.L === 1 && foc.j === j);
    const rel2 = (j, k) => !foc || (foc.L === 2 && foc.j === k);
    // input -> hidden
    for (let i = 0; i < 8; i++) for (let j = 0; j < 10; j++) {
      const w = net.W1[i][j]; if (Math.abs(w) < 1e-9 && o.edges !== 'all') continue;
      const on = o.edge ? o.edge.L === 1 && o.edge.i === i && o.edge.j === j : rel1(i, j), flow = fw && fw.x[i] * w;
      eg.append(s('path', { d: `M${G.xi + 16} ${G.yi(i)} C ${G.xi + 110} ${G.yi(i)}, ${G.xh - 110} ${G.yh(j)}, ${G.xh - 16} ${G.yh(j)}`, class: 'e e1 i' + i + ' h' + j, stroke: V.wColor(w), 'stroke-width': V.wWidth(w, maxW) + (o.edge && on ? 2.5 : 0), fill: 'none', opacity: o.dimAll ? 0.12 : on ? (o.edges === 'all' && !o.edge ? 0.55 : 0.9) : 0.08, 'stroke-dasharray': w < 0 && o.edges !== 'all' ? '6 4' : null, 'data-a': flow ? 1 : 0 }));
    }
    for (let j = 0; j < 10; j++) for (let k = 0; k < 10; k++) {
      const w = net.W2[j][k]; if (Math.abs(w) < 1e-9 && o.edges !== 'all') continue;
      const on = o.edge ? o.edge.L === 2 && o.edge.i === j && o.edge.j === k : rel2(j, k);
      eg.append(s('path', { d: `M${G.xh + 16} ${G.yh(j)} C ${G.xh + 110} ${G.yh(j)}, ${G.xo - 110} ${G.yo(k)}, ${G.xo - 16} ${G.yo(k)}`, class: 'e e2 h' + j + ' o' + k, stroke: V.wColor(w), 'stroke-width': V.wWidth(w, maxW) + (o.edge && on ? 2.5 : 0), fill: 'none', opacity: o.dimAll ? 0.12 : on ? (o.edges === 'all' && !o.edge ? 0.55 : 0.9) : 0.08, 'stroke-dasharray': w < 0 && o.edges !== 'all' ? '6 4' : null }));
    }
    svg.append(eg);
    // weight chips on focused connections
    if (foc && o.chips !== false) {
      const wg = s('g', { class: 'chips' });
      if (foc.L === 1) for (let i = 0; i < 8; i++) { const w = net.W1[i][foc.j]; if (Math.abs(w) < 1e-9 && o.edges !== 'all') continue; const x = G.xi + 70, y = G.yi(i) + (G.yh(foc.j) - G.yi(i)) * 0.18; wg.append(V.chip(x, y, E.f2(w), w)); }
      if (foc.L === 2) for (let j = 0; j < 10; j++) { const w = net.W2[j][foc.j]; if (Math.abs(w) < 1e-9 && o.edges !== 'all') continue; const x = G.xh + 70, y = G.yh(j) + (G.yo(foc.j) - G.yh(j)) * 0.18; wg.append(V.chip(x, y, E.f2(w), w)); }
      svg.append(wg);
    }
    const cont = o.continuous; // dimmer networks: shade by value
    const fillFor = (v, lit) => (v == null ? '#fff' : cont ? `rgba(31,157,85,${Math.max(0.06, Math.min(1, v))})` : lit ? V.ON : '#eef1f5');
    // inputs
    for (let i = 0; i < 8; i++) {
      const v = fw ? fw.x[i] : null, rel = !foc || (foc.L === 1 && Math.abs(net.W1[i][foc.j]) > 1e-9) || o.edges === 'all' && foc && foc.L === 1;
      const g = s('g', { class: 'node in n-i' + i, opacity: foc && !rel ? 0.35 : 1, onclick: o.onNode ? () => o.onNode(0, i) : null });
      g.append(s('rect', { x: G.xi - 16, y: G.yi(i) - 16, width: 32, height: 32, rx: 8, fill: fillFor(v, v === 1), stroke: '#7d8a9c', 'stroke-width': 1.4, filter: v === 1 && !cont ? 'url(#glow)' : null }));
      g.append(s('text', { x: G.xi, y: G.yi(i) + 5, class: 'nv' + (v === 1 ? ' on' : ''), 'text-anchor': 'middle', text: v == null ? '' : v }));
      g.append(s('text', { x: G.xi - 24, y: G.yi(i) + 4, class: 'nl', 'text-anchor': 'end', text: V.IN(i) }));
      ng.append(g);
    }
    // hidden
    for (let j = 0; j < 10; j++) {
      const v = fw ? fw.h[j] : null, lit = v != null && v >= 0.5, isF = foc && foc.L === 1 && foc.j === j;
      const rel = !foc || isF || (foc.L === 2 && Math.abs(net.W2[j][foc.j]) > 1e-9) || (o.edges === 'all' && foc.L === 2);
      const g = s('g', { class: 'node hid n-h' + j, opacity: foc && !rel ? 0.35 : 1, onclick: o.onNode ? () => o.onNode(1, j) : null, style: o.onNode ? 'cursor:pointer' : null });
      g.append(s('circle', { cx: G.xh, cy: G.yh(j), r: 17, fill: fillFor(v, lit), stroke: isF ? V.ACC : '#7d8a9c', 'stroke-width': isF ? 3.5 : 1.4, filter: lit && !cont ? 'url(#glow)' : null }));
      if (o.values && fw && v != null) g.append(s('text', { x: G.xh, y: G.yh(j) + 4, class: 'nv sm' + (lit && !cont ? ' on' : '') + (cont && v > 0.55 ? ' on' : ''), 'text-anchor': 'middle', text: cont ? (o.fmt || ((q) => E.f(q, 2)))(v) : v }));
      g.append(s('text', { x: G.xh + 23, y: G.yh(j) - 3, class: 'nl', text: V.HL(j) }));
      if (o.icons !== false) g.append(V.icon(j, G.xh + 24, G.yh(j) + 2, 6.5, lit && !cont));
      ng.append(g);
    }
    // outputs
    for (let k = 0; k < 10; k++) {
      const v = fw ? fw.o[k] : null, lit = v != null && (cont ? o.win === k : v >= 0.5), isF = foc && foc.L === 2 && foc.j === k;
      const g = s('g', { class: 'node out n-o' + k, opacity: foc && foc.L === 2 && !isF ? 0.35 : 1, onclick: o.onNode ? () => o.onNode(2, k) : null, style: o.onNode ? 'cursor:pointer' : null });
      g.append(s('circle', { cx: G.xo, cy: G.yo(k), r: 17, fill: cont ? (v == null ? '#fff' : '#fff') : fillFor(v, lit), stroke: isF ? V.ACC : lit ? (cont ? V.ACC : V.ON) : '#7d8a9c', 'stroke-width': isF || lit ? 3.5 : 1.4, filter: lit && !cont ? 'url(#glow)' : null }));
      if (o.values && fw && v != null) g.append(s('text', { x: G.xo, y: G.yo(k) + 4, class: 'nv sm' + (lit && !cont ? ' on' : ''), 'text-anchor': 'middle', text: cont ? (o.fmt || ((q) => E.f(q, 2)))(v) : v }));
      g.append(s('text', { x: G.xo + 24, y: G.yo(k) + 5, class: 'nl big' + (lit ? (cont ? ' top' : ' win') : ''), text: V.OL(k) }));
      if (lit && cont) g.append(s('text', { x: G.xo + 24, y: G.yo(k) + 19, class: 'nl top', 'font-size': 11, text: 'highest' })); // under the label, so it never runs off the edge
      ng.append(g);
    }
    svg.append(ng);
    // column titles
    svg.append(s('text', { x: G.xi, y: 22, class: 'coltitle', 'text-anchor': 'middle', text: 'Inputs (8)' }), s('text', { x: G.xh, y: 16, class: 'coltitle', 'text-anchor': 'middle', text: 'Hidden layer (10)' }), s('text', { x: G.xo, y: 16, class: 'coltitle', 'text-anchor': 'middle', text: 'Output layer (10)' }));
    return svg;
  };
  V.chip = (x, y, t, w) => s('g', { class: 'wchip' }, s('rect', { x: x - 19, y: y - 10, width: 38, height: 19, rx: 9, fill: '#fff', stroke: V.wColor(w), 'stroke-width': 1.5 }), s('text', { x, y: y + 4, 'text-anchor': 'middle', fill: V.wColor(w), text: (w > 0 ? '+' : '') + t }));
  // a dot that travels along a path (forward propagation)
  V.pulse = (svg, sel, color, ms) => {
    const paths = Array.from(svg.querySelectorAll(sel)); if (!paths.length) return Promise.resolve();
    const dots = paths.map((p) => { const d = s('circle', { r: 5.5, fill: color || V.ACC, class: 'pulse' }); svg.append(d); return { p, d, L: p.getTotalLength() }; });
    return NN.anim(ms, (u) => dots.forEach(({ p, d, L }) => { const pt = p.getPointAtLength(L * u); d.setAttribute('cx', pt.x); d.setAttribute('cy', pt.y); })).finally(() => dots.forEach(({ d }) => d.remove()));
  };

  /* ---------- the meter: weighted sum + bias + activation, one picture ---------- */
  // items: [{label, a, w}], bias, act: 'step'|'sigmoid'|'relu', title
  V.meter = (o) => {
    const items = o.items, b = o.bias || 0, act = o.act || 'step', hiw = NN.mode === 'hiw';
    const W = o.width || 360, H = o.height || 300, n = items.length + 2;
    let cur = 0; const cols = items.map((it) => { const v = it.a * it.w, c0 = cur; cur += v; return { ...it, v, c0, c1: cur }; });
    const z = cur + b;
    let lo = Math.min(0, ...cols.map((c) => Math.min(c.c0, c.c1)), z, -1.1), hi = Math.max(1.1, ...cols.map((c) => Math.max(c.c0, c.c1)), z + 0.1, cur);
    const top = 40, bot = H - 58, Y = (v) => top + ((hi - v) / (hi - lo)) * (bot - top);
    const x0 = 46, colW = Math.min(64, (W - x0 - 10) / n), svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'meter' });
    svg.append(s('text', { x: 8, y: 18, class: 'mt', text: o.title || '' }));
    // axis
    [Math.ceil(lo), 0, Math.floor(hi)].filter((v, i, a) => a.indexOf(v) === i).forEach((v) => svg.append(s('line', { x1: x0 - 4, x2: W - 6, y1: Y(v), y2: Y(v), stroke: v === 0 ? '#596577' : '#e3e8ef', 'stroke-width': v === 0 ? 1.4 : 1 }), s('text', { x: x0 - 8, y: Y(v) + 4, class: 'ax', 'text-anchor': 'end', text: v })));
    cols.forEach((c, i) => {
      const x = x0 + i * colW + 4, y0 = Y(Math.max(c.c0, c.c1)), hh = Math.max(2, Math.abs(Y(c.c0) - Y(c.c1)));
      const zero = Math.abs(c.v) < 1e-9;
      svg.append(s('rect', { x, y: zero ? Y(c.c0) - 1 : y0, width: colW - 8, height: zero ? 2 : hh, rx: 3, fill: zero ? '#c8d0db' : V.wColor(c.w), opacity: zero ? 1 : 0.85, class: 'blk' }));
      if (i < cols.length - 1) svg.append(s('line', { x1: x + colW - 8, x2: x + colW + 4, y1: Y(c.c1), y2: Y(c.c1), stroke: '#9aa6b8', 'stroke-dasharray': '3 2' }));
      svg.append(s('text', { x: x + (colW - 8) / 2, y: bot + 16, class: 'bl', 'text-anchor': 'middle', text: c.label }));
      svg.append(s('text', { x: x + (colW - 8) / 2, y: bot + 31, class: 'bv', 'text-anchor': 'middle', text: hiw ? `${E.f2(c.a)}×${E.f2(c.w)}` : zero ? 'off' : (c.v > 0 ? '+' : '') + E.f2(c.v) }));
    });
    // bias column
    const bx = x0 + cols.length * colW + 4;
    if (Math.abs(b) > 1e-9 || o.showBias) {
      svg.append(s('line', { x1: bx - 12, x2: bx + 2, y1: Y(cur), y2: Y(cur), stroke: '#9aa6b8', 'stroke-dasharray': '3 2' }));
      svg.append(s('rect', { x: bx, y: Y(Math.max(cur, z)), width: colW - 8, height: Math.max(2, Math.abs(Y(cur) - Y(z))), rx: 3, fill: '#a33', opacity: 0.75, class: 'blk' }));
      svg.append(s('text', { x: bx + (colW - 8) / 2, y: bot + 16, class: 'bl', 'text-anchor': 'middle', text: 'bias' }), s('text', { x: bx + (colW - 8) / 2, y: bot + 31, class: 'bv', 'text-anchor': 'middle', text: E.f2(b) }));
    }
    // calculated value marker
    const zx = x0 + (cols.length + 1) * colW + 4;
    svg.append(s('rect', { x: zx, y: Math.min(Y(z), Y(0)), width: colW - 8, height: Math.max(2, Math.abs(Y(z) - Y(0))), rx: 3, fill: '#33455a', class: 'blk' }));
    svg.append(s('text', { x: zx + (colW - 8) / 2, y: bot + 16, class: 'bl', 'text-anchor': 'middle', text: 'calc.' }), s('text', { x: zx + (colW - 8) / 2, y: bot + 31, class: 'bv strong', 'text-anchor': 'middle', text: E.f2(z) }));
    // firing line
    if (act === 'step') svg.append(s('line', { x1: x0, x2: W - 6, y1: Y(0), y2: Y(0), stroke: V.ON, 'stroke-width': 2, 'stroke-dasharray': '7 4' }));
    const out = E.act[act](z);
    svg.append(s('text', { x: 8, y: H - 8, class: 'mres', text: `Calculated value ${E.f2(z)} → activated value ${act === 'step' ? out : E.f(out, 2)}` }));
    if (act === 'step') svg.append(s('text', { x: W - 6, y: 33, class: 'fire', 'text-anchor': 'end', text: 'green dashes = firing line (0)' }));
    return { svg, z, out };
  };
  // the activation curve with a dot at the neuron's calculated value
  V.actCurve = (act, z, o = {}) => {
    const W = o.width || 210, H = o.height || 150, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'actc' });
    const lo = -3, hi = 3, X = (v) => 20 + ((v - lo) / (hi - lo)) * (W - 30), Y = (v) => H - 26 - v * (H - 56) / (act === 'relu' ? 3 : 1);
    svg.append(s('line', { x1: 20, x2: W - 10, y1: Y(0), y2: Y(0), stroke: '#9aa6b8' }), s('line', { x1: X(0), x2: X(0), y1: 14, y2: H - 20, stroke: '#d5dbe4' }));
    let d = ''; for (let i = 0; i <= 120; i++) { const v = lo + (i / 120) * (hi - lo); const a = act === 'relu' ? Math.min(3, E.act.relu(v)) : E.act[act](v); d += (i ? 'L' : 'M') + X(v).toFixed(1) + ' ' + Y(a).toFixed(1); }
    svg.append(s('path', { d, stroke: V.ACC, 'stroke-width': 2.5, fill: 'none' }));
    const zc = Math.max(lo, Math.min(hi, z)), a = act === 'relu' ? Math.min(3, E.act.relu(zc)) : E.act[act](zc);
    svg.append(s('circle', { cx: X(zc), cy: Y(a), r: 6, fill: V.ON, stroke: '#fff', 'stroke-width': 2 }));
    svg.append(s('text', { x: W / 2, y: H - 6, class: 'ax', 'text-anchor': 'middle', text: 'calculated value →' }), s('text', { x: 6, y: 12, class: 'ax', text: 'activated value' }));
    const names = { step: 'On/off switch (step)', sigmoid: 'Dimmer (sigmoid)', relu: 'Ramp (ReLU)' };
    if (o.title !== false) svg.append(s('text', { x: W - 8, y: 12, class: 'ax strong', 'text-anchor': 'end', text: names[act] }));
    return svg;
  };

  /* ---------- the 10-digit strip ---------- */
  V.strip = (net, o = {}) => {
    const res = E.strip(net), box = h('div', { class: 'strip' });
    box.append(h('div', { class: 'striplabel' }, o.label || 'Our 10 example digits:'));
    res.forEach((r) => {
      const cv = V.thumb(E.curated(r.d), 30);
      const what = r.fired.length === 0 ? 'nothing fired' : r.fired.length > 1 ? 'fired ' + r.fired.map((k) => 'OL' + k).join('+') : 'OL' + r.fired[0];
      box.append(h('div', { class: 'sd ' + (r.ok ? 'ok' : 'bad') + (o.sel === r.d ? ' sel' : ''), title: `Digit ${r.d}: ${what}`, onclick: o.onPick ? () => o.onPick(r.d) : null }, cv, h('span', { class: 'mk' }, r.ok ? '✓' : '✗')));
    });
    const n = res.filter((r) => r.ok).length;
    box.append(h('div', { class: 'stripscore' + (n === 10 ? ' all' : '') }, n + ' of 10 read correctly'));
    return box;
  };
  V.thumb = (img, size = 28) => { const cv = h('canvas', { width: 28, height: 28, class: 'thumb', style: `width:${size}px;height:${size}px` }); const ctx = cv.getContext('2d'), id = ctx.createImageData(28, 28); for (let i = 0; i < 784; i++) { const v = 255 - img[i]; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; } ctx.putImageData(id, 0, 0); return cv; };

  /* ---------- matrices ---------- */
  // rows/cols: header labels; get(r,c) value; opts: {hl:{r,c,row,col}, fmt, onCell, cls}
  V.matrix = (rows, cols, get, o = {}) => {
    const t = h('table', { class: 'mx ' + (o.cls || '') });
    const fmt = o.fmt || ((v) => (Math.abs(v) < 1e-9 ? (o.zeroDot ? '·' : '0') : E.f2(v)));
    if (o.colHead !== false) t.append(h('tr', {}, o.rowHead !== false ? h('th', { class: 'corner' }, o.corner || '') : null, cols.map((c, j) => h('th', { class: 'ch' + (o.hl && o.hl.col === j ? ' hl' : '') }, c))));
    rows.forEach((r, i) => t.append(h('tr', {}, o.rowHead !== false ? h('th', { class: 'rh' + (o.hl && o.hl.row === i ? ' hl' : '') }, r) : null, cols.map((c, j) => {
      const v = get(i, j), on = o.hl && ((o.hl.r === i && o.hl.c === j) || o.hl.row === i || o.hl.col === j), exact = o.hl && o.hl.r === i && o.hl.c === j;
      const td = h('td', { class: (Math.abs(v) < 1e-9 ? 'z' : v > 0 ? 'p' : 'n') + (on ? ' hl' : '') + (exact ? ' x' : ''), onmouseenter: o.onHover ? () => o.onHover(i, j) : null, onclick: o.onCell ? () => o.onCell(i, j) : null }, o.blank && o.blank(i, j) ? '' : fmt(v));
      if (o.style) td.style.cssText = o.style(v, i, j); return td;
    }))));
    return t;
  };
  /* ---------- optional prediction chip: never blocks Next ---------- */
  // choices: [{t, ok, fb}] ; remembers answers per key for the session
  const answered = {}, skipped = {};
  // Predict first: is this chip still waiting for the class? (switch on, not answered or skipped)
  V.pending = (key) => NN.predictOn && !answered[key] && !skipped[key];
  // hold back an answer until its chip is answered: blurred in place, same size, so nothing on the page moves
  V.veil = (el, key) => { if (el && V.pending(key)) { el.classList.add('veil'); el.dataset.veil = key; } return el; };
  const unveil = (key) => { document.querySelectorAll(`[data-veil="${key}"]`).forEach((e) => { e.classList.remove('veil'); e.classList.add('unveiled'); }); if (NN.caption) NN.caption(); };
  V.predict = (key, q, choices, after) => {
    if (!NN.predictOn) return null; // switch off: no chip (append() skips null), no gap
    const box = h('div', { class: 'predict' }, h('span', { class: 'q' }, 'Predict: ' + q));
    const fb = h('span', { class: 'fb' });
    const done = (c, btn, restoring) => { box.querySelectorAll('button').forEach((b) => (b.disabled = true)); if (btn) btn.classList.add(c.ok ? 'right' : 'wrong'); fb.innerHTML = (c.ok ? '<b>Yes.</b> ' : '<b>Not quite.</b> ') + (c.fb || ''); answered[key] = c; if (!restoring) unveil(key); if (after && !restoring) after(c); };
    choices.forEach((c) => { const b = h('button', { onclick: () => done(c, b) }, c.t); box.append(b); });
    box.append(h('button', { class: 'skip', onclick: () => { skipped[key] = true; box.remove(); unveil(key); if (after) after(null); } }, 'Skip'), fb);
    if (answered[key]) { const c = answered[key]; const idx = choices.findIndex((x) => x.t === c.t); done(c, box.querySelectorAll('button')[idx], true); }
    return box;
  };
  V.sizeTag = (r, c, label) => h('div', { class: 'size' }, h('b', {}, `${r} × ${c}`), label ? h('span', {}, label) : null);
})();
