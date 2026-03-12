import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blobToBase64, resolveImageBase64, resolveIterationBase64 } from '../../utils/imageUtils';
import { UploadedImage } from '../../types';

// ─── blobToBase64 ─────────────────────────────────────────────────────────────

describe('blobToBase64', () => {
  it('converts a Blob to a base64 string without data URI prefix', async () => {
    const data = 'hello world';
    const blob = new Blob([data], { type: 'text/plain' });
    const result = await blobToBase64(blob);
    // atob(result) should equal the original data
    expect(atob(result)).toBe(data);
  });
});

// ─── resolveImageBase64 ───────────────────────────────────────────────────────

describe('resolveImageBase64', () => {
  it('returns base64 directly when present', async () => {
    const result = await resolveImageBase64({ base64: 'mybase64', previewUrl: undefined });
    expect(result).toBe('mybase64');
  });

  it('extracts base64 from a data URI previewUrl', async () => {
    const result = await resolveImageBase64({ base64: undefined, previewUrl: 'data:image/png;base64,ABC123' });
    expect(result).toBe('ABC123');
  });

  it('fetches and converts an HTTP previewUrl', async () => {
    const mockBlob = new Blob(['img-data'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as any);

    const result = await resolveImageBase64({ base64: undefined, previewUrl: 'http://example.com/image.png' });
    expect(fetch).toHaveBeenCalledWith('http://example.com/image.png');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('throws when HTTP fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);
    await expect(
      resolveImageBase64({ base64: undefined, previewUrl: 'http://bad.url/img' })
    ).rejects.toThrow('Falha ao carregar imagem para geração');
  });

  it('throws when neither base64 nor previewUrl is available', async () => {
    await expect(
      resolveImageBase64({ base64: undefined, previewUrl: undefined })
    ).rejects.toThrow('Imagem indisponível para geração');
  });
});

// ─── resolveIterationBase64 ───────────────────────────────────────────────────

describe('resolveIterationBase64', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseImage = (overrides: Partial<UploadedImage> = {}): UploadedImage => ({
    id: 'img1',
    file: null,
    previewUrl: 'blob:original',
    base64: 'originalbase64',
    selected: false,
    isGenerating: false,
    ...overrides,
  });

  it('fetches generatedUrl when iterateFromGenerated=true', async () => {
    const mockBlob = new Blob(['gen-data'], { type: 'image/jpeg' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as any);

    const img = baseImage({ iterateFromGenerated: true, generatedUrl: 'http://storage/gen.jpg' });
    const result = await resolveIterationBase64(img);

    expect(fetch).toHaveBeenCalledWith('http://storage/gen.jpg');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to original base64 when iterateFromGenerated=false', async () => {
    const img = baseImage({ iterateFromGenerated: false, base64: 'originalbase64' });
    const result = await resolveIterationBase64(img);
    expect(result).toBe('originalbase64');
  });

  it('falls back to original when iterateFromGenerated=true but generatedUrl is missing', async () => {
    const img = baseImage({ iterateFromGenerated: true, generatedUrl: undefined, base64: 'originalbase64' });
    const result = await resolveIterationBase64(img);
    expect(result).toBe('originalbase64');
  });

  it('throws when iteration fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);
    const img = baseImage({ iterateFromGenerated: true, generatedUrl: 'http://storage/expired.jpg' });
    await expect(resolveIterationBase64(img)).rejects.toThrow('Falha ao carregar imagem gerada para iteração');
  });
});
