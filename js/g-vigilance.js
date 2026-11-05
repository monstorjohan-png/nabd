(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    stage: $('#stage'), canvas: $('#board'), hudLabel: $('#hudLabel'), hudScore: $('#hudScore'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    floats: $('#floats'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), fa: $('#statFa'), miss: $('#statMiss'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var ctx = els.canvas.getContext('2d');
  var view = { size: 0, cx: 0, cy: 0, R: 0 };

  var S = {
    mode: 'idle', score: 0, hits: 0, fa: 0, misses: 0, jumps: 0,
    duration: 120000, startAt: 0, nextJump: 0, lastJump: 0, jumpWindow: 1500,
    angle: 0, speed: 90, // degrees per second
    targets: [], // {t}
    best: 0, lastTs: 0
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
    view.size = size; view.cx = size / 2; view.cy = size / 2; view.R = size * 0.38;
  }

  function scheduleJump() {
    // next jump in 3-7 seconds
    S.nextJump = performance.now() + 3000 + Math.random() * 4000;
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.fa = 0; S.misses = 0; S.jumps = 0;
    S.startAt = performance.now();
    S.angle = 0;
    S.targets = [];
    scheduleJump();
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

  function tap() {
    if (S.mode !== 'playing') return;
    var now = performance.now();
    // find a recent jump within window
    var recent = S.targets.filter(function (j) { return !j.caught && (now - j.t) <= S.jumpWindow && (now - j.t) >= -200; });
    if (recent.length) {
      var j = recent[0];
      j.caught = true;
      S.hits += 1; S.score += 10;
      addFloat('+10', '#d9ff4a');
    } else {
      S.fa += 1; S.score = Math.max(0, S.score - 5);
      addFloat('خطأ', '#ff5c6c');
    }
    els.hudScore.textContent = (S.score).toLocaleString('en-US');
  }

  function addFloat(text, color) {
    var el = document.createElement('span');
    el.className = 'float'; el.textContent = text; el.style.color = color;
    el.style.setProperty('--dx', ((Math.random() - 0.5) * 40).toFixed(1) + 'px');
    els.floats.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  function endGame() {
    S.mode = 'over';
    // count missed jumps
    S.targets.forEach(function (j) { if (!j.caught) S.misses += 1; });
    if (S.score > S.best) { S.best = S.score; write('nabd.best.vigilance', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = (S.score).toLocaleString('en-US');
    els.result.hits.textContent = String(S.hits);
    els.result.fa.textContent = String(S.fa);
    els.result.miss.textContent = String(S.misses);
    els.result.extra.textContent = 'أفضل نتيجة: ' + (S.best).toLocaleString('en-US');
    showScreen('result');
  }

  function render(now) {
    if (!view.size) return;
    ctx.clearRect(0, 0, view.size, view.size);
    var size = view.size;
    var cx = view.cx, cy = view.cy, R = view.R;

    // clock face
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    // ticks
    for (var i = 0; i < 12; i++) {
      var a = (i * 30 - 90) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx + (R - 8) * Math.cos(a), cy + (R - 8) * Math.sin(a));
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // hand
    var rad = (S.angle - 90) * Math.PI / 180;
    ctx.save();
    ctx.strokeStyle = '#d9ff4a';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#d9ff4a';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (R - 14) * Math.cos(rad), cy + (R - 14) * Math.sin(rad));
    ctx.stroke();
    ctx.restore();
    // center
    ctx.fillStyle = '#d9ff4a';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  }

  function loop(ts) {
    var dt = S.lastTs ? Math.min((ts - S.lastTs) / 1000, 0.05) : 0;
    S.lastTs = ts;
    if (S.mode === 'playing') {
      var elapsed = ts - S.startAt;
      var remaining = Math.max(0, S.duration - elapsed);
      var mins = Math.floor(remaining / 60000);
      var secs = Math.floor((remaining % 60000) / 1000);
      els.modeLabel.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
      els.meterFill.style.width = ((elapsed / S.duration) * 100).toFixed(1) + '%';
      els.meterText.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
      els.hudLabel.textContent = 'يقظة';
      els.hudScore.textContent = (S.score).toLocaleString('en-US');

      // schedule jumps
      if (ts >= S.nextJump) {
        S.targets.push({ t: ts, caught: false });
        S.jumps += 1;
        // extra step
        S.angle += S.speed * 0.4;
        scheduleJump();
      }
      // move hand
      S.angle = (S.angle + S.speed * dt) % 360;

      if (elapsed >= S.duration) endGame();
    }
    render(ts);
    requestAnimationFrame(loop);
  }

  function bind() {
    els.stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      if (S.mode === 'playing') { e.preventDefault(); tap(); }
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
    S.best = Number(read('nabd.best.vigilance', 0)) || 0;
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
