import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { supabaseAdmin } from './lib/supabaseAdmin.js';
import { buildPrompt, GenerationMode, ArchitecturalStyle } from './lib/promptBuilder.js';
import { checkRateLimit } from './lib/rateLimit.js';
import type { VercelRequest, VercelResponse } from './types.js';

const ORIGINALS_BUCKET = process.env.SUPABASE_BUCKET_ORIGINALS || process.env.VITE_SUPABASE_BUCKET_ORIGINALS || 'originals';
const GENERATIONS_BUCKET = process.env.SUPABASE_BUCKET_GENERATIONS || process.env.VITE_SUPABASE_BUCKET_GENERATIONS || 'generations';

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

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[API] Request received: ${req.method}`);
  const startedAt = Date.now();
  let userId: string | null = null;
  let creditsRemaining: number | null = null;
  let creditsReserved = false;
  let creditsRefunded = false;

  try {
    const requestSize = req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0;
    console.log(`[API] Incoming request size: ${(requestSize / 1024 / 1024).toFixed(2)} MB`);

    // --- Auth Check via Supabase ---
    if (!supabaseAdmin) {
      console.error("[API] Supabase Admin client is not initialized. Check server logs for missing env vars.");
      return res.status(500).json({ error: 'Erro de configuração do servidor: Credenciais do Supabase ausentes' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado: Token ausente ou inválido' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        console.warn("[API] Invalid token:", error?.message);
        return res.status(401).json({ error: 'Não autorizado: Token inválido' });
      }
      userId = user.id;
    } catch (error) {
      console.error("[API] Auth check failed:", error);
      return res.status(401).json({ error: 'Não autorizado: Token inválido' });
    }

    // --- Credit Check ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits_remaining, plan')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error("[API] Profile fetch failed:", profileError);
      return res.status(500).json({ error: 'Falha ao buscar perfil do usuário' });
    }

    // --- Method Check ---
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    const rateLimitKey = `generate:${userId}:${getClientIp(req)}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey);

    if (!rateLimitResult.success) {
      await recordMetric({
        userId,
        endpoint: 'generate',
        model: 'gemini-2.5-flash-image',
        success: false,
        errorMessage: 'Rate limit',
        latencyMs: Date.now() - startedAt,
        creditsUsed: 0,
        estimatedCostUsd: null
      });
      return res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
    }

    if (!req.body) {
      console.error("[API] Missing request body");
      return res.status(400).json({ error: 'Corpo da requisição ausente' });
    }

    const GenerateSchema = z.object({
      imageBase64: z.string().min(1, "Imagem obrigatória"),
      customPrompt: z.string().max(1000, "Prompt muito longo").optional(),
      prompt: z.string().max(1000).optional(),
      style: z.nativeEnum(ArchitecturalStyle).nullable().optional(),
      generationMode: z.nativeEnum(GenerationMode).optional().default(GenerationMode.REDESIGN),
      propertyId: z.string().optional(),
    });

    const validation = GenerateSchema.safeParse(req.body);

    if (!validation.success) {
      const errorMsg = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ error: `Dados inválidos: ${errorMsg}` });
    }

    const { imageBase64, customPrompt, prompt: legacyPrompt, style, generationMode } = validation.data;

    const userInstruction = customPrompt || legacyPrompt || "";

    // Validate imageBase64 size roughly
    if (imageBase64.length > 14 * 1024 * 1024) {
      return res.status(400).json({ error: 'Imagem muito grande (máx 10MB)' });
    }

    // Build the prompt securely on the server
    const finalPrompt = buildPrompt({
      generationMode: generationMode || 'Redesign',
      selectedStyle: style || null,
      customPrompt: userInstruction
    });

    try {
      const { data, error } = await supabaseAdmin.rpc('decrement_credits', {
        p_user_id: userId,
        p_amount: 1
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
          error: 'Sem créditos restantes',
          credits_remaining: 0,
          plan: profile.plan,
          message: 'Você usou todos os seus créditos. Atualize seu plano para continuar gerando.',
        });
      }
      console.error("[API] Failed to reserve credit:", creditError);
      return res.status(500).json({ error: 'Falha ao reservar créditos' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[API] GEMINI_API_KEY is not set in environment variables");
      await supabaseAdmin.rpc('increment_credits', { p_user_id: userId, p_amount: 1 });
      creditsRefunded = true;
      return res.status(500).json({ error: 'Erro de configuração: Chave da API ausente' });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Use Gemini 2.5 Flash Image for image editing (text-and-image-to-image).
    // Unlike Imagen 4 (text-to-image only), this model receives the original photo
    // as input and edits it while preserving structural layout (windows, doors, walls).
    const modelName = 'gemini-2.5-flash-image';
    console.log(`[API] Using model: ${modelName}`);

    let generatedBase64 = null;

    // Parse input image data
    const matches = imageBase64.match(/^data:(image\/([a-zA-Z]+));base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let imageData = imageBase64;

    if (matches && matches.length === 4) {
      mimeType = matches[1];
      imageData = matches[3];
    } else {
      imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    }

    // Use generateContent with the original image as input for true image editing.
    // The model analyzes the original photo's structure and applies only style changes.
    const result = await ai.models.generateContent({
      model: modelName,
      contents: [{
        role: 'user',
        parts: [
          { text: finalPrompt },
          { inlineData: { mimeType, data: imageData } }
        ]
      }],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      }
    });

    // @ts-expect-error - Response type handling for SDK variations
    const response = result.response || result;

    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      const imagePart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith('image/'));
      if (imagePart && imagePart.inlineData) {
        generatedBase64 = imagePart.inlineData.data;
      }
    }

    if (!generatedBase64) {
      console.warn("[API] Gemini returned no image. Response candidates:", JSON.stringify(response.candidates));
    }

    if (!generatedBase64) {
      throw new Error('Nenhuma imagem gerada pelo modelo.');
    }

    // --- Determine storage strategy based on plan ---
    const isPremium = profile.plan !== 'free';
    let generatedImageUrl: string | null = null;
    let isCompressed = false;
    let storagePath: string | null = null;
    let originalStoragePath: string | null = null;

    try {
      // 1. Upload Generated Image
      const buffer = Buffer.from(generatedBase64, 'base64');
      const extension = isPremium ? 'png' : 'jpg';
      const contentType = isPremium ? 'image/png' : 'image/jpeg';
      isCompressed = !isPremium;
      storagePath = `${userId}/${Date.now()}${isPremium ? '' : '_compressed'}.${extension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(GENERATIONS_BUCKET)
        .upload(storagePath, buffer, { contentType, upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      // 2. Upload Original Image (for audit)
      try {
        const matches = imageBase64.match(/^data:(image\/([a-zA-Z]+));base64,(.+)$/);
        if (matches && matches.length === 4) {
          const mimeType = matches[1];
          const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
          const data = matches[3];
          const inputBuffer = Buffer.from(data, 'base64');

          originalStoragePath = `${userId}/${Date.now()}_input.${ext}`;

          const { error: originalUploadError } = await supabaseAdmin.storage
            .from(ORIGINALS_BUCKET)
            .upload(originalStoragePath, inputBuffer, { contentType: mimeType, upsert: false });

          if (originalUploadError) {
            console.warn("Failed to upload original image:", originalUploadError);
            // Fallback to null, effectively
            originalStoragePath = null;
          }
        }
      } catch (origErr) {
        console.warn("Error processing original image upload:", origErr);
      }

      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from(GENERATIONS_BUCKET)
        .createSignedUrl(storagePath, 60 * 60);

      if (signedError || !signedData?.signedUrl) {
        throw signedError || new Error('Falha ao gerar signed URL');
      }

      generatedImageUrl = signedData.signedUrl;
    } catch (storageError) {
      console.error("Storage error", storageError);
      // Cleanup if one succeeded but other failed or general error
      if (storagePath) await supabaseAdmin.storage.from(GENERATIONS_BUCKET).remove([storagePath]);
      if (originalStoragePath) await supabaseAdmin.storage.from(ORIGINALS_BUCKET).remove([originalStoragePath]);

      await supabaseAdmin.rpc('increment_credits', { p_user_id: userId, p_amount: 1 });
      creditsRefunded = true;
      return res.status(500).json({ error: 'Falha ao salvar imagem no storage' });
    }

    try {
      await supabaseAdmin.from('generations').insert({
        user_id: userId,
        original_image_url: originalStoragePath || 'base64-upload',
        generated_image_url: storagePath || generatedImageUrl,
        prompt_used: finalPrompt,
        generation_mode: generationMode || 'Redesign',
        is_compressed: isCompressed,
      });
    } catch (dbError) {
      console.error("Generation metadata insert failed:", dbError);

      // Compensating Transaction: Cleanup Storage
      if (storagePath) await supabaseAdmin.storage.from(GENERATIONS_BUCKET).remove([storagePath]);
      if (originalStoragePath) await supabaseAdmin.storage.from(ORIGINALS_BUCKET).remove([originalStoragePath]);

      await supabaseAdmin.rpc('increment_credits', { p_user_id: userId, p_amount: 1 });
      creditsRefunded = true;
      return res.status(500).json({ error: 'Falha ao persistir geração' });
    }

    await recordMetric({
      userId,
      endpoint: 'generate',
      model: modelName,
      success: true,
      latencyMs: Date.now() - startedAt,
      inputBytes: imageBase64.length,
      outputBytes: generatedBase64.length,
      creditsUsed: 1,
      estimatedCostUsd: null
    });

    return res.status(200).json({
      result: generatedImageUrl,
      credits_remaining: creditsRemaining ?? profile.credits_remaining,
      is_compressed: isCompressed,
      storage_path: storagePath ?? undefined
    });

  } catch (error: any) {
    console.error("Generation API Error:", error);
    if (userId) {
      await recordMetric({
        userId,
        endpoint: 'generate',
        model: 'gemini-2.5-flash-image',
        success: false,
        errorMessage: error.message || 'Erro desconhecido',
        latencyMs: Date.now() - startedAt,
        inputBytes: req.body?.imageBase64?.length ?? null,
        creditsUsed: creditsReserved ? 1 : 0,
        estimatedCostUsd: null
      });
    }
    if (supabaseAdmin && creditsReserved && !creditsRefunded) {
      await supabaseAdmin.rpc('increment_credits', { p_user_id: userId, p_amount: 1 });
    }
    return res.status(500).json({
      error: 'Falha interna na geração',
      message: error.message || 'Erro desconhecido ao processar imagem'
    });
  }
}
