# Neural Net Lab — Product Specification

## Purpose

Neural Net Lab is an instructional aid for high-school students learning forward propagation. It deliberately avoids becoming a general-purpose neural-network simulator. The same forward pass is learned in three increasingly abstract ways:

**Calculate the diagram → map the diagram to matrices → calculate with the matrices.**

The diagram and the matrices are two representations of the same network. Dot products are the calculation performed inside the matrix representation, not a separate third representation.

## Network constraints

- Four layers always present: Input, Hidden 1, Hidden 2, Output
- Default architecture: **3 → 4 → 3 → 2**
- 1–4 neurons per layer
- Fully connected adjacent layers
- Default activation: ReLU
- Optional experimentation: Linear, Sigmoid, Tanh
- Small numerical inputs, weights, and biases for readable arithmetic

The row-vector convention is used throughout:

`a(previous) · W + b = z`

Then activation is applied element-by-element:

`Activation(z) = a(next)`

---

## Step 1 — Calculate the Diagram

### Instructional question

**How does one neuron get its value?**

### Screen

Only the neural-network diagram is visible. Matrix visuals are completely absent.

Calculated neurons are split into:

- left half: `z` (pre-activation)
- right half: `a` (activated value passed forward)

Bias is shown with its destination neuron. Weight labels appear for the selected calculation, with an optional **Show all weights** control.

### Beginner

The network is fully solved as a worked example.

Clicking `z`:

- highlights prior-layer activated values
- highlights incoming edges and weights
- highlights the destination bias
- opens the exact numerical weighted-sum-plus-bias formula

Clicking `a`:

- emphasizes the activation side of the neuron
- emphasizes outgoing connections where applicable to show what is passed forward
- opens the exact activation formula

### Advanced

All derived `z` and `a` values begin blank.

- Hidden Layer 1 neurons may be solved in any order.
- Later layers wait until the prior layer's `a` values have been checked correct.
- Selecting blank `z` highlights the prior activations, incoming weights, and bias.
- The student enters `z` in a compact practice dock.
- Once `z` is checked correct, the student calculates `a`.

This preserves the idea that neurons within a layer can be calculated in parallel while later layers depend on the completed prior layer.

### Checking

`Check My Work` evaluates entered values only:

- correct: green
- incorrect: red
- blank: neutral

Incorrect answers are not automatically revealed.

---

## Step 2 — Map to Matrices

### Instructional question

**Where does each part of the diagram go in the matrix representation?**

### Screen

The diagram and matrix representation appear side by side. Matrix arithmetic is not shown.

One transition is mapped at a time:

- Input → Hidden 1
- Hidden 1 → Hidden 2
- Hidden 2 → Output

The student maps only the information needed to set up the calculation:

- previous activation vector `a`
- weight matrix `W`
- bias vector `b`

The destination `z` and `a` vectors are intentionally left for Step 3 rather than copied from the diagram.

### Matrix meaning

For a source layer of size `m` and destination layer of size `n`:

- `a` is `1 × m`
- `W` is `m × n`
- column `j` of `W` contains every weight entering destination neuron `j`
- `b` is `1 × n`

### Beginner

All matrix cells begin blank.

Selecting a destination neuron highlights:

- the prior-layer activated values
- all incoming weights for that neuron
- its bias
- the previous activation vector
- the matching column of `W`
- the matching bias cell

Selecting an individual matrix cell narrows the connection to its exact diagram source.

Highlighting reveals **where**, not **what**. The student still types the value.

### Advanced

The same blank mapping exercise is shown with no correspondence highlighting. The current layer transition is still isolated so the diagram does not become unreadable.

### Checking

`Check My Work` checks the current transition. Correct entries turn green, incorrect entries red, and blanks remain neutral.

---

## Step 3 — Matrix Math

### Instructional question

**How do these matrices produce the same neuron values we calculated from the diagram?**

### Screen

The matrix calculation is the dominant visual. A smaller network remains visible as a reference back to the destination neuron.

The mapped values are complete:

`a(previous) · W + b = z`

The `z` result vector begins blank. Beneath it:

`Activation(z) = a(next)`

The `a` result vector also begins blank.

### Beginner

Selecting blank `z[j]` highlights:

- the complete previous activation vector
- column `j` of `W`
- bias `b[j]`
- destination `z[j]`
- the corresponding destination neuron and incoming connections in the small diagram

The student calculates and enters `z[j]`.

Selecting blank `a[j]` highlights its corresponding `z[j]`; the student applies the activation function and enters `a[j]`.

### Advanced

The same matrix problem is shown without operand highlighting. The compact diagram remains as contextual confirmation of which neuron the result belongs to, but does not identify the arithmetic operands.

### Formula inspection

After a calculated `z` or `a` value has been checked correct, clicking it opens the exact numerical formula that produced it. Formula inspection confirms understanding without becoming an answer-reveal mechanism before the attempt.

### Checking

`Check My Work` evaluates entered result cells for the selected transition:

- correct: green
- incorrect: red
- blank: neutral

---

## Shared controls

- Architecture: 1–4 neurons per layer, with both hidden layers retained
- Default: 3 → 4 → 3 → 2
- **New Values:** generate a fresh small-number exercise
- **Edit Values:** manually edit inputs, every weight, and every bias
- **Reset Practice:** clear student entries/checking while preserving the network values

## Visual language

Use a restrained emphasis system rather than a different color for every connection:

- selected target: strongest emphasis
- related source values/weights/bias: medium emphasis
- exact mapped connection: gold emphasis
- correct entry: green
- incorrect entry: red
- irrelevant information: subdued when focus is useful

## Technical requirements

- Static browser application
- `index.html`, `styles.css`, `app.js`
- No server-side code
- No npm/build process
- No API dependency
- No external JavaScript libraries
- GitHub Pages compatible
- Designed for current Chromium-based browsers and classroom Chromebook/projector use
