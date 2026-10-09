/* LLMLab — live GPT-2 (same model files and browser cache as the Next-Token Explorer) */
'use strict';
(() => {
  const ORT_VERSION = '1.25.0-dev.20260327-722743c0e2';
  const ORT_JS = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.min.js`;
  const ORT_WASM = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
  const SOURCES = ['https://raw.githubusercontent.com/poloclub/transformer-explainer/main/static/model-v2/gpt2.onnx.part', 'https://poloclub.github.io/transformer-explainer/model-v2/gpt2.onnx.part'];
  const CHUNKS = 63, CACHE = 'gpt2-next-token-explorer-te-model-v2';
  let session = null, loading = null;

  function script(src) { return new Promise((res, rej) => { if (window.ort) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
  async function chunk(url) {
    let cache = null; try { cache = await caches.open(CACHE); } catch (e) { cache = null; }
    if (cache) { const hit = await cache.match(url); if (hit) return { buf: await hit.arrayBuffer(), cached: true }; }
    const r = await fetch(url, { mode: 'cors', credentials: 'omit' }); if (!r.ok) throw new Error('HTTP ' + r.status);
    if (cache) { try { await cache.put(url, r.clone()); } catch (e) { /* storage full: keep going */ } }
    return { buf: await r.arrayBuffer(), cached: false };
  }
  async function fromSource(base, onProgress) {
    const bufs = new Array(CHUNKS); let done = 0; const q = Array.from({ length: CHUNKS }, (_, i) => i);
    await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) { const i = q.shift(); const r = await chunk(base + i); bufs[i] = r.buf; done++; onProgress(done / CHUNKS); } }));
    return new Blob(bufs);
  }
  NT.live = {
    ready: () => !!session,
    async load(onProgress = () => {}) {
      if (session) return;
      if (loading) return loading;
      loading = (async () => {
        await script(ORT_JS); const ort = window.ort; ort.env.wasm.wasmPaths = ORT_WASM; ort.env.logLevel = 'error';
        let blob = null, err = null;
        for (const s of SOURCES) { try { blob = await fromSource(s, onProgress); break; } catch (e) { err = e; } }
        if (!blob) throw err || new Error('Model download failed');
        const url = URL.createObjectURL(blob);
        try { session = await ort.InferenceSession.create(url, { executionProviders: ['wasm'] }); } finally { URL.revokeObjectURL(url); }
      })();
      try { await loading; } finally { loading = null; }
    },
    async next(ids) { // top-50 next tokens for this context
      const ort = window.ort, ctx = ids.slice(-1024);
      const input = new ort.Tensor('int64', new BigInt64Array(ctx.map(BigInt)), [1, ctx.length]);
      let out;
      try { out = await session.run({ input }, ['linear_output']); } catch (e) { out = await session.run({ input }); }
      const d = out.linear_output.data, logits = d.length > NT.V ? d.slice(d.length - NT.V) : d;
      const t = NT.top(Array.from(logits), 50);
      try { input.dispose?.(); out.linear_output.dispose?.(); } catch (e) { /* ignore */ }
      return t;
    },
  };
})();
