/* LLM Lab — one-question checks (Nov 3, Greg). Multiple choice + Show answer, nothing recorded; the "Checks" switch turns them on and off.
   Every sub-tab has its own question (SUBQ, keyed "tab/sub"). Tabs with several sub-tabs also have a whole-tab review question (TABQ),
   reached from the same window ("This page" | "Whole tab"). Tabs with one sub-tab have just the one question.
   A "✔ Check" button sits at the right of the sub-tab row, next to ⓘ About this page. */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  // [question, [choices A–D], index of the right choice, why]
  const SUBQ = {
    'experience/main': ['GPT-2 gave “river” the highest probability, but this time it added “street”. Why?',
      ['GPT-2 made a mistake.', 'The random number r landed in “street”’s range: bigger slices are more likely, not certain.', 'Temperature was set to 0.', '“street” fits the grammar better than “river”.'], 1,
      'GPT-2 picks with a random number r. A token with a bigger probability has a bigger slice of the wheel, so it is more likely to win, but any allowed token can.'],
    // Input
    'numbers/split': ['Why does GPT-2 use word pieces (subwords) instead of one token for every whole word?',
      ['Pieces are faster to type.', 'Whole words can’t be turned into numbers.', 'With pieces it can write any word, even new ones, without an enormous word list.', 'Pieces always match syllables.'], 2,
      'Common words stay whole; rare or new words are built from known pieces. A list of every word would be huge and still miss new words.'],
    'numbers/build': ['How does Byte Pair Encoding (BPE) build its list of tokens?',
      ['It repeatedly merges the most frequent pair of neighboring pieces.', 'It copies the words from a dictionary.', 'It cuts every word at its vowels.', 'It learns new pieces for each sentence it reads.'], 0,
      'Start with single characters, merge the most common neighboring pair, and repeat. Once built, the same list is reused for every sentence.'],
    'numbers/ids': ['“banker” has token ID 33371 and “The” has 464. What does the bigger number tell you?',
      ['“banker” is more important.', '“banker” appears more often.', '“banker” has more letters.', 'Nothing about meaning: the ID is just which row of the embedding matrix to use.'], 3,
      'A token ID is an index, like a locker number. It selects the token’s row (its embedding vector); its size means nothing.'],
    'numbers/qualities': ['Why do “king” and “queen” land near each other in Meaning as numbers?',
      ['Their spellings are similar.', 'Their numbers (qualities) are similar.', 'They are next to each other in the alphabet.', 'They are the same token.'], 1,
      'Words with similar meanings get similar numbers, so they sit close together. The same move (man → king) also works for other pairs (woman → queen).'],
    'numbers/dims': ['How are GPT-2’s 768 embedding numbers different from our three made-up qualities?',
      ['People chose what each of the 768 numbers means.', 'Each one is a known quality, like age or royalty.', 'They are all the same for every token.', 'They were learned in training and need not have human-readable meanings.'], 3,
      'Our three qualities were picked to be easy to understand. GPT-2’s 768 numbers were learned from text, and most don’t match any single human idea.'],
    'numbers/input': ['Both “bank” tokens get the same token ID and the same embedding vector. What makes their input vectors (Case Files) different?',
      ['Their spelling.', 'The Transformer blocks.', 'A different position vector is added to each.', 'The Temperature setting.'], 2,
      'Input vector = embedding vector + position vector. Same token, same embedding row; different places in the sentence, different position rows.'],
    'numbers/all': ['Which order does GPT-2 follow to turn text into numbers?',
      ['Text → token IDs → tokens → input vectors → embedding vectors', 'Text → tokens → token IDs → embedding vectors → + position vectors → input vectors', 'Text → embedding vectors → tokens → token IDs → input vectors', 'Text → position vectors → tokens → token IDs → input vectors'], 1,
      'Split the text into tokens, give each its ID, look up its embedding row, add the position row, and the sum is the input vector.'],
    'transformer/room': ['A Detective investigates bank¹ (the 5th token). Which tokens can be its witnesses?',
      ['All 13 tokens in the sentence.', 'Only bank¹ itself.', 'Only the nouns.', 'bank¹ and the four tokens before it.'], 3,
      'A token can use itself and earlier tokens, never later ones. Later tokens are masked and get 0% relevance.'],
    'pick/pick': ['Where does each token’s score (logit) come from?',
      ['A dot product of the output vector with that token’s embedding row.', 'How often the token appears in the sentence.', 'The token’s attention percentage.', 'A random number for each token.'], 0,
      'The last token’s output vector is compared with every one of the 50,257 embedding rows: multiply the 768 pairs of numbers and add them up.'],
    // Whole Process
    'whole/flow': ['GPT-2 has just added a token to the sentence. How does it get the next one?',
      ['It reuses the scores it already has.', 'It runs the whole process again on the longer sentence.', 'It retrains itself on the new sentence.', 'It always picks the second-ranked token.'], 1,
      'Every new token is one full pass: tokens → input vectors → 12 blocks → scores → pick.'],
    'whole/side': ['Greedy (Temperature 0.2, Top-K 1) often repeats itself, while Wild drifts into nonsense. Why?',
      ['Greedy always takes the top token, so it can loop; Wild spreads probability onto many unlikely tokens.', 'Wild uses a different model.', 'Greedy sees less of the sentence.', 'It is pure chance; the settings don’t matter.'], 0,
      'Same model, same start: only the picking changes. Too little randomness repeats; too much loses the thread. Typical sits in between.'],
    'learning/step': ['What does pre-training change?',
      ['The words in the training book.', 'The list of tokens, one word at a time.', 'GPT-2’s learned parameters, nudged so the right next token gets a higher probability.', 'The sentence the student typed.'], 2,
      'Each example: guess (forward), measure the error, trace it back (back propagation), then nudge about 124 million parameters (gradient descent).'],
    'post/rlhf': ['In this RLHF example, what gets the grade?',
      ['Each token, one at a time.', 'The whole response.', 'The tokenizer.', 'The input vectors.'], 1,
      'People rate complete responses. The grades train a reward model, and the model’s parameters are updated to give better responses.'],
    // Assistant
    'assist/before': ['Both versions of SmolLM2 get the same prompt with “User:” and “Assistant:” labels. Why does only one answer like an assistant?',
      ['Role labels alone turn any model into an assistant.', 'Post-training changed its parameters.', 'It has a bigger vocabulary.', 'It is connected to the internet.'], 1,
      'Both are next-token predictors. Only the post-trained version’s parameters were changed to follow instructions; labels alone are not enough.'],
    'assist/conv': ['Why does a chatbot seem to remember what you said earlier in the conversation?',
      ['It saves each message into its learned parameters.', 'It retrains after every message.', 'The conversation so far is sent in again as part of its input (the Case Log).', 'It searches the internet for your messages.'], 2,
      'The instructions, role labels and earlier messages are all context. The learned parameters do not change during a chat.'],
    // Think & Act
    'think/tools': ['An agent uses a calculator tool. Who actually runs the calculator?',
      ['The model works it out inside its weights.', 'The model asks for the tool; the app runs it and puts the result back into the context.', 'The student.', 'The tokenizer.'], 1,
      'A tool runs outside the model. Its result enters the context, and the model continues from there.'],
    'think/trust': ['An answer cites a source. When does that citation make the answer more trustworthy?',
      ['Whenever any source is cited.', 'When the model sounds confident.', 'When the answer is long and detailed.', 'Only when the source really supports the claim, and you checked it.'], 3,
      'A citation helps only if its source supports the claim. The higher the stakes, the stronger the independent checks should be.'],
  };
  // whole-tab review questions (tabs with more than one sub-tab): they tie the tab's pages together
  const TABQ = {
    numbers: ['What leaves the Input stage and goes into the Transformer?',
      ['The original text.', 'Just the token IDs.', 'One 768-number input vector (Case File) for each token.', 'One vector for the whole sentence.'], 2,
      'Every token ends Input with its own 768-number input vector: its embedding row plus its position row. 13 tokens → 13 Case Files.'],
    whole: ['From one pass to the next, which of these change?',
      ['The learned parameters (embeddings, Q/K/V matrices, MLP).', 'The context (the sentence) and the vectors calculated from it.', 'The tokenizer’s list of tokens.', 'Nothing changes.'], 1,
      'Each pass reads a longer sentence, so every calculated vector is new. The learned parameters only change in training, never while writing.'],
    assist: ['Which best describes a chat assistant?',
      ['A different kind of program that looks answers up in a database.', 'A next-token predictor, post-trained to follow instructions, reading a Case Log of instructions and history.', 'A search engine with a chat window.', 'A model that retrains itself as you chat.'], 1,
      'Underneath it is the same next-token machinery. Post-training shapes how it answers; the Case Log supplies everything it “knows” about this chat.'],
    think: ['Which statement about “thinking” and tools is true?',
      ['Extra reasoning guarantees a correct answer.', 'Tools run inside the model’s weights.', 'Reasoning and tools can help, but answers still need checking.', 'An agent can never repeat an action.'], 2,
      'Reasoning adds more tokens to work with, and tools bring in outside results, but neither guarantees correctness. Check claims, especially when stakes are high.'],
  };
  NT.CHECKS = { SUBQ, TABQ };
  const TABNAME = { experience: 'Overview', numbers: 'Input', transformer: 'Transformer', pick: 'Output', whole: 'Whole Process', learning: 'Pre-Training', post: 'Post-Training', assist: 'Assistant', think: 'Think & Act' };
  const SUBNAME = { split: 'Split into tokens', build: 'Build the tokenizer', ids: 'Token IDs', qualities: 'Meaning as numbers', dims: 'Many dimensions', input: 'Token + position', all: 'Put it together', flow: 'Animated flow', side: 'Side by side', before: 'Before & After', conv: 'Inside a Conversation', tools: 'Think & Use Tools', trust: 'Which Answer?' };
  const subKey = () => `${S.top}/${S.sub}`;

  // ---------- on / off ----------
  const KEY = 'llmlab.checks';
  let on = true; try { const v = localStorage.getItem(KEY); if (v != null) on = v === '1'; } catch (e) { /* storage blocked: default on */ }
  S.checks = on;
  const sw = $('#chkBtn');
  function apply() {
    document.body.classList.toggle('checks-off', !S.checks);
    if (sw) { sw.classList.toggle('on', S.checks); sw.setAttribute('aria-pressed', S.checks); }
    if (!S.checks) close();
  }
  if (sw) sw.addEventListener('click', () => { S.checks = !S.checks; try { localStorage.setItem(KEY, S.checks ? '1' : '0'); } catch (e) { /* not remembered */ } apply(); });
  apply();

  // the button in the sub-tab row (main.js calls this whenever the row is drawn)
  NT.checkBtn = () => {
    const subs = $('#subtabs'); if (!subs || $('#chkTog') || !(SUBQ[subKey()] || TABQ[S.top])) return;
    const b = document.createElement('button'); b.className = 'whotog cu'; b.id = 'chkTog'; b.title = 'A one-question check for understanding on this page'; b.innerHTML = '✔<span class="cu-long"> Check understanding</span><span class="cu-short"> Check</span>';
    const who = $('#whoTog'); if (who) subs.insertBefore(b, who); else subs.appendChild(b);
    b.onclick = (e) => { e.stopPropagation(); open(SUBQ[subKey()] ? 'page' : 'tab'); };
    requestAnimationFrame(fitBtn);
  };
  // the full label when the sub-tab row has room for it; just "✔ Check" when it would push the row onto two lines
  function fitBtn() {
    const b = $('#chkTog'), subs = $('#subtabs'); if (!b || !subs || !subs.firstElementChild) return;
    b.classList.remove('short');
    const top = subs.firstElementChild.getBoundingClientRect().top, wraps = () => [b, $('#whoTog')].some((x) => x && (x.getBoundingClientRect().top > top + 6 || x.scrollWidth > x.clientWidth + 1)) || subs.getBoundingClientRect().height > 40 || subs.scrollWidth > subs.clientWidth + 1; // wrapped, squeezed or overflowing
    if (wraps()) b.classList.add('short');
  }
  window.addEventListener('resize', () => requestAnimationFrame(fitBtn));

  // ---------- the window ----------
  function close() { const m = $('#chkModal'); if (m) m.remove(); }
  function open(which) {
    close();
    const sq = SUBQ[subKey()], tq = TABQ[S.top], c = which === 'tab' ? tq : sq; if (!c) return;
    const [q, ch, right, why] = c, tab = TABNAME[S.top] || '', sub = SUBNAME[S.sub];
    const pills = sq && tq ? `<div class="chk-pills"><button class="chk-pill ${which === 'page' ? 'on' : ''}" data-w="page">This page${sub ? ': ' + esc(sub) : ''}</button><button class="chk-pill ${which === 'tab' ? 'on' : ''}" data-w="tab">Whole ${esc(tab)} tab</button></div>` : '';
    document.body.insertAdjacentHTML('beforeend', `<div class="chk-back" id="chkModal"><div class="chk-box" role="dialog" aria-label="Check">
      <div class="chk-h"><span>✔ Check for understanding · ${esc(tab)}${which === 'page' && sub ? ' › ' + esc(sub) : which === 'tab' && sq ? ' (review)' : ''}</span><button class="btn ghost" id="chkX" title="Close">✕</button></div>${pills}
      <p class="chk-q">${esc(q)}</p><div class="chk-ch">${ch.map((t, i) => `<button class="chk-o" data-i="${i}"><b>${'ABCD'[i]}</b> ${esc(t)}</button>`).join('')}</div>
      <div class="chk-f"><button class="btn primary" id="chkShow">Show answer</button><span class="chk-why" id="chkWhy" hidden></span></div></div></div>`);
    const m = $('#chkModal');
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    $('#chkX').onclick = close;
    m.querySelectorAll('.chk-pill').forEach((p) => (p.onclick = () => open(p.dataset.w)));
    m.querySelectorAll('.chk-o').forEach((o) => (o.onclick = () => { if (m.classList.contains('shown')) return; m.querySelectorAll('.chk-o').forEach((x) => x.classList.toggle('pick', x === o)); }));
    $('#chkShow').onclick = () => {
      m.classList.add('shown');
      m.querySelectorAll('.chk-o').forEach((x) => { const i = +x.dataset.i; x.classList.toggle('right', i === right); x.classList.toggle('wrong', i !== right && x.classList.contains('pick')); });
      const w = $('#chkWhy'); w.hidden = false; w.innerHTML = `<b>${'ABCD'[right]}.</b> ${esc(why)}`; $('#chkShow').hidden = true;
    };
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
