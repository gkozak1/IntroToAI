(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const fmt = value => {
    if (value === null || value === undefined || Number.isNaN(value)) return '?';
    const v = Math.abs(value) < 1e-10 ? 0 : Math.round(value * 1000) / 1000;
    return Number.isInteger(v) ? String(v) : String(v).replace(/0+$/, '').replace(/\.$/, '');
  };
  const closeEnough = (a, b) => Number.isFinite(a) && Math.abs(a - b) <= 0.0015;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, parseInt(v, 10) || min));
  const svgEl = (name, attrs = {}) => {
    const el = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  const ACTIVATIONS = {
    relu: { label: 'ReLU', fn: z => Math.max(0, z), formula: z => `max(0, ${fmt(z)})` },
    linear: { label: 'Linear', fn: z => z, formula: z => fmt(z) },
    sigmoid: { label: 'Sigmoid', fn: z => 1 / (1 + Math.exp(-z)), formula: z => `1 / (1 + e^(-${fmt(z)}))` },
    tanh: { label: 'Tanh', fn: z => Math.tanh(z), formula: z => `tanh(${fmt(z)})` }
  };

  const defaultPreset = {
    sizes: [3, 4, 3, 2],
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
      [0.1, -0.2, 0.2, -0.1],
      [0.1, -0.2, 0.2],
      [0, 0.1]
    ]
  };

  let state = makeState(defaultPreset.sizes, 'relu', defaultPreset);
  let stage = 'diagram';
  let guidance = true;
  let transition = 0;
  let selection = null; // {kind:'z'|'a', layer, neuron}
  let mappingFocusNeuron = null;
  let formulaTimer = null;

  function deepClone(x) { return JSON.parse(JSON.stringify(x)); }
  function randomWeight() { return Math.round((Math.random() * 2 - 1) * 10) / 10; }
  function randomBias() { return Math.round((Math.random() * 1.2 - 0.6) * 10) / 10; }
  function randomInput() { return Math.floor(Math.random() * 5); }

  function makeState(sizes, activation, preset = null) {
    const weights = [];
    const biases = [];
    for (let t = 0; t < sizes.length - 1; t++) {
      weights.push(Array.from({ length: sizes[t] }, () => Array.from({ length: sizes[t + 1] }, randomWeight)));
      biases.push(Array.from({ length: sizes[t + 1] }, randomBias));
    }
    const s = {
      sizes: sizes.slice(),
      activation,
      inputs: preset?.inputs ? deepClone(preset.inputs) : Array.from({ length: sizes[0] }, randomInput),
      weights: preset?.weights ? deepClone(preset.weights) : weights,
      biases: preset?.biases ? deepClone(preset.biases) : biases,
      diagramAnswers: [],
      mappingAnswers: [],
      mathAnswers: []
    };
    resetPracticeState(s);
    return s;
  }

  function resetPracticeState(target = state) {
    target.diagramAnswers = target.sizes.map((n, l) => l === 0 ? [] : Array.from({ length: n }, () => ({ z: '', a: '', zStatus: '', aStatus: '' })));
    target.mappingAnswers = target.weights.map((W, t) => ({
      a: Array.from({ length: target.sizes[t] }, () => ({ value: '', status: '' })),
      W: W.map(row => row.map(() => ({ value: '', status: '' }))),
      b: Array.from({ length: target.sizes[t + 1] }, () => ({ value: '', status: '' }))
    }));
    target.mathAnswers = target.weights.map((W, t) => ({
      z: Array.from({ length: target.sizes[t + 1] }, () => ({ value: '', status: '' })),
      a: Array.from({ length: target.sizes[t + 1] }, () => ({ value: '', status: '' }))
    }));
    selection = null;
    mappingFocusNeuron = null;
  }

  function layerNames() { return ['Input', 'Hidden 1', 'Hidden 2', 'Output']; }

  function forward() {
    const activations = [state.inputs.slice()];
    const zs = [null];
    for (let t = 0; t < state.weights.length; t++) {
      const prev = activations[t];
      const z = [];
      const a = [];
      for (let j = 0; j < state.sizes[t + 1]; j++) {
        let sum = 0;
        for (let i = 0; i < state.sizes[t]; i++) sum += prev[i] * state.weights[t][i][j];
        const zj = sum + state.biases[t][j];
        z.push(zj);
        a.push(ACTIVATIONS[state.activation].fn(zj));
      }
      zs.push(z);
      activations.push(a);
    }
    return { activations, zs };
  }

  function transitionLabel(t) { return `${layerNames()[t]} → ${layerNames()[t + 1]}`; }

  function isPriorDiagramLayerComplete(layer) {
    if (layer <= 1) return true;
    return state.diagramAnswers[layer - 1].every(ans => ans.aStatus === 'good');
  }

  function actualPrevA(t) { return forward().activations[t]; }

  function showFormula(layer, neuron, kind) {
    if (layer === 0) return;
    const truth = forward();
    const t = layer - 1;
    const z = truth.zs[layer][neuron];
    const a = truth.activations[layer][neuron];
    const pop = $('formulaPopover');
    if (kind === 'z') {
      const terms = truth.activations[t].map((v, i) => `(${fmt(v)} × ${fmt(state.weights[t][i][neuron])})`).join(' + ');
      pop.innerHTML = `<button class="close-formula" aria-label="Close">×</button><strong>z${neuron + 1}</strong> = ${terms} + (${fmt(state.biases[t][neuron])}) = <strong>${fmt(z)}</strong>`;
    } else {
      pop.innerHTML = `<button class="close-formula" aria-label="Close">×</button><strong>a${neuron + 1}</strong> = ${ACTIVATIONS[state.activation].label}(z${neuron + 1}) = ${ACTIVATIONS[state.activation].formula(z)} = <strong>${fmt(a)}</strong>`;
    }
    pop.classList.remove('hidden');
    pop.querySelector('.close-formula').addEventListener('click', () => pop.classList.add('hidden'));
    clearTimeout(formulaTimer);
    formulaTimer = setTimeout(() => pop.classList.add('hidden'), 8500);
  }

  function syncControls() {
    $('inputCount').value = state.sizes[0];
    $('hidden1Count').value = state.sizes[1];
    $('hidden2Count').value = state.sizes[2];
    $('outputCount').value = state.sizes[3];
    $('activationSelect').value = state.activation;
  }

  function renderStage() {
    $('diagramStage').classList.toggle('hidden', stage !== 'diagram');
    $('mappingStage').classList.toggle('hidden', stage !== 'mapping');
    $('mathStage').classList.toggle('hidden', stage !== 'math');
    document.querySelectorAll('.lesson-step').forEach(btn => btn.classList.toggle('active', btn.dataset.stage === stage));
    $('beginnerBtn').classList.toggle('active', guidance);
    $('advancedBtn').classList.toggle('active', !guidance);

    const intro = {
      diagram: 'First, calculate directly from the picture. The goal is to understand exactly what happens inside one neuron.',
      mapping: 'Now reorganize the same picture into vectors and matrices. This step is only about where the values belong.',
      math: 'Finally, use the matrix representation to reproduce the same z and activated a values more cleanly.'
    };
    $('stageIntro').textContent = intro[stage];

    if (stage === 'diagram') renderDiagramStage();
    if (stage === 'mapping') renderMappingStage();
    if (stage === 'math') renderMathStage();
  }

  // ---------- NETWORK DRAWING ----------
  function networkLayout(width, height) {
    const left = 95, right = width - 95, top = 72, bottom = height - 48;
    const xs = state.sizes.map((_, l) => left + (right - left) * l / (state.sizes.length - 1));
    const positions = state.sizes.map((n, l) => Array.from({ length: n }, (_, i) => ({
      x: xs[l], y: top + (bottom - top) * (i + 1) / (n + 1)
    })));
    return positions;
  }

  function appendText(parent, text, attrs) {
    const el = svgEl('text', attrs);
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function appendWeight(svg, x, y, value, classes = '') {
    const g = svgEl('g', { class: `weight-group ${classes}`.trim() });
    g.appendChild(svgEl('rect', { x: x - 17, y: y - 10, width: 34, height: 20, rx: 5, class: 'weight-bg' }));
    appendText(g, fmt(value), { x, y: y + 4, 'text-anchor': 'middle', class: 'weight-text' });
    svg.appendChild(g);
    return g;
  }

  function renderNetwork(svg, options = {}) {
    const width = options.width || 1040;
    const height = options.height || 510;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';
    const pos = networkLayout(width, height);
    const truth = forward();
    const showWeights = options.showWeights !== false;
    const focus = options.focus || null; // {layer,neuron,kind}
    const mappingFocus = options.mappingFocus;
    const mini = !!options.mini;

    const selectedLayer = focus?.layer ?? (mappingFocus !== null && mappingFocus !== undefined ? transition + 1 : null);
    const selectedNeuron = focus?.neuron ?? mappingFocus;

    // edges first
    for (let t = 0; t < state.weights.length; t++) {
      for (let i = 0; i < state.sizes[t]; i++) {
        for (let j = 0; j < state.sizes[t + 1]; j++) {
          const p1 = pos[t][i], p2 = pos[t + 1][j];
          let related = selectedLayer === t + 1 && selectedNeuron === j && (!focus || focus.kind === 'z');
          let dim = selectedLayer !== null && !related;
          const edge = svgEl('line', {
            x1: p1.x + 31, y1: p1.y, x2: p2.x - 31, y2: p2.y,
            class: `edge${related ? ' related' : ''}${dim ? ' dim' : ''}`
          });
          svg.appendChild(edge);
          if (showWeights && (!mini || related) && ($('showAllWeights')?.checked || related || stage !== 'diagram')) {
            const f = 0.66;
            const x = p1.x + (p2.x - p1.x) * f;
            const y = p1.y + (p2.y - p1.y) * f;
            appendWeight(svg, x, y, state.weights[t][i][j], `${related ? 'related' : ''}${dim ? ' dim' : ''}`);
          }
        }
      }
    }

    // layer labels
    layerNames().forEach((name, l) => appendText(svg, name, { x: pos[l][0].x, y: 28, 'text-anchor': 'middle', class: 'layer-label' }));

    // nodes
    for (let l = 0; l < state.sizes.length; l++) {
      for (let j = 0; j < state.sizes[l]; j++) {
        const p = pos[l][j];
        const group = svgEl('g', { class: 'node-group' });
        const nodeRelated = selectedLayer === l && selectedNeuron === j;
        if (nodeRelated) group.classList.add('related');
        if (selectedLayer !== null && !nodeRelated && !(focus?.kind === 'z' && l === selectedLayer - 1)) group.classList.add('dim');

        if (l === 0) {
          group.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 30, class: 'node-circle input-circle' }));
          appendText(group, `a${j + 1}`, { x: p.x, y: p.y - 6, 'text-anchor': 'middle', class: 'node-label' });
          appendText(group, fmt(state.inputs[j]), { x: p.x, y: p.y + 12, 'text-anchor': 'middle', class: 'node-value' });
        } else {
          const clipId = `${svg.id}-clip-${l}-${j}`;
          const defs = svg.querySelector('defs') || svg.insertBefore(svgEl('defs'), svg.firstChild);
          const clip = svgEl('clipPath', { id: clipId });
          clip.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 30 }));
          defs.appendChild(clip);
          group.appendChild(svgEl('rect', { x: p.x - 30, y: p.y - 30, width: 30, height: 60, class: 'node-z-half', 'clip-path': `url(#${clipId})` }));
          group.appendChild(svgEl('rect', { x: p.x, y: p.y - 30, width: 30, height: 60, class: 'node-a-half', 'clip-path': `url(#${clipId})` }));
          group.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 30, class: 'node-circle', fill: 'none' }));
          group.appendChild(svgEl('line', { x1: p.x, y1: p.y - 29, x2: p.x, y2: p.y + 29, class: 'node-divider' }));
          appendText(group, 'z', { x: p.x - 14, y: p.y - 10, 'text-anchor': 'middle', class: 'node-label' });
          appendText(group, 'a', { x: p.x + 14, y: p.y - 10, 'text-anchor': 'middle', class: 'node-label' });

          let zDisplay, aDisplay, zStatus = '', aStatus = '';
          if (options.mode === 'diagram' && !guidance) {
            const ans = state.diagramAnswers[l][j];
            zDisplay = ans.z === '' ? '?' : ans.z;
            aDisplay = ans.a === '' ? '?' : ans.a;
            zStatus = ans.zStatus; aStatus = ans.aStatus;
          } else {
            zDisplay = fmt(truth.zs[l][j]);
            aDisplay = fmt(truth.activations[l][j]);
          }
          appendText(group, zDisplay, { x: p.x - 14, y: p.y + 10, 'text-anchor': 'middle', class: `node-value node-result ${zStatus}` });
          appendText(group, aDisplay, { x: p.x + 14, y: p.y + 10, 'text-anchor': 'middle', class: `node-value node-result ${aStatus}` });

          const zHit = svgEl('rect', { x: p.x - 30, y: p.y - 30, width: 30, height: 60, class: 'node-half-hit' });
          const aHit = svgEl('rect', { x: p.x, y: p.y - 30, width: 30, height: 60, class: 'node-half-hit' });
          if (options.interactive !== false) {
            zHit.addEventListener('click', () => onNetworkValueClick(l, j, 'z', options.mode));
            aHit.addEventListener('click', () => onNetworkValueClick(l, j, 'a', options.mode));
          }
          group.appendChild(zHit); group.appendChild(aHit);

          // bias
          const bg = svgEl('g', { class: `bias-group${focus?.kind === 'z' && nodeRelated ? ' related' : ''}` });
          bg.appendChild(svgEl('rect', { x: p.x - 22, y: p.y + 35, width: 44, height: 19, rx: 6 }));
          appendText(bg, `b=${fmt(state.biases[l - 1][j])}`, { x: p.x, y: p.y + 48, 'text-anchor': 'middle' });
          group.appendChild(bg);
        }
        svg.appendChild(group);
      }
    }
    return pos;
  }

  function onNetworkValueClick(layer, neuron, kind, mode) {
    selection = { layer, neuron, kind };
    if (mode === 'mapping') {
      if (layer !== transition + 1) {
        transition = layer - 1;
        renderMappingStage();
      }
      mappingFocusNeuron = neuron;
      renderMappingStage();
      return;
    }
    if (mode === 'diagram') {
      if (guidance) showFormula(layer, neuron, kind);
      else {
        if (!isPriorDiagramLayerComplete(layer)) return;
        const ans = state.diagramAnswers[layer][neuron];
        if ((kind === 'z' && ans.zStatus === 'good') || (kind === 'a' && ans.aStatus === 'good')) showFormula(layer, neuron, kind);
      }
      renderDiagramStage();
    }
  }

  // ---------- STEP 1 ----------
  function renderDiagramStage() {
    $('diagramInstruction').textContent = guidance
      ? 'Worked example: click any z or a value to see exactly which values produced it.'
      : 'Practice: click a blank z or a value. Guidance highlights the needed values only when Guidance is On.';
    $('checkDiagramBtn').style.display = guidance ? 'none' : '';
    renderNetwork($('diagramSvg'), { mode: 'diagram', focus: selection, showWeights: true });
    renderDiagramPracticeDock();
  }

  function renderDiagramPracticeDock() {
    const dock = $('diagramPracticeBar');
    if (guidance || !selection || selection.layer === 0) { dock.innerHTML = ''; return; }
    const { layer, neuron, kind } = selection;
    if (!isPriorDiagramLayerComplete(layer)) {
      dock.innerHTML = `<span class="hint">Finish the activated a values in ${layerNames()[layer - 1]} before moving to ${layerNames()[layer]}.</span>`;
      return;
    }
    const ans = state.diagramAnswers[layer][neuron];
    const label = `${layerNames()[layer]} neuron ${neuron + 1}`;
    if (kind === 'z') {
      dock.innerHTML = `<div class="practice-row"><strong>${label}: calculate z</strong><span class="hint">Multiply each prior a by its incoming weight, add the products, then add bias.</span><label>z = <input id="diagramAnswerInput" class="answer-input ${ans.zStatus}" value="${ans.z}"></label><button id="diagramAnswerCheck" class="btn primary">Check</button><span id="diagramAnswerFeedback"></span></div>`;
      $('diagramAnswerCheck').addEventListener('click', () => checkDiagramOne(layer, neuron, 'z'));
      $('diagramAnswerInput').addEventListener('input', e => { state.diagramAnswers[layer][neuron].z = e.target.value; });
    } else {
      const zKnown = ans.zStatus === 'good';
      dock.innerHTML = `<div class="practice-row"><strong>${label}: apply ${ACTIVATIONS[state.activation].label}</strong><span class="hint">${zKnown ? `Use z = ${fmt(forward().zs[layer][neuron])}.` : 'Calculate z correctly first.'}</span><label>a = <input id="diagramAnswerInput" class="answer-input ${ans.aStatus}" value="${ans.a}" ${zKnown ? '' : 'disabled'}></label><button id="diagramAnswerCheck" class="btn primary" ${zKnown ? '' : 'disabled'}>Check</button><span id="diagramAnswerFeedback"></span></div>`;
      if (zKnown) {
        $('diagramAnswerCheck').addEventListener('click', () => checkDiagramOne(layer, neuron, 'a'));
        $('diagramAnswerInput').addEventListener('input', e => { state.diagramAnswers[layer][neuron].a = e.target.value; });
      }
    }
  }

  function checkDiagramOne(layer, neuron, kind) {
    const inp = $('diagramAnswerInput');
    const v = parseFloat(inp.value);
    const truth = forward();
    const correct = kind === 'z' ? truth.zs[layer][neuron] : truth.activations[layer][neuron];
    const ans = state.diagramAnswers[layer][neuron];
    ans[kind] = inp.value;
    ans[`${kind}Status`] = closeEnough(v, correct) ? 'good' : 'bad';
    renderDiagramStage();
    if (ans[`${kind}Status`] === 'good') showFormula(layer, neuron, kind);
  }

  function checkAllDiagram() {
    if (guidance) return;
    const truth = forward();
    for (let l = 1; l < state.sizes.length; l++) {
      for (let j = 0; j < state.sizes[l]; j++) {
        const ans = state.diagramAnswers[l][j];
        if (ans.z !== '') ans.zStatus = closeEnough(parseFloat(ans.z), truth.zs[l][j]) ? 'good' : 'bad';
        if (ans.a !== '') ans.aStatus = closeEnough(parseFloat(ans.a), truth.activations[l][j]) ? 'good' : 'bad';
      }
    }
    renderDiagramStage();
  }

  // ---------- MATRIX UI HELPERS ----------
  function renderTransitionTabs(container, callback) {
    container.innerHTML = '';
    state.weights.forEach((_, t) => {
      const btn = document.createElement('button');
      btn.className = `transition-btn${t === transition ? ' active' : ''}`;
      btn.textContent = transitionLabel(t);
      btn.addEventListener('click', () => { transition = t; selection = null; mappingFocusNeuron = null; callback(); });
      container.appendChild(btn);
    });
  }

  function matrixBlock(name, rows, cols, cellRenderer, extraClass = '') {
    const block = document.createElement('div'); block.className = 'matrix-block';
    block.innerHTML = `<div class="matrix-name">${name}</div><div class="matrix-dim">${rows} × ${cols}</div>`;
    const grid = document.createElement('div'); grid.className = `matrix-grid ${extraClass}`; grid.style.gridTemplateColumns = `repeat(${cols}, minmax(50px, auto))`;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid.appendChild(cellRenderer(r, c));
    block.appendChild(grid); return block;
  }

  function textCell(text, classes = '') { const d = document.createElement('div'); d.className = `matrix-cell ${classes}`.trim(); d.textContent = text; return d; }
  function op(text) { const d = document.createElement('div'); d.className = 'matrix-op'; d.textContent = text; return d; }

  function inputCell(valueObj, dataset, classes = '') {
    const cell = document.createElement('div'); cell.className = `matrix-cell ${classes}`.trim();
    const inp = document.createElement('input'); inp.className = `matrix-input ${valueObj.status}`; inp.value = valueObj.value; Object.assign(inp.dataset, dataset); cell.appendChild(inp); return cell;
  }

  // ---------- STEP 2 ----------
  function renderMappingStage() {
    $('mappingInstruction').textContent = guidance
      ? 'Click a destination neuron. Its incoming values are highlighted in the diagram and in their empty matrix locations.'
      : 'No highlighting: use the diagram to determine where each activation, weight, and bias belongs.';
    renderTransitionTabs($('mappingTransitionTabs'), renderMappingStage);
    const focus = guidance ? mappingFocusNeuron : null;
    renderNetwork($('mappingSvg'), { mode: 'mapping', mappingFocus: focus, showWeights: true });
    renderMappingMatrix();
  }

  function renderMappingMatrix() {
    const wrap = $('mappingContent'); wrap.innerHTML = '';
    const t = transition, src = state.sizes[t], dst = state.sizes[t + 1], ans = state.mappingAnswers[t];
    const eq = document.createElement('div'); eq.className = 'matrix-equation';
    const isRelTarget = j => guidance && mappingFocusNeuron !== null && mappingFocusNeuron === j;
    eq.appendChild(matrixBlock(`a${t === 0 ? '⁽⁰⁾' : `⁽${t}⁾`}`, 1, src, (_, c) => inputCell(ans.a[c], { mapType: 'a', c }, guidance && mappingFocusNeuron !== null ? 'related' : '')));
    eq.appendChild(op('·'));
    eq.appendChild(matrixBlock(`W⁽${t + 1}⁾`, src, dst, (r, c) => inputCell(ans.W[r][c], { mapType: 'w', r, c }, isRelTarget(c) ? 'related' : '')));
    eq.appendChild(op('+'));
    eq.appendChild(matrixBlock(`b⁽${t + 1}⁾`, 1, dst, (_, c) => inputCell(ans.b[c], { mapType: 'b', c }, isRelTarget(c) ? 'related' : '')));
    wrap.appendChild(eq);
    const note = document.createElement('div'); note.className = 'mapping-note'; note.textContent = 'Mapping only: do not calculate z yet. You are organizing the same values from the diagram.'; wrap.appendChild(note);
  }

  function checkMapping() {
    const t = transition, ans = state.mappingAnswers[t], truthA = forward().activations[t];
    $('mappingContent').querySelectorAll('.matrix-input').forEach(inp => {
      const value = parseFloat(inp.value), type = inp.dataset.mapType;
      let obj, correct;
      if (type === 'a') { obj = ans.a[+inp.dataset.c]; correct = truthA[+inp.dataset.c]; }
      else if (type === 'w') { obj = ans.W[+inp.dataset.r][+inp.dataset.c]; correct = state.weights[t][+inp.dataset.r][+inp.dataset.c]; }
      else { obj = ans.b[+inp.dataset.c]; correct = state.biases[t][+inp.dataset.c]; }
      obj.value = inp.value;
      obj.status = inp.value.trim() === '' ? '' : (closeEnough(value, correct) ? 'good' : 'bad');
    });
    renderMappingStage();
  }

  // ---------- STEP 3 ----------
  function renderMathStage() {
    $('mathInstruction').textContent = guidance
      ? 'Click a blank z cell to highlight the activation vector, matching weight column, and bias. Then apply the activation function to get a.'
      : 'No operand highlighting: identify the correct matrix values yourself, calculate z, then calculate a.';
    renderTransitionTabs($('mathTransitionTabs'), renderMathStage);
    renderMathMatrix();
    renderNetwork($('mathReferenceSvg'), { mode: 'math', focus: selection && selection.layer === transition + 1 ? selection : null, showWeights: true, mini: true, interactive: false, width: 720, height: 360 });
    renderReferenceNote();
  }

  function renderMathMatrix() {
    const wrap = $('mathContent'); wrap.innerHTML = '';
    const t = transition, src = state.sizes[t], dst = state.sizes[t + 1];
    const truth = forward(), ans = state.mathAnswers[t];
    const focusJ = guidance && selection?.layer === t + 1 ? selection.neuron : null;
    const focusKind = guidance && selection?.layer === t + 1 ? selection.kind : null;
    const eq = document.createElement('div'); eq.className = 'matrix-equation';
    eq.appendChild(matrixBlock(`a⁽${t}⁾`, 1, src, (_, c) => textCell(fmt(truth.activations[t][c]), focusKind === 'z' && focusJ !== null ? 'related' : '')));
    eq.appendChild(op('·'));
    eq.appendChild(matrixBlock(`W⁽${t + 1}⁾`, src, dst, (r, c) => textCell(fmt(state.weights[t][r][c]), focusKind === 'z' && focusJ === c ? 'related' : '')));
    eq.appendChild(op('+'));
    eq.appendChild(matrixBlock(`b⁽${t + 1}⁾`, 1, dst, (_, c) => textCell(fmt(state.biases[t][c]), focusKind === 'z' && focusJ === c ? 'related' : '')));
    eq.appendChild(op('='));
    eq.appendChild(matrixBlock(`z⁽${t + 1}⁾`, 1, dst, (_, c) => {
      const cell = inputCell(ans.z[c], { mathType: 'z', c }, `result${focusJ === c && focusKind === 'z' ? ' exact' : ''}`);
      cell.querySelector('input').addEventListener('focus', () => { selection = { layer: t + 1, neuron: c, kind: 'z' }; renderMathStage(); setTimeout(() => focusMathInput('z', c), 0); });
      return cell;
    }));
    wrap.appendChild(eq);

    const activate = document.createElement('div'); activate.className = 'matrix-equation';
    activate.appendChild(matrixBlock(`z⁽${t + 1}⁾`, 1, dst, (_, c) => textCell(ans.z[c].status === 'good' ? fmt(truth.zs[t + 1][c]) : '?', focusJ === c && focusKind === 'a' ? 'related' : '')));
    activate.appendChild(op(`→ ${ACTIVATIONS[state.activation].label} →`));
    activate.appendChild(matrixBlock(`a⁽${t + 1}⁾`, 1, dst, (_, c) => {
      const cell = inputCell(ans.a[c], { mathType: 'a', c }, `result${focusJ === c && focusKind === 'a' ? ' exact' : ''}`);
      const input = cell.querySelector('input');
      input.disabled = ans.z[c].status !== 'good';
      input.addEventListener('focus', () => { selection = { layer: t + 1, neuron: c, kind: 'a' }; renderMathStage(); setTimeout(() => focusMathInput('a', c), 0); });
      return cell;
    }));
    wrap.appendChild(activate);

    if (selection?.layer === t + 1) {
      const j = selection.neuron;
      const line = document.createElement('div'); line.className = 'formula-line';
      if (selection.kind === 'z') {
        const terms = truth.activations[t].map((v, i) => `(${fmt(v)}×${fmt(state.weights[t][i][j])})`).join(' + ');
        line.textContent = guidance ? `z${j + 1} = ${terms} + (${fmt(state.biases[t][j])})` : `Calculate z${j + 1} using a⁽${t}⁾, W⁽${t + 1}⁾, and b⁽${t + 1}⁾.`;
      } else {
        line.textContent = guidance ? `a${j + 1} = ${ACTIVATIONS[state.activation].label}(z${j + 1})` : `Apply the activation function to z${j + 1}.`;
      }
      wrap.appendChild(line);
    }
  }

  function focusMathInput(type, c) {
    const input = $('mathContent').querySelector(`input[data-math-type="${type}"][data-c="${c}"]`);
    if (input) { input.focus(); input.select(); }
  }

  function renderReferenceNote() {
    const note = $('mathReferenceNote');
    if (!selection || selection.layer !== transition + 1) { note.innerHTML = 'Click a blank <strong>z</strong> or <strong>a</strong> cell. The small diagram will identify the same neuron.'; return; }
    const n = selection.neuron + 1;
    note.innerHTML = selection.kind === 'z'
      ? `You are calculating the <strong>pre-activation z value</strong> for ${layerNames()[transition + 1]} neuron ${n}.`
      : `You are applying <strong>${ACTIVATIONS[state.activation].label}</strong> to that neuron's z value to determine the a value passed forward.`;
  }

  function checkMath() {
    const t = transition, ans = state.mathAnswers[t], truth = forward();
    $('mathContent').querySelectorAll('.matrix-input').forEach(inp => {
      const type = inp.dataset.mathType, c = +inp.dataset.c;
      const obj = ans[type][c]; obj.value = inp.value;
      if (inp.value.trim() === '') obj.status = '';
      else {
        const correct = type === 'z' ? truth.zs[t + 1][c] : truth.activations[t + 1][c];
        obj.status = closeEnough(parseFloat(inp.value), correct) ? 'good' : 'bad';
        if (obj.status === 'good') showFormula(t + 1, c, type);
      }
    });
    renderMathStage();
  }

  // ---------- EDITOR ----------
  function buildEditor() {
    const wrap = $('editorContent'); wrap.innerHTML = '';
    let html = `<section class="editor-section"><h3>Input values</h3><div class="editor-grid" style="grid-template-columns:repeat(${state.sizes[0]},72px)">`;
    state.inputs.forEach((v, i) => html += `<input data-edit="input" data-i="${i}" value="${v}">`);
    html += '</div></section>';
    state.weights.forEach((W, t) => {
      html += `<section class="editor-section"><h3>${transitionLabel(t)} weights</h3><div class="editor-grid" style="grid-template-columns:52px repeat(${state.sizes[t + 1]},72px)"><span></span>`;
      for (let c = 0; c < state.sizes[t + 1]; c++) html += `<span class="editor-label">to ${c + 1}</span>`;
      W.forEach((row, r) => {
        html += `<span class="editor-label">from ${r + 1}</span>`;
        row.forEach((v, c) => html += `<input data-edit="weight" data-t="${t}" data-r="${r}" data-c="${c}" value="${v}">`);
      });
      html += `</div><h3>Biases</h3><div class="editor-grid" style="grid-template-columns:repeat(${state.sizes[t + 1]},72px)">`;
      state.biases[t].forEach((v, c) => html += `<input data-edit="bias" data-t="${t}" data-c="${c}" value="${v}">`);
      html += '</div></section>';
    });
    wrap.innerHTML = html;
  }

  function saveEditor() {
    const inputs = [...$('editorContent').querySelectorAll('input')];
    for (const inp of inputs) if (!Number.isFinite(parseFloat(inp.value))) { alert('Every value must be a number.'); return false; }
    inputs.forEach(inp => {
      const v = parseFloat(inp.value);
      if (inp.dataset.edit === 'input') state.inputs[+inp.dataset.i] = v;
      if (inp.dataset.edit === 'weight') state.weights[+inp.dataset.t][+inp.dataset.r][+inp.dataset.c] = v;
      if (inp.dataset.edit === 'bias') state.biases[+inp.dataset.t][+inp.dataset.c] = v;
    });
    resetPracticeState(); renderStage(); return true;
  }

  // ---------- EVENTS ----------
  function buildNetwork() {
    const sizes = [
      clamp($('inputCount').value, 1, 4), clamp($('hidden1Count').value, 1, 4),
      clamp($('hidden2Count').value, 1, 4), clamp($('outputCount').value, 1, 4)
    ];
    state = makeState(sizes, $('activationSelect').value);
    transition = 0; selection = null; mappingFocusNeuron = null;
    syncControls(); renderStage();
  }

  $('buildNetworkBtn').addEventListener('click', buildNetwork);
  $('activationSelect').addEventListener('change', () => { state.activation = $('activationSelect').value; resetPracticeState(); renderStage(); });
  $('randomizeBtn').addEventListener('click', () => {
    state.inputs = state.inputs.map(randomInput);
    state.weights = state.weights.map(W => W.map(row => row.map(randomWeight)));
    state.biases = state.biases.map(b => b.map(randomBias));
    resetPracticeState(); renderStage();
  });
  $('resetPracticeBtn').addEventListener('click', () => { resetPracticeState(); renderStage(); });
  $('showAllWeights').addEventListener('change', () => { if (stage === 'diagram') renderDiagramStage(); });
  $('checkDiagramBtn').addEventListener('click', checkAllDiagram);
  $('checkMappingBtn').addEventListener('click', checkMapping);
  $('checkMathBtn').addEventListener('click', checkMath);
  $('helpBtn').addEventListener('click', () => $('helpDialog').showModal());
  $('editValuesBtn').addEventListener('click', () => { buildEditor(); $('editDialog').showModal(); });
  $('saveValuesBtn').addEventListener('click', e => { if (!saveEditor()) e.preventDefault(); });

  document.querySelectorAll('.lesson-step').forEach(btn => btn.addEventListener('click', () => { stage = btn.dataset.stage; selection = null; mappingFocusNeuron = null; transition = 0; renderStage(); }));
  $('beginnerBtn').addEventListener('click', () => { guidance = true; selection = null; mappingFocusNeuron = null; renderStage(); });
  $('advancedBtn').addEventListener('click', () => { guidance = false; selection = null; mappingFocusNeuron = null; renderStage(); });

  syncControls();
  renderStage();
})();
