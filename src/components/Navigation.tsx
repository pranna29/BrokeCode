import React from 'react';
import {
  Calendar,
  ReceiptText,
  BarChart3,
  Target,
  CreditCard,
  Users,
  Settings,
} from 'lucide-react';

export type TabKey =
  | 'calendar'
  | 'transactions'
  | 'statistics'
  | 'budgets'
  | 'accounts'
  | 'groups'
  | 'settings';

interface NavigationProps {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  unreviewedAnomalyCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  unreviewedAnomalyCount = 0,
}) => {
  const tabs = [
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'transactions', label: 'Transactions', icon: ReceiptText },
    { key: 'statistics', label: 'Statistics', icon: BarChart3 },
    { key: 'budgets', label: 'Budgets', icon: Target },
    { key: 'accounts', label: 'Accounts', icon: CreditCard },
    { key: 'groups', label: 'Groups', icon: Users },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navigation Tabs */}
      <nav className="border-b border-[#E0DDDA] dark:border-slate-800 bg-[#faf9f8] dark:bg-slate-900/60 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onChangeTab(tab.key as TabKey)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#0B6121] text-white shadow-xs font-bold'
                    : 'text-[#2B2B2B] dark:text-slate-300 hover:text-[#0B6121] dark:hover:text-white hover:bg-[#E0DDDA]/40 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#2B2B2B]/70 dark:text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.key === 'transactions' && unreviewedAnomalyCount > 0 && (
                  <span
                    className={`ml-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isActive ? 'bg-white text-[#0B6121]' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {unreviewedAnomalyCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[#E0DDDA] dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-1 md:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChangeTab(tab.key as TabKey)}
              className={`relative flex flex-col items-center justify-center gap-1 py-1 px-1.5 text-[10px] font-medium transition ${
                isActive
                  ? 'text-[#0B6121] dark:text-emerald-400 font-bold'
                  : 'text-[#2B2B2B]/70 dark:text-slate-400 hover:text-[#2B2B2B]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                {tab.key === 'transactions' && unreviewedAnomalyCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {unreviewedAnomalyCount}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[50px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
