# نبض — Desktop App (Windows)

## 1. PWA (يعمل الآن، بدون تثبيت)

الموقع PWA (manifest + service worker). في Edge/Chrome:
1. افتح الموقع.
2. أيقونة «تثبيت» في شريط العنوان (أو قائمة ⋮ → «تثبيت نبض»).
3. يظهر في قائمة Start وسطح المكتب، يعمل offline.

## 2. Electron (نسخة .exe حقيقية) — جاهز الآن

تم تثبيت Electron runtime (v40) في `E:\nabd-runtime\` (بدون Arabic في المسار).
التطبيق **يعمل الآن** مع جميع 21 لعبة.

### التشغيل
- **اختصار Desktop:** `NABD.lnk` (على سطح المكتب)
- **أو:** `E:\sites\nabd\desktop\launch.bat`
- **أو مباشرة:** `E:\nabd-runtime\electron.exe E:\sites\nabd\desktop`

### البناء (installer .exe) — اختياري
```powershell
cd E:\sites\nabd\desktop
npm install   # يحتاج إنترنت (~200MB)
npm run build:win   # ينتج installer في dist/
```

### portable (بدون installer)
```powershell
E:\nabd-runtime\electron.exe E:\sites\nabd\desktop
```

### ملاحظات
- التطبيق يحمّل `../index.html` (ملفات محلية) → يعمل offline.
- Service Worker معطّل على file:// (مقبول).
- للتحديث: أعد البناء بعد تعديل الموقع.
