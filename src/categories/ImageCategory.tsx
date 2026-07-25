import type { Question } from '@/types/models';

/** Props every per-category renderer receives. */
export interface CategoryRenderProps {
  question: Question;
}

/* eslint-disable @next/next/no-img-element -- remote placeholder media; next/image config deferred to Phase 5 */
export function ImageCategory({ question }: CategoryRenderProps) {
  const alt =
    question.metadata.kind === 'image' && question.metadata.altText
      ? question.metadata.altText
      : 'Image challenge';

  return (
    <img
      src={question.mediaUrl}
      alt={alt}
      className="max-h-full max-w-full object-contain"
      draggable={false}
    />
  );
}
/* eslint-enable @next/next/no-img-element */
