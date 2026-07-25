import Link from 'next/link';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wordmark } from '@/components/Wordmark';
import { ThemeToggle } from '@/components/ThemeToggle';

/** Centered card layout shared by the auth screens (login, forgot, reset). */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block">
          <Wordmark className="text-2xl" />
        </Link>
      </div>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted mt-2 text-sm leading-6">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </CardContent>
      </Card>
      {footer && <div className="text-muted mt-5 text-center text-sm">{footer}</div>}
    </div>
  );
}

/** Labelled text input styled to the palette. */
export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted font-mono text-xs tracking-wide uppercase">{label}</span>
      <input
        {...props}
        className="border-edge bg-ink-800 text-text focus:border-bot rounded-lg border px-3 py-2 outline-none transition-colors"
      />
    </label>
  );
}
