'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MotionConfig, motion } from 'framer-motion';
import Image from 'next/image';
import {
  ArrowLeft,
  BellRing,
  Check,
  Code2,
  Landmark,
  Linkedin,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import './landing.css';

const TRUST_POINTS = [
  'تحديث ناجز تلقائي',
  'دقة تشغيل يومية',
  'تقارير جاهزة للإدارة',
];

const CAPABILITIES = [
  {
    id: 'sync',
    title: 'تغذية قضايا ناجز مباشرة',
    detail:
      'نفس شاشة التشغيل تعرض المبلغ المرفوع، المتبقي، وحالة السداد بدون نقل بين أنظمة متفرقة.',
    icon: Landmark,
    iconClass: 'lp-color-primary',
    iconBgClass: 'lp-soft-primary',
  },
  {
    id: 'chat',
    title: 'إدخال سريع مدعوم بالذكاء الاصطناعي',
    detail:
      'المساعد يسأل عن النواقص، يتحقق من المدخلات، ثم ينشئ العميل والقرض في نفس التدفق.',
    icon: Sparkles,
    iconClass: 'lp-color-violet',
    iconBgClass: 'lp-soft-violet',
  },
  {
    id: 'ops',
    title: 'تنبيهات متابعة بدون ضوضاء',
    detail:
      'إشارات واضحة للحالات المتأخرة والحرجة مع ترتيب أولويات يومي لفريق التحصيل.',
    icon: BellRing,
    iconClass: 'lp-color-success',
    iconBgClass: 'lp-soft-success',
  },
];

const OPERATING_FLOW = [
  {
    id: 'f1',
    title: 'أدخل العملية',
    detail: 'سجل عميل جديد أو سابق عبر النموذج أو Rabbit بدون خطوات طويلة.',
  },
  {
    id: 'f2',
    title: 'راقب التنفيذ',
    detail: 'تابع تغيرات السداد وناجز من لوحة تشغيل واحدة مخصصة للعمل اليومي.',
  },
  {
    id: 'f3',
    title: 'سلم التقرير',
    detail: 'صدّر التقرير الشهري بصيغ خارجية واضحة ومناسبة لقرارات الملاك.',
  },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

function BrandMark() {
  // Reverted to the precise original logo requested by the user.
  return <Image src="/aseel-logo.svg" alt="أصيل المالي" width={38} height={38} className="object-contain drop-shadow-sm" priority />;
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
    <MotionConfig reducedMotion="user">
      <div dir="rtl" className="lp-page-wrapper">
        <div className="lp-mesh-bg" />

        <header className="fixed top-0 inset-x-0 z-50 lp-header">
        <nav className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="text-[1.1rem] font-black tracking-tight lp-color-ink">
              أصيل المالي
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {[
              { label: 'القدرات', id: 'capabilities' },
              { label: 'آلية التشغيل', id: 'workflow' },
              { label: 'التكامل', id: 'integration' }
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} className="lp-nav-link">
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:flex text-[0.95rem] font-bold lp-link-ink px-3 py-2 rounded-lg hover:bg-black/5">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="h-11 px-6 rounded-xl lp-btn-primary flex items-center justify-center gap-2 text-[0.95rem]">
              ابدأ الآن
              <ArrowLeft size={16} />
            </Link>
          </div>
        </nav>
      </header>

        <main className="relative z-10 pt-20">
        <section className="relative min-h-[85vh] flex items-center pt-16 pb-24">
          <div className="max-w-[1200px] mx-auto px-6 w-full grid lg:grid-cols-[1fr_0.85fr] items-center gap-12 lg:gap-16">
            
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="max-w-[600px] mx-auto lg:mx-0 text-center lg:text-right">
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border lp-border-line lp-color-muted font-bold text-[0.8rem] mb-6 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 lp-bg-primary"></span>
                </span>
                منصة تشغيل مالية عربية
              </motion.div>
              
              <motion.h1 variants={fadeInUp} className="text-[2.5rem] sm:text-[3rem] lg:text-[4rem] font-black lp-title">
                شغّل القروض والتحصيل بثقة <span className="lp-text-gradient-soft">تنفيذية</span>
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="mt-6 text-[1.05rem] lg:text-[1.1rem] lp-color-muted leading-[1.8] font-medium max-w-[540px] mx-auto lg:mx-0">
                تجربة موحّدة تربط الإدخال، متابعة ناجز، والتنبيهات، والتقرير الشهري في مسار واحد
                واضح لفريق التشغيل وصاحب القرار.
              </motion.p>

              <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link href="/register" className="h-12 px-8 rounded-xl lp-btn-primary flex items-center justify-center gap-2 text-[1rem]">
                  ابدأ مجاناً
                </Link>
                <Link href="#capabilities" className="h-12 px-8 rounded-xl lp-btn-outline flex items-center justify-center gap-2 text-[1rem] group">
                  تعرف أكثر
                  <ArrowLeft size={18} className="lp-color-muted group-hover:-translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              <motion.ul variants={fadeInUp} className="mt-10 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-[0.85rem] font-bold lp-color-muted bg-white/50 border lp-border-line px-3 py-1.5 rounded-full">
                    <Check size={14} className="lp-color-success" />
                    {point}
                  </li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
              className="relative perspective-[1200px] w-full max-w-[550px] mx-auto"
            >
              <div className="lp-mockup-wrapper transform-style-3d rotate-y-[-5deg] rotate-x-[5deg]">
                <div className="lp-mockup-header">
                  <div className="flex gap-2">
                     <span className="w-3 h-3 rounded-full lp-bg-danger" />
                     <span className="w-3 h-3 rounded-full lp-bg-amber" />
                     <span className="w-3 h-3 rounded-full lp-bg-success" />
                  </div>
                  <div className="mx-auto text-[0.7rem] font-mono tracking-widest text-white/40 uppercase">Aseel Control Center</div>
                </div>

                <div className="p-5 flex flex-col gap-4 relative">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'محفظة نشطة', val: '111,531 ر.س', color: 'text-white' },
                      { label: 'التحصيل', val: '83.12%', color: 'lp-color-success' },
                      { label: 'حالات', val: '8', color: 'lp-color-amber' },
                    ].map((stat, i) => (
                      <div key={i} className="lp-mockup-stats-card flex flex-col justify-center">
                        <span className="block text-white/50 text-[0.65rem] font-bold mb-1">{stat.label}</span>
                        <span className={`block text-[1rem] font-black tracking-tight ${stat.color}`}>{stat.val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-28 lp-mockup-chart-box relative flex items-end">
                    <svg viewBox="0 0 320 92" width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0 z-0 opacity-70">
                      <path d="M0,74 C34,68 56,26 92,28 C126,30 138,50 166,46 C196,42 216,16 248,18 C280,20 296,44 320,36 L320,92 L0,92 Z" fill="var(--lp-primary-soft-fill)" />
                      <path d="M0,74 C34,68 56,26 92,28 C126,30 138,50 166,46 C196,42 216,16 248,18 C280,20 296,44 320,36" fill="none" stroke="var(--lp-primary)" strokeWidth="2" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="lp-mockup-log-item flex items-center gap-3">
                       <div className="lp-color-primary"><ShieldCheck size={16} /></div>
                       <span className="text-[0.8rem] text-white/80">ناجز: تحديث تلقائي قبل <b className="text-white">6 دقائق</b></span>
                    </div>
                    <div className="lp-mockup-log-item flex items-center gap-3">
                       <div className="lp-color-violet"><Workflow size={16} /></div>
                       <span className="text-[0.8rem] text-white/80">Rabbit: إدخال <b className="text-white">24</b> عملية اليوم</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section id="capabilities" className="py-24 relative z-20">
          <div className="max-w-[1200px] mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-center max-w-2xl mx-auto mb-16"
            >
              <h2 className="text-[2rem] lg:text-[2.5rem] font-black lp-color-ink mb-4 lp-title">قدرات تشغيل تبني الثقة فعلياً</h2>
              <p className="text-[1.05rem] lp-color-muted font-medium leading-[1.8]">كل جزء في الواجهة له وظيفة تشغيلية مباشرة، مبني لتسريع العمل بدون عناصر مشتتة أو تفاصيل غير لازمة.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {CAPABILITIES.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.4, delay: idx * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                    className="p-8 lp-feature-card"
                  >
                    <div className={`w-12 h-12 rounded-[14px] ${item.iconBgClass} mb-6 lp-icon-box flex items-center justify-center`}>
                        <Icon className={item.iconClass} size={22} />
                    </div>
                    <h3 className="text-[1.2rem] font-bold lp-color-ink mb-3">{item.title}</h3>
                    <p className="text-[0.95rem] lp-color-muted leading-[1.8] font-medium">{item.detail}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* KPI Strip */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-12 grid md:grid-cols-3 gap-0 lp-kpi-strip overflow-hidden"
            >
               <div className="p-8 border-b md:border-b-0 md:border-l lp-border-line flex flex-col justify-center gap-2">
                  <span className="text-[0.8rem] font-bold lp-color-muted">دقة تحديث العمليات</span>
                  <strong className="text-[2rem] font-black lp-color-ink tracking-tight">99.2%</strong>
               </div>
               <div className="p-8 border-b md:border-b-0 md:border-l lp-border-line flex flex-col justify-center gap-2">
                  <span className="text-[0.8rem] font-bold lp-color-muted">سرعة إدخال العملية</span>
                  <strong className="text-[2rem] font-black lp-color-ink tracking-tight">&lt; 45 ثانية</strong>
               </div>
               <div className="p-8 flex flex-col justify-center gap-2">
                  <span className="text-[0.8rem] font-bold lp-color-muted">جاهزية التقرير الشهري</span>
                  <strong className="text-[2rem] font-black lp-color-ink tracking-tight">فوري</strong>
               </div>
            </motion.div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-24 lp-workflow-section">
          <div className="max-w-[1200px] mx-auto px-6 relative z-10 flex flex-col md:flex-row gap-12 lg:gap-20">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="md:w-1/3"
            >
              <h2 className="text-[2rem] lg:text-[2.5rem] font-black tracking-tight mb-4">سير عمل واضح</h2>
              <p className="text-[1.05rem] text-white/60 font-medium leading-[1.8]">تدفق واحد منظم يمنع الفجوات ويختصر وقت الفريق طوال الشهر من الإدخال حتى القرار.</p>
            </motion.div>

            <div className="md:w-2/3 flex flex-col gap-4">
               {OPERATING_FLOW.map((step, idx) => (
                  <motion.div 
                     key={step.id}
                     initial={{ opacity: 0, y: 10 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.4, delay: idx * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                     className="lp-workflow-card overflow-hidden"
                  >
                     <div className="absolute -top-4 -left-4 lp-workflow-number font-black select-none pointer-events-none">
                        {idx + 1}
                     </div>
                     <h3 className="text-[1.3rem] font-bold text-white mb-2 relative z-10">{step.title}</h3>
                     <p className="text-[0.95rem] text-white/60 leading-[1.8] font-medium relative z-10">{step.detail}</p>
                  </motion.div>
               ))}
            </div>
          </div>
        </section>

        {/* Integration */}
        <section id="integration" className="py-24 lp-bg-section-soft relative">
          <div className="max-w-[1200px] mx-auto px-6">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
               className="p-8 lg:p-14 grid lg:grid-cols-2 gap-12 items-center lp-integration-card"
            >
               <div>
                  <h2 className="text-[2rem] lg:text-[2.5rem] font-black lp-color-ink mb-4 lp-title">تكامل تقني نظيف</h2>
                  <p className="text-[1.05rem] lp-color-muted leading-[1.8] font-medium mb-8">
                  واجهات API واضحة تربط الإدخال السريع والتقارير الشهرية مع أنظمتكم الحالية بدون
                  تعقيد تشغيلي. موثقة، سريعة، ومبنية لتدوم.
                  </p>
                  <Link href="/contact" className="inline-flex items-center gap-2 h-12 px-6 rounded-xl lp-btn-outline font-bold">
                     <Code2 size={18} className="lp-color-primary" />
                     فريق التكامل
                  </Link>
               </div>

               <div className="lp-code-block font-mono text-[0.8rem] leading-[2.2] overflow-x-auto text-left" dir="ltr">
                  <span className="lp-color-success">POST</span> <span className="text-white/90">/api/v1/quick-entry</span>
                  <br/>
                  <span className="text-white/40">{"{"}</span>
                  <br/>
                  {"  "}<span className="lp-color-sky">&quot;customer_name&quot;</span><span className="text-white/40">:</span> <span className="lp-color-amber">&quot;عبدالله الزهراني&quot;</span>,
                  <br/>
                  {"  "}<span className="lp-color-sky">&quot;national_id&quot;</span><span className="text-white/40">:</span> <span className="lp-color-amber">&quot;1*********&quot;</span>,
                  <br/>
                  {"  "}<span className="lp-color-sky">&quot;loan_amount&quot;</span><span className="text-white/40">:</span> <span className="lp-color-violet-soft">12000</span>,
                  <br/>
                  {"  "}<span className="lp-color-sky">&quot;source&quot;</span><span className="text-white/40">:</span> <span className="lp-color-amber">&quot;chat&quot;</span>,
                  <br/>
                  {"  "}<span className="lp-color-sky">&quot;tags&quot;</span><span className="text-white/40">:</span> [<span className="lp-color-amber">&quot;najiz&quot;</span>, <span className="lp-color-amber">&quot;monthly-report&quot;</span>]
                  <br/>
                  <span className="text-white/40">{"}"}</span>
               </div>
            </motion.div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-24 bg-white">
           <div className="max-w-[1000px] mx-auto px-6">
              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                 className="lp-cta-wrapper px-8 py-16 lg:py-20 text-center"
              >
                 <div className="relative z-10">
                    <h2 className="text-[2rem] lg:text-[2.8rem] font-black text-white mb-4">جاهزين نرفع مستوى التشغيل؟</h2>
                    <p className="text-[1.05rem] text-white/80 font-medium mb-10 max-w-[600px] mx-auto leading-[1.8]">ابدأ اليوم وخل فريقك يشتغل على منصة واحدة مصممة للوضوح والانضباط المالي.</p>
                    <div className="flex flex-wrap justify-center gap-4">
                       <Link href="/register" className="h-12 px-8 rounded-xl bg-white lp-color-primary font-bold text-[1rem] flex items-center justify-center transition-transform hover:scale-[1.02] shadow-sm">
                          إنشاء حساب مجاني
                       </Link>
                       <Link href="/dashboard/quick-entry" className="h-12 px-8 rounded-xl border border-white/30 text-white font-bold text-[1rem] flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                          تجربة النظام
                          <ArrowLeft size={16} />
                       </Link>
                    </div>
                 </div>
              </motion.div>
           </div>
        </section>
      </main>

      <footer id="contact" className="bg-white border-t lp-border-line py-16 mt-0">
        <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-2 gap-10 items-start">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
               <BrandMark />
               <span className="text-[1.1rem] font-black tracking-tight lp-color-ink">أصيل المالي</span>
            </div>
            <p className="text-[0.95rem] lp-color-muted font-medium leading-[1.8] max-w-[360px]">منصة تشغيل القروض والتحصيل وربط ناجز لفرق العمل المالية في السعودية.</p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 md:justify-end h-full pt-2">
            <a href="mailto:info@aseel-ksa.com" className="flex items-center gap-2 text-[0.9rem] font-bold lp-link-muted">
              <Mail size={16} />
              info@aseel-ksa.com
            </a>
            <a href="tel:+966500000000" className="flex items-center gap-2 text-[0.9rem] font-bold lp-link-muted">
              <Phone size={16} />
              +966 50 000 0000
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[0.9rem] font-bold lp-link-muted">
              <Linkedin size={16} />
              LinkedIn
            </a>
            <a href="#integration" className="flex items-center gap-2 text-[0.9rem] font-bold lp-link-muted">
              <Code2 size={16} />
              API Docs
            </a>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-6 mt-16 pt-8 border-t lp-border-soft text-center text-[0.85rem] lp-color-muted font-medium">
           &copy; {new Date().getFullYear()} أصيل المالي. جميع الحقوق محفوظة.
        </div>
      </footer>
      </div>
    </MotionConfig>
  );
}
