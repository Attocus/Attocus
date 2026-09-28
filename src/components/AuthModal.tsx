import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Loader2, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { t, isAr, dir } = useLanguage();
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
        setError(isAr ? 'تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.' : 'Sign-in window closed by user.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(isAr ? 'هذا النطاق غير مصرح به في إعدادات Firebase Auth.' : 'Unauthorized domain in Firebase Auth settings.');
      } else {
        setError(err.message || (isAr ? 'حدث خطأ أثناء تسجيل الدخول بحساب Google.' : 'Error signing in with Google.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError(isAr ? 'يرجى ملء جميع الحقول المطلوبة.' : 'Please fill all required fields.');
      return;
    }

    if (password.length < 6) {
      setError(isAr ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Password must be at least 6 characters.');
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
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError(isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Incorrect email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError(isAr ? 'البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول.' : 'Email already in use, please sign in.');
      } else if (err.code === 'auth/invalid-email') {
        setError(isAr ? 'صيغة البريد الإلكتروني غير صالحة.' : 'Invalid email format.');
      } else {
        setError(err.message || (isAr ? 'حدث خطأ أثناء العملية، يرجى المحاولة لاحقاً.' : 'An error occurred, please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative space-y-6 text-slate-900 dark:text-slate-100 transition-colors">

        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* رأس النافذة */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center mx-auto shadow-sm ring-1 ring-black/5 dark:ring-white/10 bg-[#0B0F19]">
            <img src="/assets/logos/logo_dark_square_cheetah.png" alt="Attocus" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-white">
            {mode === 'signin'
              ? (isAr ? 'تسجيل الدخول إلى Attocus' : 'Sign In to Attocus')
              : (isAr ? 'إنشاء حساب جديد' : 'Create New Account')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            {mode === 'signin'
              ? (isAr ? 'سجّل الدخول لمزامنة تقدمك الأكاديمي، ملاحظاتك، ونقاط تركيزك' : 'Sign in to sync your academic progress, notes, and focus points')
              : (isAr ? 'ابدأ رحلة التعلم الذكية مع رفيق دراستك المدعوم بالذكاء الاصطناعي' : 'Begin smart learning with your AI-powered study companion')}
          </p>
        </div>

        {/* زر الدخول بحساب Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
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
          <span>{isAr ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
        </button>

        {/* فاصل */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-200/80 dark:bg-slate-800 flex-1" />
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {isAr ? 'أو بالبريد الإلكتروني' : 'or with email'}
          </span>
          <div className="h-px bg-slate-200/80 dark:bg-slate-800 flex-1" />
        </div>

        {/* رسالة الخطأ إن وجدت */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {isAr ? 'الاسم' : 'Name'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isAr ? 'اسمك الكامل' : 'Your full name'}
                  className="w-full pr-10 pl-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              {isAr ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
                className="w-full pr-10 pl-3 py-2 text-xs text-left bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full pr-10 pl-3 py-2 text-xs text-left bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-300 dark:text-white" />
                <span>{isAr ? 'جاري المعالجة...' : 'Processing...'}</span>
              </>
            ) : mode === 'signin' ? (
              (isAr ? 'تسجيل الدخول' : 'Sign In')
            ) : (
              (isAr ? 'إنشاء الحساب' : 'Create Account')
            )}
          </button>
        </form>

        {/* التبديل بين تسجيل الدخول وإنشاء حساب */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
          {mode === 'signin' ? (
            <span>
              {isAr ? 'ليس لديك حساب بعد؟ ' : "Don't have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                {isAr ? 'إنشاء حساب جديد' : 'Create new account'}
              </button>
            </span>
          ) : (
            <span>
              {isAr ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};