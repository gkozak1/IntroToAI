(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clampInt = (v, min, max) => Math.max(min, Math.min(max, parseInt(v, 10) || min));
  const fmt = (v) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '?';
    if (Math.abs(v) < 1e-10) v = 0;
    const rounded = Math.round(v * 1000) / 1000;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, '').replace(/\.$/, '');
  };
  const nearlyEqual = (a, b, tol = 1e-3) => Number.isFinite(a) && Math.abs(a - b) <= tol;
  const parseNumber = (el) => {
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : NaN;
  };

  const ACTIVATIONS = {
    relu: { label: 'ReLU', fn: (z) => Math.max(0, z), formula: (z) => `max(0, ${fmt(z)})` },
    linear: { label: 'Linear', fn: (z) => z, formula: (z) => `${fmt(z)}` },
    sigmoid: { label: 'Sigmoid', fn: (z) => 1 / (1 + Math.exp(-z)), formula: (z) => `1 / (1 + e^(-${fmt(z)}))` },
    tanh: { label: 'Tanh', fn: (z) => Math.tanh(z), formula: (z) => `tanh(${fmt(z)})` }
  };

  let state = createSimpleState();
  let selectedNeuron = null; // {layerIndex, neuronIndex}
  let selectedEdge = null; // {transition, source, target}
  let matrixBuilt = false;
  let matrixPractice = false;
  let matrixTransitionIndex = 0;
  let dotTransitionIndex = 0;
  let dotNeuronIndex = 0;

  function createSimpleState() {
    const sizes = [3, 3, 2];
    return makeState(sizes, 'relu', {
      inputs: [1, 2, 4],
      weights: [
        [
          [0.2, -0.4, 0.5],
          [0.6, 0.3, -0.2],
          [0.1, 0.5, -0.4]
        ],
        [
          [0.4, -0.3],
          [0.2, 0.7],
          [-0.5, 0.6]
        ]
      ],
      biases: [
        [0.1, -0.2, -0.3],
        [0.2, -0.1]
      ]
    });
  }

  function createChapterStyleState() {
    const sizes = [3, 4, 3, 2];
    return makeState(sizes, 'relu', {
      inputs: [1, 2, 4],
      weights: [
        [
          [0.1, 0.2, -0.3, 0.4],
          [0.5, 0.6, -0.7, 0.8],
          [0.1, 0.2, 0.3, -0.4]
        ],
        [
          [0.3, -0.2, 0.5],
          [0.4, 0.1, -0.3],
          [-0.5, 0.6, 0.2],
          [0.2, -0.4, 0.7]
        ],
        [
          [0.5, -0.3],
          [0.2, 0.4],
          [-0.6, 0.7]
        ]
      ],
      biases: [
        [0, 0, 0, 0],
        [0.1, -0.2, 0.2],
        [0, 0.1]
      ]
    });
  }

  function makeState(sizes, activation, preset = null) {
    const weights = [];
    const biases = [];
    for (let l = 0; l < sizes.length - 1; l++) {
      const w = Array.from({ length: sizes[l] }, () =>
        Array.from({ length: sizes[l + 1] }, () => randomSmall())
      );
      const b = Array.from({ length: sizes[l + 1] }, () => randomSmallBias());
      weights.push(w);
      biases.push(b);
    }
    return {
      sizes,
      activation,
      inputs: preset?.inputs ? [...preset.inputs] : Array.from({ length: sizes[0] }, () => randomInput()),
      weights: preset?.weights ? deepClone(preset.weights) : weights,
      biases: preset?.biases ? deepClone(preset.biases) : biases,
      revealed: sizes.map((n, idx) => Array.from({ length: n }, () => idx === 0))
    };
  }

  function deepClone(x) { return JSON.parse(JSON.stringify(x)); }
  function randomSmall() { return Math.round((Math.random() * 2 - 1) * 10) / 10; }
  function randomSmallBias() { return Math.round((Math.random() * 1.2 - 0.6) * 10) / 10; }
  function randomInput() { return Math.floor(Math.random() * 5); }

  function layerNames() {
    const names = ['Input'];
    if (state.sizes.length === 3) names.push('Hidden 1', 'Output');
    else names.push('Hidden 1', 'Hidden 2', 'Output');
    return names;
  }

  function trueForward() {
    const activations = [state.inputs.slice()];
    const zs = [null];
    for (let l = 0; l < state.weights.length; l++) {
      const prev = activations[l];
      const nextZ = [];
      const nextA = [];
      for (let j = 0; j < state.sizes[l + 1]; j++) {
        let sum = 0;
        for (let i = 0; i < state.sizes[l]; i++) sum += prev[i] * state.weights[l][i][j];
        const z = sum + state.biases[l][j];
        nextZ.push(z);
        nextA.push(ACTIVATIONS[state.activation].fn(z));
      }
      zs.push(nextZ);
      activations.push(nextA);
    }
    return { activations, zs };
  }

  function priorLayerReady(layerIndex) {
    if (layerIndex <= 0) return true;
    return state.revealed[layerIndex - 1].every(Boolean);
  }

  function firstIncompleteLayer() {
    for (let l = 1; l < state.sizes.length; l++) {
      if (!state.revealed[l].every(Boolean)) return l;
    }
    return -1;
  }

  function revealLayer(layerIndex) {
    if (layerIndex < 1 || !priorLayerReady(layerIndex)) return;
    state.revealed[layerIndex] = state.revealed[layerIndex].map(() => true);
    renderAll();
  }

  function revealNeuron(layerIndex, neuronIndex) {
    if (layerIndex < 1 || !priorLayerReady(layerIndex)) return;
    state.revealed[layerIndex][neuronIndex] = true;
    renderAll();
  }

  function resetCalculations() {
    state.revealed = state.sizes.map((n, idx) => Array.from({ length: n }, () => idx === 0));
    selectedNeuron = null;
    selectedEdge = null;
    matrixBuilt = false;
    matrixPractice = false;
    renderAll();
  }

  function transitionLabel(t) {
    const names = layerNames();
    return `${names[t]} → ${names[t + 1]}`;
  }

  function syncArchitectureControls() {
    $('inputCount').value = state.sizes[0];
    $('hidden1Count').value = state.sizes[1];
    const hasH2 = state.sizes.length === 4;
    $('hidden2Count').value = hasH2 ? state.sizes[2] : '0';
    $('outputCount').value = state.sizes[state.sizes.length - 1];
    $('activationSelect').value = state.activation;
  }

  function populateTransitionSelects() {
    const maxT = state.weights.length - 1;
    matrixTransitionIndex = Math.min(matrixTransitionIndex, maxT);
    dotTransitionIndex = Math.min(dotTransitionIndex, maxT);
    ['matrixTransition', 'dotTransition'].forEach((id) => {
      const sel = $(id);
      const current = id === 'matrixTransition' ? matrixTransitionIndex : dotTransitionIndex;
      sel.innerHTML = '';
      state.weights.forEach((_, t) => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = transitionLabel(t);
        if (t === current) opt.selected = true;
        sel.appendChild(opt);
      });
    });
    populateDotNeuronSelect();
  }

  function populateDotNeuronSelect() {
    const sel = $('dotNeuron');
    const targetSize = state.sizes[dotTransitionIndex + 1];
    dotNeuronIndex = Math.min(dotNeuronIndex, targetSize - 1);
    sel.innerHTML = '';
    for (let j = 0; j < targetSize; j++) {
      const opt = document.createElement('option');
      opt.value = j;
      opt.textContent = `${layerNames()[dotTransitionIndex + 1]} neuron ${j + 1}`;
      if (j === dotNeuronIndex) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function renderAll() {
    syncArchitectureControls();
    populateTransitionSelects();
    renderNetwork();
    renderNeuronPanel();
    renderMatrix();
    renderDotProduct();
    updateNextLayerButton();
  }

  function updateNextLayerButton() {
    const next = firstIncompleteLayer();
    const btn = $('calculateNextLayerBtn');
    const status = $('nextLayerStatus');
    if (next === -1) {
      btn.disabled = true;
      btn.textContent = 'Network Complete';
      status.textContent = 'All layer values are revealed.';
      return;
    }
    if (!priorLayerReady(next)) {
      btn.disabled = true;
      btn.textContent = 'Calculate Next Layer';
      status.textContent = 'Finish the prior layer first.';
      return;
    }
    btn.disabled = false;
    btn.textContent = `Calculate ${layerNames()[next]}`;
    status.textContent = 'Use this after you understand one neuron calculation.';
  }

  function svgEl(tag, attrs = {}) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }

  function renderNetwork() {
    const svg = $('networkSvg');
    svg.innerHTML = '';
    const width = Math.max(760, $('networkSvgWrap').clientWidth || 900);
    const height = 460;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const names = layerNames();
    const forward = trueForward();
    const cols = state.sizes.length;
    const xPad = 75;
    const xPositions = Array.from({ length: cols }, (_, i) => xPad + i * ((width - 2 * xPad) / (cols - 1)));
    const nodeR = 36;
    const yTop = 76;
    const yBottom = height - 40;
    const positions = state.sizes.map((n, l) => {
      if (n === 1) return [{ x: xPositions[l], y: (yTop + yBottom) / 2 }];
      const gap = (yBottom - yTop) / (n - 1);
      return Array.from({ length: n }, (_, j) => ({ x: xPositions[l], y: yTop + gap * j }));
    });

    // layer labels
    names.forEach((name, l) => {
      const t = svgEl('text', { x: xPositions[l], y: 26, 'text-anchor': 'middle', class: 'layer-label' });
      t.textContent = name;
      svg.appendChild(t);
    });

    const showAllWeights = $('showAllWeights').checked;
    const focus = selectedNeuron;

    // edges and weight labels
    for (let t = 0; t < state.weights.length; t++) {
      for (let i = 0; i < state.sizes[t]; i++) {
        for (let j = 0; j < state.sizes[t + 1]; j++) {
          const p1 = positions[t][i], p2 = positions[t + 1][j];
          const isFocused = !!focus && focus.layerIndex === t + 1 && focus.neuronIndex === j;
          const isExact = !!selectedEdge && selectedEdge.transition === t && selectedEdge.source === i && selectedEdge.target === j;
          const unrelated = !!focus && !isFocused;
          const edge = svgEl('line', {
            x1: p1.x + nodeR - 3,
            y1: p1.y,
            x2: p2.x - nodeR + 3,
            y2: p2.y,
            class: `edge${isFocused ? ' focused' : ''}${isExact ? ' exact' : ''}${unrelated ? ' dimmed' : ''}${state.revealed[t][i] && forward.activations[t][i] === 0 ? ' zero-source' : ''}`,
            'data-transition': t,
            'data-source': i,
            'data-target': j
          });
          edge.addEventListener('click', () => {
            selectedEdge = { transition: t, source: i, target: j };
            matrixTransitionIndex = t;
            $('matrixTransition').value = String(t);
            matrixBuilt = true;
            matrixPractice = false;
            document.querySelector('[data-view="matrix"]').click();
            renderMatrix();
          });
          svg.appendChild(edge);

          if (showAllWeights || isFocused) {
            const ratio = 0.52;
            const lx = p1.x + (p2.x - p1.x) * ratio;
            const ly = p1.y + (p2.y - p1.y) * ratio;
            const g = svgEl('g', { class: `weight-label${unrelated ? ' dimmed' : ''}` });
            const rect = svgEl('rect', { x: lx - 20, y: ly - 11, width: 40, height: 22 });
            const txt = svgEl('text', { x: lx, y: ly + 4, 'text-anchor': 'middle' });
            txt.textContent = fmt(state.weights[t][i][j]);
            g.append(rect, txt);
            svg.appendChild(g);
          }
        }
      }
    }

    // nodes
    for (let l = 0; l < state.sizes.length; l++) {
      for (let j = 0; j < state.sizes[l]; j++) {
        const { x, y } = positions[l][j];
        const isSelected = !!focus && focus.layerIndex === l && focus.neuronIndex === j;
        const isRelevantSource = !!focus && focus.layerIndex === l + 1;
        const sourceForFocus = isRelevantSource;
        const dimmed = !!focus && !isSelected && !(sourceForFocus && l === focus.layerIndex - 1);
        const g = svgEl('g', { class: `node-group${isSelected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`, tabindex: '0', role: 'button' });
        g.dataset.layer = l;
        g.dataset.neuron = j;
        if (l === 0) {
          const c = svgEl('circle', { cx: x, cy: y, r: nodeR, class: 'node-circle input-node' });
          const title = svgEl('text', { x, y: y - 6, 'text-anchor': 'middle', class: 'node-title' });
          title.textContent = `x${j + 1}`;
          const val = svgEl('text', { x, y: y + 13, 'text-anchor': 'middle', class: 'node-value' });
          val.textContent = fmt(state.inputs[j]);
          g.append(c, title, val);
        } else {
          const clipId = `clip-${l}-${j}`;
          const defs = svgEl('defs');
          const clip = svgEl('clipPath', { id: clipId });
          clip.appendChild(svgEl('circle', { cx: x, cy: y, r: nodeR }));
          defs.appendChild(clip);
          g.appendChild(defs);
          const left = svgEl('rect', { x: x - nodeR, y: y - nodeR, width: nodeR, height: nodeR * 2, class: 'node-left', 'clip-path': `url(#${clipId})` });
          const right = svgEl('rect', { x, y: y - nodeR, width: nodeR, height: nodeR * 2, class: 'node-right', 'clip-path': `url(#${clipId})` });
          const circle = svgEl('circle', { cx: x, cy: y, r: nodeR, class: 'node-circle transparent-circle', fill: 'none' });
          const divider = svgEl('line', { x1: x, y1: y - nodeR + 2, x2: x, y2: y + nodeR - 2, class: 'node-divider' });
          const title = svgEl('text', { x, y: y - 44, 'text-anchor': 'middle', class: 'node-title' });
          title.textContent = `${l === state.sizes.length - 1 ? 'y' : 'h'}${j + 1}`;
          const zText = svgEl('text', { x: x - 18, y: y + 5, 'text-anchor': 'middle', class: 'node-value' });
          const aText = svgEl('text', { x: x + 18, y: y + 5, 'text-anchor': 'middle', class: 'node-value' });
          const revealed = state.revealed[l][j];
          zText.textContent = revealed ? fmt(forward.zs[l][j]) : '?';
          aText.textContent = revealed ? fmt(forward.activations[l][j]) : '?';
          const zLabel = svgEl('text', { x: x - 18, y: y - 11, 'text-anchor': 'middle', class: 'node-title' });
          zLabel.textContent = 'z';
          const aLabel = svgEl('text', { x: x + 18, y: y - 11, 'text-anchor': 'middle', class: 'node-title' });
          aLabel.textContent = 'a';
          g.append(left, right, circle, divider, title, zLabel, aLabel, zText, aText);

          const biasG = svgEl('g', { class: 'bias-badge' });
          biasG.append(
            svgEl('rect', { x: x - 29, y: y + nodeR + 8, width: 58, height: 22 }),
            (() => { const t = svgEl('text', { x, y: y + nodeR + 23, 'text-anchor': 'middle' }); t.textContent = `b ${fmt(state.biases[l - 1][j])}`; return t; })()
          );
          g.appendChild(biasG);
        }
        const selectFn = () => {
          selectedEdge = null;
          if (l === 0) selectedNeuron = { layerIndex: 0, neuronIndex: j };
          else selectedNeuron = { layerIndex: l, neuronIndex: j };
          renderNetwork();
          renderNeuronPanel();
        };
        g.addEventListener('click', selectFn);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFn(); } });
        svg.appendChild(g);
      }
    }
  }

  function renderNeuronPanel() {
    const panel = $('neuronDetails');
    const prompt = $('neuronPrompt');
    if (!selectedNeuron) {
      prompt.textContent = 'Select a hidden or output neuron.';
      panel.className = 'empty-state';
      panel.innerHTML = 'Start with one neuron. The rest of the network will fade so you can follow its inputs and weights.';
      return;
    }
    const { layerIndex: l, neuronIndex: j } = selectedNeuron;
    if (l === 0) {
      prompt.textContent = `Input neuron x${j + 1}`;
      panel.className = '';
      panel.innerHTML = `<div class="calc-section"><div class="formula-box">x${j + 1} = ${fmt(state.inputs[j])}</div><p class="muted">Input neurons already contain data. The calculation begins when values move to the next layer.</p></div>`;
      return;
    }
    prompt.textContent = `${layerNames()[l]} neuron ${j + 1}`;
    panel.className = '';
    if (!priorLayerReady(l)) {
      panel.innerHTML = `<div class="calc-section"><p>Calculate <strong>${layerNames()[l - 1]}</strong> first. This neuron needs the activated values from the prior layer.</p></div>`;
      return;
    }
    const f = trueForward();
    const prev = f.activations[l - 1];
    const weights = state.weights[l - 1].map(row => row[j]);
    const products = prev.map((v, i) => v * weights[i]);
    const dot = products.reduce((a, b) => a + b, 0);
    const bias = state.biases[l - 1][j];
    const z = dot + bias;
    const a = ACTIVATIONS[state.activation].fn(z);
    const expression = prev.map((v, i) => `(${fmt(v)} × ${fmt(weights[i])})`).join(' + ');

    panel.innerHTML = `
      <div class="calc-section">
        <div class="calc-row-grid">
          <div class="head">Prior a</div><div class="head">Weight</div><div class="head">Product</div><div></div>
          ${prev.map((v, i) => `<div>${fmt(v)}</div><div>× ${fmt(weights[i])}</div><div>= ${fmt(products[i])}</div><div></div>`).join('')}
        </div>
      </div>
      <div class="calc-section">
        <div class="formula-box">${expression}<br>+ bias ${fmt(bias)}<br>→ z → ${ACTIVATIONS[state.activation].label}(z) → a</div>
      </div>
      <div class="calc-section">
        <div class="practice-line"><label for="neuronDotInput">Weighted sum</label><input id="neuronDotInput" inputmode="decimal"><span id="neuronDotFeedback" class="feedback"></span></div>
        <div class="practice-line"><label for="neuronZInput">After bias: z</label><input id="neuronZInput" inputmode="decimal"><span id="neuronZFeedback" class="feedback"></span></div>
        <div class="practice-line"><label for="neuronAInput">After ${ACTIVATIONS[state.activation].label}: a</label><input id="neuronAInput" inputmode="decimal"><span id="neuronAFeedback" class="feedback"></span></div>
        <div class="practice-actions">
          <button id="checkNeuronBtn" class="primary">Check My Work</button>
          <button id="showNeuronBtn" class="secondary">Show Me</button>
        </div>
      </div>
    `;

    $('checkNeuronBtn').addEventListener('click', () => {
      const checks = [
        ['neuronDotInput', 'neuronDotFeedback', dot],
        ['neuronZInput', 'neuronZFeedback', z],
        ['neuronAInput', 'neuronAFeedback', a]
      ];
      let allGood = true;
      checks.forEach(([inputId, fbId, answer]) => {
        const input = $(inputId), fb = $(fbId);
        const val = parseNumber(input);
        const good = nearlyEqual(val, answer, state.activation === 'sigmoid' || state.activation === 'tanh' ? 0.01 : 0.001);
        allGood = allGood && good;
        fb.textContent = good ? 'Correct' : 'Check it';
        fb.className = `feedback ${good ? 'good' : 'bad'}`;
      });
      if (allGood) revealNeuron(l, j);
    });
    $('showNeuronBtn').addEventListener('click', () => {
      $('neuronDotInput').value = fmt(dot);
      $('neuronZInput').value = fmt(z);
      $('neuronAInput').value = fmt(a);
      ['neuronDotFeedback', 'neuronZFeedback', 'neuronAFeedback'].forEach(id => { $(id).textContent = 'Shown'; $(id).className = 'feedback good'; });
      revealNeuron(l, j);
    });
  }

  function renderMatrix() {
    const content = $('matrixContent');
    if (!matrixBuilt && !matrixPractice) {
      content.className = 'matrix-content empty-matrix';
      content.innerHTML = '<p>Start blank. Choose a transition, then build it or practice filling it from the network.</p>';
      return;
    }
    content.className = 'matrix-content';
    const t = matrixTransitionIndex;
    const f = trueForward();
    const sourceValues = f.activations[t];
    const sourceUnknown = new Set(sourceValues.map((_, i) => state.revealed[t][i] ? null : `0-${i}`).filter(Boolean));
    const targetZ = f.zs[t + 1];
    const targetA = f.activations[t + 1];

    const vectorHtml = matrixGridHtml([sourceValues], `matrix-source-${t}`, sourceUnknown.size ? sourceUnknown : null, false);
    const weightsHtml = matrixPractice ? matrixPracticeGridHtml(state.weights[t], 'weight') : matrixGridHtml(state.weights[t], `matrix-w-${t}`, null, true, t);
    const biasHtml = matrixPractice ? matrixPracticeGridHtml([state.biases[t]], 'bias') : matrixGridHtml([state.biases[t]], `matrix-b-${t}`);
    const zUnknown = new Set(targetZ.map((_, i) => state.revealed[t + 1][i] ? null : `0-${i}`).filter(Boolean));
    const aUnknown = new Set(targetA.map((_, i) => state.revealed[t + 1][i] ? null : `0-${i}`).filter(Boolean));
    const zHtml = matrixGridHtml([targetZ], `matrix-z-${t}`, zUnknown.size ? zUnknown : null);
    const aHtml = matrixGridHtml([targetA], `matrix-a-${t}`, aUnknown.size ? aUnknown : null);

    content.innerHTML = `
      <div class="matrix-equation">
        ${matrixBlockHtml('a (current layer)', `1 × ${state.sizes[t]}`, vectorHtml)}
        <span class="matrix-op">·</span>
        ${matrixBlockHtml('W (weights)', `${state.sizes[t]} × ${state.sizes[t + 1]}`, weightsHtml)}
        <span class="matrix-op">+</span>
        ${matrixBlockHtml('b (bias)', `1 × ${state.sizes[t + 1]}`, biasHtml)}
        <span class="matrix-op">=</span>
        ${matrixBlockHtml('z', `1 × ${state.sizes[t + 1]}`, zHtml)}
        <span class="matrix-op">→</span>
        ${matrixBlockHtml(`${ACTIVATIONS[state.activation].label}(z) = a`, `1 × ${state.sizes[t + 1]}`, aHtml)}
      </div>
      ${matrixPractice ? '<div class="matrix-practice-actions"><button id="checkMatrixBtn" class="primary">Check Matrix</button> <span id="matrixFeedback" class="feedback"></span></div>' : ''}
      <div class="matrix-legend">In this row-vector convention, each <strong>column of W</strong> contains the weights entering one destination neuron. Click a weight cell to locate its network connection.</div>
    `;

    if (!matrixPractice) {
      content.querySelectorAll('.weight-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const target = parseInt(cell.dataset.target, 10);
          selectedEdge = { transition: t, source: parseInt(cell.dataset.source, 10), target };
          selectedNeuron = { layerIndex: t + 1, neuronIndex: target };
          document.querySelector('[data-view="network"]').click();
          renderNetwork();
          renderNeuronPanel();
        });
      });
    } else {
      $('checkMatrixBtn').addEventListener('click', checkMatrixPractice);
      content.querySelectorAll('.matrix-practice-input').forEach(inp => {
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); checkOneMatrixInput(inp); }
        });
        inp.addEventListener('blur', () => { if (inp.value.trim()) checkOneMatrixInput(inp); });
      });
    }
  }

  function matrixBlockHtml(name, dim, grid) {
    return `<div class="matrix-block"><div class="matrix-name">${name}</div><div class="dim-label">${dim}</div>${grid}</div>`;
  }

  function matrixGridHtml(matrix, id, unknownSet = null, weightsClickable = false, transition = null) {
    const rows = matrix.length, cols = matrix[0].length;
    return `<div id="${id}" class="matrix-grid" style="grid-template-columns:repeat(${cols}, minmax(48px,auto))">
      ${matrix.map((row, r) => row.map((val, c) => {
        const unknown = unknownSet?.has(`${r}-${c}`);
        const linked = weightsClickable && selectedEdge && selectedEdge.transition === transition && selectedEdge.source === r && selectedEdge.target === c;
        const weightClass = weightsClickable ? ` weight-cell${linked ? ' linked' : ''}` : '';
        const data = weightsClickable ? ` data-transition="${transition}" data-source="${r}" data-target="${c}"` : '';
        return `<div class="matrix-cell${weightClass}${unknown ? ' unknown' : ''}"${data}>${unknown ? '?' : fmt(val)}</div>`;
      }).join('')).join('')}
    </div>`;
  }

  function matrixPracticeGridHtml(matrix, type) {
    const rows = matrix.length, cols = matrix[0].length;
    return `<div class="matrix-grid" style="grid-template-columns:repeat(${cols}, minmax(62px,auto))">
      ${matrix.map((row, r) => row.map((val, c) => `<div class="matrix-cell"><input class="matrix-practice-input" data-kind="${type}" data-r="${r}" data-c="${c}" aria-label="${type} row ${r + 1} column ${c + 1}"></div>`).join('')).join('')}
    </div>`;
  }

  function matrixPracticeAnswer(inp) {
    const r = parseInt(inp.dataset.r, 10), c = parseInt(inp.dataset.c, 10);
    return inp.dataset.kind === 'weight' ? state.weights[matrixTransitionIndex][r][c] : state.biases[matrixTransitionIndex][c];
  }

  function checkOneMatrixInput(inp) {
    const good = nearlyEqual(parseNumber(inp), matrixPracticeAnswer(inp));
    inp.style.borderColor = good ? 'var(--good)' : 'var(--bad)';
    inp.style.background = good ? '#eef8f3' : '#fff2f2';
    return good;
  }

  function checkMatrixPractice() {
    const inputs = [...$('matrixContent').querySelectorAll('.matrix-practice-input')];
    const allGood = inputs.every(checkOneMatrixInput);
    const fb = $('matrixFeedback');
    fb.textContent = allGood ? 'Everything matches the network.' : 'Some cells still do not match.';
    fb.className = `feedback ${allGood ? 'good' : 'bad'}`;
  }

  function renderDotProduct() {
    const visual = $('dotVisual');
    const practice = $('dotPractice');
    const t = dotTransitionIndex;
    const j = dotNeuronIndex;
    const f = trueForward();
    const sourceReady = t === 0 || state.revealed[t].every(Boolean);
    if (!sourceReady) {
      visual.innerHTML = `<div class="empty-state">Calculate <strong>${layerNames()[t]}</strong> in Network View first. Dot products need the prior layer's activated values.</div>`;
      practice.innerHTML = `<div class="empty-state">Once the prior layer is known, you can practice one result entry here.</div>`;
      return;
    }
    const source = f.activations[t];
    const column = state.weights[t].map(row => row[j]);
    const products = source.map((v, i) => v * column[i]);
    const dot = products.reduce((a, b) => a + b, 0);
    const bias = state.biases[t][j];
    const z = dot + bias;
    const a = ACTIVATIONS[state.activation].fn(z);
    const rowGrid = matrixGridHtml([source], 'dot-row');
    const colGrid = matrixGridHtml(column.map(v => [v]), 'dot-col');
    visual.innerHTML = `
      <div class="dot-explainer">
        <div class="dot-matrices">
          ${matrixBlockHtml('Current activations', `1 × ${source.length}`, rowGrid)}
          <span class="matrix-op">·</span>
          <div class="dot-column">${matrixBlockHtml(`W column ${j + 1}`, `${column.length} × 1`, colGrid)}</div>
        </div>
        <div class="pair-list">
          ${source.map((v, i) => `<div class="pair-chip">${fmt(v)} × ${fmt(column[i])}</div>`).join('')}
        </div>
        <div class="dot-expression">${source.map((v, i) => `(${fmt(v)} × ${fmt(column[i])})`).join(' + ')} + bias ${fmt(bias)}</div>
        <p class="muted" style="text-align:center;margin:0">This single dot product creates ${layerNames()[t + 1]} neuron ${j + 1}.</p>
      </div>
    `;
    practice.innerHTML = `
      <div class="calc-section">
        <div class="practice-line"><label for="dotSumInput">Weighted sum</label><input id="dotSumInput" inputmode="decimal"><span id="dotSumFeedback" class="feedback"></span></div>
        <div class="practice-line"><label for="dotZInput">Add bias → z</label><input id="dotZInput" inputmode="decimal"><span id="dotZFeedback" class="feedback"></span></div>
        <div class="practice-line"><label for="dotAInput">${ACTIVATIONS[state.activation].label}(z) → a</label><input id="dotAInput" inputmode="decimal"><span id="dotAFeedback" class="feedback"></span></div>
        <div class="practice-actions">
          <button id="checkDotBtn" class="primary">Check My Work</button>
          <button id="revealDotBtn" class="secondary">Show Me</button>
          <button id="nextDotNeuronBtn" class="secondary">Next Neuron</button>
        </div>
      </div>
    `;
    $('checkDotBtn').addEventListener('click', () => {
      const checks = [
        ['dotSumInput', 'dotSumFeedback', dot],
        ['dotZInput', 'dotZFeedback', z],
        ['dotAInput', 'dotAFeedback', a]
      ];
      let allGood = true;
      checks.forEach(([inputId, fbId, ans]) => {
        const good = nearlyEqual(parseNumber($(inputId)), ans, state.activation === 'sigmoid' || state.activation === 'tanh' ? 0.01 : 0.001);
        allGood = allGood && good;
        $(fbId).textContent = good ? 'Correct' : 'Check it';
        $(fbId).className = `feedback ${good ? 'good' : 'bad'}`;
      });
      if (allGood) revealNeuron(t + 1, j);
    });
    $('revealDotBtn').addEventListener('click', () => {
      $('dotSumInput').value = fmt(dot); $('dotZInput').value = fmt(z); $('dotAInput').value = fmt(a);
      ['dotSumFeedback', 'dotZFeedback', 'dotAFeedback'].forEach(id => { $(id).textContent = 'Shown'; $(id).className = 'feedback good'; });
      revealNeuron(t + 1, j);
    });
    $('nextDotNeuronBtn').addEventListener('click', () => {
      dotNeuronIndex = (j + 1) % state.sizes[t + 1];
      populateDotNeuronSelect();
      renderDotProduct();
    });
  }

  function buildEditor() {
    const wrap = $('editorContent');
    const names = layerNames();
    let html = `<section class="editor-section"><h3>Input values</h3><div class="editor-grid" style="grid-template-columns:repeat(${state.sizes[0]},74px)">
      ${state.inputs.map((v, i) => `<input type="number" step="0.1" data-edit="input" data-i="${i}" value="${fmt(v)}" aria-label="Input ${i + 1}">`).join('')}
    </div></section>`;
    state.weights.forEach((matrix, t) => {
      const rows = matrix.length, cols = matrix[0].length;
      html += `<section class="editor-section"><h3>${names[t]} → ${names[t + 1]} weights</h3><div class="editor-grid" style="grid-template-columns:60px repeat(${cols},74px)">
        <div></div>${Array.from({length: cols}, (_, c) => `<div class="editor-col-label">to ${c + 1}</div>`).join('')}
        ${matrix.map((row, r) => `<div class="editor-row-label">from ${r + 1}</div>${row.map((v, c) => `<input type="number" step="0.1" data-edit="weight" data-t="${t}" data-r="${r}" data-c="${c}" value="${fmt(v)}" aria-label="Weight from neuron ${r + 1} to neuron ${c + 1}">`).join('')}`).join('')}
      </div><h3 style="margin-top:.8rem">${names[t + 1]} biases</h3><div class="editor-grid" style="grid-template-columns:repeat(${cols},74px)">
        ${state.biases[t].map((v, c) => `<input type="number" step="0.1" data-edit="bias" data-t="${t}" data-c="${c}" value="${fmt(v)}" aria-label="Bias for neuron ${c + 1}">`).join('')}
      </div></section>`;
    });
    wrap.innerHTML = html;
  }

  function saveEditorValues() {
    const inputs = [...$('editorContent').querySelectorAll('input')];
    for (const inp of inputs) {
      const v = parseFloat(inp.value);
      if (!Number.isFinite(v)) { alert('Every value must be a number.'); return false; }
      const kind = inp.dataset.edit;
      if (kind === 'input') state.inputs[+inp.dataset.i] = v;
      if (kind === 'weight') state.weights[+inp.dataset.t][+inp.dataset.r][+inp.dataset.c] = v;
      if (kind === 'bias') state.biases[+inp.dataset.t][+inp.dataset.c] = v;
    }
    resetCalculations();
    return true;
  }

  function randomizeValues() {
    state.inputs = state.inputs.map(() => randomInput());
    state.weights = state.weights.map(m => m.map(row => row.map(() => randomSmall())));
    state.biases = state.biases.map(row => row.map(() => randomSmallBias()));
    resetCalculations();
  }

  function applyArchitecture() {
    const input = clampInt($('inputCount').value, 1, 5);
    const h1 = clampInt($('hidden1Count').value, 1, 5);
    const h2 = clampInt($('hidden2Count').value, 0, 5);
    const output = clampInt($('outputCount').value, 1, 5);
    const sizes = h2 > 0 ? [input, h1, h2, output] : [input, h1, output];
    state = makeState(sizes, $('activationSelect').value);
    selectedNeuron = null; selectedEdge = null; matrixBuilt = false; matrixPractice = false; matrixTransitionIndex = 0; dotTransitionIndex = 0; dotNeuronIndex = 0;
    renderAll();
  }

  function setActivation() {
    state.activation = $('activationSelect').value;
    resetCalculations();
  }

  // Events
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active-view'));
      tab.classList.add('active');
      $(`${tab.dataset.view}View`).classList.add('active-view');
      if (tab.dataset.view === 'network') renderNetwork();
      if (tab.dataset.view === 'matrix') renderMatrix();
      if (tab.dataset.view === 'dot') renderDotProduct();
    });
  });

  $('applyArchitectureBtn').addEventListener('click', applyArchitecture);
  $('activationSelect').addEventListener('change', setActivation);
  $('simplePresetBtn').addEventListener('click', () => { state = createSimpleState(); selectedNeuron = null; selectedEdge = null; matrixBuilt = false; matrixPractice = false; matrixTransitionIndex = 0; dotTransitionIndex = 0; dotNeuronIndex = 0; renderAll(); });
  $('chapterPresetBtn').addEventListener('click', () => { state = createChapterStyleState(); selectedNeuron = null; selectedEdge = null; matrixBuilt = false; matrixPractice = false; matrixTransitionIndex = 0; dotTransitionIndex = 0; dotNeuronIndex = 0; renderAll(); });
  $('randomizeBtn').addEventListener('click', randomizeValues);
  $('resetCalcBtn').addEventListener('click', resetCalculations);
  $('showAllWeights').addEventListener('change', renderNetwork);
  $('calculateNextLayerBtn').addEventListener('click', () => { const l = firstIncompleteLayer(); if (l !== -1) revealLayer(l); });

  $('matrixTransition').addEventListener('change', (e) => { matrixTransitionIndex = +e.target.value; matrixBuilt = false; matrixPractice = false; renderMatrix(); });
  $('buildMatrixBtn').addEventListener('click', () => { matrixBuilt = true; matrixPractice = false; renderMatrix(); });
  $('practiceMatrixBtn').addEventListener('click', () => { matrixBuilt = false; matrixPractice = true; renderMatrix(); });
  $('clearMatrixBtn').addEventListener('click', () => { matrixBuilt = false; matrixPractice = false; renderMatrix(); });

  $('dotTransition').addEventListener('change', (e) => { dotTransitionIndex = +e.target.value; dotNeuronIndex = 0; populateDotNeuronSelect(); renderDotProduct(); });
  $('dotNeuron').addEventListener('change', (e) => { dotNeuronIndex = +e.target.value; renderDotProduct(); });

  $('editValuesBtn').addEventListener('click', () => { buildEditor(); $('editDialog').showModal(); });
  $('saveValuesBtn').addEventListener('click', (e) => { if (!saveEditorValues()) e.preventDefault(); });
  $('helpBtn').addEventListener('click', () => $('helpDialog').showModal());

  window.addEventListener('resize', () => { if (document.querySelector('[data-view="network"]').classList.contains('active')) renderNetwork(); });

  renderAll();
})();
