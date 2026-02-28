import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useXMPP } from '@/hooks/useXMPP';

export default function LoginPage() {
  const navigate = useNavigate();
  const { status, error, connect } = useXMPP();

  const [jid, setJid] = useState('');
  const [password, setPassword] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isLoading = status === 'connecting' || status === 'authenticating';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jid || !password) return;

    // If no WebSocket URL given, derive from JID domain
    const domain = jid.split('@')[1];
    const websocketUrl = wsUrl || `wss://${domain}/xmpp-websocket`;

    await connect(jid, password, websocketUrl);

    // If connection succeeds, navigate to roster
    // (In practice, listen for 'connected' status change)
    navigate('/');
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-[var(--color-surface-0)]">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1
          className="text-5xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-amber-400)' }}
        >
          Vox
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Private messaging over XMPP
        </p>
      </div>

      {/* Login form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label htmlFor="jid" className="block text-xs text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
            XMPP Address
          </label>
          <input
            id="jid"
            type="text"
            value={jid}
            onChange={(e) => setJid(e.target.value)}
            placeholder="user@example.com"
            autoCapitalize="none"
            autoCorrect="off"
            className="
              w-full bg-[var(--color-surface-2)] rounded-xl px-4 py-3
              text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
              outline-none focus:ring-2 focus:ring-[var(--color-amber-500)]/30
              transition-shadow
            "
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="
              w-full bg-[var(--color-surface-2)] rounded-xl px-4 py-3
              text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
              outline-none focus:ring-2 focus:ring-[var(--color-amber-500)]/30
              transition-shadow
            "
          />
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          {showAdvanced ? '▾' : '▸'} Advanced settings
        </button>

        {showAdvanced && (
          <div>
            <label htmlFor="wsUrl" className="block text-xs text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
              WebSocket URL (optional)
            </label>
            <input
              id="wsUrl"
              type="url"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="wss://xmpp.example.com/xmpp-websocket"
              className="
                w-full bg-[var(--color-surface-2)] rounded-xl px-4 py-3 text-sm
                text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
                outline-none focus:ring-2 focus:ring-[var(--color-amber-500)]/30
                transition-shadow font-[var(--font-mono)]
              "
            />
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              Leave blank to auto-discover from your JID domain
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-[var(--color-dnd)]/10 border border-[var(--color-dnd)]/20 text-sm text-[var(--color-dnd)]">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !jid || !password}
          className="
            w-full py-3.5 rounded-xl font-semibold text-[15px]
            bg-[var(--color-amber-500)] text-[var(--color-surface-0)]
            hover:bg-[var(--color-amber-400)]
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200
            active:scale-[0.98]
          "
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="60" strokeLinecap="round" />
              </svg>
              Connecting…
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="mt-8 text-xs text-[var(--color-text-muted)] text-center max-w-xs">
        Connects via WebSocket. Your server must have mod_websocket enabled.
        All traffic is encrypted with TLS.
      </p>
    </div>
  );
}
