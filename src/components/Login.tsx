import React, { useState } from 'react';
import { SparkleIcon, UserIcon, LockIcon } from './Icons';

interface LoginProps {
  onSignIn: (email: string, password: string) => Promise<any>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<any>;
  onGoogleSignIn: () => Promise<any>;
}

const Login: React.FC<LoginProps> = ({ onSignIn, onSignUp, onGoogleSignIn }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await onSignIn(email, password);
        if (error) throw error;
      } else {
        if (!fullName.trim()) {
          throw new Error('Por favor, insira seu nome completo');
        }
        const { data, error } = await onSignUp(email, password, fullName);
        if (error) throw error;

        if (data?.user || data?.session) {
          setSuccess('Conta criada! Verifique seu email para confirmação ou faça login se a confirmação por email estiver desativada.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      console.error('[Login] Error:', err);
      setError(err.message || 'Falha na autenticação. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const { data, error } = await onGoogleSignIn();
      if (error) throw error;

      if (data?.url) {
        // Redirecionamento iniciado com sucesso
      }
    } catch (err: any) {
      console.error('[Login] Google Sign In Error:', err);
      setError(err.message || 'Falha no login com Google.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background Orbs - Gold/Luxury Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-10 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #D4AF37, transparent 70%)',
            animation: 'orbFloat1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-48 -right-32 w-[600px] h-[600px] rounded-full opacity-5 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #F3E5AB, transparent 70%)',
            animation: 'orbFloat2 25s ease-in-out infinite',
          }}
        />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(212, 175, 55, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Login Card */}
      <div className="relative w-full max-w-md opacity-0 animate-fade-slide-in">
        <div className="glass-card p-8 md:p-10 rounded-sm border-glass-border">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-sm bg-gradient-to-br from-secondary to-secondary-light mb-5 shadow-lg shadow-secondary/25 animate-glow-pulse">
              <SparkleIcon className="w-7 h-7 text-black" />
            </div>
            <h1 className="text-4xl font-heading font-bold text-gradient mb-2 tracking-wide uppercase">
              Etherea
            </h1>
            <p className="text-text-main text-sm tracking-widest uppercase font-medium opacity-80">Luxury AI Interior Design</p>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-surface-light p-1 rounded-sm mb-6 border border-glass-border">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-sm transition-all uppercase tracking-wide ${mode === 'signin'
                ? 'bg-surface text-secondary shadow-sm border border-glass-border'
                : 'text-text-muted hover:text-text-main opacity-70 hover:opacity-100'
                }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-sm transition-all uppercase tracking-wide ${mode === 'signup'
                ? 'bg-surface text-secondary shadow-sm border border-glass-border'
                : 'text-text-muted hover:text-text-main opacity-70 hover:opacity-100'
                }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Success */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-sm text-green-300 text-sm font-medium text-center animate-scale-in backdrop-blur-sm">
              {success}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-sm text-red-300 text-sm font-medium text-center animate-scale-in backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-surface-light border border-glass-border rounded-sm py-3 px-4 text-text-main hover:bg-surface hover:border-secondary/50 transition-all mb-5 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm font-medium uppercase tracking-wide">Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-glass-border" />
            <span className="text-xs text-text-main font-semibold uppercase tracking-wider font-sans italic opacity-60">ou</span>
            <div className="flex-1 h-px bg-glass-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (only for signup) */}
            {mode === 'signup' && (
              <div className="animate-fade-slide-in" style={{ animationFillMode: 'forwards' }}>
                <label className="block text-xs font-bold text-text-main opacity-80 uppercase tracking-wider mb-2">Nome Completo</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-secondary transition-colors">
                    <UserIcon />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field pl-11 focus:ring-secondary focus:border-secondary"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-text-main opacity-80 uppercase tracking-wider mb-2">Email</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-secondary transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11 focus:ring-secondary focus:border-secondary"
                  placeholder="email@exemplo.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-main opacity-80 uppercase tracking-wider mb-2">Senha</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-secondary transition-colors">
                  <LockIcon />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 focus:ring-secondary focus:border-secondary"
                  placeholder={mode === 'signup' ? 'Mínimo de 6 caracteres' : 'Sua senha'}
                  minLength={mode === 'signup' ? 6 : undefined}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {mode === 'signin' ? 'Entrando...' : 'Criando conta...'}
                    </>
                  ) : mode === 'signin' ? 'Acessar' : 'Criar Conta'}
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-glass-border">
            <p className="text-center text-[10px] text-text-main font-medium uppercase tracking-widest flex items-center justify-center gap-1.5 opacity-50">
              <SparkleIcon className="w-3 h-3" />
              Etherea AI Architecture
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
