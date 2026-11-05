(function () {
  'use strict';
  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
  var SHAPES = ['circle', 'square'];
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
  var view = { size: 0 };

  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 20,
            cells: [], targetIdx: -1, cols: 0, rows: 0, trialStart: 0, timeSum: 0, best: 0 };

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

  function drawShape(ctx, shape, color, x, y, r) {
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    if (shape === 'circle') {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.strokeRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function newTrial() {
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    var cols = S.round <= 6 ? 5 : S.round <= 12 ? 6 : 7;
    var rows = cols;
    S.cols = cols; S.rows = rows;
    var baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    var targetColor;
    do { targetColor = COLORS[Math.floor(Math.random() * COLORS.length)]; } while (targetColor === baseColor);
    var shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    S.targetIdx = Math.floor(Math.random() * (cols * rows));
    S.cells = [];
    for (var i = 0; i < cols * rows; i++) {
      S.cells.push({ color: (i === S.targetIdx) ? targetColor : baseColor, shape: shape });
    }
    S.trialStart = performance.now();
    els.hudLabel.textContent = 'جولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
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
    var elapsed = performance.now() - S.trialStart;
    if (idx === S.targetIdx) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(60 * (1 - elapsed / 2000)));
      S.score += pts;
      S.timeSum += elapsed;
      addFloat('+' + pts, '#d9ff4a');
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 10);
      addFloat('خطأ', '#ff5c6c');
    }
    newTrial();
  }

  function addFloat(text, color) {
    var el = document.createElement('span');
    el.className = 'float'; el.textContent = text; el.style.color = color;
    el.style.setProperty('--dx', ((Math.random() - 0.5) * 40).toFixed(1) + 'px');
    els.floats.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
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
    if (S.score > S.best) { S.best = S.score; write('nabd.best.popout-search', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.time.textContent = avg;
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function render() {
    if (!view.size) return;
    var size = view.size;
    ctx.clearRect(0, 0, size, size);
    var cols = S.cols, rows = S.rows;
    var pad = 8;
    var cellW = (size - pad * 2) / cols;
    var cellH = (size - pad * 2) / rows;
    var r = Math.min(cellW, cellH) * 0.3;
    for (var i = 0; i < S.cells.length; i++) {
      var c = S.cells[i];
      var col = i % cols;
      var row = Math.floor(i / cols);
      var x = pad + col * cellW + cellW / 2;
      var y = pad + row * cellH + cellH / 2;
      drawShape(ctx, c.shape, c.color, x, y, r);
    }
  }

  function loop() {
    render();
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
    S.best = Number(read('nabd.best.popout-search', 0)) || 0;
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
