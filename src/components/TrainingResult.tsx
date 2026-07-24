import type { AnswerOutcome } from '@/store/gameStore';

/**
 * Training-mode post-answer panel: reveals correctness and the explanation, then waits for
 * the player to advance manually (self-paced; no timer). See project-plan.md §6.
 */
export function TrainingResult({
  outcome,
  explanation,
  onNext,
}: {
  outcome: AnswerOutcome;
  explanation: string | null;
  onNext: () => void;
}) {
  const tone = outcome.isCorrect
    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
    : 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100';

  return (
    <div className="flex flex-col gap-3">
      <div className={`rounded-xl border px-4 py-3 ${tone}`}>
        <div className="font-semibold">
          {outcome.isCorrect ? 'Correct!' : 'Not quite.'} It was{' '}
          {outcome.correctIsAi ? 'AI' : 'REAL'}.
        </div>
        {explanation && <p className="mt-1 text-sm leading-relaxed opacity-90">{explanation}</p>}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Next → <span className="text-sm font-normal opacity-80">(Enter)</span>
      </button>
    </div>
  );
}
