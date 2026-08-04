# The Next Token Lab

A four-class, guided learning application for an honors high-school **Introduction to AI** course. It moves from a transparent next-word teaching model to authentic next-token probabilities produced by a small transformer running in the browser.

## What the app teaches

1. Patterns in training data shape predictions.
2. A response grows through repeated next-token prediction.
3. Earlier context changes the next-token distribution.
4. Attention can be understood as weighted contextual influence.
5. Text becomes tokens, vectors, logits, and probabilities.
6. Temperature reshapes a distribution; sampling selects from it.
7. One selected token is appended and the loop repeats.

The guided path is divided into four classes and contains explicit **teacher checkpoints**. The app does not replace classroom discussion or assessment.

## Files

- `index.html` — site shell
- `styles.css` — responsive visual design
- `app.js` — guided screens and interactions
- `data.js` — class structure, examples, toy data, and model configuration
- `teaching-model.js` — transparent n-gram and probability utilities
- `state.js` — local progress saving
- `real-model-client.js` — main-thread interface to the model worker
- `real-model-worker.js` — tokenizer and causal-language-model inference
- `docs/` — design specification, teaching architecture, and preview images

## Publish with GitHub Pages

Place this entire folder inside your existing repository, for example:

```text
IntroToAI/
└── NextTokenLab/
    ├── index.html
    ├── app.js
    ├── styles.css
    └── ...
```

With GitHub Pages publishing the repository's `main` branch, the expected URL is:

```text
https://gkozak1.github.io/IntroToAI/NextTokenLab/
```

Do not open `index.html` directly from the Chromebook file system. The browser model and JavaScript modules need the app to be served over HTTPS, as GitHub Pages does.

## Real browser model

The app uses:

- Transformers.js `3.8.1`
- `onnx-community/SmolLM2-360M-ONNX`
- `q4` quantization
- WebGPU when available
- WASM fallback when WebGPU is unavailable
- `onnx-community/SmolLM2-135M-ONNX` as a smaller loading fallback

The first real-model use downloads model files from Hugging Face. The main 360M q4 model file is roughly 386 MB. Later visits normally use the browser cache. No OpenAI, Gemini, or other paid API is used.

## Privacy and saved progress

The app stores only instructional choices and completion state in the browser's `localStorage`:

- no student name
- no email address
- no account
- no server-side student record

Progress is best-effort. ChromeOS policy, browser-data clearing, private browsing, or a different device can remove it. Every class also works from a strong default path when no saved state exists.

## Teacher operation

- Use **Teacher navigation** to jump to any class screen.
- Student navigation follows the guided path.
- Teacher checkpoints are intentionally visible stopping points.
- The real model first appears in a controlled comparison before the open laboratory.
- The open laboratory asks students to change one variable at a time.

See `docs/Next_Token_Lab_Four_Class_Teaching_Architecture.docx` for the full four-class plan.

## Chromebook readiness test

Before classroom use, test on one school Chromebook:

1. Open the deployed HTTPS URL in Chrome.
2. Use **Teacher navigation** to open **Class 3 → Inspect a real tokenizer**.
3. Tokenize `unbelievable`.
4. Open **Class 3 → Inspect authentic probabilities**.
5. Run one prediction and wait for the first model download.
6. Confirm whether the status shows WebGPU or WASM.
7. Reload and confirm the second run starts faster from cache.
8. Verify the school network does not block `cdn.jsdelivr.net` or `huggingface.co`.

If school policy blocks the model download, the Teaching Model portions still work. The Real Browser Model portions can be demonstrated on the teacher laptop.

## Development and local testing

Because this is a static site, any local web server will work:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

JavaScript syntax check:

```bash
node --check app.js
node --check data.js
node --check teaching-model.js
node --check state.js
node --check real-model-client.js
node --check real-model-worker.js
```

## Accuracy boundaries built into the app

- The Teaching Model is an explanatory model, not a literal replica of a transformer.
- Real learned dimensions are not clean human-named categories.
- The attention activity illustrates weighted contextual influence; it is not a display of the model's private reasoning.
- A next-token probability describes model preference, not factual truth.
- Temperature reshapes sampling probabilities; it does not add knowledge.
- Greedy decoding is shown separately instead of dividing logits by a temperature of zero.

## Licenses and third-party components

App source code is provided under the MIT License. Model and library licenses remain governed by their upstream projects. See `THIRD_PARTY_NOTICES.md`.
