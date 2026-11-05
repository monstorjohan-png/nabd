(function () {
  'use strict';
  var NUMS = [1,2,3,4,5,6,7,8,9,10,11,12,13];
  var LETTERS = ['أ','ب','ج','د','ه','و','ز','ح','ط','ي','ك','ل','م'];

  var $ = function (s) { return document.querySelector(s); };
  var els = {
    grid: $('#grid'), hint: $('#hint'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              errors: $('#statErrors'), best: $('#statBest'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') },
    modeLabel: $('#modeLabel')
  };

  var S = {
    mode: 'idle', items: [], expected: 1, isNumber: true, errors: 0,
    startAt: 0, elapsed: 0, best: null, timer: null
  };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt1(n) { return Number(n).toFixed(1); }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildGrid() {
    els.grid.innerHTML = '';
    // 26 items: numbers 1-13 and letters أ-م
    var items = [];
    for (var i = 0; i < 13; i++) {
      items.push({ type: 'num', value: NUMS[i], label: String(NUMS[i]) });
      items.push({ type: 'let', value: LETTERS[i], label: LETTERS[i] });
    }
    shuffle(items);
    S.items = items;
    items.forEach(function (it, idx) {
      var b = document.createElement('button');
      b.className = 'tmt-cell';
      b.type = 'button';
      b.textContent = it.label;
      b.setAttribute('data-idx', String(idx));
      b.addEventListener('click', function () { handleTap(idx); });
      els.grid.appendChild(b);
    });
  }

  function expectedLabel() {
    if (S.isNumber) return String(S.expected);
    return LETTERS[S.expected - 1];
  }

  function handleTap(idx) {
    if (S.mode !== 'playing') return;
    var it = S.items[idx];
    var cell = els.grid.querySelector('[data-idx="' + idx + '"]');
    var want = S.isNumber ? 'num' : 'let';
    var wantVal = S.isNumber ? S.expected : LETTERS[S.expected - 1];
    if (it.type === want && it.value === wantVal) {
      cell.classList.add('is-done');
      // advance
      if (S.isNumber) {
        S.isNumber = false;
      } else {
        S.isNumber = true;
        S.expected += 1;
      }
      updateHint();
      if (S.expected > 13 && !S.isNumber) {
        // completed all 13 pairs? Actually after 13 numbers and 13 letters = 26 taps, last is letter م
        // Check completion: expected 14 means done
      }
      // completion check: all 26 tapped
      var done = els.grid.querySelectorAll('.is-done').length;
      if (done >= 26) finish();
    } else {
      S.errors += 1;
      cell.classList.add('is-wrong');
      setTimeout(function () { cell.classList.remove('is-wrong'); }, 350);
    }
  }

  function updateHint() {
    els.hint.textContent = 'الالتالي: ' + expectedLabel();
    els.modeLabel.textContent = 'الوقت: ' + fmt1(S.elapsed) + 's';
  }

  function finish() {
    S.mode = 'over';
    clearInterval(S.timer);
    S.elapsed = (performance.now() - S.startAt) / 1000;
    var score = S.elapsed + S.errors * 0.5;
    if (S.best === null || score < S.best) { S.best = score; write('nabd.best.task-switching', S.best); }
    els.result.kicker.textContent = (score <= S.best ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt1(S.elapsed);
    els.result.errors.textContent = String(S.errors);
    els.result.best.textContent = fmt1(S.best);
    els.result.extra.textContent = 'العقوبة (أخطاء×0.5s): ' + fmt1(S.errors * 0.5) + 's · المجموع: ' + fmt1(score) + 's';
    els.screens.result.classList.add('is-active');
    els.screens.result.setAttribute('aria-hidden', 'false');
    showScreen('result');
  }

  function showScreen(name) {
    Object.keys(els.screens).forEach(function (k) {
      var el = els.screens[k];
      if (!el) return;
      el.classList.toggle('is-active', k === name);
      el.setAttribute('aria-hidden', k === name ? 'false' : 'true');
    });
  }

  function startGame() {
    S.mode = 'playing';
    S.expected = 1; S.isNumber = true; S.errors = 0; S.elapsed = 0;
    buildGrid();
    S.startAt = performance.now();
    showScreen(null);
    S.timer = setInterval(function () {
      S.elapsed = (performance.now() - S.startAt) / 1000;
      els.modeLabel.textContent = 'الوقت: ' + fmt1(S.elapsed) + 's';
    }, 100);
    updateHint();
  }

  function bind() {
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
    var raw = read('nabd.best.task-switching', null);
    S.best = raw == null ? null : Number(raw);
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = S.best == null ? '—' : fmt1(S.best) + 's';
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
