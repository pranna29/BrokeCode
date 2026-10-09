import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Navigation, TabKey } from './components/Navigation';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ExpenseModal } from './components/ExpenseModal';
import { LandingAuthView } from './views/LandingAuthView';
import { DashboardView } from './views/DashboardView';
import { ExpensesView } from './views/ExpensesView';
import { AnomalyCentreView } from './views/AnomalyCentreView';
import { AnalyticsView } from './views/AnalyticsView';
import { ImportExportView } from './views/ImportExportView';
import { SettingsPrivacyView } from './views/SettingsPrivacyView';
import { IExpense } from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [unreviewedCount, setUnreviewedCount] = useState<number>(0);

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<IExpense | null>(null);

  const fetchUnreviewedCount = async () => {
    if (!user) return;
    try {
      const res = await api.anomalies.list({ reviewStatus: 'unreviewed', limit: 1 });
      if (res.success && res.summary) {
        setUnreviewedCount(res.summary.severityCounts ? Object.values(res.summary.severityCounts).reduce((a, b) => a + b, 0) : res.summary.totalFlagged || 0);
      }
    } catch (err) {
      // Ignore background badge error
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreviewedCount();
    }
  }, [user, activeTab]);

  const handleOpenAddExpense = () => {
    setExpenseToEdit(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: IExpense) => {
    setExpenseToEdit(expense);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (data: Partial<IExpense>) => {
    if (expenseToEdit) {
      await api.expenses.update(expenseToEdit._id, data);
    } else {
      await api.expenses.create(data);
    }
    fetchUnreviewedCount();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent" />
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Initializing BrokeCode...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingAuthView />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <div>
        {/* Top Header Navbar */}
        <Navbar
          onOpenAddExpense={handleOpenAddExpense}
          onRefreshData={fetchUnreviewedCount}
          activeTab={activeTab}
        />

        {/* Subnavigation Bar */}
        <Navigation
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          unreviewedAnomalyCount={unreviewedCount}
        />

        {/* Main Content Area */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-20 md:pb-12">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={setActiveTab}
              onOpenAddExpense={handleOpenAddExpense}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              onOpenAddExpense={handleOpenAddExpense}
              onEditExpense={handleOpenEditExpense}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'anomalies' && <AnomalyCentreView />}

          {activeTab === 'analytics' && <AnalyticsView />}

          {activeTab === 'import-export' && <ImportExportView />}

          {activeTab === 'settings' && <SettingsPrivacyView />}
        </main>
      </div>

      {/* Global Modals & Indicators */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        expenseToEdit={expenseToEdit}
        currencySymbol={user?.preferences?.currencySymbol || '$'}
      />

      <OfflineIndicator />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-4 text-center text-[11px] text-slate-500 hidden md:block">
        BrokeCode — Personal Expense Anomaly Detector • Full-Stack MERN Architecture
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
