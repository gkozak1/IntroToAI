(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const EPS = 1e-7;

  const STEP_INFO = [
    { title: "Calculate the Diagram", short: "DIAGRAM", question: "How does a neuron calculate its value?" },
    { title: "Map to Matrices", short: "MAP TO MATRICES", question: "Where does everything in the diagram go in matrix form?" },
    { title: "Matrix Math", short: "MATRIX MATH", question: "How does matrix multiplication perform the same calculations more cleanly?" }
  ];

  const TRANSITIONS = [
    { from: "Input", to: "Hidden 1", a: "a⁽⁰⁾", W: "W⁽¹⁾", b: "b⁽¹⁾", z: "z⁽¹⁾", outA: "a⁽¹⁾" },
    { from: "Hidden 1", to: "Hidden 2", a: "a⁽¹⁾", W: "W⁽²⁾", b: "b⁽²⁾", z: "z⁽²⁾", outA: "a⁽²⁾" },
    { from: "Hidden 2", to: "Output", a: "a⁽²⁾", W: "W⁽³⁾", b: "b⁽³⁾", z: "z⁽³⁾", outA: "a⁽³⁾" }
  ];

  const state = {
    architecture: [3, 4, 3, 2],
    network: null,
    currentStep: 0,
    guidance: "on",
    transition: 0,
    selection: null,
    feedback: { diagram: null, mapping: null, math: null },
    work: null,
    checks: null
  };

  function clampCount(v) {
    return Math.max(1, Math.min(4, Number(v) || 1));
  }

  function roundInternal(v) {
    return Math.round((v + Number.EPSILON) * 1e10) / 1e10;
  }

  function fmt(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "?";
    const n = Number(v);
    if (Math.abs(n) < EPS) return "0";
    if (Math.abs(n - Math.round(n)) < EPS) return String(Math.round(n));
    return String(Math.round(n * 1000) / 1000).replace(/^-0$/, "0");
  }

  function parseStudent(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function equalNum(student, correct) {
    const n = parseStudent(student);
    return n !== null && Math.abs(n - correct) < 1e-6;
  }

  function relu(z) { return Math.max(0, z); }

  function calcNetwork(net) {
    net.z = [null, [], [], []];
    net.a = [net.a0.slice(), [], [], []];
    for (let t = 0; t < 3; t++) {
      const prev = net.a[t];
      const W = net.W[t];
      const b = net.b[t];
      const z = [];
      const a = [];
      for (let j = 0; j < b.length; j++) {
        let sum = b[j];
        for (let i = 0; i < prev.length; i++) sum += prev[i] * W[i][j];
        sum = roundInternal(sum);
        z.push(sum);
        a.push(roundInternal(relu(sum)));
      }
      net.z[t + 1] = z;
      net.a[t + 1] = a;
    }
    return net;
  }

  function defaultNetwork() {
    return calcNetwork({
      counts: [3, 4, 3, 2],
      a0: [1, 2, 4],
      W: [
        [
          [0.1, 0.2, -0.3, 0.4],
          [0.5, 0.6, -0.7, 0.8],
          [0.1, 0.2, 0.3, -0.4]
        ],
        [
          [0.4, -0.2, 0.3],
          [-0.3, 0.5, 0.2],
          [0.6, 0.1, -0.5],
          [0.2, -0.4, 0.7]
        ],
        [
          [0.5, -0.4],
          [0.2, 0.6],
          [-0.3, 0.5]
        ]
      ],
      b: [
        [0.2, -0.5, 0.1, -0.3],
        [-0.2, 0.3, -0.4],
        [0.1, -0.2]
      ]
    });
  }

  const VALUE_POOL = [-0.8, -0.7, -0.5, -0.4, -0.2, 0.1, 0.2, 0.3, 0.5, 0.6, 0.8];
  const BIAS_POOL = [-0.6, -0.5, -0.3, -0.2, 0, 0.1, 0.2, 0.3, 0.5];
  const INPUT_POOL = [1, 2, 3, 4];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function randomNetwork(counts) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const a0 = Array.from({ length: counts[0] }, (_, i) => INPUT_POOL[i % INPUT_POOL.length]);
      const W = [];
      const b = [];
      for (let t = 0; t < 3; t++) {
        W.push(Array.from({ length: counts[t] }, () => Array.from({ length: counts[t + 1] }, () => pick(VALUE_POOL))));
        b.push(Array.from({ length: counts[t + 1] }, () => pick(BIAS_POOL)));
      }
      const net = calcNetwork({ counts: counts.slice(), a0, W, b });
      if (net.z.slice(1).some(layer => layer.some(v => v < 0))) return net;
    }
    return calcNetwork({
      counts: counts.slice(),
      a0: Array.from({ length: counts[0] }, (_, i) => INPUT_POOL[i % INPUT_POOL.length]),
      W: [0, 1, 2].map(t => Array.from({ length: counts[t] }, () => Array.from({ length: counts[t + 1] }, () => 0.2))),
      b: [0, 1, 2].map(t => Array.from({ length: counts[t + 1] }, (_, j) => j === 0 ? -2 : 0.1))
    });
  }

  function blankWork() {
    const c = state.network.counts;
    return {
      diagram: [1, 2, 3].map(layer => ({
        z: Array(c[layer]).fill(""),
        a: Array(c[layer]).fill("")
      })),
      mapping: [0, 1, 2].map(t => ({
        a: Array(c[t]).fill(""),
        W: Array.from({ length: c[t] }, () => Array(c[t + 1]).fill("")),
        b: Array(c[t + 1]).fill("")
      })),
      math: [0, 1, 2].map(t => ({
        z: Array(c[t + 1]).fill(""),
        a: Array(c[t + 1]).fill("")
      }))
    };
  }

  function blankChecks() {
    const c = state.network.counts;
    return {
      diagram: [1, 2, 3].map(layer => ({ z: Array(c[layer]).fill(null), a: Array(c[layer]).fill(null) })),
      mapping: [0, 1, 2].map(t => ({
        a: Array(c[t]).fill(null),
        W: Array.from({ length: c[t] }, () => Array(c[t + 1]).fill(null)),
        b: Array(c[t + 1]).fill(null)
      })),
      math: [0, 1, 2].map(t => ({ z: Array(c[t + 1]).fill(null), a: Array(c[t + 1]).fill(null) }))
    };
  }

  function resetWork(renderNow = true) {
    state.work = blankWork();
    state.checks = blankChecks();
    state.feedback = { diagram: null, mapping: null, math: null };
    state.selection = null;
    if (renderNow) render();
  }

  function buildNetwork({ freshValues = true } = {}) {
    state.architecture = [0, 1, 2, 3].map(i => clampCount($(`#count${i}`)?.value ?? state.architecture[i]));
    const isDefault = state.architecture.join(",") === "3,4,3,2";
    if (!freshValues && state.network && state.network.counts.join(",") === state.architecture.join(",")) {
      // preserve existing network
    } else {
      state.network = isDefault && !state.network ? defaultNetwork() : randomNetwork(state.architecture);
    }
    state.currentStep = 0;
    state.transition = 0;
    resetWork(false);
    renderControls();
    render();
  }

  function generateValues() {
    state.network = randomNetwork(state.architecture);
    resetWork(false);
    render();
    toast("Generated a new instructional set of values.");
  }

  function renderControls() {
    const labels = ["Input", "Hidden 1", "Hidden 2", "Output"];
    $("#architectureControls").innerHTML = labels.map((label, i) => `
      <div class="arch-control">
        <label for="count${i}">${label}</label>
        <select id="count${i}" aria-label="${label} neuron count">
          ${[1, 2, 3, 4].map(v => `<option value="${v}" ${state.architecture[i] === v ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </div>`).join("");

    $("#stepNav").innerHTML = STEP_INFO.map((s, i) => `
      <button class="step-button ${state.currentStep === i ? "active" : ""}" data-step="${i}">
        <span class="step-num">${i + 1}</span>
        <strong>${s.short}</strong>
        <span>${s.question}</span>
      </button>`).join("");

    $$("#guidanceControl button").forEach(btn => btn.classList.toggle("active", btn.dataset.guidance === state.guidance));
  }

  function render() {
    if (!state.network) return;
    renderControls();
    const workspace = $("#workspace");
    workspace.innerHTML = state.currentStep === 0 ? renderDiagramStage() : state.currentStep === 1 ? renderMappingStage() : renderMathStage();
  }

  function stageHeader(step, actions = "") {
    const s = STEP_INFO[step];
    return `<div class="stage-header">
      <div class="stage-title"><div class="mini-kicker">STEP ${step + 1}</div><h2>${s.title}</h2><p>${s.question}</p></div>
      <div class="stage-actions">${actions}</div>
    </div>`;
  }

  function layerTabs() {
    return `<div class="layer-tabs">${TRANSITIONS.map((t, i) => `<button class="layer-tab ${state.transition === i ? "active" : ""}" data-transition="${i}">${t.from} → ${t.to}</button>`).join("")}</div>`;
  }

  function feedbackChip(kind) {
    const f = state.feedback[kind];
    if (!f) return `<span class="feedback-summary" id="${kind}Feedback"></span>`;
    const good = f.incorrect === 0;
    const text = f.checked === 0 ? "Nothing entered yet" : good ? `${f.correct} entered answer${f.correct === 1 ? "" : "s"} correct` : `${f.correct} correct · ${f.incorrect} needs another look`;
    return `<span class="feedback-summary show ${good ? "good" : "mixed"}" id="${kind}Feedback">${text}</span>`;
  }

  function diagramLayerReady(layer) {
    if (state.guidance === "on" || layer === 1) return true;
    const prior = state.work.diagram[layer - 2];
    return prior.a.every((v, j) => equalNum(v, state.network.a[layer - 1][j]));
  }

  function diagramValue(layer, type, j) {
    if (state.guidance === "on") return fmt(type === "z" ? state.network.z[layer][j] : state.network.a[layer][j]);
    const ready = diagramLayerReady(layer);
    if (!ready) return "locked";
    const val = state.work.diagram[layer - 1][type][j];
    return val === "" ? "?" : fmt(Number(val));
  }

  function selectionMatches(obj) {
    const s = state.selection;
    if (!s) return false;
    return Object.keys(obj).every(k => s[k] === obj[k]);
  }

  function networkHighlights(layer, idx, type = null, edge = null, bias = false, context = "diagram") {
    const s = state.selection;
    const guided = state.guidance === "on";
    let nodeClass = "";
    let zHalf = "";
    let aHalf = "";
    let biasClass = "";

    if (context === "diagram" && s?.context === "diagram") {
      if (s.kind === "value" && s.layer === layer && s.index === idx) {
        nodeClass = "selected";
        if (s.valueType === "z") zHalf = "strong";
        if (s.valueType === "a") { aHalf = "strong"; zHalf = "related"; }
      } else if (s.kind === "value" && s.valueType === "z" && s.layer > 0) {
        if (layer === s.layer - 1) nodeClass = "related";
        else if (layer !== s.layer || idx !== s.index) nodeClass = "muted";
      } else if (s.kind === "value" && s.valueType === "a" && s.layer === layer && s.index === idx) {
        nodeClass = "selected";
        zHalf = "related";
      }
      if (s.kind === "value" && s.valueType === "z" && s.layer === layer && s.index === idx) biasClass = "active";
    }

    if (context === "mapping" && s?.context === "mapping" && guided) {
      const t = state.transition;
      if (s.kind === "weight") {
        if (layer === t && idx === s.row) nodeClass = "related";
        if (layer === t + 1 && idx === s.col) nodeClass = "selected";
      } else if (s.kind === "a" && layer === t && idx === s.index) nodeClass = "related";
      else if (s.kind === "dest" && layer === t) nodeClass = "related";
      else if ((s.kind === "b" || s.kind === "dest") && layer === t + 1 && idx === s.col) nodeClass = "selected";
      if ((s.kind === "b" || s.kind === "dest") && layer === t + 1 && idx === s.col) biasClass = "active";
      if (s.kind === "weight" && layer === t + 1 && idx === s.col) biasClass = "related";
    }

    if (context === "math" && s?.context === "math" && guided) {
      const t = state.transition;
      if (s.kind === "z" && layer === t + 1 && idx === s.index) {
        nodeClass = "selected"; zHalf = "strong"; biasClass = "active";
      } else if (s.kind === "z" && layer === t) nodeClass = "related";
      if (s.kind === "a" && layer === t + 1 && idx === s.index) { nodeClass = "selected"; aHalf = "strong"; zHalf = "related"; }
    }
    return { nodeClass, zHalf, aHalf, biasClass };
  }

  function edgeClass(t, i, j, context, activeTransition) {
    const s = state.selection;
    const guided = state.guidance === "on";
    let cls = "edge";
    if (activeTransition !== null && activeTransition !== undefined && t !== activeTransition) cls += " transition-muted";

    if (context === "diagram" && s?.context === "diagram" && s.kind === "value" && s.valueType === "z") {
      if (t === s.layer - 1 && j === s.index) cls += " related";
      else cls += " muted";
    }
    if (context === "mapping" && s?.context === "mapping" && guided) {
      if (s.kind === "weight" && t === state.transition && i === s.row && j === s.col) cls += " active";
      else if ((s.kind === "dest" || s.kind === "b") && t === state.transition && j === s.col) cls += " related";
      else if (s.kind && t === state.transition) cls += " muted";
    }
    if (context === "math" && s?.context === "math" && guided) {
      if (s.kind === "z" && t === state.transition && j === s.index) cls += " related";
      else if (s.kind === "z" && t === state.transition) cls += " muted";
    }
    return cls;
  }

  function weightGroupClass(t, i, j, context, activeTransition) {
    const s = state.selection;
    const guided = state.guidance === "on";
    let cls = "weight-group";
    if (activeTransition !== null && activeTransition !== undefined && t !== activeTransition) cls += " muted";
    if (context === "diagram" && s?.context === "diagram" && s.kind === "value" && s.valueType === "z") {
      if (t === s.layer - 1 && j === s.index) cls += " active"; else cls += " muted";
    }
    if (context === "mapping" && s?.context === "mapping" && guided) {
      if (s.kind === "weight" && t === state.transition && i === s.row && j === s.col) cls += " active";
      else if ((s.kind === "dest" || s.kind === "b") && t === state.transition && j === s.col) cls += " active";
      else if (s.kind) cls += " muted";
    }
    if (context === "math" && s?.context === "math" && guided && s.kind === "z") {
      if (t === state.transition && j === s.index) cls += " active"; else cls += " muted";
    }
    return cls;
  }

  function yPositions(count) {
    if (count === 1) return [310];
    const top = count === 4 ? 100 : count === 3 ? 135 : 200;
    const bottom = count === 4 ? 520 : count === 3 ? 485 : 420;
    return Array.from({ length: count }, (_, i) => top + (bottom - top) * i / (count - 1));
  }

  function renderNetwork({ context = "diagram", compact = false, activeTransition = null } = {}) {
    const net = state.network;
    const counts = net.counts;
    const xs = compact ? [85, 330, 575, 820] : [90, 400, 710, 1020];
    const width = compact ? 910 : 1120;
    const ys = counts.map(yPositions);
    const parts = [];
    parts.push(`<svg class="network-svg" viewBox="0 0 ${width} 620" role="img" aria-label="Neural network diagram">`);
    const titles = ["INPUT", "HIDDEN 1", "HIDDEN 2", "OUTPUT"];
    titles.forEach((t, l) => parts.push(`<text class="layer-title-svg" x="${xs[l]}" y="35" text-anchor="middle">${t}</text>`));

    // Edges first.
    for (let t = 0; t < 3; t++) {
      for (let i = 0; i < counts[t]; i++) {
        for (let j = 0; j < counts[t + 1]; j++) {
          const x1 = xs[t] + (t === 0 ? 32 : 57);
          const x2 = xs[t + 1] - 57;
          const y1 = ys[t][i];
          const y2 = ys[t + 1][j];
          const cls = edgeClass(t, i, j, context, activeTransition);
          const wg = weightGroupClass(t, i, j, context, activeTransition);
          // Keep labels close to the source side, before most edge crossings occur.
          // With at most four destinations this fans labels apart and keeps each value readable.
          const labelT = .20;
          const lx = x1 + (x2 - x1) * labelT;
          const ly = y1 + (y2 - y1) * labelT;
          const weight = fmt(net.W[t][i][j]);
          const labelW = Math.max(27, 11 + weight.length * 6);
          parts.push(`<line class="${cls}" data-edge="1" data-t="${t}" data-row="${i}" data-col="${j}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`);
          parts.push(`<g class="${wg}" data-edge="1" data-t="${t}" data-row="${i}" data-col="${j}"><rect class="weight-bg" x="${lx - labelW / 2}" y="${ly - 8}" width="${labelW}" height="16"></rect><text class="weight-label" x="${lx}" y="${ly + 3}" text-anchor="middle">${weight}</text></g>`);
        }
      }
    }

    // Nodes and biases.
    for (let layer = 0; layer < 4; layer++) {
      for (let j = 0; j < counts[layer]; j++) {
        const x = xs[layer], y = ys[layer][j];
        const h = networkHighlights(layer, j, null, null, false, context);
        const locked = context === "diagram" && state.guidance === "off" && layer > 0 && !diagramLayerReady(layer);
        const groupClass = `node-group ${h.nodeClass} ${locked ? "locked" : ""}`;
        if (layer === 0) {
          parts.push(`<g class="${groupClass}" data-input-node="${j}"><circle class="node-input" cx="${x}" cy="${y}" r="32"></circle><text class="node-label" x="${x}" y="${y - 10}">a${j + 1}⁽⁰⁾</text><text class="node-text" x="${x}" y="${y + 8}">${fmt(net.a0[j])}</text></g>`);
        } else {
          const zVal = context === "diagram" ? diagramValue(layer, "z", j) : fmt(net.z[layer][j]);
          const aVal = context === "diagram" ? diagramValue(layer, "a", j) : fmt(net.a[layer][j]);
          const zStatus = context === "diagram" && state.guidance === "off" ? correctDiagramStatus(layer, "z", j) : null;
          const aStatus = context === "diagram" && state.guidance === "off" ? correctDiagramStatus(layer, "a", j) : null;
          const zStatusIcon = zStatus === "correct" ? "✓" : zStatus === "incorrect" ? "!" : "";
          const aStatusIcon = aStatus === "correct" ? "✓" : aStatus === "incorrect" ? "!" : "";
          parts.push(`<g class="${groupClass}" data-node-layer="${layer}" data-node-index="${j}">
            <rect class="node-outer" x="${x - 56}" y="${y - 25}" rx="12" width="112" height="50"></rect>
            <rect class="node-half-highlight ${h.zHalf} ${zStatus || ""}" x="${x - 55}" y="${y - 24}" rx="11" width="55" height="48"></rect>
            <rect class="node-half-highlight ${h.aHalf} ${aStatus || ""}" x="${x}" y="${y - 24}" rx="11" width="55" height="48"></rect>
            <line class="node-divider" x1="${x}" y1="${y - 24}" x2="${x}" y2="${y + 24}"></line>
            <text class="node-label" x="${x - 28}" y="${y - 9}">z${j + 1}</text>
            <text class="node-text" x="${x - 28}" y="${y + 9}">${zVal}</text>
            <text class="node-label" x="${x + 28}" y="${y - 9}">a${j + 1}</text>
            <text class="node-text" x="${x + 28}" y="${y + 9}">${aVal}</text>
            ${zStatusIcon ? `<text class="node-status-icon ${zStatus}" x="${x - 49}" y="${y + 19}">${zStatusIcon}</text>` : ""}
            ${aStatusIcon ? `<text class="node-status-icon ${aStatus}" x="${x + 49}" y="${y + 19}">${aStatusIcon}</text>` : ""}
            <rect class="value-hotspot" data-node-value="z" data-layer="${layer}" data-index="${j}" x="${x - 56}" y="${y - 25}" width="56" height="50"></rect>
            <rect class="value-hotspot" data-node-value="a" data-layer="${layer}" data-index="${j}" x="${x}" y="${y - 25}" width="56" height="50"></rect>
          </g>`);
          const bias = fmt(net.b[layer - 1][j]);
          parts.push(`<g class="bias-chip ${h.biasClass}" data-bias="1" data-t="${layer - 1}" data-col="${j}"><rect x="${x - 27}" y="${y + 31}" width="54" height="18" rx="7"></rect><text x="${x}" y="${y + 40}">b = ${bias}</text></g>`);
        }
      }
    }
    parts.push(`</svg>`);
    return parts.join("");
  }

  function correctDiagramStatus(layer, type, j) {
    return state.checks.diagram[layer - 1][type][j];
  }

  function renderDiagramStage() {
    const actions = `${feedbackChip("diagram")} ${state.guidance === "off" ? `<button class="btn primary" data-action="check-diagram">Check My Work</button>` : ""}`;
    return `${stageHeader(0, actions)}
      <div class="diagram-layout">
        <section class="panel network-panel">
          <div class="panel-header"><h3>Neural-network diagram</h3><span class="hint">${state.guidance === "on" ? "Explore the completed calculation" : "Calculate z, then apply ReLU to get a"}</span></div>
          <div class="network-wrap">${renderNetwork({ context: "diagram" })}</div>
        </section>
        <aside class="panel inspector"><div class="panel-header"><h3>Calculation focus</h3><span class="hint">Click z or a</span></div><div class="panel-body">${renderDiagramInspector()}</div></aside>
      </div>`;
  }

  function formulaForZ(layer, j) {
    const prev = state.network.a[layer - 1];
    const W = state.network.W[layer - 1];
    const b = state.network.b[layer - 1][j];
    const z = state.network.z[layer][j];
    const terms = prev.map((a, i) => `(${fmt(a)})(${fmt(W[i][j])})`);
    const products = prev.map((a, i) => fmt(roundInternal(a * W[i][j])));
    const biasText = b >= 0 ? `+ ${fmt(b)}` : `− ${fmt(Math.abs(b))}`;
    const productExpr = products.map((p, i) => i === 0 ? p : Number(p) >= 0 ? `+ ${p}` : `− ${fmt(Math.abs(Number(p)))}`).join(" ");
    const numericBias = b >= 0 ? `+ ${fmt(b)}` : `− ${fmt(Math.abs(b))}`;
    return {
      symbolic: `z<sub>${j + 1}</sub><sup>(${layer})</sup> = Σ a<sub>i</sub><sup>(${layer - 1})</sup>w<sub>i,${j + 1}</sub><sup>(${layer})</sup> + b<sub>${j + 1}</sub><sup>(${layer})</sup>`,
      line1: `z<sub>${j + 1}</sub><sup>(${layer})</sup> = ${terms.join(" + ").replace(/\+ \(-/g, "− (")} ${biasText}`,
      line2: `= ${productExpr} ${numericBias}`,
      line3: `= ${fmt(z)}`
    };
  }

  function formulaForA(layer, j) {
    const z = state.network.z[layer][j];
    const a = state.network.a[layer][j];
    return {
      symbolic: `a<sub>${j + 1}</sub><sup>(${layer})</sup> = ReLU(z<sub>${j + 1}</sub><sup>(${layer})</sup>)`,
      line1: `a<sub>${j + 1}</sub><sup>(${layer})</sup> = ReLU(${fmt(z)})`,
      line2: `= ${fmt(a)}`
    };
  }

  function renderDiagramInspector() {
    const s = state.selection;
    if (!s || s.context !== "diagram") return `<div class="empty-state"><div><strong>Select a value in the diagram.</strong><br><br>Choose a <b>z</b> value to inspect the weighted sum and bias, or an <b>a</b> value to inspect activation.</div></div>`;
    if (s.kind === "edge") {
      const w = state.network.W[s.t][s.row][s.col];
      return `<div class="inspector-title"><span class="value-badge">w${s.row + 1},${s.col + 1}⁽${s.t + 1}⁾</span> Connection weight</div><div class="formula-block"><div class="formula-main">${fmt(w)}</div><div class="formula-step">This weight multiplies a<sub>${s.row + 1}</sub><sup>(${s.t})</sup> on its way to neuron ${s.col + 1} in the next layer.</div></div>`;
    }
    if (s.kind !== "value") return `<div class="empty-state">Select z or a.</div>`;
    const { layer, index: j, valueType } = s;
    const ready = diagramLayerReady(layer);
    if (!ready) return `<div class="inspector-title">Layer locked</div><p class="help-copy">Finish the activated values in the preceding layer first. The next layer depends on those completed a values.</p>`;
    const correctValue = valueType === "z" ? state.network.z[layer][j] : state.network.a[layer][j];
    const zReadyForActivation = valueType !== "a" || state.guidance === "on" || equalNum(state.work.diagram[layer - 1].z[j], state.network.z[layer][j]);
    if (!zReadyForActivation) {
      return `<div class="inspector-title"><span class="value-badge">a<sub>${j + 1}</sub><sup>(${layer})</sup></span>Activation waits for z</div>
        <div class="formula-block"><div class="symbolic">a<sub>${j + 1}</sub><sup>(${layer})</sup> = ReLU(z<sub>${j + 1}</sub><sup>(${layer})</sup>)</div>
        <div class="formula-step" style="margin-top:8px">Calculate the corresponding z value correctly first. Then apply ReLU.</div></div>`;
    }
    const entered = state.guidance === "off" ? state.work.diagram[layer - 1][valueType][j] : String(correctValue);
    const solved = state.guidance === "on" || equalNum(entered, correctValue);
    const status = state.guidance === "off" ? correctDiagramStatus(layer, valueType, j) : null;
    const f = valueType === "z" ? formulaForZ(layer, j) : formulaForA(layer, j);
    return `<div class="inspector-title"><span class="value-badge">${valueType}<sub>${j + 1}</sub><sup>(${layer})</sup></span>${valueType === "z" ? "Pre-activation" : "Activated value"}</div>
      <div class="formula-block">
        <div class="symbolic">${f.symbolic}</div>
        ${solved ? `<div class="formula-main" style="margin-top:8px">${f.line1}</div><div class="formula-step">${f.line2}</div>${f.line3 ? `<div class="formula-step">${f.line3}</div>` : ""}` : `<div class="formula-step" style="margin-top:8px">Use the highlighted relationship to calculate this value. The numerical answer stays hidden until you solve it correctly.</div>`}
      </div>
      ${state.guidance === "off" ? `<div class="answer-entry"><label for="diagramAnswer">Your ${valueType} value</label><div class="answer-row"><input id="diagramAnswer" type="number" step="any" value="${entered}" data-diagram-entry="1" data-layer="${layer}" data-index="${j}" data-value-type="${valueType}" placeholder="Enter value"><button class="btn small" data-action="check-one-diagram" data-layer="${layer}" data-index="${j}" data-value-type="${valueType}">Check</button></div>${status ? `<div class="status-text ${status}" style="margin-top:6px">${status === "correct" ? "Correct" : "Not yet correct"}</div>` : ""}</div>` : ""}
      ${valueType === "z" ? `<p class="help-copy">z is the weighted sum plus this neuron's bias, before activation.</p>` : `<p class="help-copy">ReLU is a separate step: negative z values become 0; positive values stay unchanged.</p>`}`;
  }

  function matrixStatusClass(status) { return status ? ` ${status}` : ""; }
  function matrixSelectionClass(kind, row = null, col = null, index = null, context = "mapping") {
    const s = state.selection;
    if (!s || s.context !== context) return "";
    if (context === "mapping" && state.guidance === "off") return "";
    if (s.kind === kind && (row === null || s.row === row) && (col === null || s.col === col) && (index === null || s.index === index)) return " selected";
    if (context === "mapping" && state.guidance === "on") {
      if (s.kind === "dest" && kind === "a") return " related";
      if (s.kind === "dest" && kind === "weight" && col === s.col) return " related";
      if (s.kind === "dest" && kind === "b" && index === s.col) return " related";
      if (s.kind === "weight" && kind === "W" && row === s.row && col === s.col) return " selected";
    }
    if (context === "math" && state.guidance === "on") {
      if (s.kind === "z") {
        if (kind === "priorA") return " related";
        if (kind === "W" && col === s.index) return " related";
        if (kind === "b" && index === s.index) return " related";
        if (kind === "z" && index === s.index) return " selected";
      }
      if (s.kind === "a") {
        if (kind === "z" && index === s.index) return " related";
        if (kind === "a" && index === s.index) return " selected";
      }
    }
    return "";
  }

  function renderMappingStage() {
    const actions = `${layerTabs()} ${feedbackChip("mapping")} <button class="btn primary" data-action="check-mapping">Check My Work</button>`;
    return `${stageHeader(1, actions)}
      <div class="mapping-layout">
        <section class="panel">
          <div class="panel-header"><h3>Completed diagram</h3><span class="hint">Active transition: ${TRANSITIONS[state.transition].from} → ${TRANSITIONS[state.transition].to}</span></div>
          <div class="network-wrap">${renderNetwork({ context: "mapping", activeTransition: state.transition })}</div>
        </section>
        <section class="panel">
          <div class="panel-header"><h3>Map the same information</h3><span class="hint">${state.guidance === "on" ? "Highlights show where to look—not what to enter" : "No correspondence hints"}</span></div>
          <div class="panel-body matrix-stack">${renderMappingMatrices()}</div>
        </section>
      </div>`;
  }

  function renderMappingMatrices() {
    const t = state.transition;
    const info = TRANSITIONS[t];
    const work = state.work.mapping[t];
    const checks = state.checks.mapping[t];
    const rows = state.network.counts[t], cols = state.network.counts[t + 1];
    const aCells = work.a.map((v, i) => `<div class="matrix-cell${matrixStatusClass(checks.a[i])}${matrixSelectionClass("a", null, null, i)}" data-map-select="1" data-kind="a" data-index="${i}"><input type="number" step="any" value="${v}" data-map-input="1" data-kind="a" data-index="${i}" aria-label="${info.a} cell ${i + 1}"></div>`).join("");
    let wCells = "";
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      wCells += `<div class="matrix-cell${matrixStatusClass(checks.W[i][j])}${matrixSelectionClass("weight", i, j)}" data-map-select="1" data-kind="weight" data-row="${i}" data-col="${j}"><input type="number" step="any" value="${work.W[i][j]}" data-map-input="1" data-kind="weight" data-row="${i}" data-col="${j}" aria-label="${info.W} row ${i + 1} column ${j + 1}"></div>`;
    }
    const bCells = work.b.map((v, j) => `<div class="matrix-cell${matrixStatusClass(checks.b[j])}${matrixSelectionClass("b", null, null, j)}" data-map-select="1" data-kind="b" data-index="${j}"><input type="number" step="any" value="${v}" data-map-input="1" data-kind="b" data-index="${j}" aria-label="${info.b} cell ${j + 1}"></div>`).join("");
    return `
      <div class="matrix-card"><div class="matrix-card-title"><strong>${info.a} — prior activated values</strong><span class="dim">1 × ${rows}</span></div><div class="matrix-card-body"><div class="matrix-grid" style="grid-template-columns:repeat(${rows}, minmax(66px,1fr))">${aCells}</div><p class="matrix-caption">The values leaving the prior layer form a row vector.</p></div></div>
      <div class="matrix-card"><div class="matrix-card-title"><strong>${info.W} — connection weights</strong><span class="dim">${rows} × ${cols}</span></div><div class="matrix-card-body"><div class="matrix-grid" style="grid-template-columns:repeat(${cols}, 66px)">${wCells}</div><p class="matrix-caption">Each destination neuron is one column. Weight w<sub>ij</sub> maps source i → destination j.</p></div></div>
      <div class="matrix-card"><div class="matrix-card-title"><strong>${info.b} — destination biases</strong><span class="dim">1 × ${cols}</span></div><div class="matrix-card-body"><div class="matrix-grid" style="grid-template-columns:repeat(${cols}, minmax(66px,1fr))">${bCells}</div></div></div>
      <div class="placeholder-row"><strong>${info.z}</strong> = [?] &nbsp;&nbsp; <strong>${info.outA}</strong> = [?] <span>Calculated in Step 3, not here.</span></div>`;
  }

  function staticVector(values, kind, selectedContext = "math") {
    return `<div class="matrix-grid" style="grid-template-columns:repeat(${values.length}, minmax(46px,1fr))">${values.map((v, i) => `<div class="matrix-static-cell${matrixSelectionClass(kind, null, null, i, selectedContext)}">${fmt(v)}</div>`).join("")}</div>`;
  }

  function staticMatrix(values, kind = "W") {
    const cols = values[0]?.length || 1;
    let cells = "";
    for (let i = 0; i < values.length; i++) for (let j = 0; j < cols; j++) cells += `<div class="matrix-static-cell${matrixSelectionClass(kind, i, j, null, "math")}">${fmt(values[i][j])}</div>`;
    return `<div class="matrix-grid" style="grid-template-columns:repeat(${cols}, minmax(46px,1fr))">${cells}</div>`;
  }

  function renderMathStage() {
    const actions = `${layerTabs()} ${feedbackChip("math")} <button class="btn primary" data-action="check-math">Check My Work</button>`;
    return `${stageHeader(2, actions)}
      <div class="math-layout">
        <section class="panel">
          ${renderMathWorkspace()}
        </section>
        <aside class="panel compact-diagram">
          <div class="panel-header"><h3>Diagram reference</h3><span class="hint">Same destination, same incoming values</span></div>
          <div class="network-wrap">${renderNetwork({ context: "math", compact: true, activeTransition: state.transition })}</div>
          <div class="panel-body">${renderMathBridge()}</div>
        </aside>
      </div>`;
  }

  function renderMathWorkspace() {
    const t = state.transition, info = TRANSITIONS[t];
    const prev = state.network.a[t], W = state.network.W[t], b = state.network.b[t];
    const rows = prev.length, cols = b.length;
    const work = state.work.math[t], checks = state.checks.math[t];
    const zCells = work.z.map((v, j) => `<div class="matrix-cell${matrixStatusClass(checks.z[j])}${matrixSelectionClass("z", null, null, j, "math")}" data-math-select="1" data-kind="z" data-index="${j}"><input type="number" step="any" value="${v}" data-math-input="1" data-kind="z" data-index="${j}" placeholder="?" aria-label="${info.z} cell ${j + 1}"></div>`).join("");
    const aCells = work.a.map((v, j) => {
      const zReady = equalNum(work.z[j], state.network.z[t + 1][j]);
      return `<div class="matrix-cell${!zReady ? " locked-cell" : ""}${matrixStatusClass(checks.a[j])}${matrixSelectionClass("a", null, null, j, "math")}" data-math-select="1" data-kind="a" data-index="${j}"><input type="number" step="any" value="${v}" data-math-input="1" data-kind="a" data-index="${j}" placeholder="${zReady ? "?" : "z first"}" aria-label="${info.outA} cell ${j + 1}" ${zReady ? "" : "disabled"}></div>`;
    }).join("");
    return `<div class="math-equation"><span>${info.a}</span><span class="op">·</span><span>${info.W}</span><span class="op">+</span><span>${info.b}</span><span class="equals">= ${info.z}</span></div>
      <div class="matrix-math-grid">
        <div class="math-object"><div class="math-label">${info.a} <span class="dim">1 × ${rows}</span></div>${staticVector(prev, "priorA")}</div>
        <div class="math-operator">·</div>
        <div class="math-object"><div class="math-label">${info.W} <span class="dim">${rows} × ${cols}</span></div>${staticMatrix(W)}</div>
        <div class="math-operator">+</div>
        <div class="math-object"><div class="math-label">${info.b} <span class="dim">1 × ${cols}</span></div>${staticVector(b, "b")}</div>
        <div class="math-operator">=</div>
        <div class="math-object"><div class="math-label">${info.z} <span class="dim">1 × ${cols}</span></div><div class="matrix-grid" style="grid-template-columns:repeat(${cols}, minmax(50px,1fr))">${zCells}</div></div>
      </div>
      <div class="activation-row">
        <div><div class="math-label">${info.z}</div><div class="matrix-grid" style="grid-template-columns:repeat(${cols}, minmax(50px,1fr))">${work.z.map((v, j) => `<div class="matrix-static-cell${matrixSelectionClass("z", null, null, j, "math")}">${v === "" ? "?" : fmt(Number(v))}</div>`).join("")}</div></div>
        <div class="activation-arrow">→ ReLU →</div>
        <div><div class="math-label">${info.outA}</div><div class="matrix-grid" style="grid-template-columns:repeat(${cols}, minmax(50px,1fr))">${aCells}</div></div>
      </div>`;
  }

  function renderMathBridge() {
    const s = state.selection;
    const t = state.transition;
    if (!s || s.context !== "math") return `<div class="bridge-note">Select an empty <b>z</b> cell. In Guidance ON, the prior activation vector, one weight-matrix column, the matching bias, and the same destination neuron will light up together.</div>`;
    if (s.kind === "z") {
      const j = s.index;
      const solved = equalNum(state.work.math[t].z[j], state.network.z[t + 1][j]);
      const f = formulaForZ(t + 1, j);
      return `<div class="formula-block"><div class="symbolic">${f.symbolic}</div>${solved ? `<div class="formula-main" style="margin-top:8px">${f.line1}</div><div class="formula-step">${f.line2}</div><div class="formula-step">${f.line3}</div>` : `<div class="formula-step" style="margin-top:8px">One column of W supplies exactly the weights entering this destination neuron. Add its matching bias. The numerical result stays hidden until solved correctly.</div>`}</div>`;
    }
    if (s.kind === "a") {
      const j = s.index;
      const zReady = equalNum(state.work.math[t].z[j], state.network.z[t + 1][j]);
      if (!zReady) return `<div class="formula-block"><div class="symbolic">${TRANSITIONS[t].outA.replace("a", "a")} = ReLU(${TRANSITIONS[t].z})</div><div class="formula-step" style="margin-top:8px">Calculate the corresponding z value correctly first. Then apply ReLU.</div></div>`;
      const solved = equalNum(state.work.math[t].a[j], state.network.a[t + 1][j]);
      const f = formulaForA(t + 1, j);
      return `<div class="formula-block"><div class="symbolic">${f.symbolic}</div>${solved ? `<div class="formula-main" style="margin-top:8px">${f.line1}</div><div class="formula-step">${f.line2}</div>` : `<div class="formula-step" style="margin-top:8px">Activation is separate from the dot product. Apply ReLU to the corresponding z value.</div>`}</div>`;
    }
    return "";
  }

  function checkOneDiagram(layer, index, type) {
    const workVal = state.work.diagram[layer - 1][type][index];
    const correct = type === "z" ? state.network.z[layer][index] : state.network.a[layer][index];
    state.checks.diagram[layer - 1][type][index] = workVal === "" ? null : equalNum(workVal, correct) ? "correct" : "incorrect";
    state.feedback.diagram = summarizeChecks(state.checks.diagram.flatMap(x => [...x.z, ...x.a]), state.work.diagram.flatMap(x => [...x.z, ...x.a]));
    render();
  }

  function summarizeChecks(statuses, values) {
    let checked = 0, correct = 0, incorrect = 0;
    statuses.forEach((s, i) => {
      if (values[i] === "") return;
      checked++;
      if (s === "correct") correct++; else if (s === "incorrect") incorrect++;
    });
    return { checked, correct, incorrect };
  }

  function checkDiagram() {
    const statuses = [], values = [];
    for (let layer = 1; layer <= 3; layer++) {
      ["z", "a"].forEach(type => {
        state.work.diagram[layer - 1][type].forEach((v, j) => {
          const correct = type === "z" ? state.network.z[layer][j] : state.network.a[layer][j];
          const status = v === "" ? null : equalNum(v, correct) ? "correct" : "incorrect";
          state.checks.diagram[layer - 1][type][j] = status;
          statuses.push(status); values.push(v);
        });
      });
    }
    state.feedback.diagram = summarizeChecks(statuses, values);
    render();
  }

  function checkMapping() {
    const t = state.transition, work = state.work.mapping[t], chk = state.checks.mapping[t];
    const statuses = [], values = [];
    work.a.forEach((v, i) => { chk.a[i] = v === "" ? null : equalNum(v, state.network.a[t][i]) ? "correct" : "incorrect"; statuses.push(chk.a[i]); values.push(v); });
    work.W.forEach((row, i) => row.forEach((v, j) => { chk.W[i][j] = v === "" ? null : equalNum(v, state.network.W[t][i][j]) ? "correct" : "incorrect"; statuses.push(chk.W[i][j]); values.push(v); }));
    work.b.forEach((v, j) => { chk.b[j] = v === "" ? null : equalNum(v, state.network.b[t][j]) ? "correct" : "incorrect"; statuses.push(chk.b[j]); values.push(v); });
    state.feedback.mapping = summarizeChecks(statuses, values);
    render();
  }

  function checkMath() {
    const t = state.transition, work = state.work.math[t], chk = state.checks.math[t];
    const statuses = [], values = [];
    work.z.forEach((v, j) => { chk.z[j] = v === "" ? null : equalNum(v, state.network.z[t + 1][j]) ? "correct" : "incorrect"; statuses.push(chk.z[j]); values.push(v); });
    work.a.forEach((v, j) => { chk.a[j] = v === "" ? null : equalNum(v, state.network.a[t + 1][j]) ? "correct" : "incorrect"; statuses.push(chk.a[j]); values.push(v); });
    state.feedback.math = summarizeChecks(statuses, values);
    render();
  }

  function updateDiagramEntry(el) {
    const layer = Number(el.dataset.layer), index = Number(el.dataset.index), type = el.dataset.valueType;
    state.work.diagram[layer - 1][type][index] = el.value;
    state.checks.diagram[layer - 1][type][index] = null;
    state.feedback.diagram = null;
  }

  function updateMapInput(el) {
    const t = state.transition, kind = el.dataset.kind;
    if (kind === "a") {
      const i = Number(el.dataset.index); state.work.mapping[t].a[i] = el.value; state.checks.mapping[t].a[i] = null;
    } else if (kind === "b") {
      const j = Number(el.dataset.index); state.work.mapping[t].b[j] = el.value; state.checks.mapping[t].b[j] = null;
    } else {
      const i = Number(el.dataset.row), j = Number(el.dataset.col); state.work.mapping[t].W[i][j] = el.value; state.checks.mapping[t].W[i][j] = null;
    }
    state.feedback.mapping = null;
  }

  function updateMathInput(el) {
    const t = state.transition, kind = el.dataset.kind, j = Number(el.dataset.index);
    state.work.math[t][kind][j] = el.value;
    state.checks.math[t][kind][j] = null;
    state.feedback.math = null;
  }

  function handleNetworkClick(target) {
    const edge = target.closest("[data-edge]");
    if (edge) {
      const t = Number(edge.dataset.t), row = Number(edge.dataset.row), col = Number(edge.dataset.col);
      if (state.currentStep === 0) state.selection = { context: "diagram", kind: "edge", t, row, col };
      else if (state.currentStep === 1 && t === state.transition && state.guidance === "on") state.selection = { context: "mapping", kind: "weight", row, col };
      render();
      return true;
    }
    const value = target.closest("[data-node-value]");
    if (value) {
      const layer = Number(value.dataset.layer), index = Number(value.dataset.index), valueType = value.dataset.nodeValue;
      if (state.currentStep === 0) state.selection = { context: "diagram", kind: "value", layer, index, valueType };
      else if (state.currentStep === 1 && state.guidance === "on") {
        if (valueType === "a" && layer === state.transition) state.selection = { context: "mapping", kind: "a", index };
        else if (layer === state.transition + 1) state.selection = { context: "mapping", kind: "dest", col: index };
      }
      render();
      return true;
    }
    const bias = target.closest("[data-bias]");
    if (bias && state.currentStep === 1 && state.guidance === "on" && Number(bias.dataset.t) === state.transition) {
      state.selection = { context: "mapping", kind: "b", col: Number(bias.dataset.col) };
      render(); return true;
    }
    const inputNode = target.closest("[data-input-node]");
    if (inputNode && state.currentStep === 1 && state.guidance === "on" && state.transition === 0) {
      state.selection = { context: "mapping", kind: "a", index: Number(inputNode.dataset.inputNode) };
      render(); return true;
    }
    return false;
  }

  function openEditModal() {
    const net = state.network;
    const inputs = net.a0.map((v, i) => `<label><span class="edit-row-label">a${i + 1}⁽⁰⁾</span><br><input class="edit-input" type="number" step="any" value="${v}" data-edit="a0" data-i="${i}"></label>`).join("");
    const transitionSections = [0,1,2].map(t => {
      const rows = net.counts[t], cols = net.counts[t + 1];
      let w = "";
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) w += `<label><span class="edit-row-label">w${i + 1},${j + 1}</span><br><input class="edit-input" type="number" step="any" value="${net.W[t][i][j]}" data-edit="W" data-t="${t}" data-i="${i}" data-j="${j}"></label>`;
      const biases = net.b[t].map((v, j) => `<label><span class="edit-row-label">b${j + 1}</span><br><input class="edit-input" type="number" step="any" value="${v}" data-edit="b" data-t="${t}" data-j="${j}"></label>`).join("");
      return `<div class="edit-section"><h3>${TRANSITIONS[t].from} → ${TRANSITIONS[t].to}: weights</h3><div class="edit-grid" style="grid-template-columns:repeat(${cols}, 82px)">${w}</div><h3 style="margin-top:14px">Biases</h3><div class="edit-grid" style="grid-template-columns:repeat(${cols},82px)">${biases}</div></div>`;
    }).join("");
    $("#modalRoot").innerHTML = `<div class="modal-backdrop" data-modal-backdrop="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Edit network values"><div class="modal-header"><div><div class="mini-kicker">NETWORK PARAMETERS</div><h2>Edit Values</h2></div><button class="btn ghost" data-action="close-modal">Close</button></div><div class="modal-body"><div class="edit-section"><h3>Input activations</h3><div class="edit-grid" style="grid-template-columns:repeat(${net.a0.length},82px)">${inputs}</div></div>${transitionSections}</div><div class="modal-footer"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" data-action="save-edit">Save & Recalculate</button></div></div></div>`;
  }

  function saveEditModal() {
    const inputs = $$('[data-edit]', $("#modalRoot"));
    for (const el of inputs) {
      if (el.value.trim() === "" || !Number.isFinite(Number(el.value))) { toast("Every edited value must be a valid number."); el.focus(); return; }
    }
    inputs.forEach(el => {
      const n = Number(el.value);
      if (el.dataset.edit === "a0") state.network.a0[Number(el.dataset.i)] = n;
      if (el.dataset.edit === "W") state.network.W[Number(el.dataset.t)][Number(el.dataset.i)][Number(el.dataset.j)] = n;
      if (el.dataset.edit === "b") state.network.b[Number(el.dataset.t)][Number(el.dataset.j)] = n;
    });
    calcNetwork(state.network);
    resetWork(false);
    $("#modalRoot").innerHTML = "";
    render();
    toast("Values updated. Dependent student work was cleared.");
  }

  function toast(message) {
    const root = $("#toastRoot");
    const div = document.createElement("div");
    div.className = "toast";
    div.textContent = message;
    root.appendChild(div);
    setTimeout(() => div.remove(), 2600);
  }

  document.addEventListener("click", e => {
    const target = e.target;
    if (target.closest("#buildBtn")) { buildNetwork({ freshValues: true }); return; }
    if (target.closest("#generateBtn")) { generateValues(); return; }
    if (target.closest("#editBtn")) { openEditModal(); return; }
    if (target.closest("#resetBtn")) { resetWork(); toast("Student work cleared; network values retained."); return; }

    const step = target.closest("[data-step]");
    if (step) { state.currentStep = Number(step.dataset.step); state.selection = null; state.feedback.mapping = null; state.feedback.math = null; render(); return; }
    const g = target.closest("[data-guidance]");
    if (g) { state.guidance = g.dataset.guidance; state.selection = null; render(); return; }
    const trans = target.closest("[data-transition]");
    if (trans) { state.transition = Number(trans.dataset.transition); state.selection = null; state.feedback.mapping = null; state.feedback.math = null; render(); return; }

    if (target.matches("[data-modal-backdrop]")) { $("#modalRoot").innerHTML = ""; return; }

    const action = target.closest("[data-action]")?.dataset.action;
    if (action === "check-diagram") { checkDiagram(); return; }
    if (action === "check-one-diagram") { const btn = target.closest("[data-action]"); checkOneDiagram(Number(btn.dataset.layer), Number(btn.dataset.index), btn.dataset.valueType); return; }
    if (action === "check-mapping") { checkMapping(); return; }
    if (action === "check-math") { checkMath(); return; }
    if (action === "close-modal") { $("#modalRoot").innerHTML = ""; return; }
    if (action === "save-edit") { saveEditModal(); return; }

    const mapSel = target.closest("[data-map-select]");
    if (mapSel && !target.matches("input") && state.guidance === "on") {
      const kind = mapSel.dataset.kind;
      if (kind === "weight") state.selection = { context: "mapping", kind: "weight", row: Number(mapSel.dataset.row), col: Number(mapSel.dataset.col) };
      else if (kind === "a") state.selection = { context: "mapping", kind: "a", index: Number(mapSel.dataset.index) };
      else state.selection = { context: "mapping", kind: "b", col: Number(mapSel.dataset.index) };
      render(); return;
    }
    const mathSel = target.closest("[data-math-select]");
    if (mathSel && !target.matches("input")) { state.selection = { context: "math", kind: mathSel.dataset.kind, index: Number(mathSel.dataset.index) }; render(); return; }

    if (handleNetworkClick(target)) return;
  });

  document.addEventListener("change", e => {
    const el = e.target;
    if (el.matches("[data-diagram-entry]")) { updateDiagramEntry(el); return; }
    if (el.matches("[data-map-input]")) { updateMapInput(el); return; }
    if (el.matches("[data-math-input]")) { updateMathInput(el); return; }
  });


  let focusRenderGuard = false;
  document.addEventListener("focusin", e => {
    if (focusRenderGuard) return;
    const el = e.target;
    let selector = null;
    if (el.matches("[data-map-input]") && state.guidance === "on") {
      const kind = el.dataset.kind;
      if (kind === "weight") {
        const row = Number(el.dataset.row), col = Number(el.dataset.col);
        state.selection = { context: "mapping", kind: "weight", row, col };
        selector = `[data-map-input][data-kind="weight"][data-row="${row}"][data-col="${col}"]`;
      } else if (kind === "a") {
        const index = Number(el.dataset.index);
        state.selection = { context: "mapping", kind: "a", index };
        selector = `[data-map-input][data-kind="a"][data-index="${index}"]`;
      } else {
        const index = Number(el.dataset.index);
        state.selection = { context: "mapping", kind: "b", col: index };
        selector = `[data-map-input][data-kind="b"][data-index="${index}"]`;
      }
    } else if (el.matches("[data-math-input]")) {
      const kind = el.dataset.kind, index = Number(el.dataset.index);
      state.selection = { context: "math", kind, index };
      selector = `[data-math-input][data-kind="${kind}"][data-index="${index}"]`;
    }
    if (selector) {
      setTimeout(() => {
        focusRenderGuard = true;
        render();
        const replacement = $(selector);
        if (replacement) { replacement.focus(); try { replacement.select(); } catch (_) {} }
        focusRenderGuard = false;
      }, 0);
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.matches("[data-diagram-entry]")) {
      const el = e.target;
      state.work.diagram[Number(el.dataset.layer) - 1][el.dataset.valueType][Number(el.dataset.index)] = el.value;
      checkOneDiagram(Number(el.dataset.layer), Number(el.dataset.index), el.dataset.valueType);
    }
  });

  // Initialize with the designed 3→4→3→2 example and render immediately.
  state.network = defaultNetwork();
  state.architecture = state.network.counts.slice();
  resetWork(false);
  renderControls();
  render();
})();
