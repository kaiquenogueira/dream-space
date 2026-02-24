import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Login from '../components/Login';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import React from 'react';

// Mock supabase client methods
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

// We need to properly mock the supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signUp: (...args) => mockSignUp(...args),
      signInWithOAuth: (...args) => mockSignInWithOAuth(...args),
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
    },
    from: (...args) => mockFrom(...args),
  },
}));

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null })
            })
        })
    });
  });

  it('renders login form correctly', () => {
    render(
      <Login 
        onSignIn={vi.fn()} 
        onSignUp={vi.fn()} 
        onGoogleSignIn={vi.fn()} 
      />
    );
    
    expect(screen.getByPlaceholderText(/voce@exemplo.com/i)).toBeInTheDocument();
    // Check for both the tab button and the submit button
    const entrarButtons = screen.getAllByText('Entrar');
    expect(entrarButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('handles sign in correctly', async () => {
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    render(
      <Login 
        onSignIn={onSignIn} 
        onSignUp={vi.fn()} 
        onGoogleSignIn={vi.fn()} 
      />
    );
    
    const emailInput = screen.getByPlaceholderText(/voce@exemplo.com/i);
    const passwordInput = screen.getByPlaceholderText(/Insira a senha/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Since there are multiple buttons with "Entrar" (tab and submit), we need to be more specific.
    // The submit button is the one inside the form or has type submit.
    const submitBtn = screen.getAllByRole('button', { name: 'Entrar' }).find(btn => btn.getAttribute('type') === 'submit');
    
    if (!submitBtn) throw new Error('Submit button not found');
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(onSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays error on sign in failure', async () => {
    const onSignIn = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(
      <Login 
        onSignIn={onSignIn} 
        onSignUp={vi.fn()} 
        onGoogleSignIn={vi.fn()} 
      />
    );
    
    const emailInput = screen.getByPlaceholderText(/voce@exemplo.com/i);
    const passwordInput = screen.getByPlaceholderText(/Insira a senha/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    
    const submitBtn = screen.getAllByRole('button', { name: 'Entrar' }).find(btn => btn.getAttribute('type') === 'submit');
    
    if (!submitBtn) throw new Error('Submit button not found');
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});
