import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Navigation, TabKey } from './components/Navigation';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ExpenseModal } from './components/ExpenseModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { LandingAuthView } from './views/LandingAuthView';
import { CalendarView } from './views/CalendarView';
import { TransactionsView } from './views/TransactionsView';
import { StatisticsView } from './views/StatisticsView';
import { BudgetsView } from './views/BudgetsView';
import { AccountsView } from './views/AccountsView';
import { GroupsView } from './views/GroupsView';
import { SettingsView } from './views/SettingsView';
import { IExpense, ICategory } from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('calendar');
  const [unreviewedCount, setUnreviewedCount] = useState<number>(0);

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<IExpense | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
  const [scannedPrefillData, setScannedPrefillData] = useState<any | null>(null);

  // Receipt Scanner State
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState<ICategory[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<IExpense[]>([]);

  useEffect(() => {
    if (user) {
      api.categories.list().then((res) => {
        if (res.success) setCategoriesList(res.data);
      }).catch(() => {});

      api.expenses.list({ limit: 50 }).then((res) => {
        if (res.success) setRecentExpenses(res.data);
      }).catch(() => {});
    }
  }, [user, isExpenseModalOpen]);

  const handleOpenAddExpense = () => {
    setExpenseToEdit(null);
    setScannedPrefillData(null);
    setModalInitialDate(undefined);
    setIsExpenseModalOpen(true);
  };

  const handleOpenAddExpenseWithDate = (dateStr: string) => {
    setExpenseToEdit(null);
    setScannedPrefillData(null);
    setModalInitialDate(dateStr);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: IExpense) => {
    setExpenseToEdit(expense);
    setScannedPrefillData(null);
    setModalInitialDate(undefined);
    setIsExpenseModalOpen(true);
  };

  const handleOpenScanReceipt = () => {
    setIsReceiptScannerOpen(true);
  };

  const handleConfirmScannedReceipt = (data: any) => {
    setExpenseToEdit(null);
    setScannedPrefillData(data);
    setModalInitialDate(data.date);
    setIsExpenseModalOpen(true);
  };

  const fetchUnreviewedCount = async () => {
    if (!user) return;
    try {
      const res = await api.anomalies.list({ reviewStatus: 'unreviewed', limit: 1 });
      if (res.success && res.summary) {
        setUnreviewedCount(
          res.summary.severityCounts
            ? Object.values(res.summary.severityCounts).reduce((a, b) => a + b, 0)
            : res.summary.totalFlagged || 0
        );
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
      <div className="flex min-h-screen items-center justify-center bg-[#2B2B2B] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#0B6121] border-t-transparent" />
          <span className="text-xs font-semibold tracking-wider text-[#E0DDDA] uppercase">
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
    <div className="min-h-screen bg-[#faf9f8] dark:bg-slate-950 text-[#2B2B2B] dark:text-slate-100 flex flex-col justify-between selection:bg-[#0B6121] selection:text-white">
      <div>
        {/* Top Header Navbar */}
        <Navbar
          onOpenAddExpense={handleOpenAddExpense}
          onOpenScanReceipt={handleOpenScanReceipt}
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
          {activeTab === 'calendar' && (
            <CalendarView
              onOpenAddExpenseWithDate={handleOpenAddExpenseWithDate}
              onEditExpense={handleOpenEditExpense}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              onOpenAddExpense={handleOpenAddExpense}
              onOpenScanReceipt={handleOpenScanReceipt}
              onEditExpense={handleOpenEditExpense}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'statistics' && <StatisticsView />}

          {activeTab === 'budgets' && <BudgetsView />}

          {activeTab === 'accounts' && <AccountsView />}

          {activeTab === 'groups' && <GroupsView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals & Indicators */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setScannedPrefillData(null);
        }}
        onSave={handleSaveExpense}
        expenseToEdit={expenseToEdit}
        initialDate={modalInitialDate}
        initialPrefillData={scannedPrefillData}
        currencySymbol={user?.preferences?.currencySymbol || '₹'}
      />

      {/* Receipt Scanner Modal with Mandatory User Review */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onConfirmReceipt={handleConfirmScannedReceipt}
        categories={categoriesList}
        recentExpenses={recentExpenses}
        currencySymbol={user?.preferences?.currencySymbol || '₹'}
      />

      <OfflineIndicator />

      {/* Footer */}
      <footer className="border-t border-[#E0DDDA] dark:border-slate-800 py-4 text-center text-[11px] text-slate-500 hidden md:block">
        BrokeCode — Personal Expense & Statistical Anomaly Manager • MERN Architecture
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
