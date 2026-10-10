import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Logo } from './Logo.tsx';
import { Lock, Mail, User as UserIcon, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || (isRegisterMode && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await register(name, email, password, currency);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login('demo@brokecode.com', 'spendwise123');
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: '#E0DDDA' }} // Exact Light Greige main background
    >
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <Logo size="xl" showTagline={true} className="mb-2" />
          <p
            className="text-xs font-semibold mt-1 max-w-xs"
            style={{ color: '#2B2B2B', opacity: 0.8 }}
          >
            {isRegisterMode
              ? 'Create your BrokeCode account to decode the dough and master your expenses.'
              : 'Sign in to decode the dough, track spending, and audit anomalies.'}
          </p>
        </div>

        {/* Auth Card Surface */}
        <div
          className="rounded-2xl p-6 sm:p-8 shadow-sm border border-neutral-300/60"
          style={{ backgroundColor: '#FFFFFF' }} // White form surface
        >
          {/* Tab Selector */}
          <div className="flex rounded-xl p-1 mb-6 bg-neutral-100 border border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                !isRegisterMode
                  ? 'bg-white shadow-xs text-[#2B2B2B]'
                  : 'text-neutral-500 hover:text-[#2B2B2B]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                isRegisterMode
                  ? 'bg-white shadow-xs text-[#2B2B2B]'
                  : 'text-neutral-500 hover:text-[#2B2B2B]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#2B2B2B' }}
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    required={isRegisterMode}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0B6121] focus:border-transparent text-sm bg-neutral-50/50 text-[#2B2B2B]"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: '#2B2B2B' }}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0B6121] focus:border-transparent text-sm bg-neutral-50/50 text-[#2B2B2B]"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: '#2B2B2B' }}
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0B6121] focus:border-transparent text-sm bg-neutral-50/50 text-[#2B2B2B]"
                />
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#2B2B2B' }}
                >
                  Preferred Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0B6121] focus:border-transparent text-sm bg-neutral-50/50 text-[#2B2B2B]"
                >
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="CAD">CAD (C$) — Canadian Dollar</option>
                  <option value="AUD">AUD (A$) — Australian Dollar</option>
                  <option value="JPY">JPY (¥) — Japanese Yen</option>
                </select>
              </div>
            )}

            {/* Primary Action Button (Forest Green #0B6121) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm shadow-sm transition-all duration-150 flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
              style={{ backgroundColor: '#0B6121' }}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegisterMode ? 'Create BrokeCode Account' : 'Sign In to Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-6 pt-5 border-t border-neutral-200">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-xs font-semibold transition-all flex items-center justify-center gap-2"
              style={{ color: '#2B2B2B' }}
            >
              <CheckCircle2 className="w-4 h-4 text-[#0B6121]" />
              <span>Continue with Demo Account (Instant Access)</span>
            </button>
          </div>
        </div>

        {/* Security & Persistence Notice */}
        <p className="text-center text-[11px] text-neutral-500 mt-6">
          🔒 Secure 30-day session saved. You stay logged in automatically across reopens.
        </p>
      </div>
    </div>
  );
};
