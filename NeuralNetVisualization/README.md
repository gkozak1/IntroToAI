# Neural Net Visualization

Static browser app for teaching forward propagation through three instructional steps:

1. **Calculate the Diagram**
2. **Map to Matrices**
3. **Matrix Math**

## Run it

Open `index.html` in a current Chrome/Edge browser or deploy the folder to GitHub Pages. `index.html` is intentionally self-contained: its CSS and JavaScript are embedded so the diagram renders even when a preview environment does not resolve sibling assets correctly.

`styles.css` and `app.js` are also included as maintained source copies for easier editing. If those source files are changed, rebuild the embedded sections in `index.html` before deployment.

## GitHub Pages location

Place this folder at:

```text
IntroToAI/
  NeuralNetVisualization/
    index.html
    styles.css
    app.js
```

Expected URL:

```text
https://gkozak1.github.io/IntroToAI/NeuralNetVisualization/
```

No server, package manager, framework, API, or build process is required at runtime.

## Core behavior

- Default network: 3 → 4 → 3 → 2
- Architecture controls: 1–4 neurons per layer
- Shared authoritative calculation engine for Diagram and Matrix views
- Per-neuron biases
- ReLU activation
- Guidance ON/OFF
- Diagram calculation practice with layer dependencies
- Exact diagram-edge ↔ matrix-cell mapping
- Matrix dot-product-plus-bias practice
- Check My Work with blanks left neutral
- Manual input/weight/bias editing
- Generate Values and Reset Work
- SVG network rendering
- Chromebook/desktop responsive layout

See `SPECIFICATION.md` for the complete instructional and technical specification.
