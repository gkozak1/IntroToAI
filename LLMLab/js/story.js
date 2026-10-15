/* LLM Lab — shared story pieces (the old Use Context tab, js/interview.js, was retired Oct 14; its pages live on in Transformer).
   Kept: the story's stored data loader (NT.ctxData), the story list (NT.CTX_EXAMPLES) and the helpers Output and the flow still use (NT.uc). */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const st = () => $('#stage');
  const pc = (x) => Math.round(x * 100) + '%';
  const col = (t) => `rgb(${NT.div(Math.max(-1, Math.min(1, t))).map((v) => v | 0).join(',')})`;
  const b64i8 = (s) => { const u = NT.b64(s); return new Int8Array(u.buffer, u.byteOffset, u.byteLength); };
  let dataP = null;
  const ctxData = () => dataP || (dataP = new Promise((res, rej) => { if (window.CTX_DATA) return res(window.CTX_DATA); const s = document.createElement('script'); s.src = './data/context-data.js'; s.onload = () => res(window.CTX_DATA); s.onerror = rej; document.head.appendChild(s); }));
  NT.ctxData = ctxData;

  // the dropdown on this tab: the story, then the other stories with stored room-by-room numbers
  const STORY = 'story';
  NT.CTX_EXAMPLES = [['The story: …sat on the left bank of the…', 'story'], ['Umbrella: …it was starting to…', 'umbrella'], ['Trophy: …because it was too…', 'trophy'], ['Annie’s picnic: …pack a…', 'annie']];
  const STORED = new Set(['story', 'umbrella', 'trophy', 'annie']);

  // ---------- the story sentence, scripted: "The banker left the bank and sat on the left bank of the" ----------
  const SW = ['The', 'banker', 'left¹', 'the', 'bank¹', 'and', 'sat', 'on', 'the', 'left²', 'bank²', 'of', 'the'];
  const SCOL = ['#8a94a6', '#2b5aa8', '#d9730d', '#9aa5b5', '#1f8a4c', '#8e44ad', '#16a085', '#7a8699', '#9aa5b5', '#b5530a', '#0f6b38', '#5b6577', '#c2185b'];
  const SLAST = 12;
  const CARD0 = ['first token of the sentence', 'a person who works with money', 'an action: going away', 'points at the next token', 'a place: money or river', 'a joining word', 'an action: sitting down', 'a position word', 'points at the next token', 'going away, or a side?', 'a place: money or river', 'links to what comes next', 'points at the next token, right after “of”'];
  const CARD2 = ['nothing comes before me', 'I’m the one doing things', 'it was the banker who left', 'it’s “the bank” he left', 'a money bank (a banker is near)', 'joins two actions', 'the banker sat down', 'sat on something', '“the” something he sat on', 'a side: “on the left”', 'a place he sat on: money or river?', '“bank of” something', '“the” what? a place where he sat'];
  const TAG = ['Not much.', 'A person; works at a bank.', 'Leaving a place.', 'Not much.', 'A place: money or river.', 'Not much.', 'Sitting somewhere.', 'On top of something.', 'Not much.', 'A side, or leaving.', 'A place: money or river.', 'Belongs to something.', 'Not much.'];
  const GIVE = ['—', 'a person · money job', 'leaving', '—', 'a place · money or river', 'joining', 'sitting down', 'on top of', '—', 'a side', 'a place he sat on', 'of something…', '—'];
  const INT1 = 'Where is this happening?';
  const ASK = ['Where is this happening?', 'Where does this happen?', 'Left where?', 'The what place?', 'Which kind of bank?', 'Where are we so far?', 'Sat where?', 'On what?', 'On the what?', 'Left as in going, or a side?', 'Which kind of bank is this one?', 'Bank of what?', 'What kind of place is this?'];
  const REL = [0.05, 0.35, 0.2, 0.08, 0.8, 0.05, 0.55, 0.5, 0.1, 0.5, 1, 0.45, 0.15]; // how well each token's name tag fits the "where?" topic (made up)
  const shareFor = (q) => { const w = REL.slice(0, q + 1).map((r) => Math.pow(r, 1.6)); const s = w.reduce((a, b) => a + b, 0); const p = w.map((x) => Math.round((100 * x) / s)); p[p.indexOf(Math.max(...p))] += 100 - p.reduce((a, b) => a + b, 0); return p.map((x) => x / 100); };
  // the 12 interviewers in room 2, interviewing the last "the" (made up): question, who they listen to most, their note
  const TWELVE = [
    ['What kind of place is this?', 10, 'a bank, the kind you sit on'], ['What just happened?', 6, 'someone sat down'], ['Who is this about?', 1, 'the banker'],
    ['What token is right before me?', 11, 'right after “of”'], ['Which side?', 9, 'the left side'], ['Money or nature?', 6, 'sitting outside: maybe nature'],
    ['Has this place come up before?', 4, 'a bank came up before'], ['What kind of token am I?', 12, 'a pointing word: a thing is named next'], ['What is “of” connecting?', 11, '“bank of” something'],
    ['What did the banker do first?', 2, 'he left the bank'], ['Is something about to be named?', 12, 'a place or thing is coming'], ['What amount or number is mentioned?', 0, 'nothing to report: no amounts here (rests on “The”)'],
  ];
  const ROOMCARD = { sup: '+ a bank he sat on, on the left side; “bank of” something', fact: '+ “bank of the …” is often a river or a street; sitting on a bank: outdoors' };

  // ---------- Room after room: narration for each story ----------
  const STOPSETS = {
    story: { target: ' river', stops: [
      { rooms: [0], label: 'Before room 1', lines: ['“the” · token 13 of 13'], say: '“I only know I’m ‘the’. No idea what comes next.”' },
      { rooms: [1], label: 'Room 1', lines: ['+ comes right after “of”'], say: '“the same”?' },
      { rooms: [2], label: 'Room 2', lines: ['+ a bank he sat on, on the left side', '+ “bank of” something'], say: 'Still “the same”…' },
      { rooms: [3, 4, 5, 6, 7], def: 7, label: 'Rooms 3–7', lines: ['+ the banker left a money bank, then sat on another bank', '+ this is a story about a place'], say: '“the same”? a town? a city?', many: true },
      { rooms: [8, 9], def: 9, label: 'Rooms 8–9', lines: ['+ a bank you can sit on is often by water'], say: '“river” is climbing fast…' },
      { rooms: [10, 11], def: 10, label: 'Rooms 10–11', lines: ['+ next: a river, the kind of bank you sit on'], say: '“river”!' },
      { rooms: [12], label: 'Room 12', lines: ['+ most likely: river, maybe bank or street'], say: '“river”, “bank”, “street”…' },
      { rooms: [12], label: 'The answer', end: true, ends: 'the river by the bank he sat on' },
    ] },
    umbrella: { target: ' rain', stops: [
      { rooms: [0], label: 'Before room 1', lines: ['“to” · the last token'], say: '“I only know I’m ‘to’.”' },
      { rooms: [1, 2, 3, 4, 5], def: 3, label: 'Rooms 1–5', lines: ['+ “starting to” do something'], say: '“get”? “be”? “make”?', many: true },
      { rooms: [6, 7, 8], def: 8, label: 'Rooms 6–8', lines: ['+ “it” is something that can start happening'], say: '“fall”? “hurt”?' },
      { rooms: [9, 10, 11], def: 9, label: 'Rooms 9–11', lines: ['+ an umbrella, on the way out: weather!'], say: '“rain”!' },
      { rooms: [12], label: 'Room 12', lines: ['+ most likely: rain'], say: '“rain”, maybe “get” or “fall”' },
      { rooms: [12], label: 'The answer', end: true, ends: 'rain' },
    ] },
    trophy: { target: ' big', stops: [
      { rooms: [0], label: 'Before room 1', lines: ['“too” · the last token'], say: '“too… too”?' },
      { rooms: [1, 2, 3, 4, 5, 6], def: 3, label: 'Rooms 1–6', lines: ['+ “was too” something'], say: '“much”? “far”?', many: true },
      { rooms: [7, 8, 9, 10], def: 10, label: 'Rooms 7–10', lines: ['+ something didn’t fit in a suitcase'], say: '“close”? “bulky”? “expensive”?' },
      { rooms: [11], label: 'Room 11', lines: ['+ about size… but what is “it”?'], say: '“large” or “small”? A tie!' },
      { rooms: [12], label: 'Room 12', lines: ['+ “it” could be the trophy (too big) or the suitcase (too small)'], say: '“big” 30%, “small” 19%' },
      { rooms: [12], label: 'The answer', end: true, ends: 'a size word, but GPT-2 isn’t sure what “it” is' },
    ] },
    annie: { target: ' picnic', stops: [
      { rooms: [0], label: 'Before room 1', lines: ['“a” · the last token'], say: '“a… what?”' },
      { rooms: [1, 2, 3, 4, 5, 6, 7], def: 4, label: 'Rooms 1–7', lines: ['+ “pack a” some amount of something'], say: '“lot”? “few”? “bunch”?', many: true },
      { rooms: [8, 9], def: 8, label: 'Rooms 8–9', lines: ['+ packing extra things'], say: '“spare”? “few”?' },
      { rooms: [10, 11], def: 11, label: 'Rooms 10–11', lines: ['+ a picnic, from 20 tokens back!'], say: '“bag”? “picnic”? “basket”?' },
      { rooms: [12], label: 'Room 12', lines: ['+ most likely: picnic (basket)'], say: '“picnic”, “few”, “bag”…' },
      { rooms: [12], label: 'The answer', end: true, ends: 'something for the picnic' },
    ] },
  };

  // ---------- the current sentence's "profile" ----------
  const PAL = ['#8a94a6', '#2b5aa8', '#d9730d', '#1f8a4c', '#8e44ad', '#16a085', '#b5530a', '#0f6b38', '#5b38d1', '#c0392b', '#b8860b', '#5b6577'];
  function profile() {
    const cur = NT.current();
    if (cur.key === STORY) return { key: STORY, scripted: true, stored: true, W: SW, COL: SCOL, LAST: SLAST, ex: cur.ex, cur };
    const W = cur.tokens.map((t) => t.replace(/\n/g, '⏎').trim() || '·');
    const seen = {}; W.forEach((w) => (seen[w.toLowerCase()] = (seen[w.toLowerCase()] || 0) + 1));
    const cnt = {}; const W2 = W.map((w) => { const k = w.toLowerCase(); if (seen[k] < 2 || ['the', 'a', 'to', 'of', 'and', ',', '.'].includes(k)) return w; cnt[k] = (cnt[k] || 0) + 1; return w + '¹²³⁴⁵⁶⁷⁸⁹'[cnt[k] - 1]; });
    return { key: cur.key, scripted: false, stored: STORED.has(cur.key), W: W2, COL: W2.map((_, i) => (i === W2.length - 1 ? '#c2185b' : PAL[i % PAL.length])), LAST: W2.length - 1, ex: cur.ex, cur };
  }
  let PR = null;
  const ICON = { card: '🪪', ask: '❓', tag: '🏷️', hand: '✋', give: '📨', note: '📝', sup: '✍️', fact: '📚', room: '🚪' };
  const wordChip = (j) => `<span class="ucw" style="--c:${PR.COL[j]}">${esc(PR.W[j])}</span>`;
  const card = (j, lines, o = {}) => { const P = o.P || PR; return `<div class="icard ${o.cls || ''}" style="--c:${P.COL[j]}"><div class="ich"><span>${ICON.card}</span><b>${esc(P.W[j])}</b>${o.badge || ''}</div>${lines.map((l, i) => `<div class="icl ${o.newFrom != null && i >= o.newFrom ? 'new' : ''}">${l}</div>`).join('')}</div>`; };
  const two = (an, re, o = {}) => `${o.top || ''}<div class="uc2"><section class="panel an"><div class="ucbadge an">Our analogy${o.anTag ? ` <span>${o.anTag}</span>` : ''}</div>${an}</section><section class="panel re"><div class="ucbadge re">What GPT-2 really does${o.reTag ? ` <span>${o.reTag}</span>` : ''}</div>${re}</section></div>`;
  const beats = (list, cur, id) => `<div class="beats" id="${id}">${list.map((b, i) => `<button class="beat ${i === cur ? 'on' : i < cur ? 'done' : ''}" data-i="${i}"><span class="bi">${b[0]}</span><span class="bl">${b[1]}</span></button>`).join('')}</div>`;
  const honesty = '<div class="honest">The questions, answers and notes are our way of picturing it. GPT-2 does not use words inside: every card, question and note is a list of numbers, and nobody gave the interviewers their topics. Training on next-word guessing shaped them.</div>';
  const NOW = {
    card: 'In newer models the card is longer: OpenAI’s open model gpt-oss-120b (2025) uses 2,880 numbers per token. OpenAI hasn’t published GPT-6’s sizes.',
    heads: 'gpt-oss-120b (2025) has 36 rooms with 64 interviewers each; GPT-2 has 12 with 12. OpenAI hasn’t published GPT-6’s sizes.',
    note: 'Notes are still 64 numbers in gpt-oss-120b (2025), which has 64 interviewers per room instead of 12.',
    fact: 'gpt-oss-120b (2025) has 128 fact checkers per room (each with a 2,880-entry checklist) and sends each card to the 4 best suited to it, a “mixture of experts”. GPT-2 has one fact checker per room, with 3,072 entries.',
    vocab: 'GPT-2 knows 50,257 tokens; gpt-oss-120b (2025) knows 201,088.',
    rooms: 'gpt-oss-120b (2025) has 36 rooms; GPT-2 has 12. GPT-6 (2026) can read about a million tokens at once (GPT-2: 1,024); its other sizes aren’t published.',
  };
  const nowNote = (k) => `<div class="nownote"><b>Today’s models:</b> ${NOW[k] || k}</div>`;

  // shared with Output, so the story and its pictures carry straight on
  NT.uc = {
    two, beats, ICON, nowNote, honesty, STORY,
    finalLines: (key) => { const SS = STOPSETS[key]; return SS ? SS.stops.filter((x) => !x.end).flatMap((x) => x.lines) : null; },
    finalSay: (key) => { const SS = STOPSETS[key]; return SS ? SS.stops.find((x) => x.end).ends : null; },
    profile: () => (PR = profile()),
    card: (j, lines, o) => card(j, lines, Object.assign({ P: PR || (PR = profile()) }, o || {})),
  };
})();
