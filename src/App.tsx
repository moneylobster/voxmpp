import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RosterPage from './pages/RosterPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import RoomPage from './pages/RoomPage';
import { useXMPPStore } from './contexts/XMPPContext';
import { loadStoredCredentials } from './contexts/XMPPContext';
import { useNotifications } from './hooks/useNotifications';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useXMPPStore((s) => s.status);

  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-surface-0)]">
        <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
          <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="60" strokeLinecap="round" />
          </svg>
          <span className="text-sm">Reconnecting…</span>
        </div>
      </div>
    );
  }

  if (status !== 'connected' && status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function NotificationSetup() {
  const navigate = useNavigate();
  useNotifications(navigate);
  return null;
}

function AutoConnect() {
  const status = useXMPPStore((s) => s.status);
  const connect = useXMPPStore((s) => s.connect);

  useEffect(() => {
    if (status !== 'disconnected') return;
    const creds = loadStoredCredentials();
    if (creds) {
      connect(creds.jid, '', creds.websocketUrl);
    }
  }, []);  // only on mount

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AutoConnect />
      <NotificationSetup />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <RosterPage />
            </RequireAuth>
          }
        />
        <Route
          path="/chat/:jid"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
        <Route
          path="/room/:jid"
          element={
            <RequireAuth>
              <RoomPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
