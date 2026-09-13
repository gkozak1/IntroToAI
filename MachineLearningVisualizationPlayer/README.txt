Machine Learning Visualization Player — v2

Open index.html in a modern browser. The app is fully local and dependency-free.

Default example: Recognize 4
Examples: Recognize 4 and Recognize 9
Passes: 1 through 5
Pass 5 is the final trained state; learning/backprop controls are disabled there.

The app draws the visualization directly in SVG for crisp lines and smooth playback rather than playing pre-rendered GIFs.

Top-row controls:
- Recognize 4 / Recognize 9
- Pass 1–5
- Speed slider (0.4x–2.0x)
- Previous Step / Next Step
- Pause / Resume during animation
- Complete Forward
- Complete Learning
- Complete Backward
- Full Pass
- Full Training

Behavior notes:
- Selecting either number returns to Pass 1 and shows Model inception.
- The stage name and explanation appear directly above the visualization.
- Completing backpropagation automatically advances the pass number.
- Full Training continues from the current stage/current pass through Pass 5; it does not restart at Pass 1.
- During Gradient Descent, the tangent is drawn/moved concurrently with the blue error curve.

Keyboard:
- Right Arrow: next step
- Left Arrow: previous step
- Space: pause/resume while an animation is running
