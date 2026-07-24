import { AppNav } from "@/components/app-nav";
import { xpRequiredForLevel } from "@/config/xp";
import { PreferenceEffects } from "@/features/settings/preference-effects";
import { defaultPlayerSettings } from "@/features/settings/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShellProfile } from "@/services/profile";
import { getPlayerSettings } from "@/services/settings";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const user = userResult?.data.user ?? null;

  if (!user) {
    return (
      <div className="min-h-screen">
        <AppNav guest />
        <PreferenceEffects settings={defaultPlayerSettings} />
        <main className="px-4 py-7 sm:px-7 lg:ml-64 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    );
  }

  const [profile, settings] = await Promise.all([
    getShellProfile(user),
    getPlayerSettings(user.id),
  ]);
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
      <PreferenceEffects settings={settings} />
      <main className="px-4 py-7 sm:px-7 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
