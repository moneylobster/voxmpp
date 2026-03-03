import type { Message } from '@/contexts/XMPPContext';
import { formatMessageTime } from '@/utils/xmpp-helpers';

function nickColor(nick: string): string {
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'];
  let hash = 0;
  for (const ch of nick) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

interface MessageBubbleProps {
  message: Message;
  isGrouped: boolean; // part of a consecutive group from same sender
  showTimestamp: boolean;
  showSenderNick?: boolean;
}

export default function MessageBubble({ message, isGrouped, showTimestamp, showSenderNick }: MessageBubbleProps) {
  const isMe = message.isMe;

  return (
    <div
      className={`
        msg-enter flex flex-col
        ${isMe ? 'items-end' : 'items-start'}
        ${isGrouped ? 'mt-0.5' : 'mt-3'}
      `}
    >
      <div
        className={`
          max-w-[82%] px-4 py-2.5 text-[15px] leading-relaxed
          ${isMe ? 'bubble-sent' : 'bubble-received'}
          ${message.isEncrypted ? 'border border-[var(--color-amber-600)]/20' : ''}
        `}
      >
        {/* Sender nick for group chats */}
        {showSenderNick && message.senderNick && (
          <p className="text-[12px] font-medium mb-0.5" style={{ color: nickColor(message.senderNick) }}>
            {message.senderNick}
          </p>
        )}

        {/* Encryption indicator */}
        {message.isEncrypted && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-amber-400)] mb-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
            </svg>
            encrypted
          </span>
        )}

        {/* File attachment */}
        {message.oobUrl && <FileAttachment url={message.oobUrl} />}

        {message.body && message.body !== message.oobUrl ? (
          <p className="text-[var(--color-text-primary)] whitespace-pre-wrap break-words">
            {message.body}
          </p>
        ) : message.isEncrypted && !message.body && !message.oobUrl ? (
          <p className="text-[var(--color-text-muted)] text-[13px] italic">
            Unable to decrypt
          </p>
        ) : null}
      </div>

      {showTimestamp && (
        <span
          className={`
            text-[11px] text-[var(--color-text-muted)] mt-1 px-1
            ${isMe ? 'mr-1' : 'ml-1'}
          `}
        >
          {formatMessageTime(message.time)}
          {isMe && (
            <span className="ml-1.5">
              {message.status === 'sending' && '○'}
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && (
                <span className="text-[var(--color-amber-400)]">✓✓</span>
              )}
              {message.status === 'error' && (
                <span className="text-[var(--color-dnd)]">!</span>
              )}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(url);
}

function getFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split('/').pop() || 'file');
  } catch {
    return 'file';
  }
}

function FileAttachment({ url }: { url: string }) {
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt="Shared image"
          className="rounded-lg max-w-full max-h-[300px] object-contain cursor-pointer"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-[var(--color-text-secondary)]">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="text-sm text-[var(--color-text-primary)] truncate underline">
        {getFileName(url)}
      </span>
    </a>
  );
}
