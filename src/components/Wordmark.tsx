/** The wordmark: BOT (violet) · OR (muted mono) · NOT (amber). The brand lockup. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span className="text-bot">BOT</span>
      <span className="text-muted px-1 align-middle font-mono text-[0.6em] font-normal">OR</span>
      <span className="text-not">NOT</span>
    </span>
  );
}
