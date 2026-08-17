# Neural Net Visualization and Calculation

Static browser-based instructional app for learning forward propagation through three steps:

1. Calculate the Diagram
2. Map to Matrices
3. Matrix Math

## Current classroom controls

- Default architecture: 3 → 4 → 3 → 2
- Default example is fixed and repeatable; **Generate Values** creates a new problem
- Biases can be turned ON/OFF non-destructively (OFF uses effective bias 0)
- Activation can be ReLU/OFF (OFF means a = z)
- Guidance levels:
  - High: completed values
  - Medium: student solves values with relationship highlighting
  - Low: student solves values without relationship highlighting (default)

In Diagram practice, selecting a neuron in Hidden 2 or Output automatically displays the fully calculated prior layers while leaving the selected neuron for the student to solve.

## Deployment

The final packaged `index.html` is self-contained and can be placed in `IntroToAI/NeuralNetVisualization/` on GitHub Pages. `styles.css` and `app.js` are also included as maintainable source copies.
