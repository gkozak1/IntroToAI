# Third-party notices

## Transformer Explainer

This application interoperates with and fetches GPT-2 model assets from Transformer Explainer:

- Project: Transformer Explainer — Interactive Learning of Text-Generative Models
- Repository: https://github.com/poloclub/transformer-explainer
- Copyright (c) 2022 Polo Club of Data Science
- License: MIT

MIT License

Copyright (c) 2022 Polo Club of Data Science

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Liquid AI LFM2.5-350M

The modern mode fetches the official `LiquidAI/LFM2.5-350M-ONNX` Q4 model and tokenizer files from Hugging Face. The model is released under the LFM Open License v1.0. Review and retain the upstream license and attribution requirements when redistributing or modifying model files:

- Model: https://huggingface.co/LiquidAI/LFM2.5-350M
- ONNX model: https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX
- License: https://www.liquid.ai/lfm-license

The model files are fetched at runtime and are not included in this repository.

## ONNX Runtime Web

The production app loads ONNX Runtime Web 1.23.0 from jsDelivr, using its WASM and WebGPU browser bundles. ONNX Runtime is an open-source Microsoft project. Refer to its upstream repository for license and notices:

https://github.com/microsoft/onnxruntime

## Transformers.js and tokenizers

The production app loads `@huggingface/transformers` 4.0.0 from jsDelivr. It fetches tokenizer assets for `Xenova/gpt2` and `LiquidAI/LFM2.5-350M-ONNX` from Hugging Face. Refer to the upstream project and model pages for applicable licenses and notices:

- https://github.com/huggingface/transformers.js
- https://huggingface.co/Xenova/gpt2
- https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX

## GPT-2

The GPT-2 neural-network weights are packaged/exported by Transformer Explainer. GPT-2 was released by OpenAI. The app does not call a paid OpenAI API or another paid inference API.
