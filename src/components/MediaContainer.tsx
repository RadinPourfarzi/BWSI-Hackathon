import type { ReactNode } from 'react';
import { UI_CONFIG } from '@/config';

const { minPx, vh, maxPx } = UI_CONFIG.mediaBox;

/**
 * "Light table" for gameplay media. Responsive clamped height (same for every media type at
 * a given viewport) + object-fit: contain on children keep the answer buttons from shifting
 * between questions, while shrinking on short screens so nothing overflows.
 */
export function MediaContainer({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-edge bg-ink-800 flex w-full items-center justify-center overflow-hidden rounded-2xl border shadow-[inset_0_1px_40px_rgba(0,0,0,0.4)]"
      style={{ height: `clamp(${minPx}px, ${vh}vh, ${maxPx}px)` }}
    >
      {children}
    </div>
  );
}
