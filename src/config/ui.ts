/**
 * Client-only UI constants — the single source of truth for the visual identity
 * (colours, fonts, motion, media box). NOT part of the server-authoritative `game_config`;
 * these affect presentation only, never gameplay balance.
 *
 * `globals.css` `@theme` mirrors the `colors`/`fonts` values as Tailwind tokens — keep the
 * two in sync. Components read `UI_CONFIG` for JS/Framer values and use the `@theme`
 * classes (e.g. `bg-ink-900`, `text-bot`, `font-display`) for static styling. See
 * `files/design-direction.md` and docs/data-formats.md §6.6.
 */
export const UI_CONFIG = {
  /**
   * "Signal vs. Synthetic" palette. BOT/NOT encode the two answers; correct/incorrect are
   * reserved for outcome feedback only.
   */
  colors: {
    ink900: '#141020', // page background (violet-black)
    ink800: '#1c1730', // raised surface / HUD bar
    ink700: '#262040', // cards, panels
    edge: '#332b52', // hairlines, borders
    text: '#f2eee8', // primary text (warm off-white)
    muted: '#9e96b4', // secondary text, labels
    bot: '#9b6dff', // BOT / AI world (synthetic violet)
    botBright: '#b492ff',
    not: '#ff8a5b', // NOT / REAL world (human amber)
    notBright: '#ff9e77',
    correct: '#35d6a4', // outcome only
    wrong: '#ff4d6d', // outcome only
  },

  /** CSS variable names for the three type roles (set by next/font in layout.tsx). */
  fonts: {
    display: 'var(--font-display)',
    body: 'var(--font-body)',
    mono: 'var(--font-mono)',
  },

  /** Motion durations (ms) + easings. Consumed by Framer Motion and CSS transitions. */
  motion: {
    /** Answer feedback flash + message hold before auto-advance (Arcade). */
    callMs: 420,
    /** Tactile button press. */
    buttonPressMs: 40,
    /** Combo badge pop. */
    comboPopMs: 220,
    /** Question-to-question enter transition. */
    questionEnterMs: 120,
    /** Score number roll-up on award. */
    scoreTickMs: 300,
    /** Standard easing for settles/enters. */
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },

  /**
   * Fixed gameplay media bounding box. Locked dimensions + object-fit: contain prevent the
   * AI/REAL buttons from shifting when the media type changes.
   */
  mediaBox: { heightPx: 420, widthPct: 100 },
} as const;

export type UiColorKey = keyof typeof UI_CONFIG.colors;
