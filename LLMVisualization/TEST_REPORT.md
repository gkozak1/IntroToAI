# Dual-Model Verification Report — August 30, 2026

## Result

The dual-model build is ready for a GitHub Pages trial. GPT-2 remains the default compatibility mode, and LFM2.5-350M is available as an explicit modern WebGPU mode. The sampling calculation and the modern model's incremental-cache contract pass automated tests.

The August 30 revision isolates the two production runtimes: selecting LFM2.5 reloads into `?model=lfm` and loads LFM2.5 directly instead of retaining a previously loaded GPT-2/WASM heap.

The reported first-inference failure was then reproduced against the graph metadata and diagnosed precisely. The current official Q4 graph requires an additional scalar `int64` input named `num_logits_to_keep`. Liquid AI's browser example omitted that input, so the first `session.run()` failed after the model had loaded. Revision `20260830-2` supplies the required scalar value `1`, requesting exactly the final logit row needed for next-token sampling. Exact inference exceptions are also displayed in the main status and loading message.

A subsequent Windows 11 / Chrome run exposed a second, distinct compatibility problem: ONNX Runtime Web 1.23.0 completed the graph but returned `NaN` for every one of the 65,536 logits. That explains both the `0.00%` candidate probabilities and repeated `<|pad|>` output—the old sort fallback was effectively ranking token IDs rather than model scores. Revision `20260830-3` pins the WebGPU runtime to `1.25.0-dev.20260327-722743c0e2`, the exact runtime dependency of the independently working Transformers.js 4.0.0 LFM2.5 WebGPU demo. It also rejects non-finite logits before ranking or sampling and reports their exact count.

A longer Windows 11 / Chrome run then showed valid generation for about 32 tokens before its incremental cache returned all-`NaN` logits. Revision `20260830-4` aligns the session more closely with Transformers.js by keeping all 22 LFM recurrent-cache outputs in GPU buffers. As cross-device safeguards, it rebuilds the cache from the full context after 24 incremental steps and automatically retries a failed cached inference from the full context. Invalid output can no longer enter the probability table. This revision also prefills the assistant response with the visible passage, preventing the first generated tokens from repeating short inputs such as `The sun`.

A native ONNX Runtime test executed the complete 294 MB Q4 graph successfully for both the initial 49-token prompt and the next incremental cached token. A final WebGPU smoke test on Chrome and one representative managed Chromebook is still required after deployment because this test environment has no WebGPU adapter.

## Source provenance

The work started from public repository commit `741ee9394ff52c894d749d59d43094b5e96d890d` in `gkozak1/IntroToAI`, dated August 13, 2026.

The uploaded copies of `app.js`, `README(1).md`, `simulation.html`, `styles.css`, `TEST_REPORT.md`, and `THIRD_PARTY_NOTICES.md` were byte-for-byte identical to that repository version.

`index(3).html` was not part of this app. It is a self-contained copy of the separate “Neural Net Visualization and Calculation” project. The active LLM file was the repository's `LLMVisualization/index.html`, and that is the file updated here.

## Automated checks

Run from `LLMVisualization/`:

```text
node tests/sampling.test.mjs
node tests/static-ui.test.mjs
node tests/model-contract.test.mjs
node --check app.js
git diff --check
```

All checks passed.

### Sampling and inference accuracy

- Full-vocabulary logits are ranked from highest to lowest.
- Top-K filtering gives excluded tokens exactly zero probability.
- Stable softmax matches the analytical two-logit result to within `1e-9`.
- Eligible probabilities sum to one to within `1e-12`.
- Exact cumulative-range boundaries select the next interval, while `r=0` and `r` just below one select the correct endpoints.
- Lower temperature sharpens and higher temperature flattens the same distribution.
- Top-K=1 is deterministic for every valid r-value.
- The five rank-color bands span green through red as intended.
- Model profiles expose the correct vocabulary sizes: GPT-2 `50,257`; LFM2.5 `65,536`.
- LFM full-context inference uses all prompt tokens; subsequent rounds send only the newly selected token.
- Every LFM inference supplies scalar `num_logits_to_keep = 1`, matching the current graph and limiting output to the final next-token logit row.
- Incremental attention masks cover the full cached context, and position IDs continue at the correct offset.
- `present_conv` and `present.*` outputs map back to the correct `past_conv` and `past_key_values.*` inputs.
- Input, output, and superseded cache tensors are released after use.
- Any `NaN` or infinite logit stops inference before ranking, probability calculation, or token selection.
- All 22 recurrent-cache outputs are requested as GPU-resident buffers, matching the Transformers.js WebGPU path.
- The incremental cache is refreshed after 24 steps, before the failure point observed on Windows 11 / Chrome.
- An invalid incremental result triggers one full-context replay; an invalid full-context result remains a visible error.
- The assistant prompt is prefilled with the visible passage, so generated history begins with the actual continuation.

### Live official-model contract

The test fetched Liquid AI's current official files rather than relying only on copied documentation.

- Q4 graph reachable: `onnx/model_q4.onnx`, 183,442 bytes.
- External weights reachable with byte-range support: 293,629,952 bytes.
- Hugging Face returns permissive CORS headers for the weight file.
- Graph exposes required inputs `input_ids`, `attention_mask`, and scalar `num_logits_to_keep`, plus logits, convolution caches, grouped-query-attention caches, and `model_q4.onnx_data`.
- Official configuration confirms 1,024 hidden size, 16 layers, 16 attention heads, 8 key/value heads, 65,536 vocabulary entries, and convolution cache length 3.
- Layer types confirm 10 convolution blocks and 6 full-attention blocks.
- Official tokenizer template supports a system message and generation prompt; the end token is `<|im_end|>` / token ID 7.
- A live Transformers.js tokenizer smoke test formatted the disclosed continuation instruction and sample passage into 49 tokens with the expected system, user, and assistant markers.
- Pinned ONNX Runtime WASM/WebGPU and Transformers.js CDN assets are reachable and CORS-enabled for GitHub Pages.
- ONNX Runtime Web is pinned to the same `1.25.0-dev.20260327-722743c0e2` build declared by Transformers.js 4.0.0; both browser bundles are reachable from jsDelivr.
- Native full-prompt inference returned logits shaped `[1, 1, 65536]` in 0.099 seconds on the diagnostic CPU runtime.
- Native incremental inference accepted all 22 returned cache tensors and produced the next logit row; greedy test tokens continued the sample as `The river`.

### Student-use and accessibility checks

- The model choice is a labeled two-option radio group, with one keyboard tab stop and Left/Right Arrow switching.
- Model, loading, and selection messages use polite live regions.
- Switching models clears the continuation but preserves the visible Temperature and Top-K controls.
- Production model switching starts a fresh page lifecycle so only one large inference runtime occupies memory.
- The selected `?model=lfm` URL initializes modern mode directly, while GPT-2 remains the default URL.
- Modern mode explicitly discloses that it uses a continuation instruction.
- A plain-language explanation replaces the attention graph in modern mode; it does not display fabricated attention data.
- A failed WebGPU check leaves GPT-2 available and gives a direct device explanation.
- All JavaScript element references resolve to unique IDs in `index.html`.
- Core sliders and switches retain programmatic labels.
- Generated tokens remain keyboard-focusable buttons that reopen the exact historical selection round.
- Responsive rules retain the side-by-side comparison on laptop widths and move to a single-column workspace below 760 px.
- The interface respects reduced-motion preferences.
- The standalone `simulation.html` contains the current HTML, CSS, and JavaScript, permanently enables mock mode, and includes both 50,257- and 65,536-token interfaces.

## Device acceptance checklist

Before using modern mode with a whole class, test one school-managed Chromebook on the intended network:

1. Open the deployed GitHub Pages URL and confirm GPT-2 reaches `ready`.
2. Choose `LFM2.5-350M` and allow the first roughly 294 MB download to finish.
   Confirm the page reloads with `?model=lfm` before the download begins.
3. Confirm the candidate table contains 65,536 ranked tokens and `Next` adds one natural continuation token.
4. Generate 10–20 tokens, use `Back`, and generate again to exercise cache reset.
5. Switch back to GPT-2 and confirm its 12 attention-block controls return.
6. Reload and confirm the second modern-model load benefits from browser caching.
7. Repeat on one lower-spec Chromebook if the class has mixed hardware.

Managed ChromeOS policy, GPU blocklists, browser storage quotas, and school-network filtering can affect WebGPU or first-load downloads independently of the app. GPT-2 remains the fallback when those constraints block modern mode.
