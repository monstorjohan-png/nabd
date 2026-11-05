(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    display: $('#display'), pad: $('#pad'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 8,
            len: 3, seq: [], input: [], phase: 'show', best: 0 };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function buildPad() {
    els.pad.innerHTML = '';
    for (var i = 0; i <= 9; i++) {
      var b = document.createElement('button');
      b.className = 'ds-btn';
      b.type = 'button';
      b.textContent = i;
      b.setAttribute('data-n', String(i));
      b.addEventListener('click', function () { handleDigit(Number(this.getAttribute('data-n'))); });
      els.pad.appendChild(b);
    }
  }

  function genSeq(len) {
    var s = [];
    for (var i = 0; i < len; i++) s.push(Math.floor(Math.random() * 10));
    return s;
  }

  function showSeq() {
    S.phase = 'show';
    S.input = [];
    els.display.textContent = '';
    var i = 0;
    function step() {
      if (i >= S.seq.length) {
        S.phase = 'input';
        els.display.textContent = '؟';
        return;
      }
      els.display.textContent = S.seq[i];
      i++;
      setTimeout(step, 700);
    }
    step();
  }

  function handleDigit(d) {
    if (S.mode !== 'playing' || S.phase !== 'input') return;
    S.input.push(d);
    els.display.textContent = S.input.join(' ');
    if (S.input.length === S.seq.length) {
      // check
      var ok = S.input.every(function (v, i) { return v === S.seq[i]; });
      if (ok) {
        S.hits += 1;
        S.best = Math.max(S.best, S.len);
        S.score = S.best * 10;
        S.len = Math.min(9, S.len + 1);
      } else {
        S.misses += 1;
        S.len = Math.max(3, S.len - 1);
      }
      S.round += 1;
      els.hudLabel.textContent = 'جولة ' + Math.min(S.round + 1, S.total) + ' / ' + S.total;
      els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
      els.meter.setAttribute('aria-valuenow', String(S.round));
      els.meterText.textContent = S.round + ' / ' + S.total;
      if (S.round >= S.total) endGame();
      else {
        S.seq = genSeq(S.len);
        setTimeout(showSeq, 900);
      }
    }
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.best = 0; S.len = 3;
    showScreen(null);
    S.seq = genSeq(S.len);
    showSeq();
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
    if (S.best > (Number(read('nabd.best.digit-span', 0)) || 0)) {
      write('nabd.best.digit-span', S.best);
    }
    var stored = Number(read('nabd.best.digit-span', 0)) || 0;
    els.result.kicker.textContent = (S.best >= stored && S.best > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.best);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.extra.textContent = 'أفضل طول (كل الأوقات): ' + fmt(stored);
    showScreen('result');
  }

  function bind() {
    buildPad();
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
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(Number(read('nabd.best.digit-span', 0)) || 0);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
