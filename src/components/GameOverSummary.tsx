import Link from 'next/link';
import { ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CATEGORY_CONFIG } from '@/config';
import { formatNumber } from '@/lib/utils';
import type { AttemptRecord, CategoryId, GameMode } from '@/types/models';

interface GameOverSummaryProps {
  mode: GameMode;
  score: number;
  maxCombo: number;
  questionsAnswered: number;
  correct: number;
  xpAwarded: number;
  attempts: AttemptRecord[];
  guest?: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-edge rounded-xl border bg-white/3 p-4 text-center">
      <p className="text-text font-mono text-xl font-bold tabular-nums">{value}</p>
      <p className="text-muted mt-1 text-xs">{label}</p>
    </div>
  );
}

/**
 * End-of-run summary, styled after madhav's ending screen and re-skinned to my palette.
 * Numbers are server-authoritative when available; avg response + per-category breakdown are
 * derived from the run's attempts. Live gameplay is unaffected.
 */
export function GameOverSummary({
  mode,
  score,
  maxCombo,
  questionsAnswered,
  correct,
  xpAwarded,
  attempts,
  guest = false,
  onPlayAgain,
  onHome,
}: GameOverSummaryProps) {
  const isArcade = mode === 'ARCADE';
  const accuracy = questionsAnswered > 0 ? Math.round((correct / questionsAnswered) * 100) : 0;
  const avgMs =
    attempts.length > 0
      ? attempts.reduce((sum, a) => sum + a.responseTimeMs, 0) / attempts.length
      : 0;

  const breakdown = attempts.reduce<Record<string, { correct: number; answered: number }>>(
    (acc, a) => {
      const entry = (acc[a.categoryId] ??= { correct: 0, answered: 0 });
      entry.answered += 1;
      if (a.isCorrect) entry.correct += 1;
      return acc;
    },
    {},
  );
  const categoryRows = Object.entries(breakdown);

  return (
    <Card className="mx-auto w-full max-w-3xl overflow-hidden">
      <CardContent className="p-7 sm:p-10">
        <div className="text-center">
          <span className="bg-not/10 mx-auto grid size-20 place-items-center rounded-full">
            <Trophy className="text-not size-9" />
          </span>
          <p className="text-not mt-6 font-mono text-xs font-bold tracking-[0.2em] uppercase">
            {isArcade ? 'Arcade run complete' : 'Training summary'}
          </p>
          <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight">
            {isArcade ? `${formatNumber(score)} points` : `${accuracy}% accuracy`}
          </h1>
          <p className="text-muted mt-3">
            {correct} of {questionsAnswered} correct · {formatNumber(xpAwarded)}{' '}
            {guest ? 'XP preview' : 'XP earned'}
          </p>
          {guest && (
            <Badge className="border-bot/35 bg-bot/10 text-bot mt-4">Guest run · not saved</Badge>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCell label="Accuracy" value={`${accuracy}%`} />
          <StatCell label="Avg. call" value={`${(avgMs / 1000).toFixed(1)}s`} />
          <StatCell label="Longest combo" value={`×${maxCombo}`} />
          <StatCell
            label={isArcade ? 'XP earned' : 'Answered'}
            value={isArcade ? `+${formatNumber(xpAwarded)}` : questionsAnswered}
          />
        </div>

        {categoryRows.length > 0 && (
          <div className="border-edge mt-7 overflow-hidden rounded-xl border">
            <div className="border-edge text-muted grid grid-cols-[1fr_auto_auto] gap-3 border-b bg-white/3 px-4 py-3 font-mono text-[0.65rem] font-bold tracking-wider uppercase">
              <span>Channel</span>
              <span>Correct</span>
              <span>Accuracy</span>
            </div>
            {categoryRows.map(([categoryId, perf]) => {
              const pct =
                perf.answered === 0 ? 0 : Math.round((perf.correct / perf.answered) * 100);
              return (
                <div
                  key={categoryId}
                  className="border-edge grid grid-cols-[1fr_auto_auto] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
                >
                  <span className="font-bold">
                    {CATEGORY_CONFIG[categoryId as CategoryId]?.displayName ?? categoryId}
                  </span>
                  <span className="text-muted font-mono tabular-nums">
                    {perf.correct}/{perf.answered}
                  </span>
                  <span className="w-14 text-right font-mono font-bold tabular-nums">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button onClick={onPlayAgain} size="lg" variant="secondary">
            <RotateCcw className="size-5" />
            Play again
          </Button>
          {guest ? (
            <Link className={buttonClassName({ size: 'lg' })} href="/login?mode=signup&redirect=/">
              Create account
              <ArrowRight className="size-5" />
            </Link>
          ) : (
            <Link className={buttonClassName({ size: 'lg' })} href="/analytics">
              View analytics
              <ArrowRight className="size-5" />
            </Link>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onHome}
            className="text-muted hover:text-text font-mono text-xs tracking-wide uppercase transition-colors"
          >
            Back to home
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
