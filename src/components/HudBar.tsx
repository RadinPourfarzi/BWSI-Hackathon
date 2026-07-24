import type { CategoryId, GameMode } from '@/types/models';
import { CATEGORY_CONFIG } from '@/config';
import { LivesIndicator } from './LivesIndicator';
import { ComboBadge } from './ComboBadge';

/**
 * Top gameplay HUD: run score (left), lives + combo (center), and the current category
 * badge (right). See project-plan.md §8, Screen 2.
 */
export function HudBar({
  score,
  lives,
  maxLives,
  combo,
  mode,
  categoryId,
}: {
  score: number;
  lives: number;
  maxLives: number;
  combo: number;
  mode: GameMode;
  categoryId: CategoryId;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Score</span>
        <span className="text-xl font-semibold tabular-nums">{score.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-3">
        <LivesIndicator lives={lives} maxLives={maxLives} />
        <ComboBadge combo={combo} />
      </div>

      <div className="flex flex-col items-end">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {mode === 'ARCADE' ? 'Arcade' : 'Training'}
        </span>
        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-sm font-medium tracking-wide uppercase dark:bg-zinc-800">
          {CATEGORY_CONFIG[categoryId].displayName}
        </span>
      </div>
    </div>
  );
}
