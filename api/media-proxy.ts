import { supabaseAdmin } from './lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
    // --- Auth Check via Supabase ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Allow if a temporary token is provided in query (optional, for direct browser downloads)
        // But for now, let's stick to strict auth if the frontend can handle it.
        // If the frontend uses <a href="..."> it won't send headers.
        // So we might need to allow a query param token.
        const { token } = req.query;
        if (!token) {
             return res.status(401).json({ error: 'Unauthorized: Missing token' });
        }
        
        // Verify token from query
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    } else {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { uri, type, filename } = req.query;

    if (!uri || typeof uri !== 'string' || !uri.startsWith('https://generativelanguage.googleapis.com')) {
        return res.status(400).json({ error: 'Invalid or restricted URI' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const headers: any = {
            'x-goog-api-key': apiKey
        };

        const response = await fetch(uri, { headers });

        if (!response.ok) {
            console.error("Upstream error:", response.status, response.statusText);
            return res.status(response.status).json({ error: 'Failed to fetch media from upstream' });
        }

        // Forward headers
        const contentType = type || response.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        if (filename) {
             res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }

        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));

    } catch (error: any) {
        console.error("Media Proxy Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
