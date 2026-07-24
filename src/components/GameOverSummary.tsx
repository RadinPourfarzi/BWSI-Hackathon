import type { GameMode } from '@/types/models';

interface GameOverSummaryProps {
  mode: GameMode;
  score: number;
  maxCombo: number;
  questionsAnswered: number;
  correct: number;
  xpAwarded: number;
  onPlayAgain: () => void;
  onHome: () => void;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** End-of-run summary with key stats and next-action buttons. */
export function GameOverSummary({
  mode,
  score,
  maxCombo,
  questionsAnswered,
  correct,
  xpAwarded,
  onPlayAgain,
  onHome,
}: GameOverSummaryProps) {
  const accuracy = questionsAnswered > 0 ? Math.round((correct / questionsAnswered) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">
          {mode === 'ARCADE' ? 'Game over' : 'Session complete'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {mode === 'ARCADE' ? 'Out of lives — here’s how you did.' : 'Nice practice run.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {mode === 'ARCADE' && <Stat label="Score" value={score.toLocaleString()} />}
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Answered" value={questionsAnswered} />
        <Stat label="Best combo" value={`${maxCombo}×`} />
        {mode === 'ARCADE' && <Stat label="XP earned" value={`+${xpAwarded}`} />}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex-1 rounded-xl bg-zinc-900 px-5 py-3 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onHome}
          className="flex-1 rounded-xl border border-zinc-300 px-5 py-3 font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Home
        </button>
      </div>
    </div>
  );
}
