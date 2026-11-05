'use strict';
/* فحص ربط الواجهة: كل معرّف يستخدمه game.js يجب أن يوجد في index.html،
   وكل رابط محلي في الصفحات يجب أن يشير إلى ملف موجود.
   شغّله بـ: node test/wiring.test.js */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var passed = 0;
var failed = 0;

function ok(name, cond, detail) {
  if (cond) passed += 1;
  else {
    failed += 1;
    console.error('  ✗ ' + name + (detail ? ' — ' + detail : ''));
  }
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

var game = read('js/game.js');
var index = read('index.html');

/* كل المعرّفات المطلوبة من game.js */
var ids = new Set();
var idRe = /(?:\$\(|getElementById\()\s*['"]#?([A-Za-z][\w-]*)['"]/g;
var m;
while ((m = idRe.exec(game)) !== null) ids.add(m[1]);

ids.forEach(function (id) {
  ok('المعرّف #' + id + ' موجود في index.html', index.indexOf('id="' + id + '"') !== -1);
});

/* أزرار البدء */
['daily', 'endless'].forEach(function (mode) {
  ok('وضع اللعب "' + mode + '" مربوط بزر', index.indexOf('data-start="' + mode + '"') !== -1);
});

/* الصفحات الأساسية */
var pages = ['index.html', 'how-to.html', 'science.html', 'about.html', 'privacy.html', 'terms.html',
  'games.html', 'game-visual-search.html', 'game-working-memory.html', 'game-stroop.html',
  'game-vigilance.html', 'game-task-switching.html', 'game-go-nogo.html', 'game-subitizing.html',
  'game-change-blindness.html', 'game-mot.html', 'game-flanker.html',
  'game-delayed-gratification.html', 'game-time-estimation.html', 'game-categorization.html',
  'game-serial-reaction.html', 'game-perceptual-discrimination.html', 'game-probability.html',
  'game-dual-task.html', 'game-error-monitoring.html', 'game-pattern-matching.html',
  'game-alternating-attention.html', 'game-cpt.html', 'game-digit-span.html',
  'game-wcst.html', 'game-stop-signal.html', 'game-ior.html', 'game-mot-occlusion.html',
  'game-anchoring.html', 'game-odd-one-out.html', 'game-mental-rotation.html',
  'game-nback.html', 'game-semantic-priming.html', 'game-number-line.html',
  'game-conflict-monitoring.html', 'game-anticipation.html', 'game-post-error-slowing.html',
  'game-attentional-blink.html', 'game-serial-position.html', 'game-false-memory.html',
  'game-change-detection.html', 'game-popout-search.html'];
pages.forEach(function (page) {
  var html = read(page);
  ok(page + ': لغة عربية واتجاه RTL', /<html lang="ar" dir="rtl">/.test(html));
  ok(page + ': عنوان صفحة', /<title>[^<]{5,}<\/title>/.test(html));
  ok(page + ': وصف ميتا', /<meta name="description" content="[^"]{20,}"/.test(html));
  ok(page + ': viewport', /name="viewport"/.test(html));
  ok(page + ': CSS مربوط', html.indexOf('css/style.css') !== -1);
  ok(page + ': تذييل كامل', html.indexOf('site-footer') !== -1);
});

/* الملفات المحلية المُشار إليها */
var files = new Set();
pages.forEach(function (page) {
  var html = read(page);
  var re = /(?:href|src)="([^"#:]+)"/g;
  var mm;
  while ((mm = re.exec(html)) !== null) {
    var target = mm[1];
    if (target.indexOf('http') === 0 || target.indexOf('mailto:') === 0) continue;
    if (target.indexOf('data:') === 0) continue;
    files.add(target);
  }
});

files.forEach(function (file) {
  var clean = file.split('?')[0];
  ok('الملف المُشار إليه موجود: ' + clean, fs.existsSync(path.join(ROOT, clean)));
});

/* محرك اللعبة يُحمّل قبل الواجهة */
var enginePos = index.indexOf('js/engine.js');
var gamePos = index.indexOf('js/game.js');
ok('ترتيب السكربتات صحيح (engine قبل game)', enginePos !== -1 && gamePos !== -1 && enginePos < gamePos);

/* نقاط النهاية */
ok('game.js لا يحتوي TODO', game.indexOf('TODO') === -1);
ok('index.html يحتوي مساحة إعلانية موثّقة', index.indexOf('AdSense') !== -1);

console.log('\n' + (failed === 0 ? '✓' : '✗') + ' ' + passed + ' نجحت، ' + failed + ' فشلت');
process.exit(failed === 0 ? 0 : 1);
