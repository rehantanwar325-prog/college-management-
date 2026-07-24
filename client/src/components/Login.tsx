import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Shield, User, Users, Key, AlertCircle, Sun, Moon, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';

interface LoginProps {}

export const Login: React.FC<LoginProps> = () => {
  const { login, theme, toggleTheme } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDemoClick = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 dark:block hidden pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 dark:hidden block pointer-events-none"></div>

      {/* Top Right Theme Toggle Switch */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border border-slate-700/60 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
          title="Toggle Light / Dark Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          <span>{theme === 'dark' ? 'Light Mode ☀️' : 'Dark Mode 🌙'}</span>
        </button>
      </div>

      {/* Ambient Radial Glow Orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] glow-orb-indigo rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] glow-orb-emerald rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 rounded-3xl shadow-xl shadow-indigo-500/25 mb-4 hover:rotate-6 transition-transform">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 dark:from-white dark:via-indigo-100 dark:to-indigo-300">
            AEGIS ACADEMY
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
            Unified College & School Management Workspace
          </p>
        </div>

        {/* Login Form card */}
        <div className="glass-card rounded-3xl p-8 shadow-2xl relative border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Log in to workspace</h2>
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-3 h-3" /> Secure SSO
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 p-4 rounded-2xl mb-6 text-sm font-medium animate-headshake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.com"
                className="w-full bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-800 rounded-2xl px-4 py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-indigo-500" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all btn-glow-indigo flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Verifying Credentials...' : 'Access Workspace'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 text-center">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoClick('admin@college.com')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-slate-700 dark:text-slate-300 font-medium transition-all text-left flex items-center gap-2 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoClick('smith@college.com')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-slate-700 dark:text-slate-300 font-medium transition-all text-left flex items-center gap-2 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span>Faculty</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoClick('alice@college.com')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-slate-700 dark:text-slate-300 font-medium transition-all text-left flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoClick('richard@college.com')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-slate-700 dark:text-slate-300 font-medium transition-all text-left flex items-center gap-2 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-cyan-500" />
                <span>Parent</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
