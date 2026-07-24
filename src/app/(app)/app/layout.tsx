import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { xpRequiredForLevel } from "@/config/xp";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShellProfile } from "@/services/profile";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sign-in?error=configuration&next=%2Fapp");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=%2Fapp");

  const profile = await getShellProfile(user);
  const currentLevelStart = xpRequiredForLevel(profile.level);
  const nextLevelStart = xpRequiredForLevel(profile.level + 1);

  return (
    <div className="min-h-screen">
      <AppNav
        currentXp={Math.max(0, profile.totalXp - currentLevelStart)}
        displayName={profile.displayName}
        level={profile.level}
        nextLevelXp={Math.max(1, nextLevelStart - currentLevelStart)}
        streak={profile.currentStreak}
      />
      <main className="px-4 py-7 sm:px-7 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
