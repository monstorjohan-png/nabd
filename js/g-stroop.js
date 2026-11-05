(function () {
  'use strict';
  var COLORS = [
    { key: 'red',    name: 'أحمر', value: '#ef4444' },
    { key: 'blue',   name: 'أزرق', value: '#3b82f6' },
    { key: 'green',  name: 'أخضر', value: '#22c55e' },
    { key: 'yellow', name: 'أصفر', value: '#eab308' }
  ];

  var $ = function (s) { return document.querySelector(s); };
  var els = {
    word: $('#stroopWord'), btns: $('#colorBtns'),
    hudLabel: $('#modeLabel'), hudScore: null,
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  // use modeLabel as score display too? We'll add a score element dynamically
  var scoreEl = document.createElement('span');
  scoreEl.className = 'mode-pill';
  scoreEl.style.marginInlineStart = 'auto';
  scoreEl.id = 'scorePill';
  scoreEl.textContent = '0';
  els.scorePill = scoreEl;

  var S = {
    mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 30,
    trial: null, trialStart: 0, timeSum: 0, best: 0, timer: null
  };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function newTrial() {
    var wordColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    var inkColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    // bias toward incongruent (70%) to make it challenging
    if (Math.random() < 0.7 && inkColor.key === wordColor.key) {
      inkColor = COLORS[(COLORS.indexOf(inkColor) + 1) % COLORS.length];
    }
    S.trial = { word: wordColor, ink: inkColor, congruent: wordColor.key === inkColor.key };
    S.trialStart = performance.now();
    els.word.textContent = wordColor.name;
    els.word.style.color = inkColor.value;
    // reset button styles
    var bs = els.btns.querySelectorAll('.color-btn');
    for (var i = 0; i < bs.length; i++) { bs[i].classList.remove('correct', 'wrong'); bs[i].disabled = false; }
  }

  function buildButtons() {
    els.btns.innerHTML = '';
    COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'color-btn';
      b.type = 'button';
      b.textContent = c.name;
      b.style.background = c.value;
      b.setAttribute('data-key', c.key);
      b.addEventListener('click', function () { handleAnswer(c.key, b); });
      els.btns.appendChild(b);
    });
  }

  function handleAnswer(key, btn) {
    if (S.mode !== 'playing' || !S.trial) return;
    var elapsed = performance.now() - S.trialStart;
    var correct = key === S.trial.ink.key;
    if (correct) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(50 * (1 - elapsed / 2000)));
      S.score += pts;
      S.timeSum += elapsed;
      btn.classList.add('correct');
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 30);
      btn.classList.add('wrong');
      // highlight correct
      var bs = els.btns.querySelectorAll('.color-btn');
      for (var i = 0; i < bs.length; i++) {
        if (bs[i].getAttribute('data-key') === S.trial.ink.key) bs[i].classList.add('correct');
      }
    }
    // disable all
    var all = els.btns.querySelectorAll('.color-btn');
    for (var j = 0; j < all.length; j++) all[j].disabled = true;

    S.round += 1;
    updateHud();
    if (S.round >= S.total) {
      clearTimeout(S.timer);
      setTimeout(endGame, 600);
    } else {
      clearTimeout(S.timer);
      S.timer = setTimeout(function () {
        // timeout counts as miss
        S.misses += 1;
        S.score = Math.max(0, S.score - 10);
        S.round += 1;
        updateHud();
        if (S.round >= S.total) endGame();
        else newTrial();
      }, 2000);
      // advance after feedback
      setTimeout(function () {
        if (S.mode === 'playing' && S.round < S.total) newTrial();
      }, 600);
    }
  }

  function updateHud() {
    S.scorePill.textContent = fmt(S.score);
    els.hudLabel.textContent = 'محاولة ' + Math.min(S.round + 1, S.total) + ' / ' + S.total;
    var pct = (S.round / S.total) * 100;
    els.meterFill.style.width = Math.min(100, pct).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.timeSum = 0;
    S.scorePill.textContent = '0';
    buildButtons();
    showScreen(null);
    newTrial();
    clearTimeout(S.timer);
    S.timer = setTimeout(function () {
      // first timeout
      if (S.mode !== 'playing') return;
      S.misses += 1;
      S.round += 1;
      updateHud();
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
    if (S.score > S.best) { S.best = S.score; write('nabd.best.stroop', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.time.textContent = avg;
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    // insert score pill into panel-top
    var top = document.querySelector('.panel-top');
    if (top) {
      var actions = top.querySelector('.panel-actions');
      if (actions) top.insertBefore(S.scorePill, actions);
    }
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
    S.best = Number(read('nabd.best.stroop', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    buildButtons();
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
