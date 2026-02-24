import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from './lib/supabaseAdmin.js';

export default async function handler(req: any, res: any) {
    // --- Auth Check via Supabase ---
    if (!supabaseAdmin) {
        console.error("Supabase Admin client is not initialized. Check server logs for missing env vars.");
        return res.status(500).json({ error: 'Server configuration error: Missing Supabase credentials' });
    }

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

    let imageBase64: string;
    let mimeType: string;

    if (imageUrl.startsWith('data:')) {
        const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Invalid data URL format' });
        }
        mimeType = matches[1];
        imageBase64 = matches[2];
    } else {
        // SSRF Protection: Validate image URL domain
        try {
            const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            if (!supabaseUrl) {
                console.error('Missing SUPABASE_URL');
                return res.status(500).json({ error: 'Server configuration error' });
            }

            const url = new URL(imageUrl);
            const allowedHost = new URL(supabaseUrl).hostname;

            // Allow Supabase project URL and standard Supabase domains
            const isAllowed = url.hostname === allowedHost ||
                url.hostname.endsWith('.supabase.co') ||
                url.hostname.endsWith('.supabase.in');

            if (!isAllowed) {
                return res.status(400).json({ error: 'Invalid image URL domain. Only Supabase storage URLs are allowed.' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid image URL format' });
        }

        // Fetch the image to get base64
        try {
            const imageRes = await fetch(imageUrl);
            const arrayBuffer = await imageRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            imageBase64 = buffer.toString('base64');
            mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
        } catch (fetchErr) {
            console.error("Failed to fetch image URL:", fetchErr);
            return res.status(400).json({ error: 'Failed to fetch image from URL' });
        }
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const ai = new GoogleGenAI({ apiKey });

        // 1. Generate Video
        // Using Veo for 5s video
        // We use the image to prompt the video generation for better context
        let videoOperationName = null;

        try {
            // Enhanced prompt for luxury real estate drone shot
            const videoPrompt = "Cinematic FPV drone shot flying smoothly through this luxury interior. High-end real estate video, 4k, soft natural lighting, slow motion, photorealistic, architectural digest style.";

            // Construct the request for generateVideos
            // Using the correct method generateContent is likely wrong for video generation which usually returns an Operation
            // The previous error was about `image` struct format in `generateVideos` (or `generateVideo` which likely aliases to it)

            // Let's go back to generateVideos but fix the structure based on the error
            // Error: "Input instance with `image` should contain both `bytesBase64Encoded` and `mimeType`"

            const videoOp = await (ai.models as any).generateVideos({
                model: 'veo-3.0-fast-generate-001',
                prompt: videoPrompt,
                image: {
                    imageBytes: imageBase64,
                    mimeType: mimeType
                },
                config: {
                    durationSeconds: 8
                }
            });

            if (videoOp && videoOp.name) {
                videoOperationName = videoOp.name;
            } else if (videoOp && videoOp.operation && videoOp.operation.name) {
                videoOperationName = videoOp.operation.name;
            }

            console.log("Video generation started:", videoOperationName);

            if (!videoOperationName) {
                throw new Error("Failed to start video generation");
            }

        } catch (videoError: any) {
            console.error("Failed to start video generation:", videoError);
            return res.status(500).json({ error: videoError.message || 'Failed to start video generation' });
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
                original_image_url: imageUrl, // Store the actual input image URL
                generated_image_url: 'drone-tour-video', // Still placeholder as we don't store the video anymore
                prompt_used: 'Cinematic Drone Tour Video',
                generation_mode: 'Drone Tour',
                is_compressed: false,
            });
        } catch (dbErr) {
            console.error("Failed to save generation record:", dbErr);
        }

        return res.status(200).json({
            videoOperationName,
            credits_remaining: profile.credits_remaining - 2,
        });
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to generate drone tour script' });
    }
}
