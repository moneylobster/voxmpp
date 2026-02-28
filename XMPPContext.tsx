/**
 * XMPP Store — Zustand store that bridges @converse/headless events
 * into reactive state that React components can subscribe to.
 *
 * This is the heart of the app. @converse/headless fires events and
 * modifies Backbone-style models. We listen to those and mirror the
 * relevant state into Zustand, which triggers React re-renders.
 */

import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────

export interface Contact {
  jid: string;
  name: string;
  subscription: string;
  presence: 'online' | 'away' | 'dnd' | 'offline';
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  time: string;
  isMe: boolean;
  isEncrypted: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  oobUrl?: string; // out-of-band file URL
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticating'
  | 'authenticated'
  | 'error'
  | 'reconnecting';

export interface XMPPState {
  // Connection
  status: ConnectionStatus;
  myJid: string | null;
  error: string | null;

  // Roster
  contacts: Contact[];

  // Active chat
  activeChatJid: string | null;
  messages: Record<string, Message[]>; // keyed by bare JID

  // Actions (called from UI)
  connect: (jid: string, password: string, websocketUrl: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (to: string, body: string) => void;
  setActiveChat: (jid: string | null) => void;
  markRead: (jid: string) => void;

  // Internal actions (called from converse event handlers)
  _setStatus: (status: ConnectionStatus) => void;
  _setError: (error: string | null) => void;
  _setContacts: (contacts: Contact[]) => void;
  _addMessage: (jid: string, message: Message) => void;
  _updateContactPresence: (jid: string, presence: Contact['presence']) => void;
  _updateContactLastMessage: (jid: string, body: string, time: string) => void;
}

// ─── Store ───────────────────────────────────────────────────────

export const useXMPPStore = create<XMPPState>((set, get) => ({
  status: 'disconnected',
  myJid: null,
  error: null,
  contacts: [],
  activeChatJid: null,
  messages: {},

  connect: async (jid, password, websocketUrl) => {
    set({ status: 'connecting', error: null });

    try {
      // Dynamic import — @converse/headless is heavy, only load when needed
      const converse = (await import('@converse/headless')).default;

      converse.initialize({
        // Connection
        jid,
        password,
        websocket_url: websocketUrl,

        // Don't show any converse UI (we build our own)
        view_mode: 'embedded',
        auto_login: true,
        keepalive: true,

        // XEPs we want active
        message_carbons: true,
        mam_enabled: true,

        // Disable features we handle ourselves
        auto_away: 0,
        auto_reconnect: true,
        auto_register_muc_nickname: true,

        // Whitelist our bridging plugin
        whitelisted_plugins: ['vox-bridge'],
      });

      // Register our bridge plugin that syncs converse → zustand
      converse.plugins.add('vox-bridge', {
        initialize() {
          const { _converse } = this;
          const { api } = _converse;

          // ── Connection status ──
          api.listen.on('connected', () => {
            const myJid = api.connection.get()?.jid || jid;
            set({ status: 'connected', myJid });
          });

          api.listen.on('reconnected', () => set({ status: 'connected' }));
          api.listen.on('disconnected', () => set({ status: 'disconnected' }));

          // ── Roster ──
          api.listen.on('rosterContactsFetched', () => {
            syncRoster(api);
          });

          api.listen.on('presenceChanged', () => {
            syncRoster(api);
          });

          // ── Messages ──
          api.listen.on('message', (data: any) => {
            handleIncomingMessage(data, get().myJid);
          });

          api.listen.on('messageSend', (data: any) => {
            handleOutgoingMessage(data, get().myJid);
          });
        },
      });
    } catch (err: any) {
      set({ status: 'error', error: err.message || 'Connection failed' });
    }
  },

  disconnect: () => {
    // converse.api.user.logout();
    set({ status: 'disconnected', myJid: null, contacts: [], messages: {} });
  },

  sendMessage: async (to, body) => {
    try {
      const converse = (await import('@converse/headless')).default;
      const chat = await converse.api.chats.get(to, {}, true);
      if (chat) {
        chat.sendMessage({ body });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  },

  setActiveChat: (jid) => set({ activeChatJid: jid }),

  markRead: (jid) => {
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.jid === jid ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },

  // ── Internal setters ──
  _setStatus: (status) => set({ status }),
  _setError: (error) => set({ error }),
  _setContacts: (contacts) => set({ contacts }),

  _addMessage: (jid, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [jid]: [...(state.messages[jid] || []), message],
      },
    })),

  _updateContactPresence: (jid, presence) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.jid === jid ? { ...c, presence } : c
      ),
    })),

  _updateContactLastMessage: (jid, body, time) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.jid === jid
          ? {
              ...c,
              lastMessage: body,
              lastMessageTime: time,
              unreadCount:
                state.activeChatJid === jid ? 0 : c.unreadCount + 1,
            }
          : c
      ),
    })),
}));

// ─── Helper functions ────────────────────────────────────────────

async function syncRoster(api: any) {
  try {
    const rosterContacts = await api.contacts.get();
    const contacts: Contact[] = rosterContacts.map((c: any) => ({
      jid: c.get('jid'),
      name: c.get('fullname') || c.get('nickname') || c.get('jid').split('@')[0],
      subscription: c.get('subscription') || 'none',
      presence: mapPresence(c.presence?.get('show')),
      unreadCount: 0,
    }));
    useXMPPStore.getState()._setContacts(contacts);
  } catch (err) {
    console.error('Failed to sync roster:', err);
  }
}

function handleIncomingMessage(data: any, myJid: string | null) {
  const { stanza } = data;
  if (!stanza) return;

  const from = stanza.getAttribute('from')?.split('/')[0];
  const body = stanza.querySelector('body')?.textContent;
  if (!from || !body) return;

  const message: Message = {
    id: stanza.getAttribute('id') || crypto.randomUUID(),
    from,
    to: myJid || '',
    body,
    time: new Date().toISOString(),
    isMe: false,
    isEncrypted: false,
    status: 'delivered',
  };

  const store = useXMPPStore.getState();
  store._addMessage(from, message);
  store._updateContactLastMessage(from, body, message.time);
}

function handleOutgoingMessage(data: any, myJid: string | null) {
  const { message: attrs } = data;
  if (!attrs) return;

  const to = attrs.to?.split('/')[0];
  if (!to) return;

  const message: Message = {
    id: attrs.id || crypto.randomUUID(),
    from: myJid || '',
    to,
    body: attrs.body || '',
    time: new Date().toISOString(),
    isMe: true,
    isEncrypted: false,
    status: 'sent',
  };

  useXMPPStore.getState()._addMessage(to, message);
}

function mapPresence(show: string | undefined): Contact['presence'] {
  switch (show) {
    case 'chat':
    case undefined:
      return 'online';
    case 'away':
    case 'xa':
      return 'away';
    case 'dnd':
      return 'dnd';
    default:
      return 'offline';
  }
}
