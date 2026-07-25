import { AppNav } from '@/components/app-nav';
import { createClient } from '@/lib/supabase/server';
import { xpForLevel } from '@/lib/progression';
import { XP_CONFIG } from '@/config';

export const dynamic = 'force-dynamic';

/**
 * Authenticated app shell: sidebar nav (desktop) / menu (mobile) wrapping the in-app
 * surfaces (gameplay, analytics). Guests get the shell too, minus account-only nav and with
 * a sign-up CTA. Gameplay stays visually unchanged inside `main`.
 */
export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navProps = { guest: true } as Parameters<typeof AppNav>[0];

  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) {
      const level = data.current_level as number;
      const totalXp = data.total_xp as number;
      const floor = xpForLevel(level, XP_CONFIG);
      const ceil = xpForLevel(level + 1, XP_CONFIG);
      navProps = {
        guest: false,
        displayName: data.username as string,
        level,
        currentXp: Math.max(0, Math.round(totalXp - floor)),
        nextLevelXp: Math.max(1, Math.round(ceil - floor)),
        streak: data.daily_streak as number,
      };
    } else {
      navProps = { guest: false };
    }
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      <AppNav {...navProps} />
      <main className="min-h-dvh">{children}</main>
    </div>
  );
}
