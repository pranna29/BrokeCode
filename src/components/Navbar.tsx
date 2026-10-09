import React, { useState, useEffect } from 'react';
import {
  Plus,
  Moon,
  Sun,
  Database,
  LogOut,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { BrandLogo } from './BrandLogo';
import { api } from '../services/api';

interface NavbarProps {
  onOpenAddExpense: () => void;
  onOpenScanReceipt?: () => void;
  onRefreshData?: () => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAddExpense, onOpenScanReceipt }) => {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial dark mode from document
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E0DDDA] dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showSubtitle={false} />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Scan Bill Button */}
          {onOpenScanReceipt && (
            <button
              onClick={onOpenScanReceipt}
              className="flex items-center gap-1.5 rounded-lg border border-[#0B6121]/40 bg-[#0B6121]/10 hover:bg-[#0B6121]/20 active:scale-95 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#0B6121] dark:text-emerald-400 shadow-xs transition cursor-pointer"
              title="Scan bill or receipt using camera or image file"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Scan Bill</span>
            </button>
          )}

          {/* Record Expense Button */}
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 rounded-lg bg-[#0B6121] hover:bg-[#0B6121]/90 active:scale-95 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Theme Switcher */}
          <button
            onClick={toggleDarkMode}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#E0DDDA] dark:border-slate-800">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-[#2B2B2B] dark:text-white leading-tight">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {user.email}
                </div>
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
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
