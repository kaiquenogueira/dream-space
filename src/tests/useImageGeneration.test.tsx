import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { UploadedImage, GenerationMode, ArchitecturalStyle } from '../types';
import * as geminiService from '../services/geminiService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock services
vi.mock('../services/geminiService', () => ({
  generateRoomDesign: vi.fn(),
  updateGeneratedImageMetadata: vi.fn(),
}));

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestComponent = ({
  initialImages,
  credits,
  hasCredits
}: {
  initialImages: UploadedImage[],
  credits: number,
  hasCredits: boolean
}) => {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);

  const { isGenerating, noCreditsError, handleGenerate } = useImageGeneration({
    images,
    setImages,
    credits,
    hasCredits,
    refreshProfile: vi.fn(),
    activePropertyId: 'p1',
    selectedStyle: ArchitecturalStyle.MODERN,
    generationMode: GenerationMode.VIRTUAL_STAGING,
    customPrompt: 'test prompt'
  });

  return (
    <div>
      <div data-testid="status">{isGenerating ? 'generating' : 'idle'}</div>
      <div data-testid="error">{noCreditsError ? 'error' : 'ok'}</div>
      <button onClick={() => handleGenerate()}>Generate</button>
    </div>
  );
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('useImageGeneration', () => {
  const mockImage: UploadedImage = {
    id: 'img1',
    file: null,
    previewUrl: 'blob:url',
    base64: 'base64data',
    selected: true,
    isGenerating: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should not generate if no credits', async () => {
    render(
      <Wrapper>
        <TestComponent initialImages={[mockImage]} credits={0} hasCredits={false} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Generate'));

    expect(screen.getByTestId('error')).toHaveTextContent('error');
    expect(geminiService.generateRoomDesign).not.toHaveBeenCalled();
  });

  it('should not generate if selected images exceed credits', async () => {
    const images = [
      { ...mockImage, id: '1' },
      { ...mockImage, id: '2' }
    ];
    render(
      <Wrapper>
        <TestComponent initialImages={images} credits={1} hasCredits={true} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Generate'));

    expect(screen.getByTestId('error')).toHaveTextContent('error');
    expect(geminiService.generateRoomDesign).not.toHaveBeenCalled();
  });

  it('should call generateRoomDesign when conditions are met', async () => {
    (geminiService.generateRoomDesign as any).mockResolvedValue({
      result: 'http://new-image.url',
      credits_remaining: 5,
      is_compressed: false
    });

    render(
      <Wrapper>
        <TestComponent initialImages={[mockImage]} credits={10} hasCredits={true} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(geminiService.generateRoomDesign).toHaveBeenCalledWith(
        'base64data',
        'test prompt',
        'p1',
        ArchitecturalStyle.MODERN,
        GenerationMode.VIRTUAL_STAGING,
        false
      );
    });
  });
});
