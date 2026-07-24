"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import {
  preferencesStorageKey,
  type PlayerSettings,
} from "@/features/settings/types";

export function PreferenceEffects({ settings }: { settings: PlayerSettings }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = settings.reducedMotion;
    try {
      window.localStorage.setItem(
        preferencesStorageKey,
        JSON.stringify(settings),
      );
    } catch {
      // Durable Supabase settings still work when local storage is unavailable.
    }
    function updateOnlineStatus() {
      setOnline(window.navigator.onLine);
    }

    const initialCheck = window.setTimeout(updateOnlineStatus, 0);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.clearTimeout(initialCheck);
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [settings]);

  if (online) return null;

  return (
    <div
      className="fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-[#a47627]/45 bg-[#21190d] px-4 py-3 text-sm text-[#f1d09a] shadow-2xl"
      role="status"
    >
      <WifiOff className="size-4 shrink-0" />
      You are offline. The active question remains playable, but new batches and
      progress saving need a connection.
    </div>
  );
}
