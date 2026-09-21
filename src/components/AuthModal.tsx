import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('[AuthModal] Google Sign In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('هذا النطاق غير مصرح به في إعدادات Firebase Auth.');
      } else {
        setError(err.message || 'حدث خطأ أثناء تسجيل الدخول بحساب Google.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, displayName.trim() || undefined);
      }
      onClose();
    } catch (err: any) {
      console.error('[AuthModal] Email Auth Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول.');
      } else if (err.code === 'auth/invalid-email') {
        setError('صيغة البريد الإلكتروني غير صالحة.');
      } else {
        setError(err.message || 'حدث خطأ أثناء العملية، يرجى المحاولة لاحقاً.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1D22] rounded-3xl border border-[#DFE2D9] dark:border-[#2E3339] shadow-2xl p-6 sm:p-8 relative space-y-6 text-[#181A1C] dark:text-[#F1F3F5]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F4F5F0] dark:bg-[#252930] hover:bg-[#EAECE4] dark:hover:bg-[#31363F] text-[#60656A] dark:text-[#9AA0A6] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2E7D32] dark:bg-[#1B5E20] text-white flex items-center justify-center font-serif font-bold text-xl mx-auto shadow-sm">
            🎓
          </div>
          <h2 className="text-xl font-serif font-bold text-[#181A1C] dark:text-[#F1F3F5]">
            {mode === 'signin' ? 'مرحباً بك في Attocus' : 'إنشاء حساب جديد'}
          </h2>
          <p className="text-xs text-[#6E757C] dark:text-[#9AA0A6]">
            {mode === 'signin'
              ? 'سجّل الدخول لمزامنة جلسات دراستك ونقاط تركيزك سحابياً'
              : 'انضم لـ Attocus واحصل على مساعدك الدراسي الذكي'}
          </p>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-xl border border-[#D5D8CF] dark:border-[#2E3339] bg-white dark:bg-[#22262C] hover:bg-[#FAFBF8] dark:hover:bg-[#2A2E35] text-[#2D3135] dark:text-[#F1F3F5] text-sm font-medium flex items-center justify-center gap-3 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>المتابعة عبر حساب Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-[#E4E6DF] dark:bg-[#2E3339] flex-1" />
          <span className="text-[11px] font-medium text-[#888E95] dark:text-[#9AA0A6]">أو بالبريد الإلكتروني</span>
          <div className="h-px bg-[#E4E6DF] dark:bg-[#2E3339] flex-1" />
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#404448] dark:text-[#CBD5E1] block">الاسم (اختياري)</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#8C9299] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="اسم الطالب"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAFBF8] dark:bg-[#22262C] border border-[#D7DAD1] dark:border-[#2E3339] rounded-xl focus:outline-none focus:border-[#2E7D32] dark:focus:border-[#4ADE80] focus:ring-1 focus:ring-[#2E7D32] text-[#1E2124] dark:text-[#F1F3F5]"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#404448] dark:text-[#CBD5E1] block">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8C9299] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAFBF8] dark:bg-[#22262C] border border-[#D7DAD1] dark:border-[#2E3339] rounded-xl focus:outline-none focus:border-[#2E7D32] dark:focus:border-[#4ADE80] focus:ring-1 focus:ring-[#2E7D32] text-[#1E2124] dark:text-[#F1F3F5]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#404448] dark:text-[#CBD5E1] block">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C9299] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAFBF8] dark:bg-[#22262C] border border-[#D7DAD1] dark:border-[#2E3339] rounded-xl focus:outline-none focus:border-[#2E7D32] dark:focus:border-[#4ADE80] focus:ring-1 focus:ring-[#2E7D32] text-[#1E2124] dark:text-[#F1F3F5]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#256628] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : mode === 'signin' ? (
              'تسجيل الدخول'
            ) : (
              'إنشاء الحساب'
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center text-xs text-[#6B7177] dark:text-[#9AA0A6] pt-1">
          {mode === 'signin' ? (
            <span>
              ليس لديك حساب؟{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-[#2E7D32] dark:text-[#4ADE80] font-semibold hover:underline cursor-pointer"
              >
                إنشاء حساب جديد
              </button>
            </span>
          ) : (
            <span>
              لديك حساب بالفعل؟{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="text-[#2E7D32] dark:text-[#4ADE80] font-semibold hover:underline cursor-pointer"
              >
                تسجيل الدخول
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
