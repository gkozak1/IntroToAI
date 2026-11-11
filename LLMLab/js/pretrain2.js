/* LLM Lab — shared Pre-/Post-Training scene.
   Twelve vertical blocks reuse the Transformer Q/K/V, output-projection and MLP
   colors. Parameter thumbnails are illustrative, with explicit breaks in tall
   matrices. Forward flow runs downward, backpropagation upward, and gradient
   descent updates parameter values. Existing output bars and tangent animation
   are retained. */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const st = () => $('#stage');
  const SW = 1290, H = 486, P = 'pb_', E = (id) => document.getElementById(P + id);
  const BAND = (i) => NT.BANDS[i].bg;
  // Nov 11 (Greg): a Speed slider on the long repeated sequences (Repeat and Batches beats of both tabs); other beats always run at ×1
  const SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3], GAP = 500; let spIx = 2, speedy = false;
  const sp = () => (speedy ? SPEEDS[spIx] : 1);
  const setSpeedVar = () => { const sc = E('sc'); if (sc) sc.style.setProperty('--pt2-speed', sp()); };
  const vis = (id, on) => { const e = E(id); if (e) { e.style.opacity = on ? 1 : 0; e.setAttribute('aria-hidden', String(!on)); } };

  // ---------- shared drawing ----------
  const rnd = (seed) => { let s = (seed * 9301 + 49297) % 2147483647 || 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1; };
  // Training values are illustrative; reuse Transformer's full-resolution vector renderer.
  function paint(cv, seed, lv) {
    if (!cv) return;
    const random = rnd(seed), t = Math.min(1, lv / 5);
    const values = Float32Array.from({ length: 768 }, (_, x) =>
      (1 - t) * random() * 0.75 + t * Math.sin(x * 0.55 + seed * 1.7) * Math.cos(seed) * 0.9);
    NT.viz.vec(cv, values);
  }
  // a curly brace from y0 to y1 at x: open = '{' (tip points left), otherwise '}' (tip points right). Width 20.
  const brace = (x, y0, y1, open) => { const m = (y0 + y1) / 2, d = open ? -1 : 1, w = 10; return `<path d="M${x} ${y0} q ${w * d} 0 ${w * d} 12 V ${m - 10} q 0 10 ${w * d} 10 q ${-w * d} 0 ${-w * d} 10 V ${y1 - 12} q 0 12 ${-w * d} 12" fill="none" stroke="#5b38d1" stroke-width="2.5" stroke-linecap="round"/>`; };
  const later = (ms) => (ms ? `style="opacity:0;animation:pt2in .4s ${ms}ms forwards"` : '');
  function flash(dir, ms) {
    ms = ms / sp();
    clearFlow();
    const marker = E('flowMarker');
    marker.style.animationDuration = ms + 'ms';
    void marker.offsetWidth; marker.classList.add(dir > 0 ? 'pt2-marker-forward' : 'pt2-marker-backward');
    E('tf').querySelectorAll('[data-step]').forEach(el => {
      const step = +el.dataset.step, fraction = dir > 0 ? step / 12 : (12 - step) / 12;
      void el.offsetWidth; el.style.animationDuration = Math.min(550, ms * 0.3) + 'ms'; el.style.animationDelay = Math.round(fraction * ms * 0.7) + 'ms';
      el.classList.add(dir > 0 ? 'pt2-forward' : 'pt2-backward');
    });
  }
  // the ML Visualization Player's output colors and arrows
  const MB = [[19, '#ff7171'], [39, '#ffc000'], [59, '#dbd600'], [79, '#92d050'], [100, '#00b050']];
  const mcol = (v) => (MB.find(([m]) => v <= m) || MB[4])[1];
  const ARW = { upLarge: '#1f9d55', upMedium: '#48b96d', upSmall: '#86d8a0', downLarge: '#d9534f', downMedium: '#f08a24', downSmall: '#dbd600' };
  const arrow = (p, tgt, gray, ht = 46) => { const diff = Math.abs(tgt - p); if (diff < 0.005) return ''; const up = tgt > p, band = diff >= 0.67 ? 'Large' : diff >= 0.34 ? 'Medium' : 'Small', col = gray ? '#cfd6de' : ARW[(up ? 'up' : 'down') + band];
    const sm = ht < 40, len = (sm ? 6 : 12) + diff * (sm ? 14 : 26), w = 1.2 + diff * 3.2, hd = sm ? 5 : 7, cy = ht / 2, y1 = up ? cy + len / 2 : cy - len / 2, y2 = up ? cy - len / 2 : cy + len / 2, by = up ? y2 + hd : y2 - hd;
    return `<line x1="11" y1="${y1}" x2="11" y2="${by}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><path d="M11 ${y2} L${11 - hd * 0.62} ${by} L${11 + hd * 0.62} ${by}Z" fill="${col}"/>`; };
  // the player's back-propagation panel: the curve (1 − u)² drawn in over 1.2 s with the point and dashed tangent riding its leading edge
  let gdRaf = 0;
  function gdCurve(animate) {
    const svg = E('gds'); if (!svg) return; cancelAnimationFrame(gdRaf);
    const gx = 28, gy = 14, gw = 252, gh = 164;
    let grid = ''; for (let i = 0; i < 6; i++) grid += `<line x1="${gx + i * gw / 5}" y1="${gy}" x2="${gx + i * gw / 5}" y2="${gy + gh}" stroke="#e4eaf0"/>`; for (let i = 0; i < 5; i++) grid += `<line x1="${gx}" y1="${gy + i * gh / 4}" x2="${gx + gw}" y2="${gy + i * gh / 4}" stroke="#e4eaf0"/>`;
    let d = ''; for (let i = 0; i <= 100; i++) { const u = i / 100, yy = (1 - u) * (1 - u); d += `${i ? 'L' : 'M'}${(gx + u * gw).toFixed(2)},${(gy + (1 - yy) * gh * 0.92 + gh * 0.04).toFixed(2)} `; }
    svg.innerHTML = `${grid}<line x1="${gx}" y1="${gy}" x2="${gx}" y2="${gy + gh}" stroke="#7f8b97" stroke-width="1.5"/><line x1="${gx}" y1="${gy + gh}" x2="${gx + gw}" y2="${gy + gh}" stroke="#7f8b97" stroke-width="1.5"/><path id="${P}gc" d="${d}" fill="none" stroke="#2f5f97" stroke-width="3" stroke-linecap="round"/><line id="${P}gt" stroke="#a5643a" stroke-width="3" stroke-dasharray="8 6" opacity="0"/><circle id="${P}gp" r="7" fill="#a5643a" stroke="#fff" stroke-width="2" opacity="0"/>`;
    const curve = E('gc'), len = curve.getTotalLength ? curve.getTotalLength() : 400; curve.setAttribute('stroke-dasharray', len);
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const upd = (p) => { const dp = ease(p); curve.setAttribute('stroke-dashoffset', len * (1 - dp)); const op = Math.min(1, p / 0.1); E('gp').setAttribute('opacity', op); E('gt').setAttribute('opacity', op);
      const u = 0.03 + 0.87 * dp, x = gx + u * gw, yy = (1 - u) * (1 - u), y = gy + (1 - yy) * gh * 0.92 + gh * 0.04, slope = 2 * (1 - u) * (gh * 0.92 / gw), half = gw * 0.16;
      E('gp').setAttribute('cx', x); E('gp').setAttribute('cy', y); const t = E('gt'); t.setAttribute('x1', x - half); t.setAttribute('y1', y - slope * half); t.setAttribute('x2', x + half); t.setAttribute('y2', y + slope * half); };
    if (!animate) return upd(1);
    const dur = 1200 / sp(), t0 = performance.now(); const step = (t) => { if (!E('gc')) return; const p = Math.min(1, (t - t0) / dur); upd(p); if (p < 1) gdRaf = requestAnimationFrame(step); }; upd(0); gdRaf = requestAnimationFrame(step);
  }

  // Shared parameter map: blocks run downward; heads run across each block.
  const TFX = 362, TFY = 6, TFW = 548;
  const HUE = { q: [214, 78], k: [27, 92], v: [268, 62], o: [174, 70], a: [56, 75] };
  // Same signed color mapping as Transformer / How it really works.
  function matrixPixel(hu, sa, t) {
    t = Math.max(-1, Math.min(1, t)); t = Math.sign(t) * Math.sqrt(Math.abs(t));
    const L = (t >= 0 ? 95 - 58 * t : 95 + 48 * t) / 100, S = (t >= 0 ? sa : 16) / 100;
    const C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs(((hu / 60) % 2) - 1)), M = L - C / 2;
    const [r, g, b] = hu < 60 ? [C, X, 0] : hu < 180 ? [0, C, X] : hu < 240 ? [0, X, C] : [X, 0, C];
    return [(r + M) * 255, (g + M) * 255, (b + M) * 255, 255];
  }
  function parameterImage(cv, seed, lv, kind, rows = 32, cols = 12, offset = 0) {
    if (!cv) return;
    cv.width = cols; cv.height = rows;
    const c = cv.getContext('2d'), img = c.createImageData(cols, rows), random = rnd(seed), delta = rnd(seed + 901);
    // Illustrative weights stay irregular as they change; training does not tidy matrices.
    for (let i = 0; i < offset * cols; i++) { random(); delta(); }
    for (let i = 0; i < rows * cols; i++) {
      const v = Math.max(-1, Math.min(1, random() * 0.7 + lv * 0.035 * delta()));
      const rgba = kind ? matrixPixel(...HUE[kind], v) : [...NT.div(v), 255];
      img.data.set(rgba, i * 4);
    }
    c.putImageData(img, 0, 0);
  }
  const matrix = (id, kind, cls = '') => `<canvas class="pt2-param ${cls}" id="${P}${id}" data-kind="${kind}" aria-label="${kind} matrix"></canvas>`;
  const broken = (id, kind, cls = '') => `<span class="pt2-broken ${cls}" aria-label="${cls ? 'Token embedding matrix, first and last 600 rows' : 'MLP contraction matrix, first and last 200 rows'}; middle rows omitted">${matrix(id + 'top', kind)}<span class="pt2-ellipsis" aria-hidden="true">⋯</span>${matrix(id + 'bottom', kind)}</span>`;
  const tfHTML = () => {
    let h = `<div class="pt2-tf pt2-map" id="${P}tf" style="left:${TFX}px;top:${TFY}px;width:${TFW}px;height:${H - TFY - 6}px">`;
    h += `<span class="pt2-flow-marker" id="${P}flowMarker" aria-hidden="true"></span>`;
    h += `<div class="pt2-matrices" data-step="0"><div class="pt2-matrix-label">${broken('embedding', '', 'pt2-embedding')}<span>Token embedding matrix<small>50,257 × 768</small></span></div><div class="pt2-matrix-label">${matrix('position', '', 'pt2-position')}<span>Position embedding matrix<small>1,024 × 768</small></span></div></div>`;
    h += `<div class="pt2-map-grid pt2-map-heading"><span>Block</span><div>12 attention heads<div class="pt2-map-heads">${Array.from({ length: 12 }, (_, i) => `<span>${i + 1}</span>`).join('')}</div></div><span>Out-<br>put</span><span>MLP<br>expand</span><span>MLP<br>contract</span></div>`;
    for (let b = 0; b < 12; b++) {
      h += `<div class="pt2-map-grid pt2-map-row" data-step="${b + 1}"><span class="pt2-block-number">${b + 1}</span><div class="pt2-map-heads">`;
      for (let head = 0; head < 12; head++) h += `<span class="pt2-qkv">${['q', 'k', 'v'].map((kind, q) => matrix(`h${b}_${head}_${q}`, kind)).join('')}</span>`;
      h += `</div><span>${matrix('wo' + b, 'o')}</span><span>${matrix('m1_' + b, 'a', 'pt2-expand')}</span><span>${broken('m2_' + b, 'a')}</span></div>`;
    }
    h += `<div class="pt2-map-legend">${[['q', 'Query', '768 × 64'], ['k', 'Key', '768 × 64'], ['v', 'Value', '768 × 64'], ['o', 'Output Projection', '768 × 768'], ['a', 'MLP', '768 × 3,072<br>3,072 × 768']].map(([kind, label, dims]) => `<div><span>${matrix('legend_' + kind, kind)}${label}</span><small>${dims}</small></div>`).join('')}</div></div>`;
    return h;
  };
  function paintTF(lv) {
    parameterImage(E('embeddingtop'), 19, lv, '', 25, 32);
    parameterImage(E('embeddingbottom'), 19, lv, '', 25, 32, 2000);
    parameterImage(E('position'), 29, lv, '', 32, 24);
    for (let b = 0; b < 12; b++) {
      for (let head = 0; head < 12; head++) ['q', 'k', 'v'].forEach((kind, q) => parameterImage(E(`h${b}_${head}_${q}`), 100 + b * 36 + head * 3 + q, lv, kind));
      parameterImage(E('wo' + b), 600 + b, lv, 'o', 24, 24);
      parameterImage(E('m1_' + b), 700 + b, lv, 'a', 16, 64);
      parameterImage(E('m2_' + b + 'top'), 800 + b, lv, 'a', 8, 32);
      parameterImage(E('m2_' + b + 'bottom'), 800 + b, lv, 'a', 8, 32, 120);
    }
    ['q', 'k', 'v', 'o', 'a'].forEach(kind => parameterImage(E('legend_' + kind), 100, 0, kind, 16, 16));
  }
  function clearFlow() {
    const map = E('tf'); if (!map) return;
    const marker = E('flowMarker');
    if (marker) marker.classList.remove('pt2-marker-forward', 'pt2-marker-backward');
    map.querySelectorAll('.pt2-forward,.pt2-backward,.pt2-updating').forEach(el => {
      el.classList.remove('pt2-forward', 'pt2-backward', 'pt2-updating'); el.style.animationDelay = ''; el.style.animationDuration = '';
    });
    E('sc').querySelectorAll('canvas.flF,canvas.flB').forEach(el => { el.classList.remove('flF', 'flB'); el.style.animationDelay = ''; el.style.animationDuration = ''; });
  }
  function showTF(on) {
    E('tf').style.opacity = on ? 1 : 0;
    E('tf').setAttribute('aria-hidden', String(!on));
    clearFlow();
  }
  function updateFlash() {
    clearFlow();
    E('tf').querySelectorAll('[data-step]').forEach(el => { void el.offsetWidth; el.classList.add('pt2-updating'); });
  }
  // A visible update has time to finish before another pass starts.
  function applyUpdate(M, level, painter = paintTF) {
    updateFlash();
    [0.25, 0.5, 0.75, 1].forEach((part, i) => at(M, 300 + i * 400, () => painter(level - 0.5 + part * 0.5)));
  }
  const tfLines = () => '';
  const BR_L = TFX - 26, BR_R = TFX + TFW + 24;

  // ---------- the page shell: controls, stage chevrons and ⓘ About in the sub-tab row; a two-line caption; the scene ----------
  function shell(M) {
    st().innerHTML = `<section class="panel tr-panel pt2-panel"><div class="fl-cap fixed pt2-cap" id="pbCap"></div><div class="fl-box" id="pbBox"></div></section>`;
    const subs = $('#subtabs'); subs.querySelectorAll('.pt2-ctl,.minichev').forEach((e) => e.remove());
    subs.insertAdjacentHTML('afterbegin', `<div class="fl-ctl pt2-ctl"><button class="btn" id="pbRew" title="Start over">⏮</button><button class="btn" id="pbBack">◀ Back</button><button class="btn primary" id="pbNext">Next ▶</button><button class="btn" id="pbPlay">▶ Play</button><label class="delay pt2-speed" id="pbSpeedL" hidden>Speed <input type="range" id="pbSpeed" min="0" max="${SPEEDS.length - 1}" value="${spIx}" aria-label="Animation speed"><b id="pbSpV">×${SPEEDS[spIx]}</b></label></div><div class="tr-steps minichev pt2-chev" id="pbSteps"></div>`);
    $('#pbRew').onclick = () => { M.pause(); M.go(0, true); };
    $('#pbBack').onclick = () => { M.pause(); if (M.beat > 0) M.go(M.beat - 1, false); };
    $('#pbNext').onclick = () => { M.pause(); M.next(); };
    $('#pbPlay').onclick = () => (M.playing ? M.pause() : M.play());
    $('#pbSpeed').oninput = (e) => { spIx = +e.target.value; $('#pbSpV').textContent = '×' + SPEEDS[spIx]; setSpeedVar(); };
  }
  function fit() { const box = $('#pbBox'), sc = E('sc'); if (!box || !sc) return; const top = box.getBoundingClientRect().top + window.scrollY, avail = window.innerHeight - top - 8; const k = Math.max(0.5, Math.min(1.2, box.clientWidth / SW, avail > 250 ? avail / H : 9)); sc.style.transform = `translate(${Math.max(0, (box.clientWidth - SW * k) / 2)}px,0) scale(${k})`; box.style.height = Math.ceil(H * k) + 'px'; alignQkvPixels(k); }
  // Equal CSS widths can rasterize differently after the scene is scaled.
  // Give every Q/K/V canvas the same whole-device-pixel width and snap its left edge.
  function alignQkvPixels(scale) {
    const map = E('tf'); if (!map) return;
    const ratio = window.devicePixelRatio || 1;
    const unit = parseFloat(getComputedStyle(map).getPropertyValue('--pm-u')) || 18;
    const width = Math.max(1, Math.round((unit / 6) * scale * ratio)) / (scale * ratio);
    const canvases = map.querySelectorAll('.pt2-qkv canvas');
    canvases.forEach(canvas => {
      canvas.style.width = width + 'px'; canvas.style.flexShrink = '0'; canvas.style.transform = 'none';
    });
    canvases.forEach(canvas => {
      const left = canvas.getBoundingClientRect().left;
      const offset = (Math.round(left * ratio) / ratio - left) / scale;
      canvas.style.transform = `translateX(${offset}px)`;
    });
  }
  window.addEventListener('resize', () => { if (S.station === 'mlbook' || S.station === 'rlhf') fit(); });

  // a page engine shared by both tabs: beats, chevrons, Play
  function engine(station, CH, BEATS, run) {
    const M = { beat: 0, playing: false, timer: null, tk: 0, alive: () => false, busy: false, doneAt: 0 };
    M.go = (b, animate) => {
      M.beat = b; const tk = ++M.tk, B = BEATS[b];
      M.alive = () => M.tk === tk && S.station === station && !!E('sc');
      $('#pbCap').innerHTML = `<div class="fl-ch"><b>${B.t}</b></div><div class="fl-cd">${B.d}</div>`;
      $('#pbSteps').innerHTML = CH.map(([ic, l], i) => `<button class="tr-st ${i === B.ch ? 'on' : i < B.ch ? 'done' : ''}" data-c="${i}">${ic} ${l}</button>`).join('');
      $('#pbSteps').querySelectorAll('[data-c]').forEach((x) => (x.onclick = () => { M.pause(); M.go(BEATS.findIndex((q) => q.ch === +x.dataset.c), true); }));
      $('#pbBack').disabled = b === 0; $('#pbNext').disabled = b === BEATS.length - 1;
      NT.setStatus(`Step ${b + 1} of ${BEATS.length} · ${CH[B.ch][1]}`); if (b > 0) NT.setWho(false);
      E('pop').classList.remove('on'); E('end').classList.remove('on'); if (E('next')) E('next').classList.remove('on'); cancelAnimationFrame(gdRaf);
      speedy = !!B.speedy; $('#pbSpeedL').hidden = !speedy; setSpeedVar(); M.busy = false; M.doneAt = performance.now();
      run(b, animate, M); fit(); setTimeout(fit, 60);
    };
    M.next = () => { if (M.beat < BEATS.length - 1) { M.go(M.beat + 1, true); return true; } return false; };
    // Nov 11: a beat with a staged sequence (hold) waits for the sequence to finish, then holds before moving on
    const waitOf = () => (BEATS[M.beat].hold != null ? 150 : BEATS[M.beat].wait || 3600);
    M.play = () => { M.playing = true; $('#pbPlay').textContent = '⏸ Pause'; const tick = (ms) => { M.timer = setTimeout(() => { if (!M.playing || S.station !== station) return;
      const B = BEATS[M.beat]; if (B.hold != null) { if (M.busy) return tick(150); const left = B.hold - (performance.now() - M.doneAt); if (left > 20) return tick(left); }
      if (M.next()) tick(waitOf()); else M.pause(); }, ms); }; tick(waitOf()); };
    M.pause = () => { M.playing = false; clearTimeout(M.timer); const p = $('#pbPlay'); if (p) p.textContent = '▶ Play'; };
    M.scene = { beats: () => BEATS, now: () => M.beat, ready: () => S.station === station && !!E('sc'), seek(i) { if (S.station !== station || !E('sc')) return false; M.pause(); M.go(i, false); return true; } }; // Nov 4: for the checks only
    return M;
  }
  const at = (M, ms, fn) => { const tk = M.tk; setTimeout(() => { if (M.tk === tk && M.alive()) fn(); }, ms / sp()); }; // a timer from an earlier step never fires into a later one
  // Nov 11: staged sequence: each [fn, ms] runs, then waits ms (at the current speed) before the next; the Speed slider applies from the next stage on
  function seq(M, steps) {
    const tk = M.tk; let i = 0; M.busy = true;
    const next = () => { if (M.tk !== tk || !M.alive()) return; if (i >= steps.length) { M.busy = false; M.doneAt = performance.now(); return; } const [fn, ms] = steps[i++]; if (fn) fn(); setTimeout(next, (ms || 0) / sp()); };
    next();
  }
  const pause = [null, GAP];
  const popHTML = (endText) => `<div class="pt2-pop" id="${P}pop">✔ 124,439,808 Parameters Updated</div><div class="pt2-pop pt2-end" id="${P}end">${endText}</div>`;
  const outShell = () => `<div class="pt2-gd" id="${P}gd"><svg width="300" height="192" viewBox="0 0 300 192" id="${P}gds"></svg></div>`;

  // =====================================================================================
  // 6. PRE-TRAINING: learn one example, then batches
  // =====================================================================================
  const TEXT = 'It was the best of times, it was the';
  const IDS = [1026, 373, 262, 1266, 286, 1661, 11, 340, 373, 262];
  const P0 = 0.0000322; // day-one (random) GPT-2's real probability for "worst" (#6,420 of 50,257)
  const OUTS = ['worst', 'best', 'tiger', '2', 'all others…'];
  const W_ = (k) => (k === 0 ? P0 : Math.min(1, 0.2 * k));
  const vals = (k) => { const w = W_(k), f = 1 - Math.min(1, 0.2 * k), o = [0.000021, 0.000019, 0.00002].map((x) => x * f); return [w, ...o, Math.max(0, 1 - w - o.reduce((a, x) => a + x, 0))]; };
  const fmt = (p) => (p >= 0.995 ? '100%' : p >= 0.01 ? Math.round(p * 100) + '%' : p > 0.000001 ? (p * 100).toFixed(4).replace(/0+$/, '') + '%' : '0%');
  const ROWY = (i) => 30 + i * 36;
  const SPINES = Array.from({ length: 30 }, (_, i) => [16 + ((i * 7) % 13), 170 + ((i * 37) % 50), ['#8b5e34', '#2b5aa8', '#1e8a3a', '#7a2e1d', '#5b38d1', '#b8860b', '#33455a', '#a0522d', '#0f6b8a', '#6d4c41'][(i * 3) % 10]]);
  const BOOK = 12, SHX = 230, SHY = 36;
  const taleX0 = SHX + 16 + SPINES.slice(0, BOOK).reduce((a, [w]) => a + w + 3, 0);

  const PCH = [['📚', 'Book'], ['🪪', 'Input'], ['🧠', 'Transformer'], ['➡', 'Forward Prop'], ['🎯', 'Error'], ['⬅', 'Back Prop'], ['⬇', 'Grad Desc'], ['🔁', 'Repeat'], ['📦', 'Batches']];
  const PBEATS = [
    { ch: 0, t: 'Pre-training starts in a library.', d: 'GPT-2 learned from about 8 million web pages: picture an enormous bookshelf. We’ll take down one book.' },
    { ch: 0, t: 'Take down one book: A Tale of Two Cities.', d: 'The book is our teaching example. At each position, the next token in the text supplies the training target.', wait: 4200 },
    { ch: 0, t: 'Hide the next word, and ask GPT-2 to guess it.', d: 'GPT-2 reads “It was the best of times, it was the”. The text supplies the target: the real next word, “worst”. The goal is a likely next token, not a checked fact.' },
    { ch: 1, t: 'Cut the sentence into tokens.', d: 'Ten tokens (the comma is a token too), just as in the Input tab.' },
    { ch: 1, t: 'Look up each token’s embedding vector.', d: 'The embedding matrix holds a 768-number row for each of the 50,257 tokens: 38,597,376 parameters.' },
    { ch: 1, t: 'Add each token’s position vector.', d: 'The position matrix holds a 768-number row for each of 1,024 places: 786,432 more parameters.' },
    { ch: 2, t: 'Transformer parameters: 12 blocks, each with 12 Detectives and an MLP.', d: 'Each head has Q, K and V matrices. Each block also learns an output projection and two MLP matrices. Matrix values here are illustrative.', wait: 4600 },
    { ch: 3, t: 'Forward propagation: the guess.', d: 'Calculated information moves down through blocks 1–12; parameters stay fixed during the forward pass. Day-one GPT-2 is random: “worst” gets almost nothing.' },
    { ch: 4, t: 'Error: compare each output with its target.', d: 'The text supplies the target, “worst”. Lower probability for that token means greater loss.' },
    { ch: 5, t: 'Back propagation: how does each parameter affect the error?', d: 'Working backward, GPT-2 calculates gradients: how parameter changes affect loss.', wait: 4000 },
    { ch: 6, t: 'Gradient descent: update parameters to reduce loss.', d: 'BP calculates gradients. GD uses them with the learning rate to update parameters; the curve illustrates the slopes.', wait: 4000 },
  ];
  for (let j = 1; j <= 5; j++) PBEATS.push({ ch: 7, k: j, wait: 9800, speedy: true, hold: 1500, t: j < 5 ? `Illustrated pass ${j}: forward, error, back propagation, gradient descent.` : 'Illustrated pass 5: “worst” = 100%, every other token = 0%.', d: j < 5 ? `With the nudged parameters, “worst” now gets ${j * 20}%. The arrows shrink.` : 'An idealized illustration: real training does not guarantee 100% confidence.' });
  // Nov 11 (Greg): after the example ends, the target joins the context and training moves on to the next word
  PBEATS.push({ ch: 7, nw: true, wait: 6000, t: 'The target word joins the context. Training moves on.', d: '“worst” is added to the text and becomes the newest token. Its next word in the book, “of”, is the next training target.' });
  PBEATS.push({ ch: 8, wait: 65000, speedy: true, hold: 2500, t: 'Pre-training uses batches: here, a third of the shelf at a time.', d: 'Each bar shows the probability assigned to the target token in a different example. Losses are combined before BP and the parameter update; values are illustrative.' });
  const PB = PBEATS.length - 1; // the batch beat
  const passOf = (b) => (b < 7 ? null : b <= 10 ? 0 : PBEATS[b].k);
  const levelOf = (b) => (b < 10 ? 0 : b === 10 ? 1 : Math.min(5, (PBEATS[b].k || 5) + 1));

  function preBuild() {
    let h = `<div class="pt2" id="${P}sc" style="width:${SW}px;height:${H}px"><svg class="pt2-svg" id="${P}svg" width="${SW}" height="${H}" viewBox="0 0 ${SW} ${H}"></svg>`;
    h += `<div class="pt2-shelf" id="${P}shelf" style="left:${SHX}px;top:${SHY}px">${SPINES.map(([w, ht, c], i) => (i === BOOK ? `<div class="pt2-gap" style="width:38px"></div>` : `<div class="pt2-spine" style="width:${w}px;height:${ht}px;background:${c}"></div>`)).join('')}<div class="pt2-board"></div></div><div class="pt2-shcap" id="${P}shcap" style="left:${SHX}px;top:${SHY + 268}px">A bookshelf of all the world’s digitized knowledge</div>`;
    h += `<div class="pt2-spine pt2-tale" id="${P}tale" style="left:${taleX0}px;top:${SHY + 22}px;height:228px"><span>A Tale of Two Cities</span></div>`;
    h += `<div class="pt2-book" id="${P}book"><div class="pg l"><div class="bt">A TALE OF TWO CITIES</div><div class="ba">Charles Dickens · 1859</div><div class="bc">Book the First<br>Recalled to Life</div><div class="bc">Chapter I<br>The Period</div></div><div class="pg r"><p><span class="hl">It was the best of times, it was the</span> <b class="wr">worst</b> of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity…</p></div></div>`;
    const RM = NT.repMarks(IDS.map((id) => NT.tokText(id))); IDS.forEach((id, i) => { const t = NT.tokText(id); h += `<div class="pt2-tok${i === IDS.length - 1 ? ' last' : ''}" id="${P}t${i}">${esc(t.trim() || t)}${RM[i]}</div>`; });
    h += `<div class="pt2-tok last" id="${P}t10" style="left:20px;top:${ROWY(10)}px;opacity:0">worst</div>`; // Nov 11: the target, added after the example ends
    h += `<div class="pt2-mh" id="${P}evh" style="left:95px;top:8px">Embedding vectors</div><div class="pt2-mh" id="${P}pvh" style="left:236px;top:8px">Position vectors</div>`;
    for (let i = 0; i < 10; i++) h += `<canvas class="fx fl-strip" data-x="150" id="${P}e${i}" style="left:95px;top:${ROWY(i) + (26 - NT.viz.vectorSize(768, 110).height) / 2}px;width:110px;height:${NT.viz.vectorSize(768, 110).height}px"></canvas><div class="pt2-plus" id="${P}pl${i}" style="left:210px;top:${ROWY(i) + 2}px">+</div><canvas class="fx fl-strip" data-x="260" id="${P}p${i}" style="left:228px;top:${ROWY(i) + (26 - NT.viz.vectorSize(768, 110).height) / 2}px;width:110px;height:${NT.viz.vectorSize(768, 110).height}px"></canvas>`;
    { const vh = NT.viz.vectorSize(768, 110).height; h += `<canvas class="fx fl-strip" id="${P}e10" style="left:95px;top:${ROWY(10) + (26 - vh) / 2}px;width:110px;height:${vh}px;opacity:0"></canvas><div class="pt2-plus" id="${P}pl10" style="left:210px;top:${ROWY(10) + 2}px;opacity:0">+</div><canvas class="fx fl-strip" id="${P}p10" style="left:228px;top:${ROWY(10) + (26 - vh) / 2}px;width:110px;height:${vh}px;opacity:0"></canvas>`; }
    // the batch shelf (left) and the stylized vocabulary output (right)
    h += `<div class="pt2-bsh" id="${P}bsh"><div class="pt2-bsp">${SPINES.map(([, ht, c], i) => `<i id="${P}bs${i}" style="height:${Math.round(ht * 0.5)}px;background:${c}"></i>`).join('')}</div><div class="pt2-board"></div><div class="pt2-bcap" id="${P}bcap"></div></div>`;
    h += `<div class="pt2-voc" id="${P}voc"><div class="pt2-batch-key">Target-token probability · one bar per example</div>${Array.from({ length: 10 }, (_, i) => `<div class="pt2-vr"><span class="pt2-example">${i + 1}<small id="${P}vp${i}"></small></span><span class="bar"><i id="${P}vb${i}"></i></span><svg width="22" height="26" id="${P}va${i}"></svg></div>`).join('')}</div>`;
    h += tfHTML();
    h += `<div class="pt2-out" id="${P}out">${OUTS.map((w, i) => `<div class="pt2-orow ${i ? '' : 'tgt'}" id="${P}o${i}"><b>${esc(w)}</b><span class="v" id="${P}ov${i}"></span><span class="bar"><i id="${P}ob${i}"></i></span><svg width="22" height="46" id="${P}oa${i}"></svg></div>`).join('')}</div>`;
    h += outShell() + popHTML('This example ends here. Real training combines many next-token targets in batches; it does not wait for one token to reach 100%.');
    h += `<div class="pt2-pop pt2-end" id="${P}next">The process continues automatically: GPT-2 now trains on the next word in the book. “It was the best of times, it was the worst” → target “of”, and so on through every word of every book.</div>`;
    return h + '</div>';
  }
  function preOut(k, arrows, focus) {
    vals(k).forEach((p, i) => {
      const gray = focus && i > 0;
      E('ov' + i).textContent = fmt(p); E('o' + i).classList.toggle('gray', !!gray);
      const bar = E('ob' + i); bar.style.width = Math.max(0.6, p * 100) + '%'; bar.style.background = gray ? '#cfd6de' : mcol(p * 100);
      E('oa' + i).innerHTML = arrows ? arrow(p, i === 0 ? 1 : 0, gray) : '';
    });
  }
  function prePaint(lv) { for (let i = 0; i < 10; i++) { paint(E('e' + i), IDS[i] % 997, lv); paint(E('p' + i), 50 + i, lv); } paintTF(lv); }
  // the stylized batch output: 10 rows, each nudged a little toward its own target every round (never all the way)
  const BATCH_FINAL = [0.84, 0.43, 0.67, 0.19, 0.76, 0.55, 0.91, 0.32, 0.62, 0.48];
  const vocVals = (bt, rd) => BATCH_FINAL.map((_, i) => {
    const end = BATCH_FINAL[(i + bt * 5) % 10];
    // A different set of examples in each batch; a few fluctuate rather than improve.
    const delta = i % 4 === 0 ? -0.025 : 0.06 + (i % 3) * 0.025;
    return [Math.max(0.02, end - (2 - rd) * delta), 1];
  });
  function vocOut(bt, rd, arrows = true) { vocVals(bt, rd).forEach(([p, tgt], i) => {
    const b = E('vb' + i); b.style.width = p * 100 + '%'; b.style.background = mcol(p * 100);
    E('vp' + i).textContent = Math.round(p * 100) + '%'; E('va' + i).innerHTML = arrows ? arrow(p, tgt, false, 26) : '';
  }); }
  function batchShelf(bt) { SPINES.forEach((_, i) => { const e = E('bs' + i), g = Math.floor(i / 10); e.className = bt >= 3 ? 'done' : g === bt ? 'on' : g < bt ? 'done' : ''; }); E('bcap').textContent = bt < 0 ? 'The whole shelf' : bt >= 3 ? 'Three batches complete · predictions still vary' : `Batch ${bt + 1} of 3: books ${bt * 10 + 1}–${bt * 10 + 10}`; }

  // Nov 11 (Greg): the right brace fades with the output list; forward propagation hides both and the curve panel
  const rightBrace = (y1, hidden) => `<g id="${P}brR" style="transition:opacity .6s${hidden ? ';opacity:0' : ''}">${brace(BR_R, 14, y1, true)}</g>`;
  const leftBrace = (rows) => brace(BR_L, ROWY(0) - 2, ROWY(rows - 1) + 28, false);
  const rightOn = (on, list = 'out') => { vis(list, on); const g = E('brR'); if (g) g.style.opacity = on ? 1 : 0; };
  function blankOut() { OUTS.forEach((_, i) => { E('ov' + i).textContent = ''; E('o' + i).classList.remove('gray'); E('ob' + i).style.width = '0%'; E('oa' + i).innerHTML = ''; }); }
  // the 11th token row: "worst" with its embedding and position vectors
  const NEWTXT = TEXT + ' worst', NEWMARK = { band: 0, tip: 'Training target from the book · added to the context' };
  function newRow(parts) {
    ['t10', 'e10', 'pl10', 'p10'].forEach((id) => { E(id).style.transitionDelay = '0ms'; E(id).style.opacity = parts.includes(id) ? 1 : 0; });
    E('t9').classList.toggle('last', !parts.includes('t10'));
    if (parts.includes('e10')) paint(E('e10'), 4785 % 997, 5);
    if (parts.includes('p10')) paint(E('p10'), 60, 5);
  }
  function flyWorst(M) {
    const from = E('o0').querySelector('b'), to = $('#sentBack'), a = from.getBoundingClientRect(), targets = [E('t10').getBoundingClientRect()];
    if (to) { const mk = document.createElement('span'); mk.textContent = '\u200b'; to.appendChild(mk); targets.push(mk.getBoundingClientRect()); mk.remove(); }
    const bd = NT.BANDS[0];
    const flies = targets.map((t) => { const f = document.createElement('div'); f.className = 'pk-fly'; f.textContent = 'worst'; f.style.cssText = `left:${a.left}px;top:${a.top}px;background:${bd.bg};color:${bd.fg}`; document.body.appendChild(f);
      requestAnimationFrame(() => requestAnimationFrame(() => (f.style.transform = `translate(${t.left - a.left}px,${t.top - a.top}px)`))); return f; });
    setTimeout(() => flies.forEach((f) => f.remove()), 950);
    at(M, 950, () => { newRow(['t10']); NT.setText(NEWTXT, 'append', NEWMARK); });
    at(M, 1350, () => newRow(['t10', 'e10']));
    at(M, 1750, () => { newRow(['t10', 'e10', 'pl10', 'p10']); E('brL').innerHTML = leftBrace(11); });
    at(M, 2600, () => E('next').classList.add('on'));
  }
  function preRun(b, animate, M) {
    const inC = b >= 6, batch = b === PB, nw = !!PBEATS[b].nw, show = (id, on) => { const e = E(id); if (e) e.style.opacity = on ? 1 : 0; };
    if (S.text !== TEXT && !(nw && !animate)) NT.setText(TEXT, 'edit'); // the added word leaves the context on every other beat
    // the book: off the shelf, tilting up and to the right, then to just left of the whole shelf; the open book appears after it lands
    show('shelf', b === 0 || (b === 1 && animate)); E('shelf').style.transitionDelay = b === 1 && animate ? '900ms' : '0ms'; if (b === 1 && animate) at(M, 50, () => (E('shelf').style.opacity = 0)); show('shcap', b === 0);
    const tale = E('tale'); tale.style.opacity = b <= 2 ? 1 : 0;
    if (b === 0) { tale.style.transition = animate ? 'left .8s, top .5s, transform .5s, opacity .5s' : 'none'; tale.style.left = taleX0 + 'px'; tale.style.top = SHY + 22 + 'px'; tale.style.transform = 'none'; }
    else if (b === 1 && animate) {
      tale.style.transition = 'left .8s, top .5s, transform .5s, opacity .5s'; tale.style.left = taleX0 + 'px'; tale.style.top = SHY - 24 + 'px'; tale.style.transform = 'rotate(10deg)';
      at(M, 550, () => { tale.style.left = SHX - 62 + 'px'; tale.style.top = SHY + 20 + 'px'; });
    } else if (b <= 2) { tale.style.transition = 'none'; tale.style.left = SHX - 62 + 'px'; tale.style.top = SHY + 20 + 'px'; tale.style.transform = 'rotate(10deg)'; }
    const bk = E('book'); bk.style.transitionDelay = b === 1 && animate ? '1500ms' : '0ms'; bk.style.opacity = b === 1 || b === 2 ? 1 : 0; bk.classList.toggle('read', b === 2);
    // tokens and vectors
    const left = b >= 3 && !batch;
    IDS.forEach((_, i) => { const e = E('t' + i); if (b < 3) { e.style.left = 560 + i * 26 + 'px'; e.style.top = '90px'; e.style.opacity = 0; } else { e.style.left = '20px'; e.style.top = ROWY(i) + 'px'; e.style.opacity = left ? 1 : 0; e.style.transitionDelay = b === 3 && animate ? i * 90 + 'ms' : '0ms'; } });
    show('evh', left && b >= 4); show('pvh', left && b >= 5);
    for (let i = 0; i < 10; i++) { const e = E('e' + i), p = E('p' + i); e.style.opacity = left && b >= 4 ? 1 : 0; e.style.transitionDelay = b === 4 && animate ? i * 70 + 'ms' : '0ms'; p.style.opacity = left && b >= 5 ? 1 : 0; p.style.transitionDelay = b === 5 && animate ? i * 70 + 'ms' : '0ms'; E('pl' + i).style.opacity = left && b >= 5 ? 1 : 0; }
    newRow(nw && !animate ? ['t10', 'e10', 'pl10', 'p10'] : []);
    showTF(inC, b === 6 && animate);
    show('out', b >= 7 && !batch); show('gd', b >= 9); show('bsh', batch); show('voc', batch);
    let g = ''; if (inC) g += `<g id="${P}brL">${batch ? brace(BR_L, 60, 300, false) : leftBrace(nw && !animate ? 11 : 10)}</g>` + tfLines(b === 6 && animate); if (b >= 7) g += rightBrace(batch ? 214 : 200, batch && animate); E('svg').innerHTML = g;
    const lv = levelOf(b), k = passOf(b);
    if (b < 7) { prePaint(0); return; }
    if (batch) return preBatch(animate, M);
    if (b <= 10) {
      prePaint(b === 10 && animate ? 0 : lv); preOut(0, b >= 8, b === 9);
      if (b >= 9) gdCurve(animate && b === 9);
      if (animate && b === 9) flash(-1, 1400);
      if (animate && b === 7) { rightOn(false); blankOut(); flash(1, 1400); at(M, 1500, () => rightOn(true)); at(M, 1900, () => preOut(0, false, false)); }
      if (b === 10) { if (animate) { applyUpdate(M, lv, prePaint); at(M, 1900, () => { prePaint(lv); E('pop').classList.add('on'); }); } else E('pop').classList.add('on'); }
      return;
    }
    if (nw) {
      prePaint(lv); preOut(5, true, false); vis('gd', false);
      if (!animate) { if (S.text !== NEWTXT) NT.setText(NEWTXT, 'append', NEWMARK); E('next').classList.add('on'); return; }
      at(M, 300, () => flyWorst(M));
      return;
    }
    if (!animate) { prePaint(lv); preOut(k, true, false); gdCurve(false); vis('gd', k < 5); E(k < 5 ? 'pop' : 'end').classList.add('on'); return; }
    // Nov 11 (Greg): forward (list, brace and curve hidden) → list returns and its bars move → arrows → curve with BP → GD → stop at the notice; 0.5 s between stages
    prePaint(k); preOut(k - 1, false, false); gdCurve(false); rightOn(false); vis('gd', false);
    const steps = [
      [() => flash(1, 1300), 1300], pause,
      [() => { rightOn(true); at(M, 400, () => preOut(k, false, false)); }, 1500], pause,
    ];
    if (k < 5) steps.push(
      [() => preOut(k, true, false), 300], pause,
      [() => { vis('gd', true); preOut(k, true, true); gdCurve(true); flash(-1, 1300); }, 1400], pause,
      [() => { preOut(k, true, false); applyUpdate(M, lv, prePaint); }, 1800],
      [() => { prePaint(lv); E('pop').classList.add('on'); }, 0]);
    else steps.push([() => E('end').classList.add('on'), 0]);
    seq(M, steps);
  }
  // Every batch round includes the complete curve and a clearly separated update.
  function preBatch(animate, M) {
    gdCurve(false); prePaint(5);
    if (!animate) { batchShelf(3); vocOut(2, 2); prePaint(9.5); return; }
    // Nov 11 (Greg): each round uses the pass sequence; the update notice shows for 0.5 s and the rounds run straight through
    batchShelf(-1); vocOut(0, -1, false); rightOn(false, 'voc'); vis('gd', false);
    const steps = [[null, 600]];
    for (let bt = 0; bt < 3; bt++) for (let rd = 0; rd < 3; rd++) steps.push(
      [() => { if (rd === 0) batchShelf(bt); rightOn(false, 'voc'); vis('gd', false); flash(1, 700); at(M, 650, () => vocOut(bt, rd - 1, false)); }, 1000], pause,
      [() => { rightOn(true, 'voc'); at(M, 400, () => vocOut(bt, rd, false)); }, 1100], pause,
      [() => vocOut(bt, rd, true), 300], pause,
      [() => { vis('gd', true); gdCurve(true); flash(-1, 1400); }, 1400], pause,
      [() => applyUpdate(M, 5.5 + (bt * 3 + rd) * 0.5, prePaint), 1800],
      [() => E('pop').classList.add('on'), GAP],
      [() => E('pop').classList.remove('on'), 400]);
    steps.push([() => batchShelf(3), 0]);
    seq(M, steps);
  }
  const PRE = engine('mlbook', PCH, PBEATS, preRun);
  NT.stations.mlbook = {
    init() {
      PRE.pause();
      if (NT.current().text !== TEXT) { S.bookSaved = S.bookSaved ?? S.text; this.switching = true; NT.setText(TEXT, 'edit'); this.switching = false; }
      shell(PRE); $('#pbBox').innerHTML = preBuild(); PRE.go(PRE.beat, true);
    },
    onText() {}, onTK() {}, scene: PRE.scene,
  };

  // =====================================================================================
  // 7. POST-TRAINING (RLHF): the whole response gets one grade, F → C → B → A; then batches of documents
  // =====================================================================================
  const STORY = 'The banker left the bank and sat on the left bank of the';
  const PROMPTS = ['Continue this story in two sentences.', 'Explain why leaves look green.', 'Give three ways to save water.', 'Summarize a story in one sentence.', 'Explain a fraction with an example.', 'Suggest a kind reply to a friend.'];
  // Symbolic tokens use the same likelihood bands as the earlier tabs. Not quality scores.
  const CHIPS = (() => { const r = rnd(42), out = []; for (let i = 0; i < 90; i++) { const u = r() * 0.5 + 0.5; out.push([22 + Math.round((r() * 0.5 + 0.5) * 38), u < .38 ? 0 : u < .62 ? 1 : u < .8 ? 2 : u < .92 ? 3 : 4]); } return out; })();
  const chipHTML = (n, version = 0) => CHIPS.slice(0, n).map((_, i) => {
    const [w, band] = CHIPS[(i + version * 7) % CHIPS.length];
    return `<i style="width:${w}px;background:${BAND(band)}"></i>`;
  }).join('');
  const GRADES = { F: ['#c00000', .2], C: ['#f08a24', .5], B: ['#7fae2c', .75], A: ['#1e8a3a', .9] };
  const stamp = (g, small) => `<div class="pt2-stamp ${small ? 'sm' : ''}" style="--g:${GRADES[g][0]}"><b>${g}</b></div>`;
  const QCH = [['👥', 'Human feedback'], ['🧠', 'Transformer'], ['➡', 'Generate'], ['▣', 'Score'], ['⬅', 'Back Prop'], ['⬇', 'Grad Desc'], ['🔁', 'Repeat'], ['📦', 'Batches']];
  const QBEATS = [
    { ch: 0, t: 'People compare responses. A separate scorer learns their preferences.', d: 'First, training on example prompt–response pairs teaches instruction following. Here, human comparisons teach a reward model which responses people prefer.', wait: 6000 },
    { ch: 1, t: 'The response model uses the same kinds of learned matrices.', d: 'This is a GPT-2-shaped teaching diagram for later assistant training. The scorer is a separate model; its parameters stay fixed in the loop below.', wait: 4600 },
    { ch: 2, t: 'Generate a response, one next token at a time.', d: 'Each forward sweep adds a token. The growing response joins the prompt as context. Token colors show likelihood bands, not quality.', wait: 6500 },
    { ch: 3, t: 'The trained scorer evaluates the completed response.', d: 'The prompt and response go to the reward model. Letter grades illustrate its score; they are not correctness probabilities.', wait: 3500 },
    { ch: 4, t: 'Backpropagation: calculate gradients from the training objective.', d: 'The reward score helps define an objective that also discourages excessive change. BP calculates gradients; the curve is a simplified illustration.', wait: 4000 },
    { ch: 5, t: 'Gradient descent: update the response model’s parameters.', d: 'Watch the outlined matrices change. The scorer stays fixed; the response model learns from the objective, not from differentiating through a human grade.', wait: 4000 },
  ];
  ['C', 'B', 'A'].forEach((g, j) => QBEATS.push({ ch: 6, g, wait: 13000, speedy: true, hold: 1500, t: `Illustrated round ${j + 2}: generate, score, BP, update.`, d: 'The same prompt makes changes easy to compare. Responses and scores here are symbolic; real updates do not guarantee improvement.' }));
  QBEATS.push({ ch: 7, wait: 34000, speedy: true, hold: 2500, t: 'Many prompts and responses contribute to a batch update.', d: 'Six examples are shown together. Generate → score → combined objective → BP → update. Each miniature document represents a separate response.' });
  const QB = QBEATS.length - 1;
  const BATCH_G = [['F', 'C', 'B', 'F', 'C', 'C'], ['C', 'A', 'C', 'B', 'B', 'C'], ['B', 'C', 'A', 'C', 'B', 'A']];
  function responseDoc(id, tiny = false) {
    return `<div class="pt2-doc ${tiny ? 'tiny' : 'mid'}"><div class="dl">${tiny ? 'Response' : 'Generated response · symbolic tokens'}</div><div class="dc" id="${P}${id}"></div></div>`;
  }
  const humanAssessment = () => `<svg class="pt2-human-icon" width="68" height="52" viewBox="0 0 68 52" role="img" aria-label="People comparing responses"><circle cx="18" cy="12" r="9" fill="#cf9974"/><path d="M3 45V34c0-14 30-14 30 0v11" fill="#526b8c"/><circle cx="49" cy="12" r="9" fill="#e3b590"/><path d="M35 45V34c0-14 30-14 30 0v11" fill="#7b688d"/><rect x="25" y="27" width="20" height="24" rx="3" fill="#fff" stroke="#526077" stroke-width="2"/><path d="M29 34h12M29 39h5m0 5 3 3 6-8" fill="none" stroke="#28764b" stroke-width="2"/></svg>`;
  function postBuild() {
    let h = `<div class="pt2 pt2-post" id="${P}sc" style="width:${SW}px;height:${H}px"><svg class="pt2-svg" id="${P}svg" width="${SW}" height="${H}" viewBox="0 0 ${SW} ${H}"></svg>`;
    h += `<div class="pt2-prompt" id="${P}prompt"><b>Prompt</b><p>${PROMPTS[0]}</p><div class="pt2-story">${STORY.split(' ').map(w => `<span>${w}</span>`).join('')}</div><small>+ generated tokens become context</small><div class="pt2-context dc" id="${P}context"></div></div>`;
    h += `<div class="pt2-human" id="${P}human"><div class="pt2-human-heading">${humanAssessment()}<b>People compare complete responses</b></div><p class="pt2-human-question">Which response better follows the request?</p><div class="pt2-preferences"><div>Response A<p>Bank. Bank. Bank.</p></div><div id="${P}preferred">Response B<p>…river. He watched the water flow past.</p><strong id="${P}choice">✓ Preferred</strong></div></div><div class="pt2-learn-arrow">Many human comparisons → train the scorer</div></div>`;
    h += `<div class="pt2-human-source" id="${P}humanSource">${humanAssessment()}<span><b>Human preferences</b><small>Comparisons teach the scorer</small><strong>↓</strong></span></div><div class="pt2-scorer" id="${P}scorer"><span class="pt2-score-icon">▥</span><div><b>Reward model</b><small>Learned from human comparisons</small><small id="${P}scorerState">Scores the prompt + response</small></div></div><div class="pt2-phase" id="${P}phase" aria-live="polite"></div>`;
    h += `<div class="pt2-batch-prompts" id="${P}batchPrompts"><b>Different prompts</b>${PROMPTS.map((p, i) => `<p><span>${i + 1}</span> ${p}</p>`).join('')}</div>`;
    h += tfHTML();
    h += `<div class="pt2-gout" id="${P}gout"><div class="pt2-gdoc">${responseDoc('response')}<div class="pt2-gst" id="${P}gst"></div></div><div class="pt2-grow" id="${P}grow"><small>Illustrative score</small><span class="v" id="${P}gv"></span><span class="bar"><i id="${P}gb"></i></span><svg width="22" height="46" id="${P}ga"></svg></div></div>`;
    h += `<div class="pt2-bout" id="${P}bout">${Array.from({length:6}, (_, i) => `<div class="pt2-bcell"><div class="pt2-gdoc"><small>Prompt ${i + 1}</small>${responseDoc('batchResponse' + i, true)}<div class="pt2-gst" id="${P}bst${i}"></div></div><span class="bar"><i id="${P}bb${i}"></i></span><svg width="22" height="30" id="${P}ba${i}"></svg></div>`).join('')}</div>`;
    h += outShell() + popHTML('Keep training across varied prompts. A higher reward is not a guarantee of truth.');
    return h + '</div>';
  }
  function grade(g, arrows) {
    E('gst').innerHTML = g ? stamp(g) : ''; const p = g ? GRADES[g][1] : 0;
    E('gv').textContent = g || ''; const b = E('gb'); b.style.width = p * 100 + '%'; b.style.background = mcol(p * 100);
    E('ga').innerHTML = g && arrows ? arrow(p, 1, false) : '';
  }
  function batchGrades(bt, arrows = true) { if (bt < 0) { for (let i = 0; i < 6; i++) { E('bst' + i).innerHTML = ''; E('bb' + i).style.width = '0%'; E('ba' + i).innerHTML = ''; } return; }
    BATCH_G[bt].forEach((g, i) => { E('bst' + i).innerHTML = stamp(g, true); const p = GRADES[g][1], b = E('bb' + i); b.style.width = p * 100 + '%'; b.style.background = mcol(p * 100); E('ba' + i).innerHTML = arrows ? arrow(p, 1, false, 30) : ''; }); }
  function clearBatch() { for (let i = 0; i < 6; i++) { E('bst' + i).innerHTML = ''; E('bb' + i).style.width = '0%'; E('ba' + i).innerHTML = ''; E('batchResponse' + i).innerHTML = ''; } }
  function phase(text) { E('phase').textContent = text; }
  function showResponse(n, version = 0, batch = false) {
    if (batch) { for (let i = 0; i < 6; i++) E('batchResponse' + i).innerHTML = chipHTML(n, version + i); }
    else { E('response').innerHTML = chipHTML(n, version); E('context').innerHTML = chipHTML(n, version); }
  }
  function generate(M, version, batch = false, start = 0) {
    const count = batch ? 12 : 24; let time = start;
    at(M, start, () => { phase(batch ? 'Generate responses · parallel examples' : 'Generate · parameters fixed'); E('scorerState').textContent = 'Waiting for completed responses'; showResponse(0, version, batch); });
    for (let i = 0; i < count; i++) {
      const duration = 180; // Nov 11 (Greg): no slower first tokens
      at(M, time, () => flash(1, duration));
      time += duration;
      at(M, time, () => showResponse(i + 1, version, batch));
    }
    at(M, time, () => { clearFlow(); phase('Response complete'); });
    return time;
  }
  function evaluate(M, atTime, g, batch = false) {
    at(M, atTime, () => { phase('Prompt + response → reward model'); E('scorer').classList.add('scoring'); E('scorerState').textContent = 'Evaluating…'; });
    at(M, atTime + 1000, () => { E('scorer').classList.remove('scoring'); E('scorerState').textContent = 'Score → training objective'; if (batch) batchGrades(g); else grade(g, true); phase(batch ? 'Combine learning signals across the batch' : 'Score → training objective'); });
  }
  // Nov 11 (Greg): generate (score and curve hidden) → reward model scores → score bar moves from the last grade → arrows → curve with BP → GD → update notice; 0.5 s between stages
  const noScore = (on, batch) => E(batch ? 'bout' : 'gout').classList.toggle('pt2-noscore', on);
  const setGrade = (g, arrows, batch) => (batch ? batchGrades(g, arrows) : grade(g, arrows));
  function postCycle(M, version, g, prev, level, batch = false) {
    return [
      [() => { noScore(true, batch); vis('gd', false); if (batch) { clearBatch(); batchGrades(prev, false); } else grade(prev, false); generate(M, version, batch, 0); }, (batch ? 12 : 24) * 180], pause,
      [() => { phase('Prompt + response → reward model'); E('scorer').classList.add('scoring'); E('scorerState').textContent = 'Evaluating…'; }, 1000],
      [() => { E('scorer').classList.remove('scoring'); E('scorerState').textContent = 'Score → training objective'; noScore(false, batch); phase(batch ? 'Combine learning signals across the batch' : 'Score → training objective'); }, 400],
      [() => setGrade(g, false, batch), 1100], pause,
      [() => setGrade(g, true, batch), 300], pause,
      [() => { phase('BP · calculate gradients'); vis('gd', true); gdCurve(true); flash(-1, 1400); }, 1400], pause,
      [() => { phase('GD · update response-model parameters'); applyUpdate(M, level); }, 1800],
      [() => { phase('Parameters updated · ready for another response'); E('scorerState').textContent = 'Scorer parameters stay fixed'; E('pop').classList.add('on'); }, batch ? GAP : 0],
      ...(batch ? [[() => E('pop').classList.remove('on'), 400]] : []),
    ];
  }
  function postRun(b, animate, M) {
    const batch = b === QB, show = (id, on) => { E(id).style.opacity = on ? 1 : 0; E(id).setAttribute('aria-hidden', String(!on)); };
    show('prompt', !batch); show('human', b === 0); show('humanSource', false); show('scorer', true); show('batchPrompts', batch); show('phase', b === 0); // Nov 11: only the reward model card stays
    noScore(false, false); noScore(false, true);
    show('gout', b >= 2 && !batch); show('bout', batch); show('gd', b >= 4);
    E('scorer').classList.remove('scoring'); E('scorerState').textContent = b === 0 ? 'Learns to predict human preferences' : 'Scorer parameters stay fixed during response-model training';
    E('scorer').style.left = '955px'; E('scorer').style.top = b === 0 ? '180px' : '218px'; // Nov 11: between the output and the curve
    E('phase').style.left = b === 0 ? '955px' : '14px'; E('phase').style.top = b === 0 ? '260px' : '450px';
    E('choice').style.opacity = b === 0 && animate ? 0 : 1;
    if (b === 0 && animate) at(M, 1200, () => E('choice').style.opacity = 1);
    showTF(b >= 1); E('svg').innerHTML = b >= 1 ? brace(BR_L, 14, 210, false) + (b >= 2 ? brace(BR_R, 14, 210, true) : '') : '';
    const level = b < 5 ? 5 : b === 5 ? 6 : batch ? 10.5 : b + 1;
    paintTF(animate && b >= 5 ? level - (batch ? 1.5 : 1) : level);
    grade(null); showResponse(b >= 3 ? 24 : 0, b >= 6 ? b - 5 : 0); clearBatch();
    phase(b === 0 ? 'Human preferences teach the scorer' : 'Prompt → response model');
    if (b < 2) return;
    if (batch) {
      gdCurve(false);
      if (!animate) { showResponse(12, 6, true); batchGrades(2); phase('Three illustrative batch updates complete'); return; }
      vis('gd', false);
      const steps = [[null, 200]];
      for (let bt = 0; bt < 3; bt++) steps.push(...postCycle(M, bt * 2, bt, bt - 1, 9.5 + bt * .5, true));
      steps.push([() => phase('Three illustrative batch updates complete'), 0]);
      seq(M, steps);
      return;
    }
    if (b === 2) { if (animate) generate(M, 0); else showResponse(24); return; }
    if (b === 3) { if (animate) evaluate(M, 0, 'F'); else grade('F', true); return; }
    if (b <= 5) {
      grade('F', true); gdCurve(animate && b === 4);
      if (b === 4) { phase('BP · calculate gradients'); if (animate) flash(-1, 1400); }
      if (b === 5) { phase('GD · update response-model parameters'); if (animate) applyUpdate(M, level); }
      return;
    }
    const g = QBEATS[b].g;
    if (!animate) { grade(g, true); gdCurve(false); phase('Parameters updated · ready for another response'); E('pop').classList.add('on'); return; }
    gdCurve(false); seq(M, postCycle(M, b - 5, g, { C: 'F', B: 'C', A: 'B' }[g], level));
  }
  const POST = engine('rlhf', QCH, QBEATS, postRun);
  NT.stations.rlhf = {
    init() { POST.pause(); shell(POST); $('#pbBox').innerHTML = postBuild(); POST.go(POST.beat, true); },
    onText() {}, onTK() {}, scene: POST.scene,
  };
})();
