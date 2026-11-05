(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    stage: $('#stage'), shape: $('#shape'),
    hudLabel: $('#modeLabel'), meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    floats: null,
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), fa: $('#statFa'), miss: $('#statMiss'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };

  var S = {
    mode: 'idle', score: 0, hits: 0, fa: 0, misses: 0, round: 0, total: 40,
    isGo: true, responded: false, trialStart: 0, best: 0, timer: null
  };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function showShape(isGo) {
    S.isGo = isGo;
    S.responded = false;
    S.trialStart = performance.now();
    els.shape.className = 'gng-shape ' + (isGo ? 'circle' : 'square');
    els.shape.classList.remove('hidden');
  }
  function hideShape() {
    els.shape.classList.add('hidden');
  }

  function startTrial() {
    if (S.mode !== 'playing') return;
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    // 60% Go, 40% No-Go
    var isGo = Math.random() < 0.6;
    showShape(isGo);
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;

    clearTimeout(S.timer);
    S.timer = setTimeout(function () {
      // trial ended without response
      if (S.mode !== 'playing') return;
      if (S.isGo && !S.responded) {
        S.misses += 1;
      }
      hideShape();
      setTimeout(startTrial, 350);
    }, 900);
  }

  function handleTap() {
    if (S.mode !== 'playing' || S.responded) return;
    S.responded = true;
    clearTimeout(S.timer);
    if (S.isGo) {
      S.hits += 1;
      S.score += 100;
    } else {
      S.fa += 1;
      S.score = Math.max(0, S.score - 150);
    }
    hideShape();
    setTimeout(startTrial, 350);
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.fa = 0; S.misses = 0; S.round = 0;
    showScreen(null);
    setTimeout(startTrial, 600);
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
    clearTimeout(S.timer);
    if (S.score > S.best) { S.best = S.score; write('nabd.best.go-nogo', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.fa.textContent = String(S.fa);
    els.result.miss.textContent = String(S.misses);
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    els.stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      if (S.mode === 'playing') { e.preventDefault(); handleTap(); }
    }, { passive: false });
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
    S.best = Number(read('nabd.best.go-nogo', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
