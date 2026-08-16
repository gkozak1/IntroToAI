# Neural Net Visualization — Browser Simulation QA

This version was tested in headless Chromium by loading the exact HTML/CSS/JavaScript used by the app and exercising it with real browser clicks, focus changes, keyboard entry, and rendered-screen inspection.

## Environment limitation

The ChatGPT execution environment blocks Chromium navigation to local HTTP and `file://` URLs. Because of that, this was not a literal GitHub Pages deployment test. Instead, the exact self-contained `index.html` was loaded directly into a Chromium page. Runtime behavior, DOM events, SVG rendering, CSS layout, keyboard input, and screenshots were all exercised in the browser.

## Result

**77 scripted browser checks passed, 0 failed.**

No JavaScript runtime errors were produced during the tested workflows.

## Rendering checked

- Default 3→4→3→2 diagram renders immediately
- Full SVG network visible with four layer columns
- 30 default connections and 30 matching weight labels render
- Every non-input neuron displays separate z and a values
- Every non-input neuron displays its own bias
- Weight labels do not overlap in the default network
- Weight labels do not overlap in the maximum 4→4→4→4 network
- 1024px Chromebook-width rendering checked for all three instructional steps
- No page-level horizontal overflow at 1024px
- Matrix Math stacks correctly below 1180px

## Diagram workflow checked

- Guidance ON shows completed z and a values
- Selecting z highlights its incoming values, weights, bias, and destination
- Numerical z derivation appears only when appropriate
- Selecting a also visually relates it to its corresponding z
- Negative z → ReLU → 0 explanation works
- Guidance OFF blanks student-derived values
- Hidden Layer 2 remains locked until Hidden Layer 1 activations are correctly completed
- Output remains dependent on Hidden Layer 2
- a entry is unavailable until the corresponding z is correctly solved
- Incorrect z does not reveal the correct answer
- Correct and incorrect Diagram answers visibly mark the relevant neuron half
- Correct/incorrect status uses both color and ✓ / ! icons
- Check My Work leaves blanks neutral
- Reset Work clears student answers while retaining network parameters

## Mapping workflow checked

- Completed diagram and empty matrices appear together
- One transition is active at a time
- All three transition dimensions/cell counts are correct
- Mapping starts empty
- Diagram edge → exact W(i,j) matrix cell works
- W(i,j) matrix cell → exact diagram edge works
- Bias cell → exact destination bias works
- Destination neuron → full incoming weight column, prior activations, and matching bias works
- Keyboard entry persists through focus/render updates
- Correct, incorrect, and blank mapping states behave correctly
- Guidance OFF removes correspondence highlighting

## Matrix Math workflow checked

- Prior activation vector, weight matrix, and bias vector are populated
- z and a result cells start blank
- Guided z selection highlights the prior activation vector, one weight column, matching bias, and destination neuron
- Compact reference diagram highlights the same incoming connections
- Wrong z remains incorrect without revealing the result
- Correct z is accepted
- a is disabled until its corresponding z is correct
- a unlocks after correct z
- ReLU remains a separate calculation step
- Guidance OFF removes incoming-edge operand highlighting

## Network controls checked

- Build Network returns immediately to Step 1 and renders the diagram
- 4→4→4→4 rebuild works
- 1→1→1→1 rebuild works
- Generate Values preserves architecture
- Generated values use the same authoritative calculation engine
- Edit Values opens and saves correctly
- Editing recalculates dependent values and clears stale student work
- Invalid edited values are rejected with visible feedback

## Packaging checked

- `index.html` contains embedded CSS
- `index.html` contains embedded JavaScript
- `index.html` does not depend on `styles.css` or `app.js` at runtime
- Separate `styles.css` and `app.js` source copies remain included for maintenance

## Visual corrections made during this simulation

The simulation found and corrected issues that the earlier QA pass missed:

1. Diagram correct/incorrect state was not visible on the neuron itself.
2. Selecting an activation did not visually connect it back to its z value.
3. Diagram activation could be entered before z was solved.
4. Matrix Math activation could be entered before z was solved.
5. Weight labels were too crowded in the default diagram.
6. The previously supplied `index.html` was not actually self-contained despite being described that way.

These issues are corrected in this packaged version.
