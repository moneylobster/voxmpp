import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat, useActiveChat, useRoomActions } from '@/hooks/useXMPP';
import { useXMPPStore, type RoomOccupant } from '@/contexts/XMPPContext';
import MessageBubble from '@/components/MessageBubble';
import ComposeBar from '@/components/ComposeBar';
import { shouldGroupMessages } from '@/utils/xmpp-helpers';

export default function RoomPage() {
  const { jid } = useParams<{ jid: string }>();
  const navigate = useNavigate();
  const decodedJid = jid ? decodeURIComponent(jid) : null;

  const messages = useChat(decodedJid);
  const { sendRoomMessage, fetchRoomMessages, leaveRoom, getRoomOccupants } = useRoomActions();
  const { setActiveChat, markRead } = useActiveChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showOccupants, setShowOccupants] = useState(false);
  const [occupants, setOccupants] = useState<RoomOccupant[]>([]);

  const room = useXMPPStore((s) =>
    s.rooms.find((r) => r.jid === decodedJid)
  );

  const displayName = room?.name || (decodedJid ? decodedJid.split('@')[0] : 'Room');

  // Set active chat on mount, fetch messages, clear on unmount
  useEffect(() => {
    if (decodedJid) {
      setActiveChat(decodedJid);
      markRead(decodedJid);
      fetchRoomMessages(decodedJid);
      const interval = setInterval(() => fetchRoomMessages(decodedJid), 10_000);
      return () => {
        clearInterval(interval);
        setActiveChat(null);
      };
    }
    return () => setActiveChat(null);
  }, [decodedJid, setActiveChat, markRead, fetchRoomMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = (body: string) => {
    if (decodedJid) {
      sendRoomMessage(decodedJid, body);
    }
  };

  const handleLeave = async () => {
    if (decodedJid) {
      await leaveRoom(decodedJid);
      navigate('/');
    }
  };

  const handleToggleOccupants = async () => {
    if (!showOccupants && decodedJid) {
      const occ = await getRoomOccupants(decodedJid);
      setOccupants(occ);
    }
    setShowOccupants(!showOccupants);
  };

  return (
    <div className="h-dvh flex flex-col bg-[var(--color-surface-0)]">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-3 py-2.5 bg-[var(--color-surface-0)]/95 backdrop-blur-lg border-b border-white/5">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors -ml-1"
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--color-text-primary)] truncate text-[15px]">
            {displayName}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {room?.occupantCount ?? 0} members
            {room?.subject && ` · ${room.subject}`}
          </p>
        </div>

        {/* Occupants toggle */}
        <button
          onClick={handleToggleOccupants}
          className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
          aria-label="Show members"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </button>

        {/* Leave button */}
        <button
          onClick={handleLeave}
          className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-dnd)] hover:bg-[var(--color-surface-2)] transition-colors"
          aria-label="Leave room"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] opacity-60">
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const isGrouped = shouldGroupMessages(prev, msg);
              const isLastInGroup = !shouldGroupMessages(msg, next);

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isGrouped={isGrouped}
                  showTimestamp={isLastInGroup}
                  showSenderNick={!msg.isMe && !isGrouped}
                />
              );
            })
          )}
        </div>

        {/* Occupant drawer */}
        {showOccupants && (
          <div className="w-56 border-l border-white/5 bg-[var(--color-surface-1)] overflow-y-auto shrink-0">
            <div className="p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                Members ({occupants.length})
              </h3>
              {occupants.map((o) => (
                <div key={o.nick} className="flex items-center gap-2 py-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-surface-3)] flex items-center justify-center text-xs font-medium text-[var(--color-text-secondary)]">
                    {o.nick.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--color-text-primary)] truncate">{o.nick}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] capitalize">{o.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Compose */}
      <ComposeBar onSend={handleSend} />
    </div>
  );
}
