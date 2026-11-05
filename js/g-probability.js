(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    coin: $('#coin'), hint: $('#hint'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), acc: $('#statAcc'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 30,
            coinResult: 'H', answered: false, best: 0 };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function flip() {
    S.coinResult = Math.random() < 0.7 ? 'H' : 'T';
  }

  function newTrial() {
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    S.answered = false;
    flip();
    els.coin.textContent = '🪙';
    els.hint.textContent = 'تنبّأ: Heads (H) أم Tails (T)?';
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function handlePred(pred) {
    if (S.mode !== 'playing' || S.answered) return;
    S.answered = true;
    var correct = pred === S.coinResult;
    els.coin.textContent = S.coinResult === 'H' ? '👑' : '⬜';
    if (correct) {
      S.hits += 1;
      S.score += 10;
      els.hint.textContent = '✓ صحيح! ' + (S.coinResult === 'H' ? 'Heads' : 'Tails');
    } else {
      S.misses += 1;
      els.hint.textContent = '✗ خطأ. كانت ' + (S.coinResult === 'H' ? 'Heads' : 'Tails');
    }
    setTimeout(newTrial, 700);
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0;
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
    var acc = S.round ? Math.round((S.hits / S.round) * 100) : 0;
    if (S.score > S.best) { S.best = S.score; write('nabd.best.probability', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.acc.textContent = acc + '%';
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    document.querySelectorAll('.pred-btn').forEach(function (b) {
      b.addEventListener('click', function () { handlePred(b.getAttribute('data-pred')); });
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
    S.best = Number(read('nabd.best.probability', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
