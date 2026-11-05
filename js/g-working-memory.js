(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    grid: $('#grid'), hudLabel: $('#hudLabel'), hudScore: $('#hudScore'),
    meter: null, meterFill: null, meterText: null,
    lives: $('#lives'), floats: null,
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              best: $('#statBest'), hits: $('#statHits'), miss: $('#statMiss'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') },
    modeLabel: $('#modeLabel')
  };

  var S = {
    mode: 'idle', length: 3, maxLen: 9, seq: [], input: [], lives: 3,
    hits: 0, misses: 0, bestLen: 0, showing: false, inputEnabled: false,
    best: 0, lastTs: 0
  };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function buildGrid() {
    els.grid.innerHTML = '';
    for (var i = 0; i < 9; i++) {
      var b = document.createElement('button');
      b.className = 'cell';
      b.type = 'button';
      b.setAttribute('data-idx', String(i));
      b.setAttribute('aria-label', 'مربع ' + (i + 1));
      els.grid.appendChild(b);
    }
  }

  function flashCell(idx, dur) {
    var cell = els.grid.querySelector('[data-idx="' + idx + '"]');
    if (!cell) return;
    cell.classList.add('is-lit');
    setTimeout(function () { cell.classList.remove('is-lit'); }, dur || 400);
  }

  function showSequence() {
    S.showing = true;
    S.inputEnabled = false;
    els.hudLabel.textContent = 'شاهد';
    var i = 0;
    function step() {
      if (i >= S.seq.length) {
        S.showing = false;
        S.inputEnabled = true;
        els.hudLabel.textContent = 'أعدّه';
        return;
      }
      flashCell(S.seq[i], 420);
      i += 1;
      setTimeout(step, 620);
    }
    step();
  }

  function genSeq(len) {
    var s = [];
    var prev = -1;
    for (var i = 0; i < len; i++) {
      var n;
      do { n = Math.floor(Math.random() * 9); } while (n === prev);
      s.push(n); prev = n;
    }
    return s;
  }

  function startRound() {
    S.seq = genSeq(S.length);
    S.input = [];
    showSequence();
  }

  function startGame() {
    S.mode = 'playing';
    S.length = 3; S.lives = 3; S.hits = 0; S.misses = 0; S.bestLen = 0;
    updateLives();
    els.hudScore.textContent = '0';
    els.modeLabel.textContent = 'الطول: 3';
    showScreen(null);
    startRound();
  }

  function showScreen(name) {
    Object.keys(els.screens).forEach(function (k) {
      var el = els.screens[k];
      if (!el) return;
      el.classList.toggle('is-active', k === name);
      el.setAttribute('aria-hidden', k === name ? 'false' : 'true');
    });
  }

  function updateLives() {
    var dots = els.lives.querySelectorAll('.life');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('is-lost', i >= S.lives);
  }

  function handleCell(idx) {
    if (S.mode !== 'playing' || !S.inputEnabled) return;
    S.input.push(idx);
    flashCell(idx, 220);
    var pos = S.input.length - 1;
    if (S.input[pos] !== S.seq[pos]) {
      // wrong
      S.misses += 1;
      S.lives -= 1;
      updateLives();
      var cell = els.grid.querySelector('[data-idx="' + idx + '"]');
      if (cell) { cell.classList.add('is-wrong'); setTimeout(function () { cell.classList.remove('is-wrong'); }, 400); }
      if (S.lives <= 0) { endGame(); return; }
      S.inputEnabled = false;
      els.hudLabel.textContent = 'خطأ — إعادة';
      setTimeout(function () {
        S.length = Math.max(3, S.length - 1);
        els.modeLabel.textContent = 'الطول: ' + S.length;
        startRound();
      }, 900);
      return;
    }
    if (S.input.length === S.seq.length) {
      // success
      S.hits += 1;
      S.bestLen = Math.max(S.bestLen, S.length);
      els.hudScore.textContent = fmt(S.bestLen);
      els.hudLabel.textContent = 'صحيح!';
      S.inputEnabled = false;
      setTimeout(function () {
        if (S.length < S.maxLen) S.length += 1;
        els.modeLabel.textContent = 'الطول: ' + S.length;
        startRound();
      }, 700);
    }
  }

  function endGame() {
    S.mode = 'over';
    if (S.bestLen > S.best) { S.best = S.bestLen; write('nabd.best.working-memory', S.best); }
    els.result.kicker.textContent = (S.bestLen >= S.best && S.bestLen > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.bestLen);
    els.result.best.textContent = fmt(S.best);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.extra.textContent = 'أفضل طول (كل الأوقات): ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    buildGrid();
    els.grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.cell');
      if (!btn) return;
      handleCell(Number(btn.getAttribute('data-idx')));
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
    S.best = Number(read('nabd.best.working-memory', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
