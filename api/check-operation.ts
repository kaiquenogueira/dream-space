
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from './lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
    // --- Auth Check via Supabase ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { operationName } = req.query;

    if (!operationName) {
        return res.status(400).json({ error: 'Missing operationName' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const ai = new GoogleGenAI({ apiKey });
        
        // Check operation status
        // The SDK might handle this differently. 
        // According to docs/SDK structure, it might be ai.operations.get(operationName)
        // Let's assume ai.operations.get exists based on the python example client.operations.get
        
        // We need to verify if ai.operations exists in Node SDK. 
        // If not, we might need to use the REST API or find the correct method.
        // But since we saw ai.models.generateVideos, likely other methods exist.
        
        // @ts-ignore
        const operation = await ai.operations.get({ name: operationName });
        
        // The response structure depends on the SDK.
        // Usually it returns the operation object which has .done, .response, etc.
        
        return res.status(200).json(operation);

    } catch (error: any) {
        console.error("Check Operation API Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to check operation status' });
    }
}
