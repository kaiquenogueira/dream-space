import { supabaseAdmin } from './lib/supabaseAdmin.js';
import type { VercelRequest, VercelResponse } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // --- Auth Check via Supabase ---
    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Erro de configuração do servidor: Credenciais do Supabase ausentes' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autorizado: Token ausente' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Não autorizado: Token inválido' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { uri, type, filename } = req.query;

    if (!uri || typeof uri !== 'string' || !uri.startsWith('https://generativelanguage.googleapis.com')) {
        return res.status(400).json({ error: 'URI inválida ou restrita' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Erro de configuração do servidor: Chave da API ausente' });
        }

        const headers: any = {
            'x-goog-api-key': apiKey
        };

        const response = await fetch(uri, { headers });

        if (!response.ok) {
            console.error("Upstream error:", response.status, response.statusText);
            return res.status(response.status).json({ error: 'Falha ao buscar mídia do servidor de origem' });
        }

        // Forward headers
        const contentType = (type as string) || response.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        if (filename) {
             res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }

        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));

    } catch (error: any) {
        console.error("Media Proxy Error:", error);
        return res.status(500).json({ error: error.message || 'Erro interno no servidor' });
    }
}
