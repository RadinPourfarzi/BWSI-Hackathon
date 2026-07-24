"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center px-6">
          <div className="max-w-md text-center">
            <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-[var(--danger)] uppercase">
              Round interrupted
            </p>
            <h1 className="text-4xl font-black tracking-tight">
              Something went wrong
            </h1>
            <p className="mt-4 text-[var(--muted)]">
              Your saved progress is safe. Retry the current screen to continue.
            </p>
            <Button className="mt-7" onClick={reset}>
              Try again
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
