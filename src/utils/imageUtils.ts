import imageCompression from 'browser-image-compression';
import type { UploadedImage } from '../types';

export const compressImage = async (file: File): Promise<{ base64: string, preview: string }> => {
  const options = {
    maxSizeMB: 1, // Max 1MB
    maxWidthOrHeight: 1536,
    useWebWorker: true, // Use web worker for better performance
    fileType: 'image/jpeg',
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const base64 = await blobToBase64(compressedFile);
    const preview = await imageCompression.getDataUrlFromFile(compressedFile);

    return { base64, preview };
  } catch (error) {
    console.error("Compression failed:", error);
    // Fallback to original if compression fails (though unlikely)
    const base64 = await blobToBase64(file);
    const preview = URL.createObjectURL(file);
    return { base64, preview };
  }
};

/** Converts a Blob to a base64 string (without data URL prefix). */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
};

export const resolveImageBase64 = async (image: { base64?: string; previewUrl?: string }): Promise<string> => {
  if (image.base64) return image.base64;
  if (image.previewUrl?.startsWith('data:')) {
    return image.previewUrl.split(',')[1] || '';
  }
  if (image.previewUrl) {
    const response = await fetch(image.previewUrl);
    if (!response.ok) {
      throw new Error('Falha ao carregar imagem para geração');
    }
    const blob = await response.blob();
    return await blobToBase64(blob);
  }
  throw new Error('Imagem indisponível para geração');
};

/**
 * Resolves the base64 for generation. When `iterateFromGenerated` is true
 * and a generated image URL exists, fetches that URL instead of using the
 * original uploaded image — enabling incremental edits.
 */
export const resolveIterationBase64 = async (image: UploadedImage): Promise<string> => {
  if (image.iterateFromGenerated && image.generatedUrl) {
    const response = await fetch(image.generatedUrl);
    if (!response.ok) {
      throw new Error('Falha ao carregar imagem gerada para iteração');
    }
    const blob = await response.blob();
    return await blobToBase64(blob);
  }
  return resolveImageBase64(image);
};
