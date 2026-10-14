import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  FileCode,
  CheckCircle2,
  Database,
  Sparkles,
  X,
} from 'lucide-react';
import { authApi, extractErrorMessage } from '../services/api';
import { AuthUser, LoginAuditData } from '../types';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal to inspect backend JSON login records
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonAuditData, setJsonAuditData] = useState<LoginAuditData | null>(null);
  const [isLoadingJson, setIsLoadingJson] = useState(false);

  const handleFillDemo = () => {
    setMode('login');
    setEmail('demo@fintrack.io');
    setPassword('password123');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await authApi.login(email.trim(), password);
        showToast(`Welcome back, ${res.user.name}!`, 'success');
        onLoginSuccess(res.user, res.token);
      } else {
        if (!name.trim()) {
          setError('Please provide your name.');
          setIsLoading(false);
          return;
        }
        const res = await authApi.register(name.trim(), email.trim(), password);
        showToast(`Account created! Welcome, ${res.user.name}!`, 'success');
        onLoginSuccess(res.user, res.token);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenJsonViewer = async () => {
    setIsJsonModalOpen(true);
    setIsLoadingJson(true);
    try {
      const data = await authApi.getLoginData();
      setJsonAuditData(data);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setIsLoadingJson(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md animate-in fade-in duration-300">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-xl shadow-brand-500/25 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            FinTrack Intelligence
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personal Finance, Subscription Intelligence & Cashflow Engine
          </p>
        </div>

        {/* Main Auth Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 p-6 sm:p-8">
          {/* Tabs: Sign In / Create Account */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Quick Demo Fill Pill */}
          <div className="flex items-center justify-between p-3 mb-6 bg-brand-50/70 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/60 rounded-2xl text-xs">
            <div className="flex items-center gap-2 text-brand-800 dark:text-brand-300">
              <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
              <span>Demo user available</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300 bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 rounded-xl transition-colors shadow-2xs"
            >
              Fill Demo Login
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 mb-4 text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="alex@fintrack.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition-all shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to FinTrack' : 'Complete Registration'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Backend JSON storage note & Inspection Trigger */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mb-2">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>Login data stored in backend as JSON</span>
            </div>
            <button
              type="button"
              onClick={handleOpenJsonViewer}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Inspect backend login_data.json</span>
            </button>
          </div>
        </div>
      </div>

      {/* JSON File Inspection Modal */}
      <Modal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        title="Backend JSON Login Storage Viewer"
        description="Live data from backend/data/login_data.json demonstrating JSON credential & login persistence"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {isLoadingJson ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading stored JSON data...</div>
          ) : jsonAuditData ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Storage File</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium truncate block">
                    backend/data/login_data.json
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Registered Accounts</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium block">
                    {jsonAuditData.total_registered_users} Users ({jsonAuditData.total_login_events} Events)
                  </span>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Raw Stored JSON Content:
                </p>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 overflow-y-auto border border-slate-800">
                  {JSON.stringify(jsonAuditData, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No login records found.</p>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsJsonModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
