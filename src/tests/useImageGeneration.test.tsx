import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { UploadedImage, GenerationMode, ArchitecturalStyle } from '../types';
import * as geminiService from '../services/geminiService';

// Mock services
vi.mock('../services/geminiService', () => ({
  generateRoomDesign: vi.fn(),
  updateGeneratedImageMetadata: vi.fn(),
}));

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
    generationMode: GenerationMode.REDESIGN,
    customPrompt: 'test prompt'
  });

  return (
    <div>
      <div data-testid="status">{isGenerating ? 'generating' : 'idle'}</div>
      <div data-testid="error">{noCreditsError ? 'error' : 'ok'}</div>
      <button onClick={handleGenerate}>Generate</button>
    </div>
  );
};

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
  });

  it('should not generate if no credits', async () => {
    render(<TestComponent initialImages={[mockImage]} credits={0} hasCredits={false} />);
    
    fireEvent.click(screen.getByText('Generate'));
    
    expect(screen.getByTestId('error')).toHaveTextContent('error');
    expect(geminiService.generateRoomDesign).not.toHaveBeenCalled();
  });

  it('should not generate if selected images exceed credits', async () => {
    const images = [
      { ...mockImage, id: '1' },
      { ...mockImage, id: '2' }
    ];
    render(<TestComponent initialImages={images} credits={1} hasCredits={true} />);
    
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

    render(<TestComponent initialImages={[mockImage]} credits={10} hasCredits={true} />);
    
    fireEvent.click(screen.getByText('Generate'));
    
    await waitFor(() => {
      expect(geminiService.generateRoomDesign).toHaveBeenCalledWith(
        'base64data',
        'test prompt',
        'p1',
        ArchitecturalStyle.MODERN,
        GenerationMode.REDESIGN
      );
    });
  });
});
