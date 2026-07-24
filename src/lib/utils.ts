export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value))
    return "/app";

  try {
    const destination = new URL(value, "https://bot-or-not.invalid");
    if (destination.origin !== "https://bot-or-not.invalid") return "/app";

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/app";
  }
}
