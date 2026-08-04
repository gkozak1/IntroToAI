export const APP_VERSION = '1.0.0';
export const STATE_KEY = 'nextTokenLab.v1.state';

export const REAL_MODEL_CONFIG = {
  libraryVersion: '3.8.1',
  modelId: 'onnx-community/SmolLM2-360M-ONNX',
  fallbackModelId: 'onnx-community/SmolLM2-135M-ONNX',
  dtype: 'q4',
  topN: 12,
};

export const PROCESS_STAGES = [
  { id: 'training', label: 'Training patterns' },
  { id: 'tokens', label: 'Tokens & vectors' },
  { id: 'context', label: 'Context & attention' },
  { id: 'scores', label: 'Logits' },
  { id: 'probabilities', label: 'Probabilities' },
  { id: 'selection', label: 'Selection' },
  { id: 'repeat', label: 'Append & repeat' },
];

export const CLASSES = [
  {
    id: 1,
    title: 'Patterns and Repeated Prediction',
    shortTitle: 'Patterns & Prediction',
    goal: 'Explain how patterns in training data help a model predict what comes next, and how repeated predictions can create a complete response.',
    dominantIdea: 'An LLM learns patterns about what usually comes next, then generates by selecting and appending one next unit at a time.',
    stages: ['training', 'probabilities', 'selection', 'repeat'],
    steps: [
      'c1-goal', 'c1-predict', 'c1-checkpoint-1', 'c1-corpus', 'c1-training-bridge',
      'c1-checkpoint-2', 'c1-branch', 'c1-checkpoint-3', 'c1-complete',
    ],
  },
  {
    id: 2,
    title: 'Context and Attention',
    shortTitle: 'Context & Attention',
    goal: 'Explain why earlier words change the next prediction and how attention allows different parts of the context to contribute differently.',
    dominantIdea: 'A transformer uses relationships across the available context, not only the final word or two.',
    stages: ['tokens', 'context', 'scores', 'probabilities'],
    steps: [
      'c2-goal', 'c2-predictors', 'c2-checkpoint-1', 'c2-bank-predict', 'c2-bank-compare',
      'c2-checkpoint-2', 'c2-attention', 'c2-real-compare', 'c2-checkpoint-3', 'c2-complete',
    ],
  },
  {
    id: 3,
    title: 'Tokens, Scores, and Probabilities',
    shortTitle: 'Tokens & Probability',
    goal: 'Explain how an LLM represents text numerically and converts its context-sensitive result into probabilities for possible next tokens.',
    dominantIdea: 'Text becomes numerical representations; the model scores every possible next token, and SoftMax turns those scores into a distribution.',
    stages: ['tokens', 'context', 'scores', 'probabilities'],
    steps: [
      'c3-goal', 'c3-token-reveal', 'c3-tokenizer', 'c3-checkpoint-1', 'c3-vectors',
      'c3-logits', 'c3-checkpoint-2', 'c3-softmax', 'c3-real-probabilities', 'c3-checkpoint-3', 'c3-complete',
    ],
  },
  {
    id: 4,
    title: 'Temperature, Selection, and the Complete Loop',
    shortTitle: 'Temperature & Selection',
    goal: 'Explain how temperature and sampling select one token, and trace the complete generation loop in a real LLM.',
    dominantIdea: 'Temperature reshapes the distribution; sampling or greedy decoding selects one token; the selected token changes the next prediction.',
    stages: ['scores', 'probabilities', 'selection', 'repeat'],
    steps: [
      'c4-goal', 'c4-temperature', 'c4-checkpoint-1', 'c4-sampling', 'c4-checkpoint-2',
      'c4-append', 'c4-real-context', 'c4-real-branch', 'c4-real-temperature',
      'c4-checkpoint-3', 'c4-open-lab', 'c4-complete',
    ],
  },
];

export const CLASS1_BASE_CORPUS = [
  { id: 's1', text: 'The soccer player kicked the ball into the goal.', active: true },
  { id: 's2', text: 'The soccer player kicked the ball across the field.', active: true },
  { id: 's3', text: 'The soccer player kicked the ball toward a teammate.', active: true },
  { id: 's4', text: 'The soccer player kicked the ball with her left foot.', active: true },
  { id: 's5', text: 'The soccer player kicked the ball over the defender.', active: true },
  { id: 's6', text: 'The soccer player kicked the ball after the whistle.', active: true },
  { id: 's7', text: 'The soccer player kicked the ball too hard.', active: true },
  { id: 's8', text: 'The soccer player kicked the door in frustration.', active: true },
  { id: 's9', text: 'The soccer player kicked the door shut.', active: true },
  { id: 's10', text: 'The soccer player kicked the ground after missing.', active: true },
];

export const BRANCH_CORPUS = [
  'The dog ran toward the door and began scratching.',
  'The dog ran toward the door and barked loudly.',
  'The dog ran toward the door because someone knocked.',
  'The dog ran toward the door when the bell rang.',
  'The dog ran toward the park where children played.',
  'The dog ran toward the park and chased a squirrel.',
  'The dog ran toward the park to find its owner.',
  'The dog ran toward the park before sunset.',
  'The dog ran toward the child and wagged its tail.',
  'The dog ran toward the road but stopped suddenly.',
  'The dog ran toward the gate and waited patiently.',
  'The dog ran toward the garden where birds gathered.',
  'The dog ran toward the door and began whining.',
  'The dog ran toward the park and rolled in the grass.',
  'The dog ran toward the door while its owner watched.',
  'The dog ran toward the park because it heard laughter.',
];

export const PREDICTOR_LADDER = {
  prompt: 'After hours under a dark sky, the astronomer looked through the telescope and saw the',
  overall: [
    { token: 'the', probability: 0.28 },
    { token: 'a', probability: 0.22 },
    { token: 'and', probability: 0.16 },
    { token: 'other', probability: 0.34 },
  ],
  short: [
    { token: 'man', probability: 0.24 },
    { token: 'bird', probability: 0.20 },
    { token: 'light', probability: 0.18 },
    { token: 'other', probability: 0.38 },
  ],
  broad: [
    { token: 'moon', probability: 0.34 },
    { token: 'planet', probability: 0.27 },
    { token: 'stars', probability: 0.19 },
    { token: 'other', probability: 0.20 },
  ],
};

export const BANK_CONTEXTS = {
  river: {
    label: 'River context',
    text: 'The fisherman paddled downstream all morning. When he reached the bank, he saw a',
    cueWords: ['fisherman', 'paddled', 'downstream', 'morning', 'reached'],
    cueVectors: [[1, 0], [0.9, 0.1], [1, 0], [0.45, 0.45], [0.5, 0.5]],
    defaultImportance: [22, 18, 41, 6, 13],
  },
  finance: {
    label: 'Financial context',
    text: 'The borrower discussed her mortgage all morning. When she reached the bank, she saw a',
    cueWords: ['borrower', 'discussed', 'mortgage', 'morning', 'reached'],
    cueVectors: [[0, 1], [0.2, 0.8], [0, 1], [0.45, 0.45], [0.5, 0.5]],
    defaultImportance: [22, 18, 41, 6, 13],
  },
};

export const BANK_CANDIDATES = [
  { token: ' boat', vector: [0.9, 0.1], baseline: 0.20 },
  { token: ' water', vector: [1.0, 0.0], baseline: 0.18 },
  { token: ' tree', vector: [0.8, 0.2], baseline: 0.14 },
  { token: ' teller', vector: [0.05, 0.95], baseline: 0.20 },
  { token: ' line', vector: [0.25, 0.75], baseline: 0.16 },
  { token: ' guard', vector: [0.15, 0.85], baseline: 0.12 },
];

export const TOKEN_EXAMPLES = [
  { label: 'Common word', text: 'cat', illustration: ['cat'] },
  { label: 'Long word', text: 'unbelievable', illustration: ['un', 'believ', 'able'] },
  { label: 'Surname', text: 'Kozak', illustration: ['Ko', 'zak'] },
  { label: 'Punctuation', text: 'Wait... what?', illustration: ['Wait', '...', ' what', '?'] },
  { label: 'Misspelling', text: 'definately', illustration: ['def', 'in', 'ately'] },
];

export const TOY_VECTOR_SEQUENCE = {
  tokens: ['The', 'bank', 'closed'],
  vectors: [
    [0.10, 0.30, 0.20],
    [0.72, 0.18, 0.38],
    [0.22, 0.68, 0.36],
  ],
  axes: ['Axis 1', 'Axis 2', 'Axis 3'],
};

export const TOY_LOGITS = [
  { token: ' water', logit: 4.2 },
  { token: ' boat', logit: 3.5 },
  { token: ' tree', logit: 3.1 },
  { token: ' teller', logit: 0.4 },
  { token: ' mortgage', logit: -0.8 },
];

export const REAL_GUIDED_PROMPTS = {
  river: BANK_CONTEXTS.river.text,
  finance: BANK_CONTEXTS.finance.text,
  branch: 'The robot opened the box and found',
  temperature: 'In the abandoned observatory, the scientist discovered',
  openDefault: 'The student adjusted one earlier word in the prompt, and the model',
};

export const MISCONCEPTIONS = [
  ['The model searches its training documents.', 'Training changes numerical weights; ordinary generation does not search a sentence database.'],
  ['The model decides the whole response first.', 'It produces one token, appends it, and calculates a new distribution.'],
  ['Attention is one spotlight.', 'Many weighted relationships update representations across many heads and layers.'],
  ['A 90% token probability means the statement is 90% true.', 'It means this model strongly favors that textual continuation in this context.'],
  ['Temperature is the random number.', 'Temperature reshapes the distribution; sampling uses a random value to select from it.'],
];
