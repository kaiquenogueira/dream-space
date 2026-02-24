import React, { useState } from 'react';
import { UploadedImage, ArchitecturalStyle, GenerationMode } from '../types';
import { generateRoomDesign } from '../services/geminiService';
import { buildPrompt } from '../utils/promptBuilder';

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

  const generateForImage = async (img: UploadedImage, prompt: string) => {
    try {
      const response = await generateRoomDesign(
        img.base64,
        prompt,
        activePropertyId || undefined,
        selectedStyle || undefined,
        generationMode,
      );

      setImages(current => current.map(i =>
        i.id === img.id
          ? { ...i, generatedUrl: response.result, isGenerating: false, selected: false }
          : i
      ));

      // Refresh profile to update credits display
      await refreshProfile();

      // Show compression warning for free tier
      if (response.is_compressed) {
        console.info('Imagem salva em formato comprimido (plano gratuito). Resolução máxima disponível nos planos premium.');
      }
    } catch (err: any) {
      console.error(`Error generating for image ${img.id}:`, err);

      if (err.message?.includes('No credits remaining') || err.message?.includes('credits')) {
        setNoCreditsError(true);
      }

      setImages(current => current.map(i =>
        i.id === img.id ? { ...i, error: err.message || "Failed", isGenerating: false } : i
      ));
    }
  };

  const handleGenerate = async () => {
    if (!hasCredits) {
      setNoCreditsError(true);
      return;
    }

    const imagesToGenerate = images.filter(img => img.selected);
    if (imagesToGenerate.length === 0) return;

    // Check if user has enough credits for all selected images
    if (imagesToGenerate.length > credits) {
      setNoCreditsError(true);
      return;
    }

    setNoCreditsError(false);
    setIsGenerating(true);

    setImages(prev => prev.map(img => img.selected ? { ...img, isGenerating: true, error: undefined } : img));

    // const finalPrompt = buildPrompt({ generationMode, selectedStyle, customPrompt });
    // console.log("Starting selective generation with prompt:", finalPrompt, `(${imagesToGenerate.length} images)`);
    // Passing raw customPrompt to backend to prevent prompt injection and allow backend construction
    console.log("Starting selective generation with customPrompt:", customPrompt, `(${imagesToGenerate.length} images)`);

    await Promise.all(imagesToGenerate.map(img => generateForImage(img, customPrompt)));

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
    setImages(prev => prev.map(i => i.id === imageId ? { ...i, isGenerating: true, error: undefined } : i));

    // const finalPrompt = buildPrompt({ generationMode, selectedStyle, customPrompt });
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
