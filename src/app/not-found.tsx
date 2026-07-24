import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-[var(--pink)] uppercase">
          Signal lost
        </p>
        <h1 className="text-4xl font-black tracking-tight">Page not found</h1>
        <p className="mt-4 text-[var(--muted)]">
          This route is not part of the current challenge map.
        </p>
        <Button asChild className="mt-7">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </main>
  );
}
