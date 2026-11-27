# Vendored: Transformers.js and ONNX Runtime Web

Served from this site so it makes no third-party requests (loaded by assets/js/tf.js).

- `transformers.min.js`: Transformers.js 4.3.1 by Hugging Face, Apache License 2.0 (LICENSE-transformers.txt).
- `ort-wasm-simd-threaded.{asyncify,jspi}.{mjs,wasm}`: ONNX Runtime Web 1.31.0-dev.20260914-8d85527a0 by Microsoft,
  MIT License. The browser picks one of the two builds.

To update: `npm i @huggingface/transformers@<v>`, then copy dist/transformers.min.js and the matching
onnxruntime-web dist/ort-wasm-simd-threaded.{asyncify,jspi}.{mjs,wasm} here.
