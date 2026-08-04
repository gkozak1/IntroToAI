import { REAL_MODEL_CONFIG } from './data.js';

export class RealModelClient extends EventTarget {
  constructor() {
    super();
    this.worker = null;
    this.pending = new Map();
    this.sequence = 0;
    this.ready = false;
    this.tokenizerReady = false;
    this.status = 'Not loaded';
    this.modelInfo = null;
  }

  ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker('./real-model-worker.js', { type: 'module' });
    this.worker.addEventListener('message', (event) => this.handleMessage(event.data || {}));
    this.worker.addEventListener('error', (event) => {
      this.dispatch('error', { message: event.message || 'The model worker stopped unexpectedly.' });
    });
  }

  dispatch(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }

  handleMessage(message) {
    if (message.type === 'progress') {
      this.dispatch('progress', message);
      return;
    }
    if (message.type === 'status') {
      this.status = message.message;
      this.dispatch('status', message);
      return;
    }
    if (message.type === 'warning') {
      this.dispatch('warning', message);
      return;
    }
    if (message.type === 'tokenizer-ready') {
      this.tokenizerReady = true;
      this.dispatch('tokenizer-ready', message);
      return;
    }
    if (message.type === 'model-ready') {
      this.ready = true;
      this.modelInfo = message;
      this.dispatch('model-ready', message);
      return;
    }
    if (message.type === 'error') {
      const pending = this.pending.get(message.requestId);
      if (pending) {
        pending.reject(new Error(message.message));
        this.pending.delete(message.requestId);
      }
      this.dispatch('error', message);
      return;
    }
    if (message.requestId && this.pending.has(message.requestId)) {
      const pending = this.pending.get(message.requestId);
      pending.resolve(message);
      this.pending.delete(message.requestId);
    }
  }

  request(type, payload = {}) {
    this.ensureWorker();
    const requestId = `request-${Date.now()}-${++this.sequence}`;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({ type, requestId, ...payload });
    });
  }

  initTokenizer() {
    this.ensureWorker();
    this.worker.postMessage({ type: 'init-tokenizer', modelId: REAL_MODEL_CONFIG.modelId });
  }

  initModel() {
    this.ensureWorker();
    this.worker.postMessage({
      type: 'init-model',
      modelId: REAL_MODEL_CONFIG.modelId,
      fallbackModelId: REAL_MODEL_CONFIG.fallbackModelId,
      dtype: REAL_MODEL_CONFIG.dtype,
      preferWebGPU: true,
    });
  }

  tokenize(text) {
    return this.request('tokenize', { modelId: REAL_MODEL_CONFIG.modelId, text });
  }

  predict(text, options = {}) {
    return this.request('predict', {
      modelId: REAL_MODEL_CONFIG.modelId,
      fallbackModelId: REAL_MODEL_CONFIG.fallbackModelId,
      dtype: REAL_MODEL_CONFIG.dtype,
      preferWebGPU: true,
      text,
      temperature: options.temperature ?? 1,
      topN: options.topN ?? REAL_MODEL_CONFIG.topN,
      randomValue: options.randomValue ?? Math.random(),
      greedy: options.greedy ?? false,
    });
  }

  dispose() {
    if (this.worker) this.worker.postMessage({ type: 'dispose' });
  }
}
