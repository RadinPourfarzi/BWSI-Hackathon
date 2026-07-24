import type { Metadata } from "next";
import { BarChart3, Gauge, Target, Trophy } from "lucide-react";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AccuracyChart } from "@/features/analytics/accuracy-chart";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import { getShellProfile } from "@/services/profile";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sign-in?error=configuration");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const profile = await getShellProfile(user);

  return (
    <div className="animate-enter">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--blue)] uppercase">
        Analytics
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Your signal map
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        See where your instincts are strong and where focused training can help.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Overall accuracy",
            value: `${profile.accuracy}%`,
            icon: Gauge,
          },
          {
            label: "Completed games",
            value: formatNumber(profile.gamesPlayed),
            icon: Target,
          },
          {
            label: "Best score",
            value: formatNumber(profile.bestScore),
            icon: Trophy,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--blue)]/10">
                <stat.icon className="size-5 text-[var(--blue)]" />
              </span>
              <div>
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="text-xs font-semibold text-[var(--muted)]">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-5">
        <CardHeader className="flex flex-row items-center gap-3">
          <BarChart3 className="size-5 text-[var(--pink)]" />
          <div>
            <h2 className="font-black">Accuracy by category</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Updates as new attempts are saved
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <AccuracyChart categoryAccuracy={profile.categoryAccuracy} />
        </CardContent>
      </Card>
    </div>
  );
}
