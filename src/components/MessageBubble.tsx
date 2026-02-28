import type { Message } from '@/contexts/XMPPContext';
import { formatMessageTime } from '@/utils/xmpp-helpers';

interface MessageBubbleProps {
  message: Message;
  isGrouped: boolean; // part of a consecutive group from same sender
  showTimestamp: boolean;
}

export default function MessageBubble({ message, isGrouped, showTimestamp }: MessageBubbleProps) {
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
        {/* Encryption indicator */}
        {message.isEncrypted && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-amber-400)] mb-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
            </svg>
            encrypted
          </span>
        )}

        <p className="text-[var(--color-text-primary)] whitespace-pre-wrap break-words">
          {message.body}
        </p>
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
