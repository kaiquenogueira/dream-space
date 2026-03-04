
import React, { useContext } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from './AuthContext';
import { supabase } from '../lib/supabase';
import * as projectService from '../services/projectService';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock Project Service
vi.mock('../services/projectService', () => ({
  clearPersistedProjects: vi.fn(),
}));

// Test Component to access context
const TestComponent = () => {
  // We need to access the context directly, but since it's not exported, we can't. 
  // Wait, AuthContext IS exported but not the hook? 
  // Let's check the file content again. It exports AuthProvider but not the Context itself.
  // But usually there is a hook useAuth. Let's assume we can use the hook if it's available or we might need to export the context.
  // Checking existing code, there is src/hooks/useAuth.ts which likely uses the context.
  // Let's import useAuth instead.
  
  return (
    <div data-testid="auth-status">
       Test Component
    </div>
  );
};

// We need a way to access the context values in tests.
// A common pattern is to expose the context via a hook in the test component and render values to the DOM or use a variable.
// Let's verify if useAuth is available.
import { useAuth } from '../hooks/useAuth';

const AuthConsumer = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="is-authenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="user-email">{auth.user?.email || 'no-user'}</div>
      <div data-testid="profile-credits">{auth.profile?.credits_remaining ?? 'no-profile'}</div>
      <button onClick={() => auth.signInWithEmail('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => auth.signOut()}>Sign Out</button>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  it('initializes with no user', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });
  });

  it('loads user and profile on mount if session exists', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockProfile = { id: 'user-123', email: 'test@example.com', credits_remaining: 100 };
    
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    // Mock profile fetch
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('profile-credits')).toHaveTextContent('100');
    });
  });

  it('handles sign in', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' }, session: {} },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    const signInBtn = screen.getByText('Sign In');
    await act(async () => {
      signInBtn.click();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('handles sign out', async () => {
    (supabase.auth.signOut as any).mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    const signOutBtn = screen.getByText('Sign Out');
    await act(async () => {
      signOutBtn.click();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(projectService.clearPersistedProjects).toHaveBeenCalled();
  });
});
