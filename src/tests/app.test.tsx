import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

const useAuthMock = vi.fn();
const useCreditsMock = vi.fn();
const useProjectMock = vi.fn();
const useImageGenerationMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../hooks/useCredits', () => ({
  useCredits: () => useCreditsMock(),
}));

vi.mock('../hooks/useProject', () => ({
  useProject: () => useProjectMock(),
}));

vi.mock('../hooks/useImageGeneration', () => ({
  useImageGeneration: () => useImageGenerationMock(),
}));

vi.mock('../components/Login', () => ({
  default: () => <div>LoginView</div>,
}));

vi.mock('../components/AuthenticatedApp', () => ({
  AuthenticatedApp: () => <div>AuthenticatedApp</div>,
}));

const baseAuth = {
  isAuthenticated: true,
  isCheckingAuth: false,
  isProfileLoading: false,
  profileError: null,
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  profile: { id: 'u1', is_admin: false, credits_remaining: 3, plan: 'free' },
  refreshProfile: vi.fn(),
};

const baseProject = {
  properties: [],
  setProperties: vi.fn(),
  activePropertyId: 'p1',
  setActivePropertyId: vi.fn(),
  selectedImageId: 'i1',
  setSelectedImageId: vi.fn(),
  activeProperty: { id: 'p1', name: 'Test', images: [] },
  images: [{ id: 'i1', selected: true }],
  setImages: vi.fn(),
  handleCreateProperty: vi.fn(),
  handleImagesSelected: vi.fn(),
  removeImage: vi.fn(),
  toggleImageSelection: vi.fn(),
  toggleSelectAll: vi.fn(),
  MAX_IMAGES: 5,
};

const baseGeneration = {
  isGenerating: false,
  noCreditsError: false,
  setNoCreditsError: vi.fn(),
  handleGenerate: vi.fn(),
  handleRegenerateSingle: vi.fn(),
};

const baseCredits = {
  credits: 3,
  hasCredits: true,
  plan: 'free',
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue(baseAuth);
    useCreditsMock.mockReturnValue(baseCredits);
    useProjectMock.mockReturnValue(baseProject);
    useImageGenerationMock.mockReturnValue(baseGeneration);
  });

  it('mostra carregamento enquanto autenticação está em progresso', () => {
    useAuthMock.mockReturnValue({ ...baseAuth, isCheckingAuth: true });
    render(<App />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('mostra login quando não autenticado', () => {
    useAuthMock.mockReturnValue({ ...baseAuth, isAuthenticated: false });
    render(<App />);
    expect(screen.getByText('LoginView')).toBeInTheDocument();
  });

  it('mostra erro de perfil quando falha no carregamento', () => {
    useAuthMock.mockReturnValue({ ...baseAuth, profileError: 'Erro de perfil' });
    render(<App />);
    expect(screen.getByText('Falha ao carregar perfil')).toBeInTheDocument();
    expect(screen.getByText('Erro de perfil')).toBeInTheDocument();
  });

  it('renderiza a aplicação autenticada quando logado', () => {
    render(<App />);
    expect(screen.getByText('AuthenticatedApp')).toBeInTheDocument();
  });
});
