import { GoogleGenAI } from "@google/genai";
import { checkRateLimit } from './_lib/rateLimit.js';
import { withErrorHandler } from './_lib/middleware/errorHandler.js';
import { withAuth, AuthenticatedRequest } from './_lib/middleware/auth.js';
import { CreditService } from './_lib/services/creditService.js';
import { GeminiService } from './_lib/services/geminiService.js';
import { getClientIp, recordMetric } from './_lib/utils.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { RateLimitError, BadRequestError, AppError, ForbiddenError } from './_lib/errors/AppError.js';
import type { VercelResponse, GenerateDroneTourRequest } from './_lib/types.js';

const handler = async (req: AuthenticatedRequest, res: VercelResponse) => {
    const startedAt = Date.now();
    const userId = req.auth.userId;

    let creditsReserved = false;
    const modelName = 'veo-2.0-generate-001';

    try {
        if (req.method !== 'POST') {
            throw new AppError('Método não permitido', 405);
        }

        // --- Rate Limit ---
        const rateLimitKey = `generate-drone:${userId}:${getClientIp(req)}`;
        const rateLimitResult = await checkRateLimit(rateLimitKey);
        if (!rateLimitResult.success) {
            throw new RateLimitError();
        }

        const { imageUrl, includeVideo, customPrompt } = req.body as GenerateDroneTourRequest;

        // Validation and Sanitization
        if (customPrompt && customPrompt.length > 500) {
            throw new BadRequestError('Prompt muito longo (máx 500 caracteres)');
        }

        const sanitizedPrompt = customPrompt ? customPrompt.replace(/[<>]/g, '') : '';

        if (!imageUrl) {
            throw new BadRequestError('URL da imagem ausente');
        }

        let imageBase64: string;
        let mimeType: string;
        const maxImageBytes = 10 * 1024 * 1024;

        if (imageUrl.startsWith('data:')) {
            const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new BadRequestError('Formato de Data URL inválido');
            }
            mimeType = matches[1];
            imageBase64 = matches[2];
            if (imageBase64.length > maxImageBytes * 1.4) {
                throw new BadRequestError('Imagem muito grande (máx 10MB)');
            }
        } else {
            try {
                const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
                if (!supabaseUrl) throw new AppError('Erro de configuração do servidor', 500);

                const url = new URL(imageUrl);
                const allowedHost = new URL(supabaseUrl).hostname;

                const isAllowed = url.hostname === allowedHost ||
                    url.hostname.endsWith('.supabase.co') ||
                    url.hostname.endsWith('.supabase.in');

                if (!isAllowed) {
                    throw new BadRequestError('Domínio de imagem inválido. Apenas URLs do Supabase são permitidas.');
                }
            } catch (e) {
                if (e instanceof AppError) throw e;
                throw new BadRequestError('Formato de URL de imagem inválido');
            }

            try {
                const imageRes = await fetch(imageUrl);
                const contentLengthHeader = imageRes.headers.get('content-length');
                if (contentLengthHeader && parseInt(contentLengthHeader, 10) > maxImageBytes) {
                    throw new BadRequestError('Imagem muito grande (máx 10MB)');
                }
                const arrayBuffer = await imageRes.arrayBuffer();
                if (arrayBuffer.byteLength > maxImageBytes) {
                    throw new BadRequestError('Imagem muito grande (máx 10MB)');
                }
                const buffer = Buffer.from(arrayBuffer);
                imageBase64 = buffer.toString('base64');
                mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
            } catch (fetchErr) {
                console.error("[generate-drone-tour] Failed to fetch image URL:", fetchErr);
                throw new BadRequestError('Falha ao buscar imagem da URL');
            }
        }

        // --- 1. Fetch Profile and Apply Plan Restrictions ---
        const profile = await CreditService.getProfile(userId);

        if (profile.plan === 'free') {
            const { count, error: countError } = await supabaseAdmin!
                .from('generations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('generation_mode', 'Drone Tour');

            if (!countError && count && count >= 1) {
                throw new ForbiddenError('Limite gratuito atingido', {
                    message: 'Usuários do plano grátis podem gerar apenas 1 Cinematic Tour. Faça upgrade para gerar mais.'
                });
            }
        }

        // --- 2. Pre-charge Credits (50 for drone tour) ---
        await CreditService.reserveCredits(userId, 50);
        creditsReserved = true;

        // --- 3. AI Generation ---
        const basePrompt = "Cinematic FPV drone shot flying smoothly through THIS EXACT room. Keep all walls, windows, and furniture layout exactly as in the image. Do not change the room structure. High-end real estate video, 4k, soft natural lighting, slow motion, photorealistic, architectural digest style.";
        const videoPrompt = sanitizedPrompt ? `${basePrompt} ${sanitizedPrompt} (MAINTAIN STRUCTURAL CONSISTENCY)` : basePrompt;

        const videoOperationName = await GeminiService.generateDroneTourVideo(videoPrompt, imageBase64, mimeType);

        // --- 4. Database Persistence ---
        try {
            await supabaseAdmin!.from('generations').insert({
                user_id: userId,
                original_image_url: imageUrl,
                generated_image_url: videoOperationName,
                prompt_used: sanitizedPrompt ? `Cinematic Drone Tour: ${sanitizedPrompt}` : 'Cinematic Drone Tour Video',
                generation_mode: 'Drone Tour',
                is_compressed: false,
            });
        } catch (dbErr) {
            console.error("[generate-drone-tour] Failed to save generation record:", dbErr);
            throw new AppError('Falha ao persistir geração', 500);
        }

        // --- 5. Record Metrics ---
        await recordMetric({
            userId,
            endpoint: 'generate-drone-tour',
            model: modelName,
            success: true,
            latencyMs: Date.now() - startedAt,
            inputBytes: imageBase64?.length ?? null,
            outputBytes: 0,
            creditsUsed: 50,
        });

        return res.status(200).json({
            videoOperationName,
            credits_remaining: profile.credits_remaining - 50
        });

    } catch (error: any) {
        if (creditsReserved && !(error instanceof AppError && error.statusCode === 403)) {
            await CreditService.refundCredits(userId, 50);
        }

        await recordMetric({
            userId,
            endpoint: 'generate-drone-tour',
            model: modelName,
            success: false,
            errorMessage: error.message || 'Erro interno no servidor',
            latencyMs: Date.now() - startedAt,
            inputBytes: null,
            creditsUsed: 0,
        });

        throw error;
    }
};

export default withErrorHandler(withAuth(handler as any));
