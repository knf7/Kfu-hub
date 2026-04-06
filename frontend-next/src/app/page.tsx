'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Linkedin,
  Mail,
  Phone,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import './landing.css';

type LandingFeature = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
};

const TRUST_METRICS = [
  { id: 'active-cases', label: 'قضايا نشطة', value: '47' },
  { id: 'collection-rate', label: 'نسبة التحصيل', value: '83.1%' },
  { id: 'active-clients', label: 'عملاء نشطون', value: '49' },
  { id: 'monthly-flow', label: 'تدفق شهري', value: '111,531 ر.س' },
];

const FEATURES: LandingFeature[] = [
  {
    id: 'najiz',
    title: 'ربط ناجز في نفس الشاشة',
    description: 'تحديث مبالغ القضايا، المتبقي، والتحصيل بشكل لحظي بدون تنقل بين أنظمة متعددة.',
    icon: Scale,
  },
  {
    id: 'quick-entry',
    title: 'إدخال سريع ذكي',
    description: 'أدخل بيانات القرض والعميل بصيغة محادثة، والنظام يحولها مباشرة إلى سجل منظم.',
    icon: Zap,
  },
  {
    id: 'analytics',
    title: 'تحليل مالي واضح',
    description: 'ملخص شهري يفصل الربح، التحصيل، وحالات التعثر بطريقة تساعد على قرار سريع.',
    icon: BarChart3,
  },
];

const WORKFLOW = [
  {
    id: 'wf-1',
    title: 'إضافة عميل أو استيراد ملف',
    detail: 'قسم مستقل للعملاء وقسم مستقل للقروض.',
  },
  {
    id: 'wf-2',
    title: 'تسجيل القرض ومتابعة الحالة',
    detail: 'تنبيهات مباشرة عند التأخير أو تغير الحالة.',
  },
  {
    id: 'wf-3',
    title: 'تحديث قضايا ناجز',
    detail: 'قياس المتبقي والتحصيل من نفس لوحة التحكم.',
  },
  {
    id: 'wf-4',
    title: 'تقرير شهري قابل للتصدير',
    detail: 'CSV/Excel/JSON لتسليم واضح لصاحب القرار.',
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
  const [activeFeature, setActiveFeature] = useState(FEATURES[0].id);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  const activeFeatureContent = useMemo(
    () => FEATURES.find((feature) => feature.id === activeFeature) || FEATURES[0],
    [activeFeature]
  );

  return (
    <div dir="rtl" className="landing-page">
      <header className="landing-nav-wrap">
        <nav className="landing-nav container">
          <div className="landing-brand">
            <MiniLogo />
            <div>
              <strong>أصيل المالي</strong>
              <span>نظام إدارة القروض والتحصيل</span>
            </div>
          </div>

          <div className="landing-nav-links">
            <a href="#features">المميزات</a>
            <a href="#workflow">آلية العمل</a>
            <a href="#contact">تواصل</a>
          </div>

          <div className="landing-nav-actions">
            <Link href="/login" className="btn-ghost">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="btn-solid">
              ابدأ مجاناً
              <ArrowLeft size={16} />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="landing-hero container">
          <div className="hero-copy">
            <div className="hero-kicker">
              <Sparkles size={14} />
              منصة عربية لإدارة القروض وربط ناجز
            </div>
            <h1>
              واجهة مالية حديثة
              <span>تعطيك قرار أسرع وثقة أعلى</span>
            </h1>
            <p>
              صممنا أصيل المالي لتخدم المالك وفريق التشغيل: إدخال أسرع، تتبع أدق، وتحليل شهري
              مركز على الزبدة الفعلية.
            </p>

            <div className="hero-actions">
              <Link href="/register" className="btn-solid large">
                ابدأ الآن
              </Link>
              <Link href="/dashboard/quick-entry" className="btn-outline large">
                جرّب الإدخال السريع
              </Link>
            </div>

            <div className="hero-trust-grid">
              {TRUST_METRICS.map((item) => (
                <article key={item.id}>
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </div>

          <aside className="hero-live-card">
            <h2>نظرة تشغيل اليوم</h2>
            <ul>
              <li>
                <CheckCircle2 size={16} />
                <span>التحديثات من ناجز متزامنة</span>
                <b className="state up">مستقر</b>
              </li>
              <li>
                <Users size={16} />
                <span>عملاء متأخرون أكثر من 30 يوم</span>
                <b className="state warn">8</b>
              </li>
              <li>
                <CircleDollarSign size={16} />
                <span>تحصيلات اليوم</span>
                <b className="state up">12,400 ر.س</b>
              </li>
              <li>
                <ShieldCheck size={16} />
                <span>جودة البيانات</span>
                <b className="state neutral">98%</b>
              </li>
            </ul>
          </aside>
        </section>

        <section id="features" className="landing-section container">
          <div className="section-head">
            <h2>مصممة لطبيعة عملكم اليومية</h2>
            <p>كل جزء في الواجهة موجه لتقليل الوقت الضائع في المتابعة اليدوية.</p>
          </div>

          <div className="feature-layout">
            <div className="feature-tabs">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                const active = activeFeature === feature.id;
                return (
                  <button
                    key={feature.id}
                    type="button"
                    className={`feature-tab${active ? ' active' : ''}`}
                    onClick={() => setActiveFeature(feature.id)}
                  >
                    <Icon size={18} />
                    <span>{feature.title}</span>
                  </button>
                );
              })}
            </div>

            <article className="feature-panel">
              <div className="feature-panel-icon">
                <activeFeatureContent.icon size={20} />
              </div>
              <h3>{activeFeatureContent.title}</h3>
              <p>{activeFeatureContent.description}</p>
            </article>
          </div>
        </section>

        <section id="workflow" className="landing-section container">
          <div className="section-head">
            <h2>تسلسل واضح من الإدخال إلى التقرير</h2>
            <p>بدون تعقيد بصري. كل خطوة لها نتيجة مباشرة وقابلة للقياس.</p>
          </div>

          <div className="workflow-grid">
            {WORKFLOW.map((step, index) => (
              <article key={step.id} className="workflow-card">
                <span className="workflow-index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta container">
          <div>
            <h2>جاهز تبدأ تشغيل فعلي من اليوم؟</h2>
            <p>سجل الآن وابدأ بإدخال العملاء والقروض ومتابعة ناجز من لوحة واحدة.</p>
          </div>
          <div className="cta-actions">
            <Link href="/register" className="btn-solid large">
              إنشاء حساب
            </Link>
            <Link href="/pricing" className="btn-outline large">
              عرض الباقات
            </Link>
          </div>
        </section>
      </main>

      <footer id="contact" className="landing-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <MiniLogo />
            <div>
              <strong>أصيل المالي</strong>
              <p>منصة تشغيل مالية عربية تركّز على الوضوح والثقة.</p>
            </div>
          </div>

          <div className="footer-contact">
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
