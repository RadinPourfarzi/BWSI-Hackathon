import type { ReactNode } from 'react';
import { UI_CONFIG } from '@/config';

/**
 * Fixed-dimension bounding box for gameplay media. Locked height + `object-fit: contain`
 * (applied by children) guarantee the AI/REAL buttons never shift when the media type
 * changes between questions. See project-plan.md §8.
 */
export function MediaContainer({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
      style={{ height: `${UI_CONFIG.mediaBox.heightPx}px` }}
    >
      {children}
    </div>
  );
}
