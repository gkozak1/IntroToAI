# Third-Party Notices

## Transformers.js

The app imports `@huggingface/transformers` version `3.8.1` from jsDelivr at runtime. Transformers.js and its dependencies are governed by their upstream licenses.

Project documentation: https://huggingface.co/docs/transformers.js/

## SmolLM2 ONNX models

The app requests these models from the Hugging Face Hub:

- `onnx-community/SmolLM2-360M-ONNX`
- `onnx-community/SmolLM2-135M-ONNX`

The 360M model card identifies an Apache-2.0 license. Model use remains subject to the model repositories' current license terms and notices.

Model repository: https://huggingface.co/onnx-community/SmolLM2-360M-ONNX

## No bundled model weights

This repository does not redistribute model weights. The browser downloads them directly from the Hugging Face Hub when the Real Browser Model is first used.
