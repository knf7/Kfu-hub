# ✅ Aseel SaaS — Release Checklist

> **قاعدة ذهبية:** لا نعرض رسالة نجاح قبل تأكيد persistence — لا نطلق deploy قبل إكمال هذه القائمة.

---

## 🔴 PRE-DEPLOY (قبل الرفع)

### الكود
- [ ] جميع التعديلات تمرّت على `npm test` بنسبة 100%
- [ ] لا أسرار (secrets) مكشوفة في Git:
  - `git grep -r "DB_PASSWORD\|JWT_SECRET\|ADMIN_SECRET\|REDIS_PASSWORD" -- '*.js' '*.ts' '*.env'` يجب أن يكون فارغاً
- [ ] `frontend-next` يبني بدون أخطاء: `npm run build`
- [ ] لا TypeScript errors: `npm run typecheck` أو `tsc --noEmit`

### البيئة (Vercel)
- [ ] متغيرات `assel-lone`:
  - `NEXT_PUBLIC_API_URL` تشير إلى backend الصحيح
- [ ] متغيرات `aseel-backend`:
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL` ✓
  - `JWT_SECRET` (أطول من 32 حرف) ✓
  - `ADMIN_SECRET`, `ADMIN_PASSWORD` ✓
  - `REDIS_URL` أو fallback `REQUIRE_REDIS=false` ✓

### قاعدة البيانات
- [ ] أي migration جديد طُبّق على Supabase (ref: `mqrsujilfreiqjxjddxp`)
- [ ] Views محدّثة بـ `security_invoker = true` (تم تطبيقه مسبقاً)

---

## 🟡 DEPLOY

### الترتيب الصحيح
```
1. push إلى main
2. انتظر CI أخضر (Backend CI → Frontend CI)
3. تأكد Vercel auto-deploy لـ:
   - assel-lone (frontend)
   - aseel-backend (backend)
4. انتظر كلا الـ deployments ينتهيان (عادةً 2-4 دقائق)
```

---

## 🟢 POST-DEPLOY — Smoke Tests (إلزامي)

### 1. قائمة العملاء
```
URL: /dashboard/customers
✓ القائمة تحمّل بدون 500
✓ pagination يعمل (صفحة 2، 3)
✓ البحث يعمل (اسم أو رقم هوية)
✓ لا أخطاء في Vercel Function Logs
```

### 2. ناجز — أهم اختبار
```
URL: /dashboard/loans?is_najiz_case=true (أو الصفحة المناسبة)
✓ تعديل najiz_collected_amount لأي قضية
✓ حفظ → انتظر toast نجاح
✓ Refresh الصفحة → القيمة ثابتة (لا تختفي)
✓ لو ظهر "تعذر تثبيت تحديث" → هذا صحيح (409 حقيقي)، أعد المحاولة
```

### 3. الداشبورد
```
URL: /dashboard
✓ الأرقام تتغير بعد تحديث ناجز
✓ لا infinite loading
✓ لا 500 في console
```

### 4. فحص Logs
```
Vercel → aseel-backend → Functions Logs
✓ لا أخطاء 500 متكررة على /api/customers
✓ لا "current transaction is aborted" بدون recovery
✓ لا "max clients" متكرر
```

---

## 🔵 KPIs للمراقبة (بعد 24 ساعة)

| المؤشر | الهدف | كيف تقيس |
|---|---|---|
| معدل 500 على `/api/customers` | < 0.1% | Vercel Logs → filter 500 |
| معدل 500 على `/api/loans` | < 0.1% | Vercel Logs → filter 500 |
| نجاح حفظ ناجز من أول محاولة | > 99% | logs "409 Conflict" count |
| Fallback hits في customers | < 5% | logs "hot-cache" + "emergency" |

---

## 🚨 ROLLBACK (إذا حدث مشكلة حرجة)

```bash
# خطوة 1: revert فوري على Vercel
# Vercel Dashboard → Deployment → ... → Instant Rollback

# خطوة 2: إذا كانت DB migration هي السبب
# اذهب لـ Supabase SQL Editor وطبّق rollback migration

# خطوة 3: إخطار الفريق فوراً بـ:
# - الـ endpoint المتأثر
# - نص الخطأ من logs
# - الوقت الدقيق
```

---

## 📅 تاريخ آخر deploy ناجح

| التاريخ | الـ commit | المنفّذ | الحالة |
|---|---|---|---|
| 2026-03-24 | `d98131c` | Auto | ✅ |

---

*آخر تحديث: 24 مارس 2026*
