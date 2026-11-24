import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { HERO_COAST_IMAGE } from '../data/destinationsSeed';
import { ImageWithFallback } from '../components/Common/ImageWithFallback';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthFormValues {
  name?: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

export const AuthPage: React.FC<{ mode: AuthMode }> = ({ mode }) => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, sendResetEmail } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormValues>();

  const passwordVal = watch('password');

  const formatFirebaseAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is not yet enabled in your Firebase Console (Authentication -> Sign-in method -> Email/Password). You can sign in immediately with Google below.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in popup was closed before completing authentication.';
    }
    return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (data: AuthFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(data.email, data.password || '');
        navigate('/dashboard');
      } else if (mode === 'register') {
        await registerWithEmail(data.name || 'Traveler', data.email, data.password || '');
        navigate('/dashboard');
      } else {
        await sendResetEmail(data.email);
        setSuccessMsg('Password reset instructions have been sent to your email address.');
      }
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:col-span-5 relative bg-[#0B1D33] text-white flex-col justify-between p-10 overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={HERO_COAST_IMAGE}
            alt="TripMate scenic coast"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1D33] via-[#0B1D33]/70 to-[#0B1D33]/50" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight text-white">
            TripMate
          </Link>
        </div>

        <div className="relative z-10 space-y-4">
          <p className="text-xs font-medium text-[#5EEAD4]">
            Plan Smarter. Pack Better. Travel Happier.
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight">
            All your itineraries, packing checklists, budgets, and documents in one calm workspace.
          </h2>
          <p className="text-sm text-slate-300">
            Synced across devices with Cloud Firestore and protected by Firebase Authentication.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="lg:col-span-7 flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="max-w-md w-full mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to TripMate Home
          </Link>

          <h1 className="font-display text-2xl font-bold text-[#0B1D33] mb-1.5">
            {mode === 'login' && 'Sign in to TripMate'}
            {mode === 'register' && 'Create your TripMate account'}
            {mode === 'forgot' && 'Reset your password'}
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            {mode === 'login' && 'Access your saved trips, checklists, and budgets.'}
            {mode === 'register' && 'Start planning smarter journeys in under a minute.'}
            {mode === 'forgot' && 'Enter your email address and we will send a password reset link.'}
          </p>

          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-800 transition-colors disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#F8FAFC] px-3 text-slate-500">or with email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    {...register('name', { required: 'Full name is required', minLength: 2 })}
                    placeholder="Anika Rahman"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 focus:border-[#0D7377]"
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                  })}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 focus:border-[#0D7377]"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">Password</label>
                  {mode === 'login' && (
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-[#0D7377] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' },
                    })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 focus:border-[#0D7377]"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (v) => v === passwordVal || 'Passwords do not match',
                    })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 focus:border-[#0D7377]"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                ? 'Create Account'
                : 'Send Reset Link'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            {mode === 'login' && (
              <>
                New to TripMate?{' '}
                <Link to="/register" className="font-medium text-[#0D7377] hover:underline">
                  Create an account
                </Link>
              </>
            )}
            {mode === 'register' && (
              <>
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-[#0D7377] hover:underline">
                  Sign in
                </Link>
              </>
            )}
            {mode === 'forgot' && (
              <>
                Remembered your password?{' '}
                <Link to="/login" className="font-medium text-[#0D7377] hover:underline">
                  Back to Sign In
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
