import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { supabaseAdmin } from './lib/supabaseAdmin.js';
import type { VercelRequest, VercelResponse } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // --- Auth Check via Supabase ---
    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Erro de configuração do servidor: Credenciais do Supabase ausentes' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autorizado: Token ausente ou inválido' });
    }

    const token = authHeader.split(' ')[1];

    let userId: string;
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Não autorizado: Token inválido' });
        }
        userId = user.id;
    } catch (error) {
        return res.status(401).json({ error: 'Não autorizado: Token inválido' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { operationName } = req.query;

    const operationNameStr = Array.isArray(operationName) ? operationName[0] : operationName;

    if (!operationNameStr) {
        return res.status(400).json({ error: 'Nome da operação ausente' });
    }

    try {
        const { data: ownership, error: ownershipError } = await supabaseAdmin
            .from('generations')
            .select('id')
            .eq('user_id', userId)
            .eq('generation_mode', 'Drone Tour')
            .eq('generated_image_url', operationNameStr)
            .limit(1)
            .single();

        if (ownershipError || !ownership) {
            return res.status(403).json({ error: 'Operação não autorizada' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Erro de configuração do servidor: Chave da API ausente' });
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
                const videoUri = video.video?.uri || (video as any).videoUri; // Handle possible SDK variations

                if (videoUri) {
                    const proxyUrl = `/api/media-proxy?uri=${encodeURIComponent(videoUri)}&type=video/mp4`;
                    
                    // Inject the proxy URL into the response
                    if (video.video) {
                        video.video.uri = proxyUrl;
                    } else {
                        (video as any).videoUri = proxyUrl;
                    }
                    (operation as any).publicVideoUrl = proxyUrl;

                    // Persist video URL to property_images to ensure data consistency
                    // This fixes the issue where video_url is not saved after generation
                    try {
                        await supabaseAdmin
                            .from('property_images')
                            .update({ 
                                video_url: proxyUrl,
                                is_generating: false // usage hint: maybe we should clear generating flag?
                            })
                            .eq('video_operation_name', operationNameStr);
                            
                        // Also try to update generations table if applicable, though primarily property_images is used for UI
                        // We avoid overwriting generated_image_url in generations table to preserve the operation name lookup for this endpoint
                    } catch (persistError) {
                        console.error("Failed to persist video URL:", persistError);
                    }
                }
            }
        }
        
        return res.status(200).json(operation);

    } catch (error: any) {
        console.error("Check Operation API Error:", error);
        return res.status(500).json({ error: error.message || 'Falha ao verificar status da operação' });
    }
}
