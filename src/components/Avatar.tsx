import type { Contact } from '@/contexts/XMPPContext';
import { jidToLocal } from '@/utils/xmpp-helpers';

interface AvatarProps {
  jid: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  presence?: Contact['presence'];
  avatarUrl?: string;
}

const sizeMap = {
  sm: { outer: 'w-9 h-9', text: 'text-sm', dot: 'w-2.5 h-2.5 border-[1.5px]' },
  md: { outer: 'w-11 h-11', text: 'text-base', dot: 'w-3 h-3 border-2' },
  lg: { outer: 'w-14 h-14', text: 'text-lg', dot: 'w-3.5 h-3.5 border-2' },
};

const presenceColor: Record<string, string> = {
  online: 'bg-[var(--color-online)]',
  away: 'bg-[var(--color-away)]',
  dnd: 'bg-[var(--color-dnd)]',
  offline: 'bg-[var(--color-offline)]',
};

/** Generate a stable background colour from a JID */
function jidColor(jid: string): string {
  const colors = ['#b45309', '#0f766e', '#1d4ed8', '#7c3aed', '#be185d', '#064e3b'];
  let hash = 0;
  for (const ch of jid) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ jid, name, size = 'md', presence, avatarUrl }: AvatarProps) {
  const { outer, text, dot } = sizeMap[size];
  const initials = (name || jidToLocal(jid)).slice(0, 1).toUpperCase();

  return (
    <div className={`relative shrink-0 ${outer}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${outer} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${outer} rounded-full flex items-center justify-center font-semibold text-white ${text}`}
          style={{ background: jidColor(jid) }}
        >
          {initials}
        </div>
      )}

      {presence && presence !== 'offline' && (
        <span
          className={`absolute bottom-0 right-0 ${dot} rounded-full border-[var(--color-surface-0)] ${presenceColor[presence] ?? 'bg-[var(--color-offline)]'}`}
        />
      )}
    </div>
  );
}
