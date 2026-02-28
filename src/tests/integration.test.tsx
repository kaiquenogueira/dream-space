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

describe('Fluxo de Integração E2E (Simulado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleImagesSelected = vi.fn();

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

    const file = new File(['(⌐□_□)'], 'room.png', { type: 'image/png' });
    const uploader = screen.getAllByTestId('image-uploader-input')[0];
    expect(uploader).toBeInTheDocument();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await userEvent.upload(uploader as HTMLElement, file);
    await waitFor(() => {
      expect(handleImagesSelected).toHaveBeenCalled();
    });
  });
});
