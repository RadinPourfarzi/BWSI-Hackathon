"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { signIn, signUp, type AuthActionState } from "@/features/auth/actions";

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

export function AuthForm({
  mode,
  nextPath,
}: {
  mode: "sign-in" | "sign-up";
  nextPath: string;
}) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);
  const signingUp = mode === "sign-up";

  return (
    <form action={formAction} className="space-y-4">
      <input name="next" type="hidden" value={nextPath} />

      {signingUp ? (
        <div>
          <label className="text-sm font-bold" htmlFor="displayName">
            Display name
          </label>
          <input
            aria-describedby="displayName-error"
            autoComplete="name"
            className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[#090d15] px-4 text-sm placeholder:text-[#59657a]"
            id="displayName"
            name="displayName"
            placeholder="How players will see you"
            required
          />
          <FieldError
            errors={state.fieldErrors?.displayName}
            id="displayName-error"
          />
        </div>
      ) : null}

      <div>
        <label className="text-sm font-bold" htmlFor="email">
          Email
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

      <div>
        <label className="text-sm font-bold" htmlFor="password">
          Password
        </label>
        <input
          aria-describedby="password-error"
          autoComplete={signingUp ? "new-password" : "current-password"}
          className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[#090d15] px-4 text-sm placeholder:text-[#59657a]"
          id="password"
          minLength={signingUp ? 8 : 1}
          name="password"
          placeholder={
            signingUp ? "At least 8 characters" : "Enter your password"
          }
          required
          type="password"
        />
        <FieldError errors={state.fieldErrors?.password} id="password-error" />
      </div>

      {!signingUp ? (
        <div className="-mt-1 text-right">
          <Link
            className="text-xs font-bold text-[var(--blue)] hover:text-white"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
      ) : null}

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
        {signingUp ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-[var(--muted)]">
        {signingUp ? "Already have an account?" : "New to the game?"}{" "}
        <Link
          className="font-bold text-[var(--blue)] hover:text-white"
          href={`${signingUp ? "/sign-in" : "/sign-up"}?next=${encodeURIComponent(nextPath)}`}
        >
          {signingUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
