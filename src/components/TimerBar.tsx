/**
 * Countdown tension bar + live obtainable-points readout. Hue drifts calm → urgent as time
 * drains (functional signal, not decoration). Presentational; values from useScoringTimer.
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

  const barColor = fraction > 0.5 ? 'bg-not' : fraction > 0.2 ? 'bg-not-bright' : 'bg-wrong';

  return (
    <div className="w-full">
      <div className="text-muted mb-1 flex items-center justify-between font-mono text-sm">
        <span>{seconds}s</span>
        <span className="text-text tabular-nums">{obtainablePoints} PTS</span>
      </div>
      <div className="bg-edge h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
