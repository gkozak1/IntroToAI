/* LLM Lab — tab 2, Input: tokenization examples, "Split into tokens" (class cuts vs GPT-2) and "Token IDs". */
'use strict';
(() => {
  const { $, esc, int } = NT;
  const S = NT.state;
  const st = () => $('#stage');

  // ---------- tokenization examples (the dropdown on this tab) ----------
  // [label, text, why] — every claim in `why` was checked against GPT-2's real tokenizer
  NT.TOK_EXAMPLES = [
    ['The story: …sat on the left bank of the…', 'The banker left the bank and sat on the left bank of the', 'Every word here is common, so each one is a single token. The space goes with the word after it: “·bank”, not “bank·”. The two “·bank”s are the same token, and so are the two “·left”s; capital “The” is a different token from “·the”. Try the next three sentences to see words break apart.'],
    ['One long word', 'unbelievable', 'A simple start: GPT-2 cuts “unbelievable” into un · bel · iev · able. The pieces are chunks of letters that showed up together often in its training text, not syllables or dictionary parts. The next three sentences show the same thing inside real sentences.'],
    ['Unfriendliest classmates', 'My unfriendliest classmates were overthinking the homework.', 'A person would cut “unfriendliest” into un + friend + li + est. GPT-2 cuts it into “·unf” + “riend” + “liest”: chunks of letters that were common in its training text, not word parts. “·overthinking” becomes “·over” + “thinking”, while “·classmates” and “·homework” are common enough to stay whole. 7 words, 11 tokens.'],
    ['The skateboarder’s TikTok', 'The skateboarder\'s TikTok went viral overnight.', '“·skateboarder” becomes “·skate” + “board” + “er”, and “’s” is a token of its own. “TikTok” barely existed in GPT-2’s 2019 web text, so it splits into “·Tik” + “Tok”. Everyday words like “·viral” and “·overnight” are one token each. 6 words, 11 tokens.'],
    ['Carmel’s homecoming parade', 'Carmel\'s homecoming parade was unforgettable.', 'A town name that’s rare on the web gets built from pieces: “C” + “arm” + “el”. “·homecoming” splits into “·home” + “coming”, yet the longer “·unforgettable” is a single token. Length doesn’t decide it: how often the whole word appeared in GPT-2’s training text does.'],
    ['Why AI miscounted the r’s', "I like strawberry jam. How many r's are in strawberry?", '“·strawberry” is a single token (41236), so GPT-2 never sees its letters. Ask it to count the r’s and it has to guess. This is a real reason AI models used to get that question wrong.'],
    ['Numbers', 'In 2026, about 1,254,630 people paid $3.14 each.', 'Numbers split in odd places: “·2026” becomes “·20” + “26”, and “1,254,630” becomes five tokens. Older models never saw whole numbers, one reason they were bad at arithmetic.'],
    ['Other languages and emoji', 'Hello, bonjour, hola, 你好 😀', 'GPT-2 learned mostly English. “bonjour” and “hola” split into pieces, and Chinese characters and emoji become several byte pieces each: the computer codes underneath the character.'],
    ['Practice text for building a tokenizer', 'kind unkind kindly kindness fair unfair fairly fairness happy unhappy happily happiness', 'Three word families. Open Build the tokenizer and watch pieces like “·un”, “ly” and “ness” appear on their own: the tokenizer knows nothing about grammar, it only counts which letters sit next to each other most often.'],
  ];
  const whyFor = (text) => { const e = NT.TOK_EXAMPLES.find((x) => x[1] === text.trim()); return e ? e[2] : null; };

  // ---------- GPT-2's split, mapped onto the characters of the sentence ----------
  const enc = new TextEncoder();
  function analyze(text) {
    const cps = Array.from(text), ids = NT.encode(text);
    const cpByte = []; let b = 0; cps.forEach((c) => { cpByte.push(b); b += enc.encode(c).length; });
    const byteToCp = new Map(cpByte.map((x, i) => [x, i]));
    const cpAt = (byte) => { let i = 0; while (i + 1 < cpByte.length && cpByte[i + 1] <= byte) i++; return i; };
    const toks = []; let off = 0;
    ids.forEach((id) => {
      const n = NT.tokBytes(id), t = NT.tokText(id), s0 = off; off += n;
      const startCp = byteToCp.has(s0) ? byteToCp.get(s0) : null, partial = /�/.test(t);
      const covered = cps.slice(cpAt(s0), cpAt(off - 1) + 1).join('');
      toks.push({ id, t, s0, e0: off, startCp, partial, covered });
    });
    const gcut = new Set(toks.map((x) => x.startCp).filter((x) => x != null && x > 0));
    toks.forEach((x, i) => {
      const core = x.t.trim();
      if (x.partial) x.kind = 'byte';
      else if (!/[\p{L}\p{N}]/u.test(core)) x.kind = /^\s*$/.test(x.t) ? 'space' : 'punct';
      else if (/^\p{N}+$/u.test(core)) x.kind = 'num';
      else {
        const before = i > 0 ? toks[i - 1].t : '', after = i + 1 < toks.length ? toks[i + 1].t : '';
        const glued = (/^\S/.test(x.t) && /[\p{L}\p{N}]$/u.test(before)) || /^[\p{L}\p{N}]/u.test(after);
        x.kind = glued ? 'piece' : 'word';
      }
    });
    return { cps, toks, gcut };
  }
  const KIND = { word: ['whole word', 't-word'], piece: ['piece of a word', 't-piece'], punct: ['punctuation', 't-punct'], num: ['number', 't-num'], space: ['space', 't-punct'], byte: ['part of a character', 't-byte'] };
  const shown = (t) => esc(t).replace(/^ /, '<span class="spdot">·</span>').replace(/\n/g, '↵');
  const chipText = (x) => (x.partial ? `<span class="bytec">${esc(x.covered)}</span><small>byte</small>` : shown(x.t));

  // a rough syllable count for the four-ways table (vowel groups, minus a silent final e)
  function syllables(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0;
    const groups = w.replace(/e$/, '').match(/[aeiouy]+/g); return Math.max(1, groups ? groups.length : 1);
  }
  function fourWays(text, nTok, revealed) {
    const words = text.split(/\s+/).filter(Boolean);
    const chars = Array.from(text).filter((c) => !/\s/.test(c)).length;
    let syl = 0; words.forEach((w) => { const s = syllables(w); syl += s; const extra = (w.match(/[^\p{L}'’]+/gu) || []).length; syl += extra; });
    return `<div class="fourways"><div class="h4">Four ways to split this sentence</div>
      <table class="gt"><tr><th>Split into</th><th>Pieces in this sentence</th><th>Different pieces to learn</th><th>The trade-off</th></tr>
      <tr><td>Letters and marks</td><td>${chars}</td><td>about 100</td><td class="muted">Easy to learn, but every sentence turns into a long list of pieces to work through.</td></tr>
      <tr><td>Syllables</td><td>about ${syl}</td><td>about 15,000 in English</td><td class="muted">Fewer pieces, but a big list to learn, and there’s no simple rule for where one syllable ends.</td></tr>
      <tr><td>Words</td><td>${words.length}</td><td>600,000+, and new ones every year</td><td class="muted">The fewest pieces, but a word that isn’t in the list (a new word or a typo) can’t be written at all.</td></tr>
      <tr class="me"><td><b>GPT-2 tokens</b></td><td><b>${revealed ? nTok : '?'}</b></td><td><b>50,257</b></td><td><b>A middle ground: common words are one piece, rare words are built from smaller pieces, so any text can be written.</b></td></tr></table></div>`;
  }
  function genericWhy(A) {
    const split = []; let cur = [];
    A.toks.forEach((x, i) => { const startsWord = /^\s/.test(x.t) || i === 0 || !/[\p{L}]/u.test((A.toks[i - 1] || {}).t || ''); if (startsWord && cur.length) { split.push(cur); cur = []; } cur.push(x); });
    if (cur.length) split.push(cur);
    const pieced = split.filter((g) => g.length > 1 && g.every((x) => x.kind === 'piece' || x.kind === 'word' || x.kind === 'byte') && g.some((x) => x.kind === 'piece' || x.kind === 'byte')).slice(0, 3);
    if (!pieced.length) return 'Every word here was common enough in GPT-2’s training text to get its own token. The space travels with the word after it.';
    const names = pieced.map((g) => `“${esc(g.map((x) => x.t).join('').trim())}” (${g.map((x) => esc(x.partial ? 'byte' : x.t.trim())).join(' + ')})`).join(', ');
    return `${names} ${pieced.length === 1 ? 'was' : 'were'} rare in GPT-2’s training text, so ${pieced.length === 1 ? 'it was' : 'they were'} built from smaller pieces it knows. Common words get a single token, and the space travels with the word after it.`;
  }

  // ===================== Split into tokens =====================
  const sp = { text: null, cuts: new Set(), revealed: false };
  NT.stations.split = {
    init() {
      const text = NT.current().text;
      if (sp.text !== text) { sp.text = text; sp.cuts = new Set(); sp.revealed = false; }
      st().innerHTML = `<div class="exsplit">
        <section class="panel" id="spLeft"></section>
        <section class="panel" id="spRight"></section></div>`;
      draw();
    },
    onText() { NT.stations.split.init(); },
    onTK() {},
  };
  function draw() {
    const A = analyze(sp.text), n = A.cps.length;
    const norm = (i) => (i > 0 && A.cps[i - 1] === ' ' && A.cps[i] !== ' ' ? i - 1 : i); // a cut just after a space counts as a cut before it
    const cuts = new Set([...sp.cuts].map(norm).filter((i) => i > 0 && i < n));
    const match = [...cuts].filter((i) => A.gcut.has(i)).length;
    NT.setTodo(sp.revealed ? 'Compare your cuts with GPT-2’s. Why did some words break into pieces?' : 'Cut the sentence where you think GPT-2 will, then Reveal and compare.');
    // ----- left: the class's cuts -----
    let h = '<span class="wd">';
    A.cps.forEach((c, i) => {
      if (i > 0 && /\s/.test(c) && !/\s/.test(A.cps[i - 1])) h += '</span><span class="wd">'; // a new unit starts at each space (the space goes with the word after it, as in GPT-2)
      if (i > 0) {
        let cls = '';
        if (!sp.revealed) cls = cuts.has(i) ? 'cut' : '';
        else cls = cuts.has(i) && A.gcut.has(i) ? 'ok' : cuts.has(i) ? 'extra' : A.gcut.has(i) ? 'miss' : '';
        h += `<button class="gap ${cls}" data-g="${i}" aria-label="Cut before character ${i + 1}" ${sp.revealed ? 'tabindex="-1"' : ''}></button>`;
      }
      h += c === ' ' ? '<span class="ch sp">·</span>' : c === '\n' ? '<span class="ch sp">↵</span>' : `<span class="ch">${esc(c)}</span>`;
    });
    h += '</span>';
    const L = $('#spLeft');
    L.innerHTML = `<div class="ph"><h2>How would you tokenize it?</h2><span class="sub">click between letters to cut · click again to undo</span></div>
      <div class="letters ${sp.revealed ? 'scored' : ''}" id="spLetters">${h}</div>
      <div class="tools"><button class="btn" id="spSpaces">Cut at every space</button><button class="btn ghost" id="spClear" ${cuts.size ? '' : 'disabled'}>Clear cuts</button><span class="grow"></span><span class="count">Your split: ${cuts.size + 1} piece${cuts.size ? 's' : ''}</span></div>
      <div class="key">${sp.revealed ? `<span><i style="background:#1f8a4c"></i>you and GPT-2 cut here (${match})</span><span><i class="dash"></i>only GPT-2 cut here (${[...A.gcut].filter((x) => !cuts.has(x)).length})</span><span><i style="background:#c0392b"></i>only you (${[...cuts].filter((x) => !A.gcut.has(x)).length})</span>` : '<span><i style="background:var(--accent)"></i>your cut</span>'}</div>
      ${sp.revealed ? '' : '<div class="note">Common words are usually one token. Where would a computer trained on 2019 web text struggle?</div>'}
      ${fourWays(sp.text, A.toks.length, sp.revealed)}`;
    $('#spLetters').addEventListener('click', (e) => { const g = e.target.closest('.gap'); if (!g || sp.revealed) return; const i = +g.dataset.g; if (sp.cuts.has(i)) sp.cuts.delete(i); else sp.cuts.add(i); draw(); });
    $('#spSpaces').onclick = () => { A.cps.forEach((c, i) => { if (c === ' ' && i > 0) sp.cuts.add(i); }); draw(); };
    $('#spClear').onclick = () => { sp.cuts = new Set(); draw(); };
    // ----- right: GPT-2's split -----
    const R = $('#spRight');
    if (!sp.revealed) {
      R.innerHTML = `<div class="ph"><h2>GPT-2’s tokens</h2></div><div class="hiddenbox"><span>GPT-2’s split stays hidden until the class has made its cuts.</span><button class="btn primary" id="spReveal">Reveal</button></div>`;
      $('#spReveal').onclick = () => { sp.revealed = true; draw(); };
      NT.setStatus(`${cuts.size + 1} ${cuts.size ? 'pieces' : 'piece'} so far`); return;
    }
    const words = sp.text.split(/\s+/).filter(Boolean).length;
    const rows = A.toks.map((x, i) => {
      const k = KIND[x.kind]; const youCut = i === 0 ? '' : x.startCp == null ? '<span class="muted">inside a character</span>' : cuts.has(x.startCp) ? '<span class="yes">✓</span>' : '<span class="no">missed</span>';
      return `<tr><td>${i + 1}</td><td class="w">${x.partial ? `${esc(x.covered)} <span class="muted">(byte)</span>` : shown(x.t)}</td><td>${x.id}</td><td><span class="tag ${k[1]}">${k[0]}</span></td><td>${youCut}</td></tr>`;
    }).join('');
    const why = whyFor(sp.text) || genericWhy(A);
    R.innerHTML = `<div class="ph"><h2>GPT-2’s tokens</h2><span class="sub">· = the space that starts a token</span><span class="grow"></span><button class="btn primary" id="spHide">Hide</button></div>
      <div class="toks2">${A.toks.map((x, i) => `<span class="tk ${i % 2 ? 'b' : 'a'} ${x.partial ? 'byte' : ''}" title="Token ID ${x.id}">${chipText(x)}</span>`).join('')}</div>
      <div class="stats"><span><b>${words}</b> word${words === 1 ? '' : 's'}</span><span><b>${A.toks.length}</b> GPT-2 tokens</span><span>You found <b>${match} of ${A.gcut.size}</b> of GPT-2’s cuts</span></div>
      <div class="whybox"><b>Why?</b> ${why}</div>
      <div class="tokt"><table class="gt"><tr><th>#</th><th>Token</th><th>Token ID</th><th>What it is</th><th>You cut before it?</th></tr>${rows}</table></div>`;
    $('#spHide').onclick = () => { sp.revealed = false; draw(); };
    NT.setStatus(`${A.toks.length} tokens · you matched ${match} of ${A.gcut.size} cuts`);
  }

  // ===================== Token IDs =====================
  // the flow's first steps (sentence → tokens → rows → IDs), then each ID looks up its embedding vector (js/numflow.js);
  // under it, GPT-2's whole token list, scrolled to the selected token's ID
  const ti = { id: null };
  const VROW = 28;
  NT.stations.tokids = {
    init() {
      st().innerHTML = `<div id="tiScene"></div>
        <details class="panel tivocab" id="tiDet"><summary><b>GPT-2’s whole token list</b> <span class="muted">all 50,257 tokens, numbered 0 to 50,256: an ID is just a place in this list. Open it to scroll the list or look up any token.</span>
          <div class="tifirst">${Array.from({ length: 10 }, (_, k) => `<span class="tfc"><b>${k}</b> ${esc(NT.tokText(k)).replace(/^ /, '·')}</span>`).join('')}<span class="muted">… 50,247 more</span></div></summary><div id="tiVocab"></div></details>`;
      ti.id = null;
      NT.numScene($('#tiScene'), 'ids', { onSelect: (id) => { ti.id = id; if ($('#tiDet').open) vocab(id); }, more: ['Next: Meaning as numbers ›', () => NT.goTab('numbers', 'qualities')] });
      $('#tiDet').ontoggle = () => { if ($('#tiDet').open) vocab(ti.id != null ? ti.id : NT.current().ids[0]); };
      NT.setStatus(`${NT.current().ids.length} tokens`);
    },
    onText() { NT.stations.tokids.init(); },
    onTK() {},
  };
  function vocab(id, keep) {
    if (id == null) return;
    const prevTop = keep && $('#tiList') ? $('#tiList').scrollTop : null;
    $('#tiVocab').innerHTML = `<div class="jump"><input type="text" id="tiJump" placeholder="Look up an ID (like 3331) or a word (like bank)" autocomplete="off"><button class="btn" id="tiGo">Look up</button></div><div class="note" id="tiMsg"></div>
      <div class="vhead"><span>ID</span><span>Token</span></div><div class="vlist" id="tiList"><div class="vspace" style="height:${50257 * VROW}px"></div><div class="vrows" id="tiRows"></div></div>
      <div class="note">The tokens next to ${esc(NT.tokText(id).trim() || '?')} in the list have nothing to do with it: the ID is only its place in the list.</div>`;
    const list = $('#tiList');
    const paint = () => {
      const top = list.scrollTop, h = list.clientHeight, a0 = Math.max(0, Math.floor(top / VROW) - 6), a1 = Math.min(50256, Math.ceil((top + h) / VROW) + 6);
      let r = ''; for (let k = a0; k <= a1; k++) r += `<div class="vrow ${k === id ? 'hit' : ''}" style="top:${k * VROW}px" data-k="${k}"><span>${k}</span><span>${k === 50256 ? '&lt;|endoftext|&gt;' : esc(NT.tokText(k)).replace(/^ /, '·').replace(/\n/g, '↵')}</span></div>`;
      $('#tiRows').innerHTML = r;
    };
    list.addEventListener('scroll', () => requestAnimationFrame(paint));
    list.addEventListener('click', (e) => { const r = e.target.closest('.vrow'); if (r) vocab(+r.dataset.k, true); });
    list.scrollTop = prevTop != null ? prevTop : Math.max(0, id * VROW - list.clientHeight / 2 + VROW / 2);
    paint();
    const go = () => {
      const v = $('#tiJump').value.trim(); if (!v) return;
      let k = /^\d+$/.test(v) ? +v : NT.tokenIdOf(' ' + v); if (k < 0 && !/^\d+$/.test(v)) k = NT.tokenIdOf(v);
      if (k >= 0 && k < 50257) vocab(k);
      else $('#tiMsg').textContent = /^\d+$/.test(v) ? 'IDs go from 0 to 50,256.' : `“${v}” is not a single token. GPT-2 writes it as ${NT.encode(' ' + v).length} tokens.`;
    };
    $('#tiGo').onclick = go; $('#tiJump').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }
})();
