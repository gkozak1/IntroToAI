/*
 * GPT-2 Next Token Explorer
 * Educational static web app designed to align with Transformer Explainer's
 * GPT-2 ONNX model and sampling calculations.
 */

const TEMP_VALUES = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PLAYBACK_DELAYS = [0, 250, 500, 1000, 2000, 4000];
const MAX_GENERATED_TOKENS = 50;
const GPT2_CONTEXT_LIMIT = 1024;
const MAX_PROMPT_TOKENS_FOR_FINISH = GPT2_CONTEXT_LIMIT - MAX_GENERATED_TOKENS;
const TOP_CANDIDATES = 50;
const TABLE_ROWS = 20;
const BLOCK_COUNT = 12;
const HEADS_PER_BLOCK = 12;
const MOCK_MODE = new URLSearchParams(window.location.search).get('mock') === '1';

const CDN = {
  ortScript: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/ort.min.js',
  ortWasm: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/',
  transformersModule: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
};

// These are the exact 63 model chunks used by Transformer Explainer.
// Raw GitHub is preferred because it generally supplies permissive CORS headers.
// The live Transformer Explainer site is used as a fallback.
const MODEL_SOURCES = [
  'https://raw.githubusercontent.com/poloclub/transformer-explainer/main/static/model-v2/gpt2.onnx.part',
  'https://poloclub.github.io/transformer-explainer/model-v2/gpt2.onnx.part'
];
const MODEL_CHUNK_COUNT = 63;
const MODEL_CACHE = 'gpt2-next-token-explorer-te-model-v2';

const $ = (id) => document.getElementById(id);
const els = {
  modelBadge: $('modelBadge'),
  modelStatus: $('modelStatus'),
  promptInput: $('promptInput'),
  temperatureSlider: $('temperatureSlider'),
  temperatureValue: $('temperatureValue'),
  topKSlider: $('topKSlider'),
  topKValue: $('topKValue'),
  playbackSlider: $('playbackSlider'),
  playbackValue: $('playbackValue'),
  autoRToggle: $('autoRToggle'),
  rModeText: $('rModeText'),
  rValueInput: $('rValueInput'),
  rValidation: $('rValidation'),
  resetBtn: $('resetBtn'),
  backBtn: $('backBtn'),
  nextBtn: $('nextBtn'),
  finishBtn: $('finishBtn'),
  generationStatus: $('generationStatus'),
  loadProgress: $('loadProgress'),
  loadProgressBar: $('loadProgressBar'),
  loadProgressText: $('loadProgressText'),
  roundStatus: $('roundStatus'),
  candidateTableBody: $('candidateTableBody'),
  candidateTableNote: $('candidateTableNote'),
  selectionCallout: $('selectionCallout'),
  probabilityChart: $('probabilityChart'),
  attentionChart: $('attentionChart'),
  blockNumber: $('blockNumber'),
  prevBlockBtn: $('prevBlockBtn'),
  nextBlockBtn: $('nextBlockBtn'),
  blockButtons: $('blockButtons'),
  sentenceOutput: $('sentenceOutput'),
  historyDialog: $('historyDialog'),
  dialogRound: $('dialogRound'),
  dialogTitle: $('dialogTitle'),
  dialogSummary: $('dialogSummary'),
  dialogProbabilityChart: $('dialogProbabilityChart'),
  dialogCandidateBody: $('dialogCandidateBody'),
  dialogAttentionChart: $('dialogAttentionChart'),
  dialogBlockNumber: $('dialogBlockNumber'),
  dialogPrevBlockBtn: $('dialogPrevBlockBtn'),
  dialogNextBlockBtn: $('dialogNextBlockBtn')
};

const state = {
  engine: null,
  ready: false,
  busy: false,
  stopping: false,
  finishing: false,
  paused: false,
  resumeWaiters: [],
  justAddedIndex: null,
  promptVersion: 0,
  basePrompt: els.promptInput.value,
  tokenIds: [],
  baseTokenIds: [],
  history: [],
  currentInference: null,
  currentDistribution: null,
  attentionBlock: 0,
  dialogRecord: null,
  dialogAttentionBlock: 0,
  promptTimer: null,
  lastAutoR: null
};

class ProductionEngine {
  constructor(onProgress) {
    this.onProgress = onProgress;
    this.tokenizer = null;
    this.session = null;
    this.ort = null;
  }

  async init() {
    this.onProgress({ phase: 'runtime', text: 'Loading browser inference runtime…', fraction: 0.01 });
    await loadScript(CDN.ortScript);
    this.ort = window.ort;
    if (!this.ort) throw new Error('ONNX Runtime Web did not initialize.');
    this.ort.env.wasm.wasmPaths = CDN.ortWasm;
    this.ort.env.logLevel = 'error';

    this.onProgress({ phase: 'tokenizer', text: 'Loading the GPT-2 tokenizer…', fraction: 0.03 });
    const transformers = await import(CDN.transformersModule);
    this.tokenizer = await transformers.AutoTokenizer.from_pretrained('Xenova/gpt2');

    this.onProgress({ phase: 'model', text: 'Loading Transformer Explainer GPT-2 model…', fraction: 0.04 });
    const modelBlob = await this.loadModelBlob();
    const modelUrl = URL.createObjectURL(modelBlob);
    try {
      // Deliberately use the same default WASM execution path as Transformer Explainer.
      this.session = await this.ort.InferenceSession.create(modelUrl);
    } finally {
      URL.revokeObjectURL(modelUrl);
    }
    this.onProgress({ phase: 'ready', text: 'GPT-2 is ready.', fraction: 1 });
  }

  async loadModelBlob() {
    let lastError;
    for (const base of MODEL_SOURCES) {
      try {
        return await this.loadFromSource(base);
      } catch (error) {
        console.warn(`Model source failed: ${base}`, error);
        lastError = error;
      }
    }
    throw new Error(`Unable to download the Transformer Explainer GPT-2 model. ${lastError?.message || ''}`.trim());
  }

  async loadFromSource(base) {
    const buffers = new Array(MODEL_CHUNK_COUNT);
    let completed = 0;
    let cachedCount = 0;
    let downloadedBytes = 0;
    const queue = Array.from({ length: MODEL_CHUNK_COUNT }, (_, i) => i);
    const workers = Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const i = queue.shift();
        if (i === undefined) return;
        const url = `${base}${i}`;
        const result = await fetchCachedArrayBuffer(url);
        buffers[i] = result.buffer;
        if (result.cached) cachedCount += 1;
        else downloadedBytes += result.buffer.byteLength;
        completed += 1;
        const mb = (downloadedBytes / 1024 / 1024).toFixed(0);
        this.onProgress({
          phase: 'model',
          text: `Loading GPT-2 model: ${completed}/${MODEL_CHUNK_COUNT} chunks (${cachedCount} cached, ${mb} MB downloaded this load)…`,
          fraction: 0.04 + 0.90 * (completed / MODEL_CHUNK_COUNT)
        });
      }
    });
    await Promise.all(workers);
    return new Blob(buffers, { type: 'application/octet-stream' });
  }

  encode(text) {
    return Array.from(this.tokenizer.encode(text === '' ? ' ' : text), Number);
  }

  decode(tokenId) {
    return this.tokenizer.decode([tokenId]);
  }

  decodeContext(tokenIds) {
    return tokenIds.map((id) => this.decode(id));
  }

  async infer(tokenIds) {
    const input = new this.ort.Tensor('int64', tokenIds, [1, tokenIds.length]);
    const feeds = { input };
    const requestedOutputs = ['linear_output'];
    for (let b = 0; b < BLOCK_COUNT; b += 1) {
      for (let h = 0; h < HEADS_PER_BLOCK; h += 1) {
        requestedOutputs.push(`block_${b}_attn_head_${h}_attn_softmax`);
      }
    }

    let results;
    try {
      results = await this.session.run(feeds, requestedOutputs);
    } catch (error) {
      // Compatibility fallback for ORT builds that do not accept an output-name array.
      console.warn('Requested-output inference failed; retrying with all graph outputs.', error);
      results = await this.session.run(feeds);
    }

    const linear = results.linear_output;
    if (!linear) throw new Error('The model did not return linear_output logits.');
    const logits = Array.from(linear.data, Number);
    const contextTokens = this.decodeContext(tokenIds);
    const attentionByBlock = extractAverageAttention(results, tokenIds.length);
    return { logits, contextTokens, attentionByBlock };
  }
}

class MockEngine {
  constructor(onProgress) {
    this.onProgress = onProgress;
    this.dynamicTokens = new Map();
    this.reverseDynamic = new Map();
    this.nextDynamic = 1000;
    // Mock mode is only for interface testing, but its vocabulary deliberately mixes
    // whole-word GPT-style tokens with subword pieces so token boundaries can be
    // evaluated visually. Production mode uses the real Xenova/GPT-2 tokenizer.
    this.vocab = [
      ' the',' a',' and',' to',' of',' was',' in',' that',' it',' with',' over','look','ed',' for',' on',' as',' is',' had',' from',' but',
      ' not',' his',' her',' bank','er',' river',' left',' sat',' large',' small',' sudden','ly',' continu','ed',' began',' start','ed',' walk','ed',
      ' ran',' said',' look','ed',' because',' then',' into',' away',' again',' more',' very',' one',' two',' new',' room',' house',' suit','case',' trophy',
      ' road',' school',' model',' token',' answer',' story',' day',' time',' person',' thing',' world',' way',' test',' next',' word',' end','.',',','!','?','\n',
      ' bright',' quiet',' strange',' clear',' quick','ly',' slow','ly',' careful','ly',' however',' therefore',' while',' after',' before',' could',' would',' might',' should',
      ' this',' these',' those',' their',' our',' your',' another',' first',' last',' much',' little',' better',' differ','ent',' simple',' possible',' result',' example',' attention',' probability',' random'
    ];
  }
  async init() {
    this.onProgress({ phase: 'model', text: 'Mock test engine ready.', fraction: 1 });
    await sleep(40);
  }
  encode(text) {
    // A lightweight mock tokenizer: keep a preceding space with a word (as GPT-2
    // commonly does) and split a few longer forms into subword pieces. This is
    // intentionally illustrative only; production uses the actual GPT-2 tokenizer.
    const rough = text.match(/\s*[A-Za-z0-9’']+|[^\sA-Za-z0-9]|\s+/g) || [' '];
    const pieces = [];
    for (const piece of rough) {
      const lower = piece.toLowerCase();
      if (lower === ' overlooked') pieces.push(' over', 'look', 'ed');
      else if (lower === 'overlooked') pieces.push('over', 'look', 'ed');
      else if (lower === ' carefully') pieces.push(' careful', 'ly');
      else if (lower === 'carefully') pieces.push('careful', 'ly');
      else pieces.push(piece);
    }
    return pieces.map((piece) => {
      if (!this.dynamicTokens.has(piece)) {
        const id = this.nextDynamic++;
        this.dynamicTokens.set(piece, id);
        this.reverseDynamic.set(id, piece);
      }
      return this.dynamicTokens.get(piece);
    });
  }
  decode(id) {
    if (id < this.vocab.length) return this.vocab[id];
    return this.reverseDynamic.get(id) ?? `⟨${id}⟩`;
  }
  decodeContext(ids) { return ids.map((id) => this.decode(id)); }
  async infer(tokenIds) {
    await sleep(25);
    const logits = new Array(this.vocab.length);
    const seed = tokenIds.reduce((a, b, i) => (a + (b + 17) * (i + 3)) % 100003, 19);
    for (let i = 0; i < logits.length; i += 1) {
      const wave = Math.sin((i + 1) * 0.73 + seed * 0.0017) * 1.8;
      const rankBias = 7.8 - i * 0.035;
      logits[i] = rankBias + wave + Math.cos((seed + i * 13) * 0.013) * 0.7;
    }
    const lastToken = this.decode(tokenIds[tokenIds.length - 1]);
    if (lastToken === ' over' || lastToken === 'over') {
      const i = this.vocab.indexOf('look');
      if (i >= 0) logits[i] = Math.max(...logits) + 4;
    } else if (lastToken === 'look') {
      const i = this.vocab.indexOf('ed');
      if (i >= 0) logits[i] = Math.max(...logits) + 4;
    }
    const n = tokenIds.length;
    const attentionByBlock = [];
    for (let b = 0; b < BLOCK_COUNT; b += 1) {
      const raw = Array.from({ length: n }, (_, i) => 0.08 + Math.abs(Math.sin((i + 1) * (b + 2) * 0.37 + seed * 0.0003)));
      const sum = raw.reduce((a, v) => a + v, 0);
      attentionByBlock.push(raw.map((v) => v / sum));
    }
    return { logits, contextTokens: this.decodeContext(tokenIds), attentionByBlock };
  }
}

async function fetchCachedArrayBuffer(url) {
  let cache = null;
  if ('caches' in window) {
    try { cache = await caches.open(MODEL_CACHE); } catch { cache = null; }
  }
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return { buffer: await hit.arrayBuffer(), cached: true };
  }
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${url}`);
  if (cache) {
    try { await cache.put(url, response.clone()); } catch (e) { console.warn('Could not cache model chunk', e); }
  }
  return { buffer: await response.arrayBuffer(), cached: false };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.ort) resolve();
      else existing.addEventListener('load', resolve, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

function extractAverageAttention(results, seqLen) {
  const blocks = [];
  for (let b = 0; b < BLOCK_COUNT; b += 1) {
    const sums = new Array(seqLen).fill(0);
    let foundHeads = 0;
    for (let h = 0; h < HEADS_PER_BLOCK; h += 1) {
      const tensor = results[`block_${b}_attn_head_${h}_attn_softmax`];
      if (!tensor?.data || tensor.data.length < seqLen) continue;
      const data = tensor.data;
      // For a row-major causal attention matrix, the final seqLen values are
      // the final query token's attention distribution over all key positions.
      const start = data.length - seqLen;
      for (let i = 0; i < seqLen; i += 1) sums[i] += Number(data[start + i]);
      foundHeads += 1;
    }
    if (foundHeads === 0) {
      blocks.push(new Array(seqLen).fill(0));
      continue;
    }
    const avg = sums.map((v) => v / foundHeads);
    const total = avg.reduce((a, v) => a + v, 0);
    blocks.push(total > 0 ? avg.map((v) => v / total) : avg);
  }
  return blocks;
}

function currentTemperature() {
  return TEMP_VALUES[Number(els.temperatureSlider.value)];
}

function currentTopK() {
  return Number(els.topKSlider.value);
}

function currentPlaybackDelay() {
  return PLAYBACK_DELAYS[Number(els.playbackSlider.value)] ?? 1000;
}

function formatPlaybackDelay(ms) {
  if (ms === 0) return '0s';
  if (ms < 1000) return `${ms / 1000}s`;
  return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 1 : 2)}s`;
}

function buildDistribution(logits, temperature, k) {
  // Mirrors Transformer Explainer's topKSampling(): sort all logits, retain
  // the top 50, scale by temperature, filter below K to -Infinity, then softmax.
  const sorted = Array.from(logits)
    .map((logit, tokenId) => ({ tokenId, logit: Number(logit) }))
    .sort((a, b) => b.logit - a.logit)
    .slice(0, TOP_CANDIDATES);

  const filtered = sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
    rawRank: index,
    scaledLogit: item.logit / temperature,
    topKLogit: index < k ? item.logit / temperature : -Infinity
  }));

  const finite = filtered.slice(0, k).map((d) => d.topKLogit);
  const maxLogit = Math.max(...finite);
  const exps = filtered.map((d) => d.topKLogit === -Infinity ? 0 : Math.exp(d.topKLogit - maxLogit));
  const denom = exps.reduce((a, v) => a + v, 0);
  let cumulative = 0;
  return filtered.map((d, i) => {
    const probability = denom > 0 ? exps[i] / denom : 0;
    const rangeStart = cumulative;
    cumulative += probability;
    return {
      ...d,
      probability,
      rangeStart,
      rangeEnd: cumulative,
      rawToken: state.engine ? state.engine.decode(d.tokenId) : String(d.tokenId),
      token: formatTokenForDisplay(state.engine ? state.engine.decode(d.tokenId) : String(d.tokenId))
    };
  });
}

function selectByR(distribution, r) {
  let cumulative = 0;
  for (const item of distribution) {
    cumulative += item.probability;
    if (r < cumulative) return item;
  }
  return distribution.findLast((d) => d.probability > 0) || distribution[0];
}

function formatTokenForDisplay(token) {
  return String(token)
    .replace(/\n/g, '[NEWLINE]')
    .replace(/\t/g, '[TAB]')
    .replace(/\r/g, '[CR]')
    .replace(/\s{2,}/g, (m) => `[${m.length} SPACES]`);
}

function formatNumber(value) {
  if (value === -Infinity) return '−∞';
  if (!Number.isFinite(value)) return String(value);
  return value.toFixed(2);
}

function formatProbability(value, digits = 2) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatR(value) {
  return Number(value).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

const TOKEN_SELECTION_STYLES = [
  { background: '#00B050', foreground: '#FFFFFF' }, // Top 20% — green
  { background: '#C6EFCE', foreground: '#006100' }, // Next 20% — light green
  { background: '#FFEB9C', foreground: '#9C5700' }, // Middle 20% — yellow
  { background: '#FFC7CE', foreground: '#9C0006' }, // Next 20% — light red
  { background: '#FF0000', foreground: '#FFFFFF' }  // Bottom 20% — red
];

function selectionStyle(rank, k) {
  if (k <= 1) return TOKEN_SELECTION_STYLES[0];

  // Spread the eligible ranks evenly across five visual bands. This keeps
  // rank 1 in the green band and rank K in the red band for every Top-K size.
  const position = (rank - 1) / (k - 1);
  let band = 4;
  if (position < 0.2) band = 0;
  else if (position < 0.4) band = 1;
  else if (position < 0.6) band = 2;
  else if (position < 0.8) band = 3;
  return TOKEN_SELECTION_STYLES[band];
}

function selectionColor(rank, k) {
  return selectionStyle(rank, k).background;
}

function selectionTextColor(rank, k) {
  return selectionStyle(rank, k).foreground;
}

function renderDistribution() {
  if (!state.currentInference) return renderEmptyData();
  state.currentDistribution = buildDistribution(state.currentInference.logits, currentTemperature(), currentTopK());
  renderCandidateTable(state.currentDistribution, null);
  renderProbabilityChart(state.currentDistribution, els.probabilityChart, null);
  renderAttention();
  els.selectionCallout.textContent = '';
  updateRoundStatus();
}

function renderCandidateTable(distribution, selectedTokenId = null) {
  const rows = distribution.slice(0, TABLE_ROWS);
  els.candidateTableBody.innerHTML = rows.map((d) => `
    <tr class="${[d.probability === 0 ? 'filtered' : '', d.tokenId === selectedTokenId ? 'selected-row' : ''].filter(Boolean).join(' ')}"${d.tokenId === selectedTokenId ? ` style="--rank-color:${selectionColor(d.rank, currentTopK())};--rank-text:${selectionTextColor(d.rank, currentTopK())}"` : ''}>
      <td>${d.rank}</td>
      <td class="token-cell" title="GPT-2 token ID ${d.tokenId}">${escapeHtml(d.token)}</td>
      <td>${formatNumber(d.logit)}</td>
      <td>${formatNumber(d.scaledLogit)}</td>
      <td>${formatNumber(d.topKLogit)}</td>
      <td>${formatProbability(d.probability)}</td>
    </tr>`).join('');
  const k = currentTopK();
  els.candidateTableNote.textContent = k > TABLE_ROWS
    ? `Top-K includes ${k - TABLE_ROWS} additional eligible token${k - TABLE_ROWS === 1 ? '' : 's'} beyond the 20 shown.`
    : 'Rows below K become −∞ and receive 0% probability.';
}

function renderProbabilityChart(distribution, host, selectedTokenId) {
  const eligible = distribution.filter((d) => d.probability > 0);
  host.classList.remove('placeholder-chart');
  host.innerHTML = makeBarChartSvg({
    items: eligible.map((d) => ({ label: d.token, value: d.probability, selected: d.tokenId === selectedTokenId, tooltip: `${d.token}: ${formatProbability(d.probability, 3)} · rank ${d.rank}` })),
    valueMax: Math.max(0.01, ...eligible.map((d) => d.probability)),
    valueFormatter: (v) => `${Math.round(v * 100)}%`,
    barClass: 'probability-bar'
  });
}

function renderAttention() {
  if (!state.currentInference?.attentionByBlock?.length) {
    els.attentionChart.classList.add('placeholder-chart');
    els.attentionChart.textContent = 'Attention data is not available for this round.';
    return;
  }
  const block = Math.max(0, Math.min(BLOCK_COUNT - 1, state.attentionBlock));
  state.attentionBlock = block;
  els.blockNumber.textContent = String(block + 1);
  els.prevBlockBtn.disabled = block === 0;
  els.nextBlockBtn.disabled = block === BLOCK_COUNT - 1;
  if (els.blockButtons) {
    els.blockButtons.querySelectorAll('.block-button').forEach((button, i) => {
      button.classList.toggle('active', i === block);
      button.setAttribute('aria-current', i === block ? 'true' : 'false');
    });
  }
  const values = state.currentInference.attentionByBlock[block] || [];
  const tokens = state.currentInference.contextTokens || [];
  els.attentionChart.classList.remove('placeholder-chart');
  els.attentionChart.innerHTML = makeBarChartSvg({
    items: values.map((value, i) => ({ label: formatTokenForDisplay(tokens[i] ?? ''), value, tooltip: `${formatTokenForDisplay(tokens[i] ?? '')}: ${formatProbability(value, 2)}` })),
    valueMax: Math.max(0.01, ...values),
    valueFormatter: (v) => `${Math.round(v * 100)}%`,
    barClass: 'attention-bar'
  });
}

function makeBarChartSvg({ items, valueMax, valueFormatter, barClass }) {
  if (!items.length) return '<div class="placeholder-chart" style="height:205px">No values to display.</div>';
  // Use a fixed viewBox and width:100% so every bar always fits the available
  // screen width. As the number of tokens grows, bars narrow rather than scroll.
  const width = 1200;
  const height = 215;
  const margin = { top: 12, right: 12, bottom: 56, left: 45 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const step = plotW / items.length;
  const barW = Math.max(4, Math.min(62, step * 0.72));
  const safeMax = valueMax || 1;
  const ticks = 4;
  const labelFont = items.length > 44 ? 11 : items.length > 32 ? 12.5 : items.length > 20 ? 14 : 16;
  let svg = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" preserveAspectRatio="xMidYMid meet">`;
  for (let t = 0; t <= ticks; t += 1) {
    const frac = t / ticks;
    const y = margin.top + plotH * (1 - frac);
    svg += `<line class="chart-grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"/>`;
    svg += `<text class="chart-axis-text" x="${margin.left - 7}" y="${y + 4}" text-anchor="end">${escapeHtml(valueFormatter(safeMax * frac))}</text>`;
  }
  items.forEach((item, i) => {
    const x = margin.left + step * i + (step - barW) / 2;
    const h = Math.max(item.value > 0 ? 1 : 0, plotH * (item.value / safeMax));
    const y = margin.top + plotH - h;
    const cls = `${barClass}${item.selected ? ' selected' : ''}`;
    svg += `<rect class="${cls}" x="${x}" y="${y}" width="${barW}" height="${h}" rx="2"><title>${escapeHtml(item.tooltip || '')}</title></rect>`;
    const labelX = x + barW / 2;
    const labelY = margin.top + plotH + 11;
    svg += `<text class="chart-token-text" style="font-size:${labelFont}px" transform="translate(${labelX},${labelY}) rotate(58)" text-anchor="start">${escapeHtml(trimLabel(item.label, items.length > 44 ? 8 : items.length > 32 ? 10 : items.length > 20 ? 12 : 16))}</text>`;
  });
  svg += '</svg>';
  return svg;
}

function trimLabel(text, max) {
  const s = String(text);
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function renderSentence() {
  const prompt = state.basePrompt;
  let html = `<span class="prompt-fragment">${escapeHtml(prompt)}</span>`;
  state.history.forEach((record, index) => {
    const color = selectionColor(record.selected.rank, record.settings.topK);
    const foreground = selectionTextColor(record.selected.rank, record.settings.topK);
    const justAdded = index === state.justAddedIndex ? ' just-added' : '';
    html += `<button type="button" class="generated-token${justAdded}" data-history-index="${index}" style="background:${color};color:${foreground}" title="GPT-2 token ID ${record.selected.tokenId} · generated token ${index + 1} · rank ${record.selected.rank} of ${record.settings.topK} · ${formatProbability(record.selected.probability, 2)}">${escapeHtml(record.selected.rawToken)}</button>`;
  });
  els.sentenceOutput.innerHTML = html;
  els.sentenceOutput.querySelectorAll('.generated-token').forEach((button) => {
    button.addEventListener('click', () => openHistory(Number(button.dataset.historyIndex)));
  });
  requestAnimationFrame(() => { els.sentenceOutput.scrollTop = els.sentenceOutput.scrollHeight; });
}

async function analyzePrompt({ force = false } = {}) {
  if (!state.ready || state.busy || state.history.length > 0) return;
  const version = ++state.promptVersion;
  const prompt = els.promptInput.value;
  if (!force && prompt === state.basePrompt && state.currentInference) return;
  state.busy = true;
  setStatus('Analyzing prompt…');
  updateControls();
  try {
    state.basePrompt = prompt;
    // Transformer Explainer trims the input string before tokenization. Mirror that
    // behavior so identical visible prompts produce the same GPT-2 token sequence.
    state.baseTokenIds = state.engine.encode(prompt.trim());
    if (state.baseTokenIds.length > MAX_PROMPT_TOKENS_FOR_FINISH) {
      throw new Error(`Prompt is ${state.baseTokenIds.length} GPT-2 tokens. Use ${MAX_PROMPT_TOKENS_FOR_FINISH} or fewer so a full 50-token continuation stays within GPT-2's ${GPT2_CONTEXT_LIMIT}-token context window.`);
    }
    state.tokenIds = [...state.baseTokenIds];
    const inference = await state.engine.infer(state.tokenIds);
    if (version !== state.promptVersion) return;
    state.currentInference = inference;
    state.attentionBlock = 0;
    renderDistribution();
    renderSentence();
    setStatus('Ready', 'ready');
  } catch (error) {
    console.error(error);
    setStatus('Analysis error', 'error');
    els.roundStatus.textContent = error.message;
  } finally {
    state.busy = false;
    updateControls();
  }
}

async function chooseNextToken(forFinish = false) {
  if (!state.ready || state.busy || !state.currentInference || state.history.length >= MAX_GENERATED_TOKENS) return false;
  els.rValidation.textContent = '';
  let r;
  if (els.autoRToggle.checked) {
    r = Math.random();
    state.lastAutoR = r;
    els.rValueInput.value = formatR(r);
  } else {
    const raw = els.rValueInput.value.trim();
    r = Number(raw);
    if (raw === '' || !Number.isFinite(r) || r < 0 || r >= 1) {
      els.rValidation.textContent = 'Enter 0 ≤ r < 1.';
      els.rValueInput.focus();
      return false;
    }
  }

  const settings = { temperature: currentTemperature(), topK: currentTopK() };
  const distribution = buildDistribution(state.currentInference.logits, settings.temperature, settings.topK);
  const selected = selectByR(distribution, r);
  const record = {
    index: state.history.length,
    settings,
    r,
    selected: { ...selected },
    distribution: distribution.map((d) => ({ ...d })),
    inference: cloneInferenceSnapshot(state.currentInference)
  };

  // Visually connect the selected candidate on the left with the token appended
  // on the right before advancing the model to the next prediction round.
  state.history.push(record);
  state.tokenIds.push(selected.tokenId);
  state.justAddedIndex = record.index;
  state.currentDistribution = distribution;
  renderCandidateTable(distribution, selected.tokenId);
  renderProbabilityChart(distribution, els.probabilityChart, selected.tokenId);
  els.selectionCallout.textContent = selected.rank <= TABLE_ROWS
    ? `Selected #${selected.rank}: “${selected.token}”`
    : `Selected #${selected.rank} (outside top 20): “${selected.token}”`;
  renderSentence();
  updateGenerationStatus();

  if (!els.autoRToggle.checked) els.rValueInput.value = '';
  if (state.history.length >= MAX_GENERATED_TOKENS) {
    renderAttention();
    els.roundStatus.textContent = `Final selection round · token ${MAX_GENERATED_TOKENS}`;
    updateControls();
    return true;
  }

  state.busy = true;
  if (!forFinish) setStatus('Selected · preparing next round…');
  updateControls();
  try {
    // Manual Next gets a short visual beat. During Finish, inference begins
    // immediately and counts toward the requested token interval instead of
    // being added on top of it. The real model can still impose a longer
    // interval when inference itself takes longer than the selected setting.
    const intervalStartedAt = performance.now();
    if (!forFinish) await sleep(320);
    if (state.stopping) return false;

    const nextInference = await state.engine.infer(state.tokenIds);
    if (forFinish) {
      const elapsed = performance.now() - intervalStartedAt;
      await playbackHold(Math.max(0, currentPlaybackDelay() - elapsed));
      await waitUntilResumed();
    }
    if (state.stopping) return false;

    state.currentInference = nextInference;
    state.justAddedIndex = null;
    renderSentence();
    renderDistribution();
    setStatus(forFinish ? `Generating… ${state.history.length}/${MAX_GENERATED_TOKENS}` : 'Ready', forFinish ? '' : 'ready');
    return true;
  } catch (error) {
    console.error(error);
    setStatus('Inference error', 'error');
    els.roundStatus.textContent = error.message;
    return false;
  } finally {
    state.busy = false;
    updateControls();
  }
}

function cloneInferenceSnapshot(inference) {
  return {
    logits: inference.logits.slice(),
    contextTokens: inference.contextTokens.slice(),
    attentionByBlock: inference.attentionByBlock.map((arr) => arr.slice())
  };
}

function setPlaybackPaused(paused) {
  if (!state.finishing) return;
  state.paused = paused;
  if (!paused) {
    const waiters = state.resumeWaiters.splice(0);
    waiters.forEach((resolve) => resolve());
  }
  setStatus(paused ? `Paused · ${state.history.length}/50 tokens` : `Generating… ${state.history.length}/50 tokens`, paused ? 'ready' : '');
  updateControls();
}

function togglePlayback() {
  if (!state.finishing) return;
  setPlaybackPaused(!state.paused);
}

function waitUntilResumed() {
  if (!state.paused) return Promise.resolve();
  return new Promise((resolve) => state.resumeWaiters.push(resolve));
}

async function playbackHold(ms) {
  let remaining = ms;
  while (remaining > 0 && !state.stopping) {
    await waitUntilResumed();
    if (state.stopping) return;
    const slice = Math.min(50, remaining);
    await sleep(slice);
    if (!state.paused) remaining -= slice;
  }
  await waitUntilResumed();
}

async function finishGeneration() {
  if (state.finishing) {
    togglePlayback();
    return;
  }
  if (!els.autoRToggle.checked || state.history.length >= MAX_GENERATED_TOKENS) return;
  state.finishing = true;
  state.stopping = false;
  state.paused = false;
  updateControls();
  setStatus(`Generating… ${state.history.length}/${MAX_GENERATED_TOKENS}`);
  while (state.history.length < MAX_GENERATED_TOKENS && !state.stopping) {
    await waitUntilResumed();
    if (state.stopping) break;
    const ok = await chooseNextToken(true);
    if (!ok) break;
    await nextAnimationFrame();
  }
  const completed = state.history.length >= MAX_GENERATED_TOKENS;
  state.finishing = false;
  state.paused = false;
  state.stopping = false;
  state.resumeWaiters.splice(0).forEach((resolve) => resolve());
  setStatus(completed ? '50-token continuation complete' : 'Ready', 'ready');
  updateControls();
}
function backOneToken() {
  if (state.busy || state.history.length === 0) return;
  const record = state.history.pop();
  state.tokenIds.pop();
  state.currentInference = cloneInferenceSnapshot(record.inference);
  state.attentionBlock = 0;
  if (!els.autoRToggle.checked) els.rValueInput.value = '';
  renderDistribution();
  renderSentence();
  updateGenerationStatus();
  updateControls();
  setStatus('Ready', 'ready');
}

async function resetAll() {
  if (state.busy) return;
  state.stopping = true;
  state.finishing = false;
  state.paused = false;
  state.resumeWaiters.splice(0).forEach((resolve) => resolve());
  state.justAddedIndex = null;
  state.history = [];
  state.currentInference = null;
  state.currentDistribution = null;
  state.tokenIds = [];
  state.baseTokenIds = [];
  state.attentionBlock = 0;
  state.lastAutoR = null;
  els.rValueInput.value = '';
  els.rValidation.textContent = '';
  els.promptInput.readOnly = false;
  renderSentence();
  renderEmptyData();
  updateGenerationStatus();
  updateControls();
  await analyzePrompt({ force: true });
}

function renderEmptyData() {
  els.candidateTableBody.innerHTML = '<tr><td colspan="6" class="placeholder-cell">The table will appear after the model analyzes the prompt.</td></tr>';
  els.candidateTableNote.textContent = '';
  els.selectionCallout.textContent = '';
  els.probabilityChart.className = 'chart-host placeholder-chart';
  els.probabilityChart.textContent = 'Probability bars will appear here.';
  els.attentionChart.className = 'chart-host attention-chart placeholder-chart';
  els.attentionChart.textContent = 'Attention bars will appear here.';
}

function updateRoundStatus() {
  const contextLength = state.tokenIds.length;
  els.roundStatus.textContent = `Context: ${contextLength} token${contextLength === 1 ? '' : 's'}`;
}

function updateGenerationStatus() {
  els.generationStatus.textContent = `Generated: ${state.history.length} / ${MAX_GENERATED_TOKENS} tokens`;
}

function updateControls() {
  const hasRound = Boolean(state.currentInference);
  const generating = state.history.length > 0;
  els.promptInput.readOnly = generating || state.busy || state.finishing;
  els.nextBtn.disabled = !state.ready || state.busy || state.finishing || !hasRound || state.history.length >= MAX_GENERATED_TOKENS;
  els.backBtn.disabled = state.busy || state.finishing || state.history.length === 0;
  els.resetBtn.disabled = state.busy || state.finishing;
  els.autoRToggle.disabled = state.finishing;
  if (state.finishing) {
    els.finishBtn.disabled = false;
    els.finishBtn.textContent = state.paused ? 'Resume' : 'Pause';
  } else {
    els.finishBtn.disabled = !state.ready || state.busy || !hasRound || !els.autoRToggle.checked || state.history.length >= MAX_GENERATED_TOKENS;
    els.finishBtn.textContent = 'Finish';
  }
}

function setStatus(text, kind = '') {
  els.modelStatus.textContent = text;
  els.modelStatus.className = `status-pill${kind ? ` ${kind}` : ''}`;
}

function setLoadProgress({ text, fraction }) {
  els.loadProgress.hidden = fraction >= 1;
  els.loadProgressBar.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  els.loadProgressText.textContent = text;
}

function openHistory(index) {
  const record = state.history[index];
  if (!record) return;
  state.dialogRecord = record;
  state.dialogAttentionBlock = 0;
  els.dialogRound.textContent = `Generated token ${index + 1} of ${state.history.length}`;
  els.dialogTitle.textContent = `Selected “${formatTokenForDisplay(record.selected.rawToken)}”`;
  els.dialogSummary.innerHTML = [
    ['Temperature', record.settings.temperature],
    ['Top-K', record.settings.topK],
    ['r-value', formatR(record.r)],
    ['Selected rank', `${record.selected.rank} of ${record.settings.topK}`],
    ['Probability', formatProbability(record.selected.probability, 3)]
  ].map(([label, value]) => `<div class="summary-stat"><div class="label">${escapeHtml(String(label))}</div><div class="value">${escapeHtml(String(value))}</div></div>`).join('');

  renderProbabilityChart(record.distribution, els.dialogProbabilityChart, record.selected.tokenId);
  const eligible = record.distribution.filter((d) => d.probability > 0);
  els.dialogCandidateBody.innerHTML = eligible.map((d) => `
    <tr class="${d.tokenId === record.selected.tokenId ? 'selected-row' : ''}">
      <td>${d.rank}</td>
      <td class="token-cell" title="GPT-2 token ID ${d.tokenId}">${escapeHtml(d.token)}</td>
      <td>${formatProbability(d.probability, 3)}</td>
      <td>${formatR(d.rangeStart)} ≤ r &lt; ${d.rangeEnd >= 0.9999995 ? '1.000000' : formatR(d.rangeEnd)}</td>
    </tr>`).join('');
  renderDialogAttention();
  els.historyDialog.showModal();
}

function renderDialogAttention() {
  const record = state.dialogRecord;
  if (!record) return;
  const block = Math.max(0, Math.min(BLOCK_COUNT - 1, state.dialogAttentionBlock));
  state.dialogAttentionBlock = block;
  els.dialogBlockNumber.textContent = String(block + 1);
  els.dialogPrevBlockBtn.disabled = block === 0;
  els.dialogNextBlockBtn.disabled = block === BLOCK_COUNT - 1;
  const values = record.inference.attentionByBlock[block] || [];
  const tokens = record.inference.contextTokens || [];
  els.dialogAttentionChart.innerHTML = makeBarChartSvg({
    items: values.map((value, i) => ({ label: formatTokenForDisplay(tokens[i] ?? ''), value, tooltip: `${formatTokenForDisplay(tokens[i] ?? '')}: ${formatProbability(value, 2)}` })),
    valueMax: Math.max(0.01, ...values),
    valueFormatter: (v) => `${Math.round(v * 100)}%`,
    barClass: 'attention-bar'
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function nextAnimationFrame() { return new Promise((resolve) => requestAnimationFrame(() => resolve())); }

function wireEvents() {
  els.temperatureSlider.addEventListener('input', () => {
    els.temperatureValue.textContent = currentTemperature().toFixed(currentTemperature() <= 1 ? 1 : (Number.isInteger(currentTemperature()) ? 0 : 1));
    if (state.currentInference) renderDistribution();
  });
  els.topKSlider.addEventListener('input', () => {
    els.topKValue.textContent = String(currentTopK());
    if (state.currentInference) renderDistribution();
  });
  els.playbackSlider.addEventListener('input', () => {
    els.playbackValue.textContent = formatPlaybackDelay(currentPlaybackDelay());
  });
  els.autoRToggle.addEventListener('change', () => {
    const automatic = els.autoRToggle.checked;
    els.rModeText.textContent = automatic ? 'On' : 'Off';
    els.rValueInput.disabled = automatic;
    els.rValueInput.placeholder = automatic ? 'Generated on Next' : 'Enter 0 ≤ r < 1';
    els.rValidation.textContent = '';
    if (!automatic) els.rValueInput.value = '';
    else if (state.lastAutoR != null) els.rValueInput.value = formatR(state.lastAutoR);
    updateControls();
  });
  els.promptInput.addEventListener('input', () => {
    if (state.history.length > 0) return;
    clearTimeout(state.promptTimer);
    state.currentInference = null;
    renderEmptyData();
    updateControls();
    state.promptTimer = setTimeout(() => analyzePrompt({ force: true }), 700);
  });
  els.nextBtn.addEventListener('click', () => chooseNextToken(false));
  els.finishBtn.addEventListener('click', () => finishGeneration());
  els.backBtn.addEventListener('click', backOneToken);
  els.resetBtn.addEventListener('click', resetAll);
  els.prevBlockBtn.addEventListener('click', () => { state.attentionBlock -= 1; renderAttention(); });
  els.nextBlockBtn.addEventListener('click', () => { state.attentionBlock += 1; renderAttention(); });
  els.dialogPrevBlockBtn.addEventListener('click', () => { state.dialogAttentionBlock -= 1; renderDialogAttention(); });
  els.dialogNextBlockBtn.addEventListener('click', () => { state.dialogAttentionBlock += 1; renderDialogAttention(); });
}

async function init() {
  if (els.blockButtons) {
    els.blockButtons.innerHTML = Array.from({ length: BLOCK_COUNT }, (_, i) => `<button type="button" class="block-button${i === 0 ? ' active' : ''}" data-block="${i}" aria-label="Transformer block ${i + 1}">${i + 1}</button>`).join('');
    els.blockButtons.querySelectorAll('.block-button').forEach((button) => {
      button.addEventListener('click', () => { state.attentionBlock = Number(button.dataset.block); renderAttention(); });
    });
  }
  wireEvents();
  renderSentence();
  updateGenerationStatus();
  els.temperatureValue.textContent = '1.0';
  els.topKValue.textContent = String(currentTopK());

  if (MOCK_MODE) {
    els.modelBadge.textContent = 'Mock test mode';
    document.title += ' · Mock';
  }

  state.engine = MOCK_MODE ? new MockEngine(setLoadProgress) : new ProductionEngine(setLoadProgress);
  try {
    els.loadProgress.hidden = false;
    await state.engine.init();
    state.ready = true;
    setStatus(MOCK_MODE ? 'Mock engine ready' : 'GPT-2 ready', 'ready');
    await analyzePrompt({ force: true });
  } catch (error) {
    console.error(error);
    state.ready = false;
    setStatus('Model load failed', 'error');
    els.loadProgress.hidden = false;
    els.loadProgressText.textContent = error.message;
    els.roundStatus.textContent = 'See the loading message above.';
  } finally {
    updateControls();
  }
}

init();
