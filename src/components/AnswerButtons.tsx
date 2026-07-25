'use client';

import { motion } from 'framer-motion';
import { BotGlyph, NotGlyph } from './marks';
import { UI_CONFIG } from '@/config';

/**
 * The two "worlds": BOT / AI (left, synthetic violet) and NOT / REAL (right, human amber).
 * Equal-width, fixed position so the cursor target never moves. Keyboard hints in mono
 * (A/← = AI, D/→ = REAL are handled by the gameplay page).
 */
export function AnswerButtons({
  onAnswer,
  disabled,
}: {
  onAnswer: (choiceIsAi: boolean) => void;
  disabled?: boolean;
}) {
  const press = { scale: 0.97, transition: { duration: UI_CONFIG.motion.buttonPressMs / 1000 } };

  return (
    <div className="flex w-full gap-4">
      <motion.button
        type="button"
        whileTap={press}
        onClick={() => onAnswer(true)}
        disabled={disabled}
        className="group border-bot/40 bg-bot/10 hover:border-bot hover:bg-bot/20 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border px-6 py-6 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <BotGlyph className="text-bot-bright h-7 w-7" />
        <span className="font-display text-text text-xl font-bold">AI</span>
        <span className="text-muted font-mono text-xs">◄ A</span>
      </motion.button>

      <motion.button
        type="button"
        whileTap={press}
        onClick={() => onAnswer(false)}
        disabled={disabled}
        className="group border-not/40 bg-not/10 hover:border-not hover:bg-not/20 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border px-6 py-6 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <NotGlyph className="text-not-bright h-7 w-7" />
        <span className="font-display text-text text-xl font-bold">REAL</span>
        <span className="text-muted font-mono text-xs">D ►</span>
      </motion.button>
    </div>
  );
}
