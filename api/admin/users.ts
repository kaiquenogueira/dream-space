import { supabaseAdmin } from '../lib/supabaseAdmin.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
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

        // Fetch all users with their credit and plan info
        const { data: users, error: usersError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, credits_remaining, plan, created_at, is_admin')
            .order('created_at', { ascending: false });

        if (usersError) {
            throw usersError;
        }

        return res.status(200).json(users);
    } catch (error: any) {
        console.error("Admin API Error:", error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
