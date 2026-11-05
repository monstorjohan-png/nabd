'use strict';
/* اختبارات محرك نبض — شغّلها بـ: node test/engine.test.js */

var E = require('../js/engine.js');

var passed = 0;
var failed = 0;

function ok(name, cond, detail) {
  if (cond) {
    passed += 1;
  } else {
    failed += 1;
    console.error('  ✗ ' + name + (detail ? ' — ' + detail : ''));
  }
}

function near(a, b, eps) {
  return Math.abs(a - b) <= (eps == null ? 1e-9 : eps);
}

/* ── الفرق الزاوي ───────────────────────────────────────────── */
ok('angDiff: 350 → 0 = +10', E.angDiff(350, 0) === 10, E.angDiff(350, 0));
ok('angDiff: 0 → 350 = −10', E.angDiff(0, 350) === -10, E.angDiff(0, 350));
ok('angDiff: 10 → 10 = 0', E.angDiff(10, 10) === 0);
ok('angDiff: 0 → 90 = +90', E.angDiff(0, 90) === 90);
ok('angDiff: 90 → 0 = −90', E.angDiff(90, 0) === -90);
ok('angDiff: المدى ضمن ±180', (function () {
  for (var i = 0; i < 720; i++) {
    var d = E.angDiff(i * 0.5, (i * 1.7) % 360);
    if (d > 180 || d <= -180) return false;
  }
  return true;
})());

/* ── الحكم على الضربة ───────────────────────────────────────── */
var hw = 20;
ok('judge: المنتصف = مثالي', E.judge(0, hw) === 'perfect');
ok('judge: 30% = مثالي', E.judge(hw * 0.3, hw) === 'perfect');
ok('judge: 34% = مثالي', E.judge(hw * 0.34, hw) === 'perfect');
ok('judge: 35% = ممتاز', E.judge(hw * 0.35, hw) === 'great');
ok('judge: 68% = ممتاز', E.judge(hw * 0.68, hw) === 'great');
ok('judge: 69% = جيد', E.judge(hw * 0.69, hw) === 'good');
ok('judge: 100% = جيد', E.judge(hw, hw) === 'good');
ok('judge: 101% = فاتتك', E.judge(hw * 1.01, hw) === 'miss');
ok('judge: السالب يُعامل بالقيمة المطلقة', E.judge(-hw * 0.5, hw) === 'great');
ok('judge: عرض صفري = فاتتك', E.judge(0, 0) === 'miss');

/* ── النقاط والمضاعف ────────────────────────────────────────── */
ok('combo: 1 = ×1.0', near(E.comboMultiplier(1), 1));
ok('combo: 11 = ×1.5', near(E.comboMultiplier(11), 1.5));
ok('combo: 21 = ×2.0', near(E.comboMultiplier(21), 2));
ok('combo: 500 = ×2.0 (سقف)', near(E.comboMultiplier(500), 2));
ok('score: perfect ×1 = 100', E.scoreFor('perfect', 1) === 100);
ok('score: perfect ×2 = 200', E.scoreFor('perfect', 30) === 200);
ok('score: great ×1 = 60', E.scoreFor('great', 1) === 60);
ok('score: good ×1 = 30', E.scoreFor('good', 1) === 30);
ok('score: miss = 0', E.scoreFor('miss', 25) === 0);
ok('score: رتبة أعلى = نقاط أكثر', (function () {
  return E.scoreFor('perfect', 4) > E.scoreFor('great', 4) &&
         E.scoreFor('great', 4) > E.scoreFor('good', 4) &&
         E.scoreFor('good', 4) > E.scoreFor('miss', 4);
})());

/* ── الصعوبة التكيفية ───────────────────────────────────────── */
ok('adaptive: يبدأ ضمن الحدود', (function () {
  var a = E.createAdaptive();
  return a.speed >= E.LIMITS.speed.min && a.speed <= E.LIMITS.speed.max &&
         a.halfWidth >= E.LIMITS.halfWidth.min && a.halfWidth <= E.LIMITS.halfWidth.max;
})());

ok('adaptive: الإتقان يرفع السرعة ويضيّق النافذة', (function () {
  var a = E.createAdaptive();
  var s0 = a.speed, w0 = a.halfWidth;
  for (var i = 0; i < 30; i++) a.update('perfect');
  return a.speed > s0 && a.halfWidth < w0;
})());

ok('adaptive: لا يتجاوز الحدود العليا', (function () {
  var a = E.createAdaptive();
  for (var i = 0; i < 500; i++) a.update('perfect');
  return a.speed <= E.LIMITS.speed.max + 1e-9 &&
         a.halfWidth >= E.LIMITS.halfWidth.min - 1e-9;
})());

ok('adaptive: الفشل يخفّض السرعة ويوسّع النافذة', (function () {
  var a = E.createAdaptive();
  for (var i = 0; i < 20; i++) a.update('perfect');
  var s1 = a.speed, w1 = a.halfWidth;
  a.update('miss');
  return a.speed < s1 && a.halfWidth > w1;
})());

ok('adaptive: لا ينزل تحت الحدود الدنيا', (function () {
  var a = E.createAdaptive();
  for (var i = 0; i < 500; i++) a.update('miss');
  return a.speed >= E.LIMITS.speed.min - 1e-9 &&
         a.halfWidth <= E.LIMITS.halfWidth.max + 1e-9;
})());

/* ── موضع الهدف التالي ──────────────────────────────────────── */
ok('target: أمام النبض دائماً (200 عينة)', (function () {
  var rng = E.mulberry32(12345);
  for (var i = 0; i < 200; i++) {
    var pulse = rng() * 360;
    var speed = 155 + rng() * 185;
    var angle = E.nextTargetAngle(pulse, speed, rng);
    var d = E.angDiff(pulse, angle);
    if (d <= 0) return false;              // يجب أن يكون أمامه
    if (d > 168.001) return false;         // ضمن سقف المسافة
    if (angle < 0 || angle >= 360) return false;
  }
  return true;
})());

ok('target: المسافة تكفل زمناً أدنى عند السرعات العالية', (function () {
  var rng = E.mulberry32(7);
  var minTime = 10;
  for (var i = 0; i < 200; i++) {
    var speed = 155 + rng() * 185;
    var gap = E.angDiff(0, E.nextTargetAngle(0, speed, rng));
    var t = gap / speed;
    if (t < minTime) minTime = t;
  }
  return minTime >= 0.2; // هامش أمان: لا تقل النافذة عن 200ms
})());

/* ── البذور والتحدّي اليومي ─────────────────────────────────── */
ok('seed: نفس التاريخ = نفس البذرة', E.dailySeed('2026-11-05') === E.dailySeed('2026-11-05'));
ok('seed: تاريخ مختلف = بذرة مختلفة', E.dailySeed('2026-11-05') !== E.dailySeed('2026-11-06'));
ok('seed: مولّد mulberry32 قابل للتكرار', (function () {
  var a = E.mulberry32(999);
  var b = E.mulberry32(999);
  for (var i = 0; i < 50; i++) if (a() !== b()) return false;
  return true;
})());
ok('seed: مخرجات المولّد ضمن [0,1)', (function () {
  var rng = E.mulberry32(42);
  for (var i = 0; i < 1000; i++) {
    var v = rng();
    if (v < 0 || v >= 1) return false;
  }
  return true;
})());

ok('daily: التدرّج يزيد السرعة ويضيّق النافذة', (function () {
  var a = E.dailyParams(0), b = E.dailyParams(29);
  return b.speed > a.speed && b.halfWidth < a.halfWidth;
})());
ok('daily: 30 نبضة بحدود معقولة', (function () {
  var p = E.dailyParams(29);
  var windowMs = (p.halfWidth * 2 / p.speed) * 1000;
  return windowMs >= 90; // النافذة النهائية لا تقل عن 90ms
})());
ok('daily: الفهرس خارج المدى لا ينهار', (function () {
  var a = E.dailyParams(-5), b = E.dailyParams(500);
  return a.speed === E.dailyParams(0).speed && b.speed === E.dailyParams(29).speed;
})());

/* ── الدقة ─────────────────────────────────────────────────── */
ok('accuracy: 0 محاولات = 0', E.accuracy(0, 0) === 0);
ok('accuracy: 15/30 = 50%', E.accuracy(15, 30) === 50);
ok('accuracy: 30/30 = 100%', E.accuracy(30, 30) === 100);

/* ── الملخص ────────────────────────────────────────────────── */
console.log('\n' + (failed === 0 ? '✓' : '✗') + ' ' + passed + ' نجحت، ' + failed + ' فشلت');
process.exit(failed === 0 ? 0 : 1);
