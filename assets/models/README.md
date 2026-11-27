# Models

Served from this site (assets/js/tf.js sets Transformers.js to local models only).

- `Xenova/all-MiniLM-L6-v2` (q8): sentence embeddings for the chat, the console and the map search. Apache 2.0
  (sentence-transformers/all-MiniLM-L6-v2, ONNX export by Xenova).
- `Xenova/clip-vit-base-patch32` (vision tower, q8): "show it an image". MIT (OpenAI CLIP, ONNX export by Xenova).

The files are the ones Transformers.js asks for (config, tokenizer or preprocessor config, onnx/*_quantized.onnx),
from https://huggingface.co/<model>/resolve/main/.
