# Dual-Model Verification Report — August 30, 2026

## Result

The dual-model build is ready for a GitHub Pages trial. GPT-2 remains the default compatibility mode, and LFM2.5-350M is available as an explicit modern WebGPU mode. The sampling calculation, native continuation format, and modern model's incremental-cache contract pass automated tests.

The August 30 revision isolates the two production runtimes: selecting LFM2.5 reloads into `?model=lfm` and loads LFM2.5 directly instead of retaining a previously loaded GPT-2/WASM heap.

The reported first-inference failure was then reproduced against the graph metadata and diagnosed precisely. The current official Q4 graph requires an additional scalar `int64` input named `num_logits_to_keep`. Liquid AI's browser example omitted that input, so the first `session.run()` failed after the model had loaded. Revision `20260830-2` supplies the required scalar value `1`, requesting exactly the final logit row needed for next-token sampling. Exact inference exceptions are also displayed in the main status and loading message.

A subsequent Windows 11 / Chrome run exposed a second, distinct compatibility problem: ONNX Runtime Web 1.23.0 completed the graph but returned `NaN` for every one of the 65,536 logits. That explains both the `0.00%` candidate probabilities and repeated `<|pad|>` output—the old sort fallback was effectively ranking token IDs rather than model scores. Revision `20260830-3` pins the WebGPU runtime to `1.25.0-dev.20260327-722743c0e2`, the exact runtime dependency of the independently working Transformers.js 4.0.0 LFM2.5 WebGPU demo. It also rejects non-finite logits before ranking or sampling and reports their exact count.

A longer Windows 11 / Chrome run then showed valid generation for about 32 tokens before its incremental cache returned all-`NaN` logits. Revision `20260830-4` aligns the session more closely with Transformers.js by keeping all 22 LFM recurrent-cache outputs in GPU buffers. As cross-device safeguards, it rebuilds the cache from the full context after 24 incremental steps and automatically retries a failed cached inference from the full context. Invalid output can no longer enter the probability table. This revision also prefills the assistant response with the visible passage, preventing the first generated tokens from repeating short inputs such as `The sun`.

The assistant-prefill approach prevented exact repetition, but its first instruction was too vague and could still make the model treat the passage as a subject to rewrite. Revision `20260830-5` tried raw completion instead. That was mechanically clean but a poor match for an instruction-tuned model: sampled runs became repetitive and ungrammatical after roughly 20–30 tokens.

Revision `20260830-6` restores LFM's native chat format with a stricter continuation contract. The passage appears in the user request and is prefilled as the beginning of the assistant response, so the next causal position is exactly after the visible final character. The hidden context is disclosed in the interface. In 20 independent Temperature `1.0`, Top-K `5` runs of the reported banker prompt, all 20 began as direct syntactic continuations; none repeated the passage, emitted a special token, or became a zero-probability padding loop. Examples included `, and watched the sun set slowly on the horizon.` and ` and the river whispered secrets to him.`

A native ONNX Runtime test executed the complete 294 MB Q4 graph successfully for both the initial 71-token conditioned context and incremental cached tokens. A final WebGPU smoke test on Chrome and one representative managed Chromebook is still required after deployment because this test environment has no WebGPU adapter.

## Source provenance

The work started from public repository commit `741ee9394ff52c894d749d59d43094b5e96d890d` in `gkozak1/IntroToAI`, dated August 13, 2026.

The uploaded copies of `app.js`, `README(1).md`, `simulation.html`, `styles.css`, `TEST_REPORT.md`, and `THIRD_PARTY_NOTICES.md` were byte-for-byte identical to that repository version.

`index(3).html` was not part of this app. It is a self-contained copy of the separate “Neural Net Visualization and Calculation” project. The active LLM file was the repository's `LLMVisualization/index.html`, and that is the file updated here.

## Model-selection research

Three browser-ready small models were executed locally through their real quantized ONNX graphs, not judged only from leaderboard scores:

| Candidate | Browser artifact tested | Observed at Temperature 1.0 / Top-K 5 | Decision |
| --- | ---: | --- | --- |
| LFM2.5-350M | Official Q4, about 294 MB | Direct and generally fluent continuations when used with its native instruction format and assistant prefill | Selected |
| SmolLM2-360M Base | Community Q4, about 386 MB | Correct raw-completion interface, but frequent phrase loops and weak handling of the banker prompt | Rejected |
| Qwen2.5-0.5B Base | Community Q4F16, about 483 MB | Some fluent passages, but frequent drift into multiple-choice/task formatting; substantially slower and a 151,936-token output vocabulary | Rejected |

Liquid AI also publishes an LFM2.5-350M Base checkpoint, but no official browser-ready ONNX conversion was available in the tested distribution. Converting and hosting a new third-party model artifact would increase deployment and provenance risk without evidence of better classroom output. The official instruction-tuned ONNX model is smaller than the two tested alternatives and produced the strongest continuation behavior after its input contract was corrected.

## Automated checks

Run from `LLMVisualization/`:

```text
node tests/sampling.test.mjs
node tests/static-ui.test.mjs
node tests/model-contract.test.mjs
node tests/build-simulation.mjs
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
- LFM's context uses its official system/user/assistant markers, a narrowly scoped continuation instruction, and the visible passage prefilled at the assistant boundary.
- The first sampled position follows the prefilled passage exactly, so the completion neither quotes nor restarts the visible input.
- The UI explicitly distinguishes LFM's input conditioning from the exact sampling calculation; it does not claim the two modes are a raw apples-to-apples benchmark.

### Live official-model contract

The test fetched Liquid AI's current official files rather than relying only on copied documentation.

- Q4 graph reachable: `onnx/model_q4.onnx`, 183,442 bytes.
- External weights reachable with byte-range support: 293,629,952 bytes.
- Hugging Face returns permissive CORS headers for the weight file.
- Graph exposes required inputs `input_ids`, `attention_mask`, and scalar `num_logits_to_keep`, plus logits, convolution caches, grouped-query-attention caches, and `model_q4.onnx_data`.
- Official configuration confirms 1,024 hidden size, 16 layers, 16 attention heads, 8 key/value heads, 65,536 vocabulary entries, and convolution cache length 3.
- Layer types confirm 10 convolution blocks and 6 full-attention blocks.
- Official tokenizer template supports a system message and generation prompt; the end token is `<|im_end|>` / token ID 7.
- The official configuration identifies token ID `1` as LFM's required beginning-of-text token.
- A native Q4 benchmark exercised the exact instruction-and-prefill context at Temperature `1.0`, Top-K `5`, without a repetition penalty. Seventy distinct seeded paths covered the reported banker prompt, four additional general fragments, and six challenge fragments; all began as direct continuations and produced finite probabilities.
- All 20 banker paths avoided prompt repetition and token loops. Most stopped naturally after one sentence; one contained a minor agreement error and several made mildly odd semantic choices, which is realistic for a 350M-parameter model.
- The selected-token rank traces included ranks 1–5, confirming that the test exercised stochastic sampling rather than only greedy selection.
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
- Modern mode explicitly discloses its invisible continuation instruction and assistant-prefilled passage.
- The completion panel displays the passage only once and begins generated token controls after its final character.
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
