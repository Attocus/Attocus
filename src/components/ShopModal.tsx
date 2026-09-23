import React, { useState } from 'react';
import { X, Lock, Check, Sparkles, Crown, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface StudyCharacter {
  id: string;
  name: string;
  nameEn: string;
  titleArabic: string;
  titleEn: string;
  personalityDescription: string;
  personalityEn: string;
  emoji: string;
  pricePoints: number;
  colorHex: string;
}

export const STUDY_CHARACTERS: StudyCharacter[] = [
  {
    id: 'char-chill',
    name: 'الطالب المروّق (Chill Student)',
    nameEn: 'Chill Student',
    titleArabic: 'إنجاز هادئ وتركيز بلا توتر 🎧',
    titleEn: 'Calm focus, zero stress 🎧',
    personalityDescription: 'يدخل جلسة المذاكرة بمزاج رايق وكوب قهوة، يثبت المفاهيم بهدوء واستيعاب عالي مع أصدقائه.',
    personalityEn: 'Enters study sessions relaxed with coffee, mastering concepts calmly alongside friends.',
    emoji: '🎧',
    pricePoints: 0,
    colorHex: '#10B981',
  },
  {
    id: 'char-hacker',
    name: 'الهاكر الأكاديمي (Tech Hacker)',
    nameEn: 'Tech Hacker',
    titleArabic: 'تفكيك شفرات أصعب السلايدات 💻',
    titleEn: 'Cracking the hardest slides 💻',
    personalityDescription: 'لا يضيع وقتاً في الحفظ؛ يحلل أفكار المنهج بمنطق هندسي ويختصر أصعب المقررات بذكاء حاد.',
    personalityEn: 'Skips blind memorization; analyzes topics logically and breaks down heavy coursework efficiently.',
    emoji: '💻',
    pricePoints: 60,
    colorHex: '#7C3AED',
  },
  {
    id: 'char-doctor',
    name: 'طبيب المستقبل (Future Medic)',
    nameEn: 'Future Medic',
    titleArabic: 'تشخيص دقيق للمفاهيم المعقدة 🩺',
    titleEn: 'Precise diagnosis of complex concepts 🩺',
    personalityDescription: 'تركيز استثنائي وتحليل عميق لكل تفصيلة في المحاضرة ليضمن الدرجة الكاملة والتشخيص الصحيح.',
    personalityEn: 'Exceptional concentration and thorough analysis of lecture details for top accuracy.',
    emoji: '🩺',
    pricePoints: 90,
    colorHex: '#0284C7',
  },
  {
    id: 'char-engineer',
    name: 'المهندس المعماري (The Engineer)',
    nameEn: 'The Engineer',
    titleArabic: 'هندسة المعدل خطوة بخطوة 📐',
    titleEn: 'Engineering top grades step by step 📐',
    personalityDescription: 'يبني خطة مذاكرته بدقة متناهية، يحب حل المسائل المعقدة وتنظيم الأفكار في هياكل واضحة.',
    personalityEn: 'Builds structured study routines, excels at complex problems, and organizes concepts neatly.',
    emoji: '📐',
    pricePoints: 120,
    colorHex: '#EA580C',
  },
  {
    id: 'char-detective',
    name: 'المحقق الاستنتاجي (The Sleuth)',
    nameEn: 'The Sleuth',
    titleArabic: 'كشف إجابات الاختبارات الصعبة 🔍',
    titleEn: 'Uncovering solutions to hard exams 🔍',
    personalityDescription: 'يدقق بين السطور ولا تفوته خدع أسئلة الاختبارات، يربط النقاط ببعضها حتى يصل للحل الأكيد.',
    personalityEn: 'Reads between the lines, catches exam tricks, and connects the dots to solve every challenge.',
    emoji: '🔍',
    pricePoints: 150,
    colorHex: '#2563EB',
  },
];

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  focusPoints: number;
  onSpendPoints?: (amount: number) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  focusPoints,
  onSpendPoints,
}) => {
  const { isAr, dir } = useLanguage();

  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('attocus_unlocked_character_ids') || localStorage.getItem('attocus_unlocked_chars');
      const parsed: string[] = saved ? JSON.parse(saved) : ['char-chill'];
      return new Set([...parsed, 'char-chill']);
    } catch {
      return new Set(['char-chill']);
    }
  });

  const [selectedId, setSelectedId] = useState<string>(() => {
    const saved = localStorage.getItem('attocus_selected_character_id') || localStorage.getItem('attocus_selected_char');
    if (saved && STUDY_CHARACTERS.some(c => c.id === saved)) {
      return saved;
    }
    return 'char-chill';
  });

  const [points, setPoints] = useState(focusPoints);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAction = (char: StudyCharacter) => {
    const isUnlocked = unlockedIds.has(char.id);
    const isEquipped = selectedId === char.id;

    if (isEquipped) {
      return;
    }

    if (isUnlocked) {
      // Equip character
      setSelectedId(char.id);
      localStorage.setItem('attocus_selected_character_id', char.id);
      localStorage.setItem('attocus_selected_char', char.id);
      const charName = isAr ? char.name.split('(')[0].trim() : char.nameEn;
      showToast(
        isAr ? `✓ تم اختيار "${charName}" كشخصيتك الدراسية الأساسية!` : `✓ "${charName}" set as your active study avatar!`,
        'success'
      );
      return;
    }

    // Purchase character
    if (points < char.pricePoints) {
      showToast(
        isAr
          ? '❌ نقاط التركيز غير كافية، واصل المذاكرة لكسب المزيد من النقاط!'
          : '❌ Not enough focus points. Keep studying to earn more points!',
        'error'
      );
      return;
    }

    const newPoints = points - char.pricePoints;
    setPoints(newPoints);
    onSpendPoints?.(char.pricePoints);

    const newUnlocked = new Set(unlockedIds);
    newUnlocked.add(char.id);
    setUnlockedIds(newUnlocked);
    setSelectedId(char.id);

    localStorage.setItem('attocus_unlocked_character_ids', JSON.stringify([...newUnlocked]));
    localStorage.setItem('attocus_unlocked_chars', JSON.stringify([...newUnlocked]));
    localStorage.setItem('attocus_selected_character_id', char.id);
    localStorage.setItem('attocus_selected_char', char.id);

    const charName = isAr ? char.name.split('(')[0].trim() : char.nameEn;
    showToast(
      isAr ? `🎉 تهانينا! تم فتح شخصية "${charName}" بنجاح!` : `🎉 Awesome! Unlocked "${charName}" successfully!`,
      'success'
    );
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-slide-up max-h-[90vh] flex flex-col transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <span className="text-2xl">🛍️</span>
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isAr ? 'متجر شخصيات الطلاب' : 'Student Avatar Shop'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'اختر شخصيتك الدراسية لتظهر في ملفك ولأصدقائك في الجلسات'
                  : 'Choose your academic avatar for profile and study sessions'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-shop-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`mx-6 mt-3 px-4 py-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Balance Banner (Matches iOS regularBalanceBanner) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className={`flex items-center gap-3.5 ${isAr ? 'flex-row' : 'flex-row'}`}>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  {isAr ? 'رصيدك الحالي من نقاط التركيز' : 'Your Current Focus Points'}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                    {points}
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {isAr ? 'نقطة' : 'pts'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 text-xs font-medium self-start sm:self-auto">
              <Info className="w-4 h-4 shrink-0 text-blue-500" />
              <span>
                {isAr ? '+10 نقاط لكل جلسة بومودورو مكتملة' : '+10 pts per completed Pomodoro session'}
              </span>
            </div>
          </div>

          {/* Section Subtitle */}
          <div className={`px-1 ${isAr ? 'text-right' : 'text-left'}`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'شخصيات وأفاتار الطلاب المتاحة 🎓' : 'Available Student Avatars 🎓'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'استبدل نقاطك لفتح شخصيات جديدة وتخصيص هوية مذاكرتك الأكاديمية'
                : 'Redeem your points to unlock new identities for your study journey'}
            </p>
          </div>

          {/* Characters Cards Grid */}
          <div className="grid grid-cols-1 gap-4">
            {STUDY_CHARACTERS.map(char => {
              const isUnlocked = unlockedIds.has(char.id);
              const isEquipped = selectedId === char.id;
              const canAfford = points >= char.pricePoints;
              const displayName = isAr ? char.name : char.nameEn;
              const displayTitle = isAr ? char.titleArabic : char.titleEn;
              const displayDesc = isAr ? char.personalityDescription : char.personalityEn;

              return (
                <div
                  key={char.id}
                  id={`character-card-${char.id}`}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isEquipped
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-600/30'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isAr ? 'text-right' : 'text-left'}`}>
                    {/* Character Avatar & Info */}
                    <div className="flex items-start gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-sm relative ring-2 ring-white dark:ring-slate-900"
                        style={{ backgroundColor: `${char.colorHex}18` }}
                      >
                        <span>{char.emoji}</span>
                        {!isUnlocked && (
                          <div className="absolute inset-0 rounded-2xl bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
                            <Lock className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        )}
                        {isEquipped && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {displayName}
                          </h4>
                          {isUnlocked ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                              {isAr ? 'مملوكة' : 'Owned'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {char.pricePoints} {isAr ? 'نقطة' : 'pts'}
                            </span>
                          )}
                        </div>

                        <p
                          className="text-xs font-semibold"
                          style={{ color: char.colorHex }}
                        >
                          {displayTitle}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md pt-0.5">
                          {displayDesc}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="sm:self-center shrink-0">
                      {isEquipped ? (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-default border border-emerald-200 dark:border-emerald-800"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>{isAr ? 'الشخصية الحالية' : 'Active Avatar'}</span>
                        </button>
                      ) : isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleAction(char)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold text-xs transition-all active:scale-95 shadow-xs"
                        >
                          {isAr ? 'اختيار كأفاتار أساسي' : 'Set as Current Avatar'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAction(char)}
                          disabled={!canAfford}
                          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                            canAfford
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200/60 dark:border-slate-700'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {canAfford
                              ? isAr ? `فتح مقابل ${char.pricePoints} نقطة` : `Unlock for ${char.pricePoints} pts`
                              : isAr ? `تحتاج ${char.pricePoints} نقطة` : `Need ${char.pricePoints} pts`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PRO Perks Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className={isAr ? 'text-right' : 'text-left'}>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                {isAr ? 'ترقية العضوية الأكاديمية (PRO Member)' : 'Academic Membership (PRO Member)'}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                {isAr
                  ? 'احصل على جميع شخصيات الطلاب مجاناً + مضاعفة نقاط البومودورو وتجميد الستريك.'
                  : 'Unlock all student avatars for free + 2x Pomodoro points & Streak Freeze.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
