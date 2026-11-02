# LLM Lab Transformer alignment update

The app retains “The banker left the bank and sat on the left bank of the”, with “river” in the final demonstrated ranking. No deployment was performed.

## Files modified in this revision

- `js/transformer.js`: revised Focus, Query, Key, and Relevance captions; corrected the room topic substitution to use the line-of-questioning label; highlighted the selected Query while keeping other Questions readable; added a small blue connector from that Query to the existing attention fan through the gap below the selected Statement. Renamed the projected update to Lead Detective’s Output and kept Lead Detective’s Summary for the Case File after residual addition. Sends the current step, block, token, speed, and animation choice to HIRW.
- `js/really.js`: follows the analogy at distinct assembly, concatenation, output projection, and residual-addition boundaries. Projection settles with the incoming Case File on the left and Attention Output on the right. Holds at the MLP output before the second residual addition. Screen 14 shows only the current block; it no longer automatically runs through the remaining blocks. Independent HIRW controls remain available; the next analogy action restores alignment. Added guards against stale asynchronous rendering. Updated the corresponding labels and attention-output color.
- `js/viz.js`: added a teal output-projection color role. Existing Query, Key, Value, and MLP color mappings and numerical calculations are unchanged.
- `styles.css`: added the selected-Query styling and teal HIRW projection styles without changing Query/Key/Value cell sizes or column positions.

## Terminology and color

Purple remains associated with Values, weighted Values, Notes, and concatenated Notes. Teal identifies the projected Attention Output / Lead Detective’s Output. Multicolored vectors remain Case Files, including the Lead Detective’s Summary after addition. MLP outputs remain amber.

HIRW has intentionally changed only within the approved synchronization, presentation, labeling, and coloring scope. Its stored GPT-2 data, matrix calculations, and numerical values have not been changed. Independent technical playback still exposes the detailed mathematical screens; guided playback stops at the result matching the current analogy stage.

## Tests actually performed

Headless Chromium, serving the complete app locally over HTTP:

- Before-and-after screenshots of Room 1 Query, Key, and Relevance stages at 1440 × 900 (16:10).
- Selected the first bank, second bank, final the, and first token. Verified exactly one active Query and correct future-Key and future-Value masking for all 13 positions.
- Compared the displayed relevance percentages, weighted Value canvas pixels, and Statement text against the previous version: identical.
- Checked each Assembly boundary: first head, all heads with concatenation symbols, single joined vector with individual segments hidden, projected output without residual result, residual addition, and Summary moved left.
- Checked Back navigation and independent HIRW navigation followed by resynchronization from the analogy.
- Checked Rooms 2 and 3 for the correct “Who?” and “What happened?” labels, selected Query, and matching HIRW block.
- Checked Play/Pause, default/fast/slow speed settings, and leaving and returning to the Transformer tab.
- Checked the MLP output stopping point and subsequent residual addition.
- Checked that Block 1 remains Block 1 after its final stage, then tested the animated transition to Block 2.
- Visited every subsequent block using the existing block-skip control through Block 12. Confirmed that the final HIRW ranking includes river.
- Checked independent HIRW Play/Pause and return to analogy-driven Assembly.
- Captured and visually inspected a narrower 1100 × 800 layout, including the selected Question, masked witnesses, and HIRW relevance calculation.
- JavaScript syntax checks passed. Neither browser test suite reported an uncaught page error.
- Byte comparison against the preceding app version confirmed that only the four files above changed. All data files and unrelated application files are identical.

## Limits and preserved behavior

The browser environment could not load the remote live GPT-2 runtime; screenshots therefore show its existing “GPT-2 offline” indicator. The Transformer views and tests used the app’s bundled GPT-2 traces. Live token generation was not tested.

The existing fixed-height Summary Examples can clip some long text, and the pre-existing MLP column headings are close together. Those unrelated geometry/text issues were left unchanged under the surgical-edit restriction. No claim is made that all pre-existing layout issues across the application have been corrected.

The before/after screenshot pairs are named `before-question.png` / `after-question.png`, `before-statement.png` / `after-statement.png`, and `before-relevance.png` / `after-relevance.png`. Additional screenshots show Assembly, the MLP, the current-block hold, the final block, and the narrower layout.
