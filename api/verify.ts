import { supabaseAdmin } from './lib/supabaseAdmin.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- Auth Check via Supabase ---
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Erro de configuração do servidor: Credenciais do Supabase ausentes' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.status(200).json({ valid: true, userId: user.id });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
