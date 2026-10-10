# LLMLab

Open `index.html` (host the folder next to `LLMVisualization`; links like `LLMLab/#tokens` work).

- `index.html`, `styles.css`, `js/` — the app. `js/main.js` is the shell (sentence, temperature, Top-K, tabs); `js/stations-a.js` has Next Word, Tokens, IDs, Embeddings; `js/stations-b.js` has Transformer / Attention, Logits, Probabilities / Pick, Repeat; `js/live.js` loads GPT-2.
- `data/lab-data.js` (3.4 MB) is the preloaded pack: stored sentences, their attention, full next-word scores, training runs. `data/embed-data.js` holds the tokenizer and the meaning-space data.
- `data/emb4.js` (23 MB) is not needed at start. It loads in idle time (it holds the embedding row for every one of the 50,257 tokens).
- GPT-2 itself (the same 63 files and browser cache as LLMVisualization / Next-Token Explorer) downloads quietly in idle time. The model only starts when a tab needs a sentence that is not stored.
- Options: `index.html?text=Your sentence#tokens` opens a tab with a sentence.
- `build/` rebuilds the data pack (needs the GPT-2 weights). `parking/` holds the side trips taken out of the interface (Training, Other models, Hardware, Simulate an LLM).
