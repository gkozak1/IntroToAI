# Matrix Math z-selection fix

Targeted change only: the second/lower z-vector display in Matrix Math is now selectable just like the primary z-result cells.

Browser simulation results:
- Medium Guidance, Input → Hidden 1: lower z selects correct Hidden 1 destination; incoming edges/weights highlight.
- Medium Guidance, Hidden 1 → Hidden 2: lower z selects correct Hidden 2 destination; incoming edges/weights highlight.
- Medium Guidance, Hidden 2 → Output: lower z selects correct Output destination; incoming edges/weights highlight.
- Primary/upper z inputs remain functional.
- Low Guidance continues to suppress diagram highlighting.
- No JavaScript runtime errors observed.

23/23 targeted checks passed.
