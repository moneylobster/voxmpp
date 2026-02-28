# Vox — Modern XMPP Client with WebSocket Support

A mobile-first XMPP chat client built on `@converse/headless`, designed for
servers behind Cloudflare Tunnels (WebSocket-only connectivity).

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Capacitor                      │
│  (Native Android/iOS shell — push, filesystem)   │
├─────────────────────────────────────────────────┤
│               React UI (Vite)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Pages   │ │Components│ │   Hooks/Context   │ │
│  │ Login    │ │ ChatBub  │ │ useXMPP()         │ │
│  │ Roster   │ │ Avatar   │ │ useRoster()       │ │
│  │ Chat     │ │ Compose  │ │ useChat()         │ │
│  │ Settings │ │ Status   │ │ usePresence()     │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────┤
│             @converse/headless                   │
│  ┌────────────────────────────────────────────┐  │
│  │ XMPP Core: auth, roster, messaging, MAM,  │  │
│  │ OMEMO, carbons, file upload, presence      │  │
│  ├────────────────────────────────────────────┤  │
│  │ Transport: WebSocket (wss://) via strophe  │  │
│  └────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│          Cloudflare Tunnel (wss://)              │
├─────────────────────────────────────────────────┤
│            Prosody XMPP Server                   │
└─────────────────────────────────────────────────┘
```

## Stack

| Layer           | Technology                              |
|-----------------|-----------------------------------------|
| XMPP Protocol   | `@converse/headless` + `strophe.js`    |
| UI Framework     | React 19 + TypeScript                  |
| Build Tool       | Vite                                   |
| Styling          | Tailwind CSS 4                         |
| State            | Zustand (lightweight, no boilerplate)  |
| Native Wrapper   | Capacitor 6 (Android + iOS)            |
| Push             | Capacitor Push Notifications + FCM     |

## Quick Start

```bash
# Install dependencies
npm install

# Development server (web)
npm run dev

# Build for production
npm run build

# Add native platforms
npx cap add android
npx cap add ios

# Sync web assets to native projects
npx cap sync

# Open in Android Studio / Xcode
npx cap open android
npx cap open ios
```

## Project Structure

```
src/
├── main.tsx                 # App entrypoint
├── App.tsx                  # Router + layout
├── contexts/
│   └── XMPPContext.tsx       # Headless converse bridge
├── hooks/
│   ├── useXMPP.ts           # Connection management
│   ├── useRoster.ts         # Contact list
│   ├── useChat.ts           # Messages for a JID
│   └── usePresence.ts       # Online/offline status
├── pages/
│   ├── LoginPage.tsx        # Authentication
│   ├── RosterPage.tsx       # Contact/conversation list
│   ├── ChatPage.tsx         # Conversation view
│   └── SettingsPage.tsx     # Account & app settings
├── components/
│   ├── MessageBubble.tsx    # Single message display
│   ├── ComposeBar.tsx       # Message input + send
│   ├── Avatar.tsx           # User avatar
│   ├── ContactItem.tsx      # Roster list item
│   └── StatusBadge.tsx      # Presence indicator
├── styles/
│   └── index.css            # Tailwind + custom tokens
└── utils/
    └── xmpp-helpers.ts      # JID parsing, time formatting
```

## Key Design Decisions

### Why @converse/headless?
It provides a complete, battle-tested XMPP implementation including
WebSocket transport, OMEMO encryption, MAM, carbons, file upload,
and dozens of XEPs — without any UI. We only build the frontend.

### Why WebSocket?
Standard XMPP uses raw TCP on ports 5222/5269. Behind CGNAT with
Cloudflare Tunnels, only HTTP(S) traffic passes through. WebSocket
(`wss://`) upgrades from HTTPS, tunneling perfectly through Cloudflare.

### Why Capacitor over React Native?
Capacitor wraps a real web app in a native shell. Since our XMPP
logic is already web-based (strophe.js, @converse/headless), there's
zero rewrite. We get native push notifications, filesystem access,
and app store distribution while keeping one codebase.

### Why Zustand over Redux/Context?
Zustand is tiny (~1KB), has no boilerplate, works outside React
components (important for XMPP event handlers that fire from
strophe.js callbacks), and supports subscriptions with selectors
for efficient re-renders.

## WebSocket Configuration

The app connects via WebSocket, discovered through XEP-0156:

1. App fetches `https://example.com/.well-known/host-meta.json`
2. Finds `urn:xmpp:alt-connections:websocket` → `wss://example.com/xmpp-websocket`
3. Connects via strophe.js WebSocket transport

Or configured directly:
```js
websocket_url: 'wss://xmpp.example.com/xmpp-websocket'
```

## Server Setup (Prosody behind Cloudflare Tunnel)

```yaml
# cloudflared config.yml
ingress:
  - hostname: xmpp.example.com
    service: http://localhost:5280
  - service: http_status:404
```

```lua
-- prosody.cfg.lua
modules_enabled = { "websocket"; "bosh"; }
cross_domain_websocket = true
consider_websocket_secure = true
trusted_proxies = { "127.0.0.1", "::1" }
```

Serve `/.well-known/host-meta.json` on your domain:
```json
{
  "links": [
    {
      "rel": "urn:xmpp:alt-connections:websocket",
      "href": "wss://xmpp.example.com/xmpp-websocket"
    }
  ]
}
```

## Roadmap

- [x] Project architecture
- [ ] XMPP connection via WebSocket
- [ ] Login / authentication
- [ ] Roster display with presence
- [ ] 1:1 chat with message history (MAM)
- [ ] Message carbons (multi-device)
- [ ] HTTP file upload (images)
- [ ] OMEMO encryption
- [ ] Push notifications (FCM/APNs via Capacitor)
- [ ] Group chat (MUC)
- [ ] Voice/video calls (Jingle + WebRTC)
- [ ] iOS build
- [ ] F-Droid / Play Store release
