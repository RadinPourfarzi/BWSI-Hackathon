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
    <div className="border-edge bg-ink-700 flex flex-col rounded-xl border px-4 py-3">
      <span className="text-muted font-mono text-[0.65rem] tracking-[0.15em] uppercase">
        {label}
      </span>
      <span className="text-text font-mono text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}

/** End-of-run summary (server-authoritative numbers) with next actions. */
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
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {mode === 'ARCADE' ? 'Run over' : 'Session complete'}
        </h1>
        <p className="text-muted mt-1 text-sm">
          {mode === 'ARCADE' ? 'Out of lives. Here’s the tape.' : 'Nice practice run.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {mode === 'ARCADE' && <Stat label="Score" value={score.toLocaleString()} />}
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Answered" value={questionsAnswered} />
        <Stat label="Best combo" value={`×${maxCombo}`} />
        {mode === 'ARCADE' && <Stat label="XP earned" value={`+${xpAwarded}`} />}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="bg-text font-display text-ink-900 flex-1 rounded-xl px-5 py-3 font-bold transition-opacity hover:opacity-90"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onHome}
          className="border-edge font-display text-text hover:bg-ink-700 flex-1 rounded-xl border px-5 py-3 font-bold transition-colors"
        >
          Home
        </button>
      </div>
    </div>
  );
}
