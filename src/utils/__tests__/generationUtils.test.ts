import { describe, it, expect } from 'vitest';
import {
  selectImagesForGeneration,
  canStartGeneration,
  activateIterationTarget,
  resolveEffectiveGenerationMode,
  applyGeneratingFlag,
  applyGenerationSuccess,
  applyGenerationError,
} from '../../utils/generationUtils';
import { GenerationMode, UploadedImage } from '../../types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const base = (overrides: Partial<UploadedImage> = {}): UploadedImage => ({
  id: 'img1',
  file: null,
  previewUrl: 'blob:original',
  base64: 'base64data',
  selected: false,
  isGenerating: false,
  ...overrides,
});

// ─── selectImagesForGeneration ────────────────────────────────────────────────

describe('selectImagesForGeneration', () => {
  it('returns selected images when available', () => {
    const images = [
      base({ id: 'a', selected: true }),
      base({ id: 'b', selected: false }),
    ];
    expect(selectImagesForGeneration(images)).toEqual([images[0]]);
  });

  it('prefers iterateFromGenerated when nothing is selected', () => {
    const images = [
      base({ id: 'a', selected: false }),
      base({ id: 'b', iterateFromGenerated: true, generatedUrl: 'http://gen.url' }),
    ];
    expect(selectImagesForGeneration(images)).toEqual([images[1]]);
  });

  it('falls back to fallbackImageId when no selection and no iteration', () => {
    const images = [
      base({ id: 'a', selected: false }),
      base({ id: 'b', selected: false }),
    ];
    const result = selectImagesForGeneration(images, 'b');
    expect(result).toEqual([images[1]]);
  });

  it('returns empty array when nothing qualifies', () => {
    expect(selectImagesForGeneration([])).toEqual([]);
    expect(selectImagesForGeneration([base({ selected: false })], undefined)).toEqual([]);
  });

  it('excludes images currently generating', () => {
    const images = [
      base({ id: 'a', selected: true, isGenerating: true }),
      base({ id: 'b', selected: true, isGenerating: false }),
    ];
    expect(selectImagesForGeneration(images)).toEqual([images[1]]);
  });

  it('selected takes priority over iterateFromGenerated', () => {
    const images = [
      base({ id: 'a', selected: true }),
      base({ id: 'b', iterateFromGenerated: true }),
    ];
    expect(selectImagesForGeneration(images)).toEqual([images[0]]);
  });
});

// ─── canStartGeneration ───────────────────────────────────────────────────────

describe('canStartGeneration', () => {
  it('returns no_credits when hasCredits is false', () => {
    expect(canStartGeneration([], false, 0)).toEqual({ ok: false, reason: 'no_credits' });
  });

  it('returns no_credits when credits are 0', () => {
    expect(canStartGeneration([], true, 0)).toEqual({ ok: false, reason: 'no_credits' });
  });

  it('returns no_images when nothing to generate', () => {
    expect(canStartGeneration([base()], true, 5)).toEqual({ ok: false, reason: 'no_images' });
  });

  it('returns exceeds_credits when more images selected than credits', () => {
    const images = [
      base({ id: 'a', selected: true }),
      base({ id: 'b', selected: true }),
    ];
    expect(canStartGeneration(images, true, 1)).toEqual({ ok: false, reason: 'exceeds_credits' });
  });

  it('returns ok when everything is fine', () => {
    const images = [base({ selected: true })];
    expect(canStartGeneration(images, true, 5)).toEqual({ ok: true });
  });

  it('returns ok when using iterateFromGenerated image', () => {
    const images = [base({ iterateFromGenerated: true, generatedUrl: 'http://gen.url' })];
    expect(canStartGeneration(images, true, 1)).toEqual({ ok: true });
  });
});

// ─── activateIterationTarget ────────────────────────────────────────────────

describe('activateIterationTarget', () => {
  it('marks only the target image for refinement and deselects the rest', () => {
    const images = [
      base({ id: 'a', selected: true }),
      base({ id: 'b', selected: true, generatedUrl: 'http://gen.url' }),
      base({ id: 'c', iterateFromGenerated: true, selected: true }),
    ];

    const result = activateIterationTarget(images, 'b');

    expect(result[0].selected).toBe(false);
    expect(result[0].iterateFromGenerated).toBe(false);
    expect(result[1].selected).toBe(true);
    expect(result[1].iterateFromGenerated).toBe(true);
    expect(result[2].selected).toBe(false);
    expect(result[2].iterateFromGenerated).toBe(false);
  });
});

// ─── resolveEffectiveGenerationMode ─────────────────────────────────────────

describe('resolveEffectiveGenerationMode', () => {
  it('forces paint-only mode for paint-related refinement prompts', () => {
    const result = resolveEffectiveGenerationMode(
      GenerationMode.VIRTUAL_STAGING,
      'Pintar a parede de azul claro fosco',
      true,
    );

    expect(result).toBe(GenerationMode.PAINT_ONLY);
  });

  it('preserves current mode when prompt is unrelated to painting', () => {
    const result = resolveEffectiveGenerationMode(
      GenerationMode.VIRTUAL_STAGING,
      'Adicionar uma poltrona e uma mesa lateral',
      true,
    );

    expect(result).toBe(GenerationMode.VIRTUAL_STAGING);
  });
});

// ─── applyGeneratingFlag ─────────────────────────────────────────────────────

describe('applyGeneratingFlag', () => {
  it('sets isGenerating=true and clears error for matched ids', () => {
    const images = [base({ id: 'a', error: 'prev error' }), base({ id: 'b' })];
    const result = applyGeneratingFlag(images, ['a'], true);
    expect(result[0].isGenerating).toBe(true);
    expect(result[0].error).toBeUndefined();
    expect(result[1].isGenerating).toBe(false);
  });

  it('sets isGenerating=false and preserves error for matched ids', () => {
    const images = [base({ id: 'a', isGenerating: true, error: 'some error' })];
    const result = applyGeneratingFlag(images, ['a'], false);
    expect(result[0].isGenerating).toBe(false);
    expect(result[0].error).toBe('some error'); // preserved on stop
  });

  it('does not mutate original array', () => {
    const images = [base()];
    const result = applyGeneratingFlag(images, ['img1'], true);
    expect(result).not.toBe(images);
  });
});

// ─── applyGenerationSuccess ───────────────────────────────────────────────────

describe('applyGenerationSuccess', () => {
  it('updates generatedUrl and resets generation flags', () => {
    const images = [
      base({ id: 'a', isGenerating: true, selected: true, iterateFromGenerated: true }),
    ];
    const payload = { result: 'http://new.url', storage_path: 'path/to/file', is_compressed: false };
    const result = applyGenerationSuccess(images, 'a', payload);

    expect(result[0].generatedUrl).toBe('http://new.url');
    expect(result[0].generatedPath).toBe('path/to/file');
    expect(result[0].isGenerating).toBe(false);
    expect(result[0].selected).toBe(false);
    expect(result[0].iterateFromGenerated).toBe(false); // CRITICAL: must reset
  });

  it('does not affect other images', () => {
    const images = [base({ id: 'a' }), base({ id: 'b', selected: true })];
    const result = applyGenerationSuccess(images, 'a', { result: 'url' });
    expect(result[1].selected).toBe(true);
  });
});

// ─── applyGenerationError ─────────────────────────────────────────────────────

describe('applyGenerationError', () => {
  it('sets error message and stops generating', () => {
    const images = [base({ id: 'a', isGenerating: true })];
    const result = applyGenerationError(images, 'a', 'Network failure');
    expect(result[0].error).toBe('Network failure');
    expect(result[0].isGenerating).toBe(false);
  });

  it('does not affect other images', () => {
    const images = [base({ id: 'a' }), base({ id: 'b' })];
    const result = applyGenerationError(images, 'a', 'error');
    expect(result[1].error).toBeUndefined();
  });
});
