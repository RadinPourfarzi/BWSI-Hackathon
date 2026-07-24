import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-3 text-sm font-medium text-[var(--muted)]",
        className,
      )}
    >
      <LoaderCircle className="size-5 animate-spin text-[var(--blue)]" />
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
    <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
      <Inbox className="mx-auto size-8 text-[var(--muted)]" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div
      className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/8 p-5"
      role="alert"
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--danger)]" />
        <div>
          <h2 className="font-bold text-[var(--danger)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--danger-foreground)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
