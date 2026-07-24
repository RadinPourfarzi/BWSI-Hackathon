import type { Metadata } from "next";

import { PasswordForm } from "@/features/auth/password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
};

export default function ResetPasswordPage() {
  return (
    <div className="animate-enter">
      <p className="text-sm font-bold tracking-[0.18em] text-[var(--orange-ink)] uppercase">
        Secure reset
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        Choose a new password.
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Use at least eight characters and avoid reusing a password from another
        account.
      </p>
      <div className="mt-8">
        <PasswordForm mode="update" />
      </div>
    </div>
  );
}
