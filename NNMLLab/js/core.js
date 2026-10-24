/* NNML Lab shell: experiences, steps, player, caption, mode, step codes. */
(function () {
  const NN = (window.NN = window.NN || {});
  const $ = (s) => document.querySelector(s);
  // let append() take arrays (flattened) and skip null/false, everywhere
  const _ap = Element.prototype.append; Element.prototype.append = function (...a) { return _ap.apply(this, a.flat(9).filter((x) => x != null && x !== false)); };
  NN.$ = $;
  NN.exps = [];
  NN.byId = {};
  NN.reg = (exp) => { NN.exps.push(exp); NN.byId[exp.id] = exp; };
  NN.mode = 'concept';
  // Predict first (Oct 19): on = prediction chips show and hold back the answer they ask about; off = no chips, everything shown
  NN.predictOn = (() => { try { return localStorage.getItem('nnml-predict') !== 'off'; } catch (e) { return true; } })();
  NN.speed = 1;
  const SPEEDS = [0.5, 0.75, 1, 1.5, 2.5];

  /* ---------- tiny DOM / SVG helpers ---------- */
  NN.h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'style') el.style.cssText = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'html') el.innerHTML = v; else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(9).forEach((c) => c != null && c !== false && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  NN.s = (tag, attrs = {}, ...kids) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'text') el.textContent = v; else el.setAttribute(k, v); }
    kids.flat(9).forEach((c) => c != null && c !== false && el.append(c));
    return el;
  };

  /* ---------- animation: speed-aware, canceled when the step changes ---------- */
  let token = 0;
  NN.token = () => token;
  NN.cancel = () => { token++; };
  NN.wait = (ms) => { const t = token; return new Promise((res, rej) => setTimeout(() => (t === token ? res() : rej('cancel')), ms / NN.speed)); };
  NN.anim = (ms, fn) => { const t = token, dur = ms / NN.speed; return new Promise((res, rej) => { const t0 = performance.now(); const tick = (now) => { if (t !== token) return rej('cancel'); const u = Math.min(1, (now - t0) / dur); fn(u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, u); u < 1 ? requestAnimationFrame(tick) : res(); }; requestAnimationFrame(tick); }); };
  NN.quiet = (p) => p && p.catch && p.catch((e) => { if (e !== 'cancel') console.error(e); });

  /* ---------- state ---------- */
  const st = { exp: null, step: 0, playing: false };
  NN.st = st;
  NN.params = {};

  function buildNav() {
    const nav = $('#parts'); nav.innerHTML = '';
    [[1, 'Part 1 · Neural networks'], [2, 'Part 2 · Machine learning']].forEach(([p, label]) => {
      const g = NN.h('div', { class: 'partgroup p' + p }, NN.h('span', { class: 'plabel' }, label));
      NN.exps.filter((e) => e.part === p).forEach((e) => g.append(NN.h('button', { class: 'tab', 'data-id': e.id, title: e.title, onclick: () => NN.go(e.id, 0) }, NN.h('span', { class: 'tid' }, e.id), ' ', e.short || e.title)));
      nav.append(g);
    });
  }
  function buildChev() {
    const box = $('#chev'); box.innerHTML = '';
    st.exp.steps.forEach((s, i) => box.append(NN.h('button', { class: 'cv' + (i === st.step ? ' on' : i < st.step ? ' done' : ''), onclick: () => NN.show(i, false), title: s.t }, NN.h('span', { class: 'n' }, i + 1), NN.h('span', { class: 'lab' }, s.t))));
    const fit = () => { box.classList.remove('compact'); if (box.scrollWidth > box.clientWidth + 2) box.classList.add('compact'); };
    fit(); requestAnimationFrame(fit); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }
  function setCaption() {
    const s = st.exp.steps[st.step]; const c1 = typeof s.c1 === 'function' ? s.c1() : s.c1, c2 = typeof s.c2 === 'function' ? s.c2() : s.c2;
    $('#cap1').innerHTML = c1 || ''; $('#cap2').innerHTML = c2 || '';
    $('#stepCode').textContent = st.exp.id + '.' + (st.step + 1);
    $('#pBack').disabled = st.step === 0; const last = st.step === st.exp.steps.length - 1, nx = NN.exps[NN.exps.indexOf(st.exp) + 1];
    $('#pNext').disabled = last && !nx; $('#pNext').innerHTML = last && nx ? `Next: ${nx.id} &#9654;` : 'Next &#9654;';
    document.querySelectorAll('#parts .tab').forEach((b) => b.classList.toggle('on', b.dataset.id === st.exp.id));
  }
  NN.caption = setCaption;
  function writeHash() { const q = Object.entries(NN.params).map(([k, v]) => k + '=' + v).join('&'); history.replaceState(null, '', '#' + st.exp.id + '.' + (st.step + 1) + (q ? '?' + q : '')); }
  NN.setParam = (k, v) => { if (v == null) delete NN.params[k]; else NN.params[k] = v; writeHash(); };

  NN.go = (id, step = 0, opts = {}) => {
    NN.cancel(); stopPlay();
    const exp = NN.byId[id]; if (!exp) return;
    if (st.exp && st.exp.leave) st.exp.leave();
    if (!opts.keepParams) NN.params = {};
    st.exp = exp; st.step = Math.max(0, Math.min(step, exp.steps.length - 1));
    const stage = $('#stage'); stage.innerHTML = ''; stage.className = 'stage ' + exp.id.toLowerCase();
    document.body.dataset.exp = exp.id;
    $('#about').hidden = true; $('#about').innerHTML = exp.about || '';
    exp.enter(stage);
    buildChev(); setCaption(); writeHash();
    NN.quiet(exp.show(st.step, { anim: false }));
  };
  NN.show = (i, anim = true) => {
    NN.cancel();
    if (i < 0) return;
    if (i >= st.exp.steps.length) { const nx = NN.exps[NN.exps.indexOf(st.exp) + 1]; if (nx) NN.go(nx.id, 0); return; }
    st.step = i; buildChev(); setCaption(); writeHash();
    const p = st.exp.show(i, { anim });
    NN.quiet(p);
    return p;
  };
  NN.refresh = () => { NN.cancel(); setCaption(); NN.quiet(st.exp.show(st.step, { anim: false })); };

  /* ---------- player ---------- */
  let playTimer = null;
  function stopPlay() { st.playing = false; clearTimeout(playTimer); $('#pPlay').innerHTML = '&#9654; Play'; }
  async function playLoop() {
    while (st.playing && st.step < st.exp.steps.length - 1) {
      try { await NN.show(st.step + 1, true); await NN.wait(1600); } catch (e) { if (e !== 'cancel') console.error(e); stopPlay(); return; }
    }
    stopPlay();
  }
  NN.stopPlay = stopPlay;

  NN.boot = () => {
    buildNav();
    $('#pFirst').onclick = () => { stopPlay(); NN.show(0, false); };
    $('#pBack').onclick = () => { stopPlay(); NN.show(st.step - 1, false); };
    $('#pNext').onclick = () => { stopPlay(); NN.show(st.step + 1, true); };
    $('#pPlay').onclick = () => { if (st.playing) { stopPlay(); return; } st.playing = true; $('#pPlay').innerHTML = '&#10074;&#10074; Pause'; if (st.step >= st.exp.steps.length - 1) NN.show(0, false); playLoop(); };
    $('#pSpeed').oninput = (e) => { NN.speed = SPEEDS[+e.target.value]; $('#pSpeedV').textContent = NN.speed + '×'; };
    $('#pReset').onclick = () => { stopPlay(); if (st.exp.reset) st.exp.reset(); NN.params = {}; NN.go(st.exp.id, st.step, { keepParams: false }); };
    const syncPred = () => { const b = $('#pPredict'); b.setAttribute('aria-pressed', NN.predictOn); b.classList.toggle('on', NN.predictOn); };
    $('#pPredict').onclick = () => { NN.predictOn = !NN.predictOn; try { localStorage.setItem('nnml-predict', NN.predictOn ? 'on' : 'off'); } catch (e) {} syncPred(); if (st.exp) NN.refresh(); };
    syncPred();
    $('#pAbout').onclick = () => { const a = $('#about'); a.hidden = !a.hidden; };
    $('#pContents').onclick = () => { const box = $('#contents'); if (!box.hidden) { box.hidden = true; return; } box.innerHTML = ''; box.append(NN.h('div', { class: 'ctop' }, NN.h('b', {}, 'Contents'), NN.h('span', { class: 'small muted' }, ' Click any step. Each has a code (like M4.3) you can share.'), NN.h('button', { class: 'btn small', onclick: () => (box.hidden = true) }, 'Close')));
      [[1, 'Part 1 \u00b7 Neural networks: how a network produces an answer'], [2, 'Part 2 \u00b7 Machine learning: how a network learns']].forEach(([p, t]) => { const col = NN.h('div', { class: 'ccol' }, NN.h('h3', {}, t)); NN.exps.filter((e) => e.part === p).forEach((e) => col.append(NN.h('div', { class: 'cexp' }, NN.h('div', { class: 'cen' }, e.id + ' ' + e.title), NN.h('div', { class: 'csteps' }, e.steps.map((s, i) => NN.h('button', { class: 'cst', onclick: () => { box.hidden = true; NN.go(e.id, i); } }, NN.h('span', { class: 'code' }, e.id + '.' + (i + 1)), ' ', s.t)))))); box.append(col); }); box.hidden = false; };
    document.querySelectorAll('#mode button').forEach((b) => (b.onclick = () => { NN.mode = b.dataset.m; document.body.classList.toggle('hiw', NN.mode === 'hiw'); document.querySelectorAll('#mode button').forEach((x) => x.classList.toggle('on', x === b)); try { localStorage.setItem('nnml-mode', NN.mode); } catch (e) {} if (st.exp) NN.refresh(); }));
    try { const m = localStorage.getItem('nnml-mode'); if (m === 'hiw') document.querySelector('#mode [data-m=hiw]').click(); } catch (e) {}
    document.addEventListener('keydown', (e) => { if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) { $('#pPredict').click(); return; } });
    document.addEventListener('keydown', (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); $('#pNext').click(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); $('#pBack').click(); } else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); $('#pPlay').click(); }
    });
    // route
    const m = location.hash.match(/^#([NM]\d)\.(\d+)(?:\?(.*))?$/);
    if (m && NN.byId[m[1]]) { NN.params = {}; (m[3] || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); NN.params[k] = decodeURIComponent(v); }); NN.go(m[1], +m[2] - 1, { keepParams: true }); } else NN.go(NN.exps[0].id, 0);
    window.addEventListener('hashchange', () => { const mm = location.hash.match(/^#([NM]\d)\.(\d+)/); if (mm && (mm[1] !== st.exp.id || +mm[2] - 1 !== st.step)) NN.go(mm[1], +mm[2] - 1); });
  };
})();
