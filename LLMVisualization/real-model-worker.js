import {
  AutoTokenizer,
  AutoModelForCausalLM,
  env,
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';

// Models are downloaded from the Hugging Face Hub and cached by the browser.
env.allowLocalModels = false;
env.useBrowserCache = true;

let tokenizer = null;
let model = null;
let currentModelId = null;
let currentDevice = null;
let currentDtype = null;

function post(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

function progressCallback(progress) {
  const status = progress?.status || 'loading';
  post('progress', {
    status,
    file: progress?.file || '',
    loaded: Number(progress?.loaded || 0),
    total: Number(progress?.total || 0),
    progress: Number(progress?.progress || 0),
  });
}

async function ensureTokenizer(modelId) {
  if (tokenizer && currentModelId === modelId) return;
  post('status', { message: 'Loading tokenizer…' });
  tokenizer = await AutoTokenizer.from_pretrained(modelId, { progress_callback: progressCallback });
  currentModelId = modelId;
  post('tokenizer-ready', { modelId });
}

async function loadModel({ modelId, fallbackModelId, dtype = 'q4', preferWebGPU = true }) {
  if (model && currentModelId === modelId) {
    post('model-ready', { modelId, device: currentDevice, dtype: currentDtype, reused: true });
    return;
  }

  const modelCandidates = [modelId, fallbackModelId].filter(Boolean);
  const deviceCandidates = preferWebGPU && self.navigator?.gpu ? ['webgpu', 'wasm'] : ['wasm'];
  let lastError = null;

  for (const candidateModel of modelCandidates) {
    await ensureTokenizer(candidateModel);
    for (const device of deviceCandidates) {
      try {
        post('status', { message: `Loading ${candidateModel} on ${device.toUpperCase()}…` });
        model = await AutoModelForCausalLM.from_pretrained(candidateModel, {
          dtype,
          device,
          progress_callback: progressCallback,
        });
        currentModelId = candidateModel;
        currentDevice = device;
        currentDtype = dtype;
        post('model-ready', { modelId: candidateModel, device, dtype, reused: false });
        return;
      } catch (error) {
        lastError = error;
        post('warning', {
          message: `${candidateModel} could not load on ${device.toUpperCase()}.`,
          detail: error?.message || String(error),
        });
        if (model?.dispose) {
          try { await model.dispose(); } catch { /* ignore */ }
        }
        model = null;
      }
    }
  }

  throw lastError || new Error('No browser model could be loaded.');
}

function idsFromInputs(inputs) {
  const data = inputs.input_ids?.data || [];
  return Array.from(data, (value) => Number(value));
}

function incrementalTokenPieces(ids) {
  const pieces = [];
  let previous = '';
  for (let i = 0; i < ids.length; i += 1) {
    const prefix = tokenizer.decode(ids.slice(0, i + 1), {
      skip_special_tokens: false,
      clean_up_tokenization_spaces: false,
    });
    let piece = prefix.startsWith(previous) ? prefix.slice(previous.length) : tokenizer.decode([ids[i]], {
      skip_special_tokens: false,
      clean_up_tokenization_spaces: false,
    });
    if (piece === '') piece = tokenizer.decode([ids[i]], { skip_special_tokens: false });
    pieces.push({ id: ids[i], text: piece });
    previous = prefix;
  }
  return pieces;
}

function getLastLogits(logitsTensor) {
  const dims = logitsTensor.dims;
  if (!Array.isArray(dims) || dims.length < 3) throw new Error('Unexpected logits tensor shape.');
  const sequenceLength = dims[dims.length - 2];
  const vocabularySize = dims[dims.length - 1];
  const start = (sequenceLength - 1) * vocabularySize;
  return {
    data: logitsTensor.data.subarray(start, start + vocabularySize),
    vocabularySize,
    sequenceLength,
  };
}

function softmax(logits, temperature = 1) {
  const size = logits.length;
  const probabilities = new Float64Array(size);
  if (temperature <= 0) {
    let best = 0;
    for (let i = 1; i < size; i += 1) if (logits[i] > logits[best]) best = i;
    probabilities[best] = 1;
    return probabilities;
  }

  let max = -Infinity;
  for (let i = 0; i < size; i += 1) {
    const scaled = logits[i] / temperature;
    if (scaled > max) max = scaled;
  }

  let sum = 0;
  for (let i = 0; i < size; i += 1) {
    const value = Math.exp(logits[i] / temperature - max);
    probabilities[i] = value;
    sum += value;
  }
  for (let i = 0; i < size; i += 1) probabilities[i] /= sum;
  return probabilities;
}

function topIndices(probabilities, count) {
  const top = [];
  for (let i = 0; i < probabilities.length; i += 1) {
    const probability = probabilities[i];
    if (top.length < count || probability > top[top.length - 1].probability) {
      let insertAt = top.findIndex((item) => probability > item.probability);
      if (insertAt === -1) insertAt = top.length;
      top.splice(insertAt, 0, { id: i, probability });
      if (top.length > count) top.pop();
    }
  }
  return top;
}

function sampledIndex(probabilities, randomValue) {
  let cumulative = 0;
  const r = Math.min(0.999999999999, Math.max(0, Number(randomValue)));
  for (let i = 0; i < probabilities.length; i += 1) {
    cumulative += probabilities[i];
    if (r <= cumulative) return i;
  }
  return probabilities.length - 1;
}

function greedyIndex(logits) {
  let index = 0;
  for (let i = 1; i < logits.length; i += 1) if (logits[i] > logits[index]) index = i;
  return index;
}

function decodeToken(id) {
  return tokenizer.decode([id], {
    skip_special_tokens: false,
    clean_up_tokenization_spaces: false,
  });
}

async function tokenizeText({ requestId, modelId, text }) {
  await ensureTokenizer(modelId);
  const inputs = await tokenizer(text, { add_special_tokens: true });
  const ids = idsFromInputs(inputs);
  post('tokenized', {
    requestId,
    modelId: currentModelId,
    tokenCount: ids.length,
    tokens: incrementalTokenPieces(ids),
  });
}

async function predictNext({
  requestId,
  modelId,
  fallbackModelId,
  dtype,
  preferWebGPU,
  text,
  temperature = 1,
  topN = 12,
  randomValue = Math.random(),
  greedy = false,
}) {
  await loadModel({ modelId, fallbackModelId, dtype, preferWebGPU });
  post('status', { message: 'Calculating the next-token distribution…' });

  const inputs = await tokenizer(text, { add_special_tokens: true });
  const ids = idsFromInputs(inputs);
  const output = await model(inputs);
  const { data: logits, vocabularySize, sequenceLength } = getLastLogits(output.logits);
  const nativeProbabilities = softmax(logits, 1);
  const samplingProbabilities = greedy ? softmax(logits, 0) : softmax(logits, temperature);
  const top = topIndices(samplingProbabilities, Math.max(1, Math.min(30, topN)));
  const selectedId = greedy ? greedyIndex(logits) : sampledIndex(samplingProbabilities, randomValue);
  const selectedProbability = samplingProbabilities[selectedId];
  let selectedRank = 1;
  for (let i = 0; i < samplingProbabilities.length; i += 1) {
    if (samplingProbabilities[i] > selectedProbability) selectedRank += 1;
  }

  let topMass = 0;
  const candidates = top.map(({ id, probability }, index) => {
    topMass += probability;
    return {
      rank: index + 1,
      id,
      token: decodeToken(id),
      logit: Number(logits[id]),
      nativeProbability: Number(nativeProbabilities[id]),
      samplingProbability: Number(probability),
      selected: id === selectedId,
    };
  });

  post('prediction', {
    requestId,
    modelId: currentModelId,
    device: currentDevice,
    dtype: currentDtype,
    inputTokenCount: ids.length,
    vocabularySize,
    sequenceLength,
    inputTokens: incrementalTokenPieces(ids),
    temperature: greedy ? null : Number(temperature),
    greedy,
    randomValue: Number(randomValue),
    candidates,
    otherProbability: Math.max(0, 1 - topMass),
    selected: {
      id: selectedId,
      token: decodeToken(selectedId),
      rank: selectedRank,
      logit: Number(logits[selectedId]),
      nativeProbability: Number(nativeProbabilities[selectedId]),
      samplingProbability: Number(selectedProbability),
    },
  });
}

self.addEventListener('message', async (event) => {
  const message = event.data || {};
  try {
    if (message.type === 'init-tokenizer') {
      await ensureTokenizer(message.modelId);
      return;
    }
    if (message.type === 'init-model') {
      await loadModel(message);
      return;
    }
    if (message.type === 'tokenize') {
      await tokenizeText(message);
      return;
    }
    if (message.type === 'predict') {
      await predictNext(message);
      return;
    }
    if (message.type === 'dispose') {
      if (model?.dispose) await model.dispose();
      model = null;
      post('disposed');
    }
  } catch (error) {
    post('error', {
      requestId: message.requestId,
      message: error?.message || String(error),
      stack: error?.stack || '',
    });
  }
});
