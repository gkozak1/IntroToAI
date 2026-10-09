# LLMLab (story version)

The high-level story of Chapters 23–30: how a machine finishes a sentence.
Act 1 Turn words into numbers (Guess · Tokens · Token IDs · Embeddings) · Act 2 Share context (Attention) · Act 3 Choose the next word (Logits · Probabilities · Repeat) · Epilogue (Training).
Each station has one headline sentence; Next ▶ steps through its beats. "Play the story" runs the whole thing.

Files: index.html, styles.css, js/ (core, live, meaning, story), data/pack.js (2.7 MB of real GPT-2 results for the textbook examples).
Put the LLMLab folder next to LLMVisualization in the IntroToAI repo. Link to any beat with #station.beat, e.g. LLMLab/index.html#attention.3

Live GPT-2 loads only when a student keeps adding words in Repeat past the stored rounds. It uses the same model files and browser cache as the Next-Token Explorer, so a Chromebook that has already loaded that app does not download again.

Not in this pass (by decision): side trips (Other models, Hardware, Simulate an LLM), diffusion, Deep Dives, lean self-hosted weights, the in-browser GPT-2 rebuild.
