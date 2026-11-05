(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    display: $('#display'), meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };

  var S = {
    mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 30,
    trial: null, trialStart: 0, timeSum: 0, best: 0, timer: null
  };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function newTrial() {
    var center = Math.random() < 0.5 ? 'left' : 'right';
    var congruent = Math.random() < 0.5;
    var flanker = congruent ? center : (center === 'left' ? 'right' : 'left');
    var arrow = center === 'left' ? '←' : '→';
    var flank = flanker === 'left' ? '←' : '→';
    S.trial = { center: center, congruent: congruent };
    S.trialStart = performance.now();
    // 5 arrows: flank flank center flank flank
    els.display.textContent = flank + ' ' + flank + ' ' + arrow + ' ' + flank + ' ' + flank;
  }

  function handleAnswer(dir) {
    if (S.mode !== 'playing' || !S.trial) return;
    var elapsed = performance.now() - S.trialStart;
    var correct = dir === S.trial.center;
    if (correct) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(50 * (1 - elapsed / 2000)));
      S.score += pts;
      S.timeSum += elapsed;
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 20);
    }
    S.round += 1;
    updateHud();
    clearTimeout(S.timer);
    if (S.round >= S.total) {
      setTimeout(endGame, 400);
    } else {
      S.timer = setTimeout(function () {
        if (S.mode !== 'playing') return;
        S.misses += 1;
        S.round += 1;
        updateHud();
        if (S.round >= S.total) endGame();
        else newTrial();
      }, 2000);
      setTimeout(function () {
        if (S.mode === 'playing' && S.round < S.total) newTrial();
      }, 400);
    }
  }

  function updateHud() {
    var scorePill = document.getElementById('scorePill');
    if (scorePill) scorePill.textContent = fmt(S.score);
    var ml = document.getElementById('modeLabel');
    if (ml) ml.textContent = 'محاولة ' + Math.min(S.round + 1, S.total) + ' / ' + S.total;
    var pct = (S.round / S.total) * 100;
    els.meterFill.style.width = Math.min(100, pct).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.timeSum = 0;
    // add score pill
    var top = document.querySelector('.panel-top');
    if (top && !document.getElementById('scorePill')) {
      var sp = document.createElement('span');
      sp.className = 'mode-pill'; sp.id = 'scorePill'; sp.style.marginInlineStart = 'auto';
      sp.textContent = '0';
      var actions = top.querySelector('.panel-actions');
      if (actions) top.insertBefore(sp, actions);
    }
    showScreen(null);
    newTrial();
    clearTimeout(S.timer);
    S.timer = setTimeout(function () {
      if (S.mode !== 'playing') return;
      S.misses += 1; S.round += 1; updateHud();
      if (S.round >= S.total) endGame();
      else newTrial();
    }, 2000);
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
    var avg = S.hits ? Math.round(S.timeSum / S.hits) : 0;
    if (S.score > S.best) { S.best = S.score; write('nabd.best.flanker', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.time.textContent = avg;
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    document.querySelectorAll('.flanker-btn').forEach(function (b) {
      b.addEventListener('click', function () { handleAnswer(b.getAttribute('data-dir')); });
    });
    els.screens.start.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-start]');
      if (btn) startGame();
    });
    els.screens.result.addEventListener('click', function (e) {
      if (e.target.closest('#btnReplay')) { startGame(); return; }
      if (e.target.closest('#btnHome')) { location.href = 'games.html'; }
    });
    window.addEventListener('keydown', function (e) {
      if (S.mode !== 'playing') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); handleAnswer('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleAnswer('right'); }
    });
  }

  function init() {
    S.best = Number(read('nabd.best.flanker', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
