import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPropertyRecord, deleteImageAssets, hydrateStoredProjects, uploadOriginalImages } from './projectService';
import type { UploadedImage } from '../types';

const uploadMock = vi.fn();
const removeMock = vi.fn();
const upsertMock = vi.fn();
const deleteEqMock = vi.fn();
const singleMock = vi.fn();
const selectMock = vi.fn(() => ({
  single: singleMock,
}));
const insertMock = vi.fn(() => ({
  select: selectMock,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'properties') {
        return {
          insert: insertMock,
        };
      }

      return {
        delete: vi.fn(() => ({
          eq: deleteEqMock,
        })),
        upsert: upsertMock,
      };
    }),
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        remove: removeMock,
        createSignedUrl: vi.fn(),
      })),
    },
  },
}));

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    singleMock.mockResolvedValue({
      data: {
        id: 'prop-1',
        name: 'Casa',
        logo_url: null,
        created_at: '2026-03-12T00:00:00.000Z',
      },
      error: null,
    });
  });

  it('remove imagens com URLs corrompidas do storage local', () => {
    localStorage.setItem('dreamspace.projects.v1', JSON.stringify({
      properties: [{
        id: 'p1',
        name: 'Prop',
        createdAt: Date.now(),
        images: [{
          id: 'i1',
          file: null,
          previewUrl: 'https://abc.supabase.co/storage/v1/object/bad',
          base64: '',
          selected: true
        }]
      }],
      activePropertyId: 'p1',
      selectedImageId: 'i1'
    }));

    const result = hydrateStoredProjects();
    expect(result?.properties[0].images.length).toBe(0);
  });

  it('retorna erro de upload com mensagem tratada', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'Bucket not found' } });
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const images: UploadedImage[] = [{
      id: 'img-1',
      file,
      previewUrl: '',
      base64: '',
      selected: true,
      isGenerating: false
    }];

    const result = await uploadOriginalImages({
      userId: 'u1',
      activePropertyId: 'p1',
      images
    });

    expect(result[0].error).toMatch(/Bucket de storage não encontrado/);
  });

  it('cria propriedade remota para usuário autenticado', async () => {
    const result = await createPropertyRecord('u1', 'Casa');

    expect(insertMock).toHaveBeenCalledWith({ user_id: 'u1', name: 'Casa' });
    expect(result).toEqual({
      id: 'prop-1',
      name: 'Casa',
      images: [],
      createdAt: new Date('2026-03-12T00:00:00.000Z').getTime(),
      logo: undefined,
    });
  });

  it('não cria fallback local quando a criação remota falha para usuário autenticado', async () => {
    singleMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'insert failed' },
    });

    await expect(createPropertyRecord('u1', 'Casa')).rejects.toThrow('insert failed');
  });

  it('remove imagem e assets quando solicitado', async () => {
    removeMock.mockResolvedValue({ data: null, error: null });
    deleteEqMock.mockResolvedValue({ data: null, error: null });
    const image: UploadedImage = {
      id: 'img-2',
      file: null,
      previewUrl: '',
      base64: '',
      selected: true,
      isGenerating: false,
      originalPath: 'orig/path',
      generatedPath: 'gen/path'
    };

    await deleteImageAssets({ userId: 'u1', image });
    expect(removeMock).toHaveBeenCalledTimes(2);
    expect(deleteEqMock).toHaveBeenCalled();
  });
});
