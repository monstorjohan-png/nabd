(function () {
  'use strict';
  var COLORS = [
    { name: 'أحمر', value: '#ef4444' },
    { name: 'أزرق', value: '#3b82f6' },
    { name: 'أخضر', value: '#22c55e' }
  ];
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    mathQ: $('#mathQ'), colorQ: $('#colorQ'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 20,
            mathAns: 0, colorAns: null, mathDone: false, colorDone: false,
            trialStart: 0, timeSum: 0, best: 0 };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function newTrial() {
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    S.mathDone = false; S.colorDone = false;
    // math: a+b where a,b in 1..9
    var a = 1 + Math.floor(Math.random() * 9);
    var b = 1 + Math.floor(Math.random() * 9);
    S.mathAns = a + b;
    // options: correct + 3 distractors
    var opts = [S.mathAns];
    while (opts.length < 4) {
      var v = S.mathAns + (Math.floor(Math.random() * 7) - 3);
      if (v > 0 && opts.indexOf(v) === -1) opts.push(v);
    }
    // shuffle
    for (var i = opts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = opts[i]; opts[i] = opts[j]; opts[j] = t;
    }
    var mathBtns = document.querySelectorAll('[data-task="math"]');
    for (var i = 0; i < mathBtns.length; i++) {
      mathBtns[i].textContent = opts[i];
      mathBtns[i].setAttribute('data-val', String(opts[i]));
      mathBtns[i].disabled = false;
      mathBtns[i].classList.remove('correct', 'wrong');
    }
    // color: word + ink
    var wordColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    var inkColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    if (Math.random() < 0.5) inkColor = wordColor;
    S.colorAns = (wordColor.name === inkColor.name) ? 'yes' : 'no';
    els.colorQ.textContent = wordColor.name + '?';
    els.colorQ.style.color = inkColor.value;
    var colorBtns = document.querySelectorAll('[data-task="color"]');
    for (var i = 0; i < colorBtns.length; i++) {
      colorBtns[i].disabled = false;
      colorBtns[i].classList.remove('correct', 'wrong');
    }
    S.trialStart = performance.now();
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function handleMath(val) {
    if (S.mode !== 'playing' || S.mathDone) return;
    var btns = document.querySelectorAll('[data-task="math"]');
    for (var i = 0; i < btns.length; i++) {
      if (Number(btns[i].getAttribute('data-val')) === val) {
        if (val === S.mathAns) btns[i].classList.add('correct');
        else btns[i].classList.add('wrong');
      }
      btns[i].disabled = true;
    }
    S.mathDone = (val === S.mathAns);
    checkComplete();
  }

  function handleColor(val) {
    if (S.mode !== 'playing' || S.colorDone) return;
    var btns = document.querySelectorAll('[data-task="color"]');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-val') === val) {
        if (val === S.colorAns) btns[i].classList.add('correct');
        else btns[i].classList.add('wrong');
      }
      btns[i].disabled = true;
    }
    S.colorDone = (val === S.colorAns);
    checkComplete();
  }

  function checkComplete() {
    if (!S.mathDone && !S.colorDone) return;
    // both must be done to evaluate
    // wait until both answered (mathDone tracks correctness, colorDone tracks correctness)
    // We need a separate "answered" flag
  }

  // Rework: track answered separately
  var mathAnswered = false, colorAnswered = false;
  // redefine handlers
  function handleMath2(val) {
    if (S.mode !== 'playing' || mathAnswered) return;
    mathAnswered = true;
    var btns = document.querySelectorAll('[data-task="math"]');
    var correct = (val === S.mathAns);
    for (var i = 0; i < btns.length; i++) {
      if (Number(btns[i].getAttribute('data-val')) === val) {
        btns[i].classList.add(correct ? 'correct' : 'wrong');
      }
      btns[i].disabled = true;
    }
    S.mathDone = correct;
    evaluateIfDone();
  }
  function handleColor2(val) {
    if (S.mode !== 'playing' || colorAnswered) return;
    colorAnswered = true;
    var btns = document.querySelectorAll('[data-task="color"]');
    var correct = (val === S.colorAns);
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-val') === val) {
        btns[i].classList.add(correct ? 'correct' : 'wrong');
      }
      btns[i].disabled = true;
    }
    S.colorDone = correct;
    evaluateIfDone();
  }
  function evaluateIfDone() {
    if (!mathAnswered || !colorAnswered) return;
    var elapsed = performance.now() - S.trialStart;
    if (S.mathDone && S.colorDone) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(40 * (1 - elapsed / 4000)));
      S.score += pts;
      S.timeSum += elapsed;
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 20);
    }
    mathAnswered = false; colorAnswered = false;
    setTimeout(newTrial, 800);
  }

  // replace handlers
  function bindButtons() {
    document.querySelectorAll('[data-task="math"]').forEach(function (b) {
      b.onclick = function () { handleMath2(Number(b.getAttribute('data-val'))); };
    });
    document.querySelectorAll('[data-task="color"]').forEach(function (b) {
      b.onclick = function () { handleColor2(b.getAttribute('data-val')); };
    });
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.timeSum = 0;
    mathAnswered = false; colorAnswered = false;
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
    var avg = S.hits ? Math.round(S.timeSum / S.hits) : 0;
    if (S.score > S.best) { S.best = S.score; write('nabd.best.dual-task', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.time.textContent = avg;
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
  }

  function bind() {
    bindButtons();
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
    S.best = Number(read('nabd.best.dual-task', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
