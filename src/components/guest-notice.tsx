import { UserRoundPlus } from "lucide-react";
import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";

export function GuestNotice({ returnPath }: { returnPath: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--blue)]/25 bg-[var(--blue)]/8 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <UserRoundPlus className="mt-0.5 size-5 shrink-0 text-[var(--blue)]" />
        <div>
          <p className="text-sm font-black">Playing as guest</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Gameplay works without an account. XP, streaks, and analytics will
            not be saved.
          </p>
        </div>
      </div>
      <Link
        className={buttonClassName({
          className: "shrink-0",
          size: "sm",
          variant: "secondary",
        })}
        href={`/sign-up?next=${encodeURIComponent(returnPath)}`}
      >
        Create account
      </Link>
    </div>
  );
}
