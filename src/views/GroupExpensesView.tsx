import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  ArrowRight,
  UserPlus,
  CheckCircle2,
  DollarSign,
  ArrowRightLeft,
  HandCoins,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IGroup, IFriendLoan } from '../types';

export const GroupExpensesView: React.FC = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'loans'>('groups');

  // Groups state
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<any | null>(null);

  // Group Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordSettlement, setShowRecordSettlement] = useState(false);

  // Group Form Inputs
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');

  // Group Expense Inputs
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState('');

  // Settlement Inputs
  const [settlementFrom, setSettlementFrom] = useState('');
  const [settlementTo, setSettlementTo] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');

  // Loans state
  const [loans, setLoans] = useState<IFriendLoan[]>([]);
  const [loanSummary, setLoanSummary] = useState<any>({});
  const [showCreateLoan, setShowCreateLoan] = useState(false);
  const [loanFriendName, setLoanFriendName] = useState('');
  const [loanType, setLoanType] = useState<'lent' | 'borrowed'>('lent');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  // Repayment input
  const [repayingLoanId, setRepayingLoanId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState('');

  const [loading, setLoading] = useState(true);

  const currencySymbol = user?.preferences?.currencySymbol || '₹';

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'groups') {
        const res = await api.groups.list();
        if (res.success) {
          setGroups(res.data);
          if (res.data.length > 0 && !selectedGroupId) {
            setSelectedGroupId(res.data[0]._id);
          }
        }
      } else {
        const res = await api.loans.list();
        if (res.success) {
          setLoans(res.data);
          setLoanSummary(res.summary);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  useEffect(() => {
    if (selectedGroupId && activeSubTab === 'groups') {
      api.groups.getDetails(selectedGroupId).then((res) => {
        if (res.success) setGroupDetails(res.data);
      });
    }
  }, [selectedGroupId]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await api.groups.create({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        currency: user?.currency || 'INR',
      });
      if (res.success) {
        setShowCreateGroup(false);
        setNewGroupName('');
        setNewGroupDesc('');
        loadData();
        setSelectedGroupId(res.data._id);
      }
    } catch (err: any) {
      alert(err.message || 'Error creating group');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInviteCode.trim()) return;
    try {
      const res = await api.groups.join(joinInviteCode.trim());
      if (res.success) {
        setShowJoinGroup(false);
        setJoinInviteCode('');
        loadData();
        setSelectedGroupId(res.data._id);
      }
    } catch (err: any) {
      alert(err.message || 'Error joining group');
    }
  };

  const handleAddGroupExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !expenseAmount) return;
    try {
      await api.groups.addExpense(selectedGroupId, {
        description: expenseDesc.trim(),
        amount: parseFloat(expenseAmount),
        paidBy: expensePaidBy || user?._id,
        splitType: 'equal',
      });
      setShowAddExpense(false);
      setExpenseDesc('');
      setExpenseAmount('');
      // Reload details
      const res = await api.groups.getDetails(selectedGroupId);
      if (res.success) setGroupDetails(res.data);
    } catch (err: any) {
      alert(err.message || 'Error adding group expense');
    }
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !settlementAmount) return;
    try {
      await api.groups.recordSettlement(selectedGroupId, {
        fromUserId: settlementFrom,
        toUserId: settlementTo,
        amount: parseFloat(settlementAmount),
      });
      setShowRecordSettlement(false);
      setSettlementAmount('');
      const res = await api.groups.getDetails(selectedGroupId);
      if (res.success) setGroupDetails(res.data);
    } catch (err: any) {
      alert(err.message || 'Error recording settlement');
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanFriendName.trim() || !loanAmount) return;
    try {
      await api.loans.create({
        friendName: loanFriendName.trim(),
        type: loanType,
        amount: parseFloat(loanAmount),
        notes: loanNotes.trim(),
        currency: user?.currency || 'INR',
      });
      setShowCreateLoan(false);
      setLoanFriendName('');
      setLoanAmount('');
      setLoanNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error creating loan record');
    }
  };

  const handleAddRepayment = async (loanId: string) => {
    if (!repayAmount) return;
    try {
      await api.loans.addRepayment(loanId, {
        amount: parseFloat(repayAmount),
      });
      setRepayingLoanId(null);
      setRepayAmount('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error adding repayment');
    }
  };

  return (
    <div className="space-y-6 pb-12 text-xs">
      {/* Top Banner and Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Group Expenses & Friend Loan Tracker
          </h2>
          <p className="text-slate-500 mt-1">
            Split shared trips, simplify IOUs, and track personal borrowings without double-counting expenses.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold">
          <button
            onClick={() => setActiveSubTab('groups')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeSubTab === 'groups'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Group Splits
          </button>
          <button
            onClick={() => setActiveSubTab('loans')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeSubTab === 'loans'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Friend Loans (Lent / Borrowed)
          </button>
        </div>
      </div>

      {activeSubTab === 'groups' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Groups List */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white">Your Groups</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowJoinGroup(true)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold"
                >
                  Join Code
                </button>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold text-[11px]"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                You have not joined any groups yet. Create or join one to split shared expenses!
              </div>
            ) : (
              <div className="space-y-1.5">
                {groups.map((g) => (
                  <button
                    key={g._id}
                    onClick={() => setSelectedGroupId(g._id)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between ${
                      selectedGroupId === g._id
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <div>
                      <div className="truncate max-w-[140px]">{g.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {g.members.length} members • Invite: {g.inviteCode}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Group Details & Settlements */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
            {!groupDetails ? (
              <div className="py-16 text-center text-slate-500">Select a group to view balances.</div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {groupDetails.group.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Invite Code: <strong className="text-indigo-500">{groupDetails.group.inviteCode}</strong> (Share with friends)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddExpense(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Group Expense</span>
                    </button>
                    <button
                      onClick={() => setShowRecordSettlement(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Settle Up</span>
                    </button>
                  </div>
                </div>

                {/* Simplified Settlements Box (Debt minimization) */}
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
                  <span className="font-bold text-xs text-indigo-500 block">
                    Simplified Settlement Suggestions (Minimal Transfers):
                  </span>
                  {groupDetails.simplifiedSettlements.length === 0 ? (
                    <div className="text-slate-500 text-[11px]">All group members are settled up! Zero balances owed.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {groupDetails.simplifiedSettlements.map((s: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300">
                            <strong>{s.fromName}</strong> owes <strong>{s.toName}</strong>
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                            {currencySymbol}{s.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group Expenses list */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white">Recent Shared Expenses</h4>
                  {groupDetails.expenses.length === 0 ? (
                    <div className="py-6 text-center text-slate-500">No group expenses recorded yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                      {groupDetails.expenses.map((e: any) => {
                        const paidByName = groupDetails.group.members.find((m: any) => m.userId === e.paidBy)?.name || 'Member';
                        return (
                          <div key={e._id} className="py-2.5 flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{e.description}</div>
                              <div className="text-[10px] text-slate-400">
                                Paid by {paidByName} • Split equally ({e.splits.length} people) • {new Date(e.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="font-black text-slate-900 dark:text-white">
                              {currencySymbol}{e.amount.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Friend Loans Tab */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-slate-400 block mb-1">Total Money Lent</span>
              <div className="text-xl font-black text-emerald-500">{currencySymbol}{(loanSummary.totalLent || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-slate-400 block mb-1">Total Money Borrowed</span>
              <div className="text-xl font-black text-amber-500">{currencySymbol}{(loanSummary.totalBorrowed || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-slate-400 block mb-1">Net Outstanding to Receive</span>
              <div className="text-xl font-black text-indigo-500">{currencySymbol}{(loanSummary.netOutstanding || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Friend-to-Friend Personal Loans</h3>
                <p className="text-[11px] text-slate-400">Personal tracker records. These do not affect your regular expense budget.</p>
              </div>
              <button
                onClick={() => setShowCreateLoan(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </button>
            </div>

            {loans.length === 0 ? (
              <div className="py-12 text-center text-slate-500">No personal loan records recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {loans.map((loan) => {
                  const repaid = (loan.repayments || []).reduce((s, r) => s + r.amount, 0);
                  const remaining = Math.max(0, loan.amount - repaid);
                  return (
                    <div key={loan._id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{loan.friendName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            loan.type === 'lent' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {loan.type === 'lent' ? 'You Lent' : 'You Borrowed'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                            loan.status === 'settled' ? 'bg-slate-500/20 text-slate-400' : 'bg-indigo-500/20 text-indigo-400'
                          }`}>
                            {loan.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Principal: {currencySymbol}{loan.amount} • Repaid: {currencySymbol}{repaid.toFixed(2)} • Remaining: {currencySymbol}{remaining.toFixed(2)}
                        </div>
                      </div>

                      {loan.status !== 'settled' && (
                        <div className="flex items-center gap-2">
                          {repayingLoanId === loan._id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder="Amount"
                                value={repayAmount}
                                onChange={(e) => setRepayAmount(e.target.value)}
                                className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                              />
                              <button
                                onClick={() => handleAddRepayment(loan._id)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setRepayingLoanId(null)}
                                className="px-2 py-1 text-slate-400 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setRepayingLoanId(loan._id);
                                setRepayAmount(String(remaining));
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                            >
                              Add Repayment
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals for Create Group, Join Group, Add Expense, Settlement, Loan */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleCreateGroup} className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="font-bold text-white text-sm">Create Split Group</h3>
            <input
              type="text"
              required
              placeholder="Group Name (e.g. Goa Trip, Flat 402)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Description (Optional)"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateGroup(false)} className="px-3 py-1.5 text-slate-400">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 rounded-lg text-white font-semibold">Create</button>
            </div>
          </form>
        </div>
      )}

      {showJoinGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleJoinGroup} className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="font-bold text-white text-sm">Join Group by Code</h3>
            <input
              type="text"
              required
              placeholder="8-character Invite Code"
              value={joinInviteCode}
              onChange={(e) => setJoinInviteCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono uppercase"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowJoinGroup(false)} className="px-3 py-1.5 text-slate-400">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 rounded-lg text-white font-semibold">Join</button>
            </div>
          </form>
        </div>
      )}

      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleAddGroupExpense} className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="font-bold text-white text-sm">Record Group Expense</h3>
            <input
              type="text"
              required
              placeholder="Description (e.g. Dinner, Groceries, Fuel)"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
            <input
              type="number"
              step="0.01"
              required
              placeholder={`Amount (${currencySymbol})`}
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-semibold"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddExpense(false)} className="px-3 py-1.5 text-slate-400">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 rounded-lg text-white font-semibold">Add Expense</button>
            </div>
          </form>
        </div>
      )}

      {showRecordSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleRecordSettlement} className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="font-bold text-white text-sm">Record Settlement Payment</h3>
            <select
              value={settlementTo}
              onChange={(e) => setSettlementTo(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              required
            >
              <option value="">Recipient</option>
              {groupDetails?.group?.members.map((m: any) => (
                <option key={m.userId} value={m.userId}>{m.name}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              required
              placeholder={`Settled Amount (${currencySymbol})`}
              value={settlementAmount}
              onChange={(e) => setSettlementAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-semibold"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowRecordSettlement(false)} className="px-3 py-1.5 text-slate-400">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-emerald-600 rounded-lg text-white font-semibold">Confirm Settlement</button>
            </div>
          </form>
        </div>
      )}

      {showCreateLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleCreateLoan} className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="font-bold text-white text-sm">Record Personal Loan</h3>
            <input
              type="text"
              required
              placeholder="Friend's Name"
              value={loanFriendName}
              onChange={(e) => setLoanFriendName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value as any)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="lent">I Lent Money to Friend</option>
              <option value="borrowed">I Borrowed Money from Friend</option>
            </select>
            <input
              type="number"
              step="0.01"
              required
              placeholder={`Amount (${currencySymbol})`}
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-semibold"
            />
            <input
              type="text"
              placeholder="Notes (e.g. Dinner share, Emergency cash)"
              value={loanNotes}
              onChange={(e) => setLoanNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateLoan(false)} className="px-3 py-1.5 text-slate-400">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 rounded-lg text-white font-semibold">Save Loan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
