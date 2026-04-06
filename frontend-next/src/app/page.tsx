'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Linkedin,
  Landmark,
  Mail,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import './landing.css';

type OperatingPoint = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
};

const HERO_BADGES = [
  'ربط مباشر مع ناجز',
  'إدخال سريع بالذكاء الاصطناعي',
  'تقرير شهري قابل للتصدير',
];

const OPERATING_POINTS: OperatingPoint[] = [
  {
    id: 'najiz-sync',
    title: 'مزامنة القضايا تلقائياً',
    description: 'تحديث المبلغ المرفوع، المتبقي، وحالة السداد من ناجز في نفس اليوم.',
    icon: Landmark,
  },
  {
    id: 'quick-entry',
    title: 'إدخال محادثة أسرع',
    description: 'اكتب طلبك بطريقة طبيعية والنظام يكوّن العميل والقرض تلقائياً مع التحقق.',
    icon: MessageSquareText,
  },
  {
    id: 'monthly-report',
    title: 'ملخص تنفيذي شهري',
    description: 'قراءة دقيقة للأرباح، التحصيل، والمتأخرات مع ملفات خارجية جاهزة للمشاركة.',
    icon: Database,
  },
];

const WORKFLOW_STEPS = [
  {
    id: 'step-1',
    title: 'أدخل البيانات',
    detail: 'عميل جديد أو سابق عبر النموذج أو الشات الذكي.',
  },
  {
    id: 'step-2',
    title: 'تابع الحالة لحظياً',
    detail: 'سير القضية، السداد، والتنبيهات تظهر مباشرة في لوحة واحدة.',
  },
  {
    id: 'step-3',
    title: 'استخرج التقرير',
    detail: 'CSV / Excel / JSON مع تفاصيل مهمة لصاحب القرار.',
  },
];

function MiniLogo() {
  return (
    <div className="landing-mini-logo" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div dir="rtl" className="moya-page">
      <header className="moya-header">
        <nav className="moya-nav moya-container">
          <div className="moya-brand">
            <MiniLogo />
            <div>
              <strong>أصيل المالي</strong>
              <span>نظام تشغيل القروض والتحصيل</span>
            </div>
          </div>

          <div className="moya-links">
            <a href="#solutions">الحلول</a>
            <a href="#workflow">آلية العمل</a>
            <a href="#developers">للمطورين</a>
            <a href="#contact">تواصل</a>
          </div>

          <div className="moya-actions">
            <Link href="/login" className="moya-btn moya-btn-ghost">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="moya-btn moya-btn-solid">
              ابدأ مجاناً
              <ArrowLeft size={16} />
            </Link>
          </div>
        </nav>
      </header>

      <main className="moya-main">
        <section className="moya-hero">
          <div className="moya-hero-beam" aria-hidden="true" />
          <div className="moya-container moya-hero-grid">
            <div className="moya-hero-copy">
              <p className="moya-eyebrow">حل تشغيلي عربي موحّد</p>
              <h1>نفس فكرة منصات الدفع الحديثة لكن مخصصة لإدارة القروض والتحصيل</h1>
              <p className="moya-lead">
                أصيل المالي يجمع الإدخال، المتابعة، وتحديث ناجز في تجربة واضحة وسريعة تساعدك على
                اتخاذ القرار من أول نظرة.
              </p>
              <div className="moya-hero-ctas">
                <Link href="/register" className="moya-btn moya-btn-solid moya-btn-lg">
                  ابدأ الآن
                </Link>
                <Link href="/pricing" className="moya-btn moya-btn-outline moya-btn-lg">
                  عرض الباقات
                </Link>
              </div>
              <ul className="moya-badges">
                {HERO_BADGES.map((badge) => (
                  <li key={badge}>{badge}</li>
                ))}
              </ul>
            </div>

            <aside className="moya-hero-visual" aria-label="ملخص تشغيلي حي">
              <div className="moya-orbit">
                <span className="moya-ring moya-ring-a" />
                <span className="moya-ring moya-ring-b" />
                <span className="moya-ring moya-ring-c" />
                <div className="moya-core">
                  <strong>83.1%</strong>
                  <span>نسبة التحصيل</span>
                </div>
                <b className="moya-node node-1">ناجز</b>
                <b className="moya-node node-2">API</b>
                <b className="moya-node node-3">Excel</b>
              </div>
            </aside>
          </div>
        </section>

        <section id="solutions" className="moya-section moya-container">
          <div className="moya-section-head">
            <h2>حلول تشغيلية على مستوى يومي</h2>
            <p>بدون زحمة عناصر. كل جزء مصمم ليختصر وقت الفريق ويرفع الدقة.</p>
          </div>

          <div className="moya-solution-layout">
            <article className="moya-list-block">
              <h3>يشغل كل العمليات من شاشة واحدة</h3>
              <ul>
                {OPERATING_POINTS.map((point) => {
                  const Icon = point.icon;
                  return (
                    <li key={point.id}>
                      <div className="moya-list-icon">
                        <Icon size={18} />
                      </div>
                      <div>
                        <strong>{point.title}</strong>
                        <p>{point.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>

            <article className="moya-state-block">
              <h3>الحالة الحالية الآن</h3>
              <ul>
                <li>
                  <CheckCircle2 size={17} />
                  <span>مزامنة ناجز اليوم</span>
                  <b>مستقر</b>
                </li>
                <li>
                  <Workflow size={17} />
                  <span>طلبات الإدخال السريع</span>
                  <b>26</b>
                </li>
                <li>
                  <ShieldCheck size={17} />
                  <span>اكتمال بيانات العملاء</span>
                  <b>98%</b>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section id="workflow" className="moya-section moya-container">
          <div className="moya-section-head">
            <h2>آلية تشغيل واضحة</h2>
            <p>من إدخال البيانات حتى القرار الشهري في ثلاث خطوات مباشرة.</p>
          </div>

          <div className="moya-flow">
            {WORKFLOW_STEPS.map((step, index) => (
              <article key={step.id} className="moya-flow-item">
                <span className="moya-flow-index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="developers" className="moya-section moya-container">
          <div className="moya-dev">
            <div className="moya-dev-copy">
              <h2>تكامل تقني سريع</h2>
              <p>
                اربط تطبيقك الداخلي أو نظام المحاسبة عبر API واضح، وفعّل الإدخال السريع والتقارير
                الخارجية بدون تعقيد.
              </p>
              <Link href="/contact" className="moya-btn moya-btn-outline">
                تواصل للتكامل
              </Link>
            </div>
            <pre className="moya-code" aria-label="مثال طلب API">
              <code>{`POST /api/v1/quick-entry
{
  "customer_name": "أحمد سالم",
  "loan_amount": 12000,
  "source": "chat",
  "month": "2026-04"
}`}</code>
            </pre>
          </div>
        </section>

        <section className="moya-final-cta moya-container">
          <div>
            <h2>جاهز تنقل التشغيل لمستوى أقوى؟</h2>
            <p>ابدأ الآن وفعّل تجربة موحّدة مثل المنصات الحديثة لكن مبنية لحالتكم المالية.</p>
          </div>
          <div className="moya-final-actions">
            <Link href="/register" className="moya-btn moya-btn-solid moya-btn-lg">
              إنشاء حساب
            </Link>
            <Link href="/dashboard/quick-entry" className="moya-btn moya-btn-outline moya-btn-lg">
              تجربة الإدخال السريع
            </Link>
          </div>
        </section>
      </main>

      <footer id="contact" className="moya-footer">
        <div className="moya-container moya-footer-grid">
          <div className="moya-footer-brand">
            <MiniLogo />
            <div>
              <strong>أصيل المالي</strong>
              <p>تشغيل القروض، التحصيل، وناجز في منصة واحدة.</p>
            </div>
          </div>

          <div className="moya-footer-contact">
            <a href="mailto:info@assal-ksa.com">
              <Mail size={15} />
              info@assal-ksa.com
            </a>
            <a href="tel:+966500000000">
              <Phone size={15} />
              +966 50 000 0000
            </a>
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
              <Linkedin size={15} />
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
