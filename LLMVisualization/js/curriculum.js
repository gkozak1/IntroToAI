/*
 * curriculum.js
 * Static, version-controlled curriculum content for The Next Token Lab.
 * Keeping this separate from logic lets a teacher tune wording, corpora,
 * and guided examples without touching the engine.
 */

export const RECURRING_QUESTION =
  "Given everything the model has so far, what should come next?";

// Seven-stage process map shared across all classes (spec §3.4).
export const PROCESS_STAGES = [
  { id: "training", label: "Training patterns" },
  { id: "text", label: "Text / tokens" },
  { id: "context", label: "Context / attention" },
  { id: "logits", label: "Logits" },
  { id: "probs", label: "Probabilities" },
  { id: "selection", label: "Selection" },
  { id: "append", label: "Append & repeat" },
];

/* ----------------------------------------------------------------------
 * Class / step map. Each step names its process-map stage, a one-line
 * sub-goal, and (optionally) a checkpoint with discussion questions.
 * -------------------------------------------------------------------- */

export const CLASSES = [
  {
    n: 1,
    title: "Patterns and generation",
    question: "Where do predictions come from, and how does one prediction become a response?",
    goal:
      "See how patterns in training data shape a prediction, and how repeated predictions build a whole response.",
    steps: [
      { id: "1.0", title: "Goal and prediction", stage: "text",
        sub: "Before you see any data, guess what comes next." },
      { id: "1.1", title: "Visible training library", stage: "training",
        sub: "Reveal a small corpus and count what actually followed." },
      { id: "1.2", title: "Change the training data", stage: "training",
        sub: "Change one example and watch the probabilities move.",
        checkpoint: {
          title: "Checkpoint — training shapes prediction",
          qs: ["What happened to the prediction when you changed the corpus?",
               "Is the model looking up a sentence, or learning a pattern?"] } },
      { id: "1.3", title: "Training vs. use", stage: "training",
        sub: "Adjusting weights during training is not the same as using them." },
      { id: "1.4", title: "Select and append", stage: "append",
        sub: "Pick one candidate, append it, and predict again." },
      { id: "1.5", title: "Branch and compare", stage: "selection",
        sub: "Rewind once, choose differently, and grow two branches.",
        checkpoint: {
          title: "Checkpoint — one choice changes everything after it",
          qs: ["How did your two branches end up different?",
               "Where did the two branches first diverge, and why?"] } },
      { id: "1.6", title: "Complete the goal", stage: "append",
        sub: "Return to the opening question with your own branch inserted." },
    ],
  },
  {
    n: 2,
    title: "Context and attention",
    question: "Why do earlier words change the next prediction?",
    goal:
      "See why earlier words change the next prediction, and how attention lets parts of the context matter differently.",
    steps: [
      { id: "2.0", title: "Reconnect to Class 1", stage: "context",
        sub: "Your chosen word from last class is now part of the context." },
      { id: "2.1", title: "Three predictors", stage: "context",
        sub: "Compare frequency-only, last-word, and broad-context predictors." },
      { id: "2.2", title: 'Matched "bank" contexts', stage: "context",
        sub: "Same ending, different earlier context — predict what shifts.",
        checkpoint: {
          title: "Checkpoint — the ending is identical",
          qs: ["Both prompts end with the same words. Why do the predictions differ?"] } },
      { id: "2.3", title: "Context eraser", stage: "context",
        sub: "Mute or replace an earlier phrase and watch the deltas." },
      { id: "2.4", title: "Context challenge set", stage: "context",
        sub: "Reference, list-pattern, and word-order challenges." },
      { id: "2.5", title: "Attention as weighted influence", stage: "context",
        sub: "Give earlier tokens weights that sum to 1 and mix their vectors.",
        checkpoint: {
          title: "Checkpoint — attention is weighted, not a spotlight",
          qs: ["What does it mean for a weight to be larger?",
               "Do the weights have to add up to anything in particular?"] } },
      { id: "2.6", title: "Test with a real transformer", stage: "probs",
        sub: "Optional: check that a real model's probabilities shift with context." },
      { id: "2.7", title: "Complete the goal", stage: "context",
        sub: "Context → attention → changed next-token scores." },
    ],
  },
  {
    n: 3,
    title: "Tokens to probabilities",
    question: "How does text become numerical scores and probabilities?",
    goal:
      "See how an LLM turns text into numbers and turns its result into probabilities over possible next tokens.",
    steps: [
      { id: "3.0", title: "Word-to-token reveal", stage: "text",
        sub: '"Next-word" was a helpful simplification. The real unit is a token.' },
      { id: "3.1", title: "Tokenizer investigation", stage: "text",
        sub: "Words, fragments, punctuation, spaces — type anything and look.",
        checkpoint: {
          title: "Checkpoint — a token is not always a word",
          qs: ["What surprised you about how your text was split?"] } },
      { id: "3.2", title: "Tokens become vectors", stage: "text",
        sub: "Each token becomes a row of numbers in a matrix." },
      { id: "3.3", title: "Contextual update recap", stage: "context",
        sub: "Attention updates the final-position vector (from Class 2)." },
      { id: "3.4", title: "Output layer and logits", stage: "logits",
        sub: "z = Wout · h + b gives each candidate a score. Scores can be negative." },
      { id: "3.5", title: "SoftMax", stage: "probs",
        sub: "Turn competing scores into probabilities that total 100%.",
        checkpoint: {
          title: "Checkpoint — scores are not probabilities",
          qs: ["Why can a logit be negative but a probability cannot?",
               "When you raised one logit, why did the others drop?"] } },
      { id: "3.6", title: "Compare with a real model", stage: "probs",
        sub: "Optional: real tokenization and native T=1 probabilities." },
      { id: "3.7", title: "Complete the goal", stage: "probs",
        sub: "Trace tokens → vectors → context → logits → probabilities." },
    ],
  },
  {
    n: 4,
    title: "Temperature and selection",
    question: "How is one token selected, and how does the loop repeat?",
    goal:
      "See how temperature and sampling pick one token, and trace the complete generation loop.",
    steps: [
      { id: "4.0", title: "Fixed-logit recall", stage: "logits",
        sub: "Start from the Class 3 scores so only temperature is new." },
      { id: "4.1", title: "Temperature reshaping", stage: "probs",
        sub: "Hold the logits fixed and change T. Greedy is separate." },
      { id: "4.2", title: "Cumulative intervals", stage: "selection",
        sub: "Probabilities occupy ranges along a 0–1 number line." },
      { id: "4.3", title: "Sampling with r", stage: "selection",
        sub: "One random number r lands in one interval and picks a token.",
        checkpoint: {
          title: "Checkpoint — r did not change; the intervals did",
          qs: ["With r held fixed, what made the selection change?"] } },
      { id: "4.4", title: "Append and recalculate", stage: "append",
        sub: "The selected token joins the context and everything recomputes." },
      { id: "4.5", title: "Guided real-model experiments", stage: "probs",
        sub: "Optional: change context, branch, or temperature on a real model." },
      { id: "4.6", title: "Open Lab", stage: "append",
        sub: "Your turn: type a prompt and run the whole loop yourself." },
      { id: "4.7", title: "Whole-process synthesis", stage: "append",
        sub: "One prediction event, traced through the complete loop." },
    ],
  },
];

/* ----------------------------------------------------------------------
 * Class 1 — the visible training corpus (small, inspectable). C1-01.
 * -------------------------------------------------------------------- */

export const CLASS1_CORPUS = [
  "The weather today is sunny and warm.",
  "The weather today is cold and windy.",
  "The weather today is sunny and bright.",
  "The weather tomorrow is going to be sunny.",
  "My favorite weather is a sunny afternoon.",
  "The dog ran across the sunny park.",
  "The dog ran across the wet grass.",
  "The dog ran across the busy street.",
  "We sat outside on a sunny afternoon.",
  "The children played outside all afternoon.",
  "I like coffee in the cold morning.",
  "I like coffee with a warm pastry.",
];

export const CLASS1_STARTER = "The weather today is";

/* ----------------------------------------------------------------------
 * Class 2 — authored guided examples (fixed distributions). C2-01/02/03.
 * Each predictor's distribution is authored so the contrast is stable
 * and does not depend on fragile real-model percentages.
 * -------------------------------------------------------------------- */

export const CLASS2_THREE_PREDICTORS = {
  context: "The trophy would not fit in the suitcase because it was too",
  note:
    "A short-context predictor only sees the last word or two. A broad-context predictor can use the whole sentence — including 'trophy' and 'suitcase'.",
  predictors: {
    frequency: { label: "Frequency only", dist: [
      { token: "the", p: 0.22 }, { token: "a", p: 0.14 }, { token: "to", p: 0.11 },
      { token: "big", p: 0.05 }, { token: "small", p: 0.04 } ] },
    last: { label: "Last word: “too”", dist: [
      { token: "much", p: 0.34 }, { token: "many", p: 0.18 }, { token: "big", p: 0.12 },
      { token: "small", p: 0.10 }, { token: "late", p: 0.08 } ] },
    broad: { label: "Broad context", dist: [
      { token: "big", p: 0.51 }, { token: "large", p: 0.22 }, { token: "small", p: 0.11 },
      { token: "heavy", p: 0.08 }, { token: "wide", p: 0.05 } ] },
  },
  // The "problem the short predictor can't solve" (C2-01):
  callout:
    'Only the broad-context predictor can tell that "it" is the trophy, so "big" fits and "small" does not.',
};

export const CLASS2_MATCHED_BANK = {
  shared_ending: "walked over to the bank",
  a: {
    label: "River context",
    prompt: "After fishing all morning, she walked over to the bank",
    dist: [
      { token: "and", p: 0.20 }, { token: "of", p: 0.17 }, { token: "to", p: 0.12 },
      { token: "edge", p: 0.10 }, { token: "water", p: 0.09 } ],
  },
  b: {
    label: "Money context",
    prompt: "After cashing her paycheck, she walked over to the bank",
    dist: [
      { token: "teller", p: 0.24 }, { token: "counter", p: 0.16 }, { token: "and", p: 0.14 },
      { token: "to", p: 0.11 }, { token: "line", p: 0.08 } ],
  },
};

// Class 2.3 context eraser: base distribution and the effect of muting a phrase.
export const CLASS2_ERASER = {
  fullContext: "The city council refused the marchers a permit because they feared",
  phrase: "the marchers", // clickable phrase students can mute/replace
  base: [
    { token: "violence", p: 0.41 }, { token: "trouble", p: 0.19 },
    { token: "chaos", p: 0.14 }, { token: "them", p: 0.08 }, { token: "riots", p: 0.07 } ],
  muted: [ // with "the marchers" muted, "they" is ambiguous
    { token: "violence", p: 0.24 }, { token: "trouble", p: 0.16 },
    { token: "problems", p: 0.15 }, { token: "them", p: 0.14 }, { token: "backlash", p: 0.11 } ],
};

// Class 2.4 challenge set (reference / list-pattern / word-order).
export const CLASS2_CHALLENGES = [
  { kind: "Reference", prompt: "The plumber called the electrician because she",
    answer: "who does “she” refer to?",
    dist: [{token:"needed",p:0.28},{token:"had",p:0.22},{token:"was",p:0.19},{token:"wanted",p:0.14},{token:"could",p:0.09}] },
  { kind: "List pattern", prompt: "Red, orange, yellow, green, blue,",
    answer: "the pattern is the color spectrum",
    dist: [{token:"indigo",p:0.44},{token:"purple",p:0.31},{token:"violet",p:0.12},{token:"and",p:0.07},{token:"pink",p:0.03}] },
  { kind: "Word order", prompt: "The reviewer said the film was not at all",
    answer: '“not” flips the expected sentiment',
    dist: [{token:"good",p:0.30},{token:"bad",p:0.18},{token:"boring",p:0.16},{token:"interesting",p:0.14},{token:"funny",p:0.09}] },
];

// Class 2.5 toy attention: earlier tokens with toy value vectors.
export const CLASS2_ATTENTION = {
  context: "The trophy would not fit because it was too",
  tokens: [
    { word: "trophy", value: [0.9, 0.2, 0.1] },
    { word: "suitcase", value: [0.1, 0.8, 0.2] },
    { word: "too", value: [0.2, 0.2, 0.9] },
  ],
  defaultWeights: [0.6, 0.1, 0.3],
  dims: ["object-size", "container-size", "degree-word"],
};

/* ----------------------------------------------------------------------
 * Class 3 — toy vectors, output layer, logits. C3-02/03/04.
 * Five candidate next tokens after the toy contextual vector h.
 * -------------------------------------------------------------------- */

export const CLASS3_TOY = {
  candidates: ["big", "large", "small", "heavy", "wide"],
  // Contextual vector h (4 simplified/unlabeled features). C3-02.
  h: [0.9, 0.3, 0.2, 0.6],
  // Output weight matrix Wout (5 rows × 4). Chosen so "big" leads but
  // some logits are negative (C3-03).
  W: [
    [ 1.1,  0.2,  0.1,  0.4], // big
    [ 0.8,  0.4,  0.0,  0.3], // large
    [-0.9,  0.2,  0.6, -0.3], // small
    [ 0.1,  0.7, -0.2,  0.5], // heavy
    [ 0.2, -0.1,  0.3,  0.2], // wide
  ],
  b: [0.3, 0.1, -0.2, 0.0, -0.1],
  // Toy token vectors for the "tokens become vectors" screen (3D).
  tokenVectors: [
    { token: "The",    v: [0.10, 0.40, -0.20] },
    { token: "trophy", v: [0.90, 0.20,  0.10] },
    { token: "was",    v: [-0.10, 0.30, 0.50] },
    { token: "too",    v: [0.20, 0.20,  0.90] },
    { token: "big",    v: [0.85, 0.15,  0.05] },
  ],
};

/* ----------------------------------------------------------------------
 * Glossary (spec §12.2). Introductory level preserved.
 * -------------------------------------------------------------------- */

export const GLOSSARY = [
  ["Teaching Model", "A transparent, deliberately simplified model that shows counts, weights, scores, and probability math you can check by hand."],
  ["Real Browser Model", "A genuine small language model that runs locally in your browser — not equivalent to a frontier model like ChatGPT."],
  ["Token", "The unit a model actually reads and predicts. It may be a word, a word fragment, punctuation, a space, or a control marker."],
  ["Logit", "A raw score the network gives each candidate next token. Logits rank candidates but are not probabilities, and can be negative."],
  ["SoftMax", "The step that turns competing logits into probabilities that add up to 100%."],
  ["Native probability", "The model's probability at temperature 1, computed from the original logits over the whole vocabulary."],
  ["Sampling probability", "The probability after temperature adjustment, used when a token is chosen at random."],
  ["Temperature", "A dial that reshapes the probabilities before selection. Below 1 sharpens; above 1 flattens. It does not pick the token."],
  ["Attention weight", "In this course's toy model, the share of contextual information an earlier token contributes. Real transformers use many learned heads and layers."],
  ["Cumulative probability", "Running totals of the probabilities, laid out as intervals along a 0–1 line."],
  ["r-value", "A single random number between 0 and 1 that lands in one interval and selects that token."],
  ["Greedy selection", "Always choosing the highest-probability token. A separate mode — not temperature set to zero."],
  ["Checkpoint", "A planned stop for teacher explanation and class discussion. It is not a graded assessment."],
  ["Branch", "A different continuation made by choosing a different next token from the same starting context."],
];
