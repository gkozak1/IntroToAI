/* LLM Lab — tab 5, Whole Process: "Animated flow". One table that grows from left to right, then loops:
   sentence → tokens → token IDs → embedding rows (pulled from the embedding matrix) + position rows = input vectors →
   12 blocks (interviews / attention arcs, supervisor, fact checker; the last token's guess after each block) →
   the last token's final vector scored against every vocabulary row → ranking (logit, probability, range) → spinner → add token, repeat.
   Controls: Rewind · Back · Next · Play/Pause · Speed. Each pass plays 20% faster than the one before, up to the fifth.
   Real numbers wherever they exist: stored for the stories, the in-browser GPT-2 for any other sentence (vectors inside the
   blocks are stored for the story sentence only; elsewhere they are drawn as placeholders). */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const st = () => $('#stage');
  const VZ = NT.viz, cp = VZ.cp; // shared visuals (js/viz.js): vectors, ranking table, spinner, line colors
  let SEQ = 0; const LIVE = new Set(); let speedIx = 2; // speed is shared by every flow on the page
  const W = 1200, X = { tok: 20, id: 140, emb: 215, plus: 392, pos: 410, eq: 588, inp: 605, mat: 1000 };
  // inside a block: into → + notes (the interviews) → + facts (the fact checker) → = after, each a real 768-number vector
  const XB = { in: 130, pN: 332, notes: 350, pF: 494, facts: 512, eq: 656, out: 674, meter: 822 }, SB = 130, SBS = SB / 170, ARC = 5;
  const p98 = VZ.p98;
  // attention arcs and score lines share the app's colors: dark green (most) → light green → yellow → pink → red (least)
  const LINECOL = VZ.LINECOL, shareCol = VZ.shareCol;
  let flowDataP = null; const flowData = () => flowDataP || (flowDataP = new Promise((res) => { if (window.FLOW_DATA) return res(window.FLOW_DATA); const sc = document.createElement('script'); sc.src = './data/flow-data.js'; sc.onload = () => res(window.FLOW_DATA); sc.onerror = () => res(null); document.head.appendChild(sc); }));
  const STRIPW = 170;
  const SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3];
  const STAGES = [
    { id: 'sent', title: 'The sentence', base: 1800 },
    { id: 'split', title: 'Split into tokens', base: 1800 },
    { id: 'col', title: 'One row per token', base: 2000 },
    { id: 'ids', title: 'Token IDs', base: 1600 },
    { id: 'emb', title: 'Embedding rows', base: 2800 },
    { id: 'pos', title: 'Position rows', base: 2400 },
    { id: 'inp', title: 'Input vectors', base: 2000 },
    { id: 'attn', title: 'Block 1: the investigations', base: 3200 },
    { id: 'sup', title: 'Block 1: the lead detective', base: 1800 },
    { id: 'fact', title: 'Block 1: the forensics expert', base: 2000 },
    { id: 'out1', title: 'After block 1', base: 2000 },
    { id: 'loop', title: 'Blocks 2 to 12', base: 2000 }, // per block: interviews → supervisor → fact checker → new column
    { id: 'final', title: 'The output vector', base: 1800 },
    { id: 'vocab', title: 'Score every token', base: 2600 },
    { id: 'rank', title: 'Next-token ranking', base: 2600 },
    { id: 'spin', title: 'Selection: spin', base: 3400 },
    { id: 'add', title: 'Add the token, repeat', base: 3400 },
    // Pre-Training: the same scene, run backwards (only shown when a flow is given opts.learn)
    { id: 'truth', title: 'The right answer', base: 2400 },
    { id: 'loss', title: 'How far off', base: 2600 },
    { id: 'back', title: 'Trace it back', base: 900 }, // per block, 12 down to 0 (0 = the ID cards and position rows)
    { id: 'after', title: 'After the nudge', base: 2600 },
  ];
  const SI = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
  // the four chapters of a pass, named after the tabs that zoom into them
  const CHAP = [['Input', 0, 6], ['Transformer', 7, 11], ['Output', 12, 15], ['Repeat', 16, 16], ['Pre-Training', 17, 20]];
  const ICO = () => (NT.uc && NT.uc.ICON) || { ask: '❓', sup: '✍️', fact: '📚', note: '📝' };

  // ---------- one flow, mounted in a host element ----------
  // opts: main (the Whole Process tab), loop (adding the token starts the next pass), from/to (stage ids: the slice shown),
  //       startAt (stage index), text (function → the sentence to use; default: the shared sentence), pick ({r, T, K}: replay a pick),
  //       controls ('todo' = the What to do bar, 'own' = a small bar in the panel), more (label + fn for the end-of-slice link),
  //       viewX / viewW / cropBottom / maxScale (show a window of the scene), note (a line under the caption)
  function create(host, opts = {}) {
    const P = opts.main ? '' : 'f' + (++SEQ) + '_';
    const E = (id) => document.getElementById(P + id);
    const FROM = SI[opts.from || 'sent'], TO = SI[opts.to || 'add'], DB = opts.detailBlock || 1, B2 = Math.min(12, DB + 1); // DB: the block shown in detail
    const F = { pass: 1, stage: FROM, block: 2, playing: false, timer: null, busy: false, ours: false, data: null, r: null, hit: -1 };
    const eff = () => SPEEDS[speedIx] * (opts.speedMul || 1) * Math.pow(1.2, Math.min(F.pass - 1, 4));
    const ms = (base) => Math.round(base / eff());
    const PK = () => (typeof opts.pick === 'function' ? opts.pick() : opts.pick) || null; // a pick to replay: { r, T, K }
    const TT = () => (PK() ? PK().T : S.T), KK = () => (PK() ? PK().K : S.K);
    const curNow = () => (opts.text ? NT.curFor(opts.text()) : NT.current());
    const alive = () => host.isConnected && (!opts.main || S.station === 'flow');
    let G = null; // geometry for the current pass
    const NPOS = () => Math.max(G.T + 4, 24); // position rows shown (zoomed in)
    const matH = () => G.H - G.top - 70;
    const embY = (id) => G.top + (id / 50257) * matH(); // the matrix canvases start at G.top
    const posY = (i) => G.top + ((i + 0.5) / NPOS()) * matH();
    // ---------- data for the current sentence ----------
    async function loadData() {
      const cur = curNow(), ex = cur.ex, T = cur.ids.length, D = window.CTX_DATA || (NT.ctxData ? await NT.ctxData().catch(() => null) : null);
      const E = D && D.stack[cur.key];
      const tok = []; for (let i = 0; i < T; i++) tok.push(ex && ex.tok ? ex.tok.slice(i * 768, i * 768 + 768) : await NT.row(cur.ids[i]).catch(() => new Float32Array(768)));
      const pos = cur.ids.map((_, i) => NT.posRow(i));
      let att = null; if (TO >= SI.attn) try { att = ex && ex.attn ? ex : await Promise.race([NT.attnFor(cur), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), NT.live.ready() ? 60000 : 50))]); } catch (e) { att = null; }
      let d = null; if (TO >= SI.vocab || TO >= SI.attn) try { d = NT.hasFull(cur.ids) ? await NT.dist(cur.ids) : NT.live.ready() ? await NT.dist(cur.ids) : NT.partialDist(cur.ids); } catch (e) { d = null; }
      const b64i8 = (s) => { const u = NT.b64(s); return new Int8Array(u.buffer, u.byteOffset, u.byteLength); };
      let vec = null; if (E && E.vec && E.toks.length === T) { const v = E._v || (E._v = b64i8(E.vec)); vec = (b, i) => { const o = (b * T + i) * 768, a = new Float32Array(768); for (let e = 0; e < 768; e++) a[e] = v[o + e] * 3 / 127; return a; }; }
      const lastVec = E && E.lnf ? (b) => Float32Array.from(E.lnf[b]) : null;
      // real vectors inside every block (the stored stories): h = a card after block b (0 = the input vector), a = the interviews' notes, m = the fact checker's additions
      let fv = null; if (TO >= SI.attn) { const FD = await flowData(), X8 = FD && FD[cur.key]; if (X8 && X8.T === T) { const dec = (k) => X8['_' + k] || (X8['_' + k] = b64i8(X8[k])); fv = (kind, b, i) => { const q = dec(kind), sc = X8[kind + 's'][b * T + i], o = (b * T + i) * 768, a = new Float32Array(768); for (let e = 0; e < 768; e++) a[e] = q[o + e] / 127 * sc; return a; }; } }
      return { cur, T, ex, tok, pos, att, d, vec, lastVec, fv, lens: E ? E.lens : null, lg: E ? E.lg : null, final: ex && ex.final ? ex.final : null, words: cur.tokens.map((t) => t.replace(/\n/g, '⏎').trim() || '·'), raw: cur.tokens.map((t) => t.replace(/\n/g, '⏎')) };
    }

    // ---------- the scene ----------
    const rowY = (i) => G.top + i * G.ROW;
    function buildScene() {
      const Dt = F.data, T = Dt.T;
      const ROW = T <= 13 ? 28 : T <= 18 ? 23 : T <= 26 ? 17 : 13;
      const top = 104, H = Math.max(top + (T + 1) * ROW + 62, 530);
      G = { ROW, top, H, T };
      // sentence layout: each token keeps its own leading space, so a divider goes before the space, where GPT-2 cuts
      const cv = document.createElement('canvas').getContext('2d'); let fs = 26; cv.font = `${fs}px Georgia`;
      const meas = () => Dt.raw.map((w) => cv.measureText(w).width);
      let widths = meas(), total = widths.reduce((a, b) => a + b, 0) + T * 8;
      if (total > W - 60) { const k = (W - 60) / total; fs = Math.max(11, Math.floor(fs * k)); cv.font = `${fs}px Georgia`; widths = meas(); }
      let x = 30; G.sx = widths.map((w) => { const a = x; x += w + 8; return a; }); G.sw = widths; G.fs = fs;
      G.text = Dt.cur.tokens.join('').replace(/\n/g, ' '); G.textW = cv.measureText(G.text).width; G.colScale = Math.min(1, 17 / fs) * (ROW < 24 ? 0.8 : 1);
      const stripH = Math.max(6, ROW - 10);
      let h = `<div class="fl-scene" id="flScene" style="width:${W}px;height:${H}px">`;
      h += `<svg class="fl-svg" id="flSvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"></svg>`;
      const heads = [['tok', X.tok, 'Token'], ['id', X.id, 'Token ID'], ['emb', X.emb, 'Embedding vector'], ['pos', X.pos, 'Position vector'], ['inp', X.inp, 'Input vector'], ['bin', XB.in, `Into block ${DB}`], ['notes', XB.notes, '+ <span class="cv">Notes</span> <small>(attention)</small>'], ['facts', XB.facts, '+ <span class="cm">Patterns</span> <small>(MLP)</small>'], ['bout', XB.out, `= After block ${DB}`]];
      heads.forEach(([k, hx, t]) => (h += `<div class="fl-h" id="fh-${k}" style="left:${hx}px;top:${top - 34}px">${t}</div>`));
      const sp = (w) => esc(w).replace(/^ /, '<span class="sp">·</span>');
      for (let i = 0; i < T; i++) {
        { const TM = NT.tokMarks(Dt.raw.map((w) => w.trim())), sup = TM.label[i].slice(Dt.raw[i].trim().length); h += `<div class="fl-tok${i === T - 1 ? ' last' : ''}" id="ft${i}" style="font-size:${fs}px;--c:${TM.col[i]}">${sp(Dt.raw[i])}${sup ? `<span class="tsup">${sup}</span>` : ''}</div>`; }
        if (i) h += `<div class="fl-div" id="fd${i}" style="left:${G.sx[i] - 4}px;top:${10}px;height:${fs + 10}px"></div>`;
        h += `<div class="fl-id" id="fi${i}">${Dt.cur.ids[i]}</div>`;
        ['fe', 'fp', 'fn', 'fa', 'fm', 'fo'].forEach((c) => (h += `<canvas class="fl-strip" id="${c}${i}" style="width:${STRIPW}px;height:${stripH}px"></canvas>`));
        h += `<div class="fl-op" id="fpl${i}">+</div><div class="fl-op" id="feq${i}">=</div><div class="fl-op" id="fpa${i}">+</div><div class="fl-op" id="fpm${i}">+</div><div class="fl-op" id="fsu${i}">=</div>`;
      }
      h += `<div class="fl-q" id="fQ">?</div><div class="fl-akey" id="fAKey">${VZ.arcKeyHTML()}</div>`;
      const mat = (id, title, sub) => `<div class="fl-mat" id="${id}"><div class="fl-mtitle">${title}</div><canvas id="${id}c"></canvas><div class="fl-ml"><small>${sub}</small></div></div>`;
      h += mat('fmE', 'Embedding matrix', '50,257 rows, one per token') + mat('fmP', 'Position matrix', `zoomed in: the first ${NPOS()} of its 1,024 rows`) + mat('fmV', 'Token vocab matrix', 'every token’s embedding row (its ID card): 50,257 rows');
      const I = ICO();
      h += `<div class="fl-block" id="fBlock"><span id="fBlockT">Block ${DB}</span><span class="fl-bsteps"><i id="fbs0" class="bh">${I.ask} investigations</i><i id="fbs1" class="bv">${I.sup} lead</i><i id="fbs2" class="bm">${I.fact} forensics</i></span><span class="fl-b12" id="fB12">${Array.from({ length: 12 }, (_, b) => `<i data-b="${b + 1}"></i>`).join('')}</span></div>`;
      h += `<div class="fl-meter" id="fMeter"></div><canvas class="fl-strip" id="fMv" style="width:${STRIPW}px;height:${stripH}px"></canvas><div class="fl-table" id="fTable"></div><div class="fl-spin" id="fSpin"></div><div class="fl-fly" id="fFly"></div><div class="fl-ghost" id="fGhost"></div><div class="fl-loss" id="fLoss"></div><div class="fl-nudge" id="fNudge"></div>`;
      h += `</div>`;
      return h.replace(/ id="/g, ' id="' + P);
    }
    // the matrices: the embedding and vocab matrices are 50,257 rows (decorative stripes, with the needed rows drawn for real at their real places);
    // the position matrix is zoomed in on its first rows and drawn entirely from GPT-2's real numbers
    const paintRow = (x, y, h, vals, m) => { const img = x.createImageData(120, 1); for (let k = 0; k < 120; k++) { let sum = 0; const a = Math.floor(k * 6.4), b = Math.floor((k + 1) * 6.4); for (let e = a; e < b; e++) sum += vals[e]; const [r, g, bb] = NT.div(sum / (b - a) / m); img.data.set([r, g, bb, 255], k * 4); } for (let yy = 0; yy < h; yy++) x.putImageData(img, 0, Math.round(y) + yy); };
    const mat = (id, rows, lit, band) => { const c = E(id); if (!c) return; const h = matH(); c.width = 120; c.height = Math.max(60, Math.round(h)); const x = c.getContext('2d'); let seed = rows; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      const step = band ? c.height / band : 2;
      if (band) { for (let r = 0; r < band; r++) paintRow(x, r * step, Math.max(1, Math.round(step) - 1), NT.posRow(r), F.data.scaleIn); }
      else for (let y = 0; y < c.height; y += step) for (let k = 0; k < 120; k += 3) { const v = (rnd() - 0.5) * 1.6; const [r, g, b] = NT.div(v); x.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},.45)`; x.fillRect(k, Math.round(y), 3, 1); }
      lit.forEach(([yy, vals]) => { if (band) { x.strokeStyle = '#5b38d1'; x.lineWidth = 2; x.strokeRect(1, Math.round(yy * c.height - step / 2) + 0.5, 118, Math.max(3, step - 1)); } else { if (vals) paintRow(x, yy * c.height - 2, 4, vals, F.data.scaleIn); x.strokeStyle = '#5b38d1'; x.lineWidth = 1; x.strokeRect(0.5, Math.round(yy * c.height) - 2.5, 119, 5); } }); };
    function paintStatic() {
      const Dt = F.data, T = Dt.T;
      // one color scale for every embedding row, position row and input vector, so the colors visibly add up
      { const all = [...Dt.tok.map(p98), ...Dt.pos.map(p98)].sort((x, y) => x - y); Dt.scaleIn = all[Math.floor(all.length / 2)]; } // the median row size: big values saturate, small ones stay visible
      for (let i = 0; i < T; i++) {
        NT.drawStrip(E('fe' + i), Dt.tok[i], Dt.scaleIn); NT.drawStrip(E('fp' + i), Dt.pos[i], Dt.scaleIn);
        NT.drawStrip(E('fn' + i), Float32Array.from(Dt.tok[i], (v, k) => v + Dt.pos[i][k]), Dt.scaleIn);
      }
      mat('fmEc', 50257, F.data.cur.ids.map((id, i) => [id / 50257, Dt.tok[i]]));
      mat('fmPc', 1024, F.data.cur.ids.map((_, i) => [(i + 0.5) / NPOS(), null]), NPOS());
      mat('fmVc', 777, scoreRows().map((r) => [r.id / 50257, null]));
    }
    const blockOut = (b, i) => { const Dt = F.data; if (Dt.fv) return Dt.fv('h', b, i); if (Dt.vec) return Dt.vec(b, i); if (i === Dt.T - 1 && Dt.lastVec) return Dt.lastVec(b); return null; };
    // the output vector: the last token's card after block 12, rescaled once more by GPT-2's final layer norm. That rescaled vector is the one
    // scored against every embedding row, so it is drawn from step 13 (The output vector) on. (Oct 15: before, the unrescaled card was shown.)
    const outVec = () => { const Dt = F.data; return Dt.final ? Dt.final : blockOut(12, Dt.T - 1); };
    const paintOut = () => { const Dt = F.data, v = outVec(), el = E('fo' + (Dt.T - 1)); if (el) { if (v) drawG(el, v, p98(v)); else grayStrip(el); } };
    function paintBlock(b) { // block b: into = the card after block b-1, + notes + facts = the card after block b (real numbers, one color scale per row)
      const Dt = F.data;
      for (let i = 0; i < Dt.T; i++) {
        const vin = b === 1 ? Float32Array.from(Dt.tok[i], (v, k) => v + Dt.pos[i][k]) : blockOut(b - 1, i), vout = blockOut(b, i);
        const va = Dt.fv ? Dt.fv('a', b - 1, i) : null, vm = Dt.fv ? Dt.fv('m', b - 1, i) : null;
        // one color scale for all four vectors in a row, so after = into + notes + facts is honest; colors are stretched (square root) so small numbers still show
        const m = Math.max(vin ? p98(vin) : 0, vout ? p98(vout) : 0) || 1; F.rowM = F.rowM || []; F.rowM[i] = m;
        [['fn', vin], ['fa', va, 'v'], ['fm', vm, 'm'], ['fo', vout]].forEach(([c, v, kind]) => { const el = E(c + i); if (!v) grayStrip(el); else if (kind) VZ.role(el, v, kind, m); else drawG(el, v, m); }); // notes purple (made from Values), patterns teal (MLP)
      }
      const fh = E('fh-bout'); if (fh) fh.textContent = `= After block ${b}`; const bi = E('fh-bin'); if (bi) bi.textContent = `Into block ${b}`;
      const bt = E('fBlockT'); if (bt) bt.textContent = `Block ${b}`;
    }
    const drawG = VZ.vec, grayStrip = VZ.gray;

    // where every element sits at stage k (sub = block number for the loop). part: in the loop, how far the block has got (0 interviews … 3 done)
    function layout(k, sub, part = 5, slide = false) {
      const Dt = F.data, T = Dt.T, L = {}, cs = G.colScale, last = T - 1, sy = 14;
      const set = (id, o) => (L[id] = Object.assign({ x: 0, y: 0, s: 1, o: 1 }, o));
      const inBlock = k >= SI.attn && k < SI.final, ins = k >= SI.attn && k <= SI.final;
      // how far through the block are we? (block 1 in detail: one step each; the loop: all four, in step with the pulses)
      const stepIn = k === SI.attn ? 0 : k === SI.sup ? 1 : k === SI.fact ? 2 : k === SI.loop ? Math.min(3, part - 1) : 3;
      for (let i = 0; i < T; i++) {
        const inSent = k <= 1, faded = k >= SI.final && i !== last, y = rowY(i);
        set('ft' + i, inSent ? { x: G.sx[i], y: sy } : { x: X.tok, y: y - 4, s: cs, o: faded ? 0.4 : 1 });
        if (i) set('fd' + i, { o: k === 1 ? 1 : 0 });
        set('fi' + i, { x: X.id, y, o: k >= SI.ids && k < SI.attn ? 1 : 0 });
        const matE = { x: X.mat + 20, y: embY(Dt.cur.ids[i]), o: 1 }, matP = { x: X.mat + 20, y: posY(i) - 6, o: 1 };
        set('fe' + i, k < SI.emb ? Object.assign({}, matE, { o: 0 }) : k < SI.attn ? { x: X.emb, y, from: k === SI.emb ? matE : null } : { x: X.emb, y, o: 0 });
        set('fp' + i, k < SI.pos ? Object.assign({}, matP, { o: 0 }) : k < SI.attn ? { x: X.pos, y, from: k === SI.pos ? matP : null } : { x: X.pos, y, o: 0 });
        set('fpl' + i, { x: X.plus, y: y - 6, o: k >= SI.pos && k < SI.attn ? 1 : 0 });
        set('feq' + i, { x: X.eq - 4, y: y - 6, o: k >= SI.inp && k < SI.attn ? 1 : 0 });
        // into the block: the input vectors slide left; in the loop, the last block's output slides back in (the sketch's 12× loop)
        set('fn' + i, k < SI.inp ? { x: X.inp, y, o: 0 } : k < SI.attn ? { x: X.inp, y } : inBlock ? { x: XB.in, y, s: SBS, from: slide === true ? (k === SI.loop ? { x: XB.out, y, s: SBS } : { x: X.inp, y }) : null } : { x: XB.in, y, s: SBS, o: 0 });
        set('fpa' + i, { x: XB.pN, y: y - 6, o: inBlock && stepIn >= 1 ? 1 : 0 });
        set('fa' + i, { x: XB.notes, y, s: SBS, o: inBlock && stepIn >= 1 ? 1 : 0 });
        set('fpm' + i, { x: XB.pF, y: y - 6, o: inBlock && stepIn >= 2 ? 1 : 0 });
        set('fm' + i, { x: XB.facts, y, s: SBS, o: inBlock && stepIn >= 2 ? 1 : 0 });
        set('fsu' + i, { x: XB.eq - 2, y: y - 6, o: inBlock && stepIn >= 3 ? 1 : 0 });
        set('fo' + i, k < SI.out1 ? { x: XB.out, y, s: SBS, o: 0 } : inBlock ? { x: XB.out, y, s: SBS, o: stepIn >= 3 ? 1 : 0 } : k === SI.final ? { x: XB.out, y, s: SBS, o: i === last ? 1 : 0.45 } : k === SI.vocab && i === last ? { x: 560, y: G.top + 120, s: 1.6 } : { x: XB.out, y, s: SBS, o: 0 });
      }
      set('fh-tok', { o: k >= SI.col ? 1 : 0 }); set('fh-id', { o: k >= SI.ids && k < SI.attn ? 1 : 0 });
      set('fh-emb', { o: k >= SI.emb && k < SI.attn ? 1 : 0 }); set('fh-pos', { o: k >= SI.pos && k < SI.attn ? 1 : 0 }); set('fh-inp', { o: k >= SI.inp && k < SI.attn ? 1 : 0 });
      set('fh-bin', { o: inBlock ? 1 : 0 }); set('fh-notes', { o: inBlock && stepIn >= 1 ? 1 : 0 }); set('fh-facts', { o: inBlock && stepIn >= 2 ? 1 : 0 }); set('fh-bout', { o: (inBlock && stepIn >= 3) || k === SI.final ? 1 : 0 });
            set('fmE', { x: X.mat, y: G.top, o: k === SI.ids || k === SI.emb ? 1 : 0 }); set('fmP', { x: X.mat, y: G.top, o: k === SI.pos ? 1 : 0 }); set('fmV', { x: 900, y: G.top, o: k === SI.vocab ? 1 : 0 });
      set('fBlock', { x: XB.in, y: G.top - 74, o: inBlock ? 1 : 0 });
      const mOn = (k >= SI.out1 && k <= SI.final) && (k !== SI.loop || part >= 5); G.mY = rowY(0) - 10;
      set('fMeter', { x: XB.meter, y: G.mY, o: mOn ? 1 : 0 });
      const onRow = { x: XB.out, y: rowY(last), s: SBS };
      set('fMv', !mOn ? Object.assign({}, onRow, { o: 0 }) : slide === 'hold' ? onRow : { x: XB.meter + 12, y: G.mY + 30, s: 346 / STRIPW, from: slide === 'mv' ? onRow : null });
      E('fAKey').style.transform = `translate(${X.tok + 52}px,${rowY(T) - 2}px)`; // its opacity is set where the arcs are drawn
      set('fTable', { x: 560, y: G.top - 30, o: k >= SI.rank ? 1 : 0 });
      set('fSpin', { x: 150, y: G.top - 40, o: k >= SI.spin ? 1 : 0 });
      set('fQ', { x: X.tok, y: rowY(T) - 4, s: cs, o: k >= SI.col && k <= SI.spin ? 1 : 0 }); // the row GPT-2 is working out, all the way through
      set('fFly', { o: 0 }); set('fGhost', { o: 0 });
      return L;
    }
    function apply(L, dur) {
      Object.entries(L).forEach(([id, p]) => {
        const el = E(id); if (!el) return;
        const put = (q, d) => { el.style.transition = d ? `transform ${d}ms cubic-bezier(.45,.05,.25,1), opacity ${Math.round(d * 0.7)}ms` : 'none'; el.style.transform = `translate(${q.x}px,${q.y}px) scale(${q.s == null ? 1 : q.s})`; el.style.opacity = q.o == null ? 1 : q.o; };
        if (p.from && dur) { put(p.from, 0); void el.offsetWidth; requestAnimationFrame(() => put(p, dur)); } else put(p, dur);
      });
    }

    // ---------- overlays drawn on the SVG for some stages ----------
    const svg = () => E('flSvg');
    // a few labelled rows of the output matrix: the top three plus two ordinary words, with their real scores and ranks
    function scoreRows() {
      const d = F.data && F.data.d; if (!d) return [];
      if (d.partial) return d.ids.slice(0, 5).map((id, i) => ({ id, logit: d.logits[i], rank: i + 1 }));
      const out = [0, 1, 2].map((i) => ({ id: d.order[i], logit: d.logits[d.order[i]], rank: i + 1 }));
      const extra = [' banana', ' the', ' piano', ' quickly'].map((t) => NT.tokenIdOf(t)).filter((id) => id >= 0 && !out.some((o) => o.id === id)).slice(0, 2);
      extra.forEach((id) => { let r = 0; for (; r < d.order.length; r++) if (d.order[r] === id) break; out.push({ id, logit: d.logits[id], rank: r + 1 }); });
      (opts.extraIds ? opts.extraIds() : []).forEach((id) => { if (id >= 0 && !out.some((o) => o.id === id)) { let r = 0; for (; r < d.order.length; r++) if (d.order[r] === id) break; out.push({ id, logit: d.logits[id], rank: r + 1, extra: true }); } });
      return out.sort((a, b) => a.id - b.id);
    }
    function lines(k, sub, arcs = true) {
      const s = svg(); if (!s) return; let g = ''; if (!arcs) F.arcKey = null; // the arcs will be drawn (animated) again
      const Dt = F.data, T = Dt.T, last = T - 1, lastW = `“${esc(Dt.words[last])}”`;
      if (k === SI.emb || k === SI.pos) { // the crossing lines from the matrix rows to the column, like the sketch (they start at the matrix's left edge)
        for (let i = 0; i < T; i++) { const y0 = k === SI.emb ? embY(Dt.cur.ids[i]) : posY(i), y1 = rowY(i) + 8, x1 = (k === SI.emb ? X.emb : X.pos) + STRIPW + 4, x0 = X.mat - 2; g += `<path d="M${x0} ${y0} C ${x0 - 130} ${y0}, ${x1 + 120} ${y1}, ${x1} ${y1}" fill="none" stroke="#5b38d1" stroke-width="1.4" opacity=".6" class="fl-draw"/>`; }
      }
      if (k === SI.pos) for (let i = 0; i < T; i++) g += `<text x="${X.mat + 126}" y="${posY(i) + 4}" font-size="11" font-weight="700" fill="#5b38d1">${i + 1}</text>`; // numbered position rows, as in the sketch
      const arcStage = k === SI.attn || k === SI.loop || k === SI.sup || k === SI.fact || k === SI.out1;
      { const ak = E('fAKey'); if (ak) { ak.style.transition = 'opacity .3s'; ak.style.opacity = arcStage && Dt.att && arcs ? 1 : 0; } }
      if (arcStage && Dt.att && arcs) { const akey = (k === SI.loop ? 'L' + sub : 'B' + DB), drawn = F.arcKey === akey; F.arcKey = akey; // attention arcs, colored and sized by share (the first token's resting share left out, as in Use Context)
        const b = k === SI.loop ? sub - 1 : DB - 1, xr = XB.in + SB + 4, per = ARC;
        for (let q = 1; q < T; q++) {
          if (k === SI.loop && q !== last) continue; // blocks 2–12: only the last token's arcs
          const w = []; for (let j = 1; j <= q; j++) w.push(NT.attnAvg(Dt.att, b, q, j)); const sum = w.reduce((a, c) => a + c, 0) || 1;
          w.forEach((v, jj) => { const j = jj + 1, p = v / sum; if (j === q || p < (q === last ? 0.005 : 0.18)) return; const y0 = rowY(q) + G.ROW / 2 - 6, y1 = rowY(j) + G.ROW / 2 - 6, bulge = 30 + (q - j) * per;
            g += `<path d="M${xr} ${y0} C ${xr + bulge} ${y0}, ${xr + bulge} ${y1}, ${xr} ${y1}" fill="none" stroke="${shareCol(p)}" stroke-width="${(1 + p * 16).toFixed(1)}" opacity="${q === last ? 0.9 : 0.35}"${drawn ? '' : ' class="fl-draw"'}/>`;
          });
          if (q === last && k === SI.attn) {
            const lx = Math.round(xr + 0.75 * (30 + (last - 1) * per) + 14), rest = NT.attnAvg(Dt.att, b, q, 0);
            w.map((v, jj) => [v / sum, jj + 1]).filter(([, j]) => j !== q).sort((a, c) => c[0] - a[0]).slice(0, 4).forEach(([p, j], n) => { g += `<text x="${lx}" y="${rowY(j) + G.ROW / 2 - 2}" font-size="13" font-weight="700" fill="#33455a">← ${Math.round(p * 100)}%${n === 0 ? ` of ${lastW}’s attention` : ''}</text>`; });
            g += `<text x="${lx}" y="${rowY(0) + G.ROW / 2 - 2}" font-size="12" fill="#687386">resting spot: ${Math.round(rest * 100)}% (left out of the %)</text>`;
          }
        }
      }
      if (k === SI.out1 || k === SI.loop) { // the 12× loop from the sketch: what comes out of a block goes back in, 12 times
        const yb = rowY(T - 1) + G.ROW + 4, xa = XB.out + SB / 2, xb = XB.in + SB - 6, bk = k === SI.loop ? sub : DB;
        g += `<path d="M${xa} ${yb - 8} C ${xa} ${yb + 30}, ${xb} ${yb + 30}, ${xb} ${yb - 6}" fill="none" stroke="#5b38d1" stroke-width="2.5" marker-end="url(#${P}loop)"/><text x="${(xa + xb) / 2}" y="${yb + 42}" text-anchor="middle" font-size="13" font-weight="800" fill="#4528b3">12× · this is block ${bk}</text>`;
      }
      // the "?" row: the meter (during the blocks) and the ranking table (at the end) are both answers to it
      const qx = X.tok + 34, qy = rowY(T) + 6;
      if (((k >= SI.out1 && k <= SI.final) && (k !== SI.loop || arcs === 'all'))) { const mx = XB.meter + 186, mb = G.mY + T * G.ROW + 14, yl = G.H - 8; g += `<path d="M${qx - 16} ${qy + 18} C ${qx - 16} ${yl}, ${qx - 16} ${yl}, ${qx + 20} ${yl} L ${mx - 20} ${yl} C ${mx} ${yl}, ${mx} ${yl}, ${mx} ${mb + 4}" fill="none" stroke="#5b38d1" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#${P}loop)" opacity=".8"/>`; }
      if (k === SI.vocab) { // the output vector against every row of the vocab matrix; lines colored by the score's rank, thicker for higher scores
        const fx = 560 + STRIPW * 1.6 + 8, fy = G.top + 128, rows = scoreRows(), mh = matH();
        for (let r = 0; r < 9; r++) { const ty = G.top + 10 + r * ((mh - 20) / 8); g += `<path d="M${fx} ${fy} L${898} ${ty}" stroke="#c6cdd8" stroke-width="1" stroke-dasharray="3 4" class="fl-draw"/>`; }
        const hi = rows.length ? Math.max(...rows.map((o) => o.logit)) : 0;
        let prev = -1e9; // labels pushed apart so rows that sit close together in the matrix stay readable
        rows.forEach((o, n) => { const ty = embY(o.id), ly = Math.max(ty, prev + 36), col = LINECOL[NT.rankBand(o.rank, NT.ALL)]; prev = ly;
          const wdt = Math.max(1, 5 - (hi - o.logit) * 0.8);
          g += `<path d="M${fx} ${fy} L${898} ${ty}" stroke="${col}" stroke-width="${wdt.toFixed(1)}" class="fl-draw"/>`;
          g += `<g class="fl-pop" style="animation-delay:${600 + n * 180}ms"><path d="M1022 ${ty} L1034 ${ly}" stroke="#8a93a3" fill="none"/><text x="1038" y="${ly + 4}" font-size="14" font-weight="800" fill="#1d2634"><tspan font-family="ui-monospace,Menlo,monospace">${o.id}</tspan> <tspan font-family="Georgia" font-weight="400" fill="${o.extra ? '#c2185b' : '#33455a'}">(${esc(NT.tokText(o.id).trim())})</tspan></text><text x="1038" y="${ly + 19}" font-size="11.5" fill="#687386">score ${o.logit.toFixed(1)} · rank #${NT.int(o.rank)}</text></g>`; });
      }
      if (k === SI.final) { const sh = Math.max(6, G.ROW - 10); g += `<rect x="${XB.out - 4}" y="${rowY(last) - 4}" width="${SB + 8}" height="${sh * SBS + 8}" rx="4" fill="none" stroke="#5b38d1" stroke-width="2"/><rect x="${XB.meter + 8}" y="${G.mY + 26}" width="354" height="${sh * 346 / STRIPW + 8}" rx="5" fill="none" stroke="#5b38d1" stroke-width="2"/>`; }
      if (k === SI.rank || k === SI.spin) { // the "?" row: the table on the right decides what goes here
        const yq = rowY(T) + 8, bx = 548, { by0, by1 } = braceGeom();
        g += `<path id="${P}fBrace" d="${braceD(bx, by0, by1)}" fill="none" stroke="#5b38d1" stroke-width="2.5"/>`;
        if (k === SI.rank) g += `<path id="${P}fBraceArr" d="M${X.tok + 34} ${yq} C 300 ${yq}, 420 ${(by0 + by1) / 2}, ${bx - 12} ${(by0 + by1) / 2}" fill="none" stroke="#5b38d1" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#${P}loop)"/><text x="${X.tok + 34}" y="${yq + 26}" font-size="13" font-weight="700" fill="#4528b3">which token goes here?</text>`;
      }
      s.innerHTML = `<defs><marker id="${P}loop" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#5b38d1"/></marker></defs>` + g;
    }
    // ---------- the meter, the table and the spinner ----------
    function meter(b, fin12 = b === 12) { // what GPT-2 would pick if it stopped after block b: the same look as the ranking table at the end
      const Dt = F.data, m = E('fMeter'); if (!m) return;
      const hgt = Dt.T * G.ROW + 14; m.style.height = hgt + 'px';
      if (!Dt.lg) { m.innerHTML = `<div class="fl-mt">If GPT-2 stopped after block ${b}…</div><div class="fl-mvslot"></div><div class="muted" style="font-size:12px">(GPT-2’s scores after each block are stored for the stories in the dropdown)</div>`; return; }
      const L = Dt.lg[b], pmap = new Map((Dt.lens ? Dt.lens[b] : []).map(([id, p]) => [id, p])), p0 = pmap.get(L[0][0]) || 1, fin = Dt.lens ? Dt.lens[12][0][0] : null, k = fin != null ? Dt.lens[b].findIndex(([id]) => id === fin) : -1;
      const rowH = Math.max(13, Math.floor((hgt - 130) / 11)), fs = Math.min(12.5, Math.max(10, rowH * 0.52));
      m.innerHTML = `<div class="fl-tt">${fin12 ? 'The output vector from the final block…' : `If GPT-2 stopped after block ${b}, this vector for “${esc(Dt.words[Dt.T - 1])}”…`}</div><div class="fl-mvslot"></div><div class="fl-tt">${fin12 ? '…ranks these tokens for the “?” row:' : '…would rank these tokens for the “?” row:'}</div>
        <table class="gt fl-mtab" style="font-size:${fs}px"><tr><th>#</th><th>Token ID</th><th>Token</th><th>Logit</th><th>Probability</th></tr>${L.map(([id, l], i) => { const p = pmap.get(id) || 0, bd = NT.BANDS[NT.rankBand(i + 1, NT.ALL)]; return `<tr style="height:${rowH}px"${id === fin ? ' class="fin"' : ''}><td>${i + 1}</td><td class="tid">${id}</td><td class="w">${NT.show(NT.tokText(id))}</td><td>${l.toFixed(1)}</td><td><span class="mbar"><i style="width:${(100 * p / p0).toFixed(0)}%;background:${bd.bg}"></i></span> ${cp(p)}</td></tr>`; }).join('')}</table>
        ${fin != null ? `<div class="fl-mr">“${esc(NT.tokText(fin).trim())}”, GPT-2’s final #1: ${k < 0 ? 'below #50' : '<b>#' + (k + 1) + '</b>'} here</div>` : ''}`;
      const v = fin12 ? outVec() : blockOut(b, Dt.T - 1), c = E('fMv'); if (c) { if (v) drawG(c, v, fin12 ? p98(v) : (F.rowM && F.rowM[Dt.T - 1]) || p98(v)); else grayStrip(c); }
    }
    function probs() { if (!F.data) return null; const d = F.data.d; if (!d) return null; return NT.probs(d, TT(), KK()); }
    function table(showHit) {
      const t = E('fTable'), pr = probs(); if (!t) return;
      if (!pr) { t.innerHTML = '<div class="panel emptynote">GPT-2’s scores for this sentence need GPT-2 loaded.</div>'; braceFit(); return; }
      t.innerHTML = `<div class="fl-tt">The output vector from the final block…</div><canvas class="fl-strip fl-tvec" id="${P}fTv"></canvas><div class="fl-tt">Next-token ranking · Temperature ${TT() <= 1 ? TT().toFixed(1) : TT()} · Top-K ${NT.kLabel(KK())}${F.autoK && KK() === 10 ? ' <span class="muted">(set to 10 so the wheel is readable; change it at the top)</span>' : ''}</div>${VZ.rankTable(pr, KK(), { hit: showHit ? F.hit : -1 })}`;
      { const v = outVec(), c = E('fTv'); if (c) { if (v) drawG(c, v, p98(v)); else grayStrip(c); } }
      braceFit();
    }
    // the "{" beside the ranking table spans the whole card (output vector + title + rows), whatever its height
    function braceGeom() { const t = E('fTable'), h = t ? t.offsetHeight : 0; return { by0: G.top - 26, by1: h > 80 ? G.top - 34 + h : G.top + 330 }; }
    const braceD = (bx, by0, by1) => `M${bx + 8} ${by0} q -8 0 -8 10 v ${(by1 - by0) / 2 - 18} q 0 8 -8 8 q 8 0 8 8 v ${(by1 - by0) / 2 - 18} q 0 10 8 10`;
    function braceFit() {
      if (!G || !(F.stage === SI.rank || F.stage === SI.spin)) return;
      const { by0, by1 } = braceGeom(), br = E('fBrace'), ar = E('fBraceArr'); if (br) br.setAttribute('d', braceD(548, by0, by1));
      if (ar) { const yq = rowY(G.T) + 8; ar.setAttribute('d', `M${X.tok + 34} ${yq} C 300 ${yq}, 420 ${(by0 + by1) / 2}, ${548 - 12} ${(by0 + by1) / 2}`); }
    }
    function spinner(spin) {
      const pr = probs();
      VZ.wheel(E('fSpin'), { pr, K: KK(), r: F.r, hit: F.hit, spin, dur: ms(STAGES[SI.spin].base * 0.8), idp: P, button: !PK(), stillHere: () => F.stage === SI.spin,
        onSpin: () => { pause(); const p2 = probs(); if (!p2) return; F.r = Math.random(); F.hit = NT.pickIndex(p2.p, F.r); if (F.stage !== SI.spin) { goStage(SI.spin, true); return; } table(false); spinner(true); setTimeout(() => { if (F.stage === SI.spin) { table(true); caption(F.stage, F.block); } }, ms(STAGES[SI.spin].base * 0.8)); } });
    }

    // ---------- captions ----------
    // a repeated word worth pointing out (the story: "bank"): longer than 3 letters, the one repeated latest
    function repeated() { const w = F.data.words.map((x) => x.toLowerCase()); let best = null; w.forEach((x, i) => { if (x.length > 3 && w.indexOf(x) < i) best = F.data.words[i]; }); return best; }
    function caption(k, sub) {
      const Dt = F.data, lastW = `“${esc(Dt.words[Dt.T - 1].trim())}”`, n = Dt.T, pr = probs(), win = F.hit >= 0 && pr ? `“${esc(NT.tokText(pr.ids[F.hit]).trim())}”` : 'The winner', rep = repeated(), first = `“${esc(Dt.words[0])}”`;
      const others = pr ? 1 - Array.from(pr.p.slice(0, Math.min(10, pr.K))).reduce((a, b) => a + b, 0) : 0;
      const fin = Dt.lens ? `“${esc(NT.tokText(Dt.lens[12][0][0]).trim())}”` : null;
      // [title, the simple caption, extra detail shown only when "Show the numbers" is on]
      const C = [
        ['GPT-2 starts with the text so far.', opts.loop ? 'Every pass adds one token to the end.' : 'First, it turns the text into numbers.'],
        ['Split into tokens.', `The text is cut into ${n} tokens from GPT-2’s list of 50,257.`, 'Tokens are whole words, pieces of words or punctuation (see the Input tab).'],
        ['One row per token.', 'Everything GPT-2 works out about a token is written in its row.'],
        ['Each token gets its ID.', 'Its number in GPT-2’s list of tokens. On the right: the embedding matrix, one row for every token.', 'Common words tend to have small numbers.'],
        ['Look up each token’s embedding row.', `The ID indicates which row of the embedding matrix represents the token’s embedding vector: 768 numbers for the token’s general meaning.${rep ? ` Both “${esc(rep)}”s get the same row.` : ''}`, 'The rows come from all over the matrix, not in order, and a token gets the same row in every sentence. Each stripe is one of the 768 numbers: green above 0, red below, yellow near 0.'],
        ['Add a position row.', 'Row 1 of the position matrix goes to the first token, row 2 to the second, and so on.', 'Shown zoomed in: the matrix has 1,024 rows, which is why GPT-2 can read at most 1,024 tokens.'],
        ['Embedding + position = the input vector.', `One Case File per token, 768 numbers each, ready for block 1${opts.main ? '' : ' (room 1 in Transformer)'}.`, `The embedding rows, position rows and input vectors all use one color scale, so the colors add up.${rep ? ` The two “${esc(rep)}”s now differ a little, but only by position, not yet by meaning.` : ''}`],
        [`Block ${DB}, the investigations (attention).`, `Every token can use itself and earlier tokens, never later ones. Each arc’s color and thickness show how much; ${lastW}’s arcs are the bold ones.`, `Real GPT-2, all 12 detectives averaged. In this view, the share resting on the first token, ${first}, is left out of the percentages.`],
        [`Block ${DB}, the lead detective.`, 'The Lead Detective joins and transforms the 12 notes, then adds the result to each Case File.', 'Each note is 64 numbers; 12 × 64 = 768, rewritten in one voice and added number by number. The Case File stays 768 numbers long.'],
        [`Block ${DB}, the forensics expert.`, 'The Forensics Expert (MLP) transforms each Case File using learned patterns, then adds its 768-number result.', 'The MLP’s intermediate vector has 3,072 dimensions, not 3,072 stored facts.'],
        [`After block ${DB}: into + notes + patterns.`, `Added number by number, they make each token’s new Case File. ${Dt.fv ? 'Every Case File has changed a little.' : 'The vectors inside GPT-2 are stored for the stories in the dropdown; here they are drawn gray.'} On the right: what GPT-2 would guess if it stopped now.`, `${Dt.fv ? `All four vectors in a row share one color scale (stretched so small numbers still show), so the after vector really is into + notes + patterns. In later blocks the notes and patterns are small next to the Case File, so each block changes it only a little. The first row, ${first}, looks very different: it is the resting spot many detectives look at.` : ''}`],
        [`Block ${sub} of 12.`, `Block ${sub - 1} supplies the next block’s input: attention, assembly, then MLP.${fin ? ` Watch ${fin} climb on the right.` : ''}`, 'Only the last token’s arcs are drawn here; every token is still investigated in every block.'],
        ['The output vector.', `After block 12, the last token’s Case File supplies the output vector used to score possible next tokens.`, 'The rescaling changes the colors a little: it evens out the overall size and applies 768 learned weights. The other rows did their job as witnesses.'],
        ['Score every token.', `The output vector is compared with every row of the token vocab matrix, all 50,257. Each comparison gives a score, called a logit. GPT-2 works with token IDs, not words.`, 'Compare = multiply the 768 pairs of numbers and add them up (a dot product). GPT-2 reuses its embedding matrix here; many newer models keep a separate one.'],
        ['Next-token ranking.', 'Which token goes in the “?” row? Sort the scores; SoftMax turns them into probabilities, laid end to end from 0 to 1.', 'Only the gaps between scores matter, not whether they are negative. Temperature and Top-K at the top apply here.'],
        ['Selection: spin.', `A random number r between 0 and 1 picks the winner: whichever range the needle stops in.${PK() ? '' : ' Press 🎲 Spin to try again.'}`, `Bigger slices are more likely, but any allowed token can win.${others > 0.5 ? ` Here thousands of tiny slices together hold ${(others * 100).toFixed(0)}%; a smaller Top-K keeps GPT-2 to its best guesses.` : ''}`],
        ['Add the token, and repeat.', `${win} joins the context. Calculated vectors change on the next pass; learned parameters stay fixed.${opts.main ? ' Press ⏮ to start over, or ◀ to step back.' : ''}`, `GPT-2 works only with token IDs${F.hit >= 0 && pr ? ` (${pr.ids[F.hit]})` : ''}; the ID becomes text only when it is added to the sentence. Real systems save the earlier rows’ work instead of redoing it; the result is the same.`],
      ];
      const Ln = LN();
      if (Ln) { const tw = `“${esc(NT.tokText(Ln.target).trim())}”`, A = Ln.after ? Ln.after() : null; C.push(
        ['The right answer.', `In training the text comes from a real document, so the next token is known. Say this sentence came from a book where the next word is ${tw}. GPT-2 gave ${tw} ${cp(Ln.p0)}.`],
        ['How far off was the guess?', `GPT-2 measures each miss with one number, the <b>loss</b>: 0 if it had been 100% sure of ${tw}, about 10.8 for a blind guess. This guess scores ${(-Math.log(Ln.p0)).toFixed(2)}. Training tries to make the loss small, guess after guess.`],
        sub >= 1 ? [`Trace it back: block ${sub}.`, `Working backwards from the score, GPT-2 works out which way every number in block ${sub} should move so ${tw} would have scored higher: the interviewers’ Query, Key and Value tables, the supervisor’s table, the fact checker’s checklist. This backward pass is called <b>backpropagation</b>.`]
          : ['Trace it back: the ID cards.', `Last, the ID cards (embedding rows) and position rows. Almost all of this nudge lands on ${tw}’s own ID card, the row used to score it; the sentence’s own cards get small nudges. Every number now has its direction.`],
        ['After the nudge.', `Every one of GPT-2’s ${NT.int(124439808)} numbers moved a tiny bit in its direction${A ? ` (${esc(A.name)}: on average about ${A.rel} of its size)` : ''}. Run the same sentence again: ${tw} now gets ${A ? cp(A.p1) : '…'}. That is one training step.`]); }
      if (!E('flCap')) return; // this flow was removed from the page (e.g. a timer from a spin that outlived it)
      let [t, d, more] = C[k]; if (more && document.body.classList.contains('nums-on')) d += ` <span class="fl-more2">${more}</span>`;
      const need = ' For a sentence that isn’t stored, this needs GPT-2 running in the browser (top right).';
      if ((k === SI.attn || k === SI.loop) && !Dt.att) d += need.replace('this', 'the arcs');
      if (k >= SI.vocab && k <= SI.spin && !Dt.d) d += need.replace('this', 'the scores');
      E('flCap').innerHTML = `<div class="fl-ch">${opts.loop && !opts.main ? `<span class="fl-pass">Pass ${F.pass}</span>` : ''}<b>${k + 1}. ${t}</b></div><div class="fl-cd">${d}</div>`;
      E('flDots').innerHTML = CHAP.filter(([, a, b]) => b >= FROM && a <= TO).map(([name, a0, b0]) => [name, Math.max(a0, FROM), Math.min(b0, TO)]).map(([name, a, b]) => `<div class="fl-chap ${k >= a && k <= b ? 'on' : ''}"><span>${esc(name)}</span><div>${STAGES.slice(a, b + 1).map((st0, ii) => { const i = a + ii; return `<button class="fl-dot ${i === k ? 'on' : i < k ? 'done' : ''}" data-k="${i}" title="${esc(st0.title.replace('Block 1', 'Block ' + DB).replace('block 1', 'block ' + DB))}"></button>`; }).join('')}</div></div>`).join('');
      E('flDots').querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { pause(); goStage(+b.dataset.k, false); }));
      if (opts.loop && S.flowFF && F.pass > 5 && F.playing && k >= SI.rank && k <= SI.add) E('flCap').querySelector('.fl-cd').insertAdjacentHTML('afterbegin', '<span class="fl-ff">⏩ Fast-forward: all 17 steps still happen; only the pick is shown.</span> ');
      if (opts.fitHeight) fit();
      if (opts.main) NT.setStatus(`Pass ${F.pass} · Step ${k + 1} of ${STAGES.length} · ${STAGES[k].title}${k === SI.loop ? ' · block ' + sub : ''}`);
    }

    // ---------- moving between stages ----------
    function flashTravel(k, d) { // the last token's vector flashes where it is, then travels to the top of the box
      apply(layout(k, F.block, 5, 'hold'), 0);
      const fl = Math.max(240, ms(380)); // one flash; three of them, then the move
      [E('fMv'), E('fo' + (F.data.T - 1))].forEach((el) => { if (el) { el.classList.remove('flflash2'); void el.offsetWidth; el.style.animationDuration = fl + 'ms'; el.classList.add('flflash2'); } });
      pulseT.push(setTimeout(() => { if (F.stage === k) apply(layout(k, F.block, 5, 'mv'), Math.max(300, Math.round(d * 0.55))); }, fl * 3 + 60));
    }
    let pulseT = []; const clearPulses = () => { pulseT.forEach(clearTimeout); pulseT = []; };
    function goStage(k, animate, sub) {
      if (!G) return;
      clearPulses();
      if (k > SI.add) return goLearn(k, animate, sub);
      E('fLoss').style.opacity = 0; E('fNudge').style.opacity = 0;
      if (k !== SI.add) { const r0 = E('fRow'); if (r0) r0.remove(); ['fTable', 'fSpin'].forEach((id) => { const e = E(id); if (e) { e.style.transition = 'none'; e.style.opacity = ''; } }); if (F.appended && opts.loop) { F.ours = true; NT.setText(F.passText, 'edit'); F.ours = false; F.appended = false; } }
      F.stage = k; if (k === SI.loop) F.block = sub || F.block || B2;
      // the spinner is easiest to read with a short list: the first time the ranking appears, Top-K All becomes Top-K 10 (the slider at the top shows it)
      if (opts.main && !PK() && k >= SI.rank && k <= SI.spin && !S.flowAutoK && KK() > 15) { S.flowAutoK = true; F.autoK = true; F.quietTK = true; NT.setTK(null, 10); F.quietTK = false; }
      if (k >= SI.spin && (F.r == null || PK())) { const pr = probs(); if (pr) { F.r = PK() ? PK().r : Math.random(); F.hit = NT.pickIndex(pr.p, F.r); } } // jumped straight here (or replaying a pick): draw r now
      const b = k < SI.loop ? DB : k === SI.loop ? F.block : 12;
      if (k >= SI.attn) paintBlock(Math.min(b, 12));
      if (k >= SI.final && k <= SI.add) { paintOut(); const fh = E('fh-bout'); if (fh && k === SI.final) fh.textContent = 'Output vector'; }
      if (k === SI.vocab) mat('fmVc', 777, scoreRows().map((r) => [r.id / 50257, null])); // the output vector keeps the colors it had in the column
      const dur = animate ? ms(STAGES[k].base * 0.75) : 0;
      const chips = (bs) => { [0, 1, 2].forEach((j) => { const e = E('fbs' + j); if (e) e.className = ['bh', 'bv', 'bm'][j] + ' ' + (j === bs ? 'on' : j < bs ? 'done' : ''); }); };
      host.querySelectorAll('.fl-tok .sp').forEach((e) => (e.style.display = k <= 1 ? '' : 'none')); // the leading space shows only while the sentence is being cut
      { const sc = E('flScene'); if (sc) sc.classList.toggle('fl-col', k > 1); } // as a column, each token gets its identity bar (as on every tab)
      (E('fB12') ? E('fB12').querySelectorAll('i') : []).forEach((e) => (e.className = +e.dataset.b < b ? 'done' : +e.dataset.b === b ? 'on' : ''));
      if (k === SI.loop && animate) {
        // one block, in turn: the last block's output slides back in (the other columns fade) → the interviews' arcs → the notes → the facts → the new column, whose last vector travels into the meter
        const T0 = ms(STAGES[SI.loop].base);
        chips(-1); lines(k, F.block, false); apply(layout(k, F.block, 0, true), Math.round(T0 * 0.2));
        [[0.2, 1], [0.34, 2], [0.48, 3], [0.62, 4]].forEach(([f, part]) => pulseT.push(setTimeout(() => {
          if (F.stage !== SI.loop) return;
          chips(part === 4 ? 3 : part - 1);
          if (part === 1) lines(k, F.block, true);
          apply(layout(k, F.block, part), Math.round(T0 * 0.12));
        }, Math.round(T0 * f))));
        pulseT.push(setTimeout(() => { if (F.stage === SI.loop) { meter(F.block); lines(k, F.block, 'all'); flashTravel(k, Math.round(T0 * 0.24)); } }, Math.round(T0 * 0.74)));
      } else if (k === SI.attn && animate) { // the input vectors move over first, then the arcs are drawn
        chips(0); apply(layout(k, F.block, 4, true), dur); lines(k, F.block, false);
        pulseT.push(setTimeout(() => { if (F.stage === SI.attn) lines(k, F.block, true); }, dur));
      } else {
        chips(k === SI.attn ? 0 : k === SI.sup ? 1 : k === SI.fact ? 2 : 3);
        if (k >= SI.out1 && k <= SI.final) meter(k === SI.out1 ? DB : k === SI.loop ? F.block : 12, k === SI.final);
        const travel = animate && k === SI.out1;
        apply(layout(k, F.block, 5, travel ? 'hold' : false), dur); lines(k, F.block, 'all');
        if (travel) pulseT.push(setTimeout(() => { if (F.stage === k) flashTravel(k, ms(1300)); }, Math.round(dur * 0.8)));
      }
      if (k >= SI.rank) table(k >= SI.spin && !(k === SI.spin && animate));
      if (k >= SI.spin) spinner(k === SI.spin && animate);
      if (k === SI.spin && animate) pulseT.push(setTimeout(() => { if (F.stage === SI.spin) { table(true); caption(F.stage, F.block); } }, ms(STAGES[SI.spin].base * 0.8)));
      if (k === SI.add) fly(animate);
      caption(k, F.block);
      syncButtons();
    }
    // ---------- Pre-Training: check the guess against the right answer, measure the miss, trace it back, nudge ----------
    const LN = () => opts.learn;
    function goLearn(k, animate, sub) {
      const Ln = LN(); if (!Ln) return;
      F.stage = k; if (k === SI.back) F.block = sub != null ? sub : F.block;
      const b = F.block, T = F.data.T;
      let L;
      if (k === SI.back && b >= 1) { paintBlock(b); L = layout(SI.loop, b); L.fMeter.o = 0; L['fh-notes'].o = 0; L['fh-facts'].o = 0; L.fMv = { o: 0 }; for (let i = 0; i < T; i++) ['fsu', 'fa', 'fm', 'fpa', 'fpm'].forEach((c) => (L[c + i].o = 0)); L.fNudge = { x: XB.meter, y: G.top - 30, o: 1 }; }
      else if (k === SI.back) { L = layout(SI.emb, 0); L.fMv = { o: 0 }; L.fNudge = { x: XB.meter, y: G.top - 30, o: 1 }; L.fmE.x = 640; }
      else { L = layout(SI.rank); L.fLoss = { x: 560, y: G.top + 340, o: k === SI.loss ? 1 : 0 }; L.fNudge = { o: 0 }; }
      if (k !== SI.back) L.fLoss = L.fLoss || { o: 0 }; else L.fLoss = { o: 0 };
      L.fSpin = { o: 0 }; L.fAKey = { o: 0 }; L.fQ = { o: 0 };
      apply(L, animate ? ms(STAGES[k].base * 0.75) : 0);
      (E('fB12') ? E('fB12').querySelectorAll('i') : []).forEach((e) => (e.className = +e.dataset.b > b ? 'done' : +e.dataset.b === b ? 'on back' : ''));
      [0, 1, 2].forEach((j) => { const e = E('fbs' + j); if (e) e.className = 'back'; });
      if (k === SI.back && b >= 1) { const bt = E('fBlockT'); if (bt) bt.textContent = `Block ${b}`; }
      // overlays
      const s = svg(); let g = '';
      if (k === SI.back) {
        if (b >= 1) { for (let i = 0; i < T; i++) { const y = rowY(i) + 8; g += `<path d="M${XB.out - 6} ${y} L${XB.in + SB + 8} ${y}" stroke="#c0392b" stroke-width="2" marker-end="url(#${P}arr)"/>`; }
          if (b === 12) g += `<path d="M${XB.out + SB + 50} ${rowY(T - 1) + 8} L${XB.out + SB + 6} ${rowY(T - 1) + 8}" stroke="#c0392b" stroke-width="3" marker-end="url(#${P}arr)"/><text x="${XB.in + SB + 20}" y="${rowY(T - 1) + 34}" font-size="13" font-weight="700" fill="#c0392b">from “${esc(NT.tokText(Ln.target).trim())}”: what would have made it score higher?</text>`; }
        else { const yR = embY(Ln.target); g += `<text x="640" y="${G.top - 8}" font-size="13" font-weight="700" fill="#c0392b">“${esc(NT.tokText(Ln.target).trim())}”’s own ID card is nudged too</text><path d="M${X.emb + STRIPW + 8} ${rowY(T - 1) + 8} C 500 ${rowY(T - 1)}, 560 ${yR}, 636 ${yR}" stroke="#c0392b" stroke-width="2" fill="none" marker-end="url(#${P}arr)" class="fl-draw"/>`; }
      }
      s.innerHTML = `<defs><marker id="${P}arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#c0392b"/></marker></defs>` + g;
      if (k === SI.back && b === 0) mat('fmEc', 50257, F.data.cur.ids.map((id, i) => [id / 50257, F.data.tok[i]]).concat([[Ln.target / 50257, null]]));
      if (k !== SI.back) learnTable(k); if (k === SI.loss) lossMeter(); if (k === SI.back) nudgePanel(b);
      caption(k, b); syncButtons();
    }
    function learnTable(k) {
      const Ln = LN(), t = E('fTable'), A = Ln.after ? Ln.after() : null, after = k === SI.after && A;
      const rows = (after ? A.top1 : Ln.top0).slice(0, 10), tw = esc(NT.tokText(Ln.target).trim()), p0 = Ln.p0, p1 = A ? A.p1 : null;
      const mx = rows[0][1];
      t.innerHTML = `<div class="fl-tt">${after ? `After one nudge (${esc(A.name)})` : 'GPT-2’s guess'} · Temperature 1 · Top-K All</div><table class="gt"><tr><th>#</th><th>Token</th><th>Probability</th><th></th></tr>${rows.map(([id, p], i) => `<tr class="${id === Ln.target && k >= SI.truth ? 'right' : ''}"><td>${i + 1}</td><td class="w">${NT.show(NT.tokText(id))}</td><td><span class="mbar"><i style="width:${(100 * p / mx).toFixed(0)}%;background:${id === Ln.target ? '#1f8a4c' : '#b9a8f5'}"></i></span></td><td>${p > 0 ? cp(p) : '<0.1%'}</td></tr>`).join('')}</table>
        ${k >= SI.truth ? `<div class="fl-right">✓ The right answer: <b>“${tw}”</b>. GPT-2 gave it <b>${cp(p0)}</b>${after ? ` before the nudge, <b>${cp(p1)}</b> after.` : '.'}</div>` : ''}`;
    }
    function lossMeter() {
      const Ln = LN(), m = E('fLoss'), l = -Math.log(Ln.p0), mx = Math.log(50257), x = (v) => (100 * v / mx).toFixed(1);
      m.innerHTML = `<div class="fl-tt">The loss: how far off was the guess?</div><div class="fl-lbar"><i style="width:${x(l)}%"></i><span class="z">0<br><small>100% sure, and right</small></span><span class="m" style="left:${x(l)}%">${l.toFixed(2)}<br><small>this guess (${cp(Ln.p0)})</small></span><span class="r">${mx.toFixed(1)}<br><small>a blind guess</small></span></div>`;
    }
    function nudgePanel(b) {
      const Ln = LN(), m = E('fNudge'), mx = Math.max(...Ln.gblocks);
      const row = (lab, v, on) => `<tr class="${on ? 'cur' : ''}"><td>${lab}</td><td><span class="mbar"><i style="width:${(100 * v / mx).toFixed(0)}%;background:#c0392b"></i></span></td></tr>`;
      let r = ''; for (let bb = 12; bb >= Math.max(1, b); bb--) r += row(`Block ${bb}`, Ln.gblocks[bb - 1], bb === b);
      if (b === 0) r += row(`ID cards: ${(Ln.gemb / mx).toFixed(1)}× block 1`, mx, true);
      m.innerHTML = `<div class="fl-tt" style="color:#c0392b">How big a nudge each part gets</div><table class="fl-mh">${r}</table><div class="fl-mr">Real sizes for this one guess (gradient sizes), compared with each other.</div>`;
    }
    // 17. the chosen row leaves the table and becomes the "?" row; everything but its token fades; the token flies up into the sentence at the top
    function fly(animate) {
      const pr = probs(), sc = E('flScene'), tab = E('fTable'); if (!pr || F.hit < 0 || !sc || !tab) return;
      const tr = tab.querySelector('tr.hit'); if (!tr) return;
      const k = F.k || 1, sr = sc.getBoundingClientRect(), rr = tr.getBoundingClientRect(), tdTok = tr.querySelector('td.w');
      const old = E('fRow'); if (old) old.remove();
      const wrap = document.createElement('div'); wrap.className = 'fl-rowmove'; wrap.id = P + 'fRow';
      wrap.innerHTML = `<table class="gt" style="width:${rr.width / k}px"><tbody>${tr.outerHTML}</tbody></table>`; sc.appendChild(wrap);
      const tokOff = (tdTok.getBoundingClientRect().left - rr.left) / k, x0 = (rr.left - sr.left) / k, y0 = (rr.top - sr.top) / k, x1 = X.tok - tokOff, y1 = rowY(G.T) - 8;
      const cells = [...wrap.querySelectorAll('td')].filter((td) => !td.classList.contains('w'));
      const d = animate ? ms(STAGES[SI.add].base) : 0;
      const put = (x, y, t) => { wrap.style.transition = t ? `transform ${t}ms cubic-bezier(.45,.05,.25,1)` : 'none'; wrap.style.transform = `translate(${x}px,${y}px)`; };
      put(x0, y0, 0); void wrap.offsetWidth;
      ['fTable', 'fSpin'].forEach((id) => { const e = E(id); if (e) { e.style.transition = `opacity ${Math.round(d * 0.3)}ms`; e.style.opacity = 0.15; } });
      requestAnimationFrame(() => put(x1, y1, Math.round(d * 0.32)));
      const id = pr.ids[F.hit], bd = NT.BANDS[NT.rankBand(F.hit + 1, KK() >= NT.ALL ? NT.ALL : KK())], row = wrap.querySelector('tr'), wt = wrap.querySelector('td.w');
      const d0fade = () => { cells.forEach((td) => (td.style.opacity = 0)); row.style.background = 'transparent'; Object.assign(wt.style, { background: bd.bg, color: bd.fg, borderRadius: '6px' }); };
      const fade = () => { cells.forEach((td) => { td.style.transition = `opacity ${Math.round(d * 0.15)}ms`; td.style.opacity = 0; }); row.style.transition = `background ${Math.round(d * 0.15)}ms`; row.style.background = 'transparent'; Object.assign(wt.style, { background: bd.bg, color: bd.fg, borderRadius: '6px' }); };
      const toSentence = () => {
        if (!opts.loop || F.appended || F.stage !== SI.add) return;
        const from = wt.getBoundingClientRect(), target = sentenceEnd(); if (!target) { appendToken(); return; }
        const fl = document.createElement('div'); fl.className = 'fl-pagefly'; fl.textContent = NT.tokText(id); fl.style.background = bd.bg; fl.style.color = bd.fg;
        const fs = parseFloat(getComputedStyle(document.getElementById('sentence')).fontSize) || 24;
        Object.assign(fl.style, { left: from.left + 'px', top: from.top + 'px', fontSize: (parseFloat(getComputedStyle(wt).fontSize) * (F.k || 1)) + 'px' }); document.body.appendChild(fl);
        void fl.offsetWidth; const t = Math.max(1, Math.round(d * 0.4));
        fl.style.transition = `left ${t}ms cubic-bezier(.45,.05,.25,1), top ${t}ms cubic-bezier(.45,.05,.25,1), font-size ${t}ms`;
        Object.assign(fl.style, { left: target.left + 'px', top: target.top + 'px', fontSize: fs + 'px' });
        setTimeout(() => { fl.remove(); if (F.stage === SI.add) appendToken(); }, t + 30);
      };
      if (!animate) { put(x1, y1, 0); d0fade(); toSentence(); return; }
      pulseT.push(setTimeout(fade, Math.round(d * 0.36)));
      pulseT.push(setTimeout(toSentence, Math.round(d * 0.56)));
    }
    // where the next token goes in the sentence box at the top of the page (screen position)
    function sentenceEnd() {
      const back = document.getElementById('sentBack'); if (!back) return null;
      const m = document.createElement('span'); m.textContent = '​'; back.appendChild(m); const r = m.getBoundingClientRect(); m.remove();
      return r.width || r.height ? { left: r.left, top: r.top } : null;
    }
    function appendToken() { // the sentence gets the token now; the next pass starts from it
      const pr = probs(); if (!pr || F.hit < 0 || F.appended || !opts.loop) return;
      const id = pr.ids[F.hit], K = KK() >= NT.ALL ? NT.ALL : KK();
      F.ours = true; NT.setText(F.passText + NT.tokText(id), 'append', NT.makeMark({ rank: F.hit + 1, K, p: pr.p[F.hit], T: TT() })); F.ours = false; F.appended = true;
    }
    // advance: within the loop stage, one block at a time
    const atEnd = () => F.stage === TO && !(F.stage === SI.loop && F.block < 12) && !(F.stage === SI.back && F.block > 0);
    function next() {
      if (F.busy) return false;
      if (F.stage === SI.loop && F.block < 12) { F.block++; goStage(SI.loop, true, F.block); return true; }
      if (F.stage === SI.back && F.block > 0 && !atEnd()) { F.block--; goStage(SI.back, true, F.block); return true; }
      if (atEnd() && !(opts.loop && F.stage === SI.add)) { pause(); if (opts.onEnd) opts.onEnd(); return false; }
      if (opts.loop && F.playing && S.flowFF && F.pass > 5 && F.stage < SI.rank) { goStage(SI.rank, true); return true; }
      if (F.stage === SI.rank) { const pr = probs(); if (pr) { F.r = PK() ? PK().r : Math.random(); F.hit = NT.pickIndex(pr.p, F.r); } }
      if (F.stage === SI.add) { if (opts.main) { pause(); return false; } nextPass(); return true; }
      const k = F.stage + 1; if (k === SI.loop) F.block = B2; if (k === SI.back) F.block = 12; goStage(k, true, F.block); return true;
    }
    function back() {
      if (F.busy) return;
      if (F.stage === SI.loop && F.block > B2) { F.block--; goStage(SI.loop, false, F.block); return; }
      if (F.stage === SI.back && F.block < 12) { F.block++; goStage(SI.back, false, F.block); return; }
      if (F.stage <= FROM) return;
      const k = F.stage - 1; if (k === SI.loop) F.block = 12; if (k === SI.back) F.block = 0; goStage(k, false, F.block);
    }
    async function nextPass() {
      const pr = probs(); if (!pr || F.hit < 0) return;
      if (!opts.loop) return;
      if (!F.appended) appendToken();
      F.pass++; F.r = null; F.hit = -1;
      await start(false);
    }
    // play: step through stages on a timer (each block of the loop is its own step)
    function stepDur() { const k = F.stage; return ms(STAGES[k].base); }
    function tick() {
      if (!F.playing || !alive()) return;
      F.timer = setTimeout(async () => {
        if (!F.playing || !alive()) return;
        if (F.stage === SI.add && opts.main) { pause(); return; }
        if (F.stage === SI.add && opts.loop) { await nextPass(); if (F.playing) tick(); return; }
        if (next()) tick();
      }, stepDur());
    }
    function play() { if (F.playing) return pause(); F.playing = true; syncButtons(); tick(); }
    function pause() { F.playing = false; clearTimeout(F.timer); syncButtons(); }
    async function rewind() { pause(); F.pass = 1; F.r = null; F.hit = -1; if (opts.loop && F.startText && NT.current().text !== F.startText) { F.ours = true; NT.setText(F.startText, 'edit'); F.ours = false; await start(false); } else goStage(FROM, false, B2); }
    function syncButtons() {
      const p = E('flPlay'); if (p) p.textContent = F.playing ? '⏸ Pause' : '▶ Play';
      const b = E('flBack'); if (b) b.disabled = F.stage <= FROM || F.busy;
      const stop = opts.main && F.stage === SI.add; // one pass only: after the token is added, step back or start over
      const n = E('flNext'); if (n) n.disabled = stop || (atEnd() && !(opts.loop && F.stage === SI.add));
      if (p) p.disabled = stop;
      const o = E('flMore'); if (o) o.hidden = !atEnd();
    }

    // ---------- building a pass ----------
    async function start(fresh) {
      F.busy = true; F.appended = false; F.passText = curNow().text; F.arcKey = null;
      const box = E('flBox'); if (!box) return;
      if (fresh) box.innerHTML = NT.pendingHTML('Getting GPT-2’s numbers for this sentence…');
      F.data = await loadData();
      if (!alive()) return;
      box.innerHTML = buildScene();
      paintStatic();
      fit();
      F.busy = false;
      const k0 = fresh && opts.startAt != null ? opts.startAt : FROM; F.block = B2;
      goStage(k0, false, k0 === SI.loop ? (opts.startBlock || B2) : B2); if (opts.onReady) opts.onReady(inst); if (fresh && opts.autoplay) play();
    }
    // scale the 1200-wide scene to the box; an embedded flow can show just a window of it (viewX..viewX+viewW)
    function fit() {
      const box = E('flBox'), sc = E('flScene'); if (!box || !sc || !G) return;
      const vx = opts.viewX || 0, vw = opts.viewW || W, h = G.H - (opts.cropBottom || 0);
      let k = Math.min(opts.maxScale || 1.25, box.clientWidth / vw);
      if (opts.fitHeight) { const top = box.getBoundingClientRect().top + window.scrollY, avail = window.innerHeight - top - 14; if (avail > 260) k = Math.min(k, avail / h); }
      const dx = Math.max(0, (box.clientWidth - vw * k) / 2);
      sc.style.transform = `translate(${dx - vx * k}px,0) scale(${k})`; F.k = k; box.style.height = `${Math.ceil(h * k)}px`;
    }

    // ---------- the panel and its controls ----------
    const ctlHTML = (own) => `<button class="btn" id="${P}flRew" title="Back to the start">⏮</button><button class="btn" id="${P}flBack" title="Back one step">◀ Back</button><button class="btn primary" id="${P}flNext" title="Next step">Next ▶</button><button class="btn" id="${P}flPlay">▶ Play</button>
        ${opts.loop && !opts.main ? `<label class="fl-ffl" title="After 5 passes, Play shows only the pick"><input type="checkbox" id="${P}flFF" ${S.flowFF ? 'checked' : ''}> Fast-forward after pass 5</label>` : ''}<label class="delay">Speed <input type="range" id="${P}flSpeed" min="0" max="${SPEEDS.length - 1}" value="${speedIx}"><b id="${P}flSpV">×${SPEEDS[speedIx]}</b></label>${opts.more ? `<button class="btn ghost fl-more" id="${P}flMore" hidden>${esc(opts.more[0])}</button>` : ''}`;
    host.innerHTML = `<section class="panel fl-panel${opts.main ? '' : ' fl-embed'}">${opts.title ? `<div class="fl-etitle">${opts.title}</div>` : ''}${opts.controls === 'own' ? `<div class="fl-ctl">${ctlHTML(true)}</div>` : ''}${opts.controls === 'none' ? `<div hidden>${ctlHTML(false)}</div>` : ''}${opts.controls === 'head' ? `<div class="fl-head"><div class="fl-ctl">${ctlHTML(true)}</div></div><div class="fl-capwrap"><div class="fl-cap fixed" id="${P}flCap"></div><div class="fl-dots" id="${P}flDots"></div></div>` : `<div class="fl-cap" id="${P}flCap"></div>`}${opts.note ? `<div class="fl-note">${opts.note}</div>` : ''}${opts.controls === 'head' ? '' : `<div class="fl-dots" id="${P}flDots"${opts.dots === false ? ' hidden' : ''}></div>`}<div class="fl-box" id="${P}flBox"></div></section>`;
    if (opts.controls === 'todo') $('#todoTools').innerHTML = ctlHTML(false);
    E('flRew').onclick = rewind; E('flBack').onclick = () => { pause(); back(); }; E('flNext').onclick = () => { pause(); next(); }; E('flPlay').onclick = play;
    E('flSpeed').oninput = (e) => { speedIx = +e.target.value; E('flSpV').textContent = '×' + SPEEDS[speedIx]; if (F.data) caption(F.stage, F.block); };
    if (E('flFF')) E('flFF').onchange = (e) => { S.flowFF = e.target.checked; };
    if (E('flMore')) E('flMore').onclick = () => { pause(); opts.more[1](F.stage); };
    const inst = { F, start, recap: () => { if (G && F.data) caption(F.stage, F.block); }, goStage: (k, b) => goStage(k, false, b), go: (id, animate, b) => { pause(); if (G && !F.busy) goStage(typeof id === 'number' ? id : SI[id], animate, b); }, next, back, play, pause, rewind, fit, alive,
      onTK() { if (F.quietTK) return; if (F.stage >= SI.rank && G && !PK()) { if (F.stage === SI.rank) table(false); else { F.r = null; F.hit = -1; goStage(SI.rank, false); } } } };
    LIVE.add(inst);
    F.startText = NT.current().text;
    if (!curNow().ids.length) E('flBox').innerHTML = '<div class="panel emptynote">Type a sentence at the top, or choose one, to begin.</div>';
    else start(true);
    return inst;
  }
  window.addEventListener('resize', () => { LIVE.forEach((f) => (f.alive() ? f.fit() : LIVE.delete(f))); });
  NT.flow = { create, STAGES, SI, CHAP, stageOf: (id) => SI[id] };
  NT.flowData = flowData; // the stored vectors inside every block (also used by the Transformer tab)
  NT.flowRefresh = () => LIVE.forEach((f) => (f.alive() ? f.recap() : LIVE.delete(f)));
  S.flowFF = S.flowFF !== false;
  // a link that opens Whole Process › Animated flow at one step, on the current sentence
  NT.watchFlow = (stageId, block) => { S.flowStart = { k: SI[stageId], block, from: [S.top, S.sub] }; NT.goTab('whole', 'flow'); };

  // Input › Put it together: steps 1–7 of the flow, the whole tab in one animation
  NT.stations.nmflow = {
    // this tab's own, fuller animation (element values, one token at a time); the Whole Process keeps its simpler version of these steps
    init() { this.f = NT.numScene(st(), 'all', { more: ['Next: Transformer ›', () => NT.goTab('transformer')] }); },
    onText() { NT.stations.nmflow.init(); },
  };

  let MAIN = null;
  NT.stations.flow = {
    init() {
      if (MAIN) MAIN.pause();
      // the Whole Process uses stored GPT-2 numbers: any other sentence becomes the story sentence, and the sentence box is read-only here
      const c = NT.current(), stored = ['story', 'umbrella', 'trophy'].map((k) => NT.EX[k].text); if (NT.uc && !stored.some((t) => c.text.startsWith(t))) { /* only the stored stories (and the tokens the flow adds to them) can be shown with every number */ this.switching = true; NT.setText(NT.EX[NT.uc.STORY].text, 'edit'); this.switching = false; }
      const go = S.flowStart; S.flowStart = null;
      MAIN = create(st(), { main: true, loop: true, controls: 'head', fitHeight: true, startAt: go ? go.k : null, startBlock: go ? go.block : null });
      NT.guideRow(st().querySelector('.fl-panel')); // the player sits beside the caption, as on every other page
      if (go && go.from) { const t = NT.TABS.find((x) => x.id === go.from[0]); st().querySelector('.fl-ctl').insertAdjacentHTML('afterbegin', `<button class="btn ghost" id="flReturn" title="Go back where you came from">← Back to ${esc(t ? t.label : 'the lesson')}</button>`); $('#flReturn').onclick = () => { MAIN.pause(); NT.goTab(go.from[0], go.from[1]); }; }
    },
    onText() { if ((MAIN && MAIN.F.ours) || NT.stations.flow.switching) return; NT.stations.flow.init(); },
    onTK() { if (MAIN) MAIN.onTK(); }, onNums() {},
  };
})();
