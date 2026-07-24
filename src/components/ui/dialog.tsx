"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className="m-auto w-[min(92vw,34rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/70"
      onCancel={onClose}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <h2 className="font-bold">{title}</h2>
        <Button
          aria-label="Close dialog"
          className="size-9 px-0"
          onClick={onClose}
          variant="ghost"
        >
          <X className="size-5" />
        </Button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
