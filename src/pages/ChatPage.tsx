import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat, useSendMessage, useActiveChat, useFetchMessages, useFileUpload } from '@/hooks/useXMPP';
import { useXMPPStore } from '@/contexts/XMPPContext';
import MessageBubble from '@/components/MessageBubble';
import ComposeBar from '@/components/ComposeBar';
import Avatar from '@/components/Avatar';
import { shouldGroupMessages, jidToLocal } from '@/utils/xmpp-helpers';

export default function ChatPage() {
  const { jid } = useParams<{ jid: string }>();
  const navigate = useNavigate();
  const decodedJid = jid ? decodeURIComponent(jid) : null;

  const messages = useChat(decodedJid);
  const sendMessage = useSendMessage();
  const fetchMessages = useFetchMessages();
  const { sendFileMessage } = useFileUpload();
  const { setActiveChat, markRead } = useActiveChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find contact info from store
  const contact = useXMPPStore((s) =>
    s.contacts.find((c) => c.jid === decodedJid)
  );

  const displayName = contact?.name || (decodedJid ? jidToLocal(decodedJid) : 'Chat');

  // Set active chat on mount, fetch history, poll periodically, clear on unmount
  useEffect(() => {
    if (decodedJid) {
      setActiveChat(decodedJid);
      markRead(decodedJid);
      fetchMessages(decodedJid);
      const interval = setInterval(() => fetchMessages(decodedJid), 10_000);
      return () => {
        clearInterval(interval);
        setActiveChat(null);
      };
    }
    return () => setActiveChat(null);
  }, [decodedJid, setActiveChat, markRead, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = (body: string) => {
    if (decodedJid) {
      sendMessage(decodedJid, body);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (decodedJid) {
      await sendFileMessage(decodedJid, file);
    }
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

        {decodedJid && (
          <Avatar
            jid={decodedJid}
            name={displayName}
            size="sm"
            presence={contact?.presence}
          />
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--color-text-primary)] truncate text-[15px]">
            {displayName}
          </p>
          {contact?.presence && contact.presence !== 'offline' && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {contact.presence === 'online' && 'Online'}
              {contact.presence === 'away' && 'Away'}
              {contact.presence === 'dnd' && 'Do not disturb'}
            </p>
          )}
        </div>

        {/* Chat actions */}
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
          aria-label="More options"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] opacity-60">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Say hello 👋</p>
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
              />
            );
          })
        )}
      </div>

      {/* Compose */}
      <ComposeBar onSend={handleSend} onFileSelect={handleFileSelect} />
    </div>
  );
}
