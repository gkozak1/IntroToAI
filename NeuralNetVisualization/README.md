# Neural Net Visualization

A browser-only instructional app for teaching forward propagation through three connected views:

1. **Calculate the Diagram** — understand one neuron's weighted sum, bias, and ReLU activation.
2. **Map to Matrices** — map prior activations, connection weights, and biases into row-vector/matrix form without doing matrix arithmetic yet.
3. **Matrix Math** — reproduce the same neuron calculations using a row-vector × weight-matrix + bias-vector calculation, then apply ReLU element-by-element.

## Run locally

No build process is required. Put these files in the same folder and open `index.html` in a browser, or serve the folder with any simple static web server.

## GitHub Pages deployment

Copy the entire `NeuralNetVisualization` folder into:

```text
IntroToAI/
  NeuralNetVisualization/
```

Commit and push. With GitHub Pages already enabled for the repository, the intended URL is:

```text
https://gkozak1.github.io/IntroToAI/NeuralNetVisualization/
```

## Files

- `index.html` — page structure
- `styles.css` — visual design and responsive layout
- `app.js` — network model, calculations, SVG rendering, interactions, checking, editing, and state
- `SPECIFICATION.md` — source functional/instructional specification used for this build

## Implementation notes

- Vanilla HTML/CSS/JavaScript only; no external libraries or APIs.
- SVG network supports 1–4 neurons in each of four layers.
- Default architecture is 3 → 4 → 3 → 2.
- Row-vector convention: `a (1×m) · W (m×n) + b (1×n) = z (1×n)`.
- ReLU is the default and only activation in this initial build.
- One authoritative calculation engine supplies every representation so Diagram and Matrix Math cannot disagree.
- Student work is stored separately for Diagram, Mapping, and Matrix Math.
- Blank answers remain neutral when checking; incorrect answers do not reveal the solution.
