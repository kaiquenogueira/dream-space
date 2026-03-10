import { supabaseAdmin } from '../supabaseAdmin.js';
import { AppError } from '../errors/AppError.js';

const ORIGINALS_BUCKET = process.env.SUPABASE_BUCKET_ORIGINALS || process.env.VITE_SUPABASE_BUCKET_ORIGINALS || 'originals';
const GENERATIONS_BUCKET = process.env.SUPABASE_BUCKET_GENERATIONS || process.env.VITE_SUPABASE_BUCKET_GENERATIONS || 'generations';

export class StorageService {
    /**
     * Uploads the generated base64 image to Supabase Storage and returns a presigned URL and storage path.
     */
    static async uploadGeneration(userId: string, base64Data: string, isPremium: boolean): Promise<{ signedUrl: string; storagePath: string; isCompressed: boolean }> {
        if (!supabaseAdmin) throw new AppError('Supabase admin not initialized', 500);

        const buffer = Buffer.from(base64Data, 'base64');
        const extension = isPremium ? 'png' : 'jpg';
        const contentType = isPremium ? 'image/png' : 'image/jpeg';
        const isCompressed = !isPremium;
        const storagePath = `${userId}/${Date.now()}${isPremium ? '' : '_compressed'}.${extension}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from(GENERATIONS_BUCKET)
            .upload(storagePath, buffer, { contentType, upsert: false });

        if (uploadError) {
            console.error("[StorageService] Generation upload failed:", uploadError);
            throw new AppError('Falha ao fazer upload da imagem gerada', 500, uploadError);
        }

        const { data: signedData, error: signedError } = await supabaseAdmin.storage
            .from(GENERATIONS_BUCKET)
            .createSignedUrl(storagePath, 60 * 60);

        if (signedError || !signedData?.signedUrl) {
            // Cleanup on failure
            await this.removeFile(GENERATIONS_BUCKET, storagePath);
            throw new AppError('Falha ao gerar URL assinada', 500, signedError);
        }

        return { signedUrl: signedData.signedUrl, storagePath, isCompressed };
    }

    /**
     * Uploads the original base64 image (used as input) to Supabase Storage for auditing.
     * Fails silently (returns null) since it's not strictly necessary for generation success.
     */
    static async uploadOriginalAsync(userId: string, imageBase64: string): Promise<string | null> {
        if (!supabaseAdmin) return null;

        try {
            const matches = imageBase64.match(/^data:(image\/([a-zA-Z]+));base64,(.+)$/);
            if (matches && matches.length === 4) {
                const mimeType = matches[1];
                const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
                const data = matches[3];
                const inputBuffer = Buffer.from(data, 'base64');

                const originalStoragePath = `${userId}/${Date.now()}_input.${ext}`;

                const { error: originalUploadError } = await supabaseAdmin.storage
                    .from(ORIGINALS_BUCKET)
                    .upload(originalStoragePath, inputBuffer, { contentType: mimeType, upsert: false });

                if (originalUploadError) {
                    console.warn("[StorageService] Failed to upload original image:", originalUploadError);
                    return null;
                }

                return originalStoragePath;
            }
        } catch (err) {
            console.warn("[StorageService] Error processing original image upload:", err);
        }
        return null;
    }

    /**
     * Persists the generation metadata to the database.
     */
    static async saveGenerationMetadata(params: {
        userId: string;
        originalImageUrl: string;
        generatedImageUrl: string;
        promptUsed: string;
        generationMode: string;
        isCompressed: boolean;
    }) {
        if (!supabaseAdmin) throw new AppError('Supabase admin not initialized', 500);

        const { error } = await supabaseAdmin.from('generations').insert({
            user_id: params.userId,
            original_image_url: params.originalImageUrl,
            generated_image_url: params.generatedImageUrl,
            prompt_used: params.promptUsed,
            generation_mode: params.generationMode,
            is_compressed: params.isCompressed,
        });

        if (error) {
            console.error("[StorageService] Metadata insert failed:", error);
            throw new AppError('Falha ao persistir metadados da geração', 500, error);
        }
    }

    /**
     * Removes a file from a bucket (used for compensating transactions/cleanup).
     */
    static async removeFile(bucketName: string, path: string) {
        if (!supabaseAdmin) return;
        try {
            await supabaseAdmin.storage.from(bucketName).remove([path]);
        } catch (e) {
            console.error(`[StorageService] Failed to remove file ${path} from ${bucketName}`, e);
        }
    }
}
