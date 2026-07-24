"use client";

import { ImageOff, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { Challenge } from "@/features/game/types";

export function ImageRenderer({
  challenge,
}: {
  challenge: Challenge & {
    payload: Extract<Challenge["payload"], { kind: "image" }>;
  };
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div>
      <div className="relative grid h-[min(52vh,30rem)] w-full place-items-center overflow-hidden rounded-xl border border-[var(--border)] bg-black">
        {!loaded && !failed ? (
          <div
            aria-live="polite"
            className="absolute inset-0 z-10 grid place-items-center bg-[#070a11]"
            role="status"
          >
            <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <LoaderCircle className="size-4 animate-spin" />
              Loading image challenge
            </span>
          </div>
        ) : null}
        {failed ? (
          <div
            className="grid max-w-sm place-items-center gap-3 px-6 text-center"
            role="alert"
          >
            <ImageOff className="size-9 text-[var(--danger)]" />
            <p className="font-bold">This image could not be loaded.</p>
            <a
              className="text-sm text-[var(--blue)] underline underline-offset-4"
              href={challenge.originalSourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open the original source
            </a>
          </div>
        ) : (
          <Image
            alt={challenge.payload.alt}
            className="object-contain transition-opacity duration-200"
            fill
            onError={() => setFailed(true)}
            onLoad={() => setLoaded(true)}
            priority
            sizes="(max-width: 768px) 92vw, 768px"
            src={challenge.payload.src}
            style={{ opacity: loaded ? 1 : 0 }}
            unoptimized
          />
        )}
      </div>
      <details className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--muted)]">
        <summary className="cursor-pointer font-bold text-[var(--foreground)]">
          Source and attribution
        </summary>
        <p className="mt-2 leading-5">
          {challenge.attribution} · {challenge.license}
        </p>
        <a
          className="mt-1 inline-block text-[var(--blue)] underline underline-offset-4"
          href={challenge.originalSourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          View original source
        </a>
      </details>
    </div>
  );
}
