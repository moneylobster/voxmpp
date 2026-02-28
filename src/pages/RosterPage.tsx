import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoster, useActiveChat, useXMPP } from '@/hooks/useXMPP';
import ContactItem from '@/components/ContactItem';
import { jidToLocal } from '@/utils/xmpp-helpers';

export default function RosterPage() {
  const navigate = useNavigate();
  const contacts = useRoster();
  const { activeChatJid, setActiveChat, markRead } = useActiveChat();
  const { myJid, status } = useXMPP();
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatJid, setNewChatJid] = useState('');

  const handleTapContact = (jid: string) => {
    setActiveChat(jid);
    markRead(jid);
    navigate(`/chat/${encodeURIComponent(jid)}`);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-surface-0)]">
      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-4 pb-3 bg-[var(--color-surface-0)]/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-amber-400)' }}
            >
              Vox
            </h1>
            {myJid && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {jidToLocal(myJid)}
                <span className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-[var(--color-online)]' : 'bg-[var(--color-offline)]'}`} />
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
              aria-label="New chat"
              onClick={() => setShowNewChat(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                <line x1="12" y1="8" x2="12" y2="14" />
                <line x1="9" y1="11" x2="15" y2="11" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
              aria-label="Settings"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
            </svg>
            <p className="text-sm">No contacts yet</p>
            <p className="text-xs mt-1 opacity-60">Add contacts to start chatting</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <ContactItem
              key={contact.jid}
              contact={contact}
              isActive={activeChatJid === contact.jid}
              onTap={() => handleTapContact(contact.jid)}
            />
          ))
        )}
      </div>
      {/* New Chat Modal */}
      {showNewChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNewChat(false)}
        >
          <div
            className="bg-[var(--color-surface-1)] rounded-2xl p-6 w-[90%] max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              New Chat
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const jid = newChatJid.trim();
                if (!jid) return;
                setShowNewChat(false);
                setNewChatJid('');
                navigate(`/chat/${encodeURIComponent(jid)}`);
              }}
            >
              <input
                autoFocus
                type="text"
                placeholder="user@example.com"
                value={newChatJid}
                onChange={(e) => setNewChatJid(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-[var(--color-amber-400)] mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  className="px-4 py-2 rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-amber-500)] text-black hover:bg-[var(--color-amber-400)] transition-colors"
                >
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
