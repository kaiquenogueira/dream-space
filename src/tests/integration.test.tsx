import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import userEvent from '@testing-library/user-event';

const useAuthMock = vi.fn();
const useProjectMock = vi.fn();
const useImageGenerationMock = vi.fn();
let handleImagesSelected: ReturnType<typeof vi.fn>;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../hooks/useProject', () => ({
  useProject: () => useProjectMock(),
}));

vi.mock('../hooks/useImageGeneration', () => ({
  useImageGeneration: () => useImageGenerationMock(),
}));

// Mock Image Compression
vi.mock('browser-image-compression', () => {
  const mockCompression = Object.assign(
    vi.fn((file) => Promise.resolve(file)),
    { getDataUrlFromFile: vi.fn(() => Promise.resolve('data:image/jpeg;base64,mock')) }
  );
  return { default: mockCompression };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../components/Sidebar', () => ({
  default: ({ handleImagesSelected }: any) => (
    <div>
      <input 
        data-testid="image-uploader-input" 
        type="file" 
        onChange={(e) => {
          if (e.target.files?.length) {
            handleImagesSelected([new File([], 'test.png')]);
          }
        }} 
      />
    </div>
  )
}));

describe('Fluxo de Integração E2E (Simulado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleImagesSelected = vi.fn();

    // Mock window size for virtualized list
    Object.defineProperty(HTMLElement.prototype, 'contentRect', {
      configurable: true,
      get: function() {
        return { width: 800, height: 600 };
      }
    });

    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isCheckingAuth: false,
      isProfileLoading: false,
      profileError: null,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      profile: { id: 'user-123', is_admin: false, credits_remaining: 10, plan: 'pro' },
      refreshProfile: vi.fn(),
    });

    useProjectMock.mockReturnValue({
      properties: [{ id: 'p1', name: 'Test', images: [] }],
      setProperties: vi.fn(),
      activePropertyId: 'p1',
      setActivePropertyId: vi.fn(),
      selectedImageId: null,
      setSelectedImageId: vi.fn(),
      activeProperty: { id: 'p1', name: 'Test', images: [] },
      images: [],
      setImages: vi.fn(),
      handleCreateProperty: vi.fn(),
      handleImagesSelected,
      removeImage: vi.fn(),
      toggleImageSelection: vi.fn(),
      toggleSelectAll: vi.fn(),
      MAX_IMAGES: 10,
    });

    useImageGenerationMock.mockReturnValue({
      isGenerating: false,
      noCreditsError: false,
      setNoCreditsError: vi.fn(),
      handleGenerate: vi.fn(),
      handleRegenerateSingle: vi.fn(),
    });
  });

  it('deve permitir upload de imagem e solicitar geração', async () => {
    render(<App />);

    // Wait for Sidebar to load (it is lazy loaded)
    await waitFor(() => {
      expect(screen.getByTestId('image-uploader-input')).toBeInTheDocument();
    });

    const file = new File(['(⌐□_□)'], 'room.png', { type: 'image/png' });
    const uploader = screen.getByTestId('image-uploader-input');
    
    await userEvent.upload(uploader, file);
    
    await waitFor(() => {
      expect(handleImagesSelected).toHaveBeenCalled();
    });
  });
});
