import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AuthPage } from './components/AuthPage.tsx';
import { Logo } from './components/Logo.tsx';
import { CalculatorPopup } from './components/CalculatorPopup.tsx';
import { ReceiptScannerModal } from './components/ReceiptScannerModal.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { TransactionsView } from './components/TransactionsView.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { BudgetsView } from './components/BudgetsView.tsx';
import { GroupsView } from './components/GroupsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import {
  Transaction,
  Category,
  PaymentAccount,
  Budget,
  FriendBalance
} from './types.ts';
import { api } from './services/api.ts';
import {
  LayoutDashboard,
  Receipt,
  Calendar as CalendarIcon,
  PieChart as AnalyticsIcon,
  Users,
  Settings as SettingsIcon,
  Plus,
  Camera,
  Loader2,
  Wallet
} from 'lucide-react';

type NavTab = 'dashboard' | 'transactions' | 'calendar' | 'analytics' | 'budgets' | 'groups' | 'settings';

function MainAppContent() {
  const { user, isLoading: authLoading, logout, updateUserPreferences } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Application Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [friendBalances, setFriendBalances] = useState<FriendBalance[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<any>(null);

  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  // Modals
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [calculatorDate, setCalculatorDate] = useState<string | undefined>(undefined);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [calculatorPrefill, setCalculatorPrefill] = useState<any>(null);

  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);

  // Load all user data
  const loadAppData = useCallback(async () => {
    if (!user) return;
    try {
      const [catRes, accRes, txRes, bRes, grpRes, anRes] = await Promise.all([
        api.getCategories(),
        api.getAccounts(),
        api.getTransactions(),
        api.getBudgets(),
        api.getGroupBalances(),
        api.getAnalyticsSummary()
      ]);

      setCategories(catRes.categories || []);
      setAccounts(accRes.accounts || []);
      setTransactions(txRes.transactions || []);
      setBudgets(bRes.budgets || []);
      setFriendBalances(grpRes.friendBalances || []);
      setAnalyticsSummary(anRes || null);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAppData();
    }
  }, [user, loadAppData]);

  // Loading state while verifying authentication session
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#E0DDDA]">
        <Logo size="lg" className="mb-4 animate-pulse" />
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2B2B2B]/70">
          <Loader2 className="w-4 h-4 animate-spin text-[#0B6121]" />
          <span>Restoring secure authenticated session...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show exact themed AuthPage
  if (!user) {
    return <AuthPage />;
  }

  // Currency symbol
  const currencySymbol = user.preferences?.currencySymbol || '$';
  const monthlyBudgetLimit = user.preferences?.monthlyBudget || 1500;

  // Handlers for Calculator Popup
  const handleOpenAdd = (targetDate?: string) => {
    setEditTransaction(null);
    setCalculatorPrefill(null);
    setCalculatorDate(targetDate || new Date().toISOString().split('T')[0]);
    setIsCalculatorOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditTransaction(tx);
    setCalculatorPrefill(null);
    setCalculatorDate(tx.date);
    setIsCalculatorOpen(true);
  };

  const handleScanApproved = (extracted: any) => {
    setEditTransaction(null);
    setCalculatorPrefill(extracted);
    setCalculatorDate(extracted.date || new Date().toISOString().split('T')[0]);
    setIsCalculatorOpen(true);
  };

  const handleSaveTransaction = async (data: {
    id?: string;
    amount: number;
    accountId: string;
    categoryId: string;
    description?: string;
    date: string;
  }) => {
    if (data.id) {
      // Update existing
      await api.updateTransaction(data.id, data);
    } else {
      // Create new
      await api.createTransaction(data);
    }
    // Refresh all data
    await loadAppData();
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
    await api.deleteTransaction(tx.id);
    await loadAppData();
  };

  const handleReorderTransactions = async (orderedIds: string[]) => {
    await api.reorderTransactions(orderedIds);
    await loadAppData();
  };

  // Category Actions
  const handleCategoryCreated = async (cat: { name: string; emoji: string; color: string }) => {
    await api.createCategory(cat);
    await loadAppData();
  };

  const handleCategoryUpdated = async (id: string, updates: Partial<Category>) => {
    await api.updateCategory(id, updates);
    await loadAppData();
  };

  const handleCategoryDeleted = async (id: string) => {
    await api.deleteCategory(id);
    await loadAppData();
  };

  const handleResetCategories = async () => {
    await api.resetCategories();
    await loadAppData();
  };

  const handleReorderCategories = async (orderedIds: string[]) => {
    await api.reorderCategories(orderedIds);
    await loadAppData();
  };

  // Account Actions
  const handleCreateAccount = async (acc: { name: string; type?: string; balance?: number }) => {
    await api.createAccount(acc);
    await loadAppData();
  };

  const handleDeleteAccount = async (id: string) => {
    await api.deleteAccount(id);
    await loadAppData();
  };

  // Budget Actions
  const handleSetCategoryBudget = async (b: { categoryId?: string; amount: number }) => {
    await api.setBudget(b);
    await loadAppData();
  };

  const handleUpdateTotalBudget = async (amount: number) => {
    await updateUserPreferences({ monthlyBudget: amount });
    await loadAppData();
  };

  return (
    <div className="min-h-screen bg-[#F7F6F4] text-[#2B2B2B] flex flex-col font-sans selection:bg-[#0B6121] selection:text-white">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3 transition-shadow shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Logo size="md" showTagline={true} />

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-bold">
              {[
                { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
                { id: 'transactions' as NavTab, label: 'Transactions', icon: Receipt },
                { id: 'calendar' as NavTab, label: 'Calendar', icon: CalendarIcon },
                { id: 'analytics' as NavTab, label: 'Anomalies', icon: AnalyticsIcon },
                { id: 'budgets' as NavTab, label: 'Budgets', icon: Wallet },
                { id: 'groups' as NavTab, label: 'Split & Groups', icon: Users },
                { id: 'settings' as NavTab, label: 'Settings', icon: SettingsIcon }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#0B6121]/10 text-[#0B6121]'
                        : 'text-neutral-500 hover:text-[#2B2B2B] hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Scan Bill Button */}
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 font-bold text-xs text-[#2B2B2B] shadow-2xs transition-all active:scale-95"
              title="Scan bill or receipt with OCR"
            >
              <Camera className="w-4 h-4 text-[#0B6121]" />
              <span className="hidden sm:inline">Scan Bill</span>
            </button>

            {/* Prominent Forest Green Add Transaction Button */}
            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95"
              style={{ backgroundColor: '#0B6121' }}
              title="Open calculator-style transaction entry"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-8">
        {isDataLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0B6121]" />
            <span className="text-xs font-semibold">Updating financial data...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                user={user}
                transactions={transactions}
                categories={categories}
                accounts={accounts}
                currencySymbol={currencySymbol}
                monthlyTotal={analyticsSummary?.currentMonthTotal || 0}
                monthlyBudget={monthlyBudgetLimit}
                categoryBreakdown={analyticsSummary?.categoryBreakdown || []}
                unreviewedAnomaliesCount={analyticsSummary?.unreviewedAnomaliesCount || 0}
                highestDay={analyticsSummary?.highestDay || ''}
                highestAmount={analyticsSummary?.highestAmount || 0}
                onOpenAddModal={() => handleOpenAdd()}
                onOpenScanModal={() => setIsScanModalOpen(true)}
                onNavigateToAnomalies={() => setActiveTab('analytics')}
                onNavigateToTransactions={() => setActiveTab('transactions')}
                onNavigateToCalendar={() => setActiveTab('calendar')}
                onEditTransaction={handleOpenEdit}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsView
                transactions={transactions}
                categories={categories}
                accounts={accounts}
                currencySymbol={currencySymbol}
                onOpenAddModal={() => handleOpenAdd()}
                onOpenScanModal={() => setIsScanModalOpen(true)}
                onEditTransaction={handleOpenEdit}
                onDeleteTransaction={handleDeleteTransaction}
                onReorderTransactions={handleReorderTransactions}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView
                transactions={transactions}
                categories={categories}
                currencySymbol={currencySymbol}
                onAddTransactionForDate={(d) => handleOpenAdd(d)}
                onEditTransaction={handleOpenEdit}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView
                transactions={transactions}
                categories={categories}
                currencySymbol={currencySymbol}
                onRefreshData={loadAppData}
              />
            )}

            {activeTab === 'budgets' && (
              <BudgetsView
                budgets={budgets}
                categories={categories}
                transactions={transactions}
                currencySymbol={currencySymbol}
                monthlyTotal={analyticsSummary?.currentMonthTotal || 0}
                monthlyBudgetLimit={monthlyBudgetLimit}
                onSetBudget={handleSetCategoryBudget}
                onUpdateTotalBudget={handleUpdateTotalBudget}
              />
            )}

            {activeTab === 'groups' && (
              <GroupsView
                friendBalances={friendBalances}
                currencySymbol={currencySymbol}
                onRefreshData={loadAppData}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                user={user}
                categories={categories}
                accounts={accounts}
                onLogout={logout}
                onUpdatePreferences={updateUserPreferences}
                onCategoryCreated={handleCategoryCreated}
                onCategoryUpdated={handleCategoryUpdated}
                onCategoryDeleted={handleCategoryDeleted}
                onResetDefaults={handleResetCategories}
                onReorderCategories={handleReorderCategories}
                onCreateAccount={handleCreateAccount}
                onDeleteAccount={handleDeleteAccount}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-2 py-2 flex items-center justify-around shadow-lg">
        {[
          { id: 'dashboard' as NavTab, label: 'Home', icon: LayoutDashboard },
          { id: 'transactions' as NavTab, label: 'Expenses', icon: Receipt },
          { id: 'calendar' as NavTab, label: 'Calendar', icon: CalendarIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'text-[#0B6121] font-bold' : 'text-neutral-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}

        {/* Central Floating Plus Button */}
        <button
          type="button"
          onClick={() => handleOpenAdd()}
          className="w-12 h-12 -mt-5 rounded-2xl text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ backgroundColor: '#0B6121' }}
          title="Add Expense"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {[
          { id: 'analytics' as NavTab, label: 'Audit', icon: AnalyticsIcon },
          { id: 'settings' as NavTab, label: 'Settings', icon: SettingsIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'text-[#0B6121] font-bold' : 'text-neutral-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* CALCULATOR-STYLE POPUP */}
      <CalculatorPopup
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        categories={categories}
        accounts={accounts}
        currencySymbol={currencySymbol}
        selectedDate={calculatorDate}
        editTransaction={editTransaction}
        initialValues={calculatorPrefill}
        onSave={handleSaveTransaction}
      />

      {/* BILL AND RECEIPT SCANNER MODAL */}
      <ReceiptScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        categories={categories}
        accounts={accounts}
        onApproveAndOpenCalculator={handleScanApproved}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
