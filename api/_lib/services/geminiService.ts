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
            let generatedBase64: string | null = null;

            if (response.candidates && response.candidates.length > 0) {
                const parts = response.candidates[0].content.parts;
                const imagePart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith('image/'));
                if (imagePart && imagePart.inlineData) {
                    generatedBase64 = imagePart.inlineData.data;
                }
            }

            if (!generatedBase64) {
                throw new AppError('Nenhuma imagem gerada pelo modelo.', 500);
            }

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
}
