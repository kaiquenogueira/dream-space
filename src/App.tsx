
import React from 'react';
import Login from './components/Login';
import { RefreshIcon } from './components/Icons';
import { useAuth } from './hooks/useAuth';
import { AuthenticatedApp } from './components/AuthenticatedApp';

type ProfileErrorScreenProps = {
  profileError: string;
  onRetry: () => void;
  onSignOut: () => void;
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center space-y-4">
    <RefreshIcon className="animate-spin text-secondary w-12 h-12" />
    <p className="text-text-muted text-lg animate-pulse">Carregando...</p>
  </div>
);

const ProfileErrorScreen: React.FC<ProfileErrorScreenProps & { onForceLogout?: () => void }> = ({ profileError, onRetry, onSignOut }) => {
    const handleForceLogout = () => {
        // Limpeza forçada de qualquer resquício de sessão
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    };

    return (
      <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg bg-surface/60 border border-glass-border rounded-sm p-8 text-center space-y-6 shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            </div>
          </div>
          
          <div className="space-y-2">
             <h2 className="text-xl font-semibold text-white">Falha ao carregar perfil</h2>
             <p className="text-text-muted text-sm px-4">{profileError}</p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto pt-2">
            <button
              onClick={onRetry}
              className="w-full px-4 py-3 bg-secondary text-black font-medium rounded-sm hover:bg-secondary-light transition-all active:scale-95"
            >
              Tentar Novamente
            </button>
            
            <button
              onClick={onSignOut}
              className="w-full px-4 py-3 bg-zinc-800 text-white rounded-sm hover:bg-zinc-700 transition-all border border-zinc-700"
            >
              Sair da Conta
            </button>
            
            <button
                onClick={handleForceLogout}
                className="text-xs text-red-400 hover:text-red-300 underline mt-4"
            >
                Limpar dados e recarregar (Logout Forçado)
            </button>
          </div>
        </div>
      </div>
    );
};

const App: React.FC = () => {
  const {
    isAuthenticated,
    isCheckingAuth,
    isProfileLoading,
    profileError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    profile,
    refreshProfile,
  } = useAuth();

  if (isCheckingAuth || (isAuthenticated && isProfileLoading)) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Login
        onSignIn={signInWithEmail}
        onSignUp={signUpWithEmail}
        onGoogleSignIn={signInWithGoogle}
      />
    );
  }

  if (profileError) {
    return (
      <ProfileErrorScreen
        profileError={profileError}
        onRetry={refreshProfile}
        onSignOut={signOut}
      />
    );
  }

  return (
    <AuthenticatedApp
      profile={profile}
      refreshProfile={refreshProfile}
      signOut={signOut}
    />
  );
};

export default App;
