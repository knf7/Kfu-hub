# Playwright E2E

## التشغيل السريع

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

## أوامر مفيدة

- `npm run test:e2e` تشغيل كل الاختبارات
- `npm run test:e2e:ui` تشغيل الواجهة التفاعلية للاختبارات
- `npm run test:e2e:report` فتح تقرير HTML

## ملاحظات

- الاختبارات تستخدم Mock API داخليًا لضمان الثبات والسرعة.
- لتشغيلها على بيئة فعلية: صدّر `E2E_BASE_URL` ثم شغّل نفس الأمر.
