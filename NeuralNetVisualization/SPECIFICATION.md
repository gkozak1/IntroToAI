# Neural Net Visualization

## Complete Functional, Instructional, and Technical Specification

### Purpose of this document

This specification is intended to be self-contained. It should be possible to paste the entire document into a new ChatGPT conversation and ask ChatGPT to design or rebuild the application without needing access to the prior conversation.

The application is an instructional tool for high-school students learning how forward propagation works in a simple fully connected neural network.

The application should **not** try to teach everything about neural networks. Its purpose is narrowly focused on helping students understand the relationship among:

1. **Calculating neuron values from a neural-network diagram**
2. **Mapping that neural-network diagram into vectors and matrices**
3. **Using matrix mathematics to calculate the same neuron values more systematically**

The central instructional idea is:

> **The neural-network diagram and the matrix representation are two views of the same calculation.**

The student should ultimately understand that calculating an individual neuron from incoming connections and calculating a matrix dot product are not different processes. The matrix notation is simply a cleaner and more scalable way to organize the same calculations.

---

# 1. Core Instructional Model

The application teaches **one forward-propagation process in two representations through three instructional steps**.

## Two representations

### Neural Network Diagram

A visual representation containing:

- Input neurons
- Hidden Layer 1
- Hidden Layer 2
- Output Layer
- Connections
- Weights
- Biases
- Pre-activation neuron values (z)
- Activated neuron values (a)

### Matrix Representation

The same network represented mathematically using:

- Activation vectors
- Weight matrices
- Bias vectors
- Pre-activation (z) vectors
- Activated (a) vectors

The student should gradually discover that the information contained in the diagram and matrices is identical.

---

# 2. The Three Instructional Steps

The top-level student workflow should contain exactly three major steps:

### Step 1 — Calculate the Diagram

**Question:** How does a neuron calculate its value?

### Step 2 — Map to Matrices

**Question:** Where does everything in the diagram go in matrix form?

### Step 3 — Matrix Math

**Question:** How does matrix multiplication perform the same calculations more cleanly?

These should be prominent sequential navigation controls, for example:

**1. DIAGRAM → 2. MAP TO MATRICES → 3. MATRIX MATH**

Do not organize the application as separate "Network," "Matrix," and "Dot Product" tools.

Dot products are part of **Matrix Math**, not a separate representation or major screen.

---

# 3. Pedagogical Progression

The student should experience the following intellectual progression.

## Stage 1

They learn to calculate:

[
z\_j =
a\_1w\_{1j}
\+
a\_2w\_{2j}
\+
\ldots
\+
a\_nw\_{nj}
\+
b\_j
]

and then:

[
a\_j=ReLU(z\_j)
]

They should recognize that this calculation is manageable in a tiny network but becomes visually cumbersome as the number of neurons and connections increases.

This provides the motivation for matrices.

## Stage 2

They reorganize the same information into:

[
a^{(l-1)}, W^{(l)}, b^{(l)}
]

and learn the correspondence between diagram objects and matrix positions.

They are **not yet doing matrix arithmetic**.

## Stage 3

They calculate:

[
z^{(l)}=a^{(l-1)}W^{(l)}+b^{(l)}
]

and then apply the activation function element-by-element:

[
a^{(l)}=ReLU(z^{(l)})
]

The student should recognize:

> The value produced by one dot product plus its bias is exactly the same (z) value I previously calculated by following the lines entering one neuron.

---

# 4. Network Architecture

The application should use exactly four layers:

1. Input Layer
2. Hidden Layer 1
3. Hidden Layer 2
4. Output Layer

The two hidden layers are intentional.

They mirror the two-hidden-layer structure used in the course's handwritten-number-recognition example and, more importantly, allow students to see this repeating pattern:

[
z^{(1)}
\rightarrow
a^{(1)}
\rightarrow
z^{(2)}
\rightarrow
a^{(2)}
]

This makes it clear that the activated value from one layer becomes the value used as input to the next layer.

## Default architecture

[
\boxed{3\rightarrow4\rightarrow3\rightarrow2}
]

Specifically:

- Input Layer: 3 neurons
- Hidden Layer 1: 4 neurons
- Hidden Layer 2: 3 neurons
- Output Layer: 2 neurons

## Maximum size

Every layer should allow:

[
1-4\text{ neurons}
]

Maximum possible network:

[
4\rightarrow4\rightarrow4\rightarrow4
]

Do **not** allow five neurons per layer.

Four is sufficient to demonstrate increasing complexity while keeping the diagram and matrices readable.

The application should not contain a "Chapter 15" preset button. The default 3→4→3→2 configuration already corresponds to the desired instructional example.

---

# 5. Mathematical Convention

The application must use one consistent matrix orientation throughout.

Use **row vectors**.

For a transition from a layer containing (m) neurons to a layer containing (n) neurons:

[
a^{(l-1)}
]

has dimensions:

[
1\times m
]

The weight matrix:

[
W^{(l)}
]

has dimensions:

[
m\times n
]

The bias vector:

[
b^{(l)}
]

has dimensions:

[
1\times n
]

Therefore:

# [ (1\times m)(m\times n)+(1\times n)

(1\times n)
]

The forward calculation is:

# [ \boxed{ z^{(l)}

a^{(l-1)}W^{(l)}
\+
b^{(l)}
}
]

and:

# [ \boxed{ a^{(l)}

f(z^{(l)})
}
]

For ReLU:

# [ \boxed{ a^{(l)}

# ReLU(z^{(l)})

\max(0,z^{(l)})
}
]

ReLU is applied **element-by-element**.

ReLU is **not** a dot product.

---

# 6. Weight-Matrix Orientation

This relationship must remain consistent throughout the entire interface.

If:

[
w\_{ij}
]

represents a connection from:

**source neuron (i)**

to:

**destination neuron (j)**

then that value goes in:

[
W\_{ij}
]

Consequently:

> **All weights entering destination neuron (j) appear in column (j) of the weight matrix.**

Example:

If Hidden Layer 1 neuron 2 is selected, the matrix representation should associate that neuron with:

[
\text{column 2 of }W^{(1)}
]

and:

[
b\_2^{(1)}
]

This correspondence is one of the most important concepts in the entire application.

---

# 7. Neuron Representation

Input neurons contain only an activated/input value:

[
a\_i^{(0)}
]

Non-input neurons should visually distinguish two values.

### Left/first portion

[
z\_j
]

The value after:

- weighted inputs are summed
- bias is added

but **before activation**.

### Right/second portion

[
a\_j
]

The value after applying the activation function.

A non-input neuron should therefore visually communicate:

[
\boxed{z\_j\mid a\_j}
]

The exact styling can vary, but students must clearly perceive two related values.

Connections leaving a neuron represent its **activated (a) value**, not its (z) value.

This distinction should be reinforced visually.

---

# 8. Biases

Bias is a **per-destination-neuron value**.

Every non-input neuron has its own bias:

[
b\_j
]

Biases should not be represented as one shared layer-level value.

Bias values may be:

- positive
- negative
- zero

The system should not imply that biases are normally or necessarily negative.

---

# 9. Activation

The default activation function should be:

## ReLU

[
ReLU(z)=\max(0,z)
]

This should be the activation used in the standard teaching workflow.

A secondary configuration option may eventually support:

- Linear / None
- ReLU
- Sigmoid
- Tanh

If alternative activations are included, they must not clutter the basic interface.

ReLU should always be the initial/default setting.

The application should make clear that ReLU changes a **negative pre-activation value** to zero.

Do not describe ReLU as eliminating negative weights.

Example:

[
z=-0.5
]

becomes:

[
a=ReLU(-0.5)=0
]

while the original weights remain unchanged.

---

# 10. Generated Numbers

The application should be designed for learning arithmetic rather than mathematical drudgery.

Default generated examples should therefore use:

- Small input values
- Simple integer or one-decimal values
- Simple one-decimal weights
- Simple one-decimal biases

Avoid values such as:

`0.37482`

or calculations that produce ugly long decimals.

Preferred weights might resemble:

`-0.7, -0.4, -0.2, 0.1, 0.3, 0.5, 0.8`

Inputs might resemble:

`1, 2, 4`

Generated networks should preferably include at least one neuron whose:

[
z<0
]

so students can observe ReLU changing that value to zero.

All calculations should use internally precise values but displayed answers should avoid floating-point artifacts such as:

`1.7000000000000002`

---

# 11. Network Configuration

The application needs a compact setup area.

It should allow the user to select:

- Number of Input neurons: 1–4
- Hidden Layer 1 neurons: 1–4
- Hidden Layer 2 neurons: 1–4
- Output neurons: 1–4
- Activation function, if alternative activations are implemented

Default:

**3 / 4 / 3 / 2**

Controls should include:

### Build Network

Rebuild the network using the selected architecture.

### Generate Values

Generate a new instructional set of:

- inputs
- weights
- biases

### Edit Values

Allow manual editing of:

- input values
- every connection weight
- every bias

The user must be able to override automatically generated values.

### Reset Work

Clear student answers while retaining the architecture and network parameters.

A separate **Chapter 15** button should not exist.

---

# 12. Overall Interface Philosophy

Each instructional step should show **only what is needed for that step**.

Do not create one giant dashboard containing every representation simultaneously.

The guiding rule is:

| StepPrimary visual |                                                |
| ------------------ | ---------------------------------------------- |
| Diagram            | Neural-network diagram only                    |
| Mapping            | Diagram + matrices                             |
| Matrix Math        | Matrices/calculation + small diagram reference |

This intentional change in visual emphasis helps students focus on the intellectual task currently being learned.

---

# 13. STEP 1 — CALCULATE THE DIAGRAM

## Purpose

Teach students how individual neurons calculate:

[
z
]

and then:

[
a
]

without introducing matrix notation yet.

## Screen content

Show the neural-network diagram essentially full width.

Do **not** show:

- matrices
- matrix dimensions
- matrix multiplication
- dot-product diagrams

The student should concentrate exclusively on the network.

---

# 14. Diagram — Beginner Mode

Beginner Diagram mode is a **worked example/exploration mode**.

The diagram should be completely calculated.

Display:

- Input (a) values
- Weights
- Biases
- Every (z) value
- Every resulting (a) value

The student can click values to investigate their relationships.

## Clicking a (z) value

If the student clicks:

[
z\_j
]

highlight:

- all prior-layer (a) values used
- all incoming connections
- all incoming weights
- the neuron's bias
- the selected (z\_j)

Unrelated parts of the network should become visually quieter.

The system should show the actual formula.

Example:

# [ z\_2

(1)(0.2)
\+
(2)(0.6)
\+
(4)(0.2)
\+
(-0.5)
]

then:

[
\=.2+1.2+.8-.5
]

then:

[
\=1.7
]

## Clicking an (a) value

Highlight:

- the corresponding (z)
- the activated (a)

Show:

[
a\_2=ReLU(z\_2)
]

and:

[
a\_2=ReLU(1.7)=1.7
]

If:

[
z\_2=-0.5
]

show:

[
a\_2=ReLU(-0.5)=0
]

---

# 15. Diagram — Advanced Mode

Inputs, weights, and biases remain visible.

Derived values are blank:

[
z=?
]

[
a=?
]

Students calculate the network themselves.

## Selecting blank (z\_j)

Highlight:

- prior-layer activated values
- incoming weights
- bias
- target (z\_j)

Do not reveal the answer.

The student enters the calculated (z).

## Selecting blank (a\_j)

Highlight:

- corresponding (z\_j)
- activation relationship

Student calculates:

[
a\_j=ReLU(z\_j)
]

and enters the value.

---

# 16. Forward-Propagation Dependency

Students may calculate neurons within the same layer in any order.

For example, all four Hidden Layer 1 neurons can be calculated independently.

However, Hidden Layer 2 should not become available for calculation until the required activated values of Hidden Layer 1 are complete.

Likewise, Output cannot be calculated until Hidden Layer 2 is complete.

This reinforces:

> Neurons within one layer can be calculated in parallel, but the next layer depends upon the completed activated values of the preceding layer.

The interface should make this dependency clear without excessive explanation.

---

# 17. STEP 2 — MAP TO MATRICES

## Purpose

Teach students how the information already visible in the diagram is represented mathematically.

The key question is:

> **Where does each thing in the diagram go in matrix form?**

This is a mapping exercise, **not a matrix-calculation exercise**.

---

# 18. Mapping Screen Layout

Show:

### Left side

The completed neural-network diagram.

### Right side

Matrix structures for one layer transition at a time.

Approximate emphasis:

**Diagram 50–60%**

**Matrix mapping 40–50%**

Do not display dot-product calculations.

Do not display expanded arithmetic expressions.

---

# 19. Layer Transition Selector

Mapping should concentrate on **one adjacent-layer transition at a time**.

The student should be able to work through:

### Input → Hidden Layer 1

[
a^{(0)}, W^{(1)}, b^{(1)}
]

### Hidden Layer 1 → Hidden Layer 2

[
a^{(1)}, W^{(2)}, b^{(2)}
]

### Hidden Layer 2 → Output

[
a^{(2)}, W^{(3)}, b^{(3)}
]

The entire network may remain visible, but the active transition should be visually emphasized.

---

# 20. What Students Map

For the selected transition, students map:

### Prior-layer activated values

[
a^{(l-1)}
]

### Connection weights

[
W^{(l)}
]

### Destination-neuron biases

[
b^{(l)}
]

Do **not** have students calculate (z) or the next (a) vector during Mapping.

The resulting vectors may be shown as conceptual placeholders:

[
z^{(l)}=[?]
]

[
a^{(l)}=[?]
]

but these are calculated in Step 3.

This gives each step a clean instructional boundary.

---

# 21. Mapping — Beginner Mode

The diagram is complete.

The matrices begin empty.

Students fill the matrix/vector cells themselves.

Guidance tells students **where information belongs**, but does not automatically provide the answer.

## Example interaction

Student selects Hidden Layer 1 neuron 2.

The diagram highlights:

- source activation values
- the weights entering neuron 2
- bias 2

The matrix representation highlights:

- relevant activation-vector cells
- column 2 of the weight matrix
- bias position 2

The cells remain blank.

The student must copy/map the values correctly.

This distinction is important:

> **Highlighting tells the student where to look, not what answer to enter.**

---

# 22. Mapping Individual Weights

If a particular edge is selected, for example:

[
a\_2^{(0)}
\rightarrow
z\_3^{(1)}
]

with weight:

[
-0.7
]

the interface should emphasize:

### Diagram

that exact connection

### Matrix

the corresponding:

[
W\_{2,3}^{(1)}
]

This precise correspondence should work in both directions.

Click matrix cell:

[
W\_{2,3}
]

and the corresponding edge should highlight.

Click that edge and:

[
W\_{2,3}
]

should highlight.

This is a critical instructional feature.

---

# 23. Mapping — Advanced Mode

Advanced Mapping presents:

- completed diagram
- empty matrices

but provides **no mapping highlights**.

Students must independently determine:

- which diagram values belong in the activation vector
- which weights belong in which matrix rows/columns
- which bias belongs in which bias-vector position

This tests actual understanding of the representation rather than the student's ability to follow highlighting.

---

# 24. STEP 3 — MATRIX MATH

## Purpose

Students now use the matrix representation to reproduce the same (z) and (a) values previously calculated from the diagram.

The matrices should be the dominant visual representation.

The student should think:

> **How does this compact representation perform the same neuron calculation?**

---

# 25. Matrix Math Screen Layout

### Primary area

Large matrix workspace.

### Secondary area

A smaller neural-network diagram used as a visual reference.

Approximate emphasis:

**Matrix Math: 70–80%**

**Diagram reference: 20–30%**

The diagram should reinforce connections but should no longer compete for attention.

---

# 26. Matrix Math Representation

For a selected transition, display:

# [ a^{(l-1)} \cdot W^{(l)} + b^{(l)}

z^{(l)}
]

followed by:

# [ a^{(l)}

ReLU(z^{(l)})
]

The dimensions should be visible in a subtle instructional manner.

Example for 3 → 4:

# [ \underset{1\times3}{a^{(0)}} \cdot \underset{3\times4}{W^{(1)}} + \underset{1\times4}{b^{(1)}}

\underset{1\times4}{z^{(1)}}
]

Then:

# [ a^{(1)}

ReLU(z^{(1)})
]

---

# 27. Matrix Math — Starting State

The mapping is already complete.

Therefore display populated:

- activation vector
- weight matrix
- bias vector

but blank:

- (z) result vector
- activated (a) result vector

Example:

# [ a^{(0)}

[1\quad2\quad4]
]

# [ W^{(1)}

\begin{bmatrix}
.1&.2&-.3&.4\\
.5&.6&-.7&.8\\
.1&.2&.3&-.4
\end{bmatrix}
]

# [ b^{(1)}

[\ldots]
]

while:

# [ z^{(1)}

[?\quad?\quad?\quad?]
]

and:

# [ a^{(1)}

[?\quad?\quad?\quad?]
]

---

# 28. Matrix Math — Beginner Mode

## Calculating (z\_j)

The student clicks an empty:

[
z\_j
]

The app highlights:

- the entire prior activation vector
- column (j) of the weight matrix
- bias (b\_j)
- destination (z\_j)

The compact reference network simultaneously highlights:

- destination neuron (j)
- its incoming connections
- the prior activated values feeding those connections

This provides a subtle visual bridge back to the diagram.

The student performs the calculation themselves.

Example:

[
[1\quad2\quad4]
]

with highlighted column:

[
\begin{bmatrix}
.2\\.6\\.2
\end{bmatrix}
]

and:

[
b\_2=-.5
]

The student determines:

[
z\_2=
(1)(.2)+(2)(.6)+(4)(.2)-.5
]

and enters the result.

---

# 29. Calculating Activation

After (z\_j) is available, the student can calculate:

[
a\_j
]

Clicking the empty (a\_j) highlights:

- corresponding (z\_j)
- ReLU relationship
- destination (a\_j)

Student calculates:

[
a\_j=ReLU(z\_j)
]

This is a separate operation from the dot product.

The visual sequence should be unmistakable:

[
a^{(l-1)}W^{(l)}+b^{(l)}
\rightarrow
z^{(l)}
]

then:

[
z^{(l)}
\rightarrow
ReLU
\rightarrow
a^{(l)}
]

---

# 30. Matrix Math — Advanced Mode

The same matrices and blank result cells are shown.

However, no operand highlighting is provided.

If the student wants to calculate:

[
z\_3
]

they must independently know to use:

- the prior activation vector
- column 3 of (W)
- bias 3

Likewise, they must know that:

[
a\_3=ReLU(z\_3)
]

without the interface highlighting that correspondence.

---

# 31. Beginner and Advanced Terminology

Conceptually, every step has:

### Beginner

Guidance provided.

### Advanced

Guidance removed.

The UI may implement this as:

**Guidance: ON / OFF**

instead of presenting six separate modes.

For example:

### Step 1 — Diagram

Guidance ON = worked/exploratory diagram
Guidance OFF = student calculates (z) and (a)

### Step 2 — Mapping

Guidance ON = mapping correspondence highlighted
Guidance OFF = no mapping highlighting

### Step 3 — Matrix Math

Guidance ON = required operands highlighted
Guidance OFF = no calculation highlighting

However, the terminology **Beginner / Advanced** is also acceptable if it proves clearer in classroom testing.

The essential requirement is the behavior, not the label.

---

# 32. Check My Work

Every stage containing student-entered answers must support:

## Check My Work

Feedback:

### Correct entered answer

Green highlight.

### Incorrect entered answer

Red highlight.

### Blank unanswered cell

Remain neutral.

Do not mark blank cells red.

Students should be allowed to correct wrong answers and check again.

Checking incorrect work should **not automatically reveal the correct answer**.

---

# 33. Checking Individual Answers

When practical, students should also be able to check one answer at a time.

Possible interaction:

- Enter value
- press Enter
- click a small check control
- or leave the field and explicitly select Check

Avoid an interface full of check buttons beside every cell.

A single **Check My Work** control should always exist.

---

# 34. Formula/Explanation Popups

Clicking a correctly calculated or already-provided calculated value should display its derivation.

## For (z\_j)

Show the complete numerical formula.

Example:

# [ z\_2

(1)(.2)
\+
(2)(.6)
\+
(4)(.2)
\+
(-.5)
]

[
\=.2+1.2+.8-.5
]

[
\=1.7
]

## For (a\_j)

Show:

[
a\_2=ReLU(z\_2)
]

[
\=ReLU(1.7)
]

[
\=1.7
]

These explanations should be compact popovers/panels rather than large modal dialogs when possible.

---

# 35. Blank-Answer Behavior

Clicking an unanswered value should **not reveal its numerical answer**.

In guided mode, it may:

- highlight the required information
- show the symbolic structure

For example:

# [ z\_j

\sum\_i a\_iw\_{ij}+b\_j
]

but should not evaluate it.

Once the student has correctly solved the value, the full numerical derivation can become available.

This prevents the instructional aid from becoming a "click for answer" system.

---

# 36. Highlighting Language

Avoid assigning every neuron or layer a different bright color.

Use one consistent highlighting system.

Suggested hierarchy:

### Strong highlight

The exact selected object.

### Medium highlight

Values directly needed to calculate or map it.

### Soft highlight

Supporting/contextual values.

### Muted

Unrelated objects.

For example, selecting:

[
z\_2
]

might produce:

| ElementEmphasis   |        |
| ----------------- | ------ |
| (z\_2)            | Strong |
| Incoming weights  | Medium |
| Bias (b\_2)       | Medium |
| Source (a) values | Soft   |
| Other neurons     | Muted  |

This highlighting language should remain consistent throughout all three steps.

---

# 37. Cross-Representation Highlighting

Cross-representation highlighting belongs primarily in:

## Mapping

and secondarily in:

## Matrix Math

It should not clutter Diagram mode.

Important relationships include:

[
\text{diagram connection}
\longleftrightarrow
W\_{ij}
]

[
\text{destination neuron}
\longleftrightarrow
\text{column }j
]

[
\text{destination bias}
\longleftrightarrow
b\_j
]

[
\text{destination }z\_j
\longleftrightarrow
\text{result vector cell }z\_j
]

[
\text{destination }a\_j
\longleftrightarrow
\text{activation vector cell }a\_j
]

These mappings should be exact and deterministic.

---

# 38. Forward Propagation Through All Layers

The same instructional pattern repeats.

## Transition 1

# [ a^{(0)}W^{(1)}+b^{(1)}

z^{(1)}
]

# [ a^{(1)}

ReLU(z^{(1)})
]

## Transition 2

# [ a^{(1)}W^{(2)}+b^{(2)}

z^{(2)}
]

# [ a^{(2)}

ReLU(z^{(2)})
]

## Transition 3

# [ a^{(2)}W^{(3)}+b^{(3)}

z^{(3)}
]

If ReLU is configured for the output layer:

# [ a^{(3)}

ReLU(z^{(3)})
]

The interface should make this repetition visually obvious.

One layer's:

[
a
]

becomes the next transition's:

[
a^{(l-1)}
]

This is a critical learning outcome.

---

# 39. Output Layer Activation

For the simplified educational model, using the same selected activation function on the output layer is acceptable and keeps the forward-propagation pattern consistent.

ReLU should therefore be the default throughout the application.

However, the application architecture should not hard-code the assumption that all real neural networks use ReLU outputs.

Future versions could distinguish:

**Hidden activation**

from:

**Output activation**

This distinction does not need to complicate the first version.

---

# 40. Network Visualization Requirements

The network should be drawn programmatically, preferably using SVG.

Do not use a static background image.

The network must dynamically support:

- 1–4 neurons per layer
- different values
- interaction
- edge highlighting
- neuron highlighting
- changing architecture
- changing weights
- blank/correct/incorrect states

The visual arrangement should contain four clear vertical columns:

**Input → Hidden 1 → Hidden 2 → Output**

Connections should be visible but visually restrained.

Weight labels must remain readable.

Avoid excessive:

- line styles
- colors
- arrows
- decorative effects

The diagram should prioritize comprehension over realism.

---

# 41. Weight Labels

Weights need to be available in Diagram mode because students need them to calculate neuron values.

Because the network is capped at four neurons per layer, displaying the weight values should remain manageable.

When a destination neuron is selected:

- its incoming connections should become more prominent
- their weight labels should become more prominent
- unrelated connection labels may fade

This focus behavior should reduce visual clutter without removing information.

---

# 42. Bias Display

Each non-input neuron should have its bias displayed close enough that the relationship is obvious.

The bias should not appear to belong to an edge.

A small bias chip or label near the destination neuron is appropriate:

`b = -0.5`

Selecting a neuron should emphasize its bias.

---

# 43. Formula Scale Connection

The application should support students eventually seeing three levels of the same mathematics.

### Whole layer

[
z=aW+b
]

### One neuron

[
z\_j=\sum\_i a\_iw\_{ij}+b\_j
]

### Actual numbers

[
z\_2=(1)(.2)+(2)(.6)+(4)(.2)-.5
]

These need not always appear simultaneously.

The interface should reveal the level appropriate to the instructional step.

---

# 44. Deliberate Complexity Limit

Do not add features merely because they are mathematically possible.

The application should avoid becoming:

- a general linear-algebra calculator
- a neural-network training tool
- an architecture playground
- a backpropagation simulator
- a loss-function visualizer
- a gradient-descent tool

Those are separate concepts.

This application focuses on:

[
\boxed{\text{forward propagation}}
]

through:

[
\boxed{\text{diagram → representation → matrix calculation}}
]

---

# 45. Explicit Non-Goals for Initial Version

Do not include:

- Backpropagation
- Gradient descent
- Loss functions
- Training
- Automatic weight adjustment
- Optimizers
- Batch processing
- Tensor notation
- Convolutional networks
- Transformer architecture
- GPU simulation
- Softmax unless later deliberately added
- General-purpose matrix calculator
- Gamification
- Lives
- Timers
- Scores
- Streaks

The objective is understanding, not game mechanics.

---

# 46. Student Experience Target

A student should be able to describe their experience this way:

### After Diagram

> “A neuron multiplies each previous value by its connection weight, adds those together, adds its bias, and then applies ReLU.”

### After Mapping

> “The layer values become a vector, the connections become a weight matrix, and each neuron's bias becomes part of a bias vector.”

### After Matrix Math

> “Multiplying the activation vector by one column of the weight matrix and adding its bias gives the exact same (z) value I got when I calculated that neuron from the diagram.”

### Final insight

> “Matrix multiplication isn't a different neural-network process. It's a cleaner way of organizing all of those neuron calculations.”

That final realization is the primary instructional success criterion.

---

# 47. Example Student Journey

Using the default:

[
3\rightarrow4\rightarrow3\rightarrow2
]

the student begins in Diagram mode.

They click Hidden Layer 1 neuron 1.

They see three incoming values and three weights.

They calculate:

[
z\_1
]

then:

[
a\_1=ReLU(z\_1)
]

They repeat one or two neurons.

They recognize that more connections make the picture increasingly cumbersome.

They proceed to Mapping.

They see the same network beside:

[
a^{(0)}
]

[
W^{(1)}
]

[
b^{(1)}
]

They discover that the weights entering Hidden Layer 1 neuron 1 are column 1 of:

[
W^{(1)}
]

They map the values.

They proceed to Matrix Math.

They click:

[
z\_1^{(1)}
]

The application highlights:

[
a^{(0)}
]

column 1 of:

[
W^{(1)}
]

and:

[
b\_1^{(1)}
]

They calculate the dot product plus bias.

The resulting number is exactly the number they previously obtained from the diagram.

They apply ReLU.

The resulting:

[
a\_1^{(1)}
]

becomes one of the values used to calculate Hidden Layer 2.

That cycle repeats.

---

# 48. Visual Design

The application should feel like a polished educational visualization rather than a software-development demo.

Design characteristics:

- Clean
- Spacious
- Calm
- High contrast
- Minimal visual clutter
- Modern browser interface
- Clearly differentiated instructional hierarchy
- Large enough mathematical values for classroom projection
- Usable on student Chromebooks

Avoid:

- excessive gradients
- unnecessary animations
- tiny labels
- dense toolbars
- too many simultaneously visible controls
- decorative visualization that does not teach something

---

# 49. Responsive Target

Primary usage:

- Desktop browser
- Chromebook
- Classroom projector

Design primarily for widths around:

`1200–1600 px`

The application should remain usable around:

`1024 px`

On very narrow/mobile screens, stacking sections is acceptable, but mobile is not the primary instructional target.

---

# 50. Animation

Animation should be restrained and functional.

Useful animation might include:

- a brief highlight when selecting a neuron
- a subtle transition when values become calculated
- a gentle visual transition when changing layer focus
- Mapping correspondence becoming visible

Avoid:

- animated particles flowing through connections
- continuous motion
- bouncing values
- long transitions

Animation should explain relationships, not entertain.

---

# 51. State Model

The JavaScript application should maintain a single underlying network model containing:

### Architecture

```
inputCount
hidden1Count
hidden2Count
outputCount

```

### Input activations

```
a0[]

```

### Weights

```
W1[][]
W2[][]
W3[][]

```

### Biases

```
b1[]
b2[]
b3[]

```

### Correct calculated values

```
z1[]
a1[]

z2[]
a2[]

z3[]
a3[]

```

### Student work

Separate student-entered values for:

- Diagram calculations
- Mapping cells
- Matrix Math calculations

Do not overwrite the authoritative correct values when the student enters an incorrect answer.

---

# 52. Interaction State

The interface should also track:

```
currentStep
guidanceLevel
selectedLayer
selectedNeuron
selectedValueType
selectedEdge
selectedMatrixCell

```

Possible:

```
selectedValueType = z | a | weight | bias

```

This allows synchronized highlighting without mixing instructional logic into the network's mathematical data.

---

# 53. Calculation Engine

All correct values must be computed programmatically from the network parameters.

For each layer:

```
for each destination neuron j:
    z[j] = bias[j]

    for each source neuron i:
        z[j] += a_previous[i] * weight[i][j]

    a[j] = activation(z[j])

```

For ReLU:

```
relu(z) = max(0, z)

```

The diagram and matrix calculations must use the **same underlying calculation engine** so they can never disagree.

---

# 54. Manual Editing

When Edit Values is enabled, users should be able to change:

- input activation
- weight
- bias

After one of these changes:

1. Recalculate all authoritative (z) and (a) values.
2. Clear or invalidate student work that depended on those values.
3. Redraw/update the network.
4. Update matrix representations.

Do not leave stale answers visible after changing parameters.

---

# 55. Build Network Behavior

The **Build Network** button must:

1. Read the selected architecture.
2. Construct a valid network.
3. Generate or preserve appropriate inputs/weights/biases.
4. Calculate authoritative correct values.
5. Reset student work.
6. Render the Diagram immediately.
7. Place the application in Step 1.

The default network should also render automatically on initial page load.

A user should never click Build Network and see an empty workspace.

---

# 56. Error Handling

The application should fail gracefully.

Examples:

- Blank manual value → indicate required input
- Invalid text → reject it
- Architecture outside 1–4 → prevent it through controls
- Floating-point display → format cleanly
- Missing state → regenerate safely

No JavaScript error should prevent the default network from appearing.

---

# 57. Technical Deployment Requirements

The final application must run entirely in a browser.

Deployment location:

```
IntroToAI/
    NeuralNetVisualization/

```

Expected GitHub Pages URL:

```
https://gkozak1.github.io/IntroToAI/NeuralNetVisualization/

```

No server-side component should be required.

---

# 58. Preferred Technology

Use:

- HTML
- CSS
- Vanilla JavaScript
- SVG for the neural-network visualization

Prefer no external dependencies.

The application should not require:

- Node
- npm
- React
- Vue
- Python
- Flask
- Streamlit
- database
- API
- model download
- server

It should work by deploying static files to GitHub Pages.

---

# 59. File Structure

At minimum:

```
NeuralNetVisualization/
│
├── index.html
├── styles.css
└── app.js

```

Optional documentation:

```
README.md
SPECIFICATION.md

```

No build process should be necessary.

---

# 60. Browser Compatibility

Target current versions of:

- Chrome
- Edge
- Chromebook Chrome

The app should function when served through GitHub Pages.

Do not depend on local filesystem access.

---

# 61. Accessibility and Readability

Important values should not rely on color alone.

Correct/incorrect states should combine color with:

- borders
- icons
- text state
- or another visual indication

Clickable areas should be large enough for student use.

Mathematical text should have strong contrast.

Hover states should not be required for essential functionality, because some Chromebook interaction may use touch.

---

# 62. Acceptance Criteria — Diagram

The Diagram step is complete when:

- Default 3→4→3→2 diagram renders correctly.
- Network supports any 1–4 / 1–4 / 1–4 / 1–4 architecture.
- All connections correspond to correct weights.
- Every non-input neuron has its own bias.
- (z) and (a) are visually distinct.
- Beginner view displays solved values.
- Advanced view allows students to enter (z) and (a).
- Selecting (z) highlights its mathematical inputs.
- Selecting (a) connects it to activation.
- Check My Work functions correctly.
- Correct formulas can be inspected.

---

# 63. Acceptance Criteria — Mapping

Mapping is complete when:

- Diagram and matrices appear together.
- One transition is displayed at a time.
- Student maps prior (a), (W), and (b).
- (z) and next (a) remain results for Step 3.
- Beginner highlighting identifies correspondence without filling answers.
- Advanced mode removes correspondence highlighting.
- Every edge maps to the correct matrix cell.
- Every matrix weight can map back to the correct edge.
- Bias mapping is correct.
- Check My Work accurately marks entered cells.

---

# 64. Acceptance Criteria — Matrix Math

Matrix Math is complete when:

- Matrix representation dominates the screen.
- Compact network reference remains available.
- Prior (a), (W), and (b) are populated.
- (z) and next (a) begin blank.
- Clicking (z\_j) in Beginner mode highlights:
  - prior activation vector
  - weight column (j)
  - bias (j)
  - destination neuron
- Student can calculate and enter (z\_j).
- Student can then calculate:
  [
  a\_j=ReLU(z\_j)
  ]
- Advanced mode supplies no operand highlighting.
- Correct formulas can be inspected after values are solved.
- Calculated matrix values correspond exactly with Diagram values.

---

# 65. Overall Acceptance Test

Use one fixed 3→4→3→2 network.

A tester should be able to:

1. Calculate a Hidden Layer 1 neuron from the diagram.
2. Identify the prior values, weights, and bias used.
3. Map those same numbers into a vector, weight-matrix column, and bias-vector cell.
4. Calculate the corresponding matrix dot product plus bias.
5. Obtain exactly the same (z) value.
6. Apply ReLU.
7. Obtain exactly the same (a) value.
8. See that (a) become part of the next layer's input.
9. Repeat the process for Hidden Layer 2.
10. Explain why matrices are more useful as networks become larger.

If the student can do those things, the application has achieved its core purpose.

---

# 66. Core Design Principle to Preserve During Future Changes

When considering any additional feature, ask:

> **Does this help the student understand the relationship between calculating a neural-network diagram, mapping it into matrices, and performing the same calculation using matrix math?**

If yes, consider it.

If not, leave it out.

The application should favor:

**focus over feature count**

**connection over decoration**

**practice over passive viewing**

**understanding over mathematical complexity**

and above all:

[
\boxed{
\text{Diagram}
\rightarrow
\text{Map}
\rightarrow
\text{Matrix Math}
}
]

with the student gradually realizing that these are not three unrelated mathematical activities, but three stages in understanding **the same neural-network forward propagation process**.