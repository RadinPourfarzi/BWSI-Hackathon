"use client";

import {
  BarChart3,
  Bolt,
  BrainCircuit,
  ChevronRight,
  Flame,
  LogOut,
  Settings,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { Button, buttonClassName } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/app", label: "Home", icon: Bolt },
  { href: "/app/play", label: "Play Arcade", icon: Target },
  { href: "/app/training", label: "Training", icon: BrainCircuit },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/profile", label: "Profile", icon: UserRound },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function NavigationLinks({ guest }: { guest: boolean }) {
  const pathname = usePathname();
  const visibleNavigation = guest
    ? navigation.filter(
        (item) => item.href === "/app/play" || item.href === "/app/training",
      )
    : navigation;

  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      {visibleNavigation.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            className={cn(
              "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors",
              active
                ? "bg-[var(--blue)]/13 text-white"
                : "text-[var(--muted)] hover:bg-white/5 hover:text-white",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon
              className={cn(
                "size-5",
                active ? "text-[var(--blue)]" : "text-[#66738a]",
              )}
            />
            {item.label}
            <ChevronRight
              className={cn(
                "ml-auto size-4 transition-transform group-hover:translate-x-0.5",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export function AppNav({
  displayName,
  level,
  currentXp,
  nextLevelXp,
  streak,
  guest = false,
}: {
  displayName?: string;
  level?: number;
  currentXp?: number;
  nextLevelXp?: number;
  streak?: number;
  guest?: boolean;
}) {
  const brandHref = guest ? "/" : "/app";

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[#080b12]/95 px-4 py-5 backdrop-blur lg:flex lg:flex-col">
        <Link
          className="flex items-center gap-3 px-2 font-black"
          href={brandHref}
        >
          <BrandLogo priority size={38} />
          Bot or Not
        </Link>
        <div className="mt-8">
          <NavigationLinks guest={guest} />
        </div>
        <div className="mt-auto">
          {guest ? (
            <div className="rounded-xl border border-[var(--blue)]/25 bg-[var(--blue)]/8 p-4">
              <p className="text-sm font-black">Playing as guest</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Play freely. Account XP, streaks, and analytics are not saved.
              </p>
              <Link
                className={buttonClassName({
                  className: "mt-4 w-full",
                  size: "sm",
                })}
                href="/sign-up?next=%2Fapp%2Fplay"
              >
                Create account
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-[var(--border)] bg-white/3 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">Level {level}</span>
                  <span className="text-[var(--muted)]">
                    {currentXp}/{nextLevelXp} XP
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
                  <p className="truncate text-sm font-bold">{displayName}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
                    <Flame className="size-3.5 text-[#ff9b52]" />
                    {streak} day streak
                  </p>
                </div>
                <form action={signOut}>
                  <Button
                    aria-label="Sign out"
                    className="size-9 px-0"
                    type="submit"
                    variant="ghost"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[#080b12]/92 px-4 backdrop-blur lg:hidden">
        <Link className="flex items-center gap-2 font-black" href={brandHref}>
          <BrandLogo priority size={34} />
          Bot or Not
        </Link>
        <details className="group relative">
          <summary className="list-none rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-bold">
            Menu
          </summary>
          <div className="absolute top-12 right-0 w-64 rounded-xl border border-[var(--border)] bg-[#0b101a] p-3 shadow-2xl">
            <NavigationLinks guest={guest} />
            {guest ? (
              <div className="mt-2 border-t border-[var(--border)] pt-2">
                <Link
                  className={buttonClassName({
                    className: "w-full",
                    variant: "secondary",
                  })}
                  href="/sign-in?next=%2Fapp%2Fplay"
                >
                  Sign in to save
                </Link>
              </div>
            ) : (
              <form
                action={signOut}
                className="mt-2 border-t border-[var(--border)] pt-2"
              >
                <Button
                  className="w-full justify-start"
                  type="submit"
                  variant="ghost"
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
            )}
          </div>
        </details>
      </header>
    </>
  );
}
