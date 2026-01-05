'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, getToken, setToken, clearToken, fetchUser } from './auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (token) {
        const userData = await fetchUser();
        setUser(userData);
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (token: string) => {
    setToken(token);
    const userData = await fetchUser();
    setUser(userData);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    window.location.href = '/';
  };

  const refresh = async () => {
    const token = getToken();
    if (token) {
      const userData = await fetchUser();
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
