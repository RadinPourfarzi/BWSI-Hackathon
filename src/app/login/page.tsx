'use client';

import { Suspense, useActionState, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn, signUp, type AuthActionState } from '@/app/auth/actions';
import { AuthShell, Field } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const initialState: AuthActionState = { error: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin',
  );

  const action = mode === 'signin' ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);

  const tabClass = (active: boolean) =>
    cn(
      'flex-1 rounded-lg px-4 py-2 font-mono text-sm uppercase tracking-wide transition-colors',
      active ? 'bg-text text-ink-900' : 'text-muted hover:text-text',
    );

  return (
    <AuthShell
      title={mode === 'signin' ? 'Welcome back' : 'Create your account'}
      subtitle={
        mode === 'signin'
          ? 'Sign in to keep your XP, streak, and analytics.'
          : 'Save your progress across every run.'
      }
      footer={
        <span>
          Just exploring?{' '}
          <Link href="/" className="text-bot hover:text-bot-bright">
            Play as guest →
          </Link>
        </span>
      }
    >
      <div className="border-edge mb-5 flex gap-1 rounded-xl border p-1">
        <button
          type="button"
          className={tabClass(mode === 'signin')}
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={tabClass(mode === 'signup')}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="redirect" value={redirectTo} />

        {mode === 'signup' && (
          <Field label="Username" name="username" type="text" required autoComplete="username" />
        )}
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        />

        {mode === 'signin' && (
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-muted hover:text-text font-mono text-xs tracking-wide uppercase transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        )}

        {state.error && <p className="text-wrong text-sm">{state.error}</p>}

        <Button type="submit" disabled={pending} size="lg" className="mt-1 w-full">
          {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
