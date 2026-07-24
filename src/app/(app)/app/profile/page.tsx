import type { Metadata } from "next";
import { Flame, Medal, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import { getShellProfile } from "@/services/profile";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sign-in?error=configuration");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const profile = await getShellProfile(user);

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
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">{profile.displayName}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {profile.email}
              </p>
            </div>
            <Badge className="w-fit border-[var(--blue)]/30 bg-[var(--blue)]/10 text-[#a9c5ff]">
              Level {profile.level}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total XP",
            value: formatNumber(profile.totalXp),
            icon: Medal,
            color: "text-[#ffd166]",
          },
          {
            label: "Current streak",
            value: `${profile.currentStreak} days`,
            icon: Flame,
            color: "text-[#ff9b52]",
          },
          {
            label: "Overall accuracy",
            value: `${profile.accuracy}%`,
            icon: ShieldCheck,
            color: "text-[var(--success)]",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <stat.icon className={`size-5 ${stat.color}`} />
              <p className="mt-4 text-2xl font-black">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
