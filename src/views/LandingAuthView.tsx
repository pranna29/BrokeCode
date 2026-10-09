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
    <div className="min-h-screen bg-[#E0DDDA] text-[#2B2B2B] flex flex-col justify-between selection:bg-[#0B6121] selection:text-white">
      {/* Top Navigation */}
      <header className="w-full border-b border-[#2B2B2B]/10 bg-white/70 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <BrandLogo size="md" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#2B2B2B] text-white shadow-xs'
                  : 'text-[#2B2B2B]/70 hover:text-[#2B2B2B] hover:bg-[#2B2B2B]/5'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#0B6121] text-white shadow-xs'
                  : 'border border-[#2B2B2B]/20 hover:bg-[#2B2B2B]/5 text-[#2B2B2B]'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full">
        {/* Left Column: Product Value Proposition */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0B6121]/30 bg-[#0B6121]/10 px-3 py-1 text-xs font-bold text-[#0B6121]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#0B6121]" />
            <span>Explainable Statistical Anomaly Detection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#2B2B2B] leading-tight">
            Take total control of your money with intelligent spending alerts.
          </h1>

          <p className="text-sm sm:text-base text-[#2B2B2B]/75 leading-relaxed max-w-xl">
            BrokeCode evaluates your personal and group expenses using transparent statistical baseline models.
            Track your cashflow with a full color-coded calendar, split bills with friends, scan receipts with OCR,
            and eliminate financial leaks in real time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-xs">
            <div className="rounded-2xl border border-[#2B2B2B]/10 bg-white p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[#0B6121] font-bold">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Google Pay & SMS Import</span>
              </div>
              <p className="text-[11px] text-[#2B2B2B]/70 leading-relaxed">
                Paste bank transaction messages with automatic UPI ref detection and pending review inbox.
              </p>
            </div>

            <div className="rounded-2xl border border-[#2B2B2B]/10 bg-white p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[#0B6121] font-bold">
                <TrendingDown className="w-4 h-4" />
                <span>Statistical Anomaly AI</span>
              </div>
              <p className="text-[11px] text-[#2B2B2B]/70 leading-relaxed">
                Transparent median & IQR mathematical models. No paid external LLM dependencies required.
              </p>
            </div>

            <div className="rounded-2xl border border-[#2B2B2B]/10 bg-white p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[#0B6121] font-bold">
                <Calendar className="w-4 h-4" />
                <span>Master Spending Calendar</span>
              </div>
              <p className="text-[11px] text-[#2B2B2B]/70 leading-relaxed">
                Full-month color-coded calendar highlighting daily totals, categories, and elevated days.
              </p>
            </div>

            <div className="rounded-2xl border border-[#2B2B2B]/10 bg-white p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[#0B6121] font-bold">
                <Users className="w-4 h-4" />
                <span>Group Splits & Bill Scanner</span>
              </div>
              <p className="text-[11px] text-[#2B2B2B]/70 leading-relaxed">
                Scan receipts with OCR, split trips with roommates, and simplify loan repayments.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Form Card */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-[#2B2B2B]/10 bg-white p-6 sm:p-8 shadow-xl">
            {/* Form Mode Selector */}
            <div className="flex items-center justify-between border-b border-[#2B2B2B]/10 pb-3 mb-5">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`text-xs font-extrabold pb-1.5 transition border-b-2 cursor-pointer ${
                    mode === 'login'
                      ? 'border-[#0B6121] text-[#0B6121]'
                      : 'border-transparent text-[#2B2B2B]/50 hover:text-[#2B2B2B]'
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
                  className={`text-xs font-extrabold pb-1.5 transition border-b-2 cursor-pointer ${
                    mode === 'register'
                      ? 'border-[#0B6121] text-[#0B6121]'
                      : 'border-transparent text-[#2B2B2B]/50 hover:text-[#2B2B2B]'
                  }`}
                >
                  Create Account
                </button>
              </div>
              <span className="text-[10px] font-semibold text-[#2B2B2B]/40 uppercase tracking-wider">
                MERN Session
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#0B6121]/10 border border-[#0B6121]/30 p-3 text-xs text-[#0B6121]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Registration Specific Name Field */}
              {mode === 'register' && (
                <div>
                  <label className="block text-[#2B2B2B] font-bold mb-1">Your Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-[#2B2B2B]/40" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-[#2B2B2B]/20 bg-[#FAF9F8] pl-9 pr-3 py-2.5 text-[#2B2B2B] placeholder-[#2B2B2B]/40 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                    />
                  </div>
                </div>
              )}

              {/* Email (for login, register, forgot) */}
              {mode !== 'reset' && (
                <div>
                  <label className="block text-[#2B2B2B] font-bold mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#2B2B2B]/40" />
                    <input
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#2B2B2B]/20 bg-[#FAF9F8] pl-9 pr-3 py-2.5 text-[#2B2B2B] placeholder-[#2B2B2B]/40 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                    />
                  </div>
                </div>
              )}

              {/* Password (for login, register) */}
              {(mode === 'login' || mode === 'register') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#2B2B2B] font-bold">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError(null);
                        }}
                        className="text-[11px] font-bold text-[#0B6121] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#2B2B2B]/40" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#2B2B2B]/20 bg-[#FAF9F8] pl-9 pr-3 py-2.5 text-[#2B2B2B] placeholder-[#2B2B2B]/40 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                    />
                  </div>
                </div>
              )}

              {/* Registration Currency & Budget */}
              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#2B2B2B] font-bold mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-xl border border-[#2B2B2B]/20 bg-[#FAF9F8] px-3 py-2.5 text-[#2B2B2B] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="SGD">SGD (S$) - Singapore Dollar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#2B2B2B] font-bold mb-1">Monthly Budget</label>
                    <input
                      type="number"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                      className="w-full rounded-xl border border-[#2B2B2B]/20 bg-[#FAF9F8] px-3 py-2.5 text-[#2B2B2B] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                    />
                  </div>
                </div>
              )}

              {/* Reset Password specific inputs */}
              {mode === 'reset' && (
                <>
                  <div>
                    <label className="block text-[#2B2B2B] font-bold mb-1">Reset Token</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-[#2B2B2B]/40" />
                      <input
                        type="text"
                        required
                        placeholder="Paste reset token"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="w-full rounded-xl border border-[#2B2B2B]/20 bg-[#FAF9F8] pl-9 pr-3 py-2.5 text-[#2B2B2B] placeholder-[#2B2B2B]/40 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#2B2B2B] font-bold mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#2B2B2B]/40" />
                      <input
                        type="password"
                        required
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-[#2B2B2B]/20 bg-[#FAF9F8] pl-9 pr-3 py-2.5 text-[#2B2B2B] placeholder-[#2B2B2B]/40 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Forest Green Primary Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 rounded-xl bg-[#0B6121] hover:bg-[#094e1a] active:bg-[#073c14] text-white py-3 font-extrabold text-xs transition shadow-md shadow-[#0B6121]/30 disabled:opacity-50 cursor-pointer"
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
                    className="text-[#2B2B2B]/70 hover:text-[#0B6121] font-bold cursor-pointer"
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
      <footer className="border-t border-[#2B2B2B]/10 bg-white/50 py-5 text-center text-xs text-[#2B2B2B]/60">
        BrokeCode — Personal Expense & Statistical Anomaly Manager • MERN Architecture
      </footer>
    </div>
  );
};
