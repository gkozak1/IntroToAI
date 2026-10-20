/* LLM Lab — shared visuals, first built for Whole Process › Animated flow and reused by every tab:
   NT.viz.vec      a 768-number vector as a color strip (sign · square-root stretch, one shared scale per row kind)
   NT.viz.rankTable  the Next-token ranking table: # · Token ID · Token · Logit · Probability (· Range), band-colored bars
   NT.viz.wheel    the spinner: slices by probability, band colors, a needle that stops at r
   plus the arc / score-line colors (LINECOL, shareCol) and the probability rounding (cp). */
'use strict';
(() => {
  const esc = NT.esc;
  const V = (NT.viz = {});
  // the size of a vector's big numbers (98th percentile of |value|): the usual color scale
  V.p98 = (v) => { const a = Array.from(v, Math.abs).sort((x, y) => x - y); return Math.max(1e-6, a[Math.floor(a.length * 0.98)] || a.at(-1)); };
  // probabilities: the same rounding everywhere (Output's)
  V.cp = (p) => (p >= 0.001 ? (p * 100).toFixed(1) + '%' : p > 0 ? '<0.1%' : '0%');
  // attention arcs and score lines: dark green (most) → light green → yellow → pink → red (least); NT.BANDS' hues, deep enough for thin lines
  V.LINECOL = ['#1e8a3a', '#6fc28a', '#e0b800', '#ef8fa0', '#c0392b'];
  V.shareCol = (p) => V.LINECOL[p >= 0.2 ? 0 : p >= 0.1 ? 1 : p >= 0.05 ? 2 : p >= 0.02 ? 3 : 4];
  V.arcKeyHTML = () => `arc color = share of attention<br>${['20%+', '10–20', '5–10', '2–5', '&lt;2%'].map((t, i) => `<i style="background:${V.LINECOL[i]}"></i>${t}`).join(' ')}`;

  // ---------- vectors ----------
  // m: the shared scale (default: this vector's own p98). Colors are stretched with a square root so small numbers still show.
  V.vec = (cv, vals, m) => {
    if (!cv) return; if (!vals) return V.gray(cv);
    const n = vals.length; m = m || V.p98(vals); cv.width = n; cv.height = 1;
    const c = cv.getContext('2d'), img = c.createImageData(n, 1);
    for (let i = 0; i < n; i++) { const t = vals[i] / m, [r, g, b] = NT.div(Math.sign(t) * Math.sqrt(Math.abs(t))); img.data.set([r, g, b, 255], i * 4); }
    c.putImageData(img, 0, 0);
  };
  // ---------- role-colored vectors (Oct 19): Query blue, Key orange, Value purple, MLP teal (NT.C). Near 0 is pale; a large positive
  //            number is the role color, a large negative one a gray of the same hue — the same rule in How it really works, the story and Pre-Training. ----------
  const hsl = (hex) => { const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0; return [h, Math.round(sat * 100)]; };
  const soft = ([h, s2], mx) => [h, Math.min(s2, mx)]; // a strip of many saturated cells glares; cap the saturation a little
  V.ROLE = () => ({ q: soft(hsl(NT.C.q), 72), k: soft(hsl(NT.C.k), 85), v: soft(hsl(NT.C.v), 60), a: soft(hsl(NT.C.mlp), 55), m: soft(hsl(NT.C.mlp), 55), h: hsl(NT.C.head) });
  V.rolePx = (hu, sa, t) => {
    t = Math.max(-1, Math.min(1, t)); t = Math.sign(t) * Math.sqrt(Math.abs(t));
    const L = (t >= 0 ? 95 - 58 * t : 95 + 48 * t) / 100, S = (t >= 0 ? sa : 16) / 100, C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs(((hu / 60) % 2) - 1)), M = L - C / 2;
    const [r, g, b] = hu < 60 ? [C, X, 0] : hu < 120 ? [X, C, 0] : hu < 180 ? [0, C, X] : hu < 240 ? [0, X, C] : hu < 300 ? [X, 0, C] : [C, 0, X];
    return [(r + M) * 255, (g + M) * 255, (b + M) * 255, 255];
  };
  // a vector (kind q | k | v | m) as a strip in its role color; m: the shared scale (default this vector's p98)
  V.role = (cv, vals, kind, m) => {
    if (!cv) return; if (!vals) return V.gray(cv); const n = vals.length; m = m || V.p98(vals); cv.width = n; cv.height = 1;
    const c = cv.getContext('2d'), img = c.createImageData(n, 1), [hu, sa] = V.ROLE()[kind];
    for (let i = 0; i < n; i++) img.data.set(V.rolePx(hu, sa, vals[i] / m), i * 4);
    c.putImageData(img, 0, 0);
  };
  V.gray = (cv) => { if (!cv) return; cv.width = 1; cv.height = 1; const x = cv.getContext('2d'); x.fillStyle = '#d5d9e0'; x.fillRect(0, 0, 1, 1); };
  // one scale for a set of vectors that should be compared (e.g. token + position = input): the median of their p98s
  V.sharedScale = (vs) => { const a = vs.filter(Boolean).map(V.p98).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 1; };
  V.vecHTML = (id, cls = '') => `<canvas class="vz-vec ${cls}" id="${id}"></canvas>`;

  // ---------- the ranking table ----------
  // pr: NT.probs(d, T, K) → { ids, logits, p, K }. K: the Top-K setting (NT.ALL for All), used for the band colors.
  // o: n (rows, 10) · hit (row index to highlight, -1) · prob (Probability column, true) · range (0–1 Range column, true) ·
  //    after (extra row indices shown after a "…" row, e.g. ordinary words near the bottom) · more ("… N more allowed tokens" row, true) ·
  //    base (a second NT.probs result, usually Temperature 1 · Top-K All: gray ghost bars plus a "Plain" column; rows outside Top-K say "not allowed") ·
  //    mark (row index → extra class)
  V.rankCols = (o = {}) => 4 + (o.prob !== false ? 1 : 0) + (o.base ? 1 : 0) + (o.prob !== false && o.range !== false ? 1 : 0);
  V.rankBody = (pr, K, o = {}) => {
    const prob = o.prob !== false, range = prob && o.range !== false, base = o.base || null, hit = o.hit == null ? -1 : o.hit;
    const N = base ? base.K : pr.K, n = Math.min(o.n || 10, N), cols = V.rankCols(o);
    const Kb = K >= NT.ALL ? NT.ALL : K, b = hit >= 0 ? NT.BANDS[NT.rankBand(hit + 1, Kb)] : null;
    // where each row's range starts on the 0–1 line. A caller that stores only some rows (Overview keeps the top 10 and the picked row) passes pr.cum(i).
    let cum; if (pr.cum) cum = new Proxy([], { get: (t, k) => (typeof k === 'string' && /^\d+$/.test(k) ? pr.cum(+k) : t[k]) }); else { let c = 0; cum = []; for (let i = 0; i < pr.K; i++) { cum.push(c); c += pr.p[i]; } }
    const src = base || pr, mx = base ? Math.max(pr.p[0], base.p[0]) : pr.p[0];
    const rg = (i, d) => { if (!range) return ''; if (i >= pr.K) return '<td></td>'; d = d || (i >= n ? 4 : 3); return `<td>${cum[i].toFixed(d)}–${(cum[i] + pr.p[i]).toFixed(d)}</td>`; };
    const pc = (i, bar = true) => { if (!prob) return ''; const ok = i < pr.K, p = ok ? pr.p[i] : 0, col = ok ? NT.BANDS[NT.rankBand(i + 1, Kb)].bg : '#c6cdd8';
      if (!bar) return `<td>${ok ? V.cp(p) : 'not allowed'}</td>`;
      const bars = base ? `<span class="mbar two"><i class="ghost" style="width:${(100 * base.p[i] / mx).toFixed(0)}%"></i><i style="width:${(100 * p / mx).toFixed(0)}%;background:${col}"></i></span>` : `<span class="mbar"><i style="width:${(100 * p / mx).toFixed(0)}%;background:${col}"></i></span>`;
      return `<td>${bars} ${ok ? V.cp(p) : 'not allowed'}</td>`; };
    const row = (i, bar = true) => { const cl = [i === hit ? 'hit' : '', base && i >= pr.K ? 'out' : '', o.mark ? o.mark(i) || '' : ''].join(' ').trim(), id = src.ids[i];
      return `<tr${cl ? ` class="${cl}"` : ''}${i === hit ? ` style="background:${b.bg};color:${b.fg}"` : ''}><td>${NT.int(i + 1)}</td><td class="tid">${id}</td><td class="w">${NT.show(NT.tokText(id))}</td><td>${Number.isFinite(src.logits[i]) ? src.logits[i].toFixed(1) : '—'}</td>${pc(i, bar)}${base ? `<td>${V.cp(base.p[i])}</td>` : ''}${rg(i)}</tr>`; };
    let body = ''; for (let i = 0; i < n; i++) body += row(i);
    const dots = (t = '…') => `<tr><td colspan="${cols}" class="muted">${t}</td></tr>`;
    if (hit >= n) body += dots() + row(hit, false);
    else if (o.after && o.after.length) body += dots(o.afterLabel || '…') + o.after.map((i) => row(i, false)).join('');
    else if (o.more !== false && prob && pr.K > n) { const rest = 1 - cum[n];
      body += `<tr class="rk-more"><td colspan="4" class="muted">… ${NT.int(pr.K - n)} more ${Kb >= NT.ALL ? 'tokens' : 'allowed tokens'}</td><td>${(rest * 100).toFixed(1)}%</td>${base ? `<td>${V.cp(1 - Array.from(base.p.slice(0, n)).reduce((a, x) => a + x, 0))}</td>` : ''}${range ? `<td>${cum[n].toFixed(3)}–1.000</td>` : ''}</tr>`; }
    return body;
  };
  V.rankHead = (o = {}) => { if (typeof o === 'boolean') o = { range: o }; const prob = o.prob !== false; return `<tr><th>#</th><th>Token ID</th><th>Token</th><th>Logit</th>${prob ? `<th>${o.base ? 'Now' : 'Probability'}</th>` : ''}${o.base ? '<th>Plain</th>' : ''}${prob && o.range !== false ? '<th>Range</th>' : ''}</tr>`; };
  V.rankTable = (pr, K, o = {}) => `<table class="gt rk${o.cls ? ' ' + o.cls : ''}">${V.rankHead(o)}${V.rankBody(pr, K, o)}</table>`;
  // the whole card: optional output vector on top (o.vecId; draw it with V.vec after inserting), a title, the table
  V.rankCard = (pr, K, o = {}) => `<div class="rk-card">${o.vecId ? `${o.vecTitle ? `<div class="rk-tt">${o.vecTitle}</div>` : ''}${V.vecHTML(o.vecId, 'rk-vec')}` : ''}${o.title ? `<div class="rk-tt">${o.title}</div>` : ''}${V.rankTable(pr, K, o)}</div>`;

  // ---------- the spinner ----------
  // box: the element to fill. o: { pr, K, r (null = not spun yet), hit, spin (animate the needle), dur (ms), idp (id prefix),
  //   button (show 🎲 Spin), onSpin (click handler), n (slices, 15), size (px, 330), done (called when the needle stops), keepNeedle }
  V.wheel = (box, o) => {
    if (!box) return; const pr = o.pr; if (!pr) { box.innerHTML = ''; return; }
    const P = o.idp ?? 'vz', K = o.K >= NT.ALL ? NT.ALL : o.K, n = Math.min(o.n || 15, pr.K), R = 140, C = 175; let a = 0, g = '';
    const pt = (t, r) => [C + r * Math.sin(2 * Math.PI * t), C - r * Math.cos(2 * Math.PI * t)];
    const arc = (a0, a1, col) => { if (a1 - a0 >= 0.9999) return `<circle cx="${C}" cy="${C}" r="${R}" fill="${col}" stroke="#fff" stroke-width="1.5"/>`; const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R); return `<path d="M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${x1} ${y1} Z" fill="${col}" stroke="#fff" stroke-width="1.5"/>`; };
    for (let i = 0; i < n; i++) { const bd = NT.BANDS[NT.rankBand(i + 1, K)]; g += arc(a, a + pr.p[i], bd.bg); const [tx, ty] = pt(a + pr.p[i] / 2, R * 0.68); if (pr.p[i] > 0.035) g += `<text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="13" font-family="Georgia" fill="${bd.fg}">${esc(NT.tokText(pr.ids[i]).trim())}</text>`; a += pr.p[i]; }
    const others = 1 - a;
    if (others > 0.001) { g += arc(a, 1, '#d5d9e0'); if (others > 0.08) { const [tx, ty] = pt((a + 1) / 2, R * 0.55); g += `<text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="12" fill="#5b6577">all others</text>`; } }
    [0, 0.25, 0.5, 0.75].forEach((t) => { const [x0, y0] = pt(t, R), [x1, y1] = pt(t, R + 7), [lx, ly] = pt(t, R + 20); g += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#33455a" stroke-width="1.5"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11" fill="#33455a">${t === 0 ? '0 | 1' : t}</text>`; });
    const r = o.r, hit = o.hit == null ? -1 : o.hit, rot = r == null ? 0 : r * 360 + 360 * 4, word = hit >= 0 ? NT.tokText(pr.ids[hit]).trim() : '';
    const needle = o.needle === false ? '' : `<g id="${P}fNeedle" style="transform-origin:${C}px ${C}px;transform:rotate(0deg)"><line x1="${C}" y1="${C}" x2="${C}" y2="${C - R + 6}" stroke="#1d2634" stroke-width="4" stroke-linecap="round"/><polygon points="${C - 7},${C - R + 16} ${C + 7},${C - R + 16} ${C},${C - R + 2}" fill="#1d2634"/></g><circle cx="${C}" cy="${C}" r="9" fill="#fff" stroke="#1d2634" stroke-width="3"/>`;
    const note = others > 0.001 ? `<div class="fl-rl">gray: the other ${NT.int(pr.K - n)} allowed tokens, ${(others * 100).toFixed(1)}% together</div>` : '';
    const size = o.size || 330;
    box.innerHTML = `${o.button ? `<button class="btn primary fl-spinbtn" id="${P}fSpinBtn">🎲 Spin</button>` : ''}<svg viewBox="0 0 350 350" width="${size}" height="${size}">${g}${needle}</svg><div class="fl-rr" id="${P}fR">${r == null ? '' : `r = ${r.toFixed(3)}` + (o.spin ? '' : ` → “${esc(word)}”`)}</div>${note}`;
    const nd = document.getElementById(P + 'fNeedle') || { style: {} }, rr = document.getElementById(P + 'fR');
    if (o.spin && r != null) {
      const d = o.dur || 2000;
      requestAnimationFrame(() => { nd.style.transition = `transform ${d}ms cubic-bezier(.15,.7,.2,1)`; nd.style.transform = `rotate(${rot}deg)`; });
      setTimeout(() => { if (!rr.isConnected) return; if (!o.stillHere || o.stillHere()) rr.textContent = `r = ${r.toFixed(3)} → “${word}”`; if (o.done) o.done(); }, d);
    } else if (r != null) nd.style.transform = `rotate(${rot}deg)`;
    const sb = document.getElementById(P + 'fSpinBtn'); if (sb && o.onSpin) sb.onclick = o.onSpin;
  };
})();
/* Oct 15 layout pass: one look for every page driven by a player (Transformer, Output, Whole Process, Put it together, Token IDs,
   Token + position, Pre-Training): the player buttons sit to the left of the purple two-line caption, in one row, so the picture below
   gets the height. NT.guideRow(panel) moves the panel's first .fl-ctl and its caption into that row. */
NT.guideRow = (panel, cap) => {
  if (!panel) return; const ctl = panel.querySelector('.fl-ctl'); cap = cap || panel.querySelector('.fl-capwrap') || panel.querySelector('.fl-cap'); if (!ctl || !cap) return;
  const row = document.createElement('div'); row.className = 'guide'; cap.parentNode.insertBefore(row, cap); row.appendChild(ctl); row.appendChild(cap);
  const head = panel.querySelector('.tr-head, .fl-head'); if (head && !head.children.length) head.remove();
  // (Oct 18) the About line stays the page's top line, above the controls
};
// a static (non-interactive) block that should fit the screen: shrink it with CSS zoom, down to `min`, so its bottom stays in view
NT.fitZoom = (el, min = 0.72) => {
  if (!el || !el.isConnected) return; el.style.zoom = 1;
  const top = el.getBoundingClientRect().top + window.scrollY, h = el.scrollHeight, avail = window.innerHeight - top - 12;
  if (h > avail && avail > 200) el.style.zoom = Math.max(min, avail / h).toFixed(3);
};
