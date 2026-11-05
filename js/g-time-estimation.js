(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    display: $('#display'), btn: $('#btnAction'),
    hudLabel: $('#modeLabel'), meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), err: $('#statErr'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 12,
            phase: 'show', target: 0, startAt: 0, pressStart: 0, best: 0, timer: null, errSum: 0 };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function startTrial() {
    if (S.mode !== 'playing') return;
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    S.target = 1500 + Math.random() * 3500; // 1.5-5s
    S.phase = 'show';
    els.display.textContent = '👀';
    els.btn.disabled = true;
    els.btn.textContent = 'شاهد...';
    els.hudLabel.textContent = 'جولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;

    // show duration via rotating dot
    var start = performance.now();
    var raf;
    function show(ts) {
      if (S.mode !== 'playing') return;
      var elapsed = ts - start;
      if (elapsed >= S.target) {
        els.display.textContent = '؟';
        S.phase = 'estimate';
        els.btn.disabled = false;
        els.btn.textContent = 'اضغط (قدّر)';
        cancelAnimationFrame(raf);
        return;
      }
      var angle = (elapsed / S.target) * 360;
      els.display.textContent = Math.round(elapsed / 100) / 10 + 's';
      raf = requestAnimationFrame(show);
    }
    raf = requestAnimationFrame(show);
  }

  function press() {
    if (S.mode !== 'playing' || S.phase !== 'estimate') return;
    S.phase = 'done';
    els.btn.disabled = true;
    var estimated = (performance.now() - S.startAt) / 1; // not used
    // We measure from when estimate phase started
    // Actually: user presses after seeing '؟'. Measure reaction as the duration they held? 
    // Simplify: time from '؟' shown to press = their estimate of target
    var est = performance.now() - (S.targetShownAt || performance.now());
    var err = Math.abs(est - S.target);
    var pts = Math.max(0, Math.round(100 * (1 - err / S.target)));
    if (err < S.target * 0.15) { S.hits += 1; }
    else { S.misses += 1; }
    S.score += pts;
    S.errSum += err;
    els.display.textContent = (est / 1000).toFixed(2) + 's (هدف ' + (S.target / 1000).toFixed(2) + 's)';
    els.btn.textContent = (err < S.target * 0.15 ? '✓ ' : '') + pts + ' نقطة';
    setTimeout(function () {
      if (S.round >= S.total) endGame();
      else startTrial();
    }, 1200);
  }

  // track when estimate phase started
  var origStartTrial = startTrial;
  // patch: set targetShownAt
  function startTrialWrapped() {
    origStartTrial();
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.errSum = 0;
    showScreen(null);
    startTrial();
  }

  // override startTrial to set targetShownAt
  var _startTrial = startTrial;
  startTrial = function () {
    if (S.mode !== 'playing') return;
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    S.target = 1500 + Math.random() * 3500;
    S.phase = 'show';
    els.display.textContent = '👀';
    els.btn.disabled = true;
    els.btn.textContent = 'شاهد...';
    els.hudLabel.textContent = 'جولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
    var start = performance.now();
    var raf;
    function show(ts) {
      if (S.mode !== 'playing') return;
      var elapsed = ts - start;
      if (elapsed >= S.target) {
        els.display.textContent = '؟';
        S.phase = 'estimate';
        S.targetShownAt = performance.now();
        els.btn.disabled = false;
        els.btn.textContent = 'اضغط (قدّر)';
        cancelAnimationFrame(raf);
        return;
      }
      els.display.textContent = (elapsed / 1000).toFixed(2) + 's';
      raf = requestAnimationFrame(show);
    }
    raf = requestAnimationFrame(show);
  };

  function showScreen(name) {
    Object.keys(els.screens).forEach(function (k) {
      var el = els.screens[k];
      if (!el) return;
      el.classList.toggle('is-active', k === name);
      el.setAttribute('aria-hidden', k === name ? 'false' : 'true');
    });
  }

  function endGame() {
    S.mode = 'over';
    var avgErr = S.round ? Math.round(S.errSum / S.round) : 0;
    if (S.score > S.best) { S.best = S.score; write('nabd.best.time-estimation', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.err.textContent = avgErr + ' ms';
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    els.btn.addEventListener('click', press);
    els.screens.start.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-start]');
      if (btn) startGame();
    });
    els.screens.result.addEventListener('click', function (e) {
      if (e.target.closest('#btnReplay')) { startGame(); return; }
      if (e.target.closest('#btnHome')) { location.href = 'games.html'; }
    });
  }

  function init() {
    S.best = Number(read('nabd.best.time-estimation', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
