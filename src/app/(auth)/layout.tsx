import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthenticationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <ThemeToggle className="absolute top-5 right-5 z-20" showLabel />
      <section className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[var(--surface-deep)] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(79_140_255/0.17),transparent_38%),radial-gradient(circle_at_70%_80%,rgb(237_145_33/0.1),transparent_34%)]" />
        <Link className="relative flex items-center gap-3 font-black" href="/">
          <BrandLogo priority size={44} />
          Bot or Not
        </Link>
        <blockquote className="relative max-w-lg">
          <p className="text-3xl leading-tight font-black tracking-tight">
            “The strongest detector is a person who knows where to look.”
          </p>
          <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
            Practice across images, email, and voice. Each answer teaches a
            reusable signal.
          </p>
        </blockquote>
      </section>
      <section className="grid place-items-center px-5 pt-24 pb-12 sm:px-8 lg:py-12">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
