# Dual-Model Verification Report — August 29, 2026

## Result

The dual-model build is ready for a GitHub Pages trial. GPT-2 remains the default compatibility mode, and LFM2.5-350M is available as an explicit modern WebGPU mode. The sampling calculation and the modern model's incremental-cache contract pass automated tests.

A final smoke test on one representative managed Chromebook is still required after deployment. This environment could verify the live official files and interfaces, but it could not execute the complete 294 MB WebGPU graph inside the local app.

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
- Incremental attention masks cover the full cached context, and position IDs continue at the correct offset.
- `present_conv` and `present.*` outputs map back to the correct `past_conv` and `past_key_values.*` inputs.
- Input, output, and superseded cache tensors are released after use.

### Live official-model contract

The test fetched Liquid AI's current official files rather than relying only on copied documentation.

- Q4 graph reachable: `onnx/model_q4.onnx`, 183,442 bytes.
- External weights reachable with byte-range support: 293,629,952 bytes.
- Hugging Face returns permissive CORS headers for the weight file.
- Graph exposes `input_ids`, `attention_mask`, `logits`, convolution caches, grouped-query-attention caches, and `model_q4.onnx_data`.
- Official configuration confirms 1,024 hidden size, 16 layers, 16 attention heads, 8 key/value heads, 65,536 vocabulary entries, and convolution cache length 3.
- Layer types confirm 10 convolution blocks and 6 full-attention blocks.
- Official tokenizer template supports a system message and generation prompt; the end token is `<|im_end|>` / token ID 7.
- A live Transformers.js tokenizer smoke test formatted the disclosed continuation instruction and sample passage into 49 tokens with the expected system, user, and assistant markers.
- Pinned ONNX Runtime WASM/WebGPU and Transformers.js CDN assets are reachable and CORS-enabled for GitHub Pages.

### Student-use and accessibility checks

- The model choice is a labeled two-option radio group, with one keyboard tab stop and Left/Right Arrow switching.
- Model, loading, and selection messages use polite live regions.
- Switching models clears the continuation but preserves the visible Temperature and Top-K controls.
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
3. Confirm the candidate table contains 65,536 ranked tokens and `Next` adds one natural continuation token.
4. Generate 10–20 tokens, use `Back`, and generate again to exercise cache reset.
5. Switch back to GPT-2 and confirm its 12 attention-block controls return.
6. Reload and confirm the second modern-model load benefits from browser caching.
7. Repeat on one lower-spec Chromebook if the class has mixed hardware.

Managed ChromeOS policy, GPU blocklists, browser storage quotas, and school-network filtering can affect WebGPU or first-load downloads independently of the app. GPT-2 remains the fallback when those constraints block modern mode.
