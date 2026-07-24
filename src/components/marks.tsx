/**
 * Crafted SVG/text marks — replaces emoji (a slop tell). All inherit `currentColor` so
 * callers set colour via Tailwind text-* tokens.
 */

/** BOT / AI world: a synthetic node-cluster (too-regular, machine-made). */
export function BotGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="5" cy="17" r="2" fill="currentColor" />
      <circle cx="19" cy="17" r="2" fill="currentColor" />
      <circle cx="12" cy="13" r="1.4" fill="currentColor" />
      <path
        d="M12 7v4M12 13l-5.3 3M12 13l5.3 3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** NOT / REAL world: an organic waveform (living, irregular). */
export function NotGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 12c2 0 2-6 4-6s2 12 4 12 2-9 4-9 2 6 4 6 2-3 2-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Small spark for the streak counter (replaces 🔥). */
export function SparkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2l2.4 6.2L20 10l-4.6 2.4L12 22l-3.4-9.6L4 10l5.6-1.8L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}
