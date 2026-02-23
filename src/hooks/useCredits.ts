import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from './useAuth';

export const useCredits = (profile: UserProfile | null, refreshProfile: () => Promise<void>) => {
    const credits = profile?.credits_remaining ?? 0;
    const plan = profile?.plan ?? 'free';
    const hasCredits = credits > 0;

    const maxCredits = plan === 'free' ? 8 : plan === 'starter' ? 50 : plan === 'pro' ? 200 : Infinity;

    const refreshCredits = async () => {
        await refreshProfile();
    };

    return {
        credits,
        maxCredits,
        plan,
        hasCredits,
        refreshCredits,
    };
};
