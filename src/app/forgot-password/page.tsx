'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, type ForgotPasswordState } from '@/app/auth/actions';
import { AuthShell, Field } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';

const initialState: ForgotPasswordState = { error: null, sent: false };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="If an account exists for that address, we've sent a link to reset your password. The link opens a page where you can choose a new one."
        footer={
          <Link href="/login" className="text-bot hover:text-bot-bright">
            Back to sign in
          </Link>
        }
      >
        <p className="text-muted text-sm leading-6">
          Didn&apos;t get it? Check spam, or wait a minute and try again.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a reset link."
      footer={
        <Link href="/login" className="text-bot hover:text-bot-bright">
          Back to sign in
        </Link>
      }
    >
      <form action={formAction} className="flex flex-col gap-3">
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        {state.error && <p className="text-wrong text-sm">{state.error}</p>}
        <Button type="submit" disabled={pending} size="lg" className="mt-1 w-full">
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  );
}
