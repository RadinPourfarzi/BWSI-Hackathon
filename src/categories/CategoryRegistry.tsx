import type { ComponentType } from 'react';
import type { CategoryId, Question } from '@/types/models';
import { ImageCategory, type CategoryRenderProps } from './ImageCategory';
import { EmailCategory } from './EmailCategory';
import { AudioCategory } from './AudioCategory';

/**
 * Maps each category to its media renderer. New categories are added here without touching
 * core gameplay code (project-plan.md §5). Every entry takes a `Question` and renders its
 * category-specific media.
 */
export const CategoryRegistry: Record<CategoryId, ComponentType<CategoryRenderProps>> = {
  image: ImageCategory,
  email: EmailCategory,
  audio: AudioCategory,
};

/** Renders a challenge's media by dispatching to the registered category component. */
export function ChallengeMedia({ question }: { question: Question }) {
  const Renderer = CategoryRegistry[question.categoryId];
  return <Renderer question={question} />;
}
