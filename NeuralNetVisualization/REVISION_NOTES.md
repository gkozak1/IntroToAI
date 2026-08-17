# Revision Notes — August 17, 2026

These decisions supersede the corresponding behavior in the original base specification for this build.

1. **Default example**: the named 3 → 4 → 3 → 2 default is fixed and repeatable. `Generate Values` is the explicit randomization control.
2. **Header**: title is `Neural Net Visualization and Calculation`; architecture selectors and action buttons are consolidated beneath it to reduce vertical space.
3. **Simplification**: Biases can be switched OFF without erasing stored biases; effective bias becomes 0. Activation can be switched OFF; then `a = z`.
4. **Guidance**: LOW / MEDIUM / HIGH replaces the previous ON/OFF model. LOW is default; MEDIUM highlights relationships without solving the selected result; HIGH completes values.
5. **Diagram practice dependency**: in MEDIUM/LOW, selecting a neuron automatically displays correctly calculated prior layers. The selected neuron remains unsolved. A student does not have to manually calculate every previous layer before selecting a later neuron.
6. **Matrix Math layout**: vectors and matrices use a constrained responsive grid so wide cases do not overlap or require horizontal scrolling at supported classroom widths.
