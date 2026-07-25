import type { AnswerOutcome } from '@/store/gameStore';

/**
 * Training-mode post-answer panel: reveals which it was + the explanation, then waits for a
 * manual advance (self-paced; no timer). Outcome-coloured left edge for a glanceable cue.
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
  const edge = outcome.isCorrect ? 'border-l-correct' : 'border-l-wrong';

  return (
    <div className="flex flex-col gap-3">
      <div className={`border-edge bg-ink-700 rounded-xl border border-l-4 px-4 py-3 ${edge}`}>
        <div className="font-display text-text font-bold">
          {outcome.isCorrect ? 'Correct.' : 'Not quite.'}{' '}
          <span className="text-muted">It was {outcome.correctIsAi ? 'FAKE' : 'REAL'}.</span>
        </div>
        {explanation && <p className="text-muted mt-1 text-sm leading-relaxed">{explanation}</p>}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="bg-text font-display text-ink-900 rounded-xl px-6 py-3 font-bold transition-opacity hover:opacity-90"
      >
        Next <span className="font-mono text-sm font-normal opacity-70">(Enter)</span>
      </button>
    </div>
  );
}
