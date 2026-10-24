# NNML Lab

An interactive lab for Intro to AI students. It teaches how a neural network produces an answer (Part 1) and how it learns (Part 2), always building on one hand-built 8–10–10 handwritten-digit network.

Plain HTML, CSS and JavaScript. No libraries, no build step, no server. Built for Chrome on Chromebooks at 1280×800, and checked at 1280×720, 1366×768 and 1920×1080.

## Deploy (GitHub Pages)

1. Copy this folder into the IntroToAI repo as `NNMLLab/`. You need `index.html`, `styles.css`, `js/` and `data/`. `build/` and `test/` are optional.
2. Commit and push. The app is then at `https://gkozak1.github.io/IntroToAI/NNMLLab/`.
3. Any step opens directly by its code, for example `.../NNMLLab/#M4.3`.

## What's inside

| Part | Experience | Steps |
| --- | --- | --- |
| 1 Neural networks | N1 Watch it read | 8 |
| | N2 Inside a neuron | 6 |
| | N3 Networks as matrices | 8 |
| | N4 Break it | 6 |
| | N5 Other problems, other shapes | 5 |
| 2 Machine learning | M1 Why learn? | 5 |
| | M2 The training cycle | 7 |
| | M3 Close-up: forward pass & error | 6 |
| | M4 Close-up: backprop & gradient descent | 7 |
| | M5 Every connection | 5 |
| | M6 Does it really work? | 6 |

Controls:
- **Predict** (switch in the step row, or the P key) turns Predict first on or off. On: prediction chips appear, and where a chip's answer would otherwise be on screen, that answer stays blurred in place until the class answers or presses Skip (nothing moves). Off: no chips, everything shown. Remembered in the browser; on by default.
- **Concept | How it works** switches between pictures and plain words, and the same pictures with the full arithmetic. The setting is remembered.
- Each step has a code (for example M4.3), shown beside the player.
- **☰ Contents** lists every step; **ⓘ** shows About.
- **Reset** returns the current experience to its starting example.
- Keyboard: ← and → move between steps; the space bar plays or pauses.

## Where the numbers come from

| What | Source |
| --- | --- |
| Hand-built network, the 10 example digits | The existing Be the Network data (same images, weights and rule) |
| "Hand-built gets 9% of 60,000 real digits"; "at most 46% with 8 on/off inputs" | Measured on the MNIST training set (`build/make_data.py`) |
| Four trained digit readers (46%, 91%, 95.5%, 97.6%) | Trained with numpy on 50,000 MNIST digits; chosen on a 10,000-digit practice set, scored once on the 10,000-digit test set. The browser runs the same 8-bit weights and reproduces the offline predictions. |
| The Learner (Part 2) | Real 8-10-10 network: sigmoid hidden layer, plain score outputs, squared error, batches of 5. Trained on 250 real MNIST images; the close-up uses a real snapshot after 30 epochs. M2 trains it live in the browser. |
| Close-up worksheet (M3–M5) | Calculated live. Values are shown to 3 decimals, and each displayed value feeds the next, so calculator work matches. The close-up gradient equals the full network's backprop gradient exactly (checked in `test/engine-test.js`). |
| Overtraining curves (M6) | Real numpy runs of a 784-64-10 network on narrow and varied MNIST samples |
| Photo classifier (N5) | Real 3072-64-10 network trained on 3,596 CIFAR-10 photos; 39.6% on 1,000 unseen photos |
| Delivery-time and "Late?" models (N5) | Real 4-8-1 networks trained on a made-up delivery dataset, labeled as made up in the app |

Animations, such as the dots travelling along wires and the worker time steps, are illustrations and show no numbers.

## Rebuilding the data

```
cd build
python3 make_data.py     # MNIST files in build/mnist/
python3 make_photo.py    # CIFAR-10 sample photos in build/cifar/
```

## Tests

```
cd test
node engine-test.js      # math checks against the rules and the offline models
node sweep.js 1280 720   # every step in both modes: errors, overflow, NaN/undefined text, direct links, predictions
```

## Colors (Oct 19 consistency pass)

- **Blue = up / pushes up, orange = down / pulls down**, everywhere: weight signs, weight chips and meter blocks, the signed-error arrows (M2–M5), output-score arrows, gradients (M2.4) and weight changes (M5.2–M5.3).
- **Green = on / fired / correct / target**, and the **training** data and curves. **Pink = test cards and the final exam** (M1.5, M6). Amber = practice test.
- Training cycle (M1.1 loop, M2, M5.5): forward propagation slate blue, error purple (also squared-error squares and error curves), backpropagation dark gray, gradient descent pink.
- Purple accent: buttons, focus and the hand-built network's tag. The Learner keeps its own pink tag.

## Predict first stops

Chips that hold back their answer: N4.2 (60,000-digit results), N5.2 (photo results, new), N5.3 (regression label), M1.4 (the stairs explanation), M3.2 (targets), M3.4 (error arrows), M4.3 (votes), M6.3 (test-error curve, new). The other chips ask about something not yet on screen, or ask students to apply a rule shown in the caption. M5.1's Predict first card and M6.2's flip already worked this way; with the switch off, M5.1 shows its numbers straight away.
