import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { clearPersistedProjects } from '../services/projectService';
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
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Cache promise to avoid parallel fetches
  const fetchProfilePromiseRef = useRef<Promise<UserProfile | null> | null>(null);
  const profileRef = useRef<UserProfile | null>(null);
  const profileErrorRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userOrId: User | string, force = false): Promise<UserProfile | null> => {
    // Normalize input to get userId
    const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;
    const userObject = typeof userOrId === 'object' ? userOrId : null;

    // If already loading and not forcing, return existing promise
    if (fetchProfilePromiseRef.current && !force) {
      return fetchProfilePromiseRef.current;
    }

    const load = async (attempt = 1): Promise<UserProfile | null> => {
      try {
        setIsProfileLoading(true);
        setProfileError(null);
        
        // Timeout de 10s (mais tolerante)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tempo limite excedido ao carregar perfil')), 10000)
        );

        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
        const { data, error } = result;

        if (error) {
            // Handle missing profile (PGRST116) - Attempt to create if we have the user object
            if (error.code === 'PGRST116' && userObject) {
                console.warn('[Auth] Profile missing, attempting to create...');
                try {
                    const { data: newProfile, error: createError } = await supabase
                        .from('profiles')
                        .insert({
                            id: userId,
                            email: userObject.email,
                            full_name: userObject.user_metadata?.full_name || userObject.user_metadata?.name || '',
                            avatar_url: userObject.user_metadata?.avatar_url || userObject.user_metadata?.picture || '',
                        })
                        .select()
                        .single();
                    
                    if (createError) throw createError;
                    
                    const userProfile = newProfile as UserProfile;
                    setProfile(userProfile);
                    return userProfile;
                } catch (createErr) {
                    console.error('[Auth] Failed to auto-create profile:', createErr);
                    throw error; // Throw original error if creation fails
                }
            }

            // Retry logic
            if (attempt < 2 && (error.message.includes('fetch') || error.message.includes('timeout'))) {
                console.warn(`[Auth] Retrying profile fetch (attempt ${attempt + 1})...`);
                await new Promise(r => setTimeout(r, 1000)); 
                return load(attempt + 1);
            }
            throw error;
        }
        
        if (!data) throw new Error('Perfil não encontrado');

        const userProfile = data as UserProfile;
        setProfile(userProfile);
        return userProfile;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao carregar perfil';
        const isTimeout = typeof message === 'string' && message.includes('Tempo limite');
        const hasExistingProfile = !!profileRef.current;
        if (!hasExistingProfile) {
          console.error('[Auth] Error fetching profile:', err);
          setProfile(null);
          setProfileError(message);
        } else if (!isTimeout) {
          console.warn('[Auth] Background profile refresh failed:', message);
        }
        
        return null;
      } finally {
        setIsProfileLoading(false);
        fetchProfilePromiseRef.current = null;
      }
    };

    fetchProfilePromiseRef.current = load();
    return fetchProfilePromiseRef.current;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchProfile(initialSession.user);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
      } finally {
        if (mounted) setIsCheckingAuth(false);
      }
    };

    initSession();

    // Real-time auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const currentProfile = profileRef.current;
        const currentProfileError = profileErrorRef.current;
        // Avoid refetch loops if we already have a profile or a known profile error
        if (currentProfile?.id === currentSession.user.id || currentProfileError) {
          setIsCheckingAuth(false);
          return;
        }
        // Only fetch if profile is missing or belongs to another user
        if (!currentProfile || currentProfile.id !== currentSession.user.id) {
          await fetchProfile(currentSession.user);
        }
      } else {
        setProfile(null);
        setProfileError(null);
      }
      
      setIsCheckingAuth(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  useEffect(() => {
    profileRef.current = profile;
    profileErrorRef.current = profileError;
  }, [profile, profileError]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user, true);
    }
  }, [user, fetchProfile]);

  const signInWithEmail = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  };

  const signInWithGoogle = async () => {
    const redirectUrl = import.meta.env.VITE_REDIRECT_URL || window.location.origin;
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearPersistedProjects(user?.id);
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileError(null);
  };

  return {
    session,
    user,
    profile,
    isAuthenticated: !!session,
    isCheckingAuth,
    isProfileLoading,
    profileError,
    refreshProfile,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };
};
