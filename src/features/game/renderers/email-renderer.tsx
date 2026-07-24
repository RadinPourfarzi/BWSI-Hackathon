import { Mail } from "lucide-react";

import type { Challenge } from "@/features/game/types";

export function EmailRenderer({
  payload,
}: {
  payload: Extract<Challenge["payload"], { kind: "email" }>;
}) {
  return (
    <article className="flex h-[min(52vh,30rem)] flex-col overflow-hidden rounded-xl border border-[#d9dde6] bg-[#f8f9fc] text-[#172033]">
      <header className="shrink-0 border-b border-[#d9dde6] bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e8edfa]">
            <Mail className="size-5 text-[#345089]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{payload.senderName}</p>
            <p className="truncate text-xs text-[#667085]">
              {payload.senderAddress}
            </p>
          </div>
          {payload.receivedAt ? (
            <time className="ml-auto hidden text-xs text-[#667085] sm:block">
              {payload.receivedAt}
            </time>
          ) : null}
        </div>
        <h2 className="mt-4 text-base font-bold sm:text-lg">
          {payload.subject}
        </h2>
      </header>
      <div
        aria-label="Email message body"
        className="min-h-0 flex-1 overflow-y-auto px-5 py-6 text-sm leading-7 whitespace-pre-line"
        tabIndex={0}
      >
        {payload.body}
      </div>
    </article>
  );
}
