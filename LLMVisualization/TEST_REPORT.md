# Interface Test Report — August 11, 2026

## Scope

Automated browser tests were run against the standalone mock-engine build. The GPT-2 model/sampling math was not changed by this interface revision; this pass focused on layout, controls, playback, selection highlighting, charts, and history interaction.

## Tested successfully

- 20 candidate rows render and all 20 fit without vertical scrolling at a 1366×768 viewport.
- Input/control area plus side-by-side candidate/completion workspace fits above y=720 at 1366×768.
- Selected candidate row is highlighted before the table advances to the next prediction round.
- The selected-row badge uses the same rank-band color as the appended completion token.
- Progressive completion appends one token per round and remains independently scrollable if needed.
- Pause-between-tokens slider updates correctly at all discrete settings.
- Finish switches to Pause while playing and Resume while paused.
- Finish button changes to Pause/Resume and controls playback.
- Token count remains unchanged while playback is paused.
- Finish reaches exactly 50 generated tokens.
- Top-K=50 probability chart displays all 50 eligible token bars without horizontal scrolling.
- Attention chart fits a 60+ token context without horizontal scrolling.
- Transformer block buttons navigate directly from Block 1 through Block 12.
- Historical token dialog opens and displays the candidate list for the selected token.
- Candidate table virtualizes the full 50,257-token GPT-2 vocabulary; Jump to Rank and Jump to Bottom navigate without rendering tens of thousands of DOM rows.
- Selected candidate rows remain highlighted during the next inference round and the list returns to the new highest-ranked candidates when that round is displayed.
- No JavaScript console errors or page errors occurred in the tested mock flows.

## Production-model note

The production browser loader still uses the existing GPT-2 ONNX runtime/model path. This execution environment cannot perform the full external production-model download, so final deployment should be smoke-tested against Transformer Explainer using the same prompt, temperature, and Top-K settings.

## Playback timing revision

The token-delay implementation now starts the next GPT-2 inference immediately after a token is selected and counts that inference time toward the selected interval. This avoids deliberately adding model latency on top of the slider value. Actual timing can still exceed the setting when inference takes longer than the selected interval.
