import { useState, useEffect, createContext, useContext } from 'react';
import { getMe, logout as apiLogout } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coachMode, setCoachMode] = useState(
    () => localStorage.getItem('stride_coach_mode') || 'fire'
  );

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('auth') === 'success') {
    window.history.replaceState({}, '', '/');
    setTimeout(() => {
      getMe().then(setUser).catch(() => {});
    }, 500);
  }
}, []);

  function toggleCoach() {
    const next = coachMode === 'fire' ? 'cheer' : 'fire';
    setCoachMode(next);
    localStorage.setItem('stride_coach_mode', next);
  }

  async function logout() {
    await apiLogout();
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