(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    area: $('#dotArea'), numpad: $('#numpad'),
    hudLabel: $('#modeLabel'), meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };

  var S = {
    mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 20,
    count: 0, shownAt: 0, answered: false, best: 0, timeSum: 0
  };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function genDots(n) {
    els.area.innerHTML = '';
    var rect = els.area.getBoundingClientRect();
    var w = rect.width || 300, h = rect.height || 300;
    var positions = [];
    var tries = 0;
    while (positions.length < n && tries < 2000) {
      tries++;
      var x = 12 + Math.random() * (w - 24);
      var y = 12 + Math.random() * (h - 24);
      var ok = true;
      for (var i = 0; i < positions.length; i++) {
        var dx = positions[i].x - x, dy = positions[i].y - y;
        if (Math.sqrt(dx*dx + dy*dy) < 30) { ok = false; break; }
      }
      if (ok) positions.push({ x: x, y: y });
    }
    positions.forEach(function (p) {
      var d = document.createElement('span');
      d.className = 'dot';
      d.style.left = p.x + 'px';
      d.style.top = p.y + 'px';
      els.area.appendChild(d);
    });
  }

  function buildPad() {
    els.numpad.innerHTML = '';
    for (var i = 1; i <= 9; i++) {
      var b = document.createElement('button');
      b.className = 'num-btn';
      b.type = 'button';
      b.textContent = i;
      b.setAttribute('data-n', String(i));
      b.addEventListener('click', function () { answer(Number(this.getAttribute('data-n'))); });
      els.numpad.appendChild(b);
    }
  }

  function startTrial() {
    if (S.mode !== 'playing') return;
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    S.count = 1 + Math.floor(Math.random() * 9);
    S.answered = false;
    els.area.innerHTML = '';
    genDots(S.count);
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;

    // hide dots after 0.7s
    setTimeout(function () {
      if (S.mode !== 'playing') return;
      var dots = els.area.querySelectorAll('.dot');
      dots.forEach(function (d) { d.style.opacity = '0'; });
      S.shownAt = performance.now();
    }, 700);
  }

  function answer(n) {
    if (S.mode !== 'playing' || S.answered) return;
    // only allow after dots hidden
    var dots = els.area.querySelectorAll('.dot');
    var hidden = dots.length === 0 || dots[0].style.opacity === '0';
    if (!hidden) return;
    S.answered = true;
    var elapsed = performance.now() - S.shownAt;
    var btns = els.numpad.querySelectorAll('.num-btn');
    var clicked = null;
    for (var i = 0; i < btns.length; i++) if (Number(btns[i].getAttribute('data-n')) === n) clicked = btns[i];
    if (n === S.count) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(50 * (1 - elapsed / 2000)));
      S.score += pts;
      S.timeSum += elapsed;
      if (clicked) clicked.classList.add('correct');
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 20);
      if (clicked) clicked.classList.add('wrong');
    }
    setTimeout(function () {
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('correct', 'wrong');
      startTrial();
    }, 600);
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.timeSum = 0;
    buildPad();
    showScreen(null);
    startTrial();
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
    if (S.score > S.best) { S.best = S.score; write('nabd.best.subitizing', S.best); }
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
    S.best = Number(read('nabd.best.subitizing', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    buildPad();
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
