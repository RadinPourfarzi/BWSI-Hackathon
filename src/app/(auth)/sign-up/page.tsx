import type { Metadata } from "next";
import Link from "next/link";

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
        <span className="grid size-9 place-items-center rounded-xl bg-[var(--blue-strong)] text-xs">
          B/N
        </span>
        Bot or Not
      </Link>
      <p className="mt-10 text-sm font-bold tracking-[0.18em] text-[var(--pink)] uppercase lg:mt-0">
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
        <p className="mt-5 rounded-xl border border-[#a47627]/40 bg-[#a47627]/10 px-4 py-3 text-sm leading-6 text-[#e8c98f]">
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
