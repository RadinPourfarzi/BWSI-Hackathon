import Image from "next/image";

import type { Challenge } from "@/features/game/types";

export function ImageRenderer({
  payload,
}: {
  payload: Extract<Challenge["payload"], { kind: "image" }>;
}) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
      <Image
        alt={payload.alt}
        className="object-cover"
        fill
        priority
        sizes="(max-width: 768px) 92vw, 640px"
        src={payload.src}
      />
    </div>
  );
}
