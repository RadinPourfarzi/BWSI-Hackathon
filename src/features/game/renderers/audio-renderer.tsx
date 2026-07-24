"use client";

import {
  AudioLines,
  LoaderCircle,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Challenge } from "@/features/game/types";

type AudioStatus = "loading" | "ready" | "buffering" | "error";

export function AudioRenderer({
  payload,
}: {
  payload: Extract<Challenge["payload"], { kind: "audio" }>;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<AudioStatus>("loading");

  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [payload.src]);

  function replay() {
    const audio = audioRef.current;
    if (!audio || status === "error") return;
    audio.currentTime = 0;
    void audio.play();
  }

  return (
    <div className="grid h-[min(52vh,30rem)] place-items-center rounded-xl border border-[var(--border)] bg-[#0a0e16] px-6 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full border border-[var(--blue)]/30 bg-[var(--blue)]/10">
          <AudioLines className="size-9 text-[var(--blue)]" />
        </div>
        <h2 className="mt-5 text-xl font-black">Listen closely</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Focus on pauses, breath, pronunciation, and transitions between words.
        </p>

        <div
          aria-live="polite"
          className="mt-5 min-h-6 text-sm text-[var(--muted)]"
        >
          {status === "loading" || status === "buffering" ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" />
              {status === "loading" ? "Loading audio" : "Buffering audio"}
            </span>
          ) : null}
          {status === "error" ? (
            <span className="inline-flex items-center gap-2 text-[var(--danger)]">
              <TriangleAlert className="size-4" />
              Audio playback is unavailable.
            </span>
          ) : null}
        </div>

        <audio
          className="mt-3 w-full"
          controls
          controlsList="nodownload"
          onCanPlay={() => setStatus("ready")}
          onError={() => setStatus("error")}
          onLoadStart={() => setStatus("loading")}
          onWaiting={() => setStatus("buffering")}
          preload="metadata"
          ref={audioRef}
          src={payload.src}
        >
          Your browser does not support audio playback.
        </audio>
        <Button
          className="mt-4"
          disabled={status === "error" || status === "loading"}
          onClick={replay}
          size="sm"
          variant="secondary"
        >
          <RotateCcw className="size-4" />
          Replay clip
        </Button>
      </div>
    </div>
  );
}
