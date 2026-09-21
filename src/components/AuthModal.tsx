import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Loader2, GraduationCap } from 'lucide-react';
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
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
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
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 relative space-y-6 text-slate-900">

        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* رأس النافذة */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center mx-auto shadow-sm ring-1 ring-black/5">
            <GraduationCap className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">
            {mode === 'signin' ? 'تسجيل الدخول إلى Attocus' : 'إنشاء حساب جديد'}
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {mode === 'signin'
              ? 'سجّل الدخول لمزامنة تقدمك الأكاديمي، ملاحظاتك، ونقاط تركيزك'
              : 'ابدأ رحلة التعلم الذكية مع رفيق دراستك المدعوم بالذكاء الاصطناعي'}
          </p>
        </div>

        {/* زر الدخول بحساب Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all shadow-2xs hover:border-slate-300 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
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
          <span>المتابعة باستخدام Google</span>
        </button>

        {/* فاصل */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-200/80 flex-1" />
          <span className="text-[11px] font-medium text-slate-400">أو بالبريد الإلكتروني</span>
          <div className="h-px bg-slate-200/80 flex-1" />
        </div>

        {/* رسالة الخطأ إن وجدت */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">الاسم</label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="اسمك الكامل"
                  className="w-full pr-10 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 placeholder-slate-400 transition-all"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
                className="w-full pr-10 pl-3 py-2 text-xs text-left bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 placeholder-slate-400 transition-all"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full pr-10 pl-3 py-2 text-xs text-left bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 placeholder-slate-400 transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
                <span>جاري المعالجة...</span>
              </>
            ) : mode === 'signin' ? (
              'تسجيل الدخول'
            ) : (
              'إنشاء الحساب'
            )}
          </button>
        </form>

        {/* التبديل بين تسجيل الدخول وإنشاء حساب */}
        <div className="text-center text-xs text-slate-500 pt-1">
          {mode === 'signin' ? (
            <span>
              ليس لديك حساب بعد؟{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-blue-600 font-bold hover:underline cursor-pointer"
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
                className="text-blue-600 font-bold hover:underline cursor-pointer"
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