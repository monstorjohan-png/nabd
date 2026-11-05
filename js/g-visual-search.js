(function () {
  'use strict';
  var COLORS = [
    { name: 'red', value: '#ef4444' },
    { name: 'blue', value: '#3b82f6' },
    { name: 'green', value: '#22c55e' },
    { name: 'yellow', value: '#eab308' }
  ];
  var SHAPES = ['circle', 'square', 'triangle'];

  function drawShape(ctx, shape, color, x, y, r) {
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    if (shape === 'circle') {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (shape === 'square') {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.strokeRect(x - r, y - r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r * 0.7);
      ctx.lineTo(x - r, y + r * 0.7);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  var $ = function (s) { return document.querySelector(s); };
  var els = {
    stage: $('#stage'), canvas: $('#board'), hudLabel: $('#hudLabel'),
    hudScore: $('#hudScore'), meter: $('#meter'), meterFill: $('#meterFill'),
    meterText: $('#meterText'), floats: $('#floats'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var ctx = els.canvas.getContext('2d');
  var view = { size: 0, cx: 0, cy: 0 };

  var S = {
    mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 15,
    roundStart: 0, timeSum: 0, target: null, cells: [], gridCols: 0, gridRows: 0,
    phase: 'show', // show | search
    phaseEnd: 0, best: 0, lastTs: 0
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
    var cols = S.round <= 5 ? 4 : S.round <= 10 ? 5 : 6;
    var rows = cols;
    S.gridCols = cols; S.gridRows = rows;

    // target feature
    var tColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    var tShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

    // distractor types: same color diff shape, diff color same shape
    var d1 = { color: tColor, shape: SHAPES.filter(function (s) { return s !== tShape; })[Math.floor(Math.random() * 2)] };
    var d2color = COLORS.filter(function (c) { return c.name !== tColor.name; })[Math.floor(Math.random() * 3)];
    var d2 = { color: d2color, shape: tShape };

    S.target = { color: tColor, shape: tShape };

    var cells = [];
    var targetIndex = Math.floor(Math.random() * (cols * rows));
    for (var i = 0; i < cols * rows; i++) {
      if (i === targetIndex) {
        cells.push({ isTarget: true, color: tColor, shape: tShape });
      } else {
        var useD1 = Math.random() < 0.5;
        cells.push({ isTarget: false, color: useD1 ? d1.color : d2.color, shape: useD1 ? d1.shape : d2.shape });
      }
    }
    S.cells = cells;

    S.phase = 'show';
    S.phaseEnd = performance.now() + 1200;
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0;
    S.timeSum = 0;
    genRound();
    syncHud();
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
    if (S.score > S.best) { S.best = S.score; write('nabd.best.visual-search', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.time.textContent = avg + ' ms';
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function resolveHit(cell, idx) {
    if (S.phase !== 'search') return;
    var elapsed = performance.now() - S.roundStart;
    if (cell.isTarget) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(50 * (1 - elapsed / 4000)));
      S.score += pts;
      S.timeSum += elapsed;
      addFloat('+' + pts + ' صحيح', '#d9ff4a');
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 20);
      addFloat('خطأ', '#ff5c6c');
      // highlight target
      flashTarget();
    }
    nextRound();
  }

  function flashTarget() {
    var idx = S.cells.findIndex(function (c) { return c.isTarget; });
    // store for render highlight
    S.flashUntil = performance.now() + 600;
    S.flashIdx = idx;
  }

  function addFloat(text, color) {
    var el = document.createElement('span');
    el.className = 'float';
    el.textContent = text;
    el.style.color = color;
    el.style.setProperty('--dx', ((Math.random() - 0.5) * 40).toFixed(1) + 'px');
    els.floats.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  function nextRound() {
    if (S.round >= S.total) { endGame(); return; }
    genRound();
    syncHud();
  }

  function render(now) {
    if (!view.size) return;
    ctx.clearRect(0, 0, view.size, view.size);
    var size = view.size;
    var cols = S.gridCols || 4;
    var rows = S.gridRows || 4;
    var pad = 10;
    var cellW = (size - pad * 2) / cols;
    var cellH = (size - pad * 2) / rows;
    var r = Math.min(cellW, cellH) * 0.28;

    // target preview
    if (S.phase === 'show' && S.target) {
      // draw target big in center
      var cx = size / 2, cy = size / 2;
      drawShape(ctx, S.target.shape, S.target.color.value, cx, cy, r * 2.4);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 13px "IBM Plex Sans Arabic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('احفظ الهدف', cx, cy + r * 2.4 + 22);
      if (now >= S.phaseEnd) {
        S.phase = 'search';
        S.roundStart = performance.now();
      }
      return;
    }

    // grid
    for (var i = 0; i < S.cells.length; i++) {
      var c = S.cells[i];
      var col = i % cols;
      var row = Math.floor(i / cols);
      var x = pad + col * cellW + cellW / 2;
      var y = pad + row * cellH + cellH / 2;
      drawShape(ctx, c.shape, c.color.value, x, y, r);

      // flash target after wrong
      if (S.flashIdx === i && now < S.flashUntil) {
        ctx.strokeStyle = '#d9ff4a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // timeout check
    if (S.phase === 'search' && (now - S.roundStart) > 4000) {
      S.misses += 1;
      S.score = Math.max(0, S.score - 10);
      addFloat('انتهى الوقت', '#ff5c6c');
      flashTarget();
      nextRound();
    }
  }

  function handleTap(e) {
    if (S.mode !== 'playing' || S.phase !== 'search') return;
    var rect = els.canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) * (view.size / rect.width);
    var py = (e.clientY - rect.top) * (view.size / rect.height);
    var pad = 10;
    var cols = S.gridCols, rows = S.gridRows;
    var cellW = (view.size - pad * 2) / cols;
    var cellH = (view.size - pad * 2) / rows;
    var col = Math.floor((px - pad) / cellW);
    var row = Math.floor((py - pad) / cellH);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    var idx = row * cols + col;
    resolveHit(S.cells[idx], idx);
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
    S.best = Number(read('nabd.best.visual-search', 0)) || 0;
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
