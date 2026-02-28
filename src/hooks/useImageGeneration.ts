import { useState } from 'react';
import type React from 'react';
import { UploadedImage, ArchitecturalStyle, GenerationMode } from '../types';
import { generateRoomDesign, updateGeneratedImageMetadata } from '../services/geminiService';
import { resolveImageBase64 } from '../utils/imageUtils';

interface UseImageGenerationProps {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  credits: number;
  hasCredits: boolean;
  refreshProfile: () => Promise<void>;
  activePropertyId: string | null;
  selectedStyle: ArchitecturalStyle | null;
  generationMode: GenerationMode;
  customPrompt: string;
}

export const useImageGeneration = ({
  images,
  setImages,
  credits,
  hasCredits,
  refreshProfile,
  activePropertyId,
  selectedStyle,
  generationMode,
  customPrompt,
}: UseImageGenerationProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [noCreditsError, setNoCreditsError] = useState(false);

  const setImagesGenerating = (imageIds: string[], isGeneratingValue: boolean) => {
    setImages(current => current.map(image => (
      imageIds.includes(image.id)
        ? { ...image, isGenerating: isGeneratingValue, error: isGeneratingValue ? undefined : image.error }
        : image
    )));
  };

  const setImageSuccess = (imageId: string, payload: { result: string; storage_path?: string; is_compressed?: boolean }) => {
    setImages(current => current.map(image => (
      image.id === imageId
        ? { ...image, generatedUrl: payload.result, generatedPath: payload.storage_path, isCompressed: payload.is_compressed, isGenerating: false, selected: false }
        : image
    )));
  };

  const setImageError = (imageId: string, errorMessage: string) => {
    setImages(current => current.map(image => (
      image.id === imageId ? { ...image, error: errorMessage, isGenerating: false } : image
    )));
  };

  const persistGenerationMetadata = async (imageId: string, payload: { storage_path?: string; is_compressed?: boolean }) => {
    if (!activePropertyId) return;
    await updateGeneratedImageMetadata({
      imageId,
      storagePath: payload.storage_path,
      generationMode,
      style: selectedStyle ?? null,
      isCompressed: payload.is_compressed,
    });
  };

  const canGenerate = (selectedCount: number) => {
    if (!hasCredits) return false;
    if (selectedCount === 0) return false;
    if (selectedCount > credits) return false;
    return true;
  };

  const generateForImage = async (img: UploadedImage, prompt: string) => {
    try {
      const base64 = await resolveImageBase64(img);
      const response = await generateRoomDesign(
        base64,
        prompt,
        activePropertyId || undefined,
        selectedStyle || undefined,
        generationMode,
      );

      setImageSuccess(img.id, response);
      await persistGenerationMetadata(img.id, response);

      await refreshProfile();

      if (response.is_compressed) {
        console.info('Imagem salva em formato comprimido (plano gratuito). Resolução máxima disponível nos planos premium.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Falha na geração';
      console.error(`Error generating for image ${img.id}:`, err);

      if (errorMessage.includes('No credits remaining') || errorMessage.includes('credits')) {
        setNoCreditsError(true);
      }

      setImageError(img.id, errorMessage);
    }
  };

  const handleGenerate = async () => {
    const imagesToGenerate = images.filter(img => img.selected);
    if (!canGenerate(imagesToGenerate.length)) {
      if (imagesToGenerate.length > 0) {
        setNoCreditsError(true);
      }
      return;
    }

    setNoCreditsError(false);
    setIsGenerating(true);

    setImagesGenerating(imagesToGenerate.map(img => img.id), true);

    // Process images sequentially with a delay between each request
    // to avoid hitting the server rate limit (5 req/60s) and Gemini API limits.
    const DELAY_BETWEEN_REQUESTS_MS = 3000;

    for (let i = 0; i < imagesToGenerate.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
      }
      await generateForImage(imagesToGenerate[i], customPrompt);
    }

    setIsGenerating(false);
  };

  const handleRegenerateSingle = async (imageId: string) => {
    if (!hasCredits) {
      setNoCreditsError(true);
      return;
    }

    const img = images.find(i => i.id === imageId);
    if (!img) return;

    setNoCreditsError(false);
    setIsGenerating(true);
    setImagesGenerating([imageId], true);

    await generateForImage(img, customPrompt);

    setIsGenerating(false);
  };

  return {
    isGenerating,
    noCreditsError,
    setNoCreditsError,
    handleGenerate,
    handleRegenerateSingle
  };
};
