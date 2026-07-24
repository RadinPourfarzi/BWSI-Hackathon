import type { Metadata } from "next";
import { Database, KeyRound, Settings2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="animate-enter">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--blue)] uppercase">
        Settings
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Account and game
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Production authentication and progress are tied to your Supabase
        account.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: KeyRound,
            title: "Authentication",
            description:
              "Email and password sessions use secure HTTP-only Supabase cookies.",
          },
          {
            icon: Database,
            title: "Progress storage",
            description:
              "Attempts, XP, accuracy, sessions, and streaks are saved to your profile.",
          },
          {
            icon: Settings2,
            title: "Game balance",
            description:
              "Difficulty, scoring, animation, XP, and category labels are configuration-driven.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="p-6">
              <item.icon className="size-6 text-[var(--blue)]" />
              <h2 className="mt-5 font-black">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
