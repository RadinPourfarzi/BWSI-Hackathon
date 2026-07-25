'use client';

import { motion } from 'framer-motion';
import { UI_CONFIG } from '@/config';

/** Consecutive-correct combo indicator (mono). Hidden below 2× (1 is the baseline). */
export function ComboBadge({ combo }: { combo: number }) {
  if (combo < 2) {
    return null;
  }
  return (
    <motion.span
      key={combo}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration: UI_CONFIG.motion.comboPopMs / 1000, ease: UI_CONFIG.motion.ease }}
      className="border-bot/40 bg-bot/10 text-bot-bright inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-sm font-bold"
    >
      ×{combo}
    </motion.span>
  );
}
