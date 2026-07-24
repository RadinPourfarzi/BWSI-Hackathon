import type { Metadata } from "next";

import { GuestNotice } from "@/components/guest-notice";
import { GameExperience } from "@/features/game/game-experience";
import { defaultPlayerSettings } from "@/features/settings/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShellProfile } from "@/services/profile";
import { getPlayerSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Training",
};

export default async function TrainingPage() {
  const supabase = await createServerSupabaseClient();
  const userResult = await supabase?.auth.getUser();
  const user = userResult?.data.user ?? null;
  const [profile, settings] = user
    ? await Promise.all([getShellProfile(user), getPlayerSettings(user.id)])
    : [null, null];

  return (
    <div className="animate-enter">
      {!user ? <GuestNotice returnPath="/app/training" /> : null}
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--pink)] uppercase">
          Training
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Detection lab
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Practice as long as you like and study every explanation.
        </p>
      </div>
      <GameExperience
        guest={!user}
        initialBestScore={profile?.bestScore ?? 0}
        mode="training"
        settings={settings ?? defaultPlayerSettings}
      />
    </div>
  );
}
