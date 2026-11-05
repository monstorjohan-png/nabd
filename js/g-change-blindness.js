(function () {
  'use strict';
  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    stage: $('#stage'), canvas: $('#board'), hudLabel: $('#hudLabel'), hudScore: $('#hudScore'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    floats: $('#floats'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var ctx = els.canvas.getContext('2d');
  var view = { size: 0, cx: 0, cy: 0 };

  var S = {
    mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 12,
    gridA: [], gridB: [], changed: -1, cols: 6, rows: 6,
    phase: 'A', phaseEnd: 0, roundStart: 0, timeSum: 0, best: 0, lastTs: 0
  };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function resizeStage() {
    var rect = els.stage.getBoundingClientRect();
    var size = Math.max(220, Math.min(rect.width, rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    els.canvas.width = Math.round(size * dpr);
    els.canvas.height = Math.round(size * dpr);
    els.canvas.style.width = size + 'px';
    els.canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.size = size;
  }

  function genRound() {
    S.round += 1;
    var n = S.cols * S.rows;
    S.gridA = [];
    for (var i = 0; i < n; i++) S.gridA.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
    S.gridB = S.gridA.slice();
    var idx = Math.floor(Math.random() * n);
    var newColor;
    do { newColor = COLORS[Math.floor(Math.random() * COLORS.length)]; } while (newColor === S.gridA[idx]);
    S.gridB[idx] = newColor;
    S.changed = idx;
    S.phase = 'A';
    S.phaseEnd = performance.now() + 600;
    S.roundStart = performance.now();
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.timeSum = 0;
    genRound();
    showScreen(null);
  }

  function showScreen(name) {
    Object.keys(els.screens).forEach(function (k) {
      var el = els.screens[k];
      if (!el) return;
      el.classList.toggle('is-active', k === name);
      el.setAttribute('aria-hidden', k === name ? 'false' : 'true');
    });
  }

  function handleTap(e) {
    if (S.mode !== 'playing') return;
    var rect = els.canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) * (view.size / rect.width);
    var py = (e.clientY - rect.top) * (view.size / rect.height);
    var pad = 8;
    var cellW = (view.size - pad * 2) / S.cols;
    var cellH = (view.size - pad * 2) / S.rows;
    var col = Math.floor((px - pad) / cellW);
    var row = Math.floor((py - pad) / cellH);
    if (col < 0 || col >= S.cols || row < 0 || row >= S.rows) return;
    var idx = row * S.cols + col;
    var elapsed = performance.now() - S.roundStart;
    if (idx === S.changed) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(60 * (1 - elapsed / 8000)));
      S.score += pts;
      S.timeSum += elapsed;
      addFloat('+' + pts, '#d9ff4a');
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 15);
      addFloat('خطأ', '#ff5c6c');
    }
    nextRound();
  }

  function addFloat(text, color) {
    var el = document.createElement('span');
    el.className = 'float'; el.textContent = text; el.style.color = color;
    el.style.setProperty('--dx', ((Math.random() - 0.5) * 40).toFixed(1) + 'px');
    els.floats.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  function nextRound() {
    if (S.round >= S.total) { endGame(); return; }
    genRound();
    syncHud();
  }

  function syncHud() {
    els.hudScore.textContent = fmt(S.score);
    els.hudLabel.textContent = 'جولة ' + Math.min(S.round, S.total) + ' / ' + S.total;
    var pct = (S.round / S.total) * 100;
    els.meterFill.style.width = Math.min(100, pct).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function endGame() {
    S.mode = 'over';
    var avg = S.hits ? Math.round(S.timeSum / S.hits) : 0;
    if (S.score > S.best) { S.best = S.score; write('nabd.best.change-blindness', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.time.textContent = avg;
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function render(now) {
    if (!view.size) return;
    ctx.clearRect(0, 0, view.size, view.size);
    var size = view.size;
    var pad = 8;
    var cellW = (size - pad * 2) / S.cols;
    var cellH = (size - pad * 2) / S.rows;
    var r = Math.min(cellW, cellH) * 0.38;

    // flicker: A for 600ms, blank 150ms, B for 600ms, blank 150ms
    var cycle = 1500;
    var t = (now - S.roundStart) % cycle;
    var grid = null;
    if (t < 600) grid = S.gridA;
    else if (t < 750) grid = null;
    else if (t < 1350) grid = S.gridB;
    else grid = null;

    if (grid) {
      for (var i = 0; i < grid.length; i++) {
        var col = i % S.cols;
        var row = Math.floor(i / S.cols);
        var x = pad + col * cellW + cellW / 2;
        var y = pad + row * cellH + cellH / 2;
        ctx.fillStyle = grid[i];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // timeout
    if (S.mode === 'playing' && (now - S.roundStart) > 8000) {
      S.misses += 1;
      S.score = Math.max(0, S.score - 10);
      addFloat('انتهى الوقت', '#ff5c6c');
      nextRound();
    }
  }

  function loop(ts) {
    S.lastTs = ts;
    render(ts);
    requestAnimationFrame(loop);
  }

  function bind() {
    els.stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      if (S.mode === 'playing') { e.preventDefault(); handleTap(e); }
    }, { passive: false });
    els.screens.start.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-start]');
      if (btn) startGame();
    });
    els.screens.result.addEventListener('click', function (e) {
      if (e.target.closest('#btnReplay')) { startGame(); return; }
      if (e.target.closest('#btnHome')) { location.href = 'games.html'; }
    });
    if ('ResizeObserver' in window) new ResizeObserver(resizeStage).observe(els.stage);
    else window.addEventListener('resize', resizeStage);
  }

  function init() {
    S.best = Number(read('nabd.best.change-blindness', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    resizeStage();
    bind();
    showScreen('start');
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
