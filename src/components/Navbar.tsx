import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Moon,
  Sun,
  Database,
  LogOut,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { api } from '../services/api';

interface NavbarProps {
  onOpenAddExpense: () => void;
  onRefreshData?: () => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAddExpense, onRefreshData, activeTab }) => {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [dbStatus, setDbStatus] = useState<{ isConnected: boolean; connectionType: string } | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    // Check initial dark mode from document
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    // Check backend health / db connection
    api.system.getHealth()
      .then((res) => {
        if (res && res.database) {
          setDbStatus({
            isConnected: res.database.isConnected,
            connectionType: res.database.connectionType,
          });
        }
      })
      .catch(() => {
        setDbStatus({ isConnected: false, connectionType: 'offline' });
      });
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSeedDemoData = async () => {
    if (!confirm('Load realistic synthetic student spending dataset with labelled statistical anomalies?')) {
      return;
    }
    setSeeding(true);
    try {
      await api.expenses.seedDemo();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error seeding demo data');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-rose-500 shadow-md shadow-indigo-500/20 text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">
                BrokeCode
              </span>
              <span className="hidden sm:inline-block rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-indigo-500">
                PROD MERN
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block">
              Personal Expense Anomaly Detector
            </p>
          </div>
        </div>

        {/* Database Status indicator & actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {dbStatus && (
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                dbStatus.isConnected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
              }`}
              title={`Mongoose connected to: ${dbStatus.connectionType}`}
            >
              <Database className="w-3 h-3" />
              <span className="capitalize">{dbStatus.connectionType} Mongoose</span>
            </div>
          )}

          {/* Quick Seed Demo Dataset button */}
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="hidden lg:flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition disabled:opacity-50"
            title="Populate test dataset with real student expenses & anomalies"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{seeding ? 'Seeding...' : 'Demo Dataset'}</span>
          </button>

          {/* Record Expense Button */}
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Theme Switcher */}
          <button
            onClick={toggleDarkMode}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {user.email}
                </div>
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                title="Log out of BrokeCode"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
