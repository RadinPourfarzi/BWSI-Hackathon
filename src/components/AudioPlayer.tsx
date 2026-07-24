'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const BAR_COUNT = 44;

/** Deterministic per-clip bar heights (0.2–1) so the waveform is stable across renders. */
function seededBars(seed: string, n: number): number[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  // Ease toward the middle so the shape reads like speech (louder centre, quiet edges).
  return Array.from({ length: n }, (_, i) => {
    const envelope = Math.sin((Math.PI * (i + 0.5)) / n) * 0.5 + 0.5;
    return 0.2 + rand() * 0.8 * envelope;
  });
}

function formatTime(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

/**
 * On-brand audio challenge player. Shows the total duration instantly from `durationMs`
 * (no waiting on metadata load), preloads and autoplays the clip, and renders a seekable
 * pseudo-waveform in the BOT/NOT palette instead of the mismatched native controls.
 */
export function AudioPlayer({
  src,
  durationMs,
  seed,
}: {
  src: string;
  durationMs: number;
  seed: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const bars = useMemo(() => seededBars(seed, BAR_COUNT), [seed]);
  const metaDuration = durationMs / 1000;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(metaDuration);
  const [playing, setPlaying] = useState(false);

  // Autoplay when the clip mounts/changes (element is keyed per question upstream).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(0);
    el.currentTime = 0;
    el.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false)); // autoplay blocked → user taps play
  }, [src]);

  const total = duration > 0 ? duration : metaDuration;
  const fraction = total > 0 ? Math.min(1, currentTime / total) : 0;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const seekTo = (clientX: number, track: HTMLElement) => {
    const el = audioRef.current;
    if (!el || total <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const t = ratio * total;
    el.currentTime = t;
    setCurrentTime(t);
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 px-6">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      <span className="text-muted font-mono text-[0.7rem] tracking-[0.25em] uppercase">
        Voice clip
      </span>

      <div className="flex w-full items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause clip' : 'Play clip'}
          className="bg-bot text-ink-900 hover:bg-bot-bright flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-[0_0_24px_rgba(155,109,255,0.35)] transition-colors"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 2.5v11a1 1 0 0 0 1.5.87l9-5.5a1 1 0 0 0 0-1.74l-9-5.5A1 1 0 0 0 4 2.5Z" fill="currentColor" />
            </svg>
          )}
        </button>

        {/* Seekable waveform. */}
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekTo(e.clientX, e.currentTarget);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) seekTo(e.clientX, e.currentTarget);
          }}
          onKeyDown={(e) => {
            const el = audioRef.current;
            if (!el) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              const step = e.key === 'ArrowRight' ? 1 : -1;
              const t = Math.min(total, Math.max(0, el.currentTime + step));
              el.currentTime = t;
              setCurrentTime(t);
            }
          }}
          className="flex h-16 flex-1 cursor-pointer items-center gap-[3px]"
        >
          {bars.map((height, i) => {
            const filled = i / BAR_COUNT <= fraction;
            return (
              <span
                key={i}
                className={`h-full flex-1 rounded-full transition-colors duration-75 ${
                  filled ? 'bg-bot' : 'bg-edge'
                }`}
                style={{ height: `${Math.round(height * 100)}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className="text-muted flex w-full justify-between font-mono text-xs tabular-nums">
        <span className="text-text">{formatTime(currentTime)}</span>
        <span>{formatTime(total)}</span>
      </div>
    </div>
  );
}
