/*
 * نبض — محرك اللعبة النقي.
 * لا يعتمد على DOM، ويعمل في المتصفح وفي Node (للاختبار).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NabdEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LIMITS = {
    speed: { min: 155, max: 340 },
    halfWidth: { min: 10.5, max: 30 }
  };

  var GRADES = {
    perfect: { key: 'perfect', label: 'مثالي', points: 100, emoji: '🟩' },
    great:   { key: 'great',   label: 'ممتاز', points: 60,  emoji: '🟨' },
    good:    { key: 'good',    label: 'جيد',   points: 30,  emoji: '🟦' },
    miss:    { key: 'miss',    label: 'فاتتك', points: 0,   emoji: '⬛' }
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* الفرق الزاوي الموقّع (بالدرجات) من from إلى to.
     موجب = الهدف أمام النبض (لم يصله بعد)، سالب = تجاوزه. */
  function angDiff(from, to) {
    var d = (to - from) % 360;
    if (d > 180) d -= 360;
    if (d <= -180) d += 360;
    return d;
  }

  /* حكم على ضربة: offset = |d| بالدرجات، hw = نصف عرض النافذة. */
  function judge(offset, halfWidth) {
    if (!(halfWidth > 0)) return GRADES.miss.key;
    var ratio = Math.abs(offset) / halfWidth;
    if (ratio <= 0.34) return GRADES.perfect.key;
    if (ratio <= 0.68) return GRADES.great.key;
    if (ratio <= 1) return GRADES.good.key;
    return GRADES.miss.key;
  }

  /* مضاعف السلسلة: 1.0 ثم +0.05 لكل ضربة متتالية، بحد أقصى 2.0. */
  function comboMultiplier(combo) {
    return 1 + clamp(combo - 1, 0, 20) * 0.05;
  }

  function scoreFor(gradeKey, combo) {
    var g = GRADES[gradeKey] || GRADES.miss;
    if (!g.points) return 0;
    return Math.round(g.points * comboMultiplier(combo));
  }

  /* مولد أرقام شبه عشوائي قابل للتكرار (mulberry32). */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* تجزئة نص إلى عدد صحيح 32-بت (xfnv1a). */
  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function dateKey(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function dailySeed(key) {
    return hashString('nabd-daily::' + key);
  }

  /* منحنى التحدّي اليومي: ثابت للجميع، يتدرّج في 30 نبضة. */
  function dailyParams(index) {
    var i = clamp(index, 0, 29);
    return {
      speed: 158 + i * 4.6,        // 158 → 291 درجة/ثانية
      halfWidth: 27 - i * 0.38     // 27 → 16 درجة
    };
  }

  /* الصعوبة التكيفية للعب الحر: تتسع عند التعثر وتضيق عند الإتقان. */
  function createAdaptive() {
    return {
      speed: 160,
      halfWidth: 26,
      recent: [],
      missStreak: 0,
      update: function (gradeKey) {
        this.recent.push(gradeKey);
        if (this.recent.length > 8) this.recent.shift();

        if (gradeKey === 'miss') {
          this.missStreak += 1;
          this.speed = clamp(this.speed - 26, LIMITS.speed.min, LIMITS.speed.max);
          this.halfWidth = clamp(this.halfWidth + 2.6, LIMITS.halfWidth.min, LIMITS.halfWidth.max);
          return this;
        }

        this.missStreak = 0;
        this.speed = clamp(
          this.speed + (gradeKey === 'perfect' ? 6 : 4),
          LIMITS.speed.min, LIMITS.speed.max
        );
        this.halfWidth = clamp(
          this.halfWidth - (gradeKey === 'perfect' ? 0.55 : 0.3),
          LIMITS.halfWidth.min, LIMITS.halfWidth.max
        );

        if (this.recent.length >= 5) {
          var hits = this.recent.filter(function (g) { return g !== 'miss'; }).length;
          if (hits / this.recent.length >= 0.85) {
            this.speed = clamp(this.speed + 7, LIMITS.speed.min, LIMITS.speed.max);
            this.halfWidth = clamp(this.halfWidth - 0.8, LIMITS.halfWidth.min, LIMITS.halfWidth.max);
          }
        }
        return this;
      }
    };
  }

  /* موضع الهدف التالي: أمام النبض دائماً، بمسافة تكفل زمناً عادلاً للتفاعل. */
  function nextTargetAngle(pulseAngle, speed, rand, opts) {
    opts = opts || {};
    var tMin = opts.tMin != null ? opts.tMin : 0.40;
    var tMax = opts.tMax != null ? opts.tMax : 1.15;
    var gap = clamp(speed * (tMin + rand() * (tMax - tMin)), 42, 168);
    var a = (pulseAngle + gap) % 360;
    return a < 0 ? a + 360 : a;
  }

  function accuracy(hits, beats) {
    if (!beats) return 0;
    return Math.round((hits / beats) * 100);
  }

  return {
    LIMITS: LIMITS,
    GRADES: GRADES,
    clamp: clamp,
    angDiff: angDiff,
    judge: judge,
    comboMultiplier: comboMultiplier,
    scoreFor: scoreFor,
    mulberry32: mulberry32,
    hashString: hashString,
    dateKey: dateKey,
    dailySeed: dailySeed,
    dailyParams: dailyParams,
    createAdaptive: createAdaptive,
    nextTargetAngle: nextTargetAngle,
    accuracy: accuracy
  };
});
