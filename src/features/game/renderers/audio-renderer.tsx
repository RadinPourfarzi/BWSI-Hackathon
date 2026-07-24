import { AudioLines } from "lucide-react";

import type { Challenge } from "@/features/game/types";

export function AudioRenderer({
  payload,
}: {
  payload: Extract<Challenge["payload"], { kind: "audio" }>;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-xl border border-[var(--border)] bg-[#0a0e16] px-6 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full border border-[var(--blue)]/30 bg-[var(--blue)]/10">
          <AudioLines className="size-9 text-[var(--blue)]" />
        </div>
        <h2 className="mt-5 text-xl font-black">Listen closely</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Focus on pauses, breath, pronunciation, and transitions between words.
        </p>
        <audio
          className="mt-7 w-full"
          controls
          controlsList="nodownload"
          preload="metadata"
          src={payload.src}
        >
          Your browser does not support audio playback.
        </audio>
      </div>
    </div>
  );
}
