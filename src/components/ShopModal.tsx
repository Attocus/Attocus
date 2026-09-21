import React, { useState } from 'react';
import { X, Lock, Check, Sparkles, Crown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface StudyCharacter {
  id: string;
  name: string;
  titleArabic: string;
  personalityDescription: string;
  emoji: string;
  pricePoints: number;
  colorHex: string;
}

const CHARACTERS: StudyCharacter[] = [
  {
    id: 'char-mentalist',
    name: 'باتريك جين (The Mentalist)',
    titleArabic: 'خبير قراءة ما بين السطور ☕️',
    personalityDescription: 'لا تحفظ بدون فهم.. كل شريحة تحتوي تفاصيل دقيقة تكشف جوهر الموضوع بسهولة وهدوء.',
    emoji: '☕️',
    pricePoints: 0,
    colorHex: '#0D9488',
  },
  {
    id: 'char-conan',
    name: 'المحقق كونان',
    titleArabic: 'ماهر أصعب المسائل والاختبارات 🔍',
    personalityDescription: 'الحقيقة دائماً واحدة! يحلل كل سؤال بمنطق استنتاجي صارم حتى تصل للحل الصحيح.',
    emoji: '🔍',
    pricePoints: 50,
    colorHex: '#2563EB',
  },
  {
    id: 'char-professor',
    name: 'البروفيسور',
    titleArabic: 'العقل المدبر لخطة الدرجة الكاملة ♟️',
    personalityDescription: 'التفوق الأكاديمي ليس صدفة، بل خطة محكمة لكل دقيقة في جلسة المذاكرة.',
    emoji: '♟️',
    pricePoints: 100,
    colorHex: '#DC2626',
  },
  {
    id: 'char-chill',
    name: 'الطالب المروّق',
    titleArabic: 'سفير الهدوء والإنجاز العالي 🎧',
    personalityDescription: 'مذاكرة بدون توتر وقلق، يركز على الفهم العميق وبأعلى درجات الاستيعاب.',
    emoji: '🎧',
    pricePoints: 120,
    colorHex: '#10B981',
  },
  {
    id: 'char-cyber',
    name: 'الهاكر الأكاديمي',
    titleArabic: 'تفكيك شفرات المواد المعقدة 💻',
    personalityDescription: 'يفكك المفاهيم الصعبة بمنطق هندسي سريع ويختصر الشرح بأسلوب تقني ذكي.',
    emoji: '💻',
    pricePoints: 150,
    colorHex: '#7C3AED',
  },
  {
    id: 'char-capybara',
    name: 'الكابيبارا العبقري',
    titleArabic: 'راحة البال + تركيز عالٍ = تفوق 🦦',
    personalityDescription: 'يُثبت أن الهدوء أقوى أسلحة المتفوقين، مذاكرة بلا ضغط ونتائج باهرة.',
    emoji: '🦦',
    pricePoints: 200,
    colorHex: '#92400E',
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
      const saved = localStorage.getItem('attocus_unlocked_chars');
      return new Set(saved ? JSON.parse(saved) : ['char-mentalist']);
    } catch { return new Set(['char-mentalist']); }
  });
  const [selectedId, setSelectedId] = useState<string>(() => {
    return localStorage.getItem('attocus_selected_char') || 'char-mentalist';
  });
  const [points, setPoints] = useState(focusPoints);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedChar, setSelectedChar] = useState<StudyCharacter | null>(null);

  if (!isOpen) return null;

  const handlePurchase = (char: StudyCharacter) => {
    if (unlockedIds.has(char.id)) {
      // Just equip
      setSelectedId(char.id);
      localStorage.setItem('attocus_selected_char', char.id);
      setNotification(`${char.emoji} ${isAr ? 'تم تجهيز' : 'Equipped'} ${char.name.split('(')[0].trim()}!`);
      setTimeout(() => setNotification(null), 2500);
      return;
    }
    if (points < char.pricePoints) {
      setNotification(isAr ? '❌ نقاطك غير كافية لشراء هذا الرفيق' : '❌ Not enough points to unlock this companion');
      setTimeout(() => setNotification(null), 2500);
      return;
    }
    const newPoints = points - char.pricePoints;
    setPoints(newPoints);
    onSpendPoints?.(char.pricePoints);
    const newUnlocked = new Set(unlockedIds);
    newUnlocked.add(char.id);
    setUnlockedIds(newUnlocked);
    setSelectedId(char.id);
    localStorage.setItem('attocus_unlocked_chars', JSON.stringify([...newUnlocked]));
    localStorage.setItem('attocus_selected_char', char.id);
    setNotification(`🎉 ${isAr ? 'تم فتح' : 'Unlocked'} ${char.name.split('(')[0].trim()}!`);
    setTimeout(() => setNotification(null), 2500);
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#F7F8F6] dark:bg-[#111827] text-slate-900 dark:text-slate-100 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-slide-up max-h-[90vh] flex flex-col transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#D1D5DB] dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-br from-[#F3EEFF] to-[#EDE9FE] dark:from-purple-950/40 dark:to-indigo-950/30 border-b border-[#E9D5FF] dark:border-purple-900/40">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/60 dark:bg-black/40 text-[#6B7280] dark:text-slate-300 hover:bg-white/90 dark:hover:bg-black/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center shadow-lg shadow-purple-400/30">
              <span className="text-2xl">🎭</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1A1D20] dark:text-white">
                {isAr ? 'متجر الرفقاء' : 'Companions Store'}
              </h2>
              <p className="text-xs text-[#7C3AED] dark:text-purple-300 font-medium">
                {isAr ? 'اختر رفيق المذاكرة الأمثل' : 'Choose your optimal study companion'}
              </p>
            </div>
          </div>

          {/* Points balance */}
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-800/80 w-fit border border-white/40 dark:border-slate-700">
            <Sparkles className="w-4 h-4 text-[#2E7D32] dark:text-emerald-400" />
            <span className="text-sm font-bold text-[#1A1D20] dark:text-white">{points}</span>
            <span className="text-xs text-[#6B7280] dark:text-slate-400">
              {isAr ? 'نقطة تركيز' : 'Focus Points'}
            </span>
          </div>
        </div>

        {/* Notification toast */}
        {notification && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-sm font-medium text-[#1A1D20] dark:text-white text-center shadow-sm animate-slide-down">
            {notification}
          </div>
        )}

        {/* Character detail panel */}
        {selectedChar && (
          <div className="mx-6 mt-3 p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-[#E5E7EB] dark:border-slate-700 shadow-sm animate-slide-down">
            <div className="flex items-start gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ backgroundColor: selectedChar.colorHex + '20' }}
              >
                {selectedChar.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#1A1D20] dark:text-white truncate">{selectedChar.name}</div>
                <div className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">{selectedChar.titleArabic}</div>
                <p className="text-[11px] text-[#4B5563] dark:text-slate-300 mt-1.5 leading-relaxed">{selectedChar.personalityDescription}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handlePurchase(selectedChar)}
              className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: unlockedIds.has(selectedChar.id)
                  ? (selectedId === selectedChar.id ? '#2E7D32' : selectedChar.colorHex)
                  : selectedChar.colorHex,
                color: 'white',
              }}
            >
              {unlockedIds.has(selectedChar.id)
                ? selectedId === selectedChar.id
                  ? (isAr ? '✓ مُجهّز حالياً' : '✓ Equipped')
                  : (isAr ? 'تجهيز' : 'Equip')
                : (isAr ? `فتح مقابل ${selectedChar.pricePoints} نقطة` : `Unlock for ${selectedChar.pricePoints} pts`)}
            </button>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CHARACTERS.map(char => {
              const isUnlocked = unlockedIds.has(char.id);
              const isEquipped = selectedId === char.id;
              const isSelected = selectedChar?.id === char.id;
              const canAfford = points >= char.pricePoints;

              return (
                <button
                  key={char.id}
                  type="button"
                  id={`shop-char-${char.id}`}
                  onClick={() => setSelectedChar(isSelected ? null : char)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-start ${
                    isSelected
                      ? 'border-[#7C3AED] dark:border-purple-500 bg-white dark:bg-slate-800 shadow-md shadow-purple-200/50'
                      : isEquipped
                      ? 'border-[#2E7D32]/60 bg-[#EBF3EA] dark:bg-emerald-950/30'
                      : 'border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-[#D1D5DB] dark:hover:border-slate-700 hover:shadow-sm'
                  }`}
                >
                  {/* Equipped badge */}
                  {isEquipped && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {/* Free badge */}
                  {char.pricePoints === 0 && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#EBF3EA] dark:bg-emerald-950/60 text-[10px] font-bold text-[#2E7D32] dark:text-emerald-400">
                      {isAr ? 'مجاني' : 'Free'}
                    </div>
                  )}

                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl relative"
                    style={{ backgroundColor: char.colorHex + '20' }}
                  >
                    {char.emoji}
                    {!isUnlocked && (
                      <div className="absolute inset-0 rounded-2xl bg-black/20 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="text-center w-full">
                    <div className="text-xs font-bold text-[#1A1D20] dark:text-slate-100 leading-tight truncate w-full">
                      {char.name.split('(')[0].trim()}
                    </div>
                    {char.pricePoints > 0 && !isUnlocked ? (
                      <div className={`mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold ${canAfford ? 'text-[#2E7D32] dark:text-emerald-400' : 'text-[#9CA3AF] dark:text-slate-500'}`}>
                        <Sparkles className="w-2.5 h-2.5" />
                        {char.pricePoints}
                      </div>
                    ) : isUnlocked ? (
                      <div className="mt-1 text-[11px] text-[#6B7280] dark:text-slate-400">
                        {isEquipped ? (isAr ? 'مُجهّز ✓' : 'Equipped ✓') : (isAr ? 'مفتوح' : 'Unlocked')}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PRO upsell footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#FFF8E1] to-[#FFF3E0] dark:from-amber-950/40 dark:to-orange-950/30 border border-[#FFD54F]/40 dark:border-amber-900/50">
            <Crown className="w-5 h-5 text-[#F57C00] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#E65100] dark:text-amber-400">
                {isAr ? 'اشترك في PRO' : 'Subscribe to PRO'}
              </p>
              <p className="text-[11px] text-[#F57C00] dark:text-amber-300 leading-snug">
                {isAr ? 'احصل على جميع الرفقاء + تجميد الستريك + نقاط مضاعفة' : 'Get all companions + Streak Freeze + Double points'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
