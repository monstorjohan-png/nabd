(function () {
  'use strict';
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    display: $('#display'), meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 20,
            seq: [], trialStart: 0, timeSum: 0, best: 0, timer: null };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function newTrial() {
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    var letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    S.seq.push(letter);
    els.display.textContent = letter;
    var isMatch = (S.seq.length >= 3) && (letter === S.seq[S.seq.length - 3]);
    S.trialStart = performance.now();
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
    // store expected for this trial
    S.expectedMatch = isMatch;
    // timeout
    clearTimeout(S.timer);
    S.timer = setTimeout(function () {
      if (S.mode !== 'playing') return;
      // timeout = no response; if match expected, miss
      if (isMatch) S.misses += 1;
      newTrial();
    }, 2000);
  }

  function handleAns(saidMatch) {
    if (S.mode !== 'playing') return;
    clearTimeout(S.timer);
    var elapsed = performance.now() - S.trialStart;
    var correct = (saidMatch === S.expectedMatch);
    if (correct) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(40 * (1 - elapsed / 2000)));
      S.score += pts;
      S.timeSum += elapsed;
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 20);
    }
    newTrial();
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.timeSum = 0; S.seq = [];
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
    clearTimeout(S.timer);
    var avg = S.hits ? Math.round(S.timeSum / S.hits) : 0;
    if (S.score > S.best) { S.best = S.score; write('nabd.best.nback', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.time.textContent = avg;
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    document.querySelectorAll('.nb-btn').forEach(function (b) {
      b.addEventListener('click', function () { handleAns(b.getAttribute('data-resp') === 'match'); });
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
    S.best = Number(read('nabd.best.nback', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
