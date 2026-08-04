# The Next Token Lab

A guided, browser-based lab for an Intro to AI course. It answers one recurring
question — **"Given everything the model has so far, what should come next?"** —
across four classes, building from a simple "next word" picture to the full
token → context → logits → probabilities → selection → append loop.

- **Teaching Model** — transparent, inspectable math (corpus counts, toy
  attention, logits, SoftMax, temperature, cumulative sampling). Runs entirely
  offline in the browser. This is the core and always works.
- **Real Browser Model** — an *optional* small causal language model
  (Transformers.js + ONNX, WebGPU when available) for authentic tokenization and
  next-token probabilities. Loaded only when a student asks for it.

No accounts, no logins, no server, no paid API. Anonymous progress is saved in
`localStorage` on the same device.

## Deploy on GitHub Pages

This is a static site. To publish it at
`https://gkozak1.github.io/IntroToAI/LLMVisualization/`:

1. Copy the contents of this folder into a `LLMVisualization/` folder at the
   root of your existing **IntroToAI** repository:

   ```
   IntroToAI/
     LLMVisualization/
       index.html
       app.css
       app.js
       tests.html
       README.md
       js/
         teaching-model.js
         curriculum.js
         state-store.js
         real-model-client.js
         model-worker.js
   ```

2. Commit and push. If GitHub Pages is already enabled for the repo (Settings →
   Pages), the app appears at the URL above within a minute or two.

3. Open the URL. Confirm the Teaching Model works on a school Chromebook. Then
   open `…/LLMVisualization/tests.html` — every self test should pass.

> The app uses ES modules and a Web Worker, so it must be **served over
> https/http** (GitHub Pages does this). Opening `index.html` directly from the
> file system will not work; use a local server for testing
> (`python3 -m http.server` from the folder).

## Teacher quick-start

- **Top bar** switches between Class 1–4, the Glossary, and **Teacher**
  navigation (jump to any step or checkpoint, start a class fresh, or reset all
  progress — no password).
- **Checkpoints** are marked stops for discussion. The "Continue" button stays
  visible but is framed as *"Continue when your teacher says to proceed."* The
  app never forces the class forward.
- **Process map** (left rail) shows the seven-stage pipeline with the current
  stage highlighted.
- **Real-model steps** (2.6, 3.6, 4.5, and Open Lab) are optional. If a
  Chromebook can't run the model, the Teaching Model still covers every concept;
  run the real-model portions on a teacher laptop with WebGPU.

## The Real Browser Model is a benchmark decision

Per the design spec, the exact model and quantization are **not fixed** — they
should be chosen after testing real school Chromebooks (spec §6.2, §11.3). The
defaults live at the top of `js/model-worker.js`:

```js
const DEFAULT_MODEL_ID = "HuggingFaceTB/SmolLM2-360M-Instruct";
const DEFAULT_DTYPE = "q4";
```

Swap these for the smallest model that gives clear, stable instructional
contrasts, exposes the tokenizer/logits interface, and loads reliably on the
target devices (e.g. an `onnx-community` Qwen2.5-0.5B variant). First load
downloads model files from Hugging Face and is cached by the browser; offline
use is not a first-version requirement.

## What is and isn't built here

Built (Teaching Model core — spec build Phase 1, verified by `tests.html`):
- All four class paths and every step, the app shell, process map, checkpoints.
- Versioned `localStorage` with graceful in-memory fallback, resume, and reset.
- Teacher direct navigation. Glossary. Open Lab.
- Real-model integration wired to the inference contract (§9.4), with WebGPU
  detection and teacher-laptop fallback messaging.

Deferred to prototyping (spec §11.3), and intentionally left tunable:
- Final model + quantization after Chromebook benchmarking.
- Exact guided real-model prompts after distribution testing on the chosen model.
- Optional query–key–value "Go Deeper" attention extension.

## Editing content

Curriculum content is data, not code — tune wording, corpora, and examples in
`js/curriculum.js` without touching the engine. The transparent math lives in
`js/teaching-model.js` and is covered by `tests.html`.
