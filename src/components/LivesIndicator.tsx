/**
 * Remaining lives as heart glyphs (Arcade), or an infinity symbol for Training's unlimited
 * lives. `maxLives` renders spent lives dimmed for a stable-width indicator.
 */
export function LivesIndicator({ lives, maxLives }: { lives: number; maxLives: number }) {
  if (!Number.isFinite(lives)) {
    return (
      <span className="text-lg text-zinc-600 dark:text-zinc-300" aria-label="Unlimited lives">
        ∞
      </span>
    );
  }

  return (
    <span className="inline-flex gap-0.5 text-lg" aria-label={`${lives} of ${maxLives} lives`}>
      {Array.from({ length: maxLives }, (_, i) => (
        <span key={i} className={i < lives ? '' : 'opacity-20'}>
          ♥
        </span>
      ))}
    </span>
  );
}
