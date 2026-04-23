import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Splash from './pages/Splash.jsx';
import RunsPage from './pages/RunsPage.jsx';
import RunDetail from './pages/RunDetail.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 14, color: '#aaa' }}>loading...</span>
    </div>
  );

  if (!user) return <Splash />;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>
      <Navbar />
      <Routes>
        <Route path="/"         element={<RunsPage />} />
        <Route path="/run/:id"  element={<RunDetail />} />
        <Route path="/reports"  element={<ReportsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}