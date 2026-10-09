import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, currency?: string, monthlyBudget?: number) => Promise<void>;
  logout: () => void;
  updateProfile: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        removeStoredToken();
        setUser(null);
      }
    } catch (err) {
      removeStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if (res.success && res.user) {
      if (res.token) {
        setStoredToken(res.token);
      }
      setUser(res.user);
    }
  };

  const register = async (email: string, password: string, name?: string, currency?: string, monthlyBudget?: number) => {
    const res = await api.auth.register({ email, password, name, currency, monthlyBudget });
    if (res.success && res.user) {
      if (res.token) {
        setStoredToken(res.token);
      }
      setUser(res.user);
    }
  };

  const logout = async () => {
    removeStoredToken();
    try {
      await api.auth.logout();
    } catch {
      // Ignore network failures on logout
    }
    setUser(null);
  };

  const updateProfile = async (data: any) => {
    const res = await api.auth.updateProfile(data);
    if (res.success && res.user) {
      setUser(res.user);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
