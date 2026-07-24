'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { AnswerOutcome } from '@/store/gameStore';
import { feedbackMessage, UI_CONFIG } from '@/config';

/**
 * "The Call" — a fast, out-of-the-way answer flash + a short streak-aware message. Emerald
 * for correct, red for wrong (the brief's cue). No sweep/stamp; speed is the point. The
 * message is resolved once per outcome (useMemo) so the ~60fps timer re-renders during the
 * flash don't re-roll it and cause flicker.
 */
export function CallOverlay({ outcome }: { outcome: AnswerOutcome }) {
  const correct = outcome.isCorrect;
  const message = useMemo(
    () => feedbackMessage(correct, outcome.comboAfter),
    [correct, outcome.comboAfter],
  );
  const color = correct ? 'var(--color-correct)' : 'var(--color-wrong)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12, ease: UI_CONFIG.motion.ease }}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl"
      style={{ backgroundColor: `color-mix(in oklab, ${color} 78%, transparent)` }}
    >
      <motion.span
        initial={{ scale: 0.9, y: 4 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: UI_CONFIG.motion.ease }}
        className="font-display text-ink-900 text-3xl font-extrabold"
      >
        {message}
      </motion.span>
      {correct && outcome.pointsAwarded > 0 && (
        <span className="text-ink-900/80 font-mono text-sm font-bold">
          +{outcome.pointsAwarded}
        </span>
      )}
    </motion.div>
  );
}
