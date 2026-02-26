import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateRoomDesign, generateDroneTourScript, updateGeneratedImageMetadata } from './geminiService';
import { supabase } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  },
}));

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('geminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { access_token: 'default-token' } } 
    });
  });

  describe('generateRoomDesign', () => {
    it('should throw error if not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

      await expect(() => generateRoomDesign('base64img', 'prompt')).rejects.toThrow('Não autenticado');
    });

    it('should call API with correct parameters on success', async () => {
      const mockSession = { access_token: 'fake-token' };
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
      
      const mockResponse = {
        result: 'http://image.url',
        credits_remaining: 5,
        is_compressed: false
      };
      
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateRoomDesign('base64data', 'modern style', 'prop1', 'Modern', 'Redesign');

      expect(fetchMock).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token',
        },
      }));
      
      // Check body separately as string
      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body).toEqual({
        imageBase64: 'base64data',
        customPrompt: 'modern style',
        propertyId: 'prop1',
        style: 'Modern',
        generationMode: 'Redesign',
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors correctly', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'Invalid image' }),
      });

      await expect(() => generateRoomDesign('img', 'prompt')).rejects.toThrow('Invalid image');
    });

    it('should handle 403 No Credits error specifically', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { access_token: 'token' } } });
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ message: 'No credits remaining' }),
      });

      await expect(generateRoomDesign('img', 'prompt')).rejects.toThrow('No credits remaining');
    });
  });

  describe('generateDroneTourScript', () => {
    it('should call API correctly with default params', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { access_token: 'token' } } });
      
      const mockResponse = {
        videoOperationName: 'ops/123',
        credits_remaining: 8
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateDroneTourScript('http://img.url', true);

      expect(fetchMock).toHaveBeenCalledWith('/api/generate-drone-tour', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'http://img.url', includeVideo: true }),
      }));

      expect(result).toEqual(mockResponse);
    });

    it('should include customPrompt when provided', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { access_token: 'token' } } });
      
      const mockResponse = {
        videoOperationName: 'ops/456',
        credits_remaining: 6
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await generateDroneTourScript('http://img.url', true, 'slow pan');

      expect(fetchMock).toHaveBeenCalledWith('/api/generate-drone-tour', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'http://img.url', includeVideo: true, customPrompt: 'slow pan' }),
      }));
    });
  });

  describe('updateGeneratedImageMetadata', () => {
    it('should update metadata when storage path exists', async () => {
      await updateGeneratedImageMetadata({
        imageId: 'img-1',
        storagePath: 'path-1',
        generationMode: 'redesign',
        style: 'Modern',
        isCompressed: true,
      });

      expect(supabase.from).toHaveBeenCalledWith('property_images');
    });

    it('should skip when storage path is missing', async () => {
      await updateGeneratedImageMetadata({
        imageId: 'img-2',
        generationMode: 'redesign',
        style: null,
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
