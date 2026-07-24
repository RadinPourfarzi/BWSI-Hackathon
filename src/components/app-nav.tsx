'use client';

import { BarChart3, Dumbbell, Flame, Home, LogOut, Swords } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button, buttonClassName } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Wordmark } from '@/components/Wordmark';
import { signOut } from '@/app/auth/actions';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: typeof Home; accountOnly?: boolean };

// Maps to my existing routes (no rerouting). Home is the run launcher; Play/Training deep-link
// into it with a mode hint; Analytics is its own route.
const NAVIGATION: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/?mode=arcade', label: 'Play Arcade', icon: Swords },
  { href: '/?mode=training', label: 'Training', icon: Dumbbell },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, accountOnly: true },
];

function NavigationLinks({ guest }: { guest: boolean }) {
  const pathname = usePathname();
  const items = guest ? NAVIGATION.filter((item) => !item.accountOnly) : NAVIGATION;

  return (
    <nav aria-label="Primary" className="space-y-1">
      {items.map((item) => {
        const base = item.href.split('?')[0];
        const active = base === '/' ? pathname === '/' : pathname.startsWith(base);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors',
              active ? 'bg-bot/15 text-text' : 'text-muted hover:bg-white/5 hover:text-text',
            )}
          >
            <Icon className={cn('size-5', active ? 'text-bot' : 'text-muted')} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountPanel({
  displayName,
  level,
  currentXp,
  nextLevelXp,
  streak,
  guest,
}: AppNavProps) {
  if (guest) {
    return (
      <div className="border-bot/25 bg-bot/8 rounded-xl border p-4">
        <p className="text-text text-sm font-bold">Playing as guest</p>
        <p className="text-muted mt-1 text-xs leading-5">
          Play freely. XP, streaks, and analytics aren&apos;t saved.
        </p>
        <Link className={buttonClassName({ className: 'mt-4 w-full', size: 'sm' })} href="/login?mode=signup">
          Create account
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="border-edge rounded-xl border bg-white/3 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text font-bold">Level {level ?? 1}</span>
          <span className="text-muted font-mono tabular-nums">
            {currentXp ?? 0}/{nextLevelXp ?? 1} XP
          </span>
        </div>
        <Progress
          className="mt-2.5"
          label="Progress to next level"
          max={nextLevelXp ?? 1}
          value={currentXp ?? 0}
        />
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl px-2 py-2">
        <div className="min-w-0">
          <p className="text-text truncate text-sm font-bold">{displayName ?? 'Player'}</p>
          <p className="text-muted mt-0.5 flex items-center gap-1 text-xs">
            <Flame className="text-not size-3.5" />
            {streak ?? 0} day streak
          </p>
        </div>
        <form action={signOut}>
          <Button aria-label="Sign out" className="size-9 px-0" type="submit" variant="ghost">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </>
  );
}

export type AppNavProps = {
  displayName?: string;
  level?: number;
  currentXp?: number;
  nextLevelXp?: number;
  streak?: number;
  guest?: boolean;
};

export function AppNav(props: AppNavProps) {
  const { guest = false } = props;
  const pathname = usePathname();
  // Keep gameplay immersive on mobile: no floating menu button over the HUD.
  const hideMobileTrigger = pathname.startsWith('/play');

  return (
    <>
      <aside className="border-edge bg-ink-900/95 fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r px-4 py-5 backdrop-blur lg:flex">
        <Link href="/" className="flex items-center gap-2 px-2">
          <Wordmark className="text-base" />
        </Link>
        <div className="mt-8">
          <NavigationLinks guest={guest} />
        </div>
        <div className="mt-auto">
          <AccountPanel {...props} />
        </div>
      </aside>

      {!hideMobileTrigger && (
        <details className="group fixed top-3 right-3 z-40 lg:hidden">
          <summary className="border-edge bg-ink-800/90 text-text list-none rounded-lg border px-3 py-2 text-sm font-bold backdrop-blur">
            Menu
          </summary>
          <div className="border-edge bg-ink-800 absolute top-12 right-0 w-64 rounded-xl border p-3 shadow-2xl">
            <NavigationLinks guest={guest} />
            <div className="border-edge mt-2 border-t pt-2">
              <AccountPanel {...props} />
            </div>
          </div>
        </details>
      )}
    </>
  );
}
