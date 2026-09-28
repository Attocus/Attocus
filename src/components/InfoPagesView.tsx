import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, FileText, Cookie, Sparkles, Zap,
  CheckCircle2, AlertCircle, ArrowLeft, ArrowRight,
  GraduationCap, Clock, RefreshCw, Eye, Brain,
  Layers, MessageSquare, Flame, Check, HelpCircle,
  ExternalLink, ChevronDown, ChevronUp, Bell, Server, Cpu
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';

export type InfoSection =
  | 'privacy'
  | 'terms'
  | 'security'
  | 'cookies'
  | 'features'
  | 'pricing'
  | 'updates';

interface InfoPagesViewProps {
  initialSection?: InfoSection;
  onReturnHome: () => void;
}

export const InfoPagesView: React.FC<InfoPagesViewProps> = ({
  initialSection = 'privacy',
  onReturnHome
}) => {
  const { isAr, dir, t } = useLanguage();
  const [activeSection, setActiveSection] = useState<InfoSection>(initialSection);

  // Pricing State
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Cookie Settings State
  const [cookieSettings, setCookieSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('attocus_cookie_prefs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      essential: true, // Always locked
      functional: true,
      analytics: false
    };
  });
  const [cookieSavedNotification, setCookieSavedNotification] = useState(false);

  // Sync active section when initialSection prop changes or URL hash changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const handleSectionChange = (sec: InfoSection) => {
    setActiveSection(sec);
    window.location.hash = sec;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCookies = () => {
    try {
      localStorage.setItem('attocus_cookie_prefs', JSON.stringify(cookieSettings));
      setCookieSavedNotification(true);
      setTimeout(() => setCookieSavedNotification(false), 3000);
    } catch (err) {
      console.warn('Error saving cookie settings:', err);
    }
  };

  const SECTIONS_NAV: { id: InfoSection; labelAr: string; labelEn: string; icon: React.ComponentType<{ className?: string }>; category: 'legal' | 'platform' }[] = [
    // Platform
    { id: 'features', labelAr: 'المميزات والخصائص', labelEn: 'Features & Capabilities', icon: Sparkles, category: 'platform' },
    { id: 'pricing', labelAr: 'الباقات الأكاديمية', labelEn: 'Academic Plans', icon: Zap, category: 'platform' },
    { id: 'updates', labelAr: 'تحديثات المنصة', labelEn: 'Platform Updates', icon: RefreshCw, category: 'platform' },
    // Legal & Security
    { id: 'privacy', labelAr: 'سياسة الخصوصية', labelEn: 'Privacy Policy', icon: Lock, category: 'legal' },
    { id: 'terms', labelAr: 'شروط الاستخدام', labelEn: 'Terms of Service', icon: FileText, category: 'legal' },
    { id: 'security', labelAr: 'أمان وحماية البيانات', labelEn: 'Data Security & Protection', icon: ShieldCheck, category: 'legal' },
    { id: 'cookies', labelAr: 'إعدادات ملفات الارتباط', labelEn: 'Cookie Settings', icon: Cookie, category: 'legal' },
  ];

  return (
    <div dir={dir} className="min-h-screen w-full bg-[#FAFAF9] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* ─── Top Header Navigation ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo & Return Home */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReturnHome}
              className="flex items-center gap-2.5 group cursor-pointer"
              title={isAr ? 'العودة إلى لوحة التحكم' : 'Return to Dashboard'}
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-xs bg-white ring-1 ring-black/5 dark:ring-white/20 p-0.5">
                <img src="/assets/logos/logo_squircle_eye.png" alt="ATTOCUS" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm font-black tracking-wider text-slate-900 dark:text-white font-serif uppercase">
                  ATTOCUS
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {isAr ? 'مركز المعلومات والسياسات' : 'Policy & Info Center'}
                </span>
              </div>
            </button>
          </div>

          {/* Action buttons & Switchers */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 ps-1">
              <LanguageSelector />
              <ThemeToggle />
            </div>

            <button
              type="button"
              onClick={onReturnHome}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{isAr ? 'العودة للمنصة' : 'Back to App'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Sub-Banner ────────────────────────────────────────── */}
      <div className="w-full border-b border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-b from-blue-50/50 via-slate-50 to-transparent dark:from-blue-950/20 dark:via-slate-900/10 dark:to-transparent py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAr ? 'الشفافية، الأمان والتميز الأكاديمي' : 'Transparency, Security & Academic Excellence'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {SECTIONS_NAV.find(s => s.id === activeSection)?.[isAr ? 'labelAr' : 'labelEn']}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {isAr
                ? 'تعرف على معاييرنا الصارمة لحماية خصوصيتك، واستكشف المميزات والخيارات المصممة لدعم مسيرتك الدراسية.'
                : 'Learn about our rigorous security and privacy standards, and discover all features built to empower your learning journey.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{isAr ? 'آخر تحديث: سبتمبر 2026' : 'Last Updated: September 2026'}</span>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container with Sticky Sidebar Navigation ─── */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* ── Sidebar Tabs ── */}
        <aside className="w-full lg:w-72 shrink-0 space-y-6 lg:sticky lg:top-20">
          
          {/* Group 1: Platform & Capabilities */}
          <div className="space-y-1.5 bg-white dark:bg-[#111827] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 py-1 block">
              {isAr ? 'المنصة والخدمات' : 'Platform & Services'}
            </span>
            {SECTIONS_NAV.filter(s => s.category === 'platform').map(item => {
              const active = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSectionChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-blue-500'}`} />
                    <span>{isAr ? item.labelAr : item.labelEn}</span>
                  </div>
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Group 2: Legal & Security */}
          <div className="space-y-1.5 bg-white dark:bg-[#111827] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 py-1 block">
              {isAr ? 'القانونية والسياسات' : 'Legal & Policies'}
            </span>
            {SECTIONS_NAV.filter(s => s.category === 'legal').map(item => {
              const active = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSectionChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-blue-500'}`} />
                    <span>{isAr ? item.labelAr : item.labelEn}</span>
                  </div>
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Help Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/80 dark:from-slate-900 dark:to-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              <span>{isAr ? 'هل لديك استفسار محدد؟' : 'Need specific help?'}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              {isAr
                ? 'فريق الدعم الفني والأكاديمي متاح لمساعدتك والإجابة على أي تساؤل يتعلق بحسابك أو بياناتك.'
                : 'Our technical and academic support team is ready to assist with any questions regarding your account or data.'}
            </p>
            <a
              href="#contact"
              onClick={onReturnHome}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
            >
              <span>{isAr ? 'تواصل معنا الآن' : 'Contact Support'}</span>
              {isAr ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
            </a>
          </div>

        </aside>

        {/* ── Main Detail View ── */}
        <main className="flex-1 w-full bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-xs space-y-8">
          
          {/* ========================================================= */}
          {/* 1. سياسة الخصوصية (Privacy Policy)                        */}
          {/* ========================================================= */}
          {activeSection === 'privacy' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Lock className="w-4 h-4" />
                  <span>{isAr ? 'ميثاق الخصوصية وحماية الطالب' : 'Privacy & Learner Charter'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {isAr ? 'سياسة الخصوصية لمنصة ATTOCUS' : 'ATTOCUS Privacy Policy'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'نحن نؤمن بأن الخصوصية حق أصيل لكل طالب وباحث. توضح هذه الوثيقة بشفافية مطلقة كيفية التعامل مع مستنداتك وبياناتك الدراسية.'
                    : 'We believe privacy is a fundamental right for every student and researcher. This document transparently explains how your documents and academic data are handled.'}
                </p>
              </div>

              {/* High-Level Highlight: Edge Vision Guarantee */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200">
                    {isAr ? 'ضمان الخصوصية البصرية: المعالجة محلياً بالكامل' : 'Visual Privacy Guarantee: 100% On-Device'}
                  </h4>
                  <p className="text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                    {isAr
                      ? 'رادار التركيز وتتبع اليقظة يعمل بالكامل داخل متصفح جهازك (Client-side Edge Processing). لا يتم تسجيل، التقاط، أو إرسال أي إطار فيديو أو صورة من كاميرتك إلى خوادمنا إطلاقاً.'
                      : 'The Vision Focus Radar operates entirely inside your local browser. No video frames, photographs, or raw camera feeds are ever recorded, captured, or transmitted to any servers.'}
                  </p>
                </div>
              </div>

              {/* Policy Sections */}
              <div className="space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                
                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-mono">1</span>
                    <span>{isAr ? 'البيانات التي نجمعها' : 'Information We Collect'}</span>
                  </h3>
                  <p>
                    {isAr
                      ? 'نجمع فقط الحد الأدنى اللازم لتقديم تجربة مذاكرة مخصصة وفعالة:'
                      : 'We only collect the minimum information strictly necessary to provide an effective, tailored study experience:'}
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 ps-2 text-slate-500 dark:text-slate-400">
                    <li><strong className="text-slate-700 dark:text-slate-200">{isAr ? 'معلومات الحساب:' : 'Account Details:'}</strong> {isAr ? 'الاسم، البريد الإلكتروني، والصورة الرمزية عند تسجيل الدخول عبر Google أو البريد.' : 'Name, email address, and avatar when authenticating via Google or email.'}</li>
                    <li><strong className="text-slate-700 dark:text-slate-200">{isAr ? 'المحتوى الأكاديمي:' : 'Academic Content:'}</strong> {isAr ? 'ملفات الـ PDF والملاحظات التي ترفعها لغرض التحليل السقراطي وصياغة التلخيص.' : 'PDF files and notes uploaded for the sole purpose of Socratic dialogue and summarization.'}</li>
                    <li><strong className="text-slate-700 dark:text-slate-200">{isAr ? 'إحصائيات الإنجاز:' : 'Progress Metrics:'}</strong> {isAr ? 'دقائق المذاكرة، عدد الجلسات، ونقاط التركيز لحساب الستريك اليومي.' : 'Study minutes, session counts, and focus points to compute continuous daily streaks.'}</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-mono">2</span>
                    <span>{isAr ? 'كيف نستخدم بياناتك' : 'How We Use Your Information'}</span>
                  </h3>
                  <p>
                    {isAr
                      ? 'تُستخدم بياناتك حصرياً لتشغيل وتحسين أدوات المذاكرة الخاصة بك، ولا نقوم إطلاقاً ببيع أو تأجير أي بيانات لأطراف تجارية أو إعلانية.'
                      : 'Your information is used strictly to power and personalize your study workflow. We never sell, rent, or monetize personal data for third-party advertising.'}
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-mono">3</span>
                    <span>{isAr ? 'حماية الذكاء الاصطناعي ومعالجة النماذج' : 'AI Processing & Zero-Retention Guardrails'}</span>
                  </h3>
                  <p>
                    {isAr
                      ? 'عند إرسال نص المحاضرة لنموذج الذكاء الاصطناعي للتوليد السقراطي، يتم ذلك عبر واجهات برمجية مؤسسية مغلقة (Enterprise APIs) تضمن عدم استخدام نصوصك أو شروحاتك لتدريب النماذج العامة أو مشاركتها مع أي باحثين خارجيين.'
                      : 'When lecture text is processed by AI agents for Socratic synthesis, enterprise private API tiers are utilized to strictly prohibit the usage of your study materials to train public foundational models.'}
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-mono">4</span>
                    <span>{isAr ? 'حقوقك وحذف البيانات' : 'Your Rights & Data Portability'}</span>
                  </h3>
                  <p>
                    {isAr
                      ? 'لك الحق الكامل في أي وقت في طلب تصدير كافة ملاحظاتك وملخصاتك، أو مسح أي محاضرة ومحوها تماماً من التخزين السحابي والمحلي بضغطة زر واحدة.'
                      : 'You retain full ownership of your data at all times. You can export summaries or permanently purge any uploaded document and associated annotations at any moment with one click.'}
                  </p>
                </section>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. شروط الاستخدام (Terms of Service)                       */}
          {/* ========================================================= */}
          {activeSection === 'terms' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <FileText className="w-4 h-4" />
                  <span>{isAr ? 'اتفاقية الاستخدام المعتمدة' : 'Official Terms of Use'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {isAr ? 'شروط وأحكام استخدام ATTOCUS' : 'ATTOCUS Terms of Service'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'باستخدامك لمنصة ATTOCUS، فإنك توافق على الالتزام بهذه الشروط المصممة لضمان بيئة تعليمية آمنة ونزيهة ومثمرة.'
                    : 'By accessing or using ATTOCUS, you agree to these terms engineered to foster a secure, honest, and high-impact academic environment.'}
                </p>
              </div>

              <div className="space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                
                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isAr ? '1. الغرض الأكاديمي والنزاهة العلمية' : '1. Academic Integrity & Proper Purpose'}
                  </h3>
                  <p>
                    {isAr
                      ? 'صُممت منصة ATTOCUS كأداة لمساعدة الطلاب على الفهم العميق، التلخيص الشخصي، واختبار الفهم الذاتي بطريقة سقراطية. يُحظر صراحة استخدام المنصة لأي أغراض تخالف ميثاق النزاهة الأكاديمية الخاص بمؤسستك التعليمية أو لأعمال الغش والاحتيال الأكاديمي.'
                      : 'ATTOCUS is specifically crafted as a cognitive study copilot for active recall, personal syntheses, and self-testing. Use of the service to commit academic dishonesty or circumvent university integrity codes is strictly forbidden.'}
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isAr ? '2. ملكية المحتوى وحقوق النشر' : '2. Intellectual Property & Uploaded Files'}
                  </h3>
                  <p>
                    {isAr
                      ? 'أنت المسؤول الوحيد عن التأكد من امتلاكك لحق رفع أي مذكرات أو ملفات دراسية. تظل كافة الملاحظات والشروحات التي تصيغها أنت ملكك الشخصي بالكامل، بينما تظل المنصة وخوارزميات وكلائها الذكية ملكية فكرية حصرية لـ ATTOCUS.'
                      : 'You are solely responsible for ensuring you possess the necessary permissions to upload study documents. You retain full ownership of your notes and original explanations, while the platform and proprietary agent architecture remain the exclusive intellectual property of ATTOCUS.'}
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isAr ? '3. أمن الحساب ومسؤولية المستخدم' : '3. Account Security'}
                  </h3>
                  <p>
                    {isAr
                      ? 'يجب الحفاظ على سرية بيانات تسجيل دخولك. لا يجوز مشاركة الحسابات الشخصية بين عدة مستخدمين لضمان دقة نماذج التوصية وإحصائيات التركيز الفردية.'
                      : 'You must safeguard your account credentials. Individual accounts should not be shared across multiple learners to maintain the precision of personalized attention metrics and cognitive models.'}
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isAr ? '4. حدود المسؤولية وتوافر الخدمة' : '4. Service Availability & Disclaimers'}
                  </h3>
                  <p>
                    {isAr
                      ? 'نبذل قصارى جهدنا لضمان استقرار الخدمة وتوافرها بنسبة تتجاوز 99.9%. المنصة تُقدم على أساس المساعدة الأكاديمية ولا تُعتبر بديلاً عن التوجيه المباشر لأستاذ المادة أو المرجع المعتمد.'
                      : 'While we strive for 99.9% platform uptime and reliable processing, ATTOCUS is provided as an augmentative study tool and does not replace official course syllabi or academic faculty guidelines.'}
                  </p>
                </section>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. أمان وحماية البيانات (Data Security & Protection)       */}
          {/* ========================================================= */}
          {activeSection === 'security' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isAr ? 'الأمن السيبراني والموثوقية' : 'Enterprise Cybersecurity'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {isAr ? 'أمان وحماية البيانات في ATTOCUS' : 'ATTOCUS Security Architecture'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'نطبق أعلى المعايير الهندسية للأمن السيبراني لضمان سرية مستنداتك وحماية جلساتك الدراسية على مدار الساعة.'
                    : 'We enforce cutting-edge cybersecurity engineering standards to guarantee the confidentiality and integrity of your study sessions 24/7.'}
                </p>
              </div>

              {/* 4 Pillars of Security Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'تشفير متقدم TLS 1.3 & AES-256' : 'AES-256 & TLS 1.3 Encryption'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isAr
                      ? 'تُشفر كافة البيانات المنقولة بتشفير TLS 1.3 فائق الأمان، بينما تُخزن البيانات الثابتة بتشفير AES-256 القياسي عالمياً.'
                      : 'All data in transit is encrypted using modern TLS 1.3 protocols, and data at rest is secured via military-grade AES-256 encryption.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'عزل الرؤية الحاسوبية على الجهاز' : 'Zero-Cloud Camera Pipeline'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isAr
                      ? 'معالجة الكاميرا تجري عبر WebAssembly داخل ذاكرة جهازك فقط دون حفظ أي إطارات مصورة في أي قاعدة بيانات.'
                      : 'Vision pipelines execute via WebAssembly in volatile device memory without ever persisting photo frames to disk.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'عزل أمني للبيانات في Firestore' : 'Granular Role-Based Access'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isAr
                      ? 'قواعد حماية مشددة (Security Rules) تمنع أي مستخدم من الوصول لمحاضرات أو ملاحظات مستخدم آخر نهائياً.'
                      : 'Granular Firestore Security Rules guarantee strict partition isolation: no user can inspect or alter another learner’s files.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'نسخ احتياطي واستعادة فورية' : 'Automated Redundancy & Backups'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isAr
                      ? 'حفظ مزدوج على جهازك (IndexedDB) ومزامنة سحابية لحماية إنجازاتك من الضياع عند انقطاع الاتصال.'
                      : 'Dual local-first persistence (IndexedDB) combined with cloud sync prevents study progress loss even during offline incidents.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. إعدادات ملفات الارتباط (Cookie Settings & Policy)       */}
          {/* ========================================================= */}
          {activeSection === 'cookies' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Cookie className="w-4 h-4" />
                  <span>{isAr ? 'التحكم في الخصوصية والتخزين' : 'Storage & Cookie Preferences'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {isAr ? 'إعدادات وسياسة ملفات تعريف الارتباط' : 'ATTOCUS Cookie Settings'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'نستخدم تقنيات التخزين المحلي وملفات الارتباط لتحسين أداء المنصة وتذكر تفضيلاتك مثل المظهر الداكن والمجلد المختار.'
                    : 'We use local storage and cookie technologies to optimize platform speed and remember preferences like dark mode and selected folders.'}
                </p>
              </div>

              {/* Notification Toast */}
              {cookieSavedNotification && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isAr ? 'تم حفظ تفضيلات ملفات الارتباط الخاصة بك بنجاح.' : 'Your cookie and storage preferences have been saved successfully.'}</span>
                </div>
              )}

              {/* Interactive Switches */}
              <div className="space-y-4">
                
                {/* 1. Essential */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {isAr ? 'ملفات الارتباط الضرورية للغاية' : 'Strictly Necessary Cookies'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                        {isAr ? 'إلزامية' : 'Required'}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                      {isAr
                        ? 'مطلوبة لتسجيل الدخول، إدارة الجلسة، والتحقق من الأمان. لا يمكن إيقافها لأن المنصة لا تعمل بدونها.'
                        : 'Essential for user authentication, session security, and basic routing. The workspace cannot function without them.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    className="w-5 h-5 accent-blue-600 rounded cursor-not-allowed opacity-80"
                  />
                </div>

                {/* 2. Functional */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isAr ? 'ملفات الارتباط الوظيفية والتفضيلات' : 'Functional & Preference Cookies'}
                    </span>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                      {isAr
                        ? 'تُتيح للمنصة تذكر لغتك المفضلة (عربي/إنجليزي)، الوضع الليلي، المجلد النشط، وحالة مؤقت بومودورو عبر الجلسات.'
                        : 'Enables remembering your UI language, dark theme toggle, selected subject folders, and ongoing Pomodoro timer state.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cookieSettings.functional}
                    onChange={e => setCookieSettings(prev => ({ ...prev, functional: e.target.checked }))}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                {/* 3. Analytics */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isAr ? 'ملفات ارتباط الأداء والتحسين' : 'Performance & Telemetry Cookies'}
                    </span>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                      {isAr
                        ? 'تساعدنا على قياس زمن استجابة الوكلاء الذاتيين واكتشاف أي أخطاء برمجية لتحسين تجربة جميع الطلاب.'
                        : 'Helps us monitor agent inference latency and resolve unexpected client crashes to enhance system responsiveness.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cookieSettings.analytics}
                    onChange={e => setCookieSettings(prev => ({ ...prev, analytics: e.target.checked }))}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveCookies}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  {isAr ? 'حفظ التفضيلات' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. المميزات والخصائص (Features & Capabilities)             */}
          {/* ========================================================= */}
          {activeSection === 'features' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                  <span>{isAr ? 'المنظومة الأكاديمية المتكاملة' : 'Intelligent Ecosystem'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {isAr ? 'المميزات والخصائص لمنصة ATTOCUS' : 'ATTOCUS Features & Capabilities'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'اكتشف كيف تدمج منصة ATTOCUS بين الرؤية الحاسوبية، الوكلاء الذاتيين، ونظرية التعلم السقراطي لرفع استيعابك الدراسي إلى القمة.'
                    : 'Discover how ATTOCUS combines on-device vision, multi-agent intelligence, and Socratic pedagogy to supercharge your academic understanding.'}
                </p>
              </div>

              {/* Feature Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* 1. Vision Focus Radar */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-slate-800/80 dark:to-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Eye className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'رادار التركيز الذكي (Live Vision Guard)' : 'Live Vision Focus Radar'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? 'رؤية حاسوبية محلية ترصد مستوى الانتباه، تكشف تشتت النظر، النعاس، واستخدام الهاتف الذكي مع تدخلات لطيفة تحافظ على تدفقك الذهني.'
                      : 'On-device vision analyzing gaze drift, drowsiness, and smartphone interference with gentle nudges to keep you in flow state.'}
                  </p>
                </div>

                {/* 2. Socratic Dialogue */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-slate-800/80 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'حوار التحقق السقراطي (Socratic Synthesis)' : 'Interactive Socratic Dialogue'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? 'يطرح أسئلة تفاعلية ذكية للتحقق من النموذج الذهني، ثم يلخص ما شرحته بأسلوبك الخاص بدون هلوسة وبدقة 100%.'
                      : 'Intelligent questioning that tests your mental model, synthesizing notes in your own words with zero hallucinations.'}
                  </p>
                </div>

                {/* 3. Document Processing */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-50/60 to-blue-50/40 dark:from-slate-800/80 dark:to-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-sm">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'معالج المستندات والشرائح عالية الدقة' : 'Multi-Modal Slide Engine'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? 'تجزئة فورية لملفات PDF، استخراج النصوص والمفاهيم، ودعم كامل للرسوم البيانية والمعادلات الرياضية المعقدة.'
                      : 'High-res PDF canvas rendering, automated topic extraction, and full rendering of complex equations and diagrams.'}
                  </p>
                </div>

                {/* 4. Cognitive Gamification */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-800/80 dark:to-amber-950/30 border border-amber-100 dark:border-amber-900/50 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
                    <Flame className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'نظام التحفيز والستريك الذكي' : 'Cognitive Gamification & Streaks'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? 'مؤقت بومودورو متزامن مع رادار التركيز، عداد ستريك يومي متواصل، ونقاط تركيز تكافئ الاستمرارية والانضباط الأكاديمي.'
                      : 'Vision-coupled Pomodoro intervals, continuous day streaks, and focus points rewarding steady academic consistency.'}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. الباقات الأكاديمية (Academic Plans & Pricing)           */}
          {/* ========================================================= */}
          {activeSection === 'pricing' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-2 text-center max-w-xl mx-auto">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Zap className="w-4 h-4" />
                  <span>{isAr ? 'استثمار في مستقبلك الأكاديمي' : 'Invest in Academic Mastery'}</span>
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {isAr ? 'الباقات والخطط الأكاديمية' : 'ATTOCUS Academic Plans'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'اختر الخطة المناسبة لاحتياجاتك الدراسية، وابدأ فوراً في تحويل ساعات المذاكرة إلى فهم حقيقي راسخ.'
                    : 'Choose the ideal plan for your learning routine, turning passive reading hours into active, deep understanding.'}
                </p>

                {/* Billing Cycle Switcher: Apple-style Segmented Control */}
                <div className="pt-4 flex items-center justify-center">
                  <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                    <button
                      type="button"
                      id="billing-monthly-btn"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        billingCycle === 'monthly'
                          ? 'bg-white dark:bg-[#111827] text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {isAr ? 'اشتراك شهري' : 'Monthly'}
                    </button>
                    <button
                      type="button"
                      id="billing-yearly-btn"
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                        billingCycle === 'yearly'
                          ? 'bg-white dark:bg-[#111827] text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{isAr ? 'اشتراك سنوي' : 'Yearly'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold shadow-2xs">
                        {isAr ? 'وفّر شهرين' : 'Save 2 Months'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* 1. Free Starter */}
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      {isAr ? 'باقة البداية' : 'Starter'}
                    </span>
                    <div>
                      <span className="text-3xl font-black text-slate-900 dark:text-white">0</span>
                      <span className="text-xs text-slate-400 font-semibold ps-1">{isAr ? 'ريال / مجاناً دائماً' : 'SAR / Forever Free'}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {isAr ? 'مثالية للتعرف على أسلوب ATTOCUS وتجربة التلخيص السقراطي.' : 'Ideal for exploring ATTOCUS and experiencing Socratic summarization.'}
                    </p>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> {isAr ? 'رفع حتى 10 محاضرات شهرياً' : 'Up to 10 lectures/month'}</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> {isAr ? 'محرك التلخيص السقراطي الأساسي' : 'Standard Socratic Dialogue'}</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> {isAr ? 'مؤقت بومودورو مع حساب الستريك' : 'Pomodoro focus timer & streaks'}</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={onReturnHome}
                    className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {isAr ? 'ابدأ مجاناً' : 'Get Started'}
                  </button>
                </div>

                {/* 2. Pro Scholar (Highlighted) */}
                <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20 relative flex flex-col justify-between space-y-6">
                  <div className="absolute top-4 end-4 px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-md">
                    {isAr ? 'الأكثر طلباً' : 'Most Popular'}
                  </div>
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-blue-200 uppercase tracking-wider block">
                      {isAr ? 'الطالب المتفوق' : 'Pro Scholar'}
                    </span>
                    <div>
                      <span className="text-3xl font-black">{billingCycle === 'monthly' ? '29' : '249'}</span>
                      <span className="text-xs text-blue-100 font-semibold ps-1">{billingCycle === 'monthly' ? (isAr ? 'ريال / شهرياً' : 'SAR / month') : (isAr ? 'ريال / سنوياً' : 'SAR / year')}</span>
                    </div>
                    <p className="text-xs text-blue-100 leading-relaxed">
                      {isAr ? 'الترقية الشاملة للطلاب الجادين الراغبين في التفوق بأعلى معدل.' : 'The comprehensive suite for serious learners aiming for academic mastery.'}
                    </p>
                    <ul className="space-y-2.5 text-xs text-blue-50 pt-2 border-t border-white/20">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-300" /> {isAr ? 'رفع محاضرات ومستندات لا محدودة' : 'Unlimited lecture uploads'}</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-300" /> {isAr ? 'رادار التركيز البصري الكامل مع كشف الهاتف' : 'Full Vision Radar & phone alerts'}</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-300" /> {isAr ? 'توليد اختبارات وفلاش كاردز تفاعلية لا محدودة' : 'Unlimited adaptive quizzes'}</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-300" /> {isAr ? 'أولوية معالجة في السيرفرات السحابية' : 'Priority cloud processing'}</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={onReturnHome}
                    className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-blue-700 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {isAr ? 'ترقية الحساب الآن' : 'Upgrade to Pro'}
                  </button>
                </div>

                {/* 3. Campus & Enterprise */}
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      {isAr ? 'المجموعات والجامعات' : 'Campus & Groups'}
                    </span>
                    <div>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{isAr ? 'مخصص' : 'Custom'}</span>
                      <span className="text-xs text-slate-400 font-semibold ps-1">{isAr ? 'للكليات والمعاهد' : 'For Departments'}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {isAr ? 'تراخيص جماعية مخصصة للمؤسسات التعليمية والمجموعات البحثية.' : 'Bulk enterprise licenses for educational institutions and study groups.'}
                    </p>
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> {isAr ? 'لوحة تحكم إدارية وإحصائيات مجمعة' : 'Admin management console'}</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> {isAr ? 'تكامل مع أنظمة LMS الأكاديمية' : 'LMS integration (Blackboard, Canvas)'}</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> {isAr ? 'دعم فني مخصص 24/7' : 'Dedicated 24/7 technical lead'}</li>
                    </ul>
                  </div>
                  <a
                    href="#contact"
                    onClick={onReturnHome}
                    className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold text-center transition-all cursor-pointer"
                  >
                    {isAr ? 'طلب عرض مخصص' : 'Contact Sales'}
                  </a>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. تحديثات المنصة (Platform Updates & Changelog)           */}
          {/* ========================================================= */}
          {activeSection === 'updates' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <RefreshCw className="w-4 h-4" />
                  <span>{isAr ? 'سجل التطوير المستمر' : 'Continuous Evolution Log'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {isAr ? 'تحديثات المنصة وسجل الإصدارات' : 'ATTOCUS Release Changelog'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? 'نعمل باستمرار على تطوير المنصة وابتكار مزايا ذكية بناءً على ملاحظات الطلاب والباحثين.'
                    : 'We continuously evolve the platform, deploying intelligent capabilities inspired by direct student feedback.'}
                </p>
              </div>

              {/* Release Timeline */}
              <div className="space-y-8 border-s-2 border-slate-200 dark:border-slate-800 ms-3 ps-6">
                
                {/* Release v2.5 */}
                <div className="relative space-y-2">
                  <div className="absolute -start-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-950" />
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold">
                      v2.5 (Latest)
                    </span>
                    <span className="text-xs text-slate-400 font-mono">سبتمبر 2026</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'شاشة البداية الديناميكية وإدارة المجلدات المتقدمة' : 'Dynamic Intro Hub & Enhanced Local Folders'}
                  </h3>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                    <li>{isAr ? 'إطلاق شاشة البداية الديناميكية لـ ATTOCUS برؤية (Attention + Focus).' : 'Launch of the dynamic ATTOCUS intro hub introducing the Attention + Focus identity.'}</li>
                    <li>{isAr ? 'نظام متقدم لتنظيم المجلدات مع حفظ فوري ومزامنة ذكية تمنع فقدان البيانات.' : 'Robust folder persistence preventing data loss across hard browser refreshes.'}</li>
                    <li>{isAr ? 'تحسين دقة رادار التركيز وكشف الهاتف في ظروف الإضاءة المتفاوتة.' : 'Refined Edge Vision heuristics for smartphone and drowsy posture detection.'}</li>
                  </ul>
                </div>

                {/* Release v2.0 */}
                <div className="relative space-y-2">
                  <div className="absolute -start-[31px] top-1 w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-900" />
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold">
                      v2.0
                    </span>
                    <span className="text-xs text-slate-400 font-mono">أغسطس 2026</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'إطلاق رادار الرؤية الحاسوبية والمزامنة السحابية' : 'Edge Vision Launch & Cloud Sync Engine'}
                  </h3>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                    <li>{isAr ? 'تشغيل نموذج الرؤية الحاسوبية على المتصفح مباشرة لحماية الخصوصية المطلقة.' : '100% on-device vision inference delivering zero-cloud camera privacy.'}</li>
                    <li>{isAr ? 'مزامنة السجلات الأكاديمية والستريك ونقاط التركيز مع Firebase Firestore.' : 'Cloud backup of academic progress, Pomodoro streaks, and focus points.'}</li>
                  </ul>
                </div>

                {/* Release v1.0 */}
                <div className="relative space-y-2">
                  <div className="absolute -start-[31px] top-1 w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-900" />
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold">
                      v1.0
                    </span>
                    <span className="text-xs text-slate-400 font-mono">مايو 2026</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'الإطلاق الرسمي لمنصة ATTOCUS' : 'Official Launch of ATTOCUS Workspace'}
                  </h3>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                    <li>{isAr ? 'إطلاق واجهة القراءة التفاعلية وتحليل ملفات الـ PDF مع الحوار السقراطي.' : 'Core study room reader with interactive Socratic verification dialogue.'}</li>
                  </ul>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* ─── Bottom Footer Bar ──────────────────────────────────────── */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 py-6 px-4 sm:px-8 text-xs text-slate-400 dark:text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 font-serif">ATTOCUS</span>
            <span>•</span>
            <span>{isAr ? 'المنصة الأكاديمية الذكية' : 'Intelligent Academic Platform'}</span>
          </div>
          <span>&copy; {new Date().getFullYear()} ATTOCUS. {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}</span>
        </div>
      </footer>

    </div>
  );
};
