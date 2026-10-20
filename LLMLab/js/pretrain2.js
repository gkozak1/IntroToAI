/* LLM Lab — tab 6 Pre-Training and tab 7 Post-Training (Oct 16–17, from Greg's sketches and notes).
   One shared scene: a left area (Pre: book → tokens → embedding + position vectors · Post: a response document), a "}" brace,
   the transformer seen as its parameters (12 blocks × 12 interviewers with Q/K/V strips + a fact checker per block; callouts for one
   head's Q/K/V and one fact checker's two matrices, with GPT-2's real sizes), a "{" brace, and the output on the right drawn like the
   ML Visualization Player (Pre: rows worst · best · tiger · 2 · all others with error arrows · Post: the graded response with an
   F/C/B/A stamp and one score bar), plus the player's back-propagation curve and tangent. Forward propagation flashes every parameter
   left → right; gradient descent flashes them right → left and ends with "124,439,808 parameters updated".
   Pre: 5 repeats take "worst" 20% → 100% (idealized, smooth, as in the player); then the batch beat: the shelf goes through a third at
   a time, 3 quick rounds each, the parameters tuned but never perfectly. Post (RLHF): the whole response gets one grade, F → C → B → A;
   then 3 batches of documents with mixed grades. The page's player controls sit in the sub-tab row with the stage chevrons. */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const st = () => $('#stage');
  const SW = 1290, H = 486, P = 'pb_', E = (id) => document.getElementById(P + id);
  const BAND = (i) => NT.BANDS[i].bg;

  // ---------- shared drawing ----------
  const rnd = (seed) => { let s = (seed * 9301 + 49297) % 2147483647 || 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1; };
  // kind (q | k | v | m): paint in that role's color (Query blue, Key orange, Value purple, MLP teal, as in How it really works); none: the red–green number scale
  function paint(cv, seed, lv, wd = 48, ht = 1, kind) {
    if (!cv) return; cv.width = wd; cv.height = ht; const c = cv.getContext('2d'), img = c.createImageData(wd, ht), r = rnd(seed), t = Math.min(1, lv / 5), HS = kind && NT.viz.ROLE()[kind];
    for (let y = 0; y < ht; y++) for (let x = 0; x < wd; x++) { const n = r(), s = Math.sin(x * 0.55 + seed * 1.7) * Math.cos(y * 0.6 + seed) * 0.9, v = (1 - t) * n * 0.75 + t * s; const vv = Math.max(-1, Math.min(1, v)); if (HS) img.data.set(NT.viz.rolePx(HS[0], HS[1], vv), (y * wd + x) * 4); else { const [R, G, B] = NT.div(vv); img.data.set([R, G, B, 255], (y * wd + x) * 4); } }
    c.putImageData(img, 0, 0);
  }
  // a curly brace from y0 to y1 at x: open = '{' (tip points left), otherwise '}' (tip points right). Width 20.
  const brace = (x, y0, y1, open) => { const m = (y0 + y1) / 2, d = open ? -1 : 1, w = 10; return `<path d="M${x} ${y0} q ${w * d} 0 ${w * d} 12 V ${m - 10} q 0 10 ${w * d} 10 q ${-w * d} 0 ${-w * d} 10 V ${y1 - 12} q 0 12 ${-w * d} 12" fill="none" stroke="#5b38d1" stroke-width="2.5" stroke-linecap="round"/>`; };
  const later = (ms) => (ms ? `style="opacity:0;animation:pt2in .4s ${ms}ms forwards"` : '');
  function flash(dir, ms) { E('sc').querySelectorAll('.fx').forEach((e) => { if (+getComputedStyle(e).opacity < 0.5) return; const x = +e.dataset.x, f = dir > 0 ? x / 900 : 1 - x / 900; e.classList.remove('flF', 'flB'); void e.offsetWidth; e.style.animationDelay = Math.round(f * ms) + 'ms'; e.classList.add(dir > 0 ? 'flF' : 'flB'); }); }
  // the ML Visualization Player's output colors and arrows
  const MB = [[19, '#ff7171'], [39, '#ffc000'], [59, '#dbd600'], [79, '#92d050'], [100, '#00b050']];
  const mcol = (v) => (MB.find(([m]) => v <= m) || MB[4])[1];
  const ARW = { upLarge: '#1f9d55', upMedium: '#48b96d', upSmall: '#86d8a0', downLarge: '#d9534f', downMedium: '#f08a24', downSmall: '#dbd600' };
  const arrow = (p, tgt, gray, ht = 46) => { const diff = Math.abs(tgt - p); if (diff < 0.005) return ''; const up = tgt > p, band = diff >= 0.67 ? 'Large' : diff >= 0.34 ? 'Medium' : 'Small', col = gray ? '#cfd6de' : ARW[(up ? 'up' : 'down') + band];
    const sm = ht < 40, len = (sm ? 6 : 12) + diff * (sm ? 14 : 26), w = 1.2 + diff * 3.2, hd = sm ? 5 : 7, cy = ht / 2, y1 = up ? cy + len / 2 : cy - len / 2, y2 = up ? cy - len / 2 : cy + len / 2, by = up ? y2 + hd : y2 - hd;
    return `<line x1="11" y1="${y1}" x2="11" y2="${by}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><path d="M11 ${y2} L${11 - hd * 0.62} ${by} L${11 + hd * 0.62} ${by}Z" fill="${col}"/>`; };
  // the player's back-propagation panel: the curve (1 − u)² drawn in over 2.5 s with the point and dashed tangent riding its leading edge
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
    const t0 = performance.now(); const step = (t) => { if (!E('gc')) return; const p = Math.min(1, (t - t0) / 2500); upd(p); if (p < 1) gdRaf = requestAnimationFrame(step); }; upd(0); gdRaf = requestAnimationFrame(step);
  }

  // ---------- the transformer, seen as its parameters ----------
  const TFX = 362, TFY = 6, TFW = 548, GX = 406, BW = 41, GY = 48, RH = 25;
  const bxOf = (b) => GX + b * BW, ryOf = (r) => GY + r * RH;
  const HB = 2, HR = 3; // the highlighted interviewer: block 3, row 4
  const COY = GY + 12 * RH + 36; // the callout boxes' top (their titles sit 24 px above)
  const tfHTML = () => {
    let h = `<div class="pt2-tf" id="${P}tf" style="left:${TFX}px;top:${TFY}px;width:${TFW}px;height:${H - TFY - 6}px"><div class="pt2-tft">🧠 Transformer · 12 blocks</div></div>`;
    for (let r = 0; r < 12; r++) h += `<div class="pt2-rn" style="left:${TFX + 6}px;top:${ryOf(r)}px"><b>${r + 1}</b><span><i class="cq">Q</i><br><i class="ck">K</i><br><i class="cv">V</i></span></div>`;
    for (let b = 0; b < 12; b++) {
      const bx = bxOf(b);
      h += `<div class="pt2-bn" style="left:${bx}px;top:${GY - 17}px">${b + 1}</div>`;
      for (let r = 0; r < 12; r++) for (let q = 0; q < 3; q++) h += `<canvas class="fx pt2-hd" data-x="${bx}" id="${P}h${b}_${r}_${q}" style="left:${bx}px;top:${ryOf(r) + q * 7.3}px;width:28px;height:6px"></canvas>`;
      h += `<canvas class="fx pt2-fc" data-x="${bx + 30}" id="${P}f${b}" style="left:${bx + 30}px;top:${GY}px;width:9px;height:${12 * RH - 3}px"></canvas>`;
    }
    h += `<div class="pt2-col hd" id="${P}lA" style="left:${GX}px;top:${COY - 24}px;width:232px"><i></i> Detective (attention head)</div><div class="pt2-col fc" id="${P}lF" style="left:654px;top:${COY - 24}px;width:244px"><i></i> Forensics (MLP)</div>`;
    h += `<div class="pt2-co hd" id="${P}coA" style="left:${GX}px;top:${COY}px;width:232px">${['Query', 'Key', 'Value'].map((n, i) => `<div class="cr"><span class="${['cq', 'ck', 'cv'][i]}">${n}</span><canvas class="fx" data-x="460" id="${P}q${n}" style="width:96px;height:14px"></canvas><b>768 × 64</b></div>`).join('')}</div>`;
    h += `<div class="pt2-co fc" id="${P}coF" style="left:654px;top:${COY}px;width:244px"><div class="cf"><div><canvas class="fx" data-x="690" id="${P}m1" style="width:120px;height:30px"></canvas><b>768 × 3,072</b></div><div><canvas class="fx" data-x="820" id="${P}m2" style="width:30px;height:54px"></canvas><b>3,072 × 768</b></div></div></div>`;
    return h;
  };
  function paintTF(lv) {
    for (let b = 0; b < 12; b++) { for (let r = 0; r < 12; r++) for (let q = 0; q < 3; q++) paint(E(`h${b}_${r}_${q}`), 100 + b * 36 + r * 3 + q, lv, 12, 2, 'qkv'[q]); paint(E('f' + b), 300 + b, lv, 4, 40, 'm'); }
    ['Query', 'Key', 'Value'].forEach((n, i) => paint(E('q' + n), 400 + i, lv, 48, 6, 'qkv'[i])); paint(E('m1'), 410, lv, 60, 16, 'm'); paint(E('m2'), 411, lv, 16, 32, 'm');
  }
  // the table fades in; ½ s later the Q/K/V callout flies out of row 4, column 3; ½ s after it lands, the MLP callout flies out of row 4 of the green column
  const FLY = [1100, 2500];
  function showTF(on, fly) {
    E('tf').style.opacity = on ? 1 : 0;
    E('sc').querySelectorAll('.pt2-hd,.pt2-fc,.pt2-bn,.pt2-rn').forEach((c) => (c.style.opacity = on ? 1 : 0));
    ['lA', 'lF'].forEach((id, j) => { const e = E(id); e.style.transition = fly ? `opacity .4s ${FLY[j] + 700}ms` : 'none'; e.style.opacity = on ? 1 : 0; });
    ['coA', 'coF'].forEach((id, j) => { const e = E(id);
      if (!on) { e.style.transition = 'none'; e.style.opacity = 0; return; }
      if (fly) { const cx = bxOf(HB) + (j ? 34 : 14), cy = ryOf(HR) + 10; e.style.transition = 'none'; e.style.opacity = 0; e.style.transform = `translate(${cx - parseFloat(e.style.left) - 20}px,${cy - parseFloat(e.style.top)}px) scale(.06)`; void e.offsetWidth; e.style.transition = `transform .9s cubic-bezier(.45,.05,.25,1) ${FLY[j]}ms, opacity .3s ${FLY[j]}ms`; }
      else e.style.transition = 'none';
      e.style.transform = 'none'; e.style.opacity = 1; });
  }
  const tfLines = (fly) => { const bx = bxOf(HB);
    return `<g ${later(fly ? 500 : 0)}><rect x="${bx - 2}" y="${ryOf(HR) - 2}" width="32" height="${RH + 1}" fill="none" stroke="${NT.C.head}" stroke-width="2" rx="3"/></g><g ${later(fly ? FLY[0] + 900 : 0)}><path d="M${bx + 14} ${ryOf(HR) + RH - 1} C ${bx + 14} ${COY - 50}, ${GX + 116} ${COY - 40}, ${GX + 116} ${COY - 26}" fill="none" stroke="${NT.C.head}" stroke-width="1.6" stroke-dasharray="4 3"/></g>
      <g ${later(fly ? FLY[0] + 900 : 0)}><rect x="${bx + 28}" y="${GY - 2}" width="13" height="${12 * RH + 1}" fill="none" stroke="${NT.C.mlp}" stroke-width="2" rx="3"/></g><g ${later(fly ? FLY[1] + 900 : 0)}><path d="M${bx + 35} ${ryOf(HR) + RH / 2} C ${bx + 70} ${ryOf(HR) + 60}, 776 ${COY - 60}, 776 ${COY - 26}" fill="none" stroke="${NT.C.mlp}" stroke-width="1.6" stroke-dasharray="4 3"/></g>`; };
  const BR_L = TFX - 26, BR_R = TFX + TFW + 24; // braces sit a few pixels clear of the transformer's frame

  // ---------- the page shell: controls, stage chevrons and ⓘ About in the sub-tab row; a two-line caption; the scene ----------
  function shell(M) {
    // (Oct 19) the same layout as Transformer and Output: the steps are the sub-tab chevrons; the player sits left of the caption
    st().innerHTML = `<section class="panel tr-panel pt2-panel"><div class="fl-ctl pt2-ctl"><button class="btn" id="pbRew" title="Start over">⏮</button><button class="btn" id="pbBack">◀ Back</button><button class="btn primary" id="pbNext">Next ▶</button><button class="btn" id="pbPlay">▶ Play</button></div><div class="fl-cap fixed pt2-cap" id="pbCap"></div><div class="fl-box" id="pbBox"></div></section>`;
    NT.guideRow(st().querySelector('.pt2-panel'), $('#pbCap'));
    const subs = $('#subtabs'); subs.querySelectorAll('.pt2-ctl,.minichev,.pt2-subs').forEach((e) => e.remove());
    subs.insertAdjacentHTML('afterbegin', `<div class="subtabs pt2-subs" id="pbSteps"></div>`);
    $('#pbRew').onclick = () => { M.pause(); M.go(0, true); };
    $('#pbBack').onclick = () => { M.pause(); if (M.beat > 0) M.go(M.beat - 1, false); };
    $('#pbNext').onclick = () => { M.pause(); M.next(); };
    $('#pbPlay').onclick = () => (M.playing ? M.pause() : M.play());
  }
  function fit() { const box = $('#pbBox'), sc = E('sc'); if (!box || !sc) return; const top = box.getBoundingClientRect().top + window.scrollY, avail = window.innerHeight - top - 8; const k = Math.max(0.5, Math.min(1.2, box.clientWidth / SW, avail > 250 ? avail / H : 9)); sc.style.transform = `translate(${Math.max(0, (box.clientWidth - SW * k) / 2)}px,0) scale(${k})`; box.style.height = Math.ceil(H * k) + 'px'; }
  window.addEventListener('resize', () => { if (S.station === 'mlbook' || S.station === 'rlhf') fit(); });

  // a page engine shared by both tabs: beats, chevrons, Play
  function engine(station, CH, BEATS, run) {
    const M = { beat: 0, playing: false, timer: null, tk: 0, alive: () => false };
    M.go = (b, animate) => {
      M.beat = b; const tk = ++M.tk, B = BEATS[b];
      M.alive = () => M.tk === tk && S.station === station && !!E('sc');
      $('#pbCap').innerHTML = `<div class="fl-ch"><b>${B.t}</b></div><div class="fl-cd">${B.d}</div>`;
      $('#pbSteps').innerHTML = CH.map(([ic, l], i) => `<button class="sub ${i === B.ch ? 'on' : i < B.ch ? 'done' : ''}" data-c="${i}">${l}</button>`).join('');
      $('#pbSteps').querySelectorAll('[data-c]').forEach((x) => (x.onclick = () => { M.pause(); M.go(BEATS.findIndex((q) => q.ch === +x.dataset.c), true); }));
      $('#pbBack').disabled = b === 0; $('#pbNext').disabled = b === BEATS.length - 1;
      NT.setStatus(`Step ${b + 1} of ${BEATS.length} · ${CH[B.ch][1]}`); if (b > 0) NT.setWho(false);
      E('pop').classList.remove('on'); E('end').classList.remove('on'); cancelAnimationFrame(gdRaf);
      run(b, animate, M); fit(); setTimeout(fit, 60);
    };
    M.next = () => { if (M.beat < BEATS.length - 1) { M.go(M.beat + 1, true); return true; } return false; };
    M.play = () => { M.playing = true; $('#pbPlay').textContent = '⏸ Pause'; const tick = () => { M.timer = setTimeout(() => { if (!M.playing || S.station !== station) return; if (M.next()) tick(); else M.pause(); }, BEATS[M.beat].wait || 3600); }; tick(); };
    M.pause = () => { M.playing = false; clearTimeout(M.timer); const p = $('#pbPlay'); if (p) p.textContent = '▶ Play'; };
    return M;
  }
  const at = (M, ms, fn) => { const tk = M.tk; setTimeout(() => { if (M.tk === tk && M.alive()) fn(); }, ms); }; // a timer from an earlier step never fires into a later one
  const popHTML = (endText) => `<div class="pt2-pop" id="${P}pop">✔ 124,439,808 parameters updated</div><div class="pt2-pop pt2-end" id="${P}end">${endText}</div>`;
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

  const PCH = [['📚', 'Book'], ['🪪', 'Input'], ['🧠', 'Transformer'], ['➡', 'Forward Prop'], ['🎯', 'Error'], ['⬅', 'Back Prop'], ['⬇', 'Grad Desc'], ['🔁', 'Repeat ×5'], ['📦', 'Batches']];
  const PBEATS = [
    { ch: 0, t: 'Pre-training starts in a library.', d: 'GPT-2 learned from about 8 million web pages: picture an enormous bookshelf. We’ll take down one book.' },
    { ch: 0, t: 'Take down one book: A Tale of Two Cities.', d: 'Every sentence in it is a practice question, and the book itself is the answer key.', wait: 4200 },
    { ch: 0, t: 'Hide the next word, and ask GPT-2 to guess it.', d: 'GPT-2 reads “It was the best of times, it was the”. The real next word, “worst”, is the answer key.' },
    { ch: 1, t: 'Cut the sentence into tokens.', d: 'Ten tokens (the comma is a token too), just as in the Input tab.' },
    { ch: 1, t: 'Look up each token’s embedding vector.', d: 'The embedding matrix holds a 768-number row for each of the 50,257 tokens: 38,597,376 parameters.' },
    { ch: 1, t: 'Add each token’s position vector.', d: 'The position matrix holds a 768-number row for each of 1,024 places: 786,432 more parameters.' },
    { ch: 2, t: 'Transformer parameters: 12 blocks, each with 12 Detectives and an MLP.', d: 'Each Detective has Q, K and V matrices; each MLP has two matrices. Pre-training learns their patterns.', wait: 4600 },
    { ch: 3, t: 'Forward propagation: the guess.', d: 'The input flows left to right through every parameter. Day-one GPT-2 is random: “worst” gets almost nothing.' },
    { ch: 4, t: 'Error: compare each output with its target.', d: 'The text supplies the target, “worst”. Lower probability for that token means greater loss.' },
    { ch: 5, t: 'Back propagation: how does each parameter affect the error?', d: 'Working backward, GPT-2 calculates gradients: how parameter changes affect loss.', wait: 4000 },
    { ch: 6, t: 'Gradient descent: nudge every parameter downhill.', d: 'Gradients set the update direction; the learning rate scales the step size.', wait: 4000 },
  ];
  for (let j = 1; j <= 5; j++) PBEATS.push({ ch: 7, k: j, wait: 9800, t: j < 5 ? `Repeat ${j} of 5: forward, error, back propagation, gradient descent.` : 'Repeat 5 of 5: “worst” = 100%, every other token = 0%.', d: j < 5 ? `With the nudged parameters, “worst” now gets ${j * 20}%. The arrows shrink.` : 'An idealized illustration: real training does not guarantee 100% confidence.' });
  PBEATS.push({ ch: 8, wait: 26000, t: 'Pre-training uses batches: here, a third of the shelf at a time.', d: 'Varied batches help generalization across contexts, beyond memorizing one passage.' });
  const PB = PBEATS.length - 1; // the batch beat
  const passOf = (b) => (b < 7 ? null : b <= 10 ? 0 : PBEATS[b].k);
  const levelOf = (b) => (b < 10 ? 0 : b === 10 ? 1 : Math.min(5, (PBEATS[b].k || 5) + 1));

  function preBuild() {
    let h = `<div class="pt2" id="${P}sc" style="width:${SW}px;height:${H}px"><svg class="pt2-svg" id="${P}svg" width="${SW}" height="${H}" viewBox="0 0 ${SW} ${H}"></svg>`;
    h += `<div class="pt2-shelf" id="${P}shelf" style="left:${SHX}px;top:${SHY}px">${SPINES.map(([w, ht, c], i) => (i === BOOK ? `<div class="pt2-gap" style="width:38px"></div>` : `<div class="pt2-spine" style="width:${w}px;height:${ht}px;background:${c}"></div>`)).join('')}<div class="pt2-board"></div></div><div class="pt2-shcap" id="${P}shcap" style="left:${SHX}px;top:${SHY + 268}px">A bookshelf of all the world’s digitized knowledge</div>`;
    h += `<div class="pt2-spine pt2-tale" id="${P}tale" style="left:${taleX0}px;top:${SHY + 22}px;height:228px"><span>A Tale of Two Cities</span></div>`;
    h += `<div class="pt2-book" id="${P}book"><div class="pg l"><div class="bt">A TALE OF TWO CITIES</div><div class="ba">Charles Dickens · 1859</div><div class="bc">Book the First<br>Recalled to Life</div><div class="bc">Chapter I<br>The Period</div></div><div class="pg r"><p><span class="hl">It was the best of times, it was the</span> <b class="wr">worst</b> of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity…</p></div></div>`;
    { const TM = NT.tokMarks(IDS.map((id) => NT.tokText(id).trim() || NT.tokText(id))); IDS.forEach((id, i) => { h += `<div class="pt2-tok${i === IDS.length - 1 ? ' tr-me' : ''}" id="${P}t${i}" style="border-left-color:${TM.col[i]}">${esc(TM.label[i])}</div>`; }); }
    h += `<div class="pt2-mh" id="${P}evh" style="left:95px;top:8px">Embedding vectors</div><div class="pt2-mh" id="${P}pvh" style="left:236px;top:8px">Position vectors</div>`;
    for (let i = 0; i < 10; i++) h += `<canvas class="fx" data-x="150" id="${P}e${i}" style="left:95px;top:${ROWY(i) + 2}px;width:110px;height:22px"></canvas><div class="pt2-plus" id="${P}pl${i}" style="left:210px;top:${ROWY(i) + 2}px">+</div><canvas class="fx" data-x="260" id="${P}p${i}" style="left:228px;top:${ROWY(i) + 2}px;width:98px;height:22px"></canvas>`;
    // the batch shelf (left) and the stylized vocabulary output (right)
    h += `<div class="pt2-bsh" id="${P}bsh"><div class="pt2-bsp">${SPINES.map(([, ht, c], i) => `<i id="${P}bs${i}" style="height:${Math.round(ht * 0.5)}px;background:${c}"></i>`).join('')}</div><div class="pt2-board"></div><div class="pt2-bcap" id="${P}bcap"></div></div>`;
    h += `<div class="pt2-voc" id="${P}voc">${Array.from({ length: 10 }, (_, i) => `<div class="pt2-vr"><i class="lab" style="width:${34 + ((i * 17) % 30)}px"></i><span class="bar"><i id="${P}vb${i}"></i></span><svg width="22" height="26" id="${P}va${i}"></svg></div>`).join('')}</div>`;
    h += tfHTML();
    h += `<div class="pt2-out" id="${P}out">${OUTS.map((w, i) => `<div class="pt2-orow ${i ? '' : 'tgt'}" id="${P}o${i}"><b>${esc(w)}</b><span class="v" id="${P}ov${i}"></span><span class="bar"><i id="${P}ob${i}"></i></span><svg width="22" height="46" id="${P}oa${i}"></svg></div>`).join('')}</div>`;
    h += outShell() + popHTML('Now that “worst” has been appropriately trained, the model automatically moves on to the next word of the book (“of”) until the entire book is ingested.');
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
  const vocVals = (bt, rd) => Array.from({ length: 10 }, (_, i) => { const r = rnd(bt * 31 + i * 7 + 3), tgt = i % 4 === 1 ? 1 : 0, p0 = 0.15 + 0.7 * (r() * 0.5 + 0.5), p = p0 + (tgt - p0) * (0.12 + 0.11 * (bt * 3 + rd)); return [Math.max(0.04, Math.min(0.93, p)), tgt]; });
  function vocOut(bt, rd) { vocVals(bt, rd).forEach(([p, tgt], i) => { const b = E('vb' + i); b.style.width = p * 100 + '%'; b.style.background = mcol(p * 100); E('va' + i).innerHTML = arrow(p, tgt, false, 26); }); }
  function batchShelf(bt) { SPINES.forEach((_, i) => { const e = E('bs' + i), g = Math.floor(i / 10); e.className = bt >= 3 ? 'done' : g === bt ? 'on' : g < bt ? 'done' : ''; }); E('bcap').textContent = bt < 0 ? 'The whole shelf' : bt >= 3 ? 'All three batches: every parameter tuned, none perfectly' : `Batch ${bt + 1} of 3: books ${bt * 10 + 1}–${bt * 10 + 10}`; }

  function preRun(b, animate, M) {
    const inC = b >= 6, batch = b === PB, show = (id, on) => { const e = E(id); if (e) e.style.opacity = on ? 1 : 0; };
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
    showTF(inC, b === 6 && animate);
    show('out', b >= 7 && !batch); show('gd', b >= 9); show('bsh', batch); show('voc', batch);
    let g = ''; if (inC) g += brace(BR_L, batch ? 60 : ROWY(0) - 2, batch ? 300 : ROWY(9) + 28, false) + tfLines(b === 6 && animate); if (b >= 7) g += brace(BR_R, 14, batch ? 214 : 200, true); E('svg').innerHTML = g;
    const lv = levelOf(b), k = passOf(b);
    if (b < 7) { prePaint(0); return; }
    if (batch) return preBatch(animate, M);
    if (b <= 10) {
      prePaint(b === 10 && animate ? 0 : lv); preOut(0, b >= 8, b === 9);
      if (b >= 9) gdCurve(animate && b === 9);
      if (animate && b === 7) flash(1, 1400);
      if (b === 10) { if (animate) { flash(-1, 1400); at(M, 1900, () => { prePaint(lv); E('pop').classList.add('on'); }); } else E('pop').classList.add('on'); }
      return;
    }
    if (!animate) { prePaint(lv); preOut(k, true, false); gdCurve(false); E(k < 5 ? 'pop' : 'end').classList.add('on'); return; }
    prePaint(k); preOut(k - 1, false, false); gdCurve(false); flash(1, 1300);
    at(M, 1500, () => preOut(k, false, false)); at(M, 2700, () => preOut(k, true, false));
    if (k < 5) { at(M, 3600, () => { preOut(k, true, true); gdCurve(true); }); at(M, 6300, () => { preOut(k, true, false); flash(-1, 1300); at(M, 1800, () => { prePaint(lv); E('pop').classList.add('on'); }); }); }
    else at(M, 3400, () => E('end').classList.add('on'));
  }
  // batches: a third of the shelf at a time, three quick rounds each (forward → outputs and arrows → back prop shown, not animated → gradient descent)
  function preBatch(animate, M) {
    gdCurve(false); prePaint(5);
    if (!animate) { batchShelf(3); vocOut(2, 2); return; }
    batchShelf(-1); vocOut(0, -1);
    let t = 600;
    for (let bt = 0; bt < 3; bt++) {
      at(M, t, () => batchShelf(bt)); t += 700;
      for (let rd = 0; rd < 3; rd++) {
        at(M, t, () => flash(1, 700)); t += 900;
        at(M, t, () => vocOut(bt, rd)); t += 700;
        at(M, t, () => flash(-1, 700)); t += 900;
        at(M, t, () => prePaint(4 + ((bt * 3 + rd) % 3) * 0.5)); // the parameters shift a little each round
      }
    }
    at(M, t, () => { batchShelf(3); prePaint(5); });
  }
  const PRE = engine('mlbook', PCH, PBEATS, preRun);
  NT.stations.mlbook = {
    init() {
      PRE.pause();
      if (NT.current().text !== TEXT) { S.bookSaved = S.bookSaved ?? S.text; this.switching = true; NT.setText(TEXT, 'edit'); this.switching = false; }
      shell(PRE); $('#pbBox').innerHTML = preBuild(); PRE.go(PRE.beat, true);
    },
    onText() {}, onTK() {},
  };

  // =====================================================================================
  // 7. POST-TRAINING (RLHF): the whole response gets one grade, F → C → B → A; then batches of documents
  // =====================================================================================
  const STORY = 'The banker left the bank and sat on the left bank of the';
  // the tokens GPT-2 added, stylized: no words, colored by how likely each pick was (the same bands as the sentence bubbles)
  const CHIPS = (() => { const r = rnd(42), out = []; for (let i = 0; i < 90; i++) { const u = r() * 0.5 + 0.5, band = u < 0.38 ? 0 : u < 0.62 ? 1 : u < 0.8 ? 2 : u < 0.92 ? 3 : 4; out.push([22 + Math.round((r() * 0.5 + 0.5) * 38), band]); } return out; })();
  const docHTML = (id, cls, n) => `<div class="pt2-doc ${cls}" ${id ? `id="${P}${id}"` : ''}><div class="dl">${esc(STORY)}</div><div class="dc">${CHIPS.slice(0, n).map(([w, bd]) => `<i style="width:${w}px;background:${BAND(bd)}"></i>`).join('')}</div></div>`;
  const GRADES = { F: ['#c00000', 0.2], C: ['#f08a24', 0.5], B: ['#7fae2c', 0.75], A: ['#1e8a3a', 1] };
  const stamp = (g, small) => `<div class="pt2-stamp ${small ? 'sm' : ''}" style="--g:${GRADES[g][0]}"><b>${g}</b></div>${small ? '' : '<div class="pt2-sig">RLHF</div>'}`;
  const QCH = [['📄', 'Response'], ['🧠', 'Transformer'], ['➡', 'Forward Prop'], ['🅵', 'Grade'], ['⬅', 'Back Prop'], ['⬇', 'Grad Desc'], ['🔁', 'Repeat'], ['📦', 'Batches']];
  const QBEATS = [
    { ch: 0, t: 'Post-training turns the sentence completer into a helpful response generator.', d: 'Feedback on complete responses can improve helpfulness, safety and instruction following.' },
    { ch: 1, t: 'The same transformer, with the parameters pre-training tuned.', d: 'Every detective’s Query, Key and Value matrices and every forensics expert’s two matrices.', wait: 4600 },
    { ch: 2, t: 'Forward propagation: process the complete response.', d: 'This simplified model processes a response through all 12 blocks.' },
    { ch: 3, t: 'Human feedback: the whole response gets one grade, F.', d: 'Human feedback trains a reward model. Its scores help define the training objective.' },
    { ch: 4, t: 'Backpropagation: calculate gradients from the training objective.', d: 'The objective supplies the learning signal; backpropagation determines how parameters affect it.', wait: 4000 },
    { ch: 5, t: 'Gradient descent: nudge every parameter toward a better grade.', d: 'Gradients and the learning rate determine the parameter updates.', wait: 4000 },
  ];
  ['C', 'B', 'A'].forEach((g, j) => QBEATS.push({ ch: 6, g, wait: 9800, t: g === 'A' ? 'Pass 4: the response earns an A.' : `Pass ${j + 2}: forward, grade, back propagation, gradient descent.`, d: g === 'A' ? 'F → C → B → A is illustrative; real updates do not guarantee improvement.' : `With the nudged parameters, the response now earns a ${g}. The arrow shrinks.` }));
  QBEATS.push({ ch: 7, wait: 15000, t: 'Real RLHF works in batches of responses.', d: 'Many responses contribute to training; updates aim to improve behavior across examples.' });
  const QB = QBEATS.length - 1;
  const BATCH_G = [['F', 'C', 'A', 'F', 'C', 'C'], ['C', 'A', 'F', 'C', 'A', 'C'], ['A', 'C', 'A', 'F', 'A', 'C']];

  function postBuild() {
    let h = `<div class="pt2" id="${P}sc" style="width:${SW}px;height:${H}px"><svg class="pt2-svg" id="${P}svg" width="${SW}" height="${H}" viewBox="0 0 ${SW} ${H}"></svg>`;
    h += docHTML('doc', 'big', 90);
    h += `<div class="pt2-stack" id="${P}stack">${Array.from({ length: 6 }, (_, i) => `<div class="pt2-mini" style="left:${i * 34}px;top:${i * 30}px">${docHTML('', 'tiny', 26)}</div>`).join('')}</div>`;
    h += tfHTML();
    h += `<div class="pt2-gout" id="${P}gout"><div class="pt2-gdoc">${docHTML('odoc', 'mid', 54)}<div class="pt2-gst" id="${P}gst"></div></div><div class="pt2-grow"><span class="v" id="${P}gv"></span><span class="bar"><i id="${P}gb"></i></span><svg width="22" height="46" id="${P}ga"></svg></div></div>`;
    h += `<div class="pt2-bout" id="${P}bout">${Array.from({ length: 6 }, (_, i) => `<div class="pt2-bcell"><div class="pt2-gdoc">${docHTML('', 'tiny', 26)}<div class="pt2-gst" id="${P}bst${i}"></div></div><span class="bar"><i id="${P}bb${i}"></i></span><svg width="22" height="30" id="${P}ba${i}"></svg></div>`).join('')}</div>`;
    h += outShell() + popHTML('RLHF has trained the model to continue sentences in a more appropriate way.');
    return h + '</div>';
  }
  function grade(g, arrows) { E('gst').innerHTML = g ? stamp(g) : ''; const p = g ? GRADES[g][1] : 0; E('gv').textContent = g ? Math.round(p * 100) + '%' : ''; const b = E('gb'); b.style.width = (g ? p * 100 : 0) + '%'; b.style.background = mcol(p * 100); E('ga').innerHTML = g && arrows ? arrow(p, 1, false) : ''; }
  function batchGrades(bt) { BATCH_G[bt].forEach((g, i) => { E('bst' + i).innerHTML = stamp(g, true); const p = GRADES[g][1], b = E('bb' + i); b.style.width = p * 100 + '%'; b.style.background = mcol(p * 100); E('ba' + i).innerHTML = arrow(p, 1, false, 30); }); }
  const clearBatch = () => { for (let i = 0; i < 6; i++) { E('bst' + i).innerHTML = ''; E('bb' + i).style.width = '0%'; E('ba' + i).innerHTML = ''; } };
  function postRun(b, animate, M) {
    const inC = b >= 1, batch = b === QB, show = (id, on) => { const e = E(id); if (e) e.style.opacity = on ? 1 : 0; };
    show('doc', !batch); show('stack', batch); show('gout', b >= 2 && !batch); show('bout', batch); show('gd', b >= 4 && !batch);
    showTF(inC, b === 1 && animate);
    let g = ''; if (inC) g += brace(BR_L, 14, 408, false) + tfLines(b === 1 && animate); if (b >= 2) g += brace(BR_R, 14, batch ? 214 : 214, true); E('svg').innerHTML = g;
    paintTF(5);
    if (b < 2) return;
    if (batch) {
      gdCurve(false);
      if (!animate) { batchGrades(2); return; }
      clearBatch(); let t = 200;
      for (let bt = 0; bt < 3; bt++) {
        at(M, t, () => { clearBatch(); const s = E('stack'); s.classList.remove('in'); void s.offsetWidth; s.classList.add('in'); }); t += 1000;
        at(M, t, () => flash(1, 800)); t += 1100;
        at(M, t, () => batchGrades(bt)); t += 1100;
        at(M, t, () => flash(-1, 800)); t += 1600;
      }
      return;
    }
    if (b === 2) { grade(null); if (animate) flash(1, 1400); return; }
    if (b <= 5) { grade('F', true); if (b >= 4) gdCurve(animate && b === 4); if (b === 5) { if (animate) { flash(-1, 1400); at(M, 1900, () => E('pop').classList.add('on')); } else E('pop').classList.add('on'); } return; }
    const gr = QBEATS[b].g, prev = { C: 'F', B: 'C', A: 'B' }[gr];
    if (!animate) { grade(gr, true); gdCurve(false); E(gr === 'A' ? 'end' : 'pop').classList.add('on'); return; }
    grade(prev, false); gdCurve(false); flash(1, 1300);
    at(M, 1500, () => grade(gr, false)); at(M, 2400, () => grade(gr, true));
    if (gr !== 'A') { at(M, 3300, () => gdCurve(true)); at(M, 6000, () => { flash(-1, 1300); at(M, 1800, () => E('pop').classList.add('on')); }); }
    else at(M, 3200, () => E('end').classList.add('on'));
  }
  const POST = engine('rlhf', QCH, QBEATS, postRun);
  NT.stations.rlhf = {
    init() { POST.pause(); shell(POST); $('#pbBox').innerHTML = postBuild(); POST.go(POST.beat, true); },
    onText() {}, onTK() {},
  };
})();
