/*
 * model-worker.js
 * The Real Browser Model runs here, off the main UI thread (TECH-05).
 * It uses Hugging Face Transformers.js with ONNX weights and WebGPU when
 * available. This is a genuine small causal LM — NOT a frontier model.
 *
 * IMPORTANT (spec §6.2, §11.3): the exact model + dtype is a benchmark
 * decision for real school Chromebooks. Change MODEL_ID / DTYPE below
 * after Phase-2 device testing. Defaults are the smaller of the two
 * candidates named in the spec.
 */

const TRANSFORMERS_URL =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2";

// --- Benchmark-tunable defaults (spec §11.3) --------------------------
const DEFAULT_MODEL_ID = "HuggingFaceTB/SmolLM2-360M-Instruct";
const DEFAULT_DTYPE = "q4"; // quantized for Chromebook memory
// ---------------------------------------------------------------------

let AutoTokenizer, AutoModelForCausalLM, env;
let tokenizer = null;
let model = null;
let modelMeta = null;

function post(type, payload, id) {
  self.postMessage({ type, payload, id });
}

// Numerically stable softmax over a Float32Array/Array (TECH-01).
function softmaxStable(arr, T = 1) {
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const z = arr[i] / T;
    if (z > max) max = z;
  }
  let sum = 0;
  const out = new Float64Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const e = Math.exp(arr[i] / T - max);
    out[i] = e;
    sum += e;
  }
  for (let i = 0; i < arr.length; i++) out[i] /= sum;
  return out;
}

// Make raw token strings readable: show the leading-space marker as ␣, etc.
function visibleToken(str) {
  if (str === "\n") return "⏎";
  return str
    .replace(/\u0120/g, "␣") // GPT-style space marker
    .replace(/\u2581/g, "␣") // SentencePiece space marker
    .replace(/ /g, "␣")
    .replace(/\n/g, "⏎");
}

async function ensureLibrary() {
  if (AutoTokenizer) return;
  const mod = await import(TRANSFORMERS_URL);
  AutoTokenizer = mod.AutoTokenizer;
  AutoModelForCausalLM = mod.AutoModelForCausalLM;
  env = mod.env;
  // Allow remote model download; do not require a local file server.
  env.allowLocalModels = false;
}

async function initialize(payload, id) {
  const modelId = payload?.modelId || DEFAULT_MODEL_ID;
  const dtype = payload?.dtype || DEFAULT_DTYPE;
  let device = payload?.device || "auto";

  try {
    await ensureLibrary();

    // Resolve device: prefer WebGPU when present, else wasm CPU path.
    const hasWebGPU = !!(self.navigator && self.navigator.gpu);
    if (device === "auto") device = hasWebGPU ? "webgpu" : "wasm";
    if (device === "webgpu" && !hasWebGPU) device = "wasm";

    const progress_callback = (p) => post("progress", p, id);

    post("status", { phase: "loading-tokenizer", modelId, device, dtype }, id);
    tokenizer = await AutoTokenizer.from_pretrained(modelId, { progress_callback });

    post("status", { phase: "loading-model", modelId, device, dtype }, id);
    model = await AutoModelForCausalLM.from_pretrained(modelId, {
      dtype,
      device,
      progress_callback,
    });

    modelMeta = { modelId, dtype, device: model?.device || device };
    post("ready", modelMeta, id);
  } catch (err) {
    post("error", { message: String(err && err.message || err), where: "initialize" }, id);
  }
}

async function tokenize(payload, id) {
  try {
    const text = payload.text ?? "";
    const enc = await tokenizer(text, { add_special_tokens: false });
    const ids = Array.from(enc.input_ids.data).map(Number);
    const rawStrings = ids.map((tid) => tokenizer.decode([tid]));
    const tokens = ids.map((tid, i) => ({
      id: tid,
      raw: rawStrings[i],
      visible: visibleToken(rawStrings[i]),
    }));
    post("tokenized", { tokens }, id);
  } catch (err) {
    post("error", { message: String(err && err.message || err), where: "tokenize" }, id);
  }
}

async function predictNext(payload, id) {
  try {
    const text = payload.text ?? "";
    const temperature = payload.temperature ?? 1;
    const topN = payload.topN ?? 12;

    const t0 = performance.now();
    const inputs = await tokenizer(text, { add_special_tokens: false });
    const output = await model(inputs);
    const logitsT = output.logits; // [1, seq, vocab]
    const seqLen = logitsT.dims[1];
    const vocab = logitsT.dims[2];
    const flat = logitsT.data; // Float32Array length seq*vocab
    const offset = (seqLen - 1) * vocab;
    const last = flat.subarray ? flat.subarray(offset, offset + vocab)
                               : Array.prototype.slice.call(flat, offset, offset + vocab);

    // Native probabilities over the FULL vocabulary first (TECH-02).
    const nativeProbs = softmaxStable(last, 1);
    // Temperature-adjusted from the ORIGINAL logits (TECH-03).
    const sampProbs = temperature === 1 ? nativeProbs : softmaxStable(last, temperature);

    // Rank by native probability and take top N.
    const idx = Array.from({ length: vocab }, (_, i) => i);
    idx.sort((a, b) => nativeProbs[b] - nativeProbs[a]);
    const top = [];
    let topMass = 0;
    for (let r = 0; r < Math.min(topN, vocab); r++) {
      const tid = idx[r];
      const raw = tokenizer.decode([tid]);
      top.push({
        rank: r + 1,
        id: tid,
        raw,
        visible: visibleToken(raw),
        logit: last[tid],
        nativeP: nativeProbs[tid],
        samplingP: sampProbs[tid],
      });
      topMass += nativeProbs[tid];
    }
    const otherMass = Math.max(0, 1 - topMass); // never renormalize (C3-05)

    const timingMs = Math.round(performance.now() - t0);
    post("prediction", { top, otherMass, temperature, vocab, timingMs }, id);

    if (logitsT.dispose) logitsT.dispose();
  } catch (err) {
    post("error", { message: String(err && err.message || err), where: "predictNext" }, id);
  }
}

function dispose(_payload, id) {
  try {
    if (model && model.dispose) model.dispose();
  } catch { /* ignore */ }
  model = null;
  tokenizer = null;
  modelMeta = null;
  post("disposed", {}, id);
}

self.onmessage = (e) => {
  const { type, payload, id } = e.data || {};
  switch (type) {
    case "initialize": return initialize(payload, id);
    case "tokenize": return tokenize(payload, id);
    case "predictNext": return predictNext(payload, id);
    case "dispose": return dispose(payload, id);
    default:
      post("error", { message: "Unknown request: " + type }, id);
  }
};
