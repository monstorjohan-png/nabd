# نبض — NABD

لعبة ويب مجانية للانتباه والإيقاع: اضغط في اللحظة التي يعبر فيها النبض الهدف.
تحدٍّ يومي من 30 نبضة + لعب حر بصعوبة تتكيّف مع اللاعب. بلا تحميل، بلا حساب.

## التشغيل محلياً

```powershell
cd E:\sites\nabd
python -m http.server 4173 --directory .
# ثم افتح http://127.0.0.1:4173
```

## الاختبارات

```powershell
npm test            # 43 اختبار محرك + 81 اختبار ربط
node --check js/*.js sw.js
```

## النشر (للربح)

### 1. GitHub Pages (مجاني)

```powershell
git init
git add .
git commit -m "feat: nabd v1"
# أنشئ مستودعاً على GitHub ثم:
git remote add origin https://github.com/<user>/nabd.git
git push -u origin main
# Settings → Pages → Deploy from branch (main / root)
```

### 2. Netlify / Cloudflare Pages (مجاني، CDN أسرع)

- اسحب المجلد أو اربط المستودع. `build command` فارغ، `publish dir` = `.` (root).
- Cloudflare Pages يعطي أداءً أفضل (Core Web Vitals) — مهم لـ AdSense SEO.

### 3. ads.txt

بعد قبول AdSense، أزل `#` من السطر في `ads.txt` وضع `pub-XXXXXXXXXXXXXXXX` (معرّف ناشرك).

## الربح: ما الذي ينجح فعلاً

### تصحيح مهم: «إضافة فيزا ثم سحب»

الأرباح **لا** «تتراكم» حتى «تُضيف بطاقة فيزا». التدفق (AdSense) هو:

1. حساب AdSense مقبُول (18+، موقع بملكية/محتوى أصلي، موافقة تستغرق 1–14 يوماً).
2. الإعلانات **تُعرض** فعلياً (بدون موافقة = 0$).
3. الرصيد **يُجمع** في لوحة AdSense (RPM ≈ 1$–5$ في منطقة MENA للألعاب).
4. **التحقق**: هوية (0$) + عنوان (عند 10$) + معلومات ضريبية (0$).
5. **طريقة دفع** (تحويل بنكي EFT/Wire — وليس «بطاقة فيزا») تُضاف عند 10$.
6. **الحد الأدنى للدفع**: 100$ (أو 5000 EGP إذا تقرّر بالجنيه). يُصرف شهرياً بعد تجاوز الحد.
7. لا «سحب» بطلبك: Google تدفع تلقائياً كل 21–26 من الشهر (EFT).

### مسارات بديلة (أسرع للألعاب)

| المسار | متى يناسب | الحد الأدنى للدفع | ملاحظة |
|---|---|---|---|
| **AdSense على موقعك** | محتوى + لعبة | 100$ | needs approval, slow |
| **Poki / CrazyGames** | رفع игра HTML5 | revenue share | تدفق مستخدمين جاهز، 50% إيراد |
| **GameMonetize / GameDistribution** | رفع игра | ~100$ PayPal | إيراد ≈ 0.3$–1$ per 1k plays |
| **AdMob (تطبيق)** | تطبيق أصلي/Capacitor | 100$ | eCPM أعلى، needs native wrapper |
| **Adsterra / PropellerAds** | بديل AdSense | 5$–100$ | RPM أدنى، قبول أسهل |

### رياضيات واقعية

- **MENA RPM** (ألف مشاهدة): 1$–5$ (AdSense)، 0.3$–1.5$ (portals).
- 100,000 مشاهدة ≈ 100$–500$.
- 1,000,000 مشاهدة ≈ 1,000$–5,000$.
- **الخلاصة**: 100$ (حد AdSense) requires **~20k–100k plays**. months, not days.

### ما يرفع الربح

1. **التحدّي اليومي** (موجود) → retention → more sessions → more ad impressions.
2. **زر مشاركة النتيجة** (موجود) → acquisition مجاني.
3. **صفحات محتوى** (موجودة: how-to, science, about) → AdSense approval + SEO.
4. **صفحة privacy + terms** (موجودة) → شرط قبول AdSense.
5. **ads.txt** (قالب موجود) → مطلوب بعد القبول.
6. **Core Web Vitals**: الموقع خفيف، PWA، LCP جيد → ترتيب أفضل في Google.
7. **لا إعلانات أثناء اللعب** → UX أفضل → retention أعلى → أرباح أعلى على المدى.

## خارطة الطريق

- [ ] نشر على GitHub Pages / Netlify.
- [ ] Google Search Console + sitemap (أضف sitemap.xml لاحقاً).
- [ ] تقديم AdSense (1–2 أسابيع).
- [ ] إضافة 2–3 ألعاب HTML5 إضافية على نفس الموقع (زيادة المحتوى).
- [ ] رفع نسخة إلى Poki/CrazyGames (تدفق مستخدمين).
- [ ] PWA install prompt + offline.
- [ ] i18n (EN/FR) لتوسيع TAM.

## الألعاب (21)

نبض، بصر، ذاكرة، ستروپ، يقظة، تبديل، كبح، عد، تغيير، تتبع، تشتيت،
تأخير، تقدير، تصنيف، تسلسل، تمييز، تخمين، تعقب، تصحيح، تشابه، تعاقب.
كل واحدة مبنية على بحث منشور (انظر science.html + كل صفحة لعبة).

## Desktop (Windows)

مجلد `desktop/` — Electron wrapper:
- `npm install && npm start` (portable)
- `npm run build:win` → installer في `dist/`
- PWA install (Edge/Chrome) يعمل بدون build.

## الأصول

```
assets/
  icon.svg          شعار متجهي
  icon-192.png      أيقونة PWA (192)
  icon-512.png      أيقونة PWA (512)
  og.png            بطاقة مشاركة (1200×630)
  og-card.html      مصدر بطاقة og
```

## الملاحظات (أنت، 2026-11-05)

- النموذج البصري (FreeLLMAPI) غير موثوق (يحوّل إلى openrouter/free). تحقّق من التصميم عبر `assets/shot-*` محلياً.
- `hello@example.com` placeholder — استبدله ببريدك قبل النشر.
- `canonical` URL placeholder `https://example.com/` — استبدله بـ domainك.
