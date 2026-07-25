/**
 * Tiny Web Audio sound effects for gameplay. Synthesised tones (no asset files) so there's
 * nothing to host. The AudioContext is created lazily on first use — after a user gesture,
 * so autoplay policies are satisfied.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function blip(
  audio: AudioContext,
  { freq, start, duration, type = 'sine', peak = 0.12 }: {
    freq: number;
    start: number;
    duration: number;
    type?: OscillatorType;
    peak?: number;
  },
): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Bright two-note rise for a correct answer. */
export function playCorrect(): void {
  const audio = getCtx();
  if (!audio) return;
  const t = audio.currentTime;
  blip(audio, { freq: 660, start: t, duration: 0.12 });
  blip(audio, { freq: 988, start: t + 0.09, duration: 0.16 });
}

/** Low buzz for a wrong answer. */
export function playWrong(): void {
  const audio = getCtx();
  if (!audio) return;
  const t = audio.currentTime;
  blip(audio, { freq: 200, start: t, duration: 0.2, type: 'square', peak: 0.08 });
  blip(audio, { freq: 150, start: t + 0.05, duration: 0.24, type: 'square', peak: 0.08 });
}

/** Descending three-note motif for game over. */
export function playGameOver(): void {
  const audio = getCtx();
  if (!audio) return;
  const t = audio.currentTime;
  [440, 349, 262].forEach((freq, i) =>
    blip(audio, { freq, start: t + i * 0.16, duration: 0.3, type: 'triangle' }),
  );
}
