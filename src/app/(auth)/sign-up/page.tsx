import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { AuthForm } from "@/features/auth/auth-form";
import { getPublicSupabaseConfig } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
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
      <p className="mt-10 text-sm font-bold tracking-[0.18em] text-[var(--orange-ink)] uppercase lg:mt-0">
        Create your profile
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        Train your detector.
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Create an account to save your attempts, explanations, XP, and streaks,
        or continue as a guest.
      </p>
      {!authConfigured ? (
        <p className="mt-5 rounded-xl border border-[var(--warning-border)]/40 bg-[var(--warning-surface)] px-4 py-3 text-sm leading-6 text-[var(--warning-foreground)]">
          Account creation needs a local <code>.env.local</code> file containing
          the two public Supabase values. Files named <code>env.download</code>{" "}
          are not loaded by Next.js. Guest play is available below.
        </p>
      ) : null}
      <div className="mt-8">
        <AuthForm mode="sign-up" nextPath={nextPath} />
      </div>
    </div>
  );
}
