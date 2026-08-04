import {
  APP_VERSION,
  BANK_CANDIDATES,
  BANK_CONTEXTS,
  BRANCH_CORPUS,
  CLASS1_BASE_CORPUS,
  CLASSES,
  MISCONCEPTIONS,
  PREDICTOR_LADDER,
  PROCESS_STAGES,
  REAL_GUIDED_PROMPTS,
  REAL_MODEL_CONFIG,
  TOKEN_EXAMPLES,
  TOY_LOGITS,
  TOY_VECTOR_SEQUENCE,
} from './data.js';
import {
  NGramTeachingModel,
  candidateDistributionFromContext,
  cumulativeDistribution,
  detokenizeWords,
  formatTokenForDisplay,
  normalizeWeights,
  percent,
  round,
  sampleIndex,
  stableSoftmax,
  weightedContextVector,
  wordTokenize,
} from './teaching-model.js';
import {
  loadState,
  markStepComplete,
  resetState,
  saveState,
} from './state.js';
import { RealModelClient } from './real-model-client.js';

const root = document.querySelector('#screen-root');
const classNavigation = document.querySelector('#class-navigation');
const processMap = document.querySelector('#process-map');
const teacherDialog = document.querySelector('#teacher-dialog');
const teacherNavContent = document.querySelector('#teacher-nav-content');
const helpDialog = document.querySelector('#help-dialog');
const helpContent = document.querySelector('#help-content');
const modelDialog = document.querySelector('#model-dialog');
const modelDialogContent = document.querySelector('#model-dialog-content');
const modelStatusButton = document.querySelector('#model-status-button');
const modelStatusLabel = document.querySelector('#model-status-label');
const toastRegion = document.querySelector('#toast-region');

let state = loadState();
let currentStep = state.currentStep || 'c1-goal';
const realModel = new RealModelClient();
const runtime = {
  predictorMode: 'overall',
  bankRemoved: { river: new Set(), finance: new Set() },
  tokenReveal: false,
  tokenizerResult: null,
  tokenizerLoading: false,
  vectorMatrix: TOY_VECTOR_SEQUENCE.vectors.map((row) => [...row]),
  softmaxSelected: 0,
  modelProgress: { progress: 0, file: '', message: 'Not loaded' },
  modelState: 'idle',
  loadingKey: null,
  realResults: {},
  realErrors: {},
  openLabHistory: [],
  openLabPrompt: state.choices.real.lastPrompt || REAL_GUIDED_PROMPTS.openDefault,
  openLabTemperature: state.choices.temperature || 1,
  openLabGreedy: false,
  openLabRandom: 0.62,
  branchSelected: [],
  c4AppendRecalculated: false,
};

const STEP_META = {
  'c1-goal': ['Class 1', 'Today’s goal', 'training'],
  'c1-predict': ['Class 1', 'Predict before the model', 'training'],
  'c1-checkpoint-1': ['Class 1', 'Teacher checkpoint', 'training'],
  'c1-corpus': ['Class 1', 'Learn from visible examples', 'training'],
  'c1-training-bridge': ['Class 1', 'Pretraining and generation', 'training'],
  'c1-checkpoint-2': ['Class 1', 'Teacher checkpoint', 'training'],
  'c1-branch': ['Class 1', 'One choice changes the next', 'repeat'],
  'c1-checkpoint-3': ['Class 1', 'Teacher checkpoint', 'repeat'],
  'c1-complete': ['Class 1', 'Complete the goal', 'repeat'],
  'c2-goal': ['Class 2', 'Today’s goal', 'context'],
  'c2-predictors': ['Class 2', 'Why simple frequency fails', 'context'],
  'c2-checkpoint-1': ['Class 2', 'Teacher checkpoint', 'context'],
  'c2-bank-predict': ['Class 2', 'Predict the effect of context', 'context'],
  'c2-bank-compare': ['Class 2', 'Change earlier context', 'context'],
  'c2-checkpoint-2': ['Class 2', 'Teacher checkpoint', 'context'],
  'c2-attention': ['Class 2', 'Attention as weighted influence', 'context'],
  'c2-real-compare': ['Class 2', 'Test a real transformer', 'probabilities'],
  'c2-checkpoint-3': ['Class 2', 'Teacher checkpoint', 'context'],
  'c2-complete': ['Class 2', 'Complete the goal', 'context'],
  'c3-goal': ['Class 3', 'Today’s goal', 'tokens'],
  'c3-token-reveal': ['Class 3', 'Words become tokens', 'tokens'],
  'c3-tokenizer': ['Class 3', 'Inspect a real tokenizer', 'tokens'],
  'c3-checkpoint-1': ['Class 3', 'Teacher checkpoint', 'tokens'],
  'c3-vectors': ['Class 3', 'Tokens become numbers', 'tokens'],
  'c3-logits': ['Class 3', 'The model scores every token', 'scores'],
  'c3-checkpoint-2': ['Class 3', 'Teacher checkpoint', 'scores'],
  'c3-softmax': ['Class 3', 'Scores become probabilities', 'probabilities'],
  'c3-real-probabilities': ['Class 3', 'Inspect authentic probabilities', 'probabilities'],
  'c3-checkpoint-3': ['Class 3', 'Teacher checkpoint', 'probabilities'],
  'c3-complete': ['Class 3', 'Complete the goal', 'probabilities'],
  'c4-goal': ['Class 4', 'Today’s goal', 'selection'],
  'c4-temperature': ['Class 4', 'Temperature reshapes the distribution', 'probabilities'],
  'c4-checkpoint-1': ['Class 4', 'Teacher checkpoint', 'probabilities'],
  'c4-sampling': ['Class 4', 'Sampling selects one token', 'selection'],
  'c4-checkpoint-2': ['Class 4', 'Teacher checkpoint', 'selection'],
  'c4-append': ['Class 4', 'Append and recalculate', 'repeat'],
  'c4-real-context': ['Class 4', 'Guided experiment: context', 'context'],
  'c4-real-branch': ['Class 4', 'Guided experiment: branching', 'repeat'],
  'c4-real-temperature': ['Class 4', 'Guided experiment: temperature', 'probabilities'],
  'c4-checkpoint-3': ['Class 4', 'Teacher checkpoint', 'repeat'],
  'c4-open-lab': ['Class 4', 'Open laboratory', 'repeat'],
  'c4-complete': ['Class 4', 'Complete the whole loop', 'repeat'],
};

const STEP_TITLES = Object.fromEntries(Object.entries(STEP_META).map(([id, meta]) => [id, meta[1]]));

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function tokenHtml(token) {
  const visible = formatTokenForDisplay(token);
  return `<span class="math-plain">${escapeHtml(visible)}</span>`;
}

function classForStep(stepId = currentStep) {
  return CLASSES.find((courseClass) => courseClass.steps.includes(stepId)) || CLASSES[0];
}

function stepIndex(stepId = currentStep) {
  const courseClass = classForStep(stepId);
  return courseClass.steps.indexOf(stepId);
}

function persist() {
  state.currentStep = currentStep;
  state.currentClass = classForStep().id;
  saveState(state);
}

function navigate(stepId, options = {}) {
  if (!STEP_META[stepId]) return;
  if (options.completeCurrent) markStepComplete(state, currentStep);
  currentStep = stepId;
  persist();
  render();
  document.querySelector('#main-content')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goNext() {
  const courseClass = classForStep();
  const index = courseClass.steps.indexOf(currentStep);
  markStepComplete(state, currentStep);
  if (index < courseClass.steps.length - 1) {
    navigate(courseClass.steps[index + 1]);
  } else {
    if (!state.completedClasses.includes(courseClass.id)) state.completedClasses.push(courseClass.id);
    const nextClass = CLASSES.find((item) => item.id === courseClass.id + 1);
    if (nextClass) navigate(nextClass.steps[0]);
    else persist();
  }
}

function goPrevious() {
  const courseClass = classForStep();
  const index = courseClass.steps.indexOf(currentStep);
  if (index > 0) navigate(courseClass.steps[index - 1]);
}

function firstIncompleteStep(courseClass) {
  return courseClass.steps.find((step) => !state.completedSteps.includes(step)) || courseClass.steps[0];
}

function showToast(message, type = '') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastRegion.append(toast);
  setTimeout(() => toast.remove(), 4200);
}

function renderNavigation() {
  classNavigation.innerHTML = CLASSES.map((courseClass) => {
    const completed = courseClass.steps.filter((step) => state.completedSteps.includes(step)).length;
    const active = courseClass.id === classForStep().id;
    return `<button class="class-nav-button ${active ? 'active' : ''}" type="button" data-class-id="${courseClass.id}">
      <span class="class-nav-number">${courseClass.id}</span>
      <span class="class-nav-title">${escapeHtml(courseClass.shortTitle)}</span>
      <span class="class-nav-progress">${completed}/${courseClass.steps.length}</span>
    </button>`;
  }).join('');

  classNavigation.querySelectorAll('[data-class-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const courseClass = CLASSES.find((item) => item.id === Number(button.dataset.classId));
      navigate(firstIncompleteStep(courseClass));
    });
  });
}

function renderProcessMap() {
  const courseClass = classForStep();
  const currentStage = STEP_META[currentStep]?.[2];
  processMap.innerHTML = PROCESS_STAGES.map((stage) => {
    const active = courseClass.stages.includes(stage.id);
    return `<div class="process-stage ${active ? 'active' : ''} ${stage.id === currentStage ? 'current' : ''}">
      ${escapeHtml(stage.label)}
    </div>`;
  }).join('');
}

function screenHeader(title, subtitle = '') {
  const courseClass = classForStep();
  const index = stepIndex();
  return `<div class="screen-header">
    <div class="screen-title-block">
      <p class="screen-kicker">Class ${courseClass.id}: ${escapeHtml(courseClass.shortTitle)}</p>
      <h2>${escapeHtml(title)}</h2>
      ${subtitle ? `<p class="screen-subtitle">${subtitle}</p>` : ''}
    </div>
    <div class="step-counter">Step ${index + 1} of ${courseClass.steps.length}</div>
  </div>`;
}

function actions({ nextLabel = 'Continue', previous = true, next = true, nextDisabled = false, nextId = 'next-button', extra = '' } = {}) {
  return `<div class="screen-actions">
    <div class="action-group">
      ${previous ? '<button id="previous-button" class="secondary-button" type="button">Back</button>' : ''}
      ${extra}
    </div>
    <div class="action-group">
      ${next ? `<button id="${nextId}" class="primary-button" type="button" ${nextDisabled ? 'disabled' : ''}>${escapeHtml(nextLabel)}</button>` : ''}
    </div>
  </div>`;
}

function bindStandardActions() {
  document.querySelector('#previous-button')?.addEventListener('click', goPrevious);
  document.querySelector('#next-button')?.addEventListener('click', goNext);
}

function goalScreen(courseClass, guidingQuestion, body) {
  return `<article class="screen">
    ${screenHeader('Today’s goal', 'Start with the goal. Every activity in this class should help complete it.')}
    <section class="goal-card">
      <p class="eyebrow">By the end of class</p>
      <p class="goal-statement">${escapeHtml(courseClass.goal)}</p>
      <div class="guiding-question"><span class="question-mark">?</span>${escapeHtml(guidingQuestion)}</div>
    </section>
    ${body}
    ${actions({ previous: courseClass.id !== 1, nextLabel: 'Begin the investigation' })}
  </article>`;
}

function checkpointScreen(title, prompts, note = 'Stop here and wait for class discussion.') {
  return `<article class="screen">
    ${screenHeader('Teacher checkpoint', 'The app pauses so the class can name the idea before moving deeper.')}
    <section class="checkpoint-card">
      <div class="checkpoint-label">⏸ Class discussion</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(note)}</p>
      <ol class="checkpoint-prompts">
        ${prompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join('')}
      </ol>
    </section>
    ${actions({ nextLabel: 'Continue when your teacher says to proceed' })}
  </article>`;
}

function probabilityBars(items, options = {}) {
  const max = options.scaleToMax ? Math.max(...items.map((item) => item.probability), 0.00001) : 1;
  const barClass = options.barClass || '';
  return `<div class="probability-list">
    ${items.map((item) => `<div class="probability-row">
      <div class="probability-label">${tokenHtml(item.token)}</div>
      <div class="probability-track"><div class="probability-bar ${barClass}" style="width:${Math.max(0.2, item.probability / max * 100)}%"></div></div>
      <div class="probability-value">${percent(item.probability, options.digits ?? 1)}</div>
    </div>`).join('')}
  </div>`;
}

function dualProbabilityBars(items) {
  const max = Math.max(...items.flatMap((item) => [item.nativeProbability, item.samplingProbability]), 0.0001);
  return `<div class="dual-bars">
    <div class="dual-bar-row small muted"><strong>Token</strong><span>Native T=1</span><span>Sampling</span></div>
    ${items.map((item) => `<div class="dual-bar-row">
      <div class="probability-label">${tokenHtml(item.token)}</div>
      <div class="dual-bar-cell"><div class="probability-track"><div class="probability-bar native" style="width:${item.nativeProbability / max * 100}%"></div></div><span class="probability-value">${percent(item.nativeProbability, 1)}</span></div>
      <div class="dual-bar-cell"><div class="probability-track"><div class="probability-bar sampling" style="width:${item.samplingProbability / max * 100}%"></div></div><span class="probability-value">${percent(item.samplingProbability, 1)}</span></div>
    </div>`).join('')}
  </div>`;
}

function loopDiagram() {
  const labels = ['Training shaped weights', 'Text becomes tokens', 'Context is processed', 'Logits score tokens', 'SoftMax makes probabilities', 'One token is selected', 'Append and repeat'];
  return `<div class="loop-diagram">${labels.map((label) => `<div class="loop-node">${escapeHtml(label)}</div>`).join('')}</div>`;
}

function renderC1Goal() {
  const courseClass = CLASSES[0];
  root.innerHTML = goalScreen(courseClass, 'How could a machine have any idea what word should come next?', `
    <section class="card grid-2">
      <div>
        <h3>The useful starting model</h3>
        <p>An LLM repeatedly asks: <strong>Given everything so far, what should come next?</strong></p>
      </div>
      <div>
        <h3>What we will not assume</h3>
        <p>The model does not first write a hidden finished paragraph and then reveal it one word at a time.</p>
      </div>
    </section>`);
  bindStandardActions();
}

function renderC1Predict() {
  const values = state.choices.firstPredictions || ['', '', ''];
  root.innerHTML = `<article class="screen">
    ${screenHeader('Predict before the model', 'Begin with your own language instincts before seeing any data.')}
    <section class="activity-panel stack">
      <h3>What could come next?</h3>
      <div class="prompt-box">The soccer player kicked the <span class="prompt-blank">?</span></div>
      <div class="prediction-inputs">
        ${values.map((value, index) => `<label class="field">Prediction ${index + 1}
          <input class="text-input prediction-input" data-index="${index}" value="${escapeHtml(value)}" placeholder="Enter one word">
        </label>`).join('')}
      </div>
      <p class="note">Do not search for one “correct” answer. List plausible continuations and consider which one you expect most often.</p>
    </section>
    ${actions({ nextLabel: 'Save my predictions and pause' })}
  </article>`;
  document.querySelectorAll('.prediction-input').forEach((input) => {
    input.addEventListener('input', () => {
      state.choices.firstPredictions[Number(input.dataset.index)] = input.value.trim();
      persist();
    });
  });
  bindStandardActions();
}

function renderC1Checkpoint1() {
  root.innerHTML = checkpointScreen('Where could a machine’s prediction come from?', [
    'Which continuation did most people predict?',
    'What prior experience made that word feel likely?',
    'How could text examples be converted into a numerical prediction?',
  ]);
  bindStandardActions();
}

function activeClass1Corpus() {
  return CLASS1_BASE_CORPUS.map((item) => ({
    ...item,
    active: state.choices.corpusActive[item.id] ?? item.active,
  }));
}

function class1Prediction() {
  const active = activeClass1Corpus().filter((item) => item.active).map((item) => item.text);
  const custom = state.choices.customCorpus || [];
  const model = new NGramTeachingModel([...active, ...custom], 6);
  return model.predict('The soccer player kicked the', { minOrder: 5, maxOrder: 5 });
}

function renderC1Corpus() {
  const corpus = activeClass1Corpus();
  const result = class1Prediction();
  const predictions = state.choices.firstPredictions.filter(Boolean);
  root.innerHTML = `<article class="screen">
    ${screenHeader('Learn from visible examples', 'This transparent teaching model counts what followed the same phrase in a small corpus.')}
    <section class="grid-2">
      <div class="model-panel teaching">
        <h3><span class="model-badge teaching">Teaching Model</span> Visible training examples</h3>
        <div class="corpus-list">
          ${corpus.map((item) => `<div class="corpus-item">
            <input id="corpus-${item.id}" type="checkbox" data-corpus-id="${item.id}" ${item.active ? 'checked' : ''}>
            <label for="corpus-${item.id}">${escapeHtml(item.text).replace(/(ball|door|ground)/i, '<span class="evidence-word">$1</span>')}</label>
          </div>`).join('')}
          ${(state.choices.customCorpus || []).map((sentence, index) => `<div class="corpus-item">
            <input type="checkbox" checked disabled aria-label="Custom sentence active">
            <div>${escapeHtml(sentence)} <button class="ghost-button remove-custom" data-index="${index}" type="button">Remove</button></div>
          </div>`).join('')}
        </div>
        <div class="field" style="margin-top:14px">
          <label for="custom-corpus">Add one more example</label>
          <div class="inline-row">
            <input id="custom-corpus" class="text-input" placeholder="The soccer player kicked the ball..." style="flex:1">
            <button id="add-corpus-button" class="secondary-button" type="button">Add</button>
          </div>
        </div>
      </div>
      <div class="model-panel teaching stack">
        <h3><span class="model-badge teaching">Teaching Model</span> Count → probability</h3>
        <div class="prompt-box">The soccer player kicked the <span class="prompt-blank">next word</span></div>
        ${result.candidates.length ? `<table class="count-table">
          <thead><tr><th>Next word</th><th>Count</th><th>Probability</th></tr></thead>
          <tbody>${result.candidates.map((candidate) => `<tr><td>${escapeHtml(candidate.token)}</td><td>${candidate.count}</td><td>${percent(candidate.probability, 0)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><th>Total</th><th>${result.total}</th><th>100%</th></tr></tfoot>
        </table>` : '<p>No active examples match the phrase.</p>'}
        <span class="equation">P(next word | text so far) = matching examples ÷ relevant examples</span>
        ${predictions.length ? `<p class="small muted">Your earlier predictions: ${predictions.map((value) => `<strong>${escapeHtml(value)}</strong>`).join(', ')}</p>` : ''}
      </div>
    </section>
    <p class="note accuracy-note"><strong>Accuracy guardrail:</strong> A real LLM does not search a sentence list and count exact matches. During training, it compresses complicated patterns into numerical weights. This tiny model makes the basic source of probability visible.</p>
    ${actions({ nextLabel: 'Connect this to pretraining' })}
  </article>`;

  document.querySelectorAll('[data-corpus-id]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      state.choices.corpusActive[checkbox.dataset.corpusId] = checkbox.checked;
      persist();
      render();
    });
  });
  document.querySelector('#add-corpus-button')?.addEventListener('click', () => {
    const input = document.querySelector('#custom-corpus');
    const sentence = input.value.trim();
    if (!sentence) return;
    state.choices.customCorpus.push(sentence);
    persist();
    render();
  });
  document.querySelector('#custom-corpus')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') document.querySelector('#add-corpus-button').click();
  });
  document.querySelectorAll('.remove-custom').forEach((button) => {
    button.addEventListener('click', () => {
      state.choices.customCorpus.splice(Number(button.dataset.index), 1);
      persist();
      render();
    });
  });
  bindStandardActions();
}

function renderC1TrainingBridge() {
  root.innerHTML = `<article class="screen">
    ${screenHeader('Pretraining and generation use the same basic task', 'The scale changes dramatically, but the central question remains: what comes next?')}
    <section class="grid-2">
      <div class="card">
        <p class="eyebrow">During pretraining</p>
        <h3>Practice with known text</h3>
        <ol>
          <li>Show the model the text before a real next token.</li>
          <li>Ask it to assign probabilities.</li>
          <li>Compare the distribution with the actual token.</li>
          <li>Use error, backpropagation, and gradient descent to adjust weights.</li>
        </ol>
      </div>
      <div class="card">
        <p class="eyebrow">During generation</p>
        <h3>Use the trained weights</h3>
        <ol>
          <li>Give the model a prompt and generated text so far.</li>
          <li>Calculate a next-token distribution.</li>
          <li>Select and append one token.</li>
          <li>Run the process again.</li>
        </ol>
      </div>
    </section>
    <section class="explanation-panel">
      <h3>Connect this to your gradient-descent work</h3>
      <p>In regression, you adjusted weights to reduce prediction error. Pretraining an LLM follows the same broad principle, but the model has vastly more weights and practices on vastly more token-prediction examples.</p>
      <div class="inline-row">
        <span class="model-badge teaching">Pretrained</span><span>how the model learned to predict</span>
        <span aria-hidden="true">→</span>
        <span class="model-badge real">Generative</span><span>how it uses that ability to create output</span>
      </div>
    </section>
    ${actions({ nextLabel: 'Pause for discussion' })}
  </article>`;
  bindStandardActions();
}

function renderC1Checkpoint2() {
  root.innerHTML = checkpointScreen('What is stored after training?', [
    'Does a real LLM need to search the original documents during ordinary generation?',
    'What role do loss, backpropagation, and gradient descent play during pretraining?',
    'How are “pretrained” and “generative” connected?',
  ]);
  bindStandardActions();
}

function branchModel() {
  return new NGramTeachingModel(BRANCH_CORPUS, 7);
}

function branchContext(branchTokens) {
  return detokenizeWords([...wordTokenize('The dog ran toward the'), ...branchTokens]);
}

function branchCandidates(branchTokens) {
  return branchModel().predict(branchContext(branchTokens), { maxOrder: 7, minOrder: 1 }).candidates.slice(0, 6);
}

function renderBranchColumn(branchId, tokens) {
  const candidates = branchCandidates(tokens);
  const label = branchId === 'A' ? 'Branch A' : 'Branch B';
  return `<section class="branch-column">
    <div class="branch-label"><strong>${label}</strong><button class="ghost-button reset-branch" data-branch="${branchId}" type="button">Reset</button></div>
    <div class="branch-text">${escapeHtml(branchContext(tokens))}</div>
    <div class="choice-grid">
      ${tokens.length < 5 && candidates.length ? candidates.map((candidate) => `<button class="choice-button branch-choice" data-branch="${branchId}" data-token="${escapeHtml(candidate.token)}" type="button">${escapeHtml(candidate.token)} <span class="small muted">${percent(candidate.probability, 0)}</span></button>`).join('') : '<span class="small muted">This short branch is complete. Compare it with the other path.</span>'}
    </div>
  </section>`;
}

function renderC1Branch() {
  const branchA = state.choices.branchA || [];
  const branchB = state.choices.branchB || [];
  root.innerHTML = `<article class="screen">
    ${screenHeader('One choice changes the next prediction', 'Build two continuations from the same starting context.')}
    <section class="activity-panel branch-board">
      <div class="branch-origin">The dog ran toward the …</div>
      <div class="branch-columns">
        ${renderBranchColumn('A', branchA)}
        ${renderBranchColumn('B', branchB)}
      </div>
      <p class="note">Each button shows the Teaching Model’s probability for the current branch. After you choose, that word becomes part of the next input.</p>
    </section>
    <section class="card">
      <h3>Watch the consequence</h3>
      <p>The model does not preserve the old distribution. It recalculates after every selected word because the context has changed.</p>
    </section>
    ${actions({ nextLabel: 'Pause and compare the branches', nextDisabled: branchA.length < 2 || branchB.length < 2 })}
  </article>`;
  document.querySelectorAll('.branch-choice').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.branch === 'A' ? state.choices.branchA : state.choices.branchB;
      target.push(button.dataset.token);
      persist();
      render();
    });
  });
  document.querySelectorAll('.reset-branch').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.branch === 'A') state.choices.branchA = [];
      else state.choices.branchB = [];
      persist();
      render();
    });
  });
  bindStandardActions();
}

function renderC1Checkpoint3() {
  root.innerHTML = checkpointScreen('Did the model plan either full sentence?', [
    'At what point did your two branches begin to diverge?',
    'Why did the probability distribution change after each choice?',
    'How can repeated local choices create output that appears planned?',
  ]);
  bindStandardActions();
}

function renderC1Complete() {
  root.innerHTML = `<article class="screen">
    ${screenHeader('Complete the Class 1 goal', 'Return to the goal and name the complete idea in plain language.')}
    <section class="complete-card">
      <h3>The Class 1 explanation</h3>
      <p>An LLM is pretrained by repeatedly practicing next-token prediction and adjusting its weights when its predictions are poor. During generation, it uses those learned weights to produce a distribution, selects one next unit, appends it, and predicts again.</p>
    </section>
    ${loopDiagram()}
    <p class="note accuracy-note">For now, “next word” is a useful model. In Class 3, the app will reveal why “next token” is more accurate.</p>
    ${actions({ nextLabel: 'Finish Class 1 and open Class 2' })}
  </article>`;
  bindStandardActions();
  document.querySelector('#next-button')?.addEventListener('click', () => {
    if (!state.completedClasses.includes(1)) state.completedClasses.push(1);
  }, { once: true });
}

function savedBranchSummary() {
  const tokens = state.choices.branchA?.length ? state.choices.branchA : ['park', 'where', 'children', 'played'];
  return branchContext(tokens);
}

function renderC2Goal() {
  const courseClass = CLASSES[1];
  root.innerHTML = goalScreen(courseClass, 'Why can the same final words lead to different next predictions?', `
    <section class="card">
      <h3>Your Class 1 choice became context</h3>
      <div class="prompt-box">${escapeHtml(savedBranchSummary())}</div>
      <p>The words you selected did not disappear. They became evidence used for every later prediction.</p>
    </section>`);
  bindStandardActions();
}

function renderC2Predictors() {
  const modes = [
    ['overall', 'General frequency', 'Which words are common anywhere?'],
    ['short', 'Last few words', 'What often follows the final phrase?'],
    ['broad', 'Broader context', 'What fits the meaning and structure of the passage?'],
  ];
  const data = PREDICTOR_LADDER[runtime.predictorMode];
  root.innerHTML = `<article class="screen">
    ${screenHeader('Why simple frequency is not enough', 'Compare increasingly capable prediction strategies.')}
    <section class="activity-panel stack">
      <div class="prompt-box">${escapeHtml(PREDICTOR_LADDER.prompt)} <span class="prompt-blank">?</span></div>
      <div class="choice-grid">
        ${modes.map(([id, title, description]) => `<button class="choice-button predictor-mode ${runtime.predictorMode === id ? 'selected' : ''}" data-mode="${id}" type="button"><strong>${title}</strong><br><span class="small">${description}</span></button>`).join('')}
      </div>
      ${probabilityBars(data, { scaleToMax: false, barClass: 'teaching' })}
    </section>
    <section class="grid-3">
      ${modes.map(([id, title, description], index) => `<div class="card">
        <p class="eyebrow">Predictor ${index + 1}</p>
        <h3>${title}</h3><p>${description}</p>
        <p class="small muted">${id === 'overall' ? 'Too general to produce a coherent local continuation.' : id === 'short' ? 'Better locally, but can miss the topic established earlier.' : 'Uses earlier evidence to make the final position context-sensitive.'}</p>
      </div>`).join('')}
    </section>
    <p class="note">A real transformer does not literally switch among these three predictors. The comparison creates the need for a mechanism that uses broader context.</p>
    ${actions({ nextLabel: 'Pause before naming attention' })}
  </article>`;
  document.querySelectorAll('.predictor-mode').forEach((button) => {
    button.addEventListener('click', () => {
      runtime.predictorMode = button.dataset.mode;
      render();
    });
  });
  bindStandardActions();
}

function renderC2Checkpoint1() {
  root.innerHTML = checkpointScreen('What information is missing from the short predictor?', [
    'Why are “the” and “a” common but usually unhelpful as a complete prediction strategy?',
    'Which words in the astronomy prompt establish its topic?',
    'What kind of mechanism would let distant words influence the blank?',
  ]);
  bindStandardActions();
}

function renderC2BankPredict() {
  const values = state.choices.bankPrediction || { river: '', finance: '' };
  root.innerHTML = `<article class="screen">
    ${screenHeader('Predict the effect of context', 'The final clause is nearly identical. Earlier words establish two different meanings of “bank.”')}
    <section class="grid-2">
      ${Object.entries(BANK_CONTEXTS).map(([id, context]) => `<div class="card stack">
        <p class="eyebrow">${escapeHtml(context.label)}</p>
        <div class="prompt-box">${escapeHtml(context.text)} <span class="prompt-blank">?</span></div>
        <label class="field">Your likely next word
          <input class="text-input bank-prediction" data-context="${id}" value="${escapeHtml(values[id] || '')}" placeholder="One likely word">
        </label>
      </div>`).join('')}
    </section>
    <section class="card">
      <h3>Before the reveal</h3>
      <p>Identify two earlier words in each prompt that you expect to change the final distribution. The ending by itself does not explain the difference.</p>
    </section>
    ${actions({ nextLabel: 'Reveal and manipulate the context' })}
  </article>`;
  document.querySelectorAll('.bank-prediction').forEach((input) => {
    input.addEventListener('input', () => {
      state.choices.bankPrediction[input.dataset.context] = input.value.trim();
      persist();
    });
  });
  bindStandardActions();
}

function contextToyResult(contextId, removedSet = new Set()) {
  const context = BANK_CONTEXTS[contextId];
  const importance = context.defaultImportance.map((value, index) => removedSet.has(index) ? 0 : value);
  const { vector, weights } = weightedContextVector(context.cueVectors, importance);
  return { vector, weights, distribution: candidateDistributionFromContext(vector, BANK_CANDIDATES) };
}

function promptWithCueButtons(contextId) {
  const context = BANK_CONTEXTS[contextId];
  let html = escapeHtml(context.text);
  context.cueWords.forEach((word, index) => {
    const removed = runtime.bankRemoved[contextId].has(index);
    const button = `<button class="context-word ${removed ? 'removed' : ''}" data-context="${contextId}" data-cue-index="${index}" type="button" aria-pressed="${removed}">${escapeHtml(word)}</button>`;
    html = html.replace(new RegExp(`\\b${word}\\b`, 'i'), button);
  });
  return html;
}

function renderC2BankCompare() {
  const river = contextToyResult('river', runtime.bankRemoved.river);
  const finance = contextToyResult('finance', runtime.bankRemoved.finance);
  root.innerHTML = `<article class="screen">
    ${screenHeader('Change earlier context and watch the distribution move', 'Click a cue word to erase or restore its contribution in the Teaching Model.')}
    <section class="grid-2">
      <div class="model-panel teaching stack">
        <h3><span class="model-badge teaching">Teaching Model</span> River context</h3>
        <div class="prompt-box">${promptWithCueButtons('river')}</div>
        ${probabilityBars(river.distribution.slice(0, 6), { scaleToMax: false, barClass: 'teaching' })}
      </div>
      <div class="model-panel teaching stack">
        <h3><span class="model-badge teaching">Teaching Model</span> Financial context</h3>
        <div class="prompt-box">${promptWithCueButtons('finance')}</div>
        ${probabilityBars(finance.distribution.slice(0, 6), { scaleToMax: false, barClass: 'teaching' })}
      </div>
    </section>
    <p class="note accuracy-note"><strong>Controlled comparison:</strong> The final phrase stays essentially the same. The earlier context changes the numerical expectations at the blank.</p>
    ${actions({ nextLabel: 'Pause before the attention math' })}
  </article>`;
  document.querySelectorAll('.context-word').forEach((button) => {
    button.addEventListener('click', () => {
      const set = runtime.bankRemoved[button.dataset.context];
      const index = Number(button.dataset.cueIndex);
      if (set.has(index)) set.delete(index); else set.add(index);
      render();
    });
  });
  bindStandardActions();
}

function renderC2Checkpoint2() {
  root.innerHTML = checkpointScreen('How can a computer represent “this earlier word matters more”?', [
    'Which cue words caused the largest changes when removed?',
    'Why is the effect numerical rather than a dictionary label attached to “bank”?',
    'How could weights totaling 1 represent different amounts of contribution?',
  ]);
  bindStandardActions();
}

function attentionState() {
  const contextId = state.choices.attention.context || 'river';
  const context = BANK_CONTEXTS[contextId];
  const importance = state.choices.attention.importance || [...context.defaultImportance];
  return { contextId, context, importance };
}

function renderC2Attention() {
  const { contextId, context, importance } = attentionState();
  const { vector, weights } = weightedContextVector(context.cueVectors, importance);
  const distribution = candidateDistributionFromContext(vector, BANK_CANDIDATES);
  const riverShare = vector[0] / Math.max(0.0001, vector[0] + vector[1]);
  const financeShare = 1 - riverShare;
  root.innerHTML = `<article class="screen">
    ${screenHeader('Attention as weighted contextual influence', 'This exact toy calculation is designed to explain the idea—not to reproduce every internal operation of a real transformer.')}
    <section class="model-panel teaching stack">
      <div class="split-row">
        <h3><span class="model-badge teaching">Teaching Model</span> Which context?</h3>
        <select id="attention-context" class="select-input" style="width:auto">
          <option value="river" ${contextId === 'river' ? 'selected' : ''}>River context</option>
          <option value="finance" ${contextId === 'finance' ? 'selected' : ''}>Financial context</option>
        </select>
      </div>
      <div class="prompt-box">${escapeHtml(context.text)}</div>
      <div class="attention-grid">
        ${context.cueWords.map((word, index) => `<div class="attention-row">
          <span class="attention-word">${escapeHtml(word)}</span>
          <input class="attention-slider" data-index="${index}" type="range" min="0" max="100" value="${importance[index]}">
          <span>${percent(weights[index], 1)}</span>
        </div>`).join('')}
      </div>
      <div class="context-meter" aria-label="Simplified contextual direction">
        <div class="context-river" style="width:${riverShare * 100}%">River ${percent(riverShare, 0)}</div>
        <div class="context-finance" style="width:${financeShare * 100}%">Finance ${percent(financeShare, 0)}</div>
      </div>
      <span class="equation">Contextual information = ${weights.map((weight, index) => `${round(weight, 2)}v<sub>${index + 1}</sub>`).join(' + ')}</span>
    </section>
    <section class="grid-2">
      <div class="card">
        <h3>What the weights mean</h3>
        <p>For this simplified calculation, each earlier word contributes a different share. The normalized weights always total 1.</p>
      </div>
      <div class="card">
        <h3>What the weights do not mean</h3>
        <p>They are not the real model’s thoughts. Real transformers use many heads and layers, plus other neural-network operations.</p>
      </div>
    </section>
    <section class="activity-panel">
      <h3>Resulting next-token distribution</h3>
      ${probabilityBars(distribution, { scaleToMax: false, barClass: 'teaching' })}
    </section>
    ${actions({ nextLabel: 'Test the context effect with a real model' })}
  </article>`;
  document.querySelector('#attention-context')?.addEventListener('change', (event) => {
    state.choices.attention.context = event.target.value;
    state.choices.attention.importance = [...BANK_CONTEXTS[event.target.value].defaultImportance];
    persist();
    render();
  });
  document.querySelectorAll('.attention-slider').forEach((slider) => {
    slider.addEventListener('input', () => {
      if (!state.choices.attention.importance) state.choices.attention.importance = [...context.defaultImportance];
      state.choices.attention.importance[Number(slider.dataset.index)] = Number(slider.value);
      persist();
      render();
    });
  });
  bindStandardActions();
}

function modelLoadingHtml(key) {
  const isLoading = runtime.loadingKey === key;
  const progress = Number(runtime.modelProgress.progress || 0);
  return `<div class="loading-box">
    <p>${isLoading ? escapeHtml(runtime.modelProgress.message || 'Loading…') : 'The first run downloads a quantized model. Later visits normally use the browser cache.'}</p>
    <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="loading-file">${escapeHtml(runtime.modelProgress.file || '')}</div>
  </div>`;
}

function realResultHtml(result, options = {}) {
  if (!result) return '';
  const candidates = options.limit ? result.candidates.slice(0, options.limit) : result.candidates;
  return `<div class="real-results">
    <div class="real-meta">
      <span class="meta-chip">${escapeHtml(result.modelId)}</span>
      <span class="meta-chip">${escapeHtml(result.device).toUpperCase()}</span>
      <span class="meta-chip">${escapeHtml(result.dtype)}</span>
      <span class="meta-chip">${result.inputTokenCount} input tokens</span>
      <span class="meta-chip">${Number(result.vocabularySize).toLocaleString()} vocabulary tokens</span>
    </div>
    ${options.showTokens ? `<div class="token-strip">${result.inputTokens.map((token) => `<span class="token-chip"><span>${escapeHtml(formatTokenForDisplay(token.text))}</span><span class="token-id">${token.id}</span></span>`).join('')}</div>` : ''}
    <div class="candidate-table-wrap"><table class="candidate-table">
      <thead><tr><th>Rank</th><th>Token</th><th>Logit</th><th>Native T=1</th><th>Sampling</th></tr></thead>
      <tbody>${candidates.map((candidate) => `<tr class="${candidate.selected ? 'selected-row' : ''}">
        <td>${candidate.rank}</td><td>${tokenHtml(candidate.token)}</td><td>${round(candidate.logit, 2)}</td><td>${percent(candidate.nativeProbability, 2)}</td><td>${percent(candidate.samplingProbability, 2)}</td>
      </tr>`).join('')}
      <tr><td>—</td><td>All other tokens</td><td>—</td><td>—</td><td>${percent(result.otherProbability, 2)}</td></tr>
      </tbody>
    </table></div>
    ${options.showSelected !== false ? `<p class="note real-note"><strong>Selected:</strong> ${tokenHtml(result.selected.token)} — rank ${result.selected.rank}, sampling probability ${percent(result.selected.samplingProbability, 2)}.</p>` : ''}
  </div>`;
}

async function runRealPrediction(key, prompt, options = {}) {
  runtime.loadingKey = key;
  runtime.realErrors[key] = null;
  runtime.modelState = 'loading';
  runtime.modelProgress = { progress: 0, file: '', message: 'Starting model…' };
  updateModelStatus();
  render();
  try {
    const result = await realModel.predict(prompt, options);
    runtime.realResults[key] = result;
    runtime.modelState = 'ready';
    state.choices.real.loadedOnce = true;
    persist();
    showToast('Real model prediction complete.', 'success');
    return result;
  } catch (error) {
    runtime.realErrors[key] = error.message;
    runtime.modelState = 'error';
    showToast(error.message, 'error');
    return null;
  } finally {
    runtime.loadingKey = null;
    updateModelStatus();
    render();
  }
}

function renderC2RealCompare() {
  const river = runtime.realResults.c2river;
  const finance = runtime.realResults.c2finance;
  const loading = runtime.loadingKey === 'c2river' || runtime.loadingKey === 'c2finance';
  root.innerHTML = `<article class="screen">
    ${screenHeader('Test the context effect with a real transformer', 'The probability shifts are authentic outputs from a small model running in this browser.')}
    <section class="model-panel real stack">
      <h3><span class="model-badge real">Real Browser Model</span> Matched context comparison</h3>
      ${!river || !finance ? `<div class="grid-2">
        <div class="card"><strong>River context</strong><p class="small">${escapeHtml(BANK_CONTEXTS.river.text)}</p></div>
        <div class="card"><strong>Financial context</strong><p class="small">${escapeHtml(BANK_CONTEXTS.finance.text)}</p></div>
      </div>
      ${modelLoadingHtml(loading ? runtime.loadingKey : 'c2compare')}
      <button id="run-real-compare" class="primary-button" type="button" ${loading ? 'disabled' : ''}>${loading ? 'Working…' : 'Run both real predictions'}</button>` : `
      <div class="grid-2">
        <div class="card"><h3>River context</h3>${probabilityBars(river.candidates.slice(0, 7).map((item) => ({ token: item.token, probability: item.nativeProbability })), { barClass: 'real' })}</div>
        <div class="card"><h3>Financial context</h3>${probabilityBars(finance.candidates.slice(0, 7).map((item) => ({ token: item.token, probability: item.nativeProbability })), { barClass: 'real' })}</div>
      </div>
      <p class="note real-note">Exact tokens and rankings may differ from the Teaching Model. The robust observation is that changing earlier context changes the genuine distribution.</p>`}
      ${runtime.realErrors.c2river || runtime.realErrors.c2finance ? `<p class="note warning-note">${escapeHtml(runtime.realErrors.c2river || runtime.realErrors.c2finance)} Use the Teaching Model results or the teacher laptop if needed.</p>` : ''}
    </section>
    ${actions({ nextLabel: 'Pause and name the evidence', nextDisabled: !river || !finance })}
  </article>`;
  document.querySelector('#run-real-compare')?.addEventListener('click', async () => {
    await runRealPrediction('c2river', REAL_GUIDED_PROMPTS.river, { temperature: 1, greedy: true, topN: 10 });
    if (runtime.realResults.c2river) await runRealPrediction('c2finance', REAL_GUIDED_PROMPTS.finance, { temperature: 1, greedy: true, topN: 10 });
  });
  bindStandardActions();
}

function renderC2Checkpoint3() {
  root.innerHTML = checkpointScreen('Explain context first, then attention', [
    'What changed in the real probability distributions?',
    'Why is the context eraser stronger evidence than merely highlighting a word?',
    'What does the weighted Teaching Model explain, and what does it intentionally simplify?',
  ]);
  bindStandardActions();
}

function renderC2Complete() {
  root.innerHTML = `<article class="screen">
    ${screenHeader('Complete the Class 2 goal', 'State the idea without treating attention as a human-like spotlight.')}
    <section class="complete-card">
      <h3>The Class 2 explanation</h3>
      <p>A transformer does not predict only from the last word. It builds context-sensitive numerical representations using relationships across the available sequence. Attention is one mathematical mechanism that lets different prior tokens contribute different amounts of information.</p>
    </section>
    <section class="grid-2">
      <div class="card"><h3>Good shorthand</h3><p>“Attention helps the model use relevant context.”</p></div>
      <div class="card"><h3>Important qualification</h3><p>Real transformers use many heads and layers. One weight display is not the model’s full reasoning.</p></div>
    </section>
    ${actions({ nextLabel: 'Finish Class 2 and open Class 3' })}
  </article>`;
  bindStandardActions();
}

function renderC3Goal() {
  const courseClass = CLASSES[2];
  root.innerHTML = goalScreen(courseClass, 'How can text and meaning become calculations a computer can perform?', `
    <section class="card">
      <h3>Return to your generated text</h3>
      <div class="prompt-box">${escapeHtml(savedBranchSummary())}</div>
      <p>So far, we have treated this as words and meaning. Today we reveal the numerical pipeline underneath it.</p>
    </section>`);
  bindStandardActions();
}

function illustrativeTokens(text) {
  const example = TOKEN_EXAMPLES.find((item) => item.text === text);
  return example?.illustration || wordTokenize(text);
}

function renderC3TokenReveal() {
  // Use a deliberately selected sentence so the first token reveal visibly differs
  // from whole-word segmentation before students inspect the authentic tokenizer.
  const text = TOKEN_EXAMPLES[0].text;
  const words = wordTokenize(text);
  const illustrative = runtime.tokenReveal ? illustrativeTokens(text) : [];
  root.innerHTML = `<article class="screen">
    ${screenHeader('The useful “next word” model becomes “next token”', 'The basic mechanism stays the same; the actual pieces are more flexible than words.')}
    <section class="activity-panel stack">
      <div class="split-row"><h3>What unit does the model receive?</h3><button id="toggle-token-reveal" class="primary-button" type="button">${runtime.tokenReveal ? 'Hide token view' : 'Reveal token view'}</button></div>
      <div class="token-strip">
        ${(runtime.tokenReveal ? illustrative : words).map((token, index) => `<span class="token-chip"><span>${escapeHtml(formatTokenForDisplay(token))}</span><span class="token-id">${runtime.tokenReveal ? `piece ${index + 1}` : 'word'}</span></span>`).join('')}
      </div>
      ${runtime.tokenReveal ? `<p class="note accuracy-note">This first reveal is illustrative. The next screen loads the actual tokenizer and shows the model’s real token IDs and boundaries.</p>` : '<p>We have used whole words because they make the core prediction loop easy to understand.</p>'}
    </section>
    <section class="grid-2">
      <div class="card"><h3>Useful first model</h3><p>An LLM predicts the next word.</p></div>
      <div class="card"><h3>Technically accurate model</h3><p>An LLM predicts the next token: a word, word piece, punctuation mark, space pattern, or control token.</p></div>
    </section>
    ${actions({ nextLabel: 'Inspect a real tokenizer' })}
  </article>`;
  document.querySelector('#toggle-token-reveal')?.addEventListener('click', () => {
    runtime.tokenReveal = !runtime.tokenReveal;
    render();
  });
  bindStandardActions();
}

async function runTokenizer(text) {
  runtime.tokenizerLoading = true;
  runtime.tokenizerResult = null;
  runtime.modelState = 'loading';
  runtime.modelProgress = { progress: 0, file: '', message: 'Loading tokenizer…' };
  updateModelStatus();
  render();
  try {
    const result = await realModel.tokenize(text);
    runtime.tokenizerResult = result;
    runtime.modelState = realModel.ready ? 'ready' : 'tokenizer';
    showToast('Tokenizer ready.', 'success');
  } catch (error) {
    runtime.modelState = 'error';
    showToast(error.message, 'error');
  } finally {
    runtime.tokenizerLoading = false;
    updateModelStatus();
    render();
  }
}

function renderC3Tokenizer() {
  const text = state.choices.tokenText || 'unbelievable';
  const result = runtime.tokenizerResult;
  root.innerHTML = `<article class="screen">
    ${screenHeader('Inspect a real tokenizer', 'The tokenizer is authentic and much smaller to load than the complete model.')}
    <section class="model-panel real stack">
      <h3><span class="model-badge real">Real Tokenizer</span> What does the model actually receive?</h3>
      <label class="field">Text to tokenize
        <textarea id="tokenizer-text" class="textarea">${escapeHtml(text)}</textarea>
      </label>
      <div class="choice-grid">
        ${TOKEN_EXAMPLES.map((example) => `<button class="choice-button tokenizer-example" data-text="${escapeHtml(example.text)}" type="button">${escapeHtml(example.label)}: ${escapeHtml(example.text)}</button>`).join('')}
      </div>
      ${runtime.tokenizerLoading ? modelLoadingHtml('tokenizer') : `<button id="run-tokenizer" class="primary-button" type="button">Tokenize this text</button>`}
      ${result ? `<div class="token-strip">${result.tokens.map((token) => `<span class="token-chip"><span>${escapeHtml(formatTokenForDisplay(token.text))}</span><span class="token-id">ID ${token.id}</span></span>`).join('')}</div>
        <p class="small muted">${result.tokenCount} tokens. Visible spaces are shown as ␠.</p>` : ''}
    </section>
    <p class="note">Token boundaries are model-specific. A different tokenizer may divide the same text differently.</p>
    ${actions({ nextLabel: 'Pause after the token surprise', nextDisabled: !result })}
  </article>`;
  document.querySelector('#tokenizer-text')?.addEventListener('input', (event) => {
    state.choices.tokenText = event.target.value;
    persist();
  });
  document.querySelectorAll('.tokenizer-example').forEach((button) => {
    button.addEventListener('click', () => {
      state.choices.tokenText = button.dataset.text;
      runtime.tokenizerResult = null;
      persist();
      render();
    });
  });
  document.querySelector('#run-tokenizer')?.addEventListener('click', () => runTokenizer(state.choices.tokenText));
  bindStandardActions();
}

function renderC3Checkpoint1() {
  root.innerHTML = checkpointScreen('Why use reusable token pieces?', [
    'Which examples became one token, and which split into several?',
    'Why would a finite vocabulary use pieces rather than contain every possible word and misspelling?',
    'What remains the same about generation even when a token is only part of a word?',
  ]);
  bindStandardActions();
}

function renderC3Vectors() {
  const matrix = runtime.vectorMatrix;
  root.innerHTML = `<article class="screen">
    ${screenHeader('Tokens become numerical vectors', 'A computer cannot directly calculate with definitions; it calculates with numbers arranged in vectors and matrices.')}
    <section class="activity-panel stack">
      <h3>A deliberately tiny representation</h3>
      <div class="matrix-wrap"><table class="matrix-table">
        <thead><tr><th>Token</th>${TOY_VECTOR_SEQUENCE.axes.map((axis) => `<th>${axis}</th>`).join('')}</tr></thead>
        <tbody>${TOY_VECTOR_SEQUENCE.tokens.map((token, rowIndex) => `<tr><th>${escapeHtml(token)}</th>${matrix[rowIndex].map((value, colIndex) => `<td>${round(value, 2)}${rowIndex === 1 && colIndex === 1 ? `<br><input id="vector-slider" type="range" min="0" max="1" step="0.01" value="${value}" aria-label="Change one toy vector value">` : ''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <p class="note accuracy-note">The three axes are intentionally unlabeled. Real learned dimensions usually do not correspond neatly to one human concept such as “animal” or “noun.”</p>
    </section>
    <section class="grid-3">
      <div class="card"><h3>Token ID</h3><p>Chooses a row from the learned embedding table.</p></div>
      <div class="card"><h3>Vector</h3><p>A list of numerical values used by the network.</p></div>
      <div class="card"><h3>Matrix</h3><p>The sequence becomes rows of vectors that can be processed together.</p></div>
    </section>
    ${actions({ nextLabel: 'See how the output layer creates scores' })}
  </article>`;
  document.querySelector('#vector-slider')?.addEventListener('input', (event) => {
    runtime.vectorMatrix[1][1] = Number(event.target.value);
    render();
  });
  bindStandardActions();
}

function toyLogits() {
  if (!state.choices.toyLogits) state.choices.toyLogits = TOY_LOGITS.map((item) => item.logit);
  return state.choices.toyLogits;
}

function renderLogitBars(logits) {
  const min = Math.min(...logits);
  const max = Math.max(...logits);
  const range = Math.max(0.001, max - min);
  return `<div class="probability-list">${TOY_LOGITS.map((item, index) => {
    const width = 12 + (logits[index] - min) / range * 88;
    return `<div class="probability-row"><div class="probability-label">${tokenHtml(item.token)}</div><div class="probability-track"><div class="probability-bar teaching" style="width:${width}%"></div></div><div class="probability-value">${round(logits[index], 2)}</div></div>`;
  }).join('')}</div>`;
}

function renderC3Logits() {
  const logits = toyLogits();
  const selected = runtime.softmaxSelected;
  root.innerHTML = `<article class="screen">
    ${screenHeader('The model gives every possible token a score', 'The output layer turns a context-sensitive vector into one logit for every vocabulary token.')}
    <section class="model-panel teaching stack">
      <h3><span class="model-badge teaching">Teaching Model</span> Context vector → output scores</h3>
      <span class="equation">z = W<sub>out</sub>h + b</span>
      ${renderLogitBars(logits)}
      <div class="grid-2">
        <label class="field">Candidate to adjust
          <select id="logit-token" class="select-input">${TOY_LOGITS.map((item, index) => `<option value="${index}" ${index === selected ? 'selected' : ''}>${escapeHtml(formatTokenForDisplay(item.token))}</option>`).join('')}</select>
        </label>
        <label class="range-field">Logit score: <strong>${round(logits[selected], 2)}</strong>
          <input id="logit-slider" type="range" min="-2" max="6" step="0.1" value="${logits[selected]}">
        </label>
      </div>
    </section>
    <section class="grid-3">
      <div class="card"><h3>Not a percentage</h3><p>A logit is an unnormalized model score.</p></div>
      <div class="card"><h3>Can be negative</h3><p>Only relative differences among all logits determine probability.</p></div>
      <div class="card"><h3>One per vocabulary token</h3><p>The real model scores tens of thousands of possibilities.</p></div>
    </section>
    ${actions({ nextLabel: 'Pause before SoftMax' })}
  </article>`;
  document.querySelector('#logit-token')?.addEventListener('change', (event) => {
    runtime.softmaxSelected = Number(event.target.value);
    render();
  });
  document.querySelector('#logit-slider')?.addEventListener('input', (event) => {
    state.choices.toyLogits[selected] = Number(event.target.value);
    persist();
    render();
  });
  bindStandardActions();
}

function renderC3Checkpoint2() {
  root.innerHTML = checkpointScreen('Why are logits not probabilities yet?', [
    'What does a larger logit tell us?',
    'Why can a logit be negative without being an impossible probability?',
    'Why must all possible next tokens compete for one total of 100%?',
  ]);
  bindStandardActions();
}

function renderC3Softmax() {
  const logits = toyLogits();
  const probabilities = stableSoftmax(logits, 1);
  const total = probabilities.reduce((sum, value) => sum + value, 0);
  const selected = runtime.softmaxSelected;
  root.innerHTML = `<article class="screen">
    ${screenHeader('SoftMax turns competing scores into one probability distribution', 'Change one logit and watch every probability respond.')}
    <section class="model-panel teaching stack">
      <h3><span class="model-badge teaching">Teaching Model</span> Logits → probabilities</h3>
      <span class="equation">P<sub>i</sub> = e<sup>zᵢ</sup> ÷ Σe<sup>zⱼ</sup></span>
      <div class="grid-2">
        <label class="field">Candidate to adjust
          <select id="softmax-token" class="select-input">${TOY_LOGITS.map((item, index) => `<option value="${index}" ${index === selected ? 'selected' : ''}>${escapeHtml(formatTokenForDisplay(item.token))}</option>`).join('')}</select>
        </label>
        <label class="range-field">Logit score: <strong>${round(logits[selected], 2)}</strong>
          <input id="softmax-slider" type="range" min="-2" max="6" step="0.1" value="${logits[selected]}">
        </label>
      </div>
      <div class="candidate-table-wrap"><table class="candidate-table">
        <thead><tr><th>Token</th><th>Logit z</th><th>e<sup>z</sup></th><th>Probability</th></tr></thead>
        <tbody>${TOY_LOGITS.map((item, index) => `<tr><td>${tokenHtml(item.token)}</td><td>${round(logits[index], 2)}</td><td>${round(Math.exp(logits[index]), 2)}</td><td>${percent(probabilities[index], 2)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><th>Total</th><th>—</th><th>—</th><th>${percent(total, 2)}</th></tr></tfoot>
      </table></div>
      ${probabilityBars(TOY_LOGITS.map((item, index) => ({ token: item.token, probability: probabilities[index] })), { barClass: 'teaching' })}
    </section>
    <p class="note accuracy-note">SoftMax normalizes scores. It does not check truth, correctness, or whether a sentence is safe.</p>
    ${actions({ nextLabel: 'Compare with a real model' })}
  </article>`;
  document.querySelector('#softmax-token')?.addEventListener('change', (event) => {
    runtime.softmaxSelected = Number(event.target.value);
    render();
  });
  document.querySelector('#softmax-slider')?.addEventListener('input', (event) => {
    state.choices.toyLogits[selected] = Number(event.target.value);
    persist();
    render();
  });
  bindStandardActions();
}

function renderC3RealProbabilities() {
  const key = 'c3prob';
  const result = runtime.realResults[key];
  const prompt = savedBranchSummary();
  root.innerHTML = `<article class="screen">
    ${screenHeader('Inspect authentic next-token probabilities', 'The real model calculates across its complete vocabulary; the table shows only the leading tokens plus the hidden remainder.')}
    <section class="model-panel real stack">
      <h3><span class="model-badge real">Real Browser Model</span> T = 1 distribution</h3>
      <div class="prompt-box">${escapeHtml(prompt)}</div>
      ${runtime.loadingKey === key ? modelLoadingHtml(key) : !result ? `<button id="run-c3-real" class="primary-button" type="button">Run the real model</button>` : realResultHtml(result, { showTokens: true, showSelected: false, limit: 10 })}
      ${runtime.realErrors[key] ? `<p class="note warning-note">${escapeHtml(runtime.realErrors[key])}</p>` : ''}
    </section>
    <p class="note real-note">These are the probabilities produced by this quantized browser model for this exact tokenized context. They are not probabilities that the continuation is true.</p>
    ${actions({ nextLabel: 'Pause and trace the numerical chain', nextDisabled: !result })}
  </article>`;
  document.querySelector('#run-c3-real')?.addEventListener('click', () => runRealPrediction(key, prompt, { temperature: 1, greedy: true, topN: 12 }));
  bindStandardActions();
}

function renderC3Checkpoint3() {
  root.innerHTML = checkpointScreen('Trace one link at a time', [
    'How did ordinary text become token IDs and vectors?',
    'What is the difference between a logit and a probability?',
    'Why does changing one logit change every SoftMax probability?',
    'What does “all other tokens” prevent us from misunderstanding?',
  ]);
  bindStandardActions();
}

function renderC3Complete() {
  root.innerHTML = `<article class="screen">
    ${screenHeader('Complete the Class 3 goal', 'Put the numerical stages in the correct order.')}
    <section class="complete-card">
      <h3>The Class 3 explanation</h3>
      <p>The tokenizer converts text into token IDs. Learned embedding vectors and transformer operations create context-sensitive numerical representations. The output layer gives every possible next token a logit. SoftMax converts the complete set of logits into probabilities totaling 100%.</p>
    </section>
    <div class="loop-diagram">
      ${['Text', 'Tokens', 'Vectors / matrix', 'Contextual representation', 'Logits', 'SoftMax', 'Probability distribution'].map((label) => `<div class="loop-node">${label}</div>`).join('')}
    </div>
    ${actions({ nextLabel: 'Finish Class 3 and open Class 4' })}
  </article>`;
  bindStandardActions();
}

function renderC4Goal() {
  const courseClass = CLASSES[3];
  root.innerHTML = goalScreen(courseClass, 'Once probabilities exist, how does one candidate become the next token?', `
    <section class="card">
      <h3>What is already fixed before today’s new idea?</h3>
      <p>The context and trained model have produced logits. SoftMax can turn them into a native T=1 distribution. Today we separate <strong>reshaping</strong> from <strong>selection</strong>.</p>
    </section>`);
  bindStandardActions();
}

function temperatureData() {
  const logits = toyLogits();
  const native = stableSoftmax(logits, 1);
  const greedy = state.choices.temperature === 'greedy';
  const temperature = greedy ? 1 : Number(state.choices.temperature || 1);
  const sampling = stableSoftmax(logits, greedy ? 0 : temperature);
  return {
    logits,
    native,
    sampling,
    greedy,
    temperature,
    items: TOY_LOGITS.map((item, index) => ({ token: item.token, nativeProbability: native[index], samplingProbability: sampling[index] })),
  };
}

function renderC4Temperature() {
  const data = temperatureData();
  root.innerHTML = `<article class="screen">
    ${screenHeader('Temperature reshapes the distribution', 'The logits remain fixed. No token has been selected yet.')}
    <section class="temperature-grid">
      <div class="model-panel teaching stack">
        <h3><span class="model-badge teaching">Teaching Model</span> Controls</h3>
        <label class="range-field">Temperature: <strong>${data.greedy ? 'Greedy' : round(data.temperature, 1)}</strong>
          <input id="temperature-slider" type="range" min="0.2" max="2.5" step="0.1" value="${data.temperature}" ${data.greedy ? 'disabled' : ''}>
        </label>
        <label class="checkbox-row"><input id="greedy-toggle" type="checkbox" ${data.greedy ? 'checked' : ''}><span>Greedy mode: always choose the highest logit</span></label>
        <div class="metric-grid" style="grid-template-columns:1fr">
          <div class="metric-card"><div class="metric-label">Underlying logits changed?</div><div class="metric-value">No</div></div>
          <div class="metric-card"><div class="metric-label">Distribution reshaped?</div><div class="metric-value">${data.greedy ? 'Replaced by top choice' : Math.abs(data.temperature - 1) < 0.001 ? 'No' : 'Yes'}</div></div>
          <div class="metric-card"><div class="metric-label">Token selected?</div><div class="metric-value">Not yet</div></div>
        </div>
      </div>
      <div class="activity-panel">
        <h3>Native probability versus sampling probability</h3>
        ${dualProbabilityBars(data.items)}
      </div>
    </section>
    <span class="equation">P<sub>i</sub>(T) = e<sup>zᵢ/T</sup> ÷ Σe<sup>zⱼ/T</sup></span>
    <p class="note">Low temperature concentrates probability on the leaders. High temperature makes lower-ranked candidates more competitive. It does not add knowledge or guarantee creativity.</p>
    ${actions({ nextLabel: 'Pause before any selection occurs' })}
  </article>`;
  document.querySelector('#temperature-slider')?.addEventListener('input', (event) => {
    state.choices.temperature = Number(event.target.value);
    persist();
    render();
  });
  document.querySelector('#greedy-toggle')?.addEventListener('change', (event) => {
    state.choices.temperature = event.target.checked ? 'greedy' : 1;
    persist();
    render();
  });
  bindStandardActions();
}

function renderC4Checkpoint1() {
  root.innerHTML = checkpointScreen('Has temperature selected anything yet?', [
    'What stayed fixed while the probability bars changed?',
    'Which candidates become more competitive as temperature rises?',
    'Why is Greedy a separate mode rather than ordinary division by T = 0?',
  ]);
  bindStandardActions();
}

function renderCumulative(items, probabilities, randomValue) {
  const cumulative = cumulativeDistribution(probabilities);
  const selected = sampleIndex(probabilities, randomValue);
  return `<div class="cumulative-line">
    ${items.map((item, index) => `<div class="interval" style="width:${probabilities[index] * 100}%"><span>${formatTokenForDisplay(item.token)}</span><span>${percent(probabilities[index], 0)}</span></div>`).join('')}
    <div class="random-marker" style="left:${randomValue * 100}%" data-label="r=${round(randomValue, 2)}"></div>
  </div>
  <p class="note"><strong>Selected:</strong> ${tokenHtml(items[selected].token)} because its cumulative interval is the first to reach or pass r.</p>
  <div class="candidate-table-wrap"><table class="candidate-table">
    <thead><tr><th>Token</th><th>Probability</th><th>Interval starts</th><th>Interval ends</th></tr></thead>
    <tbody>${items.map((item, index) => `<tr class="${index === selected ? 'selected-row' : ''}"><td>${tokenHtml(item.token)}</td><td>${percent(probabilities[index], 2)}</td><td>${round(cumulative[index].start, 3)}</td><td>${round(cumulative[index].end, 3)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function renderC4Sampling() {
  const data = temperatureData();
  const randomValue = Number(state.choices.randomValue ?? 0.62);
  root.innerHTML = `<article class="screen">
    ${screenHeader('Sampling uses a random value to select one interval', 'Hold r fixed while changing temperature to separate reshaping from selection.')}
    <section class="model-panel teaching stack">
      <h3><span class="model-badge teaching">Teaching Model</span> Cumulative probability line</h3>
      <div class="grid-2">
        <label class="range-field">Temperature: <strong>${data.greedy ? 'Greedy' : round(data.temperature, 1)}</strong>
          <input id="sampling-temperature" type="range" min="0.2" max="2.5" step="0.1" value="${data.temperature}" ${data.greedy ? 'disabled' : ''}>
        </label>
        <label class="range-field">Random value r: <strong>${round(randomValue, 2)}</strong>
          <input id="random-slider" type="range" min="0.001" max="0.999" step="0.001" value="${randomValue}" ${data.greedy ? 'disabled' : ''}>
        </label>
      </div>
      ${data.greedy ? `<p class="note">Greedy mode skips random sampling and chooses ${tokenHtml(TOY_LOGITS[data.sampling.indexOf(1)].token)}.</p>` : renderCumulative(TOY_LOGITS, data.sampling, randomValue)}
    </section>
    <section class="grid-2">
      <div class="card"><h3>Temperature</h3><p>Changes interval widths by reshaping the distribution.</p></div>
      <div class="card"><h3>Random value r</h3><p>Determines which interval is selected from that distribution.</p></div>
    </section>
    ${actions({ nextLabel: 'Pause after one token is selected' })}
  </article>`;
  document.querySelector('#sampling-temperature')?.addEventListener('input', (event) => {
    state.choices.temperature = Number(event.target.value);
    persist();
    render();
  });
  document.querySelector('#random-slider')?.addEventListener('input', (event) => {
    state.choices.randomValue = Number(event.target.value);
    persist();
    render();
  });
  bindStandardActions();
}

function renderC4Checkpoint2() {
  root.innerHTML = checkpointScreen('Why can a lower-ranked token be selected?', [
    'Does sampling a surprising token mean the probability distribution was wrong?',
    'What is the exact role of r?',
    'Which calculations become outdated as soon as the selected token is appended?',
  ]);
  bindStandardActions();
}

function nextToyDistribution(selectedToken) {
  const map = {
    ' water': [{ token: ' flowing', logit: 4.0 }, { token: ' nearby', logit: 3.1 }, { token: ' shimmered', logit: 2.6 }, { token: ' and', logit: 2.1 }, { token: '.', logit: 0.4 }],
    ' boat': [{ token: ' tied', logit: 4.1 }, { token: ' drifting', logit: 3.3 }, { token: ' near', logit: 2.7 }, { token: ' and', logit: 2.2 }, { token: '.', logit: 0.5 }],
    ' tree': [{ token: ' leaning', logit: 3.8 }, { token: ' beside', logit: 3.2 }, { token: ' covered', logit: 2.5 }, { token: ' and', logit: 2.1 }, { token: '.', logit: 0.6 }],
    ' teller': [{ token: ' smiling', logit: 4.0 }, { token: ' standing', logit: 3.3 }, { token: ' behind', logit: 3.0 }, { token: ' who', logit: 2.4 }, { token: '.', logit: 0.3 }],
    ' mortgage': [{ token: ' officer', logit: 4.2 }, { token: ' application', logit: 3.4 }, { token: ' desk', logit: 2.8 }, { token: ' sign', logit: 2.0 }, { token: '.', logit: 0.2 }],
  };
  return map[selectedToken] || map[' water'];
}

function renderC4Append() {
  const data = temperatureData();
  const selectedIndex = data.greedy ? data.sampling.indexOf(1) : sampleIndex(data.sampling, Number(state.choices.randomValue));
  const selectedToken = TOY_LOGITS[selectedIndex].token;
  const next = nextToyDistribution(selectedToken);
  const nextProbabilities = stableSoftmax(next.map((item) => item.logit), 1);
  root.innerHTML = `<article class="screen">
    ${screenHeader('Append the token and recalculate everything', 'The distribution from the previous step no longer applies to the new context.')}
    <section class="activity-panel stack">
      <div class="prompt-box">At the bank, the traveler saw a <span class="model-badge selected">${tokenHtml(selectedToken)}</span></div>
      <div class="loop-diagram">
        ${['Token appended', 'Retokenize / extend IDs', 'Process new context', 'New logits', 'New probabilities', 'New selection'].map((label, index) => `<div class="loop-node" style="${runtime.c4AppendRecalculated || index === 0 ? 'border-color:var(--accent);background:var(--accent-soft)' : ''}">${label}</div>`).join('')}
      </div>
      <button id="recalculate-button" class="primary-button" type="button">${runtime.c4AppendRecalculated ? 'Recalculated' : 'Recalculate the next step'}</button>
      ${runtime.c4AppendRecalculated ? `<div><h3>New T=1 distribution after ${tokenHtml(selectedToken)}</h3>${probabilityBars(next.map((item, index) => ({ token: item.token, probability: nextProbabilities[index] })), { barClass: 'teaching' })}</div>` : ''}
    </section>
    <p class="note">The previous probabilities answered an old question. After appending the token, the model must answer a new question using a new context.</p>
    ${actions({ nextLabel: 'Begin the real-model investigations', nextDisabled: !runtime.c4AppendRecalculated })}
  </article>`;
  document.querySelector('#recalculate-button')?.addEventListener('click', () => {
    runtime.c4AppendRecalculated = true;
    render();
  });
  bindStandardActions();
}

function renderC4RealContext() {
  const river = runtime.realResults.c4river;
  const finance = runtime.realResults.c4finance;
  const loading = ['c4river', 'c4finance'].includes(runtime.loadingKey);
  root.innerHTML = `<article class="screen">
    ${screenHeader('Guided experiment 1: change earlier context', 'Predict the direction of change before running the real model.')}
    <section class="model-panel real stack">
      <h3><span class="model-badge real">Real Browser Model</span> Same ending, different earlier evidence</h3>
      <div class="grid-2"><div class="card"><strong>River</strong><p class="small">${escapeHtml(REAL_GUIDED_PROMPTS.river)}</p></div><div class="card"><strong>Finance</strong><p class="small">${escapeHtml(REAL_GUIDED_PROMPTS.finance)}</p></div></div>
      ${!river || !finance ? `${modelLoadingHtml(loading ? runtime.loadingKey : 'c4context')}<button id="run-c4-context" class="primary-button" type="button" ${loading ? 'disabled' : ''}>Run the controlled comparison</button>` : `<div class="grid-2"><div class="card"><h3>River top tokens</h3>${probabilityBars(river.candidates.slice(0, 6).map((item) => ({ token: item.token, probability: item.nativeProbability })), { barClass: 'real' })}</div><div class="card"><h3>Finance top tokens</h3>${probabilityBars(finance.candidates.slice(0, 6).map((item) => ({ token: item.token, probability: item.nativeProbability })), { barClass: 'real' })}</div></div>`}
    </section>
    <p class="note">Question to answer: How did the changed context alter the distribution—not merely the final selected token?</p>
    ${actions({ nextLabel: 'Guided experiment 2: branch', nextDisabled: !river || !finance })}
  </article>`;
  document.querySelector('#run-c4-context')?.addEventListener('click', async () => {
    await runRealPrediction('c4river', REAL_GUIDED_PROMPTS.river, { temperature: 1, greedy: true, topN: 10 });
    if (runtime.realResults.c4river) await runRealPrediction('c4finance', REAL_GUIDED_PROMPTS.finance, { temperature: 1, greedy: true, topN: 10 });
  });
  bindStandardActions();
}

function renderC4RealBranch() {
  const base = runtime.realResults.c4branchBase;
  const branchA = runtime.realResults.c4branchA;
  const branchB = runtime.realResults.c4branchB;
  const loading = runtime.loadingKey?.startsWith('c4branch');
  const selected = runtime.branchSelected;
  root.innerHTML = `<article class="screen">
    ${screenHeader('Guided experiment 2: branch from two real candidates', 'One selected token becomes the new context and redirects every later probability.')}
    <section class="model-panel real stack">
      <h3><span class="model-badge real">Real Browser Model</span> ${escapeHtml(REAL_GUIDED_PROMPTS.branch)}</h3>
      ${!base ? `${modelLoadingHtml('c4branchBase')}<button id="run-branch-base" class="primary-button" type="button" ${loading ? 'disabled' : ''}>Reveal the candidate tokens</button>` : `
        <p>Select two different candidates:</p>
        <div class="choice-grid">${base.candidates.slice(0, 8).map((candidate) => `<button class="token-choice real-branch-token ${selected.some((item) => item.id === candidate.id) ? 'selected' : ''}" data-id="${candidate.id}" type="button">${tokenHtml(candidate.token)} <span class="small">${percent(candidate.nativeProbability, 1)}</span></button>`).join('')}</div>
        <button id="run-both-branches" class="primary-button" type="button" ${selected.length !== 2 || loading ? 'disabled' : ''}>Continue both branches one step</button>
        ${branchA && branchB ? `<div class="grid-2"><div class="card"><h3>Branch A: ${tokenHtml(selected[0]?.token)}</h3>${probabilityBars(branchA.candidates.slice(0, 5).map((item) => ({ token: item.token, probability: item.nativeProbability })), { barClass: 'real' })}</div><div class="card"><h3>Branch B: ${tokenHtml(selected[1]?.token)}</h3>${probabilityBars(branchB.candidates.slice(0, 5).map((item) => ({ token: item.token, probability: item.nativeProbability })), { barClass: 'real' })}</div></div>` : ''}
      `}
    </section>
    <p class="note">Question to answer: Where did the branches first diverge, and why did the old distribution become irrelevant?</p>
    ${actions({ nextLabel: 'Guided experiment 3: temperature', nextDisabled: !branchA || !branchB })}
  </article>`;
  document.querySelector('#run-branch-base')?.addEventListener('click', () => runRealPrediction('c4branchBase', REAL_GUIDED_PROMPTS.branch, { temperature: 1, greedy: true, topN: 12 }));
  document.querySelectorAll('.real-branch-token').forEach((button) => {
    button.addEventListener('click', () => {
      const candidate = base.candidates.find((item) => item.id === Number(button.dataset.id));
      const existing = runtime.branchSelected.findIndex((item) => item.id === candidate.id);
      if (existing >= 0) runtime.branchSelected.splice(existing, 1);
      else if (runtime.branchSelected.length < 2) runtime.branchSelected.push(candidate);
      runtime.realResults.c4branchA = null;
      runtime.realResults.c4branchB = null;
      render();
    });
  });
  document.querySelector('#run-both-branches')?.addEventListener('click', async () => {
    const [a, b] = runtime.branchSelected;
    await runRealPrediction('c4branchA', REAL_GUIDED_PROMPTS.branch + a.token, { temperature: 1, greedy: true, topN: 8 });
    if (runtime.realResults.c4branchA) await runRealPrediction('c4branchB', REAL_GUIDED_PROMPTS.branch + b.token, { temperature: 1, greedy: true, topN: 8 });
  });
  bindStandardActions();
}

function renderC4RealTemperature() {
  const low = runtime.realResults.c4tempLow;
  const high = runtime.realResults.c4tempHigh;
  const loading = runtime.loadingKey?.startsWith('c4temp');
  const r = 0.62;
  root.innerHTML = `<article class="screen">
    ${screenHeader('Guided experiment 3: hold the prompt and r constant', 'Only temperature changes between the two runs.')}
    <section class="model-panel real stack">
      <h3><span class="model-badge real">Real Browser Model</span> ${escapeHtml(REAL_GUIDED_PROMPTS.temperature)}</h3>
      <div class="metric-grid">
        <div class="metric-card"><div class="metric-label">Prompt</div><div class="metric-value">Same</div></div>
        <div class="metric-card"><div class="metric-label">Random r</div><div class="metric-value">${r}</div></div>
        <div class="metric-card"><div class="metric-label">Changed variable</div><div class="metric-value">Temperature</div></div>
      </div>
      ${!low || !high ? `${modelLoadingHtml(loading ? runtime.loadingKey : 'c4temperature')}<button id="run-real-temperature" class="primary-button" type="button" ${loading ? 'disabled' : ''}>Run T = 0.5 and T = 1.8</button>` : `<div class="grid-2">
        <div class="card"><h3>T = 0.5</h3>${probabilityBars(low.candidates.slice(0, 7).map((item) => ({ token: item.token, probability: item.samplingProbability })), { barClass: 'real' })}<p><strong>Selected:</strong> ${tokenHtml(low.selected.token)}</p></div>
        <div class="card"><h3>T = 1.8</h3>${probabilityBars(high.candidates.slice(0, 7).map((item) => ({ token: item.token, probability: item.samplingProbability })), { barClass: 'real' })}<p><strong>Selected:</strong> ${tokenHtml(high.selected.token)}</p></div>
      </div>`}
    </section>
    <p class="note">Question to answer: Did temperature alter the logits, the sampling probabilities, the selection, or all three?</p>
    ${actions({ nextLabel: 'Pause before open exploration', nextDisabled: !low || !high })}
  </article>`;
  document.querySelector('#run-real-temperature')?.addEventListener('click', async () => {
    await runRealPrediction('c4tempLow', REAL_GUIDED_PROMPTS.temperature, { temperature: 0.5, greedy: false, randomValue: r, topN: 10 });
    if (runtime.realResults.c4tempLow) await runRealPrediction('c4tempHigh', REAL_GUIDED_PROMPTS.temperature, { temperature: 1.8, greedy: false, randomValue: r, topN: 10 });
  });
  bindStandardActions();
}

function renderC4Checkpoint3() {
  root.innerHTML = checkpointScreen('Explain the entire loop before opening the lab', [
    'Which stage used the earlier context?',
    'Which stage produced logits, and which stage converted them to probabilities?',
    'What did temperature change?',
    'What did sampling change?',
    'Why must the entire prediction be recalculated after one token is appended?',
  ]);
  bindStandardActions();
}

function openLabResultHtml(result) {
  if (!result) return '';
  return `${realResultHtml(result, { showTokens: true, showSelected: true, limit: 12 })}
    <div class="choice-grid">
      <button id="append-sampled" class="primary-button" type="button">Append sampled token ${tokenHtml(result.selected.token)}</button>
      ${result.candidates.slice(0, 6).map((candidate) => `<button class="token-choice append-candidate" data-id="${candidate.id}" type="button">Append ${tokenHtml(candidate.token)}</button>`).join('')}
    </div>`;
}

function renderC4OpenLab() {
  const result = runtime.realResults.openLab;
  const loading = runtime.loadingKey === 'openLab';
  root.innerHTML = `<article class="screen">
    ${screenHeader('Open laboratory: investigate one variable at a time', 'State what you are changing and what you predict before running the model.')}
    <section class="model-panel real stack">
      <h3><span class="model-badge real">Real Browser Model</span> Next-token microscope</h3>
      <label class="field">Prompt or generated text so far
        <textarea id="open-lab-prompt" class="textarea">${escapeHtml(runtime.openLabPrompt)}</textarea>
      </label>
      <div class="grid-3">
        <label class="range-field">Temperature: <strong>${round(runtime.openLabTemperature, 1)}</strong>
          <input id="open-lab-temperature" type="range" min="0.2" max="2.5" step="0.1" value="${runtime.openLabTemperature}" ${runtime.openLabGreedy ? 'disabled' : ''}>
        </label>
        <label class="range-field">Random r: <strong>${round(runtime.openLabRandom, 2)}</strong>
          <input id="open-lab-r" type="range" min="0.001" max="0.999" step="0.001" value="${runtime.openLabRandom}" ${runtime.openLabGreedy ? 'disabled' : ''}>
        </label>
        <label class="checkbox-row"><input id="open-lab-greedy" type="checkbox" ${runtime.openLabGreedy ? 'checked' : ''}><span>Greedy mode</span></label>
      </div>
      <div class="inline-row">
        <button id="new-r" class="secondary-button" type="button">Generate a new r</button>
        <button id="run-open-lab" class="primary-button" type="button" ${loading ? 'disabled' : ''}>${loading ? 'Working…' : 'Calculate the next token'}</button>
        <button id="reset-open-lab" class="ghost-button" type="button">Reset prompt</button>
      </div>
      ${loading ? modelLoadingHtml('openLab') : openLabResultHtml(result)}
    </section>
    <p class="note warning-note"><strong>Investigation rule:</strong> Change one variable, predict its effect, run the model, and explain the result. Random prompt play hides causation.</p>
    ${runtime.openLabHistory.length ? `<section class="card"><h3>Generation history</h3><ol>${runtime.openLabHistory.map((item) => `<li>${escapeHtml(item.prompt)} <strong>+ ${formatTokenForDisplay(item.token)}</strong></li>`).join('')}</ol></section>` : ''}
    ${actions({ nextLabel: 'Complete the four-class explanation', nextDisabled: !result })}
  </article>`;
  document.querySelector('#open-lab-prompt')?.addEventListener('input', (event) => {
    runtime.openLabPrompt = event.target.value;
    state.choices.real.lastPrompt = runtime.openLabPrompt;
    persist();
  });
  document.querySelector('#open-lab-temperature')?.addEventListener('input', (event) => {
    runtime.openLabTemperature = Number(event.target.value);
    render();
  });
  document.querySelector('#open-lab-r')?.addEventListener('input', (event) => {
    runtime.openLabRandom = Number(event.target.value);
    render();
  });
  document.querySelector('#open-lab-greedy')?.addEventListener('change', (event) => {
    runtime.openLabGreedy = event.target.checked;
    render();
  });
  document.querySelector('#new-r')?.addEventListener('click', () => {
    runtime.openLabRandom = Math.random();
    render();
  });
  document.querySelector('#reset-open-lab')?.addEventListener('click', () => {
    runtime.openLabPrompt = REAL_GUIDED_PROMPTS.openDefault;
    runtime.realResults.openLab = null;
    runtime.openLabHistory = [];
    render();
  });
  document.querySelector('#run-open-lab')?.addEventListener('click', () => runRealPrediction('openLab', runtime.openLabPrompt, {
    temperature: runtime.openLabTemperature,
    randomValue: runtime.openLabRandom,
    greedy: runtime.openLabGreedy,
    topN: 12,
  }));
  document.querySelector('#append-sampled')?.addEventListener('click', () => appendOpenLabToken(result.selected.token));
  document.querySelectorAll('.append-candidate').forEach((button) => {
    button.addEventListener('click', () => {
      const candidate = result.candidates.find((item) => item.id === Number(button.dataset.id));
      appendOpenLabToken(candidate.token);
    });
  });
  bindStandardActions();
}

function appendOpenLabToken(token) {
  runtime.openLabHistory.push({ prompt: runtime.openLabPrompt, token });
  runtime.openLabPrompt += token;
  state.choices.real.lastPrompt = runtime.openLabPrompt;
  runtime.realResults.openLab = null;
  persist();
  render();
}

function renderC4Complete() {
  root.innerHTML = `<article class="screen">
    ${screenHeader('Complete the whole LLM generation loop', 'This is the durable mental model the four classes were designed to build.')}
    <section class="complete-card">
      <h3>A complete honors-level explanation</h3>
      <p>During pretraining, an LLM repeatedly predicts the next token and uses error, backpropagation, and gradient descent to adjust its weights. During use, text is tokenized and converted into numerical vectors. Transformer layers use context and attention, along with other neural-network operations, to create context-sensitive representations. The model gives every possible next token a logit. Temperature and SoftMax create the distribution used for selection. Sampling or greedy decoding chooses one token, the token is appended, and the process repeats.</p>
    </section>
    ${loopDiagram()}
    <section class="grid-2">
      <div class="card"><h3>Probability is not truth</h3><p>A high probability means a token fits this model’s learned patterns in this context. It does not verify the claim.</p></div>
      <div class="card"><h3>“Next-token predictor” is simple but powerful</h3><p>Repeated context-sensitive predictions can produce long, structured, useful—and sometimes incorrect—responses.</p></div>
    </section>
    ${actions({ nextLabel: 'Return to Class 1', nextId: 'restart-tour-button', extra: '<button id="open-lab-again" class="secondary-button" type="button">Return to Open Lab</button>' })}
  </article>`;
  document.querySelector('#previous-button')?.addEventListener('click', goPrevious);
  document.querySelector('#restart-tour-button')?.addEventListener('click', () => navigate('c1-goal'));
  document.querySelector('#open-lab-again')?.addEventListener('click', () => navigate('c4-open-lab'));
  if (!state.completedClasses.includes(4)) state.completedClasses.push(4);
  markStepComplete(state, currentStep);
  persist();
}

const RENDERERS = {
  'c1-goal': renderC1Goal,
  'c1-predict': renderC1Predict,
  'c1-checkpoint-1': renderC1Checkpoint1,
  'c1-corpus': renderC1Corpus,
  'c1-training-bridge': renderC1TrainingBridge,
  'c1-checkpoint-2': renderC1Checkpoint2,
  'c1-branch': renderC1Branch,
  'c1-checkpoint-3': renderC1Checkpoint3,
  'c1-complete': renderC1Complete,
  'c2-goal': renderC2Goal,
  'c2-predictors': renderC2Predictors,
  'c2-checkpoint-1': renderC2Checkpoint1,
  'c2-bank-predict': renderC2BankPredict,
  'c2-bank-compare': renderC2BankCompare,
  'c2-checkpoint-2': renderC2Checkpoint2,
  'c2-attention': renderC2Attention,
  'c2-real-compare': renderC2RealCompare,
  'c2-checkpoint-3': renderC2Checkpoint3,
  'c2-complete': renderC2Complete,
  'c3-goal': renderC3Goal,
  'c3-token-reveal': renderC3TokenReveal,
  'c3-tokenizer': renderC3Tokenizer,
  'c3-checkpoint-1': renderC3Checkpoint1,
  'c3-vectors': renderC3Vectors,
  'c3-logits': renderC3Logits,
  'c3-checkpoint-2': renderC3Checkpoint2,
  'c3-softmax': renderC3Softmax,
  'c3-real-probabilities': renderC3RealProbabilities,
  'c3-checkpoint-3': renderC3Checkpoint3,
  'c3-complete': renderC3Complete,
  'c4-goal': renderC4Goal,
  'c4-temperature': renderC4Temperature,
  'c4-checkpoint-1': renderC4Checkpoint1,
  'c4-sampling': renderC4Sampling,
  'c4-checkpoint-2': renderC4Checkpoint2,
  'c4-append': renderC4Append,
  'c4-real-context': renderC4RealContext,
  'c4-real-branch': renderC4RealBranch,
  'c4-real-temperature': renderC4RealTemperature,
  'c4-checkpoint-3': renderC4Checkpoint3,
  'c4-open-lab': renderC4OpenLab,
  'c4-complete': renderC4Complete,
};

function renderTeacherNavigation() {
  teacherNavContent.innerHTML = CLASSES.map((courseClass) => `<section class="stack" style="margin-bottom:18px">
    <h3>Class ${courseClass.id}: ${escapeHtml(courseClass.title)}</h3>
    <div class="teacher-step-list">${courseClass.steps.map((step, index) => `<button class="teacher-step-button" data-step="${step}" type="button"><span>${index + 1}. ${escapeHtml(STEP_TITLES[step])}</span><span>${state.completedSteps.includes(step) ? '✓' : ''}</span></button>`).join('')}</div>
  </section>`).join('');
  teacherNavContent.querySelectorAll('[data-step]').forEach((button) => {
    button.addEventListener('click', () => {
      teacherDialog.close();
      navigate(button.dataset.step);
    });
  });
}

function renderHelp() {
  const terms = [
    ['Pretraining', 'Learning by repeatedly predicting known next tokens and adjusting weights when predictions are poor.'],
    ['Token', 'A unit the model processes and generates; it may be a word, word piece, punctuation, space pattern, or control token.'],
    ['Vector', 'An ordered list of numbers used to represent and process a token.'],
    ['Attention', 'A mathematical mechanism that lets token representations incorporate different amounts of information from other positions.'],
    ['Logit', 'An unnormalized model score for one possible next token.'],
    ['SoftMax', 'A function that converts competing logits into probabilities totaling 100%.'],
    ['Temperature', 'A value that sharpens or flattens the probability distribution used for sampling.'],
    ['Greedy decoding', 'Selecting the highest-scoring token without random sampling.'],
    ['Sampling', 'Selecting one token according to the probability distribution.'],
  ];
  helpContent.innerHTML = `<section class="stack">
    <div class="glossary-grid">${terms.map(([term, definition]) => `<div class="glossary-term">${term}</div><div>${definition}</div>`).join('')}</div>
    <h3>Misconceptions the app is designed to prevent</h3>
    <div class="grid-2">${MISCONCEPTIONS.map(([wrong, better]) => `<div class="card"><strong>Not quite:</strong> ${escapeHtml(wrong)}<br><strong>Better:</strong> ${escapeHtml(better)}</div>`).join('')}</div>
    <p class="note real-note">Privacy: the real model runs locally after model files download from Hugging Face. Student text is not sent to a paid inference API. Progress is stored only in this browser’s local storage.</p>
  </section>`;
}

function updateModelStatus() {
  modelStatusButton.classList.remove('loading', 'ready', 'error');
  if (runtime.modelState === 'loading') {
    modelStatusButton.classList.add('loading');
    modelStatusLabel.textContent = 'Model loading';
  } else if (runtime.modelState === 'ready' || realModel.ready) {
    modelStatusButton.classList.add('ready');
    modelStatusLabel.textContent = realModel.modelInfo ? `${realModel.modelInfo.device.toUpperCase()} model ready` : 'Real model ready';
  } else if (runtime.modelState === 'tokenizer') {
    modelStatusButton.classList.add('ready');
    modelStatusLabel.textContent = 'Tokenizer ready';
  } else if (runtime.modelState === 'error') {
    modelStatusButton.classList.add('error');
    modelStatusLabel.textContent = 'Model needs attention';
  } else {
    modelStatusLabel.textContent = 'Real model not loaded';
  }
  renderModelDialog();
}

function renderModelDialog() {
  const info = realModel.modelInfo;
  modelDialogContent.innerHTML = `<div class="stack">
    <p><strong>Model:</strong> ${escapeHtml(info?.modelId || REAL_MODEL_CONFIG.modelId)}</p>
    <p><strong>Status:</strong> ${escapeHtml(runtime.modelProgress.message || realModel.status || 'Not loaded')}</p>
    ${info ? `<p><strong>Device:</strong> ${escapeHtml(info.device).toUpperCase()} &nbsp; <strong>Quantization:</strong> ${escapeHtml(info.dtype)}</p>` : ''}
    <div class="progress-track"><div class="progress-fill" style="width:${runtime.modelProgress.progress || 0}%"></div></div>
    <p class="loading-file">${escapeHtml(runtime.modelProgress.file || '')}</p>
    <p class="note real-note">No OpenAI, Gemini, or other paid API is used. The first load downloads a quantized open model. Inference then runs in this browser.</p>
    <p class="small muted">WebGPU is preferred. A CPU/WASM fallback may be much slower on Chromebooks.</p>
  </div>`;
  document.querySelector('#load-model-dialog-button').disabled = runtime.modelState === 'loading';
}

function render() {
  renderNavigation();
  renderProcessMap();
  const renderer = RENDERERS[currentStep] || renderC1Goal;
  renderer();
  updateModelStatus();
}

realModel.addEventListener('progress', (event) => {
  runtime.modelProgress.progress = Number(event.detail.progress || 0);
  runtime.modelProgress.file = event.detail.file || '';
  if (event.detail.status) runtime.modelProgress.message = event.detail.status;
  updateModelStatus();
  const fill = document.querySelector('.progress-fill');
  if (fill) fill.style.width = `${runtime.modelProgress.progress}%`;
  const file = document.querySelector('.loading-file');
  if (file) file.textContent = runtime.modelProgress.file;
});
realModel.addEventListener('status', (event) => {
  runtime.modelProgress.message = event.detail.message;
  updateModelStatus();
});
realModel.addEventListener('model-ready', () => {
  runtime.modelState = 'ready';
  updateModelStatus();
});
realModel.addEventListener('tokenizer-ready', () => {
  if (!realModel.ready) runtime.modelState = 'tokenizer';
  updateModelStatus();
});
realModel.addEventListener('warning', (event) => showToast(event.detail.message, 'error'));
realModel.addEventListener('error', (event) => {
  runtime.modelState = 'error';
  showToast(event.detail.message, 'error');
  updateModelStatus();
});

document.querySelector('#teacher-nav-button').addEventListener('click', () => {
  renderTeacherNavigation();
  teacherDialog.showModal();
});
document.querySelector('#help-button').addEventListener('click', () => {
  renderHelp();
  helpDialog.showModal();
});
modelStatusButton.addEventListener('click', () => {
  renderModelDialog();
  modelDialog.showModal();
});
document.querySelector('#load-model-dialog-button').addEventListener('click', () => {
  runtime.modelState = 'loading';
  runtime.modelProgress.message = 'Starting model download…';
  realModel.initModel();
  updateModelStatus();
});
document.querySelector('#reset-progress-button').addEventListener('click', () => {
  const confirmed = window.confirm('Reset all Next Token Lab progress and choices stored in this browser?');
  if (!confirmed) return;
  state = resetState();
  currentStep = 'c1-goal';
  runtime.realResults = {};
  runtime.openLabHistory = [];
  teacherDialog.close();
  render();
  showToast('Local progress reset.', 'success');
});

window.addEventListener('beforeunload', () => persist());

render();
