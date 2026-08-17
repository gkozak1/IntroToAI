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
    guidance: "low",
    biasesEnabled: true,
    activationEnabled: true,
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
  function isHighGuidance() { return state.guidance === "high"; }
  function hasGuidanceHighlights() { return state.guidance !== "low"; }
  function isPracticeGuidance() { return state.guidance !== "high"; }
  function activate(z) { return state.activationEnabled ? relu(z) : z; }

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
        let sum = state.biasesEnabled ? b[j] : 0;
        for (let i = 0; i < prev.length; i++) sum += prev[i] * W[i][j];
        sum = roundInternal(sum);
        z.push(sum);
        a.push(roundInternal(activate(sum)));
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
      // The named default is intentionally repeatable. Generate Values is the
      // explicit control for creating a new problem.
      state.network = isDefault ? defaultNetwork() : randomNetwork(state.architecture);
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
    $$("#biasControl button").forEach(btn => btn.classList.toggle("active", (btn.dataset.biases === "on") === state.biasesEnabled));
    $$("#activationControl button").forEach(btn => btn.classList.toggle("active", (btn.dataset.activation === "relu") === state.activationEnabled));
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

  function selectedDiagramLayer() {
    const sel = state.selection;
    return sel?.context === "diagram" && sel.kind === "value" ? sel.layer : null;
  }

  function diagramValue(layer, type, j) {
    const correct = type === "z" ? state.network.z[layer][j] : state.network.a[layer][j];
    if (isHighGuidance()) return fmt(correct);
    const selectedLayer = selectedDiagramLayer();
    if (selectedLayer !== null && layer < selectedLayer) return fmt(correct);
    const val = state.work.diagram[layer - 1][type][j];
    return val === "" ? "?" : fmt(Number(val));
  }

  function networkHighlights(layer, idx, context = "diagram") {
    const sel = state.selection;
    const guided = hasGuidanceHighlights();
    let nodeClass = "", zHalf = "", aHalf = "", biasClass = "";

    if (context === "diagram" && sel?.context === "diagram" && sel.kind === "value") {
      if (sel.layer === layer && sel.index === idx) {
        nodeClass = "selected";
        if (sel.valueType === "z") zHalf = "strong";
        if (sel.valueType === "a") { aHalf = "strong"; if (guided) zHalf = "related"; }
      } else if (guided && sel.valueType === "z" && sel.layer > 0) {
        if (layer === sel.layer - 1) nodeClass = "related";
        else if (layer !== sel.layer || idx !== sel.index) nodeClass = "muted";
      }
      if (guided && sel.valueType === "z" && sel.layer === layer && sel.index === idx) biasClass = "active";
    }

    if (context === "mapping" && sel?.context === "mapping" && guided) {
      const t = state.transition;
      if (sel.kind === "weight") {
        if (layer === t && idx === sel.row) nodeClass = "related";
        if (layer === t + 1 && idx === sel.col) nodeClass = "selected";
      } else if (sel.kind === "a" && layer === t && idx === sel.index) nodeClass = "related";
      else if (sel.kind === "dest" && layer === t) nodeClass = "related";
      else if ((sel.kind === "b" || sel.kind === "dest") && layer === t + 1 && idx === sel.col) nodeClass = "selected";
      if ((sel.kind === "b" || sel.kind === "dest") && layer === t + 1 && idx === sel.col) biasClass = "active";
      if (sel.kind === "weight" && layer === t + 1 && idx === sel.col) biasClass = "related";
    }

    if (context === "math" && sel?.context === "math" && guided) {
      const t = state.transition;
      if (sel.kind === "z" && layer === t + 1 && idx === sel.index) {
        nodeClass = "selected"; zHalf = "strong"; biasClass = "active";
      } else if (sel.kind === "z" && layer === t) nodeClass = "related";
      if (sel.kind === "a" && layer === t + 1 && idx === sel.index) {
        nodeClass = "selected"; aHalf = "strong"; zHalf = "related";
      }
    }
    return { nodeClass, zHalf, aHalf, biasClass };
  }

  function edgeClass(t, i, j, context, activeTransition) {
    const sel = state.selection;
    const guided = hasGuidanceHighlights();
    let cls = "edge";
    if (activeTransition !== null && activeTransition !== undefined && t !== activeTransition) cls += " transition-muted";
    if (context === "diagram" && guided && sel?.context === "diagram" && sel.kind === "value" && sel.valueType === "z") {
      if (t === sel.layer - 1 && j === sel.index) cls += " related"; else cls += " muted";
    }
    if (context === "mapping" && guided && sel?.context === "mapping") {
      if (sel.kind === "weight" && t === state.transition && i === sel.row && j === sel.col) cls += " active";
      else if ((sel.kind === "dest" || sel.kind === "b") && t === state.transition && j === sel.col) cls += " related";
      else if (sel.kind && t === state.transition) cls += " muted";
    }
    if (context === "math" && guided && sel?.context === "math") {
      if (sel.kind === "z" && t === state.transition && j === sel.index) cls += " related";
      else if (sel.kind === "z" && t === state.transition) cls += " muted";
    }
    return cls;
  }

  function weightGroupClass(t, i, j, context, activeTransition) {
    const sel = state.selection;
    const guided = hasGuidanceHighlights();
    let cls = "weight-group";
    if (activeTransition !== null && activeTransition !== undefined && t !== activeTransition) cls += " muted";
    if (context === "diagram" && guided && sel?.context === "diagram" && sel.kind === "value" && sel.valueType === "z") {
      if (t === sel.layer - 1 && j === sel.index) cls += " active"; else cls += " muted";
    }
    if (context === "mapping" && guided && sel?.context === "mapping") {
      if (sel.kind === "weight" && t === state.transition && i === sel.row && j === sel.col) cls += " active";
      else if ((sel.kind === "dest" || sel.kind === "b") && t === state.transition && j === sel.col) cls += " active";
      else if (sel.kind) cls += " muted";
    }
    if (context === "math" && guided && sel?.context === "math" && sel.kind === "z") {
      if (t === state.transition && j === sel.index) cls += " active"; else cls += " muted";
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
    const net = state.network, counts = net.counts;
    const xs = compact ? [85, 330, 575, 820] : [90, 400, 710, 1020];
    const width = compact ? 910 : 1120, ys = counts.map(yPositions), parts = [];
    parts.push(`<svg class="network-svg" viewBox="0 0 ${width} 620" role="img" aria-label="Neural network diagram">`);
    ["INPUT", "HIDDEN 1", "HIDDEN 2", "OUTPUT"].forEach((title, l) => parts.push(`<text class="layer-title-svg" x="${xs[l]}" y="35" text-anchor="middle">${title}</text>`));

    for (let t = 0; t < 3; t++) {
      for (let i = 0; i < counts[t]; i++) {
        for (let j = 0; j < counts[t + 1]; j++) {
          const x1 = xs[t] + (t === 0 ? 32 : 57), x2 = xs[t + 1] - 57;
          const y1 = ys[t][i], y2 = ys[t + 1][j];
          const cls = edgeClass(t, i, j, context, activeTransition), wg = weightGroupClass(t, i, j, context, activeTransition);
          // Place labels closer to the source where the fan of outgoing edges is
          // more separated; this materially reduces collisions in 4x4 networks.
          const labelT = .20;
          const lx = x1 + (x2 - x1) * labelT, ly = y1 + (y2 - y1) * labelT;
          const weight = fmt(net.W[t][i][j]), labelW = Math.max(27, 11 + weight.length * 6);
          parts.push(`<line class="${cls}" data-edge="1" data-t="${t}" data-row="${i}" data-col="${j}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`);
          parts.push(`<g class="${wg}" data-edge="1" data-t="${t}" data-row="${i}" data-col="${j}"><rect class="weight-bg" x="${lx - labelW / 2}" y="${ly - 8}" width="${labelW}" height="16"></rect><text class="weight-label" x="${lx}" y="${ly + 3}" text-anchor="middle">${weight}</text></g>`);
        }
      }
    }

    for (let layer = 0; layer < 4; layer++) {
      for (let j = 0; j < counts[layer]; j++) {
        const x = xs[layer], y = ys[layer][j], h = networkHighlights(layer, j, context);
        const groupClass = `node-group ${h.nodeClass}`;
        if (layer === 0) {
          parts.push(`<g class="${groupClass}" data-input-node="${j}"><circle class="node-input" cx="${x}" cy="${y}" r="32"></circle><text class="node-label" x="${x}" y="${y - 10}">a${j + 1}⁽⁰⁾</text><text class="node-text" x="${x}" y="${y + 8}">${fmt(net.a0[j])}</text></g>`);
        } else {
          const zVal = context === "diagram" ? diagramValue(layer, "z", j) : fmt(net.z[layer][j]);
          const aVal = context === "diagram" ? diagramValue(layer, "a", j) : fmt(net.a[layer][j]);
          const zStatus = context === "diagram" && isPracticeGuidance() ? state.checks.diagram[layer - 1].z[j] : null;
          const aStatus = context === "diagram" && isPracticeGuidance() ? state.checks.diagram[layer - 1].a[j] : null;
          parts.push(`<g class="${groupClass}" data-node-layer="${layer}" data-node-index="${j}">
            <rect class="node-outer" x="${x - 56}" y="${y - 25}" rx="12" width="112" height="50"></rect>
            <rect class="node-half-highlight ${h.zHalf} ${zStatus || ""}" x="${x - 55}" y="${y - 24}" rx="11" width="55" height="48"></rect>
            <rect class="node-half-highlight ${h.aHalf} ${aStatus || ""}" x="${x}" y="${y - 24}" rx="11" width="55" height="48"></rect>
            <line class="node-divider" x1="${x}" y1="${y - 24}" x2="${x}" y2="${y + 24}"></line>
            <text class="node-label" x="${x - 28}" y="${y - 9}">z${j + 1}</text><text class="node-text" x="${x - 28}" y="${y + 9}">${zVal}</text>
            <text class="node-label" x="${x + 28}" y="${y - 9}">a${j + 1}</text><text class="node-text" x="${x + 28}" y="${y + 9}">${aVal}</text>
            ${zStatus ? `<text class="node-status-mark ${zStatus}" x="${x - 49}" y="${y - 14}">${zStatus === "correct" ? "✓" : "!"}</text>` : ""}
            ${aStatus ? `<text class="node-status-mark ${aStatus}" x="${x + 47}" y="${y - 14}">${aStatus === "correct" ? "✓" : "!"}</text>` : ""}
            <rect class="value-hotspot" data-node-value="z" data-layer="${layer}" data-index="${j}" x="${x - 56}" y="${y - 25}" width="56" height="50"></rect>
            <rect class="value-hotspot" data-node-value="a" data-layer="${layer}" data-index="${j}" x="${x}" y="${y - 25}" width="56" height="50"></rect>
          </g>`);
          const bias = fmt(state.biasesEnabled ? net.b[layer - 1][j] : 0);
          parts.push(`<g class="bias-chip ${h.biasClass} ${state.biasesEnabled ? "" : "off"}" data-bias="1" data-t="${layer - 1}" data-col="${j}"><rect x="${x - 31}" y="${y + 31}" width="62" height="18" rx="7"></rect><text x="${x}" y="${y + 40}">b = ${bias}${state.biasesEnabled ? "" : " (off)"}</text></g>`);
        }
      }
    }
    parts.push(`</svg>`); return parts.join("");
  }

  function correctDiagramStatus(layer, type, j) { return state.checks.diagram[layer - 1][type][j]; }

  function renderDiagramStage() {
    const actions = `${feedbackChip("diagram")} ${isPracticeGuidance() ? `<button class="btn primary" data-action="check-diagram">Check My Work</button>` : ""}`;
    const hint = isHighGuidance() ? "All values are completed" : state.guidance === "medium" ? "Select a neuron: prior layers fill; needed information highlights" : "Select a neuron: prior layers fill; solve without highlighting";
    return `${stageHeader(0, actions)}<div class="diagram-layout">
      <section class="panel network-panel"><div class="panel-header"><h3>Neural-network diagram</h3><span class="hint">${hint}</span></div><div class="network-wrap">${renderNetwork({ context: "diagram" })}</div></section>
      <aside class="panel inspector"><div class="panel-header"><h3>Calculation focus</h3><span class="hint">Click z or a</span></div><div class="panel-body">${renderDiagramInspector()}</div></aside>
    </div>`;
  }

  function formulaForZ(layer, j) {
    const prev = state.network.a[layer - 1], W = state.network.W[layer - 1];
    const b = state.biasesEnabled ? state.network.b[layer - 1][j] : 0, z = state.network.z[layer][j];
    const terms = prev.map((a, i) => `(${fmt(a)})(${fmt(W[i][j])})`), products = prev.map((a, i) => fmt(roundInternal(a * W[i][j])));
    const biasText = b >= 0 ? `+ ${fmt(b)}` : `− ${fmt(Math.abs(b))}`;
    const productExpr = products.map((prod, i) => i === 0 ? prod : Number(prod) >= 0 ? `+ ${prod}` : `− ${fmt(Math.abs(Number(prod)))}`).join(" ");
    const numericBias = b >= 0 ? `+ ${fmt(b)}` : `− ${fmt(Math.abs(b))}`;
    return { symbolic: `z<sub>${j + 1}</sub><sup>(${layer})</sup> = Σ a<sub>i</sub><sup>(${layer - 1})</sup>w<sub>i,${j + 1}</sub><sup>(${layer})</sup> + b<sub>${j + 1}</sub><sup>(${layer})</sup>`, line1: `z<sub>${j + 1}</sub><sup>(${layer})</sup> = ${terms.join(" + ").replace(/\+ \(-/g, "− (")} ${biasText}`, line2: `= ${productExpr} ${numericBias}`, line3: `= ${fmt(z)}` };
  }

  function formulaForA(layer, j) {
    const z = state.network.z[layer][j], a = state.network.a[layer][j];
    if (!state.activationEnabled) return { symbolic: `a<sub>${j + 1}</sub><sup>(${layer})</sup> = z<sub>${j + 1}</sub><sup>(${layer})</sup> (activation off)`, line1: `a<sub>${j + 1}</sub><sup>(${layer})</sup> = ${fmt(z)}`, line2: `= ${fmt(a)}` };
    return { symbolic: `a<sub>${j + 1}</sub><sup>(${layer})</sup> = ReLU(z<sub>${j + 1}</sub><sup>(${layer})</sup>)`, line1: `a<sub>${j + 1}</sub><sup>(${layer})</sup> = ReLU(${fmt(z)})`, line2: `= ${fmt(a)}` };
  }

  function renderDiagramInspector() {
    const sel = state.selection;
    if (!sel || sel.context !== "diagram") return `<div class="empty-state"><div><strong>Select a value in the diagram.</strong><br><br>Choose a <b>z</b> value to calculate the weighted sum${state.biasesEnabled ? " and bias" : ""}, or an <b>a</b> value to ${state.activationEnabled ? "apply ReLU" : "carry z forward unchanged"}.</div></div>`;
    if (sel.kind === "edge") { const w = state.network.W[sel.t][sel.row][sel.col]; return `<div class="inspector-title"><span class="value-badge">w${sel.row + 1},${sel.col + 1}⁽${sel.t + 1}⁾</span> Connection weight</div><div class="formula-block"><div class="formula-main">${fmt(w)}</div><div class="formula-step">This weight multiplies a<sub>${sel.row + 1}</sub><sup>(${sel.t})</sup> on its way to neuron ${sel.col + 1} in the next layer.</div></div>`; }
    if (sel.kind !== "value") return `<div class="empty-state">Select z or a.</div>`;
    const { layer, index: j, valueType } = sel;
    const correctValue = valueType === "z" ? state.network.z[layer][j] : state.network.a[layer][j];
    const entered = isHighGuidance() ? String(correctValue) : state.work.diagram[layer - 1][valueType][j];
    const solved = isHighGuidance() || equalNum(entered, correctValue), status = isPracticeGuidance() ? correctDiagramStatus(layer, valueType, j) : null;
    const zSolved = isHighGuidance() || equalNum(state.work.diagram[layer - 1].z[j], state.network.z[layer][j]);
    const aLocked = valueType === "a" && !zSolved, f = valueType === "z" ? formulaForZ(layer, j) : formulaForA(layer, j);
    const prompt = state.guidance === "medium" ? "Use the highlighted relationship to calculate this value. The numerical answer stays hidden until you solve it correctly." : "Calculate this value from the diagram. The numerical answer stays hidden until you solve it correctly.";
    return `<div class="inspector-title"><span class="value-badge">${valueType}<sub>${j + 1}</sub><sup>(${layer})</sup></span>${valueType === "z" ? "Pre-activation" : "Activated value"}</div>
      <div class="formula-block"><div class="symbolic">${f.symbolic}</div>${solved ? `<div class="formula-main" style="margin-top:8px">${f.line1}</div><div class="formula-step">${f.line2}</div>${f.line3 ? `<div class="formula-step">${f.line3}</div>` : ""}` : `<div class="formula-step" style="margin-top:8px">${aLocked ? "Calculate and correctly check this neuron's z value first." : prompt}</div>`}</div>
      ${isPracticeGuidance() ? `<div class="answer-entry"><label for="diagramAnswer">Your ${valueType} value</label><div class="answer-row"><input id="diagramAnswer" type="number" step="any" value="${entered}" data-diagram-entry="1" data-layer="${layer}" data-index="${j}" data-value-type="${valueType}" placeholder="Enter value" ${aLocked ? "disabled" : ""}><button class="btn small" data-action="check-one-diagram" data-layer="${layer}" data-index="${j}" data-value-type="${valueType}" ${aLocked ? "disabled" : ""}>Check</button></div>${status ? `<div class="status-text ${status}" style="margin-top:6px">${status === "correct" ? "Correct" : "Not yet correct"}</div>` : ""}</div>` : ""}
      ${valueType === "z" ? `<p class="help-copy">z is the weighted sum${state.biasesEnabled ? " plus this neuron's bias" : " (biases are currently off, so b = 0)"}, before activation.</p>` : `<p class="help-copy">${state.activationEnabled ? "ReLU is a separate step: negative z values become 0; positive values stay unchanged." : "Activation is off, so the activated value a is exactly equal to z."}</p>`}`;
  }

  function matrixStatusClass(status) { return status ? ` ${status}` : ""; }
  function matrixSelectionClass(kind, row = null, col = null, index = null, context = "mapping") {
    const sel = state.selection;
    if (!sel || sel.context !== context) return "";
    const exact = sel.kind === kind && (row === null || sel.row === row) && (col === null || sel.col === col) && (index === null || sel.index === index);
    if (exact) return " selected";
    if (!hasGuidanceHighlights()) return "";
    if (context === "mapping") {
      if (sel.kind === "b" && kind === "b" && index === sel.col) return " selected";
      if (sel.kind === "dest" && kind === "a") return " related";
      if (sel.kind === "dest" && kind === "weight" && col === sel.col) return " related";
      if (sel.kind === "dest" && kind === "b" && index === sel.col) return " related";
    }
    if (context === "math") {
      if (sel.kind === "z") {
        if (kind === "priorA") return " related";
        if (kind === "W" && col === sel.index) return " related";
        if (kind === "b" && index === sel.index) return " related";
        if (kind === "z" && index === sel.index) return " selected";
      }
      if (sel.kind === "a") {
        if (kind === "z" && index === sel.index) return " related";
        if (kind === "a" && index === sel.index) return " selected";
      }
    }
    return "";
  }

  function renderMappingStage() {
    const actions = `${layerTabs()} ${feedbackChip("mapping")} ${isPracticeGuidance() ? `<button class="btn primary" data-action="check-mapping">Check My Work</button>` : ""}`;
    const hint = isHighGuidance() ? "Completed mapping" : state.guidance === "medium" ? "Select an item to highlight its exact correspondence" : "Map independently; no correspondence highlighting";
    return `${stageHeader(1, actions)}<div class="mapping-layout">
      <section class="panel"><div class="panel-header"><h3>Completed diagram</h3><span class="hint">Active transition: ${TRANSITIONS[state.transition].from} → ${TRANSITIONS[state.transition].to}</span></div><div class="network-wrap">${renderNetwork({ context: "mapping", activeTransition: state.transition })}</div></section>
      <section class="panel"><div class="panel-header"><h3>Map the same information</h3><span class="hint">${hint}</span></div><div class="panel-body matrix-stack">${renderMappingMatrices()}</div></section>
    </div>`;
  }

  function mappingCell(kind, value, status, attrs, label) {
    const cls = matrixSelectionClass(kind, attrs.row ?? null, attrs.col ?? null, attrs.index ?? null), dataAttrs = Object.entries(attrs).map(([k,v]) => `data-${k}="${v}"`).join(" ");
    if (isHighGuidance()) return `<div class="matrix-static-cell${cls}" data-map-select="1" data-kind="${kind}" ${dataAttrs} aria-label="${label}">${fmt(value)}</div>`;
    return `<div class="matrix-cell${matrixStatusClass(status)}${cls}" data-map-select="1" data-kind="${kind}" ${dataAttrs}><input type="number" step="any" value="${value}" data-map-input="1" data-kind="${kind}" ${dataAttrs} aria-label="${label}"></div>`;
  }

  function renderMappingMatrices() {
    const t = state.transition, info = TRANSITIONS[t], work = state.work.mapping[t], checks = state.checks.mapping[t];
    const rows = state.network.counts[t], cols = state.network.counts[t + 1];
    const aCells = Array.from({length:rows},(_,i)=>mappingCell("a",isHighGuidance()?state.network.a[t][i]:work.a[i],checks.a[i],{index:i},`${info.a} cell ${i+1}`)).join("");
    let wCells=""; for(let i=0;i<rows;i++) for(let j=0;j<cols;j++) wCells+=mappingCell("weight",isHighGuidance()?state.network.W[t][i][j]:work.W[i][j],checks.W[i][j],{row:i,col:j},`${info.W} row ${i+1} column ${j+1}`);
    const bCells = Array.from({length:cols},(_,j)=>mappingCell("b",isHighGuidance()?(state.biasesEnabled?state.network.b[t][j]:0):work.b[j],checks.b[j],{index:j},`${info.b} cell ${j+1}`)).join("");
    return `<div class="matrix-card"><div class="matrix-card-title"><strong>${info.a} — prior activated values</strong><span class="dim">1 × ${rows}</span></div><div class="matrix-card-body"><div class="matrix-grid" style="grid-template-columns:repeat(${rows},minmax(0,1fr))">${aCells}</div><p class="matrix-caption">The values leaving the prior layer form a row vector.</p></div></div>
      <div class="matrix-card"><div class="matrix-card-title"><strong>${info.W} — connection weights</strong><span class="dim">${rows} × ${cols}</span></div><div class="matrix-card-body"><div class="matrix-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${wCells}</div><p class="matrix-caption">Each destination neuron is one column. Weight w<sub>ij</sub> maps source i → destination j.</p></div></div>
      <div class="matrix-card"><div class="matrix-card-title"><strong>${info.b} — destination biases</strong><span class="dim">1 × ${cols}</span></div><div class="matrix-card-body"><div class="matrix-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${bCells}</div>${!state.biasesEnabled?`<p class="matrix-caption">Biases are off, so every effective bias is 0. Stored bias values are preserved.</p>`:""}</div></div>
      <div class="placeholder-row"><strong>${info.z}</strong> = [?] &nbsp;&nbsp; <strong>${info.outA}</strong> = [?] <span>Calculated in Step 3, not here.</span></div>`;
  }

  function staticVector(values, kind, selectedContext="math") { const cols=Math.max(1,values.length); return `<div class="matrix-grid" style="--matrix-cols:${cols};grid-template-columns:repeat(${cols},minmax(0,1fr))">${values.map((v,i)=>`<div class="matrix-static-cell${matrixSelectionClass(kind,null,null,i,selectedContext)}">${fmt(v)}</div>`).join("")}</div>`; }
  function staticMatrix(values,kind="W") { const cols=values[0]?.length||1; let cells=""; for(let i=0;i<values.length;i++) for(let j=0;j<cols;j++) cells+=`<div class="matrix-static-cell${matrixSelectionClass(kind,i,j,null,"math")}">${fmt(values[i][j])}</div>`; return `<div class="matrix-grid" style="--matrix-cols:${cols};grid-template-columns:repeat(${cols},minmax(0,1fr))">${cells}</div>`; }

  function renderMathStage() {
    const actions=`${layerTabs()} ${feedbackChip("math")} ${isPracticeGuidance()?`<button class="btn primary" data-action="check-math">Check My Work</button>`:""}`;
    return `${stageHeader(2,actions)}<div class="math-layout"><section class="panel">${renderMathWorkspace()}</section><aside class="panel compact-diagram"><div class="panel-header"><h3>Diagram reference</h3><span class="hint">Same destination, same incoming values</span></div><div class="network-wrap">${renderNetwork({context:"math",compact:true,activeTransition:state.transition})}</div><div class="panel-body">${renderMathBridge()}</div></aside></div>`;
  }

  function renderMathWorkspace() {
    const t=state.transition, info=TRANSITIONS[t], prev=state.network.a[t], W=state.network.W[t];
    const b=state.network.b[t].map((_,j)=>state.biasesEnabled?state.network.b[t][j]:0), rows=prev.length, cols=b.length, work=state.work.math[t], checks=state.checks.math[t];
    const zCells=Array.from({length:cols},(_,j)=>{const cls=matrixSelectionClass("z",null,null,j,"math"); if(isHighGuidance()) return `<div class="matrix-static-cell${cls}" data-math-select="1" data-kind="z" data-index="${j}">${fmt(state.network.z[t+1][j])}</div>`; return `<div class="matrix-cell${matrixStatusClass(checks.z[j])}${cls}" data-math-select="1" data-kind="z" data-index="${j}"><input type="number" step="any" value="${work.z[j]}" data-math-input="1" data-kind="z" data-index="${j}" placeholder="?" aria-label="${info.z} cell ${j+1}"></div>`;}).join("");
    const aCells=Array.from({length:cols},(_,j)=>{const cls=matrixSelectionClass("a",null,null,j,"math"); if(isHighGuidance()) return `<div class="matrix-static-cell${cls}" data-math-select="1" data-kind="a" data-index="${j}">${fmt(state.network.a[t+1][j])}</div>`; const zSolved=equalNum(work.z[j],state.network.z[t+1][j]); return `<div class="matrix-cell${matrixStatusClass(checks.a[j])}${cls}${zSolved?"":" disabled"}" data-math-select="1" data-kind="a" data-index="${j}"><input type="number" step="any" value="${work.a[j]}" data-math-input="1" data-kind="a" data-index="${j}" placeholder="?" aria-label="${info.outA} cell ${j+1}" ${zSolved?"":"disabled"}></div>`;}).join("");
    const zDisplay=Array.from({length:cols},(_,j)=>`<div class="matrix-static-cell${matrixSelectionClass("z",null,null,j,"math")}">${isHighGuidance()?fmt(state.network.z[t+1][j]):(work.z[j]===""?"?":fmt(Number(work.z[j])))}</div>`).join("");
    const activationText=state.activationEnabled?"→ ReLU →":"→ activation off →", biasNote=state.biasesEnabled?"":` <span class="mode-note">(biases off: b = 0)</span>`;
    return `<div class="math-equation"><span>${info.a}</span><span class="op">·</span><span>${info.W}</span><span class="op">+</span><span>${info.b}</span><span class="equals">= ${info.z}</span>${biasNote}</div>
      <div class="matrix-math-grid"><div class="math-object"><div class="math-label">${info.a} <span class="dim">1 × ${rows}</span></div>${staticVector(prev,"priorA")}</div><div class="math-operator">·</div><div class="math-object"><div class="math-label">${info.W} <span class="dim">${rows} × ${cols}</span></div>${staticMatrix(W)}</div><div class="math-operator">+</div><div class="math-object"><div class="math-label">${info.b} <span class="dim">1 × ${cols}</span></div>${staticVector(b,"b")}</div><div class="math-operator">=</div><div class="math-object"><div class="math-label">${info.z} <span class="dim">1 × ${cols}</span></div><div class="matrix-grid" style="--matrix-cols:${cols};grid-template-columns:repeat(${cols},minmax(0,1fr))">${zCells}</div></div></div>
      <div class="activation-row"><div><div class="math-label">${info.z}</div><div class="matrix-grid" style="--matrix-cols:${cols};grid-template-columns:repeat(${cols},minmax(0,1fr))">${zDisplay}</div></div><div class="activation-arrow">${activationText}</div><div><div class="math-label">${info.outA}</div><div class="matrix-grid" style="--matrix-cols:${cols};grid-template-columns:repeat(${cols},minmax(0,1fr))">${aCells}</div></div></div>`;
  }

  function renderMathBridge() {
    const sel=state.selection,t=state.transition;
    if(!sel||sel.context!=="math") { const txt=state.guidance==="medium"?" Selecting z highlights the prior activation vector, one weight-matrix column, the matching bias, and the destination neuron.":state.guidance==="low"?" Low Guidance supplies no operand highlighting.":" All result values are filled; select one to inspect the relationship."; return `<div class="bridge-note">Select a <b>z</b> or <b>a</b> cell.${txt}</div>`; }
    if(sel.kind==="z") { const j=sel.index,solved=isHighGuidance()||equalNum(state.work.math[t].z[j],state.network.z[t+1][j]),f=formulaForZ(t+1,j); const help=state.guidance==="medium"?`One column of W supplies exactly the weights entering this destination neuron. ${state.biasesEnabled?"Add its matching bias.":"Biases are off, so add 0."} The numerical result stays hidden until solved correctly.`:`Calculate the dot product${state.biasesEnabled?" and add the matching bias":" (biases are off)"}. The numerical result stays hidden until solved correctly.`; return `<div class="formula-block"><div class="symbolic">${f.symbolic}</div>${solved?`<div class="formula-main" style="margin-top:8px">${f.line1}</div><div class="formula-step">${f.line2}</div><div class="formula-step">${f.line3}</div>`:`<div class="formula-step" style="margin-top:8px">${help}</div>`}</div>`; }
    if(sel.kind==="a") { const j=sel.index,zSolved=isHighGuidance()||equalNum(state.work.math[t].z[j],state.network.z[t+1][j]),solved=isHighGuidance()||equalNum(state.work.math[t].a[j],state.network.a[t+1][j]),f=formulaForA(t+1,j); const help=!zSolved?"Calculate and correctly check the corresponding z value first.":state.activationEnabled?"Activation is separate from the dot product. Apply ReLU to the corresponding z value.":"Activation is off, so copy the corresponding z value directly into a."; return `<div class="formula-block"><div class="symbolic">${f.symbolic}</div>${solved?`<div class="formula-main" style="margin-top:8px">${f.line1}</div><div class="formula-step">${f.line2}</div>`:`<div class="formula-step" style="margin-top:8px">${help}</div>`}</div>`; }
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
    work.b.forEach((v, j) => { const expected = state.biasesEnabled ? state.network.b[t][j] : 0; chk.b[j] = v === "" ? null : equalNum(v, expected) ? "correct" : "incorrect"; statuses.push(chk.b[j]); values.push(v); });
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
    if (type === "z") { state.work.diagram[layer - 1].a[index] = ""; state.checks.diagram[layer - 1].a[index] = null; }
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
    if (kind === "z") { state.work.math[t].a[j] = ""; state.checks.math[t].a[j] = null; }
    state.feedback.math = null;
  }

  function handleNetworkClick(target) {
    const edge = target.closest("[data-edge]");
    if (edge) {
      const t = Number(edge.dataset.t), row = Number(edge.dataset.row), col = Number(edge.dataset.col);
      if (state.currentStep === 0) state.selection = { context: "diagram", kind: "edge", t, row, col };
      else if (state.currentStep === 1 && t === state.transition && hasGuidanceHighlights()) state.selection = { context: "mapping", kind: "weight", row, col };
      render();
      return true;
    }
    const value = target.closest("[data-node-value]");
    if (value) {
      const layer = Number(value.dataset.layer), index = Number(value.dataset.index), valueType = value.dataset.nodeValue;
      if (state.currentStep === 0) state.selection = { context: "diagram", kind: "value", layer, index, valueType };
      else if (state.currentStep === 1 && hasGuidanceHighlights()) {
        if (valueType === "a" && layer === state.transition) state.selection = { context: "mapping", kind: "a", index };
        else if (layer === state.transition + 1) state.selection = { context: "mapping", kind: "dest", col: index };
      }
      render();
      return true;
    }
    const bias = target.closest("[data-bias]");
    if (bias && state.currentStep === 1 && hasGuidanceHighlights() && Number(bias.dataset.t) === state.transition) {
      state.selection = { context: "mapping", kind: "b", col: Number(bias.dataset.col) };
      render(); return true;
    }
    const inputNode = target.closest("[data-input-node]");
    if (inputNode && state.currentStep === 1 && hasGuidanceHighlights() && state.transition === 0) {
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
      return `<div class="edit-section"><h3>${TRANSITIONS[t].from} → ${TRANSITIONS[t].to}: weights</h3><div class="edit-grid" style="grid-template-columns:repeat(${cols}, 82px)">${w}</div><h3 style="margin-top:14px">Biases${state.biasesEnabled ? "" : " (stored values; currently off)"}</h3><div class="edit-grid" style="grid-template-columns:repeat(${cols},82px)">${biases}</div></div>`;
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
    const biasToggle = target.closest("[data-biases]");
    if (biasToggle) {
      const next = biasToggle.dataset.biases === "on";
      if (next !== state.biasesEnabled) { state.biasesEnabled = next; calcNetwork(state.network); resetWork(false); renderControls(); render(); toast(next ? "Biases on: stored bias values restored." : "Biases off: every effective bias is now 0."); }
      return;
    }
    const activationToggle = target.closest("[data-activation]");
    if (activationToggle) {
      const next = activationToggle.dataset.activation === "relu";
      if (next !== state.activationEnabled) { state.activationEnabled = next; calcNetwork(state.network); resetWork(false); renderControls(); render(); toast(next ? "ReLU activation on." : "Activation off: a now equals z."); }
      return;
    }
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
    if (mapSel && !target.matches("input") && hasGuidanceHighlights()) {
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
    if (el.matches("[data-map-input]") && hasGuidanceHighlights()) {
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
      updateDiagramEntry(el);
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
