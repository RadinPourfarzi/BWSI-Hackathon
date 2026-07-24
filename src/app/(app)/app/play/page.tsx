import type { Metadata } from "next";

import { GuestNotice } from "@/components/guest-notice";
import { GameExperience } from "@/features/game/game-experience";
import { defaultPlayerSettings } from "@/features/settings/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShellProfile } from "@/services/profile";
import { getPlayerSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Play Arcade",
};

export default async function ArcadePage() {
  const supabase = await createServerSupabaseClient();
  const userResult = await supabase?.auth.getUser();
  const user = userResult?.data.user ?? null;
  const [profile, settings] = user
    ? await Promise.all([getShellProfile(user), getPlayerSettings(user.id)])
    : [null, null];

  return (
    <div className="animate-enter">
      {!user ? <GuestNotice returnPath="/app/play" /> : null}
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--orange-ink)] uppercase">
          Arcade
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Mixed signals
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Three lives. Faster decisions earn more points.
        </p>
      </div>
      <GameExperience
        guest={!user}
        initialBestScore={profile?.bestScore ?? 0}
        mode="arcade"
        settings={settings ?? defaultPlayerSettings}
      />
    </div>
  );
}
