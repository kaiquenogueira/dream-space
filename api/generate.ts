import { z } from "zod";
import { buildPrompt, GenerationMode, ArchitecturalStyle } from './_lib/promptBuilder.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import { withErrorHandler } from './_lib/middleware/errorHandler.js';
import { withAuth, AuthenticatedRequest } from './_lib/middleware/auth.js';
import { CreditService } from './_lib/services/creditService.js';
import { GeminiService } from './_lib/services/geminiService.js';
import { StorageService } from './_lib/services/storageService.js';
import { getClientIp, recordMetric } from './_lib/utils.js';
import { RateLimitError, BadRequestError, AppError } from './_lib/errors/AppError.js';
import type { VercelResponse } from './_lib/types.js';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const GenerateSchema = z.object({
  imageBase64: z.string().min(1, "Imagem obrigatória"),
  customPrompt: z.string().max(1000, "Prompt muito longo").optional(),
  prompt: z.string().max(1000).optional(),
  style: z.nativeEnum(ArchitecturalStyle).nullable().optional(),
  generationMode: z.nativeEnum(GenerationMode).optional().default(GenerationMode.VIRTUAL_STAGING),
  isIteration: z.boolean().optional().default(false),
  propertyId: z.string().optional(),
});

const handler = async (req: AuthenticatedRequest, res: VercelResponse) => {
  const startedAt = Date.now();
  const userId = req.auth.userId;

  let creditsReserved = false;
  const modelName = 'gemini-2.5-flash-image';

  try {
    if (req.method !== 'POST') {
      throw new AppError('Método não permitido', 405);
    }

    if (!req.body) {
      throw new BadRequestError('Corpo da requisição ausente');
    }

    // --- Rate Limit ---
    const rateLimitKey = `generate:${userId}:${getClientIp(req)}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey);
    if (!rateLimitResult.success) {
      throw new RateLimitError();
    }

    // --- Validation ---
    const validation = GenerateSchema.safeParse(req.body);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new BadRequestError(`Dados inválidos: ${errorMsg}`);
    }

    const { imageBase64, customPrompt, prompt: legacyPrompt, style, generationMode, isIteration } = validation.data;
    const userInstruction = customPrompt || legacyPrompt || "";

    if (imageBase64.length > 14 * 1024 * 1024) {
      throw new BadRequestError('Imagem muito grande (máx 10MB)');
    }

    const finalPrompt = buildPrompt({
      generationMode: generationMode || GenerationMode.VIRTUAL_STAGING,
      selectedStyle: style || null,
      customPrompt: userInstruction,
      isIteration,
    });

    // --- 1. Fetch Profile ---
    const profile = await CreditService.getProfile(userId);
    const isPremium = profile.plan !== 'free';

    // --- 2. Pre-charge Credits ---
    await CreditService.reserveCredits(userId, 1);
    creditsReserved = true;

    // --- 3. AI Generation ---
    const generatedBase64 = await GeminiService.generateImage(finalPrompt, imageBase64);

    // --- 4. Storage & DB persistence ---
    const originalStoragePath = await StorageService.uploadOriginalAsync(userId, imageBase64);

    const { signedUrl: generatedImageUrl, storagePath, isCompressed } = await StorageService.uploadGeneration(
      userId,
      generatedBase64,
      isPremium
    );

    await StorageService.saveGenerationMetadata({
      userId,
      originalImageUrl: originalStoragePath || 'base64-upload',
      generatedImageUrl: storagePath || generatedImageUrl,
      promptUsed: finalPrompt,
      generationMode: generationMode || GenerationMode.VIRTUAL_STAGING,
      isCompressed
    });

    // --- 5. Record Success Metric ---
    await recordMetric({
      userId,
      endpoint: 'generate',
      model: modelName,
      success: true,
      latencyMs: Date.now() - startedAt,
      inputBytes: imageBase64.length,
      outputBytes: generatedBase64.length,
      creditsUsed: 1,
    });

    return res.status(200).json({
      result: generatedImageUrl,
      credits_remaining: profile.credits_remaining - 1, // Reflect new state
      is_compressed: isCompressed,
      storage_path: storagePath
    });

  } catch (error: any) {
    if (creditsReserved && !(error instanceof AppError && error.statusCode === 403)) {
      await CreditService.refundCredits(userId, 1);
    }

    await recordMetric({
      userId,
      endpoint: 'generate',
      model: modelName,
      success: false,
      errorMessage: error.message || 'Erro desconhecido',
      latencyMs: Date.now() - startedAt,
      inputBytes: req.body?.imageBase64?.length ?? null,
      creditsUsed: 0,
    });

    throw error; // Re-throw to be handled by withErrorHandler
  }
};

// Apply middlewares: Auth first, then Error capturing
export default withErrorHandler(withAuth(handler as any));
