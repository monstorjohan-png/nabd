# نبض — Desktop App (Windows)

## 1. PWA (يعمل الآن، بدون تثبيت)

الموقع PWA (manifest + service worker). في Edge/Chrome:
1. افتح الموقع.
2. أيقونة «تثبيت» في شريط العنوان (أو قائمة ⋮ → «تثبيت نبض»).
3. يظهر في قائمة Start وسطح المكتب، يعمل offline.

## 2. Electron (نسخة .exe حقيقية)

### المتطلبات
- Node.js 18+ (مثبّت لديك).
- ~200 MB لتحميل Electron (مرة واحدة).

### البناء (في `desktop/`)
```powershell
cd E:\sites\nabd\desktop
npm install
npm run build:win   # ينتج installer في dist/
```

### portable (بدون installer)
```powershell
npm start   # يشغّل التطبيق مباشرة
```

### ملاحظات
- التطبيق يحمّل `../index.html` (ملفات محلية) → يعمل offline.
- Service Worker معطّل على file:// (مقبول).
- للتحديث: أعد البناء بعد تعديل الموقع.
