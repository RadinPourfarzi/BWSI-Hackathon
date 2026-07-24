import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/features/auth/auth-form";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const parameters = await searchParams;
  const nextPath = safeNextPath(parameters.next);

  return (
    <div className="animate-enter">
      <Link
        className="inline-flex items-center gap-2 font-black lg:hidden"
        href="/"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-[var(--blue-strong)] text-xs">
          B/N
        </span>
        Bot or Not
      </Link>
      <p className="mt-10 text-sm font-bold tracking-[0.18em] text-[var(--blue)] uppercase lg:mt-0">
        Welcome back
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        Continue your streak.
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Sign in to play and keep your accuracy, XP, and streak history.
      </p>
      {parameters.error === "configuration" ? (
        <p className="mt-5 rounded-xl border border-[#a47627]/40 bg-[#a47627]/10 px-4 py-3 text-sm leading-6 text-[#e8c98f]">
          Supabase is not configured yet. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code> and add your project values.
        </p>
      ) : null}
      {parameters.error === "callback" ? (
        <p className="mt-5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/8 px-4 py-3 text-sm text-[#efb4b7]">
          The confirmation link could not be completed. Request a new link or
          try signing in.
        </p>
      ) : null}
      {parameters.message === "password-updated" ? (
        <p
          className="mt-5 rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/8 px-4 py-3 text-sm text-[#a8ead3]"
          role="status"
        >
          Your password was updated. Sign in with the new password.
        </p>
      ) : null}
      <div className="mt-8">
        <AuthForm mode="sign-in" nextPath={nextPath} />
      </div>
    </div>
  );
}
