import React, { useState } from 'react';
import { SparkleIcon, UserIcon, LockIcon } from './Icons';

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      onLogin(data.token);
    } catch (err) {
      setError('Login failed. Please check your username and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #3b82f6, transparent 70%)',
            animation: 'orbFloat1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-48 -right-32 w-[600px] h-[600px] rounded-full opacity-15 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #8b5cf6, transparent 70%)',
            animation: 'orbFloat2 25s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10 blur-[80px]"
          style={{
            background: 'radial-gradient(circle, #06b6d4, transparent 70%)',
            animation: 'orbFloat3 18s ease-in-out infinite',
          }}
        />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Login Card */}
      <div className="relative w-full max-w-md opacity-0 animate-fade-slide-in">
        <div className="glass-card p-8 md:p-10">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-5 shadow-lg shadow-emerald-500/25 animate-glow-pulse">
              <SparkleIcon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gradient mb-2 tracking-tight">
              DreamSpace AI
            </h1>
            <p className="text-zinc-400 text-sm">Architectural design powered by AI</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center animate-scale-in backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="opacity-0 animate-fade-slide-in delay-100" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Username</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                  <UserIcon />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-xl pl-11 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div className="opacity-0 animate-fade-slide-in delay-200" style={{ animationFillMode: 'forwards', animationDelay: '200ms' }}>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                  <LockIcon />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-xl pl-11 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <div className="opacity-0 animate-fade-slide-in delay-300 pt-1" style={{ animationFillMode: 'forwards', animationDelay: '300ms' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.98] group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </>
                  ) : 'Sign In'}
                </span>
                {/* Shimmer overlay */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-zinc-800/50 opacity-0 animate-fade-in delay-500" style={{ animationFillMode: 'forwards', animationDelay: '500ms' }}>
            <p className="text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5">
              <SparkleIcon className="w-3.5 h-3.5 text-emerald-400/60" />
              Powered by Gemini 2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
