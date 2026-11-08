/* LLM Lab — tabs 8 (Assistant) and 9 (Think & Act), Oct 18–19, 2026.
   Four player pages built only from real recorded outputs (data/assist-data.js, loaded when one of these tabs opens):
   asbefore (Before & After), asconv (Inside a Conversation), astools (Think & Use Tools), astrust (Which Answer?).
   Every page follows Predict → Reveal → Explain → Generalize. The Case Log (role-colored message blocks) is the shared picture;
   the top-right switch reads "Show the tokens" on these tabs and splits each block into its real tokens. No live model runs here. */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const STNS = ['asbefore', 'asconv', 'astools', 'astrust'];
  NT.ASSIST_STATIONS = STNS;
  let A = window.NT_ASSIST || null;
  const load = () => (A ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = './data/assist-data.js';
    s.onload = () => { A = window.NT_ASSIST; res(); }; s.onerror = rej; document.head.appendChild(s);
  }));
  const st = () => $('#stage');

  // ---------- small helpers ----------
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*\*/g, '').replace(/\n/g, '<br>');
  const real = (t) => `<span class="tag real">${t}</span>`;
  const ana = (t = 'our analogy') => `<span class="tag">${t}</span>`;
  const note = (t) => `<span class="as-note">${t}</span>`;
  const MARK = { system: 'system', user: 'user', assistant: 'assistant', memory: 'system', req: 'assistant', res: 'user', doc: 'user', think: 'assistant' };
  const tokChips = (toks) => toks.map((x) => `<span class="as-tk">${esc(x).replace(/\n/g, '↵').replace(/ /g, '·') || '·'}</span>`).join('');
  // one Case Log block; in token view it shows the role marker tokens, then the message's real tokens
  const blk = (b, o = {}) => {
    const cls = `as-b as-${b.role}${o.cls ? ' ' + o.cls : ''}`, lab = o.label || b.label;
    const body = S.nums && b.tokens
      ? `<span class="as-tk as-mk">&lt;|im_start|&gt;</span><span class="as-tk as-mk">${MARK[b.role] || b.role}</span>${tokChips(b.tokens)}<span class="as-tk as-mk">&lt;|im_end|&gt;</span>`
      : (o.html != null ? o.html : md(b.text));
    return `<div class="${cls}"${o.attr || ''}><span class="as-rl">${lab}${S.nums && b.tokens ? ` · ${b.tokens.length} tokens` : ''}</span><div class="as-bt${S.nums && b.tokens ? ' tok' : ''}">${body}</div></div>`;
  };
  const B = (role, label, text, tokens) => ({ role, label, text, tokens });
  const choice = (key, opts, picks) => `<div class="as-choices" data-k="${key}">${opts.map((o, i) => `<button class="as-ch${picks[key] === i ? ' on' : ''}" data-i="${i}">${o}</button>`).join('')}</div>`;
  const bridge = (t) => `<div class="as-bridge"><b>Next question:</b> ${t}</div>`;
  const fold = (summary, html, open = false) => `<details class="as-fold"${open ? ' open' : ''}><summary>${summary}</summary><div>${html}</div></details>`;
  const lock = '<span class="as-lock">🔒 Model parameters: unchanged</span>';

  const miniature = (x, y, width, height, hue, saturation, variant = 0) => `<g>${Array.from({length:16}, (_, i) => {
      const t = Math.sin(i * 2.13 + x + variant) * .7, v = Math.sign(t) * Math.sqrt(Math.abs(t));
      const light = v >= 0 ? 95 - 58 * v : 95 + 48 * v, sat = v >= 0 ? saturation : 16;
      return `<rect x="${x + (i % 4) * width / 4}" y="${y + Math.floor(i / 4) * height / 4}" width="${width / 4}" height="${height / 4}" fill="hsl(${hue} ${sat}% ${light}%)"/>`;
    }).join('')}</g>`;
  const modelThumbnail = (name = 'Qwen3-0.6B', trained = false) => `<div class="cx-model" aria-label="${trained ? 'Post-trained model; parameters fixed during generation' : 'Model parameters unchanged during generation'}"><svg width="100" height="42" viewBox="0 0 100 42" role="img" aria-label="Schematic transformer with QKV, output and MLP matrices" title="Illustrative parameter textures; colors identify matrix roles, not answer quality">${[0,1,2].map(r => `<g transform="translate(2 ${r*14+1})"><rect width="96" height="12" rx="2" fill="#f1f5f9"/>${[0,1,2].map(i => miniature(5+i*7,2,4,8,[214,27,268][i],[78,92,62][i],trained ? 3 : 0)).join('')}${miniature(29,2,8,8,174,70,trained ? 3 : 0)}${miniature(44,2,32,8,56,75,trained ? 3 : 0)}${miniature(82,2,8,3,56,75,trained ? 3 : 0)}<text x="86" y="7" font-size="5" text-anchor="middle" fill="#526077">⋯</text>${miniature(82,7,8,3,56,75,trained ? 3 : 0)}</g>`).join('')}</svg><span><b>🔒 ${trained ? 'After post-training' : 'Parameters fixed'}</b><small>${trained ? 'Changed by training · fixed now' : 'Parameters unchanged'}</small><small>Schematic · ${esc(name)}</small></span></div>`;
  const contextTray = (title, body, count = '', cls = '') => `<section class="cx-tray ${cls}"><header><b>${title}</b><span>${count ? count + ' tokens' : 'Text available for this response'}</span></header><div class="cx-messages">${body}</div><footer>Context window · bounded text, not learned weights</footer></section>`;

  // ---------- the recorded prompt in the sentence box (read-only on these tabs) ----------
  const card = document.querySelector('.sentcard');
  if (card && !$('#asPrompt')) card.insertAdjacentHTML('beforeend', '<div id="asPrompt" class="as-prompt" title="This page uses recorded outputs, so the prompt can’t be typed here."></div>');
  const setPrompt = (t) => { const p = $('#asPrompt'); if (p) p.innerHTML = `${esc(t)} <span class="as-lockp">🔒 recorded prompt</span>`; };

  // ---------- one player per page: ⏮ ◀ Next ▶ ▶ Play, two-line caption, step chevrons ----------
  function page(P) {
    const ownerStation = S.station; let surface = null;
    const alive = () => S.station === ownerStation && (!surface || $('#asBox') === surface);
    P.beat = P.beat || 0; P.picks = P.picks || {};
    const draw = () => {
      if (!alive()) return;
      const s = P.steps[P.beat];
      $('#asCap').innerHTML = `<div class="fl-ch"><b>${s.title}</b></div><div class="fl-cd">${s.line}</div>`;
      $('#asSteps').innerHTML = P.steps.map((x, i) => `<button class="tr-st${i === P.beat ? ' on' : i < P.beat ? ' done' : ''}" data-b="${i}">${x.chev}</button>`).join('');
      $('#asSteps').querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => { stop(); P.beat = +b.dataset.b; draw(); }));
      const box = $('#asBox'); box.style.zoom = 1; box.innerHTML = s.draw(P); if (s.after) s.after(P, box);
      box.querySelectorAll('.as-choices').forEach((g) => g.querySelectorAll('.as-ch').forEach((b) => (b.onclick = () => { P.picks[g.dataset.k] = +b.dataset.i; draw(); })));
      gate();
      $('#asBack').disabled = P.beat === 0; $('#asRew').disabled = P.beat === 0;
      NT.setStatus(`Step ${P.beat + 1} of ${P.steps.length} · ${P.steps[P.beat].chev.replace(/^\S+\s/, '')}`);
      requestAnimationFrame(() => { if (alive()) NT.fitZoom(box, 0.7); });
    };
    const gate = () => { const s = P.steps[P.beat], ok = !s.gate || s.gate(P); $('#asNext').disabled = P.beat >= P.steps.length - 1 || !ok; $('#asNext').title = ok ? '' : (s.gateHint || 'Make your prediction first'); return ok; };
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; const b = $('#asPlay'); if (b && alive()) b.textContent = '▶ Play'; };
    const next = () => { const step = P.steps[P.beat]; if (step.advance && step.advance(P)) return true; if (P.beat < P.steps.length - 1 && gate()) { P.beat++; draw(); return true; } return false; };
    st().innerHTML = `<section class="panel tr-panel as-panel"><div class="tr-head"><div class="fl-ctl"><button class="btn" id="asRew" title="Start over">⏮</button><button class="btn" id="asBack">◀ Back</button><button class="btn primary" id="asNext">Next ▶</button><button class="btn" id="asPlay">▶ Play</button></div></div>
      <div class="fl-cap fixed" id="asCap"></div><div class="as-steps" id="asSteps"></div><div class="as-box" id="asBox"></div></section>`;
    surface = $('#asBox');
    NT.guideRow(st().querySelector('.tr-panel'));
    $('#asRew').onclick = () => { stop(); P.steps.forEach(step => { if (step.reset) step.reset(); }); P.beat = 0; draw(); };
    $('#asBack').onclick = () => { stop(); const step = P.steps[P.beat]; if (step.retreat && step.retreat(P)) return; if (P.beat > 0) { P.beat--; draw(); } };
    $('#asNext').onclick = () => { stop(); next(); };
    $('#asPlay').onclick = () => { if (timer) return stop(); $('#asPlay').textContent = '❚❚ Pause'; timer = setInterval(() => { if (!alive()) { stop(); return; } if (!next()) stop(); }, 7000); };
    P.redraw = draw; P.regate = gate; P.stop = stop;
    draw();
  }
  const station = (id, build) => {
    NT.stations[id] = {
      async init() {
        Object.values(PAGES).forEach(p => { if (p.stop) p.stop(); });
        st().innerHTML = '<div class="panel emptynote">Loading the recorded examples…</div>';
        try { await load(); } catch (e) { st().innerHTML = '<div class="panel emptynote">The recorded examples (data/assist-data.js) could not be loaded.</div>'; return; }
        if (S.station !== id) return;
        const P = build(); setPrompt(P.prompt); page(P);
      },
      onText() {}, onTK() {},
      onNums() { const P = PAGES[id]; if (P && P.redraw) P.redraw(); },
      // Nov 4: for the checks only (js/checks.js)
      scene: { beats: () => (PAGES[id] ? PAGES[id].steps : []), now: () => (PAGES[id] ? PAGES[id].beat : -1), ready: () => S.station === id && !!(PAGES[id] && PAGES[id].redraw && $('#asBox')), seek(i) { const P = PAGES[id]; if (S.station !== id || !P || !P.redraw || !$('#asBox')) return false; if (P.stop) P.stop(); P.beat = i; P.redraw(); return true; } },
    };
  };
  const PAGES = {};
  const keep = (id, mk) => () => (PAGES[id] = PAGES[id] || mk());

  // ======================= Screen 1: Before & After =======================
  station('asbefore', keep('asbefore', () => {
    const D = A.s1, T = D.tally, run = { i: D.show - 1 };
    const sys = B('system', 'System', D.system), usr = B('user', 'User', D.user), wait = B('assistant', 'Assistant', '');
    const log = () => S.nums
      ? `<div class="as-log"><h5>🗂️ Case Log · the same ${D.promptTokens} tokens go to both</h5><div class="as-b as-plain"><div class="as-bt tok">${D.chatTokens.map((x) => /^<\|im_/.test(x) ? `<span class="as-tk as-mk">${esc(x)}</span>` : `<span class="as-tk">${esc(x).replace(/\n/g, '↵').replace(/ /g, '·')}</span>`).join('')}</div></div></div>`
      : `<div class="as-log"><h5>🗂️ Case Log · the same ${D.promptTokens} tokens go to both</h5>${blk(sys)}${blk(usr)}${blk(wait, { html: '<span class="as-wait">(waiting for the next token…)</span>' })}</div>`;
    const rows = [['Parameter count', D.settings.params], ['Vocabulary', D.settings.vocab], ['Context window', D.settings.window], ['Temperature · Top-K', `${D.settings.temp} · ${D.settings.topk}`]];
    const setcol = (i) => `<table class="as-set">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v} <span class="as-same">✓ same</span></td></tr>`).join('')}<tr class="diff"><td>Training</td><td>${i ? 'Pre-training + post-training' : 'Pre-training only'}</td></tr></table>`;
    const V = ['Version 1 · pre-training only', 'Version 2 · + post-training'], M = ['real SmolLM2-135M', 'real SmolLM2-135M-Instruct'];
    const outText = (k, i) => {
      const t = (k ? D.inst : D.base)[i], stop = t.endsWith('<|im_end|>');
      let h = md(t.replace('<|im_end|>', '').trim());
      if (!k) h = h.replace(/ostering/g, '<mark class="as-junk" title="a junk word where a role marker would go">ostering</mark>');
      return `<div class="as-out">${h}</div><div class="as-end">${stop ? '<span class="as-badge ok">⏹ stop token</span>' : `<span class="as-badge go">… still going at the ${D.settings.max}-token limit</span>`}</div>`;
    };
    const OPTS = ['Answers the request', 'Keeps writing something else', 'Writes nothing'];
    const bar = (n, c) => `<div class="as-bar"><i style="width:${(n / 30) * 100}%;background:${c}"></i><span>${n} / 30</span></div>`;
    return {
      prompt: D.user,
      steps: [
        { chev: '📄 Same chat', title: 'Two versions of one small model get the same chat.', line: 'A system line, the user’s request, and the start of the assistant’s turn. Spot the one difference.',
          draw: () => `<div class="as-g2">${contextTray('Same context supplied to both versions', log(), D.promptTokens)}<div><div class="ax-shared-input">↙ Identical prompt and settings ↘</div><div class="as-cols">${[0, 1].map((i) => `<div class="as-card"><h4>Version ${i + 1} ${real(M[i])}</h4>${modelThumbnail(i ? 'SmolLM2-135M-Instruct' : 'SmolLM2-135M', !!i)}<div class="ax-down">↓ Same next-token process</div>${setcol(i)}</div>`).join('')}</div>
            <p class="as-model">${note('Different, much smaller models than ChatGPT, chosen because they show this idea clearly. Both share the same 30 blocks, 9 heads, and 576 numbers per vector.')}</p></div></div>` },
        { chev: '🤔 Predict', title: 'What will each version write?', line: 'Choose for each version, then press Next.',
          gate: (P) => P.picks.v1 != null && P.picks.v2 != null,
          draw: (P) => `<div class="as-cols">${[0, 1].map((i) => `<div class="as-card"><h4>${V[i]}</h4>${modelThumbnail(M[i].replace('real ',''), !!i)}<p class="as-q">What will it write after “Assistant”?</p>${choice('v' + (i + 1), OPTS, P.picks)}</div>`).join('')}</div>` },
        { chev: '👀 Reveal', title: 'Version 2 answers the request. Version 1 keeps writing something else.', line: 'Version 1 writes new user questions, over and over. Version 2 lists three tips.',
          draw: (P) => `<div class="as-cols">${[0, 1].map((k) => `<div class="as-card"><h4>${V[k]} ${real(M[k].replace('real ', 'real · run ' + D.show + ' · '))}</h4>${modelThumbnail(M[k].replace('real ',''), !!k)}<div class="ax-down">↓ Recorded response</div>${outText(k, D.show - 1)}</div>`).join('')}</div>
            <p class="as-recap">Your predictions: Version 1 <b>${OPTS[P.picks.v1] || '–'}</b> · Version 2 <b>${OPTS[P.picks.v2] || '–'}</b> ${note('highlighted in Version 1: a junk word where a role marker would go')}</p>` },
        { chev: '💬 Explain', title: 'Was it luck? Check 30 runs of each.', line: `Numbered list 1–3: ${T.base.list} vs ${T.inst.list}. Stopped within ${D.settings.max} tokens: ${T.base.stop} vs ${T.inst.stop}. New user message: ${T.base.user} vs ${T.inst.user}.`,
          draw: () => `<div class="as-card"><div class="as-tally"><b>ALL 30 RUNS EACH</b><b>Version 1</b><b>Version 2</b>
              <span>Gave a numbered list 1–3</span>${bar(T.base.list, '#ffc7ce')}${bar(T.inst.list, '#1e8a3a')}
              <span>Finished and stopped (${D.settings.max} tokens)</span>${bar(T.base.stop, '#c00000')}${bar(T.inst.stop, '#c6efce')}
              <span>Wrote a new user message</span>${bar(T.base.user, '#ffc7ce')}${bar(T.inst.user, '#d5d9e0')}</div>
              <p>${note(`Version 2 always answered. In ${30 - T.inst.stop} runs it was still writing its tips when the recording stopped at ${D.settings.max} tokens.`)}</p></div>
            ${fold('Browse the 30 runs ›', `<div class="as-runsel"><button class="btn small" id="asPrev">◀ Previous run</button> Run <b id="asRunN">${run.i + 1}</b> of 30 (same run number for both) <button class="btn small" id="asNextRun">Next run ▶</button></div><div class="as-cols" id="asRuns"></div>`)}
            <p class="as-q">In your notes: what made the difference between the two versions?</p>`,
          after: () => {
            const fill = () => { $('#asRunN').textContent = run.i + 1; $('#asRuns').innerHTML = [0, 1].map((k) => `<div class="as-card"><h4>${V[k]}</h4>${outText(k, run.i)}</div>`).join(''); };
            $('#asPrev').onclick = () => { run.i = (run.i + 29) % 30; fill(); }; $('#asNextRun').onclick = () => { run.i = (run.i + 1) % 30; fill(); }; fill();
          } },
        { chev: '🔗 Generalize', title: 'Post-training changed the parameters, not the prompt.', line: 'Both saw role labels. Post-training taught Version 2 to follow requests helpfully.',
          draw: () => `<div class="as-cols"><div class="as-card"><h4>What really happened ${real('real')}</h4><p>Version 2 had extra training on example conversations and on answers people rated (<b>post-training</b>). That training changed its parameters. Its size, tokenizer, context window and settings stayed exactly the same as Version 1’s.</p><p>Both versions still do the same thing underneath: predict the next token from everything in the context.</p><p><a href="#post" class="as-link">See the steps on tab 7 Post-Training ›</a></p></div>
            <div class="as-card"><h4>Our analogy ${ana()}</h4><p>Version 1 has read the whole library but never had a client: hand it a page and it writes more page. Version 2 went back to the Detective Academy for client work: read the request, answer it, stop.</p></div></div>
            ${bridge('If training makes it able to answer, how does it know which question we’re talking about?')}` },
      ],
    };
  }));

  // ======================= Screen 2: Inside a Conversation =======================
  station('asconv', keep('asconv', () => {
    const D = A.s2, sh = D.thatShare;
    const H = D.history;
    const thatHtml = (lit) => md('Can you make ') + `<button class="as-that${lit ? ' on' : ''}" id="asThat" title="Click: what does “that” refer to?">that</button>` + md(' simpler?');
    const histLog = (lit, withReply) => `${blk(H[0])}${blk(H[1], { cls: lit ? 'as-lit' : '' })}${blk(H[2], { cls: (lit ? 'as-lit ' : '') + 'as-clip' })}${blk(H[3], { html: thatHtml(lit) })}${withReply ? blk(D.withReply) : ''}`;
    const M = D.memory, T = D.trim, view = { trimmed: false, mem: false, lit: false };
    const chat = (rows) => rows.map(([q, a]) => `${blk(B('user', 'User', q))}${blk(B('assistant', 'Reply', a))}`).join('');
    const model = () => modelThumbnail();
    const tray = contextTray;
    const lane = (title, body, reply, count = '') => `<div class="cx-lane">${tray(title, body, count)}<div class="cx-route"><span aria-hidden="true">↓</span><small>Read context → predict next tokens</small>${model()}</div><section class="cx-result"><b>Recorded response</b>${reply || '<p class="as-wait">The next response is generated from this context.</p>'}</section><div class="cx-return">↶ The reply joins the history for the next turn</div></div>`;
    const memoryRequests = () => M.without.map(([q]) => blk(B('user', 'Recorded request', q))).join('');
    const sorter = [['The conversation history', 'C'], ['The vectors calculated as tokens move through the Transformer', 'C'], ['The learned Q, K, and V matrices', 'T'], ['The learned embedding matrix', 'T']];
    return {
      prompt: 'Can you make that simpler?',
      steps: [
        { chev: '🗂️ Context', title: 'A conversation becomes the model’s context.', line: 'Role labels identify who supplied each message. The model reads the available text to predict its next token.',
          draw: () => `<div class="cx-intro">${lane('Context · Case Log', histLog(false, false), '', D.fullTokens)}<aside class="cx-explain"><h4>Chat is what you see.</h4><p>Context is the text supplied to the model for this response.</p><div class="cx-role-key"><span>System · instructions</span><span>User · requests</span><span>Assistant · earlier replies</span></div><p class="as-q">Turn on <b>Show the tokens</b>. Find the role markers separating the messages.</p><p>${D.fullTokens} tokens, including markers and the start of the assistant’s turn.</p>${note('Real Qwen3-0.6B recording. The diagram is schematic; this is not GPT-2’s 12-block architecture.')}</aside></div>` },
        { chev: '🤔 Predict', title: 'What if the earlier messages weren’t supplied?', line: 'The last request stays the same. The context changes; the parameters do not.',
          gate: (P) => P.picks.nh != null,
          draw: (P) => `<div class="cx-intro">${lane('Context · earlier exchange omitted', D.noHistory.map(b => blk(b)).join(''), '')}<aside class="cx-explain"><div class="cx-absent">Earlier question and answer<br>Not supplied to this response</div><p class="as-q">Without the earlier messages, the model will…</p>${choice('nh', ['Simplify photosynthesis anyway', 'Not know what “that” means', 'Explain something unrelated'], P.picks)}</aside></div>` },
        { chev: '👀 Compare', title: 'Same request. Different context. Different response.', line: 'Click “that” to highlight the earlier exchange it refers to. The two recordings use the same model.',
          draw: () => `<div class="cx-compare">${lane('With the earlier exchange', histLog(view.lit, false), blk(D.withReply), D.fullTokens)}${lane('Without the earlier exchange', D.noHistory.map(b => blk(b)).join(''), blk(D.noReply))}</div>${fold('Attention numbers from this recording (optional)', `<p>Averaged over all 28 blocks and 16 heads, ${Math.round(sh.answer1 * 100)}% of attention from “that” goes to the earlier answer and ${Math.round(sh['system+question'] * 100)}% to the system line and first question. These averages do not prove understanding. Compare the recorded responses.</p>`)}`,
          after: (P) => { const b = $('#asThat'); if (b) b.onclick = () => { view.lit = !view.lit; P.redraw(); }; } },
        { chev: '📌 Memory', title: 'Saved memory works by supplying text again.', line: 'A saved note is copied into context. It does not rewrite the model’s parameters. Predict, then reveal.',
          draw: () => `<div class="cx-memory-source"><b>📌 Saved note · stored outside the model</b>${blk(M.note)}<span class="cx-copy">↓ Copy into context when relevant</span></div><div class="cx-compare"><div class="cx-lane">${tray('Context ingredients · without the note', memoryRequests())}<div class="cx-route">${model()}</div><section class="cx-result"><b>Recorded exchanges</b>${chat(M.without)}</section></div><div class="cx-lane">${tray('Context ingredients · with the note', memoryRequests() + (view.mem ? blk(M.note, {label:'System · saved note added to context',cls:'cx-note-enter'}) : '<p class="as-wait">Predict how the responses will change when this note is supplied.</p>'))}<div class="cx-route">${model()}</div><section class="cx-result">${view.mem ? `<b>Recorded exchanges</b>${chat(M.with)}` : '<button class="btn primary" id="asMem">Add note & reveal</button>'}</section></div></div>`,
          after: (P) => { const b = $('#asMem'); if (b) b.onclick = () => { view.mem = true; P.redraw(); }; } },
        { chev: '✂️ Window', title: 'Only the text supplied in context is available for this response.', line: 'Toggle the oldest exchange out of context. It remains visible outside the boundary, but the model no longer receives it.',
          draw: () => `<div class="as-trimbar"><div class="seg"><button class="${view.trimmed ? '' : 'on'}" data-tr="0">Full history · ${T.tokensFull} tokens</button><button class="${view.trimmed ? 'on' : ''}" data-tr="1">Oldest exchange trimmed · ${T.tokensTrim} tokens</button></div>${real('real Qwen3-0.6B')}</div><div class="cx-trim-layout"><aside class="cx-outside"><b>Outside the supplied context</b>${view.trimmed ? T.conv.slice(1,3).map(b => blk(b,{cls:'cx-removed'})).join('') : '<p>No exchange removed in this view.</p>'}<p>Not sent to the model</p></aside>${lane('Context sent to the model', T.conv.filter((_,i) => !view.trimmed || (i!==1 && i!==2)).map(b=>blk(b)).join('') + blk(T.ask), blk(view.trimmed ? T.trimmed : T.full), view.trimmed ? T.tokensTrim : T.tokensFull)}</div><p class="cx-window-note">We removed the exchange deliberately for this experiment; the window was not full. This model’s window is ${T.window} tokens. Systems may trim, summarize, or retrieve older material; it must be supplied again to be used.</p>`,
          after: (P) => document.querySelectorAll('[data-tr]').forEach((b) => (b.onclick = () => { view.trimmed = b.dataset.tr === '1'; P.redraw(); })) },
        { chev: '🔗 Generalize', title: 'Context changes. Parameters don’t.', line: 'Sort each item: C if it can change during a conversation, T if changing it takes training. Then check.',
          gate: () => true,
          draw: (P) => `<div class="cx-final-model">${model()}<span>Context and calculated vectors can change during a conversation.</span></div><div class="as-card"><div class="as-sort">${sorter.map(([t, a], i) => { const v = P.picks['s' + i]; const ok = P.checked ? (v === a ? ' ok' : ' bad') : ''; return `<div class="as-srow${ok}"><span>${t}</span><span class="as-ct" data-s="${i}"><button class="${v === 'C' ? 'on' : ''}" data-v="C">C</button><button class="${v === 'T' ? 'on' : ''}" data-v="T">T</button></span></div>`; }).join('')}</div>
            <button class="btn primary" id="asCheck">Check</button></div>
            <div class="as-card as-three"><b>Three ingredients:</b> the <b>transformer</b> processes the language · <b>post-training</b> shapes how the model responds · the <b>context</b> supplies the information and instructions for this conversation.</div>
            ${bridge('What happens when the information in the context isn’t enough to solve the problem?')}`,
          after: (P) => { document.querySelectorAll('.as-ct').forEach((g) => g.querySelectorAll('button').forEach((b) => (b.onclick = () => { P.picks['s' + g.dataset.s] = b.dataset.v; P.checked = false; P.redraw(); }))); $('#asCheck').onclick = () => { P.checked = true; P.redraw(); }; } },
      ],
    };
  }));

  // ======================= Screen 3: Think & Use Tools =======================
  station('astools', keep('astools', () => {
    const D = A.s3, view = { sub: 0, noInstr: false, round: 0 };
    const frame = `<p class="as-frame">${real('real Qwen3-0.6B · four recorded cases')} ${note('Each case used different settings: this shows what can happen, not which method is always best.')}</p>`;
    const hl = (t) => { let h = esc(t); const cls = ['bad', 'mid', 'good']; D.think.highlights.forEach((k, i) => { h = h.replace(esc(k), `<mark class="as-m ${cls[i]}">${esc(k)}</mark>`); }); return h.replace(/\n/g, '<br>'); };
    const yours = (P) => { const v = (P.picks.ans || '').replace(/[^\d]/g, ''); return v ? (v === String(D.answer) ? `Your answer: <b>${P.picks.ans}</b> ✓` : `Your answer: <b>${P.picks.ans}</b> (check it again: the right answer is 3,317)`) : 'You didn’t enter an answer. The right answer is 3,317.'; };
    const toolSteps = ['1 · the model writes a request', '2 · the tool runs it', '3 · the result joins the Case Log', '4 · the model keeps writing'];
    const toolLog = () => {
      const u = B('user', 'User', D.problem), s = view.sub;
      let h = blk(B('system', 'System', D.tool.system + ' (+ the list of tools)')) + blk(u);
      if (s >= 0) h += blk(B('req', 'Tool request · written by the model', 'Calculate ' + D.tool.expr), { html: S.nums ? esc(D.tool.rawReq).replace(/\n/g, '<br>') : esc('Calculate ' + D.tool.expr) });
      if (s >= 2) h += blk(B('res', 'Tool result · added by the tool', D.tool.result), { html: S.nums ? esc(D.tool.rawRes).replace(/\n/g, '<br>') : '3,317' });
      if (s >= 3) h += blk(B('assistant', 'Assistant', D.tool.final));
      return h;
    };
    const agentRounds = (R) => R.map((r, i) => r.answer != null ? blk(B('assistant', 'Answer', r.answer)) :
      `<div class="as-round"><span class="as-rn">Round ${i + 1}</span>${blk(B('req', 'Tool request' + (r.calls.length > 1 ? `s (${r.calls.length} at once)` : ''), r.calls.map((c) => c.name === 'search' ? `Search: ${c.arguments.query}` : `Calculate: ${c.arguments.expression}`).join('\n')))}${r.results.map((x) => x.calc != null ? blk(B('res', 'Tool result · calculator', x.calc)) : blk(B('res', 'Retrieved document · ' + x.title, x.text))).join('')}</div>`).join('');
    return {
      prompt: D.problem,
      steps: [
        { chev: '🤔 Solve', title: 'Work it out yourself. Then predict which ways of answering will be right.', line: 'You’re the checker today. Use a calculator if you like.',
          gate: (P) => ['p0', 'p1', 'p2'].every((k) => P.picks[k] != null),
          draw: (P) => `<div class="as-card as-prob"><b>${esc(D.problem)}</b><label class="as-ans">Your answer: <input id="asAns" type="text" inputmode="numeric" value="${esc(P.picks.ans || '')}" placeholder="type it here"></label></div>
            <div class="as-three3">${['⚡ Answer right away', '✍️ Show the steps', '🗒️ Thinking tokens'].map((t, i) => `<div class="as-card as-face"><h4>${t}</h4><p class="as-q">Will it be right?</p>${choice('p' + i, ['Right', 'Wrong'], P.picks)}</div>`).join('')}</div>`,
          after: (P) => { const i = $('#asAns'); if (i) i.oninput = () => { P.picks.ans = i.value; }; } },
        { chev: '👀 Reveal A', title: 'Two wrong, one right.', line: 'Right away: a number from the question. Steps: a slip in the multiplication. Thinking: it caught its own mistake.',
          draw: (P) => `${frame}<div class="as-three3">
            <div class="as-card"><h4>⚡ Answer right away</h4><div class="as-tokn">tokens written: <b>about ${D.direct.tokens}</b></div><div class="as-out short">${md(D.direct.text)}</div><p>${note('Its reply was started with “The answer is”, so it had no room to work.')}</p><span class="as-stamp bad">✗ 7,869</span></div>
            <div class="as-card"><h4>✍️ Show the steps</h4><div class="as-tokn">tokens written: <b>${D.steps.tokens}</b></div><div class="as-out short">Step 1: 238 × 47 = <mark class="as-m bad">${D.steps.wrongProduct}</mark><br>Step 2: 11,206 − 7,869 = 3,337<br>✅ Final Answer: ${D.steps.final}</div>${fold('Read the full response ›', md(D.steps.text))}<p>${note('Key lines of the real response. 238 × 47 is really 11,186.')}</p><span class="as-stamp bad">✗ ${D.steps.final}</span></div>
            <div class="as-card"><h4>🗒️ Thinking tokens</h4><div class="as-tokn">tokens written: <b>${D.think.tokens.toLocaleString()} + ${D.think.answerTokens}</b></div><div class="as-out short"><mark class="as-m bad">“${D.think.highlights[0]}”</mark> → total 11,036<br><mark class="as-m mid">“${D.think.highlights[1]}”</mark><br><mark class="as-m good">“…${D.think.highlights[2].replace('plus 376 is ', 'is ')}”</mark> → ${D.think.final}</div>${fold('Read the full thinking tokens › (optional)', `<div class="as-trace">${hl(D.think.text)}</div>`)}<span class="as-stamp ok">✓ ${D.think.final}</span></div></div>
            <p class="as-recap">${yours(P)}</p>` },
        { chev: '💬 Explain A', title: 'The extra tokens gave it room to work, and it caught its own mistake.', line: 'Those tokens aren’t a complete record of the computation inside the model.',
          draw: () => `<div class="as-cols"><div>${contextTray('Context grows with generated reasoning tokens', blk(B('user','Problem',D.problem)) + D.think.highlights.map((text,i) => `<div class="ax-reason-piece" style="animation-delay:${i*.25}s">${blk(B('think','Selected recorded excerpt ' + (i+1), text))}</div>`).join(''))}<div class="ax-down">↓ Later tokens can use earlier generated text</div>${modelThumbnail()}</div><div class="as-card"><h4>What happened</h4><p>In this recorded model, the reasoning tokens it generates join the context, so later tokens can use them. Here they let it notice “Wait, let me check that again” and fix 11,036 to 11,186.</p><p>It still cost something: ${D.think.tokens.toLocaleString()} extra tokens, about ${D.think.minutes} minutes on our 2-core test computer. And the written steps on the middle card looked just as sensible, with a check mark, and were wrong.</p>
            <p class="as-q">In your notes: why isn’t a clear explanation proof that an answer is right?</p></div></div>` },
        { chev: '🧰 Tool loop', reset: () => { view.sub = 0; }, advance: P => { if (view.sub >= 3) return false; view.sub++; P.redraw(); return true; }, retreat: P => { if (view.sub <= 0) return false; view.sub--; P.redraw(); return true; }, title: 'The model writes a request. A tool outside the model does the math.', line: 'Request → external tool → result in context → generate again.',
          draw: () => `<div class="as-mini">${toolSteps.map((t, i) => `<button class="${i === view.sub ? 'on' : i < view.sub ? 'done' : ''}" data-ts="${i}">${t}</button>`).join('')}<button class="btn small" id="asTS">Next part ▶</button></div>
            <div class="ax-tool-route"><div>${modelThumbnail()}${contextTray('Context · request and returned result', toolLog())}</div><div class="ax-transfer" aria-label="${view.sub === 1 ? 'Request sent to external tool' : view.sub === 2 ? 'Result returned to context' : 'Model and external tool are separate'}"><span class="ax-wire">${view.sub === 2 ? '←' : '→'}</span>${view.sub === 1 ? '<span class="ax-packet outgoing">Calculate</span>' : view.sub === 2 ? '<span class="ax-packet incoming">3,317</span>' : ''}<small>${['Request written','Send request','Return result','Generate again'][view.sub]}</small></div><div class="ax-external"><h4>Calculator</h4><small>Software outside the model</small><div class="ax-calculator">${view.sub >= 1 ? `<div>${esc(D.tool.expr)}</div><strong>3,317</strong>` : '<span>Waiting for a request</span>'}</div><p>${view.sub === 3 ? 'The model uses the returned result to write its answer.' : 'The tool calculates. The model generates the request.'}</p></div></div>
            <p>${S.nums ? note('Tokens view: this is the format this model was trained on. Systems differ; many use a separate tool role.') : note('Turn on Show the tokens to see the real request and result as the model wrote and read them.')}
            <label class="as-tog"><input type="checkbox" id="asNoI"${view.noInstr ? ' checked' : ''}> Without the instruction to use the tool</label></p>
            ${view.noInstr ? `<div class="as-card">${blk(B('assistant', 'Real reply without the instruction (no tool used)', D.tool.noInstr))}<p>${note('It skipped the tool, did the math itself, and got 238 × 47 = 11,086, so 3,217. Wrong.')}</p></div>` : ''}`,
          after: (P) => { document.querySelectorAll('[data-ts]').forEach((b) => (b.onclick = () => { view.sub = +b.dataset.ts; P.redraw(); })); $('#asTS').disabled = view.sub === 3; $('#asTS').onclick = () => { view.sub = Math.min(3, view.sub + 1); P.redraw(); }; $('#asNoI').onchange = (e) => { view.noInstr = e.target.checked; P.redraw(); }; } },
        { chev: '🔁 It can repeat', reset: () => { view.round = 0; }, advance: P => { if (view.round >= D.agentOk.rounds.length - 1) return false; view.round++; P.redraw(); return true; }, retreat: P => { if (view.round <= 0) return false; view.round--; P.redraw(); return true; }, title: 'An agent observes a result, then chooses its next action.', line: 'Search results and calculator results enter context. Parameters stay fixed. Walk through this recorded sequence.',
          draw: () => `<div class="ax-round-controls"><button class="btn" id="axRoundBack" ${view.round === 0 ? 'disabled' : ''}>◀ Previous round</button><b>Round ${view.round + 1} of ${D.agentOk.rounds.length}</b><button class="btn primary" id="axRoundNext" ${view.round === D.agentOk.rounds.length - 1 ? 'disabled' : ''}>Next round ▶</button></div><div class="ax-agent"><div>${contextTray('Context · results accumulate', blk(B('user','Request',D.agentOk.q)) + agentRounds(D.agentOk.rounds.slice(0,view.round+1)))}</div><aside>${modelThumbnail()}<div class="ax-loop-caption">${D.agentOk.rounds[view.round].answer != null ? '↓ Enough information → answer' : '→ Request → external tool → result back to context ↶'}</div><div class="${D.agentOk.rounds[view.round].answer != null ? 'cx-result' : 'ax-external'} ax-round-current"><b>${D.agentOk.rounds[view.round].answer != null ? 'Model’s recorded final answer' : 'Current external tool action'}</b>${agentRounds([D.agentOk.rounds[view.round]])}</div><p>${note(esc(D.agentOk.note || ''))}</p></aside></div>${fold('An agent can loop and still be wrong', `<p>The same model, told to make one tool call at a time, looped without looking up Everest.</p>${agentRounds(D.agentBad.rounds)}`)}`,
          after: P => { $('#axRoundBack').onclick = () => { view.round = Math.max(0,view.round-1); P.redraw(); }; $('#axRoundNext').onclick = () => { view.round = Math.min(D.agentOk.rounds.length-1,view.round+1); P.redraw(); }; } },
        { chev: '🔗 Generalize', title: 'Reasoning is not verification.', line: 'Thinking can help but still err. Check the calculation or source, not just the explanation.',
          draw: () => `<div class="as-card"><table class="as-sum"><tr><th>Recorded case</th><th>Tokens written</th><th>Result</th></tr><tr><td>⚡ Answer right away</td><td>about ${D.direct.tokens}</td><td class="bad">✗ 7,869</td></tr><tr><td>✍️ Show the steps</td><td>${D.steps.tokens}</td><td class="bad">✗ 3,337</td></tr><tr><td>🗒️ Thinking tokens</td><td>${D.think.tokens.toLocaleString()} + ${D.think.answerTokens}</td><td class="ok">✓ 3,317</td></tr><tr><td>🧰 Calculator tool</td><td>a short request</td><td class="ok">✓ 3,317</td></tr></table></div>
            ${bridge('What if the tool does a perfect calculation, but with the wrong information?')}` },
      ],
    };
  }));

  // ======================= Screen 4: Which Answer? =======================
  station('astrust', keep('astrust', () => {
    const D = A.s4, K = ['A', 'B', 'C'], view = { verdict: false, claim: 'A0', evidence: 0 };
    const STATES = ['not checked', 'supported', 'contradicted', 'can’t check'];
    const answerCard = (k, P, mark) => {
      let h = md(D[k].text);
      if (mark) D[k].claims.forEach((c, i) => { const v = P.picks[k + i] || 0; h = h.replace(esc(c), `<button class="as-claim s${v}${view.claim === k+i ? ' ax-selected' : ''}" data-c="${k + i}" title="Select this claim to compare with a source">${esc(c)}<sup>${STATES[v]}</sup></button>`); });
      return `<div class="as-card"><h4>Answer ${k} ${real('real Qwen3-0.6B')}</h4><p class="as-prm">Prompt: “${esc(D[k].prompt)}”</p><div class="as-ansx">${h}</div></div>`;
    };
    const rank = (key, P) => `<div class="as-rank"><small>Use each rank once: 1, 2, 3.</small>${K.map((k) => `<label>${k}: <select data-r="${key}${k}"><option value="">–</option>${[1, 2, 3].map((n) => `<option${P.picks[key + k] == n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`).join('')}</div>`;
    const ranked = (key, P) => K.every(k => P.picks[key+k]) && new Set(K.map(k => String(P.picks[key+k]))).size === K.length;
    const bindRank = (P) => document.querySelectorAll('[data-r]').forEach((s) => (s.onchange = () => { P.picks[s.dataset.r] = s.value; P.regate(); }));
    const ev = () => `<div class="as-card as-ev"><h4>Evidence sheet · choose a passage</h4>${D.evidence.map((e,i) => `<div class="as-evi ${view.evidence === i ? 'ax-source-selected' : ''}"><button class="btn small" data-e="${i}">Compare E${i+1}</button> <b>${esc(e.src)}</b> <a href="${e.url}" target="_blank" rel="noopener">Open source ↗</a><p>${esc(e.text)}</p></div>`).join('')}</div>`;
    const comparison = P => {
      const key = view.claim, claim = D[key[0]].claims[Number(key.slice(1))], evidence = D.evidence[view.evidence];
      const saved = P.evidenceLinks?.[key], assessed = P.picks[key] || 0;
      const basis = assessed && saved != null ? `Saved assessment: ${STATES[assessed]} using E${saved + 1}.${saved !== view.evidence ? ' Reviewing another passage; choose an assessment to update it.' : ''}` : 'This claim has not been assessed yet.';
      return `<div class="ax-evidence-pair"><section><small>Selected claim · Answer ${key[0]}</small><p>${esc(claim)}</p></section><span class="ax-compare-arrow">↔</span><section><small>Selected passage · E${view.evidence+1}</small><p>${esc(evidence.text)}</p></section></div><div class="ax-assess"><b>Your assessment:</b>${STATES.map((state,i)=>`<button class="btn ${P.picks[key] === i ? 'primary' : ''}" data-assess="${i}">${['○','✓','✕','?'][i]} ${state}</button>`).join('')}<span>${basis} A missing claim is not automatically false.</span></div>`;
    };
    const assessmentSummary = P => `<div class="ax-evidence-summary">${STATES.map((state,i)=>`<span>${['○','✓','✕','?'][i]} ${K.reduce((n,k)=>n+D[k].claims.filter((_,j)=>(P.picks[k+j]||0)===i).length,0)} ${state}</span>`).join('')}</div>`;
    const how = (k) => {
      const x = D[k]; let h = '';
      if (k === 'A') h = blk(B('user', 'User', x.prompt));
      if (k === 'B') h = blk(B('system', 'System', '(a search tool is available)')) + blk(B('user', 'User', x.prompt)) + `<div class="as-miss">Source not consulted: there is no retrieved document in this Case Log.</div>`;
      if (k === 'C') h = blk(B('system', 'System', '(a search tool is available · told to search first)')) + blk(B('user', 'User', x.prompt)) + blk(B('req', 'Tool request', 'Search: ' + x.search)) + blk(B('res', 'Retrieved document · ' + x.passage.title, x.passage.text));
      return `<div>${contextTray('Answer ' + k + ' · information supplied', h)}<div class="cx-route">↓ ${modelThumbnail()}</div><section class="cx-result"><b>Generated response · recorded</b>${blk(B('assistant','Assistant',x.text))}</section><div class="ax-down">${k === 'C' ? '✓ Retrieved passage supplied before the answer' : k === 'B' ? '⚠ Named sources without retrieving them' : 'No retrieved passage'}</div></div>`;
    };
    const stakes = ['A funny nickname for a pet', 'Synonyms for “happy”', 'A fictional character for a story', 'Whether a medicine dose is safe'];
    return {
      prompt: 'How tall is Mount Everest?',
      steps: [
        { chev: '🤔 Rank', title: 'Three real answers to “How tall is Mount Everest?” Rank them by trust.', line: 'Use only what you can see: 1 = trust most. Write one reason for your top pick in your notes.',
          gateHint: 'Use ranks 1, 2 and 3 once each', gate: (P) => ranked('r1', P),
          draw: (P) => `<div class="as-three3">${K.map((k) => answerCard(k, P, false)).join('')}</div>${rank('r1', P)}`, after: bindRank },
        { chev: '🔍 Check', title: 'Check each claim against the evidence sheet.', line: 'Select a claim, select a source passage, then record your assessment. These marks are your judgments, not automatic verdicts.',
          draw: (P) => `${comparison(P)}${assessmentSummary(P)}<div class="as-g4"><div class="as-three3">${K.map((k) => answerCard(k, P, true)).join('')}</div>${ev()}</div>`,
          after: P => { document.querySelectorAll('.as-claim').forEach(b => b.onclick = () => { view.claim = b.dataset.c; view.evidence = P.evidenceLinks?.[view.claim] ?? 0; P.redraw(); }); document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { view.evidence = +b.dataset.e; P.redraw(); }); document.querySelectorAll('[data-assess]').forEach(b => b.onclick = () => { P.picks[view.claim] = +b.dataset.assess; P.evidenceLinks = P.evidenceLinks || {}; P.evidenceLinks[view.claim] = view.evidence; P.redraw(); }); } },
        { chev: '✏️ Revise', title: 'Did your ranking change? Why?', line: 'Re-rank them, write what changed your mind, then reveal the evidence summary.',
          gateHint: 'Use ranks 1, 2 and 3 once each', gate: (P) => ranked('r2', P),
          draw: (P) => `<div class="as-card"><p>Your first ranking: ${K.map((k) => `${k} = ${P.picks['r1' + k] || '–'}`).join(' · ')}</p><p class="as-q">Your new ranking:</p>${rank('r2', P)}</div>
            ${view.verdict ? `<div class="as-three3">${K.map((k) => `<div class="as-card"><h4>Answer ${k}</h4><p>${esc(D.verdict[k])}</p></div>`).join('')}</div>` : '<button class="btn primary" id="asVerdict">Reveal the evidence summary</button>'}`,
          after: (P) => { bindRank(P); const b = $('#asVerdict'); if (b) b.onclick = () => { view.verdict = true; P.redraw(); }; } },
        { chev: '👀 How made', title: 'Only one answer had its source in the Case Log.', line: 'C searched first. B named sources it never consulted.',
          draw: () => `<div class="as-three3">${K.map(how).join('')}</div>` },
        { chev: '🔗 Generalize', title: 'Check harder when a mistake would cost more. A source only counts once you check it.', line: 'Number these uses from 1 (least checking needed) to 4 (most).',
          draw: (P) => `<div class="as-card as-stakes">${stakes.map((t, i) => `<label><select data-k="${i}"><option value="">–</option>${[1, 2, 3, 4].map((n) => `<option${P.picks['k' + i] == n ? ' selected' : ''}>${n}</option>`).join('')}</select> ${t}</label>`).join('')}</div>
            <div class="as-card"><p><b>Evidence vs. explanation:</b> a long, careful explanation is not evidence. A cited source is stronger, but only once you check that it exists and says what the answer claims.</p></div>`,
          after: (P) => document.querySelectorAll('.as-stakes select').forEach((s) => (s.onchange = () => { P.picks['k' + s.dataset.k] = s.value; })) },
      ],
    };
  }));
})();
