import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useXMPP } from '@/hooks/useXMPP';

function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem('vox-theme') as 'light' | null) === 'light' ? 'light' : 'dark';
}

function setTheme(theme: 'dark' | 'light') {
  localStorage.setItem('vox-theme', theme);
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { myJid, status, disconnect } = useXMPP();
  const [theme, setThemeState] = useState(getTheme);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    // Initialize theme attribute on mount
    const current = getTheme();
    if (current === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  useEffect(() => {
    // Try to get OMEMO fingerprint
    (async () => {
      try {
        const converse = (await import('@converse/headless')).default;
        const omemoStore = (converse as any).env?._converse?.omemo_store;
        if (omemoStore) {
          const fp = omemoStore.get('identity_keypair')?.pubKey;
          if (fp) {
            const bytes = new Uint8Array(fp);
            setFingerprint(
              Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                .join(':')
            );
          }
        }
      } catch {
        // OMEMO not available
      }
    })();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  };

  const handleLogout = () => {
    disconnect();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-surface-0)]">
      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-4 pb-3 bg-[var(--color-surface-0)]/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Settings
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Account Info */}
        <section className="bg-[var(--color-surface-1)] rounded-2xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-primary)]">{myJid || 'Not connected'}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">JID</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-[var(--color-online)]' : 'bg-[var(--color-offline)]'}`}
              />
              <span className="text-xs text-[var(--color-text-secondary)] capitalize">{status}</span>
            </div>
          </div>
        </section>

        {/* Theme */}
        <section className="bg-[var(--color-surface-1)] rounded-2xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-primary)]">Theme</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{theme === 'dark' ? 'Dark' : 'Light'} mode</p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-12 h-7 rounded-full transition-colors"
              style={{ backgroundColor: theme === 'light' ? 'var(--color-amber-500)' : 'var(--color-surface-3)' }}
              aria-label="Toggle theme"
            >
              <span
                className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
                style={{ left: theme === 'light' ? 'calc(100% - 1.625rem)' : '0.125rem' }}
              />
            </button>
          </div>
        </section>

        {/* OMEMO */}
        <section className="bg-[var(--color-surface-1)] rounded-2xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Encryption</h2>
          <div>
            <p className="text-sm text-[var(--color-text-primary)] mb-1">OMEMO Fingerprint</p>
            {fingerprint ? (
              <p className="text-xs font-mono text-[var(--color-text-secondary)] break-all leading-relaxed">
                {fingerprint}
              </p>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">Not available</p>
            )}
          </div>
        </section>

        {/* Logout */}
        <section className="bg-[var(--color-surface-1)] rounded-2xl p-4">
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Log Out
          </button>
        </section>
      </div>
    </div>
  );
}
