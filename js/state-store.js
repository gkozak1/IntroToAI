/*
 * state-store.js
 * Anonymous, same-device progress. Best-effort by design: if storage is
 * missing or blocked, the app keeps working from an in-memory copy and
 * shows a subtle notice. No identity, no cloud, no large arrays. (STATE-01..03)
 */

const KEY = "nextTokenLab.v1.state";
const SCHEMA_VERSION = 1;

function freshState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    currentClass: 1,
    currentStep: "1.0",
    completedCheckpoints: {}, // id -> true
    class1: { predictions: [], corpusEdits: null, branches: [] },
    class2: { contextPrediction: null, contextEdit: null },
    class3: { tokenExample: null, logitExperiment: null },
    class4: { temperatureTrials: [] },
    lab: { lastSession: null },
  };
}

let memory = freshState();
let usingMemoryOnly = false;

function storageAvailable() {
  try {
    const t = "__ntl_probe__";
    localStorage.setItem(t, "1");
    localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
}

// Shallow-validate loaded state; never trust the shape blindly (STATE-01).
function validate(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (obj.schemaVersion !== SCHEMA_VERSION) return false; // future: migrate
  const base = freshState();
  for (const k of Object.keys(base)) if (!(k in obj)) return false;
  return true;
}

export function load() {
  if (!storageAvailable()) {
    usingMemoryOnly = true;
    memory = freshState();
    return memory;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      memory = freshState();
      return memory;
    }
    const parsed = JSON.parse(raw);
    if (validate(parsed)) {
      memory = parsed;
    } else {
      memory = freshState(); // corrupt or old schema -> curated default (STATE-01)
    }
  } catch {
    usingMemoryOnly = true;
    memory = freshState();
  }
  return memory;
}

export function getState() {
  return memory;
}

// Save after meaningful actions only (not every slider tick).
export function save() {
  if (usingMemoryOnly) return { ok: false, reason: "memory-only" };
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
    return { ok: true };
  } catch {
    usingMemoryOnly = true;
    return { ok: false, reason: "write-failed" };
  }
}

// Convenience: mutate then save.
export function update(mutator) {
  mutator(memory);
  return save();
}

export function setLocation(classN, stepId) {
  memory.currentClass = classN;
  memory.currentStep = stepId;
  save();
}

export function completeCheckpoint(id) {
  memory.completedCheckpoints[id] = true;
  save();
}

export function resetClass(classN) {
  const base = freshState();
  memory["class" + classN] = base["class" + classN];
  // clear checkpoints for that class (ids start with "<n>.")
  for (const id of Object.keys(memory.completedCheckpoints)) {
    if (id.startsWith(classN + ".")) delete memory.completedCheckpoints[id];
  }
  save();
}

export function resetAll() {
  memory = freshState();
  if (!usingMemoryOnly) {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }
  save();
  return memory;
}

export function isMemoryOnly() {
  return usingMemoryOnly;
}
