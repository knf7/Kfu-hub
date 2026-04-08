'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  LineChart,
  Linkedin,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import './landing.css';

const TRUST_POINTS = [
  'تحديث ناجز تلقائي ومستمر',
  'دقة تشغيلية يومية لا تضاهى',
  'تقارير مالية جاهزة للإدارة',
];

const CAPABILITIES = [
  {
    id: 'sync',
    title: 'تغذية قضايا ناجز مباشرة',
    detail: 'تعرض الشاشة نفس المبالغ المرفوعة والمتبقية وحالة السداد المركزية، بدون نقل واعتماد بين أنظمة مشتتة.',
    icon: Database,
    theme: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'chat',
    title: 'إدخال سريع ومدعوم',
    detail: 'يتحقق النظام من النواقص والمدخلات، وينشئ العميل والقرض في التدفق ذاته لضمان سرعة البدء.',
    icon: Sparkles,
    theme: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'ops',
    title: 'مراقبة ومتابعة قوية',
    detail: 'إشارات واضحة للحالات المتأخرة والحرجة، مع ترتيب أولويات العمل اليومي لفرق ومسؤولي التحصيل.',
    icon: LineChart,
    theme: 'bg-emerald-50 text-emerald-600',
  },
];

const OPERATING_FLOW = [
  {
    id: 'f1',
    title: 'تسجيل العملية بحرفيّة',
    detail: 'أضف عميلك وأنشئ التسهيلات عبر نموذج واحد مختصر أو ربط ذكي من خلال أنظمة موازية، لتلغي خطوات العمل الروتينية الخاطئة.',
  },
  {
    id: 'f2',
    title: 'مراقبة التنفيذ مالياً',
    detail: 'راقب تغييرات السداد ومدفوعات ناجز بشكل حي، لضمان تطابق الأصول المالية من لوحة مؤشرات مركزية ومحدثة بعناية.',
  },
  {
    id: 'f3',
    title: 'تصدير التقارير للقيادة',
    detail: 'حمّل تقارير شهرية مدققة جاهزة لصناع القرار، بصيغ تدعم العمل الخارجي (Excel، PDF) وتساهم بتسريع بناء المحاسبات.',
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function BrandMark() {
  return (
    <div
      aria-label="شعار أصيل"
      className="w-10 h-10 rounded-[0.8rem] bg-gradient-to-b from-[#8ab4f8] to-[#60a5fa] border-2 border-slate-200 shadow-sm p-1.5 flex items-end justify-center gap-1"
      dir="ltr"
    >
      <div className="w-1.5 h-[60%] bg-white rounded-full" />
      <div className="w-1.5 h-[80%] bg-white rounded-full" />
      <div className="flex flex-col items-center justify-end h-full gap-0.5">
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
        <div className="w-1.5 h-[40%] bg-white rounded-full" />
      </div>
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
    <div dir="rtl" className="bg-[#ffffff] text-[#0f1c33] font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden relative">
      <header className="absolute top-0 inset-x-0 z-50 bg-transparent">
        <nav className="max-w-[1280px] mx-auto px-6 h-24 flex items-center justify-between border-b border-[#dce5f3]/50">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="text-[1.2rem] font-bold text-[#0f1c33] tracking-tight">
              أصيل المالي
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            {[
              { label: 'القدرات', id: 'capabilities' },
              { label: 'آلية التشغيل', id: 'workflow' },
              { label: 'دليل الربط', id: 'integration' },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} className="text-[0.95rem] font-semibold text-[#5b6f8f] hover:text-[#0f1c33] transition-colors">
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <Link href="/login" className="hidden sm:inline-flex text-[0.95rem] font-bold text-[#0f1c33] hover:text-blue-600 transition-colors">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="h-11 px-6 rounded-[10px] bg-[#0f1c33] text-white flex items-center justify-center gap-2 text-[0.95rem] font-bold hover:bg-blue-600 transition-all shadow-[0_4px_12px_rgba(15,28,51,0.15)]">
              افتح حسابك
              <ArrowLeft size={16} />
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#f8fafc] pb-24 pt-16 lg:pt-24 border-b border-[#dce5f3]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-60"></div>
          
          <div className="max-w-[1280px] mx-auto px-6 grid lg:grid-cols-2 gap-16 lg:gap-8 items-center relative z-10">
            <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-right">
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[0.8rem] font-bold mb-8">
                <Zap size={14} className="fill-current" /> البنية التحتية المتكاملة
              </motion.div>
              
              <motion.h1 variants={fadeInUp} className="text-[3rem] sm:text-[3.5rem] lg:text-[4.2rem] font-black text-[#0f1c33] leading-[1.05] tracking-tight lp-title">
                نظام إدارة الإقراض <br/> والتحصيل <span className="text-blue-600">المعاصر</span>.
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="mt-6 text-[1.15rem] sm:text-[1.25rem] text-[#5b6f8f] leading-[1.8] font-medium">
                واجهة تشغيلية موحدة تجمع بين سرعة إدخال التسهيلات ومزامنة مدفوعات ناجز وبناء تقارير الأداء المالي، مصممة للمنظمات المالية الطموحة.
              </motion.p>

              <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link href="/register" className="h-14 px-8 rounded-xl bg-blue-600 text-white flex items-center justify-center gap-2 text-[1.05rem] font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                  ابدأ تشغيل التقنية
                </Link>
                <Link href="#integration" className="h-14 px-8 rounded-xl bg-white border border-[#dce5f3] text-[#0f1c33] flex items-center justify-center gap-2 text-[1.05rem] font-bold hover:bg-slate-50 transition-colors">
                   اكتشف قدرات الواجهة البرمجية (API)
                </Link>
              </motion.div>

              <motion.div variants={fadeInUp} className="mt-12 pt-8 border-t border-[#dce5f3] flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4">
                {TRUST_POINTS.map((point) => (
                  <div key={point} className="flex items-center gap-2.5 text-[0.9rem] font-bold text-[#0f1c33]">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    {point}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Structured Card Isometric Mockup (Stripe / Moyasar style) */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }} className="relative h-[500px] w-full hidden lg:block perspective-[2000px]">
              <div className="absolute top-[10%] right-[5%] w-[85%] bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,28,51,0.06)] border border-[#dce5f3] p-6 z-10">
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div className="text-[0.8rem] font-bold text-[#5b6f8f] uppercase tracking-wider">Aseel Metrics</div>
                    <div className="px-2 py-0.5 rounded text-[0.7rem] font-bold bg-emerald-50 text-emerald-600">LIVE SYNC</div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <div className="text-[0.75rem] text-[#5b6f8f] font-semibold mb-1">المحفظة النشطة</div>
                        <div className="text-[1.8rem] text-[#0f1c33] font-black tracking-tight">111,531<span className="text-[1rem] text-[#5b6f8f] font-bold ml-1">ر.س</span></div>
                    </div>
                    <div>
                        <div className="text-[0.75rem] text-[#5b6f8f] font-semibold mb-1">صافي التحصيل</div>
                        <div className="text-[1.8rem] text-emerald-500 font-black tracking-tight">83.1%</div>
                    </div>
                 </div>
              </div>

              <div className="absolute top-[45%] left-0 w-[90%] bg-[#0f1c33] rounded-2xl shadow-[0_30px_60px_-15px_rgba(15,28,51,0.4)] border border-[#1e2f4f] p-6 z-20">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><ShieldCheck size={16} /></div>
                       <div className="text-[0.95rem] font-bold text-white">مطابقة ذكية (ناجز)</div>
                    </div>
                    <div className="text-[0.7rem] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">تمت المزامنة بنجاح</div>
                 </div>
                 <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex justify-between items-end">
                     <div>
                        <div className="text-[0.75rem] text-white/50 font-semibold mb-1">معرّف السداد ID-92847</div>
                        <div className="text-[1.1rem] text-white font-bold">٢,٥٠٠ ر.س</div>
                     </div>
                     <div className="text-[0.75rem] text-white/40 font-mono">2 mins ago</div>
                 </div>
                 <div className="mt-3 bg-white/5 rounded-xl p-4 border border-white/5 flex justify-between items-end">
                     <div>
                        <div className="text-[0.75rem] text-white/50 font-semibold mb-1">معرّف السداد ID-92848</div>
                        <div className="text-[1.1rem] text-white font-bold">٢٥,٠٠٠ ر.س</div>
                     </div>
                     <div className="text-[0.75rem] text-white/40 font-mono">14 mins ago</div>
                 </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features - Bento Grid Style */}
        <section id="capabilities" className="py-24 sm:py-32 bg-[#ffffff]">
          <div className="max-w-[1280px] mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="max-w-2xl text-right mb-16">
              <h2 className="text-[2.2rem] lg:text-[2.8rem] font-black text-[#0f1c33] mb-6 tracking-tight leading-[1.2]">إدارة مركزية قوية. <br/> مُصممة للنمو بذكاء.</h2>
              <p className="text-[1.15rem] text-[#5b6f8f] leading-[1.8] font-medium">كل جزء في الواجهة له وظيفة تشغيلية مباشرة، مبني لتسريع العمل وتحقيق الرقابة دون تعقيدات زائدة أو تشتت.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {CAPABILITIES.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: idx * 0.1 }} className="p-8 lg:p-10 bg-[#f8fafc] border border-slate-200 rounded-[24px] hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 transition-all">
                    <div className={`w-12 h-12 rounded-xl ${item.theme} flex items-center justify-center mb-8`}>
                        <Icon size={22} />
                    </div>
                    <h3 className="text-[1.3rem] font-bold text-[#0f1c33] mb-3">{item.title}</h3>
                    <p className="text-[1rem] text-[#5b6f8f] leading-[1.7] font-medium">{item.detail}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Operating Flow - Step by step */}
        <section id="workflow" className="py-24 sm:py-32 bg-[#0f1c33] text-white">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="grid lg:grid-cols-[1fr_1.5fr] gap-16 items-start">
               <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
                 <h2 className="text-[2.2rem] lg:text-[2.8rem] font-black tracking-tight mb-6 leading-[1.2]">سير عملي مُنظّم من الواجهة حتى التقارير.</h2>
                 <p className="text-[1.1rem] text-slate-300 font-medium leading-[1.8]">تدفق واحد منظم يمنع الفجوات ويختصر وقت الفريق طوال الشهر بدءاً من أول إدخال مالي وحتى إصدار القوائم النهائية.</p>
               </motion.div>

               <div className="flex flex-col gap-8 lg:gap-12 pl-0 lg:pl-10">
                  {OPERATING_FLOW.map((step, idx) => (
                     <motion.div key={step.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: idx * 0.1 }} className="flex gap-6 lg:gap-8">
                        <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full border border-blue-500 text-blue-400 font-black text-xl">
                           {idx + 1}
                        </div>
                        <div>
                           <h3 className="text-[1.4rem] font-bold text-white mb-3 tracking-tight">{step.title}</h3>
                           <p className="text-[1.05rem] text-slate-400 leading-[1.7] font-medium">{step.detail}</p>
                        </div>
                     </motion.div>
                  ))}
               </div>
            </div>
          </div>
        </section>

        {/* API Integration - Dark Clean Design */}
        <section id="integration" className="py-24 sm:py-32 bg-[#ffffff]">
          <div className="max-w-[1280px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
             <div>
                <div className="text-blue-600 font-bold mb-3 tracking-widest text-[0.8rem] uppercase">Developers First</div>
                <h2 className="text-[2.2rem] lg:text-[2.8rem] font-black text-[#0f1c33] mb-6 tracking-tight leading-[1.2]">واجهات برمجية صارمة. جاهزة لنظامك.</h2>
                <p className="text-[1.1rem] text-[#5b6f8f] leading-[1.8] font-medium mb-10">
                منصة أصيل تتيح لك الربط المباشر لإنشاء القروض والعمليات آلياً دون المرور بشاشات الإدخال، واجهة خفيفة ومطابقة لأفضل المعايير العالمية (RESTful API).
                </p>
                <Link href="/contact" className="inline-flex items-center gap-3 font-bold text-blue-600 hover:text-blue-800 transition-colors text-[1.1rem]">
                   استكشف التوثيق البرمجي الكامل (Docs)
                   <ArrowLeft size={20} />
                </Link>
             </div>

             <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="bg-[#0b1221] rounded-[24px] shadow-2xl p-8 border border-slate-800">
                <div className="flex gap-2 mb-6">
                   <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                   <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                   <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                </div>
                <div className="font-mono text-[0.85rem] leading-[2.2] overflow-x-auto text-left" dir="ltr">
                  <span className="text-emerald-400 font-bold">POST</span> <span className="text-slate-200">/api/v1/loans/quick-entry</span>
                  <br/>
                  <span className="text-slate-400">{"{"}</span>
                  <br/>
                  {"  "}<span className="text-blue-300">&quot;customer_name&quot;</span><span className="text-slate-400">:</span> <span className="text-amber-300">&quot;عبدالله الزهراني&quot;</span>,
                  <br/>
                  {"  "}<span className="text-blue-300">&quot;national_id&quot;</span><span className="text-slate-400">:</span> <span className="text-amber-300">&quot;1*********&quot;</span>,
                  <br/>
                  {"  "}<span className="text-blue-300">&quot;loan_amount&quot;</span><span className="text-slate-400">:</span> <span className="text-violet-300">12000</span>,
                  <br/>
                  {"  "}<span className="text-blue-300">&quot;source&quot;</span><span className="text-slate-400">:</span> <span className="text-amber-300">&quot;chat_agent&quot;</span>,
                  <br/>
                  {"  "}<span className="text-blue-300">&quot;features&quot;</span><span className="text-slate-400">:</span> [<span className="text-amber-300">&quot;najiz_sync&quot;</span>, <span className="text-amber-300">&quot;auto_report&quot;</span>]
                  <br/>
                  <span className="text-slate-400">{"}"}</span>
                </div>
             </motion.div>
          </div>
        </section>

        {/* CTA - Big and Bold */}
        <section className="py-24 sm:py-32 bg-blue-50 border-y border-blue-100">
           <div className="max-w-[800px] mx-auto px-6 text-center">
              <h2 className="text-[2.2rem] lg:text-[3rem] font-black text-[#0f1c33] mb-6 tracking-tight">مستعد لبناء قدراتك التشغيلية؟</h2>
              <p className="text-[1.15rem] text-[#5b6f8f] font-medium mb-10 leading-[1.8]">ابدأ الآن في استخدام أصيل المالي واحصل على أقوى التقنيات لإدارة وتوسيع نطاق تحصيلاتك بثقة تامة وبأقل نسبة أخطاء.</p>
              <div className="flex flex-wrap justify-center gap-4">
                 <Link href="/register" className="h-14 px-10 rounded-xl bg-blue-600 text-white font-bold text-[1.1rem] flex items-center justify-center transition-colors hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                    إنشاء حساب جديد
                 </Link>
                 <Link href="/contact" className="h-14 px-10 rounded-xl bg-white border border-[#dce5f3] text-[#0f1c33] font-bold text-[1.1rem] flex items-center justify-center hover:bg-slate-50 transition-colors">
                    تواصل مع المبيعات
                 </Link>
              </div>
           </div>
        </section>
      </main>

      {/* Corporate Footer */}
      <footer id="contact" className="bg-white pt-24 pb-12">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="mb-12 flex items-center gap-3">
            <BrandMark />
            <span className="text-[1.35rem] font-black tracking-tight text-[#0f1c33]">
              أصيل<span className="text-blue-600">.</span> المالي
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-10 mb-16">
            <div className="flex flex-col gap-6">
              <p className="text-[1rem] text-[#5b6f8f] font-medium leading-[1.8] max-w-[380px]">
                 المنصة الأقوى لتشغيل القروض والتحصيل الآلي وربط خدمات ناجز لفرق العمل المالية الطموحة في السعودية بالاعتماد على ذكاء اصطناعي وحلول مالية دقيقة.
              </p>
            </div>

            <div className="flex flex-col gap-4">
               <h4 className="font-bold text-[#0f1c33] mb-2 text-[1.1rem]">الوصول السريع</h4>
               <a href="#capabilities" className="text-[#5b6f8f] font-medium hover:text-blue-600">القدرات الرئيسية</a>
               <a href="#workflow" className="text-[#5b6f8f] font-medium hover:text-blue-600">آلية التشغيل</a>
               <a href="#integration" className="text-[#5b6f8f] font-medium hover:text-blue-600">التكامل البرمجي (API)</a>
            </div>

            <div className="flex flex-col gap-4">
               <h4 className="font-bold text-[#0f1c33] mb-2 text-[1.1rem]">تواصل معنا</h4>
               <a href="mailto:support@aseel.sa" className="text-[#5b6f8f] font-medium flex items-center gap-2 hover:text-blue-600">
                  <Mail size={16} /> support@aseel.sa
               </a>
               <a href="tel:+966500000000" className="text-[#5b6f8f] font-medium flex items-center gap-2 hover:text-blue-600">
                  <Phone size={16} /> +966 50 000 0000
               </a>
               <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-[#5b6f8f] font-medium flex items-center gap-2 hover:text-blue-600">
                  <Linkedin size={16} /> لينكد إن
               </a>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-[0.9rem] text-[#5b6f8f] font-medium">
             <div>&copy; {new Date().getFullYear()} شركة أصيل المالي التقنية. جميع الحقوق محفوظة.</div>
             <div className="flex gap-6">
                <Link href="/terms" className="hover:text-blue-600">الشروط والأحكام</Link>
                <Link href="/privacy" className="hover:text-blue-600">سياسة الخصوصية</Link>
                <Link href="/cookies-policy" className="hover:text-blue-600">سياسة الكوكيز</Link>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
