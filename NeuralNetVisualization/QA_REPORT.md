# Neural Net Visualization and Calculation — Browser Simulation QA

## Build under test

This report covers the revised build containing:

- compact title/configuration header
- fixed repeatable default 3 → 4 → 3 → 2 example
- Biases ON/OFF simplification
- Activation ReLU/OFF simplification
- Guidance HIGH / MEDIUM / LOW, with LOW as the default
- contextual prior-layer completion in Diagram practice
- collision-free Matrix Math layout
- self-contained `index.html`

## Test method

The final self-contained `index.html` was exercised in system Chromium with real browser DOM events, clicks, keyboard entry, SVG rendering, and layout measurements. The ChatGPT execution environment prevents Chromium from navigating to a localhost or `file://` URL, so this is not a literal GitHub Pages network-deployment test. The exact HTML/CSS/JavaScript shipped in `index.html` was loaded directly into a Chromium page.

## Result

**132 scripted browser checks passed, 0 failed.**

No JavaScript runtime errors were produced during the tested workflows.

## Header and controls

- Title is `Neural Net Visualization and Calculation`.
- Removed `Forward Propagation` and `One calculation. Two representations. Three steps.`
- The four architecture selectors and four action buttons share one row below the title at the tested 1024 px Chromebook width and at wider classroom/projector widths.
- Narrow-screen responsive behavior remains available below that primary target.
- LOW guidance is the initial default.
- Biases default ON.
- Activation defaults to ReLU.

## Default and generated networks

- Initial 3 → 4 → 3 → 2 network uses a fixed repeatable set of inputs, weights, and biases.
- Rebuilding the named default 3 → 4 → 3 → 2 architecture restores the same fixed classroom example.
- `Generate Values` deliberately creates a new instructional problem while retaining the architecture.
- Generated networks calculate all authoritative z/a values through the same calculation engine.
- Generated values include a negative pre-activation example so ReLU can be observed.

## Simplification controls

### Biases

- Biases OFF uses effective `b = 0` throughout Diagram, Mapping, and Matrix Math.
- Stored bias values are preserved rather than overwritten.
- Biases ON restores those stored values and recalculates the network.
- Switching bias mode clears dependent student work to prevent stale answers.

### Activation

- ReLU ON uses `a = ReLU(z)`.
- Activation OFF uses `a = z` throughout the application.
- Re-enabling ReLU restores ReLU behavior.
- Switching activation mode clears dependent student work.

## Guidance levels

### HIGH

- Diagram displays completed z/a values.
- Mapping displays completed activation, weight, and bias entries.
- Matrix Math displays completed z/a result values.

### MEDIUM

- Student result cells remain blank.
- Selecting a target highlights the values/relationships required to solve or map it.
- The numerical result is not revealed before it is correctly solved.

### LOW

- Student result cells remain blank.
- No operand/correspondence hints are supplied beyond focus on the selected target.
- This is the default level.

## Diagram workflow

- Default SVG diagram renders immediately.
- 1 → 1 → 1 → 1 through 4 → 4 → 4 → 4 architectures render and function.
- Selecting a Hidden 2 neuron in MEDIUM or LOW displays the completed Hidden 1 layer while leaving the selected Hidden 2 neuron unsolved.
- Selecting an Output neuron displays both completed hidden layers while leaving the selected Output neuron unsolved.
- The user no longer has to manually finish previous layers before selecting a later neuron.
- Within the selected neuron, activation entry still follows a correctly solved z value.
- Correct/incorrect checking, blank neutrality, and reset behavior work.
- Weight labels do not overlap in the maximum 4 → 4 → 4 → 4 diagram in the tested rendering.

## Mapping workflow

- All three transitions have the correct vector/matrix dimensions and cell counts.
- HIGH, MEDIUM, and LOW behavior works as specified above.
- Diagram edge ↔ exact W(i,j) cell correspondence works in both directions in MEDIUM.
- Destination neuron ↔ incoming weight column/prior activations/bias correspondence works in MEDIUM.
- Bias mapping is correct with biases ON and uses zeros with biases OFF.
- Keyboard entry persists and correct/incorrect/blank checking works.

## Matrix Math workflow

- Prior activation vector, W, and b are populated for practice.
- z and a are blank in MEDIUM/LOW and completed in HIGH.
- MEDIUM z selection highlights the prior activation vector, one weight column, matching bias, and destination reference neuron.
- LOW removes those operand hints.
- a remains a separate step after z and cannot be entered until its z is correctly solved in practice mode.
- Bias OFF and Activation OFF both propagate consistently into Matrix Math.

## Matrix layout / responsive checks

The maximum 4 → 4 matrix case was measured at:

- 1440 px
- 1280 px
- 1200 px
- 1024 px

Results:

- no page-level horizontal overflow
- no horizontal scrolling required inside the Matrix Math workspace
- no matrix/vector collision at 1200 px and above
- responsive 1024 px layout remains contained and usable

## Manual editing and reset behavior

- Inputs, weights, and stored biases can be edited.
- Invalid numeric edits are rejected.
- Saving edits recalculates authoritative values and invalidates dependent student work.
- With biases OFF, the editor clearly treats bias entries as stored values.
- Rebuilding the default architecture restores the fixed default example.

## Packaging

- `index.html` contains embedded CSS and JavaScript and is self-contained at runtime.
- `styles.css` and `app.js` are retained as maintainable source copies.
- No external dependency, build process, API, server, Node runtime, or framework is required for deployment.
