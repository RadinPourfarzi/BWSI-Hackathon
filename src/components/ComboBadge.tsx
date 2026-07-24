/**
 * Consecutive-correct combo indicator. Hidden below 2x since a 1-streak is the baseline.
 */
export function ComboBadge({ combo }: { combo: number }) {
  if (combo < 2) {
    return null;
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
      {combo}× combo
    </span>
  );
}
