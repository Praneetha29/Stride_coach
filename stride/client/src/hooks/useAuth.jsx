import { useState, useEffect, createContext, useContext } from 'react';
import { getMe } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coachMode, setCoachMode] = useState(
    () => localStorage.getItem('stride_coach_mode') || 'fire'
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('stride_token', token);
      window.history.replaceState({}, '', '/');
    }

    const stored = localStorage.getItem('stride_token');
    if (!stored) {
      setLoading(false);
      return;
    }

    getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('stride_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleCoach() {
    const next = coachMode === 'fire' ? 'cheer' : 'fire';
    setCoachMode(next);
    localStorage.setItem('stride_coach_mode', next);
  }

  function logout() {
    localStorage.removeItem('stride_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, coachMode, toggleCoach, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}