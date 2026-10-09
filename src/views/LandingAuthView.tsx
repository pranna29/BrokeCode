import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  FileSpreadsheet,
  Calendar,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const LandingAuthView: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [monthlyBudget, setMonthlyBudget] = useState('25000');

  // Forgot / Reset password states
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register(email, password, name, currency, parseFloat(monthlyBudget) || 25000);
      } else if (mode === 'forgot') {
        const res = await api.auth.forgotPassword(email);
        setSuccessMessage(res.message);
        if (res.resetToken) {
          setResetToken(res.resetToken);
          setMode('reset');
        }
      } else if (mode === 'reset') {
        const res = await api.auth.resetPassword({ token: resetToken, newPassword });
        setSuccessMessage(res.message);
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 w-full border-b border-slate-800/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <BrandLogo size="md" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                mode === 'login'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-700 hover:bg-slate-800 text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      {/* Hero & Form Section */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Product Value Proposition */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Explainable Statistical Anomaly Detection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Take total control of your money with intelligent spending alerts.
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
            BrokeCode continuously evaluates your personal and group expenses using explainable
            statistical baseline models. Track your cashflow with a full color-coded calendar,
            split bills with friends, and detect budget leaks in real time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Google Pay & SMS Import</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Paste bank transaction messages with automatic UPI ref detection and pending review inbox.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-rose-400 font-semibold">
                <TrendingDown className="w-4 h-4" />
                <span>Statistical Anomaly AI</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Transparent median & IQR mathematical models. No black-box external LLM APIs required.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Calendar className="w-4 h-4" />
                <span>Master Spending Calendar</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Full-month color-coded calendar highlighting daily totals and statistically elevated days.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-sky-400 font-semibold">
                <Users className="w-4 h-4" />
                <span>Group Splits & Loans</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Split trips with roommates, track who owes whom, and simplify repayments without double counting.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`text-xs font-semibold pb-1.5 transition border-b-2 ${
                    mode === 'login'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`text-xs font-semibold pb-1.5 transition border-b-2 ${
                    mode === 'register'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Create Account
                </button>
              </div>
              <span className="text-[10px] text-slate-500">MERN Secure Auth</span>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Registration Specific Fields */}
              {mode === 'register' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Email (for login, register, forgot) */}
              {mode !== 'reset' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Password (for login, register) */}
              {(mode === 'login' || mode === 'register') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-medium">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError(null);
                        }}
                        className="text-[11px] text-indigo-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Registration Currency & Budget */}
              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="SGD">SGD (S$) - Singapore Dollar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Monthly Budget</label>
                    <input
                      type="number"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Reset Password specific inputs */}
              {mode === 'reset' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Reset Token</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Paste reset token"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 rounded-xl bg-[#0B6121] hover:bg-[#0B6121]/90 text-white py-2.5 font-bold transition shadow-xs disabled:opacity-50"
              >
                {loading
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Sign In to BrokeCode'
                  : mode === 'register'
                  ? 'Create Your Account'
                  : mode === 'forgot'
                  ? 'Request Password Reset'
                  : 'Set New Password'}
              </button>

              {mode === 'forgot' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        BrokeCode — Personal Expense & Statistical Anomaly Manager • MERN Architecture
      </footer>
    </div>
  );
};
