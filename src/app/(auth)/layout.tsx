import Link from "next/link";

export default function AuthenticationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[#090d15] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(79_140_255/0.17),transparent_38%),radial-gradient(circle_at_70%_80%,rgb(255_79_163/0.09),transparent_34%)]" />
        <Link className="relative flex items-center gap-3 font-black" href="/">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--blue-strong)] text-sm">
            B/N
          </span>
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
      <section className="grid place-items-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
