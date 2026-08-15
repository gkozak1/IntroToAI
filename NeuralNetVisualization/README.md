# Neural Net Lab

A dependency-free browser visualization for teaching forward propagation, neural-network diagrams, matrix representation, and dot products.

## Deploy to the IntroToAI GitHub Pages site

1. Copy the entire `NeuralNetVisualization` folder into the root of the `IntroToAI` repository.
2. Commit and push the folder to GitHub.
3. If GitHub Pages is already serving the repository, the app should be available at:

   `https://gkozak1.github.io/IntroToAI/NeuralNetVisualization/`

No build step, package manager, server code, or API key is required.

## Files

- `index.html` — app structure
- `styles.css` — layout and visual design
- `app.js` — network model, calculations, SVG rendering, matrix view, practice/checking logic

## Intended teaching sequence

1. **Network** — click one neuron and calculate weighted sum → bias → activation.
2. **Layer** — use **Calculate Next Layer** once the single-neuron idea is understood.
3. **Matrix** — use **Build Matrix** to reorganize the same network values; use **Practice Mapping** to fill the weight matrix and biases yourself.
4. **Dot Product** — calculate one destination neuron from the current activation row and one weight-matrix column.

The interface deliberately starts with a small 3 → 3 → 2 network. The **Chapter 15-style** preset loads a 3 → 4 → 3 → 2 network whose first transition uses the example values from the course chapter: input `[1, 2, 4]` and the first weight matrix that produces `1.5, 2.2, -0.5, 0.4` before ReLU. Later-layer values are fixed teaching values rather than claims to reproduce every unseen figure from the chapter.

## Design choices

- Maximum of 5 neurons in each layer.
- One or two hidden layers.
- ReLU default, with Linear, Sigmoid, and Tanh available.
- Weights and biases are editable.
- Generated values use small one-decimal numbers to keep arithmetic readable.
- Neuron values begin hidden and are revealed by student work or **Calculate Next Layer**.
- Weight labels are shown only for the selected destination neuron unless **Show all weights** is enabled.
- The matrix uses the row-vector convention `a · W + b = z`, matching the course's Chapter 15 approach.
- Matrix cells and network connections are linked: clicking a weight cell returns to the corresponding destination neuron.

## Local testing

You can open `index.html` directly in most modern browsers. For a simple local server, from the repository root you can also run:

```bash
python -m http.server 8000
```

Then open:

`http://localhost:8000/NeuralNetVisualization/`
