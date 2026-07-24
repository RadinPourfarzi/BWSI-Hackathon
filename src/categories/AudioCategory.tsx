import type { CategoryRenderProps } from './ImageCategory';

/**
 * Renders an audio challenge: a native audio player plus a short label. (Dummy audio URLs
 * point at a placeholder domain and will not play until real media is wired in Phase 5.)
 */
export function AudioCategory({ question }: CategoryRenderProps) {
  const durationSec =
    question.metadata.kind === 'audio'
      ? (question.metadata.durationMs / 1000).toFixed(1)
      : undefined;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-zinc-700 dark:text-zinc-200">
      <span className="text-4xl">🎧</span>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        Listen to the clip{durationSec ? ` (${durationSec}s)` : ''}
      </span>
      <audio controls src={question.mediaUrl} className="w-full max-w-md">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
