import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as BR from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await BR.fetchMe();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const signOut = useCallback(() => {
    localStorage.removeItem('br-session');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (profile) => {
    const r = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...BR.authHeaders() },
      body: JSON.stringify(profile),
    });
    if (!r.ok) throw new Error('profile update failed');
    await refreshUser();
  }, [refreshUser]);

  const uploadAvatar = useCallback(async (file) => {
    const form = new FormData();
    form.append('file', file);
    const r = await fetch('/api/auth/avatar', { method: 'POST', headers: BR.authHeaders(), body: form });
    if (!r.ok) throw new Error('avatar upload failed');
    const data = await r.json();
    await refreshUser();
    return data.url;
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, signOut, updateProfile, uploadAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
