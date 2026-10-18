// Optional in-browser LLM (WebLLM on WebGPU). It only rephrases what retrieval found:
// the prompt contains the retrieved passages and forbids anything outside them.
const WEBLLM = 'https://esm.run/@mlc-ai/web-llm@0.2.85';
const MODELS = { f16: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC' };

export async function webgpuSupport() {
  if (!('gpu' in navigator)) return null;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    return adapter.features.has('shader-f16') ? 'f16' : 'f32';
  } catch { return null; }
}

export async function loadLLM(kind, onProgress) {
  const webllm = await import(/* @vite-ignore */ WEBLLM);
  const engine = await webllm.CreateMLCEngine(MODELS[kind], {
    initProgressCallback: (p) => onProgress?.(p.progress ?? 0, p.text || ''),
  });
  return {
    async *stream(question, passages, history = []) {
      const context = passages.map((p, i) => `[${i + 1}] (${p.source || p.title}) ${p.title}: ${p.text}`).join('\n');
      const messages = [
        { role: 'system', content: `You are the assistant on Sahaj Saliya's portfolio website. Answer in 1-4 short sentences, in third person about Sahaj, using ONLY the facts in the context passages. If the passages do not contain the answer, reply exactly: "I don't know that from Sahaj's data. You can email him at sahajs7959@gmail.com." Never invent numbers, dates, employers or skills. Never share a phone number. If the question is unrelated to Sahaj, politely decline. Do not mention the passages or their numbers.\n\nContext:\n${context}` },
        ...history.slice(-4),
        { role: 'user', content: question },
      ];
      const chunks = await engine.chat.completions.create({ messages, stream: true, temperature: 0.2, max_tokens: 220 });
      for await (const c of chunks) yield c.choices[0]?.delta?.content || '';
    },
  };
}
