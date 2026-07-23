import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Shield, User, Users, Key, AlertCircle, Sun, Moon, Eye, EyeOff } from 'lucide-react';

interface LoginProps {}

export const Login: React.FC<LoginProps> = () => {
  const { login, theme, toggleTheme } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
      
      {/* Top Right Theme Toggle Switch */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur transition-all shadow-lg"
          title="Toggle Light / Dark Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          <span>{theme === 'dark' ? 'Light Mode ☀️' : 'Dark Mode 🌙'}</span>
        </button>
      </div>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 mb-3 animate-bounce">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
            AEGIS ACADEMY
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Unified College & School Management Workspace
          </p>
        </div>

        {/* Login Form card */}
        <div className="glass-card bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl">
          <h2 className="text-xl font-semibold mb-6">Log in to your workspace</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/60 text-red-200 p-4 rounded-xl mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.com"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-800/50"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-indigo-400" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] py-3.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading ? 'Verifying Credentials...' : 'Access Workspace'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
