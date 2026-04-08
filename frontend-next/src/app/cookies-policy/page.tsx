export const metadata = {
  title: 'سياسة ملفات تعريف الارتباط | أصيل المالي',
};

export default function CookiesPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900">سياسة ملفات تعريف الارتباط (Cookies)</h1>
        <p className="mt-2 text-slate-500">آخر تحديث: 2026-04-08</p>

        <section className="mt-10 space-y-6 text-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">1) ما هي الكوكيز؟</h2>
            <p>
              ملفات تعريف الارتباط هي ملفات نصية صغيرة تُحفظ في متصفحك لتساعدنا على تشغيل المنصة بشكل صحيح
              وتحسين تجربة الاستخدام.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">2) أنواع الكوكيز التي نستخدمها</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li><strong>كوكيز ضرورية:</strong> مطلوبة لتسجيل الدخول، الأمان، وتذكر إعدادات الجلسة.</li>
              <li><strong>كوكيز قياس الأداء:</strong> تساعدنا على فهم استخدام الصفحات وتحسين الأداء.</li>
              <li><strong>كوكيز تفضيلات:</strong> لحفظ اختيارات مثل المظهر أو اللغة أو عناصر الواجهة.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">3) إدارة الموافقة</h2>
            <p>
              يمكنك اختيار قبول جميع الكوكيز أو الاكتفاء بالضرورية فقط. يمكنك أيضاً تعديل إعدادات المتصفح
              لتعطيل الكوكيز في أي وقت.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">4) مدة الاحتفاظ</h2>
            <p>
              تختلف مدة التخزين حسب نوع الكوكي. الكوكيز الضرورية تُحفظ للمدة التشغيلية اللازمة، بينما الكوكيز
              التحليلية تُحفظ لفترات أقصر لتحسين الخدمة.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">5) التواصل</h2>
            <p>
              لأي استفسار حول هذه السياسة يمكنك التواصل عبر صفحة <a className="text-blue-600 hover:underline" href="/contact">التواصل</a>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

