import { useState } from 'react';
import type React from 'react';
import { useMutation } from '@tanstack/react-query';
import { UploadedImage, ArchitecturalStyle, GenerationMode } from '../types';
import { generateRoomDesign, updateGeneratedImageMetadata } from '../services/geminiService';
import { resolveIterationBase64 } from '../utils/imageUtils';
import {
  selectImagesForGeneration,
  canStartGeneration,
  applyGeneratingFlag,
  applyGenerationSuccess,
  applyGenerationError,
  resolveEffectiveGenerationMode,
} from '../utils/generationUtils';

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

  const setImagesGenerating = (imageIds: string[], value: boolean) => {
    setImages(current => applyGeneratingFlag(current, imageIds, value));
  };

  const setImageSuccess = (imageId: string, payload: { result: string; storage_path?: string; is_compressed?: boolean }) => {
    setImages(current => applyGenerationSuccess(current, imageId, payload));
  };

  const setImageError = (imageId: string, errorMessage: string) => {
    setImages(current => applyGenerationError(current, imageId, errorMessage));
  };

  const persistGenerationMetadata = async (
    imageId: string,
    payload: { storage_path?: string; is_compressed?: boolean },
    effectiveMode: GenerationMode,
  ) => {
    if (!activePropertyId) return;
    await updateGeneratedImageMetadata({
      imageId,
      storagePath: payload.storage_path,
      generationMode: effectiveMode,
      style: selectedStyle ?? null,
      isCompressed: payload.is_compressed,
    });
  };

  const generationMutation = useMutation({
    mutationFn: async ({ img, prompt }: { img: UploadedImage, prompt: string }) => {
      const isIteration = !!img.iterateFromGenerated;
      const effectiveMode = resolveEffectiveGenerationMode(generationMode, prompt, isIteration);
      const base64 = await resolveIterationBase64(img);
      const response = await generateRoomDesign(
        base64,
        prompt,
        activePropertyId || undefined,
        selectedStyle || undefined,
        effectiveMode,
        isIteration,
      );
      console.log('[Generation] API response received', {
        imageId: img.id,
        isIteration,
        effectiveMode,
        hasResult: !!response.result,
        storagePath: response.storage_path,
      });
      return { ...response, effectiveMode };
    },
    onSuccess: async (response, { img }) => {
      console.log('[Generation] Applying result to state', {
        imageId: img.id,
        resultUrl: response.result,
        storagePath: response.storage_path,
      });
      setImageSuccess(img.id, response);
      await persistGenerationMetadata(img.id, response, response.effectiveMode);
      await refreshProfile();
    },
    onError: (err: Error, { img }) => {
      const errorMessage = err.message || 'Falha na geração';
      console.error(`[Generation] Error for image ${img.id}:`, err);

      if (errorMessage.includes('No credits remaining') || errorMessage.includes('credits')) {
        setNoCreditsError(true);
      }

      setImageError(img.id, errorMessage);
    },
    retry: (failureCount, error) => {
      if (error.message.includes('credits') || error.message.includes('403') || failureCount >= 2) {
        return false;
      }
      return true;
    }
  });

  const handleGenerate = async (fallbackImageId?: string) => {
    const check = canStartGeneration(images, hasCredits, credits, fallbackImageId);

    if (!check.ok) {
      if (check.reason === 'no_credits' || check.reason === 'exceeds_credits') {
        setNoCreditsError(true);
      }
      return;
    }

    const selectedImages = selectImagesForGeneration(images, fallbackImageId);

    console.log('[Generation] Starting for', selectedImages.map(i => ({
      id: i.id,
      iterate: i.iterateFromGenerated,
      hasGenerated: !!i.generatedUrl,
    })));

    setNoCreditsError(false);
    setImagesGenerating(selectedImages.map(img => img.id), true);

    const prompt = customPrompt.trim();

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
