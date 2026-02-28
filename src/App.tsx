import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RosterPage from './pages/RosterPage';
import ChatPage from './pages/ChatPage';
import { useXMPPStore } from './contexts/XMPPContext';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useXMPPStore((s) => s.status);
  if (status !== 'connected' && status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
