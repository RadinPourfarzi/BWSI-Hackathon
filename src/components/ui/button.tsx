import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
} from 'react';

import { cn } from '@/lib/utils';

// Re-skinned from madhav's primitive to the "Signal vs. Synthetic" palette
// (BOT violet primary, amber/ink surfaces). Same API: variant + size + asChild.
const variants = {
  primary:
    'bg-bot text-ink-900 hover:bg-bot-bright shadow-[0_10px_30px_rgba(62,124,249,0.25)]',
  secondary: 'border border-edge bg-ink-700 text-text hover:border-bot/40 hover:bg-ink-800',
  ghost: 'text-muted hover:bg-white/5 hover:text-text',
  danger: 'border border-wrong/40 bg-wrong/10 text-wrong hover:bg-wrong/15',
} as const;

const sizes = {
  sm: 'h-9 rounded-lg px-3 text-sm',
  md: 'h-11 rounded-xl px-5 text-sm',
  lg: 'h-13 rounded-xl px-6 text-base',
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function buttonClassName({
  className,
  variant = 'primary',
  size = 'md',
}: Pick<ButtonProps, 'className' | 'variant' | 'size'> = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  asChild = false,
  className,
  variant = 'primary',
  size = 'md',
  children,
  type = 'button',
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
