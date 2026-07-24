import type { Metadata } from "next";
import {
  AudioLines,
  BarChart3,
  BrainCircuit,
  Clock3,
  Flame,
  Gauge,
  Gamepad2,
  Images,
  MailWarning,
  Medal,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { categoryConfig, type CategoryId } from "@/config/categories";
import { AccuracyChart } from "@/features/analytics/accuracy-chart";
import { TrendCharts } from "@/features/analytics/trend-charts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import { getPlayerAnalytics } from "@/services/analytics";

export const metadata: Metadata = {
  title: "Analytics",
};

function categoryName(category: CategoryId | null): string {
  return category ? categoryConfig[category].shortName : "Play to discover";
}

function responseTime(milliseconds: number): string {
  return milliseconds === 0 ? "—" : `${(milliseconds / 1_000).toFixed(1)}s`;
}

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sign-in?error=configuration");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const analytics = await getPlayerAnalytics();
  const stats = [
    ["Overall accuracy", `${analytics.overallAccuracy}%`, Gauge],
    [
      "Questions answered",
      formatNumber(analytics.totalQuestionsAnswered),
      Target,
    ],
    [
      "Highest Arcade score",
      formatNumber(analytics.highestArcadeScore),
      Trophy,
    ],
    ["Longest combo", formatNumber(analytics.longestCombo), Sparkles],
    ["Average response", responseTime(analytics.averageResponseMs), Clock3],
    ["Current level", formatNumber(analytics.currentLevel), Medal],
    ["Total XP", formatNumber(analytics.totalXp), BrainCircuit],
    ["Total games", formatNumber(analytics.totalGamesPlayed), BarChart3],
    ["Arcade games", formatNumber(analytics.arcadeGamesPlayed), Gamepad2],
    [
      "Training games",
      formatNumber(analytics.trainingGamesPlayed),
      BrainCircuit,
    ],
    [
      "Average Arcade score",
      formatNumber(analytics.averageArcadeScore),
      Trophy,
    ],
    ["Current daily streak", `${analytics.currentDailyStreak} days`, Flame],
    ["Longest daily streak", `${analytics.longestDailyStreak} days`, Flame],
  ] as const;
  const insights: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
  }> = [
    {
      label: "Strongest",
      value: categoryName(analytics.strongestCategory),
      icon: Images,
    },
    {
      label: "Most difficult",
      value: categoryName(analytics.mostDifficultCategory),
      icon: MailWarning,
    },
    {
      label: "Most played",
      value: categoryName(analytics.mostPlayedCategory),
      icon: AudioLines,
    },
  ];

  return (
    <div className="animate-enter">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--blue)] uppercase">
        Analytics
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Your detection record
      </h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        Every figure comes from completed, persisted sessions. Trend history is
        bounded to the latest 120 games for responsive loading.
      </p>

      {!analytics.available ? (
        <div
          className="mt-6 rounded-xl border border-[var(--warning-border)]/40 bg-[var(--warning-surface)] px-5 py-4 text-sm text-[var(--warning-foreground)]"
          role="alert"
        >
          Analytics are temporarily unavailable. Gameplay still works; apply the
          Phase 3 migration or retry after reconnecting.
        </div>
      ) : null}

      {analytics.totalGamesPlayed === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-10 text-center">
            <BarChart3 className="mx-auto size-10 text-[var(--blue)]" />
            <h2 className="mt-4 text-xl font-black">
              Your first trend starts now
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">
              Complete an Arcade or Training game to populate accuracy, speed,
              progression, and category insights.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--blue)]/10">
                <Icon className="size-5 text-[var(--blue)]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-black">{value}</p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">
                  {label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <BarChart3 className="size-5 text-[var(--orange)]" />
            <div>
              <h2 className="font-black">Accuracy by category</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                All persisted attempts
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <AccuracyChart categories={analytics.categories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-black">Category signals</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Insights require at least one category attempt
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {insights.map((insight) => (
              <div className="flex items-center gap-3" key={insight.label}>
                <insight.icon className="size-5 text-[var(--blue)]" />
                <div>
                  <p className="text-xs text-[var(--muted)]">{insight.label}</p>
                  <p className="font-black">{insight.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <TrendCharts points={analytics.trends} />
    </div>
  );
}
