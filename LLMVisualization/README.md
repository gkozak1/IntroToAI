# GPT-2 Next Token Explorer

A static, browser-based teaching app designed as a companion to **Transformer Explainer**. It uses Transformer Explainer's GPT-2 ONNX model and mirrors its Top-K sampling pipeline while extending the experience to a 50-token continuation with inspectable history.

## What students can see

- Custom prompt input
- Temperature slider using Transformer Explainer's temperature stops: 0.2–1.0 by tenths, then 2–10
- Top-K from 1–50
- Automatic or manually entered `r` sampling value
- Top-20 table: Token, Logit, Scaled Logit, After Top-K, Softmax Probability
- Probability bar chart of eligible next tokens
- Attention bar chart for Transformer Blocks 1–12, averaging the 12 heads in each block for the final context token
- Reset / Back / Next / Finish controls; Finish completes a total of 50 generated tokens
- Clickable generated tokens colored green → yellow → red by rank within the Top-K set
- Token-history dialog showing the exact r-value, probability, cumulative selection range, and block-by-block attention used for that token

## Deploy to your GitHub Pages folder

These files are already static. No build process is required.

1. Open your GitHub repository `IntroToAI`.
2. Go to the `LLMVisualization` folder.
3. Upload the contents of this folder directly into it:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `.nojekyll`
   - `README.md` (optional for the website, useful in the repo)
   - `THIRD_PARTY_NOTICES.md`
4. Commit the changes.
5. After GitHub Pages refreshes, open:
   `https://gkozak1.github.io/IntroToAI/LLMVisualization/`

Do **not** upload the enclosing `LLMVisualization` folder inside an existing `LLMVisualization` folder or the URL will become `/LLMVisualization/LLMVisualization/`.

## First-load behavior

The app deliberately uses the same custom GPT-2 ONNX model chunks published by Transformer Explainer. That model is large: 63 files, mostly 10 MB each (roughly 626 MB total). The first visit can therefore take a while. The app caches those chunks using the browser Cache API, so later loads on the same Chromebook/browser profile should be much faster.

For a class, open the site once on each Chromebook **before** the lesson and wait for `GPT-2 ready`. Keep the browser cache intact.

The model files are fetched from the Transformer Explainer project's public GitHub assets rather than duplicated in your repository. The app first tries raw GitHub and then the live Transformer Explainer GitHub Pages site.

## Why the logits should match Transformer Explainer

The production path intentionally aligns with Transformer Explainer:

- `Xenova/gpt2` tokenizer
- Transformer Explainer's `model-v2/gpt2.onnx` model, reconstructed from its 63 published chunks
- ONNX Runtime Web 1.23.0
- GPT-2 raw logits from `linear_output`
- sorting all logits descending and keeping the top 50
- scaled logit = logit / temperature
- tokens below K set to `-Infinity`
- numerically stable softmax
- cumulative probability sampling using one `r` in `[0,1)`

Very small floating-point differences can occur across browser/CPU execution environments, but displayed values and rankings are expected to agree with Transformer Explainer when the same prompt and settings are used.

## Attention visualization

For each transformer block, the app reads the 12 `attn_softmax` matrices emitted by Transformer Explainer's model. It takes the final query row (the final context token's attention over earlier/current positions), averages the 12 heads, and renormalizes the result for display. This is intentionally labeled as an **average across heads**, not as a single attention head or as a causal explanation of the final prediction.

## Manual r mode

When automatic r-values are OFF, every press of **Next** requires a new value from `0` inclusive to `1` exclusive. **Finish is disabled in manual mode**, because automatically completing the remaining tokens would conflict with the requirement to provide a fresh manual r-value for every round.

## Test mode

Append `?mock=1` to the page URL to run the UI with a lightweight deterministic mock engine, without downloading GPT-2:

`https://gkozak1.github.io/IntroToAI/LLMVisualization/?mock=1`

This is useful for checking layout, controls, Back/Next/Finish behavior, history dialogs, charts, and responsive display. Mock mode is clearly labeled and is not intended for classroom inference demonstrations.

## Browser notes

Chrome/Chromium is the primary target. The production model is large, so devices with limited memory can be slow on first initialization. This version deliberately uses the WASM inference path rather than WebGPU so its numerical behavior stays closer to Transformer Explainer's current setup.

## Attribution

Transformer Explainer is created by the Polo Club of Data Science at Georgia Tech and is MIT-licensed. See `THIRD_PARTY_NOTICES.md` for attribution and dependency details.
