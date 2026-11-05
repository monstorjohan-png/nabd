(function () {
  'use strict';
  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    grid: $('#grid'), meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 15,
            colors: [], changed: false, changedIdx: -1, phase: 'show', phaseEnd: 0,
            trialStart: 0, timeSum: 0, best: 0 };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function renderGrid(colors) {
    els.grid.innerHTML = '';
    for (var i = 0; i < colors.length; i++) {
      var c = document.createElement('div');
      c.className = 'cd-cell';
      c.style.background = colors[i];
      els.grid.appendChild(c);
    }
  }

  function newTrial() {
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    var n = 4;
    S.colors = [];
    for (var i = 0; i < n; i++) S.colors.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
    S.changed = Math.random() < 0.5;
    S.changedIdx = Math.floor(Math.random() * n);
    S.phase = 'show';
    S.phaseEnd = performance.now() + 1000;
    renderGrid(S.colors);
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function handleAns(ans) {
    if (S.mode !== 'playing' || S.phase !== 'probe') return;
    var elapsed = performance.now() - S.trialStart;
    var saidChanged = (ans === 'changed');
    if (saidChanged === S.changed) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(40 * (1 - elapsed / 2000)));
      S.score += pts;
      S.timeSum += elapsed;
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 15);
    }
    newTrial();
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.timeSum = 0;
    showScreen(null);
    newTrial();
  }

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
    var avg = S.hits ? Math.round(S.timeSum / S.hits) : 0;
    if (S.score > S.best) { S.best = S.score; write('nabd.best.change-detection', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.time.textContent = avg;
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    document.querySelectorAll('.cd-btn').forEach(function (b) {
      b.addEventListener('click', function () { handleAns(b.getAttribute('data-ans')); });
    });
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
    S.best = Number(read('nabd.best.change-detection', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
    requestAnimationFrame(loop);
  }

  function loop(ts) {
    if (S.mode === 'playing') {
      if (S.phase === 'show' && ts >= S.phaseEnd) {
        // hide
        var cells = els.grid.querySelectorAll('.cd-cell');
        for (var i = 0; i < cells.length; i++) cells[i].style.opacity = '0.3';
        S.phase = 'blank';
        S.phaseEnd = ts + 500;
      } else if (S.phase === 'blank' && ts >= S.phaseEnd) {
        // show probe (change one color if changed)
        var probeColors = S.colors.slice();
        if (S.changed) probeColors[S.changedIdx] = COLORS[Math.floor(Math.random() * COLORS.length)];
        renderGrid(probeColors);
        S.phase = 'probe';
        S.phaseEnd = ts + 2000;
        S.trialStart = ts;
      } else if (S.phase === 'probe' && ts >= S.phaseEnd) {
        // timeout
        S.misses += 1;
        S.score = Math.max(0, S.score - 10);
        newTrial();
      }
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
