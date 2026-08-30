import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(here, '..', 'app.js');
const appSource = fs.readFileSync(appPath, 'utf8').replace(/\ninit\(\);\s*$/, '\n');

const elements = new Map();
function fakeElement(id) {
  if (!elements.has(id)) elements.set(id, { id, value: id === 'promptInput' ? 'Test passage' : '' });
  return elements.get(id);
}

const context = vm.createContext({
  console,
  URLSearchParams,
  window: { location: { search: '?mock=1' } },
  document: {
    getElementById: fakeElement,
    querySelectorAll: () => []
  }
});

vm.runInContext(`${appSource}\nthis.testApi = { state, MODEL_PROFILES, LFMEngine, buildDistribution, selectByR, selectionStyle };`, context);
const { state, MODEL_PROFILES, LFMEngine, buildDistribution, selectByR, selectionStyle } = context.testApi;

state.engine = { decode: (id) => `token-${id}` };
state.rankingSource = null;

const logits = [0, 1, 2, 3];
const distribution = buildDistribution(logits, 1, 2);
assert.equal(distribution[0].tokenId, 3, 'highest logit should rank first');
assert.equal(distribution[1].tokenId, 2, 'second-highest logit should rank second');
assert.equal(distribution[2].probability, 0, 'tokens below Top-K should have zero probability');
assert.ok(Math.abs(distribution[0].probability - 0.7310585786) < 1e-9, 'softmax probability should match the analytical value');
assert.ok(Math.abs(distribution.reduce((sum, item) => sum + item.probability, 0) - 1) < 1e-12, 'probabilities should sum to one');
assert.equal(selectByR(distribution, 0).tokenId, 3, 'r=0 should select the first interval');
assert.equal(selectByR(distribution, distribution[0].rangeEnd).tokenId, 2, 'an exact interval boundary should select the next interval');
assert.equal(selectByR(distribution, 0.999999).tokenId, 2, 'r just below one should select the last nonzero interval');

state.rankingSource = null;
const colder = buildDistribution(logits, 0.5, 2);
state.rankingSource = null;
const hotter = buildDistribution(logits, 2, 2);
assert.ok(colder[0].probability > distribution[0].probability, 'lower temperature should sharpen the distribution');
assert.ok(hotter[0].probability < distribution[0].probability, 'higher temperature should flatten the distribution');

state.rankingSource = null;
const topOne = buildDistribution(logits, 1, 1);
assert.equal(topOne[0].probability, 1, 'Top-K=1 should be deterministic');
assert.equal(selectByR(topOne, 0.999999).tokenId, 3, 'Top-K=1 should always select the highest logit');
assert.deepEqual(
  [1, 3, 5, 7, 10].map((rank) => selectionStyle(rank, 10).background),
  ['#00B050', '#C6EFCE', '#FFEB9C', '#FFC7CE', '#FF0000'],
  'the five rank bands should span green through red'
);

assert.equal(MODEL_PROFILES.gpt2.vocabularySize, 50257);
assert.equal(MODEL_PROFILES.lfm.vocabularySize, 65536);
assert.equal(MODEL_PROFILES.gpt2.hasAttention, true);
assert.equal(MODEL_PROFILES.lfm.hasAttention, false);

class FakeTensor {
  constructor(type, data, dims) {
    this.type = type;
    this.data = data;
    this.dims = dims;
    this.disposed = false;
  }
  dispose() { this.disposed = true; }
}

const engine = new LFMEngine(() => {});
engine.ort = { Tensor: FakeTensor };
const feedsSeen = [];
engine.session = {
  inputNames: ['input_ids', 'attention_mask', 'position_ids', 'past_conv.0', 'past_key_values.2.key', 'past_key_values.2.value'],
  async run(feeds) {
    feedsSeen.push(feeds);
    return {
      logits: new FakeTensor('float32', new Float32Array(feedsSeen.length === 1 ? [0, 1, 2, 3, 4, 5, 6, 7] : [8, 9, 10, 11]), feedsSeen.length === 1 ? [1, 2, 4] : [1, 1, 4]),
      'present_conv.0': new FakeTensor('float32', new Float32Array(3072), [1, 1024, 3]),
      'present.2.key': new FakeTensor('float32', new Float32Array(0), [1, 8, 0, 64]),
      'present.2.value': new FakeTensor('float32', new Float32Array(0), [1, 8, 0, 64])
    };
  }
};

const firstInference = await engine.infer([10, 11]);
assert.deepEqual(Array.from(firstInference.logits), [4, 5, 6, 7], 'only the final sequence position should feed next-token sampling');
assert.deepEqual(Array.from(feedsSeen[0].input_ids.dims), [1, 2]);
assert.deepEqual(Array.from(feedsSeen[0].attention_mask.dims), [1, 2]);
assert.deepEqual(Array.from(feedsSeen[0].position_ids.data), [0n, 1n]);
assert.ok(engine.cache['past_conv.0'], 'convolution cache output should map back to its input name');
assert.ok(engine.cache['past_key_values.2.key'], 'attention key cache output should map back to its input name');

const secondInference = await engine.infer([10, 11, 12]);
assert.deepEqual(Array.from(secondInference.logits), [8, 9, 10, 11]);
assert.deepEqual(Array.from(feedsSeen[1].input_ids.dims), [1, 1], 'incremental inference should send only the new token');
assert.deepEqual(Array.from(feedsSeen[1].attention_mask.dims), [1, 3], 'the mask should cover the full cached context');
assert.deepEqual(Array.from(feedsSeen[1].position_ids.data), [2n], 'the incremental position should continue the sequence');

console.log('PASS sampling math, r-intervals, temperature, rank colors, model profiles, and LFM cache contract');
