import { GoogleGenAI } from "@google/genai";
import { AppError } from '../errors/AppError.js';
import { supabaseAdmin } from '../supabaseAdmin.js';

export class GeminiService {
    private static getAI() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new AppError('Erro de configuração: Chave da API ausente', 500);
        }
        return new GoogleGenAI({ apiKey });
    }

    /**
     * Parses the base64 input image for Gemini.
     */
    private static parseImageBase64(imageBase64: string) {
        const matches = imageBase64.match(/^data:(image\/([a-zA-Z]+));base64,(.+)$/);
        let mimeType = 'image/jpeg';
        let imageData = imageBase64;

        if (matches && matches.length === 4) {
            mimeType = matches[1];
            imageData = matches[3];
        } else {
            imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        }

        return { mimeType, imageData };
    }

    /**
     * Generates an image using Gemini Flash 2.5
     */
    static async generateImage(prompt: string, imageBase64: string): Promise<string> {
        const ai = this.getAI();
        const modelName = 'gemini-2.5-flash-image';
        const { mimeType, imageData } = this.parseImageBase64(imageBase64);

        console.log(`[GeminiService] Using model: ${modelName}`);

        try {
            const result = await ai.models.generateContent({
                model: modelName,
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType, data: imageData } }
                    ]
                }],
                config: {
                    responseModalities: ['TEXT', 'IMAGE'],
                }
            });

            // @ts-expect-error - Response type handling for SDK variations
            const response = result.response || result;
            const generatedBase64 = this.extractGeneratedImageBase64(result, response);

            if (!generatedBase64) {
                throw new AppError('Nenhuma imagem gerada pelo modelo.', 500);
            }

            console.log('[GeminiService] Image generated successfully', {
                promptLength: prompt.length,
                outputBytes: generatedBase64.length,
            });

            return generatedBase64;
        } catch (error: any) {
            console.error("[GeminiService] Generation failed:", error);
            throw new AppError(error.message || 'Falha na geração de imagem com IA', 500);
        }
    }

    /**
     * Initiates a drone tour video generation using Veo 2.0
     */
    static async generateDroneTourVideo(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
        const ai = this.getAI();
        const modelName = 'veo-2.0-generate-001';

        try {
            const videoOp: any = await (ai.models as any).generateVideos({
                model: modelName,
                prompt: prompt,
                image: {
                    imageBytes: imageBase64,
                    mimeType: mimeType
                },
                config: {
                    durationSeconds: 5
                }
            });

            let videoOperationName = null;
            if (videoOp && videoOp.name) {
                videoOperationName = videoOp.name;
            } else if (videoOp && videoOp.operation && videoOp.operation.name) {
                videoOperationName = videoOp.operation.name;
            }

            if (!videoOperationName) {
                throw new AppError("Falha ao iniciar geração de vídeo (Operação nula)", 500);
            }

            console.log("[GeminiService] Video generation started:", videoOperationName);
            return videoOperationName;

        } catch (error: any) {
            console.error("[GeminiService] Video generation failed:", error);
            throw new AppError(error.message || 'Falha ao iniciar geração de vídeo', 500);
        }
    }

    private static extractGeneratedImageBase64(result: any, response: any): string | null {
        const generatedImages = result?.generatedImages || response?.generatedImages;
        if (Array.isArray(generatedImages) && generatedImages.length > 0) {
            const bytes = generatedImages[0]?.image?.imageBytes || generatedImages[0]?.imageBytes;
            if (typeof bytes === 'string' && bytes.length > 0) {
                return bytes;
            }
        }

        const candidates = response?.candidates;
        if (Array.isArray(candidates) && candidates.length > 0) {
            for (const candidate of candidates) {
                const parts = candidate?.content?.parts;
                if (!Array.isArray(parts)) continue;

                const imagePart = parts.find((p: any) => p?.inlineData?.mimeType?.startsWith('image/'));
                if (imagePart?.inlineData?.data) {
                    return imagePart.inlineData.data;
                }
            }
        }

        console.warn('[GeminiService] No image payload found in Gemini response', {
            hasGeneratedImages: Array.isArray(generatedImages) && generatedImages.length > 0,
            candidateCount: Array.isArray(candidates) ? candidates.length : 0,
        });

        return null;
    }
}
