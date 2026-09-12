# Be the Network — In-Class Neural Net (companion notes)

A single self-contained HTML file. No internet, server, or AI needed at runtime —
works offline on Chromebooks and drops straight onto GitHub Pages
(e.g. `gkozak1.github.io/IntroToAI/NeuralNetExercise/`). Everything (all ten
images, both weight matrices, all logic) is embedded.

## What it does (matches the printed exercise, Steps 1–6)
- Secretly picks one of your 10 MNIST digits. The student never sees the whole image.
- **Step 1 – Inputs:** reveal one 14×7 region at a time ("random region", "choose I1–I8",
  or "enter remaining counts for me"). Count the ⊙ dots, then apply the 5+ → 1 rule.
  Raw pixel count and the threshold are kept as separate steps on purpose.
- **Steps 2–3 – Hidden:** click a hidden neuron to isolate its two incoming connections
  and weights; enter each contribution (a × w), the sum z, then the activation a.
- **Steps 4–5 – Output:** same interaction, now with the negative (inhibitory) weights
  shown as dashed red connections that subtract from z.
- **Step 6 – Prediction:** the one output that fires is revealed; "Reveal image & check"
  shows the assembled 2×4 image so students confirm the network.
- "See full image" is available at any time, behind a warning, and never alters work.
- Wrong entries show a hint, never propagate forward, and unlock a "Show" fallback after a miss.

## Fast-forward controls (for projection or checking)
- **A persistent "Enter the remaining ___ layer values for me" button** sits in every
  level's panel — Input, Hidden, and Output — and fills the rest of *that* layer. It
  greys out once the layer is complete.
- **Click any stage tab** (Inputs / Hidden / Output / Prediction) to fill everything
  needed to *begin* that stage and jump there: "Hidden layer" fills the input values,
  "Output layer" fills inputs + hidden, "Prediction" completes the whole network.
- **The inspector auto-advances**: the moment a whole layer is finished — by stepping
  through its neurons or by "Enter the remaining…" — the right-hand panel moves to the
  next stage on its own, as if you'd clicked the newly-highlighted stage tab.
- **"Complete all remaining"** (top bar) computes every remaining z and a across all
  layers and highlights the single output the network fires — its z│a turns green and
  its DIGIT tab lights up. The button then becomes "Show prediction" to re-open the result.

## Fidelity to your materials (verified)
- **Images:** exact MNIST training indices from your answer key
  (0→2955, 1→993, 2→1894, 3→2203, 4→2338, 5→417, 6→2556, 7→141, 8→333, 9→20562),
  each shifted up 2 rows, pixels ≥ 50% dark marked with a dot.
- **Per-region dark counts reproduce your "Pixel Counts" sheet exactly**
  (e.g. Digit 0 = 1, 23, 19, 16, 20, 17, 10, 1).
- **Weights are your "Weight Matrices" sheet exactly** — 10 adjacent-pair hidden
  detectors (H1=I1+I2 … H10=I6+I8) and your hidden→output matrix including every −0.5.
- **Activation** z < 1 → a = 0, z ≥ 1 → a = 1; all biases 0.

## Automated verification run before delivery
- Embedded self-test classifies all 10 digits correctly (badge shows "✓ 10/10").
- Full headless solve of all 10 digits: each lights exactly the correct output digit.
- Safeguards confirmed: wrong-answer feedback, no forward propagation of wrong values,
  "Show" fallback after a miss, and work preserved after revealing the full image.

If you'd like the app to mirror a *different* weight set later, the network lives in the
two matrices at the top of the embedded data object — swap them and the self-test will
re-check consistency on load.
