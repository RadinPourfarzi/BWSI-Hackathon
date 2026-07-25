import type { CategoryRenderProps } from './ImageCategory';

/**
 * Renders an email challenge as a realistic client "chrome": a header showing the subject
 * and — critically — the sender address (always a visible tell), then the message body.
 *
 * For `bodyFormat: 'html'` the body HTML lives in `question.mediaUrl` and brings its own
 * layout/padding (see scripts/build-email-seed.mjs templates), so the body area adds none.
 *
 * NOTE: this content is authored/trusted and uses inline styles only. Any future
 * user-submitted email HTML MUST be sanitized before rendering to avoid XSS.
 */
export function EmailCategory({ question }: CategoryRenderProps) {
  if (question.metadata.kind !== 'email') {
    return null;
  }
  const { subject, senderName, senderAddress, bodyFormat } = question.metadata;

  return (
    <div className="flex h-full w-full flex-col bg-white text-left text-zinc-900">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="truncate text-sm font-semibold">{subject}</div>
        <div className="truncate text-xs text-zinc-500">
          {senderName} &lt;{senderAddress}&gt;
        </div>
      </div>
      <div className="flex-1 overflow-auto text-sm">
        {bodyFormat === 'html' ? (
          <div dangerouslySetInnerHTML={{ __html: question.mediaUrl }} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- placeholder screenshot */
          <img src={question.mediaUrl} alt="Email screenshot" className="max-w-full" />
        )}
      </div>
    </div>
  );
}
