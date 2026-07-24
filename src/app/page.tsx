import {
  ArrowRight,
  AudioLines,
  BrainCircuit,
  ImageIcon,
  MailWarning,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categoryConfig } from "@/config/categories";
import { uiConfig } from "@/config/ui";

const categoryIcons = {
  image: ImageIcon,
  email: MailWarning,
  voice: AudioLines,
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          className="flex items-center gap-3 font-black tracking-tight"
          href="/"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--blue-strong)] text-sm">
            B/N
          </span>
          <span className="hidden sm:inline">{uiConfig.appName}</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            className={buttonClassName({ size: "sm", variant: "ghost" })}
            href="/sign-in"
          >
            Sign in
          </Link>
          <Link className={buttonClassName({ size: "sm" })} href="/app/play">
            Play as guest
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:pt-24 lg:pb-28">
        <div className="animate-enter">
          <Badge className="border-[var(--blue)]/30 bg-[var(--blue)]/10 text-[#a9c5ff]">
            <Sparkles className="mr-1.5 size-3.5" />
            The GeoGuessr of AI detection
          </Badge>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[0.98] font-black tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Can you tell what is{" "}
            <span className="text-[var(--blue)]">real?</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Build fast, practical instincts for generated images, scam emails,
            and synthetic voices—one signal at a time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className={buttonClassName({ size: "lg" })} href="/app/play">
              Play your first round
              <ArrowRight className="size-5" />
            </Link>
            <a
              className={buttonClassName({ size: "lg", variant: "secondary" })}
              href="#how-it-works"
            >
              How it works
            </a>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-[var(--muted)]">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--success)]" />
              Real open data
            </span>
            <span className="flex items-center gap-2">
              <TimerReset className="size-4 text-[var(--success)]" />
              Instant feedback
            </span>
            <span className="flex items-center gap-2">
              <BrainCircuit className="size-4 text-[var(--success)]" />
              Explanations that teach
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:mx-0">
          <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[var(--blue)]/8 blur-3xl" />
          <Card className="overflow-hidden border-[#34425b] bg-[#0a0e16]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-[var(--pink)] uppercase">
                  Live challenge
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                  Inspect every detail
                </p>
              </div>
              <Badge>Images · Medium</Badge>
            </div>
            <div className="relative aspect-square">
              <Image
                alt="A retro roadside diner at blue hour."
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 92vw, 560px"
                src="/datasets/images/ai/diner.webp"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="rounded-xl border border-[var(--blue)]/50 bg-[var(--blue)]/12 py-4 text-center font-black text-[#b9ceff]">
                AI
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-white/4 py-4 text-center font-black">
                Real
              </div>
            </div>
          </Card>
          <div className="absolute -right-3 -bottom-5 rounded-xl border border-[var(--success)]/30 bg-[#0d1c19] px-4 py-3 shadow-2xl sm:-right-7">
            <p className="text-xs font-bold text-[var(--success)]">
              +1,174 points
            </p>
            <p className="mt-0.5 text-xs text-[#8ba49b]">Look at the signs.</p>
          </div>
        </div>
      </section>

      <section
        className="border-y border-[var(--border)] bg-[#080b12]/85"
        id="how-it-works"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-[0.18em] text-[var(--blue)] uppercase">
              Three threat surfaces
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              One fast decision loop.
            </h2>
            <p className="mt-4 leading-7 text-[var(--muted)]">
              Choose a side, get immediate feedback, then learn which signals
              mattered. Difficulty and scoring adapt without changing the core
              engine.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {Object.values(categoryConfig).map((category) => {
              const Icon = categoryIcons[category.id];

              return (
                <Card
                  className="transition-transform duration-200 hover:-translate-y-1"
                  key={category.id}
                >
                  <CardContent>
                    <span
                      className="grid size-11 place-items-center rounded-xl"
                      style={{ backgroundColor: `${category.accent}18` }}
                    >
                      <Icon
                        className="size-5"
                        style={{ color: category.accent }}
                      />
                    </span>
                    <h3 className="mt-5 text-xl font-black">{category.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {category.description}
                    </p>
                    <p className="mt-5 text-xs font-bold tracking-wide text-[#71809a] uppercase">
                      {category.optionA} vs {category.optionB}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Built for safer instincts online.</p>
        <p>Open data · Guest play available · Sign in to save progress</p>
      </footer>
    </main>
  );
}
