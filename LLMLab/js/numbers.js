/* LLMLab — "Show the numbers": one toggle that adds a panel of live numbers under the current view.
   Each tab registers NT.numbers[station] = () => html | null. The panel shows the formula with this view's real values filled in. */
'use strict';
(() => {
  const { $ } = NT;
  NT.numbers = NT.numbers || {};
  const S = NT.state; S.nums = false;
  // building blocks the providers use
  const N = (NT.nf = {
    f: (x, d = 3) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(d),
    big: (x) => (x >= 1000 ? NT.int(Math.round(x)) : x >= 100 ? x.toFixed(1) : x >= 10 ? x.toFixed(2) : x.toFixed(3)),
    eq: (html) => `<div class="nrow">${html}</div>`,
    formula: (html) => `<div class="nform">${html}</div>`,
    box: (title, rows) => `<div class="numbers" id="numbersBox"><div class="nhead">${title}</div>${rows.join('')}</div>`,
  });
  const btn = $('#numBtn'), host = $('#numbersHost');
  let queued = false;
  function refresh() {
    queued = false;
    if (!btn || !host) return;
    const fn = NT.numbers[S.station]; let html = null;
    if (fn) { try { html = fn(); } catch (e) { html = null; } }
    btn.hidden = !fn; btn.classList.toggle('dim', !html); btn.title = html ? 'Show or hide the live numbers behind this view' : 'This view has no numbers to show';
    host.innerHTML = S.nums && html ? html : '';
  }
  NT.numbersRefresh = () => { if (queued) return; queued = true; requestAnimationFrame(refresh); };
  // every view finishes a draw by setting the status line, so that is the cue to refresh
  const setStatus = NT.setStatus; NT.setStatus = (t) => { setStatus(t); NT.numbersRefresh(); };
  function toggle(on) { S.nums = on == null ? !S.nums : on; btn.setAttribute('aria-pressed', S.nums); btn.textContent = S.nums ? 'Hide the numbers' : 'Show the numbers'; refresh(); }
  if (btn) btn.addEventListener('click', () => toggle());
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || (e.key !== 'n' && e.key !== 'N')) return;
    const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    if (btn && !btn.hidden) toggle();
  });
  NT.on((what) => { if (what === 'text' || what === 'tk') NT.numbersRefresh(); });
  NT.numbersRefresh();
})();
