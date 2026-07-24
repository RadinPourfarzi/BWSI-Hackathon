import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { AuthForm } from "@/features/auth/auth-form";
import { getPublicSupabaseConfig } from "@/lib/env";
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
  const authConfigured = Boolean(getPublicSupabaseConfig());

  return (
    <div className="animate-enter">
      <Link
        className="inline-flex items-center gap-2 font-black lg:hidden"
        href="/"
      >
        <BrandLogo priority size={40} />
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
      {!authConfigured || parameters.error === "configuration" ? (
        <p className="mt-5 rounded-xl border border-[var(--warning-border)]/40 bg-[var(--warning-surface)] px-4 py-3 text-sm leading-6 text-[var(--warning-foreground)]">
          Account login needs a local <code>.env.local</code> file containing
          the two public Supabase values. Files named <code>env.download</code>{" "}
          are not loaded by Next.js. Guest play is available below.
        </p>
      ) : null}
      {parameters.error === "callback" ? (
        <p className="mt-5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/8 px-4 py-3 text-sm text-[var(--danger-foreground)]">
          The confirmation link could not be completed. Request a new link or
          try signing in.
        </p>
      ) : null}
      {parameters.message === "password-updated" ? (
        <p
          className="mt-5 rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/8 px-4 py-3 text-sm text-[var(--success-foreground)]"
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
