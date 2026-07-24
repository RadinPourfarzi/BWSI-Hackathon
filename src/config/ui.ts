/**
 * Client-only UI constants (animation durations, colors, fixed media box).
 *
 * NOT part of the server-authoritative `game_config`. These affect presentation only,
 * never gameplay balance. See docs/data-formats.md §6.6.
 */
export const UI_CONFIG = {
  /** Emerald flash duration on a correct answer (ms). */
  correctFlashMs: 180,
  /** Red flash duration on an incorrect answer (ms). */
  incorrectFlashMs: 220,
  /** Question-to-question transition (ms). */
  transitionMs: 120,
  /** How long the correct/incorrect feedback is shown before the next question (ms). */
  feedbackHoldMs: 550,
  /**
   * Fixed gameplay media bounding box. Locked dimensions + object-fit: contain prevent
   * the AI/REAL buttons from shifting when media type changes.
   */
  mediaBox: { heightPx: 420, widthPct: 100 },
  colors: { correct: 'emerald', incorrect: 'red' },
} as const;
