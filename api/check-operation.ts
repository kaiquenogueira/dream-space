
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { supabaseAdmin } from './lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
    // --- Auth Check via Supabase ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];

    let userId: string;
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
        userId = user.id;
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { operationName } = req.query;

    const operationNameStr = Array.isArray(operationName) ? operationName[0] : operationName;

    if (!operationNameStr) {
        return res.status(400).json({ error: 'Missing operationName' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const ai = new GoogleGenAI({ apiKey });
        
        console.log("Checking operation status for:", operationNameStr);
        
        const op = new GenerateVideosOperation();
        op.name = operationNameStr;
        
        const operation = await ai.operations.get({ operation: op });
        
        if (operation.done) {
            console.log("Operation done. Result:", JSON.stringify(operation, null, 2));

            // If the video URI is not public (e.g., requires API key or is gs://), we need to handle it.
            // The frontend cannot access File API URIs directly.
            const result = operation.response as any;
            if (result && result.generatedVideos && result.generatedVideos.length > 0) {
                const video = result.generatedVideos[0];
                let videoUri = video.video?.uri || (video as any).videoUri; // Handle possible SDK variations

                if (videoUri) {
                    console.log("Processing generated video URI:", videoUri);

                    // Instead of uploading to Supabase, we return a proxy URL
                    // that streams the video directly from Gemini using our API Key.
                    // We append the auth token so the frontend can use this URL directly in <video> tags or download links.
                    const proxyUrl = `/api/media-proxy?uri=${encodeURIComponent(videoUri)}&type=video/mp4&token=${token}`;
                    
                    // Inject the proxy URL into the response
                    if (video.video) {
                        video.video.uri = proxyUrl;
                    } else {
                        (video as any).videoUri = proxyUrl;
                    }
                    (operation as any).publicVideoUrl = proxyUrl;
                    
                    console.log("Returning proxy URL:", proxyUrl);
                }
            }
        }
        
        // The response structure depends on the SDK.
        // Usually it returns the operation object which has .done, .response, etc.
        
        return res.status(200).json(operation);

    } catch (error: any) {
        console.error("Check Operation API Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to check operation status' });
    }
}
