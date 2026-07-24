import { LoadingState } from "@/components/ui/states";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center">
      <LoadingState label="Loading the next signal…" />
    </main>
  );
}
