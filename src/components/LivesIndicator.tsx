/**
 * Remaining lives as "signal pips" (Arcade), or an infinity glyph for Training. Spent pips
 * dim to keep a stable-width indicator. Replaces heart emoji.
 */
export function LivesIndicator({ lives, maxLives }: { lives: number; maxLives: number }) {
  if (!Number.isFinite(lives)) {
    return (
      <span className="text-muted font-mono text-sm" aria-label="Unlimited lives">
        ∞
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" aria-label={`${lives} of ${maxLives} lives`}>
      {Array.from({ length: maxLives }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${
            i < lives ? 'bg-not shadow-[0_0_8px_var(--color-not)]' : 'bg-edge'
          }`}
        />
      ))}
    </span>
  );
}
