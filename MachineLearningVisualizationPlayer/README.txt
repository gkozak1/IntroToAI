Machine Learning Visualization Player — Final Build

Open index.html in a modern browser. No installation or server is required.

Final teaching refinements:
- Digit dropdown includes all 0–9 examples and defaults to 4.
- Model inception shows input activations plus randomized connection weights, while hidden and output activations remain blank until forward propagation calculates them.
- Trainable visual elements use five strength bands: 0–19, 20–39, 40–59, 60–79, and 80–100.
- Input→hidden connectors use clearly distinguishable red / red-orange / yellow / yellow-green / green bands, but are slightly quieter and thinner than hidden→output connections.
- Hidden neuron activations use the same five-band strength language after they are calculated.
- Hidden→output connector bundles always match the current output neuron's strength band. This relationship is visible even before the first output values are revealed, reinforcing the connection between pathway strength and output value.
- After Gradient Descent, connections fade to light gray so parameter updates can be isolated visually.
- The focused output bundle changes first; the rest of the output-side bundles then settle to the next-pass strengths during backpropagation.
- Representative earlier-layer updates are highlighted, followed by the entire input→hidden layer settling to its updated weight strengths.
- After backpropagation, the pass number advances; the next forward pass reveals how the changed parameters alter hidden activations and outputs.
- Pass 5 is the final trained-state forward pass; no unnecessary learning/backpropagation follows.

The visualization is deliberately conceptual. Controlled output interpolation guarantees a clear five-pass learning story, while synthetic parameter updates provide a believable visual account of changing internal pathways without claiming to be a full numerical trainer.

Startup URL parameters (optional):
- ?pass=5 opens Pass 5, ready for forward propagation. Values 1–5 are supported.
- ?autoNext=1 triggers Next Step once after startup (also accepts true).
- ?pass=5&autoNext=1 combines both: opens Pass 5 and runs its forward propagation.
- Missing or invalid pass values default to Pass 1. Without autoNext, playback waits for you.
