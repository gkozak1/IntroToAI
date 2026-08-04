# Teacher Start Here

## Class 1 — Patterns and Repeated Prediction

**Goal:** Explain how patterns in training data help a model predict what comes next, and how repeated predictions can create a response.

Use the visible corpus to establish conditional probability, then branch one sentence in two directions. Stop at each teacher checkpoint before students continue.

## Class 2 — Context and Attention

**Goal:** Explain why earlier words change the next prediction and how attention allows different parts of the context to contribute differently.

Begin with the failure of simple frequency, compare the two `bank` contexts, use the context eraser, then introduce weighted contextual influence. Finish with a controlled real-model comparison.

## Class 3 — Tokens and Probability

**Goal:** Explain how a model represents text numerically and converts context-sensitive output into next-token probabilities.

Reveal tokens only after students understand the word-level idea. Connect small vectors and matrices to prior class work. Introduce logits as neural-network scores, then use SoftMax to create a shared probability distribution.

## Class 4 — Temperature and Selection

**Goal:** Explain how temperature and sampling select one token, then trace the complete generation loop.

Hold logits fixed while changing temperature. Hold temperature fixed while changing random `r`. Append the selected token and recalculate. Complete the three controlled real-model experiments before opening free exploration.

## Essential facilitation rule

At each checkpoint:

1. Ask students to state a prediction.
2. Discuss the reason for the upcoming experiment.
3. Let students reveal and manipulate the result.
4. Ask what changed and why.

The app creates shared evidence. The teacher turns that evidence into understanding.
