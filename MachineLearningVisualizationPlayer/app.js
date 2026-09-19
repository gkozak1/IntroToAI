(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const DATA = window.ML_PLAYER_DATA;

  const STAGES = {
    inception: {
      label: 'Model inception',
      text: 'Randomly initialized connection weights already exist, but hidden and output activations have not yet been calculated.'
    },
    forward: {
      label: 'Forward propagation',
      text: 'Existing parameters are used to calculate hidden activations and output neuron values.'
    },
    result: {
      label: 'Forward result',
      text: "The highest-valued output neuron indicates the model's prediction."
    },
    corrections: {
      label: 'Needed corrections',
      text: 'Error direction and magnitude are calculated for each output neuron.'
    },
    gd: {
      label: 'Gradient Descent',
      text: 'The error curve is used to determine the desired correction.'
    },
    local: {
      label: 'Local adjustment',
      text: "Representative parameter updates are highlighted: the focused output's incoming weights change, and example earlier-layer weights show that learning reaches the whole network."
    },
    backprop: {
      label: 'Backpropagation',
      text: 'Backpropagation computes gradients throughout the network; connection weights across both layers settle into their updated strengths before the next pass.'
    },
    complete: {
      label: 'Training complete',
      text: 'The output pattern has reached the target for this example, so no further correction is needed.'
    }
  };

  const PASS_STAGES = ['forward', 'result', 'corrections', 'gd', 'local', 'backprop'];
  const INITIAL_PASS_STAGES = ['inception', ...PASS_STAGES];
  const FINAL_STAGES = ['forward', 'result', 'complete'];

  const C = {
    ink: '#223142',
    muted: '#8794a3',
    light: '#dce5ee',
    veryLight: '#eef3f7',
    bluePulse: '#69a9f1',
    inputRed: '#e46b6b',
    inputOrange: '#f0a63a',
    inputGreen: '#46c86d',
    outputRed: '#e46b6b',
    outputOrange: '#f0a63a',
    outputGreen: '#46c86d',
    outputRedFill: '#f4b2b2',
    outputOrangeFill: '#f7d39a',
    outputGreenFill: '#b9f0c6',
    downLarge: '#d9534f',
    downMedium: '#f08a24',
    downSmall: '#dbd600',
    upLarge: '#1f9d55',
    upMedium: '#48b96d',
    upSmall: '#86d8a0',
  };

  const layout = {
    image: { x: 46, y: 236, w: 260, h: 260 },
    inputX: 468,
    hiddenX: 748,
    outputX: 1026,
    barX: 1084,
    barW: 112,
    arrowX: 1222,
    topY: 146,
    bottomY: 570,
    radius: 16,
    headerY: 68
  };

  const state = {
    example: '4',
    pass: 0,
    stage: 'inception',
    speed: 1,
    running: false,
    paused: false,
    runToken: 0,
    outputValues: null,
    learnedStyleIndex: 0,
    hiddenActivation: 0,
    outputReveal: 0,
    focus: false,
    focusAmount: 0,
    showArrows: false,
    gdVisible: false,
    gdProgress: 0,
    localProgress: 0,
    localConnectionsRevealed: false,
    backpropProgress: 0,
    backpropPhase: 0,
  };

  const dom = {
    svg: document.getElementById('viz'),
    statusPass: document.getElementById('statusPass'),
    statusStage: document.getElementById('statusStage'),
    statusDescription: document.getElementById('statusDescription'),
    speedSlider: document.getElementById('speedSlider'),
    speedLabel: document.getElementById('speedLabel'),
    digitSelect: document.getElementById('digitSelect'),
    randomizeBtn: document.getElementById('randomizeBtn'),
    passButtons: document.getElementById('passButtons'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    forwardBtn: document.getElementById('forwardBtn'),
    learningBtn: document.getElementById('learningBtn'),
    backBtn: document.getElementById('backBtn'),
    passBtn: document.getElementById('passBtn'),
    trainingBtn: document.getElementById('trainingBtn'),
  };

  const scene = {
    groups: {},
    inputHiddenLines: [],
    hiddenOutputLines: [],
    hiddenNodes: [],
    outputNodes: [],
    outputLabels: [],
    outputValues: [],
    outputBars: [],
    arrowGroups: [],
    inputNodes: [],
    pulseGroup: null,
    gd: {},
  };

  function sEl(name, attrs = {}, parent = dom.svg) {
    const el = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    }
    if (parent) parent.appendChild(el);
    return el;
  }

  function setAttrs(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function ease(t) { return t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2; }

  function colorToRgb(color) {
    if (color.startsWith('#')) {
      const m = color.replace('#','');
      return [parseInt(m.slice(0,2),16), parseInt(m.slice(2,4),16), parseInt(m.slice(4,6),16)];
    }
    const match = color.match(/rgba?\(([^)]+)\)/i);
    if (match) return match[1].split(',').slice(0,3).map(v => Number.parseFloat(v.trim()));
    return [0,0,0];
  }
  function mixColor(a, b, t) {
    const A = colorToRgb(a), B = colorToRgb(b);
    const v = A.map((x,i) => Math.round(lerp(x,B[i],t)));
    return `rgb(${v[0]},${v[1]},${v[2]})`;
  }

  function inputColor(count) {
    // Use the same 0–35 input-count scale as normalizedInputs().
    return outputColor(clamp01(count/35)*100);
  }
  function inputWidth(count) {
    return count >= 17 ? 3.2 : count >= 9 ? 2.2 : 1.25;
  }
  // Five visual strength bands used throughout the trainable parts of the network.
  // 0–19 red, 20–39 red-orange, 40–59 yellow, 60–79 yellow-green, 80–100 green.
  // Connection palettes follow the supplied references; widths are configured separately for each layer.
  const BANDS = [
    {max:19,  color:'#ff7171', connectionColor:'#ff7171', fill:'#ff7171', width:0.25, muted:'#ffb8b8', mutedFill:'#ffb8b8', mutedWidth:0.2},
    {max:39,  color:'#e58d2e', connectionColor:'#ffc000', fill:'#f5c99b', width:0.5, muted:'#ffc000', mutedFill:'#eed8c4', mutedWidth:0.4},
    {max:59,  color:'#dbd600', connectionColor:'#dbd600', fill:'#dbd600', width:0.75, muted:'#f1ef99', mutedFill:'#f1ef99', mutedWidth:0.6},
    {max:79,  color:'#8dbd3f', connectionColor:'#92d050', fill:'#d6e8a7', width:1.0, muted:'#91cf50', mutedFill:'#dbe5c8', mutedWidth:0.8},
    {max:100, color:'#35a85d', connectionColor:'#00b050', fill:'#b5e3c3', width:1.25, muted:'#00b150', mutedFill:'#cde1d2', mutedWidth:1.0},
  ];

  function bandFor(v) {
    const n=Math.max(0,Math.min(100,Number(v)||0));
    return BANDS.find(b => n <= b.max) || BANDS[BANDS.length-1];
  }
  function outputColor(v) { return bandFor(v).connectionColor; }
  function outputFill(v) { return outputColor(v); }
  function outputWidth(v) { return bandFor(v).width; }

  function strengthColor01(level) { return outputColor(clamp01(level)*100); }
  function mutedStrengthColor01(level) { return bandFor(clamp01(level)*100).muted; }
  function mutedStrengthWidth01(level) { return bandFor(clamp01(level)*100).mutedWidth; }
  function hiddenStrengthFill(level) { return bandFor(clamp01(level)*100).mutedFill; }

  const modelBank = {};

  function randBetween(min, max) { return min + Math.random() * (max - min); }
  function sigmoid(z) { const q=Math.max(-8,Math.min(8,z)); return 1/(1+Math.exp(-q)); }
  function cloneMatrix(m) { return m.map(row => row.slice()); }

  function normalizedInputs(exampleKey) {
    // 35 is the largest dark-pixel sector count in this ten-digit example set.
    // It keeps the visible hidden activations spread out without pretending these are raw MNIST intensities.
    return DATA.examples[exampleKey].counts.map(v => clamp01(v/35));
  }

  function hiddenFromWeights(exampleKey, wIH, bH) {
    const x=normalizedInputs(exampleKey);
    return Array.from({length:10}, (_,h) => {
      let z=bH[h];
      for (let i=0;i<8;i++) z += x[i]*wIH[i][h];
      return sigmoid(z);
    });
  }

  function generateModel(exampleKey) {
    const target=Number(exampleKey);
    const initialOutputs=Array.from({length:10}, () => Math.floor(Math.random()*101));
    const passes=Array.from({length:5}, (_,p) => {
      const t=p/4;
      return initialOutputs.map((v,k) => Math.round(lerp(v, k===target?100:0, t)));
    });

    let wIH=Array.from({length:8}, () => Array.from({length:10}, () => randBetween(-1.5,1.5)));
    let bH=Array.from({length:10}, () => randBetween(-.15,.15));
    let wHO=Array.from({length:10}, () => Array.from({length:10}, () => randBetween(-1,1)));
    const x=normalizedInputs(exampleKey);
    const weightSnapshots=[];
    const hoWeightSnapshots=[];
    const hiddenSnapshots=[];

    for (let p=0;p<5;p++) {
      const h=hiddenFromWeights(exampleKey,wIH,bH);
      weightSnapshots.push(cloneMatrix(wIH));
      hoWeightSnapshots.push(cloneMatrix(wHO));
      hiddenSnapshots.push(h.slice());
      if (p===4) break;

      const error=passes[p].map((v,k) => (k===target?1:0)-v/100);
      const deltaH=Array.from({length:10}, (_,hIdx) => {
        let backSignal=0;
        for (let k=0;k<10;k++) backSignal += wHO[hIdx][k]*error[k];
        backSignal /= 3;
        return h[hIdx]*(1-h[hIdx])*backSignal;
      });

      // A simplified backprop update: enough to make the hidden representation
      // causally evolve without claiming this controlled five-pass demo is a full trainer.
      for (let i=0;i<8;i++) for (let hIdx=0;hIdx<10;hIdx++) wIH[i][hIdx] += 2.5*x[i]*deltaH[hIdx];
      for (let hIdx=0;hIdx<10;hIdx++) bH[hIdx] += .65*deltaH[hIdx];
      for (let hIdx=0;hIdx<10;hIdx++) for (let k=0;k<10;k++) wHO[hIdx][k] += .30*h[hIdx]*error[k];
    }

    return {initialOutputs,passes,weightSnapshots,hoWeightSnapshots,hiddenSnapshots};
  }

  function ensureModel(exampleKey=state.example) {
    if (!modelBank[exampleKey]) modelBank[exampleKey]=generateModel(exampleKey);
    return modelBank[exampleKey];
  }

  function randomizeModel(exampleKey=state.example) {
    modelBank[exampleKey]=generateModel(exampleKey);
    return modelBank[exampleKey];
  }

  function lineStyleForLearnedIndex(exampleKey, index) {
    const model=ensureModel(exampleKey);
    const snap=model.weightSnapshots[Math.max(0,Math.min(4,index))];
    return {
      style(i,h) {
        const w=snap[i][h];
        // Visualize pathway strength (magnitude), not sign. This matches the class convention.
        const strength=clamp01(Math.abs(w)/2.2);
        return {
          color: mutedStrengthColor01(strength),
          width: mutedStrengthWidth01(strength),
          opacity: .92
        };
      }
    };
  }


  function outputBundleStyleForValue(v) {
    return {
      color: bandFor(v).connectionColor,
      width: outputWidth(v),
      opacity: .90
    };
  }

  function outputLineStyleForIndex(exampleKey, index) {
    // Pedagogical bundle encoding: all ten connections feeding an output neuron use
    // that neuron's current output-strength band. This deliberately makes the
    // pathway-strength ↔ output-value relationship visually explicit.
    const values=ensureModel(exampleKey).passes[Math.max(0,Math.min(4,index))];
    return {
      style(h,o) {
        return outputBundleStyleForValue(values[o]);
      }
    };
  }

  function representativeInputHiddenUpdates(exampleKey, fromIndex, toIndex) {
    const model=ensureModel(exampleKey);
    const a=model.weightSnapshots[Math.max(0,Math.min(4,fromIndex))];
    const b=model.weightSnapshots[Math.max(0,Math.min(4,toIndex))];
    // Pick the largest visible change feeding each hidden neuron. These are examples,
    // not the only weights that update; the full layer settles during backpropagation.
    return Array.from({length:10}, (_,h) => {
      let bestI=0, bestD=-1;
      for (let i=0;i<8;i++) {
        const d=Math.abs(b[i][h]-a[i][h]);
        if (d>bestD) { bestD=d; bestI=i; }
      }
      return {i:bestI,h};
    });
  }

  function positions(count, top = layout.topY, bottom = layout.bottomY) {
    if (count === 1) return [(top+bottom)/2];
    return Array.from({length: count}, (_, i) => top + (bottom-top) * i/(count-1));
  }

  const inputY = positions(8);
  const hiddenY = positions(10);
  const outputY = positions(10);

  function buildScene() {
    clear(dom.svg);
    dom.svg.setAttribute('shape-rendering', 'geometricPrecision');

    scene.groups.headers = sEl('g');
    scene.groups.image = sEl('g');
    scene.groups.inputMap = sEl('g');
    scene.groups.inputHidden = sEl('g');
    scene.groups.hiddenNodes = sEl('g');
    scene.groups.hiddenOutput = sEl('g');
    scene.groups.outputs = sEl('g');
    scene.groups.arrows = sEl('g');
    scene.groups.gd = sEl('g');
    scene.pulseGroup = sEl('g');

    const headerStyle = { 'font-family':'Inter, system-ui, sans-serif', 'font-size':26, 'font-weight':800, fill:C.ink, 'text-anchor':'middle' };
    const heads = [
      [layout.image.x + layout.image.w/2, 'Input image', '(2 × 4 segments)'],
      [layout.inputX, 'Input layer', '(8 neurons)'],
      [layout.hiddenX, 'Hidden layer', '(10 neurons)'],
      [layout.outputX + 60, 'Output layer', '(10 neurons)']
    ];
    for (const [x,a,b] of heads) {
      sEl('text', {...headerStyle, x, y:50, text:a}, scene.groups.headers);
      sEl('text', {...headerStyle, x, y:80, 'font-size':22, text:b}, scene.groups.headers);
    }

    buildDigitImage();
    buildNetworkGeometry();
    buildGDPanel();
    renderStatic();
  }

  function buildDigitImage() {
    clear(scene.groups.image);
    clear(scene.groups.inputMap);
    const ex = DATA.examples[state.example];
    const {x,y,w,h} = layout.image;
    const pixelW = w/28, pixelH = h/28;

    sEl('rect', {x, y, width:w, height:h, fill:'#fff', stroke:C.ink, 'stroke-width':2.5}, scene.groups.image);
    const pixels = sEl('g', {'shape-rendering':'crispEdges'}, scene.groups.image);
    for (let r=0;r<28;r++) {
      for (let c=0;c<28;c++) {
        const v = ex.full[r][c];
        if (v <= 5) continue;
        const g = 255 - Math.max(0, Math.min(255, v));
        const fill = `rgb(${g},${g},${g})`;
        sEl('rect', {x:x+c*pixelW, y:y+r*pixelH, width:pixelW+.35, height:pixelH+.35, fill}, pixels);
      }
    }

    const cellW = w/2, cellH = h/4;
    sEl('line', {x1:x+cellW, y1:y, x2:x+cellW, y2:y+h, stroke:C.ink, 'stroke-width':2.2}, scene.groups.image);
    for (let r=1;r<4;r++) sEl('line', {x1:x, y1:y+r*cellH, x2:x+w, y2:y+r*cellH, stroke:C.ink, 'stroke-width':2.2}, scene.groups.image);

    for (let i=0;i<8;i++) {
      const row = Math.floor(i/2), col = i%2;
      const x0 = x + col*cellW, y0 = y + row*cellH;
      sEl('text', {x:x0+10, y:y0+18, fill:C.ink, 'font-size':15, 'font-weight':800, text:String(i+1)}, scene.groups.image);
      const count = ex.counts[i];
      sEl('text', {x:x0+cellW-10, y:y0+cellH-8, fill:inputColor(count), 'font-size':15, 'font-weight':900, 'text-anchor':'end', text:String(count)}, scene.groups.image);

      const startX = x0 + cellW - 16;
      const startY = y0 + cellH - 25;
      const endX = layout.inputX - layout.radius - 12;
      const endY = inputY[i];
      sEl('line', {
        x1:startX, y1:startY, x2:endX, y2:endY,
        stroke:inputColor(count), 'stroke-width':inputWidth(count), 'stroke-opacity':.88,
        'vector-effect':'non-scaling-stroke'
      }, scene.groups.inputMap);

      const g = sEl('g', {}, scene.groups.inputMap);
      const circle = sEl('circle', {cx:layout.inputX, cy:endY, r:layout.radius, fill:inputColor(count), stroke:C.ink, 'stroke-width':2}, g);
      const t = sEl('text', {x:layout.inputX, y:endY+5, 'text-anchor':'middle', fill:C.ink, 'font-size':14, 'font-weight':900, text:String(i+1)}, g);
      scene.inputNodes[i] = {g,circle,t};
    }
  }

  function buildNetworkGeometry() {
    clear(scene.groups.inputHidden);
    clear(scene.groups.hiddenNodes);
    clear(scene.groups.hiddenOutput);
    clear(scene.groups.outputs);
    clear(scene.groups.arrows);
    scene.inputHiddenLines = [];
    scene.hiddenOutputLines = [];
    scene.hiddenNodes = [];
    scene.outputNodes = [];
    scene.outputLabels = [];
    scene.outputValues = [];
    scene.outputBars = [];
    scene.arrowGroups = [];

    for (let i=0;i<8;i++) {
      for (let h=0;h<10;h++) {
        const line = sEl('line', {
          x1:layout.inputX+layout.radius, y1:inputY[i], x2:layout.hiddenX-layout.radius, y2:hiddenY[h],
          stroke:C.light, 'stroke-width':.75, 'stroke-opacity':.7, 'vector-effect':'non-scaling-stroke'
        }, scene.groups.inputHidden);
        scene.inputHiddenLines.push({line,i,h});
      }
    }

    for (let h=0;h<10;h++) {
      const circle = sEl('circle', {cx:layout.hiddenX, cy:hiddenY[h], r:layout.radius, fill:'#eef2f6', stroke:C.ink, 'stroke-width':2}, scene.groups.hiddenNodes);
      const text = sEl('text', {x:layout.hiddenX, y:hiddenY[h]+5, 'text-anchor':'middle', fill:C.ink, 'font-size':14, 'font-weight':900, text:String(h+1)}, scene.groups.hiddenNodes);
      scene.hiddenNodes.push({circle,text});
    }

    for (let h=0;h<10;h++) {
      for (let o=0;o<10;o++) {
        const line = sEl('line', {
          x1:layout.hiddenX+layout.radius, y1:hiddenY[h], x2:layout.outputX-layout.radius, y2:outputY[o],
          stroke:C.light, 'stroke-width':1.0, 'stroke-opacity':.22, 'vector-effect':'non-scaling-stroke'
        }, scene.groups.hiddenOutput);
        scene.hiddenOutputLines.push({line,h,o});
      }
    }

    for (let o=0;o<10;o++) {
      const y = outputY[o];
      const label = sEl('text', {x:layout.outputX-40, y:y+6, 'text-anchor':'end', fill:C.ink, 'font-size':18, 'font-weight':900, text:String(o)}, scene.groups.outputs);
      const circle = sEl('circle', {cx:layout.outputX, cy:y, r:layout.radius, fill:'#eef2f6', stroke:C.ink, 'stroke-width':2}, scene.groups.outputs);
      const value = sEl('text', {x:layout.barX-12, y:y+6, 'text-anchor':'end', fill:C.ink, 'font-size':15, 'font-weight':900, text:''}, scene.groups.outputs);
      sEl('rect', {x:layout.barX, y:y-8, width:layout.barW, height:16, rx:1, fill:'#edf2f6'}, scene.groups.outputs);
      const bar = sEl('rect', {x:layout.barX, y:y-8, width:0, height:16, rx:1, fill:C.outputRed}, scene.groups.outputs);
      const arrow = sEl('g', {opacity:0}, scene.groups.arrows);
      const shaft = sEl('line', {x1:layout.arrowX, y1:y, x2:layout.arrowX, y2:y, stroke:C.downSmall, 'stroke-width':1.5, 'stroke-linecap':'round'}, arrow);
      const head = sEl('path', {d:'', fill:C.downSmall}, arrow);
      scene.outputNodes[o] = circle;
      scene.outputLabels[o] = label;
      scene.outputValues[o] = value;
      scene.outputBars[o] = bar;
      scene.arrowGroups[o] = {g:arrow, shaft, head};
    }
  }

  function gdPanelForTarget(target) {
    const w=250, h=194, x=972;
    const ty=outputY[target];
    let y;
    if (target>=4) y=ty-h-(target>=7?38:20);
    else y=ty+24;
    y=Math.max(105,Math.min(layout.bottomY-h-20,y));
    return {x,y,w,h};
  }

  function buildGDPanel() {
    clear(scene.groups.gd);
    const p = gdPanelForTarget(targetIndex());
    const g = scene.groups.gd;
    g.setAttribute('opacity', 0);
    const panel = sEl('rect', {x:p.x, y:p.y, width:p.w, height:p.h, rx:10, fill:'#fff', 'fill-opacity':.96, stroke:'#d5dee7', 'stroke-width':2}, g);
    const gx = p.x+28, gy=p.y+18, gw=p.w-48, gh=p.h-36;
    const grid = sEl('g', {}, g);
    for (let i=0;i<6;i++) sEl('line', {x1:gx+i*gw/5, y1:gy, x2:gx+i*gw/5, y2:gy+gh, stroke:'#e4eaf0', 'stroke-width':1}, grid);
    for (let i=0;i<5;i++) sEl('line', {x1:gx, y1:gy+i*gh/4, x2:gx+gw, y2:gy+i*gh/4, stroke:'#e4eaf0', 'stroke-width':1}, grid);
    sEl('line', {x1:gx, y1:gy, x2:gx, y2:gy+gh, stroke:'#7f8b97', 'stroke-width':1.5}, g);
    sEl('line', {x1:gx, y1:gy+gh, x2:gx+gw, y2:gy+gh, stroke:'#7f8b97', 'stroke-width':1.5}, g);

    let d='';
    for (let i=0;i<=100;i++) {
      const u=i/100, x=gx+u*gw, yy=(1-u)*(1-u), y=gy+(1-yy)*gh*.92+gh*.04;
      d += `${i===0?'M':'L'}${x.toFixed(2)},${y.toFixed(2)} `;
    }
    const curve = sEl('path', {d, fill:'none', stroke:'#2f5f97', 'stroke-width':3, 'stroke-linecap':'round'}, g);
    const point = sEl('circle', {cx:gx, cy:gy, r:7, fill:'#a5643a', stroke:'#fff', 'stroke-width':2, opacity:0}, g);
    const tangent = sEl('line', {x1:gx, y1:gy, x2:gx, y2:gy, stroke:'#a5643a', 'stroke-width':3, 'stroke-dasharray':'8 6', opacity:0}, g);
    const len = curve.getTotalLength ? curve.getTotalLength() : 400;
    curve.setAttribute('stroke-dasharray', len);
    curve.setAttribute('stroke-dashoffset', len);
    scene.gd = {g,panel,curve,point,tangent,gx,gy,gw,gh,len};
  }

  function hiddenLevelsForPass(pass=state.pass) {
    // Visual summary of incoming connection magnitudes, not a computed activation.
    const weights=ensureModel(state.example).weightSnapshots[Math.max(0,Math.min(4,pass))];
    return Array.from({length:10}, (_,h) =>
      weights.reduce((sum,row) => sum+clamp01(Math.abs(row[h])/2.2),0)/weights.length);
  }

  function hiddenActivationFill(level, reveal=1) {
    const neutral='#eef2f6';
    return mixColor(neutral, hiddenStrengthFill(level), clamp01(reveal));
  }

  function currentValues() {
    return ensureModel(state.example).passes[state.pass].slice();
  }

  function targetIndex() { return Number(state.example); }

  function effectiveValues() {
    const vals = currentValues();
    if (state.localProgress > 0 && state.pass < 4) {
      const next = ensureModel(state.example).passes[state.pass+1];
      const t = targetIndex();
      vals[t] = Math.round(lerp(vals[t], next[t], state.localProgress));
    }
    return vals;
  }

  function arrowVisual(v, isTarget) {
    const current = v/100;
    const target = isTarget ? 1 : 0;
    const diff = Math.abs(target-current);
    if (diff < .005) return null;
    const up = target > current;
    const band = diff >= .67 ? 'large' : diff >= .34 ? 'medium' : 'small';
    const color = up
      ? (band==='large'?C.upLarge:band==='medium'?C.upMedium:C.upSmall)
      : (band==='large'?C.downLarge:band==='medium'?C.downMedium:C.downSmall);
    // Continuous magnitude encoding, with color family reinforcing the three bands.
    const length = 12 + diff*48;
    const width = 1.2 + diff*3.2;
    return {up, diff, color, length, width, head:7};
  }

  function setArrow(o, v, visible, gray = false) {
    const a = scene.arrowGroups[o];
    if (!visible) { a.g.setAttribute('opacity', 0); return; }
    const style = arrowVisual(v, o===targetIndex());
    if (!style) { a.g.setAttribute('opacity', 0); return; }
    const y = outputY[o];
    const dir = style.up ? -1 : 1;
    const color = gray ? '#cfd6de' : style.color;
    const half = style.length/2;
    const y1 = y - dir*half;
    const y2 = y + dir*half;
    setAttrs(a.shaft, {x1:layout.arrowX, y1, x2:layout.arrowX, y2, stroke:color, 'stroke-width':style.width});
    const tipY = y2;
    const baseY = y2 - dir*style.head;
    const d = `M ${layout.arrowX} ${tipY} L ${layout.arrowX-style.head*.62} ${baseY} L ${layout.arrowX+style.head*.62} ${baseY} Z`;
    setAttrs(a.head, {d, fill:color});
    a.g.setAttribute('opacity', 1);
  }

  function renderStatic() {
    const values = effectiveValues();
    const ex = DATA.examples[state.example];
    const focus = state.focus;
    const focusAmt = state.focusAmount ?? (focus ? 1 : 0);
    const learned = lineStyleForLearnedIndex(state.example, state.learnedStyleIndex);
    const hLevels = hiddenLevelsForPass();

    for (let i=0;i<scene.inputNodes.length;i++) {
      const count = ex.counts[i];
      const baseFill = inputColor(count);
      const fill = baseFill;
      const stroke = C.ink;
      setAttrs(scene.inputNodes[i].circle,{fill,stroke});
      scene.inputNodes[i].t.setAttribute('fill', C.ink);
    }

    for (const item of scene.inputHiddenLines) {
      const ls=learned.style(item.i,item.h);
      let color=ls.color, width=ls.width, opacity=ls.opacity;
      if (focusAmt>0) { color = mixColor(color, '#f0f3f6', .45*focusAmt); opacity *= (1-.10*focusAmt); }
      setAttrs(item.line, {stroke:color, 'stroke-width':width, 'stroke-opacity':opacity});
    }

    for (let h=0;h<10;h++) {
      // Hidden activations begin neutral and resolve into the same red/yellow/green
      // strength language as the pathways when the forward signal reaches them.
      let fill = hiddenActivationFill(hLevels[h], state.hiddenActivation);
      let stroke = C.ink;
      let text = C.ink;
      if (focusAmt>0) { fill = mixColor(fill, '#f1f4f7', .48*focusAmt); stroke=mixColor(C.ink,C.muted,focusAmt); text=mixColor(C.ink,C.muted,focusAmt); }
      setAttrs(scene.hiddenNodes[h].circle, {fill, stroke});
      scene.hiddenNodes[h].text.setAttribute('fill', text);
    }

    const hoStyle = outputLineStyleForIndex(state.example, state.learnedStyleIndex);
    for (const item of scene.hiddenOutputLines) {
      const ls=outputBundleStyleForValue(values[item.o]);
      let color=ls.color, width=ls.width, opacity=ls.opacity;
      if (focusAmt>0 && item.o !== targetIndex()) { color=mixColor(color,'#eef2f6',focusAmt); width=lerp(width,.9,focusAmt); opacity=lerp(opacity,.72,focusAmt); }
      setAttrs(item.line, {stroke:color, 'stroke-width':width, 'stroke-opacity':opacity});
    }

    const outputsVisible = state.outputReveal > .001 && state.stage !== 'inception';
    for (let o=0;o<10;o++) {
      const v = values[o];
      const selected = o===targetIndex();
      if (!outputsVisible) {
        setAttrs(scene.outputNodes[o], {fill:'#eef2f6', stroke:C.ink});
        scene.outputLabels[o].setAttribute('fill', C.ink);
        scene.outputValues[o].textContent='';
        scene.outputValues[o].setAttribute('fill', C.muted);
        scene.outputBars[o].setAttribute('fill','#dfe6ed');
        scene.outputBars[o].setAttribute('width',0);
        scene.arrowGroups[o].g.setAttribute('opacity',0);
        continue;
      }
      if (focusAmt>0 && !selected) {
        setAttrs(scene.outputNodes[o], {fill:mixColor(outputFill(v),'#eef2f6',focusAmt), stroke:mixColor(C.ink,C.muted,focusAmt)});
        const grayText=mixColor(C.ink,'#a3adb8',focusAmt);
        scene.outputLabels[o].setAttribute('fill', grayText);
        scene.outputValues[o].setAttribute('fill', grayText);
        scene.outputBars[o].setAttribute('fill', mixColor(outputColor(v),'#d8dee5',focusAmt));
      } else {
        setAttrs(scene.outputNodes[o], {fill:outputFill(v), stroke:C.ink});
        scene.outputLabels[o].setAttribute('fill', C.ink);
        scene.outputValues[o].setAttribute('fill', C.ink);
        scene.outputBars[o].setAttribute('fill', outputColor(v));
      }
      scene.outputValues[o].textContent = String(v);
      scene.outputBars[o].setAttribute('width', Math.max(0, layout.barW*v/100*state.outputReveal));
      setArrow(o, v, state.showArrows, focusAmt>.5 && !selected);
    }

    if (state.stage==='gd' || state.stage==='local') {
      for (const item of [...scene.inputHiddenLines,...scene.hiddenOutputLines])
        setAttrs(item.line,{stroke:'#dce5ee','stroke-opacity':.72});
      for (const node of scene.hiddenNodes) {
        setAttrs(node.circle,{fill:'#eef2f6',stroke:C.muted});
        node.text.setAttribute('fill',C.muted);
      }
    }
    if (state.stage==='local' && state.pass<4 && state.localConnectionsRevealed)
      applyLocalAdjustmentVisual();

    scene.groups.gd.setAttribute('opacity', state.gdVisible ? 1 : 0);
    if (state.gdVisible) updateGD(state.gdProgress);
    updateStatus();
    updateControls();
  }


  function applyLocalAdjustmentVisual() {
    // Keep the focused bundle matched to the displayed output during its adjustment.
    const v=effectiveValues()[targetIndex()];
    for (const item of scene.hiddenOutputLines) {
      if (item.o!==targetIndex()) continue;
      const ls=outputBundleStyleForValue(v);
      setAttrs(item.line,{stroke:ls.color,'stroke-width':ls.width,'stroke-opacity':ls.opacity});
    }
  }

  function growConnections(items, reverseSegments, progress) {
    const k=ease(progress);
    items.forEach((item,i) => {
      const s=reverseSegments[i];
      setAttrs(item.line,{x1:lerp(s.x1,s.x2,k),y1:lerp(s.y1,s.y2,k),x2:s.x1,y2:s.y1});
    });
  }

  function restoreConnections() {
    growConnections(scene.hiddenOutputLines,segments.outputHidden,1);
    growConnections(scene.inputHiddenLines,segments.hiddenInput,1);
  }

  function updateGD(progress) {
    const gd = scene.gd;
    const p = clamp01(progress);
    // Discover the blue curve and its local tangent together. The tangent rides
    // near the leading edge of the curve so slope and error shape emerge as one idea.
    const discoverP = ease(p);
    gd.curve.setAttribute('stroke-dashoffset', gd.len*(1-discoverP));
    const overlayOpacity = clamp01(p/.10);
    gd.point.setAttribute('opacity', overlayOpacity);
    gd.tangent.setAttribute('opacity', overlayOpacity);
    const u = lerp(.03,.90,discoverP);
    const x = gd.gx + u*gd.gw;
    const yy = (1-u)*(1-u);
    const y = gd.gy + (1-yy)*gd.gh*.92 + gd.gh*.04;
    setAttrs(gd.point, {cx:x, cy:y});
    const slope = 2*(1-u) * (gd.gh*.92/gd.gw);
    const half = gd.gw*.16;
    const x1=x-half, x2=x+half;
    const y1=y - slope*half, y2=y + slope*half;
    setAttrs(gd.tangent, {x1,y1,x2,y2});
  }

  function clearPulses() { clear(scene.pulseGroup); }

  function drawPulses(segments, progress, colorFn, radiusFn) {
    clearPulses();
    for (let i=0;i<segments.length;i++) {
      const s=segments[i];
      const x=lerp(s.x1,s.x2,progress), y=lerp(s.y1,s.y2,progress);
      sEl('circle', {cx:x, cy:y, r:radiusFn(i), fill:colorFn(i), 'fill-opacity':.96}, scene.pulseGroup);
    }
  }

  const segments = {
    inputHidden: [],
    hiddenOutput: [],
    outputHidden: [],
    hiddenInput: []
  };

  function rebuildSegments() {
    segments.inputHidden = scene.inputHiddenLines.map(x => ({x1:layout.inputX+layout.radius,y1:inputY[x.i],x2:layout.hiddenX-layout.radius,y2:hiddenY[x.h],i:x.i,h:x.h}));
    segments.hiddenOutput = scene.hiddenOutputLines.map(x => ({x1:layout.hiddenX+layout.radius,y1:hiddenY[x.h],x2:layout.outputX-layout.radius,y2:outputY[x.o],h:x.h,o:x.o}));
    segments.outputHidden = scene.hiddenOutputLines.map(x => ({x1:layout.outputX-layout.radius,y1:outputY[x.o],x2:layout.hiddenX+layout.radius,y2:hiddenY[x.h],h:x.h,o:x.o}));
    segments.hiddenInput = scene.inputHiddenLines.map(x => ({x1:layout.hiddenX-layout.radius,y1:hiddenY[x.h],x2:layout.inputX+layout.radius,y2:inputY[x.i],i:x.i,h:x.h}));
  }

  function updateStatus(stageOverride = null) {
    const stage = stageOverride || state.stage;
    dom.statusPass.textContent = `Pass ${state.pass+1} of 5`;
    dom.statusStage.textContent = STAGES[stage].label;
    let text=STAGES[stage].text;
    if (stage==='inception') {
      text='Random connection weights already exist. Only the input activations are known; hidden and output activations will be calculated by the first forward pass.';
    } else if (stage==='forward' && state.pass>0) {
      text='Updated connection weights are used again; the next forward pass produces a changed hidden-layer pattern and new output values.';
    } else if (stage==='result') {
      const vals=currentValues();
      let pred=0;
      for (let i=1;i<10;i++) if (vals[i]>vals[pred]) pred=i;
      text=`The highest-valued output neuron indicates the model's prediction: ${pred} (${pred===targetIndex()?'correct':'incorrect'}).`;
    } else if (stage==='backprop') {
      text='Backpropagation computes gradients throughout the network. The remaining connection weights across both layers now settle into their updated strengths.';
    }
    dom.statusDescription.textContent = text;
  }

  function updateButtons() {
    dom.digitSelect.value=state.example;
    [...dom.passButtons.querySelectorAll('button')].forEach(b => b.classList.toggle('active', Number(b.dataset.pass)===state.pass));
  }

  function updateControls() {
    const finalPass = state.pass===4;
    dom.prevBtn.disabled = state.running || (state.pass===0 && state.stage==='inception');
    dom.nextBtn.disabled = state.running || state.stage==='complete';
    dom.pauseBtn.disabled = !state.running;
    dom.pauseBtn.textContent = state.paused ? '▶' : '⏸';
    dom.pauseBtn.title = state.paused ? 'Resume' : 'Pause';
    dom.pauseBtn.setAttribute('aria-label', state.paused ? 'Resume' : 'Pause');
    dom.learningBtn.disabled = state.running || finalPass;
    dom.backBtn.disabled = state.running || finalPass;
    dom.forwardBtn.disabled = state.running;
    dom.passBtn.disabled = state.running;
    dom.trainingBtn.disabled = state.running;
    dom.digitSelect.disabled = state.running;
    dom.randomizeBtn.disabled = state.running;
    updateButtons();
  }

  function cancelRun() {
    state.runToken++;
    state.running = false;
    state.paused = false;
    clearPulses();
    restoreConnections();
    updateControls();
  }

  function animate(baseMs, frameFn, token) {
    return new Promise(resolve => {
      let last=null, elapsed=0;
      function frame(ts) {
        if (token !== state.runToken) return resolve(false);
        if (last == null) last = ts;
        const delta = Math.min(50, ts-last);
        last = ts;
        if (!state.paused) elapsed += delta*state.speed;
        const p = clamp01(elapsed/baseMs);
        frameFn(p);
        if (p >= 1) return resolve(true);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  function hold(baseMs, token) { return animate(baseMs, () => {}, token); }

  async function animateForward(token) {
    state.stage='forward'; state.focus=false; state.focusAmount=0; state.showArrows=false; state.gdVisible=false; state.localProgress=0; state.hiddenActivation=0; state.outputReveal=0;
    restoreConnections();
    renderStatic(); updateStatus('forward');
    if (!await animate(1350, p => {
      drawPulses(segments.inputHidden, p,
        i => scene.inputHiddenLines[i].line.getAttribute('stroke'), () => 3.5);
    }, token)) return false;
    clearPulses();
    if (!await hold(100,token)) return false;
    state.hiddenActivation=1;
    renderStatic();
    if (!await hold(100,token)) return false;
    const ho=outputLineStyleForIndex(state.example,state.learnedStyleIndex);
    if (!await animate(1350, p => {
      drawPulses(segments.hiddenOutput, p,
        i => scene.hiddenOutputLines[i].line.getAttribute('stroke'),
        i => { const seg=segments.hiddenOutput[i]; return 2.0 + ho.style(seg.h,seg.o).width*.45; });
    }, token)) return false;
    clearPulses();
    if (!await hold(100,token)) return false;
    if (!await animate(1100,p => {
      state.outputReveal=ease(p);
      renderStatic();
    },token)) return false;
    state.outputReveal=1;
    state.stage='result';
    renderStatic(); updateStatus('result');
    return true;
  }

  async function animateCorrections(token) {
    state.stage='corrections'; state.focus=false; state.showArrows=true; state.gdVisible=false; state.outputReveal=1;
    renderStatic(); updateStatus('corrections');
    // Grow arrows from zero to full size by temporarily scaling their groups.
    await animate(420, p => {
      const k=ease(p);
      for (let o=0;o<10;o++) {
        const a=scene.arrowGroups[o].g;
        a.style.transformBox='fill-box';
        a.style.transformOrigin='center';
        a.style.transform=`scaleY(${Math.max(.05,k)})`;
        a.style.opacity=String(k);
      }
    }, token);
    for (let o=0;o<10;o++) { scene.arrowGroups[o].g.style.transform=''; scene.arrowGroups[o].g.style.opacity=''; }
    renderStatic();
    return token===state.runToken;
  }

  async function animateGD(token) {
    state.stage='gd'; state.showArrows=true; state.gdVisible=true; state.gdProgress=0; state.outputReveal=1;
    updateStatus('gd');
    await animate(650, p => {
      state.focus=p>0;
      state.focusAmount=ease(p);
      state.gdProgress=0;
      renderStatic();
      scene.groups.gd.setAttribute('opacity', p);
    }, token);
    if (token!==state.runToken) return false;
    state.focus=true; state.focusAmount=1; state.gdVisible=true;
    await animate(2500, p => {
      state.gdProgress=p;
      renderStatic();
    }, token);
    return token===state.runToken;
  }

  async function animateLocal(token) {
    if (state.pass===4) return true;
    state.localConnectionsRevealed=false;
    state.stage='local'; state.focus=true; state.focusAmount=1; state.showArrows=true; state.gdVisible=false; state.localProgress=0; state.outputReveal=1;
    restoreConnections();
    updateStatus('local'); renderStatic();
    if (!await animate(1100, p => {
      state.localProgress=ease(p);
      renderStatic();
    }, token)) return false;
    const items=scene.hiddenOutputLines.filter(item=>item.o===targetIndex());
    const paths=segments.outputHidden.filter(item=>item.o===targetIndex());
    // Only the growing bundle regains color after the bar has finished.
    growConnections(items,paths,0);
    state.localConnectionsRevealed=true;
    applyLocalAdjustmentVisual();
    if (!await animate(1450,p => growConnections(items,paths,p),token)) return false;
    restoreConnections();
    return true;
  }

  async function animateBackprop(token) {
    if (state.pass===4) return true;
    state.stage='backprop'; state.focus=false; state.focusAmount=0; state.showArrows=false; state.gdVisible=false; state.localProgress=0; state.outputReveal=1;
    const currentVals=currentValues();
    const nextVals=ensureModel(state.example).passes[state.pass+1].slice();
    const startVals=currentVals.slice();
    startVals[targetIndex()]=nextVals[targetIndex()];
    restoreConnections();
    renderStatic();
    const pendingOutputs=scene.hiddenOutputLines.filter(item=>item.o!==targetIndex());
    const pendingPaths=segments.outputHidden.filter(item=>item.o!==targetIndex());
    const grayPendingConnections=() => {
      for (const item of [...scene.inputHiddenLines,...pendingOutputs])
        setAttrs(item.line,{stroke:'#dce5ee','stroke-opacity':.72});
    };
    renderBackpropStatic(startVals,false);
    grayPendingConnections();
    updateStatus('backprop');
    // First shrink non-target bars to the next-pass values, using the same easing
    // and duration as the preceding target-bar growth.
    if (!await animate(1100,p => {
      const shown=startVals.map((v,o)=>lerp(v,nextVals[o],ease(p)));
      renderBackpropStatic(shown,false);
      grayPendingConnections();
    },token)) return false;
    // The core bundle is already complete. Reveal only the remaining bundles.
    growConnections(pendingOutputs,pendingPaths,0);
    for (const item of pendingOutputs) {
      const ls=outputBundleStyleForValue(nextVals[item.o]);
      setAttrs(item.line,{stroke:ls.color,'stroke-width':ls.width,'stroke-opacity':ls.opacity});
    }
    if (!await animate(1450,p => {
      growConnections(pendingOutputs,pendingPaths,p);
    },token)) return false;
    state.learnedStyleIndex=state.pass+1;
    const levels=hiddenLevelsForPass(state.learnedStyleIndex);
    for (let h=0;h<10;h++) {
      setAttrs(scene.hiddenNodes[h].circle,{fill:hiddenActivationFill(levels[h]),stroke:C.ink});
      scene.hiddenNodes[h].text.setAttribute('fill',C.ink);
    }
    if (!await hold(100,token)) return false;
    growConnections(scene.inputHiddenLines,segments.hiddenInput,0);
    const learned=lineStyleForLearnedIndex(state.example,state.learnedStyleIndex);
    for (const item of scene.inputHiddenLines) {
      const ls=learned.style(item.i,item.h);
      setAttrs(item.line,{stroke:ls.color,'stroke-width':ls.width,'stroke-opacity':ls.opacity});
    }
    if (!await animate(1450,p => {
      growConnections(scene.inputHiddenLines,segments.hiddenInput,p);
    },token)) return false;
    restoreConnections();
    renderBackpropStatic(nextVals,true);
    if (!await hold(260,token)) return false;
    // Leave the completed learning state visible until the next explicit step.
    state.stage='backprop';
    updateStatus('backprop');
    return true;
  }

  function renderBackpropStatic(values, learnedApplied) {
    // Temporarily render next-pass outputs while keeping current pass selected.
    const oldLocal=state.localProgress;
    const oldFocus=state.focus;
    const oldFocusAmount=state.focusAmount;
    const oldArrows=state.showArrows;
    state.localProgress=0; state.focus=false; state.focusAmount=0; state.showArrows=false; state.hiddenActivation=1; state.outputReveal=1;

    const learned = lineStyleForLearnedIndex(state.example, learnedApplied?state.learnedStyleIndex:Math.max(0,state.learnedStyleIndex));
    for (const item of scene.inputHiddenLines) {
      const ls=learned.style(item.i,item.h);
      setAttrs(item.line, {stroke:ls.color,'stroke-width':ls.width,'stroke-opacity':ls.opacity});
    }
    // Hidden colors summarize the incoming weight strengths for the displayed pass.
    const hLevels=hiddenLevelsForPass(learnedApplied?state.learnedStyleIndex:state.pass);
    for (let h=0;h<10;h++) {
      setAttrs(scene.hiddenNodes[h].circle,{fill:learnedApplied?hiddenActivationFill(hLevels[h],1):'#eef2f6',stroke:learnedApplied?C.ink:C.muted});
      scene.hiddenNodes[h].text.setAttribute('fill',learnedApplied?C.ink:C.muted);
    }
    for (const item of scene.hiddenOutputLines) {
      const ls=outputBundleStyleForValue(values[item.o]);
      setAttrs(item.line,{stroke:ls.color,'stroke-width':ls.width,'stroke-opacity':ls.opacity});
    }
    for (let o=0;o<10;o++) {
      const v=values[o];
      setAttrs(scene.outputNodes[o],{fill:outputFill(v),stroke:C.ink});
      scene.outputLabels[o].setAttribute('fill',C.ink);
      scene.outputValues[o].setAttribute('fill',C.ink);
      scene.outputValues[o].textContent=String(Math.round(v));
      scene.outputBars[o].setAttribute('fill',outputColor(v));
      scene.outputBars[o].setAttribute('width',layout.barW*v/100);
      scene.arrowGroups[o].g.setAttribute('opacity',0);
    }
    scene.groups.gd.setAttribute('opacity',0);
    state.localProgress=oldLocal; state.focus=oldFocus; state.focusAmount=oldFocusAmount; state.showArrows=oldArrows;
    updateStatus('backprop');
  }

  function advanceAfterBackprop() {
    if (state.pass >= 4) return;
    state.pass += 1;
    state.stage = 'forward';
    state.learnedStyleIndex = state.pass;
    state.hiddenActivation = 0;
    state.outputReveal = 0;
    state.focus = false;
    state.focusAmount = 0;
    state.showArrows = false;
    state.gdVisible = false;
    state.gdProgress = 0;
    state.localProgress = 0;
    clearPulses();
    renderStatic();
    updateStatus('forward');
    updateControls();
  }

  async function runOperation(fn) {
    cancelRun();
    const token = ++state.runToken;
    state.running=true; state.paused=false; updateControls();
    try { await fn(token); }
    finally {
      if (token===state.runToken) {
        state.running=false; state.paused=false; updateControls();
      }
    }
  }

  function setPass(pass, stage=null) {
    cancelRun();
    state.pass=pass;
    stage = stage || (pass===0 ? 'inception' : 'forward');
    state.stage=stage;
    state.learnedStyleIndex=pass;
    state.hiddenActivation = (stage==='forward' || stage==='inception') ? 0 : 1;
    state.outputReveal = (stage==='forward' || stage==='inception') ? 0 : 1;
    state.focus=false; state.focusAmount=0; state.showArrows=false; state.gdVisible=false; state.gdProgress=0; state.localProgress=0;
    clearPulses();
    renderStageStatic(stage);
    updateButtons();
  }

  function renderStageStatic(stage) {
    state.stage=stage;
    state.localConnectionsRevealed=stage==='local';
    restoreConnections();
    state.learnedStyleIndex=state.pass;
    state.gdVisible=false;
    state.focus=false;
    state.focusAmount=0;
    state.showArrows=false;
    state.localProgress=0;
    state.hiddenActivation = (stage==='forward' || stage==='inception') ? 0 : 1;
    state.outputReveal = (stage==='forward' || stage==='inception') ? 0 : 1;
    if (stage==='corrections') state.showArrows=true;
    if (stage==='gd') { state.showArrows=true; state.focus=true; state.focusAmount=1; state.gdVisible=true; state.gdProgress=1; }
    if (stage==='local') { state.showArrows=true; state.focus=true; state.focusAmount=1; state.outputReveal=1; state.localProgress=state.pass<4?1:0; }
    if (stage==='backprop' && state.pass<4) {
      state.learnedStyleIndex=state.pass+1;
      renderBackpropStatic(ensureModel(state.example).passes[state.pass+1],true);
      updateStatus(stage); updateControls(); return;
    }
    if (stage==='complete') { state.hiddenActivation=1; state.outputReveal=1; }
    renderStatic(); updateStatus(stage); updateControls();
  }

  async function nextStep() {
    if (state.running) return;
    const stage=state.stage;
    if (stage==='inception') return runOperation(async t => { await animateForward(t); });
    if (state.pass===4) {
      if (stage==='forward') return runOperation(async t => { await animateForward(t); });
      if (stage==='result') { state.stage='complete'; renderStageStatic('complete'); return; }
      return;
    }
    if (stage==='forward') return runOperation(async t => { await animateForward(t); });
    if (stage==='result') return runOperation(async t => { await animateCorrections(t); });
    if (stage==='corrections') return runOperation(async t => { await animateGD(t); });
    if (stage==='gd') return runOperation(async t => { await animateLocal(t); });
    if (stage==='local') return runOperation(async t => { await animateBackprop(t); });
    if (stage==='backprop') {
      if (state.pass<4) setPass(state.pass+1,'forward');
    }
  }

  function previousStep() {
    if (state.running) return;
    const stages = state.pass===4 ? FINAL_STAGES : (state.pass===0 ? INITIAL_PASS_STAGES : PASS_STAGES);
    let idx=stages.indexOf(state.stage);
    if (idx>0) renderStageStatic(stages[idx-1]);
    else if (state.pass>0) setPass(state.pass-1, state.pass-1===4?'complete':'backprop');
  }

  async function completeForward() {
    return runOperation(async token => {
      renderStageStatic('forward');
      await animateForward(token);
    });
  }

  async function completeLearning() {
    if (state.pass===4) return;
    return runOperation(async token => {
      renderStageStatic('result');
      await animateCorrections(token); if (token!==state.runToken) return;
      await hold(500,token); if (token!==state.runToken) return;
      await animateGD(token); if (token!==state.runToken) return;
      await hold(450,token); if (token!==state.runToken) return;
      await animateLocal(token);
    });
  }

  async function completeBackward() {
    if (state.pass===4) return;
    return runOperation(async token => {
      renderStageStatic('local');
      await animateBackprop(token);
    });
  }

  async function completePass(tokenExternal=null) {
    const inner = async token => {
      renderStageStatic('forward');
      await animateForward(token); if (token!==state.runToken) return;
      await hold(600,token); if (token!==state.runToken) return;
      if (state.pass===4) { state.stage='complete'; renderStageStatic('complete'); return; }
      await animateCorrections(token); if (token!==state.runToken) return;
      await hold(600,token); if (token!==state.runToken) return;
      await animateGD(token); if (token!==state.runToken) return;
      await hold(450,token); if (token!==state.runToken) return;
      await animateLocal(token); if (token!==state.runToken) return;
      await hold(650,token); if (token!==state.runToken) return;
      await animateBackprop(token);
    };
    if (tokenExternal) return inner(tokenExternal);
    return runOperation(inner);
  }

  async function completeTraining() {
    return runOperation(async token => {
      while (token===state.runToken) {
        const stage = state.stage;
        if (stage==='complete') return;

        if (stage==='inception' || stage==='forward') {
          await animateForward(token); if (token!==state.runToken) return;
          await hold(420,token); if (token!==state.runToken) return;
          continue;
        }

        if (stage==='result') {
          if (state.pass===4) {
            state.stage='complete';
            renderStageStatic('complete');
            return;
          }
          await animateCorrections(token); if (token!==state.runToken) return;
          await hold(380,token); if (token!==state.runToken) return;
          continue;
        }

        if (stage==='corrections') {
          await animateGD(token); if (token!==state.runToken) return;
          await hold(320,token); if (token!==state.runToken) return;
          continue;
        }

        if (stage==='gd') {
          await animateLocal(token); if (token!==state.runToken) return;
          await hold(360,token); if (token!==state.runToken) return;
          continue;
        }

        if (stage==='local') {
          await animateBackprop(token); if (token!==state.runToken) return;
          await hold(420,token); if (token!==state.runToken) return;
          continue;
        }

        // A static backprop stage can be reached with Previous Step. Treat it as
        // already complete and continue with the next pass rather than replaying it.
        if (stage==='backprop') {
          advanceAfterBackprop();
          await hold(240,token); if (token!==state.runToken) return;
          continue;
        }
      }
    });
  }


  function switchExample(key) {
    cancelRun();
    state.example=String(key);
    ensureModel(state.example);
    state.pass=0; state.stage='inception'; state.learnedStyleIndex=0; state.hiddenActivation=0; state.outputReveal=0;
    state.focus=false; state.focusAmount=0; state.showArrows=false; state.gdVisible=false; state.gdProgress=0; state.localProgress=0;
    buildDigitImage();
    buildGDPanel();
    rebuildSegments();
    renderStatic(); updateButtons();
  }

  function rerandomizeCurrentModel() {
    cancelRun();
    randomizeModel(state.example);
    state.pass=0; state.stage='inception'; state.learnedStyleIndex=0; state.hiddenActivation=0; state.outputReveal=0;
    state.focus=false; state.focusAmount=0; state.showArrows=false; state.gdVisible=false; state.gdProgress=0; state.localProgress=0;
    buildGDPanel();
    renderStageStatic('inception');
    updateButtons();
  }

  dom.speedSlider.addEventListener('input', e => {
    state.speed=Number(e.target.value);
    dom.speedLabel.textContent=`${Number(state.speed).toFixed(state.speed % 1 ? 1 : 0)}×`;
  });

  dom.digitSelect.addEventListener('change', e => switchExample(e.target.value));
  dom.randomizeBtn.addEventListener('click', rerandomizeCurrentModel);

  dom.passButtons.addEventListener('click', e => {
    const b=e.target.closest('button[data-pass]'); if (!b) return;
    const p=Number(b.dataset.pass);
    setPass(p, p===0 ? 'inception' : 'forward');
  });

  dom.prevBtn.addEventListener('click', previousStep);
  dom.nextBtn.addEventListener('click', nextStep);
  dom.pauseBtn.addEventListener('click', () => { if (!state.running) return; state.paused=!state.paused; updateControls(); });
  dom.forwardBtn.addEventListener('click', completeForward);
  dom.learningBtn.addEventListener('click', completeLearning);
  dom.backBtn.addEventListener('click', completeBackward);
  dom.passBtn.addEventListener('click', () => completePass());
  dom.trainingBtn.addEventListener('click', completeTraining);

  document.addEventListener('keydown', e => {
    const tag=(e.target && e.target.tagName || '').toLowerCase();
    if (tag==='select' || tag==='input' || tag==='button') return;
    if (e.key==='ArrowRight') nextStep();
    else if (e.key==='ArrowLeft') previousStep();
    else if (e.code==='Space' && state.running) { e.preventDefault(); state.paused=!state.paused; updateControls(); }
  });

  // Optional startup URL parameters: ?pass=5&autoNext=1
  // autoNext triggers one Next Step, not continuous playback.
  const startupParams = new URLSearchParams(window.location.search);
  const requestedPass = Number(startupParams.get('pass'));
  const startupPass = Number.isInteger(requestedPass) && requestedPass >= 1 && requestedPass <= 5
    ? requestedPass - 1 : 0;
  const autoNext = ['1', 'true'].includes((startupParams.get('autoNext') || '').toLowerCase());

  // Initialize
  ensureModel(state.example);
  buildScene();
  rebuildSegments();
  setPass(startupPass);
  if (autoNext) nextStep();
})();
