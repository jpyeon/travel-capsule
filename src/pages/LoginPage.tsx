import { useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../validation/login.schema';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/shared/Button';

const LoginPage: NextPage = () => {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();

  const [mode, setMode]           = useState<'login' | 'signup'>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  });

  // Redirect if already signed in
  if (!authLoading && userId) {
    void router.replace('/DashboardPage');
    return null;
  }

  async function onSubmit(data: LoginFormData) {
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
        if (authError) throw authError;
        // onAuthStateChange will update context → redirect happens above
      } else {
        const { error: authError } = await supabase.auth.signUp({ email: data.email, password: data.password });
        if (authError) throw authError;
        setSignupSuccess(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold text-center">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>

        {signupSuccess ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Check your email for a confirmation link, then sign in.
          </div>
        ) : (
          <form onSubmit={rhfHandleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input
                type="email"
                {...register('email')}
                className={`${INPUT_CLS_BASE} ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Password</label>
              <input
                type="password"
                {...register('password')}
                className={`${INPUT_CLS_BASE} ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="At least 6 characters"
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" loading={submitting} disabled={!isValid || submitting}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>

            <p className="text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="font-medium text-black hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); setSignupSuccess(false); }}
                    className="font-medium text-black hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </main>
  );
};

export default LoginPage;

const INPUT_CLS_BASE =
  'rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1';
