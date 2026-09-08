import { createContext, useContext, useState, useCallback } from 'react';
import { api, setToken, getToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(email, password);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const restoreSession = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await api.me();
      setUser(data.user);
    } catch {
      setToken(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, restoreSession, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
