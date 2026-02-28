import React from 'react';
import Login from './components/Login';
import { useAuth } from './hooks/useAuth';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { LoadingScreen } from './components/LoadingScreen';
import { ProfileErrorScreen } from './components/ProfileErrorScreen';
import { AuthProvider } from './contexts/AuthContext';

const AppContent: React.FC = () => {
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
