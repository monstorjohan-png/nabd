(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    reward: $('#reward'), fill: $('#waitFill'), status: $('#status'),
    btnNow: $('#btnNow'), btnWait: $('#btnWait'),
    hudLabel: $('#modeLabel'), meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              wait: $('#statWait'), rush: $('#statRush'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, wait: 0, rush: 0, round: 0, total: 15,
            progress: 0, startAt: 0, claimed: false, best: 0, timer: null };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function currentMult() { return Math.max(1, Math.min(5, Math.floor(S.progress * 4) + 1)); }

  function startRound() {
    S.progress = 0;
    S.claimed = false;
    S.startAt = performance.now();
    els.fill.style.width = '0%';
    els.reward.textContent = '🎁';
    els.status.textContent = 'انتظر حتى يكتمل الشريط، أو خذ المكافأة الآن (أصغر).';
    els.btnNow.disabled = false;
    els.btnWait.disabled = true;
    els.btnNow.textContent = 'خذ الآن (1×)';
  }

  function tick() {
    if (S.mode !== 'playing' || S.claimed) return;
    var elapsed = (performance.now() - S.startAt) / 4000;
    S.progress = Math.min(1, elapsed);
    els.fill.style.width = (S.progress * 100).toFixed(1) + '%';
    var m = currentMult();
    els.btnNow.textContent = 'خذ الآن (' + m + '×)';
    if (S.progress >= 0.99 && !S.claimed) {
      els.btnWait.disabled = false;
      els.status.textContent = 'اكتمل! اضغط «انتظر» للمكافأة الكاملة (5×).';
    }
    if (S.progress >= 1 && !S.claimed) {
      // auto-claim max
      claim(5, true);
    }
  }

  function claim(mult, waited) {
    if (S.claimed) return;
    S.claimed = true;
    var pts = mult * 20;
    S.score += pts;
    if (waited) { S.wait += 1; els.reward.textContent = '🎉 +' + pts; }
    else { S.rush += 1; els.reward.textContent = '📦 +' + pts; }
    els.status.textContent = (waited ? 'صبر! +' : 'أخذت الآن. +') + pts + ' نقطة.';
    els.btnNow.disabled = true;
    els.btnWait.disabled = true;
    S.round += 1;
    els.hudLabel.textContent = 'جولة ' + Math.min(S.round + 1, S.total) + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
    setTimeout(function () {
      if (S.round >= S.total) endGame();
      else startRound();
    }, 1100);
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.wait = 0; S.rush = 0; S.round = 0;
    showScreen(null);
    startRound();
    S.timer = setInterval(tick, 50);
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
    clearInterval(S.timer);
    if (S.score > S.best) { S.best = S.score; write('nabd.best.delayed-gratification', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.wait.textContent = String(S.wait);
    els.result.rush.textContent = String(S.rush);
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    els.btnNow.addEventListener('click', function () { if (S.mode === 'playing' && !S.claimed) claim(currentMult(), false); });
    els.btnWait.addEventListener('click', function () { if (S.mode === 'playing' && !S.claimed && S.progress >= 0.99) claim(5, true); });
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
    S.best = Number(read('nabd.best.delayed-gratification', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
