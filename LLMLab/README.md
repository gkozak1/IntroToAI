# LLM Lab

Open `index.html` (host the folder next to `LLMVisualization`; links like `LLMLab/#tokens` work).

- `index.html`, `styles.css`, `js/` — the app. `js/main.js` is the shell (sentence with colored bubbles, temperature, Top-K, six lesson tabs and their sub-tabs, What to do line); `js/experience.js` is tab 1 (class guesses vs GPT-2, Generate); `js/language.js` is tab 2's tokenization examples, Split into tokens and Token IDs; `js/context.js` is tab 3's context examples, Guess and Attention; `js/ctx2.js` is Q·K·V, The block stack and Context changes meaning; `js/stations-a.js` has Next Word, Tokens, IDs, Embeddings; `js/stations-b.js` has Transformer / Attention, Logits, Probabilities / Pick, Repeat; `js/live.js` loads GPT-2.
- `data/lab-data.js` (3.4 MB) is the preloaded pack: stored sentences, their attention, full next-word scores, training runs. `data/embed-data.js` holds the tokenizer and the meaning-space data.
- `data/emb4.js` (23 MB) is not needed at start. It loads in idle time (it holds the embedding row for every one of the 50,257 tokens).
- GPT-2 itself (the same 63 files and browser cache as LLMVisualization / Next-Token Explorer) downloads quietly in idle time. The model only starts when a tab needs a sentence that is not stored.
- Options: `index.html?text=Your sentence#tokens` opens a tab with a sentence.
- `build/` rebuilds the data pack (needs the GPT-2 weights). `parking/` holds the side trips taken out of the interface (Training, Other models, Hardware, Simulate an LLM).

- Links: `#experience`, `#numbers/split`, `#context/attn`, `#pick/draw`, `#whole/side`, `#learning`. Old links (`#tokens`, `#repeat` …) still work.
- `data/context-data.js` (1 MB, loaded only when The block stack or Context changes meaning opens) holds real GPT-2 numbers computed block by block for the context examples: what GPT-2 would guess after each block, every token's vector after each block, and the meaning-meter scores. `build/context_pre.py` rebuilds it from the GPT-2 weights.
