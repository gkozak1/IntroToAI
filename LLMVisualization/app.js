/*
 * app.js — The Next Token Lab
 * Shell, router, reusable visualization components, and the four class
 * paths. The Teaching Model runs entirely here (offline). The Real
 * Browser Model is optional and loaded on demand.
 */

import * as TM from "./js/teaching-model.js";
import * as C from "./js/curriculum.js";
import * as Store from "./js/state-store.js";
import { RealModelClient } from "./js/real-model-client.js";

/* ---------------------- tiny DOM helpers ---------------------------- */
function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (k === "attrs") for (const [ak, av] of Object.entries(v)) n.setAttribute(ak, av);
    else if (v === true) n.setAttribute(k, "");
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null || c === false) return;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return n;
}
const $ = (sel, root = document) => root.querySelector(sel);

/* ---------------------- app state ----------------------------------- */
const App = {
  route: { view: "home", classN: 1, stepId: "1.0" },
  real: new RealModelClient(),
  state: null,
};

/* ==================================================================== *
 *  REUSABLE VISUALIZATION COMPONENTS (spec §5)
 * ==================================================================== */

// Candidate probability list with bars. dist: [{token,p, delta?}].
function candidateList(dist, opts = {}) {
  const { mode = "teaching", selected = null, scaleMax, otherMass, ariaLabel } = opts;
  const max = scaleMax ?? Math.max(...dist.map((d) => d.p), 0.0001);
  const wrap = el("div", { class: "candidate-list", role: "table", "aria-label": ariaLabel || "Candidate tokens and probabilities" });
  dist.forEach((d, i) => {
    const row = el("div", { class: "cand" + (mode === "real" ? " real" : "") + (d.token === selected ? " selected" : ""), role: "row" });
    row.append(
      el("div", { class: "rank", role: "cell" }, String(i + 1)),
      el("div", { class: "tok", role: "cell", title: d.token }, visibleTok(d.token)),
      el("div", { class: "barwrap", role: "cell" }, el("div", { class: "bar", attrs: { style: `width:${(d.p / max) * 100}%` } })),
      el("div", { class: "val", role: "cell" }, TM.pct(d.p))
    );
    wrap.appendChild(row);
  });
  if (otherMass != null) {
    const row = el("div", { class: "cand", role: "row" });
    row.append(
      el("div", { class: "rank" }, "…"),
      el("div", { class: "tok" }, "all other tokens"),
      el("div", { class: "barwrap" }, el("div", { class: "bar other", attrs: { style: `width:${(otherMass / max) * 100}%` } })),
      el("div", { class: "val" }, TM.pct(otherMass))
    );
    wrap.appendChild(row);
  }
  return wrap;
}
function visibleTok(t) { return t.replace(/ /g, "␣").replace(/\n/g, "⏎"); }

// Text-equivalent table for a distribution (UX-02 accessibility).
function distTable(dist, otherMass) {
  const t = el("table", { class: "math" });
  t.appendChild(el("tr", {}, [el("th", { class: "tok" }, "token"), el("th", {}, "probability")]));
  dist.forEach((d) => t.appendChild(el("tr", {}, [el("td", { class: "tok" }, visibleTok(d.token)), el("td", {}, TM.pct(d.p))])));
  if (otherMass != null) t.appendChild(el("tr", {}, [el("td", { class: "tok" }, "all other tokens"), el("td", {}, TM.pct(otherMass))]));
  return t;
}

// Side-by-side delta between two authored distributions (context delta view).
function contextDelta(distA, distB, labelA, labelB) {
  // Align tokens by union, preserve order of A then extras from B.
  const order = [];
  const seen = new Set();
  distA.concat(distB).forEach((d) => { if (!seen.has(d.token)) { seen.add(d.token); order.push(d.token); } });
  const mapA = new Map(distA.map((d) => [d.token, d.p]));
  const mapB = new Map(distB.map((d) => [d.token, d.p]));
  const rows = order.map((tok) => ({ token: tok, a: mapA.get(tok) || 0, b: mapB.get(tok) || 0 }));
  const t = el("table", { class: "math" });
  t.appendChild(el("tr", {}, [el("th", { class: "tok" }, "token"), el("th", {}, labelA), el("th", {}, labelB), el("th", {}, "change")]));
  rows.forEach((r) => {
    const d = r.b - r.a;
    const dcell = el("td", {}, (d > 0.001 ? "+" : "") + (d * 100).toFixed(1) + "pp");
    if (Math.abs(d) >= 0.005) dcell.className = d > 0 ? "changed" : "changed";
    t.appendChild(el("tr", {}, [
      el("td", { class: "tok" }, visibleTok(r.token)),
      el("td", {}, TM.pct(r.a)), el("td", {}, TM.pct(r.b)), dcell,
    ]));
  });
  return t;
}

// Token ribbon
function tokenRibbon(tokens, onClick) {
  const wrap = el("div", { class: "ribbon", role: "list", "aria-label": "Token ribbon" });
  tokens.forEach((t, i) => {
    const b = el("button", { class: "tokblk " + (t.kind || ""), role: "listitem", title: `id ${t.id} · raw "${t.raw}"` },
      [document.createTextNode(t.visible), el("span", { class: "id" }, "#" + t.id)]);
    if (onClick) b.addEventListener("click", () => onClick(t, i, b));
    wrap.appendChild(b);
  });
  return wrap;
}

// Weighted-attention panel
function attentionPanel(config, weights, onResult) {
  const wrap = el("div", { class: "stack" });
  const rows = el("div");
  const resultBox = el("div", { class: "vecbox" });

  function recompute() {
    const norm = TM.normalizeWeights(weights);
    weights = norm.slice();
    config.tokens.forEach((_, i) => {
      const r = rows.children[i];
      r.querySelector("input").value = String(Math.round(norm[i] * 100));
      r.querySelector("output").textContent = TM.pct(norm[i], 0);
    });
    const ctx = TM.weightedContext(norm, config.tokens.map((t) => t.value));
    resultBox.innerHTML = `weighted context vector = [ ${ctx.map((x) => TM.round(x, 2)).join(", ")} ]`;
    if (onResult) onResult(norm, ctx);
  }

  config.tokens.forEach((t, i) => {
    const range = el("input", { type: "range", min: "0", max: "100", value: String(Math.round(weights[i] * 100)), "aria-label": `weight for ${t.word}` });
    range.addEventListener("input", () => { weights[i] = Number(range.value) / 100; recompute(); });
    const row = el("div", { class: "attn-row" }, [
      el("div", { class: "mono" }, t.word),
      range,
      el("output", {}, TM.pct(weights[i], 0)),
    ]);
    rows.appendChild(row);
  });
  wrap.append(
    el("p", { class: "hint" }, "Weights always add up to 100%. Move one and the rest rebalance."),
    rows,
    el("p", { class: "hint" }, "Toy value vectors — dimensions are illustrative, not real model features."),
    resultBox
  );
  recompute();
  return wrap;
}

// Logit → SoftMax table with optional exp() reveal and one editable logit.
function logitSoftmaxTable(candidates, logits, opts = {}) {
  const { showExp = false, editableIndex = null, onEdit = null, changedIndex = null } = opts;
  const probs = TM.softmax(logits);
  const t = el("table", { class: "math" });
  const head = [el("th", { class: "tok" }, "token"), el("th", {}, "logit z")];
  if (showExp) head.push(el("th", {}, "exp(z − max)"));
  head.push(el("th", {}, "probability"));
  t.appendChild(el("tr", {}, head));
  const max = Math.max(...logits);
  candidates.forEach((tok, i) => {
    const cells = [el("td", { class: "tok" }, tok)];
    if (editableIndex === i) {
      const inp = el("input", { type: "number", step: "0.1", value: String(TM.round(logits[i], 2)), style: "width:5rem", "aria-label": `logit for ${tok}` });
      inp.addEventListener("input", () => onEdit && onEdit(Number(inp.value)));
      cells.push(el("td", {}, inp));
    } else {
      const zc = el("td", { class: changedIndex === i ? "changed" : "" }, TM.round(logits[i], 2).toString());
      cells.push(zc);
    }
    if (showExp) cells.push(el("td", {}, TM.round(Math.exp(logits[i] - max), 3).toString()));
    cells.push(el("td", { class: changedIndex === i ? "changed" : "" }, TM.pct(probs[i])));
    t.appendChild(el("tr", {}, cells));
  });
  const totalCells = [el("td", { class: "tok" }, "total")];
  totalCells.push(el("td", {}, ""));
  if (showExp) totalCells.push(el("td", {}, TM.round(logits.reduce((a, z) => a + Math.exp(z - max), 0), 3).toString()));
  totalCells.push(el("td", {}, TM.pct(probs.reduce((a, b) => a + b, 0), 0)));
  t.appendChild(el("tr", { class: "total" }, totalCells));
  return { table: t, probs };
}

// Cumulative interval line + r marker
function cumulativeLine(probs, tokens, r) {
  const intervals = TM.cumulativeIntervals(probs);
  const line = el("div", { class: "cumline", role: "img", "aria-label": "Cumulative probability intervals from 0 to 1" });
  const palette = ["#245ea8", "#0d7d7d", "#6b7a8a", "#a1560a", "#1f5130", "#7a4fa3", "#557"];
  intervals.forEach((iv, i) => {
    const seg = el("div", { class: "cumseg", attrs: { style: `width:${iv.p * 100}%;background:${palette[i % palette.length]}` }, title: `${tokens[i]}: ${TM.pct(iv.p)}` },
      iv.p > 0.06 ? visibleTok(tokens[i]) : "");
    line.appendChild(seg);
  });
  if (r != null) line.appendChild(el("div", { class: "rmark", attrs: { style: `left:${r * 100}%` } }));
  const scale = el("div", { class: "cumline-scale" }, [el("span", {}, "0"), el("span", {}, "0.5"), el("span", {}, "1")]);
  return el("div", {}, [line, scale]);
}

// Teacher checkpoint (not a trapping modal — UX-07)
function checkpointPanel(cp, id) {
  const done = App.state.completedCheckpoints[id];
  const box = el("section", { class: "checkpoint", role: "region", "aria-label": "Teacher checkpoint" });
  box.append(
    el("div", { class: "stop-label" }, "Stop — discuss with your teacher"),
    el("h3", {}, cp.title),
    el("ol", {}, cp.qs.map((q) => el("li", {}, q)))
  );
  const btn = el("button", { class: done ? "btn-ghost" : "btn-primary" }, done ? "Discussed ✓ — continue when your teacher says" : "Continue when your teacher says to proceed");
  btn.addEventListener("click", () => { Store.completeCheckpoint(id); render(); });
  box.append(btn);
  return box;
}

// Prediction capture (1–3 words, stored not graded)
function predictionCapture(existing, onSave) {
  const words = existing ? existing.slice() : [];
  const wrap = el("div", { class: "stack" });
  const chips = el("div", { class: "pred-capture" });
  const input = el("input", { type: "text", placeholder: "type a word…", "aria-label": "your predicted next word", maxlength: "24" });
  function draw() {
    chips.innerHTML = "";
    words.forEach((w, i) => {
      const chip = el("span", { class: "chip" }, [w, el("button", { class: "x", "aria-label": `remove ${w}` }, "×")]);
      chip.querySelector(".x").addEventListener("click", () => { words.splice(i, 1); draw(); onSave(words.slice()); });
      chips.appendChild(chip);
    });
    if (words.length < 3) chips.appendChild(input);
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      words.push(input.value.trim()); input.value = ""; draw(); onSave(words.slice()); input.focus();
    }
  });
  draw();
  wrap.append(chips, el("p", { class: "hint" }, "Your guesses are saved on this device but never graded."));
  return wrap;
}

/* Small helpers for authored distributions -> sorted arrays */
function sortDist(dist) { return dist.slice().sort((a, b) => b.p - a.p); }

/* Reveal-on-demand wrapper (one dominant viz; details expand) */
function reveal(label, buildContent) {
  const wrap = el("div");
  const btn = el("button", { class: "btn-ghost reveal-btn" }, "▸ " + label);
  let open = false, content = null;
  btn.addEventListener("click", () => {
    open = !open;
    btn.textContent = (open ? "▾ " : "▸ ") + label;
    if (open) { content = buildContent(); wrap.appendChild(content); }
    else if (content) { content.remove(); content = null; }
  });
  wrap.appendChild(btn);
  return wrap;
}

/* ==================================================================== *
 *  APP SHELL (spec §3.4)
 * ==================================================================== */

function findStep(classN, stepId) {
  const cls = C.CLASSES.find((c) => c.n === classN);
  return { cls, step: cls?.steps.find((s) => s.id === stepId) };
}

function renderShell() {
  document.body.innerHTML = "";

  // Top bar
  const classChips = C.CLASSES.map((c) =>
    el("button", {
      class: "class-chip", "aria-current": App.route.view === "class" && App.route.classN === c.n ? "true" : "false",
      onclick: () => navigate({ view: "class", classN: c.n, stepId: c.steps[0].id }),
      title: c.title,
    }, "Class " + c.n)
  );
  const modelDot = el("span", { class: "dot" + (App.real.ready ? " ready" : App.real.loading ? " loading" : "") });
  const modelStatus = el("span", { class: "model-status" }, [modelDot, App.real.ready ? "Real model ready" : App.real.loading ? "Loading model…" : "Real model not loaded"]);

  const topbar = el("header", { class: "topbar" },
    el("div", { class: "topbar-inner" }, [
      el("button", { class: "btn-ghost", onclick: () => navigate({ view: "home" }), title: "Home" },
        el("span", { class: "brand" }, [document.createTextNode("The Next Token Lab"), el("small", {}, C.RECURRING_QUESTION)])),
      el("nav", { class: "class-indicator", "aria-label": "Classes" }, classChips),
      el("div", { class: "topbar-spacer" }),
      modelStatus,
      el("button", { class: "btn-ghost", onclick: () => navigate({ view: "glossary" }) }, "Glossary"),
      el("button", { class: "btn-ghost", onclick: openTeacher, title: "Teacher navigation" }, "Teacher"),
    ])
  );

  const layout = el("div", { class: "layout" });
  const rail = el("aside", { class: "rail", id: "rail", "aria-label": "Learning goal and process map" });
  const main = el("main", { class: "main", id: "main" });
  layout.append(rail, main);

  const footer = el("nav", { class: "footer-nav", id: "footer", "aria-label": "Step navigation" });

  document.body.append(topbar, layout, footer, buildTeacherPanel(), backdrop());
  renderRail();
  renderMain();
  renderFooter();
}

let _backdrop;
function backdrop() {
  _backdrop = el("div", { class: "backdrop", onclick: closeTeacher });
  return _backdrop;
}

function renderRail() {
  const rail = $("#rail");
  if (!rail) return;
  rail.innerHTML = "";
  if (App.route.view !== "class") {
    rail.appendChild(el("div", { class: "goal-strip" }, [
      el("div", { class: "k" }, "The one question"),
      el("div", { class: "goal" }, C.RECURRING_QUESTION),
    ]));
    return;
  }
  const { cls, step } = findStep(App.route.classN, App.route.stepId);
  rail.appendChild(el("div", { class: "goal-strip" }, [
    el("div", { class: "k" }, "Class " + cls.n + " goal"),
    el("div", { class: "goal" }, cls.goal),
    el("div", { class: "sub" }, step ? step.sub : ""),
  ]));

  // Process map with current stage highlighted; earlier stages "done".
  const activeStageIdx = C.PROCESS_STAGES.findIndex((s) => s.id === (step?.stage));
  const ul = el("ul", { class: "process-map", "aria-label": "Process map" });
  C.PROCESS_STAGES.forEach((s, i) => {
    const li = el("li", { class: (i === activeStageIdx ? "active" : "") + (i < activeStageIdx ? " done" : "") },
      [el("span", { class: "num" }, String(i + 1)), s.label]);
    ul.appendChild(li);
  });
  rail.appendChild(ul);
}

function renderFooter() {
  const footer = $("#footer");
  if (!footer) return;
  footer.innerHTML = "";
  if (App.route.view !== "class") return;
  const { cls, step } = findStep(App.route.classN, App.route.stepId);
  const idx = cls.steps.findIndex((s) => s.id === step.id);
  const prev = cls.steps[idx - 1];
  const next = cls.steps[idx + 1];
  const nextClass = C.CLASSES.find((c) => c.n === cls.n + 1);

  const prevBtn = el("button", { class: "btn-ghost", disabled: !prev && cls.n === 1 },
    prev ? "‹ " + prev.title : "‹ Home");
  prevBtn.addEventListener("click", () => {
    if (prev) navigate({ view: "class", classN: cls.n, stepId: prev.id });
    else navigate({ view: "home" });
  });

  const nextBtn = el("button", { class: "btn-primary" },
    next ? next.title + " ›" : nextClass ? "Start Class " + nextClass.n + " ›" : "Finish ›");
  nextBtn.addEventListener("click", () => {
    if (next) navigate({ view: "class", classN: cls.n, stepId: next.id });
    else if (nextClass) navigate({ view: "class", classN: nextClass.n, stepId: nextClass.steps[0].id });
    else navigate({ view: "home" });
  });

  const save = Store.isMemoryOnly() ? "Progress may not persist on this device" : "Saved on this device";
  footer.append(prevBtn, el("div", { class: "mid" }, [el("div", {}, step.title), el("div", { class: "autosave" }, save)]), nextBtn);
}

/* ==================================================================== *
 *  ROUTER
 * ==================================================================== */

function navigate(route) {
  App.route = { ...App.route, ...route };
  if (route.view === "class") Store.setLocation(route.classN, route.stepId);
  const hash = route.view === "class" ? `#/class/${route.classN}/${route.stepId}`
    : route.view === "lab" ? "#/lab" : route.view === "glossary" ? "#/glossary" : "#/home";
  if (location.hash !== hash) history.replaceState(null, "", hash);
  render();
  window.scrollTo(0, 0);
}

function render() { renderShell(); }

function renderMain() {
  const main = $("#main");
  main.innerHTML = "";
  if (App.route.view === "home") return main.appendChild(renderHome());
  if (App.route.view === "glossary") return main.appendChild(renderGlossary());
  if (App.route.view === "lab") return main.appendChild(renderOpenLab());
  // class view
  main.appendChild(renderStep(App.route.classN, App.route.stepId));
}

/* ==================================================================== *
 *  HOME / RESUME
 * ==================================================================== */
function renderHome() {
  const s = App.state;
  const frag = el("div", { class: "stack" });
  frag.appendChild(el("section", { class: "card" }, [
    el("div", { class: "eyebrow" }, "Intro to AI · four guided classes"),
    el("h2", {}, "The Next Token Lab"),
    el("p", { class: "lead" }, "Every activity returns to one question: " + C.RECURRING_QUESTION),
    el("p", {}, "You will start with a simple picture — a model guessing the next word — and end able to trace the whole loop a real language model runs: tokens, context, scores, probabilities, and one selected token, appended and repeated."),
  ]));

  // Resume card (best-effort)
  const { cls, step } = findStep(s.currentClass, s.currentStep);
  if (cls && step && (s.currentClass !== 1 || s.currentStep !== "1.0")) {
    frag.appendChild(el("section", { class: "card resume-card" }, [
      el("div", { class: "eyebrow" }, "Resume where you left off"),
      el("h3", {}, `Class ${cls.n} — ${step.title}`),
      el("p", { class: "hint" }, "Best-effort, saved on this browser/device only."),
      el("button", { class: "btn-primary", onclick: () => navigate({ view: "class", classN: cls.n, stepId: step.id }) }, "Resume"),
    ]));
  }

  const grid = el("div", { class: "home-grid" });
  C.CLASSES.forEach((c) => {
    grid.appendChild(el("div", { class: "class-card" }, [
      el("h3", {}, [el("span", { class: "n" }, "Class " + c.n), c.title]),
      el("p", { class: "hint" }, c.question),
      el("button", { class: "btn-primary", onclick: () => navigate({ view: "class", classN: c.n, stepId: c.steps[0].id }) }, "Open"),
    ]));
  });
  frag.appendChild(el("section", { class: "card" }, [el("h3", {}, "Choose a class"), grid]));

  frag.appendChild(el("section", { class: "card" }, [
    el("h3", {}, "Open Lab"),
    el("p", { class: "hint" }, "Unlocked in Class 4. Type your own prompt and run the whole loop."),
    el("button", { class: "btn-ghost", onclick: () => navigate({ view: "lab" }) }, "Go to Open Lab"),
  ]));
  return frag;
}

/* ==================================================================== *
 *  GLOSSARY
 * ==================================================================== */
function renderGlossary() {
  const dl = el("dl", { class: "glossary" });
  C.GLOSSARY.forEach(([term, def]) => { dl.append(el("dt", {}, term), el("dd", {}, def)); });
  return el("section", { class: "card" }, [el("h2", {}, "Glossary"), el("p", { class: "hint" }, "Plain-language definitions kept at this course's introductory level."), dl]);
}

/* ==================================================================== *
 *  STEP DISPATCH
 * ==================================================================== */
function renderStep(classN, stepId) {
  const { cls, step } = findStep(classN, stepId);
  const container = el("div", { class: "stack" });

  const header = el("section", { class: "card" }, [
    el("div", { class: "eyebrow" }, `Class ${cls.n} · Step ${step.id}`),
    el("h2", {}, step.title),
    el("p", { class: "lead" }, step.sub),
  ]);
  container.appendChild(header);

  const body = { 1: renderClass1, 2: renderClass2, 3: renderClass3, 4: renderClass4 }[classN](stepId);
  if (body) container.appendChild(body);

  if (step.checkpoint) container.appendChild(checkpointPanel(step.checkpoint, step.id));
  return container;
}

/* ==================================================================== *
 *  CLASS 1 — Patterns and repeated prediction
 * ==================================================================== */

// Backoff generation from the visible corpus (trigram→bigram→unigram).
function corpusBackoff(context) {
  for (const order of [3, 2, 1]) {
    const r = TM.predictFromCorpus(C.CLASS1_CORPUS, context, order);
    if (r.counts.length) return r;
  }
  return TM.predictFromCorpus(C.CLASS1_CORPUS, context, 1);
}

function renderClass1(stepId) {
  const s = App.state.class1;
  switch (stepId) {
    case "1.0": {
      return el("section", { class: "card stack" }, [
        el("p", {}, `Read the start of this sentence: “${C.CLASS1_STARTER} ___”. Before you see any data, what are 1–3 words you think could come next?`),
        predictionCapture(s.predictions, (words) => { Store.update((st) => { st.class1.predictions = words; }); }),
        el("div", { class: "notice sim" }, "No answer is marked right or wrong. In a moment you'll see where a simple model's guesses could come from."),
      ]);
    }
    case "1.1": {
      const box = el("section", { class: "card stack" });
      box.append(
        el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", {}, "Here is a small, complete training library. Because it is small, you can check every count yourself."),
      );
      const corpusList = el("ul");
      C.CLASS1_CORPUS.forEach((sent) => corpusList.appendChild(el("li", { class: "mono" }, sent)));
      const dist = corpusBackoff(C.CLASS1_STARTER);
      box.append(
        reveal("Show the 12 training sentences", () => corpusList),
        el("h3", {}, `What followed “${C.CLASS1_STARTER}” in the library?`),
        el("p", { class: "hint" }, `Matching on the last words “${dist.contextUsed}” — ${dist.total} matches counted.`),
        candidateList(dist.counts.map((c) => ({ token: c.token, p: c.p }))),
        el("div", { class: "notice sim" }, "This is counting in a visible corpus — a teaching simplification, not how a real LLM works inside. A real model has already turned patterns like these into weights."),
      );
      return box;
    }
    case "1.2": {
      const box = el("section", { class: "card stack" });
      const baseline = corpusBackoff(C.CLASS1_STARTER);
      let working = C.CLASS1_CORPUS.slice();
      const after = el("div");

      function recompute() {
        for (const order of [3, 2, 1]) {
          const r = TM.predictFromCorpus(working, C.CLASS1_STARTER, order);
          if (r.counts.length) { drawAfter(r); return; }
        }
      }
      function drawAfter(r) {
        after.innerHTML = "";
        after.append(el("h3", {}, "After your change"), candidateList(r.counts.map((c) => ({ token: c.token, p: c.p }))));
      }

      const addInput = el("input", { type: "text", placeholder: 'e.g. "The weather today is stormy and grey."', "aria-label": "add one sentence", style: "flex:1;min-width:14rem;padding:.45rem" });
      const addBtn = el("button", { class: "btn-primary" }, "Add this one sentence");
      addBtn.addEventListener("click", () => {
        if (!addInput.value.trim()) return;
        working.push(addInput.value.trim());
        Store.update((st) => { st.class1.corpusEdits = { added: addInput.value.trim() }; });
        recompute(); addInput.disabled = true; addBtn.disabled = true;
      });

      box.append(
        el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", {}, "Change one thing — add a single sentence — and watch the prediction move. Changing the data changes the pattern, without any sentence being looked up."),
        el("h3", {}, "Before your change"),
        candidateList(baseline.counts.map((c) => ({ token: c.token, p: c.p }))),
        el("div", { class: "row" }, [addInput, addBtn]),
        after,
      );
      return box;
    }
    case "1.3": {
      return el("section", { class: "card stack" }, [
        el("p", {}, "Counting sentences is not what the real model does when it answers you. There are two different processes:"),
        el("div", { class: "compare-grid" }, [
          el("div", { class: "branch" }, [
            el("h4", {}, "Training (happens once, beforehand)"),
            el("p", { class: "hint mono" }, "predict actual next token → measure error → adjust weights → repeat billions of times"),
            el("p", {}, "This is the gradient-descent loop you already met. It slowly bakes patterns into the weights."),
          ]),
          el("div", { class: "branch" }, [
            el("h4", {}, "Use (every time you prompt it)"),
            el("p", { class: "hint mono" }, "read the prompt → run the fixed weights → score next tokens → select → append → repeat"),
            el("p", {}, "No searching, no looking up sentences. Just the trained weights doing arithmetic."),
          ]),
        ]),
        el("div", { class: "notice" }, "The visible-corpus counting from the last screens stands in for what training summarized — it is not a database the model reads at answer time."),
      ]);
    }
    case "1.4": {
      const box = el("section", { class: "card stack" });
      let context = C.CLASS1_STARTER;
      const ctxLine = el("p", { class: "mono" });
      const cands = el("div");
      function draw() {
        ctxLine.textContent = "Text so far: " + context;
        const r = corpusBackoff(context);
        cands.innerHTML = "";
        cands.appendChild(el("h3", {}, "Choose the next word to append"));
        const list = el("div", { class: "candidate-list" });
        r.counts.slice(0, 6).forEach((c, i) => {
          const btn = el("button", { class: "step-link", style: "display:flex;justify-content:space-between;gap:1rem" },
            [el("span", { class: "mono" }, visibleTok(c.token)), el("span", {}, TM.pct(c.p))]);
          btn.addEventListener("click", () => { context += " " + c.token; draw(); });
          list.appendChild(btn);
        });
        cands.appendChild(list);
      }
      draw();
      box.append(el("p", {}, "Pick a word. It is appended to the text, and the model predicts again from the new, longer context. That is the whole loop, one step at a time."), ctxLine, cands);
      return box;
    }
    case "1.5": {
      const box = el("section", { class: "card stack" });
      const startCtx = C.CLASS1_STARTER;
      const first = corpusBackoff(startCtx).counts.slice(0, 4);
      const branches = [null, null]; // {word, path:[...], finalDist}

      function grow(word) {
        let ctx = startCtx + " " + word;
        const path = [word];
        for (let i = 0; i < 3; i++) {
          const r = corpusBackoff(ctx);
          if (!r.counts.length) break;
          const pick = r.counts[0].token; path.push(pick); ctx += " " + pick;
        }
        return { word, path, ctx, finalDist: corpusBackoff(ctx) };
      }

      const pickRow = el("div", { class: "row" });
      const out = el("div", { class: "branch-grid" });
      function drawPicks() {
        pickRow.innerHTML = "";
        pickRow.appendChild(el("span", {}, "From “" + startCtx + " ___” choose two different first words:"));
        first.forEach((c) => {
          const b = el("button", { class: "btn-ghost" }, c.token);
          b.addEventListener("click", () => {
            const slot = branches[0] ? 1 : 0;
            branches[slot] = grow(c.token);
            Store.update((st) => { st.class1.branches = branches.filter(Boolean).map((br) => ({ word: br.word, path: br.path })); });
            drawOut();
          });
          pickRow.appendChild(b);
        });
        const reset = el("button", { class: "btn-ghost", onclick: () => { branches[0] = branches[1] = null; drawOut(); } }, "Rewind both");
        pickRow.appendChild(reset);
      }
      function drawOut() {
        out.innerHTML = "";
        branches.forEach((br, i) => {
          if (!br) { out.appendChild(el("div", { class: "branch" }, [el("h4", {}, "Branch " + (i + 1)), el("p", { class: "hint" }, "Pick a word above.")])); return; }
          out.appendChild(el("div", { class: "branch" }, [
            el("h4", {}, "Branch " + (i + 1) + ": chose “" + br.word + "”"),
            el("div", { class: "path" }, startCtx + " " + br.path.join(" ")),
            el("h4", { style: "margin-top:.6rem" }, "Its next-word distribution now"),
            candidateList(br.finalDist.counts.slice(0, 5).map((c) => ({ token: c.token, p: c.p }))),
          ]));
        });
        drawPicks();
      }
      drawOut();
      box.append(el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", {}, "Same starting context, two different first choices. Watch how the branches drift apart — a single selection changes everything that can come after it."),
        pickRow, out);
      return box;
    }
    case "1.6": {
      const br = App.state.class1.branches;
      const path = br && br[0] ? (C.CLASS1_STARTER + " " + br[0].word) : (C.CLASS1_STARTER + " sunny");
      return el("section", { class: "card stack" }, [
        el("p", {}, "Back to the opening question: " + C.RECURRING_QUESTION),
        el("div", { class: "notice sim" }, "You saw the whole loop with counting standing in for the model: patterns → prediction → select → append → predict again."),
        el("h3", {}, "Your branch, inserted into the loop"),
        el("div", { class: "equation" }, path + " …"),
        el("p", {}, "Next class: why do earlier words — like the one you just chose — change what the model predicts next?"),
      ]);
    }
  }
}

/* ==================================================================== *
 *  CLASS 2 — Context and attention
 * ==================================================================== */
function renderClass2(stepId) {
  switch (stepId) {
    case "2.0": {
      const br = App.state.class1.branches;
      const chosen = br && br[0] ? br[0].word : null;
      return el("section", { class: "card stack" }, [
        chosen
          ? el("p", {}, `Last class you chose “${chosen}”. That word is now part of the context — so this class asks how earlier words like it change the next prediction.`)
          : el("p", {}, "In Class 1 a chosen word became part of the context. This class asks how earlier words change the next prediction."),
        el("div", { class: "notice" }, "The single question hasn't changed — only what feeds into it. Earlier words are part of “everything the model has so far.”"),
      ]);
    }
    case "2.1": {
      const ex = C.CLASS2_THREE_PREDICTORS;
      const box = el("section", { class: "card stack" });
      let expected = null;
      box.append(
        el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", { class: "mono" }, "“" + ex.context + " ___”"),
        el("p", {}, ex.note),
        el("p", {}, "Which predictor do you think will get this right?"),
      );
      const seg = el("div", { class: "seg", role: "group", "aria-label": "your guess" });
      ["frequency", "last", "broad"].forEach((k) => {
        const b = el("button", { "aria-pressed": "false" }, ex.predictors[k].label);
        b.addEventListener("click", () => { expected = k; [...seg.children].forEach((c) => c.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); Store.update((st) => { st.class2.contextPrediction = k; }); reveal2(); });
        seg.appendChild(b);
      });
      box.appendChild(seg);
      const results = el("div");
      box.appendChild(results);
      function reveal2() {
        results.innerHTML = "";
        results.appendChild(el("div", { class: "compare-grid" },
          ["frequency", "last", "broad"].map((k) => el("div", { class: "branch" }, [
            el("h4", {}, ex.predictors[k].label),
            candidateList(sortDist(ex.predictors[k].dist)),
          ]))
        ));
        results.appendChild(el("div", { class: "notice sim" }, ex.callout));
      }
      return box;
    }
    case "2.2": {
      const m = C.CLASS2_MATCHED_BANK;
      const box = el("section", { class: "card stack" });
      box.append(
        el("p", {}, `Both prompts end with the identical words “…${m.shared_ending}”. Only the earlier context differs. Predict which token rises in each before revealing.`),
        el("div", { class: "compare-grid" }, [
          el("div", { class: "branch" }, [el("h4", {}, m.a.label), el("p", { class: "mono hint" }, "“" + m.a.prompt + " ___”"), candidateList(sortDist(m.a.dist))]),
          el("div", { class: "branch" }, [el("h4", {}, m.b.label), el("p", { class: "mono hint" }, "“" + m.b.prompt + " ___”"), candidateList(sortDist(m.b.dist), { mode: "real" })]),
        ]),
        el("div", { class: "notice" }, "Because the endings are identical, any difference must come from the earlier context — not the last few words."),
      );
      return box;
    }
    case "2.3": {
      const er = C.CLASS2_ERASER;
      const box = el("section", { class: "card stack" });
      let muted = false;
      const view = el("div");
      function draw() {
        view.innerHTML = "";
        const a = sortDist(er.base), b = sortDist(er.muted);
        view.append(
          el("p", { class: "mono" }, muted ? er.fullContext.replace(er.phrase, "▟▟▟▟") + " ___" : er.fullContext + " ___"),
          el("h3", {}, muted ? "With “" + er.phrase + "” muted" : "Full context"),
          candidateList(muted ? b : a),
          el("h3", { style: "margin-top:.7rem" }, "Change caused by muting that phrase"),
          contextDelta(a, b, "full", "muted"),
        );
      }
      const toggle = el("button", { class: "btn-primary" }, "Mute “" + er.phrase + "”");
      toggle.addEventListener("click", () => { muted = !muted; toggle.textContent = (muted ? "Restore" : "Mute") + " “" + er.phrase + "”"; Store.update((st) => { st.class2.contextEdit = { muted }; }); draw(); });
      draw();
      box.append(el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", {}, "Click to mute an earlier phrase and watch the candidate probabilities shift. Removing “" + er.phrase + "” makes “they” ambiguous, and the distribution reacts."),
        toggle, view);
      return box;
    }
    case "2.4": {
      const box = el("section", { class: "card stack" }, [el("p", {}, "Context matters beyond ambiguity. Three quick challenges:")]);
      C.CLASS2_CHALLENGES.forEach((ch) => {
        box.appendChild(el("div", { class: "branch" }, [
          el("h4", {}, ch.kind),
          el("p", { class: "mono hint" }, "“" + ch.prompt + " ___”  — " + ch.answer),
          candidateList(sortDist(ch.dist)),
        ]));
      });
      return box;
    }
    case "2.5": {
      const cfg = C.CLASS2_ATTENTION;
      const box = el("section", { class: "card stack" });
      box.append(
        el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", { class: "mono" }, "“" + cfg.context + " ___”"),
        el("p", {}, "“Some earlier words matter more” becomes a set of weights that add to 1. Each earlier token carries a toy value vector; attention mixes them by weight."),
        el("div", { class: "equation" }, "contextual info = Σ ( weight × value vector )"),
        attentionPanel(cfg, cfg.defaultWeights.slice(), (w) => { Store.update((st) => { st.class2.contextEdit = { weights: w.map((x) => TM.round(x, 2)) }; }); }),
        el("div", { class: "notice" }, "This is a simplified view — one made-up head. Real transformers use many learned heads and layers; this is not the model's definitive attention."),
      );
      return box;
    }
    case "2.6": {
      return realModelStep({
        title: "Check a real transformer",
        blurb: "Optional. Load the Real Browser Model and confirm that its probabilities shift when the earlier context changes — the same idea, on a genuine model.",
        prompts: [C.CLASS2_MATCHED_BANK.a.prompt, C.CLASS2_MATCHED_BANK.b.prompt],
        note: "Any real attention picture would be just one head/layer — not the model's reasoning.",
      });
    }
    case "2.7": {
      return el("section", { class: "card stack" }, [
        el("p", {}, "Putting it together: earlier context → attention weights → a changed representation → different next-token scores."),
        el("div", { class: "equation" }, "context → attention → changed scores → " + C.RECURRING_QUESTION),
        el("p", {}, "Next class: how does text actually become those numbers and scores in the first place?"),
      ]);
    }
  }
}

/* ==================================================================== *
 *  CLASS 3 — Tokens, scores, probabilities
 * ==================================================================== */
function renderClass3(stepId) {
  const toy = C.CLASS3_TOY;
  switch (stepId) {
    case "3.0": {
      const br = App.state.class1.branches;
      const sample = br && br[0] ? (C.CLASS1_STARTER + " " + br[0].word) : "The weather today is unbelievable";
      const toks = TM.teachingTokenize(sample);
      Store.update((st) => { st.class3.tokenExample = sample; });
      return el("section", { class: "card stack" }, [
        el("div", { class: "notice sim" }, "Correction time: “next-word predictor” was a useful simplification. The technically accurate unit is a token."),
        el("p", { class: "mono" }, "“" + sample + "”"),
        el("h3", {}, "The same text as tokens"),
        tokenRibbon(toks),
        el("p", { class: "hint" }, "Spaces (␣) and punctuation are their own tokens. Some words split into fragments."),
      ]);
    }
    case "3.1": {
      const box = el("section", { class: "card stack" });
      const input = el("input", { type: "text", value: "unbelievable tokenization, strawberry!", style: "flex:1;min-width:16rem;padding:.5rem", "aria-label": "text to tokenize" });
      const ribbon = el("div");
      const detail = el("div", { class: "notice" }, "Click a token to see its id and raw string.");
      function draw() {
        const toks = TM.teachingTokenize(input.value);
        ribbon.innerHTML = "";
        ribbon.appendChild(tokenRibbon(toks, (t, i, node) => {
          [...ribbon.querySelectorAll(".tokblk")].forEach((n) => n.classList.remove("selected"));
          node.classList.add("selected");
          detail.textContent = `token “${t.visible}” · id ${t.id} · kind ${t.kind} · raw "${t.raw}"`;
          Store.update((st) => { st.class3.tokenExample = input.value; });
        }));
        ribbon.appendChild(el("p", { class: "hint" }, `${toks.length} tokens · ${toks.filter((t) => t.kind === "fragment").length} fragment(s)`));
      }
      input.addEventListener("input", draw);
      draw();
      box.append(
        el("span", { class: "badge teaching" }, "Teaching tokenizer"),
        el("p", {}, "Type anything. Watch whole words, fragments, punctuation and spaces become separate tokens."),
        el("div", { class: "row" }, [input]),
        ribbon, detail,
        el("div", { class: "notice sim" }, "This is a demonstration tokenizer. A real model's tokenizer (available in Compare) may split differently."),
      );
      return box;
    }
    case "3.2": {
      const box = el("section", { class: "card stack" });
      const t = el("table", { class: "math" });
      t.appendChild(el("tr", {}, [el("th", { class: "tok" }, "token"), el("th", {}, "d₁"), el("th", {}, "d₂"), el("th", {}, "d₃")]));
      toy.tokenVectors.forEach((tv) => t.appendChild(el("tr", {}, [el("td", { class: "tok" }, tv.token), ...tv.v.map((x) => el("td", {}, x.toFixed(2)))])));
      box.append(
        el("p", {}, "Each token becomes a row of numbers — a vector. A sequence of tokens is just a matrix of these rows, connecting straight back to your matrix work."),
        t,
        el("div", { class: "notice" }, "These dimensions are simplified/unlabeled axes — not literal discovered features inside the real model."),
      );
      return box;
    }
    case "3.3": {
      const cfg = C.CLASS2_ATTENTION;
      const before = cfg.tokens[2].value; // "too" position, pre-mix
      const box = el("section", { class: "card stack" });
      const out = el("div", { class: "stack" });
      box.append(
        el("p", {}, "Class 2's weighted attention updates the vector at the final position. Below: the last token's vector before and after mixing in earlier context."),
        attentionPanel(cfg, cfg.defaultWeights.slice(), (w, ctx) => {
          out.innerHTML = "";
          out.append(
            el("div", { class: "vecbox" }, "before (just “too”): [ " + before.map((x) => x.toFixed(2)).join(", ") + " ]"),
            el("div", { class: "vecbox" }, "after (context-mixed): [ " + ctx.map((x) => TM.round(x, 2)).join(", ") + " ]"),
          );
        }),
        out,
      );
      return box;
    }
    case "3.4": {
      const box = el("section", { class: "card stack" });
      const logits = TM.outputLogits(toy.W, toy.h, toy.b);
      box.append(
        el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", {}, "The context vector h feeds the output layer. Each candidate gets a score — a logit — from the familiar weighted sum you know from neural nets."),
        el("div", { class: "equation" }, "z = Wₒᵤₜ · h + b"),
      );
      let editable = logits.slice();
      const tableWrap = el("div");
      function drawTable() {
        tableWrap.innerHTML = "";
        const { table } = logitSoftmaxTable(toy.candidates, editable, { editableIndex: 0, onEdit: (v) => { editable[0] = v; drawTable(); Store.update((st) => { st.class3.logitExperiment = { logits: editable.map((x) => TM.round(x, 2)) }; }); } });
        tableWrap.appendChild(table);
      }
      drawTable();
      box.append(tableWrap, el("div", { class: "notice" }, "Logits are scores, not probabilities. They can be negative. Adjust the top one and watch the probabilities respond on the next screen."));
      return box;
    }
    case "3.5": {
      const box = el("section", { class: "card stack" });
      const base = App.state.class3.logitExperiment?.logits || TM.outputLogits(toy.W, toy.h, toy.b);
      let logits = base.slice();
      const tableWrap = el("div");
      const sliderVal = el("output", {}, TM.round(logits[0], 2).toString());
      box.append(
        el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", {}, "SoftMax turns competing scores into probabilities that total 100%. Raise one logit and the others must give up probability — they compete for a fixed budget."),
        el("div", { class: "equation" }, "Pᵢ = exp(zᵢ) / Σⱼ exp(zⱼ)"),
      );
      const slider = el("input", { type: "range", min: "-3", max: "5", step: "0.1", value: String(logits[0]), "aria-label": "logit for first token" });
      let showExp = false;
      function draw() {
        tableWrap.innerHTML = "";
        const { table } = logitSoftmaxTable(toy.candidates, logits, { showExp, changedIndex: 0 });
        tableWrap.appendChild(table);
        sliderVal.textContent = TM.round(logits[0], 2).toString();
      }
      slider.addEventListener("input", () => { logits[0] = Number(slider.value); draw(); });
      const expBtn = el("button", { class: "btn-ghost" }, "Show the exp() / sum steps");
      expBtn.addEventListener("click", () => { showExp = !showExp; expBtn.textContent = (showExp ? "Hide" : "Show") + " the exp() / sum steps"; draw(); });
      draw();
      box.append(el("div", { class: "slider-row" }, [el("span", {}, "z(" + toy.candidates[0] + ")"), slider, sliderVal]), expBtn, tableWrap,
        el("div", { class: "notice sim" }, "The total always reads 100% across this toy candidate set."));
      return box;
    }
    case "3.6": {
      return realModelStep({
        title: "Compare with a real model",
        blurb: "Optional. Load the Real Browser Model to see authentic tokenization and its native T=1 probabilities over the whole vocabulary.",
        prompts: ["The trophy would not fit in the suitcase because it was too", "The weather today is"],
        showTokenize: true,
        note: "The visible top tokens are only the top of the full vocabulary — the rest is shown as “all other tokens” and never folded in to make 100%.",
      });
    }
    case "3.7": {
      const steps = ["tokens", "vectors", "context (attention)", "logits", "probabilities"];
      return el("section", { class: "card stack" }, [
        el("p", {}, "The full path from text to probabilities:"),
        el("div", { class: "equation" }, steps.join("  →  ")),
        el("p", {}, "Next class: how does one of those probabilities actually get chosen — and how does the loop repeat?"),
      ]);
    }
  }
}

/* ==================================================================== *
 *  CLASS 4 — Temperature, selection, the complete loop
 * ==================================================================== */
function renderClass4(stepId) {
  const toy = C.CLASS3_TOY;
  const baseLogits = App.state.class3.logitExperiment?.logits || TM.outputLogits(toy.W, toy.h, toy.b);
  switch (stepId) {
    case "4.0": {
      const { table } = logitSoftmaxTable(toy.candidates, baseLogits, {});
      return el("section", { class: "card stack" }, [
        el("p", {}, "Back to your Class 3 scores. These logits stay fixed for the next few screens, so the only new idea is temperature."),
        table,
      ]);
    }
    case "4.1": {
      const box = el("section", { class: "card stack" });
      let T = 1, greedy = false;
      const chart = el("div");
      function draw() {
        chart.innerHTML = "";
        if (greedy) {
          const gi = TM.greedyIndex(baseLogits);
          const probs = toy.candidates.map((_, i) => (i === gi ? 1 : 0));
          chart.append(el("h3", {}, "Greedy (always the top score)"),
            candidateList(toy.candidates.map((t, i) => ({ token: t, p: probs[i] })), { selected: toy.candidates[gi] }));
          return;
        }
        const probs = TM.temperatureSoftmax(baseLogits, T);
        chart.append(el("h3", {}, "Temperature T = " + T),
          candidateList(toy.candidates.map((t, i) => ({ token: t, p: probs[i] }))));
      }
      const presets = el("div", { class: "seg", role: "group", "aria-label": "temperature presets" });
      [["T < 1 (0.5)", 0.5], ["T = 1", 1], ["T > 1 (1.5)", 1.5]].forEach(([lbl, val]) => {
        const b = el("button", { "aria-pressed": val === T ? "true" : "false" }, lbl);
        b.addEventListener("click", () => { greedy = false; T = val; [...presets.children].forEach((c) => c.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); greedyBtn.setAttribute("aria-pressed", "false"); draw(); });
        presets.appendChild(b);
      });
      const greedyBtn = el("button", { class: "btn-ghost", "aria-pressed": "false" }, "Greedy (separate)");
      greedyBtn.addEventListener("click", () => { greedy = true; [...presets.children].forEach((c) => c.setAttribute("aria-pressed", "false")); greedyBtn.setAttribute("aria-pressed", "true"); draw(); });
      draw();
      box.append(
        el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", {}, "Same logits, different temperature. Below 1 sharpens toward the top token; above 1 flattens. Temperature reshapes — it does not pick."),
        el("div", { class: "equation" }, "Pᵢ(T) = exp(zᵢ / T) / Σⱼ exp(zⱼ / T)"),
        el("div", { class: "controls" }, [presets, greedyBtn]),
        chart,
        el("div", { class: "notice" }, "Greedy is its own mode — not temperature set to zero. We never divide by zero."),
      );
      return box;
    }
    case "4.2": {
      const box = el("section", { class: "card stack" });
      const probs = TM.temperatureSoftmax(baseLogits, 1);
      const intervals = TM.cumulativeIntervals(probs);
      const t = el("table", { class: "math" });
      t.appendChild(el("tr", {}, [el("th", { class: "tok" }, "token"), el("th", {}, "P"), el("th", {}, "interval start"), el("th", {}, "interval end")]));
      intervals.forEach((iv) => t.appendChild(el("tr", {}, [el("td", { class: "tok" }, toy.candidates[iv.index]), el("td", {}, TM.pct(iv.p)), el("td", {}, iv.start.toFixed(3)), el("td", {}, iv.end.toFixed(3))])));
      box.append(
        el("p", {}, "Line up the probabilities end to end along a 0–1 number line. Each token now owns an interval whose width is its probability."),
        cumulativeLine(probs, toy.candidates, null),
        t,
      );
      return box;
    }
    case "4.3": {
      const box = el("section", { class: "card stack" });
      let T = 1, r = 0.5;
      const view = el("div");
      function draw() {
        const probs = TM.temperatureSoftmax(baseLogits, T);
        const res = TM.sampleWithR(probs, r);
        view.innerHTML = "";
        view.append(
          cumulativeLine(probs, toy.candidates, r),
          el("p", {}, `r = ${r.toFixed(2)} lands in the interval for `),
          candidateList(toy.candidates.map((t, i) => ({ token: t, p: probs[i] })), { selected: toy.candidates[res.index] }),
        );
        Store.update((st) => {
          st.class4.temperatureTrials = (st.class4.temperatureTrials || []).slice(-4);
          st.class4.temperatureTrials.push({ T, r: TM.round(r, 2), token: toy.candidates[res.index] });
        });
      }
      const rRange = el("input", { type: "range", min: "0", max: "0.999", step: "0.001", value: String(r), "aria-label": "random number r" });
      const rOut = el("output", {}, r.toFixed(2));
      rRange.addEventListener("input", () => { r = Number(rRange.value); rOut.textContent = r.toFixed(2); draw(); });
      const tRange = el("input", { type: "range", min: "0.3", max: "2", step: "0.1", value: String(T), "aria-label": "temperature" });
      const tOut = el("output", {}, T.toFixed(1));
      tRange.addEventListener("input", () => { T = Number(tRange.value); tOut.textContent = T.toFixed(1); draw(); });
      draw();
      box.append(
        el("span", { class: "badge teaching" }, "Teaching Model"),
        el("p", {}, "One random number r selects the token: pick the first interval that reaches or passes r. Now hold r fixed and change T — the selection can change because the intervals resized, not because r moved."),
        el("div", { class: "slider-row" }, [el("span", {}, "r"), rRange, rOut]),
        el("div", { class: "slider-row" }, [el("span", {}, "T"), tRange, tOut]),
        view,
      );
      return box;
    }
    case "4.4": {
      const box = el("section", { class: "card stack" });
      let context = "The trophy would not fit because it was too";
      const gi = TM.greedyIndex(baseLogits);
      const chosen = toy.candidates[gi];
      box.append(
        el("p", {}, "Selection is not the end — it is the start of the next step. The chosen token joins the context and the whole pipeline recomputes."),
        el("div", { class: "equation" }, context + "  +  [" + chosen + "]"),
        el("h3", {}, "What gets recalculated for the next token"),
        el("ol", {}, ["tokenization of the new, longer text", "context / attention over one more token", "logits from the output layer", "probabilities via SoftMax"].map((x) => el("li", {}, x + "  ↻"))),
        el("div", { class: "notice sim" }, "Every downstream stage is marked recalculated because the input changed. Then selection happens again — the loop."),
      );
      return box;
    }
    case "4.5": {
      return realModelStep({
        title: "Guided real-model experiments",
        blurb: "Optional. Run three controlled experiments on the Real Browser Model, then Open Lab unlocks.",
        experiments: true,
        prompts: ["The capital of France is", "The trophy would not fit in the suitcase because it was too", "Once upon a time, in a"],
        note: "Do these three before free exploration — controlled first, open second.",
      });
    }
    case "4.6": {
      return el("section", { class: "card stack" }, [
        el("p", {}, "You've traced the whole loop. Open Lab is now unlocked — type your own prompt and run every stage yourself."),
        el("button", { class: "btn-primary", onclick: () => navigate({ view: "lab" }) }, "Open the Lab ›"),
      ]);
    }
    case "4.7": {
      return el("section", { class: "card stack" }, [
        el("h3", {}, "One prediction event, the whole loop"),
        el("div", { class: "equation" }, "training patterns → text/tokens → context/attention → logits → probabilities → selection → append → (repeat)"),
        el("p", {}, "That is what a language model does, over and over, to produce every response. Back to where we started: " + C.RECURRING_QUESTION),
      ]);
    }
  }
}

/* ==================================================================== *
 *  REAL MODEL STEP (shared by 2.6, 3.6, 4.5) + capability states
 * ==================================================================== */
function realModelStep(cfg) {
  const box = el("section", { class: "card stack" });
  box.append(el("span", { class: "badge real" }, "Real Browser Model"), el("h2", {}, cfg.title), el("p", { class: "lead" }, cfg.blurb));

  const status = el("div", { class: "notice" });
  const output = el("div", { class: "stack" });

  function setStatus(txt, cls = "notice") { status.className = cls; status.textContent = txt; }

  if (!App.real.ready) {
    if (!App.real.webgpuAvailable()) {
      box.append(el("div", { class: "notice warn" },
        "This device does not report WebGPU. The guided Teaching Model on every other screen still works fully. For the real-model portions, your teacher may run this on a laptop with WebGPU, or you can try the slower CPU path below."));
    }
    setStatus("The real model is not loaded yet — nothing downloads until you choose to load it.");
    const loadBtn = el("button", { class: "btn-real" }, "Load Real Browser Model");
    const progress = el("div", { class: "hint" });
    App.real.onStatus = (s) => { if (s.phase) progress.textContent = "· " + s.phase + (s.modelId ? " (" + s.modelId + ", " + s.device + ")" : ""); };
    App.real.onProgress = (p) => { if (p && p.status === "progress" && p.file) progress.textContent = `· downloading ${p.file} ${Math.round(p.progress || 0)}%`; };
    loadBtn.addEventListener("click", async () => {
      loadBtn.disabled = true; setStatus("Loading… first load downloads model files and may take a while.", "notice");
      renderShell(); // reflect "loading" dot
      try {
        await App.real.initialize({ device: App.real.webgpuAvailable() ? "webgpu" : "wasm" });
        render();
      } catch (e) {
        setStatus("Could not load the model: " + e.message + ". The Teaching Model still works; ask your teacher about the laptop demonstration.", "notice warn");
        loadBtn.disabled = false; renderShell();
      }
    });
    box.append(status, loadBtn, progress);
    return box;
  }

  // Model ready — offer the guided prompts.
  setStatus(`Ready — ${App.real.meta.modelId} on ${App.real.meta.device}. This is a small local model, not a frontier model.`, "notice sim");
  box.append(status);

  const promptSel = el("select", { "aria-label": "guided prompt", style: "padding:.45rem;min-width:16rem" },
    cfg.prompts.map((p) => el("option", { value: p }, p.length > 48 ? p.slice(0, 48) + "…" : p)));
  const runBtn = el("button", { class: "btn-real" }, "Predict next token");
  box.append(el("div", { class: "row" }, [promptSel, runBtn]));

  async function run() {
    const text = promptSel.value;
    output.innerHTML = "";
    output.appendChild(el("p", { class: "hint" }, "Running…"));
    try {
      if (cfg.showTokenize) {
        const tk = await App.real.tokenize(text);
        output.innerHTML = "";
        output.append(el("h3", {}, "Real tokenization"), tokenRibbon(tk.tokens));
      } else output.innerHTML = "";
      const pred = await App.real.predictNext(text, 1, 12);
      output.append(
        el("h3", {}, "Native next-token probabilities (T = 1)"),
        candidateList(pred.top.map((t) => ({ token: t.visible, p: t.nativeP })), { mode: "real", otherMass: pred.otherMass }),
        el("p", { class: "hint" }, `Top 12 of ${pred.vocab.toLocaleString()} tokens · ${pred.timingMs} ms · the rest is “all other tokens”.`),
        el("div", { class: "notice" }, cfg.note || ""),
      );
    } catch (e) {
      output.innerHTML = "";
      output.append(el("div", { class: "notice warn" }, "Prediction failed: " + e.message));
    }
  }
  runBtn.addEventListener("click", run);
  box.append(output);
  return box;
}

/* ==================================================================== *
 *  OPEN LAB (spec 4.6)
 * ==================================================================== */
function renderOpenLab() {
  const frag = el("div", { class: "stack" });
  frag.appendChild(el("section", { class: "card" }, [
    el("div", { class: "eyebrow" }, "Open Lab"),
    el("h2", {}, "Run the whole loop yourself"),
    el("p", { class: "lead" }, "Type a prompt, predict before you reveal, look at tokens, probabilities, temperature, and step generation."),
  ]));

  const box = el("section", { class: "card stack" });
  const input = el("textarea", { rows: "2", style: "width:100%;padding:.5rem;font:inherit", "aria-label": "your prompt" });
  input.value = App.state.lab.lastSession?.prompt || "The best thing about school is";
  const predWrap = el("div");
  let myGuess = [];
  predWrap.appendChild(predictionCapture([], (w) => { myGuess = w; }));

  const tRange = el("input", { type: "range", min: "0.3", max: "2", step: "0.1", value: "1", "aria-label": "temperature" });
  const tOut = el("output", {}, "1.0");
  tRange.addEventListener("input", () => (tOut.textContent = Number(tRange.value).toFixed(1)));

  const out = el("div", { class: "stack" });
  const runBtn = el("button", { class: "btn-real" }, "Predict next token");
  const stepBtn = el("button", { class: "btn-ghost" }, "Append top token & continue");
  stepBtn.disabled = true;
  let lastTop = null;

  async function ensureModel() {
    if (App.real.ready) return true;
    out.innerHTML = "";
    out.appendChild(el("div", { class: "notice" }, "Loading the Real Browser Model (first time downloads files)…"));
    try { await App.real.initialize({ device: App.real.webgpuAvailable() ? "webgpu" : "wasm" }); renderShell(); return true; }
    catch (e) { out.innerHTML = ""; out.appendChild(el("div", { class: "notice warn" }, "Model unavailable: " + e.message + ". Ask your teacher about the laptop demonstration.")); return false; }
  }

  async function run() {
    if (!(await ensureModel())) return;
    const text = input.value;
    const T = Number(tRange.value);
    out.innerHTML = "";
    out.appendChild(el("p", { class: "hint" }, "Running…"));
    try {
      const tk = await App.real.tokenize(text);
      const pred = await App.real.predictNext(text, T, 12);
      lastTop = pred.top;
      out.innerHTML = "";
      out.append(
        el("h3", {}, "Tokens"), tokenRibbon(tk.tokens),
        el("h3", {}, `Next-token probabilities (T = ${T})`),
        candidateList(pred.top.map((t) => ({ token: t.visible, p: T === 1 ? t.nativeP : t.samplingP })), { mode: "real", otherMass: pred.otherMass }),
        myGuess.length ? el("div", { class: "notice" }, "You guessed: " + myGuess.join(", ")) : null,
        el("p", { class: "hint" }, `${pred.timingMs} ms · top 12 of ${pred.vocab.toLocaleString()} · rest shown as other mass.`),
      );
      stepBtn.disabled = false;
      Store.update((st) => { st.lab.lastSession = { prompt: text, model: App.real.meta?.modelId }; });
    } catch (e) { out.innerHTML = ""; out.append(el("div", { class: "notice warn" }, "Failed: " + e.message)); }
  }
  runBtn.addEventListener("click", run);
  stepBtn.addEventListener("click", () => {
    if (!lastTop) return;
    input.value = input.value + lastTop[0].raw;
    run();
  });

  box.append(
    el("label", {}, "Your prompt"), input,
    el("p", { class: "hint" }, "Before revealing — what do you think comes next?"), predWrap,
    el("div", { class: "slider-row" }, [el("span", {}, "Temperature"), tRange, tOut]),
    el("div", { class: "controls" }, [runBtn, stepBtn]),
    out,
  );
  frag.appendChild(box);
  return frag;
}

/* ==================================================================== *
 *  TEACHER NAVIGATION (spec §3.3) — direct access, reset, no password
 * ==================================================================== */
let _teacherPanel;
function buildTeacherPanel() {
  const panel = el("aside", { class: "teacher-panel", id: "teacher", "aria-label": "Teacher navigation", "data-open": "false" });
  panel.append(el("h3", {}, "Teacher navigation"), el("p", { class: "hint" }, "Jump to any class, step, or checkpoint. No account needed."));

  C.CLASSES.forEach((c) => {
    const det = el("details", {});
    det.append(el("summary", {}, "Class " + c.n + " — " + c.title));
    c.steps.forEach((st) => {
      const current = App.route.view === "class" && App.route.classN === c.n && App.route.stepId === st.id;
      const b = el("button", { class: "step-link" + (current ? " current" : "") },
        st.id + "  " + st.title + (st.checkpoint ? "  ⏸" : ""));
      b.addEventListener("click", () => { closeTeacher(); navigate({ view: "class", classN: c.n, stepId: st.id }); });
      det.appendChild(b);
    });
    panel.appendChild(det);
  });

  panel.append(
    el("hr", {}),
    el("button", { class: "step-link", onclick: () => { closeTeacher(); navigate({ view: "lab" }); } }, "Open Lab"),
    el("hr", {}),
    el("button", { class: "btn-ghost", style: "width:100%;margin-top:.4rem", onclick: () => { if (confirm("Start THIS class fresh? Only this class's saved choices are cleared.")) { Store.resetClass(App.route.classN); render(); } } }, "Start this class fresh"),
    el("button", { class: "btn-ghost", style: "width:100%;margin-top:.4rem;border-color:#d9b0b4;color:#9a2f3a", onclick: () => { if (confirm("Reset ALL progress on this device? This cannot be undone.")) { Store.resetAll(); App.state = Store.getState(); navigate({ view: "home" }); } } }, "Reset all progress"),
    el("button", { class: "btn-ghost", style: "width:100%;margin-top:.8rem", onclick: closeTeacher }, "Close"),
  );
  _teacherPanel = panel;
  return panel;
}
function openTeacher() { _teacherPanel.setAttribute("data-open", "true"); _backdrop.setAttribute("data-open", "true"); }
function closeTeacher() { _teacherPanel.setAttribute("data-open", "false"); _backdrop.setAttribute("data-open", "false"); }

/* ==================================================================== *
 *  INIT
 * ==================================================================== */
function parseHash() {
  const h = location.hash.replace(/^#\//, "");
  if (h.startsWith("class/")) {
    const [, cn, sid] = h.split("/");
    const classN = Number(cn);
    const cls = C.CLASSES.find((c) => c.n === classN);
    if (cls && cls.steps.some((s) => s.id === sid)) return { view: "class", classN, stepId: sid };
  }
  if (h === "lab") return { view: "lab" };
  if (h === "glossary") return { view: "glossary" };
  return null;
}

function init() {
  App.state = Store.load();
  const fromHash = parseHash();
  App.route = fromHash || { view: "home", classN: App.state.currentClass, stepId: App.state.currentStep };
  render();
  window.addEventListener("hashchange", () => {
    const r = parseHash();
    if (r && (r.view !== App.route.view || r.classN !== App.route.classN || r.stepId !== App.route.stepId)) {
      App.route = r; render();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
