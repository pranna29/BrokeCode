import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, currency?: string, monthlyBudget?: number) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  updateProfile: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        removeStoredToken();
        setUser(null);
      }
    } catch (err) {
      console.warn('Failed to restore session:', err);
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
    if (res.success && res.token) {
      setStoredToken(res.token);
      setUser(res.user);
    }
  };

  const register = async (email: string, password: string, name?: string, currency?: string, monthlyBudget?: number) => {
    const res = await api.auth.register({ email, password, name, currency, monthlyBudget });
    if (res.success && res.token) {
      setStoredToken(res.token);
      setUser(res.user);
    }
  };

  const demoLogin = async () => {
    const demoEmail = 'alex.student@brokecode.dev';
    const demoPassword = 'StudentDemoPassword2025!';

    try {
      // Try login first
      await login(demoEmail, demoPassword);
    } catch {
      // If user doesn't exist yet, register and seed
      await register(demoEmail, demoPassword, 'Alex Rivera (CS Student)', 'USD', 750);
      try {
        await api.expenses.seedDemo();
      } catch (seedErr) {
        console.warn('Seed demo error:', seedErr);
      }
    }
  };

  const logout = () => {
    removeStoredToken();
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
        demoLogin,
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
