import { useState, useEffect, useRef } from 'react';
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
  
  // Use a ref to track profile state without triggering re-subscriptions in useEffect
  const profileRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const fetchProfilePromiseRef = useRef<Promise<void> | null>(null);

  const fetchProfile = async (userId: string) => {
    // Return existing promise if already fetching for this user
    if (fetchProfilePromiseRef.current) {
      console.log('[Auth] Profile fetch already in progress, reusing promise');
      return fetchProfilePromiseRef.current;
    }

    console.log('[Auth] Fetching profile...');
    
    const promise = (async () => {
      try {
        // Add a timeout to prevent hanging indefinitely
        // Reduced to 15s to fail faster if network is stuck
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
        );
  
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
  
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
  
        if (error) {
          console.error('[Auth] Error fetching profile:', error);
          // If profile fetch fails, we don't want to break the whole app flow if we can avoid it.
          // But usually this is critical.
        }
  
        if (data && !error) {
          console.log('[Auth] Profile fetched successfully');
          setProfile(data as UserProfile);
        }
      } catch (err) {
        console.error('[Auth] Exception fetching profile:', err);
      } finally {
        fetchProfilePromiseRef.current = null;
      }
    })();

    fetchProfilePromiseRef.current = promise;
    return promise;
  };

  useEffect(() => {
    console.log('[Auth] Initializing auth check...');
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('[Auth] Error getting session:', error);
        }
        console.log('[Auth] Initial session retrieved:', session ? 'Session found' : 'No session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('[Auth] Fetching profile for user:', session.user.id);
          // Start fetching profile
          await fetchProfile(session.user.id).catch(e => console.error('[Auth] Profile fetch failed in init:', e));
        }
      } catch (err) {
        console.error('[Auth] Unexpected error during init:', err);
      } finally {
        if (mounted) {
          console.log('[Auth] Auth check complete, setting isCheckingAuth to false');
          setIsCheckingAuth(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log(`[Auth] Auth state changed: ${event}`, session ? 'Session active' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if we already have the profile for this user to avoid unnecessary fetches
          if (!profileRef.current || profileRef.current.id !== session.user.id) {
            console.log('[Auth] Fetching profile for user:', session.user.id);
            await fetchProfile(session.user.id).catch(e => console.error('[Auth] Profile fetch failed in listener:', e));
          } else {
             console.log('[Auth] Profile already loaded for user, skipping fetch on auth change');
          }
        } else {
          setProfile(null);
        }
        
        if (mounted) {
          setIsCheckingAuth(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
