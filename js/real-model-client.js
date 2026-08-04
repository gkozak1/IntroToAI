/*
 * real-model-client.js
 * Main-thread client for the Real Browser Model worker. Turns the
 * message protocol into promises and forwards progress/status events.
 * The worker is created lazily so no download happens until a student
 * asks to load the model (spec §9.5: "Model not yet needed").
 */

import { sampleWithR } from "./teaching-model.js";

export class RealModelClient {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.loading = false;
    this.meta = null;
    this._id = 0;
    this._pending = new Map(); // id -> {resolve, reject}
    this.onProgress = null; // (p) => {}
    this.onStatus = null; // (s) => {}
  }

  webgpuAvailable() {
    return !!(typeof navigator !== "undefined" && navigator.gpu);
  }

  _spawn() {
    if (this.worker) return;
    this.worker = new Worker(new URL("./model-worker.js", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (e) => this._handle(e.data);
    this.worker.onerror = (err) => {
      // Surface a construction/runtime worker error to any pending init.
      for (const [, p] of this._pending) p.reject(new Error(err.message || "Worker error"));
      this._pending.clear();
      this.loading = false;
    };
  }

  _handle(msg) {
    const { type, payload, id } = msg;
    if (type === "progress") { this.onProgress && this.onProgress(payload); return; }
    if (type === "status") { this.onStatus && this.onStatus(payload); return; }

    const pend = id != null ? this._pending.get(id) : null;
    if (type === "ready") {
      this.ready = true; this.loading = false; this.meta = payload;
      if (pend) { pend.resolve(payload); this._pending.delete(id); }
      return;
    }
    if (type === "error") {
      this.loading = false;
      if (pend) { pend.reject(new Error(payload.message)); this._pending.delete(id); }
      else this.onStatus && this.onStatus({ phase: "error", message: payload.message });
      return;
    }
    if (pend) { pend.resolve(payload); this._pending.delete(id); }
  }

  _request(type, payload) {
    this._spawn();
    const id = ++this._id;
    return new Promise((resolve, reject) => {
      this._pending.set(id, { resolve, reject });
      this.worker.postMessage({ type, payload, id });
    });
  }

  async initialize(opts = {}) {
    if (this.ready) return this.meta;
    this.loading = true;
    const meta = await this._request("initialize", opts);
    return meta;
  }

  tokenize(text) {
    return this._request("tokenize", { text });
  }

  predictNext(text, temperature = 1, topN = 12) {
    return this._request("predictNext", { text, temperature, topN });
  }

  // Sampling is deterministic given probs + r, so we do it on the main
  // thread using the shared teaching-model helper (single source of truth).
  sample(top, r, useSampling = true) {
    const probs = top.map((t) => (useSampling ? t.samplingP : t.nativeP));
    // Normalize across the visible top set for the interval demo only;
    // the "other mass" is shown separately and never folded in.
    const sum = probs.reduce((a, b) => a + b, 0) || 1;
    const norm = probs.map((p) => p / sum);
    const res = sampleWithR(norm, r);
    return { chosen: top[res.index], interval: res.interval, r, normalized: norm };
  }

  dispose() {
    if (!this.worker) return Promise.resolve();
    const p = this._request("dispose", {});
    return p.finally(() => {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
      this.meta = null;
    });
  }
}
