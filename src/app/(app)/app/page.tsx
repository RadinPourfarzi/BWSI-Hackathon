import {
  ArrowRight,
  BrainCircuit,
  Flame,
  Gauge,
  Images,
  MailWarning,
  Mic2,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import { getShellProfile } from "@/services/profile";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sign-in?error=configuration");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const profile = await getShellProfile(user);

  return (
    <div className="animate-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="border-[#ff9b52]/25 bg-[#ff9b52]/8 text-[#ffc08c]">
            <Flame className="mr-1.5 size-3.5" />
            {profile.currentStreak} day streak
          </Badge>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Ready, {profile.displayName}?
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Make the call quickly. Study the explanation carefully.
          </p>
        </div>
        <Link className={buttonClassName({ size: "lg" })} href="/app/play">
          Start Arcade
          <ArrowRight className="size-5" />
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden border-[var(--blue)]/25 bg-[#0b1220]">
          <CardContent className="relative min-h-64 p-7 sm:p-9">
            <div className="absolute top-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_center,rgb(79_140_255/0.15),transparent_62%)]" />
            <div className="relative max-w-xl">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--blue)] uppercase">
                Daily mission
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight">
                Complete one mixed round.
              </h2>
              <p className="mt-3 leading-7 text-[var(--muted)]">
                Twelve challenges across images, email, and voice. Keep a combo
                alive for a larger score multiplier.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Badge>
                  <Images className="mr-1.5 size-3.5" />
                  Images
                </Badge>
                <Badge>
                  <MailWarning className="mr-1.5 size-3.5" />
                  Email
                </Badge>
                <Badge>
                  <Mic2 className="mr-1.5 size-3.5" />
                  Voice
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--pink)]/10">
                <BrainCircuit className="size-5 text-[var(--pink)]" />
              </span>
              <div>
                <p className="font-black">Training mode</p>
                <p className="text-xs text-[var(--muted)]">
                  Practice one signal at a time
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-6 text-[var(--muted)]">
              Choose a category and learn without score pressure. Every answer
              still contributes to your accuracy.
            </p>
            <Link
              className={buttonClassName({
                className: "mt-6 w-full",
                variant: "secondary",
              })}
              href="/app/training"
            >
              Open training
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Accuracy",
            value: `${profile.accuracy}%`,
            icon: Gauge,
            color: "text-[var(--success)]",
          },
          {
            label: "Games played",
            value: formatNumber(profile.gamesPlayed),
            icon: BrainCircuit,
            color: "text-[var(--blue)]",
          },
          {
            label: "Best score",
            value: formatNumber(profile.bestScore),
            icon: Trophy,
            color: "text-[#ffd166]",
          },
          {
            label: "Longest streak",
            value: `${profile.longestStreak} days`,
            icon: Flame,
            color: "text-[#ff9b52]",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <stat.icon className={`size-6 ${stat.color}`} />
              <div>
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
