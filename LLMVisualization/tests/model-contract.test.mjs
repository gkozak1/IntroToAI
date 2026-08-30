import assert from 'node:assert/strict';

const modelBase = 'https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX/resolve/main';

async function fetchOk(url, options) {
  const response = await fetch(url, options);
  assert.ok(response.ok, `${url} should be reachable (received ${response.status})`);
  return response;
}

const [configResponse, tokenizerResponse, graphResponse, weightRangeResponse, transformersPackageResponse] = await Promise.all([
  fetchOk(`${modelBase}/config.json`),
  fetchOk(`${modelBase}/tokenizer_config.json`),
  fetchOk(`${modelBase}/onnx/model_q4.onnx`),
  fetchOk(`${modelBase}/onnx/model_q4.onnx_data`, { headers: { Range: 'bytes=0-0' } }),
  fetchOk('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0/package.json')
]);

const config = await configResponse.json();
const tokenizer = await tokenizerResponse.json();
const transformersPackage = await transformersPackageResponse.json();
const graph = Buffer.from(await graphResponse.arrayBuffer());
const graphText = graph.toString('latin1');

assert.equal(config.hidden_size, 1024);
assert.equal(config.num_hidden_layers, 16);
assert.equal(config.num_attention_heads, 16);
assert.equal(config.num_key_value_heads, 8);
assert.equal(config.vocab_size, 65536);
assert.equal(config.conv_L_cache, 3);
assert.equal(config.layer_types.filter((type) => type === 'conv').length, 10);
assert.equal(config.layer_types.filter((type) => type === 'full_attention').length, 6);

assert.equal(tokenizer.eos_token, '<|im_end|>');
assert.match(tokenizer.chat_template, /messages\[0\]\["role"\] == "system"/);
assert.match(tokenizer.chat_template, /add_generation_prompt/);

assert.equal(graph.byteLength, 183442, 'the official Q4 graph file should have the expected size');
for (const name of ['input_ids', 'attention_mask', 'num_logits_to_keep', 'logits', 'past_conv.0', 'past_key_values.2.key', 'present_conv.0', 'present.2.key', 'model_q4.onnx_data']) {
  assert.ok(graphText.includes(name), `the official Q4 graph should expose ${name}`);
}

assert.equal(weightRangeResponse.status, 206, 'the external weight file should support byte-range requests');
assert.match(weightRangeResponse.headers.get('content-range') || '', /\/293629952$/, 'the Q4 external weights should be 293,629,952 bytes');
assert.equal(weightRangeResponse.headers.get('access-control-allow-origin'), '*', 'the weight host should allow browser cross-origin loading');
assert.equal(
  transformersPackage.dependencies['onnxruntime-web'],
  '1.25.0-dev.20260327-722743c0e2',
  'the app runtime pin should match Transformers.js 4.0.0 exactly'
);

for (const url of [
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.0-dev.20260327-722743c0e2/dist/ort.min.js',
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.0-dev.20260327-722743c0e2/dist/ort.webgpu.min.js',
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0'
]) {
  const response = await fetchOk(url, { method: 'HEAD' });
  assert.equal(response.headers.get('access-control-allow-origin'), '*', `${url} should be loadable from GitHub Pages`);
}

console.log('PASS official LFM config, tokenizer template, Q4 graph/cache names, 294 MB range/CORS support, and CDN assets');
