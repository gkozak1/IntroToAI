# Test report

## Automated browser tests

The app was tested in headless Chromium using its built-in `?mock=1` deterministic test engine. The test exercised the same UI, state management, sampling logic, charts, history, and navigation used by production mode.

Passed checks:

- Model-ready state and initial prompt analysis
- 20-row next-token calculation table
- Probability chart and attention chart rendering
- Top-K filtering (`K=5` produces five eligible bars; rank 6 is `−∞` / 0%)
- Manual r-value validation
- Manual `r=0.999999` selecting rank 5 of Top-K 5
- Generated-token history dialog, candidate list, selected-row highlight, and attention history
- Back restores the previous prediction round
- Automatic Finish reaches exactly 50 generated tokens
- Final selection remains highlighted in the table and probability chart
- Transformer Block navigation 1 → 2
- Reset returns to zero generated tokens and unlocks the prompt
- Temperature 1.0 display behavior
- Stop interrupts Finish before 50 tokens
- Responsive layout smoke test at 390 px viewport width
- No JavaScript console or page errors during the automated test

## Static checks

- `app.js` passes `node --check` syntax validation.
- Production constants are pinned to ONNX Runtime Web 1.23.0 and `@xenova/transformers` 2.17.2.
- Production model output names and sampling calculations were checked against the current Transformer Explainer source.

## Production-engine limitation of this test environment

This sandbox cannot resolve external hosts, so it cannot perform the roughly 626 MB first-time download of Transformer Explainer's 63 GPT-2 model chunks. Therefore the full production model could not be executed end-to-end here. The production loader was instead checked against Transformer Explainer's current public source structure and ONNX output names, while all application behavior was tested with the deterministic mock engine.

Before classroom use, open the deployed production page on a target Chromebook, wait for **GPT-2 ready**, and compare one prompt's first-round logits against Transformer Explainer. That is the final environment-specific acceptance check.
