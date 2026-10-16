import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Unable to verify signed-in user:', error);
      }
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    api.get('/api/auth/me')
      .then((response) => {
        if (active) setUser(response.data.user);
      })
      .catch((error) => {
        if (error.response?.status !== 401) {
          console.error('Unable to verify signed-in user:', error);
        }
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    refreshUser,
    async logout() {
      await api.post('/api/auth/logout');
      setUser(null);
    },
  }), [user, loading, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
