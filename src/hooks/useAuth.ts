import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  credits_remaining: number;
  credits_reset_at: string;
  plan: string;
  is_admin: boolean;
}

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.log('[Auth] Fetching profile...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Auth] Error fetching profile:', error);
    }

    if (data && !error) {
      console.log('[Auth] Profile fetched successfully');
      setProfile(data as UserProfile);
    }
  };

  useEffect(() => {
    console.log('[Auth] Initializing auth check...');
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth] Error getting session:', error);
      }
      console.log('[Auth] Initial session retrieved:', session ? 'Session found' : 'No session');
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('[Auth] Fetching profile for user:', session.user.id);
        fetchProfile(session.user.id);
      }
      setIsCheckingAuth(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] Auth state changed: ${event}`, session ? 'Session active' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setIsCheckingAuth(false); // Ensure we stop loading on change
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    console.log('[Auth] Attempting sign in with email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('[Auth] Sign in error:', error);
      throw error;
    }
    
    if (data.session) {
      console.log('[Auth] Sign in successful, session received');
    } else {
      console.warn('[Auth] Sign in successful but no session returned (check email confirmation settings)');
    }
    
    return data;
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    // Get the redirect URL, preferring the environment variable if set
    // This is useful for preview deployments or custom domains
    const redirectUrl = import.meta.env.VITE_REDIRECT_URL || window.location.origin;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return {
    session,
    user,
    profile,
    isAuthenticated: !!session,
    isCheckingAuth,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };
};
