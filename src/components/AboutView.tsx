import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  ShieldCheck,
  Linkedin,
  Mail,
  Phone,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flame,
  Eye,
  Video,
  Layers,
  Cpu,
  Send,
  MessageSquare,
  HelpCircle,
  Heart,
  Award,
  Code2,
  Terminal,
  Database,
  Activity,
  ArrowUpRight,
  Globe,
  BookOpen
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { saveContactMessageToFirestore } from '../services/firestoreService';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';

interface AboutViewProps {
  onReturnHome: () => void;
  initialSection?: 'about' | 'developers' | 'contact' | 'tech';
}

interface TeamMember {
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  linkedin: string;
  avatarColor: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    nameAr: 'طيف العنزي',
    nameEn: 'Taif Alanzi',
    roleAr: 'مهندسة ذكاء اصطناعي وكيلي',
    roleEn: 'Agentic AI Engineer',
    avatarColor: 'from-amber-500 to-orange-600',
    linkedin: 'https://www.linkedin.com/in/taif-alanzi-is'
  },
  {
    nameAr: 'بارقة الجارالله',
    nameEn: 'Bariqa Aljarallah',
    roleAr: 'مهندسة ذكاء اصطناعي وكيلي',
    roleEn: 'Agentic AI Engineer',
    avatarColor: 'from-emerald-600 to-teal-600',
    linkedin: 'https://www.linkedin.com/in/bariqa-aljarallah?utm_source=share_via&utm_content=profile&utm_medium=member_ios'
  },
  {
    nameAr: 'سكينة الرمضان',
    nameEn: 'Sukainah Alramadhan',
    roleAr: 'مهندسة ذكاء اصطناعي وكيلي',
    roleEn: 'Agentic AI Engineer',
    avatarColor: 'from-blue-600 to-indigo-600',
    linkedin: 'https://sa.linkedin.com/in/sukainah-alramadhan/ar'
  },
  {
    nameAr: 'رنا العصيمي',
    nameEn: 'Rana Alosami',
    roleAr: 'مهندسة ذكاء اصطناعي وكيلي',
    roleEn: 'Agentic AI Engineer',
    avatarColor: 'from-purple-600 to-pink-600',
    linkedin: 'https://www.linkedin.com/in/rana-alosaimi-7a81ab24a?utm_source=share_via&utm_content=profile&utm_medium=member_ios'
  }
];


const TECH_STACK = [
  {
    title: 'FastAPI Multi-Agent Backend',
    categoryAr: 'الذكاء الاصطناعي الخلفي',
    categoryEn: 'Backend & Agents',
    descAr: 'شبكة وكلاء معرفية متكاملة (Orchestrator, Quiz, Summary, Learning, Vision) تعمل بانسجام تام وفق منهج تفاعلي متقدم.',
    descEn: 'Fully orchestrated multi-agent network operating in tight synergy to deliver structured active recall and interactive tutoring.',
    icon: Brain,
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/20'
  },
  {
    title: 'Firestore Vector Search (RAG)',
    categoryAr: 'محرك الاسترجاع الشعاعي',
    categoryEn: 'Vector Database & RAG',
    descAr: 'تضمين شرائح المحاضرات شعاعياً عبر OpenAI text-embedding-3-small واسترجاعها بدقة فائقة لربط كل سؤال بالشريحة الأصلية.',
    descEn: 'Native vector indexing via OpenAI embeddings to ground quizzes and explanations strictly in student lecture notes with zero hallucination.',
    icon: Database,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  },
  {
    title: 'Edge Computer Vision (YOLO11 & MediaPipe)',
    categoryAr: 'الرؤية الحاسوبية الخصوصية',
    categoryEn: 'Privacy-First Vision',
    descAr: 'معالجة الكاميرا بالكامل على جهاز الطالب لكشف الهاتف والنعاس دون تخزين أي صورة أو فيديو خارج المتصفح إطلاقاً.',
    descEn: 'On-device distraction and drowsiness detection running locally in the browser — private, zero video storage, zero cloud latency.',
    icon: Eye,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    title: 'React 19 + TypeScript + Vite',
    categoryAr: 'الواجهة التفاعلية الحديثة',
    categoryEn: 'Frontend Engineering',
    descAr: 'واجهة فائقة السرعة مع كانفاس رسم احترافي مقتبس من Notability، ونظام الوضعين الفاتح والداكن، وثنائية لغوية كاملة.',
    descEn: 'High-performance interactive study canvas, bilingual Arabic/English localization, and fluid dark/light design tokens.',
    icon: Code2,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  },
  {
    title: 'DeepEval & LangSmith Tracing',
    categoryAr: 'المراقبة والتقييم الآلي',
    categoryEn: 'Observability & Testing',
    descAr: '72 فحصاً واختباراً آلياً شاملاً للتحقق من أمان المدخلات، دقة الإجابات، ومراقبة استهلاك النماذج في الوقت الفعلي.',
    descEn: '72 automated verification suites covering input guardrails, quiz groundedness, and real-time execution chain telemetry.',
    icon: Activity,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
  },
  {
    title: 'Cognitive Gamification System',
    categoryAr: 'التحفيز وعادات المذاكرة',
    categoryEn: 'Gamified Study Habits',
    descAr: 'تقنية بومودورو مع حساب دقيق لزمن التركيز، عداد ستريك يومي متواصل، ومتجر لفتح الشخصيات الأكاديمية.',
    descEn: 'Integrated Pomodoro focus sessions, daily flame streaks, and a focus point economy rewarding consistent academic discipline.',
    icon: Flame,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20'
  }
];

export const AboutView: React.FC<AboutViewProps> = ({
  onReturnHome,
  initialSection = 'about'
}) => {
  const { isAr, dir, t } = useLanguage();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'about' | 'developers' | 'tech' | 'contact'>(initialSection);

  // Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCategory, setContactCategory] = useState<'academic' | 'feature' | 'support'>('academic');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (initialSection) {
      setActiveTab(initialSection);
      const el = document.getElementById(initialSection);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [initialSection]);

  const handleScrollTo = (sectionId: 'about' | 'developers' | 'tech' | 'contact') => {
    setActiveTab(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await saveContactMessageToFirestore({
        name: contactName.trim(),
        email: contactEmail.trim(),
        category: contactCategory,
        message: contactMessage.trim(),
        userId: currentUser?.uid || null
      });

      if (res.success) {
        setFormSubmitted(true);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
        setTimeout(() => setFormSubmitted(false), 7000);
      } else {
        setErrorMessage(
          isAr
            ? 'تعذر الحفظ في فايربيس بسبب صلاحيات الأمان (Firestore Rules). يرجى التأكد من نشر القواعد في Firebase Console.'
            : 'Could not save to Firebase due to Firestore Security Rules. Please check rules in Firebase Console.'
        );
      }
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setErrorMessage(
        isAr
          ? 'حدث خطأ أثناء الاتصال بـ Firebase.'
          : 'An error occurred while connecting to Firebase.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const FAQS = [
    {
      qAr: 'هل تحفظ المنصة صوراً أو تسجيلات فيديو من الكاميرا؟',
      qEn: 'Does Attocus store photos or video feeds from my webcam?',
      aAr: 'على الإطلاق! خصوصية الطالب هي أولويتنا القصوى. خوارزميات الرؤية الحاسوبية تعمل محلياً داخل المتصفح (Client-Side On-Device Processing) لرصد حركة الرأس وتواجد الهاتف، ولا يتم إرسال أو تخزين أي لقطة في السيرفرات السحابية أبداً.',
      aEn: 'Never! Student privacy is our highest priority. Computer vision telemetry runs strictly on-device inside your browser. No video frames or webcam images ever leave your device or touch external servers.'
    },
    {
      qAr: 'كيف تضمن المنصة عدم اختلاق معلومات (Hallucinations) في الكويزات والشرح؟',
      qEn: 'How does Attocus prevent hallucinations during quizzes and explanations?',
      aAr: 'تعتمد المنصة على محرك استرجاع شعاعي مقيّد بالكامل (Strict Grounded RAG). عند صياغة أي سؤال أو تقديم توضيح، يتم إجبار الوكيل الذكي على الاقتباس الحصري من شرائح المحاضرة المرفوعة، مع ذكر رقم الشريحة المصدرية بدقة.',
      aEn: 'The platform employs a strictly grounded Vector RAG architecture. Every generated quiz question and concept explanation is anchored verbatim in your lecture slides, complete with exact slide citations.'
    },
    {
      qAr: 'ما هي طريقة التعلم التفاعلي المتبعة في Attocus؟',
      qEn: 'What is the interactive learning method implemented in Attocus?',
      aAr: 'بدلاً من إعطاء إجابات معلبة وجاهزة، يطرح كوتش التعلم أسئلة توجيهية تفاعلية متدرجة تهدف إلى استخراج الفهم الحقيقي من الطالب نفسه، وتوجيهه خطوة بخطوة حتى يصل للاستنتاج الصحيح بنفسه مما يرسخ المعلومة في الذاكرة طويلة المدى.',
      aEn: 'Instead of spoon-feeding textbook answers, our Interactive Summary Agent guides the student through thoughtful questions, nudging them to formulate insights in their own words for durable cognitive retention.'
    },
    {
      qAr: 'هل يمكنني استخدام Attocus بدون فتح الكاميرا؟',
      qEn: 'Can I use Attocus without turning on the webcam?',
      aAr: 'نعم بالتأكيد! تشغيل الكاميرا اختياري تماماً بموافقة صريحة من الطالب. يمكنك الاستمتاع بجميع مزايا كانفاس المذاكرة، الملخصات التفاعلية، الكويزات، وكوتش الشرح حتى مع إيقاف مراقبة الكاميرا.',
      aEn: 'Absolutely! Camera attention tracking is 100% opt-in with explicit consent. You can fully access the interactive slide canvas, interactive summaries, quizzes, and learning coach with camera tracking disabled.'
    }
  ];

  return (
    <div dir={dir} className="min-h-screen bg-[#FBFBFC] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-[#0F172A] selection:text-white dark:selection:bg-blue-600 transition-colors duration-200">
      {/* ─── 1. شريط التنقل العلوي الفاخر ──────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 transition-colors duration-200">
        <div className="w-full px-6 sm:px-8 xl:px-12 h-16 flex items-center justify-between gap-4">
          {/* الشعار والعودة للرئيسية */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReturnHome}
              className="flex items-center gap-2.5 p-1 -m-1 rounded-xl hover:opacity-85 transition-opacity group text-left"
              title={isAr ? 'العودة للمنصة الرئيسية' : 'Return to Workspace'}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-xs ring-1 ring-black/5 dark:ring-white/20 group-hover:scale-105 transition-transform bg-white p-0.5">
                <img src="/assets/logos/logo_squircle_eye.png" alt="ATTOCUS" className="w-full h-full object-contain" />
              </div>
              <div className={`flex flex-col ${isAr ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-wider text-[#0F172A] dark:text-white font-serif uppercase">
                    ATTOCUS
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                    PORTFOLIO
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                  {isAr ? 'عن المنصة وفريق العمل' : 'About & Engineering Team'}
                </span>
              </div>
            </button>
          </div>

          {/* روابط القفز السريع للأقسام */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleScrollTo('about')}
              className={`transition-colors py-1 relative ${
                activeTab === 'about'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{isAr ? 'من نحن ورؤيتنا' : 'About Us'}</span>
              {activeTab === 'about' && (
                <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('developers')}
              className={`transition-colors py-1 relative ${
                activeTab === 'developers'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{isAr ? 'فريق العمل' : 'Engineering Team'}</span>
              {activeTab === 'developers' && (
                <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('tech')}
              className={`transition-colors py-1 relative ${
                activeTab === 'tech'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{isAr ? 'البنية التقنية' : 'Architecture'}</span>
              {activeTab === 'tech' && (
                <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('contact')}
              className={`transition-colors py-1 relative ${
                activeTab === 'contact'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{isAr ? 'تواصل معنا' : 'Contact'}</span>
              {activeTab === 'contact' && (
                <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          </nav>

          {/* أدوات التحكم + زر العودة للمنصة */}
          <div className="flex items-center gap-2.5">
            <LanguageSelector />
            <ThemeToggle />

            <button
              type="button"
              id="return-to-study-home-btn"
              onClick={onReturnHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs active:scale-95"
            >
              {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              <span>{isAr ? 'العودة للمنصة' : 'Back to App'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION الترحيبي الفاخر ────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-16 px-6 sm:px-8 xl:px-12 border-b border-slate-200/60 dark:border-slate-800 bg-gradient-to-b from-blue-50/40 via-transparent to-transparent dark:from-blue-950/20">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs font-semibold animate-in fade-in duration-300">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{isAr ? 'الجيل القادم لرفقة المذاكرة الأكاديمية والتركيز المعرفي' : 'Next-Generation Multi-Agent Interactive Study Companion'}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight sm:leading-none font-serif">
            {isAr ? (
              <>
                إعادة ابتكار <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">المذاكرة العميقة</span> بالذكاء الاصطناعي التفاعلي
              </>
            ) : (
              <>
                Reimagining <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">Deep Learning</span> via Multi-Agent Interactive AI
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {isAr
              ? 'صُممت منصة Attocus (أتـوكـس) كغرفة مذاكرة ذكية مدعومة برؤية حاسوبية خصوصية على جهاز الطالب، مع شبكة وكلاء ذكاء اصطناعي تفاعلية تضمن الاستيعاب الأصيل ومحاربة التشتت الذهني.'
              : 'Attocus is an orchestrated study ecosystem pairing privacy-first edge computer vision with autonomous interactive agents to cultivate genuine conceptual understanding and sustain cognitive flow.'}
          </p>

          {/* Highlights Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto pt-6 text-start">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <Brain className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{isAr ? 'وكلاء ذكاء' : 'AI Agents'}</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">5 Agents</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{isAr ? 'تنسيق تفاعلي متكامل' : 'Orchestrated interactive team'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{isAr ? 'فحوصات الأمان' : 'Guardrails'}</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">72 / 72 ✔</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{isAr ? 'اختبارات آمنة بنسبة 100%' : '100% pass rate validation'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                <Database className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{isAr ? 'البحث الشعاعي' : 'Vector RAG'}</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">Zero Hallucination</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{isAr ? 'ربط موثق بشرائح المحاضرة' : 'Strictly grounded lecture chunks'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                <Eye className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{isAr ? 'رؤية حاسوبية' : 'Edge Vision'}</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">100% On-Device</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{isAr ? 'خصوصية تامة بدون حفظ فيديو' : 'Zero cloud webcam storage'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. SECTION 1: ABOUT ATTOCUS & MISSION (من نحن ورؤيتنا) ────── */}
      <section id="about" className="py-16 px-6 sm:px-8 xl:px-12 border-b border-slate-200/60 dark:border-slate-800">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className={`space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
              <BookOpen className="w-4 h-4" />
              <span>{isAr ? 'قصة المنصة ورسالتها' : 'Our Story & Purpose'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-serif">
              {isAr ? 'لماذا أنشأنا Attocus؟' : 'Why We Built Attocus'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              {isAr
                ? 'في عصر الإشعارات الرقمية المتواصلة، يعاني الطالب الجامعي من تحديين جوهريين: سرعة فقدان التركيز الذهني بعد دقائق معدودة، والقراءة السطحية السريعة للشرائح دون استيعاب حقيقي يضمن التفوق في الاختبارات. نشأت فكرة Attocus لابتكار بيئة مذاكرة ذكية تعمل كمدرب خاص يراقب تركيزك ويسألك أسئلة تفاعلية عميقة تمكنك من صياغة المفاهيم بلغتك الخاصة.'
                : 'In an era of relentless digital noise, university students struggle with two critical barriers: chronic cognitive distraction and passive superficial scanning of course slides. Attocus was born to reinvent the study desk as an intelligent, empathetic companion that detects distraction silently and uses interactive dialogue to turn passive reading into deep mastery.'}
            </p>
          </div>

          {/* Three Pillars Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr ? 'الحوار المعرفي التفاعلي' : 'Interactive Active Recall'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? 'لا تقدم المنصة ملخصات جاهزة للحفظ السريع، بل تستجوب فهم الطالب بلطف وتساعده على سد الفجوات بنفسه، وتصيغ له تلخيصاً موثقاً بكلماته هو.'
                  : 'Instead of passive summaries, our agents engage in scaffolded questioning that draws out real understanding, generating personalized takeaways.'}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr ? 'الخصوصية أولاً وأخيراً' : 'Privacy-First Architecture'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? 'حسابات الرؤية الحاسوبية تعمل 100% على جهاز الطالب مباشرة (Edge AI). لا يتم تسجيل أي فيديو ولا إرسال أي لقطة لسيرفراتنا إطلاقاً.'
                  : 'All vision detection runs entirely client-side. Zero video recordings, zero camera frames transmitted to the cloud.'}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr ? 'التحفيز وبناء العادات' : 'Cognitive Habit Building'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? 'تحويل جلسات المذاكرة المرهقة إلى إنجازات ملموسة عبر نقاط التركيز، الستريك اليومي المشتعل، ومتجر الشخصيات المتدرج.'
                  : 'Transforming study fatigue into sustained momentum through focus points, fiery daily streaks, and avatar unlocks.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. SECTION 2: DEVELOPERS & TEAM PORTFOLIO (المطورون وفريق العمل) ─ */}
      <section id="developers" className="py-16 px-6 sm:px-8 xl:px-12 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c101d]/40">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className={`space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
              <Award className="w-4 h-4" />
              <span>{isAr ? 'فريق العمل' : 'Our Team'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-serif">
              {isAr ? 'فريق التطوير والهندسة البرمجية' : 'Engineering Team'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {isAr
                ? 'فريق العمل المكون من مهندسات طموحات قمن ببناء منصة Attocus بتعاون تكاملي كامل: وتطوير واجهاتها وبنيتها البرمجية وهندسة الوكلاء الأذكياء.'
                : 'The passionate engineering team united to build Attocus collaboratively: crafting its interactive interface, backend architecture, and intelligent agents.'}
            </p>
          </div>

          {/* Developers 4 Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TEAM_MEMBERS.map((member, idx) => (
              <div
                key={idx}
                className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-13 h-13 rounded-2xl bg-gradient-to-tr ${member.avatarColor} text-white font-bold text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 font-serif`}>
                      {isAr ? member.nameAr.split(' ')[0].charAt(0) : member.nameEn.split(' ')[0].charAt(0)}
                    </div>
                    <div className={isAr ? 'text-right' : 'text-left'}>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {isAr ? member.nameAr : member.nameEn}
                      </h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                        {isAr ? member.roleAr : member.roleEn}
                      </p>
                    </div>
                  </div>

                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-all text-xs font-semibold shrink-0"
                    title={isAr ? 'الملف الشخصي على LinkedIn' : 'LinkedIn Profile'}
                  >
                    <Linkedin className="w-4 h-4" />
                    <span className="hidden sm:inline">{isAr ? 'LinkedIn' : 'LinkedIn'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. SECTION 3: TECH STACK SHOWCASE (البنية التقنية) ───────── */}
      <section id="tech" className="py-16 px-6 sm:px-8 xl:px-12 border-b border-slate-200/60 dark:border-slate-800">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className={`space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
              <Cpu className="w-4 h-4" />
              <span>{isAr ? 'التقنيات والهندسة المعمارية' : 'Engineering & Architecture'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-serif">
              {isAr ? 'البنية التقنية المتطورة' : 'Core Technology Stack'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {isAr
                ? 'تم بناء Attocus وفق معايير برمجية عالمية تجمع بين خفة وسرعة واجهات React 19 والذكاء الاصطناعي الموزع مع أقصى درجات الأمان والخصوصية.'
                : 'Engineered with production-ready standards pairing high-speed React 19 interfaces with an asynchronous Python FastAPI cognitive backend.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TECH_STACK.map((tech, idx) => {
              const Icon = tech.icon;
              return (
                <div
                  key={idx}
                  className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 p-6 shadow-xs hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${tech.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {isAr ? tech.categoryAr : tech.categoryEn}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {tech.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {isAr ? tech.descAr : tech.descEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 6. SECTION 4: CONTACT & SUPPORT & FAQ (تواصل معنا والدعم الفني) ── */}
      <section id="contact" className="py-16 px-6 sm:px-8 xl:px-12 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c101d]/40">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className={`space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
              <MessageSquare className="w-4 h-4" />
              <span>{isAr ? 'قنوات المساعدة والمقترحات' : 'Get In Touch'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-serif">
              {isAr ? 'تواصل معنا والدعم الفني' : 'Contact & Support'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {isAr
                ? 'نسعد دائماً باستقبال اقتراحات الطلاب والأساتذة والرد على أي استفسارات أو مشاكل تقنية تخص المنصة.'
                : 'We welcome inquiries, feedback, and academic collaborations from students, educators, and institutions.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Contact Form (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/70 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              <div className={isAr ? 'text-right' : 'text-left'}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isAr ? 'أرسل رسالة لفريق العمل' : 'Send a message to our team'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAr ? 'سنرد عليك في غضون 24 ساعة عبر بريدك الإلكتروني.' : 'We typically respond within 24 hours.'}
                </p>
              </div>

              {formSubmitted ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 animate-in fade-in duration-300">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    {isAr ? 'تم استلام وحفظ رسالتك في قاعدة البيانات بنجاح! 🎉' : 'Message received and saved to database successfully! 🎉'}
                  </h4>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                    {isAr
                      ? 'شكراً لتواصلك. تم تسجيل رسالتك وسيقوم فريق العمل بمراجعتها والتواصل معك عبر بريدك الإلكتروني قريباً.'
                      : 'Thank you for reaching out. Your message is recorded in our database, and our team will reply soon.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitContact} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-start">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'الاسم الكريم' : 'Your Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                        placeholder={isAr ? 'مثال: محمد السالم' : 'e.g. Alex Johnson'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5 text-start">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="you@university.edu"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-start">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'نوع الاستفسار' : 'Inquiry Category'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'academic', labelAr: 'استفسار أكاديمي', labelEn: 'Academic' },
                        { id: 'feature', labelAr: 'اقتراح ميزة', labelEn: 'Feature Suggestion' },
                        { id: 'support', labelAr: 'دعم فني', labelEn: 'Technical Support' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setContactCategory(cat.id as any)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-medium border transition-all text-center ${
                            contactCategory === cat.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isAr ? cat.labelAr : cat.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-start">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'الرسالة أو الملاحظة' : 'Message Details'}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={e => setContactMessage(e.target.value)}
                      placeholder={isAr ? 'اكتب تفاصيل استفسارك أو تجربتك مع منصة Attocus...' : 'Describe your inquiry, suggestion, or technical question...'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium leading-relaxed animate-in fade-in text-start">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>{isAr ? 'جاري الإرسال والحفظ...' : 'Sending & Saving...'}</span>
                      </span>
                    ) : (
                      <>
                        <Send className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                        <span>{isAr ? 'إرسال الرسالة الآن' : 'Send Message'}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Quick Info & FAQ (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Info Card */}
              <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/70 dark:border-slate-800 p-6 shadow-xs space-y-4 text-start">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAr ? 'قنوات التواصل المباشرة' : 'Direct Channels'}
                </h3>
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {/* البريد الرسمي */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                    <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">{isAr ? 'البريد الرسمي' : 'Official Email'}</span>
                      <a href="mailto:Attocus.startup@gmail.com" className="font-semibold text-slate-900 dark:text-white hover:underline break-all">
                        Attocus.startup@gmail.com
                      </a>
                    </div>
                  </div>

                  {/* رقم الجوال والتواصل */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                    <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">{isAr ? 'رقم الجوال والتواصل' : 'Mobile / Phone'}</span>
                      <a
                        href="tel:+966556270712"
                        className="font-semibold text-slate-900 dark:text-white hover:underline inline-flex items-center gap-1.5"
                        dir="ltr"
                      >
                        <span>+966 556270712</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  </div>

                  {/* حساب منصة إكس */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                    <div className="w-4 h-4 text-slate-900 dark:text-white shrink-0 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">{isAr ? 'منصة إكس (Twitter)' : 'X (Twitter)'}</span>
                      <a
                        href="https://x.com/Attocusksa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-900 dark:text-white hover:underline inline-flex items-center gap-1"
                      >
                        <span>Attocusksa</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Accordion */}
              <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/70 dark:border-slate-800 p-6 shadow-xs space-y-4 text-start">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isAr ? 'الأسئلة الشائعة (FAQ)' : 'Frequently Asked Questions'}
                  </h3>
                </div>

                <div className="space-y-2">
                  {FAQS.map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className="w-full p-3 text-left font-semibold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-2 transition-colors"
                        >
                          <span className={isAr ? 'text-right' : 'text-left'}>{isAr ? faq.qAr : faq.qEn}</span>
                          <span className="text-slate-400 font-mono text-sm shrink-0">
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                            {isAr ? faq.aAr : faq.aEn}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. FOOTER الختامي ────────────────────────────────────────── */}
      <footer className="w-full bg-white dark:bg-[#0b0f19] border-t border-slate-200/70 dark:border-slate-800 py-8 px-6 sm:px-8 xl:px-12 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F172A] dark:text-slate-200 tracking-wider font-serif">ATTOCUS</span>
            <span>&copy; {new Date().getFullYear()} {isAr ? 'منصة المذاكرة الأكاديمية الذكية · صُممت بكل فخر لدعم الطلاب والباحثين.' : 'Intelligent Interactive Study Companion. Built with excellence.'}</span>
          </div>

          <button
            type="button"
            onClick={onReturnHome}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>{isAr ? 'العودة لغرفة المذاكرة' : 'Return to Study Room'}</span>
            {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </footer>
    </div>
  );
};
