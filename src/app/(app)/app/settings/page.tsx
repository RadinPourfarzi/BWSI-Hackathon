import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsForm } from "@/features/settings/settings-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlayerSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase)
    redirect("/sign-in?error=configuration&next=%2Fapp%2Fsettings");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=%2Fapp%2Fsettings");

  const settings = await getPlayerSettings(user.id);

  return (
    <div className="animate-enter">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--blue)] uppercase">
        Settings
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Make the game yours
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Preferences follow your account. A local copy keeps interactions
        consistent while the network reconnects.
      </p>

      <div className="mt-8">
        <SettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
