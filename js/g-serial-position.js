(function () {
  'use strict';
  var WORDS = ['تفاحة', 'كتاب', 'سيارة', 'شمس', 'ماء', 'كلب', 'قلم', 'قمر', 'بيت', 'شجرة', 'طائرة', 'سماء'];
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    display: $('#display'), btns: $('#btns'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 12,
            seq: [], targetPos: 0, correctWord: '', trialStart: 0, timeSum: 0, best: 0, timer: null };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function newTrial() {
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    // generate sequence of 6 words
    var seq = [];
    var used = [];
    for (var i = 0; i < 6; i++) {
      var w;
      do { w = WORDS[Math.floor(Math.random() * WORDS.length)]; } while (used.indexOf(w) !== -1);
      used.push(w);
      seq.push(w);
    }
    S.seq = seq;
    S.targetPos = 1 + Math.floor(Math.random() * 6);
    S.correctWord = seq[S.targetPos - 1];
    // show sequence
    els.display.textContent = 'شاهد...';
    var i = 0;
    function show() {
      if (i >= seq.length) {
        els.display.textContent = 'أي كلمة في الموضع ' + S.targetPos + '؟';
        S.trialStart = performance.now();
        showOptions();
        return;
      }
      els.display.textContent = seq[i];
      i++;
      setTimeout(show, 600);
    }
    show();
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function showOptions() {
    els.btns.innerHTML = '';
    var opts = [S.correctWord];
    while (opts.length < 4) {
      var w = WORDS[Math.floor(Math.random() * WORDS.length)];
      if (opts.indexOf(w) === -1) opts.push(w);
    }
    for (var i = opts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = opts[i]; opts[i] = opts[j]; opts[j] = t;
    }
    opts.forEach(function (w) {
      var b = document.createElement('button');
      b.className = 'sp-btn';
      b.type = 'button';
      b.textContent = w;
      b.addEventListener('click', function () { handleAns(w); });
      els.btns.appendChild(b);
    });
  }

  function handleAns(w) {
    if (S.mode !== 'playing') return;
    var elapsed = performance.now() - S.trialStart;
    if (w === S.correctWord) {
      S.hits += 1;
      var pts = 100 + Math.max(0, Math.round(40 * (1 - elapsed / 4000)));
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
    if (S.score > S.best) { S.best = S.score; write('nabd.best.serial-position', S.best); }
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
    S.best = Number(read('nabd.best.serial-position', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
