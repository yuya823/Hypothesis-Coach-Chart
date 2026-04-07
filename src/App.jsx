import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientListPage from './pages/ClientListPage';
import ClientDetailPage from './pages/ClientDetailPage';
import IntakeFormPage from './pages/IntakeFormPage';
import ObservationPage from './pages/ObservationPage';
import HypothesisPage from './pages/HypothesisPage';
import InterventionPage from './pages/InterventionPage';
import SessionHistoryPage from './pages/SessionHistoryPage';
import MediaComparisonPage from './pages/MediaComparisonPage';
import StaffReviewPage from './pages/StaffReviewPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';

// Auth Context
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--color-text-tertiary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>H</div>
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const user = session && profile ? {
    id: session.user.id,
    email: session.user.email,
    name: profile.name,
    role: profile.role,
  } : null;

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signup = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/clients" element={<ClientListPage />} />
                    <Route path="/clients/:id" element={<ClientDetailPage />} />
                    <Route path="/clients/:id/intake" element={<IntakeFormPage />} />
                    <Route path="/sessions/:id/observation" element={<ObservationPage />} />
                    <Route path="/sessions/:id/hypothesis" element={<HypothesisPage />} />
                    <Route path="/sessions/:id/intervention" element={<InterventionPage />} />
                    <Route path="/clients/:id/history" element={<SessionHistoryPage />} />
                    <Route path="/clients/:id/media" element={<MediaComparisonPage />} />
                    <Route path="/review" element={<StaffReviewPage />} />
                    <Route path="/audit" element={<AuditLogPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
