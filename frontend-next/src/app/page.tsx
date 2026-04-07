'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
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
    color: 'from-[#1d77ff] to-[#0f54c3]',
  },
  {
    id: 'chat',
    title: 'إدخال سريع مدعوم بالذكاء الاصطناعي',
    detail:
      'المساعد يسأل عن النواقص، يتحقق من المدخلات، ثم ينشئ العميل والقرض في نفس التدفق.',
    icon: Sparkles,
    color: 'from-purple-500 to-[#1d77ff]',
  },
  {
    id: 'ops',
    title: 'تنبيهات متابعة بدون ضوضاء',
    detail:
      'إشارات واضحة للحالات المتأخرة والحرجة مع ترتيب أولويات يومي لفريق التحصيل.',
    icon: BellRing,
    color: 'from-[#0e9b76] to-teal-600',
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
      staggerChildren: 0.15,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

function BrandMark() {
  return (
    <motion.div
      whileHover={{ rotate: 180, scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
      className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0f54c3] to-[#1d77ff] p-[2px] shadow-lg shadow-blue-500/20"
    >
      <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
        <div className="w-4 h-4 bg-gradient-to-tr from-[#0f54c3] to-[#1d77ff] rounded-sm transform rotate-45" />
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div dir="rtl" className="lp-page-wrapper">
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      <header className="fixed top-0 inset-x-0 z-50 lp-header shadow-sm">
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group relative z-10">
            <BrandMark />
            <span className="text-xl font-black tracking-tight text-[#0f1c33] group-hover:text-[#1d77ff] transition-colors">
              أصيل المالي
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            {[
              { label: 'القدرات', id: 'capabilities' },
              { label: 'آلية التشغيل', id: 'workflow' },
              { label: 'التكامل', id: 'integration' }
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="lp-nav-link text-[15px]"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <Link href="/login" className="hidden sm:flex text-[15px] font-bold text-[#5b6f8f] hover:text-[#0f1c33] transition-colors h-11 items-center px-4 rounded-xl hover:bg-[#0f1c33]/5">
              تسجيل الدخول
            </Link>
            <Link
              href="/register"
              className="relative overflow-hidden h-11 px-6 rounded-xl lp-btn-primary flex items-center justify-center gap-2 font-bold text-[15px] group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative">ابدأ الآن</span>
              <ArrowLeft size={16} className="relative group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-20">
        <section className="relative min-h-[90vh] flex items-center overflow-hidden lp-hero-bg pb-32">
          {/* Animated Hero Blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-full pointer-events-none">
             <motion.div
               animate={{ rotate: 360, scale: [1, 1.1, 1] }}
               transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
               className="lp-hero-blob lp-hero-blob-1 top-[-10%] right-[10%] w-[40rem] h-[40rem] opacity-70"
             />
             <motion.div
               animate={{ rotate: -360, scale: [1, 1.2, 1] }}
               transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
               className="lp-hero-blob lp-hero-blob-2 bottom-[-10%] left-[10%] w-[35rem] h-[35rem] opacity-70"
             />
          </div>

          <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-[1fr_0.9fr] items-center gap-16 relative z-10">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="pt-20 lg:pt-0"
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full lp-hero-badge font-bold text-sm mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1d77ff] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1d77ff]"></span>
                </span>
                منصة تشغيل مالية عربية
              </motion.div>
              
              <motion.h1 variants={fadeInUp} className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-[-0.03em] text-[#0f1c33] drop-shadow-sm">
                شغّل القروض والتحصيل بثقة <span className="lp-text-gradient">تنفيذية</span>
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="mt-8 text-lg lg:text-xl text-[#5b6f8f] leading-[1.8] max-w-2xl font-medium">
                تجربة موحّدة تربط الإدخال، متابعة ناجز، والتنبيهات، والتقرير الشهري في مسار واحد
                واضح لفريق التشغيل وصاحب القرار.
              </motion.p>

              <motion.div variants={fadeInUp} className="mt-12 flex flex-wrap gap-4 focus-within:z-20">
                <Link href="/register" className="h-14 px-8 rounded-2xl bg-[#0f1c33] text-white flex items-center justify-center gap-2 font-bold text-lg hover:bg-[#1a2d52] transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0f1c33]/20">
                  ابدأ مجاناً
                </Link>
                <Link href="#capabilities" className="h-14 px-8 rounded-2xl lp-btn-outline flex items-center justify-center gap-2 font-bold text-lg group">
                  تعرف أكثر
                  <ArrowLeft size={18} className="text-[#1d77ff] group-hover:-translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              <motion.ul variants={fadeInUp} className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
                {TRUST_POINTS.map((point) => (
                  <motion.li 
                    key={point} 
                    className="flex items-center gap-2 text-[13px] font-bold text-[#5b6f8f]"
                    whileHover={{ scale: 1.05, color: '#0f1c33' }}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#0e9b76]/10 flex items-center justify-center">
                      <Check size={12} className="text-[#0e9b76]" />
                    </div>
                    {point}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -50, rotateY: 20 }}
              animate={{ opacity: 1, x: 0, rotateY: -5 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              style={{ y: heroY }}
              className="relative perspective-[1200px]"
            >
              {/* Glass Mockup Card */}
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ rotateY: 0, rotateX: 0, scale: 1.02, transition: { duration: 0.4 } }}
                className="w-full max-w-[600px] mx-auto rounded-3xl p-2 lp-mockup-wrapper cursor-crosshair transform-style-3d"
              >
                <div className="lp-mockup-inner rounded-[22px] overflow-hidden relative flex flex-col">
                  {/* Mockup Header */}
                  <div className="h-12 lp-mockup-header flex items-center justify-between px-5">
                    <div className="flex gap-2">
                       <span className="w-3 h-3 rounded-full bg-red-400" />
                       <span className="w-3 h-3 rounded-full bg-amber-400" />
                       <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <strong className="text-white/80 font-mono text-xs tracking-widest uppercase">Live Dashboard</strong>
                    <div className="h-6 px-3 rounded-full lp-status-badge text-[10px] font-black flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0e9b76] lp-badge-pulse" />
                      SECURE
                    </div>
                  </div>

                  {/* Mockup Body */}
                  <div className="p-5 flex flex-col gap-4 relative z-10">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'محفظة نشطة', val: '111,531 ر.س', color: 'text-white' },
                        { label: 'التحصيل الشهري', val: '83.12%', color: 'text-[#0e9b76]' },
                        { label: 'حالات متابعة', val: '8', color: 'text-amber-400' },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
                          <span className="block text-white/50 text-[11px] font-bold mb-1">{stat.label}</span>
                          <span className={`block text-lg font-black tracking-tight ${stat.color}`}>{stat.val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="h-28 rounded-xl border border-white/10 bg-gradient-to-br from-[#1d77ff]/10 to-transparent p-4 relative overflow-hidden flex items-end">
                      {/* Fake Chart Line */}
                      <svg viewBox="0 0 320 92" width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0 z-0 opacity-80">
                        <defs>
                          <linearGradient id="lpWaveFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1d77ff" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#1d77ff" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,74 C34,68 56,26 92,28 C126,30 138,50 166,46 C196,42 216,16 248,18 C280,20 296,44 320,36 L320,92 L0,92 Z" fill="url(#lpWaveFill)" />
                        <path d="M0,74 C34,68 56,26 92,28 C126,30 138,50 166,46 C196,42 216,16 248,18 C280,20 296,44 320,36" fill="none" stroke="#1d77ff" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      <div className="relative z-10 w-full flex justify-between text-white/30 text-[9px] font-mono mt-auto">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2.5">
                      <div className="flex items-center gap-3 text-[12px] text-white/70">
                         <div className="w-6 h-6 rounded-md bg-[#1d77ff]/20 flex items-center justify-center text-[#1d77ff]"><ShieldCheck size={14} /></div>
                         <span>ناجز: تحديث تلقائي قبل <b className="text-white font-bold text-[#89b7ff]">6 دقائق</b></span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-white/70">
                         <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400"><Workflow size={14} /></div>
                         <span>Rabbit: إدخال <b className="text-white font-bold text-purple-300">24</b> عملية اليوم</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shine effect over mockup */}
                  <div className="absolute inset-0 w-[200%] h-full lp-mockup-sweep -rotate-45 pointer-events-none translate-x-[-150%]" />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section id="capabilities" className="py-24 relative z-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <h2 className="text-4xl lg:text-5xl font-black text-[#0f1c33] mb-6 tracking-tight">قدرات تشغيل تبني الثقة فعلياً</h2>
              <p className="text-lg text-[#5b6f8f] font-medium leading-[1.8]">كل جزء في الواجهة له وظيفة تشغيلية مباشرة، مبني لتسريع العمل بدون عناصر مشتتة أو تفاصيل غير لازمة.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {CAPABILITIES.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    className="p-8 rounded-[2rem] lp-capability-card group"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} p-[1px] mb-6 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300`}>
                       <div className="w-full h-full lp-icon-box rounded-[15px] flex items-center justify-center">
                         <Icon className="text-[#0f1c33]" size={24} />
                       </div>
                    </div>
                    <h3 className="text-xl font-black text-[#0f1c33] mb-4 tracking-tight">{item.title}</h3>
                    <p className="text-[#5b6f8f] leading-[1.8] font-medium">{item.detail}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* KPI Strip */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-16 grid md:grid-cols-3 gap-0 rounded-[2rem] overflow-hidden lp-kpi-strip"
            >
               <div className="p-10 border-b md:border-b-0 md:border-l border-[#dce5f3] flex flex-col justify-center gap-2 group lp-kpi-item">
                  <span className="text-sm font-bold text-[#5b6f8f]">دقة تحديث العمليات</span>
                  <strong className="text-4xl font-black text-[#1d77ff] tracking-tight group-hover:scale-105 transition-transform origin-right">99.2%</strong>
               </div>
               <div className="p-10 border-b md:border-b-0 md:border-l border-[#dce5f3] flex flex-col justify-center gap-2 group lp-kpi-item">
                  <span className="text-sm font-bold text-[#5b6f8f]">سرعة إدخال العملية</span>
                  <strong className="text-4xl font-black text-[#0f1c33] tracking-tight group-hover:scale-105 transition-transform origin-right">&lt; 45 ثانية</strong>
               </div>
               <div className="p-10 flex flex-col justify-center gap-2 group lp-kpi-item">
                  <span className="text-sm font-bold text-[#5b6f8f]">جاهزية التقرير الشهري</span>
                  <strong className="text-4xl font-black text-[#0e9b76] tracking-tight group-hover:scale-105 transition-transform origin-right">فوري عند الطلب</strong>
               </div>
            </motion.div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="relative py-32 overflow-hidden lp-workflow-section">
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute bottom-0 left-0 w-[50rem] h-[50rem] bg-gradient-to-tr from-[#1d77ff]/20 to-transparent rounded-full blur-[100px] mix-blend-screen opacity-50" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10 text-white">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">سير عمل واضح من الإدخال حتى القرار</h2>
              <p className="text-lg text-blue-200/70 font-medium max-w-2xl leading-[1.8]">تدفق واحد منظم يمنع الفجوات ويختصر وقت الفريق طوال الشهر.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
               {OPERATING_FLOW.map((step, idx) => (
                  <motion.div 
                     key={step.id}
                     initial={{ opacity: 0, y: 30 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.5, delay: idx * 0.15 }}
                     className="relative p-8 rounded-3xl lp-workflow-card"
                  >
                     <div className="text-[7rem] font-black absolute top-0 left-4 lp-workflow-number select-none pointer-events-none leading-none">
                        {idx + 1}
                     </div>
                     <h3 className="text-2xl font-black text-white mb-4 relative z-10">{step.title}</h3>
                     <p className="text-blue-100/70 leading-[1.8] font-medium relative z-10">{step.detail}</p>
                  </motion.div>
               ))}
            </div>
          </div>
        </section>

        {/* Integration */}
        <section id="integration" className="py-24 bg-[#f5f8fd] relative">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               transition={{ duration: 0.7 }}
               className="rounded-[2.5rem] p-8 lg:p-14 grid lg:grid-cols-2 gap-12 items-center overflow-hidden relative lp-integration-card"
            >
               {/* Decorative background circle */}
               <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#1d77ff]/5 to-purple-400/5 rounded-full blur-3xl pointer-events-none" />

               <div>
                  <h2 className="text-3xl lg:text-4xl font-black text-[#0f1c33] mb-6 leading-[1.3] tracking-tight">تكامل تقني نظيف لفريقك الداخلي</h2>
                  <p className="text-[#5b6f8f] text-lg leading-[1.9] font-medium mb-10">
                  واجهات API واضحة تربط الإدخال السريع والتقارير الشهرية مع أنظمتكم الحالية بدون
                  تعقيد تشغيلي. موثقة، سريعة، ومبنية لتدوم.
                  </p>
                  <Link href="/contact" className="inline-flex items-center gap-2 h-14 px-8 rounded-2xl bg-white border-2 border-[#1d77ff]/20 text-[#1d77ff] font-bold hover:bg-[#1d77ff] hover:text-white hover:border-[#1d77ff] transition-all">
                     <Code2 size={18} />
                     تواصل لفريق التكامل
                  </Link>
               </div>

               <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="rounded-3xl p-6 lg:p-8 overflow-x-auto text-left lp-code-block"
                  dir="ltr"
               >
                  <pre className="text-[13px] leading-[2.2] font-mono text-blue-200/90 font-medium">
                     <span className="text-[#0e9b76]">POST</span> <span className="text-white">/api/v1/quick-entry</span>
                     <br/>
                     <span className="text-blue-300">{"{"}</span>
                     <br/>
                     {"  "}<span className="text-[#89b7ff]">&quot;customer_name&quot;</span><span className="text-white/50">:</span> <span className="text-amber-300">&quot;عبدالله الزهراني&quot;</span>,
                     <br/>
                     {"  "}<span className="text-[#89b7ff]">&quot;national_id&quot;</span><span className="text-white/50">:</span> <span className="text-amber-300">&quot;1*********&quot;</span>,
                     <br/>
                     {"  "}<span className="text-[#89b7ff]">&quot;loan_amount&quot;</span><span className="text-white/50">:</span> <span className="text-purple-300">12000</span>,
                     <br/>
                     {"  "}<span className="text-[#89b7ff]">&quot;source&quot;</span><span className="text-white/50">:</span> <span className="text-amber-300">&quot;chat&quot;</span>,
                     <br/>
                     {"  "}<span className="text-[#89b7ff]">&quot;tags&quot;</span><span className="text-white/50">:</span> [<span className="text-amber-300">&quot;najiz&quot;</span>, <span className="text-amber-300">&quot;monthly-report&quot;</span>]
                     <br/>
                     <span className="text-blue-300">{"}"}</span>
                  </pre>
               </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-24 bg-white relative">
           <div className="absolute inset-0 bg-gradient-to-t from-[#f5f8fd] to-transparent" />
           <div className="max-w-5xl mx-auto px-6 relative z-10">
              <motion.div 
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.7 }}
                 className="relative rounded-[2.5rem] overflow-hidden px-8 py-16 lg:p-20 text-center lp-cta-card"
              >
                 {/* Bg elements */}
                 <div className="absolute top-0 left-0 w-full h-full lp-cta-pattern opacity-30 pointer-events-none" />
                 
                 <div className="relative z-10">
                    <h2 className="text-3xl lg:text-5xl font-black text-white mb-6">جاهزين نرفع مستوى التشغيل بالكامل؟</h2>
                    <p className="text-lg lg:text-xl text-blue-100 font-medium mb-12 max-w-2xl mx-auto leading-[1.8]">ابدأ اليوم وخل فريقك يشتغل على منصة واحدة مصممة للوضوح والانضباط المالي.</p>
                    <div className="flex flex-wrap justify-center gap-4">
                       <Link href="/register" className="h-14 px-8 rounded-2xl bg-white text-[#1d77ff] font-black text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-white/10 w-full sm:w-auto">
                          إنشاء حساب مجاني
                       </Link>
                       <Link href="/dashboard/quick-entry" className="h-14 px-8 rounded-2xl border-2 border-white/20 text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-colors w-full sm:w-auto">
                          تجربة الإدخال السريع
                          <ArrowLeft size={18} />
                       </Link>
                    </div>
                 </div>
              </motion.div>
           </div>
        </section>
      </main>

      <footer id="contact" className="bg-[#f5f8fd] border-t border-[#dce5f3] py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-start">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
               <BrandMark />
               <span className="text-xl font-black tracking-tight text-[#0f1c33]">أصيل المالي</span>
            </div>
            <p className="text-[#5b6f8f] font-medium leading-[1.8] max-w-sm">منصة تشغيل القروض والتحصيل وربط ناجز لفرق العمل المالية في السعودية.</p>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-4 md:justify-end md:items-center h-full">
            <a href="mailto:info@aseel-ksa.com" className="flex items-center gap-2 text-[#5b6f8f] hover:text-[#1d77ff] font-bold text-[15px] transition-colors">
              <Mail size={18} />
              info@aseel-ksa.com
            </a>
            <a href="tel:+966500000000" className="flex items-center gap-2 text-[#5b6f8f] hover:text-[#1d77ff] font-bold text-[15px] transition-colors">
              <Phone size={18} />
              +966 50 000 0000
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#5b6f8f] hover:text-[#1d77ff] font-bold text-[15px] transition-colors">
              <Linkedin size={18} />
              LinkedIn
            </a>
            <a href="#integration" className="flex items-center gap-2 text-[#5b6f8f] hover:text-[#1d77ff] font-bold text-[15px] transition-colors">
              <Code2 size={18} />
              API Docs
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-[#dce5f3]/80 text-center text-[#5b6f8f] text-sm font-medium">
           &copy; {new Date().getFullYear()} أصيل المالي. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
