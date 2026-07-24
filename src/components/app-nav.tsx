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

import { Button } from "@/components/ui/button";
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

function NavigationLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      {navigation.map((item) => {
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
}: {
  displayName: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  streak: number;
}) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[#080b12]/95 px-4 py-5 backdrop-blur lg:flex lg:flex-col">
        <Link className="flex items-center gap-3 px-2 font-black" href="/app">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--blue-strong)] text-xs">
            S/S
          </span>
          Signal or Synthetic
        </Link>
        <div className="mt-8">
          <NavigationLinks />
        </div>
        <div className="mt-auto">
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
              max={nextLevelXp}
              value={currentXp}
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
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[#080b12]/92 px-4 backdrop-blur lg:hidden">
        <Link className="flex items-center gap-2 font-black" href="/app">
          <span className="grid size-8 place-items-center rounded-lg bg-[var(--blue-strong)] text-[10px]">
            S/S
          </span>
          Signal or Synthetic
        </Link>
        <details className="group relative">
          <summary className="list-none rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-bold">
            Menu
          </summary>
          <div className="absolute top-12 right-0 w-64 rounded-xl border border-[var(--border)] bg-[#0b101a] p-3 shadow-2xl">
            <NavigationLinks />
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
          </div>
        </details>
      </header>
    </>
  );
}
