# GPT-2 Next Token Explorer

Static browser-based teaching tool for exploring GPT-2 next-token generation. The production app uses the same Transformer Explainer GPT-2 ONNX model family and sampling pipeline already used by this project; the interface has been reorganized so the core experiment fits in one laptop viewport.

## Main interface

The primary workspace keeps these elements together:

- Temperature, Top-K, Auto r-value, and Pause-between-tokens controls
- Input prompt
- Reset / Back / Next / Finish controls
- Top-20 next-token table, sorted by raw GPT-2 logit
- Progressive completion beside the table
- Selected candidate highlighted while it is appended to the completion

Below the main workspace are full-width probability and attention charts. Their bars dynamically narrow to fit the available width rather than requiring horizontal scrolling.

## Finish playback

`Finish` generates until the continuation reaches 50 tokens. The Pause-between-tokens control uses these stops:

- 0 s
- 0.25 s
- 0.5 s
- 1.0 s
- 2.0 s
- 4.0 s

While Finish is running, its button becomes `Pause`; while paused, it becomes `Resume`. Playback is controlled only with this visible button.

The **Pause between tokens** setting is a target minimum interval between visible token selections. GPT-2 inference runs during that interval, so model-computation time is not intentionally added on top of the chosen delay. If inference itself takes longer than the selected interval on a slower device, the actual interval will necessarily be longer.

## Attention

The attention chart shows attention from the final context token, averaged across the 12 heads in the selected GPT-2 transformer block. Use the 1–12 block buttons or the arrow controls to move through all 12 blocks.

## Files to upload to GitHub Pages

Upload these files to your `IntroToAI/LLMVisualization/` directory:

- `index.html`
- `styles.css`
- `app.js`
- `.nojekyll`
- `THIRD_PARTY_NOTICES.md`

The production URL is expected to be:

`https://gkozak1.github.io/IntroToAI/LLMVisualization/`

## Simulation

`simulation.html` is a standalone mock-engine version of the interface. It does not download GPT-2 and is intended only for testing the UI and controls. Its candidate values are deterministic mock values, not GPT-2 logits.

The production app also retains `?mock=1` support when served from a web server.

## Model loading

The production app downloads the Transformer Explainer GPT-2 ONNX model chunks in the browser and caches them when browser cache storage is available. No paid inference API is used.
