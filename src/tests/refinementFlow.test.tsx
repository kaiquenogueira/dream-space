import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PreviewArea from '../components/PreviewArea';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { activateIterationTarget } from '../utils/generationUtils';
import { ArchitecturalStyle, GenerationMode, UploadedImage } from '../types';
import * as geminiService from '../services/geminiService';

vi.mock('../services/geminiService', () => ({
  generateRoomDesign: vi.fn(),
  updateGeneratedImageMetadata: vi.fn().mockResolvedValue(undefined),
  generateDroneTourScript: vi.fn(),
}));

vi.mock('../utils/imageUtils', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils/imageUtils')>();
  return {
    ...original,
    resolveIterationBase64: vi.fn().mockResolvedValue('resolved-base64'),
  };
});

const makeQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const baseImage = (): UploadedImage => ({
  id: 'img-1',
  file: null,
  previewUrl: 'blob:original-room',
  base64: 'original-base64',
  generatedUrl: 'http://before-refine.url',
  generatedPath: 'generated/before.jpg',
  selected: false,
  isGenerating: false,
  iterateFromGenerated: false,
});

const RefinementHarness = () => {
  const [images, setImages] = useState<UploadedImage[]>([baseImage()]);
  const [viewMode, setViewMode] = useState<'original' | 'generated' | 'split'>('generated');
  const activeImage = images[0];

  const { handleGenerate } = useImageGeneration({
    images,
    setImages,
    credits: 5,
    hasCredits: true,
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    activePropertyId: 'prop-1',
    selectedStyle: ArchitecturalStyle.MODERN,
    generationMode: GenerationMode.VIRTUAL_STAGING,
    customPrompt: 'Pintar a parede de azul claro fosco',
  });

  return (
    <div>
      <PreviewArea
        activeImage={activeImage}
        imageIndex={0}
        totalImages={1}
        viewMode={viewMode}
        setViewMode={setViewMode}
        handleDownloadComparison={vi.fn()}
        handleDownloadSingle={vi.fn()}
        handleDownloadAll={vi.fn()}
        onVideoGenerated={vi.fn()}
        onIterateOnGenerated={(imageId) => setImages(prev => activateIterationTarget(prev, imageId))}
        hasGeneratedImages={true}
        isDownloadingZip={false}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSharePresentation={vi.fn()}
      />
      <button onClick={() => handleGenerate(activeImage.id)}>Generate</button>
      <div data-testid="image-state">
        {JSON.stringify(images.map(img => ({
          id: img.id,
          generatedUrl: img.generatedUrl,
          iterateFromGenerated: img.iterateFromGenerated,
          selected: img.selected,
        })))}
      </div>
    </div>
  );
};

describe('Refinement Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the refined result after clicking refine and generate', async () => {
    (geminiService.generateRoomDesign as any).mockResolvedValue({
      result: 'http://after-refine.url',
      credits_remaining: 4,
      is_compressed: false,
      storage_path: 'generated/after.jpg',
    });

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <RefinementHarness />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('Refinar'));

    await waitFor(() => {
      expect(screen.getByTestId('image-state')).toHaveTextContent('"iterateFromGenerated":true');
      expect(screen.getByTestId('image-state')).toHaveTextContent('"selected":true');
    });

    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(geminiService.generateRoomDesign).toHaveBeenCalledWith(
        'resolved-base64',
        'Pintar a parede de azul claro fosco',
        'prop-1',
        ArchitecturalStyle.MODERN,
        GenerationMode.PAINT_ONLY,
        true,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('image-state')).toHaveTextContent('"generatedUrl":"http://after-refine.url"');
      expect(screen.getByTestId('image-state')).toHaveTextContent('"iterateFromGenerated":false');
    });

    await waitFor(() => {
      expect(screen.getByAltText('Generated')).toHaveAttribute('src', 'http://after-refine.url');
    });
  });
});
