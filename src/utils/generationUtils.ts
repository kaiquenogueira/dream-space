import { GenerationMode, UploadedImage } from '../types';

/**
 * Selects which images should be processed in a generation run.
 *
 * Priority order:
 * 1. Images explicitly selected by the user (img.selected) — supports batch generation.
 * 2. Images flagged for iteration (img.iterateFromGenerated) — when no selection exists.
 * 3. A single fallback image by ID — when nothing else qualifies.
 *
 * Images currently generating (isGenerating) are always excluded.
 */
export function selectImagesForGeneration(
  images: UploadedImage[],
  fallbackImageId?: string,
): UploadedImage[] {
  const available = images.filter(img => !img.isGenerating);

  // 1. Explicitly selected images
  const selected = available.filter(img => img.selected);
  if (selected.length > 0) return selected;

  // 2. Iteration-flagged image
  const iterateImage = available.find(img => img.iterateFromGenerated);
  if (iterateImage) return [iterateImage];

  // 3. Fallback to the currently active/viewed image
  if (fallbackImageId) {
    const fallback = available.find(img => img.id === fallbackImageId);
    if (fallback) return [fallback];
  }

  return [];
}

/**
 * Checks if the generation can proceed given the current state.
 */
export function canStartGeneration(
  images: UploadedImage[],
  hasCredits: boolean,
  credits: number,
  fallbackImageId?: string,
): { ok: boolean; reason?: 'no_credits' | 'exceeds_credits' | 'no_images' } {
  if (!hasCredits || credits <= 0) return { ok: false, reason: 'no_credits' };

  const toGenerate = selectImagesForGeneration(images, fallbackImageId);
  if (toGenerate.length === 0) return { ok: false, reason: 'no_images' };
  if (toGenerate.length > credits) return { ok: false, reason: 'exceeds_credits' };

  return { ok: true };
}

/**
 * Activates incremental refinement for a single image.
 *
 * Refinement is always exclusive to one image because the generated result
 * becomes the new baseline only for that target image.
 */
export function activateIterationTarget(images: UploadedImage[], imageId: string): UploadedImage[] {
  return images.map(img => ({
    ...img,
    iterateFromGenerated: img.id === imageId,
    selected: img.id === imageId,
  }));
}

/**
 * Detects paint-only refinement intent from the freeform prompt.
 */
export function resolveEffectiveGenerationMode(
  generationMode: GenerationMode,
  customPrompt: string,
  isIteration: boolean,
): GenerationMode {
  if (generationMode === GenerationMode.PAINT_ONLY) return generationMode;
  if (!isIteration) return generationMode;

  const prompt = customPrompt.trim().toLowerCase();
  if (!prompt) return generationMode;

  const paintIntentPattern = /\b(parede|paredes|pint|pintar|pintura|cor|cores|tinta|textura|acabamento|fosco|acetinado|brilho|cinza|bege|azul|verde|branco|preto|terracota|off-white)\b/;
  return paintIntentPattern.test(prompt) ? GenerationMode.PAINT_ONLY : generationMode;
}

/**
 * Applies the "generating" flag to a list of image IDs within the image array.
 */
export function applyGeneratingFlag(images: UploadedImage[], ids: string[], value: boolean): UploadedImage[] {
  return images.map(img =>
    ids.includes(img.id)
      ? { ...img, isGenerating: value, error: value ? undefined : img.error }
      : img
  );
}

/**
 * Applies a successful generation result to a single image.
 */
export function applyGenerationSuccess(
  images: UploadedImage[],
  imageId: string,
  payload: { result: string; storage_path?: string; is_compressed?: boolean },
): UploadedImage[] {
  return images.map(img =>
    img.id === imageId
      ? {
        ...img,
        generatedUrl: payload.result,
        generatedPath: payload.storage_path,
        isCompressed: payload.is_compressed,
        isGenerating: false,
        selected: false,
        iterateFromGenerated: false, // Reset after successful iteration
      }
      : img
  );
}

/**
 * Applies a generation error to a single image.
 */
export function applyGenerationError(images: UploadedImage[], imageId: string, errorMessage: string): UploadedImage[] {
  return images.map(img =>
    img.id === imageId ? { ...img, error: errorMessage, isGenerating: false } : img
  );
}
