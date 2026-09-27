
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type TourScreen = 'home' | 'study_room';

interface OnboardingTourProps {
    screen: TourScreen;
    onNavigateHome: () => void;
    onNavigateStudyRoom: () => void;
    onComplete: () => Promise<void>;
}

interface TourStep {
    screen: TourScreen;
    target: string | null;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
}

const STEPS: TourStep[] = [
    { screen: 'home', target: null, titleAr: 'أهلًا بك في Attocus!', titleEn: 'Welcome to Attocus!', descAr: 'خلّنا نتعرّف على أدوات المذاكرة الذكية.', descEn: 'Let\'s explore your smart study tools.' },
    { screen: 'home', target: '#open-scheduled-reviews-btn', titleAr: 'الأسئلة المجدولة', titleEn: 'Scheduled reviews', descAr: 'راجع الأسئلة المستحقة في مواعيدها.', descEn: 'Review questions when they are due.' },
    { screen: 'home', target: '#open-points-history-btn', titleAr: 'النقاط', titleEn: 'Focus points', descAr: 'اعرف رصيد نقاطك واطّلع على سجل النقاط.', descEn: 'View your points balance and history.' },
    { screen: 'home', target: '#open-shop-btn', titleAr: 'المتجر', titleEn: 'Shop', descAr: 'استخدم نقاطك داخل المتجر.', descEn: 'Use your earned points in the shop.' },
    { screen: 'home', target: '#open-streak-btn', titleAr: 'الستريك', titleEn: 'Study streak', descAr: 'تابع عدد أيام المذاكرة المتتالية.', descEn: 'Track your consecutive study days.' },
    { screen: 'home', target: '#add-folder-btn', titleAr: 'المجلدات', titleEn: 'Folders', descAr: 'أنشئ مجلدًا جديدًا لتنظيم محاضراتك.', descEn: 'Create folders to organize your lectures.' },
    { screen: 'home', target: '#quick-upload-doc-btn', titleAr: 'رفع الملفات', titleEn: 'Upload documents', descAr: 'ارفع مستندًا أو محاضرة جديدة من هنا.', descEn: 'Upload a new document or lecture here.' },
    { screen: 'home', target: '[id^="lecture-card-"]', titleAr: 'محاضراتك', titleEn: 'Your lectures', descAr: 'اختر محاضرة للانتقال إلى غرفة الدراسة.', descEn: 'Choose a lecture to enter the study room.' },
    { screen: 'study_room', target: '#study-document-page-sheet', titleAr: 'المحاضرة', titleEn: 'Your lecture', descAr: 'هنا تعرض المحاضرة وتتنقل بين صفحاتها.', descEn: 'Read your lecture and move between pages here.' },
    { screen: 'study_room', target: '#onboarding-pomodoro-timer', titleAr: 'التايمر', titleEn: 'Study timer', descAr: 'استخدم مؤقت بومودورو لتنظيم وقت المذاكرة والاستراحة.', descEn: 'Use the Pomodoro timer to plan study and break sessions.' },
    { screen: 'study_room', target: '#annotation-tool-pen-btn', titleAr: 'أدوات التعليق', titleEn: 'Annotation tools', descAr: 'اكتب وحدد المعلومات المهمة على المحاضرة.', descEn: 'Write and highlight important content.' },
    { screen: 'study_room', target: '#toggle-attention-camera-btn', titleAr: 'وكيل الانتباه', titleEn: 'Attention Agent', descAr: 'راقب تركيزك اختياريًا. الجولة لا تشغّل الكاميرا.', descEn: 'Optionally monitor your attention. The tour never activates your camera.' },
    { screen: 'study_room', target: '#bottom-explain-coach-btn', titleAr: 'وكيل الشرح', titleEn: 'Explain Agent', descAr: 'اطلب شرحًا لأي جزء يحتاج توضيحًا.', descEn: 'Get explanations whenever you need clarification.' },
    { screen: 'study_room', target: '#stuck-action-quiz-me', titleAr: 'وكيل الاختبارات', titleEn: 'Quiz Agent', descAr: 'زر «اختبرني» داخل «تحتاج مساعدة هنا؟» يساعدك تختبر فهمك.', descEn: 'Use “Quiz me” in the help card to check your understanding.' },
    { screen: 'study_room', target: '#stuck-action-summarize-me', titleAr: 'وكيل التلخيص', titleEn: 'Summary Agent', descAr: 'زر «لخص لي» داخل «تحتاج مساعدة هنا؟» يساعدك تلخص المحتوى.', descEn: 'Use “Summarize” in the help card to summarize content.' },
    { screen: 'study_room', target: '#open-saved-summaries-btn', titleAr: 'ملخصاتك المحفوظة', titleEn: 'Saved summaries', descAr: 'ومن زر «ملخصاتي» أعلى الصفحة تقدر ترجع للملخصات السابقة.', descEn: 'Open “Summaries” in the top bar to revisit saved summaries.' },
    { screen: 'study_room', target: null, titleAr: 'أنت جاهز!', titleEn: 'You’re ready!', descAr: 'خلصت الجولة، تقدر تبدأ المذاكرة الآن.', descEn: 'Your tour is complete. Happy studying!' }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
    screen,
    onNavigateHome,
    onNavigateStudyRoom,
    onComplete
}) => {
    const { isAr } = useLanguage();
    const [stepIndex, setStepIndex] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const step = STEPS[stepIndex];
    const isLast = stepIndex === STEPS.length - 1;

    // Navigate to the screen required by the current step.
    useEffect(() => {
        if (step.screen === screen) return;

        if (step.screen === 'home') {
            onNavigateHome();
        } else {
            onNavigateStudyRoom();
        }
    }, [
        step.screen,
        screen,
        onNavigateHome,
        onNavigateStudyRoom
    ]);

    // Show the existing help card for its two onboarding steps without activating an agent.
    useEffect(() => {
        if (screen !== 'study_room') return;
        const showHelp = step.target === '#stuck-action-quiz-me' || step.target === '#stuck-action-summarize-me';
        window.dispatchEvent(new CustomEvent('attocus-tour-help-preview', { detail: showHelp }));
        return () => window.dispatchEvent(new CustomEvent('attocus-tour-help-preview', { detail: false }));
    }, [screen, step.target]);

    // Find the actual UI element and keep the spotlight aligned.
    useEffect(() => {
        if (screen !== step.screen || !step.target) {
            setRect(null);
            return;
        }

        let frame = 0;
        let observer: ResizeObserver | undefined;
        let mutationObserver: MutationObserver | undefined;
        let target: HTMLElement | null = null;

        const updatePosition = () => {
            if (!target || !target.isConnected) {
                setRect(null);
                return;
            }

            const bounds = target.getBoundingClientRect();

            if (bounds.width > 0 && bounds.height > 0) {
                setRect(bounds);
            } else {
                setRect(null);
            }
        };

        const findTarget = () => {
            target = document.querySelector<HTMLElement>(step.target!);

            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });

                observer = new ResizeObserver(updatePosition);
                observer.observe(target);
                updatePosition();
            } else {
                setRect(null);
            }
        };

        frame = requestAnimationFrame(findTarget);
        // The help card and study room can mount after navigation.
        mutationObserver = new MutationObserver(() => {
            if (!target || !target.isConnected) {
                observer?.disconnect();
                findTarget();
            }
        });
        mutationObserver.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            cancelAnimationFrame(frame);
            mutationObserver?.disconnect();
            observer?.disconnect();
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [stepIndex, step.screen, step.target, screen]);

    const finish = async () => {
        if (saving) return;

        setSaving(true);
        setError('');

        try {
            await onComplete();
        } catch (err) {
            console.error('[Onboarding] Unable to save:', err);
            setError(
                isAr
                    ? 'تعذّر حفظ الجولة. حاول مرة ثانية.'
                    : 'Could not save your tour. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    };

    const goNext = () => {
        setError('');
        setRect(null);
        setStepIndex(index => Math.min(index + 1, STEPS.length - 1));
    };

    const goBack = () => {
        setError('');
        setRect(null);
        setStepIndex(index => Math.max(index - 1, 0));
    };

    const padding = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spotlight = rect
        ? {
            left: Math.max(0, rect.left - padding),
            top: Math.max(0, rect.top - padding),
            right: Math.min(vw, rect.right + padding),
            bottom: Math.min(vh, rect.bottom + padding)
        }
        : null;

    const panelWidth = Math.min(360, vw - 32);

    const panelHeight = 265;
    const panelStyle: React.CSSProperties = spotlight
        ? (() => {
            const below = vh - spotlight.bottom;
            const above = spotlight.top;
            const right = vw - spotlight.right;
            const left = spotlight.left;
            // Prefer above/below, otherwise position beside the highlighted element.
            if (below >= panelHeight + 20) return {
                position: 'fixed', width: panelWidth,
                left: Math.max(16, Math.min(vw - panelWidth - 16, (spotlight.left + spotlight.right - panelWidth) / 2)),
                top: spotlight.bottom + 12
            };
            if (above >= panelHeight + 20) return {
                position: 'fixed', width: panelWidth,
                left: Math.max(16, Math.min(vw - panelWidth - 16, (spotlight.left + spotlight.right - panelWidth) / 2)),
                top: spotlight.top - panelHeight - 12
            };
            if (right >= panelWidth + 24) return {
                position: 'fixed', width: panelWidth, left: spotlight.right + 12,
                top: Math.max(16, Math.min(vh - panelHeight - 16, (spotlight.top + spotlight.bottom - panelHeight) / 2))
            };
            if (left >= panelWidth + 24) return {
                position: 'fixed', width: panelWidth, left: spotlight.left - panelWidth - 12,
                top: Math.max(16, Math.min(vh - panelHeight - 16, (spotlight.top + spotlight.bottom - panelHeight) / 2))
            };
            return {
                position: 'fixed', width: panelWidth, left: (vw - panelWidth) / 2,
                top: Math.max(16, Math.min(vh - panelHeight - 16, spotlight.top - panelHeight - 12))
            };
        })()
        : {
            position: 'fixed', width: panelWidth,
            left: (vw - panelWidth) / 2, top: Math.max(16, (vh - panelHeight) / 2)
        };

    return createPortal(
        <div
            dir={isAr ? 'rtl' : 'ltr'}
            className="fixed inset-0 z-[9999]"
            role="dialog"
            aria-modal="true"
            aria-label={isAr ? step.titleAr : step.titleEn}
        >
            {/* Dim everything except the highlighted control. */}
            {spotlight ? (
                <>
                    <div
                        className="absolute bg-black/70"
                        style={{
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: spotlight.top
                        }}
                    />
                    <div
                        className="absolute bg-black/70"
                        style={{
                            left: 0,
                            top: spotlight.bottom,
                            width: '100%',
                            bottom: 0
                        }}
                    />
                    <div
                        className="absolute bg-black/70"
                        style={{
                            left: 0,
                            top: spotlight.top,
                            width: spotlight.left,
                            height: spotlight.bottom - spotlight.top
                        }}
                    />
                    <div
                        className="absolute bg-black/70"
                        style={{
                            left: spotlight.right,
                            top: spotlight.top,
                            right: 0,
                            height: spotlight.bottom - spotlight.top
                        }}
                    />
                    <div
                        className="absolute rounded-xl border-2 border-blue-400 shadow-[0_0_0_4px_rgba(96,165,250,0.25)] pointer-events-none"
                        style={{
                            left: spotlight.left,
                            top: spotlight.top,
                            width: spotlight.right - spotlight.left,
                            height: spotlight.bottom - spotlight.top
                        }}
                    />
                </>
            ) : (
                <div className="absolute inset-0 bg-black/70" />
            )}

            {/* Tour popup */}
            <div
                style={panelStyle}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Sparkles size={18} />
                        <span className="text-xs font-bold tracking-wide">
                            ATTOCUS TOUR
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={finish}
                        disabled={saving}
                        aria-label={isAr ? 'تخطي الجولة' : 'Skip tour'}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X size={18} />
                    </button>
                </div>

                <h2 className="text-lg font-bold mb-2">
                    {isAr ? step.titleAr : step.titleEn}
                </h2>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-5">
                    {isAr ? step.descAr : step.descEn}
                </p>

                <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{
                            width: `${((stepIndex + 1) / STEPS.length) * 100}%`
                        }}
                    />
                </div>

                {error && (
                    <p role="alert" className="text-xs text-red-600 mb-3">
                        {error}
                    </p>
                )}

                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={goBack}
                        disabled={stepIndex === 0 || saving}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {isAr ? <ArrowRight size={15} /> : <ArrowLeft size={15} />}
                        {isAr ? 'السابق' : 'Back'}
                    </button>

                    <span className="text-xs text-slate-400">
                        {stepIndex + 1} / {STEPS.length}
                    </span>

                    <button
                        type="button"
                        onClick={isLast ? finish : goNext}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                    >
                        {saving
                            ? (isAr ? 'جارٍ الحفظ...' : 'Saving...')
                            : isLast
                                ? (isAr ? 'إنهاء' : 'Finish')
                                : (isAr ? 'التالي' : 'Next')}

                        {!isLast && (
                            isAr
                                ? <ArrowLeft size={15} />
                                : <ArrowRight size={15} />
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};