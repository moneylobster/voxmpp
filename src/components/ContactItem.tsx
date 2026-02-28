import type { Contact } from '@/contexts/XMPPContext';
import Avatar from './Avatar';
import { formatMessageTime } from '@/utils/xmpp-helpers';

interface ContactItemProps {
  contact: Contact;
  isActive: boolean;
  onTap: () => void;
}

export default function ContactItem({ contact, isActive, onTap }: ContactItemProps) {
  return (
    <button
      onClick={onTap}
      className={`
        w-full flex items-center gap-3 px-4 py-3.5 text-left
        transition-colors duration-150
        ${isActive ? 'bg-[var(--color-surface-2)]' : 'hover:bg-[var(--color-surface-1)]'}
      `}
    >
      <Avatar
        jid={contact.jid}
        name={contact.name}
        size="md"
        presence={contact.presence}
        avatarUrl={contact.avatarUrl}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-[15px] text-[var(--color-text-primary)] truncate">
            {contact.name}
          </span>
          {contact.lastMessageTime && (
            <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
              {formatMessageTime(contact.lastMessageTime)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[13px] text-[var(--color-text-muted)] truncate">
            {contact.lastMessage ?? contact.jid}
          </span>
          {contact.unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[var(--color-amber-500)] text-[var(--color-surface-0)] text-[11px] font-bold px-1">
              {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
