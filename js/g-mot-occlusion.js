(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    stage: $('#stage'), canvas: $('#board'), hudLabel: $('#hudLabel'), hudScore: $('#hudScore'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    floats: $('#floats'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var ctx = els.canvas.getContext('2d');
  var view = { size: 0 };

  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 10,
            circles: [], occluders: [], phase: 'show', phaseEnd: 0, selected: 0, needed: 3,
            best: 0, lastTs: 0 };

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

  function initRound() {
    S.round += 1;
    var size = view.size;
    S.circles = [];
    var positions = [];
    for (var i = 0; i < 8; i++) {
      var tries = 0, x, y;
      do {
        x = 30 + Math.random() * (size - 60);
        y = 30 + Math.random() * (size - 60);
        tries++;
        var ok = true;
        for (var j = 0; j < positions.length; j++) {
          var dx = positions[j].x - x, dy = positions[j].y - y;
          if (Math.sqrt(dx*dx + dy*dy) < 46) { ok = false; break; }
        }
      } while (!ok && tries < 200);
      positions.push({ x: x, y: y });
      var speed = 50 + Math.random() * 30;
      var ang = Math.random() * Math.PI * 2;
      S.circles.push({
        x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        isTarget: i < 3, selected: false
      });
    }
    // shuffle targets
    for (var i = S.circles.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = S.circles[i].isTarget; S.circles[i].isTarget = S.circles[j].isTarget; S.circles[j].isTarget = t;
    }
    // occluders (2 rectangles)
    S.occluders = [
      { x: size * 0.2, y: size * 0.3, w: size * 0.25, h: size * 0.15 },
      { x: size * 0.55, y: size * 0.6, w: size * 0.3, h: size * 0.12 }
    ];
    S.phase = 'show';
    S.phaseEnd = performance.now() + 1200;
    S.selected = 0;
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0;
    initRound();
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
    if (S.mode !== 'playing' || S.phase !== 'select') return;
    var rect = els.canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) * (view.size / rect.width);
    var py = (e.clientY - rect.top) * (view.size / rect.height);
    var best = -1, bestD = 22;
    for (var i = 0; i < S.circles.length; i++) {
      var c = S.circles[i];
      if (c.selected) continue;
      var d = Math.hypot(c.x - px, c.y - py);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best === -1) return;
    S.circles[best].selected = true;
    S.selected += 1;
    if (S.selected >= S.needed) {
      var allTargets = S.circles.every(function (c) { return !c.isTarget || c.selected; });
      var falsePos = S.circles.filter(function (c) { return c.selected && !c.isTarget; }).length;
      if (allTargets && falsePos === 0) {
        S.hits += 1; S.score += 100;
        addFloat('+100', '#d9ff4a');
      } else {
        S.misses += 1; S.score = Math.max(0, S.score - 20);
        addFloat('خطأ', '#ff5c6c');
      }
      setTimeout(nextRound, 900);
    }
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
    initRound();
    syncHud();
  }

  function syncHud() {
    els.hudScore.textContent = fmt(S.score);
    els.hudLabel.textContent = (S.phase === 'show' ? 'شاهد' : S.phase === 'move' ? 'تتبع...' : 'اختر الـ3');
    var pct = (S.round / S.total) * 100;
    els.meterFill.style.width = Math.min(100, pct).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function endGame() {
    S.mode = 'over';
    if (S.score > S.best) { S.best = S.score; write('nabd.best.mot-occlusion', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function render(now) {
    if (!view.size) return;
    var size = view.size;
    ctx.clearRect(0, 0, size, size);
    // phase transitions
    if (S.phase === 'show' && now >= S.phaseEnd) { S.phase = 'move'; S.phaseEnd = now + 4000; }
    else if (S.phase === 'move' && now >= S.phaseEnd) { S.phase = 'select'; S.phaseEnd = Infinity; }

    if (S.phase === 'move') {
      var dt = 1 / 60;
      S.circles.forEach(function (c) {
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x < 14 || c.x > size - 14) c.vx *= -1;
        if (c.y < 14 || c.y > size - 14) c.vy *= -1;
        c.x = Math.max(14, Math.min(size - 14, c.x));
        c.y = Math.max(14, Math.min(size - 14, c.y));
      });
    }

    // draw occluders
    S.occluders.forEach(function (o) {
      ctx.fillStyle = 'rgba(40,40,50,0.85)';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeRect(o.x, o.y, o.w, o.h);
    });

    // draw circles (hide behind occluders)
    S.circles.forEach(function (c) {
      var hidden = S.occluders.some(function (o) {
        return c.x > o.x && c.x < o.x + o.w && c.y > o.y && c.y < o.y + o.h;
      });
      if (hidden && S.phase === 'move') return; // occluded
      ctx.beginPath();
      ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
      if (S.phase === 'show' && c.isTarget) {
        ctx.fillStyle = '#d9ff4a'; ctx.shadowColor = '#d9ff4a'; ctx.shadowBlur = 16;
      } else if (c.selected) {
        ctx.fillStyle = c.isTarget ? '#d9ff4a' : '#ff5c6c'; ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    syncHud();
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
    S.best = Number(read('nabd.best.mot-occlusion', 0)) || 0;
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
