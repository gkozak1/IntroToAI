/*
 * teaching-model.js
 * Transparent, deliberately simplified math for The Next Token Lab.
 * Everything here is exact and inspectable so students can verify counts,
 * scores, and probabilities by hand. Nothing here talks to a real model.
 */

/* ----------------------------------------------------------------------
 * Word-level tokenizing for the visible corpus (Class 1 / Class 2)
 * -------------------------------------------------------------------- */

// Split a sentence into lowercase word tokens, keeping sentence-ending
// punctuation out of the counts. Simple and predictable on purpose.
export function tokenizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[".,!?;:()]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/* ----------------------------------------------------------------------
 * N-gram counting over the visible corpus
 * order 1 = frequency only (ignores context)
 * order 2 = match last 1 word
 * order 3 = match last 2 words
 * -------------------------------------------------------------------- */

// Return { total, counts: [{token, count, p}], matched, contextUsed }
export function predictFromCorpus(corpusSentences, contextText, order = 2) {
  const contextWords = tokenizeWords(contextText);
  const k = order - 1; // number of preceding words to match

  const following = new Map(); // nextWord -> count
  let total = 0;
  let matched = 0;

  // The slice of context we are matching on (last k words)
  const key = contextWords.slice(contextWords.length - k);
  const contextUsed = k === 0 ? "(none — frequency only)" : key.join(" ");

  for (const sentence of corpusSentences) {
    const words = tokenizeWords(sentence);
    // Slide a window; at each position i, look at words[i..i+k-1] as the
    // preceding context and words[i+k] as the following token.
    for (let i = 0; i + k < words.length; i++) {
      let isMatch = true;
      for (let j = 0; j < k; j++) {
        if (words[i + j] !== key[j]) {
          isMatch = false;
          break;
        }
      }
      if (!isMatch) continue;
      matched++;
      const next = words[i + k];
      following.set(next, (following.get(next) || 0) + 1);
      total++;
    }
  }

  const counts = [...following.entries()]
    .map(([token, count]) => ({ token, count, p: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token));

  return { total, matched, counts, contextUsed, order };
}

/* ----------------------------------------------------------------------
 * Numerically stable softmax and temperature
 * -------------------------------------------------------------------- */

// Stable softmax: subtract the max logit before exponentiating (TECH-01).
export function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Temperature softmax computed from ORIGINAL logits (TECH-03).
// T must be > 0 here; greedy is handled separately (C4-01).
export function temperatureSoftmax(logits, T) {
  if (!(T > 0)) throw new Error("Temperature must be > 0; use greedy() for T→0.");
  return softmax(logits.map((z) => z / T));
}

// Greedy selection: argmax of the logits, no division by temperature.
export function greedyIndex(logits) {
  let best = 0;
  for (let i = 1; i < logits.length; i++) if (logits[i] > logits[best]) best = i;
  return best;
}

/* ----------------------------------------------------------------------
 * Cumulative intervals + sampling with r  (Class 4)
 * -------------------------------------------------------------------- */

// Given probabilities in DISPLAY order, return cumulative interval boundaries.
// Each entry: { index, p, start, end }.  Intervals tile [0,1).
export function cumulativeIntervals(probs) {
  const out = [];
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    const start = acc;
    acc += probs[i];
    out.push({ index: i, p: probs[i], start, end: acc });
  }
  // Guard against float drift so the last interval reaches 1.
  if (out.length) out[out.length - 1].end = 1;
  return out;
}

// Choose the first interval that reaches or passes r (spec §7 core formula).
export function sampleWithR(probs, r) {
  const intervals = cumulativeIntervals(probs);
  for (const iv of intervals) {
    if (r < iv.end) return { index: iv.index, interval: iv, r };
  }
  const last = intervals[intervals.length - 1];
  return { index: last.index, interval: last, r };
}

/* ----------------------------------------------------------------------
 * Toy output layer: logits = Wout · h + b   (Class 3)
 * -------------------------------------------------------------------- */

// h: contextual vector (length d). W: array of rows (each length d). b: length = #candidates.
export function outputLogits(W, h, b) {
  return W.map((row, i) => {
    const dot = row.reduce((acc, w, j) => acc + w * h[j], 0);
    return dot + (b[i] || 0);
  });
}

/* ----------------------------------------------------------------------
 * Toy weighted attention: contextual vector = Σ (weight_i · value_i)  (Class 2/3)
 * -------------------------------------------------------------------- */

// weights: array summing to ~1. values: array of vectors (each length d).
export function weightedContext(weights, values) {
  const d = values[0].length;
  const out = new Array(d).fill(0);
  values.forEach((v, i) => {
    for (let j = 0; j < d; j++) out[j] += weights[i] * v[j];
  });
  return out;
}

// Renormalize a set of weights so they sum to 1 (used by the attention sliders).
export function normalizeWeights(weights) {
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum === 0) return weights.map(() => 1 / weights.length);
  return weights.map((w) => Math.max(0, w) / sum);
}

/* ----------------------------------------------------------------------
 * Teaching tokenizer (Class 3)
 * A deterministic, inspectable subword-ish tokenizer for demonstration.
 * NOT the real model's tokenizer — the Real Browser Model provides that.
 * Splits on spaces/punctuation, makes whitespace visible, and applies a
 * small dictionary of "surprising" subword splits so students see that a
 * token may be a word, a fragment, punctuation, or a space.
 * -------------------------------------------------------------------- */

const SUBWORD_SPLITS = {
  unbelievable: ["un", "believ", "able"],
  tokenization: ["token", "ization"],
  transformer: ["trans", "former"],
  probabilities: ["probabil", "ities"],
  strawberry: ["straw", "berry"],
  antidisestablishment: ["anti", "dis", "establish", "ment"],
  hamburger: ["ham", "burger"],
  supercalifragilistic: ["super", "cali", "fragil", "istic"],
  cheeseburger: ["cheese", "burger"],
};

let _tokIdCounter = 100;
const _tokIdCache = new Map();
function idFor(str) {
  if (!_tokIdCache.has(str)) _tokIdCache.set(str, _tokIdCounter++);
  return _tokIdCache.get(str);
}

// Returns array of { raw, visible, id, kind }.
// kind ∈ 'word' | 'fragment' | 'punct' | 'space' | 'newline'
export function teachingTokenize(text) {
  const tokens = [];
  // Split but keep the delimiters (spaces, newlines, punctuation).
  const parts = text.split(/(\s+|[.,!?;:()"'\-])/).filter((p) => p !== "");
  for (const part of parts) {
    if (part === "") continue;
    if (/^\n+$/.test(part)) {
      tokens.push({ raw: part, visible: "⏎", id: idFor("\\n"), kind: "newline" });
    } else if (/^\s+$/.test(part)) {
      tokens.push({ raw: part, visible: "␣", id: idFor("space"), kind: "space" });
    } else if (/^[.,!?;:()"'\-]$/.test(part)) {
      tokens.push({ raw: part, visible: part, id: idFor(part), kind: "punct" });
    } else {
      const lower = part.toLowerCase();
      if (SUBWORD_SPLITS[lower]) {
        SUBWORD_SPLITS[lower].forEach((frag) => {
          tokens.push({ raw: frag, visible: frag, id: idFor(frag), kind: "fragment" });
        });
      } else {
        tokens.push({ raw: part, visible: part, id: idFor(lower), kind: "word" });
      }
    }
  }
  return tokens;
}

/* ----------------------------------------------------------------------
 * Formatting helpers
 * -------------------------------------------------------------------- */

export function pct(p, digits = 1) {
  return (p * 100).toFixed(digits) + "%";
}

export function round(n, digits = 2) {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
