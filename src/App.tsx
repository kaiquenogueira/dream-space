import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import { useAuth } from './hooks/useAuth';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { LoadingScreen } from './components/LoadingScreen';
import { ProfileErrorScreen } from './components/ProfileErrorScreen';
import { AuthProvider } from './contexts/AuthContext';

const LandingPage = lazy(() => import('./pages/LandingPage'));

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
    return <Navigate to="/landing" replace />;
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
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isCheckingAuth } = useAuth();
  if (isCheckingAuth) return <LoadingScreen />;
  return <Navigate to={isAuthenticated ? '/app' : '/landing'} replace />;
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
        path="/landing"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <LandingPage />
          </Suspense>
        }
      />
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
        path="/app/*"
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
      {/* Redirect root to landing or app based on auth */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/landing" replace />} />
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
