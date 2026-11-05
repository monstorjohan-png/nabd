(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    display: $('#display'), input: $('#input'), btn: $('#btn'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), err: $('#statErr'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 12,
            target: 0, anchor: 0, trialStart: 0, errSum: 0, best: 0 };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function newTrial() {
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    S.target = 1 + Math.floor(Math.random() * 100);
    S.anchor = 1 + Math.floor(Math.random() * 100);
    els.display.textContent = 'مرساة: ' + S.anchor + ' — قدّر الهدف (1-100)';
    els.input.value = '';
    els.input.focus();
    S.trialStart = performance.now();
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function submit() {
    if (S.mode !== 'playing') return;
    var val = Number(els.input.value);
    if (isNaN(val)) return;
    var err = Math.abs(val - S.target);
    if (err <= 10) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(50 * (1 - err / 10)));
      S.score += pts;
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 10);
    }
    S.errSum += err;
    els.display.textContent = 'الهدف: ' + S.target + ' · تقديرك: ' + val + ' (خطأ ' + err + ')';
    setTimeout(newTrial, 1200);
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.errSum = 0;
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
    var avgErr = S.round ? Math.round(S.errSum / S.round) : 0;
    if (S.score > S.best) { S.best = S.score; write('nabd.best.anchoring', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.err.textContent = avgErr;
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    els.btn.addEventListener('click', submit);
    els.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
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
    S.best = Number(read('nabd.best.anchoring', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
