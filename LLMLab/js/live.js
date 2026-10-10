/* LLMLab — GPT-2 for any sentence.
   The app ships with only a small pack (the stored sentences). The model itself (63 chunks, same files and browser cache as the
   Next-Token Explorer / LLMVisualization) is downloaded quietly in idle time, and the session is only started when a tab needs it. */
'use strict';
(() => {
  const ORT_VERSION = '1.25.0-dev.20260327-722743c0e2';
  const ORT_JS = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.min.js`;
  const ORT_WASM = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
  const SOURCES = ['https://raw.githubusercontent.com/poloclub/transformer-explainer/main/static/model-v2/gpt2.onnx.part', 'https://poloclub.github.io/transformer-explainer/model-v2/gpt2.onnx.part'];
  const CHUNKS = 63, CACHE = 'gpt2-next-token-explorer-te-model-v2';
  let session = null, starting = null, chain = Promise.resolve(), cacheObj = undefined, src = 0, prefetching = null;
  const have = new Set(), warmP = {};
  const state = { phase: 'idle', progress: 0 };
  const subs = [];
  const set = (phase, progress) => { state.phase = phase; if (progress != null) state.progress = progress; subs.forEach((f) => f(state)); };

  async function cache() {
    if (cacheObj !== undefined) return cacheObj;
    try { cacheObj = typeof caches === 'undefined' ? null : await caches.open(CACHE); } catch (e) { cacheObj = null; }
    return cacheObj;
  }
  const url = (i, s = src) => SOURCES[s] + i;
  async function fetchChunk(i) { // network fetch with one retry and fallback source
    let err = null;
    for (let t = 0; t < 4; t++) {
      const s = (src + (t >= 2 ? 1 : 0)) % SOURCES.length;
      try { const r = await fetch(url(i, s), { mode: 'cors', credentials: 'omit', priority: 'low' }); if (!r.ok) throw new Error('HTTP ' + r.status); if (s !== src) src = s; return r; } catch (e) { err = e; await new Promise((res) => setTimeout(res, 400 * (t + 1))); }
    }
    throw err;
  }
  // make sure chunk i is in the browser cache (without holding it in memory)
  function warm(i) {
    if (warmP[i]) return warmP[i];
    warmP[i] = (async () => {
      const c = await cache();
      if (c) { for (let s = 0; s < SOURCES.length; s++) if (await c.match(url(i, s))) { have.add(i); return; } }
      const r = await fetchChunk(i);
      if (c) { try { await c.put(url(i), r); } catch (e) { /* storage full: caller will refetch */ } }
      else { await r.arrayBuffer(); }
      have.add(i);
    })().finally(() => { /* keep resolved promise */ });
    return warmP[i];
  }
  async function readChunk(i) { // bytes for chunk i, from cache if possible
    const c = await cache();
    await warm(i).catch(() => {});
    if (c) for (let s = 0; s < SOURCES.length; s++) { const hit = await c.match(url(i, s)); if (hit) return hit.arrayBuffer(); }
    const r = await fetchChunk(i); return r.arrayBuffer();
  }
  async function pool(n, count, fn, onDone) {
    const q = Array.from({ length: count }, (_, i) => i); let done = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (q.length) { const i = q.shift(); await fn(i); done++; onDone(done / count); } }));
  }
  function script(s) { return new Promise((res, rej) => { if (window.ort) return res(); const e = document.createElement('script'); e.src = s; e.onload = res; e.onerror = () => rej(new Error('Could not load ' + s)); document.head.appendChild(e); }); }

  const NTl = {
    state,
    onChange(fn) { subs.push(fn); },
    ready: () => !!session,
    // quiet background download into the browser cache (no model memory used)
    prefetch() {
      if (prefetching || session) return prefetching;
      set('downloading', 0);
      prefetching = (async () => {
        const c = await cache(); if (!c) { set('idle', 0); return; }
        await pool(2, CHUNKS, async (i) => { await warm(i); await new Promise((r) => setTimeout(r, 25)); }, (p) => set('downloading', p));
        set('cached', 1);
      })().catch(() => set('error', state.progress));
      return prefetching;
    },
    scheduleIdle() {
      const conn = navigator.connection; if (conn && conn.saveData) return;
      const go = () => { const run = () => NTl.prefetch(); if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 }); else setTimeout(run, 1500); };
      if (document.readyState === 'complete') setTimeout(go, 1200); else window.addEventListener('load', () => setTimeout(go, 1200));
    },
    // start the model session (reads the cached chunks; downloads whatever is missing)
    ensure() {
      if (session) return Promise.resolve();
      if (starting) return starting;
      starting = (async () => {
        try {
          await script(ORT_JS); const ort = window.ort; ort.env.wasm.wasmPaths = ORT_WASM; ort.env.logLevel = 'error';
          if (state.phase !== 'cached') set('downloading', state.progress);
          const bufs = new Array(CHUNKS);
          await pool(4, CHUNKS, async (i) => { bufs[i] = await readChunk(i); }, (p) => set(p < 1 ? 'downloading' : 'starting', p));
          set('starting', 1);
          const blob = new Blob(bufs); bufs.length = 0;
          // run the model in a background worker so the page stays responsive while words are generated; fall back to the main thread if a worker is not possible
          const make = async (proxy) => { ort.env.wasm.proxy = proxy; const u = URL.createObjectURL(blob); try { return await ort.InferenceSession.create(u, { executionProviders: ['wasm'] }); } finally { URL.revokeObjectURL(u); } };
          try { session = await make(true); } catch (e1) { session = await make(false); }
          set('ready', 1);
        } catch (e) { set('error', state.progress); starting = null; throw e; }
      })();
      return starting;
    },
    // full next-token scores for the last position (Float32Array of 50,257)
    logits(ids) {
      const run = async () => {
        await NTl.ensure();
        const ort = window.ort, ctx = ids.slice(-1024);
        const input = new ort.Tensor('int64', new BigInt64Array(ctx.map(BigInt)), [1, ctx.length]);
        let out; try { out = await session.run({ input }, ['linear_output']); } catch (e) { out = await session.run({ input }); }
        const d = out.linear_output.data, V = NT.V, lg = Float32Array.from(d.length > V ? d.subarray(d.length - V) : d);
        try { input.dispose?.(); out.linear_output.dispose?.(); } catch (e) { /* ignore */ }
        return lg;
      };
      const p = chain.then(run, run); chain = p.catch(() => {}); return p;
    },
    // attention weights for every block and head, in the same layout as the stored examples (Uint8, 0-255)
    attention(ids) {
      const run = async () => {
        await NTl.ensure();
        const ort = window.ort, T = ids.length;
        const input = new ort.Tensor('int64', new BigInt64Array(ids.map(BigInt)), [1, T]);
        const names = []; for (let b = 0; b < 12; b++) for (let h = 0; h < 12; h++) names.push(`block_${b}_attn_head_${h}_attn_softmax`);
        const out = await session.run({ input }, names), a = new Uint8Array(144 * T * T);
        names.forEach((n, k) => { const d = out[n].data; const o = d.length >= T * T ? d.length - T * T : 0; for (let x = 0; x < T * T; x++) a[k * T * T + x] = Math.max(0, Math.min(255, Math.round(d[o + x] * 255))); });
        return a;
      };
      const p = chain.then(run, run); chain = p.catch(() => {}); return p;
    },
  };
  NT.live = NTl;
})();
