/* LLM Lab — shell: six lesson tabs with sub-tabs, a one-line "What to do", the shared sentence (with colored bubbles), temperature + Top-K */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  // Each sub-tab shows one existing view. `set` puts that view's own state in place before the view draws.
  const TABS = [
    { id: 'experience', label: 'Overview', subs: [{ id: 'main', st: 'next', todo: 'Gather next word ideas from the class, compare to GPT-2’s list, add to sentence, repeat.' }] },
    { id: 'numbers', label: 'Input', subs: [
      { id: 'split', who: 'On this page: the same sentence is cut into pieces twice. On the left you make the cuts; on the right is GPT-2’s tokenizer, which cuts using the 50,257 pieces it learned from web text. The table underneath compares four ways of splitting.', label: 'Split into tokens', cap: 'text → pieces', st: 'split', todo: 'Watch the sentence split into tokens. Try long or unusual words to see where GPT-2 cuts them.' },
      { id: 'build', who: 'On this page: a tokenizer is built from nothing. <b>Our tokenizer</b> starts with single letters and, round by round, glues together the pair of neighbors that appears most often in this text. <b>GPT-2’s tokenizer</b>, which did the same thing 50,000 times on millions of web pages, is shown underneath for comparison.', label: 'Build the tokenizer', cap: 'how pieces are chosen', st: 'tokens', set: () => (S.tokView = 'build'), todo: 'Step through building a tokenizer: each round, the most common pair of pieces merges into one.' },
      { id: 'ids', who: 'On this page: each <b>token</b> gets its <b>ID</b>, its number in GPT-2’s list. The ID is a row number in the <b>embedding matrix</b> (right), and that row, the token’s <b>embedding vector</b>, is copied over, with its first 10 numbers shown.', label: 'Token IDs', cap: 'pieces → numbers', st: 'tokids', todo: 'Press Next to cut the sentence into tokens and give each one its ID. Then look up each ID’s embedding vector: click a row, or use the buttons.' },
      { id: 'qualities', who: 'On this page: words become points in space. Each word gets three made-up numbers (gender, age, royalty), so similar words land near each other, and the same move (man → king) works for other pairs.', label: 'Meaning as numbers', cap: 'words → lists of numbers', st: 'embeddings', set: () => (S.embView = 'qualities'), todo: 'Place words by a few qualities (gender, age, royalty) to see meaning stored as numbers.' },
      { id: 'dims', who: 'On this page: real GPT-2 vectors. On the left, each word’s three made-up qualities next to some of GPT-2’s real numbers for it. On the right, word arithmetic (king − man + woman) done with those numbers. The slider sets how many of the 768 numbers are used.', label: 'Many dimensions', cap: 'why 768', st: 'embeddings', set: () => (S.embView = 'dims'), todo: 'We used 3 dimensions for the words in our example; GPT-2 uses 768 dimensions for every token. Use the slider to see how many dimensions it takes for GPT-2 to complete the pairings on the right correctly.' },
      { id: 'input', who: 'On this page: each token’s <b>embedding vector</b> (what it is) gets the <b>position vector</b> for its place (where it is) added to it, from the <b>position matrix</b> (right). The sum is its <b>input vector</b>: what goes into GPT-2’s blocks. The table on the right adds up the first 10 numbers.', label: 'Token + position', cap: 'word order', st: 'embeddings', set: () => (S.embView = 'input'), todo: 'Give each token its place: double-click a row, or use the buttons. Embedding vector + position vector = input vector.' },
      { id: 'all', notodo: true, who: 'On this page: the whole tab in one animation: text → tokens → IDs → embedding vectors → + position vectors → input vectors, one token at a time.', label: 'Put it together', cap: 'the whole tab, animated', st: 'nmflow', todo: 'Watch the whole sentence become numbers: tokens, IDs, embedding vectors, position vectors, input vectors. Press Next or Play.' },
    ] },
    // Oct 14: the old Use Context tab was removed; its story lives on in Transformer (old #context links open it)
    { id: 'transformer', label: 'Transformer', subs: [
      { id: 'room', label: 'The Interview Room', cap: 'the story, step by step', st: 'tfroom', notodo: true, who: 'On this page: the story of what happens inside one of GPT-2’s 12 transformer blocks, told as interviews. Each token brings an <b>Information Card</b>; <b>interviewers</b>, each with its own line of questioning, ask questions and take notes; a <b>supervisor</b> adds the notes to the Information Cards; a <b>fact checker</b> adds what it learned in training. The words are our analogy; the striped Information Cards and the “river” numbers are real GPT-2.', todo: 'Press Next to follow the story one step at a time. In the interview, click any token to interview it instead.' },
    ] },
    // rebuilt Oct 14 (js/pickscene.js): one scene like Whole Process, continuing from the Transformer; its steps are the chevrons
    { id: 'pick', label: 'Output', subs: [
      { id: 'pick', label: 'Output', st: 'pkscene', notodo: true, who: 'On this page: how GPT-2 picks the next token. The last token’s Information Card becomes the <b>output vector</b>; it is scored against every token’s <b>embedding row</b>; <b>Temperature</b> and <b>Top-K</b> reshape the scores; <b>SoftMax</b> turns them into slices of a spinner; a random number <b>r</b> picks the winner. All numbers are real GPT-2.' },
    ] },
    { id: 'whole', label: 'Whole Process', subs: [
      { id: 'flow', label: 'Animated flow', cap: 'every step, animated', st: 'flow', notodo: true, who: 'On this page: one whole pass of GPT-2, every step in one picture: the sentence becomes <b>tokens</b> and <b>input vectors</b>, goes through the 12 <b>transformer blocks</b>, the <b>output vector</b> is scored against every token, and the <b>spinner</b> picks the next token, which joins the sentence. Then it all happens again.', todo: 'Press Next to go one step at a time, or Play to watch it all. Each pass adds one token and plays a little faster.' },
      { id: 'side', label: 'Side by side', st: 'repeat', set: () => NT.setRepeatView && NT.setRepeatView('side'), todo: 'Same start, three settings: compare Greedy, Typical and Wild.' },
    ] },
    // rebuilt Oct 13: pre-training told with the Interview Room's table and crew (js/pretrain.js); the old pages (js/learning.js) are no longer in the tabs
    // Oct 17: Pre-Training is one page (Day one and Again and again retired); Post-Training mirrors it for RLHF (js/pretrain2.js)
    { id: 'learning', label: 'Pre-Training', subs: [
      { id: 'step', label: 'Learn one example', st: 'mlbook', notodo: true, who: 'On this page: GPT-2 learns from one example, a sentence from <b>A Tale of Two Cities</b>, and you see the <b>parameters</b> behind every step: embedding and position vectors, each interviewer’s Query, Key and Value matrices, each fact checker’s two matrices. A <b>forward pass</b> guesses, the <b>error</b> arrows compare it with the answer key, <b>back propagation</b> finds each gradient, <b>gradient descent</b> nudges every parameter. Then the whole shelf, in batches.' },
    ] },
    { id: 'post', label: 'Post-Training', subs: [
      { id: 'rlhf', label: 'RLHF', st: 'rlhf', notodo: true, who: 'On this page: post-training with human feedback (<b>RLHF</b>). A response GPT-2 wrote goes through the same <b>parameters</b>; people (or a reward model) give the <b>whole response one grade</b>; back propagation and gradient descent nudge every parameter toward a better grade, F → C → B → A. Then batches of responses.' },
    ] },
  ];
  NT.TABS = TABS;
  // old links (LLMLab/#tokens and so on) still open the right place
  const LEGACY = { next: ['experience'], text: ['experience'], nextword: ['experience'], words: ['experience'], tokens: ['numbers', 'split'], ids: ['numbers', 'ids'], embeddings: ['numbers', 'qualities'], context: ['transformer'], logits: ['pick', 'match'], repeat: ['whole', 'flow'] };
  S.top = 'experience'; S.sub = 'main';
  const tabOf = (id) => TABS.find((t) => t.id === id);
  const subOf = () => { const t = tabOf(S.top); return t.subs.find((x) => x.id === S.sub) || t.subs[0]; };
  NT.stations.learning = NT.stations.learning || { init() { $('#stage').innerHTML = `<div class="panel emptynote">This part of the lesson is being built: how GPT-2 learned its numbers by predicting the next word in a huge amount of text, again and again.</div>`; NT.setStatus(''); } };

  // ---------- tabs ----------
  $('#strip').innerHTML = TABS.map((t, i) => `<button class="tab6" data-t="${t.id}"><span class="n">${i + 1}</span>${t.label}</button>`).join('');
  $('#strip').querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => go(b.dataset.t)));
  const lastSub = {};
  function go(top, sub) {
    if (top === 'context') { top = 'transformer'; sub = null; } // the old Use Context tab
    const t = tabOf(top); if (!t) return;
    if (S.top !== top && S.top) lastSub[S.top] = S.sub;
    if (top === 'pick') sub = 'pick'; // the old sub-tabs (match, chances, settings, draw) are steps of one page now
    if (top === 'whole' && sub === 'one') sub = 'flow'; // Watch it repeat was retired: the Animated flow (with fast-forward) does its job
    S.top = top; S.sub = (sub && t.subs.some((x) => x.id === sub)) ? sub : (lastSub[top] || t.subs[0].id);
    const sb = subOf(); if (sb.set) sb.set(); S.station = sb.st;
    render();
  }
  NT.goTab = go;
  // legacy: NT.go(stationId) from inside a view
  NT.go = (id) => { if (tabOf(id)) return go(id); const L = LEGACY[id]; if (L) return go(L[0], L[1]); for (const t of TABS) { const sb = t.subs.find((x) => x.st === id); if (sb) return go(t.id, sb.id); } };
  // Oct 18 (Greg): "What to do" is folded into the About text (the top line, above the controls); the old bar now only holds a page's own tools
  NT.setTodo = (text) => { const t = document.getElementById('todoText'); if (t) t.textContent = text || ''; const w = t && t.closest('.whotodo'); if (w) w.hidden = !text; };
  NT.whoEl = document.getElementById('whoLine'); // kept by reference: player pages borrow it (NT.guideRow) and may redraw around it
  const whoSeen = new Set();
  // "On this page" also folds away the first time the page is used (a click in it), so the picture gets the room (150% Windows scaling: 1280×800)
  // any click folds the About line away (after the click has done its job) — except the About button itself, and a click that just opened a new page's About line
  let clickN = 0, whoOpenedAt = -1;
  document.addEventListener('click', () => { clickN++; }, true);
  NT.whoOpened = () => { whoOpenedAt = clickN; };
  document.addEventListener('click', (e) => { const w = NT.whoEl; if (!w || w.hidden || whoOpenedAt === clickN) return; if (e.target.closest && e.target.closest('#whoTog')) return; setTimeout(() => NT.setWho(false), 0); }); // after the click has done its job, so nothing moves under the pointer
  NT.setWho = (open) => { const w = NT.whoEl; if (!w || !w.dataset.has || w.hidden === !open) return; w.hidden = !open; const b = $('#whoTog'); if (b) b.classList.toggle('on', open); window.dispatchEvent(new Event('resize')); }; // the pictures refit
  // the button that folds and unfolds "On this page"; pages that redraw the sub-tab row call it again
  NT.whoToggle = () => { const subs = $('#subtabs'), w = NT.whoEl; if (!subs || !w || !w.dataset.has || $('#whoTog')) return; subs.insertAdjacentHTML('beforeend', `<button class="whotog ${w.hidden ? '' : 'on'}" id="whoTog" title="What is on this page">ⓘ About this page</button>`); $('#whoTog').onclick = () => NT.setWho(w.hidden); };

  // ---------- sentence (an ordinary textarea whose text is drawn, with bubbles, by the layer behind it) ----------
  const ta = $('#sentence'), back = $('#sentBack'), wrap = $('#sentWrap');
  // long sentences (Oct 18, Greg): shrink the font step by step until the text fits on one line, down to normal text size; then let the box
  // grow to at most three lines while the font keeps shrinking (down to MIN); only past that does the box scroll
  const BIG = 1.5, SMALL = 1.0, MIN = 0.62, MAXL = 3; // rem, rem, rem, lines at SMALL
  const fitFont = (fixed) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    let f = window.innerWidth < 900 ? 1.2 : BIG;
    const setF = (x) => { ta.style.fontSize = back.style.fontSize = x + 'rem'; ta.style.height = 'auto'; };
    const maxH = Math.round(SMALL * rem * 1.45 * MAXL + 8), oneLine = () => f * rem * 1.45 + 8;
    setF(f);
    while (f > SMALL && ta.scrollHeight > oneLine() + 2) { f = Math.max(SMALL, Math.round((f - 0.05) * 100) / 100); setF(f); }
    while (f > MIN && ta.scrollHeight > maxH + 1) { f = Math.max(MIN, Math.round((f - 0.04) * 100) / 100); setF(f); }
    ta.style.height = (fixed ? maxH : Math.min(ta.scrollHeight, maxH)) + 'px';
    ta.style.overflowY = ta.scrollHeight > maxH + 1 ? 'auto' : 'hidden';
  };
  // Overview while GPT-2 writes (body.genlock): a fixed three-line box, so the page doesn't jump with every token
  const locked = () => document.body.classList.contains('genlock') && document.body.dataset.st === 'next';
  const autosize = () => { fitFont(locked()); ta.scrollTop = ta.scrollHeight; back.scrollTop = ta.scrollTop; };
  ta.addEventListener('autosize', autosize);
  ta.addEventListener('scroll', () => { back.scrollTop = ta.scrollTop; });
  let typing = null;
  ta.addEventListener('input', () => { NT.syncBack(ta.value); autosize(); clearTimeout(typing); typing = setTimeout(() => NT.setText(ta.value.replace(/\n/g, ' '), 'edit'), 280); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(typing); NT.setText(ta.value.replace(/\n/g, ' '), 'edit'); } });
  // hover and click on bubbles (the textarea sits on top, so hit-test the bubbles' boxes)
  const tip = document.createElement('div'); tip.className = 'bubtip'; tip.hidden = true; document.body.appendChild(tip);
  const hit = (x, y) => { for (const m of back.querySelectorAll('mark.bub')) for (const r of m.getClientRects()) if (x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2) return m; return null; };
  wrap.addEventListener('mousemove', (e) => {
    const m = hit(e.clientX, e.clientY), k = m && S.marks[+m.dataset.m];
    if (!k) { tip.hidden = true; wrap.classList.remove('onbub'); return; }
    tip.textContent = k.tip; tip.hidden = false; wrap.classList.add('onbub');
    const r = m.getClientRects()[0]; tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, r.left)) + 'px'; tip.style.top = (r.bottom + window.scrollY + 8) + 'px';
  });
  wrap.addEventListener('mouseleave', () => { tip.hidden = true; });
  wrap.addEventListener('click', (e) => { const m = hit(e.clientX, e.clientY), k = m && S.marks[+m.dataset.m]; if (k && k.gen && NT.onBubble) NT.onBubble(k.gen); });
  const starter = $('#starter');
  // the dropdown lists starter sentences, or tokenization examples on Input; picking one replaces the sentence
  let starterList = [], starterFor = null;
  const short = (t) => (t.length > 54 ? t.slice(0, 52) + '…' : t);
  function fillStarter() {
    const kind = S.top === 'numbers' ? 'tok' : S.station === 'flow' ? 'flow' : 'start'; if (starterFor === kind) return; starterFor = kind;
    starterList = kind === 'flow' ? NT.CTX_EXAMPLES.filter(([, k]) => ['story', 'umbrella', 'trophy'].includes(k)).map(([l, k]) => [NT.EX[k].text, l]) : kind === 'tok' ? NT.TOK_EXAMPLES.map(([l, t]) => [t, l]) : kind === 'ctx' ? NT.CTX_EXAMPLES.map(([l, k]) => [NT.EX[k].text, l]) : NT.STARTERS.map(([, t, l]) => [t, l || short(t)]);
    starter.innerHTML = `<option value="" disabled>${kind === 'flow' ? 'The story, with tokens added' : 'Your own sentence'}</option>` + starterList.map(([, l], i) => `<option value="${i}">${esc(l)}</option>`).join('');
    syncStarter();
  }
  starter.onchange = () => { if (starter.value === '') return; NT.setText(starterList[+starter.value][0], 'edit'); wrap.classList.remove('flash'); void wrap.offsetWidth; wrap.classList.add('flash'); };
  const syncStarter = () => { const t = NT.current().text, i = starterList.findIndex(([x]) => x.replace(/\s+$/, '') === t); starter.value = i >= 0 ? String(i) : ''; };

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
    c.innerHTML = s.phase === 'downloading' ? `GPT-2 loading <i><b style="width:${pct}%"></b></i> ${pct}%` : s.phase === 'cached' ? '<s></s>GPT-2 downloaded' : s.phase === 'starting' ? 'GPT-2 starting…' : s.phase === 'ready' ? '<s></s>GPT-2 ready' : 'GPT-2 offline';
    c.title = s.phase === 'error' ? 'The model files could not be reached. Stored sentences still work.' : 'GPT-2 loads quietly in the background so any sentence can be used.';
    if (NT.onLive) NT.onLive(s);
  });

  // ---------- router ----------
  const cur = () => NT.stations[S.station];
  function render() {
    const t = tabOf(S.top), sb = subOf();
    $('#strip').querySelectorAll('.tab6').forEach((b) => { const on = b.dataset.t === S.top; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
    const subs = $('#subtabs');
    const si = t.subs.findIndex((x) => x.id === sb.id);
    subs.innerHTML = t.subs.length > 1 ? t.subs.map((x, i) => `<button class="sub ${i === si ? 'on' : i < si ? 'done' : ''}" data-u="${x.id}" aria-pressed="${i === si}"${x.cap ? ` title="${x.cap}"` : ''}>${x.label}${x.cap ? `<small>${x.cap}</small>` : ''}</button>`).join('') : '';
    subs.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => go(S.top, b.dataset.u)));
    { const pb = $('#presetBar'); if (pb && S.top !== 'pick') pb.hidden = true; } // Greedy · Typical · Wild · Plain: Output only
    $('#todoTools').innerHTML = ''; // the controls row: a page's own buttons (it hides itself when empty)
    // "On this page": a short line naming the players on the page. It opens the first time a page is visited; after that it stays folded
    // behind the "ⓘ About this page" button at the right of the sub-tab row, to keep the page's picture on screen.
    { const w = NT.whoEl; if (w) { const key = S.top + '/' + sb.id, td = sb.notodo ? '' : sb.todo || '';
      w.innerHTML = (sb.who ? `<span class="whotext">${sb.who.replace(/^On this page:\s*/, '<b class="whohd">On this page:</b> ')}</span>` : '') + `<span class="whotodo"${td ? '' : ' hidden'}><b class="whohd">To do:</b> <span id="todoText">${td}</span></span>`;
      const has = !!(sb.who || td); w.dataset.has = has ? '1' : ''; w.hidden = !has || whoSeen.has(key); if (!w.hidden) NT.whoOpened(); whoSeen.add(key); } NT.whoToggle(); }
    NT.setStatus('');
    NT.onLive = null; NT.onBubble = null;
    { const w = NT.whoEl; if (w && w.parentNode !== $('#main')) $('#toolbar').before(w); } // a player page borrowed it (see NT.guideRow): bring it home before the page is cleared
    if (S.station !== 'mlbook' && S.bookSaved != null) { const t0 = S.bookSaved; S.bookSaved = null; S.quietText = true; NT.setText(t0, 'edit'); S.quietText = false; } // leaving Learn one example: the sentence comes back
    $('#toolbar').innerHTML = ''; $('#stage').innerHTML = '';
    document.body.dataset.top = S.top; document.body.dataset.st = S.station; fillStarter(); autosize();
    { const lock = S.station === 'flow' || S.station === 'mlbook'; ta.readOnly = lock; ta.title = S.station === 'mlbook' ? 'This page always uses one sentence from A Tale of Two Cities.' : lock ? 'The Animated flow uses stored GPT-2 numbers, so this sentence can’t be typed here. Choose a story in the dropdown; the flow adds each picked token itself.' : ''; }
    { const kc = $('#kSlider').closest('.ctl'); if (kc && S.station !== 'pick') kc.classList.remove('off'); }
    const needsText = ['next', 'ids', 'tokids', 'split', 'transformer', 'logits', 'pick', 'repeat', 'nmflow', 'pkscene'].includes(S.station) || (S.station === 'embeddings' && S.embView === 'input');
    if (needsText && !NT.current().ids.length) {
      $('#stage').innerHTML = `<div class="panel emptynote">Type a sentence at the top, or choose a starter, to begin.</div>`;
    } else cur().init();
    document.querySelectorAll('.ctlrow .ctl').forEach((c) => c.classList.toggle('quiet', !['next', 'pick', 'repeat', 'pkscene', 'flow'].includes(S.station)));
    try { history.replaceState(null, '', '#' + S.top + (t.subs.length > 1 ? '/' + sb.id : '')); } catch (e) { /* ignore */ }
  }
  NT.render = render;
  NT.on((what, how) => {
    if (what === 'text' && S.quietText) { syncStarter(); return; }
    if (what === 'text') { syncStarter(); if (cur().onText) cur().onText(how); else render(); }
    if (what === 'tk') { syncTK(); if (cur().onTK) cur().onTK(); }
  });

  // ---------- start ----------
  const q = new URLSearchParams(location.search); if (q.get('text')) S.text = q.get('text');
  ta.value = S.text; NT.syncBack(S.text); autosize(); syncTK();
  const fromHash = () => { const [a, b] = (location.hash || '').slice(1).split('/'); if (tabOf(a)) go(a, b); else if (LEGACY[a] || NT.stations[a]) NT.go(a); else go('experience'); };
  fromHash();
  window.addEventListener('hashchange', () => { const [a, b] = location.hash.slice(1).split('/'); if (a !== S.top || (b && b !== S.sub)) fromHash(); });
  const idle = (fn, t) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: t }) : setTimeout(fn, t));
  window.addEventListener('load', () => setTimeout(() => idle(() => NT.warmEmb(), 4000), 900));
  NT.live.scheduleIdle();
  window.addEventListener('resize', autosize);
  // number keys 1–6 jump between the lesson tabs (not while typing)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target, tag = el && el.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
    const n = parseInt(e.key, 10); if (n >= 1 && n <= TABS.length) go(TABS[n - 1].id);
  });
})();
