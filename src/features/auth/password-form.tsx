"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  requestPasswordReset,
  updatePassword,
  type AuthActionState,
} from "@/features/auth/actions";

const initialState: AuthActionState = {};

function FieldError({
  errors,
  id,
}: {
  errors: string[] | undefined;
  id: string;
}) {
  if (!errors?.[0]) return null;

  return (
    <p className="mt-2 text-xs text-[var(--danger)]" id={id}>
      {errors[0]}
    </p>
  );
}

export function PasswordForm({ mode }: { mode: "request" | "update" }) {
  const action = mode === "request" ? requestPasswordReset : updatePassword;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "request" ? (
        <div>
          <label className="text-sm font-bold" htmlFor="email">
            Account email
          </label>
          <input
            aria-describedby="email-error"
            autoComplete="email"
            className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[#090d15] px-4 text-sm placeholder:text-[#59657a]"
            id="email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
          <FieldError errors={state.fieldErrors?.email} id="email-error" />
        </div>
      ) : (
        <>
          <div>
            <label className="text-sm font-bold" htmlFor="password">
              New password
            </label>
            <input
              aria-describedby="password-error"
              autoComplete="new-password"
              className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[#090d15] px-4 text-sm placeholder:text-[#59657a]"
              id="password"
              minLength={8}
              name="password"
              placeholder="At least 8 characters"
              required
              type="password"
            />
            <FieldError
              errors={state.fieldErrors?.password}
              id="password-error"
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              aria-describedby="confirmPassword-error"
              autoComplete="new-password"
              className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[#090d15] px-4 text-sm placeholder:text-[#59657a]"
              id="confirmPassword"
              minLength={8}
              name="confirmPassword"
              placeholder="Repeat your new password"
              required
              type="password"
            />
            <FieldError
              errors={state.fieldErrors?.confirmPassword}
              id="confirmPassword-error"
            />
          </div>
        </>
      )}

      {state.error ? (
        <p
          className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/8 px-4 py-3 text-sm leading-6 text-[#efb4b7]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p
          className="rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/8 px-4 py-3 text-sm leading-6 text-[#a8ead3]"
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <Button className="w-full" disabled={pending} size="lg" type="submit">
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : null}
        {mode === "request" ? "Send reset link" : "Update password"}
      </Button>

      <p className="text-center text-sm text-[var(--muted)]">
        <Link
          className="font-bold text-[var(--blue)] hover:text-white"
          href="/sign-in"
        >
          Return to sign in
        </Link>
      </p>
    </form>
  );
}
