/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import http from '../api/http';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('clearance_token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('clearance_token');
    setToken('');
    setUser(null);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await http.get('/auth/profile');
        setUser(response.data.user);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token, clearSession]);

  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener('auth:expired', onExpired);

    return () => {
      window.removeEventListener('auth:expired', onExpired);
    };
  }, [clearSession]);

  const login = useCallback((nextToken) => {
    localStorage.setItem('clearance_token', nextToken);
    setLoading(true);
    setToken(nextToken);
  }, []);

  const logout = useCallback(() => clearSession(), [clearSession]);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      logout,
      updateUser,
    }),
    [token, user, loading, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
