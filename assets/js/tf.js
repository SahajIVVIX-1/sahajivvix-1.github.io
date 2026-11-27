// Transformers.js, served from this site only: the library (assets/vendor/transformers/), its ONNX runtime (same
// folder) and the models (assets/models/). Remote models are switched off, so nothing is fetched from a CDN or from
// Hugging Face. Used by the chat engine (MiniLM), the map's semantic search (MiniLM) and "show it an image" (CLIP).
let ready = null;
export function loadTF() {
  return (ready ||= import('/assets/vendor/transformers/transformers.min.js').then((tf) => {
    tf.env.allowRemoteModels = false;
    tf.env.allowLocalModels = true;
    tf.env.localModelPath = '/assets/models/';
    tf.env.backends.onnx.wasm.wasmPaths = '/assets/vendor/transformers/';
    return tf;
  }).catch((e) => { ready = null; throw e; }));
}
