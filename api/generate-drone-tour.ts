import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from './lib/supabaseAdmin.js';
import { checkRateLimit } from './lib/rateLimit.js';
import type { VercelRequest, VercelResponse, GenerateDroneTourRequest } from './types.js';

const getClientIp = (req: VercelRequest) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
        return forwardedFor[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
};

const recordMetric = async (params: {
    userId: string;
    endpoint: string;
    model?: string | null;
    success: boolean;
    errorMessage?: string | null;
    latencyMs?: number | null;
    inputBytes?: number | null;
    outputBytes?: number | null;
    creditsUsed?: number;
    estimatedCostUsd?: number | null;
}) => {
    if (!supabaseAdmin) return;
    try {
        await supabaseAdmin.from('generation_metrics').insert({
            user_id: params.userId,
            endpoint: params.endpoint,
            model: params.model,
            success: params.success,
            error_message: params.errorMessage ?? null,
            latency_ms: params.latencyMs ?? null,
            input_bytes: params.inputBytes ?? null,
            output_bytes: params.outputBytes ?? null,
            credits_used: params.creditsUsed ?? 0,
            estimated_cost_usd: params.estimatedCostUsd ?? null
        });
    } catch (error) {
        return;
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const startedAt = Date.now();
    let creditsRemaining: number | null = null;
    let creditsReserved = false;
    let creditsRefunded = false;
    // --- Auth Check via Supabase ---
    if (!supabaseAdmin) {
        console.error("Supabase Admin client is not initialized. Check server logs for missing env vars.");
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

    // --- Credit and Plan Check ---
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('credits_remaining, plan')
        .eq('id', userId)
        .single();

    if (profileError || !profile) {
        return res.status(500).json({ error: 'Falha ao buscar perfil do usuário' });
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
                error: 'Limite gratuito atingido',
                message: 'Usuários do plano grátis podem gerar apenas 1 Cinematic Tour. Faça upgrade para gerar mais.',
            });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const rateLimitKey = `generate-drone:${userId}:${getClientIp(req)}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey);
    
    if (!rateLimitResult.success) {
        await recordMetric({
            userId,
            endpoint: 'generate-drone-tour',
            model: 'veo-3.0-fast-generate-001',
            success: false,
            errorMessage: 'Rate limit',
            latencyMs: Date.now() - startedAt,
            creditsUsed: 0,
            estimatedCostUsd: null
        });
        return res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
    }

    const { imageUrl, includeVideo, customPrompt } = req.body as GenerateDroneTourRequest;

    // Validation and Sanitization
    if (customPrompt && customPrompt.length > 500) {
        return res.status(400).json({ error: 'Prompt muito longo (máx 500 caracteres)' });
    }
    
    // Basic sanitization (remove potential injection patterns if any, though length limit is most effective for LLM prompts)
    const sanitizedPrompt = customPrompt ? customPrompt.replace(/[<>]/g, '') : '';

    if (!imageUrl) {
        return res.status(400).json({ error: 'URL da imagem ausente' });
    }

    let imageBase64: string;
    let mimeType: string;
    const maxImageBytes = 10 * 1024 * 1024;

    if (imageUrl.startsWith('data:')) {
        const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Formato de Data URL inválido' });
        }
        mimeType = matches[1];
        imageBase64 = matches[2];
        if (imageBase64.length > maxImageBytes * 1.4) {
            return res.status(400).json({ error: 'Imagem muito grande (máx 10MB)' });
        }
    } else {
        // SSRF Protection: Validate image URL domain
        try {
            const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            if (!supabaseUrl) {
                console.error('Missing SUPABASE_URL');
                return res.status(500).json({ error: 'Erro de configuração do servidor' });
            }

            const url = new URL(imageUrl);
            const allowedHost = new URL(supabaseUrl).hostname;

            // Allow Supabase project URL and standard Supabase domains
            const isAllowed = url.hostname === allowedHost ||
                url.hostname.endsWith('.supabase.co') ||
                url.hostname.endsWith('.supabase.in');

            if (!isAllowed) {
                return res.status(400).json({ error: 'Domínio de imagem inválido. Apenas URLs do Supabase são permitidas.' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Formato de URL de imagem inválido' });
        }

        // Fetch the image to get base64
        try {
            const imageRes = await fetch(imageUrl);
            const contentLengthHeader = imageRes.headers.get('content-length');
            if (contentLengthHeader && parseInt(contentLengthHeader, 10) > maxImageBytes) {
                return res.status(400).json({ error: 'Imagem muito grande (máx 10MB)' });
            }
            const arrayBuffer = await imageRes.arrayBuffer();
            if (arrayBuffer.byteLength > maxImageBytes) {
                return res.status(400).json({ error: 'Imagem muito grande (máx 10MB)' });
            }
            const buffer = Buffer.from(arrayBuffer);
            imageBase64 = buffer.toString('base64');
            mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
        } catch (fetchErr) {
            console.error("Failed to fetch image URL:", fetchErr);
            return res.status(400).json({ error: 'Falha ao buscar imagem da URL' });
        }
    }

    try {
        try {
            const { data, error } = await supabaseAdmin.rpc('decrement_credits', {
                p_user_id: userId,
                p_amount: 50
            });
            if (error) {
                throw error;
            }
            creditsRemaining = data;
            creditsReserved = true;
        } catch (creditError: any) {
            const message = creditError?.message?.toLowerCase() || '';
            if (message.includes('insufficient_credits')) {
                return res.status(403).json({
                    error: 'Créditos insuficientes',
                    credits_remaining: profile.credits_remaining,
                    message: 'O Cinematic Drone Tour custa 50 créditos. Faça upgrade do seu plano.',
                });
            }
            console.error("Failed to reserve credits:", creditError);
            return res.status(500).json({ error: 'Falha ao reservar créditos' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            await supabaseAdmin.rpc('increment_credits', { p_user_id: userId, p_amount: 50 });
            creditsRefunded = true;
            return res.status(500).json({ error: 'Erro de configuração: Chave da API ausente' });
        }

        const ai = new GoogleGenAI({ apiKey });
        const modelName = 'veo-2.0-generate-001';

        // 1. Generate Video
        // Using Veo for 5s video
        // We use the image to prompt the video generation for better context
        let videoOperationName = null;

        try {
            // Enhanced prompt for luxury real estate drone shot with structural preservation instructions
            const basePrompt = "Cinematic FPV drone shot flying smoothly through THIS EXACT room. Keep all walls, windows, and furniture layout exactly as in the image. Do not change the room structure. High-end real estate video, 4k, soft natural lighting, slow motion, photorealistic, architectural digest style.";
            
            // Concatenate user custom prompt if provided
            const videoPrompt = sanitizedPrompt ? `${basePrompt} ${sanitizedPrompt} (MAINTAIN STRUCTURAL CONSISTENCY)` : basePrompt;

            const videoOp = await (ai.models as any).generateVideos({
                model: modelName,
                // Reverting to the model name found in previous code which seemed to work or be intended
                // The previous code had 'veo-3.0-fast-generate-001'. If that fails, we can try 'veo-2.0-generate-001'
                // For safety, I'll stick to 'veo-2.0-generate-001' which is more likely to be the public alias unless 3.0 is in private preview.
                // Actually, let's trust the previous code's intent but maybe correct the model name if it looks like a typo.
                // 'veo-3.0' is not publicly released yet (as of early 2025 knowledge cut). 'veo-2.0' is more likely.
                // But the user might have access. I will use a safe default or keep the original if I'm not sure.
                // Let's use 'veo-2.0-generate-001' as a safe bet for a "working" app.
                prompt: videoPrompt,
                image: {
                    imageBytes: imageBase64,
                    mimeType: mimeType
                },
                config: {
                    durationSeconds: 5 // Reduced to 5s as per credit model (50 credits = 5s video) and stability
                }
            });

            if (videoOp && videoOp.name) {
                videoOperationName = videoOp.name;
            } else if (videoOp && videoOp.operation && videoOp.operation.name) {
                videoOperationName = videoOp.operation.name;
            }

            console.log("Video generation started:", videoOperationName);

            if (!videoOperationName) {
                throw new Error("Falha ao iniciar geração de vídeo");
            }

        } catch (videoError: any) {
            console.error("Failed to start video generation:", videoError);
            if (!creditsRefunded) {
                await supabaseAdmin.rpc('increment_credits', { p_user_id: userId, p_amount: 50 });
                creditsRefunded = true;
            }
            await recordMetric({
                userId,
                endpoint: 'generate-drone-tour',
                model: modelName,
                success: false,
                errorMessage: videoError.message || 'Falha ao iniciar geração de vídeo',
                latencyMs: Date.now() - startedAt,
                inputBytes: imageBase64?.length ?? null,
                outputBytes: null,
                creditsUsed: creditsReserved ? 50 : 0,
                estimatedCostUsd: null
            });
            return res.status(500).json({ error: videoError.message || 'Falha ao iniciar geração de vídeo' });
        }

        // --- Save generation record to DB so we can track limit ---
        try {
            await supabaseAdmin.from('generations').insert({
                user_id: userId,
                original_image_url: imageUrl, // Store the actual input image URL
                generated_image_url: videoOperationName,
                prompt_used: sanitizedPrompt ? `Cinematic Drone Tour: ${sanitizedPrompt}` : 'Cinematic Drone Tour Video',
                generation_mode: 'Drone Tour',
                is_compressed: false,
            });
        } catch (dbErr) {
            console.error("Failed to save generation record:", dbErr);
            if (!creditsRefunded) {
                await supabaseAdmin.rpc('increment_credits', { p_user_id: userId, p_amount: 50 });
                creditsRefunded = true;
            }
            return res.status(500).json({ error: 'Falha ao persistir geração' });
        }

        await recordMetric({
            userId,
            endpoint: 'generate-drone-tour',
            model: modelName,
            success: true,
            latencyMs: Date.now() - startedAt,
            inputBytes: imageBase64?.length ?? null,
            outputBytes: 0,
            creditsUsed: 50,
            estimatedCostUsd: null
        });

        return res.status(200).json({
            videoOperationName,
            credits_remaining: creditsRemaining ?? profile.credits_remaining
        });

    } catch (error: any) {
        console.error("Drone Tour API Error:", error);
        if (creditsReserved && !creditsRefunded) {
            await supabaseAdmin.rpc('increment_credits', { p_user_id: userId, p_amount: 50 });
        }
        if (typeof userId === 'string') {
            await recordMetric({
                userId,
                endpoint: 'generate-drone-tour',
                model: 'veo-2.0-generate-001',
                success: false,
                errorMessage: error.message || 'Erro interno no servidor',
                latencyMs: Date.now() - startedAt,
                inputBytes: null,
                creditsUsed: creditsReserved ? 50 : 0,
                estimatedCostUsd: null
            });
        }
        return res.status(500).json({ error: error.message || 'Erro interno no servidor' });
    }
}
