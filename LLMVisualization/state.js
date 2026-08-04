import { APP_VERSION, STATE_KEY } from './data.js';

const DEFAULT_STATE = {
  version: APP_VERSION,
  currentClass: 1,
  currentStep: 'c1-goal',
  completedSteps: [],
  completedClasses: [],
  choices: {
    firstPredictions: ['', '', ''],
    corpusActive: {},
    customCorpus: [],
    branchA: [],
    branchB: [],
    bankPrediction: { river: '', finance: '' },
    attention: { context: 'river', importance: null },
    tokenText: 'unbelievable',
    toyLogits: null,
    temperature: 1,
    randomValue: 0.62,
    real: {
      loadedOnce: false,
      lastPrompt: '',
      branchTokens: [],
    },
  },
  settings: {
    reducedMotion: false,
    teacherMode: false,
  },
  updatedAt: null,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeDeep(target, source) {
  if (!source || typeof source !== 'object') return target;
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      target[key] = [...value];
    } else if (value && typeof value === 'object') {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      mergeDeep(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

export function loadState() {
  const base = clone(DEFAULT_STATE);
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return base;
    return mergeDeep(base, parsed);
  } catch (error) {
    console.warn('Next Token Lab could not load saved state.', error);
    return base;
  }
}

export function saveState(state) {
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('Next Token Lab could not save state.', error);
    return false;
  }
}

export function resetState() {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch (error) {
    console.warn('Next Token Lab could not clear saved state.', error);
  }
  return clone(DEFAULT_STATE);
}

export function markStepComplete(state, stepId) {
  if (!state.completedSteps.includes(stepId)) state.completedSteps.push(stepId);
  return state;
}

export function getDefaultState() {
  return clone(DEFAULT_STATE);
}
