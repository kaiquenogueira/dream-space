import { useState } from 'react';
import type React from 'react';
import { useMutation } from '@tanstack/react-query';
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

  const generationMutation = useMutation({
    mutationFn: async ({ img, prompt }: { img: UploadedImage, prompt: string }) => {
      const base64 = await resolveImageBase64(img);
      return await generateRoomDesign(
        base64,
        prompt,
        activePropertyId || undefined,
        selectedStyle || undefined,
        generationMode,
      );
    },
    onSuccess: async (response, { img }) => {
      setImageSuccess(img.id, response);
      await persistGenerationMetadata(img.id, response);
      await refreshProfile();

      if (response.is_compressed) {
        console.info('Imagem salva em formato comprimido (plano gratuito). Resolução máxima disponível nos planos premium.');
      }
    },
    onError: (err: Error, { img }) => {
      const errorMessage = err.message || 'Falha na geração';
      console.error(`Error generating for image ${img.id}:`, err);

      if (errorMessage.includes('No credits remaining') || errorMessage.includes('credits')) {
        setNoCreditsError(true);
      }

      setImageError(img.id, errorMessage);
    },
    retry: (failureCount, error) => {
      // Don't retry if it's a credit error or a client error (400-499)
      if (error.message.includes('credits') || error.message.includes('403') || failureCount >= 2) {
        return false;
      }
      return true;
    }
  });

  const canGenerate = (selectedCount: number) => {
    if (!hasCredits) return false;
    if (selectedCount === 0) return false;
    if (selectedCount > credits) return false;
    return true;
  };

  const handleGenerate = async () => {
    const selectedImages = images.filter(img => img.selected && !img.isGenerating);
    
    if (selectedImages.length === 0) return;

    if (!hasCredits || selectedImages.length > credits) {
      setNoCreditsError(true);
      return;
    }

    setNoCreditsError(false);
    setImagesGenerating(selectedImages.map(img => img.id), true);

    const prompt = customPrompt.trim();
    
    // Process images sequentially or in parallel? 
    // For now parallel to speed up, but with a small delay to avoid hitting rate limits too hard
    selectedImages.forEach((img, index) => {
      setTimeout(() => {
        generationMutation.mutate({ img, prompt });
      }, index * 200);
    });
  };

  const handleRegenerateSingle = async (imageId: string) => {
    const img = images.find(i => i.id === imageId);
    if (!img || !hasCredits) return;

    setImagesGenerating([imageId], true);
    generationMutation.mutate({ img, prompt: customPrompt.trim() });
  };

  return {
    isGenerating: generationMutation.isPending,
    noCreditsError,
    setNoCreditsError,
    handleGenerate,
    handleRegenerateSingle,
  };
};
