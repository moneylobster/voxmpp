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
	senderNick?: string; // nickname in group chat
}

export interface Room {
	jid: string;
	name: string;
	nick: string;
	subject?: string;
	occupantCount: number;
	unreadCount: number;
	lastMessage?: string;
	lastMessageTime?: string;
}

export interface RoomOccupant {
	nick: string;
	jid?: string;
	role: string;
	affiliation: string;
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

	// Rooms
	rooms: Room[];

	// Actions (called from UI)
	connect: (jid: string, password: string, websocketUrl: string) => Promise<void>;
	disconnect: () => void;
	sendMessage: (to: string, body: string) => void;
	fetchMessages: (jid: string) => Promise<void>;
	setActiveChat: (jid: string | null) => void;
	markRead: (jid: string) => void;

	// Room actions
	joinRoom: (roomJid: string, nick: string) => Promise<void>;
	leaveRoom: (roomJid: string) => Promise<void>;
	createRoom: (roomJid: string, nick: string, config: { name?: string; persistent?: boolean; membersOnly?: boolean; description?: string }) => Promise<void>;
	sendRoomMessage: (roomJid: string, body: string) => void;
	fetchRoomMessages: (roomJid: string) => Promise<void>;
	getRoomOccupants: (roomJid: string) => Promise<RoomOccupant[]>;

	// Internal actions (called from converse event handlers)
	_setStatus: (status: ConnectionStatus) => void;
	_setError: (error: string | null) => void;
	_setContacts: (contacts: Contact[]) => void;
	_addMessage: (jid: string, message: Message) => void;
	_updateContactPresence: (jid: string, presence: Contact['presence']) => void;
	_updateContactLastMessage: (jid: string, body: string, time: string) => void;
	_setRooms: (rooms: Room[]) => void;
	_updateRoomLastMessage: (jid: string, body: string, time: string) => void;
}

// ─── Credentials persistence ─────────────────────────────────────

const CREDS_KEY = 'vox-credentials';

export interface StoredCredentials {
	jid: string;
	websocketUrl: string;
}

export function loadStoredCredentials(): StoredCredentials | null {
	try {
		const raw = localStorage.getItem(CREDS_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function saveCredentials(creds: StoredCredentials) {
	localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

function clearCredentials() {
	localStorage.removeItem(CREDS_KEY);
}

// ─── Converse API cache ──────────────────────────────────────────

let converseApi: any = null;

// ─── Store ───────────────────────────────────────────────────────

export const useXMPPStore = create<XMPPState>((set, get) => ({
	status: 'disconnected',
	myJid: null,
	error: null,
	contacts: [],
	activeChatJid: null,
	messages: {},
	rooms: [],

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
						saveCredentials({ jid, websocketUrl });
						// Sync joined rooms after connection
						setTimeout(() => syncRooms(api), 1000);
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
						const stanza = data?.stanza;
						if (stanza?.getAttribute('type') === 'groupchat') {
							handleGroupMessage(data, get().myJid);
						} else {
							handleIncomingMessage(data, get().myJid);
						}
					});

					// Outgoing messages are added optimistically in sendMessage()
				},
			}); } catch (_) { /* already registered after HMR */ }

			const hasPassword = !!password;
			await converse.initialize({
				jid,
				...(hasPassword ? { password } : {}),
				websocket_url: websocketUrl,

				view_mode: 'embedded',
				auto_login: hasPassword,
				keepalive: true,

				message_carbons: true,
				mam_enabled: true,

				auto_away: 0,
				auto_reconnect: true,
				auto_register_muc_nickname: true,

				// OMEMO
				omemo_default: true,

				whitelisted_plugins: ['vox-bridge', 'converse-profile'],
			});

			// If restoring session (no password), give it time then check
			if (!hasPassword) {
				setTimeout(() => {
					if (get().status !== 'connected') {
						clearCredentials();
						set({ status: 'disconnected' });
					}
				}, 5000);
			}
		} catch (err: any) {
			if (!password) {
				clearCredentials();
			}
			set({ status: 'error', error: err.message || 'Connection failed' });
		}
	},

	disconnect: () => {
		clearCredentials();
		converseApi = null;
		set({ status: 'disconnected', myJid: null, contacts: [], messages: {}, rooms: [] });
	},

	sendMessage: async (to, body) => {
		try {
			if (!converseApi) throw new Error('Not connected');

			// Add to store immediately so UI updates instantly
			const myJid = get().myJid;
			const msg: Message = {
				id: crypto.randomUUID(),
				from: myJid || '',
				to,
				body,
				time: new Date().toISOString(),
				isMe: true,
				isEncrypted: false,
				status: 'sending',
			};
			get()._addMessage(to, msg);

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
				.filter((m: any) => m.get('body') || m.get('plaintext'))
				.map((m: any) => ({
					id: m.get('origin_id') || m.get('msgid') || m.id || crypto.randomUUID(),
					from: m.get('from')?.split('/')[0] || '',
					to: m.get('to')?.split('/')[0] || '',
					body: m.get('plaintext') || m.get('body'),
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
						unreadCount: state.activeChatJid === jid ? 0 : c.unreadCount + 1,
					}
					: c
			),
		})),

	_setRooms: (rooms) => set({ rooms }),

	_updateRoomLastMessage: (jid, body, time) =>
		set((state) => ({
			rooms: state.rooms.map((r) =>
				r.jid === jid
					? {
						...r,
						lastMessage: body,
						lastMessageTime: time,
						unreadCount: state.activeChatJid === jid ? 0 : r.unreadCount + 1,
					}
					: r
			),
		})),

	// ── Room actions ──
	joinRoom: async (roomJid, nick) => {
		try {
			if (!converseApi) throw new Error('Not connected');
			await converseApi.rooms.get(roomJid, { nick }, true);
			await syncRooms(converseApi);
		} catch (err) {
			console.error('Failed to join room:', err);
		}
	},

	leaveRoom: async (roomJid) => {
		try {
			if (!converseApi) throw new Error('Not connected');
			const room = await converseApi.rooms.get(roomJid);
			if (room) {
				await room.leave();
			}
			set((state) => ({
				rooms: state.rooms.filter((r) => r.jid !== roomJid),
			}));
		} catch (err) {
			console.error('Failed to leave room:', err);
		}
	},

	createRoom: async (roomJid, nick, config) => {
		try {
			if (!converseApi) throw new Error('Not connected');
			await converseApi.rooms.get(roomJid, {
				nick,
				roomconfig: {
					roomname: config.name || roomJid.split('@')[0],
					persistentroom: config.persistent ?? true,
					membersonly: config.membersOnly ?? false,
					roomdesc: config.description || '',
				},
			}, true);
			await syncRooms(converseApi);
		} catch (err) {
			console.error('Failed to create room:', err);
		}
	},

	sendRoomMessage: async (roomJid, body) => {
		try {
			if (!converseApi) throw new Error('Not connected');

			const myJid = get().myJid;
			const msg: Message = {
				id: crypto.randomUUID(),
				from: myJid || '',
				to: roomJid,
				body,
				time: new Date().toISOString(),
				isMe: true,
				isEncrypted: false,
				status: 'sending',
			};
			get()._addMessage(roomJid, msg);

			const room = await converseApi.rooms.get(roomJid);
			if (room) {
				room.sendMessage({ body });
			}
		} catch (err) {
			console.error('Failed to send room message:', err);
		}
	},

	fetchRoomMessages: async (roomJid) => {
		try {
			if (!converseApi) return;
			const room = await converseApi.rooms.get(roomJid);
			if (!room) return;

			await room.messages?.fetched;

			const myJid = get().myJid;
			const myNick = room.get?.('nick');
			const models = room.messages?.models ?? [];
			const msgs: Message[] = models
				.filter((m: any) => m.get('body') || m.get('plaintext'))
				.map((m: any) => {
					const nick = m.get('nick') || m.get('from')?.split('/')[1] || '';
					const isMine = m.get('sender') === 'me' || nick === myNick;
					return {
						id: m.get('origin_id') || m.get('msgid') || m.id || crypto.randomUUID(),
						from: m.get('from')?.split('/')[0] || '',
						to: roomJid,
						body: m.get('plaintext') || m.get('body'),
						time: m.get('time') || new Date().toISOString(),
						isMe: isMine,
						isEncrypted: m.get('is_encrypted') || false,
						status: 'delivered' as const,
						senderNick: isMine ? undefined : nick,
					};
				});

			if (msgs.length > 0) {
				set((state) => ({
					messages: {
						...state.messages,
						[roomJid]: msgs,
					},
				}));
			}
		} catch (err) {
			console.error('Failed to fetch room messages:', err);
		}
	},

	getRoomOccupants: async (roomJid) => {
		try {
			if (!converseApi) return [];
			const room = await converseApi.rooms.get(roomJid);
			if (!room) return [];
			const models = room.occupants?.models ?? [];
			return models.map((o: any) => ({
				nick: o.get('nick') || '',
				jid: o.get('jid') || undefined,
				role: o.get('role') || 'none',
				affiliation: o.get('affiliation') || 'none',
			}));
		} catch (err) {
			console.error('Failed to get room occupants:', err);
			return [];
		}
	},
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

async function syncRooms(api: any) {
	try {
		const roomModels = await api.rooms.get();
		if (!Array.isArray(roomModels)) return;
		const rooms: Room[] = roomModels.map((r: any) => ({
			jid: r.get('jid'),
			name: r.get('name') || r.get('jid')?.split('@')[0] || '',
			nick: r.get('nick') || '',
			subject: r.get('subject')?.text ?? undefined,
			occupantCount: r.occupants?.length ?? 0,
			unreadCount: 0,
		}));
		useXMPPStore.getState()._setRooms(rooms);
	} catch (err) {
		console.error('Failed to sync rooms:', err);
	}
}

function handleGroupMessage(data: any, myJid: string | null) {
	const { stanza } = data;
	if (!stanza) return;

	const fullFrom = stanza.getAttribute('from') || '';
	const roomJid = fullFrom.split('/')[0];
	const senderNick = fullFrom.split('/')[1] || '';
	const body = stanza.querySelector('body')?.textContent;
	if (!roomJid || !body) return;

	// Check if this is our own message (reflected back by the MUC)
	const myBareJid = myJid?.split('/')[0];
	// We can't reliably detect own messages from stanza alone in MUC,
	// so we skip — the optimistic add in sendRoomMessage handles it.
	// MUC reflects our messages back, so we need to check the nick.
	// For now, don't add — fetchRoomMessages will reconcile.

	const store = useXMPPStore.getState();
	store._updateRoomLastMessage(roomJid, body, new Date().toISOString());
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
