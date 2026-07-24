import type { Metadata } from "next";

import { PasswordForm } from "@/features/auth/password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="animate-enter">
      <p className="text-sm font-bold tracking-[0.18em] text-[var(--blue)] uppercase">
        Account recovery
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        Reset your password.
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Enter your account email. The reset link is short-lived and can only be
        used once.
      </p>
      <div className="mt-8">
        <PasswordForm mode="request" />
      </div>
    </div>
  );
}
