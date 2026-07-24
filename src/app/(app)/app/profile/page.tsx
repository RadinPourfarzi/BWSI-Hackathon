import type { Metadata } from "next";
import {
  BrainCircuit,
  CalendarDays,
  Flame,
  LogOut,
  Medal,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
} from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { categoryConfig, type CategoryId } from "@/config/categories";
import { signOut } from "@/features/auth/actions";
import { ProfileForm } from "@/features/profile/profile-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import { getPlayerProfile } from "@/services/profile";

export const metadata: Metadata = {
  title: "Profile",
};

function dateLabel(value: string | null): string {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function categoryLabel(value: string | null): string {
  if (!value || !(value in categoryConfig)) return "Play to discover";
  return categoryConfig[value as CategoryId].shortName;
}

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sign-in?error=configuration");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const profile = await getPlayerProfile(user);
  const stats = [
    ["Level", profile.level, Medal],
    ["Total XP", formatNumber(profile.totalXp), BrainCircuit],
    ["High score", formatNumber(profile.bestScore), Trophy],
    ["Games played", formatNumber(profile.gamesPlayed), Target],
    [
      "Strongest category",
      categoryLabel(profile.strongestCategory),
      ShieldCheck,
    ],
    ["Longest streak", `${profile.longestStreak} days`, Flame],
  ] as const;

  return (
    <div className="animate-enter">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--pink)] uppercase">
        Profile
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Player identity
      </h1>

      <Card className="mt-8 overflow-hidden">
        <div className="h-28 bg-[radial-gradient(circle_at_20%_0%,rgb(79_140_255/0.28),transparent_55%),#0b1220]" />
        <CardContent className="-mt-10 p-7">
          <span className="grid size-20 place-items-center rounded-2xl border-4 border-[var(--surface)] bg-[var(--blue-strong)]">
            <UserRound className="size-9" />
          </span>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">{profile.displayName}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {profile.email}
              </p>
              <p className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
                <CalendarDays className="size-3.5" />
                Joined {dateLabel(profile.joinDate)}
              </p>
            </div>
            <Badge className="w-fit border-[var(--blue)]/30 bg-[var(--blue)]/10 text-[#a9c5ff]">
              Level {profile.level}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <Icon className="size-5 text-[var(--blue)]" />
              <p className="mt-4 text-2xl font-black">{value}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                {label}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-black">Edit profile</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Your email and internal account identifiers are not publicly
              exposed.
            </p>
          </CardHeader>
          <CardContent>
            <ProfileForm displayName={profile.displayName} />
            <form
              action={signOut}
              className="mt-6 border-t border-[var(--border)] pt-6"
            >
              <Button type="submit" variant="danger">
                <LogOut className="size-4" />
                Sign out securely
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-black">Recent activity</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Latest eight completed games
            </p>
          </CardHeader>
          <CardContent>
            {profile.recentActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] px-5 py-8 text-center">
                <p className="font-bold">No completed games yet</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Finish an Arcade or Training run to start your history.
                </p>
              </div>
            ) : (
              <ol className="space-y-3">
                {profile.recentActivity.map((activity) => (
                  <li
                    className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-white/2 px-4 py-3"
                    key={activity.id}
                  >
                    <div>
                      <p className="text-sm font-black capitalize">
                        {activity.mode}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {activity.correct}/{activity.answered} correct ·{" "}
                        {dateLabel(activity.completedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">
                        {activity.mode === "arcade"
                          ? `${formatNumber(activity.score)} pts`
                          : `${formatNumber(activity.xpEarned)} XP`}
                      </p>
                      <p className="mt-1 text-xs text-[var(--success)]">
                        +{formatNumber(activity.xpEarned)} XP
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
