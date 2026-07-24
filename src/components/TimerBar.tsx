/**
 * Horizontal countdown bar plus live obtainable-points readout for the current question.
 * Values come from `useScoringTimer`; this component is purely presentational.
 */
export function TimerBar({
  fraction,
  remainingMs,
  obtainablePoints,
}: {
  fraction: number;
  remainingMs: number;
  obtainablePoints: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));
  const seconds = (remainingMs / 1000).toFixed(1);

  // Neutral-by-default; shifts to amber/red only as a functional low-time signal.
  const barColor =
    fraction > 0.5
      ? 'bg-zinc-800 dark:bg-zinc-200'
      : fraction > 0.2
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <span>Time left: {seconds}s</span>
        <span className="tabular-nums">Points: {obtainablePoints}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
