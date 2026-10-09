import React, { useState } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
  Database,
  TrendingDown,
  BarChart2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingAuthView: React.FC = () => {
  const { login, register, demoLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [monthlyBudget, setMonthlyBudget] = useState('750');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name, currency, parseFloat(monthlyBudget) || 750);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setError(null);
    setDemoLoading(true);
    try {
      await demoLogin();
    } catch (err: any) {
      setError(err.message || 'Error signing into demo account.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full border-b border-slate-800/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-500 text-white shadow-md shadow-indigo-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <span className="text-base font-black tracking-tight text-white">BrokeCode</span>
          </div>
          <button
            onClick={handleDemoClick}
            disabled={demoLoading}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{demoLoading ? 'Launching Demo...' : '1-Click Student Demo'}</span>
          </button>
        </div>
      </header>

      {/* Hero & Auth Form Container */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Product Value Proposition */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Explainable Statistical Anomaly Detection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Stop leaking cash to sneaky spikes and phantom subscriptions.
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
            BrokeCode continuously evaluates your everyday expenses using robust category-specific
            median and IQR models. Get clear, human-readable explanations the moment an outlier,
            unexpected surge, or frequency burst happens.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                <TrendingDown className="w-4 h-4" />
                <span>Explainable Baseline</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Transparent median, Q1/Q3, and IQR thresholds. No opaque AI hallucinating numbers.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>Multi-Vector Auditing</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Detects merchant spikes, duplicate frequency bursts, and sudden spending drifts.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Database className="w-4 h-4" />
                <span>Full-Stack MERN Architecture</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Strict user account isolation, MongoDB Atlas indexing, and REST APIs.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                <BarChart2 className="w-4 h-4" />
                <span>PWA & Offline Capable</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Install directly on iOS/Android or desktop with zero native app store hassle.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Form Card */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40">
            {/* Quick Demo Access Header */}
            <div className="mb-6 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Hackathon Quick Demo
                </span>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mb-3">
                Experience full anomaly detection with 35+ realistic student expenses pre-loaded.
              </p>
              <button
                type="button"
                onClick={handleDemoClick}
                disabled={demoLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white py-2 text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                <span>{demoLoading ? 'Signing in...' : 'Launch Demo Account (1-Click)'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError(null);
                  }}
                  className={`text-xs font-semibold pb-1 transition border-b-2 ${
                    isLogin
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError(null);
                  }}
                  className={`text-xs font-semibold pb-1 transition border-b-2 ${
                    !isLogin
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Create Account
                </button>
              </div>
              <span className="text-[11px] text-slate-500">Secure JWT</span>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {!isLogin && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="alex.student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!isLogin && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Monthly Budget</label>
                    <input
                      type="number"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 font-semibold transition shadow-md shadow-indigo-600/30 disabled:opacity-50"
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In to BrokeCode' : 'Register Free Account'}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        BrokeCode — Personal Expense Anomaly Detector • Built with Node.js, Express, MongoDB Atlas, React, and TypeScript.
      </footer>
    </div>
  );
};
