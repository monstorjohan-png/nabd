(function () {
  'use strict';
  var SHAPES = ['●', '■', '▲', '◆'];
  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    seq: $('#seq'), opts: $('#opts'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 15,
            correct: '', trialStart: 0, timeSum: 0, best: 0 };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function newTrial() {
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    // pattern: alternating shape, same color; or alternating color, same shape
    var mode = Math.random() < 0.5 ? 'shape' : 'color';
    var baseShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    var baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    var altShape = SHAPES[(SHAPES.indexOf(baseShape) + 1) % SHAPES.length];
    var altColor = COLORS[(COLORS.indexOf(baseColor) + 1) % COLORS.length];
    var seq = [];
    for (var i = 0; i < 4; i++) {
      if (mode === 'shape') {
        seq.push({ shape: i % 2 === 0 ? baseShape : altShape, color: baseColor });
      } else {
        seq.push({ shape: baseShape, color: i % 2 === 0 ? baseColor : altColor });
      }
    }
    // next in pattern
    var nextShape = mode === 'shape' ? (4 % 2 === 0 ? baseShape : altShape) : baseShape;
    var nextColor = mode === 'color' ? (4 % 2 === 0 ? baseColor : altColor) : baseColor;
    S.correct = nextShape + '|' + nextColor;

    // render seq
    els.seq.innerHTML = '';
    seq.forEach(function (s) {
      var d = document.createElement('span');
      d.className = 'pm-shape';
      d.textContent = s.shape;
      d.style.color = s.color;
      els.seq.appendChild(d);
    });

    // options: correct + 3 distractors
    var opts = [S.correct];
    while (opts.length < 4) {
      var sh = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      var co = COLORS[Math.floor(Math.random() * COLORS.length)];
      var key = sh + '|' + co;
      if (opts.indexOf(key) === -1) opts.push(key);
    }
    // shuffle
    for (var i = opts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = opts[i]; opts[i] = opts[j]; opts[j] = t;
    }
    els.opts.innerHTML = '';
    opts.forEach(function (key) {
      var parts = key.split('|');
      var b = document.createElement('button');
      b.className = 'pm-opt';
      b.type = 'button';
      b.textContent = parts[0];
      b.style.color = parts[1];
      b.setAttribute('data-key', key);
      b.addEventListener('click', function () { handleAns(key); });
      els.opts.appendChild(b);
    });

    S.trialStart = performance.now();
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function handleAns(key) {
    if (S.mode !== 'playing') return;
    var elapsed = performance.now() - S.trialStart;
    if (key === S.correct) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(50 * (1 - elapsed / 3000)));
      S.score += pts;
      S.timeSum += elapsed;
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 15);
    }
    newTrial();
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.timeSum = 0;
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
    if (S.score > S.best) { S.best = S.score; write('nabd.best.pattern-matching', S.best); }
    els.result.kicker.textContent = (S.score >= S.best && S.score > 0 ? 'رقم جديد! · ' : '') + 'النتيجة';
    els.result.score.textContent = fmt(S.score);
    els.result.hits.textContent = String(S.hits);
    els.result.miss.textContent = String(S.misses);
    els.result.time.textContent = avg;
    els.result.extra.textContent = 'أفضل نتيجة: ' + fmt(S.best);
    showScreen('result');
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
    S.best = Number(read('nabd.best.pattern-matching', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
