import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'border-edge text-muted inline-flex items-center rounded-full border bg-white/5 px-2.5 py-1 font-mono text-xs font-bold tracking-[0.12em] uppercase',
        className,
      )}
      {...props}
    />
  );
}
