/* LLMLab — shell: tabs, shared sentence + temperature + Top-K, router, background loading */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const REGIONS = [
    { cls: 'r0', label: 'The task', items: [['next', 'Next Word']] },
    { cls: 'r1', label: 'Language → numbers', items: [['tokens', 'Tokens'], ['ids', 'IDs'], ['embeddings', 'Embeddings']] },
    { cls: 'r2', label: 'Context', items: [['transformer', 'Transformer / Attention']] },
    { cls: 'r3', label: 'Next token', items: [['logits', 'Logits'], ['pick', 'Probabilities / Pick'], ['repeat', 'Repeat']] },
  ];
  const ALIAS = { text: 'next', nextword: 'next', words: 'next' };

  // ---------- tabs ----------
  let n = 0;
  $('#strip').innerHTML = REGIONS.map((r) => `<div class="region ${r.cls}"><span class="rlabel">${r.label}</span><div class="rbtns">${r.items.map(([id, l]) => `<button class="stn" data-s="${id}"><span class="n">${++n}</span>${l}</button>`).join('')}</div></div>`).join('');
  $('#strip').querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => NT.go(b.dataset.s)));

  // ---------- sentence ----------
  const ta = $('#sentence');
  const autosize = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  ta.addEventListener('autosize', autosize);
  let typing = null;
  ta.addEventListener('input', () => { autosize(); clearTimeout(typing); typing = setTimeout(() => NT.setText(ta.value.replace(/\n/g, ' '), 'edit'), 280); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(typing); NT.setText(ta.value.replace(/\n/g, ' '), 'edit'); } });
  const starter = $('#starter');
  starter.innerHTML = `<option value="">Starter sentences</option>` + NT.STARTERS.map(([k, t]) => `<option value="${k}">${esc(t.length > 54 ? t.slice(0, 52) + '…' : t)}</option>`).join('');
  starter.onchange = () => { if (starter.value) NT.setText(NT.EX[starter.value].text, 'edit'); };
  const syncStarter = () => { const k = NT.current().key; starter.value = k !== 'custom' ? k : ''; };

  // ---------- temperature and Top-K ----------
  const tS = $('#tSlider'), kS = $('#kSlider');
  const fmtT = (t) => (t <= 1 ? t.toFixed(1) : String(t));
  function syncTK() {
    tS.value = NT.TEMPS.indexOf(S.T) < 0 ? 8 : NT.TEMPS.indexOf(S.T);
    kS.value = S.K >= NT.ALL ? 51 : S.K;
    $('#tVal').textContent = fmtT(S.T); $('#kVal').textContent = NT.kLabel(S.K);
  }
  tS.oninput = () => NT.setTK(NT.TEMPS[+tS.value], null);
  kS.oninput = () => NT.setTK(null, +kS.value >= 51 ? NT.ALL : +kS.value);

  // ---------- GPT-2 status chip ----------
  NT.live.onChange((s) => {
    const c = $('#liveChip'); if (s.phase === 'idle') { c.hidden = true; return; }
    c.hidden = false; c.className = 'livechip' + (s.phase === 'ready' || s.phase === 'cached' ? ' ok' : s.phase === 'error' ? ' bad' : '');
    const pct = Math.round(s.progress * 100);
    c.innerHTML = s.phase === 'downloading' ? `GPT-2 loading <i><b style="width:${pct}%"></b></i> ${pct}%` : s.phase === 'cached' ? 'GPT-2 downloaded' : s.phase === 'starting' ? 'GPT-2 starting…' : s.phase === 'ready' ? 'GPT-2 ready' : 'GPT-2 offline';
    c.title = s.phase === 'error' ? 'The model files could not be reached. Stored sentences still work.' : 'GPT-2 loads quietly in the background so any sentence can be used.';
    if (NT.onLive) NT.onLive(s);
  });

  // ---------- router ----------
  const cur = () => NT.stations[S.station];
  function render() {
    $('#strip').querySelectorAll('.stn').forEach((b) => b.classList.toggle('on', b.dataset.s === S.station));
    NT.setStatus('');
    $('#toolbar').innerHTML = ''; $('#stage').innerHTML = '';
    if (S.station === 'embeddings' && S.embView === 'input' && !NT.current().ids.length) S.embView = 'qualities';
    { const kc = document.querySelector('#kSlider').closest('.ctl'); if (kc && S.station !== 'pick') kc.classList.remove('off'); }
    const needsText = ['next', 'ids', 'transformer', 'logits', 'pick', 'repeat'].includes(S.station) || (S.station === 'embeddings' && S.embView === 'input');
    if (needsText && !NT.current().ids.length) {
      $('#stage').innerHTML = `<div class="panel emptynote">Type a sentence at the top, or choose a starter, to begin.</div>`;
    } else cur().init();
    $('.ctlrow').classList.toggle('quiet', !['next', 'pick', 'repeat'].includes(S.station));
    try { history.replaceState(null, '', '#' + S.station); } catch (e) { /* ignore */ }
  }
  NT.go = (id) => { id = ALIAS[id] || id; if (!NT.stations[id]) return; S.station = id; render(); };
  NT.render = render;
  const markPressed = () => { document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false')); document.querySelectorAll('#strip .stn').forEach((b) => b.setAttribute('aria-current', b.classList.contains('on') ? 'page' : 'false')); };
  new MutationObserver(markPressed).observe(document.getElementById('main'), { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  new MutationObserver(markPressed).observe(document.getElementById('strip'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  NT.on((what, how) => {
    if (what === 'text') { syncStarter(); if (cur().onText) cur().onText(how); else render(); }
    if (what === 'tk') { syncTK(); if (cur().onTK) cur().onTK(); }
  });

  // ---------- start ----------
  const q = new URLSearchParams(location.search); if (q.get('text')) S.text = q.get('text');
  ta.value = S.text; autosize(); syncStarter(); syncTK();
  const h = ALIAS[(location.hash || '').slice(1)] || (location.hash || '').slice(1); if (NT.stations[h]) S.station = h;
  render();
  window.addEventListener('hashchange', () => { const k = ALIAS[location.hash.slice(1)] || location.hash.slice(1); if (NT.stations[k] && S.station !== k) NT.go(k); });
  // idle-time loading: embedding rows first (small), then the model files
  const idle = (fn, t) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: t }) : setTimeout(fn, t));
  window.addEventListener('load', () => setTimeout(() => idle(() => NT.warmEmb(), 4000), 900));
  NT.live.scheduleIdle();
  window.addEventListener('resize', autosize);
})();

/* usability: projector size toggle, number keys jump between tabs */
(() => {
  const b = document.getElementById('projBtn'); if (!b) return;
  b.addEventListener('click', () => { const on = document.body.classList.toggle('proj'); b.setAttribute('aria-pressed', on); b.textContent = on ? 'Normal size' : 'Projector size'; });
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    const n = parseInt(e.key, 10); if (!(n >= 1 && n <= 8)) return;
    const btns = document.querySelectorAll('#strip .stn'); if (btns[n - 1]) btns[n - 1].click();
  });
})();
