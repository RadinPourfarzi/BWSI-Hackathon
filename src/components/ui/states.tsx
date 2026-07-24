import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export function LoadingState({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      className={cn('text-muted flex items-center justify-center gap-3 text-sm font-medium', className)}
    >
      <LoaderCircle className="text-bot size-5 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-edge rounded-2xl border border-dashed p-8 text-center">
      <Inbox className="text-muted mx-auto size-8" />
      <h2 className="font-display mt-4 text-lg font-bold">{title}</h2>
      <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-6">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Unable to load',
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="border-wrong/30 bg-wrong/10 rounded-2xl border p-5" role="alert">
      <div className="flex gap-3">
        <AlertCircle className="text-wrong mt-0.5 size-5 shrink-0" />
        <div>
          <h2 className="text-wrong font-display font-bold">{title}</h2>
          <p className="text-muted mt-1 text-sm leading-6">{description}</p>
        </div>
      </div>
    </div>
  );
}
