# Language Model Next-Token Explorer

A static, browser-based teaching tool for comparing a 2019 GPT-2 model with Liquid AI's modern LFM2.5-350M model. Both models run locally after their files download; prompts and continuations are not sent to an inference service.

## Two model modes

| Mode | Browser runtime | Download | Context | What students can inspect |
| --- | --- | ---: | ---: | --- |
| GPT-2 (2019 baseline) | ONNX Runtime Web / WASM | Transformer Explainer's 63 model chunks | 1,024 tokens | All 50,257 logits, sampling probabilities, and attention for 12 blocks |
| LFM2.5-350M (modern small model) | ONNX Runtime Web / WebGPU | Q4 ONNX, about 294 MB plus a small graph file | 32,768 tokens | All 65,536 logits and the same sampling calculation |

LFM2.5 is a hybrid model with 10 convolution blocks and 6 grouped-query-attention blocks. Its optimized browser graph returns logits and key/value caches, but not attention matrices, so the app explains that architectural difference instead of inventing attention data.

The browser runtime is pinned to the same ONNX Runtime Web build used by Transformers.js 4.0.0. Do not downgrade it to 1.23.0: that older WebGPU build can return non-finite LFM2.5 Q4 logits on Windows/Chrome. The app validates every logit before sampling, so an incompatible GPU/runtime combination produces a specific error instead of a misleading row of `0.00%` probabilities or repeated `<|pad|>` tokens.

LFM's recurrent cache outputs remain in GPU memory, matching Transformers.js's WebGPU session configuration. The app also rebuilds the cache from the full context after 24 incremental steps, and immediately retries from the full context if an adapter nevertheless returns an invalid cached result. This costs two occasional longer inference steps during a 50-token run but is more reliable across classroom hardware.

LFM2.5-350M is instruction-tuned. In modern mode the app therefore uses its chat template and adds this disclosed system instruction:

> Continue the passage naturally from the exact point where it ends. Do not explain or restart it.

The app prefills the assistant response with the visible passage. The prefilled words remain model context but are not counted or displayed as generated tokens, so a prompt such as `The sun` should visibly continue with a new token rather than generate `The` and ` sun` again.

The visible Temperature, Top-K, and r-value pipeline is otherwise the same in both modes. Preserving those controls makes it possible to compare model behavior while also teaching exactly how a logit becomes a sampled token.

## Student workflow

1. Choose GPT-2 or LFM2.5-350M in the header.
2. Edit the passage and wait for the model to analyze it.
3. Inspect the full-vocabulary ranking, Top-K filter, and probability chart.
4. Select `Next` to sample one token, or `Finish` to generate up to 50 tokens.
5. Select any generated token to reopen that round's model, settings, r-value, probability interval, and candidates.
6. Use `Back` or `Reset` to repeat an experiment.

The model selector preserves the visible sampling-control values so students can make a controlled comparison. In production, switching models reloads the page and starts only the selected inference runtime. This both clears the continuation—necessary because the tokenizers differ—and prevents the large GPT-2/WASM heap from competing with LFM2.5 for Chromebook memory.

## Chromebook requirements

GPT-2 uses WASM and is the compatibility mode. LFM2.5 requires WebGPU, a recent Chrome/ChromeOS build, and enough available memory for the model and runtime. The first LFM2.5 load downloads about 294 MB of weights; later loads can use the browser cache. If Chrome does not expose a compatible WebGPU adapter, the app keeps GPT-2 available and gives a plain-language device message.

For a classroom rollout, load the modern model once on each Chromebook while it is on the intended school network. Managed-device policy, content filters, storage limits, and GPU blocklists can differ between devices even when Chrome versions match.

## Main interface

- Temperature, Top-K, Auto r-value, and pause-between-tokens controls
- Virtualized full-vocabulary table, sorted by raw model logit
- Progressive completion with selected-rank color bands
- Full Top-K probability chart
- GPT-2 attention chart with all 12 transformer blocks
- Per-token history dialog
- Pause/resume playback up to a 50-token continuation
- Keyboard-accessible controls and responsive single-column layout

The pause setting is a target minimum interval between visible selections. Inference runs during that interval; slower hardware may necessarily take longer.

## GitHub Pages files

Deploy these files together in `IntroToAI/LLMVisualization/`:

- `index.html`
- `styles.css`
- `app.js`
- `THIRD_PARTY_NOTICES.md`

Expected URL:

`https://gkozak1.github.io/IntroToAI/LLMVisualization/`

This remains a static GitHub Pages app. It needs no server, API key, build step, or paid inference API. It does need network access to jsDelivr, Hugging Face, and the Transformer Explainer model host for first-time downloads.

## Testing without model downloads

Open `index.html?mock=1` through a web server to exercise both model modes, the 50,257- and 65,536-row virtualized tables, controls, charts, playback, model switching, and responsive layout without downloading either model.

To open production directly in modern mode without first loading GPT-2, use `index.html?model=lfm`. The model selector does this automatically.

`simulation.html` is the same interface with mock mode permanently enabled. Its values are deterministic test data, not model outputs.

See `TEST_REPORT.md` for the current verification record.
