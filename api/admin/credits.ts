import { supabaseAdmin } from '../lib/supabaseAdmin.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Erro de configuração do servidor: Credenciais do Supabase ausentes' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.is_admin) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        const { targetUserId, creditsToAdd, userId, credits } = req.body;

        const resolvedTargetUserId = targetUserId ?? userId;
        const resolvedCreditsToAdd = typeof creditsToAdd === 'number' ? creditsToAdd : credits;

        if (!resolvedTargetUserId || typeof resolvedCreditsToAdd !== 'number') {
            return res.status(400).json({ error: 'Missing targetUserId or creditsToAdd' });
        }

        // Fetch target user's current credits
        const { data: targetProfile, error: targetError } = await supabaseAdmin
            .from('profiles')
            .select('credits_remaining, email')
            .eq('id', resolvedTargetUserId)
            .single();

        if (targetError || !targetProfile) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        const newCredits = Math.max(0, targetProfile.credits_remaining + resolvedCreditsToAdd);

        // Update credits
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ credits_remaining: newCredits, updated_at: new Date().toISOString() })
            .eq('id', resolvedTargetUserId);

        if (updateError) {
            throw updateError;
        }

        return res.status(200).json({
            success: true,
            message: `Updated credits for ${targetProfile.email}`,
            newCredits
        });
    } catch (error: any) {
        console.error("Admin API Error:", error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
