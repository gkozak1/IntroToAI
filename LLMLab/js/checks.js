/* LLM Lab — checks for understanding (Nov 3, Greg; rebuilt from the draft list "LLMLab checks for understanding – draft questions", after a critique pass).
   51 multiple-choice questions, each tied to one page or one step (chevron) of the app. Close to the unit test, never the same.
   • The "✔ Check understanding" button in the sub-tab row appears wherever the current page or step has a question.
     It is solid purple until every question for that spot has been opened, then turns white: "✔ Checked".
   • Opened questions are remembered in this browser (localStorage llmlab.checks.seen); "Reset checks" in the window clears them.
   • Inside the window, numbered pills reach every question on the tab, so a class can review the whole tab at the end.
   • The "Checks" switch in the top bar still turns them all on and off. */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  // id, where (tab/sub or tab/sub/Step), question, [choices A–D], index of the right choice, why, 'review' for a whole-tab question
  const Q = [
    // ---------- Overview ----------
    ['O1', 'experience/main', 'After “She grabbed her umbrella on the way out because it was starting to”, GPT-2 gives “rain” about half the probability and spreads the rest over other tokens. Why isn’t there a single correct next token?',
      ['GPT-2 hasn’t finished training on this sentence yet.', 'GPT-2 only lists tokens it saw after this exact sentence in training.', 'Several tokens could sensibly come next, so the probability is spread across them.', 'The sentence is missing a word, so GPT-2 can’t be sure.'], 2,
      '“snow”, “pour” or “drizzle” would also fit. Next-token prediction gives a spread of options (a probability distribution), not one answer.'],
    // ---------- Input ----------
    ['I1', 'numbers/split', 'GPT-2 cuts “Carmel\'s homecoming parade was unforgettable.” into 10 tokens, including “C”, “arm”, “el”, “\'s”, “ unforgettable” and “.”. Which is true of these tokens?',
      ['They mix whole words, word pieces and punctuation, and there are far fewer of them than characters.', 'Each one is a complete English word, so the name is split into smaller words.', 'Each one is one syllable of the sentence.', 'Each one is a single letter or punctuation mark.'], 0,
      'A long common word stays whole, a rare name is built from pieces, and the period is its own token: 10 tokens instead of 45 characters.'],
    ['I2', 'numbers/build', 'Our practice tokenizer learned the pieces “un”, “kind” and “ly”. A student types “unkindly”, which never appeared in the practice text. What does the tokenizer do?',
      ['It stops: a word it hasn’t seen can’t be tokenized.', 'It adds “unkindly” to its vocabulary as a brand-new token.', 'It swaps in the closest word it already knows, such as “kindly”.', 'It builds the word from pieces it already has: un | kind | ly.'], 3,
      'Byte Pair Encoding (BPE) builds the vocabulary once. After that, new words are assembled from known pieces.'],
    ['I3', 'numbers/ids', '“ bank” has token ID 3331 and “ sat” has 3332. What does GPT-2 do with the number 3331?',
      ['It treats “bank” and “sat” as similar in meaning, because their IDs are neighbors.', 'It uses 3331 as “bank”’s score when choosing the next token.', 'It uses 3331 as an address: row 3331 of the embedding matrix is “bank”’s embedding vector.', 'It adds 3331 to the position number to get the input vector.'], 2,
      'A token ID is an index. Neighboring IDs say nothing about meaning.'],
    ['I4', 'numbers/qualities', 'In Meaning as numbers, the move from “man” to “king” is the same as the move from “woman” to “queen”. What does that show about vectors?',
      ['Numbers can capture relationships, so related pairs of words line up in similar ways.', 'The four words must sit next to each other in GPT-2’s vocabulary.', 'Each number stands for one letter, and these words share letters.', 'Every pair of words is the same distance apart.'], 0,
      'Our three numbers are made up, but GPT-2’s learned vectors show similar patterns, which the model can use.'],
    ['I5', 'numbers/dims', 'GPT-2’s embedding vectors have 768 numbers each. Which statement about those numbers is accurate?',
      ['People decided what each of the 768 numbers means before training.', 'Each number stands for one quality with a name, like “age” or “royalty”.', 'They change each time a new sentence is typed.', 'They were learned in training, and most don’t match a single human idea.'], 3,
      'Our three qualities were picked to be easy to read. GPT-2’s 768 were learned from text, and they stay fixed while it writes.'],
    ['I6', 'numbers/input', 'In the story sentence, “ left” (token 1364) is the 3rd token and again the 10th. Before any Transformer block runs, how do their two input vectors (Case Files) compare?',
      ['Identical, because the token ID is the same.', 'Different: the same embedding row, but a different position vector is added to each.', 'Different, because the second “left” has already taken in the words before it.', 'Identical, because position is only used at the Output.'], 1,
      'Context only starts to change them in the blocks. At the start, position is the only difference.'],
    ['I7', 'numbers/all', 'Which order does GPT-2 follow to turn text into numbers?',
      ['Text → token IDs → tokens → embedding vectors → + position vectors', 'Text → embedding vectors → tokens → token IDs → + position vectors', 'Text → tokens → token IDs → embedding vectors → + position vectors', 'Text → position vectors → tokens → token IDs → embedding vectors'], 2,
      'Split, number, look up, add position. The sum is each token’s input vector.'],
    ['I8', 'numbers/all', 'What leaves the Input stage and goes into the first Transformer block?',
      ['The original text, ready to be read word by word.', 'One 768-number input vector (Case File) for each token.', 'Just the token IDs, one for each token.', 'One 768-number vector for the whole sentence.'], 1,
      '13 tokens in, 13 Case Files out: each one is the token’s embedding vector plus its position vector.', 'review'],
    // ---------- Transformer (one page; its steps are the chevrons) ----------
    ['T1', 'transformer/room/Input', 'As a token’s Case File moves from room to room, what does it represent?',
      ['GPT-2’s running representation of that token in this sentence (its hidden state), updated in every room.', 'The token’s embedding vector, copied unchanged from room to room.', 'GPT-2’s final answer for the next token, decided in Room 1.', 'A list of relevance percentages showing which tokens matter.'], 0,
      'The Case File starts as embedding + position and is updated in each of the 12 rooms (Transformer blocks).'],
    ['T2', 'transformer/room/Transformer Block', 'In the umbrella sentence, Room 5 is about to start. What has to be finished first?',
      ['Nothing: all 12 rooms work at the same moment.', 'Only Detective 1 in Room 5, because the others copy its work.', 'Room 4, because Room 5 starts from the Case Files that Room 4 hands over.', 'The Output step, because Room 5 needs the next-token scores.'], 2,
      'Rooms work in order. Inside one room, the 12 Detectives share one starting point, so they work in parallel.'],
    ['T3', 'transformer/room/Attention Head', 'In Room 4, Detective 3 writes a Question (query) for “umbrella” and another for “starting”. Which is true?',
      ['It uses two different learned Q matrices, one for each token.', 'It uses one learned Q matrix, so the two Questions are identical.', 'Softmax writes the Questions from the relevance scores.', 'It uses one learned Q matrix on two different Case Files, so the Questions differ.'], 3,
      'The Q matrix was learned in training and stays fixed. The Case Files going into it are different.'],
    ['T4', 'transformer/room/Attention Head', 'How does a Detective decide how much each witness matters?',
      ['It compares its Question (query) with each witness’s Statement (key); better matches get more relevance.', 'It counts how often each witness’s token appears in the sentence.', 'It compares each witness’s Evidence (value) with the token’s spelling.', 'It gives the most relevance to the witnesses nearest in the sentence.'], 0,
      'Query · key gives a score for each witness; Softmax turns the scores into relevance percentages that add up to 100%.'],
    ['T5', 'transformer/room/Attention Head', 'Witness A gets 60% relevance and witness B gets 5%. How do their Evidence Packets (values) go into the Note?',
      ['Only A’s Evidence is used, because it has the highest relevance.', 'They are averaged equally, so each counts 50%.', 'Both are added in: A’s weighted by 60% and B’s by 5%.', 'B’s Evidence counts most, because a low score means a surprise.'], 2,
      'The Note is the relevance-weighted sum of every eligible witness’s Evidence.'],
    ['T6', 'transformer/room/Attention Head', 'In “The trophy wouldn’t fit in the suitcase because it was too”, a Detective investigates “trophy”. Can “suitcase” be one of its witnesses?',
      ['Yes: any token in the sentence can be a witness.', 'No: “suitcase” comes later, so it gets 0% relevance.', 'Yes, but only once Room 12 is reached.', 'No: “trophy” can only listen to itself.'], 1,
      'A token can use itself and the tokens before it (“The”, “trophy”), never later ones.'],
    ['T7', 'transformer/room/Attention Head', '“it” in the trophy sentence and “it” in the umbrella sentence start with the same embedding vector. Why do they end up with different Case Files?',
      ['GPT-2 looks the second one up in a different embedding matrix.', 'The words after each “it” change them in later rooms.', 'They don’t: the same token always keeps the same Case File.', 'Each “it” gathers Evidence from different earlier tokens (trophy and suitcase; umbrella and way).'], 3,
      'Context changes meaning, and only earlier tokens supply that context. (Their position vectors differ too, but only attention brings in what the sentence is about.)'],
    ['T8', 'transformer/room/Assembly', 'After the Lead Detective’s output is added to a token’s Case File, how many numbers does the Case File hold?',
      ['64', '768', '1,536 (768 + 768)', '9,216 (12 × 768)'], 1,
      'Adding updates each of the 768 numbers in place, so what the Case File already held is kept and its size never grows.'],
    ['T9', 'transformer/room/Feed-Forward', 'What does the Forensics Expert (MLP) work on?',
      ['All the Case Files at once, comparing them with each other.', 'Only the last token’s Case File.', 'Each token’s Case File on its own: it applies learned patterns and adds the result back.', 'The Detectives’ Questions, to improve the next room’s attention.'], 2,
      'Comparing tokens is the Detectives’ job. The Forensics Expert refines each Case File separately.'],
    ['T10', 'transformer/room/What is known', 'After Room 12 in the umbrella sentence, which Case File is scored against the vocabulary to choose the next token?',
      ['“She”, the first token.', '“umbrella”, the most important word.', 'An average of all the Case Files.', '“to”, the last token.'], 3,
      'Only the last position has seen every earlier token, and its job is to predict what comes after it.'],
    // ---------- Output (one page; its steps are the chevrons) ----------
    ['U1', 'pick/pick/From the Transformer', 'The Output tab starts from the last token’s Case File after Room 12 (the output vector). What is it used for?',
      ['Scoring every token in the vocabulary as a possible next token.', 'Looking up the next sentence in GPT-2’s training data.', 'Updating GPT-2’s parameters before it chooses.', 'Choosing which earlier token to repeat.'], 0,
      'It is compared with all 50,257 embedding rows (one dot product each), which gives every token a score (logit).'],
    ['U2', 'pick/pick/Score every token', 'After the story sentence, “river” has a logit of −87.6 and “bank” has −88.0. What do these numbers tell you?',
      ['Both are negative, so neither token can be chosen.', '“river” has a probability of −87.6%.', '“river” scored a little higher than “bank”; these are scores, not probabilities yet.', 'They are the two tokens’ IDs.'], 2,
      'Only the gaps between logits matter. Softmax turns them into probabilities in a later step.'],
    ['U3', 'pick/pick/Temperature & Top-K', 'Top-K is set to 3, and Temperature is lowered from 1 to 0.5. What happens?',
      ['3 tokens get equal shares, and the leader’s share shrinks.', 'Only the 3 highest-scoring tokens stay in play, and the leader’s share grows.', 'Every token can still be picked, but more slowly.', 'GPT-2 retrains 3 of its matrices with a smaller learning rate.'], 1,
      'Top-K cuts the list; a lower Temperature stretches the gaps toward the top token. A higher Temperature would flatten them.'],
    ['U4', 'pick/pick/Scores into probabilities', 'Suppose Top-K is 3 and the three allowed logits are −87.6, −88.0 and −89.1. After Softmax, which is true?',
      ['The probabilities are negative, because the logits are negative.', 'The top token gets 100%, because it has the highest logit.', 'Each token gets about 33%, because Top-K treats the three equally.', 'All three get positive probabilities that add up to 100%, and the highest logit gets the biggest.'], 3,
      'Softmax turns any scores into positive probabilities that total 100%, keeping their order.'],
    ['U5', 'pick/pick/Select the next token', '“river” has 29% and “road” has 4.9%, but this time the needle lands on “road”. How can that happen?',
      ['The random number r fell in “road”’s slice; any allowed token can win, in proportion to its probability.', 'GPT-2 made a mistake and should have picked “river”.', 'Temperature was set to 0, which picks at random.', '“road” was picked because it already appears in the sentence.'], 0,
      'Bigger slices win more often, not every time.'],
    ['U6', 'pick/pick/Select the next token', 'Another time, “river” is picked with a 29% probability. What does the 29% describe?',
      ['How likely the finished sentence is to be true.', 'How many people out of 100 would choose “river”.', 'How likely “river” was to be picked, with these scores and settings.', 'How sure GPT-2 is about its facts.'], 2,
      'Probability is about picking the next token, not about whether the sentence is correct.'],
    // ---------- Whole Process ----------
    ['W1', 'whole/flow', 'GPT-2 has just added “river” to the story sentence. How does it get the token after that?',
      ['It reuses the scores it already has and takes the next-best one.', 'It retrains itself on the longer sentence first.', 'It adds one more room to the Transformer.', 'It runs the whole pass again on the longer sentence.'], 3,
      'One new token = one full pass: tokens → Case Files → 12 rooms → scores → pick.'],
    ['W2', 'whole/side', 'Greedy (Temperature 0.2, Top-K 1) often repeats itself, while Wild drifts into nonsense. Why?',
      ['Wild uses a different, smaller model.', 'Greedy always takes the top token, so it can loop; Wild spreads probability onto many unlikely tokens.', 'Greedy reads less of the sentence than Wild.', 'It is pure luck; the settings don’t matter.'], 1,
      'Same model and starting text; only the picking changes. Typical sits in between.'],
    ['W3', 'whole/side', 'From one pass to the next, which of these change?',
      ['The sentence (the context), and every vector calculated from it.', 'The learned parameters (embeddings, Q/K/V matrices, MLP).', 'The tokenizer’s vocabulary.', 'Nothing changes.'], 0,
      'Each pass reads a longer sentence, so every calculated vector is new. Learned parameters change only in training.', 'review'],
    // ---------- Pre-Training (one page; its steps are the chevrons) ----------
    ['P1', 'learning/step/Book', 'Pre-training reads “The cat sat on the mat.” After “The cat sat on the”, where does the target for GPT-2’s guess come from?',
      ['A teacher labels each example by hand.', 'GPT-2’s own top guess is used as the target.', 'A dictionary of correct sentences.', 'The text itself: the token that really comes next, “mat”.'], 3,
      'The text supplies the targets, so trillions of examples need no one to label them. The goal is a likely next token, not a checked fact.'],
    ['P2', 'learning/step/Error', 'The target is “mat”. On one try GPT-2 gives “mat” 60%; on another, 10%. Which try has the bigger loss?',
      ['Neither: “mat” got some probability both times.', 'The 60% try, because it was more confident.', 'The 10% try.', 'Both are the same, since the target didn’t change.'], 2,
      'Loss = −ln(probability of the target): 10% → 2.3, 60% → 0.5. Less probability on the target means more loss.'],
    ['P3', 'learning/step/Back Prop', 'Back propagation finds that one parameter in Room 3 had a big effect on this loss. What has it worked out about that parameter?',
      ['Its gradient: how changing it would change the loss.', 'Its new value, which is stored right away.', 'Whether the sentence it helped write is true.', 'Its relevance percentage for the next token.'], 0,
      'Back propagation only measures. Gradient descent changes the value in the next step.'],
    ['P4', 'learning/step/Grad Desc', 'Gradient descent nudges each parameter using its gradient and a learning rate. What does the learning rate set?',
      ['Which token comes next.', 'How many rooms GPT-2 has.', 'The Temperature used when writing.', 'How big each nudge is.'], 3,
      'Too small and learning crawls; too big and the nudges overshoot.'],
    ['P5', 'learning/step/Repeat', 'In each training round, what comes right after the loss is measured?',
      ['Forward propagation', 'Back propagation', 'Gradient descent', 'Splitting the text into tokens'], 1,
      'Guess (forward propagation), measure the error (loss), trace it back (back propagation), then nudge (gradient descent). Repeat.'],
    ['P6', 'learning/step/Batches', 'A model is trained 1,000 times on the cat sentence and nothing else. What is the likely result?',
      ['It understands every language.', 'Its loss is zero on any text.', 'It can repeat that sentence but does poorly on new text.', 'It stops using attention.'], 2,
      'Varied text is what lets a model generalize to sentences it has never seen.'],
    // ---------- Post-Training ----------
    ['R1', 'post/rlhf/Grade', 'In RLHF, a person reads a model’s whole reply to “Give me a packing list for a beach trip” and rates it. What is being judged?',
      ['The reply as a whole: is it helpful, clear and appropriate?', 'Whether each token was the single most likely one.', 'How fast the reply was written.', 'Whether the prompt was spelled correctly.'], 0,
      'Pre-training scores one next token at a time; RLHF judges finished replies.'],
    ['R2', 'post/rlhf/Grad Desc', 'After many replies are rated, how do the ratings change the model?',
      ['A person edits the 124 million numbers by hand.', 'A reward model learns from the ratings, and gradient descent nudges the parameters toward higher-rated replies.', 'The ratings are saved and looked up during later chats.', 'The model gets a new set of Detectives.'], 1,
      'People rate; the training math decides each change. The goal is replies that follow instructions and help.'],
    // ---------- Assistant ----------
    ['A1', 'assist/before/Reveal', 'Both versions get “User: Name three red fruits. Assistant:”. Version 1 continues with “User: Name three yellow fruits.” Version 2 lists three red fruits and stops. What explains the difference?',
      ['Version 1’s tokenizer can’t read “Assistant:”.', 'Version 2 was post-trained to follow requests.', 'Version 2 is a much bigger model.', 'Version 2 was given the answer in its prompt.'], 1,
      'Same size, same tokenizer, same prompt; only post-training differs.'],
    ['A2', 'assist/before/Generalize', 'A student says: “Just add the word Assistant: to a prompt, and any model becomes a chatbot.” What is the best reply?',
      ['Right: the label is all a model needs.', 'Right, as long as the Temperature is high enough.', 'Not quite: a model can recognize chat-like text, but answering helpfully is built in by post-training.', 'Not quite: models can’t read role labels at all.'], 2,
      'Version 1 knows what a chat looks like and keeps writing one; it was never trained to answer.'],
    ['A3', 'assist/conv/Case Log', 'You ask for a pancake recipe, then type “Now halve it.” How does the assistant know what “it” is?',
      ['It remembers your account from yesterday.', 'The tokenizer works out what “it” means.', 'It guesses; there is no way to know.', 'The earlier messages are part of what it reads (the Case Log).'], 3,
      'Every reply is predicted from the whole Case Log, including your earlier message.'],
    ['A4', 'assist/conv/Saved memory', 'A memory feature has saved “Sam is vegetarian.” In a new chat, Sam asks for dinner ideas and gets no meat dishes. What happened?',
      ['The saved note was placed in the Case Log, so the model read it along with the question.', 'Sam’s preference became a new learned parameter.', 'The model was retrained overnight on Sam’s chats.', 'The embedding vector for “dinner” changed.'], 0,
      'Saved memory is context; the learned parameters didn’t change.'],
    ['A5', 'assist/conv/Trimmed', 'A long chat grows past the model’s context window. What happens to the oldest messages?',
      ['They move to a separate memory the model always checks.', 'They keep the same influence as recent messages, however long the chat.', 'They drop out of the window and can’t affect the next token, unless they are summarized or sent again.', 'The chat has to restart from the beginning.'], 2,
      'The model only reads what fits in its window (1,024 tokens for GPT-2).'],
    ['A6', 'assist/conv/Generalize', 'Which best describes a chat assistant?',
      ['A program that looks answers up in a database of replies.', 'A search engine with a chat window on top.', 'A model that retrains itself as you chat.', 'A next-token predictor, shaped by post-training into a helper, that reads a Case Log of instructions and history.'], 3,
      'The same next-token machinery underneath: post-training shapes the replies, and the Case Log supplies everything about this chat.', 'review'],
    // ---------- Think & Act ----------
    ['K1', 'think/tools/Explain', '“28 students need 4 pencils each; the teacher has 100. How many more are needed?” One AI answer shows its steps: “28 × 4 = 108; 108 − 100 = 8.” What does this show?',
      ['Neat steps don’t guarantee correct arithmetic: 28 × 4 is 112, so 12 more are needed.', 'It is right, because it explains each step.', 'AI can never do arithmetic, with or without steps.', 'It is right, because 8 is a reasonable number.'], 0,
      'Check the steps, not just whether steps are there.'],
    ['K2', 'think/tools/Tool loop', 'The model writes the request “Calculate: 28 × 4 − 100”. What happens right after that?',
      ['The model guesses the most likely number.', 'The student has to type in the answer.', 'The request is skipped if the model is confident.', 'Software outside the model runs the calculation.'], 3,
      'The result is then added to the context, and the model keeps writing from it.'],
    ['K3', 'think/tools/It can repeat', 'Asked for today’s weather in Chicago and tomorrow’s in Denver, an AI searches, reads the result, searches again and then answers. What makes this an agent?',
      ['It writes longer answers than a chatbot.', 'It chooses an action, looks at the result and picks its next step.', 'It uses a higher Temperature.', 'It answers both questions from memory at once.'], 1,
      'An agent loops: request, read the result, decide.'],
    ['K4', 'think/tools/It can repeat', 'The search returns this morning’s weather report. How does the model use it?',
      ['It waits until its next training run to learn it.', 'The report overwrites the embedding vector for “weather”.', 'The report is added to its context, and it writes the answer from there.', 'It ignores the report and uses its training data.'], 2,
      'Retrieved text enters the context, not the parameters.'],
    ['K5', 'think/tools/It can repeat', 'Asked who won last night’s game, a model without search names last season’s champion. Why?',
      ['Its training data ends before last night, and nothing newer is in its context.', 'It is lying on purpose.', 'Its Temperature is too low.', 'Sports names are special tokens it can’t change.'], 0,
      'Newer information has to come in through the prompt, a document or a tool such as search.'],
    ['K7', 'think/tools/Generalize', 'A student says: “It thought for 30 seconds, so I don’t need to check it.” What is the best reply?',
      ['Right: thinking time guarantees a correct answer.', 'Right: more tokens always mean more truth.', 'Extra thinking can help, but answers that matter still need checking.', 'Thinking means it retrained itself on the question.'], 2,
      'Reasoning gives the model more tokens to work with; it is not verification.'],
    ['K6', 'think/trust/Check', 'An AI answer gives a city’s population and cites a census page. You open the page, and it shows a different number. What should you conclude?',
      ['Trust the answer: it has a citation.', 'The citation doesn’t support the claim, so don’t trust that number yet.', 'Trust the answer if it is long and detailed.', 'Average the two numbers.'], 1,
      'A citation only counts if the source says what the answer claims.'],
    ['K8', 'think/trust/Generalize', 'You ask an AI whether a wild mushroom you found is safe to eat. Which check fits the stakes?',
      ['Ask the same AI again and see whether it agrees.', 'Confirm with an independent expert source, such as a local expert or poison control.', 'Ask it to explain its reasoning in more detail.', 'Trust it if the answer is detailed and sounds confident.'], 1,
      'The higher the stakes, the stronger and more independent the check. Asking the same model again is not an independent source.'],
    ['K9', 'think/trust/Generalize', 'What was GPT-2 trained to do during pre-training?',
      ['Give high probability to the token the text actually used next.', 'Write statements that are true.', 'Match an encyclopedia.', 'Sound confident.'], 0,
      'A likely continuation can still be false, which is why fluent text isn’t proof.', 'review'],
  ].map(([id, at, q, ch, right, why, review]) => ({ id, at, q, ch, right, why, review: !!review, tab: at.split('/')[0] }));
  NT.CHECKS = Q;
  const TABNAME = { experience: 'Overview', numbers: 'Input', transformer: 'Transformer', pick: 'Output', whole: 'Whole Process', learning: 'Pre-Training', post: 'Post-Training', assist: 'Assistant', think: 'Think & Act' };
  const SUBNAME = { split: 'Split into tokens', build: 'Build the tokenizer', ids: 'Token IDs', qualities: 'Meaning as numbers', dims: 'Many dimensions', input: 'Token + position', all: 'Put it together', flow: 'Animated flow', side: 'Side by side', before: 'Before & After', conv: 'Inside a Conversation', tools: 'Think & Use Tools', trust: 'Which Answer?' };

  // ---------- where am I? the page, plus the current step (chevron) on pages that have them ----------
  const stepName = (t) => t.replace(/^[^A-Za-z]+/, '').replace(/\s+(×\d+|\d+|A)$/, '').trim(); // "🔁 Repeat ×5" → Repeat, "Attention Head 1" → Attention Head, "👀 Reveal A" → Reveal
  function where() {
    const page = `${S.top}/${S.sub}`;
    const on = document.querySelector('#subtabs .sub.on[data-s], #pbSteps button.on, #asSteps .tr-st.on');
    return { page, step: on ? `${page}/${stepName(on.textContent)}` : '' };
  }
  const here = () => { const w = where(); return Q.filter((x) => x.at === w.page || (w.step && x.at === w.step)); };
  const label = (x) => { const p = x.at.split('/'); return p[2] || SUBNAME[p[1]] || TABNAME[p[0]]; };

  // ---------- opened questions, remembered in this browser ----------
  const SEEN = 'llmlab.checks.seen';
  let seen = new Set(); try { seen = new Set(JSON.parse(localStorage.getItem(SEEN) || '[]')); } catch (e) { /* storage blocked: this visit only */ }
  const save = () => { try { localStorage.setItem(SEEN, JSON.stringify([...seen])); } catch (e) { /* not remembered */ } };
  function markSeen(id) { if (seen.has(id)) return; seen.add(id); save(); refresh(); }
  function resetSeen() { seen.clear(); try { localStorage.removeItem(SEEN); } catch (e) { /* ignore */ } refresh(); }

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

  // ---------- the button in the sub-tab row ----------
  // main.js calls this whenever the row is drawn; a light watcher below also catches step changes made inside a page
  NT.checkBtn = () => {
    const subs = $('#subtabs'); if (!subs) return;
    const list = here(); let b = $('#chkTog');
    if (!list.length) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('button'); b.className = 'whotog cu'; b.id = 'chkTog';
      const who = $('#whoTog'); if (who && who.parentNode === subs) subs.insertBefore(b, who); else subs.appendChild(b);
      b.onclick = (e) => { e.stopPropagation(); const l = here(); if (l.length) open((l.find((x) => !seen.has(x.id)) || l[0]).id); };
    }
    paintBtn(b, list);
  };
  // purple until every question for this spot has been opened; then white "✔ Checked"
  function paintBtn(b, list) {
    const done = list.every((x) => seen.has(x.id)), n = list.length, sig = `${done}|${list.map((x) => x.id).join(',')}`;
    if (b.dataset.sig === sig) return; b.dataset.sig = sig;
    b.classList.toggle('seen', done);
    const cnt = n > 1 ? ` <small>${n}</small>` : '';
    b.title = done ? `Opened already. Click to see ${n > 1 ? 'these questions' : 'this question'} again.` : `A check for understanding on this ${n > 1 ? 'step: ' + n + ' questions' : 'step'}`;
    b.innerHTML = done ? `✔<span class="cu-long"> Checked${cnt}</span><span class="cu-short">${cnt}</span>` : `✔<span class="cu-long"> Check understanding${cnt}</span><span class="cu-short"> Check${cnt}</span>`;
    requestAnimationFrame(fitBtn);
  }
  function refresh() { NT.checkBtn(); const m = $('#chkModal'); if (m) m.querySelectorAll('.chk-pill').forEach((p) => p.classList.toggle('seen', seen.has(p.dataset.id))); }
  // the full label when the sub-tab row has room for it; just "✔ Check" when it would push the row onto two lines
  function fitBtn() {
    const b = $('#chkTog'), subs = $('#subtabs'); if (!b || !subs || !subs.firstElementChild) return;
    b.classList.remove('short');
    const top = subs.firstElementChild.getBoundingClientRect().top, wraps = () => [b, $('#whoTog')].some((x) => x && (x.getBoundingClientRect().top > top + 6 || x.scrollWidth > x.clientWidth + 1)) || subs.getBoundingClientRect().height > 40 || subs.scrollWidth > subs.clientWidth + 1; // wrapped, squeezed or overflowing
    if (wraps()) b.classList.add('short');
  }
  window.addEventListener('resize', () => requestAnimationFrame(fitBtn));
  // steps change inside pages (Next, Play, chevrons) without redrawing the row: look at the spot a few times a second
  let lastSpot = '';
  setInterval(() => {
    if (!S.checks || document.hidden) return;
    const w = where(), spot = w.page + '|' + w.step, b = $('#chkTog');
    if (spot !== lastSpot || (!b && here().length) || (b && !b.isConnected)) { lastSpot = spot; NT.checkBtn(); }
  }, 350);

  // ---------- the window ----------
  function close() { const m = $('#chkModal'); if (m) m.remove(); }
  function open(id) {
    close();
    const c = Q.find((x) => x.id === id); if (!c) return;
    const all = Q.filter((x) => x.tab === c.tab), hereIds = new Set(here().map((x) => x.id)), tab = TABNAME[c.tab] || '';
    let n = 0;
    const pills = all.length > 1 ? `<div class="chk-pills" aria-label="Questions on this tab">${all.map((x) => `<button class="chk-pill${x.id === id ? ' on' : ''}${hereIds.has(x.id) ? ' here' : ''}${seen.has(x.id) ? ' seen' : ''}" data-id="${x.id}" title="${esc(x.review ? 'Whole-tab review' : label(x))}">${x.review ? 'Review' : ++n}</button>`).join('')}</div>` : '';
    const spot = c.review ? `${esc(tab)} review` : `${esc(tab)} › ${esc(label(c))}`;
    document.body.insertAdjacentHTML('beforeend', `<div class="chk-back" id="chkModal"><div class="chk-box" role="dialog" aria-label="Check for understanding">
      <div class="chk-h"><span>✔ Check for understanding · ${spot}</span><button class="btn ghost" id="chkX" title="Close">✕</button></div>${pills}
      <p class="chk-q">${esc(c.q)}</p><div class="chk-ch">${c.ch.map((t, i) => `<button class="chk-o" data-i="${i}"><b>${'ABCD'[i]}</b> ${esc(t)}</button>`).join('')}</div>
      <div class="chk-f"><button class="btn primary" id="chkShow">Show answer</button><span class="chk-why" id="chkWhy" hidden></span></div>
      <div class="chk-foot"><button class="chk-reset" id="chkReset" title="Mark every check as not opened, in this browser">Reset checks</button></div></div></div>`);
    markSeen(id);
    const m = $('#chkModal');
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    $('#chkX').onclick = close;
    m.querySelectorAll('.chk-pill').forEach((p) => (p.onclick = () => open(p.dataset.id)));
    m.querySelectorAll('.chk-o').forEach((o) => (o.onclick = () => { if (m.classList.contains('shown')) return; m.querySelectorAll('.chk-o').forEach((x) => x.classList.toggle('pick', x === o)); }));
    $('#chkShow').onclick = () => {
      m.classList.add('shown');
      m.querySelectorAll('.chk-o').forEach((x) => { const i = +x.dataset.i; x.classList.toggle('right', i === c.right); x.classList.toggle('wrong', i !== c.right && x.classList.contains('pick')); });
      const w = $('#chkWhy'); w.hidden = false; w.innerHTML = `<b>${'ABCD'[c.right]}.</b> ${esc(c.why)}`; $('#chkShow').hidden = true;
    };
    $('#chkReset').onclick = () => { const r = $('#chkReset'); if (r.dataset.sure) { delete r.dataset.sure; resetSeen(); r.textContent = 'Checks reset ✓'; r.disabled = true; } else { r.dataset.sure = '1'; r.textContent = 'Reset every check in this browser? Click again'; } };
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
