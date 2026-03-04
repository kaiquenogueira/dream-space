import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import { useAuth } from './hooks/useAuth';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { LoadingScreen } from './components/LoadingScreen';
import { ProfileErrorScreen } from './components/ProfileErrorScreen';
import { AuthProvider } from './contexts/AuthContext';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    isCheckingAuth,
    isProfileLoading,
    profileError,
    signOut,
    refreshProfile,
  } = useAuth();

  if (isCheckingAuth || (isAuthenticated && isProfileLoading)) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    profile,
    refreshProfile,
  } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login
              onSignIn={signInWithEmail}
              onSignUp={signUpWithEmail}
              onGoogleSignIn={signInWithGoogle}
            />
          </PublicRoute>
        }
      />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AuthenticatedApp
              profile={profile}
              refreshProfile={refreshProfile}
              signOut={signOut}
            />
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
