import type { CategoryId, GameMode } from '@/types/models';
import { CATEGORY_CONFIG } from '@/config';
import { LivesIndicator } from './LivesIndicator';
import { ComboBadge } from './ComboBadge';

/**
 * Top gameplay HUD as an instrument readout (mono numerals). Arcade shows score + lives +
 * combo; Training shows a correct/answered count (no score pressure). Both show the current
 * channel badge.
 */
export function HudBar({
  score,
  lives,
  maxLives,
  combo,
  mode,
  categoryId,
  correct = 0,
  answered = 0,
}: {
  score: number;
  lives: number;
  maxLives: number;
  combo: number;
  mode: GameMode;
  categoryId: CategoryId;
  correct?: number;
  answered?: number;
}) {
  const isTraining = mode === 'TRAINING';

  return (
    <div className="border-edge bg-ink-800 flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3">
      <div className="flex flex-col">
        <span className="text-muted font-mono text-[0.65rem] tracking-[0.15em] uppercase">
          {isTraining ? 'Correct' : 'Score'}
        </span>
        <span className="text-text font-mono text-xl font-bold tabular-nums">
          {isTraining ? `${correct}/${answered}` : score.toLocaleString()}
        </span>
      </div>

      {!isTraining && (
        <div className="flex items-center gap-3">
          <LivesIndicator lives={lives} maxLives={maxLives} />
          <ComboBadge combo={combo} />
        </div>
      )}

      <div className="flex flex-col items-end">
        <span className="text-muted font-mono text-[0.65rem] tracking-[0.15em] uppercase">
          {isTraining ? 'Training' : 'Arcade'}
        </span>
        <span className="text-text font-mono text-sm font-bold tracking-wide uppercase">
          {CATEGORY_CONFIG[categoryId].displayName}
        </span>
      </div>
    </div>
  );
}
