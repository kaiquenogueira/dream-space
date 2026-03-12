import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { UploadedImage, GenerationMode, ArchitecturalStyle } from '../types';
import * as geminiService from '../services/geminiService';
import * as imageUtils from '../utils/imageUtils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../services/geminiService', async (importOriginal) => {
  const original = await importOriginal<typeof geminiService>();
  return {
    ...original,
    generateRoomDesign: vi.fn(),
    updateGeneratedImageMetadata: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../utils/imageUtils', async (importOriginal) => {
  const original = await importOriginal<typeof imageUtils>();
  return {
    ...original,
    resolveIterationBase64: vi.fn().mockResolvedValue('resolved-base64'),
  };
});

const makeQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const img = (overrides: Partial<UploadedImage> = {}): UploadedImage => ({
  id: 'img1',
  file: null,
  previewUrl: 'blob:original',
  base64: 'base64data',
  selected: true,
  isGenerating: false,
  ...overrides,
});

const TestComponent = ({
  images: initialImages,
  credits,
  hasCredits,
  fallbackId,
  generationMode = GenerationMode.VIRTUAL_STAGING,
  customPrompt = 'test prompt',
}: {
  images: UploadedImage[];
  credits: number;
  hasCredits: boolean;
  fallbackId?: string;
  generationMode?: GenerationMode;
  customPrompt?: string;
}) => {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);

  const { isGenerating, noCreditsError, handleGenerate } = useImageGeneration({
    images,
    setImages,
    credits,
    hasCredits,
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    activePropertyId: 'prop1',
    selectedStyle: ArchitecturalStyle.MODERN,
    generationMode,
    customPrompt,
  });

  return (
    <div>
      <div data-testid="status">{isGenerating ? 'generating' : 'idle'}</div>
      <div data-testid="error">{noCreditsError ? 'error' : 'ok'}</div>
      <div data-testid="images">{JSON.stringify(images.map(i => ({ id: i.id, generatedUrl: i.generatedUrl, iterateFromGenerated: i.iterateFromGenerated })))}</div>
      <button onClick={() => handleGenerate(fallbackId)}>Generate</button>
    </div>
  );
};

const wrap = (ui: React.ReactElement, client = makeQueryClient()) =>
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);

describe('useImageGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Credit Guards ─────────────────────────────────────────────────────────

  it('blocks generation when hasCredits=false', async () => {
    wrap(<TestComponent images={[img()]} credits={0} hasCredits={false} />);
    fireEvent.click(screen.getByText('Generate'));
    expect(screen.getByTestId('error')).toHaveTextContent('error');
    expect(geminiService.generateRoomDesign).not.toHaveBeenCalled();
  });

  it('blocks generation when selected count exceeds credits', async () => {
    const images = [img({ id: 'a' }), img({ id: 'b' })];
    wrap(<TestComponent images={images} credits={1} hasCredits={true} />);
    fireEvent.click(screen.getByText('Generate'));
    expect(screen.getByTestId('error')).toHaveTextContent('error');
    expect(geminiService.generateRoomDesign).not.toHaveBeenCalled();
  });

  // ─── Normal Generation ─────────────────────────────────────────────────────

  it('calls generateRoomDesign with isIteration=false for normal flow', async () => {
    (geminiService.generateRoomDesign as any).mockResolvedValue({
      result: 'http://new.url',
      credits_remaining: 9,
      is_compressed: false,
    });

    wrap(<TestComponent images={[img()]} credits={10} hasCredits={true} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(geminiService.generateRoomDesign).toHaveBeenCalledWith(
        'resolved-base64',
        'test prompt',
        'prop1',
        ArchitecturalStyle.MODERN,
        GenerationMode.VIRTUAL_STAGING,
        false, // isIteration
      );
    });
  });

  // ─── Iteration Flow ────────────────────────────────────────────────────────

  it('uses iterateFromGenerated image when nothing is selected', async () => {
    (geminiService.generateRoomDesign as any).mockResolvedValue({
      result: 'http://refined.url',
      credits_remaining: 5,
      is_compressed: false,
    });

    const iterateImg = img({
      id: 'iter1',
      selected: false, // NOT selected
      iterateFromGenerated: true,
      generatedUrl: 'http://prev-gen.url',
    });

    wrap(<TestComponent images={[iterateImg]} credits={5} hasCredits={true} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(geminiService.generateRoomDesign).toHaveBeenCalledWith(
        'resolved-base64',
        'test prompt',
        'prop1',
        ArchitecturalStyle.MODERN,
        GenerationMode.VIRTUAL_STAGING,
        true, // isIteration=true
      );
    });
  });

  it('forces paint-only mode when iteration prompt is clearly about wall color', async () => {
    (geminiService.generateRoomDesign as any).mockResolvedValue({
      result: 'http://refined-paint.url',
      credits_remaining: 5,
      is_compressed: false,
      storage_path: 'generated/path.jpg',
    });

    const iterateImg = img({
      id: 'iter-paint',
      selected: false,
      iterateFromGenerated: true,
      generatedUrl: 'http://prev-gen.url',
    });

    wrap(
      <TestComponent
        images={[iterateImg]}
        credits={5}
        hasCredits={true}
        generationMode={GenerationMode.VIRTUAL_STAGING}
        customPrompt="Pintar a parede de azul claro fosco"
      />
    );

    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(geminiService.generateRoomDesign).toHaveBeenCalledWith(
        'resolved-base64',
        'Pintar a parede de azul claro fosco',
        'prop1',
        ArchitecturalStyle.MODERN,
        GenerationMode.PAINT_ONLY,
        true,
      );
    });

    await waitFor(() => {
      expect(geminiService.updateGeneratedImageMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          imageId: 'iter-paint',
          storagePath: 'generated/path.jpg',
          generationMode: GenerationMode.PAINT_ONLY,
        })
      );
    });
  });

  it('resets iterateFromGenerated to false after successful iteration', async () => {
    (geminiService.generateRoomDesign as any).mockResolvedValue({
      result: 'http://refined.url',
      credits_remaining: 5,
      is_compressed: false,
    });

    const iterateImg = img({
      id: 'iter1',
      selected: true,
      iterateFromGenerated: true,
      generatedUrl: 'http://prev-gen.url',
    });

    wrap(<TestComponent images={[iterateImg]} credits={5} hasCredits={true} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      const images = JSON.parse(screen.getByTestId('images').textContent || '[]');
      expect(images[0].generatedUrl).toBe('http://refined.url');
      expect(images[0].iterateFromGenerated).toBe(false);
    });
  });

  // ─── Fallback ─────────────────────────────────────────────────────────────

  it('uses fallbackImageId when no selection and no iteration', async () => {
    (geminiService.generateRoomDesign as any).mockResolvedValue({
      result: 'http://fallback.url',
      credits_remaining: 5,
      is_compressed: false,
    });

    const images = [
      img({ id: 'target', selected: false }),
    ];

    wrap(<TestComponent images={images} credits={5} hasCredits={true} fallbackId="target" />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(geminiService.generateRoomDesign).toHaveBeenCalled();
    });
  });

  // ─── Error Handling ────────────────────────────────────────────────────────

  it('sets error state on generation failure', async () => {
    (geminiService.generateRoomDesign as any).mockRejectedValue(new Error('No credits remaining'));

    wrap(<TestComponent images={[img()]} credits={5} hasCredits={true} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('error');
    });
  });

  it('shows no-credits state for translated backend errors', async () => {
    (geminiService.generateRoomDesign as any).mockRejectedValue(new geminiService.ApiError('Créditos insuficientes', 403));

    wrap(<TestComponent images={[img()]} credits={5} hasCredits={true} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('error');
    });
  });

  it('does not show no-credits error for non-credit errors', async () => {
    (geminiService.generateRoomDesign as any).mockRejectedValue(new Error('Network failure'));

    wrap(<TestComponent images={[img()]} credits={5} hasCredits={true} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('ok');
    });
  });

  it('marks the image with an error when metadata persistence fails', async () => {
    (geminiService.generateRoomDesign as any).mockResolvedValue({
      result: 'http://new.url',
      credits_remaining: 9,
      is_compressed: false,
      storage_path: 'generated/path.jpg',
    });
    (geminiService.updateGeneratedImageMetadata as any).mockRejectedValueOnce(new Error('Falha ao persistir metadados'));

    wrap(<TestComponent images={[img()]} credits={10} hasCredits={true} />);
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      const images = JSON.parse(screen.getByTestId('images').textContent || '[]');
      expect(images[0].generatedUrl).toBeUndefined();
    });
  });
});
