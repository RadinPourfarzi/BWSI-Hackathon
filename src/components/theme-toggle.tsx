"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Theme = "dark" | "light";

const themeStorageKey = "bot-or-not-theme";
const themeChangeEvent = "bot-or-not-theme-change";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(onThemeChange: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key !== themeStorageKey) return;

    if (event.newValue === "light" || event.newValue === "dark") {
      document.documentElement.dataset.theme = event.newValue;
      onThemeChange();
    }
  }

  window.addEventListener(themeChangeEvent, onThemeChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(themeChangeEvent, onThemeChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "dark");

  const nextTheme = theme === "dark" ? "light" : "dark";

  function toggleTheme() {
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(themeStorageKey, nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  return (
    <button
      aria-label={`Switch to ${nextTheme} mode`}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 font-bold text-[var(--foreground)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
        className,
      )}
      onClick={toggleTheme}
      title={`Switch to ${nextTheme} mode`}
      type="button"
    >
      {theme === "dark" ? (
        <Moon aria-hidden="true" className="size-4 text-[var(--blue)]" />
      ) : (
        <Sun aria-hidden="true" className="size-4 text-[var(--orange)]" />
      )}
      {showLabel ? (
        <span className="text-sm capitalize">{theme} mode</span>
      ) : null}
    </button>
  );
}
