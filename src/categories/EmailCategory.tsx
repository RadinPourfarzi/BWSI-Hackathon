import type { CategoryRenderProps } from './ImageCategory';

/**
 * Renders an email challenge: a header (sender + subject) and the message body. For
 * `bodyFormat: 'html'` the body HTML is stored in `question.mediaUrl`.
 *
 * NOTE: dummy content is trusted here. Real, user-facing email HTML MUST be sanitized
 * before rendering (Phase 5) to avoid XSS.
 */
export function EmailCategory({ question }: CategoryRenderProps) {
  if (question.metadata.kind !== 'email') {
    return null;
  }
  const { subject, senderName, senderAddress, bodyFormat } = question.metadata;

  return (
    <div className="flex h-full w-full flex-col bg-white text-left text-zinc-900">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="text-sm font-semibold">{subject}</div>
        <div className="text-xs text-zinc-500">
          {senderName} &lt;{senderAddress}&gt;
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 text-sm leading-relaxed">
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
