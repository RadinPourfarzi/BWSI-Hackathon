'use client';

/**
 * The two primary answer buttons: AI (left) and REAL (right). Oversized, equal-width, and
 * fixed position so the cursor target never moves. Keyboard shortcuts are handled by the
 * gameplay page (A/← = AI, D/→ = REAL); the hints are shown here.
 */
export function AnswerButtons({
  onAnswer,
  disabled,
}: {
  onAnswer: (choiceIsAi: boolean) => void;
  disabled?: boolean;
}) {
  const base =
    'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border px-6 py-6 text-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex w-full gap-4">
      <button
        type="button"
        onClick={() => onAnswer(true)}
        disabled={disabled}
        className={`${base} border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800`}
      >
        <span className="text-2xl">🤖</span>
        <span>AI</span>
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">A / ←</span>
      </button>

      <button
        type="button"
        onClick={() => onAnswer(false)}
        disabled={disabled}
        className={`${base} border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800`}
      >
        <span className="text-2xl">👤</span>
        <span>REAL</span>
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">D / →</span>
      </button>
    </div>
  );
}
