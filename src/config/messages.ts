/**
 * Streak-aware feedback call-outs ("The Call"). Content + combo thresholds live here
 * (config, not hardcoded in components). A wrong answer shows a wrong-tier message; a
 * correct answer picks the highest tier whose `minCombo` <= the current combo streak, then
 * a random message within that tier for variety.
 */
export interface MessageTier {
  /** Applies when the consecutive-correct streak is >= this. */
  minCombo: number;
  messages: readonly string[];
}

export const CORRECT_TIERS: readonly MessageTier[] = [
  { minCombo: 1, messages: ['Correct', 'Nice', 'Got it', 'Clean'] },
  { minCombo: 3, messages: ['On a roll', 'Sharp eye', 'Three straight'] },
  { minCombo: 5, messages: ["You're killing it", 'On fire', 'Locked in'] },
  { minCombo: 8, messages: ['Unstoppable', 'Machine-proof', 'Flawless'] },
];

export const WRONG_MESSAGES: readonly string[] = ['Wrong', 'Not quite', 'Fooled you'];

function pick(messages: readonly string[]): string {
  return messages[Math.floor(Math.random() * messages.length)] ?? messages[0];
}

/**
 * Feedback message for an answer. `combo` is the 1-based consecutive-correct streak after
 * this answer (0 if the answer was wrong).
 */
export function feedbackMessage(isCorrect: boolean, combo: number): string {
  if (!isCorrect) {
    return pick(WRONG_MESSAGES);
  }
  let tier = CORRECT_TIERS[0];
  for (const t of CORRECT_TIERS) {
    if (combo >= t.minCombo && t.minCombo >= tier.minCombo) {
      tier = t;
    }
  }
  return pick(tier.messages);
}
