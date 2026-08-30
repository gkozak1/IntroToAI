import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const simulation = fs.readFileSync(path.join(root, 'simulation.html'), 'utf8');

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs should be unique');

const referencedIds = [...app.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]);
const missingIds = [...new Set(referencedIds)].filter((id) => !ids.includes(id));
assert.deepEqual(missingIds, [], `every JavaScript DOM reference should exist; missing: ${missingIds.join(', ')}`);

assert.match(html, /role="radiogroup" aria-label="Language model"/);
assert.equal((html.match(/role="radio"/g) || []).length, 2, 'both model choices should be exposed as radio options');
assert.equal((html.match(/role="radio"[^>]+tabindex="0"/g) || []).length, 1, 'the model radiogroup should have one keyboard tab stop');
assert.match(app, /button\.tabIndex = active \? 0 : -1/, 'the active model should remain the radiogroup tab stop');
assert.match(html, /id="modelStatus" role="status" aria-live="polite"/);
assert.match(html, /for="temperatureSlider"/);
assert.match(html, /for="topKSlider"/);
assert.match(html, /for="autoRToggle"/);
assert.match(html, /for="playbackSlider"/);
assert.match(html, /<dialog id="historyDialog"/);

assert.match(css, /@media \(max-width: 760px\)/, 'a Chromebook/mobile single-column breakpoint should exist');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'reduced-motion preferences should be respected');
assert.match(css, /\.model-option:focus-visible/, 'model choices should have a visible keyboard focus style');
assert.match(css, /\.generated-token:hover, \.generated-token:focus/, 'generated-token history controls should have a visible focus style');

assert.match(app, /navigator\.gpu\.requestAdapter\(\)/, 'modern mode should verify a usable WebGPU adapter');
assert.match(app, /const INITIAL_MODEL_KEY = MODEL_PROFILES\[PAGE_PARAMS\.get\('model'\)\]/, 'a direct modern-mode page load should be supported');
assert.match(app, /window\.location\.replace\(destination\.href\)/, 'production model changes should reload and release the previous runtime heap');
assert.match(app, /await switchModel\(INITIAL_MODEL_KEY, \{ force: true \}\)/, 'initialization should load only the requested model');
assert.match(app, /executionProviders: \['webgpu'\]/, 'modern mode should use the WebGPU execution provider');
assert.match(app, /onnx\/model_q4\.onnx/, 'modern mode should use the official Q4 graph');
assert.match(app, /externalData: \[\{ path: 'model_q4\.onnx_data'/, 'the Q4 external weights should be supplied to ONNX Runtime');
assert.match(app, /feeds\.num_logits_to_keep = new this\.ort\.Tensor\('int64', new BigInt64Array\(\[1n\]\), \[\]\)/, 'the current graph should receive its required scalar logit-count input');
assert.match(app, /Continue the user\\'s passage naturally/, 'the instruction-tuned model wrapper should remain explicit in source');
assert.match(app, /Your Temperature and Top-K settings remain unchanged for a controlled comparison/, 'the student-facing interface should disclose comparison behavior');
assert.match(app, /inference failed: \$\{message\}/, 'first-inference errors should be visible with their underlying message');
assert.match(app, /10 efficient convolution blocks with 6 grouped-query attention blocks/, 'the attention panel should explain the hybrid architecture');

assert.match(simulation, /const MOCK_MODE = true;/, 'the standalone simulation should permanently use mock mode');
assert.doesNotMatch(simulation, /src="\.\/app\.js"|href="\.\/styles\.css"/, 'the simulation should contain its own app and styles');
assert.match(simulation, /LFM2\.5-350M/, 'the simulation should include modern mode');

console.log('PASS DOM wiring, labels, model controls, responsive/accessibility rules, WebGPU integration markers, and standalone simulation');
