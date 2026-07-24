import type { ReactNode } from 'react';
import { UI_CONFIG } from '@/config';

/**
 * Fixed-dimension "light table" for gameplay media. Locked height + object-fit: contain
 * (applied by children) keep the answer buttons from shifting between media types.
 */
export function MediaContainer({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-edge bg-ink-800 flex w-full items-center justify-center overflow-hidden rounded-2xl border shadow-[inset_0_1px_40px_rgba(0,0,0,0.4)]"
      style={{ height: `${UI_CONFIG.mediaBox.heightPx}px` }}
    >
      {children}
    </div>
  );
}
