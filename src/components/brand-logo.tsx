import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  priority = false,
  size = 40,
}: {
  className?: string;
  priority?: boolean;
  size?: number;
}) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 object-contain", className)}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      src="/brand/bot-or-not-logo.png"
      width={size}
    />
  );
}
