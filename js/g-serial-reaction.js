(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    btns: $('#btns'), info: $('#info'), meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              b1: $('#statB1'), b5: $('#statB5'), imp: $('#statImp'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  // sequence of 8 positions (0-3)
  var SEQ = [0, 2, 1, 3, 2, 0, 3, 1];
  var BLOCKS = 5;
  var TRIALS = SEQ.length * BLOCKS;
  var S = { mode: 'idle', score: 0, block: 0, trial: 0, rts: [], targetStart: 0,
            currentTarget: 0, best: null };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n).toFixed(0); }

  function buildBtns() {
    els.btns.innerHTML = '';
    for (var i = 0; i < 4; i++) {
      var b = document.createElement('button');
      b.className = 'srt-btn';
      b.type = 'button';
      b.textContent = i + 1;
      b.setAttribute('data-idx', String(i));
      b.addEventListener('click', function () { handleTap(Number(this.getAttribute('data-idx'))); });
      els.btns.appendChild(b);
    }
  }

  function highlight(idx) {
    var bs = els.btns.querySelectorAll('.srt-btn');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('is-target', Number(bs[i].getAttribute('data-idx')) === idx);
  }

  function nextTarget() {
    if (S.trial >= TRIALS) { endGame(); return; }
    S.block = Math.floor(S.trial / SEQ.length) + 1;
    S.currentTarget = SEQ[S.trial % SEQ.length];
    highlight(S.currentTarget);
    S.targetStart = performance.now();
    els.hudLabel.textContent = 'Block ' + S.block + ' / ' + BLOCKS;
    els.meterFill.style.width = ((S.trial / TRIALS) * 100).toFixed(1) + '%';
    els.meterText.textContent = S.trial + ' / ' + TRIALS;
  }

  function handleTap(idx) {
    if (S.mode !== 'playing') return;
    if (idx !== S.currentTarget) return;
    var rt = performance.now() - S.targetStart;
    S.rts.push({ block: S.block, rt: rt });
    S.trial += 1;
    nextTarget();
  }

  function blockAvg(b) {
    var rs = S.rts.filter(function (r) { return r.block === b; });
    if (!rs.length) return 0;
    return rs.reduce(function (a, r) { return a + r.rt; }, 0) / rs.length;
  }

  function startGame() {
    S.mode = 'playing';
    S.trial = 0; S.rts = [];
    showScreen(null);
    nextTarget();
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
    var b1 = blockAvg(1), b5 = blockAvg(5);
    var improvement = b1 - b5;
    var score = Math.max(0, Math.round(improvement));
    if (S.best === null || score > S.best) { S.best = score; write('nabd.best.serial-reaction', S.best); }
    els.result.kicker.textContent = (S.best === score ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(b5);
    els.result.b1.textContent = fmt(b1);
    els.result.b5.textContent = fmt(b5);
    els.result.imp.textContent = fmt(improvement) + ' ms';
    els.result.extra.textContent = 'أفضل تحسّن: ' + (S.best == null ? '—' : S.best + ' ms');
    showScreen('result');
  }

  function bind() {
    buildBtns();
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
    var raw = read('nabd.best.serial-reaction', null);
    S.best = raw == null ? null : Number(raw);
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = S.best == null ? '—' : S.best + ' ms';
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
