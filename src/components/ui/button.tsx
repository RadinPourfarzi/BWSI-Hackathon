import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
} from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[var(--blue-strong)] text-white hover:bg-[var(--blue)] shadow-[0_10px_30px_rgb(47_111_244/0.2)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
  ghost:
    "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
  danger:
    "border border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/15",
} as const;

const sizes = {
  sm: "h-9 rounded-lg px-3 text-sm",
  md: "h-11 rounded-xl px-5 text-sm",
  lg: "h-13 rounded-xl px-6 text-base",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function buttonClassName({
  className,
  variant = "primary",
  size = "md",
}: Pick<ButtonProps, "className" | "variant" | "size"> = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  asChild = false,
  className,
  variant = "primary",
  size = "md",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const composedClassName = buttonClassName({ className, variant, size });

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;

    return cloneElement(child, {
      className: cn(composedClassName, child.props.className),
    });
  }

  return (
    <button className={composedClassName} type={type} {...props}>
      {children}
    </button>
  );
}
