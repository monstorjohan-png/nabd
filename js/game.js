/*
 * نبض — واجهة اللعبة: الرسم، الإدخال، الصوت، الحفظ.
 * يعتمد على NabdEngine (engine.js).
 */
(function () {
  'use strict';

  var E = window.NabdEngine;
  if (!E) return;

  var ACCENT = '#D9FF4A';
  var ACCENT_DIM = 'rgba(217,255,74,';
  var DANGER = '#FF5C6C';
  var TRACK_RGB = 'rgba(255,255,255,';

  var $ = function (sel) { return document.querySelector(sel); };
  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* تجاهل */ }

  /* ------------------------------- DOM ------------------------------- */
  var els = {
    stage: $('#stage'),
    canvas: $('#board'),
    hudLabel: $('#hudLabel'),
    hudScore: $('#hudScore'),
    hudCombo: $('#hudCombo'),
    comboVal: $('#comboVal'),
    meter: $('#meter'),
    meterFill: $('#meterFill'),
    meterText: $('#meterText'),
    lives: $('#lives'),
    modeLabel: $('#modeLabel'),
    btnSound: $('#btnSound'),
    btnPause: $('#btnPause'),
    floats: $('#floats'),
    screens: {
      start: $('#screenStart'),
      pause: $('#screenPause'),
      result: $('#screenResult')
    },
    result: {
      kicker: $('#resultKicker'),
      score: $('#resultScore'),
      grid: $('#resultGrid'),
      acc: $('#statAcc'),
      combo: $('#statCombo'),
      perfect: $('#statPerfect'),
      extra: $('#resultExtra'),
      btnShare: $('#btnShare'),
      btnReplay: $('#btnReplay'),
      btnHome: $('#btnHome')
    }
  };

  var ctx = els.canvas.getContext('2d');
  var view = { size: 0, cx: 0, cy: 0, R: 0, track: 10 };

  /* ------------------------------ الحالة ------------------------------ */
  var S = {
    mode: 'idle',           // idle | playing | paused | over
    variant: 'daily',       // daily | endless
    score: 0,
    combo: 0,
    bestCombo: 0,
    beats: 0,
    total: 30,
    hits: 0,
    misses: 0,
    grades: [],
    lives: 3,
    speed: 160,
    halfWidth: 26,
    adaptive: E.createAdaptive(),
    pulse: { angle: 0, trail: [] },
    target: { angle: 110, hw: 24 },
    effects: [],
    rng: Math.random,
    lastTs: 0,
    startedAt: 0,
    newBest: false
  };

  /* ---------------------------- التخزين ---------------------------- */
  function read(key, fallback) {
    try {
      var v = window.localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, String(value)); } catch (e) { /* الوضع الخاص */ }
  }
  function readJSON(key) {
    var raw = read(key, null);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function writeJSON(key, obj) { write(key, JSON.stringify(obj)); }

  var bestEndless = Number(read('nabd.best.endless', 0)) || 0;

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-US');
  }

  /* ------------------------------ الصوت ------------------------------ */
  var audioCtx = null;
  var soundOn = read('nabd.sound', '1') === '1';

  function ensureAudio() {
    if (!soundOn) return;
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(freq, dur, type, gain, delay) {
    if (!soundOn || !audioCtx) return;
    var t0 = audioCtx.currentTime + (delay || 0);
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.09, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function playHit(grade) {
    ensureAudio();
    if (grade === 'perfect') {
      tone(880, 0.13, 'sine', 0.10);
      tone(1320, 0.18, 'sine', 0.06, 0.05);
    } else if (grade === 'great') {
      tone(740, 0.12, 'sine', 0.09);
    } else {
      tone(560, 0.10, 'sine', 0.08);
    }
  }
  function playMiss() {
    ensureAudio();
    tone(150, 0.16, 'triangle', 0.07);
  }
  function haptic(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* تجاهل */ } }
  }

  /* ----------------------------- الرسم ----------------------------- */
  function resizeStage() {
    var rect = els.stage.getBoundingClientRect();
    var size = Math.max(200, Math.min(rect.width, rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    els.canvas.width = Math.round(size * dpr);
    els.canvas.height = Math.round(size * dpr);
    els.canvas.style.width = size + 'px';
    els.canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.size = size;
    view.cx = size / 2;
    view.cy = size / 2;
    view.R = size * 0.352;
    view.track = Math.max(7, size * 0.028);
  }

  function angleToXY(angle, radius) {
    var rad = (angle - 90) * Math.PI / 180;
    return {
      x: view.cx + radius * Math.cos(rad),
      y: view.cy + radius * Math.sin(rad)
    };
  }

  function drawTicks() {
    var outer = view.R + view.track * 1.9;
    ctx.save();
    ctx.lineWidth = 1;
    for (var i = 0; i < 60; i++) {
      var major = i % 5 === 0;
      var a = angleToXY(i * 6, outer);
      var b = angleToXY(i * 6, outer + (major ? 9 : 4));
      ctx.strokeStyle = TRACK_RGB + (major ? '0.13' : '0.06') + ')';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTrack() {
    ctx.save();
    ctx.lineWidth = view.track;
    ctx.strokeStyle = TRACK_RGB + '0.055)';
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // قوس داخلي دقيق يلف ببطء — تفصيل بصري فقط
    var spin = (performance.now() / 1000) * 8;
    ctx.save();
    ctx.lineWidth = Math.max(1, view.track * 0.14);
    ctx.strokeStyle = TRACK_RGB + '0.05)';
    ctx.setLineDash([view.R * 0.06, view.R * 0.12]);
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.R * 0.74, spin * Math.PI / 180, (spin + 300) * Math.PI / 180);
    ctx.stroke();
    ctx.restore();
  }

  function drawTarget(now) {
    var hw = S.target.hw;
    var start = (S.target.angle - hw - 90) * Math.PI / 180;
    var end = (S.target.angle + hw - 90) * Math.PI / 180;
    var d = Math.abs(E.angDiff(S.pulse.angle, S.target.angle));
    var glow = E.clamp(1 - d / 110, 0, 1);
    var breathe = reduceMotion ? 0.5 : (Math.sin(now / 420) + 1) / 2;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = view.track;
    ctx.strokeStyle = ACCENT_DIM + (0.55 + 0.42 * glow).toFixed(3) + ')';
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = 6 + 26 * glow + 6 * breathe;
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.R, start, end);
    ctx.stroke();
    ctx.restore();

    // علامة منتصف الهدف
    var p = angleToXY(S.target.angle, view.R);
    ctx.save();
    ctx.fillStyle = 'rgba(8,8,11,0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, view.track * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(p.x, p.y, view.track * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTrail() {
    if (reduceMotion) return;
    var now = performance.now();
    var alive = S.pulse.trail.filter(function (t) { return now - t.t < 200; });
    S.pulse.trail = alive;
    for (var i = 0; i < alive.length; i++) {
      var p = alive[i];
      var age = (now - p.t) / 200;
      var pos = angleToXY(p.a, view.R);
      ctx.beginPath();
      ctx.fillStyle = ACCENT_DIM + (0.22 * (1 - age)).toFixed(3) + ')';
      ctx.arc(pos.x, pos.y, view.track * 0.34 * (1 - age * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPulse() {
    var d = Math.abs(E.angDiff(S.pulse.angle, S.target.angle));
    var inZone = S.mode === 'playing' && d <= S.target.hw;
    var pos = angleToXY(S.pulse.angle, view.R);
    var r = view.track * (inZone ? 0.72 : 0.6);

    ctx.save();
    ctx.shadowColor = inZone ? ACCENT : 'rgba(255,255,255,0.75)';
    ctx.shadowBlur = inZone ? 30 : 16;
    ctx.fillStyle = inZone ? ACCENT : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, Math.max(1.5, r * 0.34), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEffects() {
    if (reduceMotion) { S.effects = []; return; }
    var now = performance.now();
    S.effects = S.effects.filter(function (e) { return now - e.t < e.dur; });
    for (var i = 0; i < S.effects.length; i++) {
      var e = S.effects[i];
      var p = (now - e.t) / e.dur;
      var pos = angleToXY(e.angle, view.R);
      ctx.save();
      ctx.strokeStyle = e.color + (0.55 * (1 - p)).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1, view.track * 0.5 * (1 - p));
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, view.track * 0.6 + p * view.R * 0.24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function render(now) {
    if (!view.size) return;
    ctx.clearRect(0, 0, view.size, view.size);
    drawTrack();
    drawTicks();
    if (S.target) drawTarget(now);
    drawTrail();
    drawPulse();
    drawEffects();
  }

  /* ---------------------------- حلقة اللعب ---------------------------- */
  function spawnTarget() {
    S.target = {
      angle: E.nextTargetAngle(S.pulse.angle, S.speed, S.rng),
      hw: S.halfWidth
    };
  }

  function updateDifficulty(grade) {
    if (S.variant === 'daily') {
      var p = E.dailyParams(S.beats);
      S.speed = p.speed;
      S.halfWidth = p.halfWidth;
    } else {
      S.adaptive.update(grade);
      S.speed = S.adaptive.speed;
      S.halfWidth = S.adaptive.halfWidth;
    }
  }

  function addFloat(grade, points) {
    if (!els.floats) return;
    var g = E.GRADES[grade];
    var el = document.createElement('span');
    el.className = 'float float--' + grade;
    el.textContent = (points ? '+' + points + ' ' : '') + g.label;
    var jitter = (Math.random() - 0.5) * 30;
    el.style.setProperty('--dx', jitter.toFixed(1) + 'px');
    els.floats.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  function addEffect(grade, angle) {
    if (reduceMotion) return;
    var color = grade === 'miss' ? 'rgba(255,92,108,' : ACCENT_DIM;
    S.effects.push({
      angle: angle != null ? angle : S.target.angle,
      t: performance.now(),
      dur: grade === 'perfect' ? 620 : 460,
      color: color
    });
  }

  function resolve(grade) {
    if (S.mode !== 'playing') return;

    S.beats += 1;
    S.grades.push(grade);

    if (grade === 'miss') {
      S.combo = 0;
      S.misses += 1;
      if (S.variant === 'endless') S.lives = Math.max(0, S.lives - 1);
      addEffect('miss', S.target.angle);
      playMiss();
      haptic(30);
    } else {
      S.hits += 1;
      S.combo += 1;
      if (S.combo > S.bestCombo) S.bestCombo = S.combo;
      var pts = E.scoreFor(grade, S.combo);
      S.score += pts;
      addFloat(grade, pts);
      addEffect(grade, S.target.angle);
      playHit(grade);
      haptic(12);
    }

    updateDifficulty(grade);
    syncHud();

    if (S.variant === 'endless' && S.lives <= 0) { endGame(); return; }
    if (S.variant === 'daily' && S.beats >= S.total) { endGame(); return; }

    spawnTarget();
  }

  function tap() {
    if (S.mode !== 'playing') return;
    ensureAudio();
    var d = E.angDiff(S.pulse.angle, S.target.angle);
    var grade = Math.abs(d) <= S.target.hw ? E.judge(d, S.target.hw) : 'miss';
    resolve(grade);
  }

  function loop(ts) {
    var dt = S.lastTs ? Math.min((ts - S.lastTs) / 1000, 0.05) : 0;
    S.lastTs = ts;

    if (S.mode === 'playing') {
      S.pulse.angle = (S.pulse.angle + S.speed * dt) % 360;
      if (!reduceMotion) S.pulse.trail.push({ a: S.pulse.angle, t: ts });
      var d = E.angDiff(S.pulse.angle, S.target.angle);
      if (d < -S.target.hw) resolve('miss');
    } else if (S.mode === 'idle') {
      S.pulse.angle = (S.pulse.angle + 42 * dt) % 360;
    }

    render(ts);
    requestAnimationFrame(loop);
  }

  /* ------------------------------ الواجهة ------------------------------ */
  function showScreen(name) {
    Object.keys(els.screens).forEach(function (key) {
      var el = els.screens[key];
      if (!el) return;
      el.classList.toggle('is-active', key === name);
      el.setAttribute('aria-hidden', key === name ? 'false' : 'true');
    });
  }

  function syncHud() {
    els.hudScore.textContent = fmt(S.score);
    if (S.combo >= 2) {
      els.hudCombo.hidden = false;
      els.comboVal.textContent = S.combo + ' · ×' + E.comboMultiplier(S.combo).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    } else {
      els.hudCombo.hidden = true;
    }

    if (S.variant === 'daily') {
      els.meter.hidden = false;
      els.lives.hidden = true;
      var pct = Math.min(100, (S.beats / S.total) * 100);
      els.meterFill.style.width = pct.toFixed(1) + '%';
      els.meter.setAttribute('aria-valuenow', String(S.beats));
      els.meterText.textContent = S.beats + ' / ' + S.total;
    } else {
      els.meter.hidden = true;
      els.lives.hidden = false;
      var dots = els.lives.querySelectorAll('.life');
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('is-lost', i >= S.lives);
      }
    }
    els.modeLabel.textContent = S.variant === 'daily' ? 'التحدّي اليومي' : 'اللعب الحر';
    els.hudLabel.textContent = S.variant === 'daily' ? 'التحدّي اليومي' : 'اللعب الحر';
  }

  function startGame(variant) {
    ensureAudio();
    S.variant = variant;
    S.mode = 'playing';
    S.score = 0;
    S.combo = 0;
    S.bestCombo = 0;
    S.beats = 0;
    S.hits = 0;
    S.misses = 0;
    S.grades = [];
    S.lives = 3;
    S.effects = [];
    S.newBest = false;
    S.total = variant === 'daily' ? 30 : Infinity;
    S.adaptive = E.createAdaptive();
    S.startedAt = performance.now();
    els.floats.innerHTML = '';

    if (variant === 'daily') {
      S.rng = E.mulberry32(E.dailySeed(E.dateKey()));
      var p0 = E.dailyParams(0);
      S.speed = p0.speed;
      S.halfWidth = p0.halfWidth;
    } else {
      S.rng = Math.random;
      S.speed = S.adaptive.speed;
      S.halfWidth = S.adaptive.halfWidth;
    }

    S.pulse = { angle: S.rng() * 360, trail: [] };
    spawnTarget();
    syncHud();
    showScreen(null);
    els.btnPause.disabled = false;
    els.btnPause.setAttribute('aria-label', 'إيقاف مؤقت');
  }

  function endGame() {
    S.mode = 'over';
    els.btnPause.disabled = true;

    var acc = E.accuracy(S.hits, S.beats);
    var perfects = S.grades.filter(function (g) { return g === 'perfect'; }).length;
    var isDaily = S.variant === 'daily';
    var extra = '';

    if (isDaily) {
      var key = E.dateKey();
      var stored = readJSON('nabd.daily.' + key);
      if (!stored || S.score > stored.score) {
        stored = {
          score: S.score,
          hits: S.hits,
          beats: S.beats,
          grades: S.grades.slice(),
          at: Date.now()
        };
        writeJSON('nabd.daily.' + key, stored);
        S.newBest = true;
      }
      var streak = updateStreak();
      extra = 'أفضل نتيجة اليوم: ' + fmt(stored.score) + ' · 🔥 ' + streak + ' يوم متتالي';
    } else {
      if (S.score > bestEndless) {
        bestEndless = S.score;
        write('nabd.best.endless', bestEndless);
        S.newBest = true;
      }
      extra = 'أفضل نتيجة لك: ' + fmt(bestEndless);
    }

    els.result.kicker.textContent = (isDaily ? 'التحدّي اليومي' : 'اللعب الحر') +
      (S.newBest ? ' · رقم جديد!' : '');
    els.result.score.textContent = fmt(S.score);
    els.result.grid.textContent = buildGrid(S.grades);
    els.result.acc.textContent = acc + '%';
    els.result.combo.textContent = String(S.bestCombo);
    els.result.perfect.textContent = String(perfects);
    els.result.extra.textContent = extra;
    els.result.btnShare.textContent = 'انسخ النتيجة';
    showScreen('result');
    els.result.btnShare.focus();
  }

  function updateStreak() {
    var key = E.dateKey();
    var st = readJSON('nabd.streak') || { last: null, count: 0 };
    if (st.last === key) return st.count || 1;
    var y = new Date();
    y.setDate(y.getDate() - 1);
    var yKey = E.dateKey(y);
    st.count = st.last === yKey ? (st.count || 0) + 1 : 1;
    st.last = key;
    writeJSON('nabd.streak', st);
    return st.count;
  }

  function buildGrid(grades) {
    var rows = [];
    for (var i = 0; i < grades.length; i += 10) {
      rows.push(grades.slice(i, i + 10).map(function (g) {
        return (E.GRADES[g] || E.GRADES.miss).emoji;
      }).join(''));
    }
    return rows.join('\n');
  }

  function buildShareText() {
    var isDaily = S.variant === 'daily';
    var acc = E.accuracy(S.hits, S.beats);
    var head = isDaily
      ? 'نبض · التحدّي اليومي ' + E.dateKey()
      : 'نبض · اللعب الحر';
    var body = fmt(S.score) + ' نقطة · دقة ' + acc + '% · أطول سلسلة ' + S.bestCombo;
    var grid = buildGrid(S.grades);
    var link = location.protocol === 'file:' ? '' : location.origin;
    return head + '\n' + body + (grid ? '\n' + grid : '') + (link ? '\n' + link : '');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (err) { reject(err); }
    });
  }

  function share() {
    var text = buildShareText();
    var done = function () {
      els.result.btnShare.textContent = 'تم النسخ ✓';
      setTimeout(function () { els.result.btnShare.textContent = 'انسخ النتيجة'; }, 1800);
    };
    if (navigator.share) {
      navigator.share({ text: text }).then(function () {
        els.result.btnShare.textContent = 'تمت المشاركة ✓';
      }).catch(function () {
        copyText(text).then(done).catch(function () { /* تجاهل */ });
      });
      return;
    }
    copyText(text).then(done).catch(function () {
      els.result.btnShare.textContent = 'تعذّر النسخ';
    });
  }

  function pause() {
    if (S.mode !== 'playing') return;
    S.mode = 'paused';
    showScreen('pause');
    els.btnPause.setAttribute('aria-label', 'متابعة');
  }

  function resume() {
    if (S.mode !== 'paused') return;
    S.mode = 'playing';
    S.lastTs = 0;
    showScreen(null);
    els.btnPause.setAttribute('aria-label', 'إيقاف مؤقت');
  }

  function goHome() {
    S.mode = 'idle';
    S.pulse = { angle: 0, trail: [] };
    S.target = { angle: 110, hw: 24 };
    S.score = 0;
    S.beats = 0;
    S.grades = [];
    S.effects = [];
    els.floats.innerHTML = '';
    syncHud();
    showScreen('start');
    var first = els.screens.start.querySelector('[data-start="daily"]');
    if (first) first.focus();
  }

  function bind() {
    els.screens.start.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-start]');
      if (!btn) return;
      startGame(btn.getAttribute('data-start'));
    });

    els.screens.pause.addEventListener('click', function (e) {
      if (e.target.closest('#btnResume')) { resume(); return; }
      if (e.target.closest('#btnQuit')) { goHome(); }
    });

    els.screens.result.addEventListener('click', function (e) {
      if (e.target.closest('#btnShare')) { share(); return; }
      if (e.target.closest('#btnReplay')) { startGame(S.variant); return; }
      if (e.target.closest('#btnHome')) { goHome(); }
    });

    els.btnPause.addEventListener('click', function () {
      if (S.mode === 'playing') pause();
      else if (S.mode === 'paused') resume();
    });

    els.btnSound.addEventListener('click', function () {
      soundOn = !soundOn;
      write('nabd.sound', soundOn ? '1' : '0');
      els.btnSound.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      els.btnSound.classList.toggle('is-off', !soundOn);
      if (soundOn) { ensureAudio(); tone(660, 0.08, 'sine', 0.06); }
    });

    // لمس/نقر داخل منطقة اللعب
    els.stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button, a')) return;
      if (S.mode !== 'playing') return;
      e.preventDefault();
      tap();
    }, { passive: false });

    // لوحة المفاتيح
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
        var active = document.activeElement;
        if (active && (active.tagName === 'BUTTON' || active.tagName === 'A')) {
          if (e.code === 'Enter' || e.code === 'Space') return;
        }
        if (S.mode === 'playing') {
          e.preventDefault();
          tap();
        }
        return;
      }
      if (e.code === 'Escape') {
        if (S.mode === 'playing') { e.preventDefault(); pause(); }
        else if (S.mode === 'paused') { e.preventDefault(); resume(); }
      }
      if (e.code === 'KeyM' && e.altKey) {
        els.btnSound.click();
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && S.mode === 'playing') pause();
    });

    if ('ResizeObserver' in window) {
      new ResizeObserver(resizeStage).observe(els.stage);
    } else {
      window.addEventListener('resize', resizeStage);
    }
    window.addEventListener('orientationchange', function () {
      setTimeout(resizeStage, 120);
    });
  }

  function init() {
    els.btnSound.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    els.btnSound.classList.toggle('is-off', !soundOn);
    els.btnPause.disabled = true;
    resizeStage();
    bind();
    syncHud();
    showScreen('start');
    requestAnimationFrame(loop);

    // تحديث بطاقة أفضل نتيجة في الصفحة
    var sideBest = document.getElementById('sideBest');
    if (sideBest) sideBest.textContent = fmt(bestEndless);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
