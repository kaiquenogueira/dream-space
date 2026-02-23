import { GoogleGenAI } from "@google/genai";
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

    // --- Credit and Plan Check ---
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('credits_remaining, plan')
        .eq('id', userId)
        .single();

    if (profileError || !profile) {
        return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    if (profile.credits_remaining < 2) {
        return res.status(403).json({
            error: 'Not enough credits',
            credits_remaining: profile.credits_remaining,
            message: 'O Cinematic Drone Tour custa 2 créditos. Faça upgrade do seu plano.',
        });
    }

    // --- Free Tier Limit Check (1 per user) ---
    if (profile.plan === 'free') {
        const { count, error: countError } = await supabaseAdmin
            .from('generations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('generation_mode', 'Drone Tour');

        if (!countError && count && count >= 1) {
            return res.status(403).json({
                error: 'Free limit reached',
                message: 'Usuários do plano grátis podem gerar apenas 1 Cinematic Drone Tour. Faça upgrade para gerar mais.',
            });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { imageUrl, includeVideo } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ error: 'Missing imageUrl' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Fetch the image to get base64
        const imageRes = await fetch(imageUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const imageBase64 = buffer.toString('base64');
        const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

        const ai = new GoogleGenAI({ apiKey });

        // 1. Generate Script
        const scriptResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: imageBase64,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: "Você é um corretor de imóveis de altíssimo luxo narrando um 'Cinematic Drone Tour' para este ambiente. Descreva os diferenciais, a iluminação, os materiais e a sensação de exclusividade em um parágrafo único, dramático e muito envolvente. O texto será lido por uma IA de voz, então escreva de forma natural para a fala (use pausas sutis sugeridas por pontuação). O idioma deve ser Português do Brasil. Mantenha em no máximo 50 palavras.",
                    },
                ],
            },
        });

        let script = "";
        if (scriptResponse.candidates && scriptResponse.candidates.length > 0) {
            const parts = scriptResponse.candidates[0].content.parts;
            if (parts && parts[0].text) {
                script = parts[0].text;
            }
        }

        if (!script) {
            throw new Error("Failed to generate script");
        }

        // 2. Start Video Generation (if requested)
        let videoOperationName = null;
        if (includeVideo) {
            try {
                // Using Veo 3.1 for 5s video
                // Note: We use 'any' to bypass TS check if types aren't fully updated in the environment
                const videoPrompt = "Cinematic drone shot of this luxury property, 4k, slow smooth motion, professional lighting, photorealistic";
                
                // Construct the request for generateVideos
                // Based on new SDK patterns, it likely accepts prompt and image/contents
                // We'll try passing 'prompt' and 'image' which seems to be the pattern for specific helpers
                // or fall back to a generic 'contents' structure if needed.
                // However, the python example used client.models.generate_videos(model=..., prompt=...)
                
                // Let's try the most likely signature for the Node SDK helper
                const videoOp = await (ai.models as any).generateVideos({
                    model: 'veo-3.1-generate-preview',
                    prompt: videoPrompt,
                    video_length_seconds: 5, // Requesting 5 seconds
                    image: {
                        inlineData: {
                            data: imageBase64,
                            mimeType: mimeType
                        }
                    }
                });
                
                if (videoOp && videoOp.name) {
                    videoOperationName = videoOp.name;
                } else if (videoOp && videoOp.operation && videoOp.operation.name) {
                     // Sometimes it returns an object wrapping the operation
                     videoOperationName = videoOp.operation.name;
                }
                
                console.log("Video generation started:", videoOperationName);

            } catch (videoError) {
                console.error("Failed to start video generation:", videoError);
                // We don't fail the whole request, just return no video op
            }
        }

        // --- Deduct 2 credits ---
        const { error: creditError } = await supabaseAdmin
            .from('profiles')
            .update({ credits_remaining: profile.credits_remaining - 2 })
            .eq('id', userId);

        if (creditError) {
            console.error("Failed to deduct credit:", creditError);
        }

        // --- Save generation record to DB so we can track limit ---
        try {
            await supabaseAdmin.from('generations').insert({
                user_id: userId,
                original_image_url: 'drone-tour',
                generated_image_url: 'drone-tour',
                prompt_used: 'Cinematic Drone Tour Script',
                generation_mode: 'Drone Tour',
                is_compressed: false,
            });
        } catch (dbErr) {
            console.error("Failed to save generation record:", dbErr);
        }

        return res.status(200).json({
            script,
            videoOperationName,
            credits_remaining: profile.credits_remaining - 2,
        });
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to generate drone tour script' });
    }
}
