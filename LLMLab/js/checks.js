/* LLM Lab — checks for understanding (Nov 3–4, Greg).
   51 multiple-choice questions. Each belongs to one scene of the app (one press of Next), or to a page that has no Next steps.
   • The "✔ Check understanding" chip in the sub-tab row appears on a scene that has a question. It is solid purple until that
     scene's question(s) have been answered (Show answer pressed), then gray "✔ Checked". Answers are remembered in this browser.
   • The chip opens a card docked at the bottom right, so the scene stays in view. "Next" goes to the scene's second question; "Done" closes.
   • "✔ Checks ▾" in the top bar: Show all Checks, Show all Checks in <this tab>, Reset checks. A tour jumps the app to each
     question's scene (finished, no animation), loads the question's sentence where that page can show it, and numbers the questions.
     Whole-tab reviews (I8, W3, A6, K9) appear only in tours. At the end of a tour the app stays on the last scene.
   Scenes are read and reached through each page's small `scene` hook (transformer.js, pickscene.js, pretrain2.js, assist.js). */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const STORY = 'The banker left the bank and sat on the left bank of the';
  const UMB = 'She grabbed her umbrella on the way out because it was starting to';
  const TROPHY = 'The trophy wouldn’t fit in the suitcase because it was too';
  const CARMEL = 'Carmel\'s homecoming parade was unforgettable.';
  const CAT = 'The cat sat on the mat.';
  // scene matchers: Transformer and Output beats are [step, key, …]; Pre-/Post-Training beats are { ch, k, t }; Assistant and Think & Act steps are { chev }
  const key = (...k) => (b) => k.includes(b[1]);
  const ch = (c, k) => (b) => b.ch === c && (k == null || b.k === k);
  const chev = (name) => (b) => b.chev && b.chev.replace(/^\S+\s/, '') === name;
  // Each question: id, page 'tab/sub', st (station whose scene hook to use), m (scene matcher), lab (where, in words),
  // sent (the sentence it is about: loaded on the page in a tour when load is set), strip (sentences shown in the card), q, choices, right, why, review
  const Q = [
    // ---------- Overview ----------
    { id: 'O1', page: 'experience/main', lab: 'Overview', sent: UMB, load: true, q: 'After “She grabbed her umbrella on the way out because it was starting to”, GPT-2 gives “rain” about half the probability and spreads the rest over other tokens. Why isn’t there a single correct next token?',
      ch: ['GPT-2 hasn’t finished training on this sentence yet.', 'GPT-2 only lists tokens it saw after this exact sentence in training.', 'Several tokens could sensibly come next, so the probability is spread across them.', 'The sentence is missing a word, so GPT-2 can’t be sure.'], right: 2,
      why: '“snow”, “pour” or “drizzle” would also fit. Next-token prediction gives a spread of options (a probability distribution), not one answer.' },
    // ---------- Input ----------
    { id: 'I1', page: 'numbers/split', lab: 'Split into tokens', sent: CARMEL, load: true, q: 'GPT-2 cuts “Carmel\'s homecoming parade was unforgettable.” into 10 tokens, including “C”, “arm”, “el”, “\'s”, “ unforgettable” and “.”. Which is true of these tokens?',
      ch: ['They mix whole words, word pieces and punctuation, and there are far fewer of them than characters.', 'Each one is a complete English word, so the name is split into smaller words.', 'Each one is one syllable of the sentence.', 'Each one is a single letter or punctuation mark.'], right: 0,
      why: 'A long common word stays whole, a rare name is built from pieces, and the period is its own token: 10 tokens instead of 45 characters.' },
    { id: 'I2', page: 'numbers/build', lab: 'Build the tokenizer', q: 'Our practice tokenizer learned the pieces “un”, “kind” and “ly”. A student types “unkindly”, which never appeared in the practice text. What does the tokenizer do?',
      ch: ['It stops: a word it hasn’t seen can’t be tokenized.', 'It adds “unkindly” to its vocabulary as a brand-new token.', 'It swaps in the closest word it already knows, such as “kindly”.', 'It builds the word from pieces it already has: un | kind | ly.'], right: 3,
      why: 'Byte Pair Encoding (BPE) builds the vocabulary once. After that, new words are assembled from known pieces.' },
    { id: 'I3', page: 'numbers/ids', lab: 'Token IDs', sent: STORY, load: true, q: '“ bank” has token ID 3331 and “ sat” has 3332. What does GPT-2 do with the number 3331?',
      ch: ['It treats “bank” and “sat” as similar in meaning, because their IDs are neighbors.', 'It uses 3331 as “bank”’s score when choosing the next token.', 'It uses 3331 as an address: row 3331 of the embedding matrix is “bank”’s embedding vector.', 'It adds 3331 to the position number to get the input vector.'], right: 2,
      why: 'A token ID is an index. Neighboring IDs say nothing about meaning.' },
    { id: 'I4', page: 'numbers/qualities', lab: 'Meaning as numbers', q: 'In Meaning as numbers, the move from “man” to “king” is the same as the move from “woman” to “queen”. What does that show about vectors?',
      ch: ['Numbers can capture relationships, so related pairs of words line up in similar ways.', 'The four words must sit next to each other in GPT-2’s vocabulary.', 'Each number stands for one letter, and these words share letters.', 'Every pair of words is the same distance apart.'], right: 0,
      why: 'Our three numbers are made up, but GPT-2’s learned vectors show similar patterns, which the model can use.' },
    { id: 'I5', page: 'numbers/dims', lab: 'Many dimensions', q: 'GPT-2’s embedding vectors have 768 numbers each. Which statement about those numbers is accurate?',
      ch: ['People decided what each of the 768 numbers means before training.', 'Each number stands for one quality with a name, like “age” or “royalty”.', 'They change each time a new sentence is typed.', 'They were learned in training, and most don’t match a single human idea.'], right: 3,
      why: 'Our three qualities were picked to be easy to read. GPT-2’s 768 were learned from text, and they stay fixed while it writes.' },
    { id: 'I6', page: 'numbers/input', lab: 'Token + position', sent: STORY, load: true, q: 'In the story sentence, “ left” (token 1364) is the 3rd token and again the 10th. Before any Transformer block runs, how do their two input vectors (Case Files) compare?',
      ch: ['Identical, because the token ID is the same.', 'Different: the same embedding row, but a different position vector is added to each.', 'Different, because the second “left” has already taken in the words before it.', 'Identical, because position is only used at the Output.'], right: 1,
      why: 'Context only starts to change them in the blocks. At the start, position is the only difference.' },
    { id: 'I7', page: 'numbers/all', lab: 'Put it together', q: 'Which order does GPT-2 follow to turn text into numbers?',
      ch: ['Text → token IDs → tokens → embedding vectors → + position vectors', 'Text → embedding vectors → tokens → token IDs → + position vectors', 'Text → tokens → token IDs → embedding vectors → + position vectors', 'Text → position vectors → tokens → token IDs → embedding vectors'], right: 2,
      why: 'Split, number, look up, add position. The sum is each token’s input vector.' },
    { id: 'I8', page: 'numbers/all', review: true, lab: 'Input review', q: 'What leaves the Input stage and goes into the first Transformer block?',
      ch: ['The original text, ready to be read word by word.', 'One 768-number input vector (Case File) for each token.', 'Just the token IDs, one for each token.', 'One 768-number vector for the whole sentence.'], right: 1,
      why: '13 tokens in, 13 Case Files out: each one is the token’s embedding vector plus its position vector.' },
    // ---------- Transformer: one question per scene (Room 1) ----------
    { id: 'T1', page: 'transformer/room', st: 'tfroom', m: key('start', 'fadein'), lab: 'Input', q: 'As a token’s Case File moves from room to room, what does it represent?',
      ch: ['GPT-2’s running representation of that token in this sentence (its hidden state), updated in every room.', 'The token’s embedding vector, copied unchanged from room to room.', 'GPT-2’s final answer for the next token, decided in Room 1.', 'A list of relevance percentages showing which tokens matter.'], right: 0,
      why: 'The Case File starts as embedding + position and is updated in each of the 12 rooms (Transformer blocks).' },
    { id: 'T2', page: 'transformer/room', st: 'tfroom', m: key('stack'), lab: 'Transformer Block · 12 rooms', q: 'In the story sentence, Room 5 is about to start. What has to be finished first?',
      ch: ['Nothing: all 12 rooms work at the same moment.', 'Only Detective 1 in Room 5, because the others copy its work.', 'Room 4, because Room 5 starts from the Case Files that Room 4 hands over.', 'The Output step, because Room 5 needs the next-token scores.'], right: 2,
      why: 'Rooms work in order. Inside one room, the 12 Detectives share one starting point, so they work in parallel.' },
    { id: 'T3', page: 'transformer/room', st: 'tfroom', m: key('q'), lab: 'Attention Head · Question', strip: [[UMB, 'umbrella', 'starting']], q: 'In the umbrella sentence, Detective 3 in Room 4 writes a Question (query) for “umbrella” and another for “starting”. Which is true?',
      ch: ['It uses two different learned Q matrices, one for each token.', 'It uses one learned Q matrix, so the two Questions are identical.', 'Softmax writes the Questions from the relevance scores.', 'It uses one learned Q matrix on two different Case Files, so the Questions differ.'], right: 3,
      why: 'The Q matrix was learned in training and stays fixed. The Case Files going into it are different.' },
    { id: 'T4', page: 'transformer/room', st: 'tfroom', m: key('s'), lab: 'Attention Head · Relevance', q: 'How does a Detective decide how much each witness matters?',
      ch: ['It compares its Question (query) with each witness’s Statement (key); better matches get more relevance.', 'It counts how often each witness’s token appears in the sentence.', 'It compares each witness’s Evidence (value) with the token’s spelling.', 'It gives the most relevance to the witnesses nearest in the sentence.'], right: 0,
      why: 'Query · key gives a score for each witness; Softmax turns the scores into relevance percentages that add up to 100%.' },
    { id: 'T5', page: 'transformer/room', st: 'tfroom', m: key('v'), lab: 'Attention Head · Evidence', q: 'Witness A gets 60% relevance and witness B gets 5%. How do their Evidence Packets (values) go into the Note?',
      ch: ['Only A’s Evidence is used, because it has the highest relevance.', 'They are averaged equally, so each counts 50%.', 'Both are added in: A’s weighted by 60% and B’s by 5%.', 'B’s Evidence counts most, because a low score means a surprise.'], right: 2,
      why: 'The Note is the relevance-weighted sum of every eligible witness’s Evidence.' },
    { id: 'T6', page: 'transformer/room', st: 'tfroom', m: key('n'), lab: 'Attention Head · Note', strip: [[TROPHY, 'trophy']], q: 'In the trophy sentence, a Detective investigates “trophy”. Can “suitcase” be one of its witnesses?',
      ch: ['Yes: any token in the sentence can be a witness.', 'No: “suitcase” comes later, so it gets 0% relevance.', 'Yes, but only once Room 12 is reached.', 'No: “trophy” can only listen to itself.'], right: 1,
      why: 'A token can use itself and the tokens before it (“The”, “trophy”), never later ones.' },
    { id: 'T7', page: 'transformer/room', st: 'tfroom', m: key('nx'), lab: 'Attention Head · What the notes say', strip: [[TROPHY, 'it'], [UMB, 'it']], q: '“it” in the trophy sentence and “it” in the umbrella sentence start with the same embedding vector. Why do they end up with different Case Files?',
      ch: ['GPT-2 looks the second one up in a different embedding matrix.', 'The words after each “it” change them in later rooms.', 'They don’t: the same token always keeps the same Case File.', 'Each “it” gathers Evidence from different earlier tokens (trophy and suitcase; umbrella and way).'], right: 3,
      why: 'Context changes meaning, and only earlier tokens supply that context. (Their position vectors differ too, but only attention brings in what the sentence is about.)' },
    { id: 'T8', page: 'transformer/room', st: 'tfroom', m: key('sup3'), lab: 'Assembly', q: 'Why does the Lead Detective add its result to the token’s Case File instead of replacing it?',
      ch: ['So what the Case File already held (the token, its position, earlier rooms’ findings) is kept while this room’s findings join it.', 'So the Case File grows to 1,536 numbers.', 'So GPT-2’s learned weights can change.', 'Adding is faster than replacing.'], right: 0,
      why: 'Adding works number by number, so the Case File stays 768 numbers long, keeps what it held and gains what this room found.' },
    { id: 'T9', page: 'transformer/room', st: 'tfroom', m: key('f1'), lab: 'Feed-Forward', q: 'What does the Forensics Expert (MLP) work on?',
      ch: ['All the Case Files at once, comparing them with each other.', 'Only the last token’s Case File.', 'Each token’s Case File on its own: it applies learned patterns and adds the result back.', 'The Detectives’ Questions, to improve the next room’s attention.'], right: 2,
      why: 'Comparing tokens is the Detectives’ job. The Forensics Expert refines each Case File separately.' },
    { id: 'T10', page: 'transformer/room', st: 'tfroom', m: key('known'), lab: 'What is known', q: 'After Room 12, GPT-2 scores the vocabulary using only the Case File of the story’s last token, “the”. Why that one?',
      ch: ['It is the most important word in the sentence.', 'It has taken in every earlier token, and its job is to predict what comes after it.', 'It is the shortest token, so it is fastest to score.', 'The other Case Files were thrown away after Room 1.'], right: 1,
      why: 'Every position predicts the token after it. Only the last position has seen the whole sentence, so its Case File is the one used to choose what comes next.' },
    // ---------- Output: one question per scene; Select the next token has two ----------
    { id: 'U1', page: 'pick/pick', st: 'pkscene', m: key('out'), lab: 'From the Transformer', q: 'The Output tab starts from the last token’s Case File after Room 12 (the output vector). What is it used for?',
      ch: ['Scoring every token in the vocabulary as a possible next token.', 'Looking up the next sentence in GPT-2’s training data.', 'Updating GPT-2’s parameters before it chooses.', 'Choosing which earlier token to repeat.'], right: 0,
      why: 'It is compared with all 50,257 embedding rows (one dot product each), which gives every token a score (logit).' },
    { id: 'U2', page: 'pick/pick', st: 'pkscene', m: key('rank'), lab: 'Score every token', sent: STORY, load: true, q: 'After the story sentence, “river” has a logit of −87.6 and “bank” has −88.0. What do these numbers tell you?',
      ch: ['Both are negative, so neither token can be chosen.', '“river” has a probability of −87.6%.', '“river” scored a little higher than “bank”; these are scores, not probabilities yet.', 'They are the two tokens’ IDs.'], right: 2,
      why: 'Only the gaps between logits matter. Softmax turns them into probabilities in a later step.' },
    { id: 'U3', page: 'pick/pick', st: 'pkscene', m: key('temp'), lab: 'Temperature & Top-K', q: 'Top-K is set to 3, and Temperature is lowered from 1 to 0.5. What happens?',
      ch: ['3 tokens get equal shares, and the leader’s share shrinks.', 'Only the 3 highest-scoring tokens stay in play, and the leader’s share grows.', 'Every token can still be picked, but more slowly.', 'GPT-2 retrains 3 of its matrices with a smaller learning rate.'], right: 1,
      why: 'Top-K cuts the list; a lower Temperature stretches the gaps toward the top token. A higher Temperature would flatten them.' },
    { id: 'U4', page: 'pick/pick', st: 'pkscene', m: key('soft'), lab: 'Scores into probabilities', q: 'Suppose Top-K is 3 and the three allowed logits are −87.6, −88.0 and −89.1. After Softmax, which is true?',
      ch: ['The probabilities are negative, because the logits are negative.', 'The top token gets 100%, because it has the highest logit.', 'Each token gets about 33%, because Top-K treats the three equally.', 'All three get positive probabilities that add up to 100%, and the highest logit gets the biggest.'], right: 3,
      why: 'Softmax turns any scores into positive probabilities that total 100%, keeping their order.' },
    { id: 'U5', page: 'pick/pick', st: 'pkscene', m: key('pick'), lab: 'Select the next token', sent: STORY, load: true, q: '“river” has 29% and “road” has 4.9%, but this time the needle lands on “road”. How can that happen?',
      ch: ['The random number r fell in “road”’s slice; any allowed token can win, in proportion to its probability.', 'GPT-2 made a mistake and should have picked “river”.', 'Temperature was set to 0, which picks at random.', '“road” was picked because it already appears in the sentence.'], right: 0,
      why: 'Bigger slices win more often, not every time.' },
    { id: 'U6', page: 'pick/pick', st: 'pkscene', m: key('pick'), lab: 'Select the next token', sent: STORY, load: true, q: 'Another time, “river” is picked with a 29% probability. What does the 29% describe?',
      ch: ['How likely the finished sentence is to be true.', 'How many people out of 100 would choose “river”.', 'How likely “river” was to be picked, with these scores and settings.', 'How sure GPT-2 is about its facts.'], right: 2,
      why: 'Probability is about picking the next token, not about whether the sentence is correct.' },
    // ---------- Whole Process ----------
    { id: 'W1', page: 'whole/flow', lab: 'Animated flow', sent: STORY, load: true, q: 'GPT-2 has just added “river” to the story sentence. How does it get the token after that?',
      ch: ['It reuses the scores it already has and takes the next-best one.', 'It retrains itself on the longer sentence first.', 'It adds one more room to the Transformer.', 'It runs the whole pass again on the longer sentence.'], right: 3,
      why: 'One new token = one full pass: tokens → Case Files → 12 rooms → scores → pick.' },
    { id: 'W2', page: 'whole/side', lab: 'Side by side', q: 'Greedy (Temperature 0.2, Top-K 1) often repeats itself, while Wild drifts into nonsense. Why?',
      ch: ['Wild uses a different, smaller model.', 'Greedy always takes the top token, so it can loop; Wild spreads probability onto many unlikely tokens.', 'Greedy reads less of the sentence than Wild.', 'It is pure luck; the settings don’t matter.'], right: 1,
      why: 'Same model and starting text; only the picking changes. Typical sits in between.' },
    { id: 'W3', page: 'whole/side', review: true, lab: 'Whole Process review', q: 'GPT-2 adds “river” to the story and runs again. What is new on this pass?',
      ch: ['New learned Q/K/V matrices.', 'A Case File for “river”, and a new set of next-token scores.', 'New Case Files for every earlier token, because “river” changes what they mean.', 'A new tokenizer vocabulary.'], right: 1,
      why: 'Earlier tokens can’t see later ones, so their Case Files come out the same (real systems reuse them). Learned parameters change only in training.' },
    // ---------- Pre-Training ----------
    { id: 'P1', page: 'learning/step', st: 'mlbook', m: (b) => /^Hide the next word/.test(b.t || ''), lab: 'Book · Hide the next word', strip: [[CAT]], q: 'Pre-training reads “The cat sat on the mat.” After “The cat sat on the”, where does the target for GPT-2’s guess come from?',
      ch: ['A teacher labels each example by hand.', 'GPT-2’s own top guess is used as the target.', 'A dictionary of correct sentences.', 'The text itself: the token that really comes next, “mat”.'], right: 3,
      why: 'The text supplies the targets, so trillions of examples need no one to label them. The goal is a likely next token, not a checked fact.' },
    { id: 'P2', page: 'learning/step', st: 'mlbook', m: ch(4), lab: 'Error', strip: [[CAT]], q: 'The target is “mat”. On one try GPT-2 gives “mat” 60%; on another, 10%. Which try has the bigger loss?',
      ch: ['Neither: “mat” got some probability both times.', 'The 60% try, because it was more confident.', 'The 10% try.', 'Both are the same, since the target didn’t change.'], right: 2,
      why: 'Loss = −ln(probability of the target): 10% → 2.3, 60% → 0.5. Less probability on the target means more loss.' },
    { id: 'P3', page: 'learning/step', st: 'mlbook', m: ch(5), lab: 'Back Prop', q: 'Back propagation finds that one parameter in Room 3 had a big effect on this loss. What has it worked out about that parameter?',
      ch: ['Its gradient: how changing it would change the loss.', 'Its new value, which is stored right away.', 'Whether the sentence it helped write is true.', 'Its relevance percentage for the next token.'], right: 0,
      why: 'Back propagation only measures. Gradient descent changes the value in the next step.' },
    { id: 'P4', page: 'learning/step', st: 'mlbook', m: ch(6), lab: 'Grad Desc', q: 'Gradient descent nudges each parameter using its gradient and a learning rate. What does the learning rate set?',
      ch: ['Which token comes next.', 'How many rooms GPT-2 has.', 'The Temperature used when writing.', 'How big each nudge is.'], right: 3,
      why: 'Too small and learning crawls; too big and the nudges overshoot.' },
    { id: 'P5', page: 'learning/step', st: 'mlbook', m: ch(7, 5), lab: 'Repeat · 5 of 5', q: 'In each training round, what comes right after the loss is measured?',
      ch: ['Forward propagation', 'Back propagation', 'Gradient descent', 'Splitting the text into tokens'], right: 1,
      why: 'Guess (forward propagation), measure the error (loss), trace it back (back propagation), then nudge (gradient descent). Repeat.' },
    { id: 'P6', page: 'learning/step', st: 'mlbook', m: ch(8), lab: 'Batches', strip: [[CAT]], q: 'A model is trained 1,000 times on the cat sentence and nothing else. What is the likely result?',
      ch: ['It understands every language.', 'Its loss is zero on any text.', 'It can repeat that sentence but does poorly on new text.', 'It stops using attention.'], right: 2,
      why: 'Varied text is what lets a model generalize to sentences it has never seen.' },
    // ---------- Post-Training ----------
    { id: 'R1', page: 'post/rlhf', st: 'rlhf', m: ch(3), lab: 'Grade', q: 'In RLHF, a person reads a model’s whole reply to “Give me a packing list for a beach trip” and rates it. What is being judged?',
      ch: ['The reply as a whole: is it helpful, clear and appropriate?', 'Whether each token was the single most likely one.', 'How fast the reply was written.', 'Whether the prompt was spelled correctly.'], right: 0,
      why: 'Pre-training scores one next token at a time; RLHF judges finished replies.' },
    { id: 'R2', page: 'post/rlhf', st: 'rlhf', m: ch(5), lab: 'Grad Desc', q: 'After many replies are rated, how do the ratings change the model?',
      ch: ['A person edits the 124 million numbers by hand.', 'A reward model learns from the ratings, and gradient descent nudges the parameters toward higher-rated replies.', 'The ratings are saved and looked up during later chats.', 'The model gets a new set of Detectives.'], right: 1,
      why: 'People rate; the training math decides each change. The goal is replies that follow instructions and help.' },
    // ---------- Assistant ----------
    { id: 'A1', page: 'assist/before', st: 'asbefore', m: chev('Reveal'), lab: 'Before & After · Reveal', q: 'Both versions get “User: Name three red fruits. Assistant:”. Version 1 continues with “User: Name three yellow fruits.” Version 2 lists three red fruits and stops. What explains the difference?',
      ch: ['Version 1’s tokenizer can’t read “Assistant:”.', 'Version 2 was post-trained to follow requests.', 'Version 2 is a much bigger model.', 'Version 2 was given the answer in its prompt.'], right: 1,
      why: 'Same size, same tokenizer, same prompt; only post-training differs.' },
    { id: 'A2', page: 'assist/before', st: 'asbefore', m: chev('Generalize'), lab: 'Before & After · Generalize', q: 'A student says: “Just add the word Assistant: to a prompt, and any model becomes a chatbot.” What is the best reply?',
      ch: ['Right: the label is all a model needs.', 'Right, as long as the Temperature is high enough.', 'Not quite: a model can recognize chat-like text, but answering helpfully is built in by post-training.', 'Not quite: models can’t read role labels at all.'], right: 2,
      why: 'Version 1 knows what a chat looks like and keeps writing one; it was never trained to answer.' },
    { id: 'A3', page: 'assist/conv', st: 'asconv', m: chev('Case Log'), lab: 'Inside a Conversation · Case Log', q: 'You ask for a pancake recipe, then type “Now halve it.” How does the assistant know what “it” is?',
      ch: ['It remembers your account from yesterday.', 'The tokenizer works out what “it” means.', 'It guesses; there is no way to know.', 'The earlier messages are part of what it reads (the Case Log).'], right: 3,
      why: 'Every reply is predicted from the whole Case Log, including your earlier message.' },
    { id: 'A4', page: 'assist/conv', st: 'asconv', m: chev('Saved memory'), lab: 'Inside a Conversation · Saved memory', q: 'A memory feature has saved “Sam is vegetarian.” In a new chat, Sam asks for dinner ideas and gets no meat dishes. What happened?',
      ch: ['The saved note was placed in the Case Log, so the model read it along with the question.', 'Sam’s preference became a new learned parameter.', 'The model was retrained overnight on Sam’s chats.', 'The embedding vector for “dinner” changed.'], right: 0,
      why: 'Saved memory is context; the learned parameters didn’t change.' },
    { id: 'A5', page: 'assist/conv', st: 'asconv', m: chev('Trimmed'), lab: 'Inside a Conversation · Trimmed', q: 'A long chat grows past the model’s context window. What happens to the oldest messages?',
      ch: ['They move to a separate memory the model always checks.', 'They keep the same influence as recent messages, however long the chat.', 'They drop out of the window and can’t affect the next token, unless they are summarized or sent again.', 'The chat has to restart from the beginning.'], right: 2,
      why: 'The model only reads what fits in its window (1,024 tokens for GPT-2).' },
    { id: 'A6', page: 'assist/conv', review: true, lab: 'Assistant review', q: 'Which best describes a chat assistant?',
      ch: ['A program that looks answers up in a database of replies.', 'A search engine with a chat window on top.', 'A model that retrains itself as you chat.', 'A next-token predictor, shaped by post-training into a helper, that reads a Case Log of instructions and history.'], right: 3,
      why: 'The same next-token machinery underneath: post-training shapes the replies, and the Case Log supplies everything about this chat.' },
    // ---------- Think & Act ----------
    { id: 'K1', page: 'think/tools', st: 'astools', m: chev('Explain A'), lab: 'Think & Use Tools · Explain', q: '“28 students need 4 pencils each; the teacher has 100. How many more are needed?” One AI answer shows its steps: “28 × 4 = 108; 108 − 100 = 8.” What does this show?',
      ch: ['Neat steps don’t guarantee correct arithmetic: 28 × 4 is 112, so 12 more are needed.', 'It is right, because it explains each step.', 'AI can never do arithmetic, with or without steps.', 'It is right, because 8 is a reasonable number.'], right: 0,
      why: 'Check the steps, not just whether steps are there.' },
    { id: 'K2', page: 'think/tools', st: 'astools', m: chev('Tool loop'), lab: 'Think & Use Tools · Tool loop', q: 'The model writes the request “Calculate: 28 × 4 − 100”. What happens right after that?',
      ch: ['The model guesses the most likely number.', 'The student has to type in the answer.', 'The request is skipped if the model is confident.', 'Software outside the model runs the calculation.'], right: 3,
      why: 'The result is then added to the context, and the model keeps writing from it.' },
    { id: 'K3', page: 'think/tools', st: 'astools', m: chev('It can repeat'), lab: 'Think & Use Tools · It can repeat', q: 'Asked for today’s weather in Chicago and tomorrow’s in Denver, an AI searches, reads the result, searches again and then answers. What makes this an agent?',
      ch: ['It writes longer answers than a chatbot.', 'It chooses an action, looks at the result and picks its next step.', 'It uses a higher Temperature.', 'It answers both questions from memory at once.'], right: 1,
      why: 'An agent loops: request, read the result, decide.' },
    { id: 'K4', page: 'think/tools', st: 'astools', m: chev('It can repeat'), lab: 'Think & Use Tools · It can repeat', q: 'The search returns this morning’s weather report. How does the model use it?',
      ch: ['It waits until its next training run to learn it.', 'The report overwrites the embedding vector for “weather”.', 'The report is added to its context, and it writes the answer from there.', 'It ignores the report and uses its training data.'], right: 2,
      why: 'Retrieved text enters the context, not the parameters.' },
    { id: 'K7', page: 'think/tools', st: 'astools', m: chev('Generalize'), lab: 'Think & Use Tools · Generalize', q: 'A student says: “It thought for 30 seconds, so I don’t need to check it.” What is the best reply?',
      ch: ['Right: thinking time guarantees a correct answer.', 'Right: more tokens always mean more truth.', 'Extra thinking can help, but answers that matter still need checking.', 'Thinking means it retrained itself on the question.'], right: 2,
      why: 'Reasoning gives the model more tokens to work with; it is not verification.' },
    { id: 'K6', page: 'think/trust', st: 'astrust', m: chev('Check'), lab: 'Which Answer? · Check', q: 'An AI answer gives a city’s population and cites a census page. You open the page, and it shows a different number. What should you conclude?',
      ch: ['Trust the answer: it has a citation.', 'The citation doesn’t support the claim, so don’t trust that number yet.', 'Trust the answer if it is long and detailed.', 'Average the two numbers.'], right: 1,
      why: 'A citation only counts if the source says what the answer claims.' },
    { id: 'K5', page: 'think/trust', st: 'astrust', m: chev('How made'), lab: 'Which Answer? · How made', q: 'Asked who won last night’s game, a model without search names last season’s champion. Why?',
      ch: ['Its training data ends before last night, and nothing newer is in its context.', 'It is lying on purpose.', 'Its Temperature is too low.', 'Sports names are special tokens it can’t change.'], right: 0,
      why: 'Newer information has to come in through the prompt, a document or a tool such as search.' },
    { id: 'K8', page: 'think/trust', st: 'astrust', m: chev('Generalize'), lab: 'Which Answer? · Generalize', q: 'You ask an AI whether a wild mushroom you found is safe to eat. Which check fits the stakes?',
      ch: ['Ask the same AI again and see whether it agrees.', 'Confirm with an independent expert source, such as a local expert or poison control.', 'Ask it to explain its reasoning in more detail.', 'Trust it if the answer is detailed and sounds confident.'], right: 1,
      why: 'The higher the stakes, the stronger and more independent the check. Asking the same model again is not an independent source.' },
    { id: 'K9', page: 'think/trust', review: true, lab: 'Think & Act review', q: 'What was GPT-2 trained to do during pre-training?',
      ch: ['Give high probability to the token the text actually used next.', 'Write statements that are true.', 'Match an encyclopedia.', 'Sound confident.'], right: 0,
      why: 'A likely continuation can still be false, which is why fluent text isn’t proof.' },
  ].map((x) => Object.assign(x, { tab: x.page.split('/')[0], sub: x.page.split('/')[1] }));
  NT.CHECKS = Q;
  const TABNAME = { experience: 'Overview', numbers: 'Input', transformer: 'Transformer', pick: 'Output', whole: 'Whole Process', learning: 'Pre-Training', post: 'Post-Training', assist: 'Assistant', think: 'Think & Act' };

  // ---------- where am I: the scene on story pages, the page elsewhere ----------
  const hook = (st) => { const s = NT.stations[st]; return s && s.scene; };
  function here() {
    const h = hook(S.station);
    if (h && Q.some((x) => x.st === S.station)) {
      if (!h.ready()) return [];
      const b = h.beats()[h.now()]; if (!b) return [];
      return Q.filter((x) => x.st === S.station && x.m(b));
    }
    return Q.filter((x) => !x.st && !x.review && x.tab === S.top && x.sub === S.sub);
  }
  const spot = () => { const h = hook(S.station); return `${S.top}/${S.sub}/${S.station}/${h && h.ready() ? h.now() : '-'}`; };

  // ---------- answered questions (Show answer pressed), remembered in this browser ----------
  const DONE = 'llmlab.checks.done';
  let done = new Set(); try { done = new Set(JSON.parse(localStorage.getItem(DONE) || '[]')); } catch (e) { /* storage blocked: this visit only */ }
  const save = () => { try { localStorage.setItem(DONE, JSON.stringify([...done])); } catch (e) { /* not remembered */ } };
  function markDone(id) { if (done.has(id)) return; done.add(id); save(); refresh(); }
  function resetDone() { done.clear(); try { localStorage.removeItem(DONE); } catch (e) { /* ignore */ } refresh(); }
  try { localStorage.removeItem('llmlab.checks'); localStorage.removeItem('llmlab.checks.seen'); } catch (e) { /* the old on/off switch and "opened" list are retired */ }

  // ---------- the chip in the sub-tab row ----------
  NT.checkBtn = () => {
    const subs = $('#subtabs'); if (!subs) return;
    const list = here(); let b = $('#chkTog');
    if (!list.length) { if (b) b.remove(); return; }
    if (!b || b.parentNode !== subs) {
      if (b) b.remove();
      b = document.createElement('button'); b.className = 'whotog cu'; b.id = 'chkTog';
      const who = $('#whoTog'); if (who && who.parentNode === subs) subs.insertBefore(b, who); else subs.appendChild(b);
      b.onclick = (e) => { e.stopPropagation(); const l = here(); if (l.length) openScene(l); };
    }
    const all = list.every((x) => done.has(x.id)), n = list.length, sig = `${all}|${list.map((x) => x.id).join(',')}`;
    if (b.dataset.sig === sig) return; b.dataset.sig = sig;
    b.classList.toggle('seen', all);
    const cnt = n > 1 ? ` <small>${n}</small>` : '';
    b.title = all ? 'Answered. Click to see it again.' : n > 1 ? `${n} questions about this scene` : 'A question about this scene';
    b.innerHTML = all ? `✔<span class="cu-long"> Checked${cnt}</span><span class="cu-short">${cnt}</span>` : `✔<span class="cu-long"> Check understanding${cnt}</span><span class="cu-short"> Check${cnt}</span>`;
    requestAnimationFrame(fitBtn);
  };
  function refresh() { NT.checkBtn(); paintPills(); }
  function fitBtn() { // the full label when the sub-tab row has room; just "✔ Check" when it would wrap the row
    const b = $('#chkTog'), subs = $('#subtabs'); if (!b || !subs || !subs.firstElementChild) return;
    b.classList.remove('short');
    const top = subs.firstElementChild.getBoundingClientRect().top;
    if ([b, $('#whoTog')].some((x) => x && (x.getBoundingClientRect().top > top + 6 || x.scrollWidth > x.clientWidth + 1)) || subs.getBoundingClientRect().height > 40 || subs.scrollWidth > subs.clientWidth + 1) b.classList.add('short');
  }
  window.addEventListener('resize', () => requestAnimationFrame(fitBtn));
  // scenes change inside pages (Next, Play, chevrons) without redrawing the row: look a few times a second
  let lastSpot = '';
  setInterval(() => {
    if (document.hidden) return;
    const s = spot(), b = $('#chkTog');
    if (s !== lastSpot || (b && !b.isConnected) || (!b && here().length)) { lastSpot = s; NT.checkBtn(); }
  }, 300);

  // ---------- the card, docked at the bottom right ----------
  // mode 'scene': the questions of one scene, with Next / Done. mode 'tour': a list of questions, numbered, with Back / Next / Done.
  let C = null; // { mode, list, i, title }
  function close() { const m = $('#chkCard'); if (m) m.remove(); C = null; }
  function openScene(list) { C = { mode: 'scene', list, i: Math.max(0, list.findIndex((x) => !done.has(x.id))) }; draw(); }
  function startTour(list, title) { closeMenu(); C = { mode: 'tour', list, i: 0, title }; goTo(0); }
  const strip = (sent, focus) => { // a small picture of the sentence the question is about
    const words = sent.split(/(\s+)/); const f = new Set(focus || []);
    return `<div class="chk-strip">${words.map((w) => (/^\s+$/.test(w) ? '' : `<span class="chk-tok${f.has(w.replace(/[^\w’']/g, '')) ? ' f' : ''}">${esc(w)}</span>`)).join('')}</div>`;
  };
  function sentNote(c) {
    if (c.strip) return `<div class="chk-sent"><span>Example ${c.strip.length > 1 ? 'sentences' : 'sentence'} (not the one on screen):</span>${c.strip.map(([s, ...f]) => strip(s, f)).join('')}</div>`;
    if (c.sent && !NT.current().text.startsWith(c.sent.replace(/\s+$/, ''))) return `<div class="chk-sent"><span>About this sentence:</span>${strip(c.sent)}</div>`;
    return '';
  }
  function paintPills() { const m = $('#chkCard'); if (!m) return; m.querySelectorAll('.chk-pill').forEach((p) => p.classList.toggle('seen', done.has(p.dataset.id))); }
  function draw() {
    const old = $('#chkCard'); if (old) old.remove();
    if (!C) return;
    const c = C.list[C.i], tab = TABNAME[c.tab] || '', last = C.i === C.list.length - 1;
    let top = '', nav = '';
    if (C.mode === 'tour') {
      const grp = C.list.map((x, i) => [x, i]).filter(([x]) => x.tab === c.tab);
      top = `<div class="chk-tour">${esc(C.title)} · ${C.i + 1} of ${C.list.length}</div><div class="chk-pills"><span class="chk-ptab">${esc(tab)}</span>${grp.map(([x, i]) => `<button class="chk-pill${i === C.i ? ' on' : ''}${done.has(x.id) ? ' seen' : ''}" data-i="${i}" data-id="${x.id}" title="${esc(x.lab)}">${x.review ? 'Review' : grp.filter(([y]) => !y.review).findIndex(([y]) => y === x) + 1}</button>`).join('')}</div>`;
      nav = `<button class="btn" id="chkPrev"${C.i === 0 ? ' disabled' : ''}>◀ Back</button><button class="btn primary" id="chkNext">${last ? 'Done' : 'Next ▶'}</button>`;
    } else {
      if (C.list.length > 1) top = `<div class="chk-tour">Question ${C.i + 1} of ${C.list.length} for this scene</div>`;
      nav = `<button class="btn primary" id="chkNext">${last ? 'Done' : 'Next ▶'}</button>`;
    }
    document.body.insertAdjacentHTML('beforeend', `<div class="chk-card" id="chkCard" role="dialog" aria-label="Check for understanding">
      <div class="chk-h"><span>✔ Check for understanding · ${esc(tab)}${c.review || c.lab === tab ? '' : ' › ' + esc(c.lab)}</span><button class="btn ghost" id="chkX" title="Close">✕</button></div>${top}${sentNote(c)}
      <p class="chk-q">${esc(c.q)}</p><div class="chk-ch">${c.ch.map((t, i) => `<button class="chk-o" data-i="${i}"><b>${'ABCD'[i]}</b> ${esc(t)}</button>`).join('')}</div>
      <div class="chk-f"><button class="btn" id="chkShow">Show answer</button><span class="chk-why" id="chkWhy" hidden></span></div>
      <div class="chk-nav">${nav}</div></div>`);
    const m = $('#chkCard');
    $('#chkX').onclick = close;
    m.querySelectorAll('.chk-o').forEach((o) => (o.onclick = () => { if (m.classList.contains('shown')) return; m.querySelectorAll('.chk-o').forEach((x) => x.classList.toggle('pick', x === o)); }));
    $('#chkShow').onclick = () => {
      m.classList.add('shown');
      m.querySelectorAll('.chk-o').forEach((x) => { const i = +x.dataset.i; x.classList.toggle('right', i === c.right); x.classList.toggle('wrong', i !== c.right && x.classList.contains('pick')); });
      const w = $('#chkWhy'); w.hidden = false; w.innerHTML = `<b>${'ABCD'[c.right]}.</b> ${esc(c.why)}`; $('#chkShow').hidden = true;
      markDone(c.id);
    };
    $('#chkNext').onclick = () => { if (last) { close(); return; } if (C.mode === 'tour') goTo(C.i + 1); else { C.i++; draw(); } };
    const pv = $('#chkPrev'); if (pv) pv.onclick = () => goTo(C.i - 1);
    m.querySelectorAll('.chk-pill').forEach((p) => (p.onclick = () => goTo(+p.dataset.i)));
  }

  // ---------- tours: take the app to each question's scene ----------
  let tk = 0;
  async function goTo(i) {
    if (!C) return; C.i = i; const c = C.list[i], my = ++tk; draw();
    if (c.review) return; // a whole-tab review: stay where we are
    if (S.top !== c.tab || S.sub !== c.sub) NT.goTab(c.tab, c.sub);
    if (c.load && c.sent && !NT.current().text.startsWith(c.sent.replace(/\s+$/, ''))) NT.setText(c.sent, 'edit');
    if (!c.st) { draw(); return; }
    for (let t = 0; t < 150; t++) { // the page may still be loading its numbers
      if (my !== tk) return;
      const h = hook(c.st);
      if (S.station === c.st && h && h.ready()) {
        const bi = h.beats().findIndex((b) => c.m(b));
        if (bi >= 0 && h.now() !== bi) h.seek(bi);
        if (my === tk) draw(); // keep the card on top of anything the page redrew
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // ---------- the "✔ Checks ▾" menu in the top bar ----------
  const mb = $('#chkBtn'), menu = $('#chkMenu');
  function closeMenu() { if (menu) menu.hidden = true; if (mb) mb.setAttribute('aria-expanded', 'false'); }
  if (mb && menu) {
    mb.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!menu.hidden) { closeMenu(); return; }
      const tabList = Q.filter((x) => x.tab === S.top), tab = TABNAME[S.top] || '';
      menu.innerHTML = `<button data-a="all">Show all Checks (${Q.length})</button>${tabList.length ? `<button data-a="tab">Show all Checks in ${esc(tab)} (${tabList.length})</button>` : ''}<hr><button data-a="reset" class="chk-mreset">Reset checks</button>`;
      menu.hidden = false; mb.setAttribute('aria-expanded', 'true');
      menu.querySelector('[data-a="all"]').onclick = () => startTour(Q, 'All Checks');
      const t = menu.querySelector('[data-a="tab"]'); if (t) t.onclick = () => startTour(tabList, `${tab} Checks`);
      const r = menu.querySelector('[data-a="reset"]');
      r.onclick = (ev) => { ev.stopPropagation(); if (!r.dataset.sure) { r.dataset.sure = '1'; r.textContent = 'Reset every check in this browser? Click again'; return; } resetDone(); r.textContent = 'Checks reset ✓'; r.disabled = true; setTimeout(closeMenu, 900); };
    });
    document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); close(); } });
})();
