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
  fetchMessages: (jid: string) => Promise<void>;
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

// Cached reference to the converse api, set during plugin init
let converseApi: any = null;

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

      // Register bridge plugin BEFORE initialize (skip if already registered after HMR)
      try { converse.plugins.add('vox-bridge', {
        initialize() {
          const { _converse } = this;
          const { api } = _converse;
          converseApi = api;

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

          api.listen.on('sendMessage', (data: any) => {
            handleOutgoingMessage(data, get().myJid);
          });
        },
      }); } catch (_) { /* already registered after HMR */ }

      await converse.initialize({
        jid,
        password,
        websocket_url: websocketUrl,

        view_mode: 'embedded',
        auto_login: true,
        keepalive: true,

        message_carbons: true,
        mam_enabled: true,

        auto_away: 0,
        auto_reconnect: true,
        auto_register_muc_nickname: true,

        // OMEMO
        omemo_default: true,

        whitelisted_plugins: ['vox-bridge'],
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
      if (!converseApi) throw new Error('Not connected');
      const chat = await converseApi.chats.get(to, {}, true);
      if (chat) {
        chat.sendMessage({ body });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  },

  fetchMessages: async (jid) => {
    try {
      if (!converseApi) return;
      // Open/get the chatbox — this triggers converse's built-in MAM fetch
      const chat = await converseApi.chats.get(jid, {}, true);
      if (!chat) return;

      // Wait for messages to be fetched
      await chat.messages?.fetched;

      const myJid = get().myJid;
      const models = chat.messages?.models ?? [];
      const msgs: Message[] = models
        .filter((m: any) => m.get('body'))
        .map((m: any) => ({
          id: m.get('origin_id') || m.get('msgid') || m.id || crypto.randomUUID(),
          from: m.get('from')?.split('/')[0] || '',
          to: m.get('to')?.split('/')[0] || '',
          body: m.get('body'),
          time: m.get('time') || new Date().toISOString(),
          isMe: m.get('sender') === 'me' || m.get('from')?.split('/')[0] === myJid?.split('/')[0],
          isEncrypted: m.get('is_encrypted') || false,
          status: m.get('received') ? 'delivered' : 'sent',
        }));

      if (msgs.length > 0) {
        set((state) => ({
          messages: {
            ...state.messages,
            [jid]: msgs,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
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
  const model = data?.message;
  const chatbox = data?.chatbox;
  if (!model) return;

  // The bare JID comes from the chatbox id, which is the reliable source
  const to = chatbox?.get?.('jid') || chatbox?.id || model.get?.('to')?.split('/')[0];
  const body = model.get?.('body') || model.get?.('message');
  if (!to || !body) return;

  const message: Message = {
    id: model.get?.('origin_id') || model.get?.('msgid') || model.id || crypto.randomUUID(),
    from: myJid || '',
    to,
    body,
    time: model.get?.('time') || new Date().toISOString(),
    isMe: true,
    isEncrypted: model.get?.('is_encrypted') || false,
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
