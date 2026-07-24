"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button, buttonClassName } from "@/components/ui/button";
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
            className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-4 text-sm placeholder:text-[var(--placeholder)]"
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
          className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-4 text-sm placeholder:text-[var(--placeholder)]"
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
          className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-4 text-sm placeholder:text-[var(--placeholder)]"
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
            className="text-xs font-bold text-[var(--blue)] hover:text-[var(--foreground)]"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
      ) : null}

      {state.error ? (
        <p
          className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/8 px-4 py-3 text-sm leading-6 text-[var(--danger-foreground)]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p
          className="rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/8 px-4 py-3 text-sm leading-6 text-[var(--success-foreground)]"
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <Button className="w-full" disabled={pending} size="lg" type="submit">
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : null}
        {signingUp ? "Create account" : "Sign in"}
      </Button>

      <div className="relative py-1 text-center">
        <span className="relative z-10 bg-[var(--background)] px-3 text-xs font-bold tracking-wider text-[var(--muted)] uppercase">
          or
        </span>
        <span className="absolute top-1/2 right-0 left-0 border-t border-[var(--border)]" />
      </div>

      <Link
        className={buttonClassName({
          className: "w-full",
          size: "lg",
          variant: "secondary",
        })}
        href="/app/play"
      >
        Continue as guest
      </Link>
      <p className="-mt-2 text-center text-xs leading-5 text-[var(--muted)]">
        No account needed. Guest progress is not saved.
      </p>

      <p className="text-center text-sm text-[var(--muted)]">
        {signingUp ? "Already have an account?" : "New to the game?"}{" "}
        <Link
          className="font-bold text-[var(--blue)] hover:text-[var(--foreground)]"
          href={`${signingUp ? "/sign-in" : "/sign-up"}?next=${encodeURIComponent(nextPath)}`}
        >
          {signingUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
