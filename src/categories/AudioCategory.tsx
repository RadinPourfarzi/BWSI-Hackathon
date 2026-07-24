import type { CategoryRenderProps } from './ImageCategory';
import { NotGlyph } from '@/components/marks';

/**
 * Renders an audio challenge: a native audio player plus a short label. (Placeholder audio
 * URLs won't play until a real dataset is wired in.)
 */
export function AudioCategory({ question }: CategoryRenderProps) {
  const durationSec =
    question.metadata.kind === 'audio'
      ? (question.metadata.durationMs / 1000).toFixed(1)
      : undefined;

  return (
    <div className="text-text flex h-full w-full flex-col items-center justify-center gap-5 px-6">
      <NotGlyph className="text-muted h-12 w-12" />
      <span className="text-muted font-mono text-xs tracking-[0.15em] uppercase">
        Voice clip{durationSec ? ` · ${durationSec}s` : ''}
      </span>
      <audio controls src={question.mediaUrl} className="w-full max-w-md">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
