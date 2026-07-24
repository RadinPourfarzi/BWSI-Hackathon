import type { CategoryRenderProps } from './ImageCategory';
import { AudioPlayer } from '@/components/AudioPlayer';

/**
 * Renders an audio challenge with the on-brand {@link AudioPlayer}: instant duration from
 * metadata, autoplay, and a seekable waveform styled to the game palette.
 */
export function AudioCategory({ question }: CategoryRenderProps) {
  const durationMs = question.metadata.kind === 'audio' ? question.metadata.durationMs : 0;

  return <AudioPlayer src={question.mediaUrl} durationMs={durationMs} seed={question.id} />;
}
