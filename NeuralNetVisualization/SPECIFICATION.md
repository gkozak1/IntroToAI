# Neural Net Lab — Final Product Specification

## Purpose

Teach high-school students that these are the same forward-propagation calculation shown in different forms:

1. a neuron receiving weighted inputs,
2. a dot product,
3. a row-vector × weight-matrix operation.

The tool prioritizes focus, mathematical practice, and the connection among representations over realism or feature count.

## Instructional flow

### 1. One neuron
- Start with neuron values hidden.
- Click one non-input neuron.
- Fade unrelated connections.
- Reveal the incoming source activations, weights, products, bias, and activation function.
- Student enters:
  - weighted sum,
  - z after bias,
  - activated value a.
- **Check My Work** checks all three; **Show Me** reveals them.
- A correct/revealed neuron becomes visible in the network.

### 2. One layer
- **Calculate Next Layer** reveals all remaining neurons in the next available layer.
- The button works layer-by-layer rather than calculating the entire network.
- A later layer cannot be practiced until the preceding layer is fully known.

### 3. Matrix representation
- Matrix view begins blank.
- **Build Matrix** shows current activations, the weight matrix, bias vector, z vector, and activated vector.
- Unknown neuron results remain `?` until revealed in the network.
- Dimensions are displayed above each object.
- Row-vector convention: `a · W + b = z`, followed by activation.
- Clicking a weight-matrix cell returns to the network and highlights the exact corresponding edge.
- Clicking a network edge opens the matrix view and highlights the corresponding matrix cell.
- **Practice Mapping** blanks the weight matrix and bias vector for student entry.
- Entries can be checked individually by Enter/blur and together with **Check Matrix**.

### 4. Dot product
- Choose one transition and one destination neuron.
- Show the current activation row and only the corresponding weight-matrix column.
- Student calculates only three values:
  - weighted sum,
  - z after bias,
  - activated value a.
- **Check My Work**, **Show Me**, and **Next Neuron** support brief repeated practice.
- Correct work reveals the corresponding neuron in the network.

## Network limits

- Input neurons: 1–5
- Hidden Layer 1: 1–5
- Hidden Layer 2: optional, 1–5
- Output neurons: 1–5
- Fully connected feed-forward network only

## Values

- Inputs, weights, and biases can be edited manually.
- **Generate Values** uses small values suitable for hand calculation.
- Generated weights and biases use one decimal place.
- Generated inputs are small integers.

## Activation functions

- ReLU — default
- Linear
- Sigmoid
- Tanh

A single activation is used throughout the teaching network to avoid adding a separate output-layer concept to this tool.

## Presets

### Simple Start
- 3 inputs → 3 hidden → 2 outputs
- Designed to keep the first student experience visually clean.
- Includes a negative pre-activation so ReLU visibly changes at least one value to zero.

### Chapter 15-style
- 3 → 4 → 3 → 2
- First transition reproduces the chapter's explicit input and weight example:
  - input `[1, 2, 4]`
  - pre-activation values before bias/ReLU: `1.5, 2.2, -0.5, 0.4`
- Later-layer weights are fixed teaching values, not representations of unseen chapter figures.

## Visual rules

- Show every node and connection.
- Do not print every edge weight by default.
- Selecting a neuron shows weights only on its incoming connections.
- **Show all weights** is optional.
- Every non-input neuron is split visually into:
  - `z`: value after weighted sum + bias,
  - `a`: value after activation.
- Bias appears beside its destination neuron.
- Uncalculated values show `?`.
- Zero-valued source activations use a dashed connection style.
- Focused and exact-linked edges use stronger visual emphasis.

## Technical constraints

- Static browser application.
- No server, database, API, npm install, build step, or external library.
- Vanilla HTML, CSS, JavaScript, and SVG.
- Compatible with GitHub Pages.
- Target deployment path: `/IntroToAI/NeuralNetVisualization/`.
- Responsive enough for Chromebook-sized screens; primary design target is classroom laptop/desktop use.

## Non-goals for this version

- Training/backpropagation
- Gradient descent
- Loss functions
- Softmax/classification probabilities
- Convolutional networks
- Arbitrary tensor operations
- Generic full-featured matrix calculator
- Gamification, scoring, timers, or streaks

These are excluded to preserve the conceptual chain: neuron → layer → matrix → dot product.
