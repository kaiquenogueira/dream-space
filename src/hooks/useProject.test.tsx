import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProject } from './useProject';
import * as projectService from '../services/projectService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock do serviço
vi.mock('../services/projectService', () => ({
  loadRemoteProjects: vi.fn(),
  createPropertyRecord: vi.fn(),
  deleteImageAssets: vi.fn(),
  uploadOriginalImages: vi.fn(),
}));

// Wrapper para o React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProject Hook', () => {
  const mockUserId = 'user-123';
  const mockProperties = [
    {
      id: 'prop-1',
      name: 'Property 1',
      createdAt: Date.now(),
      images: [
        { id: 'img-1', previewUrl: 'url1', selected: true },
        { id: 'img-2', previewUrl: 'url2', selected: false }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (projectService.loadRemoteProjects as any).mockResolvedValue(mockProperties);
  });

  it('deve carregar projetos remotos ao iniciar com userId', async () => {
    const { result } = renderHook(() => useProject(mockUserId), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.properties).toEqual(mockProperties);
    });

    expect(projectService.loadRemoteProjects).toHaveBeenCalledWith(mockUserId);
  });

  it('deve definir a propriedade ativa e imagem selecionada automaticamente', async () => {
    const { result } = renderHook(() => useProject(mockUserId), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activePropertyId).toBe('prop-1');
      expect(result.current.selectedImageId).toBe('img-1');
    });
  });

  it('deve permitir trocar o projeto (setActivePropertyId(null)) sem reverter automaticamente', async () => {
    const { result } = renderHook(() => useProject(mockUserId), { wrapper: createWrapper() });

    // Aguarda a seleção automática inicial
    await waitFor(() => {
      expect(result.current.activePropertyId).toBe('prop-1');
    });

    // Troca para null (simula clique em "Trocar Projeto")
    act(() => {
      result.current.setActivePropertyId(null);
    });

    // Verifica se permanece null
    expect(result.current.activePropertyId).toBeNull();
  });

  it('deve criar uma nova propriedade', async () => {
    const newProp = { id: 'prop-2', name: 'New Property', images: [], createdAt: Date.now() };
    (projectService.createPropertyRecord as any).mockResolvedValue(newProp);

    const { result } = renderHook(() => useProject(mockUserId), { wrapper: createWrapper() });
    
    // Aguarda carga inicial
    await waitFor(() => expect(result.current.properties).toHaveLength(1));

    // Simula criação
    const e = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleCreateProperty(e, 'New Property');
    });

    await waitFor(() => {
        expect(result.current.properties).toHaveLength(2);
    });

    expect(projectService.createPropertyRecord).toHaveBeenCalledWith(mockUserId, 'New Property');
    expect(result.current.activePropertyId).toBe('prop-2');
  });

  it('deve atualizar imagens via setImages (otimista)', async () => {
    const { result } = renderHook(() => useProject(mockUserId), { wrapper: createWrapper() });
    
    await waitFor(() => expect(result.current.properties).toHaveLength(1));

    act(() => {
        result.current.setImages((prev) => [
            ...prev,
            { id: 'img-3', previewUrl: 'url3', selected: true } as any
        ]);
    });

    await waitFor(() => {
        expect(result.current.images).toHaveLength(3);
        const added = result.current.images.find(img => img.id === 'img-3');
        expect(added).toBeDefined();
    });
  });
});
