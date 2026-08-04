# Testing Notes

## Completed in the build environment

- Syntax checked all JavaScript modules with Node.
- Rendered every one of the 42 guided screens in a headless Chromium test harness.
- Exercised representative controls in every class, including corpus changes, branching, context removal, attention weights, token reveal, logits, SoftMax, temperature, sampling, guided real-model result layouts, and the open laboratory.
- Tested responsive rendering at desktop and Chromebook/mobile-width layouts.
- No JavaScript console errors were found in the static interaction test harness.

## Required before classroom deployment

The build environment blocks browser navigation to local servers, so it could not complete a live end-to-end download of the Hugging Face model. The worker code follows the current Transformers.js browser APIs, but the deployed site should be tested once on the actual school network and Chromebook model.

Use the Chromebook readiness checklist in `README.md`.
