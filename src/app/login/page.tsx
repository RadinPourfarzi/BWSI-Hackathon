'use client';

import { Suspense, useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, signUp, type AuthActionState } from '@/app/auth/actions';
import { Wordmark } from '@/components/Wordmark';

const initialState: AuthActionState = { error: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const action = mode === 'signin' ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg px-4 py-2 font-mono text-sm uppercase tracking-wide transition-colors ${
      active ? 'bg-text text-ink-900' : 'text-muted hover:text-text'
    }`;

  const field =
    'rounded-lg border border-edge bg-ink-800 px-3 py-2 text-text outline-none transition-colors focus:border-bot';

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <Wordmark className="text-3xl" />
        <p className="text-muted mt-2 text-sm">Sign in to keep your record.</p>
      </div>

      <div className="border-edge flex gap-1 rounded-xl border p-1">
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
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted font-mono text-xs tracking-wide uppercase">Username</span>
            <input name="username" type="text" required autoComplete="username" className={field} />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted font-mono text-xs tracking-wide uppercase">Email</span>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted font-mono text-xs tracking-wide uppercase">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className={field}
          />
        </label>

        {state.error && <p className="text-wrong text-sm">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="bg-text font-display text-ink-900 mt-1 rounded-xl px-5 py-3 font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
