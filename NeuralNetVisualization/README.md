# Neural Net Lab

A static browser-based instructional visualization for the IntroToAI GitHub Pages site.

## Deploy

Copy this folder into the repository as:

```text
IntroToAI/
  NeuralNetVisualization/
    index.html
    styles.css
    app.js
```

With GitHub Pages enabled, the intended URL is:

```text
https://gkozak1.github.io/IntroToAI/NeuralNetVisualization/
```

No build step, package manager, server-side code, API key, or external JavaScript library is required.

## Instructional structure

The app teaches one forward pass through three focused workspaces:

1. **Calculate the Diagram** — understand how prior activated values, weights, and bias produce each neuron's `z`, then apply the activation function to get `a`.
2. **Map to Matrices** — translate those same activations, weights, and biases into matrix locations without doing matrix arithmetic yet.
3. **Matrix Math** — use the completed mapping to calculate `z`, then apply the activation function element-by-element to calculate `a`.

The default network is **3 → 4 → 3 → 2** with two hidden layers. Every layer is capped at four neurons.

## Beginner and Advanced

- **Step 1 / Beginner:** fully solved worked example; clicking `z` or `a` traces the related values and shows its numerical formula.
- **Step 1 / Advanced:** `z` and `a` begin blank; the student calculates them from the diagram. Selecting `z` highlights the prior activations, incoming weights, and bias.
- **Step 2 / Beginner:** matrix mapping is blank, with correspondence highlighting between diagram and matrix.
- **Step 2 / Advanced:** the same mapping exercise without correspondence highlighting.
- **Step 3 / Beginner:** `z` and `a` result vectors are blank; selecting a result highlights the matrix values needed to calculate it.
- **Step 3 / Advanced:** the same calculation without operand highlighting.

`Check My Work` turns entered correct values green and incorrect values red while leaving blank values neutral.

## Network values

The default network uses small inputs, one-decimal weights, and one-decimal biases. Use **New Values** to generate a new exercise or **Edit Values** to enter specific values manually.

ReLU is the default activation. Linear, Sigmoid, and Tanh are also available for experimentation.
