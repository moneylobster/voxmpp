import type { Room } from '@/contexts/XMPPContext';
import { formatMessageTime } from '@/utils/xmpp-helpers';

interface RoomItemProps {
  room: Room;
  isActive: boolean;
  onTap: () => void;
}

function roomColor(jid: string): string {
  const colors = ['#0f766e', '#1d4ed8', '#7c3aed', '#be185d', '#b45309', '#064e3b'];
  let hash = 0;
  for (const ch of jid) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

export default function RoomItem({ room, isActive, onTap }: RoomItemProps) {
  const initial = (room.name || room.jid.split('@')[0]).slice(0, 1).toUpperCase();

  return (
    <button
      onClick={onTap}
      className={`
        w-full flex items-center gap-3 px-4 py-3.5 text-left
        transition-colors duration-150
        ${isActive ? 'bg-[var(--color-surface-2)]' : 'hover:bg-[var(--color-surface-1)]'}
      `}
    >
      {/* Room avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-white shrink-0"
        style={{ background: roomColor(room.jid) }}
      >
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-[15px] text-[var(--color-text-primary)] truncate">
            {room.name || room.jid.split('@')[0]}
          </span>
          {room.lastMessageTime && (
            <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
              {formatMessageTime(room.lastMessageTime)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[13px] text-[var(--color-text-muted)] truncate">
            {room.lastMessage ?? `${room.occupantCount} members`}
          </span>
          {room.unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[var(--color-amber-500)] text-[var(--color-surface-0)] text-[11px] font-bold px-1">
              {room.unreadCount > 99 ? '99+' : room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
