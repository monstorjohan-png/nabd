(function () {
  'use strict';
  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
  var SHAPES = ['●', '■', '▲', '◆'];
  var NUMS = [1, 2, 3, 4];
  var $ = function (s) { return document.querySelector(s); };
  var els = {
    target: $('#target'), cards: $('#cards'), rule: $('#rule'),
    meter: $('#meter'), meterFill: $('#meterFill'), meterText: $('#meterText'),
    hudLabel: $('#modeLabel'),
    screens: { start: $('#screenStart'), result: $('#screenResult') },
    result: { kicker: $('#resultKicker'), score: $('#resultScore'),
              hits: $('#statHits'), miss: $('#statMiss'), time: $('#statTime'),
              extra: $('#resultExtra'), btnReplay: $('#btnReplay'), btnHome: $('#btnHome') }
  };
  var S = { mode: 'idle', score: 0, hits: 0, misses: 0, round: 0, total: 20,
            rule: 'color', correctCount: 0, trialStart: 0, timeSum: 0, best: 0, target: null };

  function read(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function makeCard() {
    return {
      color: COLORS[Math.floor(Math.random() * 4)],
      shape: SHAPES[Math.floor(Math.random() * 4)],
      num: NUMS[Math.floor(Math.random() * 4)]
    };
  }

  function matchRule(card, target, rule) {
    if (rule === 'color') return card.color === target.color;
    if (rule === 'shape') return card.shape === target.shape;
    return card.num === target.num;
  }

  function renderCard(c) {
    var d = document.createElement('div');
    d.className = 'wcst-card';
    d.style.color = c.color;
    d.textContent = c.shape + c.num;
    d.setAttribute('data-color', c.color);
    d.setAttribute('data-shape', c.shape);
    d.setAttribute('data-num', String(c.num));
    return d;
  }

  function newTrial() {
    if (S.round >= S.total) { endGame(); return; }
    S.round += 1;
    S.target = makeCard();
    els.target.textContent = S.target.shape;
    els.target.style.color = S.target.color;
    // 4 candidate cards
    els.cards.innerHTML = '';
    var correctIdx = Math.floor(Math.random() * 4);
    for (var i = 0; i < 4; i++) {
      var card;
      if (i === correctIdx) {
        // matching card (same rule value)
        card = { color: S.target.color, shape: SHAPES[Math.floor(Math.random()*4)], num: NUMS[Math.floor(Math.random()*4)] };
        if (S.rule === 'shape') card.shape = S.target.shape;
        if (S.rule === 'num') card.num = S.target.num;
      } else {
        card = makeCard();
      }
      var el = renderCard(card);
      el.addEventListener('click', (function (cd) {
        return function () { handlePick(cd); };
      })(card));
      els.cards.appendChild(el);
    }
    S.trialStart = performance.now();
    els.rule.textContent = 'القاعدة: ' + (S.rule === 'color' ? 'لون' : S.rule === 'shape' ? 'شكل' : 'عدد');
    els.hudLabel.textContent = 'محاولة ' + S.round + ' / ' + S.total;
    els.meterFill.style.width = ((S.round / S.total) * 100).toFixed(1) + '%';
    els.meter.setAttribute('aria-valuenow', String(S.round));
    els.meterText.textContent = S.round + ' / ' + S.total;
  }

  function handlePick(card) {
    if (S.mode !== 'playing') return;
    var elapsed = performance.now() - S.trialStart;
    var correct = matchRule(card, S.target, S.rule);
    if (correct) {
      S.hits += 1;
      S.correctCount += 1;
      var pts = 100 + Math.max(0, Math.round(40 * (1 - elapsed / 3000)));
      S.score += pts;
      S.timeSum += elapsed;
      if (S.correctCount >= 5) {
        // switch rule
        var rules = ['color', 'shape', 'num'];
        var idx = rules.indexOf(S.rule);
        S.rule = rules[(idx + 1) % rules.length];
        S.correctCount = 0;
      }
    } else {
      S.misses += 1;
      S.score = Math.max(0, S.score - 15);
    }
    newTrial();
  }

  function startGame() {
    S.mode = 'playing';
    S.score = 0; S.hits = 0; S.misses = 0; S.round = 0; S.timeSum = 0;
    S.rule = 'color'; S.correctCount = 0;
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
    if (S.score > S.best) { S.best = S.score; write('nabd.best.wcst', S.best); }
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
    S.best = Number(read('nabd.best.wcst', 0)) || 0;
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(S.best);
    bind();
    showScreen('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
