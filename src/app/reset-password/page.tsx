'use client';

import { useActionState } from 'react';
import { updatePassword, type AuthActionState } from '@/app/auth/actions';
import { AuthShell, Field } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';

const initialState: AuthActionState = { error: null };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Enter a new password for your account. You'll be signed in afterward."
    >
      <form action={formAction} className="flex flex-col gap-3">
        <Field
          label="New password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
        />
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
        />
        {state.error && <p className="text-wrong text-sm">{state.error}</p>}
        <Button type="submit" disabled={pending} size="lg" className="mt-1 w-full">
          {pending ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  );
}
